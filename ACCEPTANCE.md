# ACCEPTANCE

## 2026-07-02 文件治理稽核
- [x] `CURRENT_TASKS.md` 已整理为唯一当前任务入口，不再同时维护历史完成记录、验收矩阵和后续大清单。
- [x] 历史完成记录与交接细节统一放入 `HANDOFF.md`。
- [x] 总 MVP 阶段勾选统一放入 `MVP_COMPLETION_CHECKLIST.md`。
- [x] 验收结果与未验证项统一放入 `ACCEPTANCE.md`。
- [x] 已复查容易误导的状态词：未保留并列任务标题或正式资料层已拍板的错误状态。
- [x] `MVP_COMPLETION_CHECKLIST.md` 已补充勾选规则：做到 Phase 4 只代表商品库本地/QA 版本完成，不代表正式资料层、正式 OpenID、Phase 3、GUI 验证或真人可用闭环都完成。
- [x] `MVP_COMPLETION_CHECKLIST.md` 已改为二元勾选规则：全域项未全域完成就不打勾，商品库完成项只放在 Phase 4。
- [x] Phase 4 代码静态复查：商品库列表、新增、搜索/状态筛选、上下架、软删除仍走 `ProductService` / `ProductRepository`。
- [x] Phase 4 范围复查：未发现商品库代码包含 Phase 5 客户下单、正式客户订单流程或收款确认闭环。
- [ ] 微信 DevTools GUI 验证仍未执行，不能宣称商品库点击流程或视觉状态已通过。

## Phase 0.7 稽核回修验收
- [x] `pages/message/index.js` 已在 `app.globalData.socket` 缺失时安全停用 socket listener，并提示「聊天能力暂未启用」。
- [x] `pages/chat/index.js` 已在 `app.globalData.socket` 缺失时阻止 `socket.send`，并提示「聊天能力暂未启用」。
- [x] `pages/groupOrder/index.ts` 的 `fetchItineraryList()` 与 `applyFilters()` 已共用 `normalizeGroupOrders()` 补齐 `statusText`。
- [x] 文件已校正为「微信云开发数据库 + 云函数」仍是建议方案，待使用者确认；未写成已拍板决策。
- [x] Phase 2 验收已校正为 auth adapter / mock fallback / role scope 已完成；正式 OpenID、云函数 `authLogin`、云端 `users` 集合仍未验证或未建立。
- [ ] 微信 DevTools GUI 验证未执行：本轮不得启动或重开微信 DevTools。
- [ ] 正式云端保存未执行：本轮未创建云数据库、云函数或部署。
- [ ] Phase 5 未执行：本轮不得新增客户下单、客户订单正式流程或收款确认闭环。

## Phase 4 商品库验收
- [x] 新增 `repositories/productRepository.js`，商品列表、新增、状态更新、软删除统一通过 repository 边界；当前保存模式为 local product repository。
- [x] 新增 `services/product/productService.js`，集中处理商品必填验证、阶梯价 `totalPrice = minQuantity * unitPrice` 计算、价格显示、创建、上下架、软删除。
- [x] `pages/productManagement/index` 改为通过 `ProductService.listVisible()` 按当前角色读取可用商品，并显示角色范围和「本地/QA 展示模式，尚未正式保存」提示。
- [x] `pages/productManagement/index` 搜索、状态筛选、上下架、软删除都走 `ProductService`，不再由页面直接拼接 QA seed 或 storage。
- [x] `sub-pages/product/add/index` 改为通过 `ProductService.create()` 新增本地/QA 商品；表单包含名称、描述、图片、价格规则、状态、供应来源或备注。
- [x] 商品表单已有必填验证、提交中状态、成功/失败 toast。
- [x] 商品删除为软删除：写入 `deletedAt` 并下架，不做硬删除。
- [x] 商品库有搜索无结果空状态。
- [x] 静态验证未发现商品库实现包含 Phase 5 客户下单、正式客户订单流程或收款确认闭环。
- [ ] 微信 DevTools GUI 未验证：未实际点击新增商品、上下架、软删除。
- [ ] 正式云端保存未实现：未创建云数据库、云函数或 cloud product repository。
- [ ] 「新增商品 -> 列表看到 -> 加入团单 -> 重开后仍存在」未完整验证：本轮未做 GUI，也未展开 Phase 3 本团商品加入流程。

## Phase 2 登录与角色权限验收
- [ ] 正式资料层尚未拍板：当前仍是 `DATA_LAYER_DECISION.md` 建议方案，待使用者确认。
- [x] 新增 `services/auth/authService.js` auth adapter：可替换为 `wx.login` + 云函数 `authLogin`；未配置云环境时使用明确标记的本地 auth adapter fallback。
- [x] 新增 user profile 初始化：profile 存储包含 `openId`、`role`、`displayName`、`phone`、`avatarUrl`、`status`、`createdAt`、`updatedAt`、`authSource`、`isMockOpenId`。
- [x] 后续登录会按同一 `openId` 读取并更新既有 profile 的 `updatedAt`，保留首次 `createdAt`。
- [x] MVP 角色已落地：`guide`、`customer`、`owner`、`admin`；`provider` 入口保留未完成/不可用提示，不提供误导性后台操作。
- [x] `pages/login/login` 已移除 TDsign、QQ、企微、密码/短信等 starter 登录入口，改为微信登录和角色初始化文案。
- [x] `pages/loginCode/loginCode` 已改为停用提示，不再伪装成可用短信登录。
- [x] `pages/my/index` 改为从 `AuthService` 读取当前 profile，不再直接用 `mock/qaSeed.ts` owner 当真人登录资料。
- [x] `pages/groupOrder/index` 通过 `GroupOrderRepository` 按当前 profile 过滤团单：guide 只看自己创建或授权管理的团单，customer 只看自己订单关联团单。
- [x] `pages/customerOrders/index` 通过 `CustomerOrderRepository` 按当前 profile 过滤客户订单：guide 只看自己团单下订单，customer 只看自己的订单。
- [x] owner/admin 入口未完成时显示提示，不假装可管理全站。
- [x] guide/customer 可见范围已用本地 role scope 验证：guide 团单 `1,2`、guide 订单 `5001,5002,5004`；customer 团单 `1`、customer 订单 `5001`。
- [x] `npm run lint` 通过。
- [x] `git diff --check` 通过。
- [ ] 正式微信 OpenID 换取未验证：未启动微信 DevTools，且未配置/执行云函数 `authLogin`。
- [ ] 云数据库 `users` 集合与云函数未创建：本轮只完成 Phase 2 adapter/service/repository 边界和本地 fallback。

