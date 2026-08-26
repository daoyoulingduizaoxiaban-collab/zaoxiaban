# FIELD_DICT — 栏位字典

> **这份是什么**：8 个核心实体的栏位、型别、必填、校验规则，以及**每个栏位显示在哪些页面**的唯一口径。
> **怎么用**：做任何表单、卡片、详情弹窗之前先查这份；同一实体在第二个页面要显示，**必须走同一个共用元件 + 同一个 view model**，不准自绘。
> **和别的文件的分工**：`BUSINESS_LOGIC_PRINCIPLES.md` A5 定「有哪些实体、归属谁」；这份定「每个实体到底有哪些栏位、长什么样、显示在哪」。跳转查 `PAGE_MAP.md`。
>
> **状态**：2026-08-25 全站扫描后建立，2026-08-26 随删档/收敛更新。标 ⚠️ 的是**现况有问题、待收敛**，标 ❓ 的是**待拍板**。

---

## 0. 读这份之前必须知道的三件事

### 0.1 权威在云函数，不在 `models/` 也不在 `repositories/`

实际资料流是：

```
页面 → services/ → repositories/ → callBusinessData
                                        ├─ local  → local-server → cloudfunctions/businessData（同一份源码）
                                        └─ cloud  → wx.cloud.callFunction → cloudfunctions/businessData
```

`local-server/server.js:29-33` 直接 `require` 云函数源码。**地端与云端跑的是同一份程式码**，栏位口径以 `cloudfunctions/businessData/resources/*.js` 为准。

### 0.2 `repositories/*.js` 已经没有本地 storage 分支了

原本 4 个 repository 各有一层由 `config.allowSeedDataFallback` 控制的本地假资料分支，而该 key `config.js` 从未定义 → 100% 不可达。**2026-08-26 已整批删除**（决策 4，仓库层 1640 → 390 行）。

→ 现在仓库层只有一条路：走 `services/backend/backendCall` 到后端（地端或云端）。要测资料请用 `local-server/`。

### 0.3 `models/*.ts` 只是型别宣告，且多处已与实际资料失真

| Class | 状况 |
| --- | --- |
| `Product` | 有人 import，栏位大致对得上，但缺云端的 `ownerOpenId` / `visibility` |
| `GroupOrder` | 有人 import，⚠️ 只宣告 11 个栏位，云端实际有 27 个；靠 `Object.assign` 蒙混，型别实质失效 |
| `MemberOrder` | 有人 import，⚠️ 宣告的 `userId` 实际叫 `customerUserId`；`MemberProduct` 缺 `title`/`unitPrice`/`pictureUrl`，却多出 3 个没人写的调价栏位 |
| `Host` | ❓ 零 import，栏位与实际 provider 形状**完全无交集** |
| `Member` | ❓ 零 import |

---

## 1. users

**权威**：`cloudfunctions/businessData/resources/users.js`、`cloudfunctions/authLogin/index.js`

| 栏位 | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` / `_id` | string | 系统 | |
| `openId` | string | 系统 | 权限锚点，本地缓存不能当权限真相 |
| `unionId` | string | — | |
| `displayName` | string | ✅ | 显示名 |
| `name` | string | — | |
| `phone` | string | — | 填了要合 `/^1[3-9]\d{9}$/` |
| `city` | string | — | 登录回传，见 §1.3 E5/E6 |
| `gender` | number | — | 登录回传，见 §1.3 E5/E6 |
| `birth` | string | — | 格式 `YYYY-MM-DD`，不得晚于今天 |
| `introduction` | string | — | 登录回传，见 §1.3 E5/E6 |
| `avatarUrl` | string | — | 必须是 durable URL（`cloud://` / `https://` / 空） |
| `roles[]` | string[] | ✅ | **权限真相**。owner / admin / guide / customer |
| `role` | string | — | primary role，仅相容用，不得当唯一权限来源 |
| `roleLabel` / `displayRole` | string | — | 显示文案 |
| `roleExpiresAt` / `rolesExpireAt` | string | — | ⚠️ 双写，两边都要给 |
| `reviewStatus` | enum | ✅ | 见 §1.2 |
| `status` | string | — | `reviewStatus` 的相容别名 |
| `requestedRole` | string | — | 申请中的角色 |
| `reviewedBy` / `reviewedByUserId` / `reviewedAt` / `reviewRemark` | — | — | 审核轨迹 |
| `providerId` | string | — | 关联供应商实体 |
| `createdAt` / `updatedAt` | string | 系统 | |
| ❓ `guideApplication` | — | — | `A5` 有规范，**未实作** |

