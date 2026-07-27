/**
 * UI 写流程自测 · 团单编辑（owner，add 页编辑模式，连已开 IDE）。覆盖 update 路径（区别于 create）。
 *
 * seed(http)：owner 建一个团单 → id；
 * UI：owner 进 /sub-pages/groupOrder/add/index?id=<id>（isEdit=true，预填 formData）
 *   → 轮询等预填就绪 → setData 改标题 → callMethod('onSave') 走 GroupOrderService.update；
 * 回查：groupOrders.getById 标题变成新值。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-groupedit.js
 */
const automator = require('miniprogram-automator');
const http = require('http');

const WS = process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420';
const OWNER = process.env.LOCAL_OPENID || 'dev-owner-openid';

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

// reLaunch + 校验落对页 + 抗 devtools 热重载/预热瞬断（连 currentPage 一起包 try/catch）。
const gotoPage = async (mp, url, matchPath, tries = 6) => {
  for (let i = 0; i < tries; i++) {
    try {
      await mp.reLaunch(url);
      await new Promise(r => setTimeout(r, 1600));
      const p = await mp.currentPage();
      if (p && String(p.path || '').indexOf(matchPath) >= 0) return p;
    } catch (e) { await new Promise(r => setTimeout(r, 800)); }
  }
  return mp.currentPage();
};

(async () => {
  const stamp = Date.now();
  const newTitle = `[自测]改团-${stamp}`.slice(0, 20);

  // ① seed 一个团单
  const seed = await bd('groupOrders', 'create', {
    title: `[自测]原团-${stamp}`.slice(0, 20),
    description: '自测原团', startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000',
    productList: [{ id: `sample-${stamp}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }] }],
  }, OWNER);
  if (!seed || !seed.success) { console.error('❌ seed 团单失败:', seed && seed.error); process.exit(1); }
  const groupOrderId = seed.data._id || seed.data.id;
  console.log('seed 团单 OK: id=', groupOrderId, '原标题=', seed.data.title);

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录（best-effort，用 gotoPage 抗瞬断）
  let home = await gotoPage(mp, '/pages/groupOrder/index', 'groupOrder/index');
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进编辑页（sub-package），轮询等预填就绪
  let page = await gotoPage(mp, `/sub-pages/groupOrder/add/index?id=${encodeURIComponent(groupOrderId)}`, 'groupOrder/add');
  console.log('落页 path=', page && page.path);
  let d0 = await page.data();
  for (let i = 0; i < 10 && !(d0.isEdit && d0.formData && String(d0.formData.title || '').length); i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('编辑页: isEdit=', d0.isEdit, 'accessDenied=', d0.accessDenied, '预填标题=', d0.formData && d0.formData.title);
  if (d0.accessDenied) { console.error('❌ 被 accessDenied 拦住'); await mp.disconnect(); process.exit(1); }
  if (!(d0.isEdit && d0.formData && String(d0.formData.title || '').length)) { console.error('❌ 编辑模式预填未就绪'); await mp.disconnect(); process.exit(1); }

  // ④ 改标题 → 保存（走 update）
  await page.setData({ 'formData.title': newTitle });
  await page.waitFor(300);
  await page.callMethod('onSave');
  await page.waitFor(2000);

  // ⑤ 回查：标题已改
  const after = await bd('groupOrders', 'getById', { id: groupOrderId }, OWNER);
  const title = after && after.data ? after.data.title : '(读取失败)';
  const ok = title === newTitle;
  console.log(ok ? `✅ 团单编辑生效：标题 = ${title}` : `❌ 编辑未生效，标题 = ${title}（期望 ${newTitle}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
