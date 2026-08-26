/*
 * businessData 全动作验证探针（拆分回归网）。
 * 原理：businessData.main 的 try/catch 把「意外抛错」(如漏 require 的 ReferenceError) 统一转成
 *   通用文案「资料服务暂时不可用」；正常业务失败是具体文案。
 *   → 任何动作返回通用文案 = 红旗(多半漏 require/抛错)。
 * 用 owner 身份把每个资源的每个动作都执行一遍(尽量走进主体),对比拆分前后应一致无红旗。
 * 跑法：node local-server/verify-actions.js
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const PORT = 3998;
const DB_FILE = path.join(os.tmpdir(), `verify-actions-${Date.now()}.json`);
const GENERIC = '资料服务暂时不可用，请稍后再试';

const call = (pathname, body) => new Promise((resolve, reject) => {
  const data = JSON.stringify(body || {});
  const req = http.request(
    { host: '127.0.0.1', port: PORT, path: pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
    (res) => { let raw = ''; res.on('data', c => (raw += c)); res.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); } }); },
  );
  req.on('error', reject);
  if (pathname !== '/health') req.write(data);
  req.end();
});
const fn = (name, event, openId) => call(`/fn/${name}`, { event, openId }).then(r => r.result || {});

const flags = [];
/**
 * 每个动作都应该跑成功。两种失败都要报：
 *   🚩 通用错误文案 = 崩溃/漏 require（原本只抓这种）
 *   ❌ 具体业务文案 = 种子资料不合法，动作根本没走进主体
 *
 * ⚠️ 第二种以前不算问题，结果 2026-08-26 加了「出团不得晚于收单截止」防呆之后，
 * 种子的日期正好违反它，团单与客户订单共 8 个动作全部走不进函式主体，
 * 这支却照样印「无红旗」——回归网瞎了整整一轮。别再放行业务失败。
 *
 * 真的预期会失败的负向案例，传 expectFail 说明原因。
 */
const bd = async (label, resource, action, data, openId = 'dev-owner', { expectFail = '' } = {}) => {
  const res = await fn('businessData', { resource, action, data }, openId);
  const failed = Boolean(res && res.success === false);
  const crashed = failed && res.error === GENERIC;
  const bad = crashed || (failed && !expectFail);
  const mark = crashed ? '🚩' : (bad ? '❌' : '  ');
  console.log(`${mark} ${label.padEnd(34)} success=${res.success} err=${res.error || ''}`);
  if (bad) flags.push(`${label}：${crashed ? '崩溃/漏 require' : res.error}`);
  return res;
};

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), LOCAL_DB_FILE: DB_FILE, OWNER_OPENIDS: 'dev-owner', ADMIN_OPENIDS: '' },
    stdio: 'ignore',
  });
  try {
    for (let i = 0; i < 50; i++) { try { const r = await call('/health'); if (r.ok) break; } catch (e) { /* retry */ } await new Promise(r => setTimeout(r, 100)); }
    await call('/reset', {});
    await fn('authLogin', { code: 'x' }, 'dev-owner'); // owner bootstrap
    await fn('authLogin', { code: 'x' }, 'cust-1'); // 一个客户

    // ---- groupOrders ----
    const go = await bd('groupOrders.create', 'groupOrders', 'create', {
      title: '验证团', description: 'd', startAt: '2030-01-01 09:00', endAt: '2030-01-02 20:00',
      pickupNote: '取货', paymentNote: '付款', contactName: '团主', contactPhone: '13800000000',
      productList: [{ id: 'p1', title: '商品', status: 2, priceSetting: [{ minQuantity: 1, unitPrice: 10 }] }],
    });
    const gid = go.data && go.data.id;
    const stoken = go.data && go.data.shareToken;
    await bd('groupOrders.listVisible', 'groupOrders', 'listVisible', {});
    await bd('groupOrders.getById', 'groupOrders', 'getById', { id: gid });
    await bd('groupOrders.update', 'groupOrders', 'update', { id: gid, data: { title: '验证团2', description: 'd', startAt: '2030-01-01 09:00', endAt: '2030-01-02 20:00', pickupNote: '取', paymentNote: '付', contactName: '团主', contactPhone: '13800000000' } });
    await bd('groupOrders.removeProduct', 'groupOrders', 'removeProduct', { groupOrderId: gid, productId: 'p2' });

    // ---- customerOrders (客户身份下单,需 shareToken) ----
    const order = await bd('customerOrders.create', 'customerOrders', 'create', {
      groupOrderId: gid, shareToken: stoken, customerName: '客户A', customerPhone: '13900000000',
      items: [{ productId: 'p1', quantity: 1, amount: 1, totalPrice: 10 }], totalPrice: 10,
    }, 'cust-1');
    const oid = order.data && order.data.id;
    await bd('customerOrders.listVisible', 'customerOrders', 'listVisible', {});
    await bd('customerOrders.getGroupOrderEntry', 'customerOrders', 'getGroupOrderEntry', { groupOrderId: gid });
    await bd('customerOrders.listByGroupOrder', 'customerOrders', 'listByGroupOrder', { groupOrderId: gid });
    await bd('customerOrders.getById', 'customerOrders', 'getById', { id: oid });
    await bd('customerOrders.updatePaymentStatus', 'customerOrders', 'updatePaymentStatus', { id: oid, nextStatus: 1, note: 't', paymentMethod: '微信', paymentProofUrls: ['https://x/p.png'], declaredAmount: 10 });

    // ---- users ----
    await bd('users.listPending', 'users', 'listPending', {});
    await bd('users.listVisible', 'users', 'listVisible', {});
    const custRec = await bd('users.getBySelf(cust)', 'users', 'listVisible', {}, 'cust-1');
    const custId = custRec.data && custRec.data[0] && custRec.data[0].id;
    await bd('users.getById', 'users', 'getById', { id: custId });
    await bd('users.save', 'users', 'save', { id: custId, name: '客户A', phone: '13900000000' });
    await bd('users.review', 'users', 'review', { id: custId, reviewStatus: 'approved', roles: ['customer', 'guide'], role: 'customer' });
    await bd('users.applyForRole(cust)', 'users', 'applyForRole', { requestedRole: 'guide', name: '客户A', phone: '13900000000' }, 'cust-1');

    // ---- providers ----
    const prov = await bd('providers.save(create)', 'providers', 'save', { title: '验证供应商', contact: '联系人' });
    const provId = prov.data && prov.data.id;
    await bd('providers.listVisible', 'providers', 'listVisible', {});
    await bd('providers.getById', 'providers', 'getById', { id: provId });
    await bd('providers.setStatus', 'providers', 'setStatus', { id: provId, status: 'disabled' });
    await bd('providers.statusMap', 'providers', 'statusMap', {});
    await bd('providers.remove', 'providers', 'remove', { id: provId });

    // ---- feedbacks ----
    await bd('feedbacks.create(cust)', 'feedbacks', 'create', { content: '验证反馈', contextPage: 'x' }, 'cust-1');
    await bd('feedbacks.create(anon未登录)', 'feedbacks', 'create', { content: '匿名验证反馈', contextPage: 'y' }, 'anon-probe');
    await bd('feedbacks.list', 'feedbacks', 'list', {});

    console.log(`\n结果: ${flags.length === 0 ? '✅ 全部动作都跑成功(无崩溃,也没有种子失效)' : `❌ ${flags.length} 个问题:\n  - ${flags.join('\n  - ')}`}`);
    process.exitCode = flags.length ? 1 : 0;
  } catch (err) {
    console.log('探针自身出错:', err && err.message);
    process.exitCode = 2;
  } finally {
    child.kill();
  }
})();
