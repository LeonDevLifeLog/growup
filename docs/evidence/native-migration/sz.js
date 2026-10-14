
/* ============ 常量 ============ */
var STORAGE_KEY = 'digitalNavigatorLogs';
var FEEDBACK_KEY = 'digitalNavigatorFeedback';
var BACKUP_KEY = 'digitalNavigatorLastBackup';

function $(id){ return document.getElementById(id); }
function pad2(n){ return String(n).padStart(2,'0'); }
function nowStr(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function isWeChat(){ return /MicroMessenger/i.test(navigator.userAgent); }

/* ============ 导出核心 ============ */
function downloadFile(content, filename, mimeType){
  try{
    var blob = new Blob([content], {type: mimeType || 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    return true;
  }catch(e){ return false; }
}
function downloadFileBase64(content, filename){
  try{
    var base64 = btoa(unescape(encodeURIComponent(content)));
    var link = document.createElement('a');
    link.href = 'data:application/octet-stream;charset=utf-8;base64,' + base64;
    link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    return true;
  }catch(e){ return false; }
}
function exportData(data, filename, label){
  label = label || '数据';
  if(!data || (Array.isArray(data) && data.length === 0)){
    alert('暂无' + label + '可导出'); return;
  }
  var dataStr = JSON.stringify(data, null, 2);
  if(isWeChat()){
    $('wxExportText').value = dataStr;
    $('wxExportModal').classList.add('open');
    $('wxDownloadBtn').dataset.content = dataStr;
    $('wxDownloadBtn').dataset.filename = filename;
  }else{
    if(downloadFile(dataStr, filename)){ markBackup(); alert('✅ ' + label + '已导出！'); }
    else alert('导出失败，请重试');
  }
}
function markBackup(){
  try{ localStorage.setItem(BACKUP_KEY, String(Date.now())); }catch(e){}
  renderBackupInfo();
}
function getLastBackup(){ try{ return Number(localStorage.getItem(BACKUP_KEY)||0); }catch(e){ return 0; } }

function renderBackupInfo(){
  var el = $('bakTime'), ex = $('bakExtra');
  if(!el) return;
  var t = getLastBackup();
  if(!t){
    el.textContent = '从未备份'; el.className = 'bak-tag warn';
    ex.textContent = (JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').length) ? '（建议马上备份一次）' : '';
    return;
  }
  var days = Math.floor((Date.now() - t) / 86400000);
  var d = new Date(t);
  el.textContent = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) + '（' + (days===0?'今天':days+'天前') + '）';
  el.className = days >= 30 ? 'bak-tag warn' : 'bak-tag';
  ex.textContent = days >= 30 ? '⚠️ 超过30天没备份了' : '';
}
function checkBackupReminder(){
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if(!records.length){ $('bakBanner').style.display = 'none'; return; }
  var t = getLastBackup();
  var days = t ? Math.floor((Date.now() - t) / 86400000) : 999;
  if(days >= 30){
    $('bakBanner').style.display = 'flex';
  }else{
    $('bakBanner').style.display = 'none';
  }
}

/* ============ 初始化日期 ============ */
$('logDate').valueAsDate = new Date();
$('feedbackDate').valueAsDate = new Date();

/* ============ Tab 切换 ============ */
function switchTab(tabName){
  document.querySelectorAll('.tab-content').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(el){ el.classList.remove('active'); });
  $(tabName + '-tab').classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(function(tab){
    var txt = tab.textContent;
    if(tabName==='record' && txt.indexOf('今日记录')>-1) tab.classList.add('active');
    if(tabName==='history' && txt.indexOf('历史轨迹')>-1) tab.classList.add('active');
    if(tabName==='feedback' && txt.indexOf('追踪反馈')>-1) tab.classList.add('active');
  });
  if(tabName === 'history'){ loadHistory(); updateAnalytics(); renderBackupInfo(); checkBackupReminder(); }
  if(tabName === 'feedback'){ loadFeedbackHistory(); updateFeedbackAnalytics(); }
  var fv = $('formValidation'), fb = $('feedbackValidation');
  if(fv) fv.classList.remove('show');
  if(fb) fb.classList.remove('show');
}

/* ============ 保存日常记录 ============ */
$('dailyLogForm').addEventListener('submit', function(e){
  e.preventDefault();
  var requiredFields = this.querySelectorAll('[required]');
  var allValid = true;
  var validationMsg = $('formValidation');
  requiredFields.forEach(function(field){
    if(field.tagName==='SELECT' || field.tagName==='INPUT'){
      if(!field.value || field.value.trim()===''){
        allValid = false;
        field.style.borderColor = '#E74C3C';
        setTimeout(function(){ field.style.borderColor = ''; }, 2000);
      }else{ field.style.borderColor = ''; }
    }
  });
  var screenTime = $('screenTime');
  if(screenTime.value && parseInt(screenTime.value) <= 0){
    allValid = false;
    screenTime.style.borderColor = '#E74C3C';
    setTimeout(function(){ screenTime.style.borderColor = ''; }, 2000);
  }
  if(!allValid){ validationMsg.classList.add('show'); validationMsg.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  validationMsg.classList.remove('show');

  var record = {
    id: Date.now(),
    date: $('logDate').value,
    deviceType: $('deviceType').value,
    context: $('context').value,
    screenTime: parseInt($('screenTime').value) || 0,
    contentCategory: $('contentCategory').value,
    activityType: $('activityType').value,
    moodBefore: $('moodBefore').value,
    moodAfter: $('moodAfter').value,
    conflictLevel: parseInt($('conflictLevel').value),
    interventionResponse: $('interventionResponse').value,
    sleepImpact: $('sleepImpact').checked,
    checkIns: {
      goldenRule: $('goldenRule').checked,
      imaginationLoop: $('imaginationLoop').checked,
      noAIDay: $('noAIDay').checked
    },
    observations: $('observations').value,
    parentResponse: $('parentResponse').value
  };
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  alert('✅ 记录已保存！继续加油观察吧！');
  this.reset();
  $('logDate').valueAsDate = new Date();
  $('conflictValue').innerText = '1';
  $('conflictLevel').value = '1';
  document.querySelectorAll('select').forEach(function(sel){ sel.value = ''; });
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(function(cb){ cb.checked = false; });
  document.querySelectorAll('[required]').forEach(function(f){ f.style.borderColor = ''; });
  $('formValidation').classList.remove('show');
  checkBackupReminder();
});

/* ============ 历史记录 ============ */
function loadHistory(){
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  var historyList = $('historyList');
  if(records.length === 0){
    historyList.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:16px 0;font-size:13px">还没有记录，开始记录第一天吧</p>';
    return;
  }
  records.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
  var html = '';
  records.forEach(function(r){
    var conflictColor = r.conflictLevel > 3 ? '#e74c3c' : (r.conflictLevel > 1 ? '#f39c12' : '#2ecc71');
    html += '<div class="history-item">' +
      '<div class="history-date"><span>📅 ' + r.date + '</span>' +
      '<button class="delete-btn" onclick="deleteRecord(' + r.id + ')">删除</button></div>' +
      '<div class="history-detail">' +
      '<p>📱 <strong>设备：</strong>' + getDeviceText(r.deviceType) + ' | ⏱️ <strong>时长：</strong>' + r.screenTime + '分钟</p>' +
      '<p>📂 <strong>内容：</strong>' + getContentText(r.contentCategory) + ' ' + getActivityTag(r.activityType) + '</p>' +
      '<p>😊 <strong>情绪：</strong>' + getMoodText(r.moodBefore) + ' ➡️ ' + getMoodText(r.moodAfter) + '</p>' +
      '<p>💥 <strong>冲突指数：</strong><span style="color:' + conflictColor + ';font-weight:700">' + r.conflictLevel + '/5</span> | 🛑 <strong>叫停反应：</strong>' + getInterventionText(r.interventionResponse) + '</p>' +
      (r.sleepImpact ? '<p>🌙 <strong style="color:#e74c3c">睡得晚了</strong></p>' : '') +
      '<p>✅ <strong>打卡：</strong>' +
      (r.checkIns.goldenRule ? '🏠黄金法则 ' : '') +
      (r.checkIns.imaginationLoop ? '🎨想象力循环 ' : '') +
      (r.checkIns.noAIDay ? '🧠AI断舍离' : '') +
      (!r.checkIns.goldenRule && !r.checkIns.imaginationLoop && !r.checkIns.noAIDay ? '暂无' : '') + '</p>' +
      (r.observations ? '<p>👁️ <strong>观察：</strong>' + r.observations + '</p>' : '') +
      '</div></div>';
  });
  historyList.innerHTML = html;
}

function getDeviceText(v){ var m={smartphone:'手机',tablet:'平板',computer:'电脑',console:'游戏机'}; return m[v]||v; }
function getContentText(v){ var m={short_video:'短视频',gaming:'游戏',social_media:'社交媒体',watching:'长视频',learning:'学习',creating:'创作',reading:'阅读/播客'}; return m[v]||v; }
function getMoodText(v){ var m={bored:'无聊',anxious:'焦虑',sad:'沮丧',tired:'疲惫',happy:'开心',seeking:'想找东西看',relaxed:'放松',inspired:'有启发',guilty:'内疚',more_anxious:'更焦虑',numb:'空空的'}; return m[v]||v; }
function getInterventionText(v){ var m={voluntary:'主动放下',compliant:'催了才放下',reluctant:'不情愿/拖着',resistant:'发脾气或偷玩'}; return m[v]||v; }
function getActivityTag(type){
  if(type==='passive') return '<span class="tag tag-junk">被动消费</span>';
  if(type==='active') return '<span class="tag tag-nutrition">主动创造</span>';
  if(type==='social') return '<span class="tag tag-social">社交</span>';
  if(type==='mixed') return '<span class="tag tag-mixed">混合</span>';
  return '';
}
function deleteRecord(id){
  if(!confirm('确定删除这条记录吗？')) return;
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY));
  records = records.filter(function(r){ return r.id !== id; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  loadHistory(); updateAnalytics();
}
function clearAllData(){
  var msg = '⚠️ 警告：将永久删除所有日常记录，确定继续吗？\n\n建议先点「备份」导出文件。';
  if(!confirm(msg)) return;
  localStorage.removeItem(STORAGE_KEY);
  loadHistory(); updateAnalytics(); renderBackupInfo(); checkBackupReminder();
}
function backupData(){
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if(records.length === 0){ alert('暂无数据可备份'); return; }
  var backupData = { metadata:{ type:"Digital_Navigator_Backup", backupDate:new Date().toISOString(), totalRecords:records.length }, records:records };
  var jsonString = JSON.stringify(backupData, null, 2);
  var filename = 'Digital_Navigator_Backup_' + new Date().toISOString().slice(0,10) + '.json';

  if(isWeChat()){
    $('wxExportText').value = jsonString;
    $('wxExportModal').classList.add('open');
    $('wxDownloadBtn').dataset.content = jsonString;
    $('wxDownloadBtn').dataset.filename = filename;
    return;
  }
  if(downloadFile(jsonString, filename)){
    markBackup();
    alert('✅ 备份文件已下载！');
  }else{ alert('导出失败，请重试'); }
}

/* ============ 导出JSON（带天数校验） ============ */
function exportAsJSON(){
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if(records.length === 0){ alert('暂无数据可导出'); return; }
  var uniqueDates = new Set(records.map(function(r){ return r.date; }));
  if(uniqueDates.size < 5){
    alert('💡 再坚持一下哦！\n目前记录了 ' + uniqueDates.size + ' 天，至少需要 5 天才能导出分析。');
    return;
  }
  var exportObj = {
    metadata: { source:"Digital_Navigator_Family_Log", exportDate:new Date().toISOString(), totalRecords:records.length, recordedDays:uniqueDates.size },
    dataDictionary: {},
    records: records.sort(function(a,b){ return new Date(a.date) - new Date(b.date); })
  };
  exportData(exportObj, 'Digital_Navigator_Log_' + new Date().toISOString().slice(0,10) + '.json', '数据');
}
function exportFeedbackJSON(){
  var data = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  if(data.length === 0){ alert('暂无反馈数据'); return; }
  exportData(data, 'Feedback_' + new Date().toISOString().slice(0,10) + '.json', '反馈数据');
}

/* ============ 微信弹窗事件 ============ */
$('wxDownloadBtn').addEventListener('click', function(){
  var content = this.dataset.content, filename = this.dataset.filename;
  if(!content || !filename){ alert('数据缺失，请重新导出'); return; }
  var ok = downloadFile(content, filename);
  if(!ok) ok = downloadFileBase64(content, filename);
  if(ok){ markBackup(); alert('✅ 下载已开始'); }
  else alert('下载失败，请使用「复制全部」保存');
});
$('wxCopyBtn').addEventListener('click', function(){
  var textarea = $('wxExportText');
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try{
    document.execCommand('copy');
    markBackup();
    alert('✅ 已复制，请粘贴到备忘录保存为 .json 文件');
  }catch(e){
    if(navigator.clipboard){ navigator.clipboard.writeText(textarea.value).then(function(){ markBackup(); alert('✅ 已复制到剪贴板'); }); }
    else alert('复制失败，请长按文本手动复制');
  }
});
$('wxCloseBtn').addEventListener('click', function(){ $('wxExportModal').classList.remove('open'); });

/* ============ 导入功能 ============ */
var pendingImport = null;
$('importFile').addEventListener('change', function(e){
  var file = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      var data = JSON.parse(ev.target.result);
      var list = Array.isArray(data) ? data : (data && data.records);
      if(!list || !list.length){ alert('文件里没有可导入的记录'); return; }
      pendingImport = list;
      $('importCount').textContent = list.length;
      $('importChoiceModal').classList.add('active');
    }catch(err){ alert('文件格式不对，请选择本工具导出的 JSON'); }
  };
  reader.readAsText(file);
});
function closeImportChoice(){ pendingImport = null; $('importChoiceModal').classList.remove('active'); }
function execImport(mode){
  if(!pendingImport){ closeImportChoice(); return; }
  var list = pendingImport;
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  var msg;
  if(mode === 'replace'){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    msg = '已覆盖导入 ' + list.length + ' 条记录';
  }else{
    /* 按 date+id 去重合并 */
    var seen = {};
    records.forEach(function(r){ seen[(r.date||'') + '|' + (r.id||'')] = 1; });
    var added = 0;
    list.forEach(function(r){
      if(!r || typeof r !== 'object') return;
      var key = (r.date||'') + '|' + (r.id||'');
      if(seen[key]) return;
      seen[key] = 1;
      records.push(r);
      added++;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    msg = added ? '合并完成，新增 ' + added + ' 条记录' : '数据已是最新，没有新增记录';
  }
  closeImportChoice();
  loadHistory(); updateAnalytics(); renderBackupInfo(); checkBackupReminder();
  alert('📥 ' + msg);
}

/* ============ 数据分析 ============ */
function updateAnalytics(){
  var records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  var totalDays = records.length;
  $('totalDays').innerText = totalDays;
  if(totalDays === 0){
    $('avgConflict').innerText = '0';
    $('voluntaryRate').innerText = '0%';
    $('goldenRate').innerText = '0%';
    return;
  }
  var totalConflict = records.reduce(function(s,r){ return s + r.conflictLevel; }, 0);
  $('avgConflict').innerText = (totalConflict / totalDays).toFixed(1);
  var voluntaryCount = records.filter(function(r){ return r.interventionResponse === 'voluntary'; }).length;
  $('voluntaryRate').innerText = Math.round((voluntaryCount / totalDays) * 100) + '%';
  var goldenCount = records.filter(function(r){ return r.checkIns && r.checkIns.goldenRule === true; }).length;
  $('goldenRate').innerText = Math.round((goldenCount / totalDays) * 100) + '%';
}

/* ============ 追踪反馈 ============ */
$('feedbackForm').addEventListener('submit', function(e){
  e.preventDefault();
  var required = ['feedbackDate','serviceType','serviceTopic','relationshipImprove','parentEfficacy'];
  var allValid = true;
  var valMsg = $('feedbackValidation');
  required.forEach(function(id){
    var el = $(id);
    if(!el.value || el.value.trim() === ''){
      allValid = false;
      el.style.borderColor = '#E74C3C';
      setTimeout(function(){ el.style.borderColor = ''; }, 2000);
    }else{ el.style.borderColor = ''; }
  });
  if(!allValid){ valMsg.classList.add('show'); valMsg.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  valMsg.classList.remove('show');

  var feedback = {
    id: Date.now(),
    date: $('feedbackDate').value,
    serviceType: $('serviceType').value,
    serviceTopic: $('serviceTopic').value.trim(),
    screenChange: $('screenChange').value,
    relationshipImprove: parseInt($('relationshipImprove').value),
    attitudeChange: $('attitudeChange').value,
    parentEfficacy: parseInt($('parentEfficacy').value),
    followUpAction: $('followUpAction').checked,
    childFeedback: $('childFeedback').checked,
    notes: $('feedbackNotes').value.trim()
  };
  var feedbacks = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  feedbacks.push(feedback);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
  alert('✅ 反馈已保存！');
  this.reset();
  $('feedbackDate').valueAsDate = new Date();
  $('relImproveVal').innerText = '3';
  $('relationshipImprove').value = '3';
  $('parentEfficacyVal').innerText = '3';
  $('parentEfficacy').value = '3';
  document.querySelectorAll('#feedbackForm .checkbox-group input[type="checkbox"]').forEach(function(cb){ cb.checked = false; });
  $('feedbackValidation').classList.remove('show');
  loadFeedbackHistory(); updateFeedbackAnalytics();
});

function loadFeedbackHistory(){
  var feedbacks = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  var container = $('feedbackHistoryList');
  if(feedbacks.length === 0){
    container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:12px 0">暂无反馈记录</p>';
    return;
  }
  feedbacks.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
  var html = '';
  feedbacks.forEach(function(f){
    var relColor = f.relationshipImprove > 3 ? '#2ecc71' : (f.relationshipImprove > 2 ? '#f39c12' : '#e74c3c');
    html += '<div class="history-item">' +
      '<div class="history-date"><span>📅 ' + f.date + ' <span class="badge">' + getServiceTypeText(f.serviceType) + '</span></span>' +
      '<button class="delete-btn" onclick="deleteFeedback(' + f.id + ')">删除</button></div>' +
      '<div class="history-detail">' +
      '<p><strong>主题：</strong>' + f.serviceTopic + '</p>' +
      '<p>📈 关系改善度: <span style="color:' + relColor + ';font-weight:700">' + f.relationshipImprove + '/5</span>  |  💪 家长效能: ' + f.parentEfficacy + '/5</p>' +
      '<p>📱 屏幕变化: ' + getScreenChangeText(f.screenChange) + '  |  🧠 态度: ' + getAttitudeText(f.attitudeChange) + '</p>' +
      '<p>✅ ' + (f.followUpAction ? '📋后续行动 ' : '') + (f.childFeedback ? '🗣️孩子分享了感受 ' : '') + '</p>' +
      (f.notes ? '<p>📝 ' + f.notes + '</p>' : '') +
      '</div></div>';
  });
  container.innerHTML = html;
}
function getServiceTypeText(v){ var m={online_course:'线上课',offline_workshop:'线下工作坊',consultation:'咨询',family_coach:'家庭教练',other:'其他'}; return m[v]||v; }
function getScreenChangeText(v){ var m={decrease:'明显减少',slight_decrease:'稍微减少',no_change:'无变化',increase:'增加'}; return m[v]||v; }
function getAttitudeText(v){ var m={more_positive:'更积极了',neutral:'没怎么变',more_resistant:'更抗拒了'}; return m[v]||v; }
function deleteFeedback(id){
  if(!confirm('删除这条反馈吗？')) return;
  var list = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  list = list.filter(function(f){ return f.id !== id; });
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
  loadFeedbackHistory(); updateFeedbackAnalytics();
}
function clearFeedbackData(){
  if(!confirm('⚠️ 永久删除所有反馈记录？')) return;
  localStorage.removeItem(FEEDBACK_KEY);
  loadFeedbackHistory(); updateFeedbackAnalytics();
}
function updateFeedbackAnalytics(){
  var list = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  var total = list.length;
  $('fbTotal').innerText = total;
  if(total === 0){
    $('fbAvgRel').innerText = '0.0';
    $('fbAvgEfficacy').innerText = '0.0';
    $('fbScreenDecrease').innerText = '0%';
    return;
  }
  var sumRel = list.reduce(function(s,f){ return s + f.relationshipImprove; }, 0);
  var sumEff = list.reduce(function(s,f){ return s + f.parentEfficacy; }, 0);
  $('fbAvgRel').innerText = (sumRel / total).toFixed(1);
  $('fbAvgEfficacy').innerText = (sumEff / total).toFixed(1);
  var decreaseCount = list.filter(function(f){ return f.screenChange === 'decrease' || f.screenChange === 'slight_decrease'; }).length;
  $('fbScreenDecrease').innerText = Math.round((decreaseCount / total) * 100) + '%';
}

/* ============ 弹窗控制 ============ */
function openConceptModal(){ $('conceptModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeConceptModal(){ $('conceptModal').classList.remove('active'); document.body.style.overflow = ''; }
$('conceptModal').addEventListener('click', function(e){ if(e.target === this) closeConceptModal(); });
$('importChoiceModal').addEventListener('click', function(e){ if(e.target === this) closeImportChoice(); });

/* ============ 初始化 ============ */
window.onload = function(){
  loadHistory();
  updateAnalytics();
  loadFeedbackHistory();
  updateFeedbackAnalytics();
  renderBackupInfo();
  checkBackupReminder();
  switchTab('record');
};
