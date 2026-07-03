# MVP_COMPLETION_CHECKLIST

## 文件用途
本文件是从当前 QA/demo 小程序推进到真人可用 MVP 的总路线图，也是 MVP gate / backlog / 产品完成度参考文件。

本文件不得变成 QA 或 AGENT 的日常产出要求。QA 只在 `QA/QA_BUG_REPORT_202607021815.md` 维护当前仍不通过的待修问题；AGENT 只负责修正产品代码并运行完整验证。除非使用者明确要求，QA/AGENT 不新增、不维护额外计划、结果、交接、矩阵或进度文件。

`QA/QA_BUG_REPORT_202607021815.md` 只作为当前待修 BUG 清单：记录可单独修正、单独完整重测、单独关闭的问题。它不是历史证据系统，不保留已通过项目，也不靠旧截图或旧记录关闭问题。

强制职责边界：

- `MVP_COMPLETION_CHECKLIST.md` 只管理 MVP gate、阶段、产品完成度、剩余能力类别和验收门槛；它不是 QA/AGENT 的日常回报文件。
- `QA/QA_BUG_REPORT_202607021815.md` 只管理原子化 BUG / GUI issue row。
- 禁止把 BUG row、BUG ID 清单、GUI 子项清单、逐页缺陷清单复制到本文；这会制造第二份 BUG 单，后续状态必然分裂。
- 如果 BUG 单发现某类问题会影响 MVP，QA 仍只更新 BUG 单；MVP gate 是否调整由负责整理项目状态的人处理，不能要求 QA 或 AGENT 另写文件。
- 如果本文出现 `BUG-00X-*`、`GUI-00X-*` 这类原子 BUG 清单，后续整理时应移回 BUG 单，并把本文改回 gate 级描述。
- AGENT 修 BUG 时看 BUG 单的原子 row；判断 MVP 是否可宣告时看本文的 gate 是否已完整实作并重新验证。两个文件互相引用，但不得互相复制内容。

QA/AGENT 分工必须保持分离：QA 只在 BUG 单维护仍不通过的问题；AGENT/开发只修产品代码并运行完整验证。项目流程不再要求 QA 做环境建立/同步/清理，也不要求 QA/AGENT 产出额外 docs。节奏是：修正 -> 完整验证 -> QA 完整复测；仍不通过就继续回到 BUG 单，再修一次。

## 产品定义
- 产品：面向中国导游/领队的微信小程序。
- 核心流程：团单、本团商品、商品库、客户订单、收款状态。
- 产品 UI 必须使用简体中文。
- 不要擅自扩展到 marketplace、社交 feed、CRM、聊天或完整后台，除非使用者明确要求。
- 任何没有正式保存的操作，都必须清楚标示为本地/QA/demo 模式。

## 当前基线
- 当前为混合模式：正式微信云登录与核心业务云端保存已接通；local/QA fallback 仍保留给 mock 身份与本地开发。
- 使用者已确认 MVP 正式资料层优先采用微信云开发数据库 + 云函数，但页面仍必须通过 service/repository 边界接入。
- 微信云环境 `cloud1-3gwlqssy1f1972a9` 已写入配置。
- 正式 OpenID 登录已通过 DevTools automation 调用登录页方法验证。
- `authLogin` 云函数已部署并为当前 OpenID 初始化云端 `users` profile。
- 商品库已有 local/QA repository 实作。
- Phase 3 导游团单 local/QA 保存闭环已完成；正式云端保存已通过 targeted automation 验证。
- Phase 5 客户下单与收款闭环已有 local/QA repository 实作；正式云端保存已通过 targeted automation 验证。
- 微信 DevTools 已可通过 CLI 打开项目；automation 可用于 targeted flow，逐 route GUI smoke test 尚未完成。
- 2026-07-03 Phase 2-5 full-system QA attempt 的有效待修问题以后统一沉淀在 `QA/QA_BUG_REPORT_202607021815.md`；29 routes、5 roles、14 feature groups 均在 scope 内，目前 0 route / 0 role 完成 formal full-screen pass，full-system gate 仍为 `不通過`。

## 勾选规则
- 只有已经实作且有验证信号的项目才能打勾。
- local/mock/QA 实作不等于正式云端保存。
- 静态检查不等于 GUI 验证。
- 后面阶段局部完成，不代表前面正式化缺口已经完成。
- 如果项目只做了一半，正式项保持未勾，并新增后续补完项。
- 未完成 backlog 必须留在本文件，不要移到其他文件。
- Phase 1-5 先记录当前 local/QA MVP 功能完成度；正式云端、真 OpenID、GUI 验证统一放在 Phase 7/8 gate，不混在前置 Phase 里。
- BUG/GUI 项目在 BUG 单只允许 `通過` / `不通過` 两种状态；只有 `通過` 的 row 才能视为关闭。
- 如果一个原始 BUG 同时包含已验证范围与未验证范围，必须拆成多条 BUG row：已验证 row 写 `通過`，未修完、未测完、或受外部环境限制的 row 写 `不通過`。
- 任何 BUG report 中 `Status` 是 `不通過` 的 MVP gate 或正式使用风险，只能映射到本文对应 gate 类别，不得复制 BUG row。该 gate 类别必须保持未勾，直到相关 BUG row 全部修正并取得足够验证信号。

