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
  },
  observers: {
    'color, size, customStyle, style': function updateIconStyle() {
      this.setIconStyle();
    },
  },
  lifetimes: {
    attached() {
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
