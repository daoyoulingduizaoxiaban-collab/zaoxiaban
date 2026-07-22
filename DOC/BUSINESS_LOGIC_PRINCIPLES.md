# 业务逻辑与开发主文档（MASTER）

## 0. 文件用途与阅读顺序

本文件是本项目**唯一的业务逻辑与开发可信源**。AGENT / CLAUDE 判断产品逻辑、决定开发顺序、编写测试时，一律以本文件为准；具体代码实现仍以当前仓库为准，但若代码与本文件冲突，以本文件为目标、把代码改到符合本文件。

本文件分四个明确分区，可单文件驱动开发：

- **Part A — 业务原则**：稳定的产品规则，改动需谨慎并记入变更记录。
- **Part B — 角色能力矩阵**：每个角色能看到/使用什么，是代码 `services/auth/roleScope.js` 的唯一对照源。
- **Part C — 开发项 CHECKLIST**：AGENT 照此逐项落地，每项含目标 / 改动文件 / 完成判定。
- **Part D — 测试项 CHECKLIST**：每个开发项对应的验收点，供人工实测与后续自动化。

BUG 由使用者在微信开发者工具实测后于对话回报，不在本文件维护逐条 BUG。

**进度与检视追踪**：白话进度、以及**全功能检视表**（逐模组对照本文件 A/B 走查「入口 / 操作 / 字段 / 角色 / 连动」）都在 `进度总览.md`。分工——本文件是「应该长怎样」的标准，检视表是「查了没 · 发现什么」的记录，两边靠章节号对应。

### 0.1 变更记录

- **2026-07-21 角色模型简化（本次重构）**
  - `provider` 不再是登录角色，降级为"团主管理的供应商实体"，与商品关联。移除 provider 登录选项、申请供应商流程、provider 专属后台。
  - 移除聊天（chat）功能。团主与客户之间的沟通改由**订单/付款状态操作**表达（见 A6）。消息页定位为"订单状态提醒"。
  - **customer 为默认开放身份**：任何人微信登录（含普通打开、扫码、分享链接进入）即成为 `approved` 客户，无需审核即可下单。
  - **guide（团主）是唯一需审核的用户角色**：客户可申请升级为团主，经 owner/admin 审核通过后 `roles[]` **追加** `guide` 并保留 `customer`。
  - 明确"申请团主"为独立开发项与测试项（C-GUIDE-APPLY / D-GUIDE-APPLY）。
  - 明确多角色 `roles[]` **追加不覆盖**规则，防止升级团主时冲掉客户功能。

---

# Part A — 业务原则

## A1. MVP 主线闭环

本产品是给中国团主使用的微信小程序。MVP 围绕一条可上线业务闭环收敛：

1. 用户微信登录，取得正式 OpenID，默认成为**已审核客户**。
2. 客户可申请升级为**团主**，由 owner/admin 审核。
3. 团主维护自己的**商品**，并可关联**供应商实体**（供应商是数据，不是账号角色）。
4. 团主选择商品并**开团**。
5. 客户从团单入口**下单**并声明付款。
6. 团主**确认收款**，并可更新团单与客户订单状态；客户可查看并更新自己订单的付款状态。
7. owner/admin 审核用户升级、管理全局资料。

任何功能若不能支持这条闭环，视为非核心能力，不得为它牺牲登录、客户下单、团主审核、商品供应商、团单、客户订单和收款闭环。

## A2. 角色与身份模型

微信 OpenID 是正式身份锚点。正式用户权限必须来自云端 `users` profile，不得来自前端参数、本地 storage、QA override、分享链接或 mock 资料。

### 用户角色（auth role，写入 `roles[]`）

- `customer` **客户 — 默认开放身份**。任何微信登录用户默认拥有，无需审核。可浏览团单商品、下单、声明与更新自己订单的付款状态、查看自己订单。
- `guide` **内部 role key，UI 显示为「团主」— 唯一需审核的用户角色**。管理自己的商品、供应商实体、团单、本团客户订单，确认收款。
- `admin` 运营管理员：审核团主申请、管理用户与全局资料，权限低于 owner。
- `owner` 产品拥有者与最高业务管理者，来自受控 allowlist。

> **`provider` 不再是角色。** 供应商是团主在商品管理里维护的**数据实体**（名称、联系方式、服务说明等），用于与商品关联并在下单页向客户展示必要信息。任何"以 provider 身份登录/申请/进入 provider 后台"的旧路径都应移除。

### 多角色规则（关键）

同一个 OpenID 可同时拥有多个角色。典型：一个人既是 `customer`，申请通过后又是 `guide`。

- 系统必须以 `roles[]` 为权限真相，`role` 只作 primary role 兼容字段，不得作为唯一权限来源。
- 权限判断根据当前入口与业务场景计算 `effectiveRole`（有效身份）。
- **升级追加、绝不覆盖**：客户申请团主通过后，`roles[]` 必须由 `[customer]` 变为 `[customer, guide]`，不得替换成 `[guide]`。任何审核/升级写入都必须保证既有角色不丢失。
- **多角色不得互相影响**：拥有 guide 的用户，其 customer 能用的功能必须完全不受影响；团主身份的资料与客户身份的资料分开归属（见 A5）。
- 所有面向用户的角色文案、入口过滤、列表范围，必须基于 `roles[]` / `effectiveRole`，不得只读单一 `profile.role`（现有 `getRoleScopeText` 等仍读单一 role，属待修项，见 C-MULTIROLE）。

