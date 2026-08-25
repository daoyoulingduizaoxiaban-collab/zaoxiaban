// 客户订单「金额口径」的唯一来源。
//
// 为什么要独立成一支：申报金额/实收金额的上限规则原本散在三处各写一份——操作面板拿
// totalPrice 当上限、团单详情弹窗拿 declaredAmount||totalPrice、云端拿 declaredAmount 优先，
// 导致「面板放行、按下去才被云端挡」。金额规则只能有一份，且必须与云端权威版逐条对齐。
//
// 云端权威版：cloudfunctions/businessData/resources/customerOrders.js（updatePaymentStatus / create）。
// 改这里必须同步改云端，反之亦然（DEVELOPMENT_GUIDE.md 第 2 节 地端云端双通铁律）。

// 空字串 / null / undefined / 非数字一律回 NaN，交由呼叫端统一报「请填写有效金额」。
// 不能用 Number(value || 0)，那会把 undefined 变成 0，NaN 检查就失效了。
const toAmount = (value) => {
  const text = String(value == null ? '' : value).trim();
  if (!text) return NaN;
  return Number(text);
};

/**
 * 这笔订单最多能确认收多少：客户申报过就以申报额为准，没申报过（团主代登记）才用订单总额。
 * 对齐云端 customerOrders.js 的 maxPayableAmount。
 */
export const getMaxPayableAmount = (order = {}) => {
  const declaredAmount = Number(order.declaredAmount || 0);
  return declaredAmount > 0 ? declaredAmount : Number(order.totalPrice || 0);
};

/** 校验客户声明的付款金额。回传错误文案；通过回空字串。 */
export const getDeclaredAmountError = (order, declaredAmount) => {
  const value = toAmount(declaredAmount);
  if (!Number.isFinite(value) || value <= 0) return '请填写有效付款金额';

  const totalPrice = Number((order || {}).totalPrice || 0);
  if (totalPrice > 0 && value > totalPrice) return '付款金额不能超过订单金额';
  return '';
};

/** 校验团主确认的实收金额。回传错误文案；通过回空字串。 */
export const getConfirmedAmountError = (order, confirmedAmount) => {
  const value = toAmount(confirmedAmount);
  if (!Number.isFinite(value) || value <= 0) return '请填写有效实收金额';

  const declaredAmount = Number((order || {}).declaredAmount || 0);
  const maxPayableAmount = getMaxPayableAmount(order);
  if (maxPayableAmount > 0 && value > maxPayableAmount) {
    return declaredAmount > 0 ? '实收金额不能超过申报金额' : '实收金额不能超过订单金额';
  }
  return '';
};

/**
 * 下单当下算不算「已声明付款」——只看有没有填付款方式。
 * A6：付款凭证选填，没图不得阻止声明；对齐云端 create 的 hasInitialPayment。
 */
export const hasInitialPayment = (payload = {}) => Boolean(String(payload.paymentMethod || '').trim());
