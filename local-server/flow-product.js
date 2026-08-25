/** UI 写流程自测 · 商品新增。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const marker = `样品${Date.now()}`;
  await ide.ensureLocalOwner();
  await ide.gotoPage('/sub-pages/product/add/index', 'product/add');
  const initial = await ide.pageData();
  if (initial.accessDenied) return ide.reportFailure('被 accessDenied 拦住');
  await ide.setData({ currentProduct: {
    id: 0, title: marker, description: '手工样品一件', pictureUrls: ['https://example.com/sample.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起', totalPrice: 10 }], providerId: '', status: 2, sourceNote: '样品来源',
  } });
  await ide.callMethod('addProductToList');
  await ide.sleep(2000);
  const list = await ide.bd('products', 'listVisible', {});
  const hit = ((list && list.data) || []).find(p => String(p.title) === marker);
  if (!hit) return ide.reportFailure('未在商品列表找到该商品');
  if (!Array.isArray(hit.pictureUrls) || !hit.pictureUrls.length) return ide.reportFailure('商品落库了但图片没存进去');
  // 价格档一定要回查：商品存档时价格规则被静默丢掉的话，只验图片这支测试照样会绿。
  if (!((hit.priceSetting || hit.priceSettings || []).length)) return ide.reportFailure('商品落库了但价格档没存进去');
  console.log(`✅ 商品新增已落库: ${hit._id || hit.id}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
