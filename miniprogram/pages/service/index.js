const { serviceTypes } = require('../../data/content');
const { request, requireStudent, localTime } = require('../../utils/api');
const { withValues, validate } = require('../../utils/forms');
Page({
  data: { serviceTypes, typeIndex: 0, message: '', requests: [], loading: true, submitting: false, error: '', success: false, tab: 'new', forms: [], form: null, fields: [], answers: {} },
  async onLoad(options) {
    if (!requireStudent()) return;
    let type = '';
    try { type = decodeURIComponent(options.type || ''); } catch (_) { type = ''; }
    this.setData({ typeIndex: Math.max(0, serviceTypes.indexOf(type)) });
    this.formId = options.formId || '';
    if (options.tab === 'records') this.setData({ tab: 'records' });
    await this.load();
  },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const [data, formsData] = await Promise.all([request('/service-requests'), request('/service-forms')]);
      const form = formsData.forms.find(item => item.id === this.formId) || null;
      if (this.formId && !form) throw new Error('没有找到这份调查表，请稍后重新进入');
      this.setData({ forms: formsData.forms, form });
      if (form) this.setData({ fields: withValues(form.profiles[0].fields, this.data.answers) });
      this.setData({ requests: data.requests.map(item => ({ ...item, displayTime: localTime(item.createdAt), handledTime: localTime(item.handledAt), statusText: item.status === 'handled' ? '已跟进' : '待跟进' })) });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  changeTab(event) { this.setData({ tab: event.currentTarget.dataset.tab, error: '' }); },
  type(event) { this.setData({ typeIndex: Number(event.detail.value), success: false }); },
  input(event) { this.setData({ message: event.detail.value, success: false }); },
  chooseForm(event) {
    this.formId = event.currentTarget.dataset.id || '';
    const form = this.data.forms.find(item => item.id === this.formId) || null;
    this.setData({ form, fields: form ? withValues(form.profiles[0].fields, {}) : [], answers: {}, success: false, error: '', tab: 'new' });
  },
  updateField(id, value) {
    const answers = { ...this.data.answers, [id]: value };
    this.setData({ answers, fields: withValues(this.data.form.profiles[0].fields, answers), success: false });
  },
  fieldInput(event) { this.updateField(event.currentTarget.dataset.id, event.detail.value); },
  singleChange(event) {
    const field = this.data.fields.find(item => item.id === event.currentTarget.dataset.id);
    const index = Number(event.detail.value) - 1;
    this.updateField(field.id, index < 0 ? '' : field.options[index].value);
  },
  multiChange(event) {
    const field = this.data.fields.find(item => item.id === event.currentTarget.dataset.id);
    this.updateField(field.id, field.options.filter(option => event.detail.value.includes(option.key)).map(option => option.value));
  },
  async submit() {
    if (this.data.submitting) return;
    let body;
    try {
      if (this.data.form) body = { formId: this.data.form.id, answers: validate(this.data.fields, this.data.answers) };
      else {
        if (!this.data.message.trim()) throw new Error('请写下需要的支持');
        body = { type: serviceTypes[this.data.typeIndex], message: this.data.message.trim() };
      }
    } catch (error) { this.setData({ error: error.message }); return; }
    this.setData({ submitting: true, error: '', success: false });
    try {
      await request('/service-requests', 'POST', body);
      this.setData({ message: '', answers: {}, success: true, tab: 'records' });
      wx.showToast({ title: '已提交', icon: 'success' });
      wx.pageScrollTo({ scrollTop: 0, duration: 200 });
      await this.load();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ submitting: false }); }
  }
});