## 已做一半，后续要补完
这些是 MVP gate 层级的剩余工作，不在这里复制每一条 BUG。所有可单独验收的 BUG 细项维护在 `QA/QA_BUG_REPORT_202607021815.md`。

### 明确开发需求 backlog

以下项目是产品开发需求，不写入 BUG 单。每一项都必须完成实作与重新验证后才可勾选；不能只靠旧证据、口头说明或局部截图关闭。

- [x] 清理 mock 设定来源：检查所有实际 import 路径；若 `config/index.js` 已无使用者就删除或标记废弃，若仍被使用就改成正式设定，并确认小程序启动后不会误进 mock 模式。
- [x] 建立正式角色功能规则：会员、导游/领队、供应商、管理员、owner 的可见入口、可读资料、可写操作、不可见范围必须有单一规则来源，并落实到前端入口与后端权限。
- [x] 完成角色申请审核流程：导游/领队与供应商申请必须能送审、由管理员审核通过或拒绝，并在申请者重新进入小程序后显示正确状态与可用入口。
- [x] 我的页正式版：登录后必须显示身份、基本资料、角色入口、订单或服务入口、设置与登出；未登录时只显示登录引导，不显示业务功能集合或 QA 工具。
- [x] 设置页正式版：登录后可查看与修改必要账号资料，错误输入会被阻挡，保存后可回填；未登录状态不可查看账号资料。
- [x] 商品建立与编辑：授权角色可以新增、修改、保存正式商品；保存后商品列表与详情立即显示更新，重新登录后资料仍存在。
- [x] 开团流程：授权角色可以建立团购，填写商品、时间、数量与说明后送出；团购列表与详情可看到新建立的团购。
- [x] 付款管理视图：授权角色可以依状态查看待确认、已确认、已拒绝付款，并能进入详情处理。
- [x] 领队资料管理：领队可以维护正式对外资料，包含介绍、联系方式与服务资讯；保存后公开或角色页资料一致。
- [x] 供应商资料管理：供应商可以维护正式商家资料，包含名称、联系方式、商品或服务资讯；保存后列表与详情显示正确。
- [x] 资料中心正式版：授权角色可以看到订单、付款、商品、团购或会员等实际营运资料；未授权角色不可进入。
- [x] 讯息中心：订单、付款、角色审核等事件要能产生正式通知，并支持已读状态与空状态。
- [x] 全站搜索：搜索页要支持正式商品、团购或相关内容搜索；无结果、清除条件与错误状态都要有正式画面。
- [x] 聊天或联系流程：商品、团购或供应商页的联系入口必须进入正式聊天/联系流程；若暂不开发，正式入口必须移除。
- [x] 发布流程：授权角色可以建立可发布内容并送出，列表或相关页面能看到结果；未授权角色不可发布。

