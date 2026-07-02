# DATA_MODEL_AND_PERMISSIONS

## 目的
本文件是资料模型与权限边界说明。当前 MVP 已采用微信云开发数据库 + 云函数，并通过 service/repository 边界接入；完整 27-route GUI smoke test 仍未完成。

`mock/qaSeed.ts` 后续只保留为测试资料来源和 QA 展示 seed，不可作为真人操作的唯一资料来源。正式页面应通过资料存取层读取 mock/cloud/API，而不是直接散落读取 seed、storage 或数据库 SDK。

## 角色定义
- `owner`：产品拥有者或最高业务管理者，可查看全站业务资料与配置。
- `admin`：运营管理员，可按授权范围管理资料，但默认不等同于 owner。
- `guide`：导游/领队，管理自己创建或被授权的团单、商品和客户订单。
- `customer`：客户，只能查看自己下过的订单，或通过分享进入指定团单下单。
- `provider`：供应商，后续可维护自己提供的商品或服务资料；MVP 可先不开放后台。

## users
用途：保存微信身份、业务角色与基础资料。

建议字段：
- `id`
- `openId`
- `unionId`
- `role`
- `displayName`
- `phone`
- `avatarUrl`
- `status`
- `createdAt`
- `updatedAt`

权限边界：
- owner：可查看和管理全部用户资料，敏感字段需审计。
- admin：可查看授权范围内用户，可调整非 owner 用户状态，不能越权提升自己。
- guide：可查看和编辑自己的基础资料。
- customer：可查看和编辑自己的基础资料。
- provider：可查看和编辑自己的供应商联系人资料。

## groupOrders
用途：团单主表，保存导游开团资料与收单状态。

建议字段：
- `id`
- `ownerUserId`
- `guideUserId`
- `title`
- `description`
- `status`
- `startAt`
- `endAt`
- `pickupNote`
- `paymentNote`
- `contactName`
- `contactPhone`
- `customerNotice`
- `qrCodeUrl`
- `sharePath`
- `createdAt`
- `updatedAt`
- `deletedAt`

权限边界：
- owner：可查看和管理所有团单。
- admin：可查看和管理授权范围内团单。
- guide：可创建团单；只能查看、编辑、关闭自己创建或被授权管理的团单。
- customer：只能通过分享或自己的订单关联读取指定团单的可下单信息。
- provider：默认不可查看团单；若后续需要履约视角，只能看关联商品的最小必要信息。

## products
用途：商品库主表，保存导游可加入团单的商品。

建议字段：
- `id`
- `ownerUserId`
- `providerId`
- `title`
- `description`
- `pictureUrls`
- `priceSettings`
- `status`
- `sourceNote`
- `createdAt`
- `updatedAt`
- `deletedAt`

权限边界：
- owner：可查看和管理所有商品。
- admin：可查看和管理授权范围内商品。
- guide：可查看可用商品；可创建和管理自己名下商品；不能修改其他导游或供应商私有商品。
- customer：只能在指定团单中看到已加入且可售的商品信息。
- provider：可查看和维护自己提供的商品资料，不能查看其他供应商成本或非授权团单数据。

## groupOrderProducts
用途：团单与商品的关联表，保存某团单已加入商品及团单内排序、状态或价格快照。

建议字段：
- `id`
- `groupOrderId`
- `productId`
- `priceSnapshot`
- `titleSnapshot`
- `status`
- `sortOrder`
- `createdByUserId`
- `createdAt`
- `updatedAt`
- `deletedAt`

权限边界：
- owner：可查看和管理所有关联资料。
- admin：可查看和管理授权范围内关联资料。
- guide：只能为自己创建或被授权的团单加入、移除、调整商品。
- customer：只能查看指定团单中已上架、可下单的关联商品。
- provider：默认不可改团单商品关联；若被授权，只能查看自己商品在团单中的履约必要信息。

## customerOrders
用途：客户订单主表，记录客户在团单内提交的订单。

建议字段：
- `id`
- `groupOrderId`
- `customerUserId`
- `customerName`
- `customerPhone`
- `items`
- `totalPrice`
- `status`
- `paymentMethod`
- `paymentRemark`
- `paymentProofUrls`
- `confirmedAmount`
- `confirmRemark`
- `paymentStatus`
- `createdAt`
- `updatedAt`
- `cancelledAt`

权限边界：
- owner：可查看所有客户订单，可做运营管理动作。
- admin：可查看和处理授权范围内订单。
- guide：只能查看和处理自己团单下的客户订单，可确认收款或取消订单。
- customer：只能查看和取消自己订单，不能确认收款。
- provider：默认不可查看客户个人资料；若履约需要，只能查看已脱敏或最小必要订单项。

## payments
用途：保存付款记录或人工收款确认记录。若 MVP 不接真实支付，可先用人工收款记录。

建议字段：
- `id`
- `customerOrderId`
- `groupOrderId`
- `amount`
- `confirmedAmount`
- `method`
- `status`
- `confirmedByUserId`
- `confirmedAt`
- `note`
- `createdAt`
- `updatedAt`

权限边界：
- owner：可查看和管理所有收款记录。
- admin：可查看和处理授权范围内收款记录。
- guide：只能查看自己团单订单的收款记录，并执行确认收款。
- customer：只能查看自己订单的付款状态，不可修改确认状态。
- provider：默认不可查看付款资料。

## paymentStatusHistory
用途：记录订单付款状态变化，用于追溯「未付款、客户付款、已确认、已取消」等状态。

建议字段：
- `id`
- `customerOrderId`
- `fromStatus`
- `toStatus`
- `actorUserId`
- `actorRole`
- `note`
- `createdAt`

权限边界：
- owner：可查看所有状态历史。
- admin：可查看授权范围内状态历史。
- guide：可查看自己团单订单的状态历史，可新增确认收款或取消记录。
- customer：可查看自己订单相关状态历史，可新增客户付款声明。
- provider：默认不可查看付款状态历史。

## 资料存取层边界
- 页面层只调用业务 repository/service，不直接读取正式数据库、云函数、API、storage 或 `mock/qaSeed.ts`。
- mock repository 可继续从 `mock/qaSeed.ts` 读取，供 QA 展示与本地开发使用。
- cloud/API repository 后续由使用者确认资料层后再实现。
- 所有写操作必须返回 `{ success, data, error }` 或等价结构，并让 UI 呈现 loading、成功、失败状态。
- 删除建议默认软删除：设置 `deletedAt`，避免误删真人资料。

## Current Gaps
- Formal `users` initialization is implemented through `authLogin`.
- Business collections are created on first `businessData` execution and wired to repositories: `groupOrders`, `products`, `groupOrderProducts`, `customerOrders`, `payments`, `paymentStatusHistory`.
- Cloud permission checks are implemented in `businessData`; pages do not directly access cloud DB.
- Formal WeChat OpenID binding is verified for the current DevTools user through `authLogin`.
- Owner/admin role assignment still needs cloud-function environment allowlists: `OWNER_OPENIDS` / `ADMIN_OPENIDS`.
- Cloud repository boundaries exist for core business data, with local/QA fallback for mock identities.
- Formal business persistence has targeted verification; full 27-route GUI smoke is still pending.
