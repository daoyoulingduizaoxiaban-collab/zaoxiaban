// 商品价格「怎么显示给人看」的唯一来源。
//
// 原本前端有四份各自内联的实作，彼此有实质差异：有的做金额四舍五入有的没做、
// 有的在缺 totalPrice 时회退成「数量×单价」有的直接印 undefined、有的用全形￥有的用半形¥。
// 同一个商品在不同页面因此会显示不同字串。
//
// 口径（沿用 #C1 与 75c18d2 确立的总价制）：逐档列出「N件 ¥总价」，用 / 连接，
// 没有价格档就显示「未设置价格」。缺 totalPrice 时以「数量×单价」补算。
//
// 注：云函数 resources/products.js 另有一份，那份只用于操作记录的文案（分隔符是顿号），
// 是刻意不同的，不要一起改。

/** 金额按「分」四舍五入，避免小数单价（如总价 500/6 件）算出 499.9999… 的浮点垃圾。 */
export const roundMoney = value => Math.round(Number(value || 0) * 100) / 100;

const tierTotalOf = (rule = {}) => {
  if (rule.totalPrice !== null && rule.totalPrice !== undefined && rule.totalPrice !== '') {
    return roundMoney(rule.totalPrice);
  }
  return roundMoney(Number(rule.minQuantity || 0) * Number(rule.unitPrice || 0));
};

/**
 * 商品的对外价格文案。传商品物件或直接传价格档阵列都可以。
 * 这是**唯一**对外价格口径，别在页面或别的 service 里再写一份。
 */
export const getProductPriceDisplay = (productOrTiers) => {
  const source = productOrTiers || {};
  const tiers = Array.isArray(source)
    ? source
    : (source.priceSetting || source.priceSettings || []);

  const labels = (tiers || [])
    .filter(rule => Number(rule && rule.minQuantity) > 0)
    .sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity))
    .map(rule => `${Number(rule.minQuantity)}件 ¥${tierTotalOf(rule)}`);

  return labels.length === 0 ? '未设置价格' : labels.join(' / ');
};

/** 逐档拆成阵列（团单详情要一档一行显示，不是一整串）。 */
export const buildPriceTiers = (productOrTiers) => {
  const source = productOrTiers || {};
  const tiers = Array.isArray(source)
    ? source
    : (source.priceSetting || source.priceSettings || []);

  return (tiers || [])
    .filter(rule => Number(rule && rule.minQuantity) > 0)
    .sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity))
    .map(rule => ({
      minQuantity: Number(rule.minQuantity),
      totalPrice: tierTotalOf(rule),
      label: `${Number(rule.minQuantity)}件 ¥${tierTotalOf(rule)}`,
    }));
};
