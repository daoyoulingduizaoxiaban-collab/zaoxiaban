# CURRENT_TASKS

## 当前状态 - Phase 4 商品库已完成，等待稽核
- 当前没有新的开发任务可自行展开；下一位 agent 必须先稽核 Phase 0.7 与 Phase 4 的完成度，再依使用者新指令继续。
- Phase 0.7 与 Phase 4 已由上一轮写入「已完成记录」；若稽核发现缺漏，只能修补 Phase 0.7 / Phase 4 范围内的问题。
- 不得继续实作 `Phase 5 - 客户下单与订单管理`，不得建立客户下单、客户订单正式流程或收款确认闭环。
- Phase 0.7 稽核回修范围：
  - `pages/message/index.js` / `pages/chat/index.js`：補 socket null 防護；聊天能力未啟用時要安全提示或停用，不能崩潰。
  - `pages/groupOrder/index.ts`：修正搜尋/狀態篩選後 `statusText` 遺失或狀態樣式不一致。
  - `DATA_LAYER_DECISION.md`、`ACCEPTANCE.md`、`MVP_COMPLETION_CHECKLIST.md`、`HANDOFF.md`：把「使用者已確認微信雲開發」校正為「建議方案，待使用者確認」。
  - Phase 2 相關勾選/驗收：改成 auth adapter、mock fallback、role scope 已完成；正式 OpenID、`authLogin` 雲函式、雲端 `users` 集合仍未驗證/未建立。
- Phase 4 商品库完成范围：
  - 商品庫列表只顯示目前角色可用商品；guide/customer/owner/admin/provider 的可見邊界要清楚。
  - 商品新增、上下架、刪除/軟刪除要走同一個商品 repository/service 邊界，不要讓頁面散落直接操作 QA seed/storage。
  - 商品表單至少包含名稱、描述、圖片、價格規則、狀態、供應來源或備註；必填驗證、提交中、成功、失敗、空狀態都要有。
  - 階梯價格要有明確計算規則，不可只存顯示字串。
  - 若正式資料層尚未確認，商品保存可先走明確標記的 local/mock repository，但 UI 必須提示「本地/QA 展示模式，尚未正式保存」，不得假裝雲端保存完成。
  - 不得新增 Phase 5 客戶下單入口或正式客戶訂單功能。
- 稽核验证：
  - 必跑 `npm run lint`。
  - 必跑 `git diff --check`。
  - 必跑 `git status --short --branch`。
  - 靜態驗證 Phase 0.7 回修項；商品庫至少驗證新增商品資料流、狀態篩選/搜尋、上下架、刪除/軟刪除在同一 repository/service 路徑下不互相打架。
- 文件回写：
  - 更新 `MVP_COMPLETION_CHECKLIST.md`，只勾完成且已驗證的項目。
  - 更新 `ACCEPTANCE.md`、`CURRENT_TASKS.md`、`HANDOFF.md`，明確標示未做 GUI、未做正式雲端保存、未做 Phase 5。
  - 只提交本輪相關檔案，不提交 `resume/preview-info.json`、`resume/preview-qr.png`。

## 历史任务 - Phase 2 登录与角色权限（已完成，仍有正式化未验证项）
- 正式资料层方向仍是建议方案，待使用者确认：MVP 建议优先采用微信云开发数据库 + 云函数，但页面必须经由 service/repository 边界，不直接散落调用云数据库。
- 接入 `wx.login` + auth adapter；云环境/云函数未配置时必须使用明确标记的 mock fallback，不可假装已取得正式 OpenID。
- 建立 user profile 初始化流程，字段对齐 `DATA_MODEL_AND_PERMISSIONS.md` 的 users 初稿。
- 落地 MVP 角色：guide、customer、owner/admin；provider 暂缓但入口必须提示未完成或不可用。
- 按当前 user profile 限制团单与客户订单可见范围。
- 去除 starter 登录文案与 TDsign/QQ/企微等非 MVP 登录入口。
- 验证：`npm run lint`、`git diff --check`、`git status --short --branch`，并用 guide/customer 验证角色 scope。

## 历史任务 - Phase 0/0.5/1（已完成）
- Phase 0：按 `MVP_COMPLETION_CHECKLIST.md` 恢复上下文，执行 `git status --short --branch`，确认本轮任务边界，不启动微信 DevTools、不联网、不部署、不推送、不提交 `resume/preview-*`。
- Phase 0.5：修正 blocking defects：eventChannel 缺 opener/listener 防护、团单二维码空值防护、客户订单 id 字符串/数字比对、商品库搜索与状态筛选一致性。
- Phase 1：只做正式资料层方案比较、资料模型与权限边界文件，不接正式数据库、云函数或后端 API。
- 文档回写：更新 `MVP_COMPLETION_CHECKLIST.md`、`CURRENT_TASKS.md`、`HANDOFF.md`，新增或更新资料层设计文件。
- 验证：必须执行 `npm run lint`、`git diff --check`、`git status --short --branch`，静态检查 blocking defects 修复路径；不声称微信 DevTools GUI 验证。

