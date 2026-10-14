// 用 Node 执行原生页面事件并连接独立临时 API；不替代微信运行或真机交互。
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';

const miniRoot = dirname(fileURLToPath(import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'growup-mini-api-'));
const server = createApp({ dbPath: join(temporary, 'test.sqlite'), demo: true });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port + '/api';
const storage = new Map();
const app = { globalData: {} };
const notices = [];
const pendingModals = [];
const modalTitles = [];
let holdReports = false;
const delayedReports = [];
const wx = {
  env: { USER_DATA_PATH: temporary },
  getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    let delayed;
    if (holdReports && /\/tools\/[^/]+\/report\?/.test(options.url)) {
      let ready;
      delayed = { url: options.url, ready: new Promise(resolve => { ready = resolve; }), markReady: () => ready() };
      delayedReports.push(delayed);
    }
    fetch(options.url, { method: options.method, headers: options.header, ...(options.data === undefined ? {} : { body: JSON.stringify(options.data) }) })
      .then(async result => {
        const response = { statusCode: result.status, data: await result.json() };
        if (delayed) {
          delayed.release = () => options.success(response);
          delayed.reject = () => options.success({ statusCode: 503, data: { error: '模拟过期报告失败' } });
          delayed.markReady();
        } else options.success(response);
      }).catch(options.fail);
  },
  setNavigationBarTitle() {}, showToast(result) { notices.push(result.title); },
  showModal(options) {
    modalTitles.push(options.title);
    const operation = options.success && options.success({ confirm: true });
    if (operation) pendingModals.push(Promise.resolve(operation));
  },
  reLaunch() {}, switchTab() {}, navigateTo() {}, stopPullDownRefresh() {}, pageScrollTo() {}
};
const cache = new Map();
function load(file) {
  file = resolve(file);
  if (file === join(miniRoot, 'config.js')) return { apiBase: base };
  if (cache.has(file)) return cache.get(file);
  assert.ok(existsSync(file), file);
  const module = { exports: {} };
  let definition;
  const context = {
    module, exports: module.exports, wx, getApp: () => app,
    Page: value => { definition = value; },
    require: path => load(resolve(dirname(file), path + (path.endsWith('.js') ? '' : '.js')))
  };
  new vm.Script(readFileSync(file, 'utf8'), { filename: file }).runInNewContext(context);
  const value = definition || module.exports;
  cache.set(file, value);
  return value;
}
function page(name) {
  const definition = load(join(miniRoot, 'pages', name, 'index.js'));
  const instance = { ...definition, data: structuredClone(definition.data), setData(values) { Object.assign(this.data, values); } };
  return instance;
}
function requiredAnswers(fields, today) {
  return Object.fromEntries(fields.map(field => {
    let value;
    if (field.type === 'single') value = field.options[0].value;
    else if (field.type === 'multi') value = [field.options[0].value];
    else if (field.type === 'number') value = field.min === undefined ? 1 : field.min;
    else if (field.type === 'date') value = today;
    else if (field.type === 'time') value = '08:00';
    else value = '原生页面接口联调记录';
    return [field.id, value];
  }));
}
try {
  const api = load(join(miniRoot, 'utils/api.js'));
  const session = await api.request('/auth/login', 'POST', { regionId: 'hainan', account: 'hainan.student', password: 'Growup123!' });
  api.saveSession(session);
  const toolPage = page('tool');
  await toolPage.onLoad({ id: '4c1' });
  assert.equal(toolPage.data.error, '', '工具目录加载错误');
  assert.ok(toolPage.data.tools.length >= 18);
  const racePage = page('tool');
  await racePage.onLoad({ id: '4c1' });
  holdReports = true;
  const october = racePage.monthChange({ detail: { value: '2026-10' } });
  const september = racePage.monthChange({ detail: { value: '2026-09' } });
  assert.equal(delayedReports.length, 2, '旧请求加载时仍应发起新月份请求');
  await Promise.all(delayedReports.map(item => item.ready));
  delayedReports[1].release(); await september;
  assert.equal(racePage.data.month, '2026-09');
  assert.ok(racePage.data.report.title.includes('2026-09'));
  delayedReports[0].release(); await october;
  assert.ok(racePage.data.report.title.includes('2026-09'), '晚到10月报告不能覆盖可见9月');
  assert.equal(racePage.data.reportLoading, false);
  delayedReports.length = 0;
  const staleFailure = racePage.monthChange({ detail: { value: '2026-10' } });
  const currentSuccess = racePage.monthChange({ detail: { value: '2026-09' } });
  await Promise.all(delayedReports.map(item => item.ready));
  delayedReports[0].reject(); await staleFailure;
  assert.equal(racePage.data.error, '', '旧月份失败不应污染当前错误');
  assert.equal(racePage.data.reportLoading, true, '旧请求结束不应清除新请求加载状态');
  delayedReports[1].release(); await currentSuccess;
  assert.ok(racePage.data.report.title.includes('2026-09'));
  delayedReports.length = 0;
  const oldToolReport = racePage.monthChange({ detail: { value: '2026-10' } });
  const qcdIndex = racePage.data.tools.findIndex(tool => tool.id === 'qcd');
  await racePage.toolChange({ detail: { value: String(qcdIndex) } });
  assert.equal(racePage.data.report, null, '切换工具需清空旧报告');
  assert.equal(racePage.data.reportLoading, false);
  const newToolReport = racePage.monthChange({ detail: { value: '2026-09' } });
  await Promise.all(delayedReports.map(item => item.ready));
  delayedReports[1].release(); await newToolReport;
  const currentTitle = racePage.data.report.title;
  assert.ok(currentTitle.includes(racePage.data.tool.name) && currentTitle.includes('2026-09'));
  delayedReports[0].release(); await oldToolReport;
  assert.equal(racePage.data.report.title, currentTitle, '旧工具报告不能写入新工具');
  holdReports = false;
  delayedReports.length = 0;
  const qcd = racePage.data.tool;
  qcd.profiles.forEach((profile, index) => {
    racePage.profileChange({ detail: { value: String(index) } });
    assert.equal(racePage.data.profileDescription, profile.description);
    assert.ok(racePage.data.profileDescription.includes('家长和孩子'));
    profile.fields.filter(field => field.help).forEach(field => assert.equal(racePage.data.fields.find(item => item.id === field.id).help, field.help));
  });
  await racePage.selectTool(racePage.data.tools.find(tool => tool.id === 'suipian'));
  racePage.data.tool.profiles.forEach((profile, index) => {
    racePage.profileChange({ detail: { value: String(index) } });
    assert.equal(racePage.data.profileDescription, profile.description);
    assert.ok(racePage.data.profileDescription.includes('题'));
  });
  const toolTemplate = readFileSync(join(miniRoot, 'pages/tool/index.wxml'), 'utf8');
  ['{{profileDescription}}', '{{item.help}}', '{{item.description}}'].forEach(binding => assert.ok(toolTemplate.includes(binding), '原生模板缺少说明绑定 ' + binding));
  let profiles = 0;
  for (const tool of toolPage.data.tools) {
    await toolPage.selectTool(tool);
    for (let profileIndex = 0; profileIndex < tool.profiles.length; profileIndex++) {
      toolPage.profileChange({ detail: { value: String(profileIndex) } });
      toolPage.setData({ answers: requiredAnswers(tool.profiles[profileIndex].fields, toolPage.data.today) });
      await toolPage.save();
      assert.equal(toolPage.data.error, '', tool.id + '/' + tool.profiles[profileIndex].id + ' 保存错误：' + toolPage.data.error);
      assert.ok(toolPage.data.records.length > 0);
      if (tool.mode === 'questionnaire') assert.ok(toolPage.data.result, tool.id + ' 缺少本人结果');
      profiles++;
    }
    if (tool.mode === 'tracker') {
      const existing = toolPage.data.records[0];
      const count = toolPage.data.records.length;
      toolPage.editRecord({ currentTarget: { dataset: { id: existing.id } } });
      assert.equal(toolPage.data.date, existing.date);
      assert.equal(toolPage.data.tool.profiles[toolPage.data.profileIndex].id, existing.profileId);
      assert.equal(JSON.stringify(toolPage.data.answers), JSON.stringify(existing.answers));
      await toolPage.save();
      assert.equal(toolPage.data.error, '');
      assert.equal(toolPage.data.records.length, count, tool.id + ' 修订不应增加记录数');
      assert.ok(toolPage.data.records.some(record => record.id === existing.id), tool.id + ' 修订应保留原ID');
    }
    await toolPage.loadReport();
    assert.equal(toolPage.data.error, '', tool.id + ' 月报错误');
    assert.ok(toolPage.data.report && toolPage.data.report.title);
    const id = toolPage.data.records[0].id;
    await toolPage.remove({ currentTarget: { dataset: { id } } });
    await Promise.all(pendingModals.splice(0));
    assert.equal(toolPage.data.error, '', tool.id + ' 删除错误');
    assert.ok(!toolPage.data.records.some(record => record.id === id));
  }
  await toolPage.selectTool(toolPage.data.tools[0]);
  toolPage.setData({ answers: requiredAnswers(toolPage.data.fields, toolPage.data.today) });
  await toolPage.save();
  assert.equal(toolPage.exportRecords, undefined);
  const toolCount=toolPage.data.records.length;
  await toolPage.loadRecords();
  assert.equal(toolPage.data.records.length,toolCount,'系统保存的工具记录刷新后保留');
  const journals = page('journals');
  await journals.load();
  journals.setData({ title: '原生日记接口验证', content: '只属于本人的成长日常', moodIndex: 4, intensityIndex: 2, tagsText: '成长,朋友', goal: '明天和朋友说声谢谢' });
  await journals.submit();
  assert.equal(journals.data.error, '');
  const entry = journals.data.journals.find(item => item.title === '原生日记接口验证');
  assert.ok(entry && entry.mood === 4 && entry.goal);
  assert.ok(journals.data.mapNodes.some(node => node.id === '朋友'));
  journals.search({ detail: { value: '明天和朋友' } });
  assert.equal(journals.data.visibleJournals.length, 1);
  assert.equal(journals.exportJournals,undefined);
  await journals.load();
  assert.ok(journals.data.journals.some(item=>item.id===entry.id),'日记在系统中刷新后保留');
  await journals.remove({currentTarget:{dataset:{id:entry.id}}});
  await Promise.all(pendingModals.splice(0));
  assert.ok(!journals.data.journals.some(item=>item.id===entry.id));
  journals.write();
  assert.equal(journals.data.editor, true, '写日记在底部弹层中打开');
  journals.closeEditor();
  assert.equal(journals.data.editor, false, '未填写时直接关闭弹层');
  journals.write();
  journals.input({ currentTarget: { dataset: { field: 'content' } }, detail: { value: '还没写完' } });
  modalTitles.length = 0;
  journals.closeEditor();
  assert.deepEqual(modalTitles, ['放弃这篇日记？'], '已填写内容关闭前先确认');
  assert.equal(journals.data.editor, false);
  assert.equal(journals.data.content, '', '确认放弃后清空草稿');
  journals.setData({ title: '', content: '', entryMode: 'mood', moodIndex: 3, tagsText: '', goal: '' });
  await journals.submit();
  assert.equal(journals.data.error, '', '仅心情模式应允许没有正文和标题');
  assert.ok(journals.data.journals.some(item => item.content === '' && item.mood === 3));
  const service = page('service');
  await service.onLoad({ formId: 'r21' });
  assert.equal(service.data.error, '');
  assert.equal(service.data.forms.length, 4);
  for (const form of service.data.forms) {
    service.chooseForm({ currentTarget: { dataset: { id: form.id } } });
    service.setData({ answers: requiredAnswers(form.profiles[0].fields, toolPage.data.today) });
    await service.submit();
    assert.equal(service.data.error, '', form.id + ' 提交错误：' + service.data.error);
    assert.ok(service.data.success);
    assert.equal(service.data.tab, 'records', '提交后切换到我的申请查看状态');
  }
  assert.equal(service.data.requests.length, service.data.forms.length);
  const adminLogin = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: 'hainan.admin', password: 'Growup123!', regionId: 'hainan' }) }).then(r => r.json());
  const pendingId = service.data.requests[0].id;
  const handled = await fetch(base + '/admin/service-requests/' + pendingId, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + adminLogin.token }, body: JSON.stringify({ status: 'handled', reply: '已安排老师本周联系你。' }) });
  assert.equal(handled.status, 200);
  const records = page('service');
  await records.onLoad({ tab: 'records' });
  assert.equal(records.data.tab, 'records', '从“我的”进入时直接显示申请状态');
  const answered = records.data.requests.find(item => item.id === pendingId);
  assert.equal(answered.statusText, '已跟进');
  assert.equal(answered.reply, '已安排老师本周联系你。', '学生在小程序看到工作人员回复');
  const guide = page('article');
  await guide.onLoad({ id: 'guide' });
  assert.equal(guide.data.article.title, '学生使用指南', '“我的 → 使用帮助”打开学生指南');
  modalTitles.length = 0;
  page('treehole').showTip({ currentTarget: { dataset: { tip: 'treehole' } } });
  assert.deepEqual(modalTitles, ['树洞说明'], '圆圈问号打开对应提示');
  const home = page('home');
  home.onShow();
  assert.equal(home.data.welcome, true, '首页为新学生显示“从这里开始”');
  home.dismissWelcome();
  home.onShow();
  assert.equal(home.data.welcome, false, '点“知道了”后不再显示');
  await home.load();
  await toolPage.selectTool(toolPage.data.tools[0]);
  modalTitles.length = 0;
  await toolPage.profileChange({ detail: { value: '0' } });
  assert.deepEqual(modalTitles, [], '未填写时切换版本不打扰');
  const firstField = toolPage.data.fields[0];
  toolPage.updateField(firstField.id, firstField.type === 'multi' ? [] : '1');
  toolPage.profileChange({ detail: { value: '0' } });
  assert.deepEqual(modalTitles, ['切换后将清空填写'], '已填写时切换版本先确认');
  console.log(`原生页面事件到临时 API 联调通过：${toolPage.data.tools.length} 工具/${profiles} 个版本保存与月报、tracker回填修订保留ID/数量、历史删除与刷新持久化、日记心情/标签/目标、搜索与星图、仅心情保存、4份结构化服务表单及提交后查看状态与工作人员回复、日记底部弹层与放弃确认、工具切换前确认、使用帮助、首页新手指引与问号提示；无JSON转移入口。`);
  console.log('范围：Node内执行真实Page事件和隔离API，不代替微信运行或真机。');
  console.log('报告竞态：真实HTTP响应延迟乱序下，10月晚于9月返回、旧请求失败、切工具三种场景均保持当前报告与加载状态；qcd全部亲子版本指导/题目提示及suipian全部版本说明保留。');
} finally {
  await new Promise(resolve => server.close(resolve));
  rmSync(temporary, { recursive: true, force: true });
}
