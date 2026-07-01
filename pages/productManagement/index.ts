// 引入你圖片中的 Product 類別定義
// 假設你定義在 models/product.ts
import { Product } from '../../models/Product';
import { ProductMock } from '../../mock/product/index';
import {
  getProductStatusList,
  getProductStatusTextByValue
} from '~/enum/ProductStatus'


Page({
  data: {
    productList: [] as Product[], // 頁面顯示的清單
    allProducts: [] as Product[], // 原始完整數據（用於搜尋過濾）
    searchQuery: '',
    titleText: '商品库',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
    productStatusTextMap: {
      1: getProductStatusTextByValue(1),
      2: getProductStatusTextByValue(2)
    },
  },

  onLoad() {
    // 模擬從 API 獲取資料
    this.fetchData();
  },

  async fetchData() {
    const mock = await ProductMock.fetchProductListMock();

    this.setData({
      allProducts: mock.data,
      productList: mock.data
    });
  },

  // 2. 搜尋條件區塊邏輯
  onSearchInput(e: any) {
    const query = e.detail.value.toLowerCase();
    const filtered = this.data.allProducts.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
    this.setData({
      searchQuery: query,
      productList: filtered
    });
  },

  onAddProduct() {
    wx.navigateTo({
      url: `/sub-pages/product/add/index`,
      fail: () => {
        wx.showToast({
          title: '打开商品表单失败',
          icon: 'none',
        });
      },
      events: {
        refreshList: (data) => {
          const returnedProducts = (data.products || []).map(item => new Product(item));
          if (returnedProducts.length === 0) return;

          const list = [...this.data.allProducts, ...returnedProducts];

          this.setData({
            allProducts: list,
          }, () => this.updateLocalData(list));
          wx.showToast({
            title: 'QA 展示模式，暂未保存',
            icon: 'none'
          });
        }
      }
    });
  },

  // 3. 下架/上架切換
  onToggleStatus(e: any) {
    const id = e.currentTarget.dataset.id;
    const updated = this.data.allProducts.map(item => {
      if (item.id === id) {
        // 切換狀態：1=下架、2=開放下單
        const newStatus = item.status === 2 ? 1 : 2;
        wx.showToast({
          title: `QA 展示模式：${getProductStatusTextByValue(newStatus)}`,
          icon: 'none'
        });
        return { ...item, status: newStatus };
      }
      return item;
    });

    this.updateLocalData(updated);
  },

  // 3. 刪除功能
  onDelete(e: any) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '提示',
      content: '确定要从 QA 展示列表移除此商品吗？不会保存到正式数据。',
      success: (res) => {
        if (res.confirm) {
          const updated = this.data.allProducts.filter(item => item.id !== id);
          this.updateLocalData(updated);
          wx.showToast({ title: 'QA 展示模式，暂未保存', icon: 'none' });
        }
      }
    });
  },

  // 統一更新本地狀態
  updateLocalData(newList: Product[]) {
    const allProducts = newList;
    const query = this.data.searchQuery.toLowerCase();

    if (query) {
      newList = newList.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    }

    if (this.data.currentStatus) {
      newList = newList.filter(item => item.status == this.data.currentStatus)
    }

    this.setData({
      allProducts,
      productList: newList
    });
  },

  // 監聽狀態切換
  async onStatusChange(e) {
    const list = this.data.allProducts;
    this.setData({
      currentStatus: e.detail.value
    }, () => this.updateLocalData(list));
  },
});
