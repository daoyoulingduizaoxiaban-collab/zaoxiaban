# 开发规范（改代码的人照这份走）

> **这份文件的定位**：讲「**怎么改代码**」——架构、数据流、加/改功能的标准步骤、必须遵守的铁律与禁止事项。
> 配套文件分工：
> - `BUSINESS_LOGIC_PRINCIPLES.md` = 唯一可信源，讲「**每个功能该长怎样**」（角色可见性、字段、状态流转）。改功能前先看它。
> - `进度总览.md` = 进度追踪 + 修复看板。
> - **本文件** = 工程规范。改代码前先看本文件的「铁律」和「加功能配方」。
>
> **核心目标**：让修 bug / 加功能 / 改功能可控，避免自由发挥破坏项目管理。**照这份做，不确定就问，别自己发明第二套写法。**

---

## 1. 架构地图与数据流

分层（从上到下）：

```
pages/ · sub-pages/        小程序页面（UI + 交互）
  ↓ 调用
services/                  业务逻辑层（校验、聚合、口径；如 groupOrderService/customerOrderService/auth）
  ↓ 调用
repositories/              数据访问层（唯一对接后端的地方）
  ↓ 调用
services/backend/backendCall + repositories/cloudBusinessRepository
  ↓ 按 config.dataBackend 分流
cloud: wx.cloud.callFunction('businessData')  |  local: wx.request → local-server → cloudfunctions/businessData
  ↓
cloudfunctions/businessData/index.js          真正的后端（数据库读写 + 服务端鉴权）
cloudfunctions/authLogin/index.js             登录（换取身份/角色）
```

**只有两个真云函数**：`authLogin`（登录）、`businessData`（所有数据）。其余历史空壳已删。**加数据功能＝往 businessData 加资源，不要新建云函数。**

`businessData` 已模块化（勿再塞回单文件）：
- `index.js` — 路由入口（require 各资源 + 建 handlers + exports.main）。
- `lib/core.js` — 共享层：云初始化 / 常量 / 通用 helper / db 访问 / **权限判定** / 预览。
- `resources/{products,groupOrders,customerOrders,users,providers,feedbacks}.js` — 每个资源一个文件，含该资源的 normalizer/validator + Actions 对象，从 `../lib/core` require 所需。
- **改一个资源只动它那个文件；改共享/权限动 `lib/core.js`。**

**铁律：页面不许直接 `wx.request` / `wx.cloud.callFunction`。** 一律走 `repositories/*`。仓库层是唯一对接后端的地方。

---

## 2. ⚠️ 地端云端双通铁律（最重要，踩过最多坑）

系统同一套源码跑两个后端：
- **local**：`local-server/` 直接 `require` 同一份 `cloudfunctions/businessData/index.js`（付费云开发前本地测试）。
- **cloud**：微信云开发。

因此**服务端逻辑只有一份**（businessData），local/cloud 自动一致——这部分没问题。

**真正的坑：权限/校验逻辑在「客户端」和「云端」各有一份镜像**，必须手动保持同步：

| 客户端 | 云端 | 内容 |
| --- | --- | --- |
| `services/auth/roleScope.js` | `cloudfunctions/businessData/lib/core.js` | `normalizeRoles` / `hasRole` / `isRoleExpired` / `getEffectiveRoles` / `isOwnerOrAdmin` / `canManageGroupOrder` / `canManageProduct` / `isApprovedProfile`↔`assertApprovedProfile` 等十几个镜像函数 |

**铁律：改动上表任一权限/校验逻辑，必须同时改客户端和云端两份，语义一致。**
- 只改客户端 → 客户端放行、服务端拒绝（或反之），正式环境坏。
- 只改云端 → UI 门控与实际权限不符。

