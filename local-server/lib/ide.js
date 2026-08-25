/**
 * 驱动微信开发者工具的统一入口。
 *
 * 取代旧的 `miniprogram-automator` + `cli auto --auto-port 9420` 接线方式：
 * 开发者工具改版后官方把自动化收进 `wechatide` 指令，不必再另外挂端口，
 * 等待条件内建，而且多了旧方式做不到的能力（捞 console、mock wx API、部署云函数）。
 *
 * 每支 flow 测试原本各自复制一份 gotoPage / dataWhenReady / callFn，改动要改 13 个地方；
 * 现在收在这里一份。写新测试直接 require 本档，不要再复制贴上。
 *
 * 前置：开发者工具开着本专案，且已授权本 client（首次会跳授权视窗）。
 *      不需要再跑 cli auto --auto-port。
 */
const { execFile } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/wechatide';
const CLIENT = process.env.WECHATIDE_CLIENT || 'ClaudeCode';
const PROJECT = path.join(__dirname, '..', '..');
const LOCAL_PORT = Number(process.env.LOCAL_PORT || 3000);

/** CLI 有时会在 JSON 后附带日志；只取第一个完整 JSON 对象。 */
const firstJsonObject = (raw) => {
  const start = raw.indexOf('{');
  if (start < 0) return '';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  // 括号没配平＝回传被截断，回空字串让呼叫端报错，不要拿半截 JSON 去 parse。
  return '';
};

/** 跑一个 wechatide 工具，回传 result；工具回 ok:false 就抛错。 */
const run = (tool, args = {}) => new Promise((resolve, reject) => {
  const argv = [`-c`, CLIENT, tool, '--project', PROJECT];
  Object.entries(args).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    argv.push(`--${k}`);
    if (v !== true) argv.push(typeof v === 'string' ? v : JSON.stringify(v));
  });
  execFile(CLI, argv, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
    // CLI 会在 JSON 前面印一行 [wechatide] skill-call:...，取第一个 { 之后的内容。
    const raw = String(stdout || '');
    // CLI 会在 JSON 前印一行 [wechatide] skill-call:...，之后偶尔还会补印警告行。
    const body = firstJsonObject(raw);
    if (!body) return reject(new Error(`${tool} 没有回传完整 JSON（${raw.length} 字元）：${raw.slice(0, 200) || (err && err.message)}`));
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { return reject(new Error(`${tool} 回传不是 JSON：${body.slice(0, 300)}`)); }
    if (!parsed.ok) return reject(new Error(`${tool} 失败：${parsed.message || JSON.stringify(parsed).slice(0, 300)}`));
    return resolve(parsed.result);
  });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 页面操作 ───────────────────────────────────────────── */

const navigate = (action, opts = {}) => run('automation_navigate', { action, ...opts });
const currentPage = () => run('automation_runtime_info', { action: 'currentPage' })
  .then(r => (r && r.currentPage) || r);
const getData = (dataPath) => run('automation_page_action', { action: 'getData', 'data-path': dataPath })
  .then(r => (r && typeof r === 'object' && 'data' in r ? r.data : r));
