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
    titleText: 'Product Management',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
  },

  onLoad() {
    // 模擬從 API 獲取資料
    this.fetchData();
  },

  async fetchData() {
    let mock = await ProductMock.fetchProductListMock();

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

  // 3. 新增功能：新增成功後預設為上架 (status = 1)
  onAddProduct() {
    wx.navigateTo({
      // 跳轉時攜帶 id，方便詳情頁請求對應數據
      url: `/sub-pages/product/add/index`,
      fail: (err) => {
        console.error("跳轉詳情頁失敗：", err);
      },
      events: {
        // 為指定事件添加一個監聽器，接收下一頁傳回來的資料
        refreshList: (data) => {
          //TODO 抓資料         
          let list = [...this.data.allProducts];
          list.push(new Product({ id: 3, title: '韓國面膜', status: 1, description: '韓國面膜', pictureUrls: [], priceSetting: [] }))

          this.setData({
            allProducts: list,
            productList: list
          });
        }
      }
    });

    // const newProduct = new Product();
    // newProduct.id = Date.now(); // 暫時用時間戳當 ID
    // newProduct.title = `新商品 ${this.data.allProducts.length + 1}`;
    // newProduct.description = '請輸入商品描述';
    // newProduct.status = 1; // 💡 需求：預設為上架

    // const updatedList = [newProduct, ...this.data.allProducts];
    // this.setData({
    //   allProducts: updatedList,
    //   productList: updatedList
    // });

    // wx.showToast({ title: '新增成功並上架', icon: 'success' });
  },

  // 3. 下架/上架切換
  onToggleStatus(e: any) {
    const id = e.currentTarget.dataset.id;
    const updated = this.data.allProducts.map(item => {
      if (item.id === id) {
        // 切換狀態 (1 變 0, 0 變 1)
        const newStatus = item.status === 1 ? 0 : 1;
        wx.showToast({
          title: newStatus === 1 ? '已上架' : '已下架',
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
      content: '確定要刪除此商品嗎？',
      success: (res) => {
        if (res.confirm) {
          const updated = this.data.allProducts.filter(item => item.id !== id);
          this.updateLocalData(updated);
          wx.showToast({ title: '已刪除', icon: 'success' });
        }
      }
    });
  },

  // 統一更新本地狀態
  updateLocalData(newList: Product[]) {

    if (this.data.searchQuery) {
      newList = newList.filter(item => item.title.includes(this.data.searchQuery))
    }

    if (this.data.currentStatus) {
      newList = newList.filter(item => item.status == this.data.currentStatus)
    }

    this.setData({
      productList: newList
    });
  },

  // 監聽狀態切換
  async onStatusChange(e) {
    let list=this.data.allProducts;
    this.setData({
      currentStatus: e.detail.value
    }, () => this.updateLocalData(list));
  },
});