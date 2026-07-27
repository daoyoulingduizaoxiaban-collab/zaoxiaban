/**
 * UI 写流程自测 · 客户下单（owner 身份即可，连已开 IDE）。
 *
 * 依据权限矩阵 CUSTOMER_ORDER_CREATE=[customer,owner,admin]，且 getShareAccessError 对
 * owner/admin/归属 guide 直接放行（无需 shareToken）→ 用 owner 就能跑通完整下单 UI，
 * 不必切 customer 身份+重编 IDE。（customer+shareToken 的更严格路径见「待续」，需 GUI 重编。）
 *
 * seed：owner 经 http 建一个「开团中(OPEN)」团单，productList 带一件**显式 status=2(上架)**的商品
 *       （normalizeGroupOrderPayload 不给 productList 补 status 默认值，不写死会被下单页过滤掉）；
 * UI：owner 登录 → 进 /pages/customerOrders/edit?groupOrderId=<id> → 填数量(走真实 onQuantityInput 计价)
 *     + 姓名/手机 → callMethod('onSave') 触发真实提交；
 * 回查：owner customerOrders.listByGroupOrder(<id>) 里出现该单、金额>0、姓名=marker。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-order.js
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
    await new Promise(r => setTimeout(r, 1500));
    const p = await mp.currentPage();
    if (p && String(p.path || '').indexOf(matchPath) >= 0) return p;
  }
  return mp.currentPage();
};

(async () => {
  const stamp = Date.now();
  const customerMarker = `[自测]下单客-${stamp}`;

  // ① seed 一个 OPEN 团单（不传 status → 默认 OPEN），商品显式 status=2 + priceSetting 才能计价/被展示。
  const seedRes = await bd('groupOrders', 'create', {
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
  }, OWNER);
  if (!seedRes || !seedRes.success) { console.error('❌ seed 团单失败:', seedRes && seedRes.error); process.exit(1); }
  const groupOrderId = seedRes.data._id || seedRes.data.id;
  console.log('seed 团单 OK: id=', groupOrderId, 'shareToken=', seedRes.data.shareToken, '商品数=', (seedRes.data.productList || []).length);

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ② owner 登录（登录优先模式，best-effort）
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  if (!(await home.data()).isLoggedIn) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ③ 进客户下单页（reLaunch 重试到确认落页），再轮询等 productRows 就绪
  let page = await gotoPage(mp, `/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(groupOrderId)}`, 'customerOrders/edit');
  console.log('落页 path=', page && page.path);
  let d0 = await page.data();
  for (let i = 0; i < 8 && (d0.isLoading || !(d0.productRows || []).length) && !d0.accessDenied && !d0.pageErrorText; i++) {
    await page.waitFor(800);
    page = await mp.currentPage();
    d0 = await page.data();
  }
  console.log('下单页: accessDenied=', d0.accessDenied, 'isLoading=', d0.isLoading, 'productRows=', (d0.productRows || []).length, 'pageErr=', d0.pageErrorText);
  if (d0.accessDenied) { console.error('❌ 被 accessDenied 拦住'); await mp.disconnect(); process.exit(1); }
  if (!(d0.productRows || []).length) { console.error('❌ 无可下单商品（seed 的 status/过滤问题）'); await mp.disconnect(); process.exit(1); }

  // ④ 填数量（走真实 onQuantityInput 计价）+ 姓名/手机
  const pid = d0.productRows[0].id;
  await page.callMethod('onQuantityInput', { currentTarget: { dataset: { id: pid } }, detail: { value: '2' } });
  await page.waitFor(300);
  await page.callMethod('onInputChange', { currentTarget: { dataset: { field: 'customerName' } }, detail: { value: customerMarker } });
  await page.callMethod('onInputChange', { currentTarget: { dataset: { field: 'customerPhone' } }, detail: { value: '13900000000' } });
  await page.waitFor(300);
  const dFill = await page.data();
  console.log('填表后: totalPrice=', dFill.totalPrice, 'name=', dFill.formData.customerName, 'phone=', dFill.formData.customerPhone);

  // ⑤ 触发提交（onSave 里 create 先于 wx.showModal 完成，落库不受弹窗影响）
  await page.callMethod('onSave');
  await page.waitFor(2000);

  // ⑥ 回查：该团单下出现订单、金额>0、姓名=marker
  const list = await bd('customerOrders', 'listByGroupOrder', { groupOrderId }, OWNER);
  const orders = (list && list.data) || [];
  const hit = orders.find(o => String(o.customerName) === customerMarker);
  const ok = Boolean(hit) && Number(hit.totalPrice) > 0;
  console.log(ok
    ? `✅ 客户下单已落库: ${hit._id || hit.id}（金额=￥${hit.totalPrice}，商品数=${(hit.items || hit.productList || []).length}）`
    : `❌ 未在该团单下找到下单记录（本团订单数=${orders.length}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
