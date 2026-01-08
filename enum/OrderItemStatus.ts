
export enum OrderItemStatus {
  UNPAID = 0,     // 未付款
  PAID = 1,       // 客戶付款
  CONFIRMED = 2   // 已確認
}

export const OrderItemStatusText = Object.freeze({
  [OrderItemStatus.UNPAID]: '未付款',
  [OrderItemStatus.PAID]: '客戶付款',
  [OrderItemStatus.CONFIRMED]: '已確認'
});

export const getOrderItemStatusText = (value: OrderItemStatus): string => {
  // 這裡使用你習慣的邏輯：若找不到則回傳錯誤訊息
  return OrderItemStatusText[value] || 'Status Error';
};

export const getOrderItemStatusList = () => {
  // 濾掉 Enum 自動生成的反向映射 (針對 TS 數字 Enum 的處理)
  return Object.keys(OrderItemStatus)
    .filter(key => isNaN(Number(key))) 
    .map(key => {
      const value = OrderItemStatus[key as keyof typeof OrderItemStatus];
      return {
        label: getOrderItemStatusText(value),
        value: value,
        key: key
      };
    });
};