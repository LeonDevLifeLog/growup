const { modules } = require('../../data/content');
const { requireStudent } = require('../../utils/api');
Page({
  data: { categories: ['全部', '成长支持', '核心理念', '成长共研室', '了解更多'], category: '全部', modules },
  onShow() { requireStudent(); },
  filter(event) {
    const category = event.currentTarget.dataset.category;
    this.setData({ category, modules: category === '全部' ? modules : modules.filter(item => item.category === category) });
  },
  open(event) { wx.navigateTo({ url: '/pages/article/index?id=' + event.currentTarget.dataset.id }); }
});
