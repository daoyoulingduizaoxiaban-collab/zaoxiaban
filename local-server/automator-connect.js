/**
 * 连接已开的 DevTools（先跑：cli auto --project <path> --auto-port 9420），
 * 复现登录 → 我的页，读状态。避免 launch 再开一个实例冲突。
 */
const automator = require('miniprogram-automator');

(async () => {
  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
    console.log('connected.');

    console.log('goto login...');
    let page = await mp.reLaunch('/pages/login/login');
    await mp.waitFor(1500);
    try {
      const btn = await page.$('.login__native-button');
      if (btn) { await btn.tap(); console.log('tapped login'); }
      else console.log('login button not found');
    } catch (e) { console.log('login tap err:', e.message); }
    await mp.waitFor(2500);

    console.log('goto my...');
    page = await mp.reLaunch('/pages/my/index');
    await mp.waitFor(5000);

    const data = await page.data();
    console.log('=== my page data ===');
    console.log(JSON.stringify({
      isLoad: data.isLoad,
      isLoggedIn: data.isLoggedIn,
      accessState: data.accessState,
      accessStateText: data.accessStateText,
      canUseBusiness: data.canUseBusiness,
      settingListLen: Array.isArray(data.settingList) ? data.settingList.length : null,
      gridListLen: Array.isArray(data.gridList) ? data.gridList.length : null,
      settingNames: Array.isArray(data.settingList) ? data.settingList.map(i => i.name) : null,
    }, null, 2));

    const cur = await mp.currentPage();
    console.log('current route:', cur && cur.path);
  } catch (err) {
    console.log('ERROR:', err && err.message || err);
  } finally {
    if (mp) { try { await mp.disconnect(); } catch (e) { /* ignore */ } }
    process.exit(0);
  }
})();