const pageData = () => getData();
const setData = (patch) => run('automation_page_action', { action: 'setData', patch: JSON.stringify(patch) });
// CLI 不吃 --args（会报 unsupported argument），复杂参数一律走 --args-file。
const writeArgsFile = (args) => {
  const file = path.join(os.tmpdir(), `wechatide-args-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(args));
  return file;
};
const callMethod = async (method, args = []) => {
  const file = writeArgsFile(Array.isArray(args) ? args : [args]);
  try {
    return await run('automation_page_action', { action: 'callMethod', method, 'args-file': file });
  } finally {
    try { fs.unlinkSync(file); } catch (e) { /* 清不掉就算了 */ }
  }
};
const querySelectorAll = (selector) => run('automation_page_action', { action: 'querySelectorAll', selector });
const tap = (selector, opts = {}) => run('automation_element_action', { action: 'tap', selector, 'wait-for-selector': selector, ...opts });
/** 真的触发输入事件（走 WXML 的 bindinput），不是直接 setData 绕过绑定。 */
const input = (selector, value, opts = {}) => run('automation_element_action', { action: 'input', selector, value: String(value), 'wait-for-selector': selector, ...opts });
// 注意：evaluate 不吃 --args，要传值就直接写进函式源码字串里。
// CLI 会把求值结果再包一层 { result: ... }。只剥这一层，不要 while 一路剥到底——
// 被求值的函式若自己回传带 result 键的物件，会连同兄弟栏位一起被吃掉。
const unwrap = (value) => (
  value && typeof value === 'object' && 'result' in value && Object.keys(value).length === 1
    ? value.result
    : value
);
const evaluate = (fnSource) => run('automation_evaluate', { 'fn-source': fnSource }).then(unwrap);

/* ── 取证与 mock（旧方式做不到的） ────────────────────────── */

/** 捞 console。command 是 grep 字串，如 'grep -n .' 全部、'grep -i error' 只要错误。 */
const consoleLog = (command = 'grep -i error') => run('get_simulator_console', { command })
  .then(r => (typeof r === 'string' ? r : (r && r.output) || ''));
const screenshot = (outPath) => run('simulator_screenshot', outPath ? { path: outPath } : {});
/** mock 一个 wx API 的回传。原生弹窗（showModal）与相机（chooseMedia）靠这个才测得了。 */
const mockWxApi = async (method, result) => {
  const file = writeArgsFile(result);
  try {
    return await run('automation_wx_api', { action: 'mock', method, 'result-file': file });
  } finally {
    try { fs.unlinkSync(file); } catch (e) { /* 清不掉就算了 */ }
  }
};
const restoreWxApi = (method) => run('automation_wx_api', { action: 'restore', method });

/* ── 组合动作 ───────────────────────────────────────────── */

/**
 * 导到目标页并确认真的落在那一页。
 * 开发者工具热重载会把导航重置到编译起始页并盖掉 reLaunch，所以要复查 + 重试。
 */
const gotoPage = async (url, matchPath, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    try { await navigate('reLaunch', { url }); } catch (e) { /* 抖动，重试 */ }
    await sleep(1200);
    let page;
    try { page = await currentPage(); } catch (e) { page = null; }
    const p = String((page && (page.path || page.route)) || '');
    // 比对结尾，不用 indexOf：父页路径是子页的前缀（pages/tourGuides 会命中
    // pages/tourGuides/edit/index），子字串比对会把「导错页」当成导对了。
    const want = String(matchPath).replace(/(^\/|\/index$)/g, '');
    const got = p.replace(/(^\/|\/index$)/g, '');
    if (got === want || got.endsWith(`/${want}`) || want.endsWith(`/${got}`)) return page;
  }
  throw new Error(`导不到 ${matchPath}（试了 ${tries} 次）`);
};

/**
 * 轮询到页面 data 的某个栏位真的有值再回传。
 * reLaunch 后可能拿到还没就绪的页面句柄，直接读会整片 undefined。
 */
const dataWhenReady = async (dataPath, tries = 10, gap = 800, isReady) => {
  // 预设：有值（非 undefined/null）且不是 'loading' 就算就绪。
  // ⚠️ 布林权限栏位（canSave / canEdit / isLoggedIn 等）初始值多半就是 false，
  // 用预设判定会第一次轮询就拿到 false 直接回传，等于完全没等鉴权跑完 → 偶发假失败。
  // 那种情况要传 isReady，例如 `v => v === true`。
  const ready = typeof isReady === 'function'
    ? isReady
    : (value) => value !== undefined && value !== null && value !== 'loading';
  for (let i = 0; i < tries; i++) {
    try {
      const value = await getData(dataPath);
      if (ready(value)) return value;
    } catch (e) { /* 页面还没就绪，重试 */ }
    await sleep(gap);
  }
  return undefined;
};

/** 等待整页资料满足流程自己的复合条件（例如 isEdit 与预填资料同时就绪）。 */
const pageDataWhen = async (isReady, tries = 10, gap = 800) => {
  let data = {};
  for (let i = 0; i < tries; i++) {
    try {
      data = await pageData();
      if (isReady(data)) return data;
    } catch (e) { /* 页面还没就绪，重试 */ }
    await sleep(gap);
  }
  return data;
};

/** 确保 App 走本地后端（写的是本机储存，即时生效，不改源码）。 */
const useLocalBackend = () => evaluate(
  "function() { wx.setStorageSync('dao_you_ling_data_backend', 'local'); return wx.getStorageSync('dao_you_ling_data_backend'); }",
);

/** 首次登录：refreshSession 只刷新既有会话、不会建立首次登录，所以要先进登录页 call 一次 login。 */
const loginOnce = async () => {
  try {
    await navigate('reLaunch', { url: '/pages/login/login' });
    await sleep(1200);
    await callMethod('login');
    await sleep(1200);
  } catch (e) { /* 会话建过一次就够，失败不致命 */ }
};

/** 切到本地后端并确保 owner 会话可用，供所有需要写入的流程共用。 */
const ensureLocalOwner = async () => {
  await useLocalBackend();
  await gotoPage('/pages/groupOrder/index', 'groupOrder/index');
  if (!(await dataWhenReady('isLoggedIn'))) await loginOnce();
  return getData('isLoggedIn');
};

/* ── 本地后端（seed 与回查） ─────────────────────────────── */

const callFn = (name, event, openId) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ event, openId });
  const req = http.request(
    { host: '127.0.0.1', port: LOCAL_PORT, path: `/fn/${name}`, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
    (res) => { let s = ''; res.on('data', d => (s += d)); res.on('end', () => { try { resolve(JSON.parse(s).result); } catch (e) { reject(e); } }); },
  );
  req.on('error', reject);
  req.write(body);
  req.end();
});

const OWNER = process.env.LOCAL_OPENID || 'dev-owner-openid';
const bd = (resource, action, data, openId = OWNER) => callFn('businessData', { resource, action, data, context: {} }, openId);

/** 测试失败时印出 console 里的错误，省得瞎猜。 */
const reportFailure = async (message) => {
  console.error(`❌ ${message}`);
  try {
    const errors = await consoleLog('grep -i -E "error|失败|Error"');
    if (errors && errors.trim()) console.error('--- 模拟器 console 里的错误 ---\n' + errors.trim().split('\n').slice(-15).join('\n'));
  } catch (e) { /* 捞不到就算了 */ }
  process.exit(1);
};

module.exports = {
  PROJECT, OWNER, run, sleep,
  navigate, currentPage, getData, pageData, setData, callMethod, querySelectorAll, tap, input, evaluate,
  consoleLog, screenshot, mockWxApi, restoreWxApi,
  gotoPage, dataWhenReady, pageDataWhen, useLocalBackend, loginOnce, ensureLocalOwner,
  callFn, bd, reportFailure,
};
