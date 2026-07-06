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

const BASE_URL = '';

const devMode = Object.freeze({
  allowRolePreview: true,
  allowQaTools: true,
  allowMockIdentity: true,
  allowSeedDataFallback: true,
});

const isDev = APP_ENV === ENVIRONMENTS.DEV;

export default {
  appEnv: APP_ENV,
  isDev,
  isProd: APP_ENV === ENVIRONMENTS.PROD,

  baseUrl: BASE_URL,
  cloudEnvId: CLOUD_ENV_IDS[APP_ENV] || '',

  useCloudBusinessData: true,

  allowRolePreview: isDev && devMode.allowRolePreview,
  allowQaTools: isDev && devMode.allowQaTools,
  allowMockIdentity: isDev && devMode.allowMockIdentity,
  allowSeedDataFallback: isDev && devMode.allowSeedDataFallback,

  requestDelayMs: (isDev && devMode.allowMockIdentity) ? 500 : 0,
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
