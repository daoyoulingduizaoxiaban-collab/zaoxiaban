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
- Phase 8 cloud product library verification:
  - `businessData` cloud function deployed and active.
  - Product create/list returned `saveMode: wechat-cloud-repository` through the existing product page/service/repository path.
- Phase 5 local/QA customer ordering workflow exists:
  - Customer entry path is `/pages/customerOrders/edit/index?groupOrderId=...`.
  - Customer order creation goes through `CustomerOrderService` / `CustomerOrderRepository`.
  - Order items calculate numeric totals from product price rules and quantities.
  - Customer order list uses role-scoped visibility from the repository/service boundary.
  - Customer payment declaration, guide payment confirmation, and order cancellation go through the same service/repository path.
  - Payment status history is appended on each local/QA status change.
- Phase 8 cloud customer order/payment verification:
  - Customer role created a cloud customer order through `/pages/customerOrders/edit/index?groupOrderId=...`.
  - Customer declared paid, changing status from `0` to `1`.
  - Guide confirmed payment, changing status from `1` to `2`.
  - Payment history count reached 3 after create, declare paid, and confirm payment.
  - After redeploying the customer order scope fix, customer `listByGroupOrder` returned only the customer's own order with `saveMode: wechat-cloud-repository`.
- Phase 3 local/QA guide group-order workflow exists:
  - Group order list/detail/create/edit use `GroupOrderService` / `GroupOrderRepository`.
  - Group order create/edit saves to local storage key `dao_you_ling_local_group_orders`.
  - Add/remove group-order products saves through the same repository/service boundary.
  - Group order detail no longer directly depends on `GroupOrderMock`.
- Phase 8 cloud group-order verification:
  - Guide role created cloud product and cloud group order through existing page/service/repository path.
  - Cloud group order retained one product snapshot after reload/re-enter.
- QA bug report fixes:
  - Customer share path is generated for group orders and exposed from group-order detail.
  - Group order form/detail/customer entry include real-world fields: activity time, cutoff, pickup/delivery, payment note, contact, and customer notice.
  - Formal product image save path uploads local media to WeChat Cloud Storage before product create.
  - Login role picker exposes guide/customer only; owner/admin remains cloud-function allowlist controlled.
  - Customer order phone validation enforces 11-digit mainland China mobile format.
  - Customer payment method/remark/proof images and guide confirmed amount/remark are saved into order/payment history.
  - Group-order product list opens a read-only product detail modal instead of unfinished toast.
- QA retest follow-up GUI fixes:
  - Home is now a task-focused workbench with group order, product library, customer order, and data center entry points.
  - Provider page no longer appears blank for non-provider roles; it shows read-only supplier data with an unfinished-provider-backend notice.
  - Search page no longer requests starter search APIs or shows AI/template hot words; it uses local business terms.
  - Data center layout was simplified into stable summary cards, title was aligned to `数据中心`, a native `index.wxss` was added, and content top padding prevents fixed-navbar clipping.
  - Chat page now shows a disabled-state card instead of an active input box when chat is not enabled.
  - Product add primary actions use the same blue operation style as the rest of the MVP.
  - Customer order list role scope now includes the current role label and uses repository metadata when available.
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
- 27-route GUI smoke test.
- Product image upload through actual media picker in GUI.
- QA retest follow-up GUI fixes listed above need screenshot retest.
- Cloud database console security rules were not separately configured by CLI; permission boundaries are enforced in `businessData` cloud function, and pages do not directly access cloud DB.
- EventChannel listener success in actual DevTools.
- Product library click flow in GUI.
- Phase 5 customer order click flow in GUI.
- Phase 3 guide group-order click flow in GUI.

### Not Implemented
- Production deployment.

### Requires User Assistance
- Owner/admin formal role assignment: provide the OpenID values that should be configured in `OWNER_OPENIDS` / `ADMIN_OPENIDS`, or set them in the cloud function environment.
- Owner/admin cloud role allowlist: not configured because no owner/admin OpenID list has been provided.
- GUI smoke: either provide a working DevTools automation ticket/session if route automation becomes unstable again, or manually run/observe the 27-route GUI checklist with Codex.

## Validation Rule
Only mark an item complete when it has a matching validation signal. Lint or static inspection is enough for code-shape checks, but not for GUI behavior, real OpenID, cloud persistence, or real-user MVP closure.
