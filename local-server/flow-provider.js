/**
 * UI 写流程自测 · 供应商新增（owner，providers/edit 页，连已开 IDE）。覆盖全新资源 + CRUD 编辑页。
 *
 * UI：owner 进 /pages/providers/edit/index（新增，无 id）→ setData 填 title/contact/note
 *   → callMethod('onSave')（DirectoryRepository.saveProvider → providers.save）；
 * 回查：providers.listVisible 里出现该供应商（title=marker）。
 * 前置同 flow-grouporder.js（config.dataBackend='local' + local-server + cli auto --auto-port 9420）。
 * 跑法：node local-server/flow-provider.js
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

// reLaunch 后 currentPage 偶发拿到未就绪空句柄(data() 字段全 undefined)。轮询重取到目标字段有定义再返回 data。
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
  const marker = `自测供应商${stamp}`;

  const mp = await automator.connect({ wsEndpoint: WS }).catch((e) => { console.error('❌ 连不上 9420:', e.message); process.exit(2); });

  // ① owner 登录（会话通常已持久化；轮询到 isLoggedIn 有定义再判断，避免读空句柄误触发登录）
  await gotoPage(mp, '/pages/groupOrder/index', 'groupOrder/index');
  const hs = await dataWhenReady(mp, 'isLoggedIn');
  if (hs.isLoggedIn === false) {
    try {
      const lp = await mp.reLaunch('/pages/login/login');
      await lp.waitFor(1500); await lp.callMethod('login'); await lp.waitFor(2500);
    } catch (e) { console.log('登录页超时（会话可能已建，继续）'); }
  }
  console.log('登录态: isLoggedIn=', hs.isLoggedIn);

  // ② 进供应商新增页，轮询等 canSave 就绪
  let page = await gotoPage(mp, '/pages/providers/edit/index', 'providers/edit');
  console.log('落页 path=', page && page.path);
  const d0 = await dataWhenReady(mp, 'canSave');
  page = await mp.currentPage();
  console.log('供应商新增页: canSave=', d0.canSave, 'isEdit=', d0.isEdit, 'pageErr=', d0.pageErrorText);
  if (!d0.canSave) { console.error('❌ 无保存权限（canSave=false）'); await mp.disconnect(); process.exit(1); }

  // ③ 填表 → 保存
  await page.setData({
    formData: { title: marker, contact: '自测联系人', note: '自测备注', statusText: '可显示资料' },
    isDirty: true,
  });
  await page.waitFor(300);
  await page.callMethod('onSave');
  await page.waitFor(2000);

  // ④ 回查落库
  const list = await bd('providers', 'listVisible', {}, OWNER);
  const items = (list && list.data) || [];
  const hit = items.find(p => String(p.title) === marker);
  const ok = Boolean(hit) && String(hit.contact) === '自测联系人';
  console.log(ok
    ? `✅ 供应商新增已落库: ${hit._id || hit.id}（联系人=${hit.contact}）`
    : `❌ 未在供应商列表找到（可见数=${items.length}）`);

  await mp.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FLOW 出错:', e && e.message); process.exit(2); });
