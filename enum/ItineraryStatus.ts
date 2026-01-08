export enum ItineraryStatus {
  ALL = 0,
  OPEN = 1,
  STOPPED = 2
};

export const ItineraryStatusText = Object.freeze({
  [ItineraryStatus.ALL]: '全部',
  [ItineraryStatus.OPEN]: '開放收單',
  [ItineraryStatus.STOPPED]: '停止收單'
});

export const getItineraryStatusList = () => {
  return Object.keys(ItineraryStatus).map(key => {
    const value = ItineraryStatus[key];
    return {
      label: getStatusTextByValue(value), // 取得對應文字
      value: value,
      key: key
    };
  });
};

export const getStatusTextByValue = (value: ItineraryStatus) => {
  // 確保傳入的值能對應到物件的 Key (轉為數字處理)
  return ItineraryStatusText[value] || 'Status Error';
};