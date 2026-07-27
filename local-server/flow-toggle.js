/**
 * UI 写流程自测 · 商品上下架（owner 商品管理列表页，连已开 IDE）。
 *
 * seed(http)：owner 建一个 PUBLISHED(status=2) 商品；
 * UI：owner 进 /pages/productManagement/index（tabBar 管理列表）→ 轮询 allProducts 拿到该商品
 *   → callMethod('onToggleStatus',{dataset:{id}}) 翻转上下架；
 * 回查：products.listVisible 里该商品 status 由 2(上架) 变 1(下架)。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-toggle.js
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

const gotoPage = async (mp, url, matchPath, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    try { await mp.reLaunch(url); } catch (e) { /* 抖动，重试 */ }
    await new Promise(r => setTimeout(r, 1600));
    const p = await mp.currentPage();
    if (p && String(p.path || '').indexOf(matchPath) >= 0) return p;
  }
  return mp.currentPage();
};

const statusOf = async (productId) => {
  const r = await bd('products', 'listVisible', {}, OWNER);
  const p = ((r && r.data) || []).find(x => String(x.id || x._id) === String(productId));
  return p ? Number(p.status) : NaN;
};

(async () => {
  const stamp = Date.now();
  const marker = `样品架${stamp}`; // 避禁词

  // ① seed 一个上架商品
  const res = await bd('products', 'create', {
    title: marker, description: '手工样品', sourceNote: '样品来源',
    pictureUrls: ['https://example.com/sample.jpg'],
    priceSetting: [{ minQuantity: 1, unitPrice: 10, description: '1 件起' }],
    status: 2,
  }, OWNER);
  if (!res || !res.success) { console.error('❌ seed 商品失败:', res && res.error); process.exit(1); }
  const productId = res.data._id || res.data.id;
  console.log('seed 商品 OK: id=', productId, '初始 status=', Number(res.data.status), '(2=上架)');

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录（best-effort）
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进商品管理页，轮询等 allProducts 出现该商品
  let page = await gotoPage(mp, '/pages/productManagement/index', 'productManagement');
  console.log('落页 path=', page && page.path);
  let d0 = await page.data();
  const findIt = (d) => (d.allProducts || []).find(p => String(p.id) === String(productId));
  for (let i = 0; i < 10 && !findIt(d0); i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('管理页: 商品总数=', (d0.allProducts || []).length, '找到目标=', Boolean(findIt(d0)));
  if (!findIt(d0)) { console.error('❌ 列表里没找到 seed 的商品'); await mp.disconnect(); process.exit(1); }

  // ④ 翻转上下架
  await page.callMethod('onToggleStatus', { currentTarget: { dataset: { id: productId } } });
  await page.waitFor(1800);

  // ⑤ 回查：status 由 2 变 1
  const after = await statusOf(productId);
  const ok = after === 1;
  console.log(ok ? `✅ 上下架切换生效：商品 ${productId} status = ${after}(1=下架)` : `❌ 未生效，status = ${after}`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