### 1.1 校验规则

| 规则 | 前端 | 云端（权威） |
| --- | --- | --- |
| 姓名必填 | ✅ `profile/edit`、`my/info-edit`、`tourGuides/edit` | ✅ `users.js:73` |
| 手机格式 | ✅ 同上三处 | ✅ `users.js:74-75` |
| 生日格式 `YYYY-MM-DD` | ❌ | ✅ `users.js:76-77` |
| 生日不得晚于今天 | ✅ `my/info-edit:240-243` | ✅ `users.js:78` |
| 头像必须 durable URL | ❌ | ✅ `users.js:169,206` |
| admin 不得指派 / 停用 owner | ❌ | ✅ `users.js:97-99,207-209` |
| 通过审核至少一角色 | 前端会补 `customer` 基线 | ✅ `users.js:105` |
| 拒绝 / 停用必填原因 | ✅ `userReview:224-228` | ❌ `reviewRemark` 允许空 |

### 1.2 状态值

`services/auth/roleScope.js:11-17` `REVIEW_STATUS` = `pending_review` / `approved` / `rejected` / `disabled` / `expired`
⚠️ 云端 `core.js:41-46` **没有 `expired`**。地端 `authService.js:262` 会产出 `'expired'`，云端 `assertApprovedProfile` 只认 `approved`。

### 1.3 显示位置

| 位置 | 显示栏位 |
| --- | --- |
| `pages/my/index.wxml:8-16` 个人卡 | `avatarUrl`、`displayName`、`roleLabel`、`authSourceText` |
| `pages/userReview/index.wxml:18` 审核卡 | `displayName`、`requestedRoleLabel`、`accountNote`、角色 chips、期限 |
| `pages/my/info-edit/index.wxml` | 姓名 / 性别 / 手机 / 生日 / 地区 / 简介 / 头像 |
| `pages/tourGuides/edit/index.wxml:18-21` | 团主名称 / 城市 / 手机 / 团主状态 |

✅ **E5 / E6 — 已修（2026-08-26）**：`city` / `gender` / `birth` / `introduction` 四栏原本云端登录不回传，前端又用空值写进 profile，经 `mergeProfileTimestamps` 的 `{...previous, ...nextProfile}` 把本机旧值盖掉（城市每次刷新登录被清空；性别/生日/简介只活在本机 storage，换装置即消失）。

两侧都修了：

- `cloudfunctions/authLogin/index.js` 的 `toClientProfile` 补回这四栏，`buildDefaultProfile` 一并种空值。**改了云函数要部署。**
- `services/auth/authService.js` 的 `pickPresent()`：云端没回传的栏位就不写进 profile。这是保险——云函数还没部署到的环境，本机旧值仍留得住。

口径：**登录回传的 profile 是这四栏的权威来源；前端只在云端明确给值时才覆写。**

---

## 2. providers

**权威**：`cloudfunctions/businessData/resources/providers.js`

| 栏位 | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 系统 | |
| `title` | string | ✅ | 供应商名称 |
| `contact` | string | ✅ | 联络人 / 联络方式 |
| `note` | string | — | 介绍 / 备注 |
| `statusText` | string | — | ⚠️ 自由文字，预设 `'可显示资料'`，**与 `status` 无关联校验** |
| `status` | string | — | `active` / `disabled` |
| `deletedAt` | string | 系统 | 软删 |
| `createdAt` / `updatedAt` | string | 系统 | |

