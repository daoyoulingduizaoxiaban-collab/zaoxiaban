# HANDOFF

## Last Updated
- 2026-07-02

## 项目状态
- 路径：`/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan`
- 分支：`codex`
- 本轮未启动微信开发者工具 GUI。
- 本轮未联网、未安装套件、未部署、未推送远端。
- `resume/preview-info.json` 和 `resume/preview-qr.png` 仍是未跟踪文件，不要纳入提交，除非使用者明确要求。

## 本轮决策
- 产品定位固定为中国境内导游/领队开团管理小程序。
- 核心名词统一为「开团/团单」。
- QA seed 采用集中式 `mock/qaSeed.ts`，通过 `wx` storage 展示和重置。
- 本轮不强做正式保存；操作类功能统一提示「QA 展示模式，暂未保存」。
- 不存在的详情路由先改为弹窗或 toast，避免 QA 点击爆掉。
- 供应商和系统管理员先提供展示资料和未完成功能提示，权限模型待确认。

## 本轮修改文件
- `PROJECT_RULES.md`
- `README.md`
- `QA_SEED_REQUIREMENTS.md`
- `ACCEPTANCE.md`
- `CURRENT_TASKS.md`
- `HANDOFF.md`
- `codex-agent-report.md`
- `mock/qaSeed.ts`
- `mock/groupOrder/index.ts`
- `mock/product/index.ts`
- `enum/GroupOrderStatus.ts`
- `enum/MemberOrderStatus.ts`
- `enum/ProductStatus.ts`
- `config.js`
- `custom-tab-bar/index.js`
- `utils/utils.wxs`
- `pages/groupOrder/*`
- `sub-pages/groupOrder/*`
- `pages/productManagement/*`
- `sub-pages/product/*`
- `pages/customerOrders/*`
- `pages/providers/*`
- `pages/tourGuides/*`
- `pages/profile/*`
- `pages/my/*`
- `pages/search/index.js`
- `pages/home/index.js`
- `components/nav/index.js`

## 验证结果
- `npm run lint`：通过。
- `git diff --check`：通过。
- `git status --short --branch`：已检查，存在本轮修改和未跟踪 `resume/preview-*`，不要提交 preview 文件。

## 未完成
- 未做微信 DevTools GUI 验证。
- QA seed 尚未正式持久化业务操作。
- 角色权限、供应商管理、系统管理员功能仍待产品确认。
- 旧模板页面 home/message/dataCenter/release/search/login/setting 仍需逐步产品化。

## 下一位 agent 接法
1. 先读 `PROJECT_RULES.md`、`QA_SEED_REQUIREMENTS.md`、`ACCEPTANCE.md`、`CURRENT_TASKS.md`。
2. 不要重开 DevTools；如需 GUI 测试，连接既有 DevTools 环境。
3. 先跑 `npm run lint` 和 `git diff --check`。
4. 按 `CURRENT_TASKS.md` 的 GUI 测试清单逐页打开。
5. 重点验证团单主流程：列表 -> 详情 -> 本团商品 -> 商品库选择 -> 加入 -> 返回。
