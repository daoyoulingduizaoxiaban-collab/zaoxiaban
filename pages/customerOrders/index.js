import { CustomerOrderRepository } from '~/repositories/customerOrderRepository';
import { AuthService } from '~/services/auth/authService';

Page({
  data: {
    titleText: '客户订单',
    customerOrdersList: [],
    roleScopeText: '',
    canCreateCustomerOrder: false,
  },

  onLoad() {
    this.loadQaOrders();
  },

  async loadQaOrders() {
    const res = await CustomerOrderRepository.listVisible();
    this.setData({
      customerOrdersList: res.data,
      roleScopeText: this.getRoleScopeText(),
      canCreateCustomerOrder: this.canCreateCustomerOrder(),
    });
  },

  canCreateCustomerOrder() {
    const profile = AuthService.getCurrentProfile();
    return Boolean(profile && (profile.role === 'guide' || profile.role === 'owner' || profile.role === 'admin'));
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!profile) return '未登录，仅显示空列表';
    if (profile.role === 'guide') return '仅显示你管理团单下的客户订单';
    if (profile.role === 'customer') return '仅显示你自己的客户订单';
    if (profile.role === 'owner' || profile.role === 'admin') return '当前为管理角色，可查看 QA 范围内客户订单';
    return '当前角色暂无客户订单权限';
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const normalizedId = String(id);
    const item = this.data.customerOrdersList.find(order => String(order.id) === normalizedId);
    wx.showModal({
      title: item ? item.title : '客户订单',
      content: item ? `状态：${item.statusText}\n客户：${item.customerName}\n金额：￥${item.totalPrice}\nQA 展示模式，详情页暂未开发。` : '未找到订单资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'customerOrders'
      });
    }
    this.loadQaOrders();
  },

  onGoToEdit(e) {
    if (!this.canCreateCustomerOrder()) {
      wx.showToast({ title: '当前角色不能新增客户订单', icon: 'none' });
      return;
    }

    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const url = id ? `/pages/customerOrders/edit/index?id=${id}` : '/pages/customerOrders/edit/index';

    wx.navigateTo({
      url: url,
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        } else {
          wx.showToast({ title: '打开订单表单失败', icon: 'none' });
        }
      }
    });
  }
});
