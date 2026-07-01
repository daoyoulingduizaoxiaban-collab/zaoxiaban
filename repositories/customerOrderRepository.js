import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { filterCustomerOrdersByRole } from '~/services/auth/roleScope';

export const CustomerOrderRepository = {
  async listVisible() {
    const profile = AuthService.getCurrentProfile();
    const groupOrders = QaSeedMock.getGroupOrders();
    const customerOrders = QaSeedMock.getCustomerOrders();

    return {
      success: true,
      data: filterCustomerOrdersByRole(customerOrders, groupOrders, profile),
      meta: {
        role: profile && profile.role,
        authSource: profile && profile.authSource,
        isMockOpenId: Boolean(profile && profile.isMockOpenId),
      },
    };
  },
};
