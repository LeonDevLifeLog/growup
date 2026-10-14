import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// The downloaded scripts are evidence, not server dependencies. Evaluate only
// their data declarations in an isolated context without DOM, network or I/O.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'docs/evidence/native-migration');
const output = resolve(root, 'server/tools');
const source = id => readFileSync(resolve(evidence, id + '.js'), 'utf8');
function declarationSource(id) {
  let text = source(id);
  text = text.slice(text.indexOf('{') + 1);
  const marker = id === 'suipian' ? 'var state =' : '/* ================= 状态';
  const end = text.indexOf(marker);
  if (end < 0) throw new Error(`No reviewed declaration boundary: ${id}`);
  // suipian's comment opens before var state; remove that complete comment.
  if (id === 'suipian') text = text.slice(0, text.lastIndexOf('/*', end));
  else text = text.slice(0, end);
  if (id === 'pm') text += '\n' + source(id).match(/function buildSet\(v\)\{[\s\S]*?\n\}/)[0];
  return text;
}
function capture(id, expression) {
  const context = vm.createContext({
    matchMedia: () => ({ matches: true }),
    shallow: object => ({ ...object }),
  });
  new vm.Script(declarationSource(id) + '\n;globalThis.captured = (' + expression + ');', { filename: id + '-declarations.js' })
    .runInContext(context, { timeout: 1000 });
  return context.captured;
}
const plain = value => String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const select = (id, label, values, required = true) => ({ id, label, type: 'single', required, section: '基本情况', options: values.map(value => ({ value, label: value })) });
const nickname = () => ({ id: 'name', label: '昵称（选填）', type: 'text', required: false, max: 12, section: '基本情况' });
const note = (id, label, max = 500) => ({ id, label, type: 'textarea', required: false, max, section: '补充记录' });
const board = values => select('board', '就读方式', values || ['走读生', '住校生']);
const profileData = [];
function addProfile(toolId, id, name, questions, extras, result) {
  const fields = extras.concat(questions.map((question, index) => ({
    id: 'q' + index, label: plain(question.t), type: 'single', required: true,
    section: question.section || result.names?.[question.d] || question.d,
    ...(question.h ? { help: plain(question.h) } : {}),
    options: question.o.map((label, value) => ({ value, label: plain(label) })),
  })));
  profileData.push({ toolId, id, name, fields, questions, result });
}
const standard = {
  ya: capture('ya', '({cfg:CFG,profiles:PROFILE,levels:LVL,keep:KEEP_ADVICE})'),
  sm: capture('sm', '({cfg:CFG,names:DIM_NAMES,ord:ORD,profiles:PROFILE,levels:LVL,keep:KEEP_ADVICE})'),
  pm: capture('pm', '({cfg:CFG,sets:Object.fromEntries(Object.keys(CFG).map(k=>[k,buildSet(k)])),verdicts:VERDICTS,parent:PARENT,levels:LVL,keep:KEEP_ADVICE})'),
  qz: capture('qz', '({cfg:VER,names:DIMS,ord:ORD,descr:DESCR,sug:SUG,profiles:PROFILE,levels:LVL,keep:KEEP_ADVICE})'),
  ysd: capture('ysd', '({cfg:CFG,names:DIM_NAMES,ord:ORD,body:BODY,bodyValues:BODY_V,waist:WAIST,waistValues:WAIST_V,personal:PERSONAL.map(({f,...p})=>p),levels:LVL,keep:KEEP_ADVICE})'),
};
for (const [id, data] of Object.entries(standard)) {
  for (const [profileId, cfg] of Object.entries(data.cfg)) {
    const extras = [nickname(), select('grade', '年级', cfg.grades)];
    if (cfg.board || cfg.boarding) extras.push(board(id === 'qz' ? ['住校', '走读'] : undefined));
    if (id === 'sm') extras.push(select('sleep', '平时晚上上床睡觉时间', cfg.sleep));
    if (id === 'pm') extras.push(select('device', '平时接触最多的设备', cfg.devices));
    if (id === 'ysd') {
      if (cfg.meal) extras.push(select('meal', '孩子平时主要在哪吃饭？', ['家里做饭', '学校食堂', '长辈家/托管班', '经常外食/外卖']));
      extras.push({ ...select('body', '您觉得孩子目前的体型是？', data.body), options: data.body.map((label, i) => ({ value: data.bodyValues[i], label })) });
      extras.push({ ...select('waist', '孩子肚子（腰腹部）的形态是？', data.waist), options: data.waist.map((label, i) => ({ value: data.waistValues[i], label })) });
    }
    if (id === 'ya') extras.push(note('pressureNote', '最大的压力来源是什么？'), note('reliefNote', '通常用什么方式来缓解压力？'), note('otherNote', '还有什么关于情绪和压力的情况想补充？'));
    if (id === 'qz') extras.push(note('barrierNote', '您觉得和孩子之间最大的沟通障碍是什么？'), note('improveNote', '您目前最想改善的方面是什么？'), note('otherNote', '还有什么关于亲子沟通的情况想补充？'));
    const set = id === 'pm' ? data.sets[profileId] : null;
    const names = set?.names || cfg.names || (id === 'qz' ? data.names[cfg.grp] : data.names);
    const ord = cfg.ord || (id === 'qz' ? data.ord[cfg.grp] : data.ord) || Object.keys(names);
    addProfile(id, profileId, cfg.tag, set?.qs || cfg.qs, extras, {
      kind: 'standard', names, ord, description: cfg.lead,
      descr: set?.descr || cfg.descr || data.descr?.[profileId],
      sug: set?.sug || cfg.sug || data.sug?.[profileId],
      profiles: cfg.prof || data.profiles, verdicts: data.verdicts, parent: data.parent,
      levels: data.levels, keep: data.keep,
      ...(id === 'ysd' ? { personal: data.personal } : {}),
    });
  }
}