**校验**：名称与联络人必填（前端 `providers/edit:118-125`、云端 `providers.js:42-43`）；已软删不得改状态（仅云端）；非 owner/admin 只能改自己的（仅云端）。

**显示位置**：

| 位置 | 栏位数 |
| --- | --- |
| `pages/providers/index.wxml:7` 列表卡 | 4：`title`、`stateLabel`、`contactText`、`noteText` |
| `pages/providers/index.ts:81`「查看资料」弹窗 | ⚠️ 3：少了 `title` |
| `pages/providers/index.ts:67` 无权限弹窗 | ⚠️ 2：只有 `contactText`、`noteText` |
| `pages/providers/edit/index.wxml` 表单 | `title` / `contact` / `note` / `statusText` |

---

## 3. 团单商品（`groupOrders.productList` 的元素）

> **没有 `products` 集合，商品不是独立实体**（B2 #8，OWNER 2026-08-26 最终定案）。
> 商品在开团页内嵌新增，直接写进团单文件的 `productList`，随团单一起生老病死。
> 商品库页、商品浏览页、商品表单页、选品页、`ProductService`、`ProductRepository`、
> 云端 `products` 资源与集合，**全部已删档**。

**权威**：`cloudfunctions/businessData/resources/groupOrders.js` 的 `validateNewProducts` 与 `syncGroupOrderProducts`。
**产生处**：`sub-pages/groupOrder/add/index.ts` 的 `addProductInline()`。

| 栏位 | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 系统 | 开团页产生，形如 `inline-<时间戳>-<乱数>`，只在本团单内唯一 |
| `title` | string | ✅ | 商品名称 |
| `priceSetting[]` | PriceSetting[] | ✅ | 至少一档，见 §3.1。云端 `validateNewProducts` 逐档验 |
| `status` | number | 系统 | 固定 `2`（上架）。客户下单页按 `status===2` 过滤，给别的值客户就看不到 |
| `pictureUrls[]` | string[] | — | 选填，上限 3 张（仅前端限制）；云端后端只收 `cloud://` / `https://` |
| `coverUrl` | string | 衍生 | `pictureUrls[0]`，开团页加入商品时算好 |
| `isImageFallback` / `imageFallbackText` | — | 衍生 | 由 `utils/productImage.js` 前端注入 |
| `priceDisplay` | string | 衍生 | **对外价格的唯一口径**，由 `utils/priceDisplay.js` 计算 |

`description`、`sourceNote`、`providerId`、`ownerUserId`、`visibility` 这些原本属于商品库实体的栏位**都没有了**——内嵌新增只填名称、价格档、图片三样。

> 落库时另有一份快照写进 `groupOrderProducts` 集合（`titleSnapshot` / `priceSnapshot` / `status` / `sortOrder`），供日后追溯用；读取端目前不读它。

### 3.1 PriceSetting（价格档）

| 栏位 | 型别 | 说明 |
| --- | --- | --- |
| `minQuantity` | number | 触发门槛数量。**第一档必须 = 1** |
| `unitPrice` | number | 该门槛下的单件价 |
| `totalPrice` | number | 该组合总价 |
| `description` | string | 优惠描述 |

**规则**（`75c18d2` / `ea7386e` 确立）：第一档 `minQuantity` 必须为 1；各档 `minQuantity` 逐档递增；各档 `totalPrice` 逐档递增。下单时走最优组合 DP 计价。

前端在开团页「按 + 加档」当下检查，云端 `groupOrders.js` 的 `validateNewProducts` 是权威版本，送出时再验一次。

### 3.2 显示位置（商品库删档后剩 4 处）

| 位置 | 栏位数 | 价格用什么 |
| --- | --- | --- |
| `sub-pages/groupOrder/productList/index.wxml:29-40` 本团商品列表卡 | 3 | `priceDisplay` |
| `sub-pages/groupOrder/productList/index.wxml:57-81` 本团商品详情弹窗 | 3 | `totalPrice` |
| `pages/customerOrders/edit/index.wxml:59-79` 客户下单商品列 | 6 | `priceDisplay` + `selectedRuleText` + `lineTotal` |
| `sub-pages/groupOrder/detail/index.wxml:113-121` 在售商品 | 3 | `priceTiers` |

