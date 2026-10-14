

/* ================= 常量 & 标签映射（女生版） ================= */
var STORAGE_KEY = 'growthRecords';
var BACKUP_KEY = 'growthLastBackup';

var LABELS = {
  context: {daily:'日常观察',offlineCourse:'线下课程',onlineCourse:'线上课程',parentTalk:'亲子对话',consultation:'专业咨询'},
  mood: {great:'😄很好',ok:'🙂还行',confused:'😕迷茫',anxious:'😣焦虑',sad:'😢不开心'},
  age: {'10-12':'10-12岁','13-15':'13-15岁','16-18':'16-18岁',other:'其他'},
  bodyAccept: {'1':'很不接受','2':'有点别扭','3':'一般','4':'接受','5':'很接受'},
  parentObserve: {'1':'比较困扰','2':'有些困扰','3':'一般','4':'较好','5':'很好'},
  teenBodyChange: {height:'身高增长',weight:'体重增加',breast:'乳房发育',bodyHair:'体毛生长',menstruation:'月经初潮',hip:'臀部变化',discharge:'分泌物变化',acne:'面部痤疮',dysmenorrhea:'痛经'},
  parentObserveBody: {height:'身高增长',bodyHair:'体毛',breast:'乳房发育',menstruation:'月经初潮',hip:'臀部变化',acne:'面部痤疮'},
  teenBodyFeeling: {curious:'好奇',calm:'觉得很正常',shy:'害羞',worried:'担心',embarrassed:'尴尬'},
  familyBodyTalk: {menstruation:'月经',breast:'乳房发育',bodyHair:'体毛',shape:'身材变化'},
  knowledgeSource: {school:'学校课堂',family:'家庭教育',internet:'网络搜索',book:'科普书籍',peer:'同龄人交流'},
  knowledgeNeed: {bodyChange:'身体发育细节',menstrualCare:'月经护理',relationship:'恋爱与情感',protection:'避孕与防护'},
  emotionShow: {stable:'情绪稳定',irritable:'易怒烦躁',silent:'沉默寡言',rebellious:'逆反对抗',anxious:'焦虑紧张'},
  parentSupport: {listen:'倾听理解',space:'给予空间',accompany:'陪伴活动',affirm:'肯定鼓励'},
  safetySkill: {boundary:'身体边界感',refuse:'敢于拒绝',help:'知道求助',privacy:'保护隐私'},
  commQuality: {high:'频繁深入',normal:'日常沟通',low:'沟通较少',conflict:'存在冲突'},
  childParticipation: {'1':'被动','2':'抗拒','3':'一般','4':'积极','5':'投入'},
  talkEffect: {'1':'没聊下去','2':'勉强','3':'一般','4':'较好','5':'很有收获'},
  childReaction: {willing:'愿意聊',shy:'不好意思',asked:'问了问题',shared:'主动分享'},
  courseContent: {bodyKnowledge:'身体发育知识',emotionManage:'情绪管理',relationship:'人际与情感',selfProtect:'自我保护',sexEdu:'性教育基础',pubertyPsych:'青春期心理'}
};
function lbl(factor,val){ return (LABELS[factor]&&LABELS[factor][val])||val; }

/* ================= 工具函数 ================= */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function pad2(n){ return String(n).padStart(2,'0'); }
function curMonth(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1); }
function nowStr(){ return new Date().toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function isWeChat(){ return /MicroMessenger/i.test(navigator.userAgent); }

var toastTimer;
function showToast(msg){
  var t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.classList.remove('show'); },2500);
}

function openModal(id){ $(id).classList.add('open'); }
function closeModal(id){ $(id).classList.remove('open'); }
function openGuide(){ openModal('guideMask'); }
function openDataSheet(){ openModal('dataMask'); renderBackupInfo(); }

/* ================= 表单数据 ================= */
function getFormData(){
  var data={};
  document.querySelectorAll('[data-factor]').forEach(function(c){
    var f=c.dataset.factor, multi=c.dataset.multi==='true';
    var act=c.querySelectorAll('.active');
    if(multi) data[f]=Array.prototype.map.call(act,function(b){return b.dataset.value;});
    else data[f]=act.length?act[0].dataset.value:'';
  });
  document.querySelectorAll('[data-note]').forEach(function(el){
    data[el.dataset.note]=el.value.trim();
  });
  var d=new Date();
  data.timestamp=d.toISOString();
  data.dateStr=d.toLocaleDateString('zh-CN');
  return data;
}

function resetForm(){
  document.querySelectorAll('.active').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('[data-note]').forEach(function(el){ el.value=''; });
  toggleContextPanels('');
  window.scrollTo({top:0,behavior:'smooth'});
}

