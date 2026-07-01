# CURRENT_TASKS

## 本轮任务 - Phase 0/0.5/1
- Phase 0：按 `MVP_COMPLETION_CHECKLIST.md` 恢复上下文，执行 `git status --short --branch`，确认本轮任务边界，不启动微信 DevTools、不联网、不部署、不推送、不提交 `resume/preview-*`。
- Phase 0.5：修正 blocking defects：eventChannel 缺 opener/listener 防护、团单二维码空值防护、客户订单 id 字符串/数字比对、商品库搜索与状态筛选一致性。
- Phase 1：只做正式资料层方案比较、资料模型与权限边界文件，不接正式数据库、云函数或后端 API。
- 文档回写：更新 `MVP_COMPLETION_CHECKLIST.md`、`CURRENT_TASKS.md`、`HANDOFF.md`，新增或更新资料层设计文件。
- 验证：必须执行 `npm run lint`、`git diff --check`、`git status --short --branch`，静态检查 blocking defects 修复路径；不声称微信 DevTools GUI 验证。

## 本轮完成
- Phase 0 已完成：已重新读取 MVP/checklist/rules/tasks/acceptance/handoff/QA seed 文件，执行 `git status --short --branch`，并先补入本轮任务边界。
- Phase 0.5 blocking defects 已修正：
  - `sub-pages/groupOrder/product-picker/index.ts`：新增 eventChannel 防护、emit 失败提示、navigateBack 失败提示；直接进页不会因没有 opener 崩溃。
  - `sub-pages/product/add/index.ts`：新增 eventChannel 防护、emit 失败提示、navigateBack 失败提示；直接进页会提示从商品库进入。
  - `pages/chat/index.js`：补上 opener eventChannel 防护，避免直接进聊天页崩溃。
  - `sub-pages/groupOrder/detail/index.ts`：二维码为空或非法时显示「暂无团单二维码」，不调用 `wx.previewImage` 预览空字串。
  - `pages/customerOrders/index.js`：订单 id 查找统一转为字串比对。
  - `pages/productManagement/index.ts`：搜索、状态筛选、上下架、删除统一走 `updateLocalData` / `applyProductFilters`。
- Phase 1 设计文件已完成：
  - `DATA_LAYER_DECISION.md`：比较微信云开发数据库与明确后端 API，并建议 MVP 先采用微信云开发数据库 + 云函数，但需以资料存取层隔离。
  - `DATA_MODEL_AND_PERMISSIONS.md`：定义 users、groupOrders、products、groupOrderProducts、customerOrders、payments、paymentStatusHistory 初稿与 owner/guide/customer/provider/admin 权限边界。
- Phase 0.6 稽核追加已修正：
  - `pages/message/index.js` 聊天入口 URL 已改为 `/pages/chat/index?userId=...`。
  - `getUserById` 找不到 user/index 时会安全返回并提示，不再继续 `splice`、`messages` 或 emit。
  - `currentUser.eventChannel.emit('update', user)` 与聊天页打开后的 `eventChannel.emit('update', user)` 已统一走 `safeEmitChatUpdate`，防护 eventChannel 缺失与 emit 抛错。
  - 静态检查只确认 eventChannel 缺失/emit 抛错防护；父页 listener/回传资料成功仍需微信 DevTools GUI 验证，不能写成已完成。
- 已明确记录 `mock/qaSeed.ts` 只保留为测试资料来源，不可作为正式操作唯一资料来源。
- 建立 `mock/qaSeed.ts`，集中管理 QA 用户、团单、商品、客户订单、供应商、系统管理员资料。
- 团单/商品 mock 改为从 QA seed 派生。
- 我的页新增 QA Seed 展示区和一键加载/重置入口。
- 修正团单详情字段错误：`totalCustomers`、`memberOrderList`。
- 修正不存在详情路由：商品详情、客户订单详情、供应商详情、导游详情、个人资料详情改为 toast 或 modal。
- 主流程文案第一版改为简体中文和「开团/团单」语境。
- tab 文案统一为：团单、客户订单、商品库、我的。
- 更新 `PROJECT_RULES.md`、`README.md`、`QA_SEED_REQUIREMENTS.md`、`ACCEPTANCE.md`、`HANDOFF.md`。

## 下一轮优先
- 请使用者确认正式资料层方向：是否采用 `DATA_LAYER_DECISION.md` 建议的微信云开发数据库 + 云函数，或改走明确后端 API。
- 使用者确认后，进入 Phase 1 后半段：建立资料存取层接口与 mock/cloud repository 边界，但仍需避免页面直接散落调用 storage/mock/cloud/API。
- Phase 2 正式登入/OpenID/角色权限需等资料层方向确认后再做，不要提前接登入。
- 用 Codex App 接现有微信 DevTools 环境做 GUI route smoke test，不要重开 DevTools。
- 逐一打开 `QA_SEED_REQUIREMENTS.md` 的 27 个 route。
- 重点点击：团单列表 -> 团单详情 -> 本团商品 -> 商品库选择 -> 确认加入。
- 检查我的页 QA Seed 重置后列表是否刷新。
- 继续收敛非主流程旧模板页面：home/message/dataCenter/release/search/login/setting。

## 未完成与风险
- eventChannel「没有 listener」不能仅靠代码静态检查宣称完成；当前只能确认没有 opener、emit 抛错、返回失败已有防护，listener 回传仍需微信 DevTools GUI 验证。
- 未实现正式资料层、资料存取层、云函数、数据库集合或后端 API。
- 未接微信登录、OpenID、user profile 初始化或角色权限代码。
- `DATA_LAYER_DECISION.md` 的建议方案仍需使用者确认，不能直接勾选「使用者确认后决定正式资料层」。
- eventChannel「没有 listener」在微信 eventChannel API 中无法可靠探测；本轮已防护没有 opener、emit 抛错和返回失败，GUI 仍需后续验证。
- QA seed 使用 `wx` storage 展示资料，当前未实现正式数据持久化。
- 商品加入/移除只更新当前页面状态，返回后仍会从 seed 重新加载。
- 角色权限模型未确认，供应商与系统管理员只做展示和未完成提示。
- 未做微信 DevTools GUI 验证，视觉和组件兼容性需下一轮确认。
- 旧模板页面仍保留部分 TDesign starter 结构，需要后续产品化。

## GUI 测试清单
- `pages/groupOrder/index`
- `sub-pages/groupOrder/detail/index?id=1`
- `sub-pages/groupOrder/detail/index?id=3`
- `sub-pages/groupOrder/productList/index?id=1`
- `sub-pages/groupOrder/productList/index?id=3`
- `sub-pages/groupOrder/product-picker/index?excludeIds=%5B101%5D`
- `pages/productManagement/index`
- `sub-pages/product/add/index`
- `pages/customerOrders/index`
- `pages/my/index`
- 其余 app.json route 依 `QA_SEED_REQUIREMENTS.md` 矩阵逐一打开。

## 不要碰
- 不要启动、重开、refocus、反复 preview WeChat DevTools。
- 不要使用 `automator.launch(...)`。
- 不要推送远端或部署。
- 不要删除正式资料。
- 不要提交 `resume/preview-info.json` 和 `resume/preview-qr.png`。
