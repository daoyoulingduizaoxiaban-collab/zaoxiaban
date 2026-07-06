const INTERNAL_PRODUCT_COPY_RE = /QA|mock|Seed|MVP|local|test|automation|自动化|测试|本地|后续|未完成|暂未|未开放|未启用|未串接/i;

const LEGACY_PRODUCT_COPY = Object.freeze({
  'Longjing Gift Pack': '西湖龙井伴手礼礼盒',
  'Green tea gift pack for tour customers.': '适合团单收单的西湖龙井茶叶礼盒。',
  'Green tea gift pack for tour customers': '适合团单收单的西湖龙井茶叶礼盒。',
  'Hangzhou tea supplier': '杭州茶叶供应商',
  'Tour price': '团单价',
  'tour price': '团单价',
});

const normalizeLegacyCopy = (value) => {
  const rawText = String(value || '');
  const exactText = rawText.trim();
  if (LEGACY_PRODUCT_COPY[exactText]) return LEGACY_PRODUCT_COPY[exactText];
  return Object.keys(LEGACY_PRODUCT_COPY).reduce(
    (text, legacyText) => text.replace(new RegExp(legacyText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), LEGACY_PRODUCT_COPY[legacyText]),
    rawText
  );
};

export const hasInternalProductCopy = (product = {}) => {
  const fields = [
    product.title,
    product.description,
    product.sourceNote,
  ];
  return fields.some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')));
};

export const filterFormalProducts = (products = []) => (
  products.filter(product => !hasInternalProductCopy(product))
);

export const normalizeFormalProductCopy = (product = {}) => ({
  ...product,
  title: normalizeLegacyCopy(product.title),
  description: normalizeLegacyCopy(product.description),
  sourceNote: normalizeLegacyCopy(product.sourceNote),
  priceSetting: (product.priceSetting || product.priceSettings || []).map(rule => ({
    ...rule,
    description: normalizeLegacyCopy(rule.description),
  })),
});
