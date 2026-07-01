# CURRENT_TASKS

## 文件职责
`CURRENT_TASKS.md` 只回答「下一位 agent 现在该做什么」。不要在这里重复维护完整历史、总 MVP 清单或详细验收矩阵。

- 总 MVP 范围与阶段勾选：看 `MVP_COMPLETION_CHECKLIST.md`。
- 已完成内容、提交、验证记录、交接细节：看 `HANDOFF.md`。
- 验收结果与未验证项：看 `ACCEPTANCE.md`。
- 资料层建议与模型：看 `DATA_LAYER_DECISION.md`、`DATA_MODEL_AND_PERMISSIONS.md`。

## 当前任务
当前没有可自行展开的新开发任务。

下一位 agent 只能先做以下接手动作：

1. 读取 `MVP_COMPLETION_CHECKLIST.md`、`PROJECT_RULES.md`、`ACCEPTANCE.md`、`HANDOFF.md`、`QA_SEED_REQUIREMENTS.md`。
2. 执行 `git status --short --branch`，确认工作区状态。
3. 执行 `npm run lint` 与 `git diff --check`，确认既有提交没有基础质量问题。
4. 等待使用者明确指定下一轮范围；不要自行从后续候选任务中挑一个开做。

## 最新稽核状态
- Phase 0.7 稽核回修已完成并提交：socket null 防护、团单筛选 `statusText`、资料层「建议方案，待使用者确认」等状态已校正。
- Phase 4 商品库已完成本地/QA repository 版本并提交：列表、新增、搜索/状态筛选、上下架、软删除走 `ProductService` / `ProductRepository`。
- `MVP_COMPLETION_CHECKLIST.md` 上方仍有未勾项是正常状态：那些是正式资料层、正式 OpenID、云端保存、Phase 3 团单正式保存或 GUI 验证缺口，不代表 Phase 4 商品库本地/QA 版本漏做。
- 本次复查未发现 Phase 4 商品库代码含 Phase 5 客户下单、正式客户订单流程或收款确认闭环。
- 尚未做微信 DevTools GUI 验证；不能宣称视觉、点击路径或真机流程已通过。
- 尚未实现正式云端商品保存；当前商品保存是 local storage / QA 模式。
- 正式资料层仍未由使用者拍板；`DATA_LAYER_DECISION.md` 只是建议，不是已确认架构。

## 后续候选任务
以下只是候选，不是当前任务。必须等使用者明确指定后才能开始：

- GUI smoke test：连接既有微信 DevTools 环境，逐页验证 `QA_SEED_REQUIREMENTS.md` 的 route。
- 正式资料层确认后：把 auth/profile/product repository 从本地 fallback 切到微信云开发或后端 API。
- Phase 3：导游核心团单工作流正式保存。
- Phase 5：客户下单与订单管理闭环。
- Phase 6：UI 收敛与去 starter 化。

## 禁止事项
- 不要自行启动、重开、refocus 或反复 preview 微信 DevTools。
- 不要使用 `automator.launch(...)`。
- 不要推送远端、部署、创建云资源或删除正式资料，除非使用者明确要求。
- 不要提交 `resume/preview-info.json`、`resume/preview-qr.png`，除非使用者明确要求。
- 不要把 mock/local/QA fallback 写成正式 OpenID、正式云端保存或真人可用闭环。
