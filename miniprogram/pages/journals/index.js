const { request, requireStudent, localTime, moods } = require('../../utils/api');

Page({
  data: {
    tab: 'map', journals: [], visibleJournals: [], checkins: [], loading: true, submitting: false,
    error: '', sheetError: '', success: '', editor: false, title: '', content: '', moodIndex: 0, intensityIndex: 1,
    moodNames: ['暂不记录心情', ...moods.map(item => item.name)], intensityNames: ['轻轻的 · 1', '比较明显 · 2', '很强烈 · 3'],
    tagsText: '', goal: '', query: '', mapNodes: [], mapEdges: [], connections: [], mapStats: {},
    deleting: false, entryMode: 'full', canvasVisible: false, imagePath: '', imageBusy: false
  },
  onShow() { if (requireStudent()) this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const [journalData, checkinData, mapData] = await Promise.all([request('/journals'), request('/checkins'), request('/journals/map')]);
      this.setData({
        journals: journalData.journals.map(item => ({ ...item, tags: item.tags || [], displayTime: localTime(item.createdAt), moodLabel: item.mood ? moods[item.mood - 1].name : '', intensityLabel: item.mood ? ['轻轻的', '比较明显', '很强烈'][(item.intensity || 2) - 1] : '' })),
        checkins: checkinData.checkins.slice().reverse().map(item => ({ ...item, moodName: moods[item.score - 1].name, color: moods[item.score - 1].color }))
      });
      this.filterJournals();
      this.drawMap(mapData);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  drawMap(map) {
    const nodes = map.nodes.slice().sort((a, b) => b.count - a.count).slice(0, 12).map((node, index, all) => {
      const angle = 2 * Math.PI * index / all.length - Math.PI / 2;
      const radius = all.length === 1 ? 0 : (index % 2 ? 175 : 200);
      return { ...node, x: 303 + Math.cos(angle) * radius, y: 235 + Math.sin(angle) * radius };
    });
    const edges = map.edges.flatMap(edge => {
      const source = nodes.find(node => node.id === edge.source);
      const target = nodes.find(node => node.id === edge.target);
      if (!source || !target) return [];
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      return [{ ...edge, key: edge.source + '|' + edge.target, x: source.x + 40, y: source.y + 40, length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) * 180 / Math.PI }];
    });
    const stats = map.stats || {};
    this.setData({ mapNodes: nodes, mapEdges: edges, connections: map.edges.slice().sort((a, b) => b.weight - a.weight).slice(0, 12), imagePath: '', canvasVisible: false, mapStats: { ...stats, moodAverageLabel: stats.moodAverage === null || stats.moodAverage === undefined ? '—' : Number(stats.moodAverage).toFixed(1), moodChangeLabel: stats.moodChange === null || stats.moodChange === undefined ? '样本不足' : (stats.moodChange > 0 ? '+' : '') + Number(stats.moodChange).toFixed(1) } });
  },
  changeTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }); },
  write() { this.setData({ editor: true, sheetError: '', success: '' }); },
  closeEditor() {
    if (this.data.submitting) return;
    const typed = this.data.title.trim() || this.data.content.trim() || this.data.tagsText.trim() || this.data.goal.trim();
    if (!typed) { this.setData({ editor: false, sheetError: '' }); return; }
    wx.showModal({ title: '放弃这篇日记？', content: '刚写下的内容还没有保存，关闭后无法恢复。', confirmText: '放弃', cancelText: '继续写', confirmColor: '#a34b38', success: result => {
      if (result.confirm) this.setData({ editor: false, sheetError: '', title: '', content: '', tagsText: '', goal: '', moodIndex: 0, intensityIndex: 1 });
    } });
  },
  noop() {},
  input(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  moodChange(event) { this.setData({ moodIndex: Number(event.detail.value) }); },
  intensityChange(event) { this.setData({ intensityIndex: Number(event.detail.value) }); },
  entryMode(event) { this.setData({ entryMode: event.currentTarget.dataset.mode }); },
  search(event) { this.setData({ query: event.detail.value }); this.filterJournals(); },
  filterJournals() {
    const query = this.data.query.trim().toLowerCase();
    this.setData({ visibleJournals: this.data.journals.filter(item => !query || [item.title, item.content, item.goal || '', ...(item.tags || [])].join(' ').toLowerCase().includes(query)) });
  },
  selectTag(event) { this.setData({ query: event.currentTarget.dataset.tag, tab: 'journals' }); this.filterJournals(); },
  async submit() {
    if (this.data.submitting) return;
    const tags = [...new Set(this.data.tagsText.split(/[,，、\n]/).map(tag => tag.trim()).filter(Boolean))];
    const content = this.data.entryMode === 'mood' ? '' : this.data.content.trim();
    if (!content && !this.data.moodIndex) { this.setData({ sheetError: '写下一点日常，或选择此刻的心情就可以保存' }); return; }
    if (tags.length > 6 || tags.some(tag => tag.length > 20)) { this.setData({ sheetError: '最多 6 个标签，每个不超过 20 字' }); return; }
    this.setData({ submitting: true, sheetError: '', success: '' });
    try {
      await request('/journals', 'POST', { title: this.data.title.trim(), content, mood: this.data.moodIndex || null, intensity: this.data.intensityIndex + 1, tags, goal: this.data.goal.trim() });
      this.setData({ editor: false, title: '', content: '', tagsText: '', goal: '', moodIndex: 0, intensityIndex: 1, tab: 'map' });
      wx.showToast({ title: '星星已收藏', icon: 'success' });
      await this.load();
    } catch (error) { this.setData({ sheetError: error.message }); }
    finally { this.setData({ submitting: false }); }
  },
  remove(event) {
    if (this.data.deleting) return;
    const id = event.currentTarget.dataset.id;
    wx.showModal({ title: '删除这颗星星？', content: '日记与它的标签关联将删除，无法撤销。心情打卡不受影响。', confirmText: '删除日记', confirmColor: '#a34b38', success: async result => {
      if (!result.confirm) return;
      this.setData({ deleting: true, error: '' });
      try { await request('/journals/' + encodeURIComponent(id), 'DELETE'); wx.showToast({ title: '日记已删除', icon: 'none' }); await this.load(); }
      catch (error) { wx.showToast({ title: error.message, icon: 'none' }); }
      finally { this.setData({ deleting: false }); }
    } });
  },
  async generateImage() {
    if (this.data.imageBusy) return;
    this.setData({ imageBusy: true, canvasVisible: true, imagePath: '', error: '' });
    try {
      await new Promise(resolve => wx.nextTick(resolve));
      const info = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const width = info.windowWidth * 686 / 750;
      const height = info.windowWidth * 780 / 750;
      const context = wx.createCanvasContext('starMapCanvas', this);
      context.scale(width / 686, width / 686);
      context.setFillStyle('#f7f8f2'); context.fillRect(0, 0, 686, 780);
      context.setFillStyle('#245c45'); context.setFontSize(34); context.fillText('我的成长星图', 36, 62);
      context.setFillStyle('#73826a'); context.setFontSize(18); context.fillText('成长健研社 · ' + (this.data.mapStats.total || 0) + ' 篇私人日记', 36, 98);
      context.setFillStyle('#eaf0df'); context.fillRect(20, 132, 646, 580);
      context.setStrokeStyle('#bbcea5'); context.setLineWidth(1.5);
      this.data.mapEdges.forEach(edge => {
        context.beginPath(); context.moveTo(edge.x, edge.y + 142);
        context.lineTo(edge.x + Math.cos(edge.angle * Math.PI / 180) * edge.length, edge.y + 142 + Math.sin(edge.angle * Math.PI / 180) * edge.length); context.stroke();
      });
      this.data.mapNodes.forEach(node => {
        context.beginPath(); context.setFillStyle('#d5e7a7'); context.arc(node.x + 40, node.y + 182, 38, 0, Math.PI * 2); context.fill();
        context.setFillStyle('#365d3c'); context.setTextAlign('center'); context.setFontSize(24); context.fillText(String(node.count), node.x + 40, node.y + 178);
        context.setFontSize(15); context.fillText(node.label.slice(0, 8), node.x + 40, node.y + 201);
      });
      if (!this.data.mapNodes.length) { context.setFillStyle('#72856b'); context.setFontSize(22); context.setTextAlign('center'); context.fillText('给日常加上标签，慢慢点亮自己的星图', 343, 400); }
      context.setTextAlign('left'); context.setFillStyle('#7b8a72'); context.setFontSize(15); context.fillText('连线表示标签在同一篇日记中出现，不表示因果关系。', 34, 742);
      await new Promise(resolve => context.draw(false, resolve));
      const path = await new Promise((resolve, reject) => wx.canvasToTempFilePath({ canvasId: 'starMapCanvas', width, height, destWidth: 1372, destHeight: 1560, fileType: 'png', success: result => resolve(result.tempFilePath), fail: () => reject(new Error('星图图片生成失败，请重试')) }, this));
      this.setData({ imagePath: path });
    } catch (error) { wx.showToast({ title: error.message || '图片生成失败，请重试', icon: 'none' }); }
    finally { this.setData({ imageBusy: false }); }
  },
  saveImage() {
    if (!this.data.imagePath) return;
    wx.saveImageToPhotosAlbum({ filePath: this.data.imagePath, success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }), fail: () => wx.showModal({ title: '未能保存到相册', content: '图片已生成。请在设置中允许保存到相册后重试。', showCancel: false, confirmText: '知道了', confirmColor: '#245c45' }) });
  },
  checkin() { wx.navigateTo({ url: '/pages/checkin/index' }); }
});
