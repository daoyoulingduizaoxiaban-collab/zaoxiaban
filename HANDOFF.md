# HANDOFF

## Last Updated
- 2026-07-02

## 项目状态
- 路径：`/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- 分支：`codex`
- 本轮未启动微信开发者工具 GUI。
- 本轮未联网、未安装套件、未部署、未推送远端。
- `resume/preview-info.json` 和 `resume/preview-qr.png` 仍是未跟踪文件，不要纳入提交，除非使用者明确要求。
- 本轮已接入 `wx.login` 调用与 auth adapter；正式 OpenID 换取仍未验证，因为未启动微信 DevTools、未配置/执行云函数 `authLogin`。
- 本轮未接正式数据库、未创建云开发集合/云函数、未接后端 API。

## 本轮决策
- 产品定位固定为中国境内导游/领队开团管理小程序。
- 核心名词统一为「开团/团单」。
- QA seed 采用集中式 `mock/qaSeed.ts`，通过 `wx` storage 展示和重置。
- 本轮不强做正式保存；操作类功能统一提示「QA 展示模式，暂未保存」。
- 不存在的详情路由先改为弹窗或 toast，避免 QA 点击爆掉。
- 供应商和系统管理员先提供展示资料和未完成功能提示，权限模型待确认。
- Phase 1 设计建议记录在 `DATA_LAYER_DECISION.md`：MVP 建议优先采用微信云开发数据库 + 云函数，但必须先建立资料存取层接口，等待使用者确认后才能实现。
- 资料模型与权限边界记录在 `DATA_MODEL_AND_PERMISSIONS.md`：`mock/qaSeed.ts` 只能作为测试资料来源，不可作为正式操作唯一资料来源。
- 2026-07-02 使用者已确认资料层方向：MVP 优先采用微信云开发数据库 + 云函数；页面必须通过 service/repository 边界接入，保留未来切换明确后端 API 的可能。
- Phase 2 auth 采用 adapter 设计：优先 `wx.login` + 云函数 `authLogin`，未配置云环境时使用明确标记的 `mock-auth-adapter`，不得把 fallback 写成正式 OpenID。

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

## 未完成
- 正式 OpenID 换取未验证：未启动微信 DevTools，未配置/执行云函数 `authLogin`。
- 云数据库 `users` 集合、云函数、安全规则与云端 profile 初始化未创建。
- auth 当前使用本地 storage 保存 profile/session；这是 Phase 2 adapter fallback，不是正式云端资料层闭环。
- eventChannel listener 成功回传尚未 GUI 验证，不可写成完全完成。
- 未做微信 DevTools GUI 验证。
- QA seed 尚未正式持久化业务操作。
- 角色权限、供应商管理、系统管理员功能仍待产品确认。
- 旧模板页面 home/message/dataCenter/release/search/login/setting 仍需逐步产品化。
- Phase 3/4/5 正式团单、商品保存、客户下单闭环未展开。

## 下一位 agent 接法
1. 先读 `MVP_COMPLETION_CHECKLIST.md`、`PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`，不要依赖聊天记忆。
2. 读 `DATA_LAYER_DECISION.md` 与 `DATA_MODEL_AND_PERMISSIONS.md`，确认资料层建议和权限边界。
3. 不要重开 DevTools；如需 GUI 测试，连接既有 DevTools 环境。
4. 先跑 `git status --short --branch`、`npm run lint` 和 `git diff --check`。
5. 下一步优先配置微信云开发与 `authLogin` 云函数，用真实 `wx.login` code 换取 OpenID，并把 profile 初始化接到云端 `users` 集合。
6. 正式 OpenID 验证完成后，再进入 Phase 3/4/5；不要把本地 `mock-auth-adapter` 当成真人登录完成。
7. GUI 测试仍按 `CURRENT_TASKS.md` 的 27 route 清单逐页打开，重点验证登录 -> 我的页 profile -> 团单/客户订单 role scope。
