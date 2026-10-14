const { request, saveSession, clearSession } = require('../../utils/api');
Page({
  data: {
    regions: [], regionId: 'hainan', mode: 'login', account: '', password: '', name: '', inviteCode: '',
    loading: true, submitting: false, error: '', demo: false
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
      this.setData({ regions: data.regions, demo: health.demo });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  selectRegion(event) { this.setData({ regionId: event.currentTarget.dataset.id, error: '' }); },
  changeMode(event) { this.setData({ mode: event.currentTarget.dataset.mode, error: '' }); },
  input(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  useDemo() { this.setData({ account: 'hainan.student', password: 'Growup123!', regionId: 'hainan', mode: 'login' }); },
  async submit() {
    if (this.data.submitting) return;
    const { mode, regionId, account, password, name, inviteCode } = this.data;
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
      this.setData({ password: '' });
      wx.switchTab({ url: '/pages/home/index' });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ submitting: false }); }
  }
});