## Phase 0/0.5/1 本轮验收清单
- [x] 完整读取 `MVP_COMPLETION_CHECKLIST.md`、`PROJECT_RULES.md`、`CURRENT_TASKS.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`。
- [x] 执行 `git status --short --branch`，并确认 `resume/preview-info.json`、`resume/preview-qr.png` 不纳入提交。
- [x] `CURRENT_TASKS.md` 已补入本轮 Phase 0/0.5/1 明确任务。
- [x] 未启动或重开微信 DevTools，未使用 `automator.launch(...)`，未联网、未部署、未推送、未安装新套件。
- [x] `sub-pages/groupOrder/product-picker/index.ts` 与 `sub-pages/product/add/index.ts` 已防护没有 opener eventChannel、emit 失败和 navigateBack 失败；`pages/chat/index.js` 也已避免直接进页崩溃。
- [x] `sub-pages/groupOrder/detail/index.ts` 已在 `qrCodeUrl` 为空或非法时阻止 `wx.previewImage` 预览空字串，并显示「暂无团单二维码」。
- [x] `pages/customerOrders/index.js` 已统一 dataset id 与 seed/model id 的字串比对。
- [x] `pages/productManagement/index.ts` 已让搜索、状态筛选、上下架、删除统一走 `updateLocalData` / `applyProductFilters`。
- [x] 新增 `DATA_LAYER_DECISION.md`，比较微信云开发数据库与明确后端 API，并给出 MVP 建议方案。
- [x] 新增 `DATA_MODEL_AND_PERMISSIONS.md`，覆盖 users、groupOrders、products、groupOrderProducts、customerOrders、payments、paymentStatusHistory 与 owner/guide/customer/provider/admin 权限边界。
- [x] 明确记录 `mock/qaSeed.ts` 只保留为测试资料来源，不可作为正式操作唯一资料来源。
- [x] `npm run lint` 通过。
- [x] `git diff --check` 通过。
- [ ] 微信 DevTools GUI 验证：本轮未执行，因使用者要求不要启动或重开 DevTools。
- [ ] 正式资料层实现：本轮按要求未接正式数据库、云函数或 API。

## Phase 0.6 稽核追加验收
- [x] `pages/message/index.js` 聊天入口 URL 参数正确传递 `userId`，不可保留 `?userId${userId}` 这种缺少 `=` 的 query。
- [x] `pages/message/index.js` 在 `getUserById` 找不到 user/index 时不会崩溃，并给出 toast 或安全返回。
- [x] `pages/message/index.js` 所有 eventChannel emit 都有缺失/失败防护，不因 eventChannel 不存在或 emit 抛错造成页面崩溃。
- [ ] eventChannel listener/回传资料成功仍需微信 DevTools GUI 验证；静态检查不能证明父页 listener 存在或回传成功。
- [x] 稽核追加修正后通过 `npm run lint`、`git diff --check`、`git status --short --branch`。

## 本轮验收清单
- [x] 建立集中式 `mock/qaSeed.ts`。
- [x] QA Seed 可在「我的」页一键加载/重置。
- [x] app.json 内所有已存在页面都有可打开的展示资料、空状态或未完成提示策略。
- [x] 主分页面 tab 文案与 `app.json`、`config.js`、`custom-tab-bar/index.js` 对齐：团单、客户订单、商品库、我的。
- [x] 主流程可看到合理假资料：团单列表、团单详情、本团商品、商品库选择、商品库、客户订单、我的。
- [x] 修正 `groupOrder/detail` 的 `totalmembers/memberOrder` 错误，统一使用 `totalCustomers/memberOrderList`。
- [x] 不存在的订单详情、商品详情、供应商详情、导游详情、个人资料详情路由不再直接跳转。
- [x] 商品加入本团、移除本团商品、商品库选择在 QA 模式下稳定呈现并提示暂未保存。
- [x] UI 风格统一第一版完成，主流程收敛为简体中文和工作型工具风格。
- [x] `npm run lint` 通过。
- [x] `git diff --check` 通过。

## 尚未 GUI 验证
- [ ] 微信 DevTools 中逐一打开 27 个 app.json route。
- [ ] 底部 tab 在真实小程序环境中状态一致。
- [ ] 团单列表进入详情，再进入本团商品，再进入商品库选择，选择商品后返回。
- [ ] 商品库新增商品返回列表。
- [ ] 客户订单详情弹窗、供应商提示、管理员提示。
- [ ] 表单按钮 toast 与空状态视觉是否遮挡。