**收敛口径**：`priceDisplay` 是唯一对外价格展示，格式化只有 `utils/priceDisplay.js` 一支（2026-08-26 已从七份收敛完成）。

---

## 4. groupOrders

**权威**：`cloudfunctions/businessData/resources/groupOrders.js`

| 栏位 | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 系统 | |
| `title` | string | ✅ | ≤ 20 字 |
| `description` | string | — | ≤ 200 字 |
| `status` | enum | ✅ | `1` 开放收单 / `2` 停止收单 |
| `statusText` | string | 衍生 | 不落库，显示端重算 |
| `startAt` | string | ✅ | 出团时间。用微信 date-time picker，禁自由文本 |
| `endAt` | string | ✅ | 收单截止。`shareExpiresAt` 由它推导 |
| `customerNotice` | string | — | 给客户的说明 |
| `productList[]` | Product[] | ✅ | 至少一件（仅前端校验） |
| `ownerUserId` / `ownerOpenId` | — | 系统 | |
| `guideUserId` / `guideOpenId` | — | 系统 | 归属的 guide principal |
| `authorizedGuideIds[]` / `authorizedGuideOpenIds[]` | — | 系统 | |
| `shareToken` / `shareExpiresAt` / `sharePath` | string | 系统 | 分享入口 |
| `qrCodeUrl` | string | 系统 | 进详情自动补生成并写回 |
| `createdAt` / `updatedAt` / `deletedAt` | string | 系统 | |
| ⚠️ `pickupNote` / `paymentNote` | string | — | **表单输入已移除**，且无兜底 → 恒为空。见 §4.3 E7 |
| `contactName` / `contactPhone` | string | — | 表单输入已移除，但云端 `normalizeGroupOrderPayload` 会用开团者的 `profile.displayName` / `profile.phone` 兜底（`resources/groupOrders.js:83-84`）→ **通常有值**，是刻意让客户看得到联络方式 |
| ⚠️ `memberOrderList[]` | — | — | 云端**无任何写入路径**，恒为 `[]` |
| `totalReceivable` / `totalReceived` / `totalCustomers` | number | 衍生 | 云端**无此栏位**，由 `groupOrderService.js:71-97` join 客户订单算 |
| `canManageGroupOrder` | boolean | 衍生 | 由 `customerOrderService.js:150` 前端注入 |

### 4.1 校验规则

| 规则 | 表单 | service | 云端（权威） |
| --- | --- | --- | --- |
| 名称必填 | ✅ | ✅ | ✅ |
| 名称 ≤20 / 描述 ≤200 | ⚠️ ❌ 超字要送出才报错 | ✅ | ✅ |
| `startAt` / `endAt` 必填 | ✅ | ✅ | ✅ |
| 至少一件商品 | ✅ | ❌ | ⚠️ ❌ 可建空商品团单 |
| 停止收单后唯读 | ✅ `guardReadOnly` | — | ⚠️ ❌ 直接呼叫 API 可改已停团 |
| ❓ `startAt < endAt` | ❌ | ❌ 明文放弃（`groupOrderService.js:27-29`） | ❌ |

### 4.2 状态值

`enum/GroupOrderStatus.ts` = `ALL=0` / `OPEN=1` / `STOPPED=2`。⚠️ 云端 `core.js:29-32` 无 `ALL`（云端用 `status=0` 当「不过滤」）。

### 4.3 显示位置

