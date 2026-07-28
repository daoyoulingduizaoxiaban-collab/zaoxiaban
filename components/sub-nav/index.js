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
    },
    customBack: {
      type: Boolean,
      value: false
    },
    // 隐藏返回按钮（如登录 gate 入口：只有登录一步、无返回，但保留导航栏占位不跑版）。
    hideBack: {
      type: Boolean,
      value: false
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
      if (this.properties.customBack) {
        this.triggerEvent('back');
        return;
      }
      navigateBackOrTab(this.properties.fallbackUrl || '/pages/groupOrder/index');
    }
  }
});
