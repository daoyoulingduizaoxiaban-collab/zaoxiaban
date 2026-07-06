import { navigateByUrl } from '~/utils/navigation';

Component({
  options: {
    styleIsolation: 'shared',
  },
  properties: {
    navType: {
      type: String,
      value: 'title',
    },
    titleText: {
      type: String,
      value: ''
    }
  },
  data: {
    visible: false,
    canGoBack: false,
    sidebar: [
      {
        title: '团单',
        url: 'pages/groupOrder/index',
        isSidebar: true,
      },
      {
        title: '搜索',
        url: 'pages/search/index',
        isSidebar: false,
      },
    ],
    statusHeight: 0,
  },
  lifetimes: {
    ready() {
      const statusHeight = wx.getWindowInfo().statusBarHeight;
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      this.setData({
        statusHeight,
        canGoBack: this.properties.navType === 'my' && pages.length > 1,
      });
    },
  },
  methods: {
    navigateBack() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      if (pages.length > 1) {
        wx.navigateBack();
        return;
      }
      navigateByUrl('/pages/my/index');
    },

    openDrawer() {
      this.setData({
        visible: true,
      });
    },
    itemClick(e) {
      const {
        url
      } = e.detail.item;
      navigateByUrl(`/${url}`, {
        success: () => this.setData({ visible: false }),
        fail: () => wx.showToast({ title: '暂时无法打开该页面', icon: 'none' }),
      });
    },

    searchTurn() {
      navigateByUrl('/pages/search/index');
    },
  },
});
