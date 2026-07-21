// 客户订单操作面板：声明已付款 / 确认收款 / 取消订单。
// 组件自持表单、凭证上传与校验；校验通过后 triggerEvent('submit', { payload })。
// 页面负责：打开面板（传 visible/actionType/title/submitText/order）、提交后调服务并刷新、控制 submitting。
// 用法：
//   <order-action-panel visible="{{actionPanelVisible}}" action-type="{{actionType}}"
//     title="{{actionPanelTitle}}" submit-text="{{actionSubmitText}}" order="{{actionOrder}}"
//     submitting="{{isSubmittingAction}}" bind:submit="onActionSubmit" bind:close="closeActionPanel" />
Component({
  options: {
    addGlobalClass: true,
  },
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    // 'declarePaid' | 'confirmPayment' | 'cancelOrder'
    actionType: {
      type: String,
      value: '',
    },
    title: {
      type: String,
      value: '',
    },
    submitText: {
      type: String,
      value: '提交',
    },
    // 目标订单，用于金额默认值与上限校验
    order: {
      type: Object,
      value: null,
    },
    // 由页面控制的提交中状态
    submitting: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    actionForm: {
      paymentMethod: '',
      paymentRemark: '',
      paymentProofUrls: [],
      declaredAmount: '',
      confirmedAmount: '',
      confirmRemark: '',
      cancelRemark: '',
    },
  },

  observers: {
    // 面板打开时按 actionType/order 初始化表单，每次开只初始化一次，避免输入被覆盖
    'visible, actionType, order': function observeOpen(visible, actionType, order) {
      if (visible && !this._opened) {
        this._opened = true;
        this.initForm(actionType, order);
      } else if (!visible) {
        this._opened = false;
      }
    },
  },

  methods: {
    getEmptyForm() {
      return {
        paymentMethod: '',
        paymentRemark: '',
        paymentProofUrls: [],
        declaredAmount: '',
        confirmedAmount: '',
        confirmRemark: '',
        cancelRemark: '',
      };
    },

    initForm(actionType, order) {
      const actionForm = this.getEmptyForm();
      if (actionType === 'declarePaid' && order) {
        actionForm.declaredAmount = String(order.totalPrice || '');
      }
      if (actionType === 'confirmPayment' && order) {
        actionForm.confirmedAmount = String(order.declaredAmount || order.totalPrice || '');
      }
      this.setData({ actionForm });
    },

    onClose() {
      this.triggerEvent('close');
    },

    stopTap() {},

    onInput(e) {
      const { field } = e.currentTarget.dataset;
      const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
      if (!field) return;
      this.setData({ [`actionForm.${field}`]: value });
    },

    chooseProof() {
      if (this.data.submitting) return;
      if (!wx.chooseMedia) {
        wx.showToast({ title: '暂时无法选择图片，请稍后重试', icon: 'none' });
        return;
      }

      const currentUrls = this.data.actionForm.paymentProofUrls || [];
      const remainCount = 3 - currentUrls.length;
      if (remainCount <= 0) {
        wx.showToast({ title: '最多上传 3 张付款凭证', icon: 'none' });
        return;
      }

      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        success: (res) => {
          const paths = (res.tempFiles || []).map(file => file.tempFilePath).filter(Boolean);
          if (!paths.length) {
            wx.showToast({ title: '未选择可用图片', icon: 'none' });
            return;
          }
          this.setData({
            'actionForm.paymentProofUrls': [...currentUrls, ...paths].slice(0, 3),
          });
        },
        fail: (err) => {
          const message = err && err.errMsg && err.errMsg.includes('cancel')
            ? '已取消选择图片'
            : '选择付款凭证失败，请重试';
          wx.showToast({ title: message, icon: 'none' });
        },
      });
    },

    removeProof(e) {
      if (this.data.submitting) return;
      const index = Number(e.currentTarget.dataset.index);
      const paymentProofUrls = (this.data.actionForm.paymentProofUrls || [])
        .filter((_, itemIndex) => itemIndex !== index);
      this.setData({ 'actionForm.paymentProofUrls': paymentProofUrls });
    },

    previewProof(e) {
      const index = Number(e.currentTarget.dataset.index || 0);
      const urls = this.data.actionForm.paymentProofUrls || [];
      if (!urls.length) return;
      wx.previewImage({
        current: urls[index] || urls[0],
        urls,
        fail: () => wx.showToast({ title: '付款凭证预览失败', icon: 'none' }),
      });
    },

    buildPayload() {
      const { actionForm } = this.data;
      const { actionType, order } = this.properties;
      const paymentMethod = String(actionForm.paymentMethod || '').trim();
      const paymentRemark = String(actionForm.paymentRemark || '').trim();
      const paymentProofUrls = actionForm.paymentProofUrls || [];
      const declaredAmountText = String(actionForm.declaredAmount || '').trim();
      const confirmedAmountText = String(actionForm.confirmedAmount || '').trim();
      const confirmRemark = String(actionForm.confirmRemark || '').trim();
      const cancelRemark = String(actionForm.cancelRemark || '').trim();
      const totalPrice = Number(order && order.totalPrice ? order.totalPrice : 0);

      if (actionType === 'declarePaid') {
        const declaredAmount = Number(declaredAmountText);
        if (!declaredAmountText || Number.isNaN(declaredAmount) || declaredAmount <= 0) {
          return { error: '请填写有效付款金额' };
        }
        if (totalPrice > 0 && declaredAmount > totalPrice) {
          return { error: '付款金额不能超过订单金额' };
        }
        if (!paymentMethod) {
          return { error: '请填写付款方式' };
        }
        return {
          data: {
            paymentMethod,
            paymentRemark,
            paymentProofUrls,
            declaredAmount,
            note: `客户声明已付款：￥${declaredAmount}｜${[paymentMethod, paymentRemark, paymentProofUrls.length ? `凭证 ${paymentProofUrls.length} 张` : '未上传凭证'].filter(Boolean).join('｜')}`,
          },
        };
      }

      if (actionType === 'confirmPayment') {
        const confirmedAmount = Number(confirmedAmountText);
        if (!confirmedAmountText || Number.isNaN(confirmedAmount) || confirmedAmount <= 0) {
          return { error: '请填写有效实收金额' };
        }
        if (totalPrice > 0 && confirmedAmount > totalPrice) {
          return { error: '实收金额不能超过订单金额' };
        }
        return {
          data: {
            confirmedAmount,
            confirmRemark,
            note: `团主确认收款：实收 ¥${confirmedAmount}${confirmRemark ? `｜${confirmRemark}` : ''}`,
          },
        };
      }

      if (actionType === 'cancelOrder') {
        return {
          data: {
            cancelRemark,
            note: cancelRemark ? `订单已取消：${cancelRemark}` : '订单已取消',
          },
        };
      }

      return { error: '未知订单操作' };
    },

    onSubmit() {
      if (this.data.submitting) return;
      const result = this.buildPayload();
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        return;
      }
      this.triggerEvent('submit', { payload: result.data });
    },
  },
});
