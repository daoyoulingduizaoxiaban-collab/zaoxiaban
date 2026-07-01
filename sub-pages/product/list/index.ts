import { ProductMock } from '~/mock/product/index';

Page({
  data: {
    titleText: '商品列表',
    allProducts: [],
    filteredList: [],
    searchKeyword: '',
    minPrice: null,
    maxPrice: null
  },

  onLoad() {
    this.generateMockData();
  },

  async generateMockData() {
    const res = await ProductMock.fetchProductListMock();
    this.setData({
      allProducts: res.data,
      filteredList: res.data
    });
  },

  onInputKeyword(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onMinPriceInput(e) {
    this.setData({ minPrice: e.detail.value });
  },

  onMaxPriceInput(e) {
    this.setData({ maxPrice: e.detail.value });
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', filteredList: this.data.allProducts });
  },

  executeSearch() {
    const { allProducts, searchKeyword, minPrice, maxPrice } = this.data;

    const results = allProducts.filter(item => {
      const matchKeyword = !searchKeyword ||
        item.title.includes(searchKeyword) ||
        item.description.includes(searchKeyword);

      const basePrice = item.priceSetting[0] ? item.priceSetting[0].unitPrice : 0;
      const matchMinPrice = !minPrice || basePrice >= parseFloat(minPrice);
      const matchMaxPrice = !maxPrice || basePrice <= parseFloat(maxPrice);

      return matchKeyword && matchMinPrice && matchMaxPrice;
    });

    this.setData({ filteredList: results });
  }
});
