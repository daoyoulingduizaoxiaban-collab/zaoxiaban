const SUPPORTED_ICON_NAMES = new Set([
  'action',
  'add',
  'app',
  'bulletpoint',
  'chat',
  'check',
  'close-circle-filled',
  'cloud',
  'data-display',
  'delete',
  'discount',
  'edit',
  'home',
  'info-circle',
  'location',
  'message',
  'none',
  'order',
  'root-list',
  'search',
  'secured',
  'server',
  'setting',
  'shop',
  'success',
  'time',
  'upload',
  'user',
  'user-setting',
  'usergroup',
  'view-list',
]);

const ICON_NAME_ALIASES = {
  close: 'close-circle-filled',
  data: 'data-display',
  dashboard: 'data-display',
  list: 'view-list',
  message: 'chat',
  money: 'discount',
  orders: 'order',
  product: 'shop',
  products: 'shop',
  profile: 'user',
  release: 'add',
  review: 'user-setting',
  users: 'usergroup',
};

const normalizeIconName = (name = '') => {
  const normalized = String(name || '').trim();
  const aliased = ICON_NAME_ALIASES[normalized] || normalized;
  return SUPPORTED_ICON_NAMES.has(aliased) ? aliased : 'none';
};

Component({
  externalClasses: ['t-class'],
  options: {
    addGlobalClass: true,
    virtualHost: true,
  },
  properties: {
    name: {
      type: String,
      value: '',
    },
    color: {
      type: String,
      value: '',
    },
    size: {
      type: null,
      value: '40rpx',
    },
    customStyle: {
      type: String,
      value: '',
    },
    style: {
      type: String,
      value: '',
    },
    ariaHidden: {
      type: Boolean,
      value: true,
    },
    ariaLabel: {
      type: String,
      value: '',
    },
    ariaRole: {
      type: String,
      value: 'img',
    },
  },
  data: {
    iconStyle: '',
    iconName: 'none',
  },
  observers: {
    'color, size, customStyle, style': function updateIconStyle() {
      this.setIconStyle();
    },
    name: function updateIconName(name) {
      this.setData({ iconName: normalizeIconName(name) });
    },
  },
  lifetimes: {
    attached() {
      this.setData({ iconName: normalizeIconName(this.data.name) });
      this.setIconStyle();
    },
  },
  methods: {
    normalizeSize(value) {
      const sizeMap = {
        small: '32rpx',
        medium: '40rpx',
        large: '48rpx',
      };
      const size = value === undefined || value === null || value === '' ? '40rpx' : String(value);
      if (sizeMap[size]) {
        return sizeMap[size];
      }
      return /^-?\d+(\.\d+)?$/.test(size) ? `${size}px` : size;
    },
    setIconStyle() {
      const size = this.normalizeSize(this.data.size);
      const color = this.data.color ? `color:${this.data.color};` : '';
      const width = `width:${size};height:${size};font-size:${size};`;
      this.setData({
        iconStyle: `${width}${color}${this.data.style || ''}${this.data.customStyle || ''}`,
      });
    },
    onTap(event) {
      this.triggerEvent('click', event.detail);
    },
  },
});
