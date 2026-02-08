import { Product,PriceSetting } from '../../../models/Product'; 

Page({
  data: {
    titleText:"商品列表",
    allProducts: [], // 原始完整數據
    filteredList: [], // 篩選後的數據
    searchKeyword: '',
    minPrice: null,
    maxPrice: null
  },

  onLoad() {
    // 這裡放入你之前建立的 Product 實例列表
    const initialList = [/* 剛才那兩筆 Product 資料 */];
    // this.setData({
    //   allProducts: initialList,
    //   filteredList: initialList
    // });

    this.generateMockData();
  },
  generateMockData() {
    // 構建符合 Model 的假資料
    const mockData = [
      new Product({
        id: 1001,
        title: "九份平溪一日專車接送 (5人座)",
        pictureUrls: ["https://picsum.photos/id/1072/400/250"],
        description: "包含野柳、十分瀑布、九份老街行程，全程8小時，含司機服務與保險。",
        priceSetting: [
          { minQuantity: 1, unitPrice: 3500, description: "單日用車原價" },
          { minQuantity: 3, unitPrice: 3200, description: "連訂三日優惠" }
        ]
      }),
      new Product({
        id: 1002,
        title: "故宮博物院門票 - 電子憑證",
        pictureUrls: ["https://picsum.photos/id/1043/400/250"],
        description: "快速通關免排隊，出示 QR Code 即可入場。世界四大博物館之一，館藏豐富。",
        priceSetting: [
          { minQuantity: 1, unitPrice: 350 },
          { minQuantity: 10, unitPrice: 315, description: "團體票 9 折" },
          { minQuantity: 30, unitPrice: 280, description: "學生團體超值優惠" }
        ]
      }),
      new Product({
        id: 1003,
        title: "在地手工鳳梨酥 (12入禮盒)",
        pictureUrls: ["https://picsum.photos/id/493/400/250"],
        description: "嚴選關廟鳳梨，純手工製作，無添加防腐劑，導遊推薦必買伴手禮。",
        priceSetting: [
          { minQuantity: 1, unitPrice: 600, totalPrice: 600 },
          { minQuantity: 5, unitPrice: 550, totalPrice: 2750, description: "買五盒每盒折50" },
          { minQuantity: 20, unitPrice: 500, totalPrice: 10000, description: "團購批發價" }
        ]
      }),
      new Product({
        id: 1004,
        title: "阿里山高山茶 - 特級烏龍",
        pictureUrls: ["https://picsum.photos/id/431/400/250"],
        description: "海拔1200公尺以上茶園，手工採摘，茶湯甘醇回甘。",
        priceSetting: [
          { minQuantity: 1, unitPrice: 1200, description: "每斤單價" },
          { minQuantity: 2, unitPrice: 1080, description: "兩件同行 9 折" }
        ]
      })
    ];
    this.setData({
      allProducts: mockData,
      filteredList: mockData
    });
  },

  onInputKeyword(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onMinPriceInput(e) { this.setData({ minPrice: e.detail.value }); },
  onMaxPriceInput(e) { this.setData({ maxPrice: e.detail.value }); },

  onClearSearch() {
    this.setData({ searchKeyword: '', filteredList: this.data.allProducts });
  },

  executeSearch() {
    const { allProducts, searchKeyword, minPrice, maxPrice } = this.data;
    
    const results = allProducts.filter(item => {
      // 1. 關鍵字匹配
      const matchKeyword = !searchKeyword || 
        item.title.includes(searchKeyword) || 
        item.description.includes(searchKeyword);
      
      // 2. 價格區間匹配 (以第一檔 priceSetting 為基準)
      const basePrice = item.priceSetting[0]?.unitPrice || 0;
      const matchMinPrice = !minPrice || basePrice >= parseFloat(minPrice);
      const matchMaxPrice = !maxPrice || basePrice <= parseFloat(maxPrice);
      
      return matchKeyword && matchMinPrice && matchMaxPrice;
    });

    this.setData({ filteredList: results });
  }
});