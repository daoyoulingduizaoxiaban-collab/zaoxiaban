import { callBusinessData, isCloudBusinessEnabled } from './cloudBusinessRepository';

// 测试环境「报Bug」反馈：走统一 businessData(feedbacks 资源)，地端(本地 server)/云端双通。
export const FeedbackRepository = {
  async create(payload = {}) {
    if (!isCloudBusinessEnabled()) return { success: false, error: '反馈服务未启用' };
    return callBusinessData({ resource: 'feedbacks', action: 'create', data: payload });
  },

  async list() {
    if (!isCloudBusinessEnabled()) return { success: false, error: '反馈服务未启用' };
    return callBusinessData({ resource: 'feedbacks', action: 'list', data: {} });
  },
};
