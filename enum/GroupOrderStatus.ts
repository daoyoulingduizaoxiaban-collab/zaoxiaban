export enum GroupOrderStatus {
  ALL = 0,
  OPEN = 1,
  STOPPED = 2
};

export const GroupOrderStatusText = Object.freeze({
  [GroupOrderStatus.ALL]: '全部',
  [GroupOrderStatus.OPEN]: '开放收单',
  [GroupOrderStatus.STOPPED]: '停止收单'
});

export const getGroupOrderStatusList = () => {
  return Object.keys(GroupOrderStatus)
    .filter(key => isNaN(Number(key)))
    .map(key => {
      const value = GroupOrderStatus[key];
      return {
        label: getGroupOrderStatusTextByValue(value), // 取得對應文字
        value: value,
        key: key
      };
    });
};

export const getGroupOrderStatusTextByValue = (value: GroupOrderStatus) => {
  // 確保傳入的值能對應到物件的 Key (轉為數字處理)
  return GroupOrderStatusText[value] || 'Status Error';
};
