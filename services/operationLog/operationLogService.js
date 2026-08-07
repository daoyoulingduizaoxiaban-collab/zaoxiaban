import { OperationLogRepository } from '~/repositories/operationLogRepository';

export const OPERATION_LOG_FILTERS = Object.freeze([
  { label: '全部', value: 'all' },
  { label: '团单', value: 'groupOrder' },
  { label: '商品', value: 'product' },
  { label: '客户订单', value: 'customerOrder' },
  { label: '供应商', value: 'provider' },
  { label: '用户', value: 'user' },
]);

export const OperationLogService = {
  async listVisible(filters = {}) {
    return OperationLogRepository.listVisible(filters);
  },
};