## A3. 用户状态机

账户状态字段 `reviewStatus`（`status` 为兼容别名）：

- `approved`：**默认状态**。所有微信登录用户即为 approved 客户。
- `disabled`：账号被 owner/admin 停用，禁止一切业务功能。
- `rejected`：保留字段，主要用于团主申请被拒的展示（账户本身仍是 approved 客户）。

因为客户默认开放，**账户级不再有"全员 pending_review 等待审核"这一步**。审核只发生在**团主升级申请**上，用独立的申请状态表达：

### 团主申请状态（`guideApplication`）

profile 增加/使用团主申请子结构，至少包含：

- `status`：`none` | `pending` | `approved` | `rejected`。
- `submittedAt`、`reviewedBy`、`reviewedAt`、`remark`。
- 通过时可设 `roleExpiresAt`（团主角色使用期限，留空表示不限期）。

规则：

- 客户提交团主申请后，`guideApplication.status = pending`，**账户仍是 approved 客户**，客户功能不受影响，团主功能尚不开放。
- owner/admin 审核通过：`roles[]` 追加 `guide`，`guideApplication.status = approved`，写操作记录。
- 审核拒绝：`guideApplication.status = rejected`，`roles[]` 不变（仍是客户）。
- 团主角色期限已过：即使仍能登录并作为客户使用，也不得继续使用团主功能，须显示正式不可用状态并引导联系管理员续期；客户功能不受影响。
- `disabled` 账户：一切业务功能关闭，前端导向安全状态、后端拒绝读写。

## A4. 权限边界

前端隐藏入口只是体验优化，不能替代后端权限。所有正式写入和敏感读取必须由 service / repository / cloud function 做最终判断。

权限判断至少包含：

- 当前 OpenID 是否存在正式 user profile。
- 账户是否为 `approved`（未 `disabled`）。
- 目标动作要求的角色是否在 `roles[]` 内，且该角色未过期。
- 当前场景的 `effectiveRole` 是否允许该动作。
- 资料是否归属于当前 principal（团主只管自己的团单/商品/供应商；客户只管自己的订单）。
- 分享下单入口是否来自合法、有效、未过期、可售的团单。

任何账户停用、角色不符、期限已过、资料不归属、分享无效或伪造身份的请求，后端必须拒绝。

后端**不得直接信任前端传入的角色或预览角色**；必须以云端 profile 为准。

## A5. 核心资料模型与归属

- `users`：微信身份、`roles[]`、primary `role`、`reviewStatus`、`guideApplication`、`roleExpiresAt`、基础资料、审核记录。OpenID 是锚点，本地缓存只能加速显示，不能作为权限真相。
- `providers`（供应商实体）：由团主创建维护的对外供应商资料（名称、联系方式、介绍、服务范围等）。**归属于创建它的 guide principal**；无独立账号登录。owner/admin 可管理全局供应商实体。
- `products`：商品/服务，含名称、图片、价格、说明、状态、创建者、归属 guide principal、关联的供应商实体 id、软删除状态。团主只管自己的商品；owner/admin 管全局。
- `groupOrders`：团主开团资料，记录 guide principal、状态、时间、收单规则、联系说明、分享路径 / share token。
- `groupOrderProducts`：团单与商品关联，保存商品快照、价格快照、供应商实体快照、可售状态，用于订单追溯，不得只依赖实时商品表。
- `customerOrders`：客户在指定团单下的订单，记录 group order、customer principal、items、金额、状态、付款资料、创建/更新时间。
- `payments` / `paymentStatusHistory`：付款声明、团主确认、金额、方式、备注、可选凭证、操作者、状态变化、时间，必须可追溯。
- `operationLogs`：正式业务操作记录（见 A7）。追加写入，不可编辑。

**归属规则**：团主身份建立的商品/团单/供应商实体归 guide principal；客户身份建立的订单归 customer principal。同一 OpenID 拥有多角色时，不得因 OpenID 相同就跨场景看到或修改不属于当前 effectiveRole 的资料。

## A6. 订单、付款状态流转（替代聊天）

团主与客户之间**不做即时聊天**。双方通过订单与付款状态的变更来协作与知情：

### 客户可做的操作

- 从合法团单入口浏览本团商品并下单。
- 声明付款：填写付款方式、付款金额、必要备注；付款凭证图片**选填**（无图片时显示"未上传凭证"，不得因此阻止声明）。
- 更新/撤回自己订单的付款声明状态（在团主确认前）。
- 查看自己订单的状态与付款结果。

### 团主可做的操作

- 查看自己团单下的客户订单、付款状态、必要客户下单资料。
- 确认收款 / 拒绝 / 取消，写入付款状态历史（操作者、时间、金额、备注）。
- 更新团单状态（进行中、停止收单、结束等）与客户订单状态。

### 团单详情页可见范围（分角色）

同一个团单详情页，按角色决定看到什么：

- **客户**（含以客户身份查看自己下过单的团单）可见：团单基本信息、**本团在售商品**、**自己的订单**（含商品明细与付款状态）。**不可见**：其他客户的订单、下单人数、全团应收/已收等收款统计。
- **团主（本团归属/被授权）/ 管理层**可见：上述全部 + 全团客户订单、下单人数、应收/已收统计，以及确认收款 / 取消 / 编辑团单 / 导出报表 / 本团商品 / 客户下单入口等管理操作。
- 团单详情页的**在售商品与订单明细列表可收合/展开**，默认可折叠以避免页面过长。

