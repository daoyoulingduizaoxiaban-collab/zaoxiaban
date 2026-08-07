const {
  PRODUCT_STATUS,
  INTERNAL_PRODUCT_COPY_RE,
  nowIso,
  trimText,
  hasRole,
  hasAnyRole,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  assertApprovedProfile,
  canManageProduct,
  canViewProduct,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
  filterKeyword,
  hasOnlyDurableAssetUrls,
} = require("../lib/core");

const formatPriceSetting = (rules) => (Array.isArray(rules) && rules.length
  ? rules.map(rule => `${rule.minQuantity}件¥${rule.totalPrice != null ? rule.totalPrice : Number(rule.minQuantity || 0) * Number(rule.unitPrice || 0)}`).join('、')
  : '未设置');

const PRODUCT_FIELD_MAP = {
  title: '名称',
  description: '描述',
  sourceNote: '供应来源',
  status: { label: '状态', format: value => (Number(value) === PRODUCT_STATUS.PUBLISHED ? '已上架' : '已下架') },
  priceSetting: { label: '价格', format: formatPriceSetting },
};

const normalizeProductPayload = (payload, profile, existing = {}) => ({
  ...existing,
  ...payload,
  ownerUserId: existing.ownerUserId || payload.ownerUserId || profile.id,
  ownerOpenId: existing.ownerOpenId || profile.openId,
  visibility: payload.visibility || existing.visibility || 'public',
  title: String(payload.title || existing.title || '').trim(),
  description: String(payload.description || existing.description || '').trim(),
  pictureUrls: payload.pictureUrls || existing.pictureUrls || [],
  priceSetting: payload.priceSetting || payload.priceSettings || existing.priceSetting || [],
  priceSettings: payload.priceSetting || payload.priceSettings || existing.priceSettings || [],
  providerId: payload.providerId || existing.providerId || (hasRole(profile, 'provider') ? (profile.providerId || profile.id) : ''),
  sourceNote: String(payload.sourceNote || existing.sourceNote || '').trim(),
  status: Number(payload.status || existing.status || PRODUCT_STATUS.PUBLISHED),
  deletedAt: existing.deletedAt || '',
});

// 价格档规则（UI 已按此强制录入，这里是服务端最后一道防线）：
// 第一档必须是 1 件的基准价，之后每档数量、总价都要比上一档大——
// 不然「买多变更贵/一样贵」不合理，也没办法在下单时算最优组合。
const validatePriceTiers = (priceSetting) => {
  if (!Array.isArray(priceSetting) || priceSetting.length === 0) return '请至少设置一组价格';
  if (Number(priceSetting[0].minQuantity) !== 1) return '第一档价格必须是 1 件的基准价';
  for (let i = 1; i < priceSetting.length; i += 1) {
    const prev = priceSetting[i - 1];
    const cur = priceSetting[i];
    if (Number(cur.minQuantity) <= Number(prev.minQuantity)) return '价格档数量必须逐档递增';
    const prevTotal = prev.totalPrice != null ? Number(prev.totalPrice) : Number(prev.minQuantity) * Number(prev.unitPrice || 0);
    const curTotal = cur.totalPrice != null ? Number(cur.totalPrice) : Number(cur.minQuantity) * Number(cur.unitPrice || 0);
    if (curTotal <= prevTotal) return '价格档总价必须逐档递增';
  }
  return '';
};

const validateProductPayload = (product) => {
  if (!trimText(product.title)) return '请输入商品名称';
  if (!trimText(product.description)) return '请输入商品描述';
  if (!trimText(product.sourceNote)) return '请输入供应来源或备注';
  if ([product.title, product.description, product.sourceNote].some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')))) {
    return '商品资料包含不适合公开展示的文字，请调整后保存';
  }
  if (!Array.isArray(product.pictureUrls) || product.pictureUrls.length === 0) return '请至少上传一张商品图片';
  const invalidRule = (product.priceSetting || []).find(rule => Number(rule.minQuantity) <= 0 || Number(rule.unitPrice) <= 0);
  if (invalidRule) return '价格规则需包含有效起订量和单价';
  return '';
};

// 商品是否含内部/测试文案（listPublic 用于排除，validateProductPayload 用于拦保存）。
// 原代码在 listPublic 引用了此函数却未定义(latent bug)，拆分时补上。
const hasInternalProductCopy = product => [product.title, product.description, product.sourceNote]
  .some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')));

