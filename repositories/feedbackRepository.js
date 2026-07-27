import { callBusinessData, callPublicBusinessData, isCloudBusinessEnabled, isCloudBusinessConfigured } from './cloudBusinessRepository';

// 测试环境「报Bug」反馈：走统一 businessData(feedbacks 资源)，地端(本地 server)/云端双通。
// create 走公开通道：报 Bug 不要求登录（未登录也要能报），云端按匿名落库。
export const FeedbackRepository = {
  async create(payload = {}) {
    if (!isCloudBusinessConfigured()) return { success: false, error: '反馈服务未启用' };
    return callPublicBusinessData({ resource: 'feedbacks', action: 'create', data: payload });
  },

  async list() {
    if (!isCloudBusinessEnabled()) return { success: false, error: '反馈服务未启用' };
    return callBusinessData({ resource: 'feedbacks', action: 'list', data: {} });
  },
};
