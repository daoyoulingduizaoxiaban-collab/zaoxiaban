Component({
  externalClasses: ['t-class'],
  options: {
    addGlobalClass: true,
  },
  properties: {
    icon: {
      type: String,
      value: 'add',
    },
    ariaLabel: {
      type: String,
      value: '',
    },
    style: {
      type: String,
      value: '',
    },
    customStyle: {
      type: String,
      value: '',
    },
  },
  methods: {
    handleTap(event) {
      this.triggerEvent('click', event.detail);
      this.triggerEvent('tap', event.detail);
    },
  },
});
