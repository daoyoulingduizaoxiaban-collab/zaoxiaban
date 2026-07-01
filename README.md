# 导游领队早下班

微信小程序项目，目标是为中国境内导游/领队提供开团、团单商品、商品库、客户订单和收款状态管理工具。

## Start Here
Current work is controlled by `CURRENT_TASKS.md`.

Before coding, read:
1. `CURRENT_TASKS.md`
2. `PROJECT_RULES.md`
3. `MVP_COMPLETION_CHECKLIST.md`
4. `ACCEPTANCE.md`
5. `HANDOFF.md`

## Current State
- QA/local mode, not production.
- Formal data layer not confirmed.
- Formal OpenID login not verified.
- Product library has local/QA repository implementation.
- Phase 5 customer ordering/payment workflow is not implemented.
- WeChat DevTools GUI validation has not been run.

## Main Routes
- Group orders: `pages/groupOrder/index`
- Group order detail: `sub-pages/groupOrder/detail/index`
- Group order products: `sub-pages/groupOrder/productList/index`
- Product picker: `sub-pages/groupOrder/product-picker/index`
- Product library: `pages/productManagement/index`
- Customer orders: `pages/customerOrders/index`
- My / QA Seed: `pages/my/index`

## Validation
```bash
git status --short --branch
npm run lint
git diff --check
```

## Important Restrictions
- Do not start or restart WeChat DevTools unless explicitly asked.
- Do not push, deploy, create cloud resources, install packages, or use network unless explicitly asked.
- Do not submit `resume/preview-info.json` or `resume/preview-qr.png`.
- Do not describe QA/local fallback as production behavior.
