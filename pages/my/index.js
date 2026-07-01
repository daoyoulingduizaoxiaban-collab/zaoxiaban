import useToastBehavior from '~/behaviors/useToast';
import { QaSeedMock } from '~/mock/qaSeed';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    service: [],
    personalInfo: {},
    qaSeedInfo: {},
    gridList: [
      {
        name: '团单',
        icon: 'root-list',
        type: 'all',
        url: '/pages/groupOrder/index',
      },
      {
        name: '客户订单',
        icon: 'search',
        type: 'progress',
        url: '/pages/customerOrders/index',
      },
      {
        name: '商品库',
        icon: 'upload',
        type: 'published',
        url: '/pages/productManagement/index',
      },
      {
        name: 'QA Seed',
        icon: 'file-copy',
        type: 'qaSeed',
        url: '',
      },
    ],

    settingList: [
      { name: '供应商资料', icon: 'shop', type: 'providers', url: '/pages/providers/index' },
      { name: '系统管理员', icon: 'user-setting', type: 'admin' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {
    this.loadQaSeed();
  },

  async onShow() {
    const Token = wx.getStorageSync('access_token');
    const personalInfo = this.getPersonalInfo();

    if (Token) {
      this.setData({
        isLoad: true,
        personalInfo,
      });
    } else {
      this.setData({
        isLoad: true,
        personalInfo,
      });
    }
  },

  loadQaSeed() {
    const seed = QaSeedMock.loadSeed();
    this.setData({
      qaSeedInfo: {
        userCount: seed.users.length,
        groupOrderCount: seed.groupOrders.length,
        productCount: seed.products.length,
        customerOrderCount: seed.customerOrders.length,
      },
      service: [
        { name: '重置 QA Seed', icon: 'refresh', type: 'resetQaSeed' },
        { name: '供应商', icon: 'shop', type: 'providers', url: '/pages/providers/index' },
        { name: '管理员提示', icon: 'user-setting', type: 'admin' },
        { name: '未完成功能', icon: 'info-circle', type: 'todo' },
      ],
    });
  },

  getPersonalInfo() {
    const owner = QaSeedMock.getUsers()[0];
    return {
      name: owner.name,
      city: owner.city,
      star: owner.displayRole,
      image: '/static/avatar1.png',
    };
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onNavigateTo() {
    wx.navigateTo({ url: `/pages/my/info-edit/index` });
  },

  onResetQaSeed() {
    QaSeedMock.resetSeed();
    this.loadQaSeed();
    wx.showToast({ title: 'QA Seed 已重置', icon: 'success' });
  },

  onEleClick(e) {
    const { name, url, type } = e.currentTarget.dataset.data;
    if (url) {
      wx.navigateTo({
        url,
        fail: () => wx.switchTab({ url }),
      });
      return;
    }
    if (type === 'resetQaSeed' || type === 'qaSeed') {
      this.onResetQaSeed();
      return;
    }
    if (type === 'admin') {
      const admin = QaSeedMock.getAdmins()[0];
      wx.showModal({
        title: admin.title,
        content: admin.note,
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    this.onShowToast('#t-toast', name);
  },
});
