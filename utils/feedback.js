// 统一「增删改」操作结果提示，避免各页各写、措辞不一（标准见 BUSINESS_LOGIC_PRINCIPLES.md A9「操作结果反馈」）。
//
// 注意：本模块只负责「操作成功/失败」的结果反馈，与「保存模式」文案（cloudBusinessRepository 的
// getSaveModeText：资料已同步/资料已保存）是两回事——后者只是数据落到云端还是本地的位置指示，
// **不得**当作操作成功提示。增删改成功一律用本模块的标准文案。
//
// 不在本标准内（保留各自具体文案）：复制到剪贴板、生成二维码等一次性动作、表单内即时加项、
// 字段校验警告、登录态失效等——它们不是「增删改结果」。

// 增删改结果的标准文案（按动作分类，全站统一）。
export const RESULT_TEXT = {
  create: '新增成功',
  save: '保存成功',
  update: '更新成功',
  remove: '删除成功',
  submit: '提交成功',
};

export const DEFAULT_ERROR_TEXT = '操作失败，请稍后重试';

// 成功提示（绿色对勾）。传标准文案，如 toastSuccess(RESULT_TEXT.create)。
export const toastSuccess = (text = '操作成功') => wx.showToast({ title: text, icon: 'success' });

// 失败提示（无图标）。优先用后端返回的具体错误，缺省用通用兜底文案。
export const toastError = (text) => wx.showToast({ title: text || DEFAULT_ERROR_TEXT, icon: 'none' });
