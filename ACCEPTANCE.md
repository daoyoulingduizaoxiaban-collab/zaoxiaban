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
  - Formal OpenID is not verified.
- Phase 4 local/QA product library exists:
  - Product list, create, search/status filter, status toggle, and soft delete go through `ProductService` / `ProductRepository`.
  - Product form includes title, description, images, price rules, status, and source note.
  - Price rules compute `totalPrice = minQuantity * unitPrice`.
  - Soft delete writes `deletedAt` and removes deleted products from visible lists.
- No Phase 5 customer ordering/payment code was added in the product library scope.
- Last known validation commands passed:
  - `npm run lint`
  - `git diff --check`
  - `git status --short --branch`

### Completed Only In Local/QA Mode
- Auth profile initialization.
- Role-scoped group order and customer order visibility.
- Product library create/update/delete operations.
- QA seed reset and demo data display.

These are not formal cloud-backed features.

### Not Verified
- WeChat DevTools GUI route smoke test.
- Real `wx.login` code exchange for OpenID.
- Cloud function `authLogin`.
- Cloud `users` collection initialization.
- Cloud-backed product persistence.
- Reopen/reload persistence for formal business data.
- EventChannel listener success in actual DevTools.
- Product library click flow in GUI.

### Not Implemented
- Formal data layer.
- Formal guide group-order create/edit persistence.
- Formal group order product add/remove persistence.
- Customer ordering flow.
- Customer order formal management workflow.
- Payment confirmation or payment status history workflow.
- Production deployment.

## Validation Rule
Only mark an item complete when it has a matching validation signal. Lint or static inspection is enough for code-shape checks, but not for GUI behavior, real OpenID, cloud persistence, or real-user MVP closure.
