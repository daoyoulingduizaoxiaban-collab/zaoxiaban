# PAGE_MAP — 页面跳转契约

> **这份是什么**：全站 26 个页面的「谁能进 / 从哪进 / 带什么参数 / 出去哪 / 返回落在哪」的**唯一口径**。
> **怎么用**：动任何页面跳转前先查这份；改完跑 `node local-server/check-contract.js` 验证没违约。
> **和别的文件的分工**：`BUSINESS_LOGIC_PRINCIPLES.md` 定「业务上应该长怎样」（A12 入口编排、A13 鉴权闸门）；这份定「代码层面具体跳去哪」。欄位口径查 `FIELD_DICT.md`。
>
> **状态**：2026-08-25 全站扫描后建立。标 ⚠️ 的是**现况有问题、待收敛**，标 ❓ 的是**待拍板**。收敛完成后把标记拿掉。

---

## 0. 导航 API（只准用这几个）

全部在 `utils/navigation.js`：

| 函式 | 用途 |
| --- | --- |
| `navigateByUrl(url, options)` | 一般跳转。自动判断目标是不是 tab 页，是就走 `switchTab` |
| `redirectByUrl(url, options)` | 取代当前页（登录成功后用） |
| `navigateBackOrTab(fallbackUrl)` | 返回上一页；栈空时落到 `fallbackUrl` |
| `normalizeRouteUrl(value, fallback)` | 清洗外部传入的路径（防 `..`、防协议相对） |
| `parseRouteQuery(query)` / `consumeTabRouteQuery(path)` | tab 页取回被暂存的 query |

**禁止**页面直呼 `wx.navigateTo` / `wx.redirectTo` / `wx.switchTab` / `wx.reLaunch` / `wx.navigateBack`。
白名单：`utils/navigation.js` 自身、`custom-tab-bar/index.js`（tab 切换是框架机制）。

---

## 1. 页面总表

**权限栏**：`useAccessPage` = 用共享行为；`requireLogin` = 未登录导登录页；「自写」= 页面自己写 `canUseFeature` 判断。

### 1.1 Tab 页（5 个）

| 页面 | 接受参数 | 权限闸门 | 返回键 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/groupOrder/index` | 无 | `useAccessPage` + `GROUP_ORDERS`<br>⚠️ 无 `requireLogin`，改用空态登录 CTA | 无（tab 页） | `groupOrder/add?copyFrom=&from=`<br>`groupOrder/add?from=`<br>`groupOrder/detail?id=`<br>`login?redirectTo=` |
| `pages/customerOrders/index` | `orderId`<br>⚠️ 另接受 `id`（无来源）<br>`status` | `useAccessPage` + `CUSTOMER_ORDERS`<br>⚠️ 无 `requireLogin` | 无 | `customerOrders/edit?groupOrderId=`<br>`login?redirectTo=` |
| `pages/productManagement/index` | 无 | `useAccessPage` + `PRODUCTS` / `PRODUCT_MANAGE`<br>⚠️ 无 `requireLogin` | 无 | `product/add`（新增）<br>`product/add?id=`（编辑）<br>`product/list`<br>`providers/index`<br>`login?redirectTo=` |
| `pages/userReview/index` | 无 | `useAccessPage` + `requireLogin`<br>自写 `isOwnerOrAdmin` | 无 | 无 |
| `pages/my/index` | 无 | 自写（`onShow` 未登录 → `login?gate=1`） | 无 | `login?gate=1` ⚠️ `wx.reLaunch` 直呼<br>`login?redirectTo=`<br>`search?from=`<br>`dataCenter` / `setting` / `tourGuides` / `operationLogs`<br>`tourGuides/edit`（申请团主，不带 id） |

> ⚠️ **`consumeTabRouteQuery` 只有 `customerOrders` 会读**。`navigateByUrl` 对其余 4 个 tab 记下的 query（`utils/navigation.js:44` `rememberTabRouteQuery`）会永久残留在 storage。

### 1.2 团单与商品（sub-pages，6 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `sub-pages/groupOrder/detail/index` | `id`<br>`readonly=1`<br>⚠️ 另接受 `groupOrderId`（无来源） | 无 `useAccessPage`<br>靠后端回传 `canManageGroupOrder` 分流 | ⚠️ sub-nav 预设 `/pages/groupOrder/index`（未指定） | — |
| `sub-pages/groupOrder/productList/index` | `id`<br>⚠️ 另接受 `groupOrderId`、`productId`（皆无来源） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ⚠️ sub-nav 预设（未指定） | — |
| `sub-pages/groupOrder/add/index` | `from`（来源页）<br>`id`（编辑）<br>`copyFrom`（复制） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl` | ⚠️ 800ms → `navigateBackOrTab('/pages/groupOrder/index')` |
| `sub-pages/groupOrder/product-picker/index` | `from`<br>`excludeIds`（JSON） | `useAccessPage` + `requireLogin` + `GROUP_ORDER_CREATE` | ⚠️ 写了 `onBack` 但 wxml 没绑 → 实际走 sub-nav 预设 | 回 `sourceUrl` |
| `sub-pages/product/add/index` | `id`（编辑） | `useAccessPage` + `requireLogin` + `PRODUCT_MANAGE` | ⚠️ sub-nav 预设（未指定） | ⚠️ 立即（0ms）→ `/pages/productManagement/index`<br>另 emit `refreshList` 给开启方 |
| `sub-pages/product/list/index` | `productId`<br>⚠️ 另接受 `id`（无来源） | 无 `useAccessPage`<br>自写 `canUseBusiness` 决定走 `listVisible` / `listPublic` | ⚠️ 无返回键（wxml 用了 `<nav>`，但 `index.json` 与 `app.json` 都没注册该元件） | — |

