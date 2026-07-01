export enum ProductStatus {
  All=0,
  UNPUBLISHED = 1, // 下架
  PUBLISHED = 2    // 開放下單
}

export const ProductStatusText = Object.freeze({
  [ProductStatus.All]: '全部',
  [ProductStatus.UNPUBLISHED]: '已下架',
  [ProductStatus.PUBLISHED]: '已上架'
});

/**
 * 取得產品狀態清單（常用於 Dropdown 選單）
 */
export const getProductStatusList = () => {
  return Object.keys(ProductStatus)
    .filter(key => isNaN(Number(key))) // 過濾掉 Enum 反向映射產生的數字 key
    .map(key => {
      const value = ProductStatus[key as keyof typeof ProductStatus];
      return {
        label: getProductStatusTextByValue(value),
        value: value,
        key: key
      };
    });
};

/**
 * 根據數值取得對應的狀態名稱
 */
export const getProductStatusTextByValue = (value: ProductStatus) => {
  return ProductStatusText[value] || 'Status Error';
};
