App({
  onLaunch() {
    this.globalData.user = wx.getStorageSync('growup.user') || null;
  },
  globalData: { user: null }
});
