
/* ====== 常量 ====== */
var SK = 'growth_journal_records_teen';
var BK = 'growth_journal_last_backup_teen';
var DIMS = [
  {key:'critical', icon:'🧠', name:'独立思考'},
  {key:'communication', icon:'💬', name:'沟通'},
  {key:'collaboration', icon:'🤝', name:'协作'},
  {key:'creativity', icon:'💡', name:'创造力'},
  {key:'resilience', icon:'🛡️', name:'情绪恢复力'}
];
var ACTS = [
  {key:'online', icon:'💻', name:'线上'},
  {key:'offline', icon:'🏟️', name:'线下'},
  {key:'group', icon:'👥', name:'团体'},
  {key:'individual', icon:'🧑‍🤝‍🧑', name:'一对一'}
];
var STRESS_SOURCES = [
  {key:'study', icon:'📚', name:'学习'},
  {key:'family', icon:'🏠', name:'家庭'},
  {key:'friends', icon:'👫', name:'朋友'},
  {key:'self', icon:'🧘', name:'自我'},
  {key:'future', icon:'🌟', name:'未来'},
  {key:'other', icon:'❓', name:'其他'}
];
var WEATHERS = {sunny:'☀️晴天', cloudy:'⛅多云', overcast:'☁️阴天', rainy:'🌧️小雨', stormy:'⛈️雷雨'};
var TYPE_ICONS = {emotion_weather:'🌤️', _4c_moment:'✨', reflection:'🎯', activity_observation:'🎪', stress_daily:'🌿'};

var records = [];
var curWeather = null;
var curCalm = null;
var curReport = null;
var pendingImport = null;

/* ====== 工具函数 ====== */
function $(id) { return document.getElementById(id); }
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }
function nowStr() {
  return new Date().toLocaleString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function curMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
}
function pad2(n){ return String(n).padStart(2,'0'); }
function pick(arr, key, field) {
  for (var i = 0; i < arr.length; i++) if (arr[i].key === key) return arr[i][field];
  return field === 'name' ? key : '';
}
function dimIcon(k){ return pick(DIMS, k, 'icon'); }
function dimName(k){ return pick(DIMS, k, 'name'); }
function sourceIcon(k){ return pick(STRESS_SOURCES, k, 'icon'); }
function sourceName(k){ return pick(STRESS_SOURCES, k, 'name'); }
function isWeChat(){ return /MicroMessenger/i.test(navigator.userAgent); }

/* ====== 初始化 ====== */
function init() {
  try {
    var saved = localStorage.getItem(SK);
    if (saved) records = JSON.parse(saved) || [];
  } catch(e) { records = []; }
  buildTags();
  bindEvents();
  refreshLists();
  handleQrFallback();
  renderBackupInfo();
  checkBackupReminder();
}

function handleQrFallback() {
  var img = $('qr-img');
  if (!img) return;
  img.onerror = function() {
    this.style.display = 'none';
    var fb = document.createElement('div');
    fb.className = 'qr-fallback';
    fb.textContent = '二维码\n加载中…';
    this.parentNode.appendChild(fb);
  };
}

function buildTags() {
  var dimHTML = '';
  for (var i = 0; i < DIMS.length; i++) {
    dimHTML += '<span class="tag" data-dim="' + DIMS[i].key + '">' + DIMS[i].icon + ' ' + DIMS[i].name + '</span>';
  }
  $('teen-4c-tags').innerHTML = dimHTML;
  $('act-dim-tags').innerHTML = dimHTML;

  var actHTML = '';
  for (var i = 0; i < ACTS.length; i++) {
    actHTML += '<span class="tag" data-act="' + ACTS[i].key + '">' + ACTS[i].icon + ' ' + ACTS[i].name + '</span>';
  }
  $('act-scene-tags').innerHTML = actHTML;
}

function bindEvents() {
  var tabs = document.querySelectorAll('.role-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      var allTabs = document.querySelectorAll('.role-tab');
      var allSecs = document.querySelectorAll('.content-section');
      for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
      for (var j = 0; j < allSecs.length; j++) allSecs[j].classList.remove('active');
      this.classList.add('active');
      $('sec-' + this.dataset.role).classList.add('active');
    });
  }

  var wopts = document.querySelectorAll('.weather-opt');
  for (var i = 0; i < wopts.length; i++) {
    wopts[i].addEventListener('click', function() {
      var all = document.querySelectorAll('.weather-opt');
      for (var j = 0; j < all.length; j++) all[j].classList.remove('sel');
      this.classList.add('sel');
      curWeather = this.dataset.w;
    });
  }

  var calmOpts = document.querySelectorAll('#teen-w-calm-opts .tag');
  for (var i = 0; i < calmOpts.length; i++) {
    calmOpts[i].addEventListener('click', function() {
      var allCalm = document.querySelectorAll('#teen-w-calm-opts .tag');
      if (this.classList.contains('sel')) {
        this.classList.remove('sel-calm-yes','sel-calm-no','sel');
        curCalm = null;
        return;
      }
      for (var j = 0; j < allCalm.length; j++) allCalm[j].classList.remove('sel-calm-yes','sel-calm-no','sel');
      curCalm = this.dataset.calm;
      this.classList.add(curCalm === 'yes' ? 'sel-calm-yes' : 'sel-calm-no');
      this.classList.add('sel');
    });
  }

  /* 通用标签点选（平静选项有独立逻辑，故排除） */
  document.addEventListener('click', function(e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('tag')) return;
    if (t.closest('#teen-w-calm-opts')) return;
    t.classList.toggle('sel');
  });
}

/* ====== 获取选中标签 ====== */
function getSelTags(containerId, attr) {
  var c = $(containerId);
  if (!c) return [];
  var key = attr || 'dim';
  var sel = c.querySelectorAll('.tag.sel');
  var result = [];
  for (var i = 0; i < sel.length; i++) result.push(sel[i].dataset[key]);
  return result;
}
function clearTags(containerId) {
  var c = $(containerId);
  if (!c) return;
  var sel = c.querySelectorAll('.tag.sel');
  for (var i = 0; i < sel.length; i++) sel[i].classList.remove('sel','sel-calm-yes','sel-calm-no');
}

/* ====== Toast ====== */
var toastTimer;
function showToast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2600);
}

/* ====== 保存记录 ====== */
function saveRec(type) {
  var rec = null;

  if (type === 'weather') {
    if (!curWeather) { showToast('☁️ 请先选择今天的情绪天气'); return; }
    rec = {
      type: 'emotion_weather',
      weather: curWeather,
      description: $('teen-w-desc').value.trim(),
      calmQuick: curCalm,
      dimensions: [],
      context: 'teen'
    };
    curWeather = null; curCalm = null;
    var wopts = document.querySelectorAll('.weather-opt');
    for (var i = 0; i < wopts.length; i++) wopts[i].classList.remove('sel');
    $('teen-w-desc').value = '';
    clearTags('teen-w-calm-opts');

  } else if (type === '4c') {
    if (!$('teen-4c-desc').value.trim()) { showToast('✏️ 请描述今天的成长瞬间'); return; }
    rec = {
      type: '_4c_moment',
      description: $('teen-4c-desc').value.trim(),
      dimensions: getSelTags('teen-4c-tags'),
      isHighlight: $('hl-chk').checked,
      context: 'teen'
    };
    $('teen-4c-desc').value = '';
    clearTags('teen-4c-tags');
    $('hl-chk').checked = false;

  } else if (type === 'reflection') {
    if (!$('teen-refl').value.trim()) { showToast('✏️ 请写下你的想法'); return; }
    rec = { type:'reflection', description:$('teen-refl').value.trim(), dimensions:[], context:'teen' };
    $('teen-refl').value = '';

  } else if (type === 'activity') {
    if (!$('act-desc').value.trim()) { showToast('✏️ 请描述活动反馈'); return; }
    rec = {
      type: 'activity_observation',
      description: $('act-desc').value.trim(),
      dimensions: getSelTags('act-dim-tags'),
      activityScenes: getSelTags('act-scene-tags','act'),
      isEffective: $('act-eff').checked,
      context: 'activity'
    };
    $('act-desc').value = '';
    clearTags('act-dim-tags');
    clearTags('act-scene-tags');
    $('act-eff').checked = false;

  } else if (type === 'stress') {
    if (!$('stress-desc').value.trim()) { showToast('✏️ 请写下你的压力来源'); return; }
    rec = {
      type: 'stress_daily',
      description: $('stress-desc').value.trim(),
      stressSources: getSelTags('stress-source-tags','source'),
      dimensions: [],
      context: 'stress'
    };
    $('stress-desc').value = '';
    clearTags('stress-source-tags');
  }

  if (!rec) return;
  rec.id = genId();
  rec.timestamp = nowStr();
  rec.month = curMonth();
  records.push(rec);
  persist();
  refreshLists();

  var msg = '✅ 已保存';
  if (rec.type === 'emotion_weather') msg = '✅ 情绪天气已保存';
  else if (rec.type === '_4c_moment') msg = rec.isHighlight ? '⭐ 高光时刻已保存！' : '✅ 成长瞬间已保存';
  else if (rec.type === 'reflection') msg = '✅ 本周想法已保存';
  else if (rec.type === 'activity_observation') msg = '🎪 活动观察已保存';
  else if (rec.type === 'stress_daily') msg = '🌿 压力记录已保存';
  showToast(msg);
}

function persist() {
  try { localStorage.setItem(SK, JSON.stringify(records)); return true; }
  catch(e) { showToast('⚠️ 存储空间不够，请先备份再清空'); return false; }
}

/* ====== 记录列表 ====== */
function refreshLists() {
  renderList('teen-recs','teen-recs-card', filterRecs('teen'));
  renderList('act-recs','act-recs-card', filterRecs('activity'));
  renderList('stress-recs','stress-recs-card', filterRecs('stress'));
}

function filterRecs(ctx) {
  var result = [];
  for (var i = records.length - 1; i >= 0 && result.length < 30; i--) {
    if (records[i].context === ctx) result.push(records[i]);
  }
  return result;
}

function renderList(listId, cardId, list) {
  var card = $(cardId), el = $(listId);
  if (!card || !el) return;
  card.style.display = 'block';
  if (!list.length) {
    el.innerHTML = '<div class="empty-st">🌱 还没有记录哦，写下今天的第一笔吧！</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    var icon = TYPE_ICONS[r.type] || '📝';
    var meta = esc(r.timestamp);

    if (r.dimensions && r.dimensions.length) {
      meta += ' · ';
      for (var j = 0; j < r.dimensions.length; j++) meta += dimIcon(r.dimensions[j]);
    }
    if (r.type === 'emotion_weather' && r.calmQuick) {
      meta += r.calmQuick === 'yes' ? ' · ✅平静' : ' · ❌未平静';
    }
    if (r.activityScenes && r.activityScenes.length) meta += ' · ' + r.activityScenes.join(' ');
    if (r.stressSources && r.stressSources.length) {
      meta += ' · ';
      for (var j = 0; j < r.stressSources.length; j++) meta += sourceIcon(r.stressSources[j]);
    }

    var hl = r.isHighlight ? '<span class="rec-hl">⭐</span>' : '';
    var eff = r.isEffective ? ' ✅' : '';
    var wTxt = r.weather ? (WEATHERS[r.weather] || '') + ' ' : '';
    var preview = r.description ? esc(r.description.substring(0,40)) + (r.description.length > 40 ? '…' : '') : wTxt;

    html += '<div class="rec-item"><span class="rec-icon">' + icon + '</span><div class="rec-body">' +
            '<div class="rec-txt">' + preview + hl + eff + '</div>' +
            '<div class="rec-meta">' + meta + '</div></div></div>';
  }
  el.innerHTML = html;
}

/* ====== 使用说明 ====== */
function openGuide() {
  $('gs-sheet').classList.add('open');
  $('gs-overlay').classList.add('open');
}
function closeGuide() {
  $('gs-sheet').classList.remove('open');
  $('gs-overlay').classList.remove('open');
}

/* ====== 备份时间与提醒 ====== */
function getLastBackup() {
  try { return Number(localStorage.getItem(BK) || 0); } catch(e) { return 0; }
}
function markBackup() {
  try { localStorage.setItem(BK, String(Date.now())); } catch(e) {}
  renderBackupInfo();
}
function renderBackupInfo() {
  var el = $('bak-time'), extra = $('bak-extra');
  if (!el) return;
  var t = getLastBackup();
  if (!t) {
    el.textContent = '从未备份';
    el.className = 'bak-tag warn';
    if (extra) extra.textContent = records.length ? '（建议马上备份一次）' : '';
    return;
  }
  var days = Math.floor((Date.now() - t) / 86400000);
  var d = new Date(t);
  el.textContent = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) +
                   '（' + (days === 0 ? '今天' : days + '天前') + '）';
  el.className = days >= 30 ? 'bak-tag warn' : 'bak-tag';
  if (extra) extra.textContent = days >= 30 ? '⚠️ 超过30天没备份了' : '';
}
function checkBackupReminder() {
  if (!records.length) return;
  var t = getLastBackup();
  var days = t ? Math.floor((Date.now() - t) / 86400000) : 999;
  if (days >= 30) {
    setTimeout(function() {
      showToast('⏰ ' + (t ? '已 ' + days + ' 天未备份' : '还没有备份过') + '，请到「数据管理」备份一次');
    }, 1500);
  }
}

/* ====== 报告生成 ====== */
function generateReport() {
  var month = curMonth();
  var mRecs = [];
  for (var i = 0; i < records.length; i++) if (records[i].month === month) mRecs.push(records[i]);

  var daySet = {};
  for (var i = 0; i < mRecs.length; i++) daySet[mRecs[i].timestamp.split(' ')[0]] = true;
  var days = Object.keys(daySet).length;

  if (days < 15) showToast('📊 这个月只记了' + days + '天，最好记满15天再生成哦');

  var dimCount = {};
  for (var i = 0; i < DIMS.length; i++) dimCount[DIMS[i].key] = 0;
  for (var i = 0; i < mRecs.length; i++) {
    var dims = mRecs[i].dimensions || [];
    for (var j = 0; j < dims.length; j++) if (dimCount[dims[j]] !== undefined) dimCount[dims[j]]++;
  }

  var wCount = {}, calmCount = {yes:0, no:0, none:0};
  for (var i = 0; i < mRecs.length; i++) {
    if (mRecs[i].type === 'emotion_weather') {
      wCount[mRecs[i].weather] = (wCount[mRecs[i].weather] || 0) + 1;
      if (mRecs[i].calmQuick === 'yes') calmCount.yes++;
      else if (mRecs[i].calmQuick === 'no') calmCount.no++;
      else calmCount.none++;
    }
  }

  var highlights = [], effRecs = [], stressRecs = [];
  for (var i = 0; i < mRecs.length; i++) {
    if (mRecs[i].isHighlight) highlights.push(mRecs[i]);
    if (mRecs[i].isEffective) effRecs.push(mRecs[i]);
    if (mRecs[i].type === 'stress_daily') stressRecs.push(mRecs[i]);
  }

  curReport = {
    month: month, totalRecords: mRecs.length, recordDays: days,
    dimCount: dimCount, weatherCount: wCount, calmCount: calmCount,
    highlights: highlights, effectiveRecords: effRecs, stressRecords: stressRecs,
    records: mRecs, generatedAt: nowStr()
  };

  var html = '<div class="stats-grid">';
  html += '<div class="stat-card"><div class="stat-num">' + days + '</div><div class="stat-lbl">记录天数</div></div>';
  html += '<div class="stat-card"><div class="stat-num">' + mRecs.length + '</div><div class="stat-lbl">记录总数</div></div>';
  html += '<div class="stat-card"><div class="stat-num">' + highlights.length + '</div><div class="stat-lbl">高光时刻</div></div>';
  html += '<div class="stat-card"><div class="stat-num">' + stressRecs.length + '</div><div class="stat-lbl">压力记录</div></div>';
  html += '</div>';

  var totalCalm = calmCount.yes + calmCount.no;
  if (totalCalm > 0) {
    var calmPct = Math.round(calmCount.yes / totalCalm * 100);
    html += '<div class="stats-grid" style="margin-top:8px">';
    html += '<div class="stat-card"><div class="stat-num">' + calmPct + '%</div><div class="stat-lbl">主动平静率</div></div>';
    html += '<div class="stat-card"><div class="stat-num">' + calmCount.yes + '/' + totalCalm + '</div><div class="stat-lbl">平静/总次数</div></div>';
    html += '</div>';
  }

  html += '<div class="rpt-preview">';
  html += '<div class="rpt-sec-ttl">📊 能力分布</div>';

  var maxDim = 1;
  for (var k in dimCount) if (dimCount[k] > maxDim) maxDim = dimCount[k];

  for (var i = 0; i < DIMS.length; i++) {
    var d = DIMS[i];
    var pct = Math.round(dimCount[d.key] / maxDim * 100);
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
            '<span style="font-size:12px;width:20px">' + d.icon + '</span>' +
            '<span style="font-size:11px;width:60px;color:var(--text-muted)">' + d.name + '</span>' +
            '<div style="flex:1;height:8px;background:var(--bg-desk);border-radius:4px;overflow:hidden">' +
            '<div style="width:' + pct + '%;height:100%;background:var(--primary);border-radius:4px"></div></div>' +
            '<span style="font-size:11px;color:var(--primary-dark);font-weight:600;width:24px;text-align:right">' + dimCount[d.key] + '</span></div>';
  }

  var wKeys = Object.keys(wCount);
  if (wKeys.length) {
    html += '<div class="rpt-sec-ttl">🌤️ 情绪天气分布</div>';
    var wParts = [];
    for (var i = 0; i < wKeys.length; i++) wParts.push((WEATHERS[wKeys[i]] || wKeys[i]) + '×' + wCount[wKeys[i]]);
    html += '<div class="rpt-txt">' + wParts.join('　') + '</div>';

    if (totalCalm > 0) {
      html += '<div class="rpt-sec-ttl">🧘 情绪平静情况</div>';
      html += '<div class="rpt-txt">✅ 较快平静下来：' + calmCount.yes + '次　❌ 情绪持续较久：' + calmCount.no + '次';
      if (calmCount.none > 0) html += '　⏳ 没选：' + calmCount.none + '次';
      html += '</div>';
      var denom = totalCalm + calmCount.none;
      html += '<div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin:6px 0 2px;background:var(--bg-desk)">';
      if (calmCount.yes > 0) html += '<div style="width:' + (calmCount.yes / denom * 100) + '%;background:var(--primary)"></div>';
      if (calmCount.no > 0) html += '<div style="width:' + (calmCount.no / denom * 100) + '%;background:var(--accent)"></div>';
      html += '</div>';
      html += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)"><span>✅ 已平静</span><span>❌ 未平静</span></div>';
    }
  }

  if (highlights.length) {
    html += '<div class="rpt-sec-ttl">⭐ 高光时刻</div>';
    for (var i = 0; i < highlights.length; i++) {
      html += '<div class="rpt-hl-item"><span>⭐</span><span style="font-size:11px">' + esc(highlights[i].description.substring(0,60)) + '</span></div>';
    }
  }

  if (stressRecs.length) {
    html += '<div class="rpt-sec-ttl">🌿 压力日常 (共' + stressRecs.length + '条)</div>';
    var srcCount = {};
    for (var i = 0; i < stressRecs.length; i++) {
      var srcs = stressRecs[i].stressSources || [];
      for (var j = 0; j < srcs.length; j++) srcCount[srcs[j]] = (srcCount[srcs[j]] || 0) + 1;
    }
    var srcKeys = Object.keys(srcCount);
    if (srcKeys.length) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">';
      for (var i = 0; i < srcKeys.length; i++) {
        html += '<span style="background:var(--bg-guide);padding:2px 10px;border-radius:20px;font-size:11px">' +
                sourceIcon(srcKeys[i]) + ' ' + sourceName(srcKeys[i]) + ' ×' + srcCount[srcKeys[i]] + '</span>';
      }
      html += '</div>';
    }
    html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">最近压力记录：</div>';
    var recentStress = stressRecs.slice(0, 3);
    for (var i = 0; i < recentStress.length; i++) {
      html += '<div class="rpt-opp"><div class="rpt-opp-d">' + esc(recentStress[i].description.substring(0,40)) + '</div></div>';
    }
  }

  var sortedDims = [];
  for (var i = 0; i < DIMS.length; i++) {
    sortedDims.push({icon: DIMS[i].icon, name: DIMS[i].name, count: dimCount[DIMS[i].key]});
  }
  sortedDims.sort(function(a,b){ return a.count - b.count; });

  html += '<div class="rpt-sec-ttl">🌱 可以多练习</div>';
  var maxCount = sortedDims[sortedDims.length - 1].count;
  for (var i = 0; i < sortedDims.length; i++) {
    if (sortedDims[i].count < maxCount) {
      html += '<div class="rpt-opp"><div class="rpt-opp-t">' + sortedDims[i].icon + ' ' + sortedDims[i].name +
              '</div><div class="rpt-opp-d">这个月记了' + sortedDims[i].count + '次，可以在生活中多留意相关的时刻哦。</div></div>';
    }
  }

  html += '</div>';
  $('rpt-content').innerHTML = html;
  $('rpt-modal').classList.add('active');
  checkBackupReminder();
}

function closeRptModal() { $('rpt-modal').classList.remove('active'); }

/* ====== 导出 / 导入 / 清空 ====== */
function exportAllData() {
  if (!records.length) { showToast('📭 还没有记录可以备份哦'); return; }
  if (isWeChat() && !confirm('检测到你正在微信内打开。\n\n微信内下载文件可能失败，建议先点右上角「···」→「在浏览器打开」再备份。\n\n仍要继续吗？')) return;
  downloadJSON({ version: 2, exportDate: nowStr(), records: records },
               '4CR成长手帐_青少年_' + curMonth() + '.json');
  markBackup();
  showToast('💾 备份已下载，请妥善保存');
}

function downloadRptJSON() {
  if (!curReport) { showToast('⚠️ 请先生成报告'); return; }
  if (isWeChat() && !confirm('微信内下载可能失败，建议点右上角「···」→「在浏览器打开」。\n\n仍要继续吗？')) return;
  downloadJSON(curReport, '4CR月度报告_青少年_' + curReport.month + '.json');
  showToast('📁 报告已导出');
}

function downloadJSON(data, filename) {
  try {
    var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
  } catch(e) {
    showToast('⚠️ 导出失败，请换个浏览器再试');
  }
}

function openImport() { $('imp-file').click(); }

function importData(e) {
  var file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      var list = Array.isArray(data) ? data : (data && data.records);
      if (!list || !list.length) { showToast('⚠️ 文件里没有可导入的记录'); return; }
      pendingImport = list;
      $('imp-modal').classList.add('active');
    } catch(err) {
      showToast('⚠️ 打不开这个文件，请确认是本工具导出的 JSON');
    }
  };
  reader.onerror = function(){ showToast('⚠️ 文件读取失败'); };
  reader.readAsText(file);
}

function closeImport() {
  pendingImport = null;
  $('imp-modal').classList.remove('active');
}

function execImport(mode) {
  if (!pendingImport) { closeImport(); return; }
  var list = pendingImport, msg;

  if (mode === 'replace') {
    records = list.slice();
    msg = '📥 已覆盖导入 ' + list.length + ' 条记录';
  } else {
    var seen = {};
    for (var i = 0; i < records.length; i++) if (records[i].id) seen[records[i].id] = 1;
    var added = 0;
    for (var j = 0; j < list.length; j++) {
      var r = list[j];
      if (!r || typeof r !== 'object') continue;
      if (r.id && seen[r.id]) continue;
      if (r.id) seen[r.id] = 1;
      records.push(r);
      added++;
    }
    msg = added ? '📥 合并完成，新增 ' + added + ' 条记录' : '✅ 数据已是最新，没有新增记录';
  }

  persist();
  refreshLists();
  closeImport();
  showToast(msg);
}

function showConfirm() { $('cfm-modal').classList.add('active'); }
function closeConfirm() { $('cfm-modal').classList.remove('active'); }
function execClear() {
  records = [];
  persist();
  refreshLists();
  closeConfirm();
  showToast('🗑️ 已清空所有记录');
}

/* ====== 启动 ====== */
init();
