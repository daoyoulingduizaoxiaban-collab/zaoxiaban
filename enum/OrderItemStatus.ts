
export enum CustomerOrderStatus {
  UNPAID = 0,     // 未付款
  PAID = 1,       // 客戶付款
  CONFIRMED = 2,   // 已確認
  CANCELLED = 3   // 已取消
}

export const OrderItemStatusText = Object.freeze({
  [CustomerOrderStatus.UNPAID]: '未付款',
  [CustomerOrderStatus.PAID]: '客戶付款',
  [CustomerOrderStatus.CONFIRMED]: '已確認',
  [CustomerOrderStatus.CANCELLED]: '已取消'
});

export const getOrderItemStatusText = (value: CustomerOrderStatus): string => {
  // 這裡使用你習慣的邏輯：若找不到則回傳錯誤訊息
  return OrderItemStatusText[value] || 'Status Error';
};

export const getOrderItemStatusList = () => {
  // 濾掉 Enum 自動生成的反向映射 (針對 TS 數字 Enum 的處理)
  return Object.keys(CustomerOrderStatus)
    .filter(key => isNaN(Number(key)))
    .map(key => {
      const value = CustomerOrderStatus[key as keyof typeof CustomerOrderStatus];
      return {
        label: getOrderItemStatusText(value),
        value: value,
        key: key
      };
    });
};