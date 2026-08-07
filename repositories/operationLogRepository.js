import { callBusinessData, isCloudBusinessEnabled } from './cloudBusinessRepository';

export const OperationLogRepository = {
  // 操作记录读真正的事件表（businessData 的 operationLogs.listVisible），
  // 各资源在 create/update/remove 成功后落库，删除的东西记录也还在。
  async listVisible({ type = 'all', startDate = '', endDate = '', page = 1, pageSize = 20 } = {}) {
    if (!isCloudBusinessEnabled()) return { success: false, error: '资料服务暂时不可用' };
    return callBusinessData({
      resource: 'operationLogs',
      action: 'listVisible',
      data: { type, startDate, endDate, page, pageSize },
    });
  },
};