### 付款状态（至少）

`未付款` → `客户已声明付款` → `团主已确认收款`，以及 `已取消` / `已拒绝` 分支。每次流转写入 `paymentStatusHistory`。

### 消息页定位

`pages/message` 定位为**订单状态提醒**：展示与当前用户相关的订单/付款状态变化，点击进入对应订单详情。不得出现聊天/对话术语。`pages/chat` 及"客户沟通"正式入口移除或降级为导回订单相关页面。

## A7. 操作记录规则

操作记录是审计能力，让用户回看自己的关键操作、让权限问题可追查。它不替代业务资料，也不是修改业务状态的入口。

至少记录：

- owner/admin 审核团主申请、拒绝、停用、改角色、续期。
- 团主建立/编辑团单、维护商品与供应商实体、确认/拒绝/取消收款、更新订单状态。
- 客户下单、声明/撤回付款、取消自己的订单。

每条至少含：actor principal、脱敏 OpenID、当时 effectiveRole、动作、资源类型、资源 id、摘要、结果、时间、必要上下文。追加写入；不得写入完整 OpenID、手机号、支付口令等敏感明文；重试需幂等去重。

可见范围：owner/admin 看自己的管理操作记录；团主看自己的团单/商品/收款相关记录；默认不开放普通角色查看他人记录；不得因多角色把不同 effective principal 的记录混在同一视角。

## A8. 环境切分与数据后端

区分 `DEV` 与 `PROD` 两个环境。数据后端由 config 的 `dataBackend` 开关在 `local` 与 `cloud` 之间切换。系统**不含任何 mock / seed / 本地假数据**：所有读写都落到当前选定的真实后端，DEV 测试即写入真实（本地或云端）数据库。

- `DEV`：开发与内测，`dataBackend` 可为 `local` 或 `cloud`。
- `PROD`：正式环境，`dataBackend` 固定 `cloud`，永远禁止本地后端、角色预览与 debug 切换。

### 数据后端：local / cloud（同一份源码）

- `cloud`：微信云开发（云函数 + 云数据库 + 云存储），前台走 `wx.cloud.callFunction`。
- `local`：本地 Node 服务，**直接运行 `cloudfunctions/*` 同一份云函数源码**（套 wx-server-sdk 本地垫片 + 本地数据库），前台改走 `wx.request` 到本地地址。
- 两者共用同一套云函数逻辑与集合 schema，切换只改 config、不改业务代码；买云开发后把 `cloudfunctions/*` 原样上传即可。
- 本地库与云端库数据相互独立、不自动迁移；如需搬运另做导出/导入。
- 本地模式取不到真实微信 OpenID，注入固定开发用 openId（可在本地 config 指定为 owner），仅 `local` 生效；`cloud`/`PROD` 一律使用真实 OpenID。

### DEV 角色预览（owner 专用）

只有真实 `owner`、`approved` 且 OpenID 命中受控来源时可用。预览只改变 `effectiveProfile`（当前页面/入口/权限使用的预览视角），不修改云端真实 owner 身份（`realProfile`）。可预览身份：`visitor`、`disabled`、`customer`、`guide`、`admin`、`owner`（`provider` 与 `pending_review` 已随模型简化移除）。后端必须先确认真实 OpenID 是 DEV 环境 approved owner 才允许启用预览。

### DEV 多人真人测试

角色预览关闭时，不同微信账号真人进入 DEV（`dataBackend: cloud`）。每人用真实 OpenID，默认成为 approved 客户；需要团主时由 DEV owner/admin 审核升级。测试者不得看到角色预览入口。

### PROD

独立云资源；`dataBackend` 固定 `cloud`；用户用真实 OpenID，默认客户；升级团主需审核。deploy、migration、数据删除、schema 调整、云函数环境变量调整须使用者明确授权；代理开发与自动化测试默认不得直接操作 PROD。

### 身份模拟配置（本地与云端同一套机制）

身份来源统一：owner/admin 由 allowlist 环境变量决定，其余登录者默认 customer，团主需审核升级。本地因取不到真实微信 OpenID，额外用 `config.localDevOpenId` 指定"以谁登录"。

| 身份 | 本地（`dataBackend:'local'`） | 云端（`dataBackend:'cloud'`） |
| --- | --- | --- |
| owner | `localDevOpenId` = server `OWNER_OPENIDS` 里的值（默认 `dev-owner-openid`） | 云函数环境变量 `OWNER_OPENIDS` = 使用者真实 OpenID |
| admin | server 加 `ADMIN_OPENIDS=<x>` 且 `localDevOpenId=<x>` | 云函数 `ADMIN_OPENIDS` = 对方 OpenID |
| customer | `localDevOpenId` = 任意非 allowlist 字符串（如 `cust-1`） | 真实用户登录即客户，无需配置 |
| 团主 guide | 需审核升级；开发期本地 server 可提供 `GUIDE_OPENIDS` 便捷 allowlist 直接扮团主 | 客户在 App 内申请 → owner/admin 审核通过 |

切换身份：改 `localDevOpenId` → 开发者工具「清缓存」→ 重新登录。`GUIDE_OPENIDS` 仅本地开发便捷用，`PROD` 禁止用 allowlist 直接发团主。

## A9. 命名与正式文案

