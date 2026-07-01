# HANDOFF

## Last Updated
- 2026-07-02

## 项目状态
- 路径：`/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- 分支：`codex`
- 本轮未启动微信开发者工具 GUI。
- 本轮未联网、未安装套件、未部署、未推送远端。
- `resume/preview-info.json` 和 `resume/preview-qr.png` 仍是未跟踪文件，不要纳入提交，除非使用者明确要求。
- 本轮仍未接正式数据库、云开发、云函数、后端 API、微信登录或 OpenID。

## 本轮决策
- 产品定位固定为中国境内导游/领队开团管理小程序。
- 核心名词统一为「开团/团单」。
- QA seed 采用集中式 `mock/qaSeed.ts`，通过 `wx` storage 展示和重置。
- 本轮不强做正式保存；操作类功能统一提示「QA 展示模式，暂未保存」。
- 不存在的详情路由先改为弹窗或 toast，避免 QA 点击爆掉。
- 供应商和系统管理员先提供展示资料和未完成功能提示，权限模型待确认。
- Phase 1 设计建议记录在 `DATA_LAYER_DECISION.md`：MVP 建议优先采用微信云开发数据库 + 云函数，但必须先建立资料存取层接口，等待使用者确认后才能实现。
- 资料模型与权限边界记录在 `DATA_MODEL_AND_PERMISSIONS.md`：`mock/qaSeed.ts` 只能作为测试资料来源，不可作为正式操作唯一资料来源。

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
- `npm run lint`：通过。
- `git diff --check`：通过。
- 静态验证：
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
- eventChannel listener 成功回传尚未 GUI 验证，不可写成完全完成。
- 未做微信 DevTools GUI 验证。
- QA seed 尚未正式持久化业务操作。
- 角色权限、供应商管理、系统管理员功能仍待产品确认。
- 旧模板页面 home/message/dataCenter/release/search/login/setting 仍需逐步产品化。
- 未实现正式资料层；`DATA_LAYER_DECISION.md` 需要使用者确认后才能进入资料存取层和云开发/API 实作。
- 未实现微信登录/OpenID；Phase 2 不在本轮范围。

## 下一位 agent 接法
1. 先读 `MVP_COMPLETION_CHECKLIST.md`、`PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`，不要依赖聊天记忆。
2. 读 `DATA_LAYER_DECISION.md` 与 `DATA_MODEL_AND_PERMISSIONS.md`，确认资料层建议和权限边界。
3. 不要重开 DevTools；如需 GUI 测试，连接既有 DevTools 环境。
4. 先跑 `git status --short --branch`、`npm run lint` 和 `git diff --check`。
5. 等使用者确认资料层方向后，再做资料存取层/云开发/API；不要提前做 Phase 2 登录。
6. GUI 测试仍按 `CURRENT_TASKS.md` 的 27 route 清单逐页打开，重点验证团单主流程：列表 -> 详情 -> 本团商品 -> 商品库选择 -> 加入 -> 返回。
