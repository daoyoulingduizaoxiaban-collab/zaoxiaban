# DATA_LAYER_DECISION

## Decision Status
The user has confirmed the MVP direction: WeChat Cloud Database + Cloud Functions.

Current implementation status: formal login/OpenID uses WeChat Cloud through `authLogin`; business data persistence is still local/QA and must be moved behind cloud repository implementations before claiming production readiness.

## Non-Negotiable Boundary
- Pages must not directly call cloud database, cloud functions, API endpoints, storage, or `mock/qaSeed.ts` for business operations.
- Pages call services/repositories.
- Repositories can have local/mock, cloud, or API implementations.
- Mock/local fallback must be labeled as QA/demo mode.

## Option A - WeChat Cloud Database + Cloud Functions
Pros:
- Fastest path for a WeChat-only MVP.
- Direct OpenID integration.
- Lower early infrastructure cost.
- Good fit for guide-owned group orders, product library, and customer orders.

Cons:
- Strong WeChat ecosystem coupling.
- Cloud function/security-rule design must be disciplined.
- Future Web/admin/multi-platform expansion may require migration.

Best use:
- MVP stays primarily inside WeChat mini program.
- Team wants fastest route to real guide workflow.

## Option B - Explicit Backend API
Pros:
- Stronger long-term control over auth, permissions, audit, integrations, admin backend, and multi-platform clients.
- Clear central enforcement of ownership and role boundaries.

Cons:
- Higher upfront implementation and operations cost.
- Slower MVP start: API, database, deployment, auth, monitoring, and migrations are needed.

Best use:
- The product will soon need Web/admin/supplier systems, ERP/payment integrations, or non-WeChat clients.

## Recommendation
Use WeChat Cloud Database + Cloud Functions for MVP.

Implementation requirements after confirmation:
- Add cloud-backed repositories without changing page contracts.
- Use cloud functions for sensitive writes and permission checks.
- Use `users.openId` as identity anchor.
- Keep soft delete (`deletedAt`) for business records.
- Keep `mock/qaSeed.ts` only for QA/test data.

## Current State
- Formal data layer direction: confirmed for MVP.
- Cloud resources: `authLogin` cloud function deployed in environment `cloud1-3gwlqssy1f1972a9`; `users` profile initialization verified.
- Backend API: not created.
- Formal persistence: verified only for auth/users initialization, not for group orders, products, customer orders, payments, or payment status history.
