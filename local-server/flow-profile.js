/**
 * UI 写流程自测 · 个人资料自编辑（owner，my/info-edit 分包页，连已开 IDE）。覆盖 users 自更新路径。
 *
 * 注：info-edit 只改「当前登录用户」自己的档，当前是 owner → 会持久改 owner 的 displayName（本地 test 库，无妨；
 *     各 flow 的 contactName 都显式传值、不依赖 owner displayName，故无副作用）。
 *
 * UI：owner 进 /pages/my/info-edit/index → setData personInfo.name/phone → callMethod('onSaveInfo')
 *   （DirectoryRepository.saveUser → users.save）；
 * 回查：users.getById(owner) 的 displayName 变成新值。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-profile.js
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
  const newName = `自测昵称${stamp}`;

  // owner id（回查用）
  const login = await callFn('authLogin', {}, OWNER);
  const ownerId = login && login.profile && login.profile.id;
  if (!ownerId) { console.error('❌ 取 owner id 失败:', login && login.error); process.exit(1); }
  console.log('owner id=', ownerId, '原昵称=', login.profile.displayName);

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ① owner 登录
  await gotoPage(mp, '/pages/groupOrder/index', 'groupOrder/index');
  const hs = await dataWhenReady(mp, 'isLoggedIn');
  if (hs.isLoggedIn === false) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }

  // ② 进个人资料编辑页（分包），轮询等 canEdit 就绪
  let page = await gotoPage(mp, '/pages/my/info-edit/index', 'my/info-edit');
  console.log('落页 path=', page && page.path);
  const d0 = await dataWhenReady(mp, 'canEdit');
  page = await mp.currentPage();
  console.log('资料页: canEdit=', d0.canEdit, '预填昵称=', d0.personInfo && d0.personInfo.name);
  if (!d0.canEdit) { console.error('❌ 无编辑权限（canEdit=false）'); await mp.disconnect(); process.exit(1); }

  // ③ 改昵称+手机 → 保存
  await page.setData({ 'personInfo.name': newName, 'personInfo.phone': '13800000000' });
  await page.waitFor(300);
  await page.callMethod('onSaveInfo');
  await page.waitFor(2000);

  // ④ 回查：owner displayName 变新值
  const after = await bd('users', 'getById', { id: ownerId }, OWNER);
  const name = after && after.data ? after.data.displayName : '(读取失败)';
  const ok = name === newName;
  console.log(ok ? `✅ 个人资料编辑生效：displayName = ${name}` : `❌ 未生效，displayName = ${name}（期望 ${newName}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
