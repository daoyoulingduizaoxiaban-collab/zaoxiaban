// 全站统一加载三态容器：loading / error / empty / ready（A11、C-LOADING-UX）
// 用法：<page-state state="{{pageState}}" ...><!-- 正式内容放默认 slot --></page-state>
// state 非 'ready' 时渲染统一占位，'ready' 时渲染 slot 内容。
Component({
  options: {
    addGlobalClass: true,
    multipleSlots: true,
  },
  properties: {
    // 'loading' | 'ready' | 'error' | 'empty'
    state: {
      type: String,
      value: 'loading',
    },
    loadingText: {
      type: String,
      value: '加载中…',
    },
    // error 态
    errorIcon: {
      type: String,
      value: 'error-circle',
    },
    errorText: {
      type: String,
      value: '加载失败，请稍后重试',
    },
    retryText: {
      type: String,
      value: '重试',
    },
    // empty 态
    emptyIcon: {
      type: String,
      value: 'info-circle',
    },
    emptyText: {
      type: String,
      value: '暂无数据',
    },
    // empty 态可选 CTA 按钮，留空则不显示
    emptyCtaText: {
      type: String,
      value: '',
    },
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry');
    },
    onEmptyCta() {
      this.triggerEvent('emptycta');
    },
  },
});
