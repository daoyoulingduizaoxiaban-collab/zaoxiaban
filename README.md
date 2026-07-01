# 导游领队早下班

微信小程序项目，当前产品方向是面向中国境内使用的导游/领队开团管理工具。

## 当前主流程
- 团单列表：`pages/groupOrder/index`
- 团单详情：`sub-pages/groupOrder/detail/index`
- 本团商品：`sub-pages/groupOrder/productList/index`
- 商品库选择：`sub-pages/groupOrder/product-picker/index`
- 商品库：`pages/productManagement/index`
- 客户订单：`pages/customerOrders/index`
- 我的 / QA Seed：`pages/my/index`

## QA Seed
- 集中式 seed：`mock/qaSeed.ts`
- 一键加载/重置入口：我的页的「QA Seed 展示模式」区域。
- 当前 seed 使用 `wx` storage 展示数据，操作类功能只做 QA 展示提示，暂不承诺正式保存。

## 本地验证
```bash
npm run lint
git diff --check
```

## 开发限制
请先阅读 `PROJECT_RULES.md`、`QA_SEED_REQUIREMENTS.md`、`ACCEPTANCE.md`、`CURRENT_TASKS.md`、`HANDOFF.md`。

本项目禁止在未获明确要求时启动或重开微信开发者工具 GUI、推送远端、部署、删除正式资料、提交 `resume/preview-*`。
