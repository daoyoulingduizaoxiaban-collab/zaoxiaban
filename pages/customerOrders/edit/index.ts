import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { CLOUD_SAVE_MODE_TEXT, getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { navigateBackOrTab, navigateByUrl } from '~/utils/navigation';

const buildCustomerEntryPath = (groupOrderId, shareToken = '') => {
  const basePath = `/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(String(groupOrderId || ''))}`;
  const normalizedToken = String(shareToken || '').trim();
  return normalizedToken ? `${basePath}&shareToken=${encodeURIComponent(normalizedToken)}` : basePath;
};

Page({
  data: {
    pageTitle: '客户下单',
    groupOrderId: '',
    shareToken: '',
    groupOrder: null,
    productRows: [],
    totalPrice: 0,
    isSubmitting: false,
    isLoading: false,
    pageErrorText: '',
    accessDenied: false,
    accessStateText: '',
    isLoggedIn: false,
    loginRedirectTo: '/pages/customerOrders/index',
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

  async onLoad(options) {
    await AuthService.refreshSession();
    const profile = AuthService.getCurrentProfile();
    const groupOrderId = options.groupOrderId || options.id || '';
    let shareToken = String((options && options.shareToken) || '').trim();
    if (shareToken) {
      try {
        shareToken = decodeURIComponent(shareToken);
      } catch (err) {
        shareToken = String(shareToken || '').trim();
      }
    }
    const loginRedirectTo = groupOrderId ? buildCustomerEntryPath(groupOrderId, shareToken) : '/pages/customerOrders/index';
    const canCreate = canUseFeature(profile, FEATURE_KEYS.CUSTOMER_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        groupOrderId,
        shareToken,
        accessDenied: true,
        accessStateText: AuthService.getAccessStateText(profile),
        isLoggedIn: Boolean(profile),
        loginRedirectTo,
      });
      return;
    }

    this.setData({
      groupOrderId,
      shareToken,
      accessDenied: false,
      accessStateText: '',
      isLoggedIn: Boolean(profile),
      loginRedirectTo,
      pageErrorText: groupOrderId ? '' : '缺少团单入口，请从有效团单进入。',
      'formData.customerName': profile && profile.displayName ? profile.displayName : '',
      'formData.customerPhone': profile && profile.phone ? profile.phone : '',
    });
    if (!groupOrderId) return;
    await this.loadOrderEntry(groupOrderId);
  },

  onShareAppMessage() {
    const groupOrder = this.data.groupOrder || {};
    const groupOrderId = this.data.groupOrderId || groupOrder.id || groupOrder._id || '';
    return {
      title: `${groupOrder.title || '团单'}｜客户下单`,
      path: groupOrder.sharePath || buildCustomerEntryPath(groupOrderId, this.data.shareToken),
    };
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent(this.data.loginRedirectTo)}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  async loadOrderEntry(groupOrderId) {
    this.setData({ isLoading: true, pageErrorText: '' });
    const res = await CustomerOrderService.getOrderEntry(groupOrderId, this.data.shareToken);
    if (!res.success) {
      const errorText = res.error || '加载团单失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.setData({ groupOrder: null, productRows: [], isLoading: false, pageErrorText: errorText });
      return;
    }

    this.setData({
      groupOrder: res.data,
      pageTitle: res.data.title || '客户下单',
      productRows: res.data.productList || [],
      totalPrice: 0,
      saveModeText: getSaveModeText(res.meta),
      isLoading: false,
      pageErrorText: '',
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
        pictureUrl: product.coverUrl || (product.pictureUrls && product.pictureUrls[0]) || '',
      }));
  },

  async onSave() {
    if (this.data.isSubmitting) return;
    if (this.data.pageErrorText || !this.data.groupOrder) {
      wx.showToast({ title: this.data.pageErrorText || '未找到可下单团单', icon: 'none' });
      return;
    }

    const items = this.buildSelectedItems();
    if (!items.length) {
      wx.showToast({ title: '请至少选择一件商品', icon: 'none' });
      return;
    }

    const payload = {
      groupOrderId: this.data.groupOrderId,
      shareToken: this.data.shareToken,
      customerName: this.data.formData.customerName,
      customerPhone: this.data.formData.customerPhone,
      memberRemark: this.data.formData.memberRemark,
      paymentMethod: this.data.formData.paymentMethod,
      paymentRemark: this.data.formData.paymentRemark,
      paymentProofUrls: this.data.formData.paymentProofUrls,
      items,
      totalPrice: this.data.totalPrice,
    };

    this.setData({ isSubmitting: true });
    const res = await CustomerOrderService.create(payload, this.data.shareToken);
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
        navigateByUrl('/pages/customerOrders/index', {
          fallbackUrl: '/pages/my/index',
          fail: () => navigateBackOrTab('/pages/customerOrders/index'),
        });
      },
    });
  },

  onBack() {
    navigateBackOrTab('/pages/groupOrder/index');
  },

  choosePaymentProof() {
    if (this.data.isSubmitting) return;
    if (!wx.chooseMedia) {
      wx.showToast({ title: '暂时无法选择图片，请稍后重试', icon: 'none' });
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
      fail: () => wx.showToast({ title: '付款凭证预览失败', icon: 'none' }),
    });
  },

  onProductImageError(e) {
    const productId = e.currentTarget.dataset.id;
    const productRows = this.data.productRows.map(product => (String(product.id) === String(productId)
      ? {
        ...product,
        coverUrl: '',
        isImageFallback: true,
        imageFallbackText: '图片加载失败',
      }
      : product));
    this.setData({ productRows });
  },
});
