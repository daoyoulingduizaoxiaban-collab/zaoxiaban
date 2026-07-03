Component({
  externalClasses: ['t-class', 't-class-description'],
  options: {
    addGlobalClass: true,
  },
  properties: {
    icon: {
      type: String,
      value: 'info-circle',
    },
    description: {
      type: String,
      value: '',
    },
  },
});
