import { questionnaireProfiles } from './questionnaire-data.mjs';
import { analyzeMS, analyzeHS } from './questionnaire-dialogue.mjs';

const toolNames = {
  ya: '压力与韧性', sm: '睡眠', pm: '数字产品', qz: '亲子关系与沟通',
  ysd: '饮食与体重', rj: '人际关系交往', k1: '口腔与视力',
  qcd: '青春期', fxd: '反省与规划', suipian: '抗碎片化成长研究',
};
const descriptions = {
  ya: '按小学、初中、高中场景，完成七维情绪韧性观察与补充记录。',
  sm: '观察入睡、时长、夜间安稳、日间状态和睡前习惯，生成分项建议。',
  pm: '观察屏幕使用与规则，按不同学段生成习惯分项与亲子建议。',
  qz: '从真实家庭相处场景了解亲子沟通，记录希望改善的方面。',
  ysd: '观察饮食结构、零食饮料、外卖宵夜、体重认知与就餐习惯。',
  rj: '区分学段及走读、住校场景，观察校园关系与家庭了解情况。',
  k1: '通过口腔护理与用眼习惯问答，分别展示两类观察结果。',
  qcd: '亲子共同完成18个对话问题，生成六主题对话地图，不给总分。',
  fxd: '初中、高中版的学习、生活、未来规划与迷茫应对反思，家庭观察单独呈现。',
  suipian: '按年龄完成时间、关系、意义、身份四维观察，以状态描述呈现，不显示数值评分。',
};
const plain = value => String(value ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const notice = '成长健研社提供的描述性成长观察，用于自我了解与交流，不构成医学诊断。持续困扰时请向可信任的成人或专业人员寻求支持。';
export function questionnaireNotice(toolId) {
  if (toolId === 'qcd') return notice + ' 如孩子提到骚扰或侵害，请认真对待，必要时联系学校或专业机构介入。';
  if (toolId === 'suipian') return notice + ' 本报告以状态描述呈现，不展示数值评分。记录与结果仅本人可见。';
  return notice;
}

export const questionnaireTools = Object.entries(toolNames).map(([id, name]) => ({
  id, name, group: id === 'suipian' ? '成长共研室' : '成长现状分析', mode: 'questionnaire',
  description: descriptions[id], sourceUrl: `https://sdsqsnwh.cn/cz/${id}.html`,
  profiles: questionnaireProfiles.filter(profile => profile.toolId === id).map(({ id, name, fields, result }) => ({
    id, name, fields, description: plain(result.description || ''),
  })),
}));

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
function validate(profile, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) invalid('请提供答案对象');
  for (const field of profile.fields) {
    const value = answers[field.id];
    if (value === undefined || value === null || value === '') {
      if (field.required) invalid(`请填写：${field.label}`);
      continue;
    }
    if (field.type === 'single' && !field.options.some(option => option.value === value)) invalid(`选项无效：${field.label}`);
    if (['text', 'textarea'].includes(field.type) && (typeof value !== 'string' || (field.max && value.length > field.max))) invalid(`内容格式或长度不正确：${field.label}`);
  }
}

const level3 = score => score >= 75 ? 'good' : score >= 50 ? 'ok' : 'low';
const level4 = score => score >= 75 ? 'good' : score >= 55 ? 'ok' : score >= 35 ? 'watch' : 'care';
const healthGrade = score => score >= 85 ? 'a' : score >= 70 ? 'b' : score >= 50 ? 'c' : 'd';

function scoredDimensions(profile, answers, classify = level3) {
  return profile.result.ord.map(key => {
    const rows = profile.questions.map((question, index) => ({ question, index })).filter(({ question }) => question.d === key);
    const score = rows.reduce((sum, { question, index }) => sum + (question.scores ? question.scores[answers['q' + index]] : 3 - answers['q' + index]), 0);
    const max = rows.length * (profile.result.kind === 'health' ? 4 : 3);
    const value = Math.round(score / max * 100);
    return { key, label: profile.result.names[key], value, level: classify(value) };
  });
}
const mean = dims => Math.round(dims.reduce((sum, dim) => sum + dim.value, 0) / dims.length);
const verdict = (table, score) => plain(table?.find(row => score >= row[0])?.[1]);
function contextSections(profile, answers) {
  const background = profile.fields.filter(field => field.section === '基本情况' && answers[field.id] !== undefined && answers[field.id] !== '');
  const notes = profile.fields.filter(field => field.section === '补充记录' && typeof answers[field.id] === 'string' && answers[field.id].trim());
  return [
    ...(background.length ? [{ title: '本次填写情况', items: background.map(field => `${field.label}：${field.options?.find(option => option.value === answers[field.id])?.label || answers[field.id]}`) }] : []),
    ...(notes.length ? [{ title: '你写下的补充记录', items: notes.map(field => `${field.label}：${answers[field.id].trim()}`) }] : []),
  ];
}