const social = capture('rj', '({cfg:CFG,raw:RAW,names:NAMES,ord:ORD,descr:Object.fromEntries(Object.keys(CFG).map(k=>[k,buildDescr(k)])),sug:SUG,profiles:PROFILE,levels:LVL,parent:PARENT_NOTE,keep:KEEP_ADVICE})');
for (const [ageId, cfg] of Object.entries(social.cfg)) {
  for (const scene of ['day', 'boarding']) {
    const questions = social.raw[ageId].map(question => question.v ? { ...question, ...question.v[scene === 'boarding' ? 'b' : 'w'], v: undefined } : question);
    addProfile('rj', ageId + '-' + scene, cfg.tag + ' · ' + (scene === 'boarding' ? '住校' : '走读'), questions,
      [nickname(), select('grade', '年级', cfg.grades)], {
        kind: 'social', names: social.names[ageId], ord: social.ord[ageId], descr: social.descr[ageId],
        description: cfg.lead, sug: social.sug[ageId], profiles: social.profiles, levels: social.levels,
        parent: social.parent, keep: social.keep,
      });
  }
}

const health = capture('k1', '({quiz:QUIZ,grades:GRADE_TEXT,words:WORD})');
for (const [id, data] of Object.entries(health.quiz)) {
  const questions = data.sections.flatMap(section => section.questions.map(question => ({ d: section.key, t: question.text, o: question.options.map(option => option.t), scores: question.options.map(option => option.s) })));
  addProfile('k1', id, id === 'primary' ? '小学版 · 6–12岁' : '中学版 · 12–18岁', questions, [], {
    kind: 'health', names: Object.fromEntries(data.sections.map(section => [section.key, section.name])),
    ord: data.sections.map(section => section.key), grades: health.grades, words: health.words,
  });
}

