/**
 * wx-server-sdk 本地垫片
 * 让 cloudfunctions/* 的原始源码无需修改即可在本地 Node 运行，
 * 用一个 JSON 文件当数据库，模拟微信云数据库最小 API。
 * 覆盖范围：cloud.getWXContext / cloud.database / collection.where().limit().get()
 *          / collection.doc().get()/update()/set()/remove() / collection.add()
 *          / db.command.in 等 / db.serverDate / db.createCollection。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

// 默认路径故意放在项目目录外：dev.json 放项目内会被微信开发者工具的文件监听当成源码变更，
// 每次写库（每个业务动作成功后）都触发自动编译，把导航栈重置回首页 pages/my/index（#F 删/建/复团单后跳回「我的」根因）。
const DB_FILE = process.env.LOCAL_DB_FILE
  || path.join(os.homedir(), '.dao-you-ling-local-server', 'dev.json');

const ensureDir = (file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

let store = null;
const loadStore = () => {
  if (store) return store;
  ensureDir(DB_FILE);
  try {
    store = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    store = {};
  }
  return store;
};
const persist = () => {
  ensureDir(DB_FILE);
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
};
const coll = (name) => {
  const s = loadStore();
  if (!Array.isArray(s[name])) s[name] = [];
  return s[name];
};

const genId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// ---- 查询匹配 ----
const isCommand = v => v && typeof v === 'object' && v.__op;
const looseEq = (a, b) => a === b || String(a) === String(b);
const applyOp = (docVal, cmd) => {
  switch (cmd.__op) {
    case 'in': return Array.isArray(cmd.v) && cmd.v.some(x => looseEq(docVal, x));
    case 'nin': return !(Array.isArray(cmd.v) && cmd.v.some(x => looseEq(docVal, x)));
    case 'eq': return looseEq(docVal, cmd.v);
    case 'neq': return !looseEq(docVal, cmd.v);
    case 'gt': return docVal > cmd.v;
    case 'gte': return docVal >= cmd.v;
    case 'lt': return docVal < cmd.v;
    case 'lte': return docVal <= cmd.v;
    case 'exists': return cmd.v ? docVal !== undefined : docVal === undefined;
    default: return false;
  }
};
const matchField = (docVal, v) => {
  if (isCommand(v)) return applyOp(docVal, v);
  if (v === null) return docVal === null || docVal === undefined;
  return looseEq(docVal, v);
};
const matchOne = (doc, query) => Object.entries(query || {}).every(([k, v]) => matchField(doc[k], v));
const matchAll = (doc, wheres) => wheres.every(w => matchOne(doc, w));

// ---- Query builder ----
class Query {
  constructor(name, wheres = [], limitN = null, order = null) {
    this.name = name;
    this.wheres = wheres;
    this.limitN = limitN;
    this.order = order;
  }
  where(q) { return new Query(this.name, [...this.wheres, q], this.limitN, this.order); }
  limit(n) { return new Query(this.name, this.wheres, n, this.order); }
  skip() { return this; }
  field() { return this; }
  orderBy(f, dir) { return new Query(this.name, this.wheres, this.limitN, { f, dir }); }
  _run() {
    let rows = coll(this.name).filter(doc => matchAll(doc, this.wheres));
    if (this.order) {
      const { f, dir } = this.order;
      rows = [...rows].sort((a, b) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }
  async get() { return { data: this._run().map(d => ({ ...d })) }; }
  async count() { return { total: coll(this.name).filter(doc => matchAll(doc, this.wheres)).length }; }
}

class DocRef {
  constructor(name, id) { this.name = name; this.id = String(id); }
  _find() { return coll(this.name).find(d => looseEq(d._id, this.id)); }
  async get() { const d = this._find(); return { data: d ? { ...d } : null }; }
  async update({ data }) {
    const d = this._find();
    if (!d) return { stats: { updated: 0 } };
    Object.assign(d, data);
    persist();
    return { stats: { updated: 1 } };
  }
  async set({ data }) {
    const rows = coll(this.name);
    const idx = rows.findIndex(d => looseEq(d._id, this.id));
    const next = { ...(data || {}), _id: this.id };
    if (idx >= 0) rows[idx] = next; else rows.push(next);
    persist();
    return { stats: { updated: 1 } };
  }
  async remove() {
    const rows = coll(this.name);
    const idx = rows.findIndex(d => looseEq(d._id, this.id));
    if (idx >= 0) { rows.splice(idx, 1); persist(); return { stats: { removed: 1 } }; }
    return { stats: { removed: 0 } };
  }
}

class Collection {
  constructor(name) { this.name = name; }
  where(q) { return new Query(this.name, [q]); }
  doc(id) { return new DocRef(this.name, id); }
  limit(n) { return new Query(this.name, [], n); }
  orderBy(f, dir) { return new Query(this.name, [], null, { f, dir }); }
  async get() { return new Query(this.name, []).get(); }
  async count() { return new Query(this.name, []).count(); }
  async add({ data }) {
    const _id = data && data._id ? String(data._id) : genId();
    const doc = { ...data, _id };
    coll(this.name).push(doc);
    persist();
    return { _id, id: _id };
  }
}

const cmd = op => (v => ({ __op: op, v }));
const command = {
  in: cmd('in'), nin: cmd('nin'), eq: cmd('eq'), neq: cmd('neq'),
  gt: cmd('gt'), gte: cmd('gte'), lt: cmd('lt'), lte: cmd('lte'), exists: cmd('exists'),
  and: (...a) => ({ __op: 'and', v: a }), or: (...a) => ({ __op: 'or', v: a }),
  set: v => v, inc: v => v, remove: () => undefined,
};

const database = () => ({
  command,
  serverDate: () => new Date(),
  createCollection: async (name) => { coll(name); persist(); return { errMsg: 'createCollection:ok' }; },
  collection: name => new Collection(name),
  RegExp: opt => new RegExp(opt.regexp, opt.options),
});

// 每个请求前由 server 设置调用者身份
let ctx = { OPENID: '', UNIONID: '' };

module.exports = {
  DYNAMIC_CURRENT_ENV: 'local-dev',
  init() {},
  database,
  getWXContext() { return { ...ctx }; },
  __setContext(next) { ctx = { OPENID: '', UNIONID: '', ...(next || {}) }; },
  __resetStore() { store = {}; persist(); },
  __loadStore: loadStore,
};
