/** UI 写流程自测 · 团单开团。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const marker = `[自测]开团-${Date.now()}`;
  const goods = [{ id: `sample-${Date.now()}`, title: '样品甲', coverUrl: '', priceSetting: [{ minQuantity: 1, unitPrice: 10 }] }];
  await ide.ensureLocalOwner();
  await ide.gotoPage('/sub-pages/groupOrder/add/index', 'groupOrder/add');
  const initial = await ide.pageData();
  if (initial.accessDenied) return ide.reportFailure('被 accessDenied 拦住——owner 未登录成');
  await ide.setData({ selectedGoods: goods, formData: {
    title: marker, description: '自测开团', startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货点', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000', customerNotice: '', status: 0,
  } });
  await ide.callMethod('onSave');
  await ide.sleep(2000);
  const list = await ide.bd('groupOrders', 'listVisible', {});
  const hit = ((list && list.data) || []).find(r => r.title === marker);
  if (!hit) return ide.reportFailure('未在库中找到该团单');
  console.log(`✅ 开团已落库: ${hit._id || hit.id}（商品数=${(hit.productList || []).length}）`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