function evaluateStandard(profile, answers) {
  const data = profile.result;
  const social = data.kind === 'social';
  const planning = data.kind === 'planning';
  const health = data.kind === 'health';
  const dims = scoredDimensions(profile, answers, health ? healthGrade : (social || planning) ? level4 : level3);
  const core = (social || planning) ? dims.filter(dim => dim.key !== 'parent') : dims;
  const total = mean(core);
  const group = social ? (total >= 75 ? 'good' : total >= 50 ? 'ok' : 'watch') : profile.toolId === 'pm' ? (total >= 70 ? 'good' : total >= 50 ? 'ok' : 'low') : level3(total);
  const portrait = data.profiles?.[group];
  const summary = health ? data.words[healthGrade(total)] : verdict(data.verdicts, total) || [portrait?.title || portrait?.t, portrait?.desc || portrait?.d].filter(Boolean).join('：');
  const sections = dims.map(dim => {
    const level = dim.level;
    const descriptions = data.descr?.[dim.key];
    const text = health ? data.grades[dim.key][level].analysis : descriptions?.[level] || descriptions?.[{ good: 'high', ok: 'medium', low: 'low' }[level]] || '';
    const label = health ? data.grades[dim.key][level].label : planning ? data.levels.find(row => row[3] === level)?.[1] : data.levels?.[level];
    let extra = '';
    if (profile.toolId === 'ysd' && dim.key === 'weight') {
      if (answers.waist === '明显') extra += ' 腰围凸出提示中心性肥胖风险，建议测量腰围跟踪变化。';
      if (answers.body === '偏瘦') extra += ' 体型偏瘦需排查疾病因素，加强营养密度。';
    }
    return { title: dim.label + (label ? ' · ' + label : ''), text: plain(text + extra), ...(health ? { items: data.grades[dim.key][level].advice.map(plain) } : {}) };
  });

  if (!health) {
    let weak;
    if (social) weak = dims.filter(dim => dim.key !== 'parent' && ['watch', 'care'].includes(dim.level) && data.sug[dim.key]).sort((a, b) => a.value - b.value).slice(0, 3);
    else if (planning) weak = core.slice().sort((a, b) => a.value - b.value).slice(0, 2);
    else weak = dims.filter(dim => dim.level !== 'good').sort((a, b) => a.value - b.value).slice(0, ['pm', 'qz'].includes(profile.toolId) ? 3 : 2);
    const actions = [];
    for (const dim of weak) {
      let suggestions = data.sug[dim.key];
      if (social) suggestions = [suggestions[dim.level]];
      else if (Array.isArray(suggestions)) suggestions = suggestions.slice(0, profile.toolId === 'sm' || planning ? 2 : 3);
      else suggestions = [suggestions];
      for (const suggestion of suggestions) actions.push(dim.label + '：' + plain(typeof suggestion === 'string' ? suggestion : [suggestion.t, suggestion.d].filter(Boolean).join(' — ')));
    }
    if (profile.toolId === 'ysd') {
      const matches = [answers.waist === '明显', answers.waist === '微凸', answers.body === '偏瘦', answers.board === '住校生', answers.meal === '学校食堂', answers.meal === '经常外食/外卖'];
      data.personal.forEach((item, index) => { if (matches[index]) actions.push(item.tag + '：' + plain(item.d)); });
    }
    sections.push({ title: '可以尝试的行动', items: actions.length ? actions : [plain(data.keep)] });
    if (data.parent) {
      const parentLevel = dims.find(dim => dim.key === 'parent')?.level || group;
      sections.push({ title: '给家长的建议', text: plain(data.parent[parentLevel]) });
    }
  }
  sections.push(...contextSections(profile, answers));
  return {
    title: toolNames[profile.toolId] + '观察报告', summary,
    metrics: [{ label: '综合观察分', value: total, unit: '/100', ...((social || planning) ? { note: '家庭观察单独呈现，不计入综合分' } : {}) }, ...dims.map(dim => ({ label: dim.label, value: dim.value, unit: '/100' }))],
    sections, notice: questionnaireNotice(profile.toolId),
  };
}

