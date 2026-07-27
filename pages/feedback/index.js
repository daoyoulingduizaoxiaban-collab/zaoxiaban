import config from '~/config';
import { AuthService } from '~/services/auth/authService';
import { FeedbackRepository } from '~/repositories/feedbackRepository';

Page({
  data: {
    isDev: config.isDev,
    content: '',
    contextPage: '',
    submitting: false,
  },

  onLoad() {
    // 仅测试环境可用
    if (!config.isDev) {
      wx.showToast({ title: '仅测试环境可用', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => {} }), 800);
      return;
    }
    // 自动带出「从哪个页面进来的」，方便定位问题
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    this.setData({ contextPage: (prev && prev.route) || '' });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value || '' });
  },

  onContextInput(e) {
    this.setData({ contextPage: e.detail.value || '' });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const content = String(this.data.content || '').trim();
    if (!content) {
      wx.showToast({ title: '请填写问题描述', icon: 'none' });
      return;
    }
    if (!AuthService.getCurrentProfile()) {
      wx.showToast({ title: '请先登录后再反馈', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const res = await FeedbackRepository.create({
      content,
      contextPage: this.data.contextPage,
    });
    this.setData({ submitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '提交失败，请稍后再试', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
    setTimeout(() => wx.navigateBack({ fail: () => {} }), 800);
  },
});
