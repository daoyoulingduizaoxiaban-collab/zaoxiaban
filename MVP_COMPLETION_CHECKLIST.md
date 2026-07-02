# MVP_COMPLETION_CHECKLIST

## 文件用途
本文件是从当前 QA/demo 小程序推进到真人可用 MVP 的总路线图。它不是当前执行任务单。

下一位 agent 要先看 `CURRENT_TASKS.md`，确认本轮使用者指定范围后，再回到本文件对照阶段与勾选状态。

本文件是已完成项、半成品、未完成项的主清单。不要把 MVP backlog 分散到 `CURRENT_TASKS.md`。

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
- 2026-07-02 细测尝试已记录到 `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`；现有 DevTools 进程可见，但 automation websocket 未能连接。本轮仅新增商品库主页面与「我的」页 QA Seed 面板有效 GUI 截图，不能代表完整 workflow smoke 通过。

## 勾选规则
- 只有已经实作且有验证信号的项目才能打勾。
- local/mock/QA 实作不等于正式云端保存。
- 静态检查不等于 GUI 验证。
- 后面阶段局部完成，不代表前面正式化缺口已经完成。
- 如果项目只做了一半，正式项保持未勾，并新增后续补完项。
- 未完成 backlog 必须留在本文件，不要移到 `CURRENT_TASKS.md`。
- Phase 1-5 先记录当前 local/QA MVP 功能完成度；正式云端、真 OpenID、GUI 验证统一放在 Phase 7/8 gate，不混在前置 Phase 里。

## 已做一半，后续要补完
这些项目已有 local/QA 或设计基础，但还不能算真人可用 MVP 完成。

- [ ] Phase 7 GUI smoke test：DevTools 项目可打开，27 route 静态存在检查通过；targeted automation 曾可用于登录/业务 flow，但 2026-07-02 细测时 automation websocket 不可连接。目前只有商品库主页面与 My/QA Seed 面板截图，逐页点击/返回/表单仍未完整验证。

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

## Phase 7 - GUI Smoke Test
- [x] 微信 DevTools 项目可通过 CLI 打开。
- [x] `app.json` 内 27 个 route 的 `.js/.ts`、`.wxml`、`.json` 文件静态存在检查通过。
- [x] 微信 DevTools `auto-replay --replay-all` 命令可完成。
- [x] 2026-07-02 细测 pre-flight 与 DevTools automation blocker 已写入 `QA/QA_DETAILED_RETEST_RESULTS_20260702.md`。
- [x] 商品库主页面已有一张有效 DevTools 窗口截图：`QA/screenshots/2026-07-02-detailed-retest/manual-gui-smoke/01_product_management.png`。
- [x] 「我的」页 QA Seed 身份切换面板已有一张有效 DevTools 窗口截图：`QA/screenshots/2026-07-02-detailed-retest/role-scope/01_my_qa_seed_role_panel.png`。
- [ ] Phase 0.5-0.7 eventChannel listener 成功路径已在微信 DevTools 验证。
- [ ] `app.json` 内所有 route 已在微信 DevTools 或真机打开。
- [ ] 底部 tab 状态已验证。
- [ ] toast/modal/floating button/tab 布局已验证。
- [ ] 表单输入、返回导航、重新进入已验证。
- [x] 结果已写入 `ACCEPTANCE.md` 与 `HANDOFF.md`。

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

### Phase 8 已完成但不代表 MVP gate 全部通过
- [x] 使用 DevTools CLI 找到微信云环境：`cloud1-3gwlqssy1f1972a9`。
- [x] 小程序端已调用 `wx.cloud.init({ env: cloud1-3gwlqssy1f1972a9 })`。
- [x] `AuthService` 已通过 `authLogin` 云函数取得正式 OpenID，并保留云不可用时的 mock fallback 标记。
- [x] `authLogin` 会初始化/读取 `users` profile；owner/admin 不能由前端自提权，需通过云函数环境变量 `OWNER_OPENIDS` / `ADMIN_OPENIDS` 白名单。
- [x] 云数据库业务集合与云函数权限边界已建立：`groupOrders`、`products`、`groupOrderProducts`、`customerOrders`、`payments`、`paymentStatusHistory`。
- [x] 正式云端覆盖登录/users 初始化、商品、团单、客户订单、收款状态与付款状态历史。
- [ ] 尚未完成 27-route GUI smoke test，因此不能声明整个真人可用 MVP gate 全部通过。