function toggleContextPanels(ctx){
  $('panelCourse').classList.toggle('hidden', !(ctx==='offlineCourse'||ctx==='onlineCourse'));
  $('panelTalk').classList.toggle('hidden', ctx!=='parentTalk');
  $('panelConsult').classList.toggle('hidden', ctx!=='consultation');
}

/* ================= 保存 ================= */
function saveRecord(){
  var ctx=document.querySelector('#contextSelector .active');
  if(!ctx){ showToast('请先选择"记录场景"'); return; }
  var data=getFormData();
  var records=loadRecords();
  records.push(data);
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(records)); }
  catch(e){ showToast('⚠️ 存储空间不足，请先备份再清空'); return; }
  renderHistory();
  resetForm();
  showToast('✅ 记录已保存到本机');
}

function loadRecords(){
  try { var s=localStorage.getItem(STORAGE_KEY); return s?JSON.parse(s)||[]:[]; }
  catch(e){ return []; }
}
function persistRecords(list){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(list)); return true; }
  catch(e){ showToast('⚠️ 存储失败'); return false; }
}

/* ================= 历史渲染 ================= */
function recordHtml(r,idx){
  var tags=[];
  if(r.context) tags.push(lbl('context',r.context));
  if(r.mood) tags.push(lbl('mood',r.mood));
  if(r.age) tags.push(lbl('age',r.age));
  if(r.bodyAccept) tags.push('接受度:'+lbl('bodyAccept',r.bodyAccept));
  if(r.parentObserve) tags.push('适应:'+lbl('parentObserve',r.parentObserve));
  ['teenBodyChange','parentObserveBody','teenBodyFeeling','familyBodyTalk','knowledgeSource','knowledgeNeed','emotionShow','parentSupport','safetySkill','commQuality','childReaction','courseContent','childParticipation','talkEffect'].forEach(function(f){
    if(r[f]){
      var vals=Array.isArray(r[f])?r[f]:[r[f]];
      if(vals.length) tags.push(vals.map(function(v){return lbl(f,v);}).join('、'));
    }
  });
  [['courseName','课程'],['parentGainNote','收获'],['actionItems','行动'],['talkTopic','对话主题'],['talkProcessNote','对话过程'],['consultTopic','咨询'],['consultAdviceNote','建议'],['consultFollowUpNote','落实']].forEach(function(pair){
    if(r[pair[0]]) tags.push(pair[1]+':'+r[pair[0]]);
  });
  if(r.freeThoughts){
    var short=r.freeThoughts.length>24?r.freeThoughts.slice(0,24)+'…':r.freeThoughts;
    tags.push('💭 '+short);
  }
  var h='<div class="history-item"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span class="font-display" style="font-weight:700;font-size:.85rem">'+esc(r.dateStr||'')+'</span>'+
        '<button class="delete-btn" data-idx="'+idx+'">删除</button></div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:5px">';
  tags.forEach(function(t){
    h+='<span style="font-size:.7rem;padding:2px 8px;border-radius:6px;background:rgba(251,146,60,.08);color:var(--text-secondary);line-height:1.5">'+esc(t)+'</span>';
  });
  h+='</div></div>';
  return h;
}

function renderHistory(){
  var records=loadRecords();
  $('recordCount').textContent=records.length;
  var box=$('historyContainer');
  if(!records.length){
    box.innerHTML='<p style="font-size:.85rem;color:var(--text-muted);margin:0">还没有记录，填写完上面的内容后，点击底部「保存本次记录」就可以看到啦。</p>';
    return;
  }
  var recentN=Math.min(3,records.length);
  var html='';
  for(var i=records.length-1;i>=records.length-recentN;i--) html+=recordHtml(records[i],i);
  if(records.length>3){
    html+='<div class="sub-group-label">更早的记录（'+(records.length-3)+'条）</div>';
    html+='<div class="history-older-wrap">';
    for(var i=records.length-4;i>=0;i--) html+=recordHtml(records[i],i);
    html+='</div>';
  }
  box.innerHTML=html;
  box.querySelectorAll('.delete-btn').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      if(!confirm('确定删除这条记录吗？')) return;
      var idx=parseInt(btn.dataset.idx,10);
      var list=loadRecords();
      list.splice(idx,1);
      persistRecords(list);
      renderHistory();
      showToast('记录已删除');
    });
  });
}

/* ================= 备份 & 提醒 ================= */
function getLastBackup(){ try { return Number(localStorage.getItem(BACKUP_KEY)||0); } catch(e){ return 0; } }
function markBackup(){ try { localStorage.setItem(BACKUP_KEY,String(Date.now())); } catch(e){} renderBackupInfo(); }

