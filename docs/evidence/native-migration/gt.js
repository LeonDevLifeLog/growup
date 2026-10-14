

(function() {
  var STORAGE_KEY = 'commRecords';
  var BACKUP_KEY = 'commLastBackup';

  /* ============ 工具 ============ */
  function $(id){ return document.getElementById(id); }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function curDate(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
  function nowStr(){
    var d=new Date();
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes());
  }
  function isWeChat(){ return /MicroMessenger/i.test(navigator.userAgent); }

  // 初始化日期
  document.querySelectorAll('input[type="date"]').forEach(function(input){
    input.value = curDate();
  });

  /* ============ Toast ============ */
  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.body.appendChild(toastEl);
  var toastTimer;
  function showToast(msg, icon){
    toastEl.innerHTML = '<i class="fas ' + (icon||'fa-check-circle') + '"></i> ' + msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  /* ============ 弹窗 ============ */
  function openModal(id){ $(id).classList.add('open'); }
  function closeModal(id){ $(id).classList.remove('open'); }
  window.closeModal = closeModal;
  document.querySelectorAll('.modal-mask, .help-mask').forEach(function(m){
    m.addEventListener('click', function(e){ if(e.target===m) m.classList.remove('open'); });
  });

  /* ============ 帮助 ============ */
  $('helpBtnOpen').addEventListener('click', function(){ $('helpMask').classList.add('open'); });
  $('helpBtnClose').addEventListener('click', function(){ $('helpMask').classList.remove('open'); });

  /* ============ Tab 切换 ============ */
  document.querySelectorAll('.tab-item').forEach(function(tab){
    tab.addEventListener('click', function(){
      var target = tab.dataset.tab;
      document.querySelectorAll('.tab-item').forEach(function(t){ t.classList.remove('active','green'); });
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      if(target === 'practice') tab.classList.add('green');
      $('panel-' + target).classList.add('active');
      window.scrollTo({ top:0, behavior:'smooth' });
    });
  });

  /* ============ 滑块 ============ */
  document.querySelectorAll('input[type="range"]').forEach(function(slider){
    slider.addEventListener('input', function(){
      var valSpan = slider.parentElement.querySelector('.text-orange-700');
      if(valSpan) valSpan.textContent = slider.value;
    });
  });

  /* ============ Chip 点击 ============ */
  document.body.addEventListener('click', function(e){
    var target = e.target.closest('.chip');
    if(!target) return;
    var container = target.parentElement;
    var factor = container.dataset.factor;
    if(!factor) return;
    var isMulti = container.dataset.multi === 'true';
    if(isMulti){
      target.classList.toggle('active');
    } else {
      container.querySelectorAll('.active').forEach(function(c){ c.classList.remove('active'); });
      target.classList.add('active');
    }
  });

  /* ============ 表单数据 ============ */
  function getCurrentFormData(){
    var activePanel = document.querySelector('.tab-panel.active');
    var data = { type: activePanel.id.replace('panel-','') };

    activePanel.querySelectorAll('[data-factor]').forEach(function(container){
      var factor = container.dataset.factor;
      var isMulti = container.dataset.multi === 'true';
      var activeChips = container.querySelectorAll('.chip.active');
      if(isMulti){
        data[factor] = Array.prototype.map.call(activeChips, function(c){ return c.dataset.value; });
      } else {
        data[factor] = activeChips.length > 0 ? activeChips[0].dataset.value : '';
      }
    });

    activePanel.querySelectorAll('[data-field]').forEach(function(input){
      data[input.dataset.field] = input.value.trim();
    });

    var d = new Date();
    data.timestamp = d.toISOString();
    data.dateStr = d.toLocaleDateString('zh-CN');
    return data;
  }

  function resetForm(){
    var activePanel = document.querySelector('.tab-panel.active');
    activePanel.querySelectorAll('.active').forEach(function(c){ c.classList.remove('active'); });
    activePanel.querySelectorAll('[data-field]').forEach(function(input){
      if(input.type === 'date'){
        input.value = curDate();
      } else if(input.type === 'range'){
        input.value = 5;
        var valSpan = input.parentElement.querySelector('.text-orange-700');
        if(valSpan) valSpan.textContent = '5';
      } else {
        input.value = '';
      }
    });
    showToast('记录已保存，表单已重置');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  /* ============ 存储 ============ */
  function loadRecords(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveRecords(list){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; }
    catch(e){ showToast('存储失败，请先备份再清空','fa-triangle-exclamation'); return false; }
  }

  /* ============ 保存当前面板 ============ */
  window.saveCurrentPanel = function(){
    var formData = getCurrentFormData();
    var hasContent = formData.trigger || formData.methodUsed || formData.practiceScene ||
                     formData.courseName ||
                     (formData.scene && formData.scene.length);
    if(!hasContent){
      showToast('请至少填写部分内容再保存', 'fa-triangle-exclamation');
      return;
    }
    var records = loadRecords();
    records.push(formData);
    if(saveRecords(records)){
      renderHistory();
      resetForm();
    }
  };

  /* ============ 历史渲染 ============ */
  function renderHistory(){
    var records = loadRecords();
    var today = new Date().toLocaleDateString('zh-CN');

    $('totalCount').textContent = records.length;
    $('todayCount').textContent = records.filter(function(r){ return r.dateStr === today; }).length;
    $('practiceCount').textContent = records.filter(function(r){ return r.type === 'practice'; }).length;

    var container = $('historyContainer');
    if(records.length === 0){
      container.innerHTML = '<p class="text-sm mb-4" style="color:var(--color-text-secondary)">还没有记录，填写完上面的内容后，点击"保存"就可以看到啦。</p>';
      container.classList.remove('scrollable');
      return;
    }

    var html = '';
    for(var i = records.length - 1; i >= 0; i--){
      var r = records[i];
      var isPractice = r.type === 'practice';
      var title = isPractice ? (r.courseName || '未命名课程')
                             : (r.scene ? (Array.isArray(r.scene) ? r.scene.join('/') : r.scene) : '日常沟通');
      html += '<div class="record-card ' + (isPractice ? 'practice' : '') + '">' +
              '<div class="flex justify-between items-center mb-1">' +
              '<span class="font-serif font-bold text-sm" style="color:var(--color-text);">' +
              (r.dateStr || '') + ' · ' + title + '</span>' +
              '<button class="text-xs text-red-500 delete-btn" data-idx="' + i + '">删除</button>' +
              '</div>' +
              '<div class="text-xs" style="color:var(--color-text-secondary);">' +
              ((r.trigger || r.practiceScene || '无详细描述').substring(0,60)) + '</div></div>';
    }
    container.innerHTML = html;

    if(records.length > 3){
      container.classList.add('scrollable');
    } else {
      container.classList.remove('scrollable');
    }

    container.querySelectorAll('.delete-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
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
  function getLastBackup(){
    try { return Number(localStorage.getItem(BACKUP_KEY) || 0); }
    catch(e){ return 0; }
  }
  function markBackup(){
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch(e){}
    renderBackupInfo();
  }
  function renderBackupInfo(){
    var el = $('bakTime'), extra = $('bakExtra');
    if(!el) return;
    var t = getLastBackup();
    if(!t){
      el.textContent = '从未备份';
      el.className = 'bak-tag warn';
      if(extra) extra.textContent = loadRecords().length ? '（建议马上备份一次）' : '';
      return;
    }
    var days = Math.floor((Date.now() - t) / 86400000);
    var d = new Date(t);
    el.textContent = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) +
                     '（' + (days === 0 ? '今天' : days + '天前') + '）';
    el.className = days >= 30 ? 'bak-tag warn' : 'bak-tag';
    if(extra) extra.textContent = days >= 30 ? '⚠️ 超过30天没备份了' : '';
  }
  function checkBackupReminder(){
    var records = loadRecords();
    if(!records.length) return;
    var t = getLastBackup();
    var days = t ? Math.floor((Date.now() - t) / 86400000) : 999;
    if(days >= 30){
      setTimeout(function(){
        showToast((t ? '已 ' + days + ' 天未备份' : '还没有备份过') + '，建议到「数据管理」备份一次', 'fa-clock');
      }, 1500);
    }
  }

  /* ============ 下载 ============ */
  function downloadFile(content, filename){
    try {
      var blob = new Blob([content], { type:'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch(e){ return false; }
  }

  /* ============ 备份按钮 ============ */
  $('backupBtn').addEventListener('click', function(){
    var records = loadRecords();
    if(!records.length){ showToast('还没有记录可以备份哦', 'fa-inbox'); return; }

    var dataStr = JSON.stringify({ version:2, exportDate:nowStr(), records:records }, null, 2);
    var filename = '沟通手帐_' + curDate() + '.json';

    if(isWeChat()){
      $('wcTextarea').value = dataStr;
      $('wcDownloadBtn').dataset.content = dataStr;
      $('wcDownloadBtn').dataset.filename = filename;
      openModal('wcModal');
      return;
    }

    if(downloadFile(dataStr, filename)){
      markBackup();
      showToast('备份已下载，请妥善保存');
    } else {
      showToast('导出失败，请重试', 'fa-triangle-exclamation');
    }
  });

  /* ============ 微信弹窗按钮 ============ */
  $('wcDownloadBtn').addEventListener('click', function(){
    var content = this.dataset.content;
    var filename = this.dataset.filename;
    if(!content || !filename){ showToast('数据缺失，请重新导出', 'fa-triangle-exclamation'); return; }
    if(downloadFile(content, filename)){
      markBackup();
      showToast('下载已开始');
      closeModal('wcModal');
      return;
    }
    if(downloadFileBase64(content, filename)){
      markBackup();
      showToast('下载已开始');
      closeModal('wcModal');
      return;
    }
    showToast('下载失败，请使用「复制全部」', 'fa-triangle-exclamation');
  });

  $('wcCopyBtn').addEventListener('click', function(){
    var ta = $('wcTextarea');
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      markBackup();
      showToast('已复制，请粘贴到备忘录保存为 .json');
    } catch(e){
      if(navigator.clipboard){
        navigator.clipboard.writeText(ta.value).then(function(){
          markBackup();
          showToast('已复制到剪贴板');
        });
      } else {
        showToast('复制失败，请长按文本手动复制', 'fa-triangle-exclamation');
      }
    }
  });

  /* ============ 导入 ============ */
  var pendingImport = null;

  $('importBtn').addEventListener('click', function(){
    $('importFile').click();
  });

  $('importFile').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var data = JSON.parse(ev.target.result);
        var list = Array.isArray(data) ? data : (data && data.records);
        if(!list || !list.length){ showToast('文件里没有可导入的记录', 'fa-triangle-exclamation'); return; }
        pendingImport = list;
        openModal('importMask');
      } catch(err){
        showToast('打不开这个文件，请确认是本工具导出的 JSON', 'fa-triangle-exclamation');
      }
    };
    reader.onerror = function(){ showToast('文件读取失败', 'fa-triangle-exclamation'); };
    reader.readAsText(file);
  });

  window.closeImport = function(){
    pendingImport = null;
    closeModal('importMask');
  };

  window.execImport = function(mode){
    if(!pendingImport){ closeImport(); return; }
    var list = pendingImport;
    var msg;
    if(mode === 'replace'){
      saveRecords(list);
      msg = '已覆盖导入 ' + list.length + ' 条记录';
    } else {
      var records = loadRecords();
      var seen = {};
      records.forEach(function(r){
        if(r && r.timestamp) seen[r.timestamp + '|' + (r.type||'')] = 1;
      });
      var added = 0;
      list.forEach(function(r){
        if(!r || typeof r !== 'object') return;
        var key = r.timestamp + '|' + (r.type||'');
        if(seen[key]) return;
        seen[key] = 1;
        records.push(r);
        added++;
      });
      saveRecords(records);
      msg = added ? ('合并完成，新增 ' + added + ' 条记录') : '数据已是最新，没有新增记录';
    }
    renderHistory();
    renderBackupInfo();
    closeImport();
    checkBackupReminder();
    showToast(msg);
  };

  /* ============ 清空 ============ */
  $('clearBtn').addEventListener('click', function(){
    openModal('clearMask');
  });

  window.execClear = function(){
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    renderBackupInfo();
    closeModal('clearMask');
    showToast('已清空所有记录');
  };

  /* ============ 移动端输入框防键盘遮挡 ============ */
  document.querySelectorAll('input, textarea').forEach(function(el){
    el.addEventListener('focus', function(){
      setTimeout(function(){
        el.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 300);
    });
  });

  /* ============ 初始化 ============ */
  renderHistory();
  renderBackupInfo();
  checkBackupReminder();
})();
