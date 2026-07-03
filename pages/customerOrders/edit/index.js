import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { CLOUD_SAVE_MODE_TEXT, getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

Page({
  data: {
    pageTitle: '客户下单',
    groupOrderId: '',
    groupOrder: null,
    productRows: [],
    totalPrice: 0,
    isSubmitting: false,
    accessDenied: false,
    accessStateText: '',
    saveModeText: CLOUD_SAVE_MODE_TEXT,
    formData: {
      customerName: '',
      customerPhone: '',
      memberRemark: '',
      paymentMethod: '',
      paymentRemark: '',
      paymentProofUrls: [],
    },
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.CUSTOMER_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: AuthService.getAccessStateText(profile),
      });
      return;
    }
    const groupOrderId = options.groupOrderId || options.id || '';

    this.setData({
      groupOrderId,
      'formData.customerName': profile && profile.displayName ? profile.displayName : '',
      'formData.customerPhone': profile && profile.phone ? profile.phone : '',
    });
    this.loadOrderEntry(groupOrderId);
  },

  async loadOrderEntry(groupOrderId) {
    const res = await CustomerOrderService.getOrderEntry(groupOrderId);
    if (!res.success) {
      wx.showToast({ title: res.error || '加载团单失败', icon: 'none' });
      this.setData({ groupOrder: null, productRows: [] });
      return;
    }

    this.setData({
      groupOrder: res.data,
      pageTitle: res.data.title || '客户下单',
      productRows: res.data.productList || [],
      totalPrice: 0,
      saveModeText: getSaveModeText(res.meta),
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : '';
    if (!field) return;
    this.setData({
      [`formData.${field}`]: value,
    });
  },

  onQuantityInput(e) {
    const productId = e.currentTarget.dataset.id;
    const quantity = Number(e.detail.value || 0);
    const productRows = this.data.productRows.map((product) => {
      if (String(product.id) !== String(productId)) return product;
      return CustomerOrderService.calculateLine(product, quantity);
    });

    this.setData({
      productRows,
      totalPrice: CustomerOrderService.calculateTotal(productRows),
    });
  },

  buildSelectedItems() {
    return this.data.productRows
      .filter(product => Number(product.quantity || 0) > 0)
      .map(product => ({
        productId: product.id,
        title: product.title,
        amount: Number(product.quantity || 0),
        unitPrice: Number(product.unitPrice || 0),
        totalPrice: Number(product.lineTotal || 0),
        originalTotalPrice: Number(product.lineTotal || 0),
        pictureUrl: product.pictureUrls && product.pictureUrls[0] ? product.pictureUrls[0] : '',
      }));
  },

  async onSave() {
    if (this.data.isSubmitting) return;

    const payload = {
      groupOrderId: this.data.groupOrderId,
      customerName: this.data.formData.customerName,
      customerPhone: this.data.formData.customerPhone,
      memberRemark: this.data.formData.memberRemark,
      paymentMethod: this.data.formData.paymentMethod,
      paymentRemark: this.data.formData.paymentRemark,
      paymentProofUrls: this.data.formData.paymentProofUrls,
      items: this.buildSelectedItems(),
      totalPrice: this.data.totalPrice,
    };

    this.setData({ isSubmitting: true });
    const res = await CustomerOrderService.create(payload);
    this.setData({ isSubmitting: false });

    if (!res.success) {
      wx.showToast({ title: res.error || '提交订单失败', icon: 'none' });
      return;
    }

    const saveModeText = getSaveModeText(res.meta);
    this.setData({ saveModeText });
    wx.showModal({
      title: '下单成功',
      content: `${saveModeText}\n订单金额：￥${res.data.totalPrice}`,
      showCancel: false,
      confirmText: '查看订单',
      success: () => {
        wx.switchTab({
          url: '/pages/customerOrders/index',
          fail: () => wx.navigateBack(),
        });
      },
    });
  },

  onBack() {
    wx.navigateBack();
  },

  choosePaymentProof() {
    if (this.data.isSubmitting) return;
    if (!wx.chooseMedia) {
      wx.showToast({ title: '当前设备不支持选择图片', icon: 'none' });
      return;
    }
    const currentUrls = this.data.formData.paymentProofUrls || [];
    const remainCount = 3 - currentUrls.length;
    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传 3 张付款凭证', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(file => file.tempFilePath).filter(Boolean);
        if (!paths.length) {
          wx.showToast({ title: '未选择可用图片', icon: 'none' });
          return;
        }
        this.setData({
          'formData.paymentProofUrls': [...currentUrls, ...paths].slice(0, 3),
        });
      },
      fail: (err) => {
        const message = err && err.errMsg && err.errMsg.includes('cancel')
          ? '已取消选择图片'
          : '选择付款凭证失败，请重试';
        wx.showToast({ title: message, icon: 'none' });
      },
    });
  },

  removePaymentProof(e) {
    const index = Number(e.currentTarget.dataset.index);
    const paymentProofUrls = this.data.formData.paymentProofUrls.filter((_, itemIndex) => itemIndex !== index);
    this.setData({ 'formData.paymentProofUrls': paymentProofUrls });
  },

  previewPaymentProof(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const urls = this.data.formData.paymentProofUrls || [];
    if (!urls.length) return;
    wx.previewImage({
      current: urls[index] || urls[0],
      urls,
    });
  },
});
