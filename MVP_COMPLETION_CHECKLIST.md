# MVP_COMPLETION_CHECKLIST

## 文件用途
本文件是从当前 QA/demo 小程序推进到真人可用 MVP 的总路线图，也是 MVP gate / backlog / 产品完成度参考文件。

本文件不得变成 QA 或 AGENT 的日常产出要求。QA 只在 `QA/QA_BUG_REPORT_202607021815.md` 报问题、写证据、写复测状态；AGENT 只负责修正产品代码并运行验证。除非使用者明确要求，QA/AGENT 不新增、不维护额外计划、结果、交接、矩阵或进度文件。

`QA/QA_BUG_REPORT_202607021815.md` 只作为 BUG report / retest ledger：记录可单独验收的问题、证据、复测结果、Status、Suspected Area、Next Action。

强制职责边界：

- `MVP_COMPLETION_CHECKLIST.md` 只管理 MVP gate、阶段、产品完成度、剩余能力类别和验收门槛；它不是 QA/AGENT 的日常回报文件。
- `QA/QA_BUG_REPORT_202607021815.md` 只管理原子化 BUG / GUI issue / retest row。
- 禁止把 BUG row、BUG ID 清单、GUI 子项清单、逐页缺陷清单复制到本文；这会制造第二份 BUG 单，后续状态必然分裂。
- 如果 BUG 单发现某类问题会影响 MVP，QA 仍只更新 BUG 单；MVP gate 是否调整由负责整理项目状态的人处理，不能要求 QA 或 AGENT 另写文件。
- 如果本文出现 `BUG-00X-*`、`GUI-00X-*` 这类原子 BUG 清单，后续整理时应移回 BUG 单，并把本文改回 gate 级描述。
- AGENT 修 BUG 时看 BUG 单的原子 row；判断 MVP 是否可宣告时看本文的 gate 是否全部有证据。两个文件互相引用，但不得互相复制内容。

QA/AGENT 分工必须保持分离：QA 只在 BUG 单记录问题、证据、复测状态；AGENT/开发只修产品代码并运行验证。项目流程不再要求 QA 做环境建立/同步/清理，也不要求 QA/AGENT 产出额外 docs。节奏是：修正 -> 验证 -> QA 复测；仍不通过就继续回到 BUG 单，再修一次。

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
- 2026-07-03 Phase 2-5 full-system QA attempt 的有效问题与证据以后统一沉淀在 `QA/QA_BUG_REPORT_202607021815.md`；27 routes、5 roles、14 feature groups 均在 scope 内，目前 0 route / 0 role 取得完整 formal full-screen pass evidence，full-system gate 仍为 `不通過`。

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

- [ ] Phase 7 GUI smoke test：DevTools 项目可打开，27 route 静态存在检查通过；targeted automation 曾可用于登录/业务 flow，但完整逐页点击、返回、表单、角色、权限、copy、console/network、empty/error/loading 状态仍未完整验证。
- [ ] 真图片与付款凭证 GUI/真机验证：需要实际 media picker、保存、重开后仍显示的证据。
- [ ] 正式/QA 文案与内部测试工具隔离：正式角色不得看到 QA/local/test/Seed/mock/OpenID 未验证/MVP/后续/未完成等内部或开发进度文字。
- [ ] 付款闭环 GUI 验证：客户声明付款、导游确认收款、付款历史、付款凭证必须分别有 GUI 证据。
- [ ] 全系统角色功能入口自动隐藏与验收矩阵：
  - 需求目标：系统必须根据当前用户角色、登录状态、正式 OpenID、QA override 与白名单状态，自动隐藏该用户不能使用的功能入口。正式用户不得先看到不可用入口，再靠 toast、禁用按钮、错误页、未完成文案、`MVP`、`后续`、QA/local/test/Seed/mock 文案挡住。
  - AGENT 修正规则：AGENT 不需要另产出矩阵或文件；直接依现有角色/功能参考与 BUG 单修正代码。若发现角色入口规则缺失，AGENT 在修正说明中指出，不另开新文件，除非使用者明确要求。
  - 必盘点角色：未登录/游客、`guide`、`customer`、`owner`、`admin`、`provider`、QA override 下的各角色、正式 OpenID 下的各角色、owner/admin/provider 白名单命中与未命中状态。不能只测 guide/customer 后宣称全角色完成。
  - 必盘点范围：`app.json` 内全部 27 个 route、全部 tabBar/custom-tab-bar 入口、首页快捷入口、My 服务列表与 QA 工具、登录/设置入口、商品库新增/编辑/上下架/删除、团单新增/编辑/本团商品/客户入口/复制分享/导出、客户订单下单/声明付款/确认收款/取消/付款历史/凭证、资料中心、消息、聊天、发布、搜索、导游资料、客户资料、供应商资料、profile/tourGuide/provider 编辑页，以及所有列表项按钮、详情页按钮、空状态 CTA、分享路径、扫码/复制入口、返回后的 fallback 导航。
  - 可见规则：当前角色不能使用、不能保存、不能查看、未正式开放、仅 QA/开发用途、或需要白名单但当前用户未获授权的功能，正式用户界面必须隐藏入口。若业务上允许某角色只读，矩阵必须明确标成「可见但只读」，且页面不得显示任何写入、保存、确认、取消、导出、分享、编辑或管理按钮。
  - 直达 route 规则：用户通过 URL、分享路径、扫码、历史页面、fallback 导航或手动参数直达无权页面时，不能露出无权功能入口或内部开发说明；必须显示正式产品语言的安全空状态、返回上一页、或导向该角色可用页面，并保留可追溯错误处理。
  - 权限防线规则：前端隐藏只解决入口外露，不代表权限完成。service、repository、cloud function、云数据库访问边界必须继续做角色/owner/admin 白名单/订单归属/团单归属校验；AGENT 不得因为前端隐藏而移除或放宽后端权限判断。
  - QA 验收规则：QA 必须按矩阵逐角色验收，至少覆盖每个角色的登录后首屏、tab、首页快捷入口、My、核心列表页、核心详情页、直达 route、空状态 CTA、分享/扫码入口、返回 fallback。每个角色都要留下 fresh GUI/真机截图、操作记录或自动化 readback；只有代码静态检查、只看单一角色、只测可用入口、不测不可见入口，都不能算通过。矩阵缺项属于 AGENT 返工，不由 QA 自行猜测补齐。
  - 不得勾选条件：没有矩阵位置、没有矩阵、矩阵缺角色、矩阵缺 route、矩阵缺按钮/CTA/分享/直达路径、正式用户仍看得到不可用入口、只能靠点击后报错阻挡、QA 工具外露给正式用户、内部文案外露、后端权限被放宽、或缺 fresh GUI/真机证据，任一项存在都不得勾选。
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
- [ ] 执行并记录完整 27-route GUI smoke test。
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
- [x] `app.json` 内 27 个 route 的 `.js/.ts`、`.wxml`、`.json` 文件静态存在检查通过。
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
- [x] 导游核心工作流可持久化。
- [x] 商品库可持久化。
- [x] 客户下单与收款状态流程可持久化。
- [x] 正式云端 `products` 保存已存在。
- [x] 正式云端 `customerOrders` / `payments` / `paymentStatusHistory` 保存已存在。
- [x] 正式客户订单创建已存在。
- [x] 正式客户下单/收款流程在重新打开/重新载入后仍能保持。
- [ ] 27-route GUI smoke test 通过。
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
- [ ] 尚未完成 27-route GUI smoke test，因此不能声明整个真人可用 MVP gate 全部通过。
