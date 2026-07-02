import config from '~/config';
import { AuthService } from '~/services/auth/authService';

export const CLOUD_SAVE_MODE = 'wechat-cloud-repository';
export const LOCAL_SAVE_MODE_TEXT = '本地/QA 展示模式，尚未正式保存到云端';
export const CLOUD_SAVE_MODE_TEXT = '已保存到微信云端';

export const getSaveModeText = meta => (
  meta && meta.saveMode === CLOUD_SAVE_MODE ? CLOUD_SAVE_MODE_TEXT : LOCAL_SAVE_MODE_TEXT
);

export const isCloudBusinessEnabled = () => {
  const profile = AuthService.getCurrentProfile();
  return Boolean(
    config.useCloudBusinessData
    && config.cloudEnvId
    && profile
    && !profile.isMockOpenId
    && wx.cloud
    && wx.cloud.callFunction
  );
};

export const callBusinessData = ({ resource, action, data = {} }) => new Promise((resolve) => {
  if (!isCloudBusinessEnabled()) {
    resolve({ success: false, error: '正式云端资料层不可用' });
    return;
  }

  wx.cloud.callFunction({
    name: 'businessData',
    data: { resource, action, data },
    success: res => resolve(res.result || { success: false, error: '云函数未返回结果' }),
    fail: err => resolve({ success: false, error: err.errMsg || '云端资料操作失败' }),
  });
});