- 用户可见团主角色统一称「团主」，不得出现「导游」「领队」「导游/领队」。内部 role key 仍为 `guide`，文档提及内部 key 时须注明"内部 role key 为 `guide`，用户显示为团主"。
- 正式模式不得显示 QA、mock、Seed、debug、MVP、未完成、后续、待串接、云端团单、测试账号、自动化 等内部字样。
- 保存/状态文案用产品语言：`已保存` / `保存失败` / `权限不足` / `网络问题`，不暴露 storage / mock / 同步实现细节。
- 未登录、停用、无权、空状态、错误状态、加载状态都要有正式简体中文文案与稳定画面。

## A10. 上线判断

以真实业务闭环能否完成为准，不以 commit 数、打勾数或静态检查为准。MVP 可上线最低条件：

- 微信登录默认成为可下单客户。
- 客户能申请团主，owner/admin 能审核通过并保留客户身份（多角色不冲突）。
- 团主能维护商品与供应商实体、开团、选品。
- 客户能从合法团单入口下单、声明付款（凭证选填）。
- 团主能确认收款、更新订单/团单状态；客户能查看并更新自己订单付款状态。
- owner/admin 与团主能查看自己的关键操作记录。
- 重开小程序后核心资料仍存在。
- 无权/停用/过期/资料不归属/分享无效在前端和后端都被挡住。
- 核心流程经过微信开发者工具画面实测验证。

## A11. 页面加载与状态呈现（全站统一三态）

每个需要向后端取数的页面统一走 `loading / ready / error` 三态，全站一套约定，不各写各的：

- **loading**：进入页面、尚未拿到数据时显示统一「加载中」占位（转圈或骨架），不得先显示旧档/空档再突然重刷。
- **ready**：数据到位后一次性显示正式内容。
- **error**：取数失败显示统一失败画面，含原因文案与「重试」入口；不得停在加载中或白屏。
- 已有本地缓存的资料（如登录档）可先渲染再后台校验，但校验结果无变化时不得重复重渲染造成闪烁。
- 空数据显示正式空状态与引导 CTA，与 error 区分开。

## A12. 功能入口编排原则

- 每个功能只有**一个固定入口位置**。有权限的角色在同一位置看到它，无权限的角色隐藏；**不得同一功能对 A 角色出现在底部 NAV、对 B 角色却出现在「我的」页**。
- 底部 NAV 放**跨角色的日常主流程**；「我的」页放**个人 / 账号 / 管理 / 角色申请**，不重复 NAV 的主流程入口。
- 具体每个功能落在哪、对哪些角色可见，见 Part B「B5 功能入口编排表」。

---

# Part B — 角色能力矩阵

本部分是 `services/auth/roleScope.js` 中 `FEATURE_ALLOWED_ROLES`、tab bar 过滤、"我的"页入口的**唯一对照源**。代码调整后必须与本表一致。

## B1. 功能 × 角色矩阵

✅=可见可用；(自己)=仅限本人/本人归属资料；—=不可见。`owner`/`admin` 统称管理层。

| 功能键 | 页面 | 客户 customer | 团主 guide | 管理层 owner/admin |
|---|---|---|---|---|
| `home` | pages/home | ✅ | ✅ | ✅ |
| `groupOrders` | pages/groupOrder | ✅(仅自己下过单关联的团单) | ✅(自己创建/被授权的团单) | ✅ |
| `groupOrderCreate` | 开团主流程 | — | ✅ | ✅ |
| `products` 浏览 | 商品浏览 | ✅(可下单商品) | ✅ | ✅ |
| `productManage` 管理 | pages/productManagement | — | ✅(自己的商品) | ✅ |
| `providerManage` 供应商实体 | 团主商品/供应商维护 | — | ✅(自己的供应商实体) | ✅ |
| `customerOrders` | pages/customerOrders | ✅(自己的订单) | ✅(自己团单下的订单) | ✅ |
| `customerOrderCreate` 下单 | 下单流程 | ✅ | ✅(经分享作客户时) | ✅ |
| `dataCenter` | pages/dataCenter | — | ✅ | ✅ |
| `message` 订单提醒 | pages/message | ✅(自己相关) | ✅(自己相关) | ✅ |
| `guideApply` 申请团主 | pages/tourGuides/edit | ✅(未持有 guide 时) | —(已是团主) | ✅ |
| `userReview` 用户审核 | pages/userReview | — | — | ✅ |
| `operationLogs` | pages/operationLogs | — | ✅(自己的) | ✅(自己的管理记录) |
| `profile`/`infoEdit`/`settings` | 我的/资料/设置 | ✅ | ✅ | ✅ |
| `search` | pages/search | — | ✅ | ✅ |
| ~~`chat`~~ 聊天 | ~~pages/chat~~ | 移除 | 移除 | 移除 |
| ~~`providers` 后台~~ | ~~pages/providers~~ | 移除(降为 providerManage 实体) | — | ✅ |
| ~~`release` 独立发布入口~~ | ~~pages/release~~ | 收敛进 groupOrderCreate 单一主入口 | | |

> 多角色账户按 `roles[]` 取并集：同时是 customer+guide 的用户，看到 customer 与 guide 两栏所有 ✅ 的并集，且各自的"(仅自己)"范围分别成立。

## B2. 底部 tab bar（custom-tab-bar）

tab 由 `canUseFeature` 过滤，「我的」恒显：

- **客户**：首页 / 团单(我的) / 客户订单(我的) / 我的
- **团主**（含 customer+guide）：首页 / 团单 / 客户订单 / 商品库 / 我的
- **管理层**：全部
- **停用/未登录**：仅安全状态页，无业务 tab

