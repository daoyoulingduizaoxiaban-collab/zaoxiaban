// pages/order/index.ts
Page({
  data: {
    orderId: null as number | null,
    orderDetail: null as any
  },

  onLoad(options: any) {
    // 從 URL 參數中提取 id
    if (options.id) {
      this.setData({ orderId: Number(options.id) });
      this.fetchOrderDetail(options.id);
    }
  },

  fetchOrderDetail(id: string) {
    // 這裡明天可以接 API，今天先用 Mock 或從全域抓
    console.log("載入訂單資料，ID:", id);
    // TODO: 根據 ID 顯示正確的客戶名稱與商品清單
  }
});