| 位置 | 栏位数 |
| --- | --- |
| `pages/groupOrder/index.wxml:45-51` 列表卡（管理者） | 6：`title`、`statusText`、`description`、`totalCustomers`、`totalReceived`、`totalReceivable` |
| 同上（客户视图） | 3：隐藏统计 |
| `sub-pages/groupOrder/detail/index.wxml:14-38` 详情基本卡 | 6：`title`、`statusText`、`description`、`startAt`、`endAt`、`qrCodeUrl` |
| `sub-pages/groupOrder/detail/index.wxml:49-63` 统计（仅管理者） | 3 |
| `pages/customerOrders/edit/index.wxml:20-28` 客户下单团单卡 | ⚠️ 9 |
| `sub-pages/groupOrder/add/index.ts:49-56` 开团表单 | 6 |

✅ **E7 — 客户下单页固定印「未填写」（2026-08-26 已修）**：`pickupNote` / `paymentNote` 的表单输入已在开团页移除（`groupOrderService.js` 与 `resources/groupOrders.js` 均注明「已按需求移除」）且**没有兜底**，所以恒为空，但下单页还在无条件渲染 → 每张团单卡固定印两行「未填写」。已改成有值才显示（`pages/customerOrders/edit/index.wxml:28-30`），写法跟同区块的「提示」一致。

> **订正**：本条原本写成「4 个栏位永远未填写」，实测后确认**只有 2 个**是这样。`contactName` / `contactPhone` 虽然表单也拿掉了，但云端会用开团者的 `profile.displayName` / `profile.phone` 兜底（`resources/groupOrders.js:83-84`），通常有值，是刻意要让客户看到联络方式——不是垃圾栏位。

---

## 5. customerOrders

**权威**：`cloudfunctions/businessData/resources/customerOrders.js`

| 栏位 | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 系统 | |
| `groupOrderId` | number | ✅ | |
| `customerUserId` / `customerOpenId` | — | 系统 | ⚠️ 云端归属判定用 `customerOpenId`。**目前一律写成「提交这笔订单的人」**，团主代下单时会写成团主自己 → 被代下单的真客户看不到这笔订单（见下方待开发栏位） |
| `guideUserId` / `guideOpenId` | — | 系统 | |
| `customerName` | string | ✅ | |
| `customerPhone` | string | ✅ | 11 码格式 |
| `title` | string | 衍生 | 样板字串 |
| `status` | enum | ✅ | `0` 未付款 / `1` 已付款 / `2` 已确认 / `3` 已取消 |
| `paymentStatus` | — | 衍生 | `status` 镜像 |
| `statusText` | string | 衍生 | |
| `totalPrice` | number | ✅ | **服务端权威重算**，丢弃 client 传的值（`51763d8`） |
| `originalTotalPrice` | number | 衍生 | |
| `items[]` | — | ✅ | 至少一件；每项 `amount>0` 且 `totalPrice>0` |
| `productList[]` | — | 衍生 | 与 `items` 互为镜像 |
| `memberRemark` | string | — | 客户备注 |
| `hostRemark` | string | — | 团主备注 |
| `paymentMethod` | string | ✅（声明付款时） | |
| `paymentRemark` | string | — | |
| `paymentProofUrls[]` | string[] | — | **选填**（`A6`）。上限 3 张（仅前端）；必须 durable URL（仅云端） |
| `declaredAmount` | number | ✅（声明付款时） | `> 0` 且 `≤ totalPrice` |
| `confirmedAmount` | number | ✅（确认收款时） | `> 0` 且 `≤ declaredAmount \|\| totalPrice` |
| `confirmRemark` / `cancelRemark` | string | — | 取消原因必填（前端） |
| `paymentHistory[]` | — | 系统 | 见 §7 |
| `itemCount` / `historyCount` | number | 衍生 | 由 `customerOrderService.js:73-74` 注入 |
| `createdAt` / `updatedAt` / `cancelledAt` | string | 系统 | |

