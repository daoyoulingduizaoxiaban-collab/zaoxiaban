/** UI 写流程自测 · 取消订单。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const stamp = Date.now();
  const group = await ide.bd('groupOrders', 'create', {
    title: `[自测]取消团-${stamp}`.slice(0, 20), description: '自测取消团', startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000',
    productList: [{ id: `sample-${stamp}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }] }],
  });
  if (!group || !group.success) return ide.reportFailure(`seed 团单失败: ${group && group.error}`);
  const groupOrderId = group.data._id || group.data.id;
  const created = await ide.bd('customerOrders', 'create', {
    groupOrderId, customerName: `[自测]取消客-${stamp}`, customerPhone: '13900000000',
    items: [{ productId: `sample-${stamp}`, title: '样品甲', amount: 1, unitPrice: 10, totalPrice: 10, originalTotalPrice: 10 }], totalPrice: 10,
  });
  if (!created || !created.success) return ide.reportFailure(`seed 订单失败: ${created && created.error}`);
  const orderId = created.data._id || created.data.id;
  await ide.ensureLocalOwner();
  await ide.gotoPage(`/sub-pages/groupOrder/detail/index?id=${encodeURIComponent(groupOrderId)}`, 'groupOrder/detail');
  let groupData = await ide.dataWhenReady('groupOrder');
  const findOrder = d => ((d && d.memberOrderList) || []).find(o => String(o.id || o._id) === String(orderId));
  for (let i = 0; i < 10 && !findOrder(groupData); i++) {
    await ide.sleep(800);
    groupData = await ide.getData('groupOrder');
  }
  if (!findOrder(groupData)) return ide.reportFailure('详情页未找到该订单');
  await ide.callMethod('onCancelOrder', { currentTarget: { dataset: { id: orderId } } });
  await ide.setData({ 'cancelForm.cancelRemark': '自测取消' });
  await ide.callMethod('handleCancelDialogConfirm');
  await ide.sleep(1800);
  const after = await ide.bd('customerOrders', 'getById', { id: orderId });
  if (!after || !after.data || Number(after.data.status) !== 3) return ide.reportFailure(`未生效，状态 = ${after && after.data && after.data.status}`);
  console.log(`✅ 取消订单生效：订单 ${orderId} 状态 = 3`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
