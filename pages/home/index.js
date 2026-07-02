import { AuthService } from '~/services/auth/authService';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    titleText: '工作台',
    modeText: '请先登录；正式 OpenID 登录后保存到微信云端，QA 身份仅本地测试。',
  },

  onLoad() {
    this.refreshModeText();
  },

  onShow() {
    this.refreshModeText();
  },

  refreshModeText() {
    const session = AuthService.getCurrentSession();
    const profile = AuthService.getCurrentProfile();
    const cloudEnabled = isCloudBusinessEnabled();
    let modeText = '请先登录；正式 OpenID 登录后保存到微信云端，QA 身份仅本地测试。';

    if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      modeText = '当前使用正式微信 OpenID，业务资料保存到微信云端。';
    } else if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      modeText = '当前使用本地/QA 身份，操作仅用于测试，不代表正式保存。';
    } else if (profile) {
      modeText = '当前未完成正式 OpenID 验证，业务操作会使用本地/QA 测试模式。';
    }

    this.setData({ modeText });
  },

  goGroupOrders() {
    wx.switchTab({ url: '/pages/groupOrder/index' });
  },

  goProducts() {
    wx.switchTab({ url: '/pages/productManagement/index' });
  },

  goCustomerOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },

  goRelease() {
    wx.switchTab({ url: '/pages/release/index' });
  },

  goDataCenter() {
    wx.switchTab({ url: '/pages/dataCenter/index' });
  },
});
