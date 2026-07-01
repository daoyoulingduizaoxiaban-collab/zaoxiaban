import { Product } from '../../models/Product';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import {
  getProductStatusList,
  getProductStatusTextByValue
} from '~/enum/ProductStatus'


Page({
  data: {
    productList: [] as Product[], // 頁面顯示的清單
    allProducts: [] as Product[], // 原始完整數據（用於搜尋過濾）
    searchQuery: '',
    titleText: '商品库',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
    roleScopeText: '',
    saveModeText: '本地/QA 展示模式，尚未正式保存',
    isLoading: false,
    productStatusTextMap: {
      1: getProductStatusTextByValue(1),
      2: getProductStatusTextByValue(2)
    },
  },

  onLoad() {
    this.fetchData();
  },

  onShow() {
    this.fetchData();
  },

  async fetchData() {
    this.setData({ isLoading: true });
    const res = await ProductService.listVisible({
      keyword: this.data.searchQuery,
      status: this.data.currentStatus,
    });

    if (!res.success) {
      wx.showToast({ title: res.error || '加载商品失败', icon: 'none' });
      this.setData({ isLoading: false });
      return;
    }

    this.setData({
      allProducts: res.data,
      productList: res.data,
      roleScopeText: this.getRoleScopeText(),
      isLoading: false,
    });
  },

  // 2. 搜尋條件區塊邏輯
  onSearchInput(e: any) {
    this.setData({
      searchQuery: e.detail.value
    }, () => this.fetchData());
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!profile) return '未登录，仅显示空列表';
    if (profile.role === 'guide') return '仅显示你可管理或可使用的商品';
    if (profile.role === 'customer') return '客户角色暂不开放商品库管理';
    if (profile.role === 'owner' || profile.role === 'admin') return '当前为管理角色，可查看 QA 范围内商品';
    if (profile.role === 'provider') return '仅显示你提供的商品';
    return '当前角色暂无商品库权限';
  },

  onAddProduct() {
    const profile = AuthService.getCurrentProfile();
    if (!profile || profile.role === 'customer') {
      wx.showToast({ title: '当前角色不能新增商品', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/sub-pages/product/add/index`,
      fail: () => {
        wx.showToast({
          title: '打开商品表单失败',
          icon: 'none',
        });
      },
      events: {
        refreshList: () => {
          this.fetchData();
          wx.showToast({
            title: '本地/QA 展示模式，尚未正式保存',
            icon: 'none'
          });
        }
      }
    });
  },

  // 3. 下架/上架切換
  async onToggleStatus(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const item = this.data.allProducts.find(product => String(product.id) === id);
    if (!item) {
      wx.showToast({ title: '未找到商品', icon: 'none' });
      return;
    }

    const res = await ProductService.toggleStatus(item);
    if (!res.success) {
      wx.showToast({ title: res.error || '更新商品状态失败', icon: 'none' });
      return;
    }

    await this.fetchData();
    wx.showToast({
      title: `本地/QA：${getProductStatusTextByValue(res.data.status)}`,
      icon: 'none'
    });
  },

  // 3. 刪除功能
  onDelete(e: any) {
    const id = String(e.currentTarget.dataset.id);

    wx.showModal({
      title: '提示',
      content: '确定要软删除此商品吗？本地/QA 展示模式，尚未正式保存到云端。',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          const res = await ProductService.softDelete(id);
          if (!res.success) {
            wx.showToast({ title: res.error || '删除商品失败', icon: 'none' });
            return;
          }
          await this.fetchData();
          wx.showToast({ title: '本地/QA 展示模式，尚未正式保存', icon: 'none' });
        }
      }
    });
  },

  // 監聽狀態切換
  async onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.fetchData());
  },
});
