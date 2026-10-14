// 用 Node 执行原生页面事件并连接独立临时 API；不替代微信运行或真机交互。
import { readFileSync, writeFileSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
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
let exportedFile = '';
let importCalls = [];
let failImportAt = 0;
let holdReports = false;
const delayedReports = [];
const wx = {
  env: { USER_DATA_PATH: temporary },
  getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    if (options.method === 'POST' && options.url.endsWith('/journals/import')) {
      importCalls.push({ count: options.data.journals.length, bytes: Buffer.byteLength(JSON.stringify(options.data)) });
      if (failImportAt && importCalls.length === failImportAt) { options.success({ statusCode: 503, data: { error: '模拟第二批网络中断' } }); return; }
    }
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
    const operation = options.success && options.success({ confirm: true });
    if (operation) pendingModals.push(Promise.resolve(operation));
  },
  getFileSystemManager() {
    return {
      writeFile(options) { writeFileSync(options.filePath, options.data, options.encoding); options.success(); },
      readFile(options) { options.success({ data: readFileSync(options.filePath, options.encoding) }); }
    };
  },
  shareFileMessage(options) { exportedFile = options.filePath; options.success(); },
  chooseMessageFile(options) { options.success({ tempFiles: [{ path: exportedFile, size: statSync(exportedFile).size }] }); },
  reLaunch() {}, switchTab() {}, navigateTo() {}, stopPullDownRefresh() {}
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
  await toolPage.exportRecords();
  assert.equal(toolPage.data.error, '');
  const toolCount = toolPage.data.records.length;
  await toolPage.remove({ currentTarget: { dataset: { id: toolPage.data.records[0].id } } });
  await Promise.all(pendingModals.splice(0));
  await toolPage.importRecords();
  assert.equal(toolPage.data.error, '');
  assert.equal(toolPage.data.records.length, toolCount, '工具文件导入应恢复删除记录');
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
  journals.toggleSelected({ currentTarget: { dataset: { id: entry.id } }, detail: { value: [entry.id] } });
  await journals.exportJournals();
  assert.equal(journals.data.error, '');
  assert.equal(JSON.parse(readFileSync(exportedFile, 'utf8')).journals.length, 1, '选择片段导出只应包含选中日记');
  await journals.remove({ currentTarget: { dataset: { id: entry.id } } });
  await Promise.all(pendingModals.splice(0));
  assert.ok(!journals.data.journals.some(item => item.id === entry.id));
  await journals.importJournals();
  assert.equal(journals.data.error, '');
  assert.ok(journals.data.journals.some(item => item.title === '原生日记接口验证'), '日记文件导入应恢复删除记录');
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
  }
  const longBackup = { version: 1, journals: Array.from({ length: 501 }, (_, index) => ({ title: '大备份-' + index, content: '成'.repeat(5000), mood: 3, intensity: 2, tags: [], goal: '', createdAt: new Date(Date.now() - 1000).toISOString() })) };
  exportedFile = join(temporary, 'large-backup.json');
  writeFileSync(exportedFile, JSON.stringify(longBackup));
  importCalls = [];
  await journals.importJournals();
  assert.equal(journals.data.error, '', '501条中文长日记备份应分批恢复');
  assert.ok(importCalls.length > 5 && importCalls.every(call => call.count <= 100 && call.bytes <= 1048576), '每批必须≤100条且≤1MiB');
  assert.equal(journals.data.journals.filter(item => item.title.startsWith('大备份-')).length, 501);
  const retryBackup = { version: 1, journals: Array.from({ length: 250 }, (_, index) => ({ title: '分批失败恢复-' + index, content: '部分失败后重试', createdAt: new Date(Date.now() - 1000).toISOString() })) };
  writeFileSync(exportedFile, JSON.stringify(retryBackup));
  importCalls = []; failImportAt = 2;
  await journals.importJournals();
  assert.ok(journals.data.error.includes('100/250') && journals.data.error.includes('未完成'), '中途失败应保留准确进度');
  assert.equal(journals.data.success, '', '中途失败不能展示全量成功');
  assert.equal(journals.data.journals.filter(item => item.title.startsWith('分批失败恢复-')).length, 100);
  importCalls = []; failImportAt = 0;
  await journals.importJournals();
  assert.equal(journals.data.error, '');
  assert.equal(journals.data.journals.filter(item => item.title.startsWith('分批失败恢复-')).length, 250, '重试同一备份应去重并恢复剩余记录');
  console.log(`原生页面事件到临时 API 联调通过：${toolPage.data.tools.length} 工具/${profiles} 个版本保存与月报、tracker回填修订保留ID/数量、历史删除、工具JSON文件导出/导入恢复、日记心情/标签/目标与搜索/星图/删除/选中片段JSON恢复/仅心情保存、4 份结构化服务表单。`);
  console.log('范围：Node 内执行页面逻辑与真实 API/临时文件；微信文件接口为模拟实现，未验证微信控件、原生文件选择分享或真机。');
  console.log('备份边界：501条长中文日记按≤100条/≤1MiB分批恢复；第二批故障显示100/250进度，重试去重恢复250条。');
  console.log('报告竞态：真实HTTP响应延迟乱序下，10月晚于9月返回、旧请求失败、切工具三种场景均保持当前报告与加载状态；qcd全部亲子版本指导/题目提示及suipian全部版本说明保留。');
} finally {
  await new Promise(resolve => server.close(resolve));
  rmSync(temporary, { recursive: true, force: true });
}