**改权限的收尾清单（每次照做）：**
1. 客户端 `roleScope.js` 改完。
2. 云端 `businessData/index.js` 同步改（对应 helper）。
3. `node --check` businessData 各文件（index/lib/resources）。**⚠️ 注意：`.eslintrc.js` 里 `no-undef: 0`（关掉了）——eslint 不会抓「漏 require / 未定义引用」，别指望它当网。**
   拆分/改动后必须跑 **`node local-server/verify-actions.js`**（owner 跑遍所有资源动作，靠「意外抛错被转成通用文案」抓漏 require/异常），须全绿零红旗。
4. `node local-server/smoke-test.js`（起本地 server 跑鉴权/读写用例，必须全绿）。
5. commit message 里注明「地端云端双通」。

> 同理：**任何往数据层新增的「云端动作」，都必须在 `businessData` 里加对应 handler**，否则正式环境报「资料操作不存在」/过滤空转。

---

## 3. 数据后端开关（config）

`config.js`：
- `dataBackend`：`'local'`（本地 Node）或 `'cloud'`（微信云开发）。当前多人测试期设为 `'cloud'`。
- `appEnv`：`DEV` / `PROD`。`isDev` / `isProd` 由它派生。
- `localBaseUrl` / `localDevOpenId`：仅 `local` 生效。
- **local 库与 cloud 库数据互相独立、不自动迁移**。切后端＝换一套数据。

真机限制（记住，别再踩）：微信真机 `wx.request` 需 **HTTPS + 已备案的合法域名**；`localhost`/免费隧道域名连不上。所以「让别人手机测」要么用**云开发**（callFunction 不走合法域名），要么用**自己备案的域名**接本地。

---

## 4. 权限模型（改任何门控前必读）

**角色**：`owner` / `admin` / `guide`(团主) / `customer`(客户)。`provider` 已**不是角色**（降级为团主维护的供应商实体），常量暂留仅兼容历史数据，**不得再分配**。

**多角色**：一人可同时 `roles=[customer, guide]`。审核通过是**追加**角色不是覆盖。

**到期（per-role）**：
- 可过期的是**提升角色** `EXPIRABLE_ROLES = [guide, admin]`；`customer`(基线) 和 `owner` **永不过期**。
- `getEffectiveRoles(profile)`：到期后剥离 guide/admin，保留基线 → **团主过期后仍是客户，客户功能不受影响**。

**判定规则（关键）：**
- **权限/可见性判定一律走 `getEffectiveRoles`**（`canUseFeature` / `isOwnerOrAdmin` / `canManageGroupOrder` / `canManageProduct` / `canUseProviderPortal` / `filter*ByRole`）。
- **`hasRole` 只表示「原始角色成员」，仅供展示/文案**，不要拿它做权限门。
- 功能可见性 = `canUseFeature(profile, FEATURE_KEYS.X)`，映射表在 `roleScope.js` 的 `FEATURE_ALLOWED_ROLES`。加新功能门控就往这张表加。
- 云端入口统一用 `assertApprovedProfile(profile, allowedRoles)` 拦（到期/未审核/角色不符）。

**改权限记得走第 2 节的双通清单。**

---

## 5. 加一个新数据功能（标准配方）

以本项目「报Bug(feedbacks)」为例，加一个新资源就照这 5 步（缺一不可）：

1. **云端** `cloudfunctions/businessData/index.js`：
   - `COLLECTIONS` 加集合名；
   - 新建 `resources/x.js`：`const { ... } = require('../lib/core');` 引所需共享件；写 `const xActions = { async create(data, profile){…}, async list(data, profile){…} }`，每个动作**首行用 `assertProfile` 或 `assertApprovedProfile(profile, [allowedRoles])` 鉴权**；`module.exports = xActions;`；
   - 在 `index.js` require 它并加进 `handlers`：`x: xActions`。
2. **仓库** `repositories/xRepository.js`：方法调 `callBusinessData({ resource:'x', action:'create', data })`。
3. **服务**（可选）`services/x/xService.js`：需要校验/聚合/口径时才加；简单 CRUD 可跳过。
4. **页面** `pages/x/` 或 `sub-pages/…`。
5. **注册** `app.json` 的 `pages` 加页面路径。

