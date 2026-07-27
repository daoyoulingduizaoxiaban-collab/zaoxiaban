/**
 * 业务流程自动化自测(连已开的开发者工具,勿重启)。
 *
 * 思路:automator 驱动 UI 做真实操作 → 用「唯一标记」回查本地后端,证明 UI 动作真落库。
 * 前置:
 *   1. config.dataBackend === 'local'(测试期临时切,测完 git 还原)
 *   2. local-server 已启动(node local-server/server.js)
 *   3. 已挂自动化端口:cli auto --project <path> --auto-port 9420
 * 跑法:node local-server/flow-test.js
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
  const marker = `[自测]报Bug-${Date.now()}`;
  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: WS });
  } catch (e) {
    console.error('❌ 连不上自动化端口 9420:', e.message);
    process.exit(2);
  }

  // ① 进报Bug页
  const page = await mp.reLaunch('/pages/feedback/index');
  await page.waitFor(600);
  console.log('已进入报Bug页');

  // ② 填内容(验证输入绑定)
  const ta = await page.$('.textarea');
  await ta.input(marker);
  await page.waitFor(200);
  const d1 = await page.data();
  console.log('输入后 content =', JSON.stringify(d1.content));

  // ③ 点提交
  const btn = await page.$('.submit-btn');
  await btn.tap();
  await page.waitFor(1500);

  // ④ 回查后端:该 marker 是否落库
  const list = await callLocal({ resource: 'feedbacks', action: 'list', data: {}, context: {} }, OWNER);
  const rows = (list && list.data) || [];
  const hit = rows.find(r => r.content === marker);
  console.log(hit ? `✅ UI 提交已落库: ${hit._id}` : '❌ 未在库中找到该反馈(UI 提交可能失败)');

  await mp.disconnect();
  process.exit(hit ? 0 : 1);
})().catch((e) => { console.error('FLOW-TEST 出错:', e && e.message); process.exit(2); });
