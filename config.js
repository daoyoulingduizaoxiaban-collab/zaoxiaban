export default {
  isMock: false,
  baseUrl: '',
  cloudEnvId: 'cloud1-3gwlqssy1f1972a9',
  useCloudBusinessData: true,
};

// config/menu.js
export const BOTTOM_BAR_LIST = [
  // { icon: 'home', value: 'home', label: '首頁', path: '/pages/home/index' },
  {
    icon: 'bulletpoint',
    symbol: '单',
    value: 'groupOrder',
    label: '团单',
    path: '/pages/groupOrder/index'
  },
  {
    icon: 'usergroup',
    symbol: '客',
    value: 'customerOrders',
    label: '客户订单',
    path: '/pages/customerOrders/index'
  },
  {
    icon: 'data-display',
    symbol: '品',
    value: 'productManagement',
    label: '商品库',
    path: '/pages/productManagement/index'
  },
  {
    icon: 'user',
    symbol: '我',
    value: 'my',
    label: '我的',
    path: '/pages/my/index'
  }
];
