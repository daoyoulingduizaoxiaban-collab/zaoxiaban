Page({
  data: {
    searchQuery: '',
    rawList: [],    // 原始完整列表
    displayList: [] // 搜尋過濾後的列表
  },

  onShow() {
    // 每次頁面顯示時重新抓取資料 (確保從選品頁回來後資料是最新的)
    this.loadGroupProducts();
  },

  // 1. 載入本團商品
  loadGroupProducts() {
    // 模擬：從後端 API 取得
    const mockData = [
      { id: 101, title: '手工餅乾 (原味)', priceDisplay: '$100', soldCount: 5, pictureUrls: [],description:"dddd" },
      { id: 103, title: '有機冷泡茶', priceDisplay: '$60', soldCount: 12, pictureUrls: [] ,description:"aaaaa" }
    ];

    this.setData({
      rawList: mockData,
      // 如果目前有搜尋關鍵字，則保留過濾狀態，否則顯示全部
      displayList: this.filterList(mockData, this.data.searchQuery)
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
    return list.filter(item => item.title.includes(query));
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
    const { index, id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '移除商品',
      content: '確定要從本團移除此商品嗎？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 呼叫後端 API 刪除
          // wx.request({ url: 'deleteUrl', method: 'POST', data: { id } ... })
          
          // 前端先移除
          const newList = [...this.data.displayList];
          newList.splice(index, 1);
          
          // 同步更新 rawList (略過複雜邏輯，建議重新 fetch)
          this.setData({
            displayList: newList
          });
          
          wx.showToast({ title: '已移除', icon: 'none' });
        }
      }
    });
  },

  // 5. 跳轉到「商品庫選擇頁」
  goToLibrary() {
    //TODO
    //const existingIds = this.data.rawList.map(item => item.id);
    const existingIds = [1]
    
    wx.navigateTo({
      url: `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}`,
      fail: (err) => {
        console.error("跳轉詳情頁失敗：", err);
      }
    });
  }
});