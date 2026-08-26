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

/**
 * 清空本地测试资料库（决策 3：做成登录页上的按钮给 OWNER 自己清）。
 * 只在「开发者工具 + 本地后端」下可用——云端资料不给这条路碰，正式版根本不该有这个按钮。
 * 打的是 local-server 的 /reset，它会把那个放在专案目录外的 JSON 库清成空的。
 */
export const resetLocalBackendData = () => new Promise((resolve) => {
  if (!config.isDevTools || !isLocalBackend()) {
    resolve({ success: false, error: '只有开发者工具＋本地后端才能清空测试资料' });
    return;
  }
  wx.request({
    url: `${config.localBaseUrl}/reset`,
    method: 'POST',
    header: { 'content-type': 'application/json' },
    data: {},
    success: (res) => {
      const ok = Boolean(res && res.data && res.data.ok);
      resolve(ok ? { success: true } : { success: false, error: '本地后端没有清成功' });
    },
    fail: () => resolve({ success: false, error: '本地后端连接失败，请确认 local-server 已启动' }),
  });
});
