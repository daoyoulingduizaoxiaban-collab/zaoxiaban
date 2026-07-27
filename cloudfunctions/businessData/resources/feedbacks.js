const {
  nowIso,
  trimText,
  roleLabelText,
  getCollection,
  toId,
  success,
  failure,
  assertApprovedProfile,
} = require("../lib/core");

const feedbackActions = {
  // 报 Bug 不要求登录：profile 可为 null(匿名)，有登录档就顺带记身份便于定位。
  async create(payload, profile) {
    const content = trimText(payload.content);
    if (!content) return failure('请填写问题描述');
    const now = nowIso();
    const doc = {
      content: content.slice(0, 1000),
      contextPage: trimText(payload.contextPage).slice(0, 200),
      openId: (profile && profile.openId) || '',
      role: (profile && (profile.role || (Array.isArray(profile.roles) ? profile.roles[0] : ''))) || '',
      roleLabel: (profile && roleLabelText(profile.roles || [profile.role])) || '',
      displayName: (profile && profile.displayName) || '匿名',
      createdAt: now,
    };
    const res = await getCollection('feedbacks').add({ data: doc });
    return success(toId({ ...doc, _id: (res && (res._id || res.id)) || '', id: (res && (res._id || res.id)) || '' }));
  },
  async list(_payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const result = await getCollection('feedbacks').limit(200).get();
    const rows = (result.data || [])
      .map(toId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return success(rows);
  },
};


module.exports = feedbackActions;
