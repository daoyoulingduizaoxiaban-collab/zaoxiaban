// 客户订单「怎么显示」的唯一来源。
//
// 为什么要独立成一支：同一笔订单原本在两个地方各画一份——客户订单页走共用元件
// <order-detail>（13 个栏位），团单详情页自己内嵌重画（9 个栏位，少了付款备注、
// 状态变更纪录、付款凭证、客户姓名）。转换逻辑写死在客户订单页里，第二个页面
// 重用不了，只能自己再写一份，于是每次补栏位都只补到一处。
//
// 显示口径只能有一份。要在第三个地方显示订单，import 这里，不要再自己组。

import { getMemberOrderStatusList } from '~/enum/MemberOrderStatus';

const STATUS_TEXT = getMemberOrderStatusList()
  .reduce((map, item) => ({ ...map, [item.value]: item.label }), {});

const ROLE_TEXT = {
  customer: '客户',
  guide: '团主',
  owner: '产品拥有者',
  admin: '运营管理员',
};

const proofTextOf = (count) => (Number(count || 0) > 0 ? `${Number(count)} 张` : '未上传凭证');

const statusTextOf = (order = {}) => {
  if (order.statusText) return order.statusText;
  const status = order.status !== undefined ? order.status : order.paymentStatus;
  return STATUS_TEXT[status] || '';
};

/** 订单里的商品列，两个页面同一份口径。 */
const buildItems = (order = {}) => (order.items || order.productList || []).map(product => ({
  title: product.title || '商品资料',
  quantity: product.amount || product.quantity || 0,
  totalPrice: product.totalPrice || 0,
}));

/** 付款/状态变更纪录，两个页面同一份口径。 */
const buildHistory = (order = {}) => (order.paymentHistory || []).map(history => ({
  createdAt: history.createdAt || '',
  actorText: [history.actorName, ROLE_TEXT[history.actorRole] || history.actorRole].filter(Boolean).join(' / '),
  statusText: history.toStatus !== undefined ? (STATUS_TEXT[history.toStatus] || history.toStatus) : '',
  amount: Number(history.amount || 0) > 0 ? history.amount : '',
  paymentMethod: history.paymentMethod || '',
  proofText: proofTextOf(history.proofCount),
  note: history.note || '',
}));

/**
 * 订单明细弹窗要的完整形状（给 <order-detail> 元件用）。
 * 团单详情页与客户订单页都走这支，不准任何一边自己再组一份。
 */
export const buildOrderDetailView = (order) => {
  const source = order || {};
  return {
    ...source,
    statusText: statusTextOf(source),
    displayItems: buildItems(source),
    displayHistory: buildHistory(source),
    proofText: proofTextOf((source.paymentProofUrls || []).length),
  };
};

/**
 * 订单卡片要的形状。`showCustomerName` 控制要不要露出客户姓名——
 * 团主看得到、客户看自己的单不需要，这个差异用参数表达，不要各写一份卡片。
 */
export const buildOrderCardView = (order, { showCustomerName = true } = {}) => {
  const source = order || {};
  const items = source.items || source.productList || [];
  return {
    ...source,
    statusText: statusTextOf(source),
    customerName: showCustomerName ? (source.customerName || '') : '',
    itemCount: source.itemCount !== undefined
      ? source.itemCount
      : items.reduce((sum, item) => sum + Number(item.amount || item.quantity || 0), 0),
    historyCount: source.historyCount !== undefined ? source.historyCount : (source.paymentHistory || []).length,
    proofText: proofTextOf((source.paymentProofUrls || []).length),
  };
};
