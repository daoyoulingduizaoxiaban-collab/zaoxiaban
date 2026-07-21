import { areaList } from './areaData.js';
import { AuthService } from '~/services/auth/authService';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { isCloudBusinessEnabled, uploadCloudFiles } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

const getPhotoSource = photo => (photo ? (photo.url || photo.path || '') : '');
const needsCloudUpload = path => Boolean(
  path
  && !/^cloud:\/\//.test(String(path))
  && !/^https:\/\//.test(String(path))
  && !/^\/static\//.test(String(path))
);

Page({
  data: {
    personInfo: {
      name: '',
      phone: '',
      gender: 0,
      birth: '',
      address: [],
      introduction: '',
      photos: [],
    },
    genderOptions: [
      {
        label: '男',
        value: 0,
      },
      {
        label: '女',
        value: 1,
      },
      {
        label: '保密',
        value: 2,
      },
    ],
    birthVisible: false,
    birthStart: '1970-01-01',
    birthEnd: new Date().toISOString().slice(0, 10),
    birthTime: 0,
    birthFilter: (type, options) => (type === 'year' ? options.sort((a, b) => b.value - a.value) : options),
    addressText: '',
    addressVisible: false,
    provinces: [],
    cities: [],

    gridConfig: {
      column: 3,
      width: 160,
      height: 160,
    },
    isSubmitting: false,
    canEdit: false,
    accessState: 'logged_out',
    disabledReason: '请先登录后编辑个人信息',
  },

  getEmptyPersonInfo() {
    return {
      name: '',
      phone: '',
      gender: 0,
      birth: '',
      address: [],
      introduction: '',
      photos: [],
    };
  },

  onLoad() {
    this.initAreaData();
    this.getPersonalInfo();
  },

  getPersonalInfo() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.INFO_EDIT)) {
      this.setData({
        canEdit: false,
        accessState: AuthService.getAccessState(profile),
        disabledReason: AuthService.getAccessStateText(profile),
        personInfo: this.getEmptyPersonInfo(),
        addressText: '',
        birthVisible: false,
        addressVisible: false,
        isSubmitting: false,
      });
      return;
    }
    const cityEntry = Object.entries(areaList.cities).find(([, label]) => label === profile.city);
    const address = cityEntry ? [cityEntry[0].slice(0, 2).padEnd(6, '0'), cityEntry[0]] : [];
    this.setData({
      canEdit: true,
      accessState: AuthService.getAccessState(profile),
      disabledReason: '',
      personInfo: {
        ...this.data.personInfo,
        name: profile.displayName || '',
        phone: profile.phone || '',
        gender: Number(profile.gender || 0),
        birth: profile.birth || '',
        address,
        introduction: profile.introduction || '',
        photos: profile.avatarUrl ? [{ url: profile.avatarUrl }] : [],
      },
      addressText: profile.city || '',
    });
  },

  getAreaOptions(data, filter) {
    const res = Object.keys(data).map((key) => ({ value: key, label: data[key] }));
    return typeof filter === 'function' ? res.filter(filter) : res;
  },

  getCities(provinceValue) {
    return this.getAreaOptions(
      areaList.cities,
      (city) => `${city.value}`.slice(0, 2) === `${provinceValue}`.slice(0, 2),
    );
  },

  initAreaData() {
    const provinces = this.getAreaOptions(areaList.provinces);
    const cities = this.getCities(provinces[0].value);
    this.setData({ provinces, cities });
  },

  onAreaPick(e) {
    const { column, index } = e.detail;
    const { provinces } = this.data;

    if (column === 0) {
      const cities = this.getCities(provinces[index].value);
      this.setData({ cities });
    }
  },

  showPicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: true,
    });
    if (mode === 'address') {
      const provinceValue = this.data.personInfo.address[0] || (this.data.provinces[0] && this.data.provinces[0].value);
      const cities = this.getCities(provinceValue);
      this.setData({ cities });
    }
  },

  hidePicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: false,
    });
  },

  onPickerChange(e) {
    const { value, label } = e.detail;
    const { mode } = e.currentTarget.dataset;

    this.setData({
      [`personInfo.${mode}`]: value,
    });
    if (mode === 'address') {
      this.setData({
        addressText: label.join(' '),
      });
    }
  },

  personInfoFieldChange(field, e) {
    const { value } = e.detail;
    this.setData({
      [`personInfo.${field}`]: value,
    });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onGenderChange(e) {
    this.personInfoFieldChange('gender', e);
  },

  onPhoneChange(e) {
    this.personInfoFieldChange('phone', e);
  },

  onIntroductionChange(e) {
    this.personInfoFieldChange('introduction', e);
  },

  onPhotosRemove(e) {
    const { index } = e.detail;
    const { photos } = this.data.personInfo;

    photos.splice(index, 1);
    this.setData({
      'personInfo.photos': photos,
    });
  },

  onPhotosSuccess(e) {
    const { files } = e.detail;
    this.setData({
      'personInfo.photos': files,
    });
  },

  onPhotosDrop(e) {
    const { files } = e.detail;
    this.setData({
      'personInfo.photos': files,
    });
  },

  async onSaveInfo() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.INFO_EDIT) || !this.data.canEdit) {
      wx.showToast({ title: '当前账号没有编辑个人信息权限', icon: 'none' });
      return;
    }
    const { personInfo, addressText } = this.data;
    const name = String(personInfo.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写用户名', icon: 'none' });
      return;
    }
    const phone = String(personInfo.phone || '').trim();
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入 11 位中国大陆手机号', icon: 'none' });
      return;
    }
    if (personInfo.birth && personInfo.birth > this.data.birthEnd) {
      wx.showToast({ title: '生日不能晚于今天', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    let avatarUrl = getPhotoSource(personInfo.photos && personInfo.photos[0]);
    if (isCloudBusinessEnabled() && needsCloudUpload(avatarUrl)) {
      const uploadResult = await uploadCloudFiles([avatarUrl], 'avatars');
      if (!uploadResult.success) {
        this.setData({ isSubmitting: false });
        wx.showToast({ title: uploadResult.error || '头像上传失败，请稍后重试', icon: 'none' });
        return;
      }
      avatarUrl = uploadResult.data[0] || '';
    }
    const res = await DirectoryRepository.saveUser({
      id: profile.id,
      name,
      displayName: name,
      phone,
      gender: Number(personInfo.gender || 0),
      birth: personInfo.birth || '',
      city: addressText,
      introduction: String(personInfo.introduction || '').trim(),
      avatarUrl,
    });
    this.setData({ isSubmitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存个人信息失败', icon: 'none' });
      return;
    }
    AuthService.updateCurrentProfile(res.data);
    wx.showToast({ title: '个人信息已保存', icon: 'success' });
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/my/info-edit/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  async onRefreshAccessState() {
    await AuthService.refreshSession();
    this.getPersonalInfo();
    wx.showToast({ title: '状态已刷新', icon: 'none' });
  },
});
