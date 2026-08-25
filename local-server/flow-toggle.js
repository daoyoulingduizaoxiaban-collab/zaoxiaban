/** UI 写流程自测 · 商品上下架。前置：开发者工具开着本专案＋node local-server/server.js。 */
const ide = require('./lib/ide');

(async () => {
  const marker = `样品架${Date.now()}`;
  const seed = await ide.bd('products', 'create', {
    title: marker, description: '手工样品', sourceNote: '样品来源', pictureUrls: ['https://example.com/sample.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }], status: 2,
  });
  if (!seed || !seed.success) return ide.reportFailure(`seed 商品失败: ${seed && seed.error}`);
  const productId = seed.data._id || seed.data.id;
  await ide.ensureLocalOwner();
  await ide.gotoPage('/pages/productManagement/index', 'productManagement');
  let products = await ide.dataWhenReady('allProducts');
  for (let i = 0; i < 10 && !(products || []).some(p => String(p.id || p._id) === String(productId)); i++) {
    await ide.sleep(800);
    products = await ide.getData('allProducts');
  }
  if (!(products || []).some(p => String(p.id || p._id) === String(productId))) return ide.reportFailure('列表里没找到 seed 的商品');
  await ide.callMethod('onToggleStatus', { currentTarget: { dataset: { id: productId } } });
  await ide.sleep(1800);
  const list = await ide.bd('products', 'listVisible', {});
  const hit = ((list && list.data) || []).find(p => String(p.id || p._id) === String(productId));
  if (!hit || Number(hit.status) !== 1) return ide.reportFailure(`未生效，status = ${hit && hit.status}`);
  console.log(`✅ 上下架切换生效：商品 ${productId} status = 1`);
  process.exit(0);
})().catch(e => ide.reportFailure(`FLOW 出错: ${e && e.message}`));
