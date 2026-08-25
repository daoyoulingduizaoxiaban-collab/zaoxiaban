/**
 * 逐页「加载三态」冒烟脚本。前置：开发者工具开着本专案＋node local-server/server.js。
 * 新版 wechatide 自动化不需要 auto-port，也不会自行启动或关闭开发者工具。
 */
const ide = require('./lib/ide');
const fs = require('fs');
const path = require('path');

const SETTLE_MS = Number(process.env.SETTLE_MS || 5000);
// 每页最多等多久才判定。等的是「权限检查跑完 + 三态定案」，不是固定睡一段时间——
// 固定睡法会在 authReady 还没翻 true 时就读到 loading，把好页面误判成坏页面。
const READY_TRIES = Number(process.env.READY_TRIES || 12);

// 裸开、不带参数时「正确降级」的页面：不是 bug，是 A13 要的正式受限/错误态。
// key 是路由，value 是预期会看到的错误文案片段（比中就算 PASS）。
const EXPECTED_DEGRADE = {
  '/sub-pages/groupOrder/detail/index': '缺少团单 ID',
};
const PAGES = [
  '/pages/groupOrder/index', '/pages/customerOrders/index', '/pages/productManagement/index', '/pages/my/index',
  '/pages/search/index', '/pages/dataCenter/index', '/pages/setting/index', '/pages/operationLogs/index',
  '/pages/userReview/index', '/pages/message/index', '/pages/tourGuides/index', '/pages/providers/index',
  '/pages/profile/index', '/pages/feedback/index', '/sub-pages/product/list/index',
  '/pages/customerOrders/edit/index', '/pages/tourGuides/edit/index', '/pages/providers/edit/index',
  '/pages/profile/edit/index', '/pages/my/info-edit/index', '/sub-pages/groupOrder/add/index',
  '/sub-pages/groupOrder/detail/index', '/sub-pages/groupOrder/productList/index',
  '/sub-pages/groupOrder/product-picker/index', '/sub-pages/product/add/index',
];

// 一次只取要判定的那几个栏位，不整包捞页面 data——像客户订单页整包超过 60KB，
// 会超出 CLI 回传上限被截断；逐栏位读又要开 7 次程序，太慢。用一次执行取回精简物件。
const READ_STATE_FN = `function () {
  var pages = getCurrentPages();
  var d = (pages[pages.length - 1] || {}).data || {};
  return {
    pageState: d.pageState, isLoading: d.isLoading, authReady: d.authReady,
    isLoggedIn: d.isLoggedIn, canUseBusiness: d.canUseBusiness,
    loadErrorText: d.loadErrorText || '', emptyText: d.emptyText || '',
  };
}`;
const readState = async () => {
  try { return (await ide.evaluate(READ_STATE_FN)) || {}; } catch (e) { return {}; }
};
// 有些页挂了 useAccessPage 行为（因此 data 里带 pageState/authReady），但 wxml 根本没用
// 共用的 page-state 元件，自己画 isPageLoading/accessDenied。那些栏位对它们没有意义，
// 拿来判三态会把好页面误判成「卡在 loading」。所以以「有没有注册 page-state 元件」为准。
const usesPageState = (route) => {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(ide.PROJECT, `${route.replace(/^\//, '')}.json`), 'utf8'));
    return JSON.stringify(json.usingComponents || {}).includes('page-state');
  } catch (e) {
    return false;
  }
};

const verdictOf = (state, route) => {
  if (!usesPageState(route)) return 'SKIP(未接三态元件)';
  if (state.pageState === undefined) return 'SKIP(无三态)';
  // 只看 pageState：isLoading 是各页自用的旗标，不驱动共用元件的画面，有些页设完 ready 就没关它。
  if (state.pageState === 'loading') return 'WARN(停留后仍 loading)';
  if (state.pageState === 'error') {
    const expected = EXPECTED_DEGRADE[route];
    if (expected && String(state.loadErrorText || '').includes(expected)) return 'PASS(正确降级)';
    return `FAIL(${state.loadErrorText})`;
  }
  return 'PASS';
};

/**
 * 轮询到这一页真的定案再读：pageState 不是 loading、且有 authReady 的页面要等它翻 true。
 * 轮询完还是 loading 才算问题——那才是真的卡住。
 */
const settledState = async () => {
  let state = {};
  for (let i = 0; i < READY_TRIES; i++) {
    state = await readState();
    const stillLoading = state.pageState === 'loading';
    const authPending = state.authReady === false;
    if (state.pageState === undefined) return state;      // 没接三态，等也没用
    if (!stillLoading && !authPending) return state;
    await ide.sleep(Math.max(500, Math.round(SETTLE_MS / READY_TRIES)));
  }
  return state;
};

(async () => {
  await ide.useLocalBackend();
  // 必须先登录：需登录的页面在未登录时会被闸门导去登录页（这是 A13 要的正确行为），
  // 不登录跑等于在测「有没有被挡下来」，测不到各页真正的加载三态。
  await ide.loginOnce();
  if (!(await ide.dataWhenReady('isLoggedIn'))) {
    console.log('⚠ 登录没建立起来，需登录的页面会被导去登录页，结果参考价值有限');
  }
  const results = [];
  for (const route of PAGES) {
    try {
      await ide.gotoPage(route, route.replace(/(^\/|\/index$)/g, ''));
      const state = usesPageState(route) ? await settledState() : await readState();
      const verdict = verdictOf(state, route);
      results.push({ route, verdict, state });
      const mark = verdict.startsWith('PASS') ? '✓' : (verdict.startsWith('SKIP') ? '·' : '✗');
      console.log(`${mark} ${route}  ${verdict}  ${JSON.stringify(state)}`);
    } catch (e) {
      results.push({ route, verdict: `ERROR(${e.message})`, state: {} });
      console.log(`✗ ${route}  ERROR ${e.message}`);
    }
  }
  const bad = results.filter(r => !r.verdict.startsWith('PASS') && !r.verdict.startsWith('SKIP'));
  console.log(`\n${results.length} 页：PASS ${results.filter(r => r.verdict.startsWith('PASS')).length}，问题 ${bad.length}，SKIP ${results.filter(r => r.verdict.startsWith('SKIP')).length}`);
  if (bad.length) return ide.reportFailure(`冒烟发现 ${bad.length} 个问题`);
  process.exit(0);
})().catch(e => ide.reportFailure(`SMOKE 出错: ${e && e.message}`));