> **⚠️ 待开发栏位——代客下单（OWNER 决策 14，2026-08-27）**
>
> 团主代客下单必须记录「是帮谁下的」，现况**一栏都没有**，只有 `customerName` / `customerPhone` 两个文字栏，
> 且 `customerOpenId` 会写成团主自己。**已拍板要绑真实客户帐号**（决策 14 细则，2026-08-27）：对得上就绑，
> 对不上先留待认领，客户日后注册再自动绑。规格见 `BUSINESS_LOGIC_PRINCIPLES.md` A6「代下单订单的归属与认领」。
>
> 至少要有这几栏（名称待实作时定，语义不可少）：
>
> | 语义 | 说明 |
> | --- | --- |
> | 是不是代下单 | 布林或来源标记，团主端与客户端都要能分辨 |
> | 代下单的团主 | principal（userId + openId）。**绑定后也不得抹去** |
> | 认领状态 | 待认领 / 已绑定。待认领时 `customerOpenId` 为空 |
> | 认领依据 | 绑定时用的手机号，与绑定时间 |
>
> ⚠️ **两题未确认，别先动码**：① 自动绑定的触发点（手机号从哪来）② 是否只接受微信验证过的手机号（防冒领）。
> 见开发项 **`C-PROXY-ORDER`**（`BUSINESS_LOGIC_PRINCIPLES.md` Part C · C5），画面契约见 `PAGE_MAP.md` §5。

### 5.1 状态流转

`0 未付款` →（客户声明付款 / 团主**代登记付款**）→ `1 已付款` →（团主确认收款）→ `2 已确认`
任一非终态 →（取消）→ `3 已取消`。已确认 / 已取消不可再变更。

> 「团主代登记**付款**」（把已收到的钱补记到既有订单上）与「团主**代客下单**」（替客户建一笔新订单）是两件事，
> 前者已实作、后者未实作（决策 14）。别混用。

**同一客户可在同一团单下多次下单**，每次都是独立一笔，各自走各自的状态流转（决策 15），不合并。

### 5.2 金额校验 ✅ 已收敛成一份（2026-08-25）

| 规则 | 操作面板 | 团单详情弹窗 | service | 云端（权威） |
| --- | --- | --- | --- | --- |
| `declaredAmount > 0` | ✅ | — | ✅ | ✅ |
| `declaredAmount ≤ totalPrice` | ✅ | ❌ | ⚠️ ❌ | ✅ |
| `confirmedAmount > 0` | ✅ | ✅ | ✅ | ✅ |
| `confirmedAmount` 上限 | ⚠️ `totalPrice` | ⚠️ `declaredAmount \|\| totalPrice` | ✅ | `declaredAmount` 优先 |

✅ **E1／E9 已修**：上限规则原本三处各写一份（面板用订单总额、团单详情弹窗用申报额优先、云端用申报额优先），现已收敛成 `services/customerOrder/orderAmount.js` 的 `getConfirmedAmountError` / `getDeclaredAmountError`，面板、团单详情、服务层三处都 import 它，与云端逐条对齐。

**唯一口径**：`confirmedAmount` 上限 = `declaredAmount || totalPrice`。金额一律先转数再判 finite（`toAmount`）——`Number('abc')` 是 NaN，而 `NaN <= 0` 与 `NaN > 上限` 都是 false，直接用 `Number(x || 0)` 判会让非数字字串两道校验全过。云端同款 helper 在 `lib/core.js`，**改一边要改两边**。

### 5.3 首单「是否已声明付款」✅ 已对齐（2026-08-25）

| 位置 | 判定依据 |
| --- | --- |
| 云端 `customerOrders.js:201`（权威） | 只看 `paymentMethod` 有无 |
| `customerOrderService.js` | ✅ 已改用 `hasInitialPayment(payload)`，只看 `paymentMethod`，与云端一致 |
| （死码）`customerOrderRepository.js:353-355` | `paymentMethod` **且** 有凭证 |

✅ **E2 已修**。另：云端 `create` 现在会把客户送来的申报额**夹到服务端重算的订单金额以内**，并把夹逼后的值写进付款历史——原本订单上的值夹住了、历史那笔还记着虚报值且会显示给团主看。

### 5.4 「已收 / 应收」✅ 已统一（2026-08-25）

