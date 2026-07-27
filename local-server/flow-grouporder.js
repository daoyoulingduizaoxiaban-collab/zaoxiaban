/**
 * UI 写流程自测 · 团单开团（owner 身份，连已开 IDE）。
 *
 * 策略：page.setData 填表单 + 直接塞 selectedGoods（绕开跨页 picker）+ callMethod('onSave') 触发真实提交，
 *       再用唯一 title 回查 local-server groupOrders.listVisible 证明**真落库**。
 * 前置同 flow-test.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-grouporder.js
 */
const automator = require('miniprogram-automator');
const http = require('http');

const WS = process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420';
const OWNER = process.env.LOCAL_OPENID || 'dev-owner-openid';

const callLocal = (event, openId) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ event, openId });
  const req = http.request(
    'http://localhost:3000/fn/businessData',
    { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
    (res) => { let s = ''; res.on('data', d => (s += d)); res.on('end', () => { try { resolve(JSON.parse(s).result); } catch (e) { reject(e); } }); },
  );
  req.on('error', reject);
  req.write(body);
  req.end();
});

(async () => {
  const marker = `[自测]开团-${Date.now()}`;
  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => {
    console.error('❌ 连不上 9420:', e.message); process.exit(2);
  });

  // 团单 create 只存商品快照、不校验商品图片，故直接用一个捏造的 goods 对象喂 selectedGoods。
  const goods = [{ id: `sample-${Date.now()}`, title: '样品甲', coverUrl: '', priceSetting: [{ minQuantity: 1, unitPrice: 10 }] }];
  console.log('用商品快照:', goods[0].title, goods[0].id);

  // ① 确认登录态；未登录才去登录页建 owner 会话。
  //    refreshSession 只刷新已有会话、不负责首次登录；本地模式 AuthService.login 只用 wx.login + owner openId，无需手势。
  //    登录页在分包，reLaunch 偶发超时——故 best-effort（会话建成后持久化在 storage，一次即可）。
  let home = await mp.reLaunch('/pages/groupOrder/index');
  await home.waitFor(2500);
  let hs = await home.data();
  if (!hs.isLoggedIn) {
    console.log('未登录，触发首次登录…');
    try {
      const loginPage = await mp.reLaunch('/pages/login/login');
      await loginPage.waitFor(1500);
      await loginPage.callMethod('login');
      await loginPage.waitFor(2500);
    } catch (e) { console.log('登录页 reLaunch 超时（会话可能已建，继续）:', e.message); }
    home = await mp.reLaunch('/pages/groupOrder/index');
    await home.waitFor(3000);
    hs = await home.data();
  }
  console.log('登录态检查: isLoggedIn=', hs.isLoggedIn, 'canUseBusiness=', hs.canUseBusiness);

  // ② 进开团页（分包，reLaunch 后用 currentPage 重新取真正的当前页，避免拿到过期句柄）
  await mp.reLaunch('/sub-pages/groupOrder/add/index');
  const page = await mp.currentPage();
  await page.waitFor(3500);
  const d0 = await page.data();
  console.log('开团页: accessDenied=', d0.accessDenied, 'isPageLoading=', d0.isPageLoading, 'contactName预填=', JSON.stringify(d0.formData && d0.formData.contactName));
  if (d0.accessDenied) { console.error('❌ 被 accessDenied 拦住——owner 未登录成，写流程无法进行'); await mp.disconnect(); process.exit(1); }

  // ③ 填表 + 塞商品
  await page.setData({
    selectedGoods: goods,
    formData: {
      title: marker, description: '自测开团',
      startAt: '2026-08-01 09:00', endAt: '2026-07-31 20:00',
      pickupNote: '自测取货点', paymentNote: '自测付款',
      contactName: '自测团主', contactPhone: '13800000000',
      customerNotice: '', status: 0,
    },
  });
  await page.waitFor(300);

  // ④ 触发提交
  await page.callMethod('onSave');
  await page.waitFor(2000);

  // ⑤ 回查落库
  const list = await callLocal({ resource: 'groupOrders', action: 'listVisible', data: {}, context: {} }, OWNER);
  const hit = ((list && list.data) || []).find(r => r.title === marker);
  console.log(hit ? `✅ 开团已落库: ${hit._id || hit.id}（商品数=${(hit.productList || []).length}）` : '❌ 未在库中找到该团单');

  await mp.disconnect();
  process.exit(hit ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