## 已完成记录
- Phase 4 商品库已完成本地/QA repository 版本：
  - `repositories/productRepository.js`：商品列表、新增、状态更新、软删除统一走 repository；当前保存到 `dao_you_ling_local_products` local storage，未接云端。
  - `services/product/productService.js`：集中处理必填验证、阶梯价 `totalPrice = minQuantity * unitPrice`、价格显示、创建、上下架、软删除。
  - `pages/productManagement/index`：按当前角色显示可用商品，显示 role scope 和「本地/QA 展示模式，尚未正式保存」；搜索、状态筛选、上下架、软删除都走 `ProductService`。
  - `sub-pages/product/add/index`：新增商品表单包含名称、描述、图片、价格规则、状态、供应来源或备注；保存走 `ProductService.create()`。
  - `models/Product.ts` 与 `mock/qaSeed.ts` 补齐商品 owner/provider/sourceNote/deletedAt 等字段，用于本地权限和软删除边界。
  - 本轮没有新增客户下单入口、客户订单正式流程或收款确认闭环。
- Phase 0.7 稽核回修已完成：
  - `pages/message/index.js`：`app.globalData.socket` 缺失时不注册 `socket.onMessage`，显示「聊天能力暂未启用」并安全返回。
  - `pages/chat/index.js`：发送消息前检查 `socket.send`，聊天能力未启用时显示「聊天能力暂未启用」且不崩溃。
  - `pages/groupOrder/index.ts`：`fetchItineraryList()` 与 `applyFilters()` 共用 `normalizeGroupOrders()`，筛选后仍补齐 `statusText`。
  - `DATA_LAYER_DECISION.md`、`ACCEPTANCE.md`、`MVP_COMPLETION_CHECKLIST.md`、`CURRENT_TASKS.md`、`HANDOFF.md` 已改回「建议方案，待使用者确认」，不再写成微信云开发已拍板。
  - Phase 2 只标为 auth adapter / mock fallback / role scope 已完成；正式 OpenID、`authLogin` 云函数、云端 `users` 集合仍未验证/未建立。
- Phase 2 已完成：
  - `services/auth/authService.js`：提供 auth adapter / mock fallback 边界；当前未配置云环境时使用明确标记的 `mock-auth-adapter`，不得视为正式 OpenID。
  - `services/auth/roleScope.js`：集中定义 guide、customer、owner、admin、provider 角色与可见范围规则。
  - `repositories/groupOrderRepository.js`、`repositories/customerOrderRepository.js`：页面通过 repository 按当前 profile 过滤资料，不直接用 QA seed 当正式 user profile。
  - `pages/login/login`：移除 TDsign、QQ、企微、密码/短信入口，改为微信登录与角色初始化。
  - `pages/loginCode/loginCode`：改为验证码登录停用提示。
  - `pages/my/index`：从 auth service 读取 profile/session，显示本地 adapter 警示，owner/admin 与 provider 入口只给未完成提示或按权限开放。
  - `pages/groupOrder/index`：guide 只看自己管理的团单；customer 只看自己订单关联团单；非导游/管理角色不显示新建团单入口。
  - `pages/customerOrders/index`：guide 只看自己团单下客户订单；customer 只看自己的订单；客户不显示新增订单入口。
  - `pages/providers/index`：非 owner/admin 不展示供应商管理资料，显示供应商后台暂未开放提示。
  - `mock/qaSeed.ts`：补齐 OpenID/profile 相关字段、团单 owner/guide 关联和订单 customer/guide 关联，用于本地角色 scope 验证。
- `DATA_LAYER_DECISION.md` 仍是建议方案；Phase 1「使用者确认后决定正式资料层」不得勾选，需等待明确确认。
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

## 后续候选任务（需使用者另行指定）
- 先由使用者确认正式资料层方向；若确认采用微信云开发，再建立微信云开发环境配置与云函数 `authLogin`，用真实 `wx.login` code 换取正式 OpenID，并写入/读取云数据库 `users` 集合。
- 将 auth repository 从本地 storage/mock fallback 切到 cloud repository，保留现有 service 边界。
- 若继续 Phase 4，可把 `ProductRepository` 的 cloud 实作接入微信云开发集合；正式接云前不要勾正式保存。
- 正式 OpenID 验证通过后，再进入 Phase 3/4/5 的正式保存与导游核心流程。
- 用 Codex App 接现有微信 DevTools 环境做 GUI route smoke test，不要重开 DevTools。
- 逐一打开 `QA_SEED_REQUIREMENTS.md` 的 27 个 route。
- 重点点击：团单列表 -> 团单详情 -> 本团商品 -> 商品库选择 -> 确认加入。
- 检查我的页 QA Seed 重置后列表是否刷新。
- 继续收敛非主流程旧模板页面：home/message/dataCenter/release/search/login/setting。

## 未完成与风险
- Phase 4 仅完成本地/QA repository 保存，未实现云端商品集合、云函数、安全规则或正式保存。
- 商品库未做微信 DevTools GUI 验证；新增/上下架/软删除目前只通过 lint、静态检查和数据流检查验证。
- 未执行「新增商品 -> 列表看到 -> 加入团单 -> 重开后仍存在」完整 GUI/真机流程；本轮也未展开 Phase 3 本团商品加入流程。
- Phase 5 完全未做：未新增客户下单、客户订单正式流程或收款确认闭环。
- 正式 OpenID 尚未验证：本轮未启动微信 DevTools，也未配置/执行云函数 `authLogin`。
- 云数据库 `users` 集合、云函数、安全规则与云端 profile 初始化尚未创建。
- 当前 role scope 已用本地 adapter 验证，但仍需微信 DevTools/真机验证登录按钮、storage、页面刷新后的 profile 读取。
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
