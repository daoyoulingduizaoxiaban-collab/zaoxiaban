import { callBusinessData, CLOUD_SAVE_MODE, isCloudBusinessEnabled } from './cloudBusinessRepository';

const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });

export const GroupOrderRepository = {
  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'groupOrders', action: 'listVisible' });
    }

    return unavailableError();
  },

  async filterVisible(keyword, status) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'listVisible',
        data: { keyword, status },
      });
    }

    return unavailableError();
  },

  async getById(id, options = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'getById',
        data: { id },
      });
    }

    return unavailableError();
  },

  async create(groupOrderData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'create',
        data: groupOrderData,
      });
    }

    return unavailableError();
  },

  async update(id, groupOrderData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'update',
        data: { id, data: groupOrderData },
      });
    }

    return unavailableError();
  },

  async addProducts(groupOrderId, products) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'addProducts',
        data: { groupOrderId, products },
      });
    }

    return unavailableError();
  },

  async removeProduct(groupOrderId, productId) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'removeProduct',
        data: { groupOrderId, productId },
      });
    }

    return unavailableError();
  },
};

GroupOrderRepository.cloudSaveMode = CLOUD_SAVE_MODE;
