import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { ProductService } from '~/services/product/productService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateBackOrTab, navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    historyWords: [],
    popularWords: ['团单', '本团商品', '商品库', '客户订单', '收款状态'],
    searchValue: '',
    isSearching: false,
    resultGroups: [],
    hasSearched: false,
    canUseSearch: false,
    isAccessLoading: true,
    searchFocus: false,
    sourceUrl: '/pages/my/index',
    accessStateText: '',
    dialog: {
      title: '确认删除当前历史记录',
      showCancelButton: true,
      message: '',
    },
    dialogShow: false,
  },

  deleteType: 0,
  deleteIndex: '',

  onLoad(options = {}) {
    const sourceUrl = options.from ? decodeURIComponent(String(options.from)) : '/pages/my/index';
    this.setData({ sourceUrl, isAccessLoading: true, searchFocus: true });
  },

  async onShow() {
    this.setData({ isAccessLoading: true, searchFocus: true });
    await AuthService.refreshSession();
    const profile = AuthService.getCurrentProfile();
    const canUseSearch = canUseFeature(profile, FEATURE_KEYS.SEARCH);
    if (canUseSearch) this.loadLocalSearchWords();
    this.setData({
      canUseSearch,
      accessStateText: canUseSearch ? '' : getRoleScopeText(profile, FEATURE_KEYS.SEARCH),
      historyWords: canUseSearch ? this.data.historyWords : [],
      resultGroups: canUseSearch ? this.data.resultGroups : [],
      hasSearched: canUseSearch ? this.data.hasSearched : false,
      isAccessLoading: false,
      searchFocus: canUseSearch,
    });
  },

  loadLocalSearchWords() {
    try {
      const historyWords = wx.getStorageSync('dao_you_ling_search_history');
      if (Array.isArray(historyWords)) {
        this.setData({ historyWords });
      }
    } catch (err) {
      return false;
    }
    return true;
  },

  setHistoryWords(searchValue) {
    if (!searchValue) return;

    const historyWords = [...this.data.historyWords];
    const index = historyWords.indexOf(searchValue);

    if (index !== -1) {
      historyWords.splice(index, 1);
    }
    historyWords.unshift(searchValue);

    this.setData({
      searchValue,
      historyWords,
    });
    wx.setStorageSync('dao_you_ling_search_history', historyWords);
  },

  confirm() {
    const historyWords = [...this.data.historyWords];
    const { deleteType, deleteIndex } = this;

    if (deleteType === 0) {
      historyWords.splice(deleteIndex, 1);
      this.setData({
        historyWords,
        dialogShow: false,
      });
    } else {
      this.setData({ historyWords: [], dialogShow: false });
    }
    wx.setStorageSync('dao_you_ling_search_history', this.data.historyWords);
  },

  close() {
    this.setData({ dialogShow: false });
  },

  handleClearHistory() {
    const { dialog } = this.data;
    this.deleteType = 1;
    this.setData({
      dialog: {
        ...dialog,
        message: '确认删除所有历史记录',
      },
      dialogShow: true,
    });
  },

  deleteCurr(e) {
    const { index } = e.currentTarget.dataset;
    const { dialog } = this.data;
    this.deleteIndex = index;
    this.deleteType = 0;
    this.setData({
      dialog: {
        ...dialog,
        message: '确认删除当前历史记录',
      },
      dialogShow: true,
    });
  },

  handleHistoryTap(e) {
    const { historyWords } = this.data;
    const { index } = e.currentTarget.dataset;
    const searchValue = historyWords[index || 0] || '';

    this.setHistoryWords(searchValue);
    this.runSearch(searchValue);
  },

  handlePopularTap(e) {
    const { popularWords } = this.data;
    const { index } = e.currentTarget.dataset;
    const searchValue = popularWords[index || 0] || '';

    this.setHistoryWords(searchValue);
    this.runSearch(searchValue);
  },

  async runSearch(value) {
    const keyword = String(value || '').trim();
    if (!keyword) return;

    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.SEARCH)) {
      this.setData({
        hasSearched: true,
        resultGroups: [],
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.SEARCH),
      });
      return;
    }

    this.setData({ isSearching: true, hasSearched: true });
    // 三类均取角色可见集(listVisible 已按角色收敛,符 B6),再统一走客户端 match 过滤(口径一致)。
    const [groupOrdersRes, productsRes, customerOrdersRes] = await Promise.all([
      GroupOrderService.listVisible(),
      ProductService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);
    const lowered = keyword.toLowerCase();
    const match = value => String(value || '').toLowerCase().includes(lowered);
    const groupOrders = (groupOrdersRes.success ? groupOrdersRes.data : [])
      .filter(item => match(item.title) || match(item.description) || match(item.pickupNote))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        title: item.title || '团单',
        desc: item.startAt || item.pickupNote || '查看团单详情',
        type: 'groupOrder',
      }));
    // 客户无 PRODUCTS 功能：搜索不返回商品结果（客户不得浏览/搜索商品库，B1）。
    const canSearchProducts = canUseFeature(profile, FEATURE_KEYS.PRODUCTS);
    const products = (canSearchProducts && productsRes.success ? productsRes.data : [])
      .filter(item => match(item.title) || match(item.description))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        title: item.title || '商品',
        desc: item.description || '查看商品资料',
        type: 'product',
      }));
    const customerOrders = (customerOrdersRes.success ? customerOrdersRes.data : [])
      .filter(item => match(item.customerName) || match(item.orderNo) || match(item.groupOrderTitle))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        title: item.customerName || item.orderNo || '客户订单',
        desc: item.groupOrderTitle || item.statusText || '查看订单详情',
        type: 'customerOrder',
      }));

    this.setData({
      isSearching: false,
      resultGroups: [
        { title: '团单', items: groupOrders },
        { title: '商品', items: products },
        { title: '客户订单', items: customerOrders },
      ].filter(group => group.items.length),
    });
  },

  handleSubmit(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : this.data.searchValue;
    if (value.length === 0) return;

    this.setHistoryWords(value);
    this.runSearch(value);
  },

  handleNativeConfirm(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : this.data.searchValue;
    this.handleSubmit({ detail: { value } });
  },

  handleSearchChange(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    this.setData({ searchValue: value || '' });
  },

  openResult(e) {
    const { type, id } = e.currentTarget.dataset;
    if (!id) {
      wx.showToast({ title: '未找到对应资料', icon: 'none' });
      return;
    }
    if (type === 'groupOrder') {
      // 不传 readonly：详情页按数据层返回的 canManageGroupOrder 分流（客户已被 P0-1 数据层收口，
      // 管理者经搜索进入应得正常管理视图，故不再强制只读）。
      navigateByUrl(`/sub-pages/groupOrder/detail/index?id=${id}`);
      return;
    }
    if (type === 'customerOrder') {
      navigateByUrl(`/pages/customerOrders/index?orderId=${encodeURIComponent(String(id))}`);
      return;
    }
    if (type === 'product') {
      navigateByUrl(`/sub-pages/product/list/index?productId=${encodeURIComponent(String(id))}`);
    }
  },

  actionHandle() {
    this.setData({
      searchValue: '',
    });
    navigateBackOrTab(this.data.sourceUrl || '/pages/my/index');
  },
});
