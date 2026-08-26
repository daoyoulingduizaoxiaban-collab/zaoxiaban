#!/usr/bin/env node
/*
 * 契约自动检查（不需要开发者工具，纯静态扫描 + 一次 eslint）。
 *
 * 跑法：node local-server/check-contract.js
 * 收工前跑一次；规则出处见 DOC/DEVELOPMENT_GUIDE.md §10。
 *
 * 每条规则都是「这一轮真的踩过的坑」，不是凭空想的：
 *   C1 页面注册与档案对不上 —— 删页只拿掉注册（或反之）会留下死注册/进不去的页
 *   C2 用了元件却没注册     —— product/list 挂 <nav> 但全站没注册，整条导览列不渲染、没有返回键
 *   C3 sub-nav 没写返回落点 —— 吃预设值，不管从哪进来都弹回团单列表
 *   C4 页面直接打后端       —— 违反分层铁律（DEVELOPMENT_GUIDE §1.1）
 *   C5 存档后跳转延迟不统一 —— 口径是 300ms（PAGE_MAP §3.2）
 *   C7 文件 🚧 标记没对应开发项 —— 只写规格不开开发项，下一个人会把没做的当现况
 *   C6 用到没定义的东西     —— 清理死码时砍到还在用的 helper，eslint 预设不查，只有跑测试才抓得到
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const rel = p => path.relative(ROOT, p);
const problems = [];
const fail = (code, msg) => problems.push(`${code}  ${msg}`);

const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);
const readJson = (p) => {
  try { return JSON.parse(read(p)); } catch (e) { return null; }
};

const appJson = readJson(path.join(ROOT, 'app.json')) || {};
// 分包两种拼法官方都收（subPackages / subpackages），本专案用小写那个——只认一种会漏掉五页。
const subPackages = appJson.subPackages || appJson.subpackages || [];
const registeredPages = [
  ...(appJson.pages || []),
  ...subPackages.flatMap(pkg => (pkg.pages || []).map(page => `${pkg.root}/${page}`)),
];
const globalComponents = Object.keys(appJson.usingComponents || {});

/* ── C1：注册与档案两边对得上 ───────────────────────────── */
const walkPageDirs = (dir, acc = []) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isDirectory()) continue;
    if (exists(path.join(full, 'index.wxml'))) acc.push(rel(full).split(path.sep).join('/') + '/index');
    // 登录页档名不是 index，特判
    else if (exists(path.join(full, `${name}.wxml`))) acc.push(`${rel(full).split(path.sep).join('/')}/${name}`);
    walkPageDirs(full, acc);
  }
  return acc;
};
const diskPages = ['pages', 'sub-pages']
  .filter(d => exists(path.join(ROOT, d)))
  .flatMap(d => walkPageDirs(path.join(ROOT, d)));

for (const page of registeredPages) {
  if (!exists(path.join(ROOT, `${page}.wxml`))) fail('C1', `app.json 注册了 ${page}，但档案不存在（删页要连注册一起删）`);
}
for (const page of diskPages) {
  if (!registeredPages.includes(page)) fail('C1', `${page} 有档案却没在 app.json 注册（进不去；不要的话整个删档）`);
}

/* ── C2/C3：wxml 用到的自订元件要注册；sub-nav 要写返回落点 ── */
const projectTags = fs.readdirSync(path.join(ROOT, 'components')).filter(n => (
  fs.statSync(path.join(ROOT, 'components', n)).isDirectory()
));

for (const page of registeredPages) {
  const wxmlPath = path.join(ROOT, `${page}.wxml`);
  if (!exists(wxmlPath)) continue;
  const wxml = read(wxmlPath);
  const json = readJson(path.join(ROOT, `${page}.json`)) || {};
  const declared = new Set([...Object.keys(json.usingComponents || {}), ...globalComponents]);

  for (const tag of projectTags) {
    if (!new RegExp(`<${tag}[\\s/>]`).test(wxml)) continue;
    if (!declared.has(tag)) fail('C2', `${page} 用了 <${tag}> 却没注册（元件不会渲染，画面直接少一块）`);
  }

  const subNav = wxml.match(/<sub-nav[^>]*>/);
  if (subNav) {
    const tag = subNav[0];
    const hasFallback = /fallback-url="/.test(tag);
    const hasCustomBack = /custom-back="\{\{true\}\}"/.test(tag) && /bind:back="/.test(tag);
    if (!hasFallback && !hasCustomBack) {
      fail('C3', `${page} 的 sub-nav 没写 fallback-url（会吃预设值，不管从哪进来都弹回团单列表）`);
    }
  }
}

/* ── C4：页面/元件不许直接打后端 ─────────────────────────── */
const BACKEND_ALLOWED = ['repositories/', 'services/backend/', 'local-server/'];
const walkFiles = (dir, exts, acc = []) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walkFiles(full, exts, acc); continue; }
    if (exts.some(ext => name.endsWith(ext))) acc.push(full);
  }
  return acc;
};
const codeDirs = ['pages', 'sub-pages', 'components', 'custom-tab-bar', 'behaviors', 'services', 'repositories', 'utils']
  .filter(d => exists(path.join(ROOT, d)));
const codeFiles = codeDirs.flatMap(d => walkFiles(path.join(ROOT, d), ['.js', '.ts']));

