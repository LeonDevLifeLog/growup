

(function() {
  var STORAGE_KEY = 'growth_self_records';
  var BACKUP_KEY = 'growth_self_last_backup';

  var GENDER_CONFIG = {
    male: {
      label: '男生',
      bodyChanges: [
        { value: 'height', label: '身高增长' }, { value: 'weight', label: '体重增加' },
        { value: 'voice', label: '声音变粗' }, { value: 'bodyHair', label: '体毛生长' },
        { value: 'penis', label: '阴茎和睾丸发育' }, { value: 'wetDream', label: '遗精' },
        { value: 'muscle', label: '肌肉增长' }, { value: 'acne', label: '面部痤疮' }
      ],
      knowledgeNeed: [
        { value: 'bodyChange', label: '身体发育细节' }, { value: 'masturbation', label: '自慰是否正常' },
        { value: 'relationship', label: '恋爱与情感' }, { value: 'protection', label: '避孕与防护' }
      ]
    },
    female: {
      label: '女生',
      bodyChanges: [
        { value: 'height', label: '身高增长' }, { value: 'weight', label: '体重增加' },
        { value: 'breast', label: '乳房发育' }, { value: 'bodyHair', label: '体毛生长' },
        { value: 'menstruation', label: '月经初潮' }, { value: 'hip', label: '臀部变化' },
        { value: 'discharge', label: '分泌物变化' }, { value: 'acne', label: '面部痤疮' },
        { value: 'dysmenorrhea', label: '痛经' }
      ],
      knowledgeNeed: [
        { value: 'bodyChange', label: '身体发育细节' }, { value: 'menstrualCare', label: '月经护理' },
        { value: 'relationship', label: '恋爱与情感' }, { value: 'protection', label: '避孕与防护' }
      ]
    }
  };

  var currentGender = 'male';

  /* ============ 工具函数 ============ */
  function $(id){ return document.getElementById(id); }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function curDate(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
  function nowStr(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
  function isWeChat(){ return /MicroMessenger/i.test(navigator.userAgent); }

  /* ============ Toast ============ */
  var toastEl = $('toast');
  var toastTimer;
  function showToast(msg, icon){
    toastEl.innerHTML = '<span>' + (icon||'✅') + '</span> ' + msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2400);
  }

  /* ============ 弹窗 ============ */
  function openModal(id){ $(id).classList.add('open'); }
  function closeModal(id){ $(id).classList.remove('open'); }
  window.openHelp = function(){ $('helpMask').classList.add('open'); };
  window.closeHelp = function(){ $('helpMask').classList.remove('open'); };
  window.closeModal = closeModal;

  /* ============ 表单数据 ============ */
  function getFormData(){
    var data = { gender: currentGender };
    document.querySelectorAll('[data-factor]').forEach(function(container){
      var factor = container.dataset.factor;
      var isMulti = container.dataset.multi === 'true';
      var activeBtns = container.querySelectorAll('.active');
      if(isMulti){
        data[factor] = Array.prototype.map.call(activeBtns, function(b){ return b.dataset.value; });
      } else {
        data[factor] = activeBtns.length ? activeBtns[0].dataset.value : '';
      }
    });
    document.querySelectorAll('[data-note]').forEach(function(input){
      data[input.dataset.note] = input.value.trim();
    });
    var d = new Date();
    data.timestamp = d.toISOString();
    data.dateStr = d.toLocaleDateString('zh-CN');
    return data;
  }

  function resetForm(){
    document.querySelectorAll('.active').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('[data-note]').forEach(function(input){ input.value = ''; });
    showToast('记录已保存，表单已重置');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  /* ============ 渲染身体变化 ============ */
  function renderBodyChanges(gender){
    var container = $('bodyChangeGroup');
    var config = GENDER_CONFIG[gender];
    if(!config) return;

    var html = '<div class="sub-group-label">我注意到的身体变化</div>';
    html += '<div class="question-block"><h4><span class="q-num">1</span>你注意到了哪些身体变化？<span class="perspective self">自己</span></h4>';
    html += '<div class="flex flex-wrap gap-2" data-multi="true" data-factor="teenBodyChange">';
    config.bodyChanges.forEach(function(item){
      html += '<button type="button" class="tag-btn" data-value="' + item.value + '">' + item.label + '</button>';
    });
    html += '</div></div>';

    html += '<div class="question-block"><h4><span class="q-num">2</span>家人有注意到哪些变化？<span class="perspective self">自己</span></h4>';
    html += '<div class="flex flex-wrap gap-2" data-multi="true" data-factor="parentObserveBody">';
    config.bodyChanges.forEach(function(item){
      html += '<button type="button" class="tag-btn" data-value="' + item.value + '">' + item.label + '</button>';
    });
    html += '</div></div>';

    container.innerHTML = html;
  }

  /* ============ 渲染性知识需求 ============ */
  function renderKnowledgeNeed(gender){
    var container = $('knowledgeNeedContainer');
    var config = GENDER_CONFIG[gender];
    if(!config) return;
    var html = '';
    config.knowledgeNeed.forEach(function(item){
      html += '<button type="button" class="tag-btn" data-value="' + item.value + '">' + item.label + '</button>';
    });
    container.innerHTML = html;
  }

  /* ============ 性别切换 ============ */
  function setGender(gender){
    currentGender = gender;
    document.querySelectorAll('.gender-toggle .opt').forEach(function(el){
      el.classList.toggle('active', el.dataset.gender === gender);
    });
    renderBodyChanges(gender);
    renderKnowledgeNeed(gender);
    // 清除已选中的标签
    document.querySelectorAll('.tag-btn.active').forEach(function(b){ b.classList.remove('active'); });
    showToast('已切换至' + GENDER_CONFIG[gender].label + '版');
  }

  /* ============ 存储 ============ */
  function loadRecords(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveRecords(list){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; }
    catch(e){ showToast('存储失败，请先备份再清空', '⚠️'); return false; }
  }

  /* ============ 保存 ============ */
  window.saveRecord = function(){
    var data = getFormData();
    if(!data.age){
      showToast('请选择你的年龄段', '⚠️');
      return;
    }
    var records = loadRecords();
    records.push(data);
    if(saveRecords(records)){
      renderHistory();
      resetForm();
    }
  };

  /* ============ 历史渲染 ============ */
  var LABELS = {
    mood: { great:'😄很好', ok:'🙂还行', confused:'😕迷茫', anxious:'😣焦虑', sad:'😢不开心' },
    age: { '10-12':'10-12岁', '13-15':'13-15岁', '16-18':'16-18岁', other:'其他' },
    bodyAccept: { '1':'很不接受', '2':'有点别扭', '3':'一般', '4':'接受', '5':'很接受' },
    teenBodyChange: { height:'身高增长', weight:'体重增加', voice:'声音变粗', bodyHair:'体毛生长', penis:'阴茎睾丸发育', wetDream:'遗精', muscle:'肌肉增长', acne:'面部痤疮', breast:'乳房发育', menstruation:'月经初潮', hip:'臀部变化', discharge:'分泌物变化', dysmenorrhea:'痛经' },
    parentObserveBody: { height:'身高增长', voice:'声音变粗', bodyHair:'体毛', penis:'阴茎睾丸发育', wetDream:'遗精', muscle:'肌肉', acne:'面部痤疮', breast:'乳房发育', menstruation:'月经初潮', hip:'臀部变化', discharge:'分泌物', dysmenorrhea:'痛经' },
    teenBodyFeeling: { curious:'好奇', calm:'觉得很正常', shy:'害羞', worried:'担心', embarrassed:'尴尬' },
    knowledgeSource: { school:'学校课堂', family:'家庭教育', internet:'网络搜索', book:'科普书籍', peer:'同龄人交流' },
    knowledgeNeed: { bodyChange:'身体发育细节', masturbation:'自慰是否正常', relationship:'恋爱与情感', protection:'避孕与防护', menstrualCare:'月经护理' }
  };
  function lbl(factor, val){ return (LABELS[factor] && LABELS[factor][val]) || val; }

  function recordHtml(r, idx){
    var tags = [];
    if(r.gender) tags.push(r.gender === 'male' ? '👦男生' : '👧女生');
    if(r.age) tags.push(lbl('age', r.age));
    if(r.mood) tags.push(lbl('mood', r.mood));
    if(r.bodyAccept) tags.push('接受度:' + lbl('bodyAccept', r.bodyAccept));

    ['teenBodyChange','parentObserveBody','teenBodyFeeling','knowledgeSource','knowledgeNeed'].forEach(function(f){
      if(r[f]){
        var vals = Array.isArray(r[f]) ? r[f] : [r[f]];
        if(vals.length) tags.push(vals.map(function(v){ return lbl(f, v); }).join('、'));
      }
    });

    if(r.freeThoughts){
      var short = r.freeThoughts.length > 20 ? r.freeThoughts.slice(0,20) + '…' : r.freeThoughts;
      tags.push('💭 ' + short);
    }

    var h = '<div class="history-recent mb-3">' +
            '<div class="flex justify-between items-center mb-2">' +
            '<span class="font-display font-bold text-sm">' + (r.dateStr || '') + '</span>' +
            '<button class="delete-btn" data-idx="' + idx + '">删除</button>' +
            '</div><div class="flex flex-wrap gap-1.5">';
    tags.forEach(function(t){
      h += '<span style="font-size:.7rem;padding:2px 8px;border-radius:6px;background:rgba(251,146,60,.08);color:var(--text-secondary);line-height:1.4">' + t + '</span>';
    });
    h += '</div></div>';
    return h;
  }

  function renderHistory(){
    var records = loadRecords();
    $('recordCount').textContent = records.length;
    var container = $('historyContainer');
    if(!records.length){
      container.innerHTML = '<p class="text-sm mb-4" style="color:var(--text-muted)">还没有记录，填写完上面的内容后，点击"保存本次记录"就可以看到啦。</p>';
      return;
    }
    var recentN = Math.min(3, records.length);
    var html = '';
    for(var i = records.length - 1; i >= records.length - recentN; i--) html += recordHtml(records[i], i);
    if(records.length > 3){
      html += '<div class="sub-group-label">更早的记录（' + (records.length - 3) + '条）</div>';
      html += '<div class="history-older-wrap">';
      for(var i = records.length - 4; i >= 0; i--) html += recordHtml(records[i], i);
      html += '</div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('.delete-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        if(!confirm('确定删除这条记录吗？')) return;
        var idx = parseInt(btn.dataset.idx, 10);
        var list = loadRecords();
        list.splice(idx, 1);
        saveRecords(list);
        renderHistory();
        showToast('记录已删除');
      });
    });
  }

  /* ============ 备份相关 ============ */
  function getLastBackup(){ try { return Number(localStorage.getItem(BACKUP_KEY) || 0); } catch(e){ return 0; } }
  function markBackup(){ try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch(e){} renderBackupInfo(); }
  function renderBackupInfo(){
    var el = $('bakTime'), extra = $('bakExtra');
    var t = getLastBackup();
    if(!t){
      el.textContent = '从未备份'; el.className = 'bak-tag warn';
      extra.textContent = loadRecords().length ? '（建议马上备份一次）' : '';
      return;
    }
    var days = Math.floor((Date.now() - t) / 86400000);
    var d = new Date(t);
    el.textContent = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) + '（' + (days === 0 ? '今天' : days + '天前') + '）';
    el.className = days >= 30 ? 'bak-tag warn' : 'bak-tag';
    extra.textContent = days >= 30 ? '⚠️ 超过30天没备份了' : '';
  }
  function checkBackupReminder(){
    var records = loadRecords();
    if(!records.length) return;
    var t = getLastBackup();
    var days = t ? Math.floor((Date.now() - t) / 86400000) : 999;
    if(days >= 30){
      setTimeout(function(){
        showToast((t ? '已 ' + days + ' 天未备份' : '还没有备份过') + '，请到「数据管理」备份一次', '⏰');
      }, 1500);
    }
  }

  /* ============ 下载 ============ */
  function downloadFile(content, filename){
    try {
      var blob = new Blob([content], { type:'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch(e){ return false; }
  }
  function downloadFileBase64(content, filename){
    try {
      var base64 = btoa(unescape(encodeURIComponent(content)));
      var link = document.createElement('a');
      link.href = 'data:application/octet-stream;charset=utf-8;base64,' + base64;
      link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      return true;
    } catch(e){ return false; }
  }

  /* ============ 备份按钮 ============ */
  window.exportData = function(){
    var records = loadRecords();
    if(!records.length){ showToast('还没有记录可以备份哦', '📭'); return; }
    var dataStr = JSON.stringify({ version:2, exportDate:nowStr(), records:records }, null, 2);
    var filename = '青春期成长自填手帐_' + curDate() + '.json';

    if(isWeChat()){
      $('wcTextarea').value = dataStr;
      $('wcDownloadBtn').dataset.content = dataStr;
      $('wcDownloadBtn').dataset.filename = filename;
      openModal('wcModal');
      return;
    }
    if(downloadFile(dataStr, filename)){
      markBackup();
      showToast('备份已下载，请妥善保存', '💾');
    } else {
      showToast('导出失败，请重试', '⚠️');
    }
  };

  /* ============ 微信弹窗 ============ */
  $('wcDownloadBtn').addEventListener('click', function(){
    var content = this.dataset.content, filename = this.dataset.filename;
    if(!content || !filename){ showToast('数据缺失，请重新导出', '⚠️'); return; }
    if(downloadFile(content, filename)){ markBackup(); showToast('下载已开始', '💾'); closeModal('wcModal'); return; }
    if(downloadFileBase64(content, filename)){ markBackup(); showToast('下载已开始', '💾'); closeModal('wcModal'); return; }
    showToast('下载失败，请使用「复制全部」', '⚠️');
  });
  $('wcCopyBtn').addEventListener('click', function(){
    var ta = $('wcTextarea');
    ta.select(); ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      markBackup();
      showToast('已复制，请粘贴到备忘录保存', '📋');
    } catch(e){
      if(navigator.clipboard){
        navigator.clipboard.writeText(ta.value).then(function(){ markBackup(); showToast('已复制到剪贴板', '📋'); });
      } else { showToast('复制失败，请长按手动复制', '⚠️'); }
    }
  });

  /* ============ 导入 ============ */
  var pendingImport = null;
  $('importFile').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var data = JSON.parse(ev.target.result);
        var list = Array.isArray(data) ? data : (data && data.records);
        if(!list || !list.length){ showToast('文件里没有可导入的记录', '⚠️'); return; }
        pendingImport = list;
        openModal('importMask');
      } catch(err){ showToast('打不开这个文件，请确认是本工具导出的 JSON', '⚠️'); }
    };
    reader.onerror = function(){ showToast('文件读取失败', '⚠️'); };
    reader.readAsText(file);
  });

  window.closeImport = function(){ pendingImport = null; closeModal('importMask'); };

  window.execImport = function(mode){
    if(!pendingImport){ closeImport(); return; }
    var list = pendingImport, msg;
    if(mode === 'replace'){
      saveRecords(list);
      msg = '已覆盖导入 ' + list.length + ' 条记录';
    } else {
      var records = loadRecords();
      var seen = {};
      records.forEach(function(r){ if(r && r.timestamp) seen[r.timestamp + '|' + (r.gender||'')] = 1; });
      var added = 0;
      list.forEach(function(r){
        if(!r || typeof r !== 'object') return;
        var key = r.timestamp + '|' + (r.gender||'');
        if(seen[key]) return;
        seen[key] = 1; records.push(r); added++;
      });
      saveRecords(records);
      msg = added ? ('合并完成，新增 ' + added + ' 条记录') : '数据已是最新，没有新增记录';
    }
    renderHistory(); renderBackupInfo(); closeImport(); checkBackupReminder();
    showToast(msg, '📥');
  };

  /* ============ 清空 ============ */
  window.openClear = function(){ openModal('clearMask'); };
  window.execClear = function(){
    localStorage.removeItem(STORAGE_KEY);
    renderHistory(); renderBackupInfo();
    closeModal('clearMask');
    showToast('已清空所有记录', '🗑️');
  };

  /* ============ 事件委托：标签点击 ============ */
  document.body.addEventListener('click', function(e){
    var target = e.target.closest('.tag-btn');
    if(!target) return;
    if(target.classList.contains('delete-btn')) return;
    var container = target.parentElement;
    if(!container.dataset.factor) return;
    var isMulti = container.dataset.multi === 'true';
    if(isMulti){ target.classList.toggle('active'); }
    else {
      container.querySelectorAll('.active').forEach(function(b){ b.classList.remove('active'); });
      target.classList.add('active');
    }
  });

  /* ============ 性别切换事件 ============ */
  document.querySelectorAll('.gender-toggle .opt').forEach(function(el){
    el.addEventListener('click', function(){
      var gender = el.dataset.gender;
      if(gender !== currentGender) setGender(gender);
    });
  });

  /* ============ 背景星星 ============ */
  (function createStars(){
    var bg = $('starsBg');
    for(var i = 0; i < 12; i++){
      var s = document.createElement('div');
      s.className = 'star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      var size = Math.random() * 3 + 2;
      s.style.width = size + 'px'; s.style.height = size + 'px';
      s.style.setProperty('--dur', (Math.random() * 3 + 2) + 's');
      bg.appendChild(s);
    }
  })();

  /* ============ 初始化 ============ */
  $('todayDate').textContent = new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' });
  setGender('male');
  renderHistory();
  renderBackupInfo();
  checkBackupReminder();
})();
