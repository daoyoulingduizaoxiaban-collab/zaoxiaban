Page({
  data: {
    titleText: '我的',
    // 模擬數據：我的名稱、狀態、日期
    profileList: [
      { id: 'S001', title: '台北三日遊 - 收集行李規劃', status: 'ongoing', statusText: '進行中', date: '2026-01-10' },
      { id: 'S002', title: '台中商務我的', status: 'pending', statusText: '待出發', date: '2026-01-15' },
      { id: 'S003', title: '高雄導覽活動', status: 'completed', statusText: '已結束', date: '2025-12-25' }
    ]
  },

  // 點擊我的跳轉至詳情頁
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      // 跳轉時攜帶 id，方便詳情頁請求對應數據
      url: `/pages/profile/detail?id=${id}`,
      fail: () => {
        wx.showToast({
          title: '跳轉詳情頁失敗',
          icon: 'none'
        });
      }
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'profile' 
      });
    }
  },

  onGoToEdit(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const url = id ? `/pages/profile/edit/index?id=${id}` : '/pages/profile/edit/index';

    wx.navigateTo({
      url: url,
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        }
      }
    });
  }
});
