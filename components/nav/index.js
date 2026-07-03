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
      this.setData({
        statusHeight
      });
    },
  },
  methods: {
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
