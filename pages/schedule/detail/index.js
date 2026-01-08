import {
  Schedule
} from '~/models/schedule';
import {
  scheduleMock
} from '../../../mock/schedule/index';
import * as SelectUtil from '../../../utils/selectUtil';

Page({
  data: {
    pageTitle: '',
    formData: new Schedule(),
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        pageTitle: '查看行程',
      });
      this.fetchScheduleDetail(options.id);
    } else {
      this.setData({
        pageTitle: '新增行程',
      });
    }
  },

  async fetchScheduleDetail(id) {
    try {
      const res = await scheduleMock.fetchById(id)
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