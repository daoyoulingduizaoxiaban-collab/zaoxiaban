import {
  callBusinessData,
  callPublicBusinessData,
  CLOUD_SAVE_MODE,
  isCloudBusinessConfigured,
  isCloudBusinessEnabled
} from './cloudBusinessRepository';

const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });

export const ProductRepository = {
  async listPublic(filters = {}) {
    if (isCloudBusinessConfigured()) {
      return callPublicBusinessData({ resource: 'products', action: 'listPublic', data: filters });
    }

    return unavailableError();
  },

  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'products', action: 'listVisible' });
    }

    return unavailableError();
  },

  async filterVisible({ keyword = '', status = 0 } = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'listVisible',
        data: { keyword, status },
      });
    }

    return unavailableError();
  },

  async getById(id) {
    const result = await this.listVisible();
    if (!result.success) return result;
    const product = (result.data || []).find(item => String(item.id || item._id) === String(id));
    return product
      ? { ...result, data: product }
      : { success: false, error: '未找到商品资料' };
  },

  async create(productData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'create',
        data: productData,
      });
    }

    return unavailableError();
  },

  async updateStatus(id, status) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'updateStatus',
        data: { id, status },
      });
    }

    return unavailableError();
  },

  async update(productData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'update',
        data: productData,
      });
    }

    return unavailableError();
  },

  async softDelete(id) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'softDelete',
        data: { id },
      });
    }

    return unavailableError();
  },
};

ProductRepository.cloudSaveMode = CLOUD_SAVE_MODE;
