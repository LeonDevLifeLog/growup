const { request, requireStudent, moods } = require('../../utils/api');
const { showTip } = require('../../utils/tips');
Page({
  showTip,
  data: { moods, score: 0, moodName: '', note: '', tags: [], tagOptions: [], loading: true, submitting: false, error: '', saved: false, today: '' },
  async onLoad() { if (requireStudent()) await this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await request('/dashboard');
      const checkin = data.checkin;
      this.setData({ today: data.today, score: checkin ? checkin.score : 0, note: checkin ? checkin.note : '', tags: checkin ? checkin.tags : [], moodName: checkin ? moods[checkin.score - 1].name : '' });
      this.updateTags();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  updateTags() {
    const options = ['学习', '朋友', '家人', '睡眠', '运动', '独处', '小成就', '说不清'];
    this.setData({ tagOptions: options.map(name => ({ name, selected: this.data.tags.includes(name) })) });
  },
  choose(event) {
    if (this.data.submitting) return;
    const score = Number(event.currentTarget.dataset.score);
    this.setData({ score, moodName: moods[score - 1].name, saved: false });
  },
  toggleTag(event) {
    if (this.data.submitting) return;
    const name = event.currentTarget.dataset.name;
    if (!this.data.tags.includes(name) && this.data.tags.length >= 6) {
      wx.showToast({ title: '最多选择 6 个标签', icon: 'none' }); return;
    }
    const tags = this.data.tags.includes(name) ? this.data.tags.filter(tag => tag !== name) : this.data.tags.concat(name);
    this.setData({ tags }); this.updateTags();
  },
  note(event) { this.setData({ note: event.detail.value, saved: false }); },
  async submit() {
    if (this.data.submitting || !this.data.score) return;
    this.setData({ submitting: true, error: '', saved: false });
    try {
      await request('/checkins', 'POST', { score: this.data.score, note: this.data.note, tags: this.data.tags });
      this.setData({ saved: true });
      wx.showToast({ title: '已记下今天的心情', icon: 'success' });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ submitting: false }); }
  },
  back() { wx.switchTab({ url: '/pages/home/index' }); }
});