| 口径 | 已收 | 应收 |
| --- | --- | --- |
| `groupOrderService.js:81-86`、`customerOrderService.js:136-144`、`dataCenter/index.ts:65,75` | `status===CONFIRMED(2)` 的 `confirmedAmount \|\| totalPrice` | 排除 `CANCELLED(3)` |

✅ **E3 / E4 已修**：`models/GroupOrder.ts` 的 `recalculateTotals` 已删除（它用错的订单状态、应收还含已取消，且依赖云端恒为 `[]` 的 `memberOrderList`，本就无执行路径）。**唯一口径以 `groupOrderService.js` 为准。**

### 5.5 状态文案 ⚠️ 4 份独立 map

`enum/MemberOrderStatus.ts:9-14`、`customerOrderRepository.js:36-44`（死码）、`core.js:57-62`（云端）、`utils/utils.wxs:31-37`（wxs 不能 import，只能各写一份）。任一份改动不会同步。

### 5.6 显示位置 ⚠️ 同一实体 11 处

| 位置 | 栏位数 | 缺什么 |
| --- | --- | --- |
| `pages/customerOrders/index.wxml:30-35` 列表卡 | 6 | |
| `components/order-detail/index.wxml:6-52` 详情弹窗 | **13** | ← **基准** |
| `sub-pages/groupOrder/detail/index.wxml:72-88` 订单卡（管理者） | 5 | 内嵌自绘 |
| `sub-pages/groupOrder/detail/index.wxml:129-141` 订单卡（客户） | 4 | 内嵌自绘，无 `customerName` |
| `sub-pages/groupOrder/detail/index.wxml:169-197` 明细弹窗 | **9** | ⚠️ 内嵌自绘，缺 `paymentRemark`、`displayHistory`、`paymentProofUrls`、`customerName` |
| `pages/customerOrders/edit/index.wxml:38-54` 下单表单 | 6 | |
| `components/order-action-panel` 三种模式 | 4 / 2 / 1 | 声明付款 / 确认收款 / 取消 |
| `sub-pages/groupOrder/detail/index.wxml:210-223` 确认收款弹窗 | 3 | 内嵌自绘 |

⚠️ **付款凭证的呈现三种都不同**：列表页有「查看凭证」按钮可点；`order-detail` 只显示张数文字不可点；团单详情明细弹窗**完全不显示凭证**。

**收敛口径**：view model 转换抽到 `services/customerOrder/orderViewModel.js`，卡片与弹窗全站走 `<order-detail>` / `<order-action-panel>`，角色差异用参数控制，禁止第二页自绘。

---

## 6. groupOrderProducts（团单商品快照）

**只写不读**——`resources/groupOrders.js:104-116` 写入，全专案零读取路径。

| 栏位 | 说明 |
| --- | --- |
| `groupOrderId` / `productId` | |
| `priceSnapshot` | `product.priceSetting \|\| priceSettings` |
| `titleSnapshot` | |
| `status` | 预设已上架 |
| `sortOrder` | ⚠️ 恒为 0，无任何来源设定过 |
| `createdByUserId` / `createdByOpenId` | |
| `createdAt` / `updatedAt` / `deletedAt` | 软删于 `removeProduct` |

❓ `A5` 要求含「供应商实体快照」，**未实作**（无 `providerSnapshot` / `providerId`）。无任何校验。

---

## 7. payments / paymentStatusHistory

### payments

只在订单转 `CONFIRMED` 时写入（`resources/customerOrders.js:333-350`）。栏位：`customerOrderId`、`groupOrderId`、`amount`、`declaredAmount`、`confirmedAmount`、`method`、`status`（固定 `'confirmed'`）、`confirmedByUserId`、`confirmedByOpenId`、`confirmedAt`、`note`、`createdAt`、`updatedAt`。

**零读取路径、零页面、零校验。**

### paymentStatusHistory

栏位：`customerOrderId`、`fromStatus`、`toStatus`、`actorUserId`、`actorOpenId`、`actorName`、`actorRole`、`amount`、`paymentMethod`、`proofCount`、`note`、`createdAt`。