- [ ] Phase 7 GUI smoke test：DevTools 项目可打开，29 route 静态存在检查通过；targeted automation 曾可用于登录/业务 flow，但完整逐页点击、返回、表单、角色、权限、copy、console/network、empty/error/loading 状态仍未完整验证。
- [ ] 真图片与付款凭证 GUI/真机验证：需要实际 media picker、保存、重开后仍显示的证据。
- [x] 正式/QA 文案与内部测试工具隔离：正式角色不得看到 QA/local/test/Seed/mock/OpenID 未验证/MVP/后续/未完成等内部或开发进度文字。
- [ ] 付款闭环 GUI 验证：客户声明付款、导游确认收款、付款历史、付款凭证必须分别有 GUI 证据。
- [x] 正式登录、未登录、待审核与角色授权必须收敛成固定规格画面和统一权限闸门：
  - 拆分方式：本需求作为一个登录/授权大待办管理，底下拆成 5 个子待办让 AGENT 开发：未登录固定画面、已登录但待管理员审核固定画面、管理员审核与指派角色、已登录用户状态/角色刷新、前后端权限防线。不要另开新文件管理这些需求；所有业务逻辑、验收门槛与未完成状态统一留在本文。
  - 需求目标：任何真人用户第一次通过微信登录后，系统不得自动把他当成可用导游、客户、管理员、供应商或 owner。登录只代表系统取得该用户的微信身份与 OpenID，不代表该用户已经获准使用业务功能。用户必须先进入「等待审核」状态，由系统管理员在后台/管理入口明确决定该用户是否可使用系统，以及该用户的正式角色是什么。没有登录、已登录但待审核、已被拒绝/停用、已审核通过这几种状态必须有清楚且互斥的界面规则，不能混在同一套业务 tab 里让用户看到一堆不能用的下方选单。
  - 用户状态模型：正式用户至少需要区分 `pending_review`（已微信登录但等待管理员审核）、`approved`（已审核通过并有正式角色）、`rejected`（管理员拒绝使用）、`disabled`（曾通过但后来被停用）四类状态。状态必须保存在云端 `users` profile 或等价正式用户资料中，并包含 `openid`、审核状态、正式角色、审核人、审核时间、最后更新时间；本地缓存只能作为显示加速，不能作为权限真相来源。
  - 第一位 owner/admin 来源：系统必须明确定义初始管理者如何产生，否则所有新用户都会卡在待审核。MVP 可采用 `OWNER_OPENIDS` / `ADMIN_OPENIDS` 白名单作为第一批 owner/admin 来源，或实现一次性初始化 owner 流程；没有可验证的 owner/admin 来源前，不得宣称审核流程完成。白名单命中的 owner/admin 仍必须写入云端 `users` profile，并能进入审核入口。
  - 旧用户 migration 规则：既有正式用户若已有 `active` 或旧状态，AGENT 必须先定义转换规则。若 `active` 等同 `approved`，需把前端、后端、云函数和文件统一改成同一套状态判断；若 `active` 不等同 `approved`，需列出哪些旧用户重新进入 `pending_review` 或人工复核。后端与前端都不得继续只判断 `active`，避免旧用户全部被挡掉或绕过新审核流程。
  - 子待办 1 - 未登录固定画面：用户没有正式 session / OpenID 时，系统必须显示一个固定规格的未登录画面，不得显示完整业务下方选单、首页快捷入口、团单、商品库、客户订单、资料中心、消息、发布、搜索、我的服务列表或任何会让用户以为已经进入系统的入口。未登录画面只允许显示产品名称/简短说明、微信登录主按钮、必要的联系管理员或说明入口、以及安全的错误/重试状态。所有 tabBar/custom-tab-bar 与首页入口必须根据未登录状态隐藏、替换或跳转到该固定画面，不能出现多个下方选单让用户乱点。
  - 子待办 2 - 已登录但待审核固定画面：用户已经通过微信登录并取得 OpenID，但云端状态是 `pending_review` 时，系统必须显示一个固定规格的等待管理员审核画面，不得继续显示完整业务下方选单或任何导游/客户/管理业务入口。该画面必须清楚告诉用户「已提交使用申请，等待管理员确认身份」，并提供刷新/重新检查状态、联系管理员、退出登录或返回安全状态的入口。这个页面和未登录页面必须是两个不同状态：未登录引导微信登录；待审核说明已经登录、只是还没有被允许使用。
  - 子待办 3 - 首次登录与管理员审核流程：用户通过 `wx.login` / `authLogin` 取得 OpenID 后，云端若找不到该 OpenID 的正式用户记录，必须创建用户 profile，但默认状态只能是 `pending_review`，默认角色不得拥有任何业务写入/查看权限。管理员审核入口建议放在「我的 -> 用户审核」或单独 admin 页面；入口只对 owner/admin 可见。管理员至少能看到待审核列表，通过时必须选择正式角色，拒绝、停用、改角色都必须有明确操作。审核资料必须保存 `reviewStatus`、`role`、`reviewedBy`、`reviewedAt`、`updatedAt`，建议增加 `reviewRemark` 记录拒绝、停用或调整原因。
  - 子待办 3 权限边界：不得允许用户在正式模式下自行选择、切换、提交或伪造角色；不得用前端参数、本地 storage、QA override 或分享链接改变正式角色。`admin` 不得把自己升成 `owner`，不得修改或停用 `owner`，不得指派 `owner`；`owner` 操作 admin/user 必须有审核/角色变更记录。所有角色变更都要记录操作者、时间、前后状态和备注。
  - customer 分享下单取舍：必须明确定义 customer 是否需要人工审核。若 customer 也需要人工审核，必须接受分享下单转化率下降，首次打开分享链接后进入待审核固定画面。若 customer 不需要完整人工审核，必须定义「受限 customer」状态或等价机制：受限 customer 只能通过分享团单查看该团商品、提交自己的订单、查看自己的付款状态，不能进入完整业务 tab、商品库、导游团单、资料中心、管理入口或其他客户资料。分享路径、直达 route、重新打开小程序、返回 fallback 都必须符合这个规则。
  - provider MVP 定位：MVP 必须明确 provider 是否正式开放审核。若 provider 暂不开放，管理员审核时不得把新用户指派为 provider，provider 直达 route 必须显示正式无权画面。若 provider 开放，必须先在既有角色功能矩阵中定义 provider 可见、可改、不可见范围，并补齐后端权限；不得用「未完成」或测试文案挡住正式 provider。
  - 子待办 4 - 已登录状态变更与角色刷新：如果用户已经打开小程序并处于登录状态，而管理员随后把该用户从 `pending_review` 改成 `approved` 并指派为导游或客户，系统必须能让用户顺畅取得新状态并继续使用。最低要求是小程序在启动、前台恢复、进入首页/我的页/权限敏感页面、以及用户点击刷新/重试时重新向云端读取当前用户 profile；读到状态或角色变化后，必须更新全局 auth/session 状态、清掉旧权限缓存、重算 tab/入口可见性，并自动导向该角色可用的首屏或继续当前可访问流程。若微信小程序环境可行，可额外使用轮询、订阅消息、云函数触发后的轻量刷新信号或页面级 refresh 机制，但不能只依赖用户手动退出重登。
  - 子待办 5 - 角色变更、降权与权限防线：管理员不只会把待审核用户改成导游/客户，也可能把已通过用户改角色、停用或拒绝。系统每次恢复前台、进入核心页面、提交保存、读取敏感资料或调用云函数时，都必须以云端最新状态为准；如果用户从 `approved` 变成 `disabled` / `rejected` / 其他无权角色，前端必须立即隐藏/移除不可用入口并导向安全状态页，后端/cloud function 必须拒绝后续业务读写。前端等待页、未登录页和入口隐藏只改善体验，不是权限完成；所有 service、repository、cloud function、云数据库访问边界仍必须检查云端最新用户审核状态与正式角色。
  - 后端统一闸门：所有业务云函数入口必须统一读取当前 OpenID 的云端 `users` profile。只有 `approved` 且角色符合功能规则时，才能做正式业务读写；`pending_review`、`rejected`、`disabled`、角色不符、或只有 QA/mock 身份都必须被后端拒绝。写入动作尤其要严格，包括新增商品、开团、编辑团单、加入/移除本团商品、客户下单、声明付款、确认收款、取消订单、管理审核、导出或分享敏感资料。
  - 本地/QA 模式规则：QA override 和 mock role 可以继续服务开发验证，但必须清楚与正式微信 OpenID 审核机制隔离。正式模式不得因为本地曾保存 guide/customer 角色、QA Seed 身份、debug 参数或旧缓存而跳过管理员审核。
  - 状态页面互斥规则：未登录只显示登录入口与简短说明；`pending_review` 显示「已提交使用申请，等待管理员确认身份」与刷新/联系管理员/退出；`rejected` 显示无法使用与联系管理员；`disabled` 显示账号已停用与联系管理员。四种状态都不能显示完整业务 tab、首页快捷入口、商品库、团单、客户订单、资料中心、管理入口、QA 工具或测试身份切换。
  - UI/文案规则：未登录、`pending_review`、`rejected`、`disabled`、无权页、空状态页必须使用正式简体中文产品文案，提供清楚状态、微信登录或刷新/重新检查入口、联系管理员或返回安全页面路径。正式模式不得显示「未完成」「MVP」「mock」「Seed」「OpenID 未验证」「测试账号」「QA」等内部字样；无权时使用类似「当前账号暂无权限，请联系管理员」的正式文案。QA 工具只允许在 mock/demo 模式出现。
  - 数据一致性规则：如果本地缓存与云端用户 profile 冲突，以云端为准；如果云端读取失败，不得乐观放行正式业务功能。可以保留上一次已审核状态用于离线显示，但任何新增、编辑、确认收款、管理审核、导出、分享业务入口等写入或敏感操作必须重新确认云端状态。
  - 本地缓存刷新规则：app 启动、前台恢复、进入首页、进入我的页、进入敏感页、提交保存或调用业务云函数前，必须刷新或确认云端 profile。若云端状态变成 `disabled` / `rejected` / 角色不符，立即清掉旧权限缓存并导向安全状态页。云端读取失败时，不能乐观放行写入或敏感操作；本地 storage 只能加速显示，不能当权限真相。
  - 角色矩阵定位：角色功能规则参考既有 `ROLE_FEATURE_ACCESS_MATRIX.md`，不要新增第二份矩阵。若矩阵不足，优先更新既有矩阵或在程式修正说明中指出缺口；QA 验收仍回到 `QA/QA_BUG_REPORT_202607021815.md`，不要产生新的进度文件。
  - 可验收子任务：AGENT 应拆成可独立验收的小任务推进，包括 `authLogin` 新用户默认 `pending_review`、owner/admin 白名单可进入审核入口、admin 可通过 `guide`、admin 可通过 `customer`、`disabled` / `rejected` 后前端入口消失、`disabled` / `rejected` 后后端拒绝业务操作、分享下单路径符合 customer 规则。每一项都要有明确截图、云端 readback、自动化 readback 或后端拒绝证据，不得只写「已完成」。
  - QA 验收规则：必须覆盖至少 5 条正式 OpenID 状态路径：未登录用户只能看到固定未登录画面且没有完整下方选单；新用户首次登录进入固定等待审核画面且没有业务 tab/入口；管理员通过并指派 `guide` 后，已打开小程序的用户不用重新安装即可刷新到导游可用首屏；管理员通过并指派 `customer` 后，用户只看到客户可用入口或受限 customer 分享下单入口；管理员拒绝或停用后，已登录用户无法继续进入或保存业务资料。每条路径都需要 fresh DevTools/真机截图、云端 users 记录 readback、关键页面入口可见性证据、以及至少一次后端/cloud function 拒绝无权请求的证据。
  - 不得勾选条件：没有 owner/admin 初始来源、旧 `active` 状态未 migration、customer 分享下单规则未定义、provider MVP 定位不清、审核入口无具体规格、未登录状态仍出现完整业务下方选单、待审核状态仍出现完整业务下方选单、首次微信登录自动获得业务角色、用户可自行选正式角色、admin 可自提权或修改 owner、只靠前端隐藏但后端放行、管理员改角色后必须退出重登才生效、旧缓存覆盖云端新状态、QA/mock 身份影响正式用户、正式用户仍看到内部文案、被拒绝/停用用户还能读写业务资料、或缺少 fresh GUI/真机与云端 readback 证据，任一项存在都不得勾选。