function renderBackupInfo(){
  var el=$('bakTime'), extra=$('bakExtra');
  if(!el) return;
  var t=getLastBackup();
  if(!t){
    el.textContent='从未备份'; el.className='bak-tag warn';
    if(extra) extra.textContent = loadRecords().length ? '（建议马上备份一次）' : '';
    return;
  }
  var days=Math.floor((Date.now()-t)/86400000);
  var d=new Date(t);
  el.textContent=d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'（'+(days===0?'今天':days+'天前')+'）';
  el.className=days>=30?'bak-tag warn':'bak-tag';
  if(extra) extra.textContent=days>=30?'⚠️ 超过30天没备份了':'';
}

function checkBackupReminder(){
  var records=loadRecords();
  var bar=$('reminderBar');
  if(!records.length){ bar.classList.add('hidden'); return; }
  var t=getLastBackup();
  var days=t?Math.floor((Date.now()-t)/86400000):999;
  if(days>=30){
    bar.classList.remove('hidden');
    setTimeout(function(){
      showToast('⏰ '+(t?'已 '+days+' 天未备份':'还没有备份过')+'，请到「数据」备份一次');
    },1200);
  } else {
    bar.classList.add('hidden');
  }
}

/* ================= 导出 ================= */
function exportData(){
  var records=loadRecords();
  if(!records.length){ showToast('暂无记录可导出'); return; }
  var dataStr=JSON.stringify({version:2,exportDate:nowStr(),records:records},null,2);
  if(isWeChat()){
    $('wcTextarea').value=dataStr;
    closeModal('dataMask');
    openModal('wcMask');
    return;
  }
  doDownload(dataStr);
  markBackup();
  closeModal('dataMask');
  showToast('💾 备份已下载，请妥善保存');
}

function doDownload(str){
  try{
    var blob=new Blob([str],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='青春期成长手帐_女生版_'+curMonth()+'.json';
    a.style.display='none';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },3000);
    return true;
  }catch(e){
    return false;
  }
}

function wcDownload(){
  var str=$('wcTextarea').value;
  if(doDownload(str)){ markBackup(); showToast('下载已开始'); closeModal('wcMask'); }
  else { showToast('下载失败，请尝试复制'); }
}
function wcCopy(){
  var ta=$('wcTextarea');
  ta.select();
  try{
    document.execCommand('copy');
    showToast('已复制到剪贴板');
  }catch(e){
    if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function(){ showToast('已复制到剪贴板'); });
    else showToast('复制失败，请长按选择复制');
  }
}

/* ================= 导入 ================= */
var pendingImport=null;
function openImport(){ $('importFile').click(); }

$('importFile').addEventListener('change',function(e){
  var file=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var data=JSON.parse(ev.target.result);
      var list=Array.isArray(data)?data:(data&&data.records);
      if(!list||!list.length){ showToast('⚠️ 文件里没有可导入的记录'); return; }
      pendingImport=list;
      closeModal('dataMask');
      openModal('importMask');
    }catch(err){
      showToast('⚠️ 打不开这个文件，请确认是本工具导出的 JSON');
    }
  };
  reader.onerror=function(){ showToast('⚠️ 文件读取失败'); };
  reader.readAsText(file);
});

function closeImport(){ pendingImport=null; closeModal('importMask'); }

function execImport(mode){
  if(!pendingImport){ closeImport(); return; }
  var list=pendingImport;
  var msg;
  if(mode==='replace'){
    persistRecords(list);
    msg='📥 已覆盖导入 '+list.length+' 条记录';
  } else {
    var records=loadRecords();
    var seen={};
    records.forEach(function(r){ if(r&&r.timestamp) seen[r.timestamp+'|'+(r.context||'')]=1; });
    var added=0;
    list.forEach(function(r){
      if(!r||typeof r!=='object') return;
      var key=r.timestamp+'|'+(r.context||'');
      if(seen[key]) return;
      seen[key]=1;
      records.push(r);
      added++;
    });
    persistRecords(records);
    msg=added?('📥 合并完成，新增 '+added+' 条记录'):'✅ 数据已是最新，没有新增记录';
  }
  renderHistory();
  renderBackupInfo();
  closeImport();
  checkBackupReminder();
  showToast(msg);
}

/* ================= 清空 ================= */
function openClear(){ closeModal('dataMask'); openModal('clearMask'); }
function execClear(){
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  renderBackupInfo();
  closeModal('clearMask');
  showToast('🗑️ 已清空所有记录');
}

/* ================= 选择器事件 ================= */
function initSelectors(){
  document.querySelectorAll('[data-factor]').forEach(function(container){
    var multi=container.dataset.multi==='true';
    container.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(multi){ btn.classList.toggle('active'); }
        else {
          container.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          if(container.id==='contextSelector') toggleContextPanels(btn.dataset.value);
        }
      });
    });
  });
}

/* ================= 初始化 ================= */
document.getElementById('todayDate').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});
initSelectors();
renderHistory();
renderBackupInfo();
checkBackupReminder();
