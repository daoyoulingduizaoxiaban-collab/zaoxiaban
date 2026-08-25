import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';
import { RESULT_TEXT, toastSuccess } from '~/utils/feedback';
import config, { setDataBackend } from '~/config';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
    isLoggedIn: false,
    // 账号资料改在本页直接编辑（跟「当前角色」同页），不再另开一页。
    canEditInfo: false,
    infoDisabledReason: '',
    personInfo: {
      name: '',
      phone: '',
      gender: 0,
      introduction: '',
    },
    genderOptions: [
      { label: '男', value: 0 },
      { label: '女', value: 1 },
      { label: '保密', value: 2 },
    ],
    isSubmittingInfo: false,
  },

  async onLoad() {
    await AuthService.refreshSession();
    this.refreshSettingState();
  },

  async onShow() {
    await AuthService.refreshSession();
    this.refreshSettingState();
  },

  getDataModeNote(profile, session, cloudEnabled) {
    if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      return '资料会同步保存';
    }
    if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      return '资料已保存';
    }
    return '请登录后查看资料保存状态';
  },

  getCloudSettingNote(session) {
    if (session && session.cloudOpenIdVerified) return '账号已完成微信登录验证';
    if (session && (session.qaOverride || session.isMockOpenId)) return '请完成微信登录后同步账号资料';
    return '请先登录账号';
  },

  refreshSettingState() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const cloudEnabled = isCloudBusinessEnabled();
    if (!profile) {
      this.setData({
        isLoggedIn: false,
        menuData: [],
        canEditInfo: false,
      });
      return;
    }

    const menuData = [
      [
        {
          title: '当前角色',
          note: profile.roleLabel,
          icon: 'user',
        },
        {
          title: '资料保存',
          note: this.getDataModeNote(profile, session, cloudEnabled),
          icon: 'server',
        },
      ],
    ];

    // 开发用：切数据后端不必改源码（改源码会触发热重载，把自动化测试的模拟器导航重置，
    // 而且常忘了还原就提交）。正式版不显示（config.isDev 已改成以官方 envVersion 判定）。
    if (config.isDev) {
      menuData.push([
        {
          title: '数据后端',
          note: `当前：${config.dataBackend === 'local' ? '本地服务（localhost:3000）' : '微信云开发'}｜点这里切换，立即生效`,
          icon: 'swap',
          action: 'toggleDataBackend',
        },
      ]);
    }

    const canEditInfo = canUseFeature(profile, FEATURE_KEYS.INFO_EDIT);

    menuData.push([
      {
        title: '微信账号',
        note: this.getCloudSettingNote(session),
        icon: 'cloud',
      },
      {
        title: '权限管理',
        note: '首次登录需管理员审核；团主、客户与管理员按角色开放功能',
        icon: 'secured',
      },
    ]);

    // 只在本页第一次可编辑时灌入表单，onShow 每次重刷不重灌——
    // 不然填到一半切走再切回来（比如挑头像/切后台），没保存的输入会被冲掉。
    const shouldFillForm = canEditInfo && !(this as any)._infoFilled;
    if (shouldFillForm) (this as any)._infoFilled = true;
    this.setData({
      isLoggedIn: true,
      menuData,
      canEditInfo,
      infoDisabledReason: canEditInfo ? '' : AuthService.getAccessStateText(profile),
      personInfo: shouldFillForm ? {
        name: profile.displayName || '',
        phone: profile.phone || '',
        gender: Number(profile.gender || 0),
        introduction: profile.introduction || '',
      } : this.data.personInfo,
    });
  },

  personInfoFieldChange(field, e) {
    this.setData({ [`personInfo.${field}`]: e.detail.value });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onPhoneChange(e) {
    this.personInfoFieldChange('phone', e);
  },

  onGenderChange(e) {
    // radio-group 的 e.detail.value 是字串，personInfo.gender 是数字，
    // 不转型会导致 checked="{{personInfo.gender === item.value}}" 永远比不中，选了跟没选一样。
    this.setData({ 'personInfo.gender': Number(e.detail.value) });
  },

  onIntroductionChange(e) {
    this.personInfoFieldChange('introduction', e);
  },

  async onSaveInfo() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.INFO_EDIT) || !this.data.canEditInfo) {
      wx.showToast({ title: '当前账号没有编辑个人信息权限', icon: 'none' });
      return;
    }
    const name = String(this.data.personInfo.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写用户名', icon: 'none' });
      return;
    }
    const phone = String(this.data.personInfo.phone || '').trim();
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入 11 位中国大陆手机号', icon: 'none' });
      return;
    }
    this.setData({ isSubmittingInfo: true });
    const res = await DirectoryRepository.saveUser({
      id: profile.id,
      name,
      displayName: name,
      phone,
      gender: Number(this.data.personInfo.gender || 0),
      introduction: String(this.data.personInfo.introduction || '').trim(),
    });
    this.setData({ isSubmittingInfo: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存个人信息失败', icon: 'none' });
      return;
    }
    AuthService.updateCurrentProfile(res.data);
    toastSuccess(RESULT_TEXT.save);
  },

  onToggleDataBackend() {
    let next = '';
    try {
      next = setDataBackend(config.dataBackend === 'local' ? 'cloud' : 'local');
    } catch (err) {
      wx.showToast({ title: '写入设定失败，请改用开发者工具的储存面板', icon: 'none' });
      return;
    }
    this.refreshSettingState();
    wx.showModal({
      title: `已切到${next === 'local' ? '本地服务' : '微信云开发'}`,
      content: next === 'local'
        ? '立即生效。记得先启动本地服务：node local-server/server.js'
        : '立即生效。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onEleClick(e) {
    const { title, note, url, action } = e.currentTarget.dataset.data;
    if (action === 'toggleDataBackend') {
      this.onToggleDataBackend();
      return;
    }
    if (url) {
      navigateByUrl(url, {
        fail: () => wx.showToast({ title: '打开账号资料失败', icon: 'none' }),
      });
      return;
    }
    this.onShowToast('#t-toast', `${title}：${note}`);
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/setting/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
