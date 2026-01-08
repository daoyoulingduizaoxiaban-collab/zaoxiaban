export enum OrderStatus {
  ALL = 0,         // 全部
  PENDING = 1,     // 待付款
  COMPLETED = 2,   // 已完成
  CANCELLED = 3    // 已取消
}

export const OrderStatusText = Object.freeze({
  [OrderStatus.ALL]: '全部訂單',
  [OrderStatus.PENDING]: '待付款',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消'
});

export const getOrderStatusList = () => {
  return Object.keys(OrderStatus)
    .filter(key => isNaN(Number(key)))
    .map(key => {
      const value = OrderStatus[key as keyof typeof OrderStatus];
      return {
        label: getOrderStatusTextByValue(value), 
        value: value,
        key: key
      };
    });
};

export const getOrderStatusTextByValue = (value: OrderStatus): string => {
  return OrderStatusText[value] || 'Status Error';
};