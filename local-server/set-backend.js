/** 切数据后端（本地服务 ⇄ 微信云开发），不改任何源码，也不需要 auto-port。 */
const ide = require('./lib/ide');

const KEY = 'dao_you_ling_data_backend';
const target = String(process.argv[2] || '').trim();
if (target && target !== 'local' && target !== 'cloud') {
  console.error(`❌ 只能是 local 或 cloud，收到：${target}`);
  process.exit(1);
}

(async () => {
  const read = () => ide.evaluate(`function() { return wx.getStorageSync('${KEY}') || '(未设定，走预设 cloud)'; }`);
  if (!target) {
    console.log(`当前数据后端：${await read()}`);
    return process.exit(0);
  }
  await ide.evaluate(`function() { wx.setStorageSync('${KEY}', '${target}'); return wx.getStorageSync('${KEY}'); }`);
  const now = await read();
  const ok = now === target;
  console.log(`${ok ? '✅' : '❌'} 数据后端 = ${now}`);
  if (ok && target === 'local') console.log('   记得本地服务有开着：node local-server/server.js');
  process.exit(ok ? 0 : 1);
})().catch(e => ide.reportFailure(`切换数据后端失败: ${e && e.message}`));
