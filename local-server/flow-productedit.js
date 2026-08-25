/** UI 写流程自测 · 商品编辑。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const stamp = Date.now();
  const newTitle = `样品改${stamp}`;
  const seed = await ide.bd('products', 'create', {
    title: `样品原${stamp}`, description: '手工样品', sourceNote: '样品来源', pictureUrls: ['https://example.com/sample.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }], status: 2,
  });
  if (!seed || !seed.success) return ide.reportFailure(`seed 商品失败: ${seed && seed.error}`);
  const productId = seed.data._id || seed.data.id;
  await ide.ensureLocalOwner();
  await ide.gotoPage(`/sub-pages/product/add/index?id=${encodeURIComponent(productId)}`, 'product/add');
  const detail = await ide.pageDataWhen(data => data.isEdit && data.currentProduct && data.currentProduct.title);
  if (!detail.isEdit || !detail.currentProduct || !detail.currentProduct.title) return ide.reportFailure('编辑模式预填未就绪');
  await ide.setData({ 'currentProduct.title': newTitle });
  await ide.callMethod('addProductToList');
  await ide.sleep(2000);
  const list = await ide.bd('products', 'listVisible', {});
  const hit = ((list && list.data) || []).find(p => String(p.id || p._id) === String(productId));
  if (!hit || hit.title !== newTitle) return ide.reportFailure(`编辑未生效，标题 = ${(hit && hit.title) || '(未找到)'}`);
  console.log(`✅ 商品编辑生效：标题 = ${hit.title}`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
