import config from '~/config';

/**
 * 统一后端调用层：按 config.dataBackend 在本地服务与微信云开发之间切换。
 * 返回值形状与 wx.cloud.callFunction 的 res.result 对齐（即云函数 main 的返回对象）。
 */

export const isLocalBackend = () => config.dataBackend === 'local';

export const isBackendConfigured = () => (
  isLocalBackend()
    ? Boolean(config.localBaseUrl)
    : Boolean(config.cloudEnvId && wx.cloud && wx.cloud.callFunction)
);

const callLocal = (name, event, openId) => new Promise((resolve) => {
  wx.request({
    url: `${config.localBaseUrl}/fn/${name}`,
    method: 'POST',
    header: { 'content-type': 'application/json' },
    data: { event: event || {}, openId: openId || '' },
    success: (res) => {
      const body = res && res.data;
      resolve((body && body.result) || { success: false, error: '本地后端无响应' });
    },
    fail: () => resolve({ success: false, error: '本地后端连接失败，请确认 local-server 已启动' }),
  });
});

const callCloud = (name, event) => new Promise((resolve) => {
  wx.cloud.callFunction({
    name,
    data: event || {},
    success: res => resolve(res.result || { success: false, error: '服务暂时不可用' }),
    fail: () => resolve({ success: false, error: '服务暂时不可用' }),
  });
});

/**
 * @param {string} name   云函数名（authLogin / businessData）
 * @param {object} event  传给云函数 main 的 event
 * @param {string} openId 本地模式下的调用者 openId（云模式忽略）
 */
export const callBackendFunction = ({ name, event, openId }) => (
  isLocalBackend() ? callLocal(name, event, openId) : callCloud(name, event)
);
