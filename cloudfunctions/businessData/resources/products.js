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
  filterKeyword,
  hasOnlyDurableAssetUrls,
} = require("../lib/core");

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

const validateProductPayload = (product) => {
  if (!trimText(product.title)) return '请输入商品名称';
  if (!trimText(product.description)) return '请输入商品描述';
  if (!trimText(product.sourceNote)) return '请输入供应来源或备注';
  if ([product.title, product.description, product.sourceNote].some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')))) {
    return '商品资料包含不适合公开展示的文字，请调整后保存';
  }
  if (!Array.isArray(product.pictureUrls) || product.pictureUrls.length === 0) return '请至少上传一张商品图片';
  if (!Array.isArray(product.priceSetting) || product.priceSetting.length === 0) return '请至少设置一组价格';
  const invalidRule = product.priceSetting.find(rule => Number(rule.minQuantity) <= 0 || Number(rule.unitPrice) <= 0);
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
    const result = await getCollection('products').add({ data: product });
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
    await getCollection('products').doc(String(product._id || product.id)).update({ data: toUpdateData(updateData) });
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
    return success({ ...product, status: PRODUCT_STATUS.UNPUBLISHED, updatedAt: deletedAt, deletedAt });
  },
};


module.exports = productActions;
