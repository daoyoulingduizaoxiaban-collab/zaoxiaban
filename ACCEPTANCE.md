# ACCEPTANCE

## Phase 2 登录与角色权限验收
- [x] 使用者已确认正式资料层方向：MVP 优先采用微信云开发数据库 + 云函数，并通过 service/repository 边界接入。
- [x] 新增 `services/auth/authService.js`：登录流程会调用 `wx.login`，再尝试云函数 `authLogin` 换取 OpenID；未配置云环境时使用明确标记的本地 auth adapter fallback。
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
- [ ] 正式微信 OpenID 换取未验证：本轮未启动微信 DevTools，且未配置/执行云函数 `authLogin`。
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
