# ACCEPTANCE

## Current Acceptance Status

### Verified By Static Checks
- QA seed exists in `mock/qaSeed.ts` and provides users, group orders, products, customer orders, providers, and admin demo data.
- Phase 0.5/0.6/0.7 blocking defects are fixed by code inspection:
  - eventChannel calls have opener/emit/navigation failure guards where currently used.
  - QR preview does not preview an empty or invalid URL.
  - customer order id comparison normalizes string/number ids.
  - message/chat pages do not crash when `app.globalData.socket` is null.
  - group order filtering preserves `statusText`.
- Phase 2 local auth boundary exists:
  - `AuthService` creates local/mock profile sessions.
  - Role scope functions cover `guide`, `customer`, `owner`, `admin`, and `provider`.
  - Formal OpenID is verified through deployed `authLogin`.
- Phase 8 formal auth/login partial completion:
  - DevTools CLI found WeChat Cloud environment `cloud1-3gwlqssy1f1972a9`.
  - `config.js` now points to that cloud environment and `app.js` initializes `wx.cloud`.
  - `cloudfunctions/authLogin` was deployed successfully with `--remote-npm-install`.
  - Cloud function info reports `authLogin` status `Active`, runtime `Nodejs16.13`.
  - DevTools automation connected to `ws://127.0.0.1:9420`; calling login page method initialized storage session with `authSource: wechat-cloud`, `isMockOpenId: false`, `cloudOpenIdVerified: true`, and a real OpenID.
  - Cloud `users` profile initialization returned a cloud document id for the current OpenID.
- Phase 4 local/QA product library exists:
  - Product list, create, search/status filter, status toggle, and soft delete go through `ProductService` / `ProductRepository`.
  - Product form includes title, description, images, price rules, status, and source note.
  - Price rules compute `totalPrice = minQuantity * unitPrice`.
  - Soft delete writes `deletedAt` and removes deleted products from visible lists.
- Phase 5 local/QA customer ordering workflow exists:
  - Customer entry path is `/pages/customerOrders/edit/index?groupOrderId=...`.
  - Customer order creation goes through `CustomerOrderService` / `CustomerOrderRepository`.
  - Order items calculate numeric totals from product price rules and quantities.
  - Customer order list uses role-scoped visibility from the repository/service boundary.
  - Customer payment declaration, guide payment confirmation, and order cancellation go through the same service/repository path.
  - Payment status history is appended on each local/QA status change.
- Phase 3 local/QA guide group-order workflow exists:
  - Group order list/detail/create/edit use `GroupOrderService` / `GroupOrderRepository`.
  - Group order create/edit saves to local storage key `dao_you_ling_local_group_orders`.
  - Add/remove group-order products saves through the same repository/service boundary.
  - Group order detail no longer directly depends on `GroupOrderMock`.
- Phase 6 UI cleanup is complete for the scoped starter pages:
  - home, message, dataCenter, release, search, login, and setting use MVP business copy or explicit unfinished/local/QA prompts.
- Phase 7 partial verification:
  - WeChat DevTools project opened via CLI.
  - Static 27-route file existence check passed.
  - WeChat DevTools `auto-replay --replay-all` command completed, but did not provide route-by-route GUI evidence.
- Last known validation commands passed:
  - `npm run lint`
  - `git diff --check`
  - `git status --short --branch`

### Completed Only In Local/QA Mode
- Auth profile initialization.
- Role-scoped group order and customer order visibility.
- Product library create/update/delete operations.
- Guide group-order create/edit and group-order product add/remove operations.
- Customer order create/payment/cancel operations.
- Payment status history records.
- QA seed reset and demo data display.

These are not formal cloud-backed features.

### Not Verified
- WeChat DevTools GUI route smoke test.
- WeChat DevTools full route smoke test.
- Cloud-backed product persistence.
- Cloud-backed customer order/payment persistence.
- Cloud-backed group order persistence.
- Cloud database permission rules.
- Reopen/reload persistence for formal business data.
- EventChannel listener success in actual DevTools.
- Product library click flow in GUI.
- Phase 5 customer order click flow in GUI.
- Phase 3 guide group-order click flow in GUI.

### Not Implemented
- Formal cloud repository for group orders, products, customer orders, payments, and payment status history.
- Formal cloud/API guide group-order create/edit persistence.
- Formal cloud/API group order product add/remove persistence.
- Formal customer order cloud/API workflow.
- Formal payment confirmation or payment status history workflow.
- Production deployment.

### Requires User Assistance
- Owner/admin formal role assignment: provide the OpenID values that should be configured in `OWNER_OPENIDS` / `ADMIN_OPENIDS`, or set them in the cloud function environment.
- Cloud implementation beyond auth: explicitly confirm collection permission rules before creating business collection rules for `groupOrders`, `products`, `groupOrderProducts`, `customerOrders`, `payments`, and `paymentStatusHistory`.
- GUI smoke: either provide a working DevTools automation ticket/session if route automation becomes unstable again, or manually run/observe the 27-route GUI checklist with Codex.

## Validation Rule
Only mark an item complete when it has a matching validation signal. Lint or static inspection is enough for code-shape checks, but not for GUI behavior, real OpenID, cloud persistence, or real-user MVP closure.
