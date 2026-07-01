# MVP_COMPLETION_CHECKLIST

## 文件用途
本文件是从当前 QA/demo 小程序推进到真人可用 MVP 的总路线图。它不是当前执行任务单。

下一位 agent 要先看 `CURRENT_TASKS.md`，确认本轮使用者指定范围后，再回到本文件对照阶段与勾选状态。

本文件是已完成项、半成品、未完成项的主清单。不要把 MVP backlog 分散到 `CURRENT_TASKS.md`。

## 产品定义
- 产品：面向中国导游/领队的微信小程序。
- 核心流程：团单、本团商品、商品库、客户订单、收款状态。
- 产品 UI 必须使用简体中文。
- 不要擅自扩展到 marketplace、社交 feed、CRM、聊天或完整后台，除非使用者明确要求。
- 任何没有正式保存的操作，都必须清楚标示为本地/QA/demo 模式。

## 当前基线
- 当前仍是 QA/local mode。
- 正式资料层尚未确认。
- 正式 OpenID 登录尚未验证。
- 商品库已有 local/QA repository 实作。
- Phase 5 客户下单与收款闭环已有 local/QA repository 实作；正式云端保存尚未实现。
- 微信 DevTools GUI smoke test 尚未执行。

## 勾选规则
- 只有已经实作且有验证信号的项目才能打勾。
- local/mock/QA 实作不等于正式云端保存。
- 静态检查不等于 GUI 验证。
- 后面阶段局部完成，不代表前面正式化缺口已经完成。
- 如果项目只做了一半，正式项保持未勾，并新增后续补完项。
- 未完成 backlog 必须留在本文件，不要移到 `CURRENT_TASKS.md`。

## 已做一半，后续要补完
这些项目已有 local/QA 或设计基础，但还不能算真人可用 MVP 完成。

- [ ] Phase 1 资料层：建议方案和资料模型已写完；使用者确认、cloud/API repository 实作、正式持久化验证仍缺。
- [ ] Phase 2 登录：local adapter、mock fallback、profile 初始化、本地角色 scope 已有；真实 OpenID 换取、`authLogin`、云端 `users`、真实 session 角色验证仍缺。
- [ ] Phase 3 团单：已有 QA/local 展示与部分 repository 边界；正式新增/编辑/详情/商品绑定/重开后持久化仍缺。
- [ ] Phase 4 商品库：local/QA product repository 已实作；正式云端保存、GUI 验证、正式加入团单并持久化仍缺。
- [ ] Phase 6 UI 收敛：登录与部分业务文案已清理；starter 页面和未完成入口仍需完整产品化。
- [ ] Phase 7 GUI smoke test：静态检查曾通过；微信 DevTools/真机 route、点击、返回、表单、toast/modal、底部 tab 仍未验证。

## 尚未开始或尚未正式化
这些是明确剩余 backlog。除非使用者指定对应阶段，否则不要开始。

- [ ] 建立正式微信云开发环境/配置、云函数、集合、权限规则。
- [ ] 在既有 service/repository 边界后面实作 cloud/API repository。
- [ ] 实作正式导游团单工作流持久化。
- [x] 实作 Phase 5 local/QA 客户下单与客户订单管理。
- [x] 实作 local/QA 收款状态确认与状态历史。
- [ ] 完成 starter 页面全量删除或重写。
- [ ] 执行并记录完整 27-route GUI smoke test。
- [ ] 通过 Phase 8 真人可用 MVP gate。

## Phase 0 - 交接纪律
- [x] 项目文件已存在，并定义范围、规则、验收、任务与交接。
- [x] 默认验证命令已记录。
- [x] 禁止事项已记录。
- [ ] 每次后续任务结束后，文件都保持干净、同步、可接手。

## Phase 0.5-0.7 - Blocking Defect 修复
- [x] eventChannel opener/emit/navigation 失败防护。
- [x] 二维码为空或非法时不预览空图。
- [x] 客户订单 id 字符串/数字比对防护。
- [x] 商品库搜索与状态筛选路径一致。
- [x] message/chat socket null 防护。
- [x] 团单筛选后保留 `statusText`。
- [ ] eventChannel listener 成功路径已在微信 DevTools 验证。

## Phase 1 - 资料层决策与模型
- [x] 资料层建议方案已记录。
- [x] 资料模型与权限边界初稿已记录。
- [x] `mock/qaSeed.ts` 已记录为 QA/test 资料来源。
- [ ] 使用者确认正式资料层选择。
- [ ] Cloud/API repository 实作完成。
- [ ] 正式持久化经过 app 重新打开/重新载入验证。
- [ ] 所有业务流程都完成 page/service/repository 边界，不只 auth/product/customer-order 子集。

