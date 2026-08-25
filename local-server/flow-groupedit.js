/** UI 写流程自测 · 团单编辑。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const stamp = Date.now();
  const newTitle = `[自测]改团-${stamp}`.slice(0, 20);
  const seed = await ide.bd('groupOrders', 'create', {
    title: `[自测]原团-${stamp}`.slice(0, 20), description: '自测原团', startAt: '2026-08-01 09:00', endAt: '2026-12-31 20:00',
    pickupNote: '自测取货', paymentNote: '自测付款', contactName: '自测团主', contactPhone: '13800000000',
    productList: [{ id: `sample-${stamp}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }] }],
  });
  if (!seed || !seed.success) return ide.reportFailure(`seed 团单失败: ${seed && seed.error}`);
  const groupOrderId = seed.data._id || seed.data.id;
  await ide.ensureLocalOwner();
  await ide.gotoPage(`/sub-pages/groupOrder/add/index?id=${encodeURIComponent(groupOrderId)}`, 'groupOrder/add');
  const detail = await ide.pageDataWhen(data => data.isEdit && data.formData && data.formData.title);
  if (!detail.isEdit || !detail.formData || !detail.formData.title) return ide.reportFailure('编辑模式预填未就绪');
  await ide.setData({ 'formData.title': newTitle });
  await ide.callMethod('onSave');
  await ide.sleep(2000);
  const after = await ide.bd('groupOrders', 'getById', { id: groupOrderId });
  const title = after && after.data ? after.data.title : '(读取失败)';
  if (title !== newTitle) return ide.reportFailure(`编辑未生效，标题 = ${title}`);
  console.log(`✅ 团单编辑生效：标题 = ${title}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
