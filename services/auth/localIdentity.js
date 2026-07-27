import config from '~/config';

// 本地测试多人身份（仅 DEV + dataBackend==='local' 生效；PROD/cloud 一律用真实微信 OpenID）。
// 本地后端取不到真微信 OpenID，用客户端送的 openId 当身份；给每个测试者一个不同的「测试身份」，
// 即各自独立账号。留空＝回退 config.localDevOpenId（即 owner 自己）。
const KEY = 'dao_you_ling_local_identity';

const isEnabled = () => Boolean(config.isDev && config.dataBackend === 'local');

const sanitize = raw => String(raw || '').trim().replace(/\s+/g, '-').slice(0, 40);

export const isLocalIdentityEnabled = isEnabled;

export const getLocalIdentity = () => {
  if (!isEnabled()) return '';
  try {
    return wx.getStorageSync(KEY) || '';
  } catch (e) {
    return '';
  }
};

export const setLocalIdentity = (raw) => {
  if (!isEnabled()) return '';
  const slug = sanitize(raw);
  const openId = slug ? `tester-${slug}` : '';
  try {
    if (openId) wx.setStorageSync(KEY, openId);
    else wx.removeStorageSync(KEY);
  } catch (e) {
    /* ignore */
  }
  return openId;
};

// 登录页输入框回填：去掉 tester- 前缀显示原始输入。
export const getLocalIdentityLabel = () => {
  const id = getLocalIdentity();
  return id.indexOf('tester-') === 0 ? id.slice('tester-'.length) : '';
};

// 本地模式登录/请求用的 openId：优先测试身份，否则回退 config.localDevOpenId（owner）。
export const resolveLocalOpenId = () => getLocalIdentity() || config.localDevOpenId;
