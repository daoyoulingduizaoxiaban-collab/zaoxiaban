# ACCEPTANCE

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
