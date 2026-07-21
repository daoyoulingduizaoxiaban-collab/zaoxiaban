/**
 * 本地后端：用 wx-server-sdk 垫片直接运行 cloudfunctions/* 的原始源码。
 * 客户端 config.dataBackend='local' 时，wx.request 到这里，形状与 wx.cloud.callFunction 对齐。
 *
 * 启动： node local-server/server.js
 * 环境变量：
 *   PORT              监听端口，默认 3000
 *   OWNER_OPENIDS     owner 白名单（逗号分隔），默认 dev-owner-openid
 *   LOCAL_DB_FILE     数据库 JSON 路径，默认 local-server/.data/dev.json
 */
const http = require('http');
const path = require('path');
const Module = require('module');

// 云函数在 module load 时读取这些 env，必须先设置再 require
process.env.APP_ENV = process.env.APP_ENV || 'DEV';
process.env.ALLOW_ROLE_PREVIEW = process.env.ALLOW_ROLE_PREVIEW || 'true';
process.env.OWNER_OPENIDS = process.env.OWNER_OPENIDS || 'dev-owner-openid';
process.env.ADMIN_OPENIDS = process.env.ADMIN_OPENIDS || '';

// 把 require('wx-server-sdk') 劫持为本地垫片
const shim = require('./wxShim');
const origLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === 'wx-server-sdk') return shim;
  return origLoad.call(this, request, parent, isMain);
};

const CF = path.join(__dirname, '..', 'cloudfunctions');
const cloudFns = {
  authLogin: require(path.join(CF, 'authLogin', 'index.js')),
  businessData: require(path.join(CF, 'businessData', 'index.js')),
};

// 请求串行化：避免并发请求互相污染 getWXContext
let chain = Promise.resolve();
const serialize = (task) => {
  const run = chain.then(task, task);
  chain = run.catch(() => {}); // 保持链条存活，即使本次出错
  return run;
};

const readBody = req => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); }
  });
});

const send = (res, code, obj) => {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  });
  res.end(JSON.stringify(obj));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  const url = req.url || '';

  if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true });

  if (req.method === 'POST' && url === '/reset') {
    shim.__resetStore();
    return send(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.startsWith('/fn/')) {
    const name = url.slice('/fn/'.length);
    const fn = cloudFns[name];
    if (!fn || typeof fn.main !== 'function') return send(res, 404, { error: `未知云函数: ${name}` });
    const body = await readBody(req);
    const openId = body.openId || process.env.OWNER_OPENIDS.split(',')[0];
    // 模拟 wx.cloud.callFunction：result 即云函数 main 的返回
    let result;
    try {
      result = await serialize(async () => {
        shim.__setContext({ OPENID: openId, UNIONID: body.unionId || '' });
        return fn.main(body.event || {});
      });
    } catch (err) {
      result = { success: false, error: (err && err.message) || '本地后端执行失败' };
    }
    return send(res, 200, { result });
  }

  return send(res, 404, { error: 'not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[local-server] 已启动 http://localhost:${PORT}`);
  console.log(`[local-server] owner 白名单: ${process.env.OWNER_OPENIDS}`);
  console.log(`[local-server] 数据库: ${process.env.LOCAL_DB_FILE || path.join(__dirname, '.data', 'dev.json')}`);
});
