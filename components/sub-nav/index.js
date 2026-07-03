import { navigateBackOrTab } from '~/utils/navigation';

Component({
  properties: {
    title: {
      type: String,
      value: '页面'
    }
  },
  methods: {
    onBack() {
      navigateBackOrTab('/pages/groupOrder/index');
    }
  }
});
