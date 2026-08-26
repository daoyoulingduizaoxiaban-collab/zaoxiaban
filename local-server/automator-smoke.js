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
  '/sub-pages/groupOrder/productList/index': '缺少团单 ID',
  '/pages/customerOrders/edit/index': '缺少团单入口',
};
const PAGES = [
  '/pages/groupOrder/index', '/pages/customerOrders/index', '/pages/productManagement/index', '/pages/my/index',
  '/pages/search/index', '/pages/dataCenter/index', '/pages/setting/index', '/pages/operationLogs/index',
  '/pages/userReview/index', '/pages/tourGuides/index', '/pages/providers/index',
  '/pages/feedback/index', '/sub-pages/product/list/index',
  '/pages/customerOrders/edit/index', '/pages/tourGuides/edit/index', '/pages/providers/edit/index',
  '/pages/my/info-edit/index', '/sub-pages/groupOrder/add/index',
  '/sub-pages/groupOrder/detail/index', '/sub-pages/groupOrder/productList/index',
  '/sub-pages/product/add/index',
];

// 一次只取要判定的那几个栏位，不整包捞页面 data——像客户订单页整包超过 60KB，
// 会超出 CLI 回传上限被截断；逐栏位读又要开 7 次程序，太慢。用一次执行取回精简物件。
const READ_STATE_FN = `function () {
  var pages = getCurrentPages();
  var page = pages[pages.length - 1] || {};
  var d = page.data || {};
  return {
    __route: page.route || '',
    pageState: d.pageState, isLoading: d.isLoading, authReady: d.authReady,
    isLoggedIn: d.isLoggedIn, canUseBusiness: d.canUseBusiness,
    loadErrorText: d.loadErrorText || '', emptyText: d.emptyText || '',
    accessDenied: d.accessDenied, isPageLoading: d.isPageLoading, pageErrorText: d.pageErrorText || '',
  };
}`;

// 数一数这页到底渲染出几个节点。没有可判定状态栏位的页面靠这个当底线验证。
const countNodes = async () => {
  try {
    const r = await ide.querySelectorAll('view');
    const els = (r && (r.elements || r.result || r)) || [];
    return Array.isArray(els) ? els.length : 0;
  } catch (e) {
    return 0;
  }
};
const readState = async () => {
  // 读不到要回 null，不能回 {}——回 {} 会被当成「这页没有三态栏位」而记 SKIP，
  // 于是模拟器抖动或回传被截断时，整轮 25 页全 SKIP、问题 0、退 0 算通过。
  try { return (await ide.evaluate(READ_STATE_FN)) || null; } catch (e) { return null; }
};
// 有些页挂了 useAccessPage 行为（因此 data 里带 pageState/authReady），但 wxml 根本没用
// 共用的 page-state 元件，自己画 isPageLoading/accessDenied。那些栏位对它们没有意义，
// 拿来判三态会把好页面误判成「卡在 loading」。所以以「有没有注册 page-state 元件」为准。
const usesPageState = (route) => {
  const base = path.join(ide.PROJECT, route.replace(/^\//, ''));
  try {
    const json = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
    if (JSON.stringify(json.usingComponents || {}).includes('page-state')) return true;
  } catch (e) { /* 没有 json 就往下看原始码 */ }
  // 就算没注册元件，只要页面自己有照契约维护三态（有呼叫 threeState），
  // pageState 就是可信的，一样按三态判。
  for (const ext of ['.ts', '.js']) {
    try {
      if (fs.readFileSync(`${base}${ext}`, 'utf8').includes('threeState(')) return true;
    } catch (e) { /* 换下一个副档名 */ }
  }
  return false;
};

const verdictOf = (state, route) => {
  if (!state) return 'ERROR(读不到页面状态)';
  if (!usesPageState(route)) {
    // 这些页自己画载入/受限，不走共用元件。判它们自绘的那组栏位，
    // 不能整页放过——否则 onLoad 炸掉、画面全白也照样印通过。
    if (state.pageErrorText) {
      const expected = EXPECTED_DEGRADE[route];
      if (expected && String(state.pageErrorText).includes(expected)) return 'PASS(正确降级)';
      return `FAIL(${state.pageErrorText})`;
    }
    // 自绘的页用自己的载入旗标，名称不一：有的叫 isPageLoading，有的叫 isLoading。
    // ⚠️ 有自己的旗标就**只信自己的**——这些页多半也挂了 useAccessPage，
    // 那个 isLoading 是继承来、没人维护的残留值，永远是 true，一起看会全部误判成卡住。
    // 一个节点都没渲染＝页面根本没起来，最先挡掉，不能被「已定案」放行。
    if (state.renderedNodes === 0) return 'FAIL(页面没有渲染出任何内容)';
    const ownLoading = state.isPageLoading !== undefined ? state.isPageLoading : state.isLoading;
    if (ownLoading === true) return 'WARN(停留后仍 loading)';
    if (state.accessDenied === true) return 'PASS(正式受限态)';
    if (ownLoading === false || state.accessDenied === false) return 'PASS(自绘，已定案)';
    // 这些页三种状态栏位都没有。至少验它真的渲染出东西——抓得到 onLoad 炸掉、整片白。
    // 这是底线，不是完整验证：只证明画面有内容，不证明内容对不对。
    return `PASS(已渲染 ${state.renderedNodes} 个节点)`;
  }
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
const settledState = async (route) => {
  let state = {};
  for (let i = 0; i < READY_TRIES; i++) {
    state = await readState(route);
    if (!state) return null;
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
  if (!(await ide.dataWhenReady('isLoggedIn', 10, 800, v => v === true))) {
    console.log('⚠ 登录没建立起来，需登录的页面会被导去登录页，结果参考价值有限');
  }
  const results = [];
  for (const route of PAGES) {
    try {
      await ide.gotoPage(route, route.replace(/(^\/|\/index$)/g, ''));
      const state = usesPageState(route) ? await settledState(route) : await readState(route);
      if (state && !usesPageState(route)) state.renderedNodes = await countNodes();
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
  const passed = results.filter(r => r.verdict.startsWith('PASS')).length;
  console.log(`\n${results.length} 页：PASS ${passed}，问题 ${bad.length}，SKIP ${results.filter(r => r.verdict.startsWith('SKIP')).length}`);
  if (bad.length) return ide.reportFailure(`冒烟发现 ${bad.length} 个问题`);
  // 防线：一页都没通过还印「问题 0」，代表根本没验到东西（连线断了/全都读不到），
  // 不能当成通过。
  if (passed === 0) return ide.reportFailure('一页都没通过——等于这轮没验到任何东西');
  process.exit(0);
})().catch(e => ide.reportFailure(`SMOKE 出错: ${e && e.message}`));
