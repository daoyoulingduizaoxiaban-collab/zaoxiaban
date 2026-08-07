const {
  REVIEW_STATUS,
  nowIso,
  sameId,
  trimText,
  normalizeReviewStatus,
  normalizeRoles,
  hasRole,
  roleLabelText,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  isOwnerOrAdmin,
  assertProfile,
  assertApprovedProfile,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
  isDurableProfileAvatarUrl,
} = require("../lib/core");

const REVIEW_STATUS_TEXT = {
  [REVIEW_STATUS.APPROVED]: '通过',
  [REVIEW_STATUS.REJECTED]: '拒绝',
  [REVIEW_STATUS.DISABLED]: '停用',
  [REVIEW_STATUS.PENDING]: '待审核',
};

const USER_REVIEW_FIELD_MAP = {
  roleLabel: '角色',
  reviewStatus: { label: '状态', format: value => REVIEW_STATUS_TEXT[value] || value },
  roleExpiresAt: { label: '角色期限', format: value => (value || '不限期') },
};

const normalizeDirectoryUser = (payload, existing = {}) => ({
  ...existing,
  displayName: trimText(payload.displayName || payload.name || existing.displayName || existing.name),
  name: trimText(payload.name || payload.displayName || existing.name || existing.displayName),
  phone: trimText(payload.phone || existing.phone),
  city: trimText(payload.city || existing.city),
  gender: Number(payload.gender !== undefined ? payload.gender : (existing.gender || 0)),
  birth: trimText(payload.birth || existing.birth),
  introduction: trimText(payload.introduction || existing.introduction),
  avatarUrl: payload.avatarUrl || existing.avatarUrl || '',
  role: payload.role || existing.role || 'guide',
  roles: normalizeRoles(payload.roles || existing.roles, payload.role || existing.role || 'guide'),
  roleLabel: payload.roleLabel || existing.roleLabel || '',
  displayRole: payload.displayRole || existing.displayRole || payload.roleLabel || existing.role || 'guide',
  roleExpiresAt: payload.roleExpiresAt || existing.roleExpiresAt || '',
  rolesExpireAt: payload.rolesExpireAt || payload.roleExpiresAt || existing.rolesExpireAt || existing.roleExpiresAt || '',
  status: payload.status || existing.status || REVIEW_STATUS.PENDING,
  reviewStatus: payload.reviewStatus || existing.reviewStatus || payload.status || existing.status || REVIEW_STATUS.PENDING,
  requestedRole: payload.requestedRole || existing.requestedRole || payload.role || existing.role || 'customer',
  reviewedBy: payload.reviewedBy || existing.reviewedBy || '',
  reviewedAt: payload.reviewedAt || existing.reviewedAt || '',
  reviewRemark: payload.reviewRemark || existing.reviewRemark || '',
  updatedAt: nowIso(),
  createdAt: existing.createdAt || payload.createdAt || nowIso(),
});

const canEditDirectoryUser = (target, profile) => Boolean(
  profile && target && (
    isOwnerOrAdmin(profile)
    || sameId(target._id || target.id, profile.id)
    || sameId(target.openId, profile.openId)
  )
);

const validateDirectoryUserPayload = (user) => {
  if (!trimText(user.displayName || user.name)) return '请填写姓名';
  const phone = trimText(user.phone);
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) return '请输入 11 位中国大陆手机号';
  const birth = trimText(user.birth);
  if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return '生日格式无效';
  if (birth && birth > new Date().toISOString().slice(0, 10)) return '生日不能晚于今天';
  return '';
};

const validateRequestedRole = role => ['guide', 'customer', 'provider'].includes(role);

