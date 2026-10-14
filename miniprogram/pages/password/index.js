const { request, saveSession, clearSession } = require('../../utils/api');
Page({
  data: { force: false, current: '', password: '', confirmation: '', submitting: false, error: '' },
  onLoad(options) {
    const user = wx.getStorageSync('growup.user');
    this.setData({ force: options.force === '1' || !!(user && user.mustChangePassword) });
    if (this.data.force && typeof wx.hideHomeButton === 'function') wx.hideHomeButton();
  },
  input(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value, error: '' }); },
  async submit() {
    if (this.data.submitting) return;
    const { current, password, confirmation } = this.data;
    if (password.length < 8) { this.setData({ error: '新密码至少 8 位' }); return; }
    if (password !== confirmation) { this.setData({ error: '两次输入的新密码不一致' }); return; }
    if (password === current) { this.setData({ error: '新密码不能与当前密码相同' }); return; }
    this.setData({ submitting: true, error: '' });
    try {
      const result = await request('/auth/password', 'POST', { currentPassword: current, password });
      saveSession(result);
      this.setData({ current: '', password: '', confirmation: '' });
      wx.showToast({ title: '密码已更新', icon: 'success' });
      if (this.data.force) wx.switchTab({ url: '/pages/home/index' });
      else wx.navigateBack();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ submitting: false }); }
  },
  async logout() {
    await request('/auth/logout', 'POST').catch(() => {});
    clearSession();
    wx.reLaunch({ url: '/pages/login/index' });
  }
});