## B3. "我的"页入口分区（对应 J3）

三区，同角色只显示可用项，不同层级不混排：

- **常用工作**：客户=我的订单、去下单；团主=开团、我的团单、商品与供应商、待确认收款。
- **资料与权限**：个人资料、设置；客户未持有 guide 时显示「申请成为团主」。
- **管理**（仅 owner/admin）：用户审核、全局资料、操作记录。

## B4. 供应商实体的定位

供应商不是入口/角色，而是团主在**商品管理**内维护的关联数据：新增/编辑供应商实体 → 创建/编辑商品时选择关联供应商 → 客户下单页与订单详情展示必要供应商信息（名称/联系方式等对外字段），不展示任何内部营运字段。

## B5. 功能入口编排表（NAV vs 我的，位置固定）

落实 A12：每个功能只有一个固定位置，有权限就在该位置显示，无权限隐藏。此表取代 B3 旧「我的页三区」的粗描述。

| 功能 | 固定入口位置 | 客户 | 团主 | 管理层 |
| --- | --- | --- | --- | --- |
| 团单 | **底部 NAV** | ✅(自己相关) | ✅ | ✅ |
| 客户订单 | **底部 NAV** | ✅(自己的) | ✅(本团) | ✅ |
| 商品库（浏览/管理） | **底部 NAV** | ✅浏览 | ✅管理 | ✅ |
| 我的 | **底部 NAV** | ✅ | ✅ | ✅ |
| 个人资料 / 设置 | 我的·账号区 | ✅ | ✅ | ✅ |
| 操作记录 | 我的·账号区 | — | ✅(自己相关) | ✅(管理记录) |
| 申请成为团主 | 我的·账号区 | ✅(未持 guide 时) | — | — |
| 用户审核 | 我的·管理区 | — | — | ✅ |
| 供应商实体维护 | 商品库内（非独立入口） | — | ✅ | ✅ |
| 用户目录 / 改他人资料·角色 | 我的·管理区（并入用户审核域） | — | — | ✅ |
| ~~工作台/首页(home)~~ | **废弃** | — | — | — |
| ~~开团入口页(release)~~ | **废弃**（开团走团单列表 FAB / 我的·常用工作） | — | — | — |
| ~~验证码登录(loginCode)~~ | **废弃**（登录统一走微信登录 login） | — | — | — |

规则补充：
- 底部 NAV 一栏对无权限角色**隐藏该 tab**（如客户看不到"商品管理"写操作、但保留浏览）。同一功能不因角色不同而在 NAV / 我的之间搬家。
- 「我的」页**不再重复** NAV 的团单/客户订单/商品库/工作台入口。
- **孤儿页废弃**：`home`（工作台）、`pages/release`（开团入口页）、`pages/loginCode`（验证码登录）三页均无正式入口、内容已被现有流程覆盖 → 废弃（删页 + 清 `app.json` 分包/页面注册）；开团入口固定为团单列表 FAB，登录统一走微信登录。
- **个人资料只有一个自我编辑入口**：普通用户维护自己的资料统一走 `pages/my/info-edit`（账号资料：姓名/手机/性别/生日/地区/简介/头像）；`pages/profile/*`（用户目录 + 改他人/改角色）**仅管理层可用**，并入「我的·管理区」用户审核域，不对客户/团主开放。
- **他人资料隐私**：普通用户（客户/团主）**不得看到其他用户的姓名、手机号等个人资料**；用户目录/名单类页面仅管理层可见，普通用户的资料页只返回并显示**本人**记录。对外展示他人信息处按 A7 脱敏。

---

# Part C — 开发项 CHECKLIST

每项：**目标 / 主要改动文件 / 完成判定**。完成判定须同时满足：功能走 service/repository/后端（`dataBackend` 选定的 local 或 cloud，无 mock/假数据）路径、前后端权限符合 Part A、微信开发者工具画面实测通过、需持久化资料者有重开后仍在的 readback 证据。

## C0. 数据后端与去 mock（测试地基，先做）

- [ ] **C-LOCAL-BACKEND 本地后端 + `dataBackend` 切换**
  - 改动：`config.js`（加 `dataBackend: 'local' | 'cloud'` 开关与本地服务地址）、`repositories/cloudBusinessRepository.js` 与 `services/auth/authService.js` 的调用收口处（`callBusinessData`/`callPublicBusinessData`/`callCloudAuth`：local 走 `wx.request`，cloud 走 `wx.cloud.callFunction`）、新增本地 Node 服务（Express + wx-server-sdk 本地垫片 + 本地库，`require` 现有 `cloudfunctions/*` 同一份源码）。
  - 判定：DEV 下 `dataBackend:'local'` 时登录/读写全部命中本地服务与本地库，重开仍在；切 `cloud` 后不改业务代码即连云开发；本地注入的开发用 openId 仅 local 生效。

- [ ] **C-MOCK-REMOVE 移除全部 mock / seed / 本地假数据**
  - 改动：删 `mock/*`；清 `config.js` 的 `allowMockIdentity/allowSeedDataFallback/allowQaTools`；`services/auth/authService.js`（删 `normalizeMockProfile`/mock openId/`DEFAULT_ROLE_PROFILES` 假档）；各 `repositories/*` 删本地假数据兜底；`pages/home|my|setting` 删 QA/mock 入口。
  - 依赖：必须在 **C-LOCAL-BACKEND 之后**，否则 DEV 无云又无 mock 会空转。
  - 判定：全站无 mock/seed/假身份路径；DEV 任何读写都进真实后端库。

