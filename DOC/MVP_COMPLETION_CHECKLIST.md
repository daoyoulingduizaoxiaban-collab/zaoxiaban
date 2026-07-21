# MVP_COMPLETION_CHECKLIST（已并入主文档）

本文件原有的 Gate A–J 开发/测试清单，已于 **2026-07-21 角色模型简化重构**时并入唯一可信源：

**→ `DOC/BUSINESS_LOGIC_PRINCIPLES.md`**

- 业务原则：该文件 **Part A**
- 角色能力矩阵：**Part B**
- 开发项 CHECKLIST：**Part C**
- 测试项 CHECKLIST：**Part D**

AGENT / CLAUDE 开发、测试、判断业务逻辑，一律以 `DOC/BUSINESS_LOGIC_PRINCIPLES.md` 为准，不再使用本文件的旧清单。

> 重构要点：`provider` 不再是角色（降为团主管理的供应商实体）；移除聊天（改订单/付款状态操作）；`customer` 登录即已审核、无需审核；`guide`（团主）是唯一需审核的用户角色，客户可申请升级且升级后保留客户身份（多角色 `roles[]` 追加不覆盖）。
