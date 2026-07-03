const INTERNAL_PRODUCT_COPY_RE = /QA|mock|Seed|MVP|local|test|automation|自动化|测试|本地|后续|未完成|暂未|未开放|未启用|未串接/i;

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