const productActions = {
  async listPublic({ keyword = '' }) {
    const products = (await getAllActive('products')).filter(product => (
      Number(product.status) === PRODUCT_STATUS.PUBLISHED
      && product.visibility !== 'private'
      && !hasInternalProductCopy(product)
    ));
    return success(filterKeyword(products, keyword, ['title', 'description', 'sourceNote']));
  },

  async listVisible({ keyword = '', status = 0 }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin', 'provider']);
    const products = (await getAllActive('products')).filter(product => canViewProduct(product, profile));
    const statusValue = Number(status || 0);
    const statusFiltered = statusValue ? products.filter(product => Number(product.status) === statusValue) : products;
    return success(filterKeyword(statusFiltered, keyword, ['title', 'description', 'sourceNote']));
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    if (!hasAnyRole(profile, ['guide', 'owner', 'admin', 'provider'])) return failure('当前角色不能新增商品');
    if (!hasOnlyDurableAssetUrls(payload.pictureUrls || [])) {
      return failure('请重新上传商品图片后保存');
    }
    const createdAt = nowIso();
    const product = normalizeProductPayload({
      ...payload,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const validationError = validateProductPayload(product);
    if (validationError) return failure(validationError);
    const tierError = validatePriceTiers(product.priceSetting);
    if (tierError) return failure(tierError);
    const result = await getCollection('products').add({ data: product });
    await logOperation({
      profile, resourceType: 'product', resourceId: result._id, resourceTitle: product.title,
      action: 'create', actionText: '新增商品',
      visibleUserIds: product.ownerUserId ? [product.ownerUserId] : [],
    });
    return success(toId({ ...product, _id: result._id }));
  },

  async updateStatus({ id, status }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能修改此商品');
    const updatedAt = nowIso();
    await getCollection('products').doc(String(product._id || product.id)).update({
      data: { status: Number(status), updatedAt },
    });
    await logOperation({
      profile, resourceType: 'product', resourceId: product._id || product.id, resourceTitle: product.title,
      action: 'update', actionText: '上下架商品',
      changes: buildChanges(product, { status }, { status: PRODUCT_FIELD_MAP.status }),
      visibleUserIds: product.ownerUserId ? [product.ownerUserId] : [],
    });
    return success({ ...product, status: Number(status), updatedAt });
  },

  async update(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', payload.id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能修改此商品');
    if (!hasOnlyDurableAssetUrls(payload.pictureUrls || [])) {
      return failure('请重新上传商品图片后保存');
    }
    const updatedAt = nowIso();
    const updateData = normalizeProductPayload({
      ...payload,
      id: product.id || product._id,
      updatedAt,
    }, profile, product);
    const validationError = validateProductPayload(updateData);
    if (validationError) return failure(validationError);
    // 只在价格档真的被改动时才拦新规则——不然老商品的历史价格档（这规则上线前存的）
    // 会因为一次不相关的编辑（比如只改了描述）被卡住存不了。
    const priceSettingChanged = JSON.stringify(product.priceSetting || []) !== JSON.stringify(updateData.priceSetting || []);
    if (priceSettingChanged) {
      const tierError = validatePriceTiers(updateData.priceSetting);
      if (tierError) return failure(tierError);
    }
    await getCollection('products').doc(String(product._id || product.id)).update({ data: toUpdateData(updateData) });
    await logOperation({
      profile, resourceType: 'product', resourceId: product._id || product.id, resourceTitle: updateData.title,
      action: 'update', actionText: '编辑商品',
      changes: buildChanges(product, updateData, PRODUCT_FIELD_MAP),
      visibleUserIds: product.ownerUserId ? [product.ownerUserId] : [],
    });
    return success(toId({ ...product, ...updateData }));
  },

  async softDelete({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能删除此商品');
    const deletedAt = nowIso();
    await getCollection('products').doc(String(product._id || product.id)).update({
      data: { status: PRODUCT_STATUS.UNPUBLISHED, updatedAt: deletedAt, deletedAt },
    });
    await logOperation({
      profile, resourceType: 'product', resourceId: product._id || product.id, resourceTitle: product.title,
      action: 'remove', actionText: '删除商品',
      visibleUserIds: product.ownerUserId ? [product.ownerUserId] : [],
    });
    return success({ ...product, status: PRODUCT_STATUS.UNPUBLISHED, updatedAt: deletedAt, deletedAt });
  },
};


module.exports = productActions;
