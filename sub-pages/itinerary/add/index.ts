// sub-pages/itinerary/add/index.ts
import { Itinerary } from '../../../models/itinerary'; 

Page({
  data: {
    // 初始化完全對照資料結構
    formData: {
      title: '',
      totalReceivable: 0,
      totalReceived: 0,
      totalCustomers: 0,
      description: '',
      statusText: '未付款'
    }
  },

  // 統一處理所有輸入欄位
  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    let value = e.detail.value;
    
    // 數字類型轉換
    if (['totalReceivable', 'totalReceived', 'totalCustomers'].includes(field)) {
      value = value ? parseInt(value, 10) : 0;
    }

    this.setData({
      [`formData.${field}`]: value
    });
  },

  async onSave() {
    const { formData } = this.data;
    
    if (!formData.title) {
      wx.showToast({ title: '請輸入行程名稱', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '行程建立中...' });

    // 這裡模擬將資料封裝進 Itinerary Class
    const newItinerary = {
      ...formData,
      id: Date.now(), // 臨時 ID
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${formData.title}`
    };

    console.log('提交的數據：', newItinerary);

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '新增成功',
        success: () => {
          setTimeout(() => wx.navigateBack(), 1000);
        }
      });
    }, 800);
  }
});