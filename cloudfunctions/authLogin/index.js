const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const users = db.collection('users');

const ROLE_GUIDE = 'guide';
const ROLE_CUSTOMER = 'customer';
const ROLE_PROVIDER = 'provider';
const ROLE_OWNER = 'owner';
const ROLE_ADMIN = 'admin';
const ACTIVE_STATUS = 'active';
const REVIEW_STATUS = {
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
};

const parseOpenIdList = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const getPrivilegedRole = (openId) => {
  if (parseOpenIdList(process.env.OWNER_OPENIDS).includes(openId)) return ROLE_OWNER;
  if (parseOpenIdList(process.env.ADMIN_OPENIDS).includes(openId)) return ROLE_ADMIN;
  return '';
};

const APP_ENV = String((process.env.APP_ENV || process.env.ENV_NAME || 'PROD').toUpperCase());
const ALLOW_ROLE_PREVIEW = process.env.ALLOW_ROLE_PREVIEW === 'true';
const APP_IS_DEV = APP_ENV === 'DEV';

const getBootstrapRole = async () => {
  if (!APP_IS_DEV) return '';

  const existingPrivileged = await users.where({
    role: _.in([ROLE_OWNER, ROLE_ADMIN]),
    reviewStatus: REVIEW_STATUS.APPROVED,
    deletedAt: null,
  }).limit(1).get();
  return existingPrivileged.data && existingPrivileged.data.length ? '' : ROLE_OWNER;
};

// provider 不再是可申请角色；未指定或非法一律归为默认客户。
const normalizeRequestedRole = role => (
  [ROLE_GUIDE, ROLE_CUSTOMER].includes(role) ? role : ROLE_CUSTOMER
);

const normalizeReviewStatus = status => (status === ACTIVE_STATUS ? REVIEW_STATUS.APPROVED : (status || REVIEW_STATUS.PENDING));
const normalizeRoles = (roles, fallbackRole = '') => {
  const rawRoles = Array.isArray(roles) ? [...roles, fallbackRole] : [fallbackRole];
  return [...new Set(rawRoles.filter(role => [ROLE_GUIDE, ROLE_CUSTOMER, ROLE_PROVIDER, ROLE_OWNER, ROLE_ADMIN].includes(role)))];
};
const buildRoleLabel = (role) => {
  const labels = {
    [ROLE_OWNER]: '产品拥有者',
    [ROLE_ADMIN]: '运营管理员',
    [ROLE_GUIDE]: '团主',
    [ROLE_CUSTOMER]: '客户',
    [ROLE_PROVIDER]: '供应商',
  };
  return labels[role] || role;
};

const PREVIEW_STATUSES = new Set([REVIEW_STATUS.PENDING, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED]);
const PREVIEWABLE_ROLES = Object.freeze([ROLE_GUIDE, ROLE_CUSTOMER, ROLE_ADMIN, ROLE_OWNER]);
const ALL_PREVIEW_ROLES = new Set([...PREVIEW_STATUSES, ...PREVIEWABLE_ROLES, 'visitor']);
const isRolePreviewAllowed = () => APP_IS_DEV && ALLOW_ROLE_PREVIEW;

const normalizePreviewRole = (value) => {
  const role = String(value || '').trim();
  if (role === 'visitor') return role;
  if (ALL_PREVIEW_ROLES.has(role)) return role;
  return '';
};

const isPreviewAllowedForProfile = profile => Boolean(
  profile
  && normalizeRoles(profile.roles, profile.role).includes(ROLE_OWNER)
  && normalizeReviewStatus(profile.reviewStatus || profile.status) === REVIEW_STATUS.APPROVED
);

const applyRolePreview = (profile, previewRole) => {
  if (!profile || !previewRole) return profile;
  if (previewRole === 'visitor') {
    return {
      ...profile,
      role: '',
      roles: [],
      roleLabel: '游客',
      status: '',
      reviewStatus: '',
      realRoleLabel: profile.roleLabel,
      isRolePreview: true,
    };
  }
  if (PREVIEW_STATUSES.has(previewRole)) {
    return {
      ...profile,
      role: ROLE_CUSTOMER,
      roles: [ROLE_CUSTOMER],
      roleLabel: buildRoleLabel(ROLE_CUSTOMER),
      status: previewRole,
      reviewStatus: previewRole,
      isRolePreview: true,
      realRoleLabel: profile.roleLabel,
    };
  }
  if (!PREVIEWABLE_ROLES.includes(previewRole)) return profile;
  return {
    ...profile,
    role: previewRole,
    roles: [previewRole],
    roleLabel: buildRoleLabel(previewRole),
    status: REVIEW_STATUS.APPROVED,
    reviewStatus: REVIEW_STATUS.APPROVED,
    isRolePreview: true,
    realRoleLabel: profile.roleLabel,
  };
};

const getSystemReviewer = bootstrapRole => (bootstrapRole ? 'system-bootstrap-owner' : 'system-allowlist');
const getSystemReviewRemark = bootstrapRole => (bootstrapRole ? '首位管理者初始化' : '管理员白名单账号');

const ensureUsersCollection = async () => {
  try {
    await db.createCollection('users');
  } catch (err) {
    const message = err && (err.message || err.errMsg || err.toString());
    if (!/exist|exists|already|已存在/i.test(message || '')) {
      throw err;
    }
  }
};

const buildDefaultProfile = (openId, unionId, requestedRole, bootstrapRole = '') => {
  const privilegedRole = getPrivilegedRole(openId) || bootstrapRole;
  // 客户为默认开放身份：任何新用户登录即成为已审核客户，无需审核。
  // 仅 owner/admin allowlist 命中者拿到对应管理角色（同样 approved）。
  const normalizedRole = privilegedRole || ROLE_CUSTOMER;
  const now = db.serverDate();
  const profile = {
    openId,
    unionId: unionId || '',
    role: normalizedRole,
    roles: [normalizedRole],
    requestedRole: normalizedRole,
    roleExpiresAt: '',
    rolesExpireAt: '',
    displayName: '微信用户',
    phone: '',
    avatarUrl: '',
    status: REVIEW_STATUS.APPROVED,
    reviewStatus: REVIEW_STATUS.APPROVED,
    reviewedBy: privilegedRole ? getSystemReviewer(bootstrapRole) : 'system-default',
    reviewedAt: now,
    reviewRemark: privilegedRole ? getSystemReviewRemark(bootstrapRole) : '默认开放客户，无需审核',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return profile;
};

const toClientProfile = doc => ({
  id: doc._id,
  openId: doc.openId,
  unionId: doc.unionId || '',
  role: doc.role || ROLE_CUSTOMER,
  roles: normalizeRoles(doc.roles, doc.role || ROLE_CUSTOMER),
  requestedRole: doc.requestedRole || '',
  roleLabel: normalizeRoles(doc.roles, doc.role || ROLE_CUSTOMER).map(buildRoleLabel).join('、'),
  displayName: doc.displayName || '微信用户',
  phone: doc.phone || '',
  avatarUrl: doc.avatarUrl || '',
  providerId: doc.providerId || '',
  status: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
  reviewStatus: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
  roleExpiresAt: doc.roleExpiresAt || doc.rolesExpireAt || '',
  rolesExpireAt: doc.rolesExpireAt || doc.roleExpiresAt || '',
  reviewedBy: doc.reviewedBy || '',
  reviewedAt: doc.reviewedAt || '',
  reviewRemark: doc.reviewRemark || '',
  createdAt: doc.createdAt || '',
  updatedAt: doc.updatedAt || '',
});

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  // 环境自检日志：白名单/预览开关没生效时肉眼可查（控制台→云函数→authLogin→日志）。
  // 掐头去尾打 openid，既能对上号又不落全量敏感值。
  const maskId = id => (String(id || '').length > 9 ? `${String(id).slice(0, 5)}…${String(id).slice(-4)}` : String(id || ''));
  console.warn('[authLogin] env自检', JSON.stringify({
    APP_ENV,
    ALLOW_ROLE_PREVIEW,
    ownerAllowlist: parseOpenIdList(process.env.OWNER_OPENIDS).map(maskId),
    adminAllowlist: parseOpenIdList(process.env.ADMIN_OPENIDS).map(maskId),
    caller: maskId(openId),
  }));
  const unionId = wxContext.UNIONID || '';
  const context = event.context || {};
  if (
    (context.simulationRole || context.previewRole)
    && !context.isRolePreview
  ) {
    return {
      success: false,
      error: '当前参数不支持角色预览',
    };
  }
  const previewRole = context.isRolePreview ? normalizePreviewRole(context.simulationRole || context.previewRole) : '';

  if (!openId) {
    return {
      success: false,
      error: '登录状态获取失败，请重新登录',
    };
  }

  await ensureUsersCollection();

  const existing = await users.where({ openId }).limit(1).get();

  if (existing.data && existing.data.length) {
    const profile = existing.data[0];
    const allowlistRole = getPrivilegedRole(openId);
    const bootstrapRole = allowlistRole ? '' : await getBootstrapRole();
    const privilegedRole = allowlistRole || bootstrapRole;
    const currentRole = profile.role || normalizeRequestedRole(event.requestedRole);
    const currentRoles = normalizeRoles(profile.roles, currentRole);
    const currentReviewStatus = normalizeReviewStatus(profile.reviewStatus || profile.status || REVIEW_STATUS.PENDING);
    const canUpdateRequestedRole = currentReviewStatus === REVIEW_STATUS.PENDING
      && [ROLE_GUIDE, ROLE_CUSTOMER].includes(currentRole);
    const nextRole = privilegedRole || currentRole;
    const nextRoles = privilegedRole ? normalizeRoles([privilegedRole], nextRole) : currentRoles;
    let nextRequestedRole = profile.requestedRole || currentRole;
    if (privilegedRole) {
      nextRequestedRole = profile.requestedRole || nextRole;
    } else if (canUpdateRequestedRole) {
      nextRequestedRole = normalizeRequestedRole(event.requestedRole);
    }
    const updateData = {
      unionId: profile.unionId || unionId,
      role: nextRole,
      roles: nextRoles,
      requestedRole: nextRequestedRole,
      status: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      reviewStatus: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      updatedAt: db.serverDate(),
    };
    if (privilegedRole && currentReviewStatus !== REVIEW_STATUS.APPROVED) {
      updateData.reviewedBy = getSystemReviewer(bootstrapRole);
      updateData.reviewedAt = db.serverDate();
      updateData.reviewRemark = getSystemReviewRemark(bootstrapRole);
    }
    await users.doc(profile._id).update({ data: updateData });
    const normalizedProfile = toClientProfile({
      ...profile,
      ...updateData,
    });
    const isRolePreviewRequest = context.isRolePreview && previewRole;
    const hasRolePreviewRequest = Boolean(context.isRolePreview);
    if (isRolePreviewRequest) {
      if (!isRolePreviewAllowed()) {
        return {
          success: false,
          error: '当前环境不允许角色预览',
        };
      }
      if (!isPreviewAllowedForProfile(normalizedProfile)) {
        return {
          success: false,
          error: '当前账号不支持角色预览',
        };
      }
      return {
        success: true,
        openId,
        unionId: updateData.unionId,
        role: applyRolePreview(normalizedProfile, previewRole).role,
        profile: applyRolePreview(normalizedProfile, previewRole),
      };
    }
    if (hasRolePreviewRequest) {
      return {
        success: false,
        error: '当前环境不支持该角色预览参数',
      };
    }

    return {
      success: true,
      openId,
      unionId: updateData.unionId,
      role: nextRole,
      profile: normalizedProfile,
    };
  }

  const bootstrapRole = await getBootstrapRole();
  const profile = buildDefaultProfile(openId, unionId, event.requestedRole, bootstrapRole);
  const created = await users.add({ data: profile });
  const createdProfile = toClientProfile({
    _id: created._id,
    ...profile,
  });
  if (context.isRolePreview) {
    return {
      success: false,
      error: '当前账号不支持角色预览',
    };
  }

  return {
    success: true,
    openId,
    unionId,
    role: profile.role,
    profile: createdProfile,
  };
};
