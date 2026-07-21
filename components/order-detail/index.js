// 客户订单详情弹窗（纯展示）。detail 由页面 openOrderDetailById 预处理成展示就绪对象。
// 用法：<order-detail visible="{{detailVisible}}" detail="{{selectedOrderDetail}}" bind:close="closeDetailPanel" />
Component({
  options: {
    addGlobalClass: true,
  },
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    detail: {
      type: Object,
      value: null,
    },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    stopTap() {},
  },
});
