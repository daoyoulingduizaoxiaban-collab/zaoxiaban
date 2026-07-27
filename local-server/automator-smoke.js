/**
 * 逐页「加载三态」冒烟脚本（R6-1）。取代早前的一次性 automator-my/connect 脚本。
 *
 * 关键点：**不进登录页**。本地模式（config.dataBackend==='local'）下各页 onLoad/onShow 会自行
 * refreshSession → wx.login 静默拿 code → 用 config.localDevOpenId 建会话。老脚本"登录卡"是因为
 * 去点了登录页的原生按钮（触发 getUserProfile，需真人手势）。直接 reLaunch 目标页即可绕开。
 *
 * 读的是 R1 behavior(useAccessPage) 统一后的三态字段，故对每页判定逻辑一致：
 *   pageState: 'loading' | 'ready' | 'error' | 'empty'（停留后仍 loading = 疑似卡/闪帧；error = 失败）
 *
 * 前置：
 *   1. 本地后端已启动：node local-server/server.js
 *   2. config.localDevOpenId 指向想测的身份（owner 白名单值＝以 owner 测）
 *   3. 微信开发者工具已开启「安全设置→服务端口(CLI/HTTP)」
 *
 * 跑法：
 *   npm run smoke                       # 默认 launch 新开一个开发者工具实例
 *   WS_ENDPOINT=ws://127.0.0.1:9420 npm run smoke   # 连已开实例（先 cli auto --project <path> --auto-port 9420）
 */
const automator = require('miniprogram-automator');
const path = require('path');

const CLI = process.env.WX_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const PROJECT = path.join(__dirname, '..');
const WS_ENDPOINT = process.env.WS_ENDPOINT || '';
const SETTLE_MS = Number(process.env.SETTLE_MS || 5000); // 每页停留观察时长

// 逐页冒烟清单：全站页面（app.json 主包+分包）。
// 需参数的详情/编辑/选品页裸开无 id/token，预期落 error/empty/门控态——不崩即算通过。
const PAGES = [
  // Tab / 入口 / 列表页
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/my/index',
  '/pages/search/index',
  '/pages/dataCenter/index',
  '/pages/setting/index',
  '/pages/operationLogs/index',
  '/pages/userReview/index',
  '/pages/message/index',
  '/pages/tourGuides/index',
  '/pages/providers/index',
  '/pages/profile/index',
  '/pages/feedback/index',
  '/sub-pages/product/list/index',
  // 需参数（裸开：预期 error/empty/门控）
  '/pages/customerOrders/edit/index',
  '/pages/tourGuides/edit/index',
  '/pages/providers/edit/index',
  '/pages/profile/edit/index',
  '/pages/my/info-edit/index',
  '/sub-pages/groupOrder/add/index',
  '/sub-pages/groupOrder/detail/index',
  '/sub-pages/groupOrder/productList/index',
  '/sub-pages/groupOrder/product-picker/index',
  '/sub-pages/product/add/index',
];

const readState = (data = {}) => ({
  pageState: data.pageState,
  isLoading: data.isLoading,
  authReady: data.authReady,
  isLoggedIn: data.isLoggedIn,
  canUseBusiness: data.canUseBusiness,
  loadErrorText: data.loadErrorText || '',
  emptyText: data.emptyText || '',
});

// 判定单页结果：pageState 为准；behavior 未接入的页（pageState=undefined）标 SKIP
const verdictOf = (s) => {
  if (s.pageState === undefined) return 'SKIP(无三态)';
  if (s.pageState === 'loading' || s.isLoading) return 'WARN(停留后仍 loading)';
  if (s.pageState === 'error') return `FAIL(${s.loadErrorText})`;
  return 'PASS';
};

(async () => {
  let mp;
  const results = [];
  try {
    if (WS_ENDPOINT) {
      console.log(`connect ${WS_ENDPOINT} ...`);
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    } else {
      console.log('launch devtools ...');
      mp = await automator.launch({ cliPath: CLI, projectPath: PROJECT, timeout: 90000 });
    }
    console.log('ready.\n');

    // best-effort 收 console 报错（部分开发者工具版本不支持）
    try {
      mp.on('console', (msg) => {
        try {
          const t = typeof msg.type === 'function' ? msg.type() : (msg.type || '');
          if (t === 'error' || t === 'warn') {
            const a = typeof msg.args === 'function' ? msg.args() : (msg.args || '');
            console.log(`  [console.${t}]`, JSON.stringify(a));
          }
        } catch (e) { /* 忽略:listener 出错不应掀翻整个冒烟 */ }
      });
    } catch (e) { /* 忽略：版本不支持 */ }

    for (const route of PAGES) {
      let state = {};
      try {
        const page = await mp.reLaunch(route);
        await page.waitFor(SETTLE_MS);
        state = readState(await page.data());
      } catch (e) {
        results.push({ route, verdict: `ERROR(${e.message})`, state: {} });
        console.log(`✗ ${route}  ERROR ${e.message}`);
        continue;
      }
      const verdict = verdictOf(state);
      results.push({ route, verdict, state });
      const mark = verdict.startsWith('PASS') ? '✓' : (verdict.startsWith('SKIP') ? '·' : '✗');
      console.log(`${mark} ${route}  ${verdict}  ${JSON.stringify(state)}`);
    }

    console.log('\n=== 冒烟汇总 ===');
    const bad = results.filter(r => !r.verdict.startsWith('PASS') && !r.verdict.startsWith('SKIP'));
    console.log(`${results.length} 页：PASS ${results.filter(r => r.verdict.startsWith('PASS')).length}，`
      + `问题 ${bad.length}，SKIP ${results.filter(r => r.verdict.startsWith('SKIP')).length}`);
    bad.forEach(r => console.log(`  ✗ ${r.route} — ${r.verdict}`));
  } catch (err) {
    console.log('SMOKE ERROR:', (err && err.stack) || err);
  } finally {
    if (mp) {
      try { await (WS_ENDPOINT ? mp.disconnect() : mp.close()); } catch (e) { /* ignore */ }
    }
    process.exit(0);
  }
})();
