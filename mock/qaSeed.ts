import { GroupOrder } from '~/models/GroupOrder';
import { MemberOrder, MemberProduct } from '~/models/MemberOrder';
import { PriceSetting, Product } from '~/models/Product';
import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { MemberOrderStatus } from '~/enum/MemberOrderStatus';
import { ProductStatus } from '~/enum/ProductStatus';

const QA_STORAGE_KEY = 'dao_you_ling_qa_seed';

const buildProducts = () => [
  new Product({
    id: 101,
    ownerUserId: 2,
    providerId: 'P001',
    status: ProductStatus.PUBLISHED,
    title: '黄山团单伴手礼礼盒',
    pictureUrls: ['/static/home/card0.png'],
    priceSetting: [
      new PriceSetting({ minQuantity: 1, unitPrice: 88, totalPrice: 88, description: '单盒价' }),
      new PriceSetting({ minQuantity: 10, unitPrice: 78, totalPrice: 780, description: '满 10 盒团单价' }),
      new PriceSetting({ minQuantity: 30, unitPrice: 68, totalPrice: 2040, description: '大团批量价' }),
    ],
    description: '适合华东线路收单展示的伴手礼，包含长描述用于检查多行省略、卡片高度和详情展示。',
    sourceNote: '杭州伴手礼供应商，团主可用于团单收单。',
  }),
  new Product({
    id: 102,
    ownerUserId: 2,
    providerId: 'P001',
    status: ProductStatus.PUBLISHED,
    title: '西湖龙井茶叶小罐装',
    pictureUrls: ['/static/home/card1.png'],
    priceSetting: [
      new PriceSetting({ minQuantity: 1, unitPrice: 128, totalPrice: 128, description: '单罐价' }),
      new PriceSetting({ minQuantity: 6, unitPrice: 118, totalPrice: 708, description: '满 6 罐优惠' }),
    ],
    description: '有图片、上架、阶梯价格商品，用于本团商品和商品库选择。',
    sourceNote: '供应商供货，适合作为可售商品。',
  }),
  new Product({
    id: 103,
    ownerUserId: 2,
    providerId: 'P001',
    status: ProductStatus.UNPUBLISHED,
    title: '无图片雨具应急包',
    pictureUrls: [],
    priceSetting: [
      new PriceSetting({ minQuantity: 1, unitPrice: 35, totalPrice: 35, description: '单份价' }),
    ],
    description: '下架且无图片商品，用于空图片兜底、下架状态和搜索过滤。',
    sourceNote: '团主自建应急商品，下架状态。',
  }),
  new Product({
    id: 104,
    ownerUserId: 2,
    providerId: 'P002',
    status: ProductStatus.PUBLISHED,
    title: '景区无线讲解器租赁',
    pictureUrls: ['/static/home/card2.png'],
    priceSetting: [
      new PriceSetting({ minQuantity: 10, unitPrice: 12, description: '10 台起租' }),
      new PriceSetting({ minQuantity: 30, unitPrice: 10, description: '30 台以上' }),
    ],
    description: '供应商服务型商品，用于验证商品库中非实物商品的展示。',
    sourceNote: '景区讲解器供应商，服务型商品。',
  }),
];

const buildMemberOrders = () => [
  new MemberOrder({
    id: 5001,
    userId: 201,
    groupOrderId: 1,
    status: MemberOrderStatus.UNPAID,
    totalPrice: 352,
    originalTotalPrice: 352,
    memberRemark: '客户备注：晚餐后统一取货。',
    hostRemark: '团主备注：未付款，出发前提醒。',
    productList: [
      new MemberProduct({ productId: 101, amount: 4, totalPrice: 352, originalTotalPrice: 352 }),
    ],
  }),
  new MemberOrder({
    id: 5002,
    userId: 202,
    groupOrderId: 1,
    status: MemberOrderStatus.PAID,
    totalPrice: 590,
    originalTotalPrice: 640,
    memberRemark: '客户已上传付款截图。',
    hostRemark: '待团主确认到账。',
    productList: [
      new MemberProduct({ productId: 102, amount: 5, totalPrice: 590, originalTotalPrice: 640, isAdjusted: true }),
    ],
  }),
  new MemberOrder({
    id: 5003,
    userId: 203,
    groupOrderId: 1,
    status: MemberOrderStatus.CONFIRMED,
    totalPrice: 2040,
    originalTotalPrice: 2640,
    memberRemark: '团客代表统一下单。',
    hostRemark: '已确认到账。',
    productList: [
      new MemberProduct({ productId: 101, amount: 30, totalPrice: 2040, originalTotalPrice: 2640, isAdjusted: true }),
    ],
  }),
  new MemberOrder({
    id: 5004,
    userId: 204,
    groupOrderId: 2,
    status: MemberOrderStatus.CANCELLED,
    totalPrice: 0,
    originalTotalPrice: 128,
    memberRemark: '客户取消。',
    hostRemark: '客户取消状态。',
    productList: [
      new MemberProduct({ productId: 102, amount: 1, totalPrice: 0, originalTotalPrice: 128, isAdjusted: true }),
    ],
  }),
];