## C-UX. 加载三态 / 入口编排 / 本地身份（已定方案，待开发）

- [ ] **C-LOADING-UX 全站加载三态**
  - 改动：新增共用状态组件（loading/error/empty），各数据页统一接入 `pageState`；登录后到拿到数据前显示加载中，成功显示正式内容，失败显示失败+重试。
  - 判定：全站数据页无"先显旧档再突然重刷"或白屏；失败有重试；空数据有正式空状态。

- [ ] **C-ENTRY-IA 功能入口编排落地**
  - 改动：按 Part B「B5」把入口位置固定；「我的」页移除与 NAV 重复的团单/客户订单/商品库/工作台入口；废弃 home 作为正式入口。
  - 判定：同一功能对所有有权限角色出现在同一固定位置；无重复入口；无权限角色隐藏。

- [ ] **C-DEV-IDENTITY 本地身份模拟便捷开关**
  - 改动：本地 server 支持 `GUIDE_OPENIDS` 便捷 allowlist（仅本地）；`config.localDevOpenId` 说明与默认；按 A8 表让本地可扮 owner/admin/customer/guide。
  - 判定：改 `localDevOpenId` + 清缓存 + 重登即可切换四种身份；`GUIDE_OPENIDS` 不在 PROD 生效。

## C1. 模型简化（本次重构地基，优先）

- [ ] **C-PROVIDER-REMOVE 移除 provider 角色，改为供应商实体**
  - 改动：`services/auth/roleScope.js`（删 `AUTH_ROLES.PROVIDER`、`FEATURE_KEYS.PROVIDERS`、相关 allowed roles、`canUseProviderPortal`）、`cloudfunctions/authLogin/index.js`（删 `ROLE_PROVIDER`、登录选项、`providerId` 默认逻辑）、`pages/login/*`（删申请 provider 选项）、`pages/home/*` 与 `pages/my/index.js`（删「申请供应商」入口）、`pages/providers/*`（改造为团主的供应商实体管理或迁移到商品管理下）、`enum`/`config` 相关。
  - 判定：全站无"以 provider 身份登录/申请/进入 provider 后台"路径；团主可在商品管理里新增供应商实体并与商品关联；旧 provider 账户数据有迁移或兼容处理，不造成崩溃。

- [ ] **C-CHAT-REMOVE 移除聊天**
  - 改动：`pages/chat/*`（移除或降级）、`pages/message/*`（改为订单提醒）、首页/我的页对话入口引用、`services/auth/roleScope.js`（删 `FEATURE_KEYS.CHAT`）。
  - 判定：正式用户看不到聊天/客户沟通入口；消息页为订单状态提醒，点击进订单详情；无聊天术语。

- [ ] **C-CUSTOMER-DEFAULT 登录即已审核客户**
  - 改动：`cloudfunctions/authLogin/index.js`（新用户 `buildDefaultProfile` → `role:'customer'`、`roles:['customer']`、`reviewStatus:'approved'`，移除全员 pending 逻辑）、`pages/login/*`（去掉"选择申请身份+提交审核"，改为直接登录进入）、`services/auth/authService.js`（bootstrap 默认客户）。
  - 判定：任意新 OpenID 登录后立即可作为客户浏览团单商品并下单；无 pending 拦截页挡住客户。owner/admin allowlist 命中仍自动 approved 管理层。

## C2. 团主申请与多角色

- [ ] **C-GUIDE-APPLY 客户申请升级团主（独立立项）**
  - 改动：`pages/tourGuides/edit/*`（申请单：申请人、时间、说明、状态）、`pages/my/index.js`（「申请成为团主」入口，仅未持有 guide 的客户可见）、`services/auth/authService.js` + 相关云函数（写 `guideApplication.status='pending'`，账户维持 approved 客户）、`pages/userReview/*`（团主申请出现在审核列表）。
  - 判定：客户能提交团主申请；提交后客户功能不受影响；owner/admin 审核列表能看到申请并可通过/拒绝；结果可回写可追溯。

- [ ] **C-MULTIROLE roles[] 追加不覆盖 + effectiveRole 全面化**
  - 改动：审核通过写入处（`pages/userReview/index.js` 现为 `role: roles[0]`，需改为**追加** guide 并保留 customer）、`cloudfunctions/authLogin` 与 `businessData`（`effectiveRole` 一致化）、`services/auth/roleScope.js` 的 `getRoleScopeText`（改读 `roles[]`/`effectiveRole`，不再只读单一 `profile.role`）、所有按 `profile.role` 做入口/文案判断处。
  - 判定：客户升团主后 `roles[]` = `[customer, guide]`；作为客户的功能完全不受影响；多角色账户文案与入口正确；单一 `role` 不再是任何权限或文案的唯一来源。

## C3. 角色能力矩阵落地

- [ ] **C-MATRIX roleScope 与 Part B 对齐**
  - 改动：`services/auth/roleScope.js` 的 `FEATURE_ALLOWED_ROLES`、`custom-tab-bar/index.js` 的 tab 过滤、`pages/my/index.js` 入口分区。
  - 判定：客户/团主/管理层三类（含多角色并集）在 tab、首页、我的页看到的入口与 Part B 完全一致；无权入口前端隐藏、后端拒绝。

