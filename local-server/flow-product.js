/**
 * UI 写流程自测 · 商品新增（owner 身份，连已开 IDE）。
 *
 * 边界：真图片选择器 wx.chooseMedia 是原生手势、天然不可自动化；且 local 后端无云存储，
 *       临时路径不是 durable URL（后端 hasOnlyDurableAssetUrls 只收 cloud://|https://|空）→ 真选图路径 local 跑不通。
 *       故本流用 setData 往 currentProduct.pictureUrls 注入一个 https:// 图 URL 绕开选择器，
 *       专注证明「表单填好 → 校验 → create → 落库」这条 UI 写路径。
 *
 * UI：owner 登录 → 进 /sub-pages/product/add/index（新增）→ setData 填 currentProduct
 *     （标题/描述/来源避开 INTERNAL_PRODUCT_COPY_RE 禁词，价格规则，https 图）→ callMethod('addProductToList')；
 * 回查：owner products.listVisible 里出现该商品（title=marker）。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-product.js
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

// reLaunch 后校验真的落在目标页；devtools 热重载会把导航重置到编译起始页并覆盖 reLaunch，故重试。
const gotoPage = async (mp, url, matchPath, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    try { await mp.reLaunch(url); } catch (e) { /* 抖动，重试 */ }
    await new Promise(r => setTimeout(r, 1600));
    const p = await mp.currentPage();
    if (p && String(p.path || '').indexOf(matchPath) >= 0) return p;
  }
  return mp.currentPage();
};

(async () => {
  const stamp = Date.now();
  const marker = `样品${stamp}`; // 避开禁词(QA/mock/test/local/测试/本地/自动化…)，纯中文+数字

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ① owner 登录（登录优先模式，best-effort）
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ② 进商品新增页（sub-package，reLaunch 重试到确认落页），轮询等就绪
  let page = await gotoPage(mp, '/sub-pages/product/add/index', 'product/add');
  console.log('落页 path=', page && page.path);
  let d0 = await page.data();
  for (let i = 0; i < 8 && d0.isPageLoading && !d0.accessDenied; i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('新增页: accessDenied=', d0.accessDenied, 'isPageLoading=', d0.isPageLoading, 'isEdit=', d0.isEdit);
  if (d0.accessDenied) { console.error('❌ 被 accessDenied 拦住'); await mp.disconnect(); process.exit(1); }

  // ③ setData 填表（注入 https 图绕开原生选择器 + 干净文案 + 有效价格规则）
  await page.setData({
    currentProduct: {
      id: 0,
      title: marker,
      description: '手工样品一件',
      pictureUrls: ['https://example.com/sample.jpg'],
      priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起', totalPrice: 10 }],
      providerId: '',
      status: 2,
      sourceNote: '样品来源',
    },
  });
  await page.waitFor(300);

  // ④ 触发保存
  await page.callMethod('addProductToList');
  await page.waitFor(2000);

  // ⑤ 回查落库
  const list = await bd('products', 'listVisible', {}, OWNER);
  const items = (list && list.data) || [];
  const hit = items.find(p => String(p.title) === marker);
  const ok = Boolean(hit) && Array.isArray(hit.pictureUrls) && hit.pictureUrls.length > 0 && (hit.priceSetting || hit.priceSettings || []).length > 0;
  console.log(ok
    ? `✅ 商品新增已落库: ${hit._id || hit.id}（图=${hit.pictureUrls.length} 张，价格规则=${(hit.priceSetting || hit.priceSettings || []).length} 组）`
    : `❌ 未在商品列表找到该商品（可见商品数=${items.length}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
