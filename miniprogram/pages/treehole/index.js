const { request, requireStudent, localTime } = require('../../utils/api');
const topics = ['成长烦恼', '校园日常', '家庭关系', '小小确幸'];
const statuses = { pending: '等待审核', approved: '已公开', rejected: '未通过审核', reported: '等待复核' };
Page({
  data: {
    user: {}, topics, filters: ['全部', ...topics], topic: '全部', mine: false, posts: [], loading: true,
    error: '', sheet: '', selectedPost: null, nickname: '一棵小树', topicIndex: 0, content: '',
    submitting: false, sheetError: '', actionBusy: false
  },
  onShow() {
    const user = requireStudent();
    if (user) { this.setData({ user }); this.load(); }
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  async load() {
    const sequence = (this.sequence || 0) + 1;
    this.sequence = sequence;
    this.setData({ loading: true, error: '' });
    try {
      const query = '?topic=' + encodeURIComponent(this.data.topic === '全部' ? 'all' : this.data.topic) + (this.data.mine ? '&mine=1' : '');
      const data = await request('/posts' + query);
      if (sequence !== this.sequence) return;
      this.setData({ posts: data.posts.map(post => ({ ...post, displayTime: localTime(post.createdAt), statusText: statuses[post.status] || '等待复核', replies: (post.replies || []).map(reply => ({ ...reply, displayTime: localTime(reply.createdAt) })) })) });
    } catch (error) { if (sequence === this.sequence) this.setData({ error: error.message }); }
    finally { if (sequence === this.sequence) this.setData({ loading: false }); }
  },
  filter(event) { this.setData({ topic: event.currentTarget.dataset.topic }); this.load(); },
  setMine(event) { this.setData({ mine: event.currentTarget.dataset.mine === 'yes' }); this.load(); },
  compose() { this.setData({ sheet: 'post', sheetError: '', selectedPost: null, content: '' }); },
  reply(event) {
    const selectedPost = this.data.posts.find(post => post.id === event.currentTarget.dataset.id);
    if (selectedPost) this.setData({ sheet: 'reply', selectedPost, content: '', sheetError: '' });
  },
  closeSheet() {
    if (this.data.submitting) return;
    if (!this.data.content.trim()) { this.setData({ sheet: '', sheetError: '' }); return; }
    wx.showModal({ title: '放弃这段内容？', content: '刚写下的文字还没有提交，关闭后无法恢复。', confirmText: '放弃', cancelText: '继续写', confirmColor: '#a34b38', success: result => {
      if (result.confirm) this.setData({ sheet: '', sheetError: '', content: '' });
    } });
  },
  noop() {},
  input(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  chooseTopic(event) { this.setData({ topicIndex: Number(event.detail.value) }); },
  async submit() {
    if (this.data.submitting || !this.data.nickname.trim() || !this.data.content.trim()) return;
    this.setData({ submitting: true, sheetError: '' });
    try {
      if (this.data.sheet === 'post') {
        await request('/posts', 'POST', { nickname: this.data.nickname.trim(), topic: topics[this.data.topicIndex], content: this.data.content.trim() });
        this.setData({ mine: true, topic: '全部' });
      } else {
        await request('/posts/' + this.data.selectedPost.id + '/replies', 'POST', { nickname: this.data.nickname.trim(), content: this.data.content.trim() });
      }
      this.setData({ sheet: '', content: '' });
      wx.showToast({ title: '已提交，等待审核', icon: 'none' });
      await this.load();
    } catch (error) { this.setData({ sheetError: error.message }); }
    finally { this.setData({ submitting: false }); }
  },
  async warm(event) {
    if (this.data.actionBusy) return;
    const id = event.currentTarget.dataset.id;
    this.setData({ actionBusy: true });
    try {
      const result = await request('/posts/' + id + '/warm', 'POST', {});
      this.setData({ posts: this.data.posts.map(post => post.id === id ? { ...post, warmCount: result.warmCount, warmed: true } : post) });
      wx.showToast({ title: '送出一份温暖', icon: 'none' });
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }); }
    finally { this.setData({ actionBusy: false }); }
  },
  report(event) {
    if (this.data.actionBusy) return;
    const id = event.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['泄露个人信息', '不友善或伤害性内容', '广告或其他不适宜内容'],
      success: async result => {
        this.setData({ actionBusy: true });
        try {
          await request('/posts/' + id + '/report', 'POST', { reason: ['泄露个人信息', '不友善或伤害性内容', '广告或其他不适宜内容'][result.tapIndex] });
          wx.showToast({ title: '纸条已隐藏，等待复核', icon: 'none' });
          await this.load();
        } catch (error) { wx.showToast({ title: error.message, icon: 'none' }); }
        finally { this.setData({ actionBusy: false }); }
      }
    });
  }
});
