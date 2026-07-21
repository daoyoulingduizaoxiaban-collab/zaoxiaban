const getEnvValue = (keys) => {
  if (typeof process !== 'object' || typeof process.env !== 'object') {
    return '';
  }

  const value = keys
    .map(key => process.env[key])
    .find(item => item);
  return value || '';
};

const APP_ENV = String(getEnvValue(['APP_ENV', 'ENV_NAME']) || 'DEV').toUpperCase();

const ENVIRONMENTS = Object.freeze({
  DEV: 'DEV',
  PROD: 'PROD',
});

const CLOUD_ENV_IDS = Object.freeze({
  [ENVIRONMENTS.DEV]: 'cloud1-3gwlqssy1f1972a9',
  [ENVIRONMENTS.PROD]: '',
});

const devMode = Object.freeze({
  allowRolePreview: true,
});

const isDev = APP_ENV === ENVIRONMENTS.DEV;
const isProd = APP_ENV === ENVIRONMENTS.PROD;

// 数据后端开关：
//   'local' —— 本地 Node 服务（付费云开发前测试，见 local-server/），前台走 wx.request。
//   'cloud' —— 微信云开发，前台走 wx.cloud.callFunction。
// PROD 固定 cloud；DEV 默认 local（改成 'cloud' 即无痛切到云开发，业务代码不变）。
const DATA_BACKEND = isProd ? 'cloud' : 'local';

export default {
  appEnv: APP_ENV,
  isDev,
  isProd,

  cloudEnvId: CLOUD_ENV_IDS[APP_ENV] || '',

  dataBackend: DATA_BACKEND,
  // 本地后端地址与开发用 openId（仅 dataBackend==='local' 生效）。
  // localDevOpenId 决定你以谁的身份登录：填 owner 白名单里的值即以 owner 测，换成别的字符串即普通客户。
  localBaseUrl: 'http://localhost:3000',
  localDevOpenId: 'dev-owner-openid',

  allowRolePreview: isDev && devMode.allowRolePreview,
};

// config/menu.js
export const BOTTOM_BAR_LIST = [
  // { icon: 'home', value: 'home', label: '首頁', path: '/pages/home/index' },
  {
    icon: 'bulletpoint',
    value: 'groupOrder',
    label: '团单',
    path: '/pages/groupOrder/index'
  },
  {
    icon: 'usergroup',
    value: 'customerOrders',
    label: '客户订单',
    path: '/pages/customerOrders/index'
  },
  {
    icon: 'data-display',
    value: 'productManagement',
    label: '商品库',
    path: '/pages/productManagement/index'
  },
  {
    icon: 'user',
    value: 'my',
    label: '我的',
    path: '/pages/my/index'
  }
];
