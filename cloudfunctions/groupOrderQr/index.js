// 生成团单客户下单入口的小程序码（wxacode.getUnlimited）。scene 用团单 shareToken（短、合法字符）。
// 客户扫码 → 打开 page，页面拿 options.scene(=shareToken) → 后端按 shareToken 反查团单放行。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const scene = String(event.scene || '').trim().slice(0, 32);
  const page = String(event.page || 'pages/customerOrders/edit/index').replace(/^\//, '');
  if (!scene) return { success: false, error: '缺少 scene（shareToken）' };
  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      checkPath: false, // 页面可能尚未发布，关闭校验；正式发布后可去掉
      envVersion: event.envVersion || 'release',
      width: 430,
    });
    const upload = await cloud.uploadFile({
      cloudPath: `group-order-qr/${scene}.png`,
      fileContent: res.buffer,
    });
    return { success: true, data: { fileID: upload.fileID } };
  } catch (err) {
    return { success: false, error: (err && (err.errMsg || err.message)) || '二维码生成失败' };
  }
};
