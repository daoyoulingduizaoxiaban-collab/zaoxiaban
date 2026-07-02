import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    pageTitle: '客户下单',
    groupOrderId: '',
    groupOrder: null,
    productRows: [],
    totalPrice: 0,
    isSubmitting: false,
    saveModeText: '本地/QA 展示模式，尚未正式保存到云端',
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
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const paths = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          'formData.paymentProofUrls': [...this.data.formData.paymentProofUrls, ...paths],
        });
      },
      fail: () => wx.showToast({ title: '选择付款凭证失败', icon: 'none' }),
    });
  },

  removePaymentProof(e) {
    const index = Number(e.currentTarget.dataset.index);
    const paymentProofUrls = this.data.formData.paymentProofUrls.filter((_, itemIndex) => itemIndex !== index);
    this.setData({ 'formData.paymentProofUrls': paymentProofUrls });
  },
});