const buildGroupOrders = () => {
  const products = buildProducts();
  const orders = buildMemberOrders();
  const list = [
    new GroupOrder({
      id: 1,
      ownerUserId: 1,
      guideUserId: 2,
      authorizedGuideIds: [],
      title: '华东五日团伴手礼收单',
      status: GroupOrderStatus.OPEN,
      description: '开放收单，有客户订单、有本团商品。',
      qrCodeUrl: '/static/logo/zaoxiaban.png',
      productList: [products[0], products[1], products[3]],
      memberOrderList: orders.filter(item => item.groupOrderId === 1),
    }),
    new GroupOrder({
      id: 2,
      ownerUserId: 1,
      guideUserId: 2,
      authorizedGuideIds: [],
      title: '北京研学团补货单',
      status: GroupOrderStatus.STOPPED,
      description: '停止收单，有取消订单。',
      qrCodeUrl: '',
      productList: [products[1]],
      memberOrderList: orders.filter(item => item.groupOrderId === 2),
    }),
    new GroupOrder({
      id: 3,
      ownerUserId: 1,
      guideUserId: 99,
      authorizedGuideIds: [],
      title: '成都周末团空单',
      status: GroupOrderStatus.OPEN,
      description: '开放收单但没有客户订单、没有商品。',
      qrCodeUrl: '',
      productList: [],
      memberOrderList: [],
    }),
  ];

  list.forEach(item => item.recalculateTotals());
  return list;
};

const buildSeed = () => ({
  mode: 'qa',
  users: [
    { id: 1, openId: 'mock-openid-owner', role: 'owner', name: '林秝帆', displayName: '林秝帆', displayRole: '产品拥有者', city: '上海', phone: '13800000001', avatarUrl: '/static/avatar1.png', status: 'active' },
    { id: 2, openId: 'mock-openid-guide', role: 'guide', name: '张团主', displayName: '张团主', displayRole: '团主', city: '杭州', phone: '13800000002', avatarUrl: '/static/avatar1.png', status: 'active' },
    { id: 3, openId: 'mock-openid-customer', role: 'customer', name: '王客户', displayName: '王客户', displayRole: '客户', city: '南京', phone: '13800000003', avatarUrl: '/static/avatar1.png', status: 'active' },
  ],
  products: buildProducts(),
  groupOrders: buildGroupOrders(),
  customerOrders: [
    { id: 5001, groupOrderId: 1, customerUserId: 3, guideUserId: 2, title: '华东五日团伴手礼收单 - 王客户', status: MemberOrderStatus.UNPAID, statusText: '未付款', totalPrice: 352, customerName: '王客户' },
    { id: 5002, groupOrderId: 1, customerUserId: 301, guideUserId: 2, title: '华东五日团伴手礼收单 - 李客户', status: MemberOrderStatus.PAID, statusText: '客户付款', totalPrice: 590, customerName: '李客户' },
    { id: 5003, groupOrderId: 1, customerUserId: 302, guideUserId: 2, title: '华东五日团伴手礼收单 - 团客代表', status: MemberOrderStatus.CONFIRMED, statusText: '已确认', totalPrice: 2040, customerName: '团客代表' },
    { id: 5004, groupOrderId: 2, customerUserId: 303, guideUserId: 2, title: '北京研学团补货单 - 取消单', status: MemberOrderStatus.CANCELLED, statusText: '已取消', totalPrice: 0, customerName: '赵客户' },
  ],
  providers: [
    { id: 'P001', title: '杭州伴手礼供应商', contact: '供应联系人 A', statusText: '可显示资料', note: '供应商可为团单商品提供供货信息。' },
    { id: 'P002', title: '景区讲解器供应商', contact: '供应联系人 B', statusText: '资料待确认', note: '供应商结算与上下架权限待确认。' },
  ],
  admins: [
    { id: 'A001', title: '系统管理员', statusText: '已授权角色', note: '用于查看授权范围内的管理事项。' },
  ],
});

const cloneSeed = seed => JSON.parse(JSON.stringify(seed));

export const QaSeedMock = {
  storageKey: QA_STORAGE_KEY,

  buildSeed,

  loadSeed() {
    const stored = wx.getStorageSync(QA_STORAGE_KEY);
    if (stored && stored.mode === 'qa') {
      return stored;
    }
    return this.resetSeed();
  },

  resetSeed() {
    const seed = cloneSeed(buildSeed());
    wx.setStorageSync(QA_STORAGE_KEY, seed);
    return seed;
  },

  getProducts() {
    return this.loadSeed().products.map(item => new Product(item));
  },

  getGroupOrders() {
    return this.loadSeed().groupOrders.map(item => new GroupOrder(item));
  },

  getCustomerOrders() {
    return this.loadSeed().customerOrders;
  },

  getProviders() {
    return this.loadSeed().providers;
  },

  getAdmins() {
    return this.loadSeed().admins;
  },

  getUsers() {
    return this.loadSeed().users;
  },
};
