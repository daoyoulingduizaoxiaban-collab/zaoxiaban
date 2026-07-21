import { AuthService } from '~/services/auth/authService';
import { canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { debugLog } from '~/utils/debugLog';

/**
 * 共享「鉴权 + 加载三态」脚手架（R1）。
 * 把 customerOrders / groupOrder / productManagement 三个 tab 页 copy 的
 * access-state（authReady/canUseBusiness/accessStateText/isLoggedIn/roleScopeText）
 * 与三态（isLoading/loadErrorText/pageState/emptyText/emptyCta）样板收口。
 *
 * 设计取舍：**只暴露返回字段对象的纯 helper，不劫持 onLoad/onShow**。
 * 原因：Behavior 与 Page 同名生命周期会互相覆盖（页面赢，behavior 的不自动跑），
 * 各页 onShow 流程又有差异（skipNextShowRefresh、isNavigatingCreate、公开目录…），
 * 故把编排留在页面里，页面在自己的 setData 里 `...spread` 这些 helper 结果，保证一次 setData、行为可控。
 *
 * 用法：
 *   behaviors: [useAccessPage],
 *   // 加载前：this.setData(this.loadingState());
 *   // 成功：  this.setData({ 列表字段, ...this.buildAccessState(FEATURE_KEYS.X), ...this.threeState('ready') });
 *   // 空：    ...this.threeState('empty', { emptyText, emptyCta })
 *   // 失败：  ...this.threeState('error', { errorText })
 */
export const useAccessPage = Behavior({
  data: {
    authReady: false,
    isLoading: true,
    loadErrorText: '',
    // loading | ready | error | empty
    pageState: 'loading',
    emptyText: '暂无数据',
    emptyCta: '',
    isLoggedIn: false,
    canUseBusiness: false,
    accessStateText: '',
    roleScopeText: '',
  },

  methods: {
    // access-state 字段对象（不 setData，交调用方合并）
    buildAccessState(featureKey, profile = AuthService.getCurrentProfile()) {
      const canUseBusiness = AuthService.canUseBusiness(profile);
      return {
        isLoggedIn: Boolean(profile),
        canUseBusiness,
        authReady: true,
        accessStateText: AuthService.getAccessStateText(profile),
        roleScopeText: canUseBusiness
          ? getRoleScopeText(profile, featureKey)
          : AuthService.getAccessStateText(profile),
      };
    },

    // 进入加载态的字段对象（authReady 归 false，表示身份/数据都在重新确认）
    loadingState() {
      debugLog('access', this.route || this.is || '', '→ loading');
      return { authReady: false, isLoading: true, loadErrorText: '', pageState: 'loading' };
    },

    // 三态落地字段对象。state: 'ready' | 'error' | 'empty'
    threeState(state, { errorText = '', emptyText, emptyCta = '' } = {}) {
      debugLog('access', this.route || this.is || '', `→ ${state}`, errorText || '');
      const base = {
        isLoading: false,
        pageState: state,
        loadErrorText: state === 'error' ? errorText : '',
      };
      if (state === 'empty') {
        if (emptyText !== undefined) base.emptyText = emptyText;
        base.emptyCta = emptyCta;
      }
      return base;
    },

    hasFeature(featureKey, profile = AuthService.getCurrentProfile()) {
      return canUseFeature(profile, featureKey);
    },
  },
});

export default useAccessPage;
