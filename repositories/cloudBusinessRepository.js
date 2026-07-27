import config from '~/config';
import { AuthService } from '~/services/auth/authService';
import { callBackendFunction, isBackendConfigured, isLocalBackend } from '~/services/backend/backendCall';
import { resolveLocalOpenId } from '~/services/auth/localIdentity';

const getCallerOpenId = () => {
  const profile = AuthService.getRealProfile() || AuthService.getCurrentProfile();
  return (profile && profile.openId) || resolveLocalOpenId() || '';
};

export const CLOUD_SAVE_MODE = 'wechat-cloud-repository';
export const LOCAL_SAVE_MODE_TEXT = '资料已保存';
export const CLOUD_SAVE_MODE_TEXT = '资料已同步';

export const getSaveModeText = meta => (
  meta && meta.saveMode === CLOUD_SAVE_MODE ? CLOUD_SAVE_MODE_TEXT : LOCAL_SAVE_MODE_TEXT
);

const getCloudCallerContext = () => {
  const profile = AuthService.getCurrentProfile();
  const realProfile = AuthService.getRealProfile();
  if (!profile) return {};

  const isRolePreview = Boolean(
    profile.isRolePreview
    && realProfile
    && String(profile.openId) === String(realProfile.openId)
  );

  return {
    isRolePreview,
    simulationRole: isRolePreview ? profile.role : '',
    isMockOpenId: Boolean(profile.isMockOpenId),
    qaOverride: Boolean(profile.qaOverride),
    realRole: realProfile && realProfile.role ? realProfile.role : profile.role,
    appEnv: config.appEnv,
  };
};

export const isCloudBusinessEnabled = () => Boolean(AuthService.getCurrentProfile() && isBackendConfigured());

export const isCloudBusinessConfigured = () => isBackendConfigured();

export const callBusinessData = ({ resource, action, data = {} }) => {
  if (!isCloudBusinessEnabled()) return Promise.resolve({ success: false, error: '资料服务暂时不可用' });
  return callBackendFunction({
    name: 'businessData',
    event: { resource, action, data, context: getCloudCallerContext() },
    openId: getCallerOpenId(),
  });
};

export const callPublicBusinessData = ({ resource, action, data = {} }) => {
  if (!isCloudBusinessConfigured()) return Promise.resolve({ success: false, error: '资料服务暂时不可用' });
  return callBackendFunction({
    name: 'businessData',
    event: { resource, action, data, context: getCloudCallerContext() },
    openId: getCallerOpenId(),
  });
};

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

  // 本地后端无云存储：本地测试时直接沿用临时路径（图片为选填，不阻塞主流程）。
  if (isLocalBackend()) {
    resolve({ success: true, data: path });
    return;
  }

  if (!isCloudBusinessEnabled() || !wx.cloud || !wx.cloud.uploadFile) {
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
