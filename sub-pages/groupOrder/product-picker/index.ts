Page({
  data: {
    excludeIds: [], // 已經存在於團購中的商品ID
    allProducts: [], // 原始資料
    products: [],    // 顯示資料 (含 selected/disabled 狀態)
    selectedCount: 0
  },

  onLoad(options) {
    // 1. 接收參數：要排除的 ID 列表
    if (options.excludeIds) {
      try {
        const ids = JSON.parse(options.excludeIds);
        this.setData({ excludeIds: ids });
      } catch (e) {
        console.error('解析 excludeIds 失敗', e);
      }
    }

    // 2. 載入商品庫
    this.loadProductLibrary();
  },

  loadProductLibrary() {
    // 模擬：從後端 API 獲取使用者的所有商品庫
    // 實際開發請換成 wx.request
    const mockApiData = [
      { id: 101, title: '手工餅乾 (原味)', description: '酥脆好吃', priceSetting: [{unitPrice: 100, minQuantity: 1}], pictureUrls: [] },
      { id: 102, title: '巧克力布朗尼', description: '75% 黑巧', priceSetting: [{unitPrice: 150, minQuantity: 1}], pictureUrls: [] },
      { id: 103, title: '有機冷泡茶', description: '阿里山高山茶', priceSetting: [{unitPrice: 60, minQuantity: 10}], pictureUrls: [] },
      { id: 104, title: '測試商品A', description: '庫存貨', priceSetting: [{unitPrice: 200, minQuantity: 1}], pictureUrls: [] },
    ];

    // 3. 資料處理：標記 disabled
    const processedList = mockApiData.map(item => {
      // 檢查此商品是否已存在於上一頁的清單中
      const isExist = this.data.excludeIds.includes(item.id);
      return {
        ...item,
        disabled: isExist, // 如果存在，禁止選擇
        selected: false    // 預設未選
      };
    });

    this.setData({
      allProducts: processedList,
      products: processedList
    });
  },

  // 搜尋功能
  onSearch(e) {
    const keyword = e.detail.value;
    if (!keyword) {
      this.setData({ products: this.data.allProducts });
      return;
    }
    const filtered = this.data.allProducts.filter(p => p.title.includes(keyword));
    this.setData({ products: filtered });
  },

  // 切換選中狀態
  toggleSelect(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.products[index];

    // 防呆
    if (item.disabled) return;

    // 更新狀態
    const key = `products[${index}].selected`;
    this.setData({
      [key]: !item.selected
    });

    this.calculateCount();
  },

  calculateCount() {
    const count = this.data.products.filter(p => p.selected).length;
    this.setData({ selectedCount: count });
  },

  // 確認加入
  confirmAdd() {
    const selectedItems = this.data.products.filter(p => p.selected);

    if (selectedItems.length === 0) return;

    wx.showLoading({ title: '加入中...' });

    // 這裡通常有兩種做法：
    // 1. 呼叫後端 API 把這些商品 ID 加入該團購，成功後返回刷新。
    // 2. (簡單版) 直接透過 EventChannel 把資料傳回上一頁。

    // 模擬 API 呼叫延遲
    setTimeout(() => {
      // 假設我們呼叫後端成功了
      // 這裡我們直接獲取上一頁的實例來更新資料 (或是返回後讓 onShow 更新)
      
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2]; // 上一頁
      
      if (prevPage) {
        // 更新上一頁的資料 (把新選的加進去)
        // 注意：實際上這裡應該是讓上一頁重新 fetch API
        const newDisplayList = [...prevPage.data.displayList, ...selectedItems];
        prevPage.setData({
          displayList: newDisplayList
        });
      }

      wx.hideLoading();
      wx.navigateBack(); // 返回
    }, 500);
  }
});