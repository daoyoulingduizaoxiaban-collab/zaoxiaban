import { callBusinessData, CLOUD_SAVE_MODE, isCloudBusinessEnabled } from './cloudBusinessRepository';

const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });
const normalizeShareToken = value => String(value || '').trim();

export const CustomerOrderRepository = {
  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'customerOrders', action: 'listVisible' });
    }

    return unavailableError();
  },

  async listByGroupOrder(groupOrderId) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'listByGroupOrder',
        data: { groupOrderId },
      });
    }

    return unavailableError();
  },

  async getById(id) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'getById',
        data: { id },
      });
    }

    return unavailableError();
  },

  async getGroupOrderEntry(groupOrderId, options = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'getGroupOrderEntry',
        data: {
          groupOrderId,
          shareToken: normalizeShareToken(options.shareToken),
        },
      });
    }

    return unavailableError();
  },

  async create(orderData, options = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'create',
        data: {
          ...orderData,
          shareToken: normalizeShareToken(options.shareToken),
        },
      });
    }

    return unavailableError();
  },

  async updatePaymentStatus(id, nextStatus, note, payload = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'updatePaymentStatus',
        data: { id, nextStatus, note, ...payload },
      });
    }

    return unavailableError();
  },
};

CustomerOrderRepository.cloudSaveMode = CLOUD_SAVE_MODE;
