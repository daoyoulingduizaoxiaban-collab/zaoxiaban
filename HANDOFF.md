# HANDOFF

## Current Source Of Truth
- Current task source: `CURRENT_TASKS.md`.
- Product rules: `PROJECT_RULES.md`.
- MVP roadmap, partially completed items, and missing backlog: `MVP_COMPLETION_CHECKLIST.md`.
- Acceptance status: `ACCEPTANCE.md`.
- Data-layer recommendation: `DATA_LAYER_DECISION.md`.
- Data model and permissions: `DATA_MODEL_AND_PERMISSIONS.md`.
- QA route/data matrix: `QA_SEED_REQUIREMENTS.md`.

## Current State
- Branch: `codex`.
- Product: WeChat mini program for China-based guides/tour leaders to manage group orders.
- Current runtime mode: QA/local mode, not production.
- `config.js`: `isMock: true`, `baseUrl: ''`, `cloudEnvId: ''`.
- Formal data layer: not confirmed by user. `DATA_LAYER_DECISION.md` is only a recommendation.
- Formal OpenID login: not verified. `authLogin` cloud function and cloud `users` collection do not exist yet.
- Phase 3 guide group-order persistence: local/QA repository version is implemented.
- Product library: Phase 4 local/QA repository version is implemented.
- Phase 5 customer ordering/payment workflow: local/QA repository version is implemented.
- WeChat DevTools GUI validation: project opened by CLI; automation route smoke could not connect to `ws://127.0.0.1:9420`.

## Implemented Boundaries
- Auth uses `services/auth/authService.js` and `services/auth/roleScope.js`.
- Group orders use `services/groupOrder/groupOrderService.js` and `repositories/groupOrderRepository.js`.
- Group order repository currently saves to local storage key `dao_you_ling_local_group_orders`; this is not cloud persistence.
- Customer order visibility uses `repositories/customerOrderRepository.js`.
- Product library uses `services/product/productService.js` and `repositories/productRepository.js`.
- Product repository currently saves to local storage key `dao_you_ling_local_products`; this is not cloud persistence.
- Customer ordering uses `services/customerOrder/customerOrderService.js` and `repositories/customerOrderRepository.js`.
- Customer order repository currently saves to local storage key `dao_you_ling_local_customer_orders`; this is not cloud persistence.
- QA seed remains in `mock/qaSeed.ts` for test/demo data only.

## Hard Rules
- Do not start, restart, refocus, or preview WeChat DevTools unless explicitly asked.
- Do not use `automator.launch(...)`.
- Do not push, deploy, create cloud resources, delete production data, install packages, or use network unless explicitly asked.
- Do not submit `resume/preview-info.json` or `resume/preview-qr.png`.
- Do not describe mock/local fallback as formal OpenID, formal cloud persistence, or a real-user MVP loop.
- Do not extend Phase 5 beyond the current local/QA workflow unless the user explicitly asks for that scope.

## Validation Commands
```bash
git status --short --branch
npm run lint
git diff --check
```

## Known Unverified Items
- Formal OpenID exchange through WeChat cloud function.
- Cloud `users`, `products`, `groupOrders`, `customerOrders`, and payment-related collections.
- WeChat DevTools route smoke test.
- WeChat DevTools automation connect: CLI `auto --auto-port 9420` reported success, but `miniprogram-automator.connect` failed against `ws://127.0.0.1:9420`, `ws://localhost:9420`, and `ws://[::1]:9420`.
- 27-route static file existence check passed.
- Product library GUI flow: create -> list refresh -> status toggle -> soft delete.
- Phase 5 GUI flow: customer entry -> select products -> submit order -> declare paid -> guide confirm/cancel.
- Guide full GUI workflow: group order -> product selection -> reopen.
- Formal cloud-backed customer order and payment confirmation workflow.

## Recommended Next Step
Read `CURRENT_TASKS.md` first for the session entry steps, then use `MVP_COMPLETION_CHECKLIST.md` as the canonical backlog for partially completed and missing work.

If continuing MVP validation, the next gap is Phase 7 GUI smoke test. Do not infer a later phase from the roadmap. Wait for the user to specify one of:
- GUI smoke test.
- Formal data-layer confirmation and cloud setup.
- UI cleanup / starter removal.