### 1.3 目录与编辑页（8 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 保存成功后 |
| --- | --- | --- | --- | --- |
| `pages/tourGuides/index` | 无 | `useAccessPage` + `requireLogin` + `TOUR_GUIDES` | `nav navType=my`：栈>1 走 `wx.navigateBack` 直呼，否则 `/pages/my/index` | — |
| `pages/tourGuides/edit/index` | `id`（缺省用 `profile.id`） | 自写 `canUseFeature` + `isOwnerOrAdmin` + `hasRole(GUIDE)` | ⚠️ `onBack` 想去 `/pages/my/index`，**没绑** → 实际 `/pages/groupOrder/index` | 300ms → `/pages/my/index`<br>申请模式原地不跳，重跑 `initPage({})` |
| `pages/providers/index` | 无 | `useAccessPage` + `requireLogin` + `canUseProviderPortal`<br>❓ 无 featureKey | 无返回键 | — |
| `pages/providers/edit/index` | `id` | 自写 `canUseProviderPortal` | ⚠️ `onBack` 想去 `/pages/providers/index`，**没绑** → 实际 `/pages/groupOrder/index` | 300ms → `/pages/providers/index` |
| `pages/customerOrders/edit/index` | `groupOrderId`<br>`shareToken`<br>`scene`（扫码）<br>⚠️ 另接受 `id`（无来源） | 自写 `CUSTOMER_ORDER_CREATE` → `accessDenied` | ⚠️ `onBack` 没绑，但目标与 sub-nav 预设同值（`/pages/groupOrder/index`），行为恰好正确 | `showModal` 确认 →`/pages/customerOrders/index` |
| `pages/profile/index` | 无 | `useAccessPage` + `requireLogin` + `PROFILE` | `nav navType=my` | — |
| `pages/profile/edit/index` | `id`（缺省用 `profile.id`） | 自写 `PROFILE` + `isOwnerOrAdmin \|\| 本人` | ⚠️ `onBack` 想去 `/pages/my/index`，**没绑** → 实际 `/pages/groupOrder/index` | 300ms → `/pages/my/index` |
| `pages/my/info-edit/index` | 无 | 自写 `INFO_EDIT` | ⚠️ sub-nav 预设（未指定） | ⚠️ 600ms → `/pages/my/index` |

### 1.4 其余（7 个）

