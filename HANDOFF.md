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
- Current runtime mode: mixed mode. Formal WeChat Cloud login is connected; business data remains QA/local mode, not production.
- `config.js`: `isMock: true`, `baseUrl: ''`, `cloudEnvId: 'cloud1-3gwlqssy1f1972a9'`.
- Formal data layer direction: user confirmed WeChat Cloud Database + Cloud Functions, behind service/repository boundaries.
- Formal OpenID login: verified through deployed `authLogin`.
- Cloud `users` profile initialization: verified for current OpenID through DevTools automation.
- Phase 3 guide group-order persistence: local/QA repository version is implemented.
- Product library: Phase 4 local/QA repository version is implemented.
- Phase 5 customer ordering/payment workflow: local/QA repository version is implemented.
- WeChat DevTools GUI validation: project opened by CLI; `auto-replay --replay-all` completed; automation route smoke could not connect to `ws://127.0.0.1:9420`.

## Implemented Boundaries
- Auth uses `services/auth/authService.js` and `services/auth/roleScope.js`.
- Formal auth cloud function lives in `cloudfunctions/authLogin`.
- `authLogin` initializes/reads cloud `users` and returns profile/session fields to `AuthService`.
- In formal auth, owner/admin cannot be self-assigned from the front end; configure `OWNER_OPENIDS` / `ADMIN_OPENIDS` in the cloud function environment.
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
- Do not push, deploy, create cloud resources, delete production data, install packages, or use network unless explicitly asked. The user explicitly authorized `authLogin` creation/deployment in this session.
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
- Cloud business collections: `products`, `groupOrders`, `groupOrderProducts`, `customerOrders`, `payments`, and `paymentStatusHistory`.
- Cloud database permission rules for all formal collections.
- WeChat DevTools route smoke test.
- WeChat DevTools automation connect now works against `ws://127.0.0.1:9420` for targeted login verification; full route smoke is still not done.
- WeChat DevTools `auto-replay --replay-all` completed, but did not produce route-by-route GUI evidence.
- 27-route static file existence check passed.
- Product library GUI flow: create -> list refresh -> status toggle -> soft delete.
- Phase 5 GUI flow: customer entry -> select products -> submit order -> declare paid -> guide confirm/cancel.
- Guide full GUI workflow: group order -> product selection -> reopen.
- Formal cloud-backed customer order and payment confirmation workflow.

## Phase 8 Auth Verification
- Cloud environment list returned `cloud1-3gwlqssy1f1972a9`.
- `authLogin` deployed successfully after one retry; final deploy output reported `success: true`, `filesCount: 2`, `packSize: 1.5 KB`.
- `cloud functions info` reported `authLogin` status `Active`, runtime `Nodejs16.13`.
- DevTools automation connected to `ws://127.0.0.1:9420`.
- Calling `/pages/login/login` page method `login()` produced session storage with:
  - `authSource: wechat-cloud`
  - `isMockOpenId: false`
  - `cloudOpenIdVerified: true`
  - `wxLoginCalled: true`
  - `wxLoginCodeAvailable: true`
- The current OpenID was returned and a cloud `users` profile id was created. Do not paste the OpenID into public docs or commits beyond local validation notes.

## Recommended Next Step
Read `CURRENT_TASKS.md` first for the session entry steps, then use `MVP_COMPLETION_CHECKLIST.md` as the canonical backlog for partially completed and missing work.

If continuing MVP implementation, the next high-value gap is Phase 8 business data cloud repository work:
- Define and create permission rules for business collections.
- Add cloud repository implementations behind the existing group order/product/customer order services.
- Keep local/QA repository fallback clearly labeled and switchable.
- Run targeted GUI smoke after each formal workflow is cloud-backed.

## User Assistance Needed For Phase 8
- Provide owner/admin OpenID allowlist values for formal role assignment, or approve keeping all new cloud users as guide/customer until admin tooling exists.
- Confirm collection permission rules before applying formal business data rules.
- Provide a working DevTools automation ticket/session, or manually assist with the 27-route GUI smoke test if automation becomes unstable.
