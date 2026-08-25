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

// ⚠️ APP_ENV 读的是 process.env，而**小程序 runtime 没有 process**（实测
// typeof process === 'undefined'），所以 APP_ENV 恒为 'DEV'、下面两个恒为 true/false。
// 光靠它们当「正式版」的门是无效的——正式包一样会放行，开发工具会露给真实用户。
// 真正可靠的是官方的 envVersion：'develop'（开发者工具）/ 'trial'（体验版）/ 'release'（正式版）。
// 所以对外暴露的 isDev / isProd 一律再过一次 isReleaseBuild()，见档案下方的 getter。
const isDevEnv = APP_ENV === ENVIRONMENTS.DEV;
const isProdEnv = APP_ENV === ENVIRONMENTS.PROD;

const isReleaseBuild = () => {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion === 'release';
  } catch (err) {
    // 取不到就当正式版：宁可少一个开发工具，也不要在正式版露出来。
    return true;
  }
};

/** 开发工具（报Bug 入口、复制 ID、角色预览、本地测试身份、数据后端开关）统一用这个当门。 */
const resolveIsDev = () => isDevEnv && !isReleaseBuild();
const resolveIsProd = () => isProdEnv || isReleaseBuild();

// 数据后端开关：
//   'local' —— 本地 Node 服务（付费云开发前测试，见 local-server/），前台走 wx.request。
//   'cloud' —— 微信云开发，前台走 wx.cloud.callFunction。
//
// **不要改这个档来切后端**（改源码会触发热重载，把模拟器导航重置，自动化测试会莫名其妙
// 停在起始页；而且很容易忘了还原就提交上去）。DEV 改从本机储存读，切法两种：
//   1. 设置页的「数据后端」开关（正式版不显示），点完立即生效；
//   2. 指令：node local-server/set-backend.js local ｜ cloud
// 正式版（envVersion==='release'）一律 cloud，读都不读这个储存值。
export const DATA_BACKEND_STORAGE_KEY = 'dao_you_ling_data_backend';
const DEFAULT_DATA_BACKEND = 'cloud';

// 每次读都查储存（不快取），所以切完立刻生效、不必重新编译，自动化脚本也能直接写储存后就跑。
// 查的是一个极小的 key，成本可忽略，且只在发后端请求时被读到，不在渲染路径上。
const resolveDataBackend = () => {
  if (resolveIsProd()) return 'cloud';
  try {
    const stored = wx.getStorageSync(DATA_BACKEND_STORAGE_KEY);
    return stored === 'local' || stored === 'cloud' ? stored : DEFAULT_DATA_BACKEND;
  } catch (err) {
    // 取不到储存（极早期启动、或储存被清）就走预设，不让设定读取本身把 App 打挂。
    return DEFAULT_DATA_BACKEND;
  }
};

/** 切数据后端。PROD 不给切。回传切完的值。 */
export const setDataBackend = (value) => {
  if (resolveIsProd()) return 'cloud';
  const next = value === 'local' ? 'local' : 'cloud';
  wx.setStorageSync(DATA_BACKEND_STORAGE_KEY, next);
  return next;
};

export default {
  appEnv: APP_ENV,
  // getter：每次读都重新判定正式版（见上方注释，不能在载入当下算死）。
  get isDev() { return resolveIsDev(); },
  get isProd() { return resolveIsProd(); },

  cloudEnvId: CLOUD_ENV_IDS[APP_ENV] || '',

  // getter：每次读都查储存，切换即时生效（见上方 resolveDataBackend）。
  get dataBackend() { return resolveDataBackend(); },
  // 本地后端地址与开发用 openId（仅 dataBackend==='local' 生效）。
  // localDevOpenId 决定你以谁的身份登录：填 owner 白名单里的值即以 owner 测，换成别的字符串即普通客户。
  localBaseUrl: 'http://localhost:3000',
  localDevOpenId: 'dev-owner-openid',

  get allowRolePreview() { return resolveIsDev() && devMode.allowRolePreview; },

  // R6-2 调试日志开关：开时关键页/behavior 打带时间戳日志，便于排查加载三态瞬态（空白闪帧等）。
  // 默认 DEV 开、PROD 关；需要静默时在 DEV 手动改为 false。
  get debugLog() { return resolveIsDev(); },
};

// config/menu.js
export const BOTTOM_BAR_LIST = [
  {
    icon: 'usergroup',
    value: 'groupOrder',
    label: '团单',
    path: '/pages/groupOrder/index'
  },
  {
    icon: 'order',
    value: 'customerOrders',
    label: '客户订单',
    path: '/pages/customerOrders/index'
  },
  {
    icon: 'shop',
    value: 'productManagement',
    label: '商品库',
    path: '/pages/productManagement/index'
  },
  {
    icon: 'user-setting',
    value: 'userReview',
    label: '用户审核',
    path: '/pages/userReview/index'
  },
  {
    icon: 'user',
    value: 'my',
    label: '我的',
    path: '/pages/my/index'
  }
];