- [x] 全系统角色功能入口自动隐藏与验收矩阵：
  - 需求目标：系统必须根据当前用户角色、登录状态、正式 OpenID、QA override 与白名单状态，自动隐藏该用户不能使用的功能入口。正式用户不得先看到不可用入口，再靠 toast、禁用按钮、错误页、未完成文案、`MVP`、`后续`、QA/local/test/Seed/mock 文案挡住。
  - 矩阵来源：角色功能规则参考既有 `ROLE_FEATURE_ACCESS_MATRIX.md`，不要新增第二份矩阵。若矩阵不足，更新既有矩阵或在程式修正说明中指出缺口；QA 验收仍回到 `QA/QA_BUG_REPORT_202607021815.md`，不要产生新的进度文件。
  - AGENT 修正规则：AGENT 直接依既有角色矩阵、本文 gate 与 BUG 单修正代码。若发现角色入口规则缺失，优先补既有矩阵或在修正说明中指出，不另开新文件，除非使用者明确要求。
  - 必盘点角色：未登录/游客、`guide`、`customer`、`owner`、`admin`、`provider`、QA override 下的各角色、正式 OpenID 下的各角色、owner/admin/provider 白名单命中与未命中状态。不能只测 guide/customer 后宣称全角色完成。
  - 必盘点范围：`app.json` 内全部 28 个 route、全部 tabBar/custom-tab-bar 入口、首页快捷入口、My 服务列表与 QA 工具、登录/设置入口、商品库新增/编辑/上下架/删除、团单新增/编辑/本团商品/客户入口/复制分享/导出、客户订单下单/声明付款/确认收款/取消/付款历史/凭证、资料中心、消息、聊天、发布、搜索、导游资料、客户资料、供应商资料、profile/tourGuide/provider 编辑页，以及所有列表项按钮、详情页按钮、空状态 CTA、分享路径、扫码/复制入口、返回后的 fallback 导航。
  - 可见规则：当前角色不能使用、不能保存、不能查看、未正式开放、仅 QA/开发用途、或需要白名单但当前用户未获授权的功能，正式用户界面必须隐藏入口。若业务上允许某角色只读，矩阵必须明确标成「可见但只读」，且页面不得显示任何写入、保存、确认、取消、导出、分享、编辑或管理按钮。
  - 直达 route 规则：用户通过 URL、分享路径、扫码、历史页面、fallback 导航或手动参数直达无权页面时，不能露出无权功能入口或内部开发说明；必须显示正式产品语言的安全空状态、返回上一页、或导向该角色可用页面，并保留可追溯错误处理。
  - 权限防线规则：前端隐藏只解决入口外露，不代表权限完成。service、repository、cloud function、云数据库访问边界必须继续做角色/owner/admin 白名单/订单归属/团单归属校验；AGENT 不得因为前端隐藏而移除或放宽后端权限判断。
  - QA 验收规则：QA 必须按矩阵逐角色验收，至少覆盖每个角色的登录后首屏、tab、首页快捷入口、My、核心列表页、核心详情页、直达 route、空状态 CTA、分享/扫码入口、返回 fallback。每个角色都要留下 fresh GUI/真机截图、操作记录或自动化 readback；只有代码静态检查、只看单一角色、只测可用入口、不测不可见入口，都不能算通过。矩阵缺项属于 AGENT 返工，不由 QA 自行猜测补齐。
  - 不得勾选条件：未参考既有 `ROLE_FEATURE_ACCESS_MATRIX.md`、既有矩阵缺角色、矩阵缺 route、矩阵缺按钮/CTA/分享/直达路径、正式用户仍看得到不可用入口、只能靠点击后报错阻挡、QA 工具外露给正式用户、内部文案外露、后端权限被放宽、或缺 fresh GUI/真机证据，任一项存在都不得勾选。
