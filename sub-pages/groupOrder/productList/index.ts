import { Product } from "~/models/Product";
import {
  GroupOrderMock
} from '~/mock/groupOrder/index';

Page({
  data: {
    groupOrderId: 0,
    searchQuery: '',
    rawList: [] as Product[],    // 原始完整列表
    displayList: [] as Product[], // 搜尋過濾後的列表
    skipNextReload: false
  },

  onLoad(options) {
    const groupOrderId = Number(options.id || 0);
    this.setData({
      groupOrderId
    });
  },

  onShow() {
    if (this.data.skipNextReload) {
      this.setData({
        skipNextReload: false
      });
      return;
    }

    // 每次頁面顯示時重新抓取資料 (確保從選品頁回來後資料是最新的)
    this.loadGroupProducts();
  },

  // 1. 載入本團商品
  async loadGroupProducts() {
    const { groupOrderId } = this.data;
    if (!groupOrderId) {
      wx.showToast({ title: '缺少團單 ID', icon: 'none' });
      return;
    }

    const res = await GroupOrderMock.fetchById(groupOrderId);
    const groupProducts = this.normalizeProducts(res.data.productList || []);

    this.setData({
      rawList: groupProducts,
      // 如果目前有搜尋關鍵字，則保留過濾狀態，否則顯示全部
      displayList: this.filterList(groupProducts, this.data.searchQuery)
    });
  },

  normalizeProducts(products) {
    return products.map(item => {
      const priceSetting = item.priceSetting || [];
      const prices = priceSetting.map(setting => setting.unitPrice);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        ...item,
        priceDisplay: prices.length === 0
          ? ''
          : minPrice === maxPrice
            ? `$${minPrice}`
            : `$${minPrice} ~ $${maxPrice}`
      };
    });
  },

  // 2. 搜尋輸入處理
  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({
      searchQuery: query,
      displayList: this.filterList(this.data.rawList, query)
    });
  },

  clearSearch() {
    this.setData({
      searchQuery: '',
      displayList: this.data.rawList
    });
  },

  filterList(list, query) {
    if (!query) return list;
    const keyword = query.toLowerCase();
    return list.filter(item =>
      item.title.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    );
  },

  // 3. 跳轉到商品詳情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${id}`,
    });
  },

  // 4. 刪除商品
  onDelete(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '移除商品',
      content: '確定要從本團移除此商品嗎？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 呼叫後端 API 刪除
          // wx.request({ url: 'deleteUrl', method: 'POST', data: { id } ... })

          // 前端先移除
          const rawList = this.data.rawList.filter(item => item.id !== id);

          this.setData({
            rawList,
            displayList: this.filterList(rawList, this.data.searchQuery)
          });

          wx.showToast({ title: '已移除', icon: 'none' });
        }
      }
    });
  },

  // 5. 跳轉到「商品庫選擇頁」
  goToLibrary() {
    const existingIds = this.data.rawList.map(item => item.id);

    this.setData({
      skipNextReload: true
    });

    wx.navigateTo({
      url: `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}`,
      events: {
        selectedProducts: (data) => {
          const selectedProducts = this.normalizeProducts((data.products || []).map(item => new Product(item)));
          if (selectedProducts.length === 0) return;

          const rawList = [...this.data.rawList, ...selectedProducts];
          this.setData({
            rawList,
            displayList: this.filterList(rawList, this.data.searchQuery)
          });
        }
      },
      fail: () => {
        this.setData({
          skipNextReload: false
        });
        wx.showToast({
          title: '跳轉商品庫失敗',
          icon: 'none'
        });
      }
    });
  }
});
