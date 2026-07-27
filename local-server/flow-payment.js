/**
 * UI 写流程自测 · 团主确认收款（owner 详情页弹窗流，连已开 IDE）。补全「下单→收款」资金闭环。
 *
 * seed(http)：owner 建 OPEN 团单+上架商品 → 建一张**直接 PAID 的客户订单**
 *   （create 传 paymentMethod+durable https 凭证+declaredAmount 即 hasInitialPayment → 初始状态 PAID）；
 * UI：owner 进 /sub-pages/groupOrder/detail?id=<团单> → memberOrderList 里拿到该 PAID 单
 *   → callMethod('onConfirmPayment',{dataset:{id}})（开弹窗、预填实收=申报额）→ callMethod('handleDialogConfirm')；
 * 回查：该订单状态变 CONFIRMED(2)。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-payment.js
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

const gotoPage = async (mp, url, matchPath, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    try { await mp.reLaunch(url); } catch (e) { /* 抖动，重试 */ }
    await new Promise(r => setTimeout(r, 1600));
    const p = await mp.currentPage();
    if (p && String(p.path || '').indexOf(matchPath) >= 0) return p;
  }
  return mp.currentPage();
};

const statusOf = async (orderId) => {
  const r = await bd('customerOrders', 'getById', { id: orderId }, OWNER);
  return r && r.data ? Number(r.data.status) : NaN;
};

(async () => {
  const stamp = Date.now();

  // ① seed OPEN 团单 + 上架商品
  const goRes = await bd('groupOrders', 'create', {
    title: `[自测]收款团-${stamp}`.slice(0, 20),
    description: '自测收款团', startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000',
    productList: [{ id: `sample-${stamp}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }] }],
  }, OWNER);
  if (!goRes || !goRes.success) { console.error('❌ seed 团单失败:', goRes && goRes.error); process.exit(1); }
  const groupOrderId = goRes.data._id || goRes.data.id;

  // ② seed 一张直接 PAID 的客户订单（带 durable 凭证 + 付款方式 + 申报额）
  const items = [{ productId: `sample-${stamp}`, title: '样品甲', amount: 2, unitPrice: 10, totalPrice: 20, originalTotalPrice: 20 }];
  const orderRes = await bd('customerOrders', 'create', {
    groupOrderId, customerName: `[自测]收款客-${stamp}`, customerPhone: '13900000000',
    items, totalPrice: 20, declaredAmount: 20,
    paymentMethod: '微信', paymentRemark: '自测', paymentProofUrls: ['https://example.com/proof.jpg'],
  }, OWNER);
  if (!orderRes || !orderRes.success) { console.error('❌ seed 订单失败:', orderRes && orderRes.error); process.exit(1); }
  const orderId = orderRes.data._id || orderRes.data.id;
  console.log('seed OK: 团单=', groupOrderId, '订单=', orderId, '初始状态=', Number(orderRes.data.status), '(1=PAID)');
  if (Number(orderRes.data.status) !== 1) { console.error('❌ 订单未进入 PAID，确认收款前置不满足'); process.exit(1); }

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ③ owner 登录（best-effort）
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ④ 进团单详情页，轮询等 memberOrderList 出现该订单
  let page = await gotoPage(mp, `/sub-pages/groupOrder/detail/index?id=${encodeURIComponent(groupOrderId)}`, 'groupOrder/detail');
  console.log('落页 path=', page && page.path);
  let d0 = await page.data();
  const findOrder = (d) => ((d.groupOrder && d.groupOrder.memberOrderList) || []).find(o => String(o.id || o._id) === String(orderId));
  for (let i = 0; i < 10 && (d0.pageState === 'loading' || !findOrder(d0)); i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  const order = findOrder(d0);
  console.log('详情页: canManage=', d0.canManageGroupOrder, 'pageState=', d0.pageState, '本团订单数=', ((d0.groupOrder && d0.groupOrder.memberOrderList) || []).length);
  if (!order) { console.error('❌ 详情页未找到该订单（登录/加载问题）'); await mp.disconnect(); process.exit(1); }

  // ⑤ 开确认弹窗（预填实收=申报额）→ 确认
  await page.callMethod('onConfirmPayment', { currentTarget: { dataset: { id: orderId } } });
  await page.waitFor(400);
  const dDlg = await page.data();
  console.log('弹窗: show=', dDlg.showConfirmDialog, '预填实收=', dDlg.confirmForm && dDlg.confirmForm.confirmedAmount);
  await page.callMethod('handleDialogConfirm');
  await page.waitFor(1800);

  // ⑥ 回查：订单状态变 CONFIRMED(2)
  const after = await statusOf(orderId);
  const ok = after === 2;
  console.log(ok ? `✅ 确认收款生效：订单 ${orderId} 状态 = ${after}(2=CONFIRMED)` : `❌ 未生效，订单状态 = ${after}`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
