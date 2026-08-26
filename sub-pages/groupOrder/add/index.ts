import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { Product } from '~/models/Product';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { RESULT_TEXT } from '~/utils/feedback';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateBackOrTab, normalizeRouteUrl } from '~/utils/navigation';
import { isCloudBusinessEnabled, uploadProductImages } from '~/repositories/cloudBusinessRepository';
import { normalizeProductImageFields } from '~/utils/productImage';
import { useAccessPage } from '~/behaviors/useAccessPage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

// 出团时间/收单截止预设「此时此刻」，格式与 date-time-picker 的 format 一致（YYYY-MM-DD HH:mm）。
const pad2 = (n: number) => String(n).padStart(2, '0');
// 解析表单时间字串。中间那格空白一定要换成 T——小程序在 iOS 跑的是 JSCore，
// `new Date('2026-07-10 09:00')` 在那里是 Invalid Date，只有 Node 与 V8 收。
// 与云端 lib/core.js 的 parseExpiryTime 同一套规则。
const parseFormTime = (value) => {
  const text = String(value || '').trim();
  if (!text) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59` : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};

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

    sourceUrl: '/pages/groupOrder/index',
    // 已停止收单的团单进编辑页只能看，不能改（含新增商品/上传图）。
    readOnly: false,
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
    this.setData({ ...(this as any).loadingState(), sourceUrl });
    await AuthService.refreshSession();
    if ((this as any).requireLogin()) return;
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
        ...(this as any).threeState('ready'),
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
      return;
    }
    this.setData({
      pageTitle: '开团',
      isEdit: false,
      groupOrderId: '',
      selectedGoods: [],
      formData: {
        title: '',
        description: '',
        // 预设此时此刻，避免必填日期空着挡住新建；可再点选修改。
        startAt: formatNow(),
        endAt: formatNow(),
        customerNotice: '',
        status: GroupOrderStatus.OPEN,
      },
      ...(this as any).threeState('ready'),
    });
  },

  async onShow() {
    this.consumePickerFallbackResult();
  },

  // page-state 的重试：只有「读既有团单失败」会进 error 态，重读它即可。
  onRetry() {
    const id = this.data.groupOrderId;
    if (!id) return;
    this.setData((this as any).loadingState());
    this.loadGroupOrder(id);
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
        selectedGoods: [],
        ...(this as any).threeState('error', { errorText }),
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    // 复制模式：标题加「（副本）」（顾及 20 字上限）、状态重置为开放收单，其余内容原样带入。
    const sourceTitle = res.data.title || '';
    const status = asCopy ? GroupOrderStatus.OPEN : Number(res.data.status || GroupOrderStatus.OPEN);
    this.setData({
      formData: {
        title: asCopy ? `${sourceTitle.slice(0, 16)}（副本）` : sourceTitle,
        description: res.data.description || '',
        startAt: res.data.startAt || '',
        endAt: res.data.endAt || '',
        customerNotice: res.data.customerNotice || '',
        status,
      },
      selectedGoods: this.normalizeGoods(res.data.productList || []),
      readOnly: status === GroupOrderStatus.STOPPED,
      ...(this as any).threeState('ready'),
    });
  },

  guardReadOnly() {
    if (!this.data.readOnly) return false;
    wx.showToast({ title: '团单已停止收单，不能编辑', icon: 'none' });
    return true;
  },

  normalizeGoods(goods = []) {
    return goods.map(item => ({
      ...normalizeProductImageFields(item),
      priceSetting: item.priceSetting || item.priceSettings || [],
    }));
  },

  onInput(e: any) {
    if (this.guardReadOnly()) return;
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },
  // 微信原生 picker 无 datetime 合一模式，改用 tdesign date-time-picker（弹层）。
  openDatePicker(e: any) {
    if (this.guardReadOnly()) return;
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
    if (this.guardReadOnly()) return;
    const { index } = e.currentTarget.dataset;
    const selectedGoods = this.data.selectedGoods.filter((_, itemIndex) => itemIndex !== Number(index));
    this.setData({ selectedGoods });
  },

  // #8 内嵌新增商品：商品名称输入。
  onNewProductInput(e: any) {
    if (this.guardReadOnly()) return;
    this.setData({ 'newProduct.title': e.detail.value });
  },

  // 待添加价格档的输入（数量 / 该档总价）。
  onTierInput(e: any) {
    if (this.guardReadOnly()) return;
    const { field } = e.currentTarget.dataset;
    if (!field) return;
    this.setData({ [`tempTier.${field}`]: e.detail.value });
  },

  // 第一档强制是「1 件」（客户单买的基准价，UI 上数量栏位锁死显示 1）；
  // 之后每加一档，数量、总价都必须比上一档大——不然「买多变更贵/一样贵」不合理，也没办法算最优组合。
  addTier() {
    if (this.guardReadOnly()) return;
    const isFirstTier = this.data.newProduct.tiers.length === 0;
    const mq = isFirstTier ? 1 : Number(this.data.tempTier.minQuantity);
    const tp = Number(this.data.tempTier.totalPrice);
    if (!Number.isFinite(mq) || mq < 1) return wx.showToast({ title: '数量需 ≥ 1', icon: 'none' });
    if (!Number.isFinite(tp) || tp <= 0) return wx.showToast({ title: '请输入有效总价', icon: 'none' });
    const lastTier = this.data.newProduct.tiers[this.data.newProduct.tiers.length - 1];
    if (lastTier) {
      if (mq <= lastTier.minQuantity) return wx.showToast({ title: `数量需大于上一档（${lastTier.minQuantity} 件）`, icon: 'none' });
      if (tp <= lastTier.totalPrice) return wx.showToast({ title: `总价需大于上一档（¥${lastTier.totalPrice}）`, icon: 'none' });
    }
    const tiers = [...this.data.newProduct.tiers, { minQuantity: mq, totalPrice: tp }];
    this.setData({ 'newProduct.tiers': tiers, tempTier: { minQuantity: '', totalPrice: '' } });
  },

  removeTier(e: any) {
    if (this.guardReadOnly()) return;
    const index = Number(e.currentTarget.dataset.index);
    // 第一档（1 件）是后面所有档次的比较基准，删掉它等于整组价格档都要重填，一起清空。
    const tiers = index === 0 ? [] : this.data.newProduct.tiers.filter((_, i) => i !== index);
    this.setData({ 'newProduct.tiers': tiers });
  },

  // 内嵌商品图（选填，最多 3 张）：cloud 后端保存时上传云存储；local 后端直接用临时路径（仅本地测试）。
  chooseInlineImage() {
    if (this.guardReadOnly()) return;
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
    if (this.guardReadOnly()) return;
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ 'newProduct.pictureUrls': (this.data.newProduct.pictureUrls || []).filter((_, i) => i !== index) });
  },

  // #8/#1 加入商品：各档「数量+总价(支援小数)」→ 换算 unitPrice=总价/数量 存，下单计价逻辑不变。
  async addProductInline() {
    if (this.guardReadOnly()) return;
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

  // 前端必填 + 时间顺序校验。权威版本在云端 businessData/resources/groupOrders.js
  // 的 validateGroupOrderPayload，这里只是提早给提示，两边文案要一致。
  buildFormError() {
    const { formData, selectedGoods } = this.data;
    if (!String(formData.title || '').trim()) return '请输入团单名称';
    if (!String(formData.startAt || '').trim()) return '请选择出团时间';
    if (!String(formData.endAt || '').trim()) return '请选择收单截止时间';
    // 决策 10：开始不得晚于结束。两边都解不出时间就不挡（旧资料格式各异）。
    const startTime = parseFormTime(formData.startAt);
    const endTime = parseFormTime(formData.endAt);
    if (startTime && endTime && startTime > endTime) return '出团时间不能晚于收单截止时间';
    if (!selectedGoods.length) return '请至少添加一件团单商品';
    return '';
  },

  async onSave() {
    const { formData, selectedGoods, groupOrderId, isEdit } = this.data;

    if (this.guardReadOnly()) return;
    if (this.data.isSubmitting) return;
    if (this.data.loadErrorText) {
      wx.showToast({ title: this.data.loadErrorText, icon: 'none' });
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
        setTimeout(() => navigateBackOrTab(this.data.sourceUrl || '/pages/groupOrder/index'), 300);
      }
    });
  }
});
