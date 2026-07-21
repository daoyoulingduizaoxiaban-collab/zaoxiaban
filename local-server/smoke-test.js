/**
 * 本地后端冒烟测试：自起服务 → 跑真实闭环（走 HTTP + 真云函数 + 垫片库）→ 断言 → 退出。
 * 用法： node local-server/smoke-test.js
 * 验证：C-CUSTOMER-DEFAULT（登录即已审核客户）、owner 白名单、businessData 读写与持久化。
 */
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 3987;
const DB_FILE = path.join(os.tmpdir(), `local-server-smoke-${Date.now()}.json`);
const BASE = `http://localhost:${PORT}`;

let pass = 0; let fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, extra !== undefined ? JSON.stringify(extra) : ''); }
};

const call = (pathname, body) => new Promise((resolve, reject) => {
  const data = Buffer.from(JSON.stringify(body || {}));
  const req = http.request(`${BASE}${pathname}`, {
    method: pathname === '/health' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
  }, (res) => {
    let raw = '';
    res.on('data', c => { raw += c; });
    res.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); } });
  });
  req.on('error', reject);
  if (pathname !== '/health') req.write(data);
  req.end();
});

const fn = (name, event, openId) => call(`/fn/${name}`, { event, openId }).then(r => r.result || {});
const waitHealth = async () => {
  for (let i = 0; i < 50; i++) {
    try { const r = await call('/health'); if (r.ok) return; } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('服务未就绪');
};

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), LOCAL_DB_FILE: DB_FILE, OWNER_OPENIDS: 'dev-owner', ADMIN_OPENIDS: '' },
    stdio: 'ignore',
  });

  let failed = false;
  try {
    await waitHealth();
    await call('/reset', {});

    // 1. owner 白名单登录（首个用户，命中 allowlist → owner + approved）
    const owner = await fn('authLogin', { code: 'x' }, 'dev-owner');
    ok('owner 白名单命中', owner.profile && owner.profile.role === 'owner', owner.profile && owner.profile.role);
    ok('owner 状态 approved', owner.profile && owner.profile.reviewStatus === 'approved');

    // 2. 新客户登录 → 即已审核客户（C-CUSTOMER-DEFAULT，走真 authLogin；owner 已存在故不触发 bootstrap）
    const cust = await fn('authLogin', { code: 'x' }, 'cust-1');
    ok('新用户登录成功', cust.success === true, cust);
    ok('默认角色=customer', cust.profile && cust.profile.role === 'customer', cust.profile && cust.profile.role);
    ok('默认状态=approved 无需审核', cust.profile && cust.profile.reviewStatus === 'approved', cust.profile && cust.profile.reviewStatus);

    // 3. 再次登录同一客户 → 幂等，仍是同一 openId
    const cust2 = await fn('authLogin', { code: 'x' }, 'cust-1');
    ok('重复登录幂等', cust2.success === true && cust2.openId === 'cust-1', cust2.openId);

    // 4. businessData：owner 创建商品（写入 + 校验通过）
    const created = await fn('businessData', {
      resource: 'products', action: 'create',
      data: {
        title: '桂花糕', description: '手工桂花糕伴手礼', sourceNote: '杭州老字号',
        pictureUrls: ['https://example.com/a.jpg'],
        priceSetting: [{ minQuantity: 1, unitPrice: 30 }],
        status: 2,
      },
    }, 'dev-owner');
    ok('商品创建成功', created.success === true, created.error);
    const productId = created.data && (created.data.id || created.data._id);
    ok('返回商品 id', Boolean(productId));

    // 5. 列表可见 → 读回刚建的商品
    const list = await fn('businessData', { resource: 'products', action: 'listVisible', data: {} }, 'dev-owner');
    ok('商品列表读取成功', list.success === true, list.error);
    ok('列表含新建商品', Array.isArray(list.data) && list.data.some(p => (p.id || p._id) === productId), list.data && list.data.length);

    // 6. 持久化：直接读数据库文件，商品仍在（模拟重开）
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    ok('数据落库持久化', Array.isArray(raw.products) && raw.products.some(p => p._id === String(productId)), raw.products && raw.products.length);
    ok('users 落库(含 cust-1 与 dev-owner)',
      Array.isArray(raw.users) && raw.users.some(u => u.openId === 'cust-1') && raw.users.some(u => u.openId === 'dev-owner'));

    // 7. 客户无权创建商品（负向）
    const denied = await fn('businessData', {
      resource: 'products', action: 'create',
      data: { title: 'x', description: 'x', sourceNote: 'x', pictureUrls: ['https://e.com/a.jpg'], priceSetting: [{ minQuantity: 1, unitPrice: 1 }] },
    }, 'cust-1');
    ok('客户创建商品被拒(后端鉴权)', denied.success === false, denied);

  } catch (err) {
    failed = true;
    console.log('  ❌ 异常:', err.message);
  } finally {
    child.kill();
    try { fs.unlinkSync(DB_FILE); } catch (e) { /* ignore */ }
  }

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail || failed ? 1 : 0);
})();