const userActions = {
  async listPending(payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const users = await getAllActive('users');
    return success(users.filter(user => !normalizeRoles(user.roles, user.role).includes('owner')));
  },

  async review({ id, reviewStatus, role, roles, roleExpiresAt = '', reviewRemark = '' }, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const target = await getById('users', id);
    if (!target) return failure('未找到用户');
    const rawRequestedRoles = normalizeRoles(roles, role || target.requestedRole || target.role || 'customer');
    const requestedRoles = rawRequestedRoles.filter(item => item !== 'owner');
    if (target.role === 'owner' || normalizeRoles(target.roles, target.role).includes('owner')) return failure('不能修改 owner 账号');
    if (hasRole(profile, 'admin') && (rawRequestedRoles.includes('owner') || normalizeRoles(target.roles, target.role).includes('admin'))) {
      return failure('管理员不能指派 owner 或修改管理员账号');
    }
    const nextStatus = normalizeReviewStatus(reviewStatus);
    if (![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED, REVIEW_STATUS.PENDING].includes(nextStatus)) {
      return failure('审核状态无效');
    }
    if (nextStatus === REVIEW_STATUS.APPROVED && !requestedRoles.length) return failure('请至少选择一个可用角色');
    const nextRoles = nextStatus === REVIEW_STATUS.APPROVED
      ? requestedRoles
      : normalizeRoles(target.roles, target.role || role || 'customer').filter(item => item !== 'owner');
    const nextRole = nextStatus === REVIEW_STATUS.APPROVED ? nextRoles[0] : (target.role || role || 'customer');
    if (nextRole === 'owner') return failure('不能通过审核入口指派 owner');
    const updatedAt = nowIso();
    const labels = roleLabelText(nextRoles);
    const updateData = {
      role: nextRole,
      roles: nextRoles,
      roleLabel: labels,
      displayRole: labels,
      roleExpiresAt: trimText(roleExpiresAt),
      rolesExpireAt: trimText(roleExpiresAt),
      reviewStatus: nextStatus,
      status: nextStatus,
      reviewedBy: profile.openId,
      reviewedByUserId: profile.id,
      reviewedAt: updatedAt,
      reviewRemark: trimText(reviewRemark),
      updatedAt,
    };
    await getCollection('users').doc(String(target._id || target.id)).update({ data: updateData });
    await logOperation({
      profile, resourceType: 'user', resourceId: target._id || target.id, resourceTitle: target.displayName || target.name || '用户',
      action: 'update', actionText: `审核用户（${REVIEW_STATUS_TEXT[nextStatus] || nextStatus}）`,
      changes: buildChanges(target, updateData, USER_REVIEW_FIELD_MAP),
      visibleUserIds: [target._id || target.id],
    });
    return success(toId({ ...target, ...updateData }));
  },

  async applyForRole(payload, profile) {
    assertProfile(profile);
    const applicationPayload = payload || {};
    const requestedRole = trimText(applicationPayload.requestedRole || 'guide');
    if (!validateRequestedRole(requestedRole)) return failure('申请身份无效');
    const result = await getCollection('users').where({ openId: profile.openId }).limit(1).get();
    const target = result.data && result.data[0];
    if (!target) return failure('未找到当前账号资料');
    const currentStatus = normalizeReviewStatus(target.reviewStatus || target.status);
    if (currentStatus === REVIEW_STATUS.PENDING && target.requestedRole === requestedRole) {
      return failure('申请已提交，请等待管理员确认');
    }
    if (currentStatus === REVIEW_STATUS.DISABLED) return failure('当前账号已停用，请联系管理员');
    if (target.role === requestedRole && currentStatus === REVIEW_STATUS.APPROVED) {
      return failure('当前账号已是该身份');
    }

    const next = normalizeDirectoryUser({
      ...target,
      ...applicationPayload,
      role: target.role || profile.role || 'customer',
      roles: normalizeRoles(target.roles, target.role || profile.role || 'customer'),
      requestedRole,
      status: REVIEW_STATUS.PENDING,
      reviewStatus: REVIEW_STATUS.PENDING,
      reviewRemark: '',
      reviewedBy: '',
      reviewedAt: '',
    }, target);
    const validationError = validateDirectoryUserPayload(next);
    if (validationError) return failure(validationError);
    if (!isDurableProfileAvatarUrl(next.avatarUrl)) return failure('请重新上传头像后保存');

    await getCollection('users').doc(String(target._id || target.id)).update({ data: toUpdateData(next) });
    await logOperation({
      profile, resourceType: 'user', resourceId: target._id || target.id, resourceTitle: next.displayName || next.name || '用户',
      action: 'create', actionText: '申请成为团主',
      visibleUserIds: [target._id || target.id],
    });
    return success(toId({ ...next, _id: target._id || target.id }));
  },

  async listVisible(payload, profile) {
    assertApprovedProfile(profile);
    if (isOwnerOrAdmin(profile)) {
      const users = await getAllActive('users');
      return success(users);
    }
    const result = await getCollection('users').where({ openId: profile.openId }).limit(1).get();
    return success((result.data || []).map(toId));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile);
    const target = await getById('users', id);
    if (!canEditDirectoryUser(target, profile)) return failure('当前账号没有资料查看权限');
    return success(target);
  },

  async save(payload, profile) {
    assertApprovedProfile(profile);
    const target = payload.id ? await getById('users', payload.id) : null;
    if (payload.id && !canEditDirectoryUser(target, profile)) return failure('当前账号没有保存权限');
    if (!payload.id && !isOwnerOrAdmin(profile)) return failure('当前账号不能新增资料');

    const normalized = normalizeDirectoryUser(payload, target || {});
    const validationError = validateDirectoryUserPayload(normalized);
    if (validationError) return failure(validationError);
    if (!isDurableProfileAvatarUrl(normalized.avatarUrl)) return failure('请重新上传头像后保存');
    if (hasRole(profile, 'admin') && normalized.role === 'owner') {
      return failure('管理员不能指派 owner');
    }
    if (!isOwnerOrAdmin(profile)) {
      normalized.role = target.role || profile.role;
      normalized.roles = target.roles || profile.roles || [normalized.role];
      normalized.roleLabel = target.roleLabel || normalized.roleLabel || '';
      normalized.displayRole = target.displayRole || target.roleLabel || normalized.role;
      normalized.status = target.status || profile.status || REVIEW_STATUS.APPROVED;
      normalized.reviewStatus = target.reviewStatus || target.status || profile.reviewStatus || profile.status || REVIEW_STATUS.APPROVED;
      normalized.requestedRole = target.requestedRole || profile.requestedRole || normalized.role;
      normalized.reviewedBy = target.reviewedBy || '';
      normalized.reviewedAt = target.reviewedAt || '';
      normalized.reviewRemark = target.reviewRemark || '';
      normalized.openId = target.openId || profile.openId;
      normalized.unionId = target.unionId || profile.unionId || '';
      normalized.providerId = target.providerId || profile.providerId || '';
    }

    if (target) {
      await getCollection('users').doc(String(target._id || target.id)).update({ data: toUpdateData(normalized) });
      return success(toId({ ...normalized, _id: target._id || target.id }));
    }

    const result = await getCollection('users').add({ data: normalized });
    return success(toId({ ...normalized, _id: result._id }));
  },
};

// D-6 供应商停用/软删除两档模型：status（active/disabled，可回切）+ deletedAt（软删，getAllActive 已滤）。

module.exports = userActions;
