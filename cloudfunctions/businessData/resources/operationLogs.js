const {
  getCollection,
  success,
  assertApprovedProfile,
  isOwnerOrAdmin,
} = require('../lib/core');

const TYPE_TEXT = {
  product: '商品',
  groupOrder: '团单',
  customerOrder: '客户订单',
  provider: '供应商',
  user: '用户',
};

const parseDayStart = (value) => {
  if (!value) return 0;
  const t = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const parseDayEnd = (value) => {
  if (!value) return 0;
  const t = new Date(`${value}T23:59:59`).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const toTime = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? NaN : t;
};

const operationLogActions = {
  // 真正的事件表（写在各资源 create/update/remove 成功之后），不是从当前资料现算——
  // 删除的东西一样有记录，不会因为原资料没了就从这里消失。
  async listVisible({ type = 'all', startDate = '', endDate = '', page = 1, pageSize = 20 }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    // 近 500 条够团主/管理员日常查询；真要全量分析该走导出，不该塞进这支查询。
    const result = await getCollection('operationLogs').orderBy('occurredAt', 'desc').limit(500).get();
    let logs = result.data || [];

    if (!isOwnerOrAdmin(profile)) {
      logs = logs.filter(item => (item.visibleUserIds || []).includes(String(profile.id)));
    }
    if (type && type !== 'all') logs = logs.filter(item => item.resourceType === type);

    const startTime = parseDayStart(startDate);
    const endTime = parseDayEnd(endDate);
    if (startTime || endTime) {
      logs = logs.filter((item) => {
        const t = toTime(item.occurredAt);
        if (Number.isNaN(t)) return false;
        if (startTime && t < startTime) return false;
        if (endTime && t > endTime) return false;
        return true;
      });
    }

    const total = logs.length;
    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.max(1, Number(pageSize) || 20);
    const startIdx = (safePage - 1) * safeSize;
    const pageData = logs.slice(startIdx, startIdx + safeSize).map(item => ({
      id: item._id,
      occurredAt: item.occurredAt,
      type: item.resourceType,
      typeText: TYPE_TEXT[item.resourceType] || item.resourceType,
      actionText: item.actionText,
      resourceText: item.resourceTitle,
      changes: item.changes || [],
      actorName: item.actorName,
      actorRole: item.actorRole,
      result: '成功',
    }));

    return success(pageData, {
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: startIdx + safeSize < total,
    });
  },
};

module.exports = operationLogActions;
