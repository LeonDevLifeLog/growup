const { request, requireStudent, clearSession } = require('../../utils/api');
Page({
  data: { user: {}, initial: '', loading: true, error: '', loggingOut: false },
  onShow() { if (requireStudent()) this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const { user } = await request('/auth/me');
      wx.setStorageSync('growup.user', user);
      getApp().globalData.user = user;
      this.setData({ user, initial: user.name.slice(0, 1) });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  records() { wx.switchTab({ url: '/pages/journals/index' }); },
  service() { wx.navigateTo({ url: '/pages/service/index?tab=records' }); },
  privacy() { wx.navigateTo({ url: '/pages/article/index?id=privacy' }); },
  about() {
    wx.showModal({ title: '关于成长健研社', content: '成长健研社，青少年身心健康成长服务品牌。以成长服务、身心发展、思维表达与数据观测为核心，连接学校与家庭，陪伴青少年成长。记录心情、探索自己、让表达获得回应。', showCancel: false, confirmText: '知道了', confirmColor: '#245c45' });
  },
  help() {
    wx.showModal({ title: '给需要支持的你', content: '如果此刻很难受，可以先找一位信任的家长、老师或朋友陪在身边。面临即时危险，请联系当地紧急服务。树洞和服务申请需要人工处理，不能提供即时救援。', showCancel: false, confirmText: '知道了', confirmColor: '#245c45' });
  },
  logout() {
    if (this.data.loggingOut) return;
    wx.showModal({
      title: '退出成长空间？', content: '你的记录会保留在账号中。切换区域需退出后使用该区域账号重新登录。', confirmText: '退出登录', confirmColor: '#245c45',
      success: async result => {
        if (!result.confirm) return;
        this.setData({ loggingOut: true, error: '' });
        try {
          await request('/auth/logout', 'POST');
          clearSession();
          wx.reLaunch({ url: '/pages/login/index' });
        } catch (error) { this.setData({ error: error.message }); }
        finally { this.setData({ loggingOut: false }); }
      }
    });
  }
});
