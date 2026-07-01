# HANDOFF

## Last Updated
- 2026-07-02

## 项目状态
- 路径：`/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- 分支：`codex`
- 本轮未启动微信开发者工具 GUI。
- 本轮未联网、未安装套件、未部署、未推送远端。
- `resume/preview-info.json` 和 `resume/preview-qr.png` 已在仓库中存在；不要修改或重新提交相关 preview 产物，除非使用者明确要求。
- 已接入 auth adapter / mock fallback 边界；正式 OpenID 换取仍未验证，因为未启动微信 DevTools、未配置/执行云函数 `authLogin`。
- 本轮未接正式数据库、未创建云开发集合/云函数、未接后端 API。

## 本轮决策
- 产品定位固定为中国境内导游/领队开团管理小程序。
- 核心名词统一为「开团/团单」。
- QA seed 采用集中式 `mock/qaSeed.ts`，通过 `wx` storage 展示和重置。
- 本轮不做正式云端保存；本地/QA 操作必须清楚提示「本地/QA 展示模式，尚未正式保存」或等价语义。
- 不存在的详情路由先改为弹窗或 toast，避免 QA 点击爆掉。
- 供应商和系统管理员先提供展示资料和未完成功能提示，权限模型待确认。
- Phase 1 设计建议记录在 `DATA_LAYER_DECISION.md`：MVP 建议优先采用微信云开发数据库 + 云函数，但必须先建立资料存取层接口，等待使用者确认后才能实现。
- 资料模型与权限边界记录在 `DATA_MODEL_AND_PERMISSIONS.md`：`mock/qaSeed.ts` 只能作为测试资料来源，不可作为正式操作唯一资料来源。
- 正式资料层方向仍是建议方案，待使用者确认：MVP 建议优先采用微信云开发数据库 + 云函数；页面必须通过 service/repository 边界接入，保留未来切换明确后端 API 的可能。
- Phase 2 auth 采用 adapter 设计：优先 `wx.login` + 云函数 `authLogin`，未配置云环境时使用明确标记的 `mock-auth-adapter`，不得把 fallback 写成正式 OpenID。

## 2026-07-02 Phase 0.7 稽核回修
- `pages/message/index.js` 已补 socket null 防护：`app.globalData.socket` 缺失时不注册 `socket.onMessage`，显示「聊天能力暂未启用」。
- `pages/chat/index.js` 已补 socket null 防护：发送前检查 `socket.send`，聊天能力未启用时显示「聊天能力暂未启用」。
- `pages/groupOrder/index.ts` 已修正筛选后 `statusText` 遗失：列表加载和筛选共用 `normalizeGroupOrders()`。
- 文件已把正式资料层相关描述全部校正为「建议方案，待使用者确认」，不得写成已拍板。
- Phase 2 已校正为 auth adapter / mock fallback / role scope 已完成；正式 OpenID、`authLogin` 云函数、云端 `users` 集合仍未验证或未建立。

## 2026-07-02 Phase 4 商品库
- `repositories/productRepository.js`：商品列表、新增、状态更新、软删除统一走 repository；当前保存到 local storage `dao_you_ling_local_products`，未接云端。
- `services/product/productService.js`：集中处理必填验证、阶梯价 `totalPrice = minQuantity * unitPrice`、价格显示、创建、上下架、软删除。
- `pages/productManagement/index`：按当前角色读取可用商品，展示 role scope 和「本地/QA 展示模式，尚未正式保存」；搜索、状态筛选、上下架、软删除都走 `ProductService`。
- `sub-pages/product/add/index`：新增商品表单包含名称、描述、图片、价格规则、状态、供应来源或备注；保存走 `ProductService.create()`。
- 本轮没有做 Phase 5：未新增客户下单、客户订单正式流程或收款确认闭环。

## 2026-07-02 文件治理与复查
- `CURRENT_TASKS.md` 已改为唯一当前任务入口，只保留当前状态、接手动作、后续候选任务和禁止事项。
- 历史完成记录和验证细节统一放在 `HANDOFF.md`；总 MVP 勾选统一放在 `MVP_COMPLETION_CHECKLIST.md`；验收矩阵统一放在 `ACCEPTANCE.md`。
- 不再使用多个并列的任务标题来管理状态；当前任务只由 `CURRENT_TASKS.md` 顶层状态说明。
- 复查 Phase 4 商品库代码：列表、新增、搜索/状态筛选、上下架、软删除仍走 `ProductService` / `ProductRepository`；软删除会写入 `deletedAt`，role scope 会排除已删除商品。
- 复查未发现商品库范围内新增 Phase 5 客户下单、正式客户订单流程或收款确认闭环。
- 复查结果仍不能替代微信 DevTools GUI 验证；商品新增、上下架、软删除、返回刷新和视觉状态仍需后续 GUI smoke test。

## 2026-07-02 稽核追加
- `Phase 0.6 - 稽核追加修正` 已完成代码修补：
  - `pages/message/index.js` 聊天入口 URL 已改为 `/pages/chat/index?userId=...`。
  - `getUserById` 找不到 user/index 时安全返回并提示，不再继续操作缺失资料。
  - `currentUser.eventChannel.emit('update', user)` 与聊天页打开后的 `eventChannel.emit('update', user)` 已统一走 `safeEmitChatUpdate`，防护 eventChannel 缺失与 emit 抛错。
- eventChannel「没有 listener」不能仅靠静态检查宣称完成；当前只能写成已防护没有 opener、emit 抛错、navigateBack 失败。父页 listener/回传资料成功仍需微信 DevTools GUI 验证。

## 本轮修改文件
- `MVP_COMPLETION_CHECKLIST.md`
- `ACCEPTANCE.md`
- `CURRENT_TASKS.md`
- `HANDOFF.md`
- `DATA_LAYER_DECISION.md`
- `config.js`
- `mock/qaSeed.ts`
- `services/auth/authService.js`
- `services/auth/roleScope.js`
- `repositories/groupOrderRepository.js`
- `repositories/customerOrderRepository.js`
- `pages/login/login.js`
- `pages/login/login.wxml`
- `pages/login/login.less`
- `pages/loginCode/loginCode.js`
- `pages/loginCode/loginCode.wxml`
- `pages/my/index.js`
- `pages/my/index.wxml`
- `pages/my/index.less`
- `pages/groupOrder/index.ts`
- `pages/groupOrder/index.wxml`
- `pages/groupOrder/index.less`
- `pages/customerOrders/index.js`
- `pages/customerOrders/index.wxml`
- `pages/customerOrders/index.less`
- `pages/providers/index.js`
- `pages/providers/index.wxml`
- `models/Product.ts`
- `repositories/productRepository.js`
- `services/product/productService.js`
- `pages/productManagement/index.ts`
- `pages/productManagement/index.wxml`
- `pages/productManagement/index.less`
- `sub-pages/product/add/index.ts`
- `sub-pages/product/add/index.wxml`
- `sub-pages/product/add/index.less`
- `pages/message/index.js`
- `pages/chat/index.js`

## Phase 0.5/0.6 历史修改文件
- `DATA_MODEL_AND_PERMISSIONS.md`
- `pages/message/index.js`
- `pages/chat/index.js`
- `pages/customerOrders/index.js`
- `pages/productManagement/index.ts`
- `sub-pages/groupOrder/detail/index.ts`
- `sub-pages/groupOrder/product-picker/index.ts`
- `sub-pages/product/add/index.ts`

## 上一轮已存在的修改记录
- `README.md`
- `QA_SEED_REQUIREMENTS.md`
- `codex-agent-report.md`
- `mock/qaSeed.ts`
- `mock/groupOrder/index.ts`
- `mock/product/index.ts`
- `enum/GroupOrderStatus.ts`
- `enum/MemberOrderStatus.ts`
- `enum/ProductStatus.ts`
- `config.js`
- `custom-tab-bar/index.js`
- `utils/utils.wxs`
- `pages/groupOrder/*`
- `sub-pages/groupOrder/*`
- `pages/productManagement/*`
- `sub-pages/product/*`
- `pages/customerOrders/*`
- `pages/providers/*`
- `pages/tourGuides/*`
- `pages/profile/*`
- `pages/my/*`
- `pages/search/index.js`
- `pages/home/index.js`
- `components/nav/index.js`

## 验证结果
- `git status --short --branch`：本轮开始已检查。
- 指定 commit `230c9b5 Fix message chat event channel audit issues`：已确认存在且为本轮开始时 HEAD。
- 最终 `git status --short --branch`：`## codex...origin/codex [ahead 5]`，无未提交文件。
- Phase 0.7 + Phase 4 最终 `git status --short --branch`：`## codex...origin/codex [ahead 8]`，无未提交文件。
- `npm run lint`：通过。
- `git diff --check`：通过。
- Phase 2 role scope 本地验证：guide 团单 `1,2`、guide 订单 `5001,5002,5004`；customer 团单 `1`、customer 订单 `5001`。
- 静态验证：
  - `services/auth/authService.js` 会调用 `wx.login`，云环境/云函数未配置时返回 `mock-auth-adapter` session，并标记 `isMockOpenId`。
  - `pages/login/login` 已移除 TDsign、QQ、企微、密码/短信等 starter 登录入口。
  - `pages/my/index` 从 `AuthService` 读取 profile/session，不再直接把 QA seed owner 当真人登录资料。
  - `pages/groupOrder/index` 与 `pages/customerOrders/index` 通过 repository 按 role scope 过滤资料。
  - `rg "getOpenerEventChannel|selectedProducts|refreshList"` 确认主要 opener eventChannel 使用点已防护；`pages/chat/index.js` 也补了直接进页防护。
  - `sub-pages/groupOrder/detail/index.ts` 已先判断 `qrCodeUrl` 非空且为可预览路径，再调用 `wx.previewImage`。
  - `pages/customerOrders/index.js` 已用 `String(order.id) === String(dataset.id)` 查找订单。
  - `pages/productManagement/index.ts` 已将搜索、状态筛选、上下架、删除统一收敛到 `updateLocalData` / `applyProductFilters`。
  - `pages/message/index.js` 已通过静态检查确认没有 `?userId${userId}`，并防护 `getUserById` 找不到 user/index、eventChannel 缺失、emit 抛错。
- `Phase 0.6` 验证：
  - `npm run lint`：通过。
  - `git diff --check`：通过。
  - `git status --short --branch`：提交前为 `## codex...origin/codex [ahead 2]`，仅有 `ACCEPTANCE.md`、`CURRENT_TASKS.md`、`HANDOFF.md`、`MVP_COMPLETION_CHECKLIST.md`、`pages/message/index.js` 修改；未包含 `resume/preview-*`。
- `Phase 0.7` 静态验证：
  - `pages/message/index.js` 不再在 module scope 固定解构 `socket`，并在 socket 缺失时安全返回。
  - `pages/chat/index.js` 发送消息前检查 `app.globalData.socket.send`。
  - `pages/groupOrder/index.ts` 的 `applyFilters()` 会调用 `normalizeGroupOrders()` 补齐 `statusText`。
  - `rg "使用者已确认|使用者確認|正式资料层方向|正式資料層方向"` 用于复查文件，已保留为待确认语境。
- `Phase 4` 静态验证：
  - `rg "ProductService|ProductRepository|ProductMock|QaSeedMock|updateLocalData|applyProductFilters|softDelete|toggleStatus|create\\(" pages/productManagement sub-pages/product/add services/product repositories/productRepository.js -n`：确认商品库列表/新增页走 `ProductService`，QA seed 只在 repository 边界内作为 fallback。
  - `rg "Phase 5|customerOrder|客户下单|收款确认|确认收款|payment" pages/productManagement sub-pages/product/add services/product repositories/productRepository.js -n`：无命中，确认未碰 Phase 5。
  - `npm run lint`：通过。
  - `git diff --check`：通过。

## 未完成
- 正式 OpenID 换取未验证：未启动微信 DevTools，未配置/执行云函数 `authLogin`。
- 云数据库 `users` 集合、云函数、安全规则与云端 profile 初始化未创建。
- auth 当前使用本地 storage 保存 profile/session；这是 Phase 2 adapter fallback，不是正式云端资料层闭环。
- eventChannel listener 成功回传尚未 GUI 验证，不可写成完全完成。
- 未做微信 DevTools GUI 验证。
- 正式资料层方向仍待使用者确认；不得直接创建云资源或写成已拍板。
- QA seed 尚未正式持久化业务操作。
- 角色权限、供应商管理、系统管理员功能仍待产品确认。
- 旧模板页面 home/message/dataCenter/release/search/login/setting 仍需逐步产品化。
- Phase 3/4/5 正式团单、商品保存、客户下单闭环未展开。
- Phase 4 商品库正式云端保存未实现；当前只是 local/QA repository。
- Phase 4 未做微信 DevTools GUI 验证；新增商品、上下架、软删除未在 GUI 点击验证。
- Phase 5 完全未做。
- `CURRENT_TASKS.md` 当前没有新开发任务；下一位 agent 必须等待使用者明确指定范围，不得自行从候选任务展开。

## 下一位 agent 接法
1. 先读 `MVP_COMPLETION_CHECKLIST.md`、`PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`，不要依赖聊天记忆。
2. 读 `DATA_LAYER_DECISION.md` 与 `DATA_MODEL_AND_PERMISSIONS.md`，确认资料层建议和权限边界。
3. 不要重开 DevTools；如需 GUI 测试，连接既有 DevTools 环境。
4. 先跑 `git status --short --branch`、`npm run lint` 和 `git diff --check`。
5. 下一步先确认正式资料层方向；若确认采用微信云开发，再配置 `authLogin` 云函数，用真实 `wx.login` code 换取 OpenID，并把 profile 初始化接到云端 `users` 集合。
6. 若继续商品库，先确认正式资料层方向；确认后再把 `ProductRepository` 切到 cloud repository，不要把 local/QA 保存写成正式保存。
7. 正式 OpenID 验证完成后，再进入 Phase 3/5；不要把本地 `mock-auth-adapter` 当成真人登录完成。
8. GUI 测试需等使用者明确指定后再做；路线按 `QA_SEED_REQUIREMENTS.md` 与 `ACCEPTANCE.md` 执行，重点验证登录 -> 我的页 profile -> 商品库新增/筛选/上下架/软删除。
