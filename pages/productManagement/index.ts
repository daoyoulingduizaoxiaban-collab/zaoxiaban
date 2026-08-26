import { Product } from '../../models/Product';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, canUseProviderPortal, getRoleScopeText } from '~/services/auth/roleScope';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { navigateByUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';
import {
  getProductStatusList,
  getProductStatusTextByValue
} from '~/enum/ProductStatus'
import { useAccessPage } from '~/behaviors/useAccessPage';
import { RESULT_TEXT, toastSuccess } from '~/utils/feedback';
import { buildPriceTiers } from '~/utils/priceDisplay';

Page({
  // access-state + 三态字段与 helper 来自 behavior（R1）
  behaviors: [useAccessPage],

  data: {
    productList: [] as Product[],
    allProducts: [] as Product[],
    searchQuery: '',
    titleText: '商品库',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
    saveModeText: '',
    // 覆写 behavior 空态默认文案
    emptyText: '当前没有商品',
    canManageProducts: false,
    canManageProviders: false,
    canShowProductCatalog: false,
    detailVisible: false,
    selectedProduct: null,
    selectedPriceRules: [],
    productStatusTextMap: {
      1: getProductStatusTextByValue(1),
      2: getProductStatusTextByValue(2)
    },
  },

  syncAccessShell() {
    const profile = AuthService.getCurrentProfile();
    this.setData({
      ...(this as any).buildAccessState(FEATURE_KEYS.PRODUCTS),
      ...(this as any).loadingState(), // shell 阶段身份未最终确认：authReady 归 false + 进 loading
      canManageProducts: canUseFeature(profile, FEATURE_KEYS.PRODUCT_MANAGE),
      canManageProviders: canUseProviderPortal(profile),
      canShowProductCatalog: true,
    });
  },

  async refreshAndFetchData() {
    if ((this as any)._refreshInFlight) return (this as any)._refreshInFlight;
    (this as any)._refreshInFlight = (async () => {
      this.syncAccessShell();
      await AuthService.refreshSession();
      await this.fetchData();
    })();
    try {
      return await (this as any)._refreshInFlight;
    } finally {
      (this as any)._refreshInFlight = null;
    }
  },

  async onLoad() {
    (this as any)._skipNextShowRefresh = true;
    await this.refreshAndFetchData();
  },

  async onShow() {
    if ((this as any)._skipNextShowRefresh) {
      (this as any)._skipNextShowRefresh = false;
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().refreshTabBar();
      }
      return;
    }
    await this.refreshAndFetchData();
  },

  resetDetailState(extraState = {}) {
    this.setData({
      detailVisible: false,
      selectedProduct: null,
      selectedPriceRules: [],
      ...extraState,
    });
  },

  async fetchData() {
    // A13 登录闸门（决策 7）：未登录导登录页并带回原页。原本这里让未登录访客浏览公开商品，
    // OWNER 拍板改成三个主 tab 一律要登录，那条分支连同它的空态 CTA 一并移除。
    // （公开商品清单本身还在，商品浏览页给「已登录但未通过审核」的人用。）
    // 摆在 refreshSession 之后（唯二呼叫点都先 refresh），否则冷启动身分未水合会误踢已登录的人。
    if ((this as any).requireLogin()) return;
    if ((this as any)._fetchInFlight) return (this as any)._fetchInFlight;
    (this as any)._fetchInFlight = (async () => {
    const profile = AuthService.getCurrentProfile();
    // 已登录但未通过审核/被停用/角色过期：显示受限态，不取数。
    if (!AuthService.canUseBusiness(profile)) {
      const accessText = AuthService.getAccessStateText(profile);
      this.resetDetailState({
        allProducts: [],
        productList: [],
        roleScopeText: accessText,
        saveModeText: '',
        canManageProducts: false,
        canManageProviders: false,
        canShowProductCatalog: false,
        isLoggedIn: true,
        canUseBusiness: false,
        accessStateText: accessText,
        authReady: true,
        ...(this as any).threeState('empty'),
      });
      return;
    }

    this.setData((this as any).loadingState());
    const res = await ProductService.listVisible({
      keyword: this.data.searchQuery,
      status: this.data.currentStatus,
    });

    if (!res.success) {
      const errorText = res.error || '加载商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetDetailState({
        allProducts: [],
        productList: [],
        roleScopeText: errorText,
        saveModeText: '',
        canManageProducts: this.canManageProducts(),
        canManageProviders: this.canManageProviders(),
        canShowProductCatalog: true,
        isLoggedIn: Boolean(profile),
        canUseBusiness: true,
        accessStateText: AuthService.getAccessStateText(profile),
        authReady: true,
        ...(this as any).threeState('error', { errorText }),
      });
      return;
    }

    const products = this.normalizeProducts(res.data);
    this.setData({
      allProducts: products,
      productList: products,
      roleScopeText: this.getRoleScopeText(),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      canManageProducts: this.canManageProducts(),
      canManageProviders: this.canManageProviders(),
      canShowProductCatalog: true,
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      authReady: true,
      ...(this as any).threeState(products.length ? 'ready' : 'empty', {
        emptyText: this.canManageProducts() ? '当前没有商品，可点右下角新增' : '当前账号暂无可管理商品',
      }),
    });
    })();
    try {
      return await (this as any)._fetchInFlight;
    } finally {
      (this as any)._fetchInFlight = null;
    }
  },

  normalizeProducts(products: Product[] = []) {
    return products.map((product) => {
      return {
        ...normalizeProductImageFields(product),
        priceSetting: product.priceSetting || product.priceSettings || [],
      };
    });
  },

  onSearchInput(e: any) {
    this.setData({
      searchQuery: e.detail.value
    }, () => this.fetchData());
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) return AuthService.getAccessStateText(profile);
    return getRoleScopeText(profile, FEATURE_KEYS.PRODUCTS);
  },

  canManageProducts() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.PRODUCT_MANAGE);
  },

  // 供应商是团主管理商品的上游，入口从「我的」移进商品库（D-4/B5）。owner/admin/团主可用。
  canManageProviders() {
    return canUseProviderPortal(AuthService.getCurrentProfile());
  },

  onAddProduct() {
    if (!this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能新增商品', icon: 'none' });
      return;
    }

    navigateByUrl('/sub-pages/product/add/index', {
      fail: () => {
        wx.showToast({
          title: '打开商品表单失败',
          icon: 'none',
        });
      },
      events: {
        refreshList: () => {
          this.fetchData();
          wx.showToast({
            title: this.data.saveModeText,
            icon: 'none'
          });
        }
      }
    });
  },

  onEditProduct(e: any) {
    const id = String(e.currentTarget.dataset.id || '');
    if (!id || !this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能编辑商品', icon: 'none' });
      return;
    }
    this.resetDetailState();
    navigateByUrl(`/sub-pages/product/add/index?id=${id}`, {
      fail: () => wx.showToast({ title: '打开商品表单失败', icon: 'none' }),
      events: {
        refreshList: () => {
          this.fetchData();
        }
      }
    });
  },

  onOpenProductList() {
    navigateByUrl('/sub-pages/product/list/index', {
      fail: () => wx.showToast({ title: '打开商品列表失败', icon: 'none' }),
    });
  },

  onOpenProviders() {
    if (!this.canManageProviders()) {
      wx.showToast({ title: '当前账号没有供应商资料管理权限', icon: 'none' });
      return;
    }
    navigateByUrl('/pages/providers/index', {
      fail: () => wx.showToast({ title: '打开供应商资料失败', icon: 'none' }),
    });
  },

  onOpenDetail(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const product = this.data.productList.find(item => String(item.id) === id);
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      return;
    }
    this.setData({
      selectedProduct: product,
      // 走共用的价格档拆解，总价由它统一算（缺 totalPrice 会用数量×单价补），
      // 不要直接把原始 priceSetting 丢给画面，那样各页会各印各的。
      selectedPriceRules: buildPriceTiers(product.priceSetting).map((tier, i) => ({
        ...tier,
        description: (product.priceSetting || [])[i] ? (product.priceSetting || [])[i].description : '',
      })),
      detailVisible: true,
    });
  },

  closeDetail() {
    this.resetDetailState();
  },

  stopDetailTap() {},

  onImageError(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const patchCover = product => (String(product.id) === id
      ? { ...product, coverUrl: '', isImageFallback: true, imageFallbackText: '图片加载失败' }
      : product);
    this.setData({
      productList: this.data.productList.map(patchCover),
      allProducts: this.data.allProducts.map(patchCover),
    });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': '',
      'selectedProduct.isImageFallback': true,
      'selectedProduct.imageFallbackText': '图片加载失败',
    });
  },

  async onToggleStatus(e: any) {
    if (!this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能修改商品状态', icon: 'none' });
      return;
    }
    const id = String(e.currentTarget.dataset.id);
    const item = this.data.allProducts.find(product => String(product.id) === id);
    if (!item) {
      wx.showToast({ title: '未找到商品', icon: 'none' });
      return;
    }

    const res = await ProductService.toggleStatus(item);
    if (!res.success) {
      wx.showToast({ title: res.error || '更新商品状态失败', icon: 'none' });
      return;
    }

    await this.fetchData();
    toastSuccess(RESULT_TEXT.update);
  },

  onDelete(e: any) {
    if (!this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能删除商品', icon: 'none' });
      return;
    }
    const id = String(e.currentTarget.dataset.id);

    wx.showModal({
      title: '提示',
      content: `确定要删除此商品吗？删除后将不再展示给客户，不影响历史团单与订单。${this.data.saveModeText}`,
      success: async (modalRes) => {
        if (modalRes.confirm) {
          const res = await ProductService.softDelete(id);
          if (!res.success) {
            wx.showToast({ title: res.error || '删除商品失败', icon: 'none' });
            return;
          }
          await this.fetchData();
          toastSuccess(RESULT_TEXT.remove);
        }
      }
    });
  },

  async onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.fetchData());
  },
});
