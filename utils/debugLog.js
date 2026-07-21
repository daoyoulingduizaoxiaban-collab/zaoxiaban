import config from '~/config';

// R6-2 可开关调试日志：由 config.debugLog 统一控制（DEV 默认开、PROD 关）。
// 打印带毫秒时间戳，便于排查加载三态的瞬态顺序（如空白闪帧：ready 早于 authReady）。
// 用法：debugLog('access', 'threeState', state, extra);
// no-console 规则仅放行 warn/error；此处集中一处用 console.log，故就地豁免。

const pad = (num, len = 2) => String(num).padStart(len, '0');

const timestamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

export const isDebugLogEnabled = () => Boolean(config && config.debugLog);

export const debugLog = (tag, ...args) => {
  if (!isDebugLogEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[${timestamp()}][${tag}]`, ...args);
};

export default debugLog;
