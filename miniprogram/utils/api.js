const { apiBase } = require('../config');

function clearSession() {
  wx.removeStorageSync('growup.token');
  wx.removeStorageSync('growup.user');
  getApp().globalData.user = null;
}

function saveSession(result) {
  wx.setStorageSync('growup.token', result.token);
  wx.setStorageSync('growup.user', result.user);
  getApp().globalData.user = result.user;
}

function requireStudent() {
  const user = wx.getStorageSync('growup.user');
  if (!wx.getStorageSync('growup.token') || !user || user.role !== 'student') {
    wx.reLaunch({ url: '/pages/login/index' });
    return null;
  }
  // Passwords set by a teacher must be replaced before using anything else.
  if (user.mustChangePassword) {
    wx.reLaunch({ url: '/pages/password/index?force=1' });
    return null;
  }
  return user;
}

function request(path, method = 'GET', data) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('growup.token');
    wx.request({
      url: apiBase + path,
      method,
      data,
      timeout: 15000,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401 && path !== '/auth/login' && path !== '/auth/register') {
          clearSession();
          wx.reLaunch({ url: '/pages/login/index' });
        }
        reject(new Error((res.data && res.data.error) || '暂时无法完成，请稍后重试'));
      },
      fail() { reject(new Error('连接失败，请检查网络与服务地址后重试')); }
    });
  });
}

function localTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  // 记录统一按上海时区呈现，不依赖手机所在时区。
  const shifted = new Date(date.getTime() + 8 * 3600000);
  return shifted.toISOString().slice(0, 16).replace('T', ' ');
}

const moods = [
  { score: 1, face: '◡', name: '很低落', color: '#b9c6db' },
  { score: 2, face: '﹏', name: '有点低落', color: '#cdd4df' },
  { score: 3, face: '﹀', name: '还不错', color: '#d5e7a7' },
  { score: 4, face: '⌣', name: '很开心', color: '#e6d78f' },
  { score: 5, face: '◡', name: '超开心', color: '#edc887' }
];

module.exports = { request, requireStudent, saveSession, clearSession, localTime, moods };
