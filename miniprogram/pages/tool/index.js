const { request, requireStudent, localTime } = require('../../utils/api');
const { withValues, validate, reportView } = require('../../utils/forms');

Page({
  data: {
    tool: null, tools: [], toolIndex: 0, profileIndex: 0, profileNames: [], profileDescription: '', fields: [], answers: {},
    today: '', date: '', month: '', tab: 'entry', loading: true, saving: false, deleting: false,
    records: [], report: null, result: null, error: '', success: '', reportLoading: false
  },
  async onLoad(options) {
    if (!requireStudent()) return;
    this.requestedId = options.id || '';
    await this.load();
  },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const [{ tools }, dashboard] = await Promise.all([request('/tools'), request('/dashboard')]);
      const toolIndex = Math.max(0, tools.findIndex(tool => tool.id === this.requestedId));
      this.setData({ tools, toolIndex, today: dashboard.today, date: dashboard.today, month: dashboard.today.slice(0, 7) });
      await this.selectTool(tools[toolIndex]);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  async selectTool(tool) {
    if (!tool) throw new Error('暂时没有可用的成长观察工具');
    this.requestedId = tool.id;
    this.invalidateReport();
    this.setData({ tool, profileIndex: 0, profileNames: tool.profiles.map(profile => profile.name), profileDescription: tool.profiles[0].description || '', answers: {}, result: null, error: '', success: '', fields: withValues(tool.profiles[0].fields, {}), tab: 'entry' });
    wx.setNavigationBarTitle({ title: tool.name });
    await this.loadRecords();
  },
  async toolChange(event) {
    if (this.data.saving || this.data.deleting) return;
    const toolIndex = Number(event.detail.value);
    this.setData({ toolIndex, loading: true, error: '' });
    try { await this.selectTool(this.data.tools[toolIndex]); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  profileChange(event) {
    const profileIndex = Number(event.detail.value);
    this.setData({ profileIndex, profileDescription: this.data.tool.profiles[profileIndex].description || '', answers: {}, fields: withValues(this.data.tool.profiles[profileIndex].fields, {}), error: '', success: '', result: null });
  },
  updateField(id, value) {
    const answers = { ...this.data.answers, [id]: value };
    this.setData({ answers, fields: withValues(this.data.tool.profiles[this.data.profileIndex].fields, answers), success: '' });
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
  dateChange(event) { this.setData({ date: event.detail.value }); },
  monthChange(event) { this.setData({ month: event.detail.value, report: null }); return this.loadReport(); },
  changeTab(event) {
    this.setData({ tab: event.currentTarget.dataset.tab, error: '' });
    if (this.data.tab === 'report' && !this.data.report) return this.loadReport();
  },
  async loadRecords() {
    const { records } = await request('/tools/' + encodeURIComponent(this.data.tool.id) + '/records');
    this.setData({ records: records.map(record => {
      const profile = this.data.tool.profiles.find(item => item.id === record.profileId);
      return { ...record, profileName: profile ? profile.name : record.profileId, displayTime: localTime(record.createdAt), entries: Object.entries(record.answers).map(([id, value]) => {
        const field = profile && profile.fields.find(item => item.id === id);
        const values = Array.isArray(value) ? value : [value];
        const labels = values.map(item => {
          const option = field && (field.options || []).find(option => String(option.value) === String(item));
          return option ? option.label : String(item);
        });
        return { id, label: field ? field.label : id, value: labels.join('、') + (field && field.unit ? ' ' + field.unit : '') };
      }), expanded: false };
    }) });
  },
  async save() {
    if (this.data.saving) return;
    this.setData({ error: '', success: '' });
    let answers;
    try { answers = validate(this.data.fields, this.data.answers); }
    catch (error) { this.setData({ error: error.message }); return; }
    this.setData({ saving: true });
    try {
      const { record } = await request('/tools/' + encodeURIComponent(this.data.tool.id) + '/records', 'POST', { profileId: this.data.tool.profiles[this.data.profileIndex].id, date: this.data.date, answers });
      this.invalidateReport();
      this.setData({ success: this.data.tool.mode === 'questionnaire' ? '已保存你的回答与本次结果。' : '成长观察已保存，可以在历史中回顾。', result: reportView(record.result, '本次成长现状回顾') });
      await this.loadRecords();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ saving: false }); }
  },
  expandRecord(event) {
    this.setData({ records: this.data.records.map(record => record.id === event.currentTarget.dataset.id ? { ...record, expanded: !record.expanded } : record) });
  },
  editRecord(event) {
    if (this.data.saving || this.data.tool.mode !== 'tracker') return;
    const record = this.data.records.find(item => item.id === event.currentTarget.dataset.id);
    if (!record) return;
    const profileIndex = this.data.tool.profiles.findIndex(profile => profile.id === record.profileId);
    if (profileIndex < 0) return;
    const answers = { ...record.answers };
    this.setData({ tab: 'entry', profileIndex, profileDescription: this.data.tool.profiles[profileIndex].description || '', date: record.date, answers, fields: withValues(this.data.tool.profiles[profileIndex].fields, answers), result: null, error: '', success: '正在修订 ' + record.date + ' 的「' + record.profileName + '」。保留日期和版本保存，会更新同一条记录。' });
  },
  viewResult(event) {
    const record = this.data.records.find(item => item.id === event.currentTarget.dataset.id);
    this.setData({ result: reportView(record.result, '这次成长现状回顾'), tab: 'entry' });
  },
  remove(event) {
    if (this.data.deleting) return;
    const id = event.currentTarget.dataset.id;
    wx.showModal({ title: '删除这次记录？', content: '删除后，该记录将不再参与月度回顾。此操作无法撤销。', confirmText: '删除记录', confirmColor: '#a34b38', success: async result => {
      if (!result.confirm) return;
      this.setData({ deleting: true, error: '' });
      try {
        await request('/tools/' + encodeURIComponent(this.data.tool.id) + '/records/' + encodeURIComponent(id), 'DELETE');
        this.invalidateReport();
        this.setData({ result: null });
        await this.loadRecords();
      } catch (error) { this.setData({ error: error.message }); }
      finally { this.setData({ deleting: false }); }
    } });
  },
  invalidateReport() {
    this.reportRequestId = (this.reportRequestId || 0) + 1;
    this.setData({ report: null, reportLoading: false });
  },
  onUnload() { this.reportRequestId = (this.reportRequestId || 0) + 1; },
  async loadReport() {
    if (!this.data.tool) return;
    const toolId = this.data.tool.id;
    const month = this.data.month;
    const requestId = (this.reportRequestId || 0) + 1;
    this.reportRequestId = requestId;
    const isCurrent = () => this.reportRequestId === requestId && this.data.tool.id === toolId && this.data.month === month;
    this.setData({ reportLoading: true, error: '' });
    try {
      const { report } = await request('/tools/' + encodeURIComponent(toolId) + '/report?month=' + month);
      if (isCurrent()) this.setData({ report: reportView(report, '我的月度成长回顾') });
    } catch (error) { if (isCurrent()) this.setData({ error: error.message }); }
    finally { if (isCurrent()) this.setData({ reportLoading: false }); }
  }
});
