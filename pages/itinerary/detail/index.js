import {
  Itinerary
} from '~/models/Itinerary';
import {
  ItineraryMock
} from '../../../mock/itinerary/index';

Page({
  data: {
    pageTitle: '',
    formData: new Itinerary(),
  },

  onLoad(options) {
    //todo 測試假資料
    let id = 1 ?? options.id;

    if (id) {
      this.setData({
        pageTitle: '查看行程',
      });
      this.fetchItineraryDetail(id);
    } else {
      this.setData({
        pageTitle: '新增行程',
      });
    }
  },

  async fetchItineraryDetail(id) {
    try {
      const res = await ItineraryMock.fetchById(id)
      console.log(res.data)
      if (res.code === 200) {
        this.setData({
          formData: res.data
        });
      }

    } catch (err) {
      console.error('抓取行程清單失敗', err);
    } finally {
      wx.hideLoading();
    }

  },

  onSave() {
    const action = this.data.isEdit ? '更新' : '創建';
    wx.showToast({
      title: `${action}成功`,
      icon: 'success'
    });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  onBack() {
    wx.navigateBack();
  },

});