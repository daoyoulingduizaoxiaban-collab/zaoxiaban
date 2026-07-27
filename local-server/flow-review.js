/**
 * UI 写流程自测 · 用户审核（owner 审核一个待审用户，连已开 IDE）。
 *
 * seed：给一个新 openId 走 authLogin(建客户档) + applyForRole(guide) → 变 pending；
 * UI：owner 登录 → 进审核页 → 列表里找到该用户 → callMethod('approveUser') 通过；
 * 回查：owner listPending 里该 openId 已消失（=已脱离待审）。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-review.js
 */
const automator = require('miniprogram-automator');
const http = require('http');

const WS = process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420';
const OWNER = process.env.LOCAL_OPENID || 'dev-owner-openid';
const TARGET = `review-target-${Date.now()}`;

const callFn = (name, event, openId) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ event, openId });
  const req = http.request(
    `http://localhost:3000/fn/${name}`,
    { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
    (res) => { let s = ''; res.on('data', d => (s += d)); res.on('end', () => { try { resolve(JSON.parse(s).result); } catch (e) { reject(e); } }); },
  );
  req.on('error', reject);
  req.write(body);
  req.end();
});
const bd = (resource, action, data, openId) => callFn('businessData', { resource, action, data, context: {} }, openId);
// listPending 会把刚审过的也带回来，故按 openId 读该用户的当前状态判定，不靠"是否在列表"。
const statusOf = async (openId) => {
  const r = await bd('users', 'listPending', {}, OWNER);
  const u = ((r && r.data) || []).find(x => String(x.openId) === String(openId));
  return u ? String(u.reviewStatus || u.status) : '(不在列表)';
};

(async () => {
  // ① seed 一个待审用户
  await callFn('authLogin', {}, TARGET);                       // 建客户档
  const apply = await bd('users', 'applyForRole', { requestedRole: 'guide' }, TARGET);
  if (!apply || !apply.success) { console.error('❌ seed 失败:', apply && apply.error); process.exit(1); }
  console.log('seed 完成，target 状态 =', await statusOf(TARGET), '(openId=', TARGET, ')');

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录（登录优先模式，best-effort）
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进审核页，轮询等页面就绪（currentPage 偶发拿到未就绪/过期页 → data 全 undefined）
  await mp.reLaunch('/pages/userReview/index');
  let page = await mp.currentPage();
  let d0 = await page.data();
  for (let i = 0; i < 8 && (d0.pageState === undefined || d0.pageState === 'loading'); i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('审核页: canReview=', d0.canReview, 'pageState=', d0.pageState, '待审数=', (d0.users || []).length);
  const target = (d0.users || []).find(u => String(u.openId) === TARGET);
  if (!target) { console.error('❌ 审核列表里没找到 target（登录/权限/加载问题）'); await mp.disconnect(); process.exit(1); }
  const id = target.id || target._id;

  // ④ 通过该用户
  await page.callMethod('approveUser', { currentTarget: { dataset: { id } } });
  await page.waitFor(1800);

  // ⑤ 回查：target 状态变 approved
  const after = await statusOf(TARGET);
  const ok = after === 'approved';
  console.log(ok ? `✅ 审核通过生效：${TARGET} 状态 = ${after}` : `❌ 审核未生效，target 状态 = ${after}`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
