# ACCEPTANCE

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
