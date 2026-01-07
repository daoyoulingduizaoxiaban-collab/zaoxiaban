Page({
  data: {
    titleText: '供應',
    // 模擬數據：供應名稱、狀態、日期
    providersList: [
      { id: 'S001', title: '台北三日遊 - 收集行李規劃', status: 'ongoing', statusText: '進行中', date: '2026-01-10' },
      { id: 'S002', title: '台中商務供應', status: 'pending', statusText: '待出發', date: '2026-01-15' },
      { id: 'S003', title: '高雄導覽活動', status: 'completed', statusText: '已結束', date: '2025-12-25' }
    ]
  },

  // 點擊供應跳轉至詳情頁
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      // 跳轉時攜帶 id，方便詳情頁請求對應數據
      url: `/pages/providers/detail?id=${id}`,
      fail: (err) => {
        console.error("跳轉詳情頁失敗：", err);
      }
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'providers' 
      });
    }
  },

  onGoToEdit(e) {
    const id = e.currentTarget?.dataset?.id;
    const url = id ? `/pages/providers/edit/index?id=${id}` : '/pages/providers/edit/index';
    console.log(url)
    wx.navigateTo({
      url: url,
      success: () => console.log('跳轉成功'),
      fail: (err) => {
        console.error('跳轉失敗原因:', err); // 💡 這行會告訴你為什麼沒換畫面
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        }
      }
    });
  }
});