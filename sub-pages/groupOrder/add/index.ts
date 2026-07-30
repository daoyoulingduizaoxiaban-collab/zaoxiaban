import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { Product } from '~/models/Product';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { RESULT_TEXT } from '~/utils/feedback';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateBackOrTab, navigateByUrl, normalizeRouteUrl } from '~/utils/navigation';
import { isCloudBusinessEnabled, uploadProductImages } from '~/repositories/cloudBusinessRepository';
import { normalizeProductImageFields } from '~/utils/productImage';
import { useAccessPage } from '~/behaviors/useAccessPage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

// 出团时间/收单截止预设「此时此刻」，格式与 date-time-picker 的 format 一致（YYYY-MM-DD HH:mm）。
const pad2 = (n: number) => String(n).padStart(2, '0');
const formatNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

Page({
  behaviors: [useAccessPage],
  data: {
    pageTitle: '开团',
    isEdit: false,
    groupOrderId: '',
    selectedGoods: [] as Product[],
    isSubmitting: false,
    accessDenied: false,
    accessStateText: '',
    pageErrorText: '',
    isPageLoading: true,
    sourceUrl: '/pages/groupOrder/index',
    datePickerVisible: false,
    pickerField: '',
    pickerValue: '',
    // #8 开团内嵌新增商品：填名称 + 多档「数量+总价(支援小数)」价格区间 + 商品图(选填)，加入 selectedGoods（不必先去商品库）。
    newProduct: {
      title: '',
      tiers: [] as Array<{ minQuantity: number; totalPrice: number }>,
      pictureUrls: [] as string[],
    },
    tempTier: {
      minQuantity: '',
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
    if ((this as any).requireLogin()) return;
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
    // 复制团单：带入源团单内容（含商品价格档与图片）到「开团」表单，保存时按新团单 create。
    const copyFrom = options.copyFrom ? String(options.copyFrom) : '';
    if (copyFrom) {
      this.setData({
        pageTitle: '开团（复制）',
        isEdit: false,
        groupOrderId: '',
      });
      await this.loadGroupOrder(copyFrom, { asCopy: true });
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

  async loadGroupOrder(groupOrderId, { asCopy = false } = {}) {
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

    // 复制模式：标题加「（副本）」（顾及 20 字上限）、状态重置为开放收单，其余内容原样带入。
    const sourceTitle = res.data.title || '';
    this.setData({
      pageErrorText: '',
      formData: {
        title: asCopy ? `${sourceTitle.slice(0, 16)}（副本）` : sourceTitle,
        description: res.data.description || '',
        startAt: res.data.startAt || '',
        endAt: res.data.endAt || '',
        customerNotice: res.data.customerNotice || '',
        status: asCopy ? GroupOrderStatus.OPEN : Number(res.data.status || GroupOrderStatus.OPEN),
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

  // #8 内嵌新增商品：商品名称输入。
  onNewProductInput(e: any) {
    this.setData({ 'newProduct.title': e.detail.value });
  },

  // 待添加价格档的输入（数量 / 该档总价）。
  onTierInput(e: any) {
    const { field } = e.currentTarget.dataset;
    if (!field) return;
    this.setData({ [`tempTier.${field}`]: e.detail.value });
  },

  // #B2 添加一档价格区间（如 3 件 30、5 件 45），按数量升序排。
  addTier() {
    const mq = Number(this.data.tempTier.minQuantity);
    const tp = Number(this.data.tempTier.totalPrice);
    if (!Number.isFinite(mq) || mq < 1) return wx.showToast({ title: '数量需 ≥ 1', icon: 'none' });
    if (!Number.isFinite(tp) || tp <= 0) return wx.showToast({ title: '请输入有效总价', icon: 'none' });
    if (this.data.newProduct.tiers.some(t => t.minQuantity === mq)) return wx.showToast({ title: '该数量档已存在', icon: 'none' });
    const tiers = [...this.data.newProduct.tiers, { minQuantity: mq, totalPrice: tp }]
      .sort((a, b) => a.minQuantity - b.minQuantity);
    this.setData({ 'newProduct.tiers': tiers, tempTier: { minQuantity: '', totalPrice: '' } });
  },

  removeTier(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ 'newProduct.tiers': this.data.newProduct.tiers.filter((_, i) => i !== index) });
  },

  // 内嵌商品图（选填，最多 3 张）：cloud 后端保存时上传云存储；local 后端直接用临时路径（仅本地测试）。
  chooseInlineImage() {
    const current = this.data.newProduct.pictureUrls || [];
    const remain = 3 - current.length;
    if (remain <= 0) return wx.showToast({ title: '最多上传 3 张商品图', icon: 'none' });
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath).filter(Boolean);
        if (!paths.length) return;
        this.setData({ 'newProduct.pictureUrls': [...current, ...paths].slice(0, 3) });
      },
    });
  },

  removeInlineImage(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ 'newProduct.pictureUrls': (this.data.newProduct.pictureUrls || []).filter((_, i) => i !== index) });
  },

  // #8/#1 加入商品：各档「数量+总价(支援小数)」→ 换算 unitPrice=总价/数量 存，下单计价逻辑不变。
  async addProductInline() {
    const name = String(this.data.newProduct.title || '').trim();
    const tiers = this.data.newProduct.tiers;
    if (!name) return wx.showToast({ title: '请输入商品名称', icon: 'none' });
    if (!tiers.length) return wx.showToast({ title: '请至少添加一档价格', icon: 'none' });
    // 商品图：cloud 后端先上传云存储换 durable URL；local 后端直接用临时路径（仅本地测试可见）。
    let pictureUrls = this.data.newProduct.pictureUrls || [];
    if (pictureUrls.length && isCloudBusinessEnabled()) {
      wx.showLoading({ title: '上传商品图...', mask: true });
      const uploadRes = await uploadProductImages(pictureUrls);
      wx.hideLoading();
      if (!uploadRes.success) return wx.showToast({ title: uploadRes.error || '商品图上传失败', icon: 'none' });
      pictureUrls = uploadRes.data || [];
    }
    const product = {
      id: `inline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: name,
      coverUrl: pictureUrls[0] || '',
      pictureUrls,
      // 必须 status=2(上架)，否则客户下单页按 status===2 过滤会看不到本商品。
      status: 2,
      priceSetting: tiers.map(t => ({
        minQuantity: t.minQuantity,
        unitPrice: t.totalPrice / t.minQuantity, // 支援小数
        totalPrice: t.totalPrice,
        description: `${t.minQuantity} 件 总价 ¥${t.totalPrice}`,
      })),
    };
    this.setData({
      selectedGoods: [...this.data.selectedGoods, product],
      newProduct: { title: '', tiers: [], pictureUrls: [] },
      tempTier: { minQuantity: '', totalPrice: '' },
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

    wx.showToast({
      title: this.data.isEdit ? RESULT_TEXT.save : RESULT_TEXT.create,
      icon: 'success',
      success: () => {
        setTimeout(() => navigateBackOrTab('/pages/groupOrder/index'), 800);
      }
    });
  }
});
