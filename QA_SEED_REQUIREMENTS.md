# QA_SEED_REQUIREMENTS

## 总原则
- 每个 `app.json` route 都要能给 QA 打开。
- 每个页面至少要覆盖：正常资料状态、空状态、错误/未完成提示状态。
- 功能尚未能保存时，QA 展示模式可以只稳定呈现资料，不必强做持久化。
- 操作类功能尚未能安全保存时，要显示 toast 或弹窗提示，不要造成页面异常。

## 角色资料需求
- 3 位写死测试用户：
- `林秝帆`：产品拥有者本人，角色为产品拥有者。
- `张领队`：领队/导游。
- `王客户`：客户。
- 供应商资料至少有可显示资料与未完成功能提示。
- 系统管理员资料至少有可显示资料与未完成功能提示。

## 团单资料需求
- 开放收单团单。
- 停止收单团单。
- 有客户订单的团单。
- 无客户订单的团单。
- 有商品的团单。
- 无商品的团单。

## 商品资料需求
- 上架商品。
- 下架商品。
- 有图片商品。
- 无图片商品。
- 阶梯价格商品。
- 长描述商品。

## 客户订单资料需求
- 未付款。
- 客户付款。
- 已确认。
- 已取消。

## Route QA 矩阵
| Route | 正常资料 | 空状态 | 错误/未完成提示 |
| --- | --- | --- | --- |
| `pages/productManagement/index` | QA 商品库列表 | 搜索无结果 | 新增/上下架/删除提示暂未保存 |
| `sub-pages/groupOrder/detail/index` | 团单统计、客户订单、二维码、客户下单入口 | 无客户订单团单 | 未找到团单提示 |
| `sub-pages/groupOrder/productList/index` | 本团商品 | 无商品团单 | 缺少团单 ID、商品详情暂未开发、移除暂未保存 |
| `sub-pages/groupOrder/product-picker/index` | 商品库选择 | 搜索无结果 | 未选择商品提示 |
| `sub-pages/product/add/index` | 商品表单和价格规则 | 未保存商品列表 | 表单校验、暂未保存 |
| `sub-pages/product/list/index` | QA 商品列表 | 搜索无结果 | 仅展示，不保存 |
| `sub-pages/groupOrder/add/index` | 新建团单表单 | 未选商品 | 表单校验、暂未保存 |
| `pages/groupOrder/index` | QA 团单列表 | 筛选无结果 | 加载失败 toast |
| `pages/tourGuides/index` | QA 导游/领队资料 | 无资料 | 详情页暂未开发提示 |
| `pages/tourGuides/edit/index` | 编辑表单 | 空表单 | 暂未保存 |
| `pages/customerOrders/index` | local/QA 客户订单、付款/确认/取消动作 | 无订单 | 角色无权限或操作失败 toast |
| `pages/customerOrders/edit/index` | 客户通过 `groupOrderId` 下单、商品数量与阶梯价计算 | 无可售商品 | 表单校验、本地/QA 保存提示 |
| `pages/providers/index` | QA 供应商资料 | 无供应商 | 供应商功能未完成提示 |
| `pages/providers/edit/index` | 编辑表单 | 空表单 | 暂未保存 |
| `pages/profile/index` | QA 用户资料 | 无资料 | 详情页暂未开发提示 |
| `pages/profile/edit/index` | 编辑表单 | 空表单 | 暂未保存 |
| `pages/home/index` | 工作台旧内容可打开 | 数据为空时应不崩 | 旧发布保存只作 QA 提示 |
| `pages/message/index` | 旧消息列表可打开 | 空消息 | 聊天详情需后续 QA |
| `pages/my/index` | QA Seed 数量、测试用户 | seed 重置后仍可显示 | 管理员/未完成入口提示 |
| `pages/search/index` | 搜索页可打开 | 空搜索 | 取消回到团单 tab |
| `pages/my/info-edit/index` | 个人资料编辑可打开 | 空表单 | 保存待后续收敛 |
| `pages/chat/index` | 聊天页可打开 | 空消息 | 聊天能力暂未启用 |
| `pages/login/login` | 登录页可打开 | 空输入 | 表单校验/跳转需 GUI 验证 |
| `pages/loginCode/loginCode` | 验证码页可打开 | 空输入 | 表单校验/跳转需 GUI 验证 |
| `pages/dataCenter/index` | 数据中心旧 mock 可打开 | 空图表 | 后续改为团单数据看板 |
| `pages/setting/index` | 设置页可打开 | 空配置 | 后续角色权限确认 |
| `pages/release/index` | 旧发布页可打开 | 空素材 | 保存/发布仅回工作台提示 |
