import config from '~/config';
import { AuthService } from '~/services/auth/authService';

export const CLOUD_SAVE_MODE = 'wechat-cloud-repository';
export const LOCAL_SAVE_MODE_TEXT = '已保存到当前设备';
export const CLOUD_SAVE_MODE_TEXT = '已同步保存';

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
    resolve({ success: false, error: '资料服务暂时不可用' });
    return;
  }

  wx.cloud.callFunction({
    name: 'businessData',
    data: { resource, action, data },
    success: res => resolve(res.result || { success: false, error: '资料服务暂时不可用' }),
    fail: () => resolve({ success: false, error: '资料保存失败，请稍后重试' }),
  });
});

const getCloudFileName = (path, index, prefix = 'uploads') => {
  const name = String(path || '').split('/').pop() || `image-${index}.jpg`;
  const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}/${Date.now()}-${index}-${cleanName}`;
};

const uploadOneFile = (path, index, prefix) => new Promise((resolve) => {
  if (!path || path.indexOf('cloud://') === 0 || path.indexOf('https://') === 0) {
    resolve({ success: true, data: path });
    return;
  }

  if (!isCloudBusinessEnabled() || !wx.cloud.uploadFile) {
    resolve({ success: false, error: '图片上传服务暂时不可用' });
    return;
  }

  wx.cloud.uploadFile({
    cloudPath: getCloudFileName(path, index, prefix),
    filePath: path,
    success: res => resolve({ success: true, data: res.fileID }),
    fail: () => resolve({ success: false, error: '图片上传失败，请稍后重试' }),
  });
});

export const uploadCloudFiles = async (paths = [], prefix = 'uploads') => {
  const uploads = await Promise.all((paths || []).map((path, index) => uploadOneFile(path, index, prefix)));
  const failed = uploads.find(item => !item.success);
  if (failed) return failed;
  return { success: true, data: uploads.map(item => item.data).filter(Boolean) };
};

export const uploadProductImages = async (pictureUrls = []) => uploadCloudFiles(pictureUrls, 'products');
