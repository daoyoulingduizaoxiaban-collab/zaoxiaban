import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { ProductRepository } from './productRepository';
import { GroupOrderRepository } from './groupOrderRepository';
import { CustomerOrderRepository } from './customerOrderRepository';

const sameId = (a, b) => String(a) === String(b);

const maskOpenId = openId => {
  const text = String(openId || '');
  if (text.length <= 8) return text ? '已验证账号' : '';
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
};

const canSeeGuideResource = (profile, item = {}) => (
  isOwnerOrAdmin(profile)
  || sameId(item.guideUserId || item.ownerUserId, profile.id)
  || (item.authorizedGuideIds || []).some(id => sameId(id, profile.id))
);

const getProductActionText = (product) => {
  if (product.deletedAt) return '删除商品';
  return Number(product.status) === 2 ? '维护上架商品' : '维护下架商品';
};

const buildLog = (profile, patch) => ({
  id: patch.id,
  occurredAt: patch.occurredAt || patch.updatedAt || patch.createdAt || '',
  actorName: profile.displayName || '当前账号',
  actorOpenIdText: maskOpenId(profile.openId),
  actorRole: profile.roleLabel || profile.role || '',
  result: '成功',
  ...patch,
});

export const OperationLogRepository = {
  async listVisible({ type = 'all' } = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.OPERATION_LOGS)) {
      return { success: false, error: '当前账号不能查看操作记录' };
    }

    const [productRes, groupOrderRes, customerOrderRes] = await Promise.all([
      ProductRepository.listVisible(),
      GroupOrderRepository.listVisible(),
      CustomerOrderRepository.listVisible(),
    ]);
    const failed = [productRes, groupOrderRes, customerOrderRes].find(res => !res.success);
    if (failed) return { success: false, error: failed.error || '读取操作记录失败' };

    const products = productRes.data || [];
    const groupOrders = groupOrderRes.data || [];
    const customerOrders = customerOrderRes.data || [];
    const logs = [];

    products.forEach(product => {
      if (!isOwnerOrAdmin(profile) && hasRole(profile, 'guide') && product.ownerUserId && !sameId(product.ownerUserId, profile.id)) return;
      logs.push(buildLog(profile, {
        id: `product-${product.id || product._id}`,
        type: 'product',
        typeText: '商品',
        actionText: getProductActionText(product),
        resourceText: product.title || '商品',
        summary: product.sourceNote || product.description || '商品资料已维护',
        occurredAt: product.updatedAt || product.createdAt || '',
      }));
    });

    groupOrders.forEach(order => {
      if (!canSeeGuideResource(profile, order)) return;
      logs.push(buildLog(profile, {
        id: `group-${order.id || order._id}`,
        type: 'groupOrder',
        typeText: '团单',
        actionText: '维护团单',
        resourceText: order.title || '团单',
        summary: order.description || order.pickupNote || '团单资料已维护',
        occurredAt: order.updatedAt || order.createdAt || '',
      }));
    });

    customerOrders.forEach(order => {
      if (!isOwnerOrAdmin(profile) && hasRole(profile, 'guide') && order.guideUserId && !sameId(order.guideUserId, profile.id)) return;
      logs.push(buildLog(profile, {
        id: `customer-order-${order.id || order._id}`,
        type: 'customerOrder',
        typeText: '客户订单',
        actionText: Number(order.status) === 2 ? '确认收款' : '处理客户订单',
        resourceText: order.title || order.customerName || '客户订单',
        summary: `${order.statusText || '订单状态'}｜金额 ¥${order.totalPrice || 0}`,
        occurredAt: order.updatedAt || order.createdAt || '',
      }));
    });

    const filtered = type && type !== 'all' ? logs.filter(item => item.type === type) : logs;
    return {
      success: true,
      data: filtered.sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || ''))),
      meta: { source: 'business-record-readback' },
    };
  },
};