验证：`node --check` 云函数 + `node local-server/smoke-test.js`（可仿照其中用例加一条自测）。
上线：cloud 模式下必须在开发者工具**「上传并部署」`businessData`**，否则新动作云端没有。

> 记住第 2 节：新动作**天然地端云端双通**（local server 直接 require businessData），但**云端要重新部署 businessData** 才生效。

---

## 6. 三态规范（列表/详情/浏览页）

统一用共享组件，**不要自绘 loading/error/empty**：
- 组件 `components/page-state`（`.json` 引 `"page-state": "/components/page-state/index"`）。
- 行为 `behaviors/useAccessPage`（提供 `loadingState()` / `threeState('ready'|'error'|'empty', {...})` / `buildAccessState(featureKey)`，只返回字段对象，调用方自己 spread 进 setData）。
- **error 态必须有「重试」**（`bind:retry`）。
- 样板页：`pages/customerOrders/index`（照抄结构）。
- 纯表单页（add/edit）可自管简单 loading，不强制。

---

## 7. DEV 工具与 PROD 硬关

以下都是**测试环境工具**，必须 `config.isDev`（PROD 自动关）门控，**不得在 PROD 暴露**：
- **角色预览**（owner 专用，`services/auth/authService` 的 `canUseRolePreview`）：`config.allowRolePreview = isDev`。
- **本地测试身份**（`services/auth/localIdentity`）：仅 `isDev && dataBackend==='local'` 生效；给本地多人各自 openId。
- **报Bug 入口**（底部 NAV）：仅 `config.isDev` 显示；写入 `feedbacks` 资源。

加任何测试/调试工具，照此模式 `isDev` 门控。

---

## 8. 命名 / 提交 / 审查纪律

**提交**：
- 一页/一单元一 commit；中文 conventional 风格（`fix(模块): …` / `feat(模块): …` / `docs(…)`）。
- 结尾带 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 活跃分支 `main`，直接提交 + push。

**外科式改动（surgical）**：
- 只改与需求直接相关的行；每行改动能追溯到需求。
- 不顺手「改进」无关代码/注释/格式；匹配现有风格。
- 你的改动产生的孤儿（未用的 import/变量/方法）自己清掉。

**明显清理直接做、别问**（去重复入口、删死码/空壳、删冗余控件、命名对齐）——保持整体风格一致即可。**只有产品取舍**（要不要做、多种合理做法、动隐私/角色可见性策略、IA 合并页）才停下来跟人讨论。

**禁止事项**：
1. 页面直接 `wx.request`/`callFunction`（绕过 repository）。
2. 单边改 `roleScope` 或 `businessData` 的镜像权限逻辑（必须双通）。
3. 拿 `hasRole` 做权限门（用 `effectiveRoles`/`canUseFeature`/`canManage*`）。
4. 数据层加云端动作却不加 `businessData` handler。
5. DEV 工具不做 `isDev` 门控。
6. 派 agent 去改 `app.json`/共用模组(`services`/`behaviors`/`components`/`roleScope`/`repositories`)/`cloudfunctions`——这些属核心/共用，只能由主导者（掌握全局的人）改，避免多人改同一文件与 parity 出错。agent 只拿互不重叠的**页面**文件。

---

## 9. 派 agent 的边界（多人并行时）

- **可派 agent**：互不重叠的**页面**修改（`pages/X`、`sub-pages/X`），文件域清晰、不依赖彼此。
- **不可派 agent、必须主导者自己做**：`config.js`、`app.json`、`services/*`（尤其 auth/roleScope）、`repositories/*`、`components/*`、`behaviors/*`、`cloudfunctions/*`。
- agent 回报后**逐项审核**（对照需求 + 本文件铁律），对不上或碰错文件→主导者自己改好才算完成。别照单全收。
