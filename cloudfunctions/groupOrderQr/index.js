// 生成团单客户下单入口的小程序码（wxacode.getUnlimited）。scene 用团单 shareToken（短、合法字符）。
// 客户扫码 → 打开 page，页面拿 options.scene(=shareToken) → 后端按 shareToken 反查团单放行。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 小程序未发布正式版时 envVersion=release 会直接报错 → 按 正式版→体验版→开发版 依序回退。
const ENV_VERSIONS = ['release', 'trial', 'develop'];

const generateWith = async (scene, page, versions) => {
  const [envVersion, ...rest] = versions;
  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      checkPath: false, // 页面可能尚未发布，关闭校验；正式发布后可去掉
      envVersion,
      width: 430,
    });
    const upload = await cloud.uploadFile({
      cloudPath: `group-order-qr/${scene}.png`,
      fileContent: res.buffer,
    });
    return { success: true, data: { fileID: upload.fileID, envVersion } };
  } catch (err) {
    const message = (err && (err.errMsg || err.message)) || '二维码生成失败';
    if (!rest.length) return { success: false, error: message };
    return generateWith(scene, page, rest);
  }
};

exports.main = async (event = {}) => {
  const scene = String(event.scene || '').trim().slice(0, 32);
  const page = String(event.page || 'pages/customerOrders/edit/index').replace(/^\//, '');
  if (!scene) return { success: false, error: '缺少 scene（shareToken）' };
  return generateWith(scene, page, ENV_VERSIONS);
};
