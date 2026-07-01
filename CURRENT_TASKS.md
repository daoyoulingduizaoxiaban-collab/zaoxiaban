# CURRENT_TASKS

## 本轮完成
- 建立 `mock/qaSeed.ts`，集中管理 QA 用户、团单、商品、客户订单、供应商、系统管理员资料。
- 团单/商品 mock 改为从 QA seed 派生。
- 我的页新增 QA Seed 展示区和一键加载/重置入口。
- 修正团单详情字段错误：`totalCustomers`、`memberOrderList`。
- 修正不存在详情路由：商品详情、客户订单详情、供应商详情、导游详情、个人资料详情改为 toast 或 modal。
- 主流程文案第一版改为简体中文和「开团/团单」语境。
- tab 文案统一为：团单、客户订单、商品库、我的。
- 更新 `PROJECT_RULES.md`、`README.md`、`QA_SEED_REQUIREMENTS.md`、`ACCEPTANCE.md`、`HANDOFF.md`。

## 下一轮优先
- 用 Codex App 接现有微信 DevTools 环境做 GUI route smoke test，不要重开 DevTools。
- 逐一打开 `QA_SEED_REQUIREMENTS.md` 的 27 个 route。
- 重点点击：团单列表 -> 团单详情 -> 本团商品 -> 商品库选择 -> 确认加入。
- 检查我的页 QA Seed 重置后列表是否刷新。
- 继续收敛非主流程旧模板页面：home/message/dataCenter/release/search/login/setting。

## 未完成与风险
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