| 页面 | 接受参数 | 权限闸门 | 返回落点 | 出去哪 |
| --- | --- | --- | --- | --- |
| `pages/login/login` | `redirectTo`<br>`gate=1`<br>`tester` | 无 | ✅ sub-nav `fallback-url="/pages/my/index"`，`gate` 时隐藏返回键 | 登录后 `redirectByUrl(redirectTo)`，fallback `/pages/my/index` |
| `pages/search/index` | `from` | 自写 `SEARCH` | ✅ `custom-back` + `bind:back`，fallback = `sourceUrl \|\| /pages/my/index` | `groupOrder/detail?id=`<br>`customerOrders?orderId=`<br>`product/list?productId=` |
| `pages/operationLogs/index` | 无 | `useAccessPage` + `requireLogin` + `OPERATION_LOGS` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/dataCenter/index` | 无（只有 `onShow`，无 `onLoad`） | `useAccessPage` + `requireLogin` + `DATA_CENTER` | ✅ sub-nav `fallback-url="/pages/my/index"` | 无 |
| `pages/setting/index` | 无 | 自写 `INFO_EDIT` | ✅ sub-nav `fallback-url="/pages/my/index"` | `login?redirectTo=`<br>❓ `onEleClick` 有 url 跳转分支，但 `menuData` 无任何项带 `url` |
| `pages/message/index` | 无 | `useAccessPage` + `requireLogin` + `MESSAGE` | ⚠️ sub-nav 预设（未指定） | `customerOrders`（空态 CTA）<br>`customerOrders?orderId=&fromMessage=1`<br>⚠️ `fromMessage` 目的地从不读取 |
| `pages/feedback/index` | 无 | 只有 `config.isDev` 判断 | ⚠️ sub-nav 预设（未指定） | ⚠️ 800ms → `wx.navigateBack` **直呼** |

---

## 2. 进入来源反查

| 目标页 | 谁会跳进来 |
| --- | --- |
| `groupOrder/detail` | `groupOrder/index`（`?id=`）、`search`（`?id=`）、`groupOrder/productList`（⚠️ `wx.redirectTo` 直呼） |
| `groupOrder/add` | `groupOrder/index`（`?copyFrom=&from=` / `?from=`）、`groupOrder/detail`（⚠️ `?id=` **不带 `from`** → 从详情进编辑，返回会退到列表而非详情） |
| `groupOrder/productList` | `groupOrder/detail` |
| `groupOrder/product-picker` | ❓ 唯一呼叫点 `groupOrder/add` 的 `onSelectGoods`，但 wxml **没有任何 bind** → UI 不可达 |
| `product/add` | `productManagement`（新增 / `?id=` 编辑） |
| `product/list` | `productManagement`、`search`（`?productId=`） |
| `customerOrders/index` | tab、`message`（`?orderId=&fromMessage=1`）、`search`（`?orderId=`）、`customerOrders/edit` |
| `customerOrders/edit` | `customerOrders/index`（`?groupOrderId=`）、`groupOrder/detail` 的分享 / 小程序码（`?groupOrderId=&shareToken=`）、扫码 `scene` |
| `providers/index` | `productManagement` |
| `providers/edit` | `providers/index` |
| `tourGuides/index` | `my` |
| `tourGuides/edit` | `my`（⚠️ 不带 id）、`tourGuides/index`（带或不带 id） |
| `profile/edit` | `profile/index`（而 `profile/index` 本身已无入口 → 本页实际不可达） |
| `login` | `useAccessPage.requireLogin`（自动带 `redirectTo`）、`my`（`?gate=1`）、`groupOrder`、`customerOrders`、`productManagement`、`setting`、`my/info-edit`、`customerOrders/edit` |
| `search` / `dataCenter` / `setting` / `operationLogs` | `my` |
| `feedback` | `custom-tab-bar`（⚠️ `wx.navigateTo` 直呼，仅 `isDev` 注入） |
| **无任何入口** | ❓ `pages/message`、`pages/profile`（连带 `profile/edit`）、`pages/my/info-edit` |

---

## 3. 现况问题清单（待收敛）

### 3.1 返回键：11 页不管从哪进来都回团单列表

`components/sub-nav/index.js:16,42` 的 `fallbackUrl` 预设值是 `/pages/groupOrder/index`。在 wxml 上**明确指定** `fallback-url` 的只有 5 页：`dataCenter`、`operationLogs`、`setting`、`login`、`groupOrder/add`。其余全部吃预设。

更糟的是 4 个页面**写了正确的 `onBack` 却没绑到 wxml**，等于死码 + 错误行为：

| 页面 | `onBack` 想去 | 实际去 |
| --- | --- | --- |
| `providers/edit` | `/pages/providers/index` | `/pages/groupOrder/index` |
| `profile/edit` | `/pages/my/index` | `/pages/groupOrder/index` |
| `tourGuides/edit` | `/pages/my/index` | `/pages/groupOrder/index` |
| `groupOrder/product-picker` | `sourceUrl` | `/pages/groupOrder/index` |

全站只有 `groupOrder/add` 与 `search` 正确接上 `custom-back="{{true}}" bind:back`。

**收敛口径**：每个 sub-nav 页面都必须在 wxml 明确写 `fallback-url`，值取本表第 2 节的主要来源页。写了 `onBack` 就必须绑。

### 3.2 保存成功后：9 种写法

延迟有 0 / 300 / 600 / 800ms 四种；去向有 `navigateBackOrTab` / `navigateByUrl` / `wx.navigateBack` 直呼 / 原地不跳四种。

**收敛口径**：统一 **300ms → `navigateBackOrTab(来源页)`**。例外只有两类，且要在本表注明——① 下单成功需 `showModal` 让客户确认；② 团主申请提交后留在原页看状态。

### 3.3 参数双名，一半是死分支

| 目标页 | 实际有来源 | 死分支 |
| --- | --- | --- |
| `groupOrder/detail` | `id` | `groupOrderId` |
| `groupOrder/productList` | `id` | `groupOrderId`、`productId` |
| `customerOrders/index` | `orderId` | `id` |
| `customerOrders/edit` | `groupOrderId` | `id` |
| `product/list` | `productId` | `id` |

另有 `fromMessage=1` 由 `message` 传出，但 `customerOrders/index` 从不读取。

**收敛口径**：一个目标页一个参数名。详情类统一用 `id`；跨实体引用用 `<实体>Id`（如 `groupOrderId`）。删掉无来源的分支。

### 3.4 `wx.*` 直呼（未走 `utils/navigation.js`）

- `pages/my/index.ts:53` — `wx.reLaunch('/pages/login/login?gate=1')`
- `pages/feedback/index.js:17,52` — `wx.navigateBack`
- `sub-pages/groupOrder/productList/index.ts:129` — `wx.redirectTo`
- `components/nav/index.js:48` — `wx.navigateBack()`（栈>1 分支）

白名单（不算违规）：`custom-tab-bar/index.js` 的 `wx.switchTab`。

### 3.5 鉴权闸门覆盖不一致

- `requireLogin()`：11 页有，但三个主 tab（`groupOrder` / `customerOrders` / `productManagement`）**没有**，改用各自的空态 + 登录 CTA。
- `useAccessPage`：12 页有、14 页无；无的全部自写 `canUseFeature`。

---

## 4. 待拍板（❓）

| 项目 | 事实 | 建议 |
| --- | --- | --- |
| 三个主 tab 无 `requireLogin` | 用空态 + 登录 CTA，不是导向登录页。`A13` 写「不得停在原页显示登录后才有的数据或空列表」 | 算不算违反 A13 是产品判断 |
| 无入口页 | `pages/message`、`pages/profile`（连带 `profile/edit` 不可达）、`pages/my/info-edit` | 留或删 |
| `product-picker` UI 不可达 | 开团页已改内嵌新增商品（`add/index.wxml:77` 的 `#8` 注释），picker 是被取代的旧设计；但 `C-PRODUCT-LIB-SAVE` 立项未结 | 该立项还做不做 |
| `productManagement` tab | `custom-tab-bar/index.js:70` 永久过滤，但 `app.json` 与 `config.js` 仍保留该项 | 建议清掉配置残留 |
| `setting` 的 url 跳转分支 | `onEleClick` 有 `url` 分支，但 `menuData` 无任何项带 `url` | 建议删死分支 |
| `providers/index` 无 featureKey | 用 `canUseProviderPortal` 而非 `canUseFeature` | 统一到 featureKey？ |
| `components/nav` 的两个出口不可达 | `searchTurn` 无 bind；`openDrawer` 只在 `navType==='search'` 渲染，全站无页面用此 navType | 建议删死码 |