for (const file of codeFiles) {
  const relPath = rel(file).split(path.sep).join('/');
  if (BACKEND_ALLOWED.some(prefix => relPath.startsWith(prefix))) continue;
  const src = read(file);
  if (/wx\.cloud\.callFunction\s*\(/.test(src)) fail('C4', `${relPath} 直接呼叫 wx.cloud.callFunction（一律走 repositories/）`);
  if (/wx\.request\s*\(/.test(src)) fail('C4', `${relPath} 直接呼叫 wx.request（一律走 repositories/）`);
}

/* ── C5：存档后跳转统一 300ms ────────────────────────────── */
for (const file of codeFiles) {
  const relPath = rel(file).split(path.sep).join('/');
  const src = read(file);
  const re = /setTimeout\([^;]*?(?:navigateBackOrTab|navigateByUrl|redirectByUrl|navigateBack)[^;]*?,\s*(\d+)\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== '300') fail('C5', `${relPath} 存档后跳转延迟 ${m[1]}ms，口径是 300ms（PAGE_MAP §3.2）`);
  }
}

/* ── C6：用到没定义的东西（eslint no-undef 全仓扫描）────────── */
try {
  execFileSync('npx', [
    'eslint', './', '--no-eslintrc', '-c', './.eslintrc.js', '--ext', '.js,.ts',
    '--rule', '{"no-undef":"error"}',
    '--rule', '{"no-unused-vars":"off"}',
    '--rule', '{"@typescript-eslint/no-unused-vars":"off"}',
  ], { cwd: ROOT, stdio: 'pipe' });
} catch (err) {
  const out = String((err.stdout || '') + (err.stderr || ''));
  // Behavior / wx 之类的小程序 runtime 全域不是问题，只捞真的漏掉的符号
  const RUNTIME_GLOBALS = new Set(['wx', 'Behavior', 'Page', 'Component', 'App', 'getApp', 'getCurrentPages', '__wxConfig']);
  let currentFile = '';
  for (const line of out.split('\n')) {
    if (line.startsWith('/')) { currentFile = rel(line.trim()); continue; }
    const m = line.match(/^\s*(\d+):(\d+)\s+error\s+'([^']+)' is not defined/);
    if (!m) continue;
    if (RUNTIME_GLOBALS.has(m[3])) continue;
    fail('C6', `${currentFile}:${m[1]} 用到没定义的 ${m[3]}（清死码时常砍过头，eslint 预设不查这条）`);
  }
}


/* ── C7：文件里的「未实作」标记要有对应开发项 ─────────────────
 *   Part A/B 写的是「该长怎样」，其中一部分还没做。只写 Part A 不开 Part C 项，
 *   下一个接手的人会把没做的当现况去改码（2026-08-27 真的发生过）。
 *   规矩见 BUSINESS_LOGIC_PRINCIPLES.md §0.0。                             */
{
  const DOC = path.join(ROOT, 'DOC');
  const master = path.join(DOC, 'BUSINESS_LOGIC_PRINCIPLES.md');
  if (exists(master)) {
    const text = read(master);
    const partC = text.slice(text.indexOf('# Part C'));
    // Part C 里定义了哪些开发项编号
    const defined = new Set([...partC.matchAll(/\*\*(C-[A-Z0-9-]+)\s/g)].map(m => m[1]));

    // 1) 全 DOC 的 🚧 标记都必须带一个 C-XXX，且该编号在 Part C 找得到
    for (const name of fs.readdirSync(DOC).filter(n => n.endsWith('.md'))) {
      const body = read(path.join(DOC, name));
      body.split('\n').forEach((line, i) => {
        if (!line.includes('🚧')) return;
        // 排除「在讲这条规则本身」的行（如规则表、测试清单），那不是在标某段未实作
        if (/🚧\s*(未实作)?标记/.test(line)) return;
        const ids = [...line.matchAll(/(C-[A-Z0-9-]+)/g)].map(m => m[1]).filter(id => id !== 'C-XXX');
        if (!ids.length) {
          // 整段引言式的 🚧（指向同档他处）放行：同段落 5 行内找得到编号即可
          const near = body.split('\n').slice(Math.max(0, i - 2), i + 6).join('\n');
          if (/(C-[A-Z0-9-]+)/.test(near)) return;
          fail('C7', `DOC/${name}:${i + 1} 标了 🚧 未实作，却没写是哪个开发项（要写 C-XXX，见 BUSINESS_LOGIC_PRINCIPLES §0.0）`);
          return;
        }
        ids.forEach((id) => {
          if (!defined.has(id)) fail('C7', `DOC/${name}:${i + 1} 引用的开发项 ${id} 在 Part C 找不到（只写规格没开开发项＝陷阱）`);
        });
      });
    }

    // 2) Part C 里带 🚧 的开发项必须有同名 D- 验收点
    const partD = text.slice(text.indexOf('# Part D'));
    [...text.matchAll(/🚧[^\n]*?(C-[A-Z0-9-]+)/g)].map(m => m[1]).filter(id => id !== 'C-XXX').forEach((id) => {
      const d = id.replace(/^C-/, 'D-');
      if (!partD.includes(d)) fail('C7', `开发项 ${id} 没有对应的验收点 ${d}（Part D 要补）`);
    });
  }
}

/* ── 结果 ───────────────────────────────────────────────── */
const CHECKS = [
  'C1 页面注册 ↔ 档案两边对得上',
  'C2 wxml 用到的自订元件都有注册',
  'C3 每个 sub-nav 页都写了返回落点',
  'C4 页面/元件不直接打后端',
  'C5 存档后跳转统一 300ms',
  'C6 没有用到未定义的符号',
  'C7 文件的 🚧 未实作标记都有对应开发项',
];
console.log(CHECKS.map(c => `  · ${c}`).join('\n'));
console.log('');
if (!problems.length) {
  console.log('✅ 契约检查通过，7 项全过');
  process.exit(0);
}
console.log(problems.map(p => `❌ ${p}`).join('\n'));
console.log(`\n共 ${problems.length} 项不符。`);
process.exit(1);
