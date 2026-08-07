const {
  nowIso,
  sameId,
  trimText,
  hasRole,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  isOwnerOrAdmin,
  assertApprovedProfile,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
} = require("../lib/core");

const PROVIDER_FIELD_MAP = {
  title: '名称',
  contact: '联系人',
  note: '备注',
  status: { label: '状态', format: value => (value === 'disabled' ? '已停用' : '启用中') },
};

const normalizeProviderStatus = status => (status === 'disabled' ? 'disabled' : 'active');

const normalizeProviderPayload = (payload, existing = {}) => ({
  ...existing,
  id: payload.id || existing.id || existing._id || '',
  title: trimText(payload.title || existing.title),
  contact: trimText(payload.contact || existing.contact),
  statusText: trimText(payload.statusText || existing.statusText || '可显示资料'),
  note: trimText(payload.note || existing.note),
  status: normalizeProviderStatus(payload.status || existing.status),
  updatedAt: nowIso(),
  createdAt: existing.createdAt || payload.createdAt || nowIso(),
  deletedAt: existing.deletedAt || '',
});

const validateProviderPayload = (provider) => {
  if (!trimText(provider.title)) return '请填写供应商名称';
  if (!trimText(provider.contact)) return '请填写供应商联系人';
  return '';
};

const sameProviderId = (provider, providerId) => Boolean(
  provider
  && (
    sameId(provider.id, providerId)
    || sameId(provider._id, providerId)
  )
);

const providerActions = {
  async listVisible(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const providers = await getAllActive('providers');
    if (isOwnerOrAdmin(profile)) return success(providers);
    const providerId = profile.providerId || profile.id;
    return success(providers.filter(provider => sameProviderId(provider, providerId)));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const provider = await getById('providers', id);
    if (provider && !isOwnerOrAdmin(profile) && !sameProviderId(provider, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料查看权限');
    }
    return provider ? success(provider) : failure('未找到供应商资料');
  },

  async save(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const target = scopedPayload.id ? await getById('providers', scopedPayload.id) : null;
    if (target && !isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    const normalized = normalizeProviderPayload(scopedPayload, target || {});
    const validationError = validateProviderPayload(normalized);
    if (validationError) return failure(validationError);
    if (target) {
      await getCollection('providers').doc(String(target._id || target.id)).update({ data: toUpdateData(normalized) });
      await logOperation({
        profile, resourceType: 'provider', resourceId: target._id || target.id, resourceTitle: normalized.title,
        action: 'update', actionText: '编辑供应商',
        changes: buildChanges(target, normalized, PROVIDER_FIELD_MAP),
        visibleUserIds: [profile.id],
      });
      return success(toId({ ...normalized, _id: target._id || target.id }));
    }
    const result = await getCollection('providers').add({ data: normalized });
    const created = toId({ ...normalized, _id: result._id });
    if (hasRole(profile, 'provider') && !profile.providerId) {
      await getCollection('users').doc(String(profile._id || profile.id)).update({
        data: { providerId: created.id, updatedAt: nowIso() },
      });
    }
    await logOperation({
      profile, resourceType: 'provider', resourceId: created.id, resourceTitle: created.title,
      action: 'create', actionText: '新增供应商',
      visibleUserIds: [profile.id],
    });
    return success(created);
  },

  // D-6：停用/启用（可回切）。停用后该供应商商品不进新团单选品，历史订单不受影响。
  async setStatus({ id, status }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const target = await getById('providers', id);
    if (!target) return failure('未找到供应商资料');
    if (!isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    if (target.deletedAt) return failure('供应商已删除，无法变更状态');
    const nextStatus = normalizeProviderStatus(status);
    await getCollection('providers').doc(String(target._id || target.id)).update({
      data: { status: nextStatus, updatedAt: nowIso() },
    });
    await logOperation({
      profile, resourceType: 'provider', resourceId: target._id || target.id, resourceTitle: target.title,
      action: 'update', actionText: '供应商上下架',
      changes: buildChanges(target, { status: nextStatus }, { status: PROVIDER_FIELD_MAP.status }),
      visibleUserIds: [profile.id],
    });
    return success(toId({ ...target, status: nextStatus }));
  },

  // D-6：软删除（保留快照供历史订单追溯，仅移出列表与选品）。
  async remove({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const target = await getById('providers', id);
    if (!target) return failure('未找到供应商资料');
    if (!isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    if (target.deletedAt) return success(target);
    const deletedAt = nowIso();
    await getCollection('providers').doc(String(target._id || target.id)).update({
      data: { deletedAt, updatedAt: deletedAt },
    });
    await logOperation({
      profile, resourceType: 'provider', resourceId: target._id || target.id, resourceTitle: target.title,
      action: 'remove', actionText: '删除供应商',
      visibleUserIds: [profile.id],
    });
    return success(toId({ ...target, deletedAt }));
  },

  // D-6 内部用：跨服务（productService.listSelectable）判定供应商有效性，返回 id → 是否有效。
  // 只暴露 id/有效性，不含敏感资料，故仅要求登录审核通过、不限角色（选品者未必是供应商角色）。
  async statusMap(payload, profile) {
    assertApprovedProfile(profile);
    const result = await getCollection('providers').limit(100).get();
    const map = {};
    (result.data || []).forEach((raw) => {
      const provider = toId(raw);
      map[String(provider.id)] = !provider.deletedAt && provider.status !== 'disabled';
    });
    return success(map);
  },
};

// 测试环境「报Bug」：任意登录用户(含未审核)皆可提交；owner/admin 可列出收集。

module.exports = providerActions;
