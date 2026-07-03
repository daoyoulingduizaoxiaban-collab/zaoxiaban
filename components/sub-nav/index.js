import { navigateBackOrTab } from '~/utils/navigation';

Component({
  data: {
    statusHeight: 0,
    navHeight: 48,
  },
  properties: {
    title: {
      type: String,
      value: '页面'
    },
    fallbackUrl: {
      type: String,
      value: '/pages/groupOrder/index'
    }
  },
  lifetimes: {
    ready() {
      const statusHeight = wx.getWindowInfo ? wx.getWindowInfo().statusBarHeight : 0;
      this.setData({
        statusHeight,
        navHeight: statusHeight + 48,
      });
    },
  },
  methods: {
    onBack() {
      navigateBackOrTab(this.properties.fallbackUrl || '/pages/groupOrder/index');
    }
  }
});