- [ ] 真实 workflow smoke：tab、带 id 详情、eventChannel picker、客户分享入口、列表卡片、空状态 CTA、返回 fallback 必须用真实入口验证。
- [ ] GUI layout/style 稳定性：资料中心、图示字体、固定 navbar、按钮/表单/弹窗/底部 tab 需完成全画面检查并无 console/style 阻塞。

## 不通過当前分类
- 仍有可开发修补的项目：优先继续补程式缺口；AGENT 不需在本文写进度，修完跑验证后交回 QA 复测。
- 只缺 GUI/真机证据的项目：不得打勾，必须保留在本节，直到有 DevTools/真机截图或操作记录。
- 目前仍不通過、需继续取得 GUI/真机证据、外部状态或修正的原子 BUG：以 `QA/QA_BUG_REPORT_202607021815.md` 的 `Status = 不通過` rows 为准；MVP 文件不复制 BUG row 清单。
- 2026-07-03 Phase 2-5 QA 已执行到当前环境可提供的证据范围；阻塞/Unable-to-test 不作为第三状态，仍视为 `不通過`，直到有命名修复 commit 与 fresh GUI/true-device evidence。

## 尚未开始或尚未正式化
这些是明确剩余 backlog。除非使用者指定对应阶段，否则不要开始。