- [ ] **C-MY-GROUPING 我的页三区重构（J3）**：`pages/my/index.*` 按"常用工作/资料与权限/管理"分区，不同角色项目同页隐藏。判定：各角色进入"我的"首屏一次可理解唯一主流程目标。

- [ ] **C-CREATE-CONVERGE 开团入口收敛（J4）**：`app.json`、`pages/my/index.js`、`pages/groupOrder/*`、`pages/release/*`、`utils/navigation.js`。保留单一主创建入口，其他页仅"跳转到主入口"。判定：任一路径进入开团都落到同一创建流程。

## C4. 团主开团、商品、供应商、团单闭环

- [ ] **C-PRODUCT 团主商品管理**：`pages/productManagement/*`、`services/product/productService.js`、`sub-pages/product/*`。新增/编辑/上下架/软删除自己的商品，含供应商实体关联；上下架用可辨识 toggle（J9）；删除二次确认并提示"下架/软删除，不影响历史团单与订单"（J8）；两套列表明确"管理/浏览"定位（J7）。判定：保存后列表/详情/开团选品即时更新，重开仍在；团主不得改他人商品。
- [ ] **C-PROVIDER-ENTITY 供应商实体维护**：团主可新增/编辑供应商实体并与商品关联；客户下单页/订单详情展示必要供应商对外信息，不展示内部字段。判定：商品能带出关联供应商信息；停用/删除供应商实体不破坏历史订单追溯。
- [ ] **C-GROUP 开团流程**：`sub-pages/groupOrder/add/*`。出团时间/收单截止用微信日期时间 picker（禁自由文本）、付款说明/取货集合用可编辑模板、必填与格式校验（时间顺序、金额、数量边界）（J5）。判定：空数据有校验提示，picker 保存后可回填。
- [ ] **C-GROUP-PRODUCT 本团商品**：保存商品/价格/供应商/可售状态快照；下架或供应商停用后新团单不得选用，既有团单保留历史状态。
- [ ] **C-GUIDE-ORDERVIEW 团主客户订单视图**：`pages/customerOrders/*`。团主查看自己团单下订单与付款状态，可更新订单/团单状态与确认收款；不得看他人团单订单。

## C5. 客户下单、付款、分享

- [ ] **C-ORDER 客户下单**：`pages/customerOrders/edit*`。从合法团单入口选品提交订单，记录 group order/customer principal/items/金额/状态/时间。判定：客户只见自己订单。
- [ ] **C-PAY 付款声明（凭证选填）**：付款方式/金额/备注可提交声明，图片选填；有图走正式 media picker + 持久化存储，不存临时本地路径。客户可在团主确认前更新/撤回声明。团主确认/拒绝/取消写状态历史。凭证仅客户本人/所属团主/管理层可见（J13 报表用语与行为一致）。
- [ ] **C-SHARE 分享下单 token 校验（J12）**：`pages/customerOrders/edit*`、`repositories/groupOrderRepository.js`、`services/customerOrder/*`、`cloudfunctions/businessData/index.js`。入口不只靠 `groupOrderId`，须校验 share token、团单状态、截止时间、可售性；非法/过期导向安全页并说明拒绝原因。已是团主者从他人分享进入时进入客户下单场景，退出后回团主首屏。
- [ ] **C-SHARE-QR 分享/QR 行为一致（J16）**：文案、按钮、实际功能一致；未实作 QR 则移除"暂无团单二维码"改为可实现替代（如复制链接）。

## C6. owner/admin 与操作记录

- [ ] **C-REVIEW 审核与停用防误操作（J11）**：`pages/userReview/*`、`services/auth/authService.js`、审核 API。拒绝/停用二次确认 + 必填原因；`roleExpiresAt` 用日期选择器；记录 `reviewedAt/reviewedBy/reviewResult/reviewNote`。owner 安全边界：首位 owner 来自 allowlist；admin 不能升自己为 owner、不能改/停用/指派 owner。
- [ ] **C-LOG 操作记录**：`pages/operationLogs/*`、`repositories/operationLogRepository.js`、写入点。按 A7 记录关键操作，幂等去重，脱敏；owner/admin 看自己管理记录、团主看自己相关记录；查询 API 校验身份/归属；列表支持时间/类型/状态筛选、分页、空/错/载状态。

## C7. 正式化与文案

- [ ] **C-COPY 清测试字串 + 产品文案（J1/J2/J6）**：全站移除 `云端团单/测试/DEBUG/自动化/待串接/资料已同步/当前资料仅保存到本设备` 等；`config.js` 把 `dataBackend`、`appEnv` 可视化并在 UI 入口加 `isProd` 硬关。判定：PROD 路径看不到内部开关与测试字样；`isRolePreview` 不在 PROD 生效。

---

# Part D — 测试项 CHECKLIST

每项对应 Part C 开发项，供微信开发者工具人工实测与后续自动化脚本（miniprogram-automator）。运行方式见文末。测试须覆盖正向 + 负向（无权/停用/过期/资料不归属/分享无效），且后端拒绝无权请求，不能只靠前端 toast/disabled。

## D0. 数据后端与去 mock

- [ ] **D-LOCAL-BACKEND**：DEV `dataBackend:'local'` 时，登录与团单/商品/订单读写全部命中本地服务与本地库，重开仍在；改 config 切 `cloud` 后同流程连云开发、业务代码零改动。
- [ ] **D-MOCK-REMOVE**：全站搜不到 mock/seed/假身份路径；DEV 任一读写都进真实后端库，无本地假数据兜底。

