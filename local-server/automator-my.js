/**
 * 用 miniprogram-automator 复现「我的」页刷屏 + 抓报错。
 * 前置：本地后端已启动（node local-server/server.js）。
 */
const automator = require('miniprogram-automator');
const path = require('path');

const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const PROJECT = path.join(__dirname, '..');

(async () => {
  let mp;
  try {
    console.log('launching devtools...');
    mp = await automator.launch({ cliPath: CLI, projectPath: PROJECT, timeout: 90000 });
    console.log('launched.');

    // 收集 console 报错（如果支持）
    try {
      mp.on('console', (msg) => {
        const t = msg.type ? msg.type() : '';
        const a = msg.args ? msg.args() : '';
        if (t === 'error' || t === 'warn') console.log(`[console.${t}]`, JSON.stringify(a));
      });
    } catch (e) { /* 某些版本不支持 */ }

    // 1. 去登录页并点登录
    console.log('goto login...');
    let page = await mp.reLaunch('/pages/login/login');
    await mp.waitFor(1500);
    try {
      const btn = await page.$('.login__native-button');
      if (btn) { await btn.tap(); console.log('tapped login'); }
    } catch (e) { console.log('login tap err:', e.message); }
    await mp.waitFor(2500);

    // 2. 进「我的」页，停留观察刷屏
    console.log('goto my...');
    page = await mp.reLaunch('/pages/my/index');
    await mp.waitFor(6000); // 停 6 秒看是否刷屏

    // 3. 读页面关键状态
    const data = await page.data();
    console.log('=== my page data ===');
    console.log(JSON.stringify({
      isLoad: data.isLoad,
      isLoggedIn: data.isLoggedIn,
      accessState: data.accessState,
      accessStateText: data.accessStateText,
      accessStateDesc: data.accessStateDesc,
      canUseBusiness: data.canUseBusiness,
      isNavigatingLogin: data.isNavigatingLogin,
      settingListLen: Array.isArray(data.settingList) ? data.settingList.length : null,
      gridListLen: Array.isArray(data.gridList) ? data.gridList.length : null,
    }, null, 2));

    const cur = await mp.currentPage();
    console.log('current route after wait:', cur && cur.path);
  } catch (err) {
    console.log('AUTOMATOR ERROR:', err && err.stack || err);
  } finally {
    if (mp) { try { await mp.close(); } catch (e) { /* ignore */ } }
    process.exit(0);
  }
})();
