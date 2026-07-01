# CURRENT_TASKS

## 文件职责
`CURRENT_TASKS.md` 是下一位 agent 的主要待办清单。这里不保留历史流水账，只保留：

- 当前接手步骤。
- 已做一半、必须补完的事项。
- 完全未做、等待使用者指定的事项。
- 禁止事项。

总 MVP 路线图看 `MVP_COMPLETION_CHECKLIST.md`；验收状态看 `ACCEPTANCE.md`；交接事实看 `HANDOFF.md`。

## 每次开始先做
1. 读取 `CURRENT_TASKS.md`、`PROJECT_RULES.md`、`MVP_COMPLETION_CHECKLIST.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`、`QA_SEED_REQUIREMENTS.md`。
2. 执行 `git status --short --branch`，确认是否有非本轮改动。
3. 不要靠聊天记忆判断项目状态；以文件和代码为准。
4. 只做使用者明确指定的范围，不要自行展开整份 MVP。

## 当前最高优先级
当前没有正在进行中的开发任务。

如果使用者没有指定新范围，下一位 agent 只需要做接手检查，不要自行开 Phase 3、Phase 5、正式云端或 GUI 验证。

## 已做一半，后续要补完
这些项目已有本地/QA 或设计基础，但还不能算正式 MVP 完成。使用者指定相关范围时，优先从这里补。

- [ ] Phase 1 资料层：`DATA_LAYER_DECISION.md` 已给建议，但使用者尚未确认正式资料层。确认前不要创建云资源、云函数、数据库集合或后端 API。
- [ ] Phase 1 资料层实现：页面到 service/repository 的边界已有部分落地，但 cloud/API repository 尚未实现，正式持久化也未验证。
- [ ] Phase 2 登录：auth adapter、mock fallback、本地 profile 初始化和角色 scope 已完成；正式 `wx.login` 换 OpenID、`authLogin` 云函数、云端 `users` 集合仍未建立或验证。
- [ ] Phase 2 权限：guide/customer/admin 的本地 role scope 已有；还需要在正式资料层和真实 session 下验证 guide 只能看自己/授权团单、customer 只能看自己的订单或分享团单。
- [ ] Phase 3 团单：已有 QA/local 团单展示与部分 repository 边界；正式团单创建、编辑、详情、团单商品加入/移除、重开后持久化尚未完成。
- [ ] Phase 4 商品库：本地/QA 商品库已完成 list/create/search/status filter/status toggle/soft delete，且走 `ProductService` / `ProductRepository`；正式云端商品保存、重开后正式持久化、微信 DevTools GUI 流程尚未验证。
- [ ] Phase 6 去 starter 化：主登录和部分业务文案已收敛，但 home、message、dataCenter、release、search、setting 等 starter 页面仍需按 MVP 重写、隐藏或标记未完成。
- [ ] Phase 7 GUI smoke test：静态检查和 lint 有跑过；微信 DevTools/真机 27-route GUI、点击、返回、表单、toast/modal、底部 tab 还没跑。

## 完全未做，等待使用者明确指定
这些不是当前任务。只有使用者明确要求时才开始。

- [ ] 正式微信云开发落地：配置 `cloudEnvId`、创建云函数、创建集合、实现权限规则、替换本地 repository。
- [ ] 明确后端 API 方案：如果不走微信云开发，需要设计并实现 API、数据库、部署、鉴权与运维。
- [ ] Phase 3 正式导游团单工作流：开团、编辑团单、管理本团商品，并验证正式保存。
- [ ] Phase 5 客户下单与客户订单闭环：分享/二维码入口、客户选购、订单创建、导游查看订单、客户查看自己订单。
- [ ] Phase 5 收款状态闭环：未付款、客户已付款、导游确认、取消、状态历史追踪。
- [ ] Phase 6 全量 UI 收敛：删除或重写非 MVP starter 功能入口，统一简体中文业务语境。
- [ ] Phase 8 real-user MVP gate：正式登录、正式资料层、导游核心流程、商品库、客户订单、GUI smoke test 全部通过后才能评估。

## 已完成但仍要守住的边界
- Phase 0.5/0.7 blocking defects 已修：eventChannel guard、QR 空值 guard、订单 id 型别 guard、socket null guard、团单筛选 `statusText`、商品筛选一致性。
- Phase 4 本地/QA 商品库不能被描述成正式云端保存。
- `mock/qaSeed.ts` 只能作为 QA/test seed，不可作为真人操作唯一资料来源。
- 所有正式业务读写都应继续走 service/repository 边界，不要让页面直接散落读写 storage、seed、云数据库或 API。

## 禁止事项
- 不要自行启动、重开、refocus 或 preview 微信 DevTools。
- 不要使用 `automator.launch(...)`。
- 不要推送远端、部署、创建云资源、删除正式资料、安装新套件或使用网络，除非使用者明确要求。
- 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`。
- 不要把 mock/local/QA fallback 写成正式 OpenID、正式云端保存或真人可用闭环。
- 不要开始 Phase 5，除非使用者明确指定 Phase 5。