⚠️ 云端**双写**：独立 collection（`:88`）+ 订单内嵌阵列（`:328`），两份无同步机制。实际被读的**只有内嵌阵列**（`pages/customerOrders/index.ts:244-252` → `order-detail/index.wxml:47-51`），显示 7 栏。

---

## 8. operationLogs

**权威**：`cloudfunctions/businessData/lib/core.js:439-455` `logOperation`、`resources/operationLogs.js`

真事件表（`231b988` 改造），追加写入不可编辑。

| 落库栏位 | 是否回传前端 |
| --- | --- |
| `occurredAt` | ✅ |
| `actorName` / `actorRole` | ✅（记 `effectiveRole` 的 label） |
| `actorUserId` / `actorOpenIdMasked` | ❌ 不回传（openId 已脱敏） |
| `resourceType` | ✅ 转成 `type` + `typeText` |
| `resourceTitle` | ✅ 转成 `resourceText` |
| `resourceId` / `action` | ❌ 不回传 |
| `actionText` | ✅ |
| `changes[]` | ✅ `{field, label, before, after}` |
| `visibleUserIds[]` | ❌ 仅用于过滤 |
| — | ⚠️ `result` 前端固定收到 `'成功'`（硬编码，落库时不记成败） |

**写入点**：product（新增/上下架/编辑/删除）、groupOrder（开团/编辑/删除/本团新增商品/本团移除商品）、customerOrder（客户下单/声明付款/确认收款/取消订单）、provider（新增/编辑/上下架/删除）、user（审核用户/申请成为团主）。

**规则**：非 owner/admin 只见 `visibleUserIds` 内的记录；硬上限 500 笔；角色需 guide/owner/admin。
⚠️ 开始日期 ≤ 结束日期只有前端检查，云端 start>end 时静默回空。

---

## 9. 待拍板（❓）

| 项目 | 事实 | 建议 |
| --- | --- | --- |
| ~~`repositories/*` 本地 seed 分支~~ | ✅ 已整批删除（2026-08-26，决策 4） | 仓库层 1640 → 390 行；边界规则见 `DEVELOPMENT_GUIDE` §1.1 |
| ~~`models/Host.ts` / `Member.ts`~~ | ✅ 已删除（2026-08-26，决策 9） | 零 import，栏位与实际形状无交集 |
| `models/GroupOrder.ts` / `MemberOrder.ts` / `Product.ts` | 宣告与云端实际严重失真（`Product.ts` 现在只用于开团页的内嵌商品型别） | 补齐或降级为纯型别档 |
| `groupOrderProducts` 缺供应商快照 | `A5` 有要求，未实作；商品库删档后内嵌商品也不带 `providerId` | 这条要不要跟着取消 |
| `payments` 独立表零读取 | 只写不读 | 留着追溯用？ |
| ~~`groupOrders.startAt < endAt` 不验~~ | ✅ 已补（2026-08-26，决策 10）：出团不得晚于收单截止，前后端各一道，文案一致 | 权威版本在云端 `groupOrders.js` |
| `users.guideApplication` | `A5` 有规范，未实作 | |
| `REVIEW_STATUS.expired` 云端没有 | 地端会产出，云端不认 | 建议云端补上 |
| ~~子页面的三态栏位永远在说谎~~ | ✅ 已修（2026-08-26，决策 8）。原本 `sub-pages/groupOrder/add`、`groupOrder/productList`、商品表单页、选品页都挂了 `useAccessPage`（data 里带 `pageState` / `authReady` / `isLoggedIn`）却自己用 `isPageLoading` / `accessDenied` 画画面，那几个栏位从初始值起没人更新过，冒烟因此被骗过一次。现在存活的三页都接上 `page-state` 走统一三态，另两页已随删档消失 | 新页照 `DEVELOPMENT_GUIDE` §6 接 `page-state`；`check-contract.js` 的 C2 会挡「用了元件没注册」 |