- [x] 实作 Phase 3 local/QA 导游团单新增/编辑与本团商品保存闭环。
- [x] 实作 Phase 5 local/QA 客户下单与客户订单管理。
- [x] 实作 local/QA 收款状态确认与状态历史。
- [x] 完成 starter 页面全量删除或重写。
- [x] 部署并验证 `authLogin` 云函数可换取正式 OpenID。
- [ ] 执行并记录完整 29-route GUI smoke test。
- [x] 为 groupOrders/products/customerOrders/payments/paymentStatusHistory 建立 cloud repository 与云函数权限边界。
- [ ] 通过 Phase 8 真人可用 MVP gate。

## Phase 0 - 交接纪律
- [x] 项目文件已存在，并定义范围、规则、验收、任务与交接。
- [x] 默认验证命令已记录。
- [x] 禁止事项已记录。
- [x] 本轮文件已同步到当前真实状态。

## Phase 0.5-0.7 - Blocking Defect 修复
- [x] eventChannel opener/emit/navigation 失败防护。
- [x] 二维码为空或非法时不预览空图。
- [x] 客户订单 id 字符串/数字比对防护。
- [x] 商品库搜索与状态筛选路径一致。
- [x] message/chat socket null 防护。
- [x] 团单筛选后保留 `statusText`。
- [x] 需要 GUI 验证的剩余项目已移到 Phase 7，不再卡 Phase 0.5-0.7 静态修复完成度。

## Phase 1 - 资料层决策与模型
- [x] 资料层建议方案已记录。
- [x] 资料模型与权限边界初稿已记录。
- [x] `mock/qaSeed.ts` 已记录为 QA/test 资料来源。
- [x] 已明确规定页面不能直接散落读写 seed/storage/cloud/API，必须走 service/repository 边界。
- [x] 正式资料层、Cloud/API repository、正式持久化验证已移到 Phase 8 gate。

