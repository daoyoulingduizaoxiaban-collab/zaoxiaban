import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { Product } from '~/models/Product';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CLOUD_SAVE_MODE_TEXT, getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateBackOrTab, navigateByUrl, normalizeRouteUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

// 出团时间/收单截止预设「此时此刻」，格式与 date-time-picker 的 format 一致（YYYY-MM-DD HH:mm）。
const pad2 = (n: number) => String(n).padStart(2, '0');
const formatNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

Page({
  data: {
    pageTitle: '开团',
    isEdit: false,
    groupOrderId: '',
    selectedGoods: [] as Product[],
    isSubmitting: false,
    saveModeText: CLOUD_SAVE_MODE_TEXT,
    accessDenied: false,
    accessStateText: '',
    pageErrorText: '',
    isPageLoading: true,
    sourceUrl: '/pages/groupOrder/index',
    datePickerVisible: false,
    pickerField: '',
    pickerValue: '',
    // #8 开团内嵌新增商品：填 名称+起订量+总价（支援小数），加入 selectedGoods（不必先去商品库）。
    newProduct: {
      title: '',
      minQuantity: '1',
      totalPrice: '',
    },
    formData: {
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      customerNotice: '',
      status: GroupOrderStatus.OPEN,
    }
  },

  async onLoad(options) {
    const sourceUrl = normalizeRouteUrl(options.from || '/pages/groupOrder/index', '/pages/groupOrder/index');
    this.setData({ isPageLoading: true, sourceUrl });
    await AuthService.refreshSession();
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
        isPageLoading: false,
      });
      return;
    }
    const groupOrderId = options.id ? String(options.id) : '';
    if (groupOrderId) {
      this.setData({
        pageTitle: '编辑团单',
        isEdit: true,
        groupOrderId
      });
      await this.loadGroupOrder(groupOrderId);
      this.setData({ isPageLoading: false });
      return;
    }
    this.setData({
      pageTitle: '开团',
      isEdit: false,
      groupOrderId: '',
      selectedGoods: [],
      pageErrorText: '',
      formData: {
        title: '',
        description: '',
        // 预设此时此刻，避免必填日期空着挡住新建；可再点选修改。
        startAt: formatNow(),
        endAt: formatNow(),
        customerNotice: '',
        status: GroupOrderStatus.OPEN,
      },
      isPageLoading: false,
    });
  },

  async onShow() {
    this.consumePickerFallbackResult();
  },

  onBack() {
    if (this.data.isSubmitting) return;
    navigateBackOrTab(this.data.sourceUrl || '/pages/groupOrder/index');
  },

  appendSelectedProducts(products = []) {
    const selectedProducts = this.normalizeGoods((products || []).map(item => new Product(item)));
    if (!selectedProducts.length) return;
    const existingIds = new Set(this.data.selectedGoods.map(item => String(item.id)));
    const nextProducts = selectedProducts.filter(item => !existingIds.has(String(item.id)));
    if (!nextProducts.length) return;
    this.setData({
      selectedGoods: [...this.data.selectedGoods, ...nextProducts],
    });
  },

  consumePickerFallbackResult() {
    let result = null;
    try {
      result = wx.getStorageSync(PICKER_RESULT_KEY);
      wx.removeStorageSync(PICKER_RESULT_KEY);
    } catch (err) {
      result = null;
    }
    if (!result || !Array.isArray(result.products) || Date.now() - Number(result.createdAt || 0) > 5 * 60 * 1000) return;
    this.appendSelectedProducts(result.products);
  },

  async loadGroupOrder(groupOrderId) {
    const res = await GroupOrderService.getById(groupOrderId);
    if (!res.success) {
      const errorText = res.error || '加载团单失败';
      this.setData({
        pageErrorText: errorText,
        selectedGoods: [],
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    this.setData({
      pageErrorText: '',
      formData: {
        title: res.data.title || '',
        description: res.data.description || '',
        startAt: res.data.startAt || '',
        endAt: res.data.endAt || '',
        customerNotice: res.data.customerNotice || '',
        status: Number(res.data.status || GroupOrderStatus.OPEN),
      },
      selectedGoods: this.normalizeGoods(res.data.productList || []),
    });
  },

  normalizeGoods(goods = []) {
    return goods.map(item => ({
      ...normalizeProductImageFields(item),
      priceSetting: item.priceSetting || item.priceSettings || [],
    }));
  },

  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },
  // 微信原生 picker 无 datetime 合一模式，改用 tdesign date-time-picker（弹层）。
  openDatePicker(e: any) {
    const { field } = e.currentTarget.dataset;
    if (!field) return;
    this.setData({
      pickerField: field,
      pickerValue: (this.data.formData as any)[field] || '',
      datePickerVisible: true,
    });
  },
  onDatePickerConfirm(e: any) {
    const field = this.data.pickerField;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : '';
    if (field) {
      this.setData({ [`formData.${field}`]: String(value || '').trim() });
    }
    this.setData({ datePickerVisible: false });
  },
  onDatePickerCancel() {
    this.setData({ datePickerVisible: false });
  },

  onRemoveGoods(e: any) {
    const { index } = e.currentTarget.dataset;
    const selectedGoods = this.data.selectedGoods.filter((_, itemIndex) => itemIndex !== Number(index));
    this.setData({ selectedGoods });
  },

  // #8 内嵌新增商品：输入变更。
  onNewProductInput(e: any) {
    const { field } = e.currentTarget.dataset;
    if (!field) return;
    this.setData({ [`newProduct.${field}`]: e.detail.value });
  },

  // #8/#1 加入商品：填「起订量+总价(支援小数)」→ 换算 unitPrice 存，下单计价逻辑不变。
  addProductInline() {
    const { title, minQuantity, totalPrice } = this.data.newProduct;
    const name = String(title || '').trim();
    const mq = Number(minQuantity);
    const tp = Number(totalPrice);
    if (!name) return wx.showToast({ title: '请输入商品名称', icon: 'none' });
    if (!Number.isFinite(mq) || mq < 1) return wx.showToast({ title: '起订量需 ≥ 1', icon: 'none' });
    if (!Number.isFinite(tp) || tp <= 0) return wx.showToast({ title: '请输入有效总价', icon: 'none' });
    const unitPrice = tp / mq; // 支援小数，如 6 件总价 500 → 单价 83.33
    const product = {
      id: `inline-${Date.now()}`,
      title: name,
      coverUrl: '',
      // 必须 status=2(上架)，否则客户下单页按 status===2 过滤会看不到本商品。
      status: 2,
      priceSetting: [{
        minQuantity: mq,
        unitPrice,
        totalPrice: tp,
        description: `${mq} 件 总价 ¥${tp}`,
      }],
    };
    this.setData({
      selectedGoods: [...this.data.selectedGoods, product],
      newProduct: { title: '', minQuantity: '1', totalPrice: '' },
    });
    wx.showToast({ title: '已加入商品', icon: 'none' });
  },

  onGoodsImageError(e: any) {
    const { index } = e.currentTarget.dataset;
    const selectedGoods = this.data.selectedGoods.map((item, itemIndex) => (
      itemIndex === Number(index)
        ? {
          ...item,
          coverUrl: '',
          isImageFallback: true,
          imageFallbackText: '图片加载失败',
        }
        : item
    ));
    this.setData({ selectedGoods });
  },

  onSelectGoods() {
    if ((this as any)._isOpeningProductPicker) return;
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }
    const existingIds = this.data.selectedGoods.map(item => item.id);
    (this as any)._isOpeningProductPicker = true;
    navigateByUrl(
      `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}&from=${encodeURIComponent('/sub-pages/groupOrder/add/index')}`,
      {
        events: {
          selectedProducts: (data) => {
            this.appendSelectedProducts(data.products || []);
          }
        },
        complete: () => {
          (this as any)._isOpeningProductPicker = false;
        },
        fail: () => {
          wx.showToast({ title: '打开商品库失败', icon: 'none' });
        }
      }
    );
  },

  // 前端必填校验（记账+基本信息定位，日期不做顺序/过期防呆，仅要求已填写）。
  buildFormError() {
    const { formData, selectedGoods } = this.data;
    if (!String(formData.title || '').trim()) return '请输入团单名称';
    if (!String(formData.startAt || '').trim()) return '请选择出团时间';
    if (!String(formData.endAt || '').trim()) return '请选择收单截止时间';
    if (!selectedGoods.length) return '请至少添加一件团单商品';
    return '';
  },

  async onSave() {
    const { formData, selectedGoods, groupOrderId, isEdit } = this.data;

    if (this.data.isSubmitting) return;
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }

    const formError = this.buildFormError();
    if (formError) {
      wx.showToast({ title: formError, icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: isEdit ? '保存中...' : '团单建立中...' });

    const payload = {
      ...formData,
      productList: selectedGoods,
    };
    const res = isEdit
      ? await GroupOrderService.update(groupOrderId, payload)
      : await GroupOrderService.create(payload);

    wx.hideLoading();
    this.setData({ isSubmitting: false });

    if (!res.success) {
      wx.showToast({ title: res.error || '保存团单失败', icon: 'none' });
      return;
    }

    const saveModeText = getSaveModeText(res.meta);
    this.setData({ saveModeText });
    wx.showToast({
      title: saveModeText,
      icon: 'none',
      success: () => {
        setTimeout(() => navigateBackOrTab('/pages/groupOrder/index'), 800);
      }
    });
  }
});
