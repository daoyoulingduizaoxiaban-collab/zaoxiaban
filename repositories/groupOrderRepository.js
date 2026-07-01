import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { filterGroupOrdersByRole } from '~/services/auth/roleScope';

const withStatusText = item => item;

export const GroupOrderRepository = {
  async listVisible() {
    const profile = AuthService.getCurrentProfile();
    const groupOrders = QaSeedMock.getGroupOrders();
    const customerOrders = QaSeedMock.getCustomerOrders();
    const scoped = filterGroupOrdersByRole(groupOrders, profile, customerOrders);

    return {
      success: true,
      data: scoped.map(withStatusText),
      meta: {
        role: profile && profile.role,
        authSource: profile && profile.authSource,
        isMockOpenId: Boolean(profile && profile.isMockOpenId),
      },
    };
  },

  async filterVisible(keyword, status) {
    const result = await this.listVisible();
    const lowerKeyword = (keyword || '').toLowerCase();
    const statusValue = Number(status || 0);
    let filtered = result.data;

    if (statusValue !== 0) {
      filtered = filtered.filter(item => Number(item.status) === statusValue);
    }

    if (lowerKeyword) {
      filtered = filtered.filter(item => (
        (item.title || '').toLowerCase().includes(lowerKeyword)
        || (item.description || '').toLowerCase().includes(lowerKeyword)
      ));
    }

    return {
      ...result,
      data: filtered,
    };
  },
};