## Phase 2 - 登录与角色权限
- [x] Auth adapter / mock fallback 已存在。
- [x] 本地 profile 初始化已存在。
- [x] MVP 角色已定义：`guide`、`customer`、`owner/admin`；`provider` 已受限。
- [x] guide/customer/admin 本地可见范围已存在。
- [x] 主登录页已移除 starter 文案与无关登录入口。
- [x] owner/admin/provider 在 MVP 本地角色边界内受限，不作为完整后台开放。
- [x] QA/mock 身份切换辅助已实现，覆盖 `guide`、`customer`、`owner`、`admin`、`provider`，并明确标记为 `qaOverride`。
- [x] 真 OpenID、`authLogin`、云端 `users`、真实 session 验证已移到 Phase 8 gate。
- [x] 正式微信登录用户审核闸门：首次登录只能进入等待审核，必须由系统管理员明确通过并指派正式角色后，用户才能进入对应业务功能；已登录用户的审核状态/角色变更必须从云端刷新并即时影响前端入口与后端权限。
- [x] 未登录固定画面：没有正式 session / OpenID 的用户只能看到固定未登录画面与微信登录入口，不得看到完整业务 tab、下方选单、首页快捷入口或核心业务页面。
- [x] 待审核固定画面：已微信登录但 `pending_review` 的用户只能看到固定等待审核画面与刷新/联系管理员/退出入口，不得看到导游、客户、管理或资料中心业务入口。
- [x] owner/admin 初始来源已定义并验证：采用白名单或一次性初始化 owner；没有 owner/admin 前不得宣称审核流程完成。
- [x] 旧用户状态 migration 已定义：旧 `active` 与新 `approved` / `pending_review` 等状态的转换规则前后端一致，不再只判断 `active`。
- [x] customer 分享下单规则已定案：明确 customer 是否需人工审核；若采用受限 customer，分享路径、直达 route、重新开启后只能使用受限下单能力。
- [x] provider MVP 定位已定案：若暂不开放，审核入口不得指派 provider；若开放，必须先补齐 provider 角色矩阵与权限。

## Phase 3 - 导游团单工作流
- [x] 导游团单列表在 local/QA 模式下已有角色范围。
- [x] 团单列表已有搜索/筛选与无结果状态。
- [x] local/QA 团单详情可显示团单统计、二维码、客户订单。
- [x] local/QA 本团商品列表可显示团单商品。
- [x] local/QA 团单新增/编辑会保存。
- [x] local/QA 加入/移除本团商品会保存。
- [x] 团单详情改走 service/repository 边界，不直接依赖 `GroupOrderMock`。
- [x] 缺失或未授权团单显示安全错误/返回状态，并经过 repository/service 权限判断。
- [x] 完整导游流程在重新打开/重新载入后仍能保持 local/QA 资料。

## Phase 4 - 商品库
- [x] 商品列表在 local/QA 模式下已有角色范围。
- [x] 新增商品走 product service/repository 边界。
- [x] 商品包含名称、描述、图片、价格规则、状态、来源备注。
- [x] 价格规则计算数值总价，不只保存显示字串。
- [x] 上下架走 product service/repository 边界。
- [x] 软删除走 product service/repository 边界。
- [x] 搜索与状态筛选走同一条 service/repository 路径。
- [x] 必填验证、loading/submitting、成功、失败、空状态已存在。
- [x] Product repository 已用 local storage / QA seed fallback 完成本地保存边界。
- [x] 正式云端保存与 GUI 验证已移到 Phase 7/8 gate。

## Phase 5 - 客户下单与订单管理
- [x] 使用者已明确指定开始 Phase 5。
- [x] 客户入口已定义：route params `/pages/customerOrders/edit/index?groupOrderId=...`。
- [x] 客户可以查看本团商品与价格。
- [x] 客户可以选择商品和数量。
- [x] local/QA 客户订单创建已存在。
- [x] 导游可以查看自己管理团单下的客户订单。
- [x] 客户只能查看自己的订单。
- [x] 收款状态已存在：未付款、客户已付款、已确认、已取消。
- [x] 导游可以确认收款或取消订单。
- [x] 收款状态变化可追溯。
- [x] local/QA 客户下单/收款流程在重新打开/重新载入后仍能保持。
- [x] 正式云端保存与 GUI 验证已移到 Phase 7/8 gate。

## Phase 6 - UI 收敛
- [x] starter 页面已删除或重写：home、message、dataCenter、release、search、login、setting。
- [x] 可见导航只暴露 MVP 已就绪入口，或清楚标示未完成入口。
- [x] 主流程文案一致使用团单业务语境。
- [x] 表单都有验证与提交状态。
- [x] 列表都有 loading、空状态、错误状态、正常状态、无结果状态。
- [x] 未正式持久化的数据位置都有本地/QA/demo 模式提示。
- [x] profile、tourGuide、provider 资料页已从直接 seed 读取收敛到 repository 边界；可见编辑页有实际保存路径，不再只用未支持提示挡住。