## Phase 2 - 登录与角色权限
- [x] Auth adapter / mock fallback 已存在。
- [x] 本地 profile 初始化已存在。
- [x] MVP 角色已定义：`guide`、`customer`、`owner/admin`；`provider` 已受限。
- [x] guide/customer/admin 本地可见范围已存在。
- [x] 主登录页已移除 starter 文案与无关登录入口。
- [ ] 正式 `wx.login` -> OpenID 换取已验证。
- [ ] `authLogin` 云函数已存在。
- [ ] 云端 `users` profile 初始化已存在。
- [ ] 真实 session 下的角色可见范围已在微信 DevTools 验证。
- [ ] owner/admin 入口已按真实边界实现，或清楚显示未完成。
- [ ] provider 入口已隐藏，或清楚显示暂不可用。

## Phase 3 - 导游团单工作流
- [ ] 导游团单 repository 使用正式资料来源，不只 QA/local seed。
- [ ] 导游只能从正式资料来源看到自己创建或被授权管理的团单。
- [ ] 团单列表支持 loading、空状态、错误状态、搜索/筛选无结果状态。
- [ ] 正式团单新增/编辑已存在。
- [ ] 正式团单详情已存在。
- [ ] 正式本团商品列表已存在。
- [ ] 正式加入/移除本团商品已存在。
- [ ] 缺失或未授权团单显示安全错误/返回状态。
- [ ] 完整导游流程在重新打开/重新载入后仍能保持。

## Phase 4 - 商品库
- [x] 商品列表在 local/QA 模式下已有角色范围。
- [x] 新增商品走 product service/repository 边界。
- [x] 商品包含名称、描述、图片、价格规则、状态、来源备注。
- [x] 价格规则计算数值总价，不只保存显示字串。
- [x] 上下架走 product service/repository 边界。
- [x] 软删除走 product service/repository 边界。
- [x] 搜索与状态筛选走同一条 service/repository 路径。
- [x] 必填验证、loading/submitting、成功、失败、空状态已存在。
- [ ] Product repository 从 local storage / QA seed fallback 切到已确认的正式资料层。
- [ ] 正式云端商品保存已存在。
- [ ] 商品库 GUI 流程已在微信 DevTools 验证。
- [ ] 商品可正式加入团单，并在重新打开/重新载入后保持。

## Phase 5 - 客户下单与订单管理
- [x] 使用者已明确指定开始 Phase 5。
- [x] 客户入口已定义：route params `/pages/customerOrders/edit/index?groupOrderId=...`。
- [x] 客户可以查看本团商品与价格。
- [x] 客户可以选择商品和数量。
- [x] local/QA 客户订单创建已存在。
- [x] 导游可以查看自己管理团单下的客户订单。
- [x] 客户只能查看自己的订单。
- [x] 收款状态已存在：未付款、客户已付款、已确认、已取消。
- [x] 导游可以确认收款或取消订单。
- [x] 收款状态变化可追溯。
- [x] local/QA 客户下单/收款流程在重新打开/重新载入后仍能保持。
- [ ] 正式客户订单创建已存在。
- [ ] 正式云端 customerOrders/payments/paymentStatusHistory 保存已存在。
- [ ] 正式客户下单/收款流程在重新打开/重新载入后仍能保持。
- [ ] Phase 5 GUI 流程已在微信 DevTools 验证。

## Phase 6 - UI 收敛
- [ ] starter 页面已删除或重写：home、message、dataCenter、release、search、login、setting。
- [ ] 可见导航只暴露 MVP 已就绪入口，或清楚标示未完成入口。
- [ ] 主流程文案一致使用团单业务语境。
- [ ] 表单都有验证与提交状态。
- [ ] 列表都有 loading、空状态、错误状态、正常状态、无结果状态。
- [ ] 未正式持久化的数据位置都有本地/QA/demo 模式提示。

## Phase 7 - GUI Smoke Test
- [ ] `app.json` 内所有 route 已在微信 DevTools 或真机打开。
- [ ] 底部 tab 状态已验证。
- [ ] toast/modal/floating button/tab 布局已验证。
- [ ] 表单输入、返回导航、重新进入已验证。
- [ ] 结果已写入 `ACCEPTANCE.md` 与 `HANDOFF.md`。

## Phase 8 - 真人可用 MVP Gate
声明真人可用 MVP 前，以下项目必须全部成立：

- [ ] 正式资料层已选择并实作。
- [ ] 正式登录/OpenID 与基础权限已验证。
- [ ] 导游核心工作流可持久化。
- [ ] 商品库可持久化。
- [ ] 客户下单与收款状态流程可持久化。
- [ ] 27-route GUI smoke test 通过。
- [ ] `npm run lint` 通过。
- [ ] `git diff --check` 通过。
- [ ] 没有把 mock/local fallback 包装成 production 行为。
