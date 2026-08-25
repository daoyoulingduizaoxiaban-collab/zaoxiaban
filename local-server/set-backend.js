/**
 * 切数据后端（本地服务 ⇄ 微信云开发），不改任何源码。
 *
 * 为什么不再改 config.js：改源码会触发开发者工具热重载，把模拟器导航重置到编译起始页，
 * 自动化测试会莫名其妙停在错的页面；而且很容易忘了还原就提交上去。
 * 现在 config.dataBackend 每次都从本机储存读，写完立刻生效、不必重新编译。
 *
 * 跑法（要先 cli auto --auto-port 9420 挂上已开的开发者工具）：
 *   node local-server/set-backend.js local    # 切到本地服务
 *   node local-server/set-backend.js cloud    # 切回微信云开发
 *   node local-server/set-backend.js          # 只看现在是哪个
 *
 * 也可以在 App 里切：设置页最底下的「数据后端」（仅 DEV 显示）。
 */
const automator = require('miniprogram-automator');

const KEY = 'dao_you_ling_data_backend';
const WS = process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420';
const target = String(process.argv[2] || '').trim();

if (target && target !== 'local' && target !== 'cloud') {
  console.error(`❌ 只能是 local 或 cloud，收到：${target}`);
  process.exit(1);
}

(async () => {
  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: WS });
  } catch (err) {
    console.error(`❌ 连不上开发者工具（${WS}）。先跑：`);
    console.error('   /Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project "$(pwd)" --auto-port 9420');
    process.exit(1);
  }

  const read = () => mp.evaluate(k => wx.getStorageSync(k) || '(未设定，走预设 cloud)', KEY);

  if (!target) {
    console.log(`当前数据后端：${await read()}`);
    process.exit(0);
  }

  await mp.evaluate((k, v) => wx.setStorageSync(k, v), KEY, target);
  const now = await read();
  const ok = now === target;
  console.log(`${ok ? '✅' : '❌'} 数据后端 = ${now}`);
  if (ok && target === 'local') console.log('   记得本地服务有开着：node local-server/server.js');
  process.exit(ok ? 0 : 1);
})();