## Phase 7 - GUI Smoke Test
- [x] 微信 DevTools 项目可通过 CLI 打开。
- [x] `app.json` 内 28 个 route 的 `.js/.ts`、`.wxml`、`.json` 文件静态存在检查通过。
- [x] 微信 DevTools `auto-replay --replay-all` 命令可完成。
- [x] 2026-07-02 细测 pre-flight 与 DevTools automation blocker 已有历史记录；后续 QA 结果统一写入 BUG 单。
- [x] 商品库主页面已有一张有效 DevTools 窗口截图：`QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/01_product_management.png`。
- [x] 「我的」页 QA Seed 身份切换面板已有一张有效 DevTools 窗口截图：`QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png`。
- [ ] Phase 0.5-0.7 eventChannel listener 成功路径已在微信 DevTools 验证。
- [ ] `app.json` 内所有 route 已在微信 DevTools 或真机打开。
- [ ] 底部 tab 状态已验证。
- [ ] toast/modal/floating button/tab 布局已验证。
- [ ] 表单输入、返回导航、重新进入已验证。
- [x] 历史结果曾写入 `ACCEPTANCE.md` 与 `HANDOFF.md`；后续 QA/AGENT 不再被要求更新额外文件。

## Phase 8 - 真人可用 MVP Gate
声明真人可用 MVP 前，以下项目必须全部成立：

- [x] 正式资料层已选择并实作。
- [x] 正式微信云开发环境/配置、云函数、集合、云函数权限边界已建立。
- [x] 既有 service/repository 后面已有 cloud/API repository 实作。
- [x] 正式登录/OpenID 与基础权限已验证。
- [x] 正式 `wx.login` -> OpenID 换取已验证。
- [x] `authLogin` 云函数已存在。
- [x] 云端 `users` profile 初始化已存在。
- [x] 云端 `users` profile 已支持管理员审核状态、正式角色、审核人、审核时间与最后更新时间；新 OpenID 默认 `pending_review`，不得默认获业务权限。
- [x] 管理员审核通过/拒绝/停用/改角色流程已实作，并能让已登录用户从云端刷新到最新状态与角色。
- [x] 未审核、拒绝、停用或角色不符的正式用户，在前端入口、service/repository、cloud function 与云数据库访问边界均被阻挡。
- [x] 未登录与待审核状态已完成固定规格画面和入口收敛：这两种状态都不得显示完整业务下方选单，且直达 route / 分享路径 / 返回 fallback 都必须回到对应安全状态画面。
- [x] 审核入口已具备具体规格与权限：owner/admin 可进入待审核列表，通过时必须选角色，拒绝/停用/改角色可操作，保存 `reviewStatus`、`role`、`reviewedBy`、`reviewedAt`、`updatedAt` 与可选 `reviewRemark`。
- [x] 审计与防自提权已完成：admin 不能把自己升成 owner、不能修改 owner、不能指派 owner；owner/admin 的审核与角色变更记录操作者、时间、前后状态。
- [x] 后端统一审核状态闸门已完成：业务云函数统一检查当前 OpenID 的云端 users profile；未审核、拒绝、停用、角色不符时拒绝新增商品、开团、下单、确认收款、取消订单、管理审核等操作。
- [x] 正式文案与 QA/mock 隔离已完成：审核状态页、拒绝页、停用页、无权页、空状态页不出现 QA/mock/Seed/MVP/未完成/OpenID 未验证等内部字样。
- [x] 导游核心工作流可持久化。
- [x] 商品库可持久化。
- [x] 客户下单与收款状态流程可持久化。
- [x] 正式云端 `products` 保存已存在。
- [x] 正式云端 `customerOrders` / `payments` / `paymentStatusHistory` 保存已存在。
- [x] 正式客户订单创建已存在。
- [x] 正式客户下单/收款流程在重新打开/重新载入后仍能保持。
- [ ] 29-route GUI smoke test 通过。
- [x] `npm run lint` 通过。
- [x] `git diff --check` 通过。
- [x] 没有把 mock/local fallback 包装成 production 行为。
- [x] 正式模式关闭 mock 开关，云登录失败时不再自动包装成 mock 身份。

### Phase 8 已完成但不代表 MVP gate 全部通过
- [x] 使用 DevTools CLI 找到微信云环境：`cloud1-3gwlqssy1f1972a9`。
- [x] 小程序端已调用 `wx.cloud.init({ env: cloud1-3gwlqssy1f1972a9 })`。
- [x] `AuthService` 已通过 `authLogin` 云函数取得正式 OpenID，并保留云不可用时的 mock fallback 标记。
- [x] `authLogin` 会初始化/读取 `users` profile；owner/admin 不能由前端自提权，需通过云函数环境变量 `OWNER_OPENIDS` / `ADMIN_OPENIDS` 白名单。
- [x] 云数据库业务集合与云函数权限边界已建立：`groupOrders`、`products`、`groupOrderProducts`、`customerOrders`、`payments`、`paymentStatusHistory`。
- [x] 正式云端覆盖登录/users 初始化、商品、团单、客户订单、收款状态与付款状态历史。
- [ ] 尚未完成 29-route GUI smoke test，因此不能声明整个真人可用 MVP gate 全部通过。