## D-UX. 加载三态 / 入口编排 / 本地身份

- [ ] **D-LOADING-UX**：各数据页进入显示加载中→成功显示内容→失败显示失败+重试；无白屏、无"旧档突然重刷"；空数据有空状态。
- [ ] **D-ENTRY-IA**：分别以客户/团主/管理层验证每个功能入口位置固定一致；「我的」页无 NAV 重复入口；home 不作正式入口。
- [ ] **D-DEV-IDENTITY**：按 A8 表切 owner/admin/customer/guide 各能正确进入对应权限；`GUIDE_OPENIDS` 仅本地生效。

## D1. 模型简化

- [ ] **D-CUSTOMER-DEFAULT**：全新 OpenID 登录 → 立即为 approved 客户 → 可浏览团单商品并下单，无 pending 拦截。owner allowlist OpenID → 自动管理层。
- [ ] **D-PROVIDER-REMOVE**：全站无 provider 登录/申请/后台入口；团主商品管理可新增供应商实体并关联商品；旧 provider 数据不致崩溃。
- [ ] **D-CHAT-REMOVE**：无聊天/客户沟通入口；消息页为订单提醒，点击进订单详情；无聊天术语。

## D2. 团主申请与多角色

- [ ] **D-GUIDE-APPLY**：客户提交团主申请 → 客户功能仍可用 → owner/admin 审核列表可见 → 通过后该用户获得团主功能。
- [ ] **D-MULTIROLE**：客户升团主后 `roles[]`=`[customer,guide]`；用该账号验证 customer 下单与 guide 开团/收款同时可用、互不影响；多角色文案与入口正确；后端按 roles[] 判权。团主角色过期 → 团主功能关闭但客户功能正常。

## D3. 矩阵与导航

- [ ] **D-MATRIX**：分别以客户 / 团主 / 管理层（及 customer+guide 多角色）验证 tab bar、首页、我的页入口与 Part B 一致；无权入口隐藏且后端拒绝。
- [ ] **D-NAV**：我的页三区正确；开团入口任一路径落到同一主流程。

## D4. 团主闭环

- [ ] **D-PRODUCT**：新增/编辑/上下架(toggle)/软删除(二次确认+风险提示)商品，重开仍在；管理/浏览列表定位清晰。
- [ ] **D-PROVIDER-ENTITY**：团主新增/编辑供应商实体并与商品关联；下单页/订单详情展示对外供应商信息、不露内部字段；停用/删除供应商实体不破坏历史订单追溯。
- [ ] **D-GROUP**：开团表单 picker 校验与回填；本团商品快照；下架/停用商品不被新团单选用，历史保留。
- [ ] **D-GUIDE-ORDERVIEW**：团主看自己团单订单、改状态、确认收款；不得见他人团单订单。

## D5. 客户下单与付款

- [ ] **D-ORDER**：客户从合法团单入口下单，只见自己订单。
- [ ] **D-PAY**：无凭证也能声明付款并显示"未上传凭证"；有凭证走正式存储；客户可更新声明；团主确认/拒绝/取消写历史；客户重进看到状态变化；凭证权限受限。
- [ ] **D-SHARE**：合法分享可下单；非法/过期/无效分享导向安全页并说明；团主从他人分享进入走客户场景，退出回团主首屏。
- [ ] **D-SHARE-QR**：分享/QR 文案、按钮与实际功能一致；未实作 QR 时不出现"暂无团单二维码"，改为可实现替代（如复制链接）。

## D6. 管理与审计

- [ ] **D-REVIEW**：拒绝/停用二次确认+必填原因+日期 picker；owner 安全边界（admin 不能改/停用/升 owner）。
- [ ] **D-LOG**：关键操作写入记录且幂等脱敏；owner/admin 与团主各自可见范围正确；筛选/分页/空错载状态可用；无权查询后端拒绝。

## D7. 正式化

- [ ] **D-COPY**：正式登录后首页/消息/列表/分享页无测试字样；PROD 无 mock/QA 开关；关键保存节点文案为产品语言。

## D8. 全量画面 smoke（对应旧 Gate I/J17）

- [ ] **D-SMOKE-ROUTE**：`app.json` 所有 route 可在开发者工具打开，无阻塞 console error，带 id/无 id/无权/错误 id 都有安全状态。
- [ ] **D-SMOKE-WORKFLOW**：tab 切换、带 id 详情、eventChannel picker、分享入口、列表卡片、空状态 CTA、返回 fallback 用真实入口验证并留证。
- [ ] **D-SMOKE-CLOSEDLOOP**：登录成客户 → 申请团主 → 审核通过 → 团主建供应商/商品/开团 → 客户下单声明付款 → 团主确认收款 → 双方查订单状态 → 查操作记录 → 重开仍在，全链路走通。

---

## 附：自动化测试运行约定（供后续启用）

采用微信官方 `miniprogram-automator` + jest，脚本运行在使用者本机（需在微信开发者工具开启"自动化/CLI 端口"）。为省 token：脚本一次写好、静默运行，只回传"通过数 / 失败项"，失败时才附该项日志。测试按 Part D 逐项对应，随 Part C 开发项增量补充，不在重构未定稿时对旧 UI 批量写脚本。默认只跑 DEV，禁止对 PROD 自动化写入。
