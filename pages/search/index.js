import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { ProductService } from '~/services/product/productService';

Page({
  data: {
    historyWords: [],
    popularWords: ['团单', '本团商品', '商品库', '客户订单', '收款状态'],
    searchValue: '',
    isSearching: false,
    resultGroups: [],
    hasSearched: false,
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

  onShow() {
    this.loadLocalSearchWords();
    this.setData({
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
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

    const { historyWords } = this.data;
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
    const { historyWords } = this.data;
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
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        hasSearched: true,
        resultGroups: [],
        accessStateText: AuthService.getAccessStateText(profile),
      });
      return;
    }

    this.setData({ isSearching: true, hasSearched: true });
    const [groupOrdersRes, productsRes, customerOrdersRes] = await Promise.all([
      GroupOrderService.listVisible(),
      ProductService.listVisible({ keyword }),
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
    const products = (productsRes.success ? productsRes.data : [])
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
    const { value } = e.detail;
    if (value.length === 0) return;

    this.setHistoryWords(value);
    this.runSearch(value);
  },

  openResult(e) {
    const { type, id } = e.currentTarget.dataset;
    if (!id) {
      wx.showToast({ title: '未找到对应资料', icon: 'none' });
      return;
    }
    if (type === 'groupOrder') {
      wx.navigateTo({ url: `/sub-pages/groupOrder/detail/index?id=${id}&readonly=1` });
      return;
    }
    if (type === 'customerOrder') {
      wx.switchTab({ url: '/pages/customerOrders/index' });
      return;
    }
    if (type === 'product') {
      wx.switchTab({ url: '/pages/productManagement/index' });
    }
  },

  actionHandle() {
    this.setData({
      searchValue: '',
    });
    wx.switchTab({ url: '/pages/groupOrder/index' });
  },
});
