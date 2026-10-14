const { request, requireStudent, moods } = require('../../utils/api');
Page({
  data: { user: {}, loading: true, error: '', today: '', checkin: null, stats: {}, moodName: '', week: [], welcome: false },
  onShow() {
    const user = requireStudent();
    if (!user) return;
    // First steps for a new student; hidden once dismissed on this phone.
    this.setData({ welcome: wx.getStorageSync('growup.welcome.' + user.id) !== 'done' });
    this.load();
  },
  dismissWelcome() {
    wx.setStorageSync('growup.welcome.' + this.data.user.id, 'done');
    this.setData({ welcome: false });
  },
  guide() { wx.navigateTo({ url: '/pages/article/index?id=guide' }); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  async load() {
    this.setData({ loading: true, error: '', user: wx.getStorageSync('growup.user') });
    try {
      const data = await request('/dashboard');
      const history = data.checkins.slice(-7).map(item => ({ ...item, shortDate: item.date.slice(5), height: item.score * 24, name: moods[item.score - 1].name }));
      this.setData({ ...data, week: history, moodName: data.checkin ? moods[data.checkin.score - 1].name : '' });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  checkin() { wx.navigateTo({ url: '/pages/checkin/index' }); },
  journals() { wx.switchTab({ url: '/pages/journals/index' }); },
  treehole() { wx.switchTab({ url: '/pages/treehole/index' }); },
  explore() { wx.switchTab({ url: '/pages/explore/index' }); },
  read() { wx.navigateTo({ url: '/pages/article/index?id=expression' }); },
  help() { wx.showModal({ title: '你可以向身边的人求助', content: '如果现在很难受，请找一位信任的家长、老师或朋友陪伴你。如果面临即时危险，请联系当地紧急服务。本平台的投稿和申请需要人工处理，无法提供即时救援。', showCancel: false, confirmText: '我知道了', confirmColor: '#245c45' }); }
});
