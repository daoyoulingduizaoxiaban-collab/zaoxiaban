/**
 * UI 写流程自测 · 商品编辑（owner，product/add 页编辑模式，连已开 IDE）。覆盖 product update 路径。
 *
 * seed(http)：owner 建一个商品 → id；
 * UI：owner 进 /sub-pages/product/add/index?id=<id>（isEdit=true，预填 currentProduct）
 *   → 轮询等预填就绪 → setData 改标题 → callMethod('addProductToList')（isEdit → ProductService.update）；
 * 回查：products.listVisible 该商品标题变新值。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-productedit.js
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

(async () => {
  const stamp = Date.now();
  const newTitle = `样品改${stamp}`; // 避禁词

  // ① seed 一个商品
  const seed = await bd('products', 'create', {
    title: `样品原${stamp}`, description: '手工样品', sourceNote: '样品来源',
    pictureUrls: ['https://example.com/sample.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }], status: 2,
  }, OWNER);
  if (!seed || !seed.success) { console.error('❌ seed 商品失败:', seed && seed.error); process.exit(1); }
  const productId = seed.data._id || seed.data.id;
  console.log('seed 商品 OK: id=', productId, '原标题=', seed.data.title);

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录
  await gotoPage(mp, '/pages/groupOrder/index', 'groupOrder/index');
  const hs = await dataWhenReady(mp, 'isLoggedIn');
  if (hs.isLoggedIn === false) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进商品编辑页（sub-package），轮询等预填就绪
  let page = await gotoPage(mp, `/sub-pages/product/add/index?id=${encodeURIComponent(productId)}`, 'product/add');
  console.log('落页 path=', page && page.path);
  let d0 = await dataWhenReady(mp, 'isEdit');
  for (let i = 0; i < 10 && !(d0.isEdit && d0.currentProduct && String(d0.currentProduct.title || '').length); i++) {
    await new Promise(r => setTimeout(r, 800));
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('编辑页: isEdit=', d0.isEdit, 'accessDenied=', d0.accessDenied, '预填标题=', d0.currentProduct && d0.currentProduct.title);
  if (d0.accessDenied) { console.error('❌ 被 accessDenied 拦住'); await mp.disconnect(); process.exit(1); }
  if (!(d0.isEdit && d0.currentProduct && String(d0.currentProduct.title || '').length)) { console.error('❌ 编辑模式预填未就绪'); await mp.disconnect(); process.exit(1); }

  // ④ 改标题 → 保存（走 update）
  await page.setData({ 'currentProduct.title': newTitle });
  await page.waitFor(300);
  await page.callMethod('addProductToList');
  await page.waitFor(2000);

  // ⑤ 回查：标题已改
  const list = await bd('products', 'listVisible', {}, OWNER);
  const hit = ((list && list.data) || []).find(p => String(p.id || p._id) === String(productId));
  const title = hit ? hit.title : '(未找到)';
  const ok = title === newTitle;
  console.log(ok ? `✅ 商品编辑生效：标题 = ${title}` : `❌ 编辑未生效，标题 = ${title}（期望 ${newTitle}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
