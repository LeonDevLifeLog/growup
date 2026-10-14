const { modules } = require('../../data/content');
const { request, requireStudent } = require('../../utils/api');
Page({
  data: { article: null, groups: [], loading: false, error: '' },
  async onLoad(options) {
    if (!requireStudent()) return;
    const article = modules.find(item => item.id === options.id);
    if (!article) return;
    this.setData({ article: { ...article, links: article.links || [] } });
    wx.setNavigationBarTitle({ title: article.title });
    if (article.tools) await this.loadTools();
  },
  async loadTools() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await request('/tools');
      const tools = data.tools.filter(tool => tool.id !== 'suipian');
      const names = [...new Set(tools.map(tool => tool.group))];
      this.setData({ groups: names.map(name => ({ name, tools: tools.filter(tool => tool.group === name) })) });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  tool(event) { wx.navigateTo({ url: '/pages/tool/index?id=' + event.currentTarget.dataset.id }); },
  form(event) { wx.navigateTo({ url: '/pages/service/index?formId=' + event.currentTarget.dataset.id }); },
  research() { wx.navigateTo({ url: '/pages/tool/index?id=' + this.data.article.toolId }); },
  journals() { wx.switchTab({ url: '/pages/journals/index' }); },
  service() { wx.navigateTo({ url: '/pages/service/index?type=' + encodeURIComponent(this.data.article.service) }); }
});
