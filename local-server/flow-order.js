/**
 * UI 写流程自测 · 客户下单（owner 身份即可）。
 *
 * 依据权限矩阵 CUSTOMER_ORDER_CREATE=[customer,owner,admin]，且 getShareAccessError 对
 * owner/admin/归属 guide 直接放行（无需 shareToken）→ 用 owner 就能跑通完整下单 UI。
 *
 * seed：owner 经本地后端建一个「开团中(OPEN)」团单，productList 带一件**显式 status=2(上架)**的商品
 *       （normalizeGroupOrderPayload 不给 productList 补 status 默认值，不写死会被下单页过滤掉）；
 * UI：进 /pages/customerOrders/edit?groupOrderId=<id> → 填数量(走真实 onQuantityInput 计价)
 *     + 姓名/手机 → callMethod('onSave') 触发真实提交；
 * 回查：owner customerOrders.listByGroupOrder(<id>) 里出现该单、金额>0、姓名=marker。
 *
 * 前置：开发者工具开着本专案（不必挂 auto-port）＋ node local-server/server.js
 * 跑法：node local-server/flow-order.js
 */
const ide = require('./lib/ide');

(async () => {
  const stamp = Date.now();
  const customerMarker = `[自测]下单客-${stamp}`;

  // ① seed 一个 OPEN 团单（不传 status → 默认 OPEN），商品显式 status=2 + priceSetting 才能计价/被展示。
  const seedRes = await ide.bd('groupOrders', 'create', {
    title: `[自测]下单团-${stamp}`.slice(0, 20),
    description: '自测下单团',
    startAt: '2026-08-01 09:00',
    endAt: '2026-12-31 20:00',
    pickupNote: '自测取货点',
    paymentNote: '自测付款',
    contactName: '自测团主',
    contactPhone: '13800000000',
    productList: [{
      id: `sample-${stamp}`,
      title: '样品甲',
      description: '自测商品',
      status: 2,
      priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }],
    }],
  });
  if (!seedRes || !seedRes.success) return ide.reportFailure(`seed 团单失败: ${seedRes && seedRes.error}`);
  const groupOrderId = seedRes.data._id || seedRes.data.id;
  console.log('seed 团单 OK: id=', groupOrderId, '商品数=', (seedRes.data.productList || []).length);

  // ② 确保 App 走本地后端 + 会话已建立
  await ide.useLocalBackend();
  await ide.gotoPage('/pages/groupOrder/index', 'groupOrder/index');
  if (!(await ide.dataWhenReady('isLoggedIn', 10, 800, v => v === true))) await ide.loginOnce();

  // ③ 进客户下单页，等 productRows 就绪
  await ide.gotoPage(`/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(groupOrderId)}`, 'customerOrders/edit');
  const rows = await ide.dataWhenReady('productRows');
  const accessDenied = await ide.getData('accessDenied');
  console.log('下单页: accessDenied=', accessDenied, 'productRows=', (rows || []).length);
  if (accessDenied) return ide.reportFailure('被 accessDenied 拦住');
  if (!(rows || []).length) return ide.reportFailure('无可下单商品（seed 的 status/过滤问题）');

  // ④ 填数量（走真实 onQuantityInput 计价）+ 姓名/手机
  await ide.callMethod('onQuantityInput', [{ currentTarget: { dataset: { id: rows[0].id } }, detail: { value: '2' } }]);
  await ide.callMethod('onInputChange', [{ currentTarget: { dataset: { field: 'customerName' } }, detail: { value: customerMarker } }]);
  await ide.callMethod('onInputChange', [{ currentTarget: { dataset: { field: 'customerPhone' } }, detail: { value: '13900000000' } }]);
  await ide.sleep(400);
  console.log('填表后: totalPrice=', await ide.getData('totalPrice'), 'name=', await ide.getData('formData.customerName'));

  // ⑤ 触发提交（onSave 里 create 先于 wx.showModal 完成，落库不受弹窗影响）
  await ide.callMethod('onSave');
  await ide.sleep(2000);

  // ⑥ 回查：该团单下出现订单、金额>0、姓名=marker
  const list = await ide.bd('customerOrders', 'listByGroupOrder', { groupOrderId });
  const orders = (list && list.data) || [];
  const hit = orders.find(o => String(o.customerName) === customerMarker);
  if (!hit || !(Number(hit.totalPrice) > 0)) return ide.reportFailure(`未在该团单下找到下单记录（本团订单数=${orders.length}）`);

  console.log(`✅ 客户下单已落库: ${hit._id || hit.id}（金额=￥${hit.totalPrice}，商品数=${(hit.items || hit.productList || []).length}）`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
