
export enum MemberOrderStatus {
  UNPAID = 0,     // 未付款
  PAID = 1,       // 客戶付款
  CONFIRMED = 2,   // 已確認
  CANCELLED = 3   // 已取消
}

export const MemberOrderStatusText = Object.freeze({
  [MemberOrderStatus.UNPAID]: '未付款',
  [MemberOrderStatus.PAID]: '客戶付款',
  [MemberOrderStatus.CONFIRMED]: '已確認',
  [MemberOrderStatus.CANCELLED]: '已取消'
});

export const getMemberOrderStatusText = (value: MemberOrderStatus): string => {
  // 這裡使用你習慣的邏輯：若找不到則回傳錯誤訊息
  return MemberOrderStatusText[value] || 'Status Error';
};

export const getMemberOrderStatusList = () => {
  // 濾掉 Enum 自動生成的反向映射 (針對 TS 數字 Enum 的處理)
  return Object.keys(MemberOrderStatus)
    .filter(key => isNaN(Number(key)))
    .map(key => {
      const value = MemberOrderStatus[key as keyof typeof MemberOrderStatus];
      return {
        label: getMemberOrderStatusText(value),
        value: value,
        key: key
      };
    });
};