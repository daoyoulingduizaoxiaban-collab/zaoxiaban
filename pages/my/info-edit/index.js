import { areaList } from './areaData.js';
import { AuthService } from '~/services/auth/authService';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    personInfo: {
      name: '',
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
    birthEnd: '2025-03-01',
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
    disabledReason: '请先登录后编辑个人信息',
  },

  onLoad() {
    this.initAreaData();
    this.getPersonalInfo();
  },

  getPersonalInfo() {
    const profile = AuthService.getCurrentProfile();
    if (!profile) {
      this.setData({
        canEdit: false,
        disabledReason: '请先登录后编辑个人信息',
      });
      return;
    }
    const cityEntry = Object.entries(areaList.cities).find(([, label]) => label === profile.city);
    const address = cityEntry ? [cityEntry[0].slice(0, 2).padEnd(6, '0'), cityEntry[0]] : [];
    this.setData({
      canEdit: true,
      disabledReason: '',
      personInfo: {
        ...this.data.personInfo,
        name: profile.displayName || '',
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

    // 更改省份则更新城市列表
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
      const cities = this.getCities(this.data.personInfo.address[0]);
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
    if (!profile || !this.data.canEdit) {
      wx.showToast({ title: '请先登录后编辑个人信息', icon: 'none' });
      return;
    }
    const { personInfo, addressText } = this.data;
    const name = String(personInfo.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写用户名', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    const res = await DirectoryRepository.saveUser({
      id: profile.id,
      name,
      displayName: name,
      city: addressText,
      introduction: String(personInfo.introduction || '').trim(),
      avatarUrl: personInfo.photos && personInfo.photos[0] ? (personInfo.photos[0].url || personInfo.photos[0].path || '') : '',
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
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
