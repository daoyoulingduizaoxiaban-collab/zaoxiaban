# 导游领队早下班

微信小程序项目，目标是为中国境内导游/领队提供开团、团单商品、商品库、客户订单和收款状态管理工具。

## Start Here
Current work is controlled by `HANDOFF.md` and `MVP_COMPLETION_CHECKLIST.md`.

Before coding, read:
1. `HANDOFF.md`
2. `PROJECT_RULES.md`
3. `MVP_COMPLETION_CHECKLIST.md`
4. `ACCEPTANCE.md`
5. `DATA_LAYER_DECISION.md`
6. `DATA_MODEL_AND_PERMISSIONS.md`
7. `QA/QA_SEED_REQUIREMENTS.md`

`CURRENT_TASKS.md` and `NEXT_AGENT_TASK.md` are deprecated and must not be used as task sources.

## Current State
- Mixed mode: formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use local/QA fallback.
- Formal data layer is confirmed as WeChat Cloud Database + Cloud Functions behind service/repository boundaries.
- Formal OpenID login is verified through deployed `authLogin`.
- Product library has local/QA repository implementation.
- Product, group-order, customer-order, and payment persistence have cloud repository/cloud-function paths plus local/QA fallback.
- Phase 5 customer ordering/payment workflow is implemented, with GUI/device retest still pending.
- Full 27-route / real workflow GUI validation has not passed.

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
