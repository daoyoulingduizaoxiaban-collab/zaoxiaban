export default {
  isMock: true,
  baseUrl: '',
};

// config/menu.js
export const BOTTOM_BAR_LIST = [
  // { icon: 'home', value: 'home', label: '首頁', path: '/pages/home/index' },
  {
    icon: 'bulletpoint',
    value: 'groupOrder',
    label: '行程',
    path: '/pages/groupOrder/index'
  },
  {
    icon: 'usergroup',
    value: 'customerOrders',
    label: '客戶訂單',
    path: '/pages/customerOrders/index'
  },
  {
    icon: 'data-display',
    value: 'productManagement',
    label: '商品管理',
    path: '/pages/productManagement/index'
  },
  {
    icon: 'user',
    value: 'my',
    label: '我的',
    path: '/pages/my/index'
  }
];