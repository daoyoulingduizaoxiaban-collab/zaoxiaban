export const ScheduleStatus = Object.freeze({
  ALL: 0,         
  OPEN: 1,         
  STOPPED: 2       
});

export const ScheduleStatusText = Object.freeze({
  [ScheduleStatus.ALL]: '全部',
  [ScheduleStatus.OPEN]: '開放收單',
  [ScheduleStatus.STOPPED]: '停止收單'
});

export const getScheduleStatusList = () => {
  // 透過 Object.keys 迴圈取得所有 Key 名稱 (如 ALL, CLOSED...)
  return Object.keys(ScheduleStatus).map(key => {
    const value = ScheduleStatus[key];
    return {
      label: ScheduleStatusText[value], // 取得對應文字
      value: value,
      key: key
    };
  });
};

export const getStatusTextByValue = (value) => {
  // 確保傳入的值能對應到物件的 Key (轉為數字處理)
  return ScheduleStatusText[Number(value)] || '未知狀態';
};