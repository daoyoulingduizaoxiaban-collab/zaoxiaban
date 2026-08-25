/**
 * UI 写流程自测 · 删除类操作（商品删除 + 团单删除）。
 *
 * 这两条流程以前列在「不可自动化」：删除动作放在 wx.showModal 的 success 回调里，
 * 旧的 automator 点不了原生弹窗。新版 wechatide 可以 mock wx API，把 showModal
 * 直接回 { confirm: true }，回调就会照真实路径跑下去——测的仍是页面真正的删除逻辑，
 * 只有「使用者按下确定」这一下被替换掉。
 *
 * 前置：开发者工具开着本专案 ＋ node local-server/server.js
 * 跑法：node local-server/flow-delete.js
 */
const ide = require('./lib/ide');

const seedProduct = async (marker) => {
  const res = await ide.bd('products', 'create', {
    title: marker, description: '待删样品', sourceNote: '自测来源', status: 2,
    pictureUrls: ['https://example.com/del.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, totalPrice: 10, description: '1 件起' }],
  });
  if (!res || !res.success) throw new Error(`seed 商品失败: ${res && res.error}`);
  return res.data.id || res.data._id;
};

const seedGroupOrder = async (marker) => {
  const res = await ide.bd('groupOrders', 'create', {
    title: marker, description: '待删团单', startAt: '2030-09-01 09:00', endAt: '2030-09-30 20:00',
    productList: [{ id: `del-${Date.now()}`, title: '样品甲', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10 }] }],
  });
  if (!res || !res.success) throw new Error(`seed 团单失败: ${res && res.error}`);
  return res.data.id || res.data._id;
};

const stillListed = async (resource, id) => {
  const list = await ide.bd(resource, 'listVisible', {});
  return ((list && list.data) || []).some(item => String(item.id || item._id) === String(id));
};

let finished = false;

(async () => {
  const stamp = Date.now();
  await ide.ensureLocalOwner();

  // 让原生确认弹窗直接回「确定」。测完一定要还原，否则后面所有流程的 showModal 都会被
  // 自动按确定，别的测试会莫名其妙通过。
  await ide.mockWxApi('showModal', { confirm: true, cancel: false });

  try {
    // ── ① 商品删除 ──────────────────────────────────
    const productMarker = `自测删商品${String(stamp).slice(-6)}`;
    const productId = await seedProduct(productMarker);
    await ide.gotoPage('/pages/productManagement/index', 'productManagement');
    await ide.dataWhenReady('pageState');
    await ide.callMethod('onDelete', { currentTarget: { dataset: { id: productId } } });
    await ide.sleep(1800);
    if (await stillListed('products', productId)) throw new Error(`商品删除没生效，${productId} 仍在列表`);
    console.log(`✅ 商品删除生效：${productMarker} 已不在商品列表`);

    // ── ② 团单删除 ──────────────────────────────────
    const groupMarker = `自测删团${String(stamp).slice(-6)}`;
    const groupOrderId = await seedGroupOrder(groupMarker);
    await ide.gotoPage('/pages/groupOrder/index', 'groupOrder/index');
    await ide.dataWhenReady('pageState');
    await ide.callMethod('onDeleteItinerary', { currentTarget: { dataset: { id: groupOrderId } } });
    await ide.sleep(1800);
    if (await stillListed('groupOrders', groupOrderId)) throw new Error(`团单删除没生效，${groupOrderId} 仍在列表`);
    console.log(`✅ 团单删除生效：${groupMarker} 已不在团单列表`);

    finished = true;
  } finally {
    // 还原一定要在结束进程之前跑：process.exit() 会直接终止，finally 根本来不及执行。
    await ide.restoreWxApi('showModal').catch(() => {});
  }
  process.exit(finished ? 0 : 1);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