function evaluateDialogue(profile, answers) {
  const sourceAnswers = Object.fromEntries(profile.questions.map((_, index) => ['q' + (index + 1), answers['q' + index]]));
  const rows = (profile.id === 'ms' ? analyzeMS : analyzeHS)(sourceAnswers);
  const labels = { open: '聊通', stuck: '卡住', silent: '沉默' };
  const counts = { open: 0, stuck: 0, silent: 0 };
  rows.forEach(row => { counts[row.s.status]++; });
  let actions = rows.filter(row => row.s.status !== 'open' && row.s.action).map(row => row.s.action);
  rows.forEach(row => { if (actions.length < 3 && row.s.status === 'open' && row.s.action) actions.push(row.s.action); });
  if (actions.length < 3) actions = actions.concat(['这周找一个不赶时间的场合，把这页报告和孩子一起看一遍', '从最容易开口的一条开始，不必全部做到', '聊的过程中听比说重要：先问“你怎么想”，再说你的想法']).slice(0, 3);
  return {
    title: '你们的青春期对话地图',
    summary: `六个章节里，你们聊通了 ${counts.open} 个，有 ${counts.stuck} 个卡住，还有 ${counts.silent} 个处于沉默。这不是成绩单，只是接下来的入口。`,
    metrics: Object.entries(counts).map(([key, value]) => ({ label: labels[key], value, unit: '个章节' })),
    sections: [...rows.map(row => ({ title: row.title + ' · ' + labels[row.s.status], text: row.s.text, ...(row.s.action ? { items: [row.s.action] } : {}) })), { title: '接下来可以试的三件事', items: actions.slice(0, 3) }, ...contextSections(profile, answers)],
    notice: questionnaireNotice('qcd'),
  };
}

function evaluateFragment(profile, answers) {
  const data = profile.result;
  const pick = (table, ratio) => table.find(row => ratio >= row.min) || table[table.length - 1];
  const dims = data.ord.map(key => {
    const rows = profile.questions.map((question, index) => ({ question, index })).filter(({ question }) => question.d === key);
    return { key, label: data.names[key], value: rows.reduce((sum, { index }) => sum + answers['q' + index], 0) / rows.length };
  });
  const total = profile.questions.reduce((sum, _, index) => sum + answers['q' + index], 0) / profile.questions.length;
  const state = pick(data.statuses, total / data.max);
  let lowest = dims[0];
  dims.forEach(dim => { if (dim.value < lowest.value) lowest = dim; });
  const allHigh = dims.every(dim => dim.value / data.max >= 0.8);
  return {
    title: '抗碎片化成长观察 · ' + plain(state.title), summary: plain(state.desc), metrics: [],
    sections: [...dims.map(dim => ({ title: dim.label, text: plain(pick(data.states[dim.key], dim.value / data.max).text) })), {
      title: '一个可以尝试的小行动',
      text: allHigh ? '四个维度你都在高位，说明你已经把生活缝得相当完整。接下来可以试试：把你的方法讲给身边需要的人听——教别人，是最好的巩固。' : plain('此刻最值得多看一眼前的是：' + lowest.label + '。\n' + data.advice[lowest.key]),
    }],
    notice: questionnaireNotice('suipian'),
  };
}

export function evaluateQuestionnaire(toolId, profileId, answers) {
  const profile = questionnaireProfiles.find(profile => profile.toolId === toolId && profile.id === profileId);
  if (!profile) invalid('未找到该工具或适用版本');
  validate(profile, answers);
  if (profile.result.kind === 'dialogue') return evaluateDialogue(profile, answers);
  if (profile.result.kind === 'fragment') return evaluateFragment(profile, answers);
  return evaluateStandard(profile, answers);
}
