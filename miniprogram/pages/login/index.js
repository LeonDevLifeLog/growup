const { request, saveSession, clearSession } = require('../../utils/api');
Page({
  data: {
    regions: [], regionId: '', mode: 'login', account: '', password: '', name: '', inviteCode: '',
    loading: true, submitting: false, error: '', demo: false, invitation: null, checking: false, confirmPassword: ''
  },
  async onLoad() {
    const storedUser = wx.getStorageSync('growup.user');
    if (wx.getStorageSync('growup.token') && storedUser && storedUser.role === 'student') {
      wx.switchTab({ url: '/pages/home/index' });
      return;
    }
    await this.load();
  },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const [data, health] = await Promise.all([request('/regions'), request('/health')]);
      const regionId = data.regions.some(item => item.id === this.data.regionId) ? this.data.regionId : (data.regions[0] ? data.regions[0].id : '');
      this.setData({ regions: data.regions, regionId, invitation: null, demo: health.demo });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  selectRegion(event) { if (!this.data.submitting && !this.data.checking) this.setData({ regionId: event.currentTarget.dataset.id, invitation: null, error: '' }); },
  changeMode(event) { if (!this.data.submitting && !this.data.checking) this.setData({ mode: event.currentTarget.dataset.mode, error: '' }); },
  input(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value, ...(field === 'inviteCode' ? { invitation: null } : {}) });
  },
  async checkInvite() {
    if (this.data.checking || this.data.submitting) return;
    this.setData({ checking: true, invitation: null, error: '' });
    try {
      const result = await request('/auth/invite', 'POST', { regionId: this.data.regionId, inviteCode: this.data.inviteCode.trim() });
      this.setData({ invitation: result.invitation });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ checking: false }); }
  },
  useDemo() { this.setData({ account: 'hainan.student', password: 'Growup123!', regionId: 'hainan', mode: 'login' }); },
  async submit() {
    if (this.data.submitting || this.data.checking) return;
    const { mode, regionId, account, password, name, inviteCode } = this.data;
    if (mode === 'register' && !this.data.invitation) { this.setData({ error: '请先核对学校邀请码' }); return; }
    if (mode === 'register' && password !== this.data.confirmPassword) { this.setData({ error: '两次输入的密码不一致' }); return; }
    if (!account.trim() || !password || (mode === 'register' && (!name.trim() || !inviteCode.trim()))) {
      this.setData({ error: '请完整填写账号信息' }); return;
    }
    this.setData({ submitting: true, error: '' });
    try {
      const result = await request('/auth/' + mode, 'POST', { regionId, account: account.trim(), password, name: name.trim(), inviteCode: inviteCode.trim() });
      if (result.user.role !== 'student') {
        // 管理员使用网页后台。撤销刚创建的会话，避免闲置令牌。
        saveSession(result);
        await request('/auth/logout', 'POST').catch(() => {});
        clearSession();
        throw new Error('此处是学生入口，请使用网页管理后台登录管理员账号');
      }
      saveSession(result);
      this.setData({ password: '', confirmPassword: '' });
      wx.switchTab({ url: '/pages/home/index' });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ submitting: false }); }
  }
});
