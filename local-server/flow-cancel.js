/**
 * UI 写流程自测 · 取消订单（owner 详情页取消弹窗，连已开 IDE）。补全订单状态机(→CANCELLED)。
 *
 * seed(http)：owner 建 OPEN 团单 → 建一张 UNPAID 客户订单(不带付款信息)；
 * UI：owner 进 /sub-pages/groupOrder/detail?id=<团单> → memberOrderList 拿到该单
 *   → callMethod('onCancelOrder',{dataset:{id}})开取消弹窗 → callMethod('handleCancelDialogConfirm')；
 * 回查：订单状态变 CANCELLED(3)。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-cancel.js
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
const dataWhenReady = async (mp, field, tries = 10) => {
  let d = {};
  for (let i = 0; i < tries; i++) {
    const p = await mp.currentPage();
    d = (p && await p.data()) || {};
    if (d[field] !== undefined) return d;
    await new Promise(r => setTimeout(r, 800));
  }
  return d;
};
const statusOf = async (orderId) => {
  const r = await bd('customerOrders', 'getById', { id: orderId }, OWNER);
  return r && r.data ? Number(r.data.status) : NaN;
};

(async () => {
  const stamp = Date.now();

  // ① seed OPEN 团单 + 一张 UNPAID 订单
  const go = await bd('groupOrders', 'create', {
    title: `[自测]取消团-${stamp}`.slice(0, 20), description: '自测取消团',
    startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000',
    productList: [{ id: `sample-${stamp}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }] }],
  }, OWNER);
  if (!go || !go.success) { console.error('❌ seed 团单失败:', go && go.error); process.exit(1); }
  const groupOrderId = go.data._id || go.data.id;

  const items = [{ productId: `sample-${stamp}`, title: '样品甲', amount: 1, unitPrice: 10, totalPrice: 10, originalTotalPrice: 10 }];
  const od = await bd('customerOrders', 'create', {
    groupOrderId, customerName: `[自测]取消客-${stamp}`, customerPhone: '13900000000',
    items, totalPrice: 10,
  }, OWNER);
  if (!od || !od.success) { console.error('❌ seed 订单失败:', od && od.error); process.exit(1); }
  const orderId = od.data._id || od.data.id;
  console.log('seed OK: 团单=', groupOrderId, '订单=', orderId, '初始状态=', Number(od.data.status), '(0=UNPAID)');

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录（轮询到 isLoggedIn 有定义再判断）
  await gotoPage(mp, '/pages/groupOrder/index', 'groupOrder/index');
  const hs = await dataWhenReady(mp, 'isLoggedIn');
  if (hs.isLoggedIn === false) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进详情页，轮询等 memberOrderList 出现该订单
  let page = await gotoPage(mp, `/sub-pages/groupOrder/detail/index?id=${encodeURIComponent(groupOrderId)}`, 'groupOrder/detail');
  console.log('落页 path=', page && page.path);
  let d0 = await dataWhenReady(mp, 'pageState');
  const findOrder = (d) => ((d.groupOrder && d.groupOrder.memberOrderList) || []).find(o => String(o.id || o._id) === String(orderId));
  for (let i = 0; i < 10 && (d0.pageState === 'loading' || !findOrder(d0)); i++) {
    await new Promise(r => setTimeout(r, 800));
    page = await mp.currentPage();
    d0 = await page.data();
  }
  const order = findOrder(d0);
  console.log('详情页: canManage=', d0.canManageGroupOrder, 'pageState=', d0.pageState, '本团订单数=', ((d0.groupOrder && d0.groupOrder.memberOrderList) || []).length);
  if (!order) { console.error('❌ 详情页未找到该订单'); await mp.disconnect(); process.exit(1); }

  // ④ 开取消弹窗 → 填备注 → 确认取消
  await page.callMethod('onCancelOrder', { currentTarget: { dataset: { id: orderId } } });
  await page.waitFor(400);
  await page.setData({ 'cancelForm.cancelRemark': '自测取消' });
  await page.waitFor(200);
  const dDlg = await page.data();
  console.log('弹窗: show=', dDlg.showCancelDialog, '备注=', dDlg.cancelForm && dDlg.cancelForm.cancelRemark);
  await page.callMethod('handleCancelDialogConfirm');
  await page.waitFor(1800);

  // ⑤ 回查：状态变 CANCELLED(3)
  const after = await statusOf(orderId);
  const ok = after === 3;
  console.log(ok ? `✅ 取消订单生效：订单 ${orderId} 状态 = ${after}(3=CANCELLED)` : `❌ 未生效，状态 = ${after}`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