const planning = capture('fxd', '({bank:BANK,names:DIMS,text:TEXT,advice:ADVICE,parent:PARENT_NOTE,levels:LEVELS})');
for (const [id, data] of Object.entries(planning.bank)) {
  const questions = Object.entries(data).flatMap(([dim, list]) => list.map(question => ({ d: dim, t: question.q, h: question.hint, o: question.opts })));
  addProfile('fxd', id, id === 'ms' ? '初中版' : '高中版', questions, [], {
    kind: 'planning', names: planning.names, ord: Object.keys(planning.names),
    descr: planning.text[id].desc, verdicts: planning.text[id].verdicts,
    sug: planning.advice, parent: planning.parent, levels: planning.levels,
  });
}

const puberty = capture('qcd', '({data:DATA,analyzeMS:analyzeMS.toString(),analyzeHS:analyzeHS.toString()})');
for (const [id, data] of Object.entries(puberty.data)) {
  const questions = data.sections.flatMap(section => section.items.map(question => ({ d: section.name, section: section.name, t: question.q, h: question.hint, o: question.opts })));
  addProfile('qcd', id, data.label, questions, [note('dialogueNote', '聊出来的新东西（选填）', 5000)], {
    kind: 'dialogue', description: plain(data.intro),
  });
}

const fragment = capture('suipian', '({scales:SCALES,statuses:STATUS_LEVELS,states:DIM_STATES,advice:ADVICE})');
for (const [id, data] of Object.entries(fragment.scales)) {
  const questions = data.dims.flatMap(dim => dim.items.map(text => ({ d: dim.key, t: text, o: data.options.map(option => option.label) })));
  addProfile('suipian', id, data.name + ' · ' + data.age, questions, [], {
    kind: 'fragment', max: data.max, optionValues: data.options.map(option => option.v),
    names: Object.fromEntries(data.dims.map(dim => [dim.key, dim.name])), ord: data.dims.map(dim => dim.key),
    statuses: fragment.statuses, states: fragment.states, advice: fragment.advice,
    description: data.meta,
  });
}

// Keep input values as source Likert scores for this tool; qcd and all other
// questionnaires use the source zero-based selected option index.
for (const profile of profileData.filter(profile => profile.toolId === 'suipian')) {
  for (const field of profile.fields) field.options.forEach((option, i) => { option.value = profile.result.optionValues[i]; });
}
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'questionnaire-data.mjs'), '// Generated from reviewed public source. Run scripts/extract-questionnaires.mjs.\nexport const questionnaireProfiles = ' + JSON.stringify(profileData, null, 2) + ';\n');
writeFileSync(resolve(output, 'questionnaire-dialogue.mjs'), '// Branch rules copied from qcd.html; no DOM, remote submission or imports.\nexport ' + puberty.analyzeMS + '\nexport ' + puberty.analyzeHS + '\n');
console.log('Extracted ' + profileData.length + ' profiles, ' + profileData.reduce((sum, profile) => sum + profile.questions.length, 0) + ' question instances.');

if (process.argv.includes('--verify')) {
  const assert = await import('node:assert/strict');
  const { evaluateQuestionnaire } = await import('../server/tools/questionnaires.mjs');
  let seed = 20261014;
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  let checks = 0;
  const functionSource = (id, name) => {
    const match = source(id).match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
    if (!match) throw new Error(`Missing source function ${id}.${name}`);
    return match[0];
  };
  for (const profile of profileData) {
    for (let iteration = 0; iteration < 50; iteration++) {
      const answers = Object.fromEntries(profile.fields.filter(field => field.required).map(field => [field.id, field.options[iteration === 0 ? 0 : iteration === 1 ? field.options.length - 1 : random(field.options.length)].value]));
      const report = evaluateQuestionnaire(profile.toolId, profile.id, answers);
      const id = profile.toolId;
      if (id === 'qcd') {
        const rows = capture(id, `${profile.id === 'ms' ? 'analyzeMS' : 'analyzeHS'}(${JSON.stringify(Object.fromEntries(profile.questions.map((_, index) => ['q' + (index + 1), answers['q' + index]])))})`);
        assert.equal(report.sections.filter(section => / · (聊通|卡住|沉默)$/.test(section.title)).length, rows.length);
        rows.forEach((row, index) => { assert.equal(report.sections[index].text, row.s.text); assert.equal(report.sections[index].items?.[0] || '', row.s.action); });
      } else if (id === 'suipian') {
        const values = profile.questions.map((_, index) => answers['q' + index]);
        const total = values.reduce((sum, value) => sum + value, 0) / values.length;
        const status = profile.result.statuses.find(status => total / profile.result.max >= status.min);
        assert.equal(report.summary, plain(status.desc));
        assert.equal(report.metrics.length, 0);
        for (const [index, key] of profile.result.ord.entries()) {
          const selected = profile.questions.map((question, q) => ({ question, value: values[q] })).filter(row => row.question.d === key);
          const ratio = selected.reduce((sum, row) => sum + row.value, 0) / selected.length / profile.result.max;
          assert.equal(report.sections[index].text, profile.result.states[key].find(status => ratio >= status.min).text);
        }
      } else {
        let setup = '';
        if (id === 'ya' || id === 'sm' || id === 'ysd') setup = `var cfg=CFG[${JSON.stringify(profile.id)}],flat=cfg.qs;`;
        if (id === 'pm') setup = `var set=buildSet(${JSON.stringify(profile.id)}),flat=set.qs;`;
        if (id === 'qz') setup = `var cfg=VER[${JSON.stringify(profile.id)}],flat=cfg.qs;function dimName(k){return DIMS[cfg.grp][k]}`;
        if (id === 'rj') setup = `var ver=${JSON.stringify(profile.id.split('-')[0])},set={names:NAMES[ver]},flat=${JSON.stringify(profile.questions)};`;
        if (id === 'fxd') setup = `var flat=${JSON.stringify(profile.questions.map(question => ({ d: question.d })))},ver=${JSON.stringify(profile.id)};`;
        if (id === 'k1') setup = `var ver=${JSON.stringify(profile.id)},flat=QUIZ[ver].sections.flatMap(sec=>sec.questions.map(q=>({k:sec.key,q})));`;
        const context = vm.createContext({ matchMedia: () => ({ matches: true }), shallow: object => ({ ...object }) });
        const code = declarationSource(id) + '\n' + functionSource(id, 'compute') + '\n' + setup + '\nvar answers=' + JSON.stringify(profile.questions.map((_, index) => answers['q' + index])) + ';globalThis.value=compute();';
        new vm.Script(code).runInContext(context, { timeout: 1000 });
        const expected = context.value;
        assert.equal(report.metrics[0].value, expected.total ?? expected.avg, `${id}/${profile.id} total`);
        const dimensions = expected.dims?.map(dim => dim.pct) || expected.secs?.map(dim => dim.pct) || Object.values(expected.per);
        assert.deepEqual(report.metrics.slice(1).map(metric => metric.value), [...dimensions], `${id}/${profile.id} dimensions`);
      }
      assert.ok(report.title && report.summary && Array.isArray(report.sections));
      assert.ok(!JSON.stringify(report).includes('undefined'));
      checks++;
    }
  }
  // Server must not manufacture a score for omitted or invalid selections.
  assert.throws(() => evaluateQuestionnaire('ya', 'primary', {}), /请填写/);
  assert.throws(() => evaluateQuestionnaire('missing', 'primary', {}), /未找到/);
  const verification = { verifiedAt: new Date().toISOString(), profileCount: profileData.length, sourceComparisonCases: checks, sampleSeed: 20261014, scope: 'Offline source scoring and branch comparison; no reference-site writes or WeChat runtime claims' };
  writeFileSync(resolve(evidence, 'questionnaire-verification.json'), JSON.stringify(verification, null, 2));
  console.log(`Verified ${checks} report cases against captured source scoring/branches.`);
}
