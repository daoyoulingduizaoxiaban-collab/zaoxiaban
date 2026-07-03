# 导游领队早下班

微信小程序项目，目标是为中国境内导游/领队提供开团、团单商品、商品库、客户订单和收款状态管理工具。

## Start Here
`HANDOFF.md` is the only session entry point.

Before coding, read:
1. `HANDOFF.md`
2. `PROJECT_RULES.md`
3. `MVP_COMPLETION_CHECKLIST.md`
4. `ACCEPTANCE.md`
5. `DATA_LAYER_DECISION.md`
6. `DATA_MODEL_AND_PERMISSIONS.md`
7. `QA/QA_SEED_REQUIREMENTS.md`

After reading `HANDOFF.md`, use `MVP_COMPLETION_CHECKLIST.md` only as the MVP gate / backlog / product-completion reference. Use `QA/QA_BUG_REPORT_202607021815.md` as the single place for QA problem reports, retest notes, evidence, and pass/fail status.

Do not copy BUG rows, BUG ID lists, GUI subissue lists, or per-page defect ledgers into `MVP_COMPLETION_CHECKLIST.md`. The MVP checklist tracks gate-level categories; the BUG report tracks independently fixable and retestable rows.

QA/AGENT work must stay separated by responsibility: QA reports only in the BUG report and does not create extra planning/result/handoff documents; development agents fix product code, run validation, and hand the fix back for QA retest.

## Current State
- Mixed mode: formal WeChat Cloud login and core business cloud persistence are connected; mock identities still use local/QA fallback.
- Formal data layer is confirmed as WeChat Cloud Database + Cloud Functions behind service/repository boundaries.
- Formal OpenID login is verified through deployed `authLogin`.
- Product library has local/QA repository implementation.
- Product, group-order, customer-order, and payment persistence have cloud repository/cloud-function paths plus local/QA fallback.
- Phase 5 customer ordering/payment workflow is implemented, but GUI/device retest evidence is still pending.
- Full 27-route / real workflow GUI validation has not passed; current MVP gate remains `不通過` until fresh GUI/true-device evidence exists.
- Role-based feature-entry hiding now requires a gate-level role/function matrix before it can be considered complete.

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
- Do not claim GUI, role, or real-user MVP pass from static inspection alone.
