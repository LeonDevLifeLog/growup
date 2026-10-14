


/* ============ 基础工具 ============ */
const STORAGE_KEY='sleepDiary_v2',CUSTOM_FACTORS_KEY='sleepDiary_customFactors_v2',BACKUP_KEY='sleepDiary_lastBackup_v2';
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>Array.from(p.querySelectorAll(s));
function loadRecords(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
function saveRecords(r){localStorage.setItem(STORAGE_KEY,JSON.stringify(r))}
function loadCustomFactors(){try{return JSON.parse(localStorage.getItem(CUSTOM_FACTORS_KEY)||'[]')}catch{return[]}}
function saveCustomFactors(f){localStorage.setItem(CUSTOM_FACTORS_KEY,JSON.stringify(f))}
function getDateKey(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function escapeHtml(s){return s?String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])):''}
function isWeChat(){return /MicroMessenger/i.test(navigator.userAgent)}

/* ============ 睡眠时长区间 ============ */
const SLEEP_RANGES=[
  {key:'lt5', label:'不到5小时', hours:4.5},{key:'5-6', label:'5-6小时', hours:5.5},
  {key:'6-7', label:'6-7小时', hours:6.5},{key:'7-8', label:'7-8小时', hours:7.5},
  {key:'8-9', label:'8-9小时', hours:8.5},{key:'9-10',label:'9-10小时',hours:9.5},
  {key:'gt10',label:'10小时以上',hours:10.5}
];
const RANGE_HOURS={},RANGE_LABELS={};
SLEEP_RANGES.forEach(r=>{RANGE_HOURS[r.key]=r.hours;RANGE_LABELS[r.key]=r.label});
function rangeFromHours(h){if(!h)return'';if(h>=10)return'gt10';if(h<5)return'lt5';const f=Math.floor(h);return f+'-'+(f+1)}
function sleepRangeText(r){if(r.sleepRange&&RANGE_LABELS[r.sleepRange])return RANGE_LABELS[r.sleepRange];if(r.sleepHours)return'约'+r.sleepHours+'小时';return'--'}

/* ============ 状态 ============ */
const state={records:loadRecords(),customFactors:loadCustomFactors(),current:{sleepHours:0,sleepRange:'',quality:0,mood:'',fallAsleep:'',nightWake:'',factors:{},note:''},factorType:'good',factorOpen:false,pendingImport:null};

/* ============ 文案映射 ============ */
const FACTOR_LABELS={homework:{early:'作业放学前完成',normal:'作业晚饭前完成',late:'作业睡前才写完',none:'没有作业'},pressure:{exam:'有考试',homework:'有大作业',perform:'有表演/比赛',none:'没有压力'},class:{none:'没兴趣班',one:'一个兴趣班',many:'两个以上兴趣班',late:'兴趣班到很晚'},screen:{none:'睡前没玩电子产品',little:'睡前屏幕<30分钟',some:'睡前屏幕30-60分钟',lot:'睡前屏幕>1小时'},exercise:{lot:'运动>1小时',some:'运动了一会儿',little:'几乎没运动'},nap:{none:'没午睡',short:'午睡<30分钟',long:'午睡>30分钟',late:'傍晚才午睡'},drink:{nothing:'睡前没吃喝',milk:'睡前温牛奶',soda:'睡前可乐/奶茶',snack:'睡前零食',coffee:'睡前咖啡/茶'},dinner:{full:'晚饭吃很饱',ok:'晚饭刚好',little:'晚饭吃得少',late:'晚饭吃很晚',spicy:'晚饭吃辣'},dayMood:{happy:'白天很开心',ok:'白天一般',worried:'白天有点烦恼',sad:'白天很不开心',excited:'白天特别兴奋'},family:{great:'家人相处开心',ok:'家人相处还行',scolded:'被家人批评',argue:'和家人吵架'},friend:{great:'朋友相处开心',ok:'朋友正常相处',conflict:'和朋友闹矛盾',lonely:'感觉被冷落'},body:{great:'精神很好',tired:'有点累',sick:'不太舒服',pain:'哪里疼',stuffy:'鼻子堵'},env:{great:'卧室安静黑暗',ok:'卧室还可以',noisy:'卧室有点吵',bright:'卧室太亮',hot:'卧室太热',cold:'卧室太冷'},weather:{sunny:'晴天',cloudy:'阴天',rain:'下雨',snow:'下雪',wind:'大风',fog:'雾天'}};
const PRE_SLEEP_LABELS={shower:'洗热水澡',teeth:'认真刷牙',reading:'看书',music:'听音乐',game:'打游戏',video:'看视频',talk:'和家人聊天',think:'想事情',stretch:'拉伸',diary:'写日记'};
const FALL_ASLEEP_LABELS={fast:'躺下就睡着',soon:'一会儿才睡着',slow:'很久才睡着',verylong:'睡不着'};
const NIGHT_WAKE_LABELS={none:'一觉到天亮',once:'夜醒1次',several:'夜醒多次',long:'醒了很久'};
const MOOD_EMOJIS={happy:'😄',ok:'😊',tired:'😪',sad:'😞',angry:'😠'};
const TIPS=['睡前1小时尽量不看手机和平板，屏幕的蓝光会让大脑以为还是白天哦~','每天固定时间上床、起床，周末也别差太多，生物钟会越来越稳~','白天多晒太阳、多运动，晚上会睡得更香~','午睡控制在30分钟以内，太长的午睡会"偷走"晚上的瞌睡~','睡前可以听听轻音乐、翻翻纸质书，让大脑慢慢"降温"~','卧室稍微凉快一点（18~22℃）会更容易入睡~','睡前喝杯温牛奶不错，但可乐、奶茶、咖啡这些"提神饮料"晚上要避开~','晚饭吃得太饱或太辣，肠胃夜里还要"加班"，会打扰睡眠~','躺下睡不着别着急，试试慢慢深呼吸：吸气4秒，呼气6秒~','睡前把明天要用的书包和衣服准备好，心里踏实，入睡也更轻松~'];

/* ============ 装饰 ============ */
function initStars(){const bg=$('#starsBg');for(let i=0;i<40;i++){const s=document.createElement('div');s.className='star';const sz=Math.random()*2+1;Object.assign(s.style,{width:sz+'px',height:sz+'px',left:Math.random()*100+'%',top:Math.random()*100+'%'});s.style.setProperty('--dur',(2+Math.random()*3)+'s');s.style.animationDelay=Math.random()*3+'s';bg.appendChild(s)}}
function getMoonPhase(d=new Date()){const p=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'],n=['新月','蛾眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月'],ref=new Date(2000,0,6),days=Math.floor((d-ref)/864e5),ph=((days%29.53)+29.53)%29.53,idx=Math.floor((ph/29.53)*8)%8;return{emoji:p[idx],name:n[idx]}}
function showDate(){const now=new Date(),ds=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];$('#todayDate').textContent=`${now.getMonth()+1}月${now.getDate()}日 ${ds[now.getDay()]}`;const m=getMoonPhase(now);$('#moonPhaseEmoji').textContent=m.emoji;$('#moonPhaseName').textContent=m.name;$('#recordCount').textContent=state.records.length}
function showTip(){const t=TIPS[Math.floor(Math.random()*TIPS.length)];$('#tip').textContent=t}

/* ============ Toast / Modal ============ */
let toastTimer=null;
function showToast(msg,icon='✨'){$('#toastIcon').textContent=icon;$('#toastMsg').textContent=msg;const t=$('#toast');t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
let modalCallback=null;
function showModal(icon,title,text,cb){$('#modalIcon').textContent=icon;$('#modalTitle').textContent=title;$('#modalText').textContent=text;$('#modalBody').innerHTML='';modalCallback=cb;$('#modal').classList.add('show')}
function hideModal(){$('#modal').classList.remove('show');modalCallback=null}

/* ============ 备份追踪 ============ */
function getLastBackup(){try{return Number(localStorage.getItem(BACKUP_KEY)||0)}catch{return 0}}
function markBackup(){try{localStorage.setItem(BACKUP_KEY,String(Date.now()))}catch{} renderBackupInfo()}
function renderBackupInfo(){
  const el=$('#bakTime'),ex=$('#bakExtra');if(!el)return;
  const t=getLastBackup();
  if(!t){el.textContent='从未备份';el.className='bak-tag warn';ex.textContent=state.records.length?'（建议马上导出一次）':'';return}
  const days=Math.floor((Date.now()-t)/864e5),d=new Date(t);
  el.textContent=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}（${days===0?'今天':days+'天前'}）`;
  el.className=days>=30?'bak-tag warn':'bak-tag';
  ex.textContent=days>=30?'⚠️ 超过30天没备份了':'';
}
function checkBackupReminder(){
  if(!state.records.length){$('#bakBanner').style.display='none';return}
  const t=getLastBackup(),days=t?Math.floor((Date.now()-t)/864e5):999;
  if(days>=30){
    $('#bakBanner').style.display='flex';
    setTimeout(()=>showToast((t?`已 ${days} 天未备份`:'还没有备份过')+'，请到「睡眠数据管理」导出一次','⏰'),1200);
  }else{$('#bakBanner').style.display='none'}
}

/* ============ 自定义因素 ============ */
function getCustomFactorsSelected(){return $$('.custom-factor-chip.active').map(c=>c.dataset.factorId)}
function renderCustomFactors(){const wrap=$('#customFactorsList');wrap.innerHTML='';if(!state.customFactors.length){wrap.innerHTML='<span class="text-[11px]" style="color:var(--text-muted)">还没有自定义因素，点击上方按钮添加~</span>';return}state.customFactors.forEach(f=>{const chip=document.createElement('button');chip.type='button';chip.className='custom-factor-chip';chip.dataset.factorId=f.id;chip.innerHTML=`<span>${f.type==='bad'?'😪':f.type==='neutral'?'🤔':'😊'}</span><span>${escapeHtml(f.name)}</span><span class="delete-btn" data-id="${f.id}">✕</span>`;wrap.appendChild(chip)})}
function openFactorModal(){$('#factorName').value='';$$('#factorTypeSelector .type-btn').forEach(b=>b.classList.toggle('active',b.dataset.type==='good'));state.factorType='good';$('#factorModal').classList.add('show')}
function addCustomFactor(){const name=$('#factorName').value.trim();if(!name){showToast('先给因素起个名字~','✨');return}if(state.customFactors.some(f=>f.name===name)){showToast('这个因素已经添加过啦','😊');return}state.customFactors.push({id:'c_'+Date.now(),name,type:state.factorType});saveCustomFactors(state.customFactors);renderCustomFactors();$('#factorModal').classList.remove('show');showToast('自定义因素已添加！','✨')}
function deleteCustomFactor(id){const f=state.customFactors.find(x=>x.id===id);if(!f)return;showModal('🗑️','删除自定义因素？',`「${f.name}」将被删除，历史记录不受影响。`,()=>{state.customFactors=state.customFactors.filter(x=>x.id!==id);saveCustomFactors(state.customFactors);renderCustomFactors();updateFactorBadge();showToast('已删除','🗑️')})}

/* ============ 影响因素折叠面板 ============ */
const factorToggle=$('#factorToggle'),factorCollapse=$('#factorCollapse');
function toggleFactorPanel(force){
  const open=(typeof force==='boolean')?force:!state.factorOpen;
  state.factorOpen=open;
  factorToggle.classList.toggle('open',open);
  factorCollapse.classList.toggle('open',open);
  clearTimeout(factorCollapse._hTimer);
  if(open){
    factorCollapse.style.maxHeight=factorCollapse.scrollHeight+'px';
    factorCollapse._hTimer=setTimeout(()=>{if(state.factorOpen)factorCollapse.style.maxHeight='none'},460);
  }else{
    factorCollapse.style.maxHeight=factorCollapse.scrollHeight+'px';
    void factorCollapse.offsetHeight;
    requestAnimationFrame(()=>{factorCollapse.style.maxHeight='0px'});
  }
}
factorToggle.addEventListener('click',()=>toggleFactorPanel());

/* ============ 选中角标 ============ */
function updateFactorBadge(){
  let count=0;
  Object.values(state.current.factors).forEach(v=>{if(Array.isArray(v))count+=v.length;else if(v)count++});
  count+=getCustomFactorsSelected().length;
  const badge=$('#factorBadge');
  badge.textContent=count;
  badge.classList.toggle('hidden',count===0);
}

/* ============ 表单选择 ============ */
$('#durationSelector').addEventListener('click',e=>{
  const btn=e.target.closest('.dur-btn');if(!btn)return;
  $$('#durationSelector .dur-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  state.current.sleepRange=btn.dataset.range;
  state.current.sleepHours=RANGE_HOURS[btn.dataset.range]||0;
});
$('#fallAsleepSelector').addEventListener('click',e=>{
  const btn=e.target.closest('.tag-btn');if(!btn)return;
  const was=btn.classList.contains('active');
  $$('#fallAsleepSelector .tag-btn').forEach(b=>b.classList.remove('active'));
  if(was){state.current.fallAsleep=''}else{btn.classList.add('active');state.current.fallAsleep=btn.dataset.fallasleep}
});
$('#nightWakeSelector').addEventListener('click',e=>{
  const btn=e.target.closest('.tag-btn');if(!btn)return;
  const was=btn.classList.contains('active');
  $$('#nightWakeSelector .tag-btn').forEach(b=>b.classList.remove('active'));
  if(was){state.current.nightWake=''}else{btn.classList.add('active');state.current.nightWake=btn.dataset.nightwake}
});
$('#moonRating').addEventListener('click',e=>{
  const btn=e.target.closest('.moon-btn');if(!btn)return;
  const was=btn.classList.contains('active');
  $$('#moonRating .moon-btn').forEach(b=>b.classList.remove('active'));
  if(was){state.current.quality=0}else{btn.classList.add('active');state.current.quality=+btn.dataset.rating}
});
$('#moodSelector').addEventListener('click',e=>{
  const btn=e.target.closest('.mood-btn');if(!btn)return;
  const was=btn.classList.contains('active');
  $$('#moodSelector .mood-btn').forEach(b=>b.classList.remove('active'));
  if(was){state.current.mood=''}else{btn.classList.add('active');state.current.mood=btn.dataset.mood}
});
$('#factorsGrid').addEventListener('click',e=>{
  const btn=e.target.closest('.tag-btn');if(!btn)return;
  const factor=btn.dataset.factor,value=btn.dataset.value,group=btn.parentElement;
  if(group.dataset.multi==='true'){
    btn.classList.toggle('active');
    let arr=Array.isArray(state.current.factors[factor])?state.current.factors[factor].slice():[];
    if(btn.classList.contains('active'))arr.push(value);else arr=arr.filter(v=>v!==value);
    if(arr.length)state.current.factors[factor]=arr;else delete state.current.factors[factor];
  }else{
    const was=btn.classList.contains('active');
    group.querySelectorAll('.tag-btn').forEach(b=>b.classList.remove('active'));
    if(was){delete state.current.factors[factor]}
    else{btn.classList.add('active');state.current.factors[factor]=value}
  }
  updateFactorBadge();
});
$('#customFactorsList').addEventListener('click',e=>{
  const del=e.target.closest('.delete-btn');
  if(del){e.stopPropagation();deleteCustomFactor(del.dataset.id);return}
  const chip=e.target.closest('.custom-factor-chip');if(!chip)return;
  chip.classList.toggle('active');
  updateFactorBadge();
});

/* ============ 表单回填 / 重置 ============ */
function fillForm(r){
  const range=r.sleepRange||rangeFromHours(r.sleepHours)||'';
  state.current.sleepRange=range;
  state.current.sleepHours=range?(RANGE_HOURS[range]||r.sleepHours||0):(r.sleepHours||0);
  $$('#durationSelector .dur-btn').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
  state.current.quality=r.quality||0;
  $$('#moonRating .moon-btn').forEach(b=>b.classList.toggle('active',+b.dataset.rating===r.quality));
  state.current.mood=r.mood||'';
  $$('#moodSelector .mood-btn').forEach(b=>b.classList.toggle('active',b.dataset.mood===r.mood));
  state.current.fallAsleep=r.fallAsleep||'';
  $$('#fallAsleepSelector .tag-btn').forEach(b=>b.classList.toggle('active',b.dataset.fallasleep===r.fallAsleep));
  state.current.nightWake=r.nightWake||'';
  $$('#nightWakeSelector .tag-btn').forEach(b=>b.classList.toggle('active',b.dataset.nightwake===r.nightWake));
  state.current.factors=(r.factors&&typeof r.factors==='object')?JSON.parse(JSON.stringify(r.factors)):{};
  $$('#factorsGrid .tag-btn').forEach(b=>{
    const cur=state.current.factors[b.dataset.factor];
    const active=Array.isArray(cur)?cur.includes(b.dataset.value):(cur===b.dataset.value);
    b.classList.toggle('active',active);
  });
  const ids=(r.customFactors||[]).map(f=>f.id);
  $$('.custom-factor-chip').forEach(c=>c.classList.toggle('active',ids.includes(c.dataset.factorId)));
  $('#note').value=r.note||'';
}
function resetForm(){
  state.current={sleepHours:0,sleepRange:'',quality:0,mood:'',fallAsleep:'',nightWake:'',factors:{},note:''};
  $$('#durationSelector .dur-btn,#fallAsleepSelector .tag-btn,#nightWakeSelector .tag-btn,#moonRating .moon-btn,#moodSelector .mood-btn,#factorsGrid .tag-btn').forEach(b=>b.classList.remove('active'));
  $$('.custom-factor-chip').forEach(c=>c.classList.remove('active'));
  $('#note').value='';
  updateFactorBadge();
}

/* ============ 保存 / 删除 ============ */
function saveRecord(){
  if(!state.current.sleepRange){showToast('先选一下大概睡了多久~','🌙');return}
  if(!state.current.quality){showToast('点亮一颗月亮评价一下吧~','🌙');return}
  const today=getDateKey();
  const exists=state.records.some(r=>r.date===today);
  const record={
    date:today,
    sleepRange:state.current.sleepRange,
    sleepHours:state.current.sleepHours||RANGE_HOURS[state.current.sleepRange]||0,
    quality:state.current.quality,
    mood:state.current.mood,
    fallAsleep:state.current.fallAsleep,
    nightWake:state.current.nightWake,
    factors:JSON.parse(JSON.stringify(state.current.factors)),
    customFactors:getCustomFactorsSelected().map(id=>{const f=state.customFactors.find(x=>x.id===id);return f?{id:f.id,name:f.name,type:f.type}:null}).filter(Boolean),
    note:$('#note').value.trim(),
    createdAt:Date.now()
  };
  if(exists){
    state.records[state.records.findIndex(r=>r.date===today)]=record;
    showToast('今天的记录已更新！','🌙');
  }else{
    state.records.push(record);
    showToast('保存成功！继续加油~','✨');
  }
  state.records.sort((a,b)=>a.date<b.date?-1:1);
  saveRecords(state.records);
  toggleFactorPanel(false);
  refreshAll();
  checkBackupReminder();
}
function deleteRecord(date){
  const r=state.records.find(x=>x.date===date);if(!r)return;
  showModal('🗑️','删除这条记录？',`${r.date} 的睡眠记录将被删除。`,()=>{
    state.records=state.records.filter(x=>x.date!==date);
    saveRecords(state.records);
    refreshAll();
    showToast('已删除','🗑️');
  });
}

/* ============ 图表 ============ */
let durationChart=null,qualityChart=null;
function renderCharts(){
  const recent=state.records.slice(-7);
  const labels=recent.map(r=>{const p=r.date.split('-');return (+p[1])+'/'+(+p[2])});
  const textColor='#8a7cb3',gridColor='rgba(255,255,255,.06)';
  const tooltipStyle={backgroundColor:'rgba(26,18,69,.95)',borderColor:'rgba(255,209,102,.4)',borderWidth:1,titleColor:'#fef9e7',bodyColor:'#fef9e7'};
  if(durationChart)durationChart.destroy();
  durationChart=new Chart($('#durationChart'),{
    type:'bar',
    data:{labels,datasets:[{data:recent.map(r=>r.sleepHours||null),backgroundColor:recent.map(r=>{const h=r.sleepHours||0;return h>=9?'rgba(126,218,158,.75)':h>=7?'rgba(255,209,102,.75)':'rgba(255,107,157,.65)'}),borderRadius:8,barPercentage:.55,categoryPercentage:.7}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:Object.assign({callbacks:{label:c=>' '+sleepRangeText(recent[c.dataIndex])}},tooltipStyle)},scales:{y:{beginAtZero:true,max:12,ticks:{color:textColor,stepSize:2,font:{size:10}},grid:{color:gridColor}},x:{ticks:{color:textColor,font:{size:10}},grid:{display:false}}}}
  });
  if(qualityChart)qualityChart.destroy();
  qualityChart=new Chart($('#qualityChart'),{
    type:'line',
    data:{labels,datasets:[{data:recent.map(r=>r.quality||null),borderColor:'#ff6b9d',borderWidth:2.5,backgroundColor:'rgba(255,107,157,.15)',fill:true,tension:.4,pointBackgroundColor:'#ffd166',pointBorderColor:'#1a1245',pointBorderWidth:2,pointRadius:4.5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:Object.assign({callbacks:{label:c=>{const q=recent[c.dataIndex].quality||0;const e=['🌑','🌘','🌗','🌖','🌕'][q-1]||'❔';return ' '+e+' '+q+' 颗月亮'}}},tooltipStyle)},scales:{y:{beginAtZero:true,max:5,ticks:{color:textColor,stepSize:1,font:{size:10}},grid:{color:gridColor}},x:{ticks:{color:textColor,font:{size:10}},grid:{display:false}}}}
  });
}

/* ============ 睡眠小发现 ============ */
function factorKeyLabel(key){
  if(key.startsWith('@'))return key.slice(1);
  const i=key.indexOf('|'),k=key.slice(0,i),v=key.slice(i+1);
  return (k==='preSleep'?PRE_SLEEP_LABELS[v]:(FACTOR_LABELS[k]&&FACTOR_LABELS[k][v]))||v;
}
function insightItem(icon,text){return `<div class="flex items-start gap-2 p-3 rounded-xl" style="background:rgba(255,255,255,.04);border:1px solid var(--border);font-size:.8rem;line-height:1.6"><span style="font-size:1rem;flex-shrink:0">${icon}</span><span style="color:var(--text-secondary)">${text}</span></div>`}
function renderInsights(){
  const wrap=$('#insights'),n=state.records.length;
  if(!n){wrap.innerHTML=insightItem('🌙','还没有记录哦~ 从今晚开始每天记一笔，慢慢就能发现属于你的"睡眠小秘密"！');return}
  const html=[],recent=state.records.slice(-7);
  const avgH=recent.reduce((s,r)=>s+(r.sleepHours||0),0)/recent.length;
  const avgQ=recent.reduce((s,r)=>s+(r.quality||0),0)/recent.length;
  if(avgH>=9)html.push(insightItem('🎉',`最近${recent.length}天平均睡 <b style="color:var(--accent-green)">${avgH.toFixed(1)} 小时</b>，达到了推荐时长，给你点赞！`));
  else if(avgH>=8)html.push(insightItem('👍',`最近${recent.length}天平均睡 <b style="color:var(--accent-moon)">${avgH.toFixed(1)} 小时</b>，离推荐时长（9~11小时）只差一点点~`));
  else html.push(insightItem('🌙',`最近${recent.length}天平均只睡 <b style="color:var(--accent-pink)">${avgH.toFixed(1)} 小时</b>，比推荐时长（9~11小时）少不少，试试提早半小时上床？`));
  html.push(insightItem('⭐',`最近${recent.length}天的平均睡眠质量是 <b style="color:var(--accent-moon)">${avgQ.toFixed(1)} 颗月亮</b>（满分 5 颗）`));
  if(n>=5){
    const overall=state.records.reduce((s,r)=>s+(r.quality||0),0)/n;
    const stats={};
    state.records.forEach(r=>{
      const q=r.quality||0;if(!q)return;
      Object.entries(r.factors||{}).forEach(([k,v])=>{
        (Array.isArray(v)?v:[v]).forEach(val=>{const key=k+'|'+val;(stats[key]=stats[key]||[]).push(q)});
      });
      (r.customFactors||[]).forEach(f=>{const key='@'+f.name;(stats[key]=stats[key]||[]).push(q)});
    });
    const findings=Object.entries(stats).filter(([k,arr])=>arr.length>=2).map(([k,arr])=>({key:k,count:arr.length,avg:arr.reduce((a,b)=>a+b,0)/arr.length})).map(f=>Object.assign(f,{diff:f.avg-overall})).filter(f=>Math.abs(f.diff)>=0.4).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
    const good=findings.find(f=>f.diff>0),bad=findings.find(f=>f.diff<0);
    if(good)html.push(insightItem('😊',`「${escapeHtml(factorKeyLabel(good.key))}」出现的日子，睡眠平均 <b style="color:var(--accent-green)">${good.avg.toFixed(1)} 颗月亮</b>，比平时高 ${good.diff.toFixed(1)}——它是你的"睡眠好朋友"，继续保持！`));
    if(bad)html.push(insightItem('🕵️',`「${escapeHtml(factorKeyLabel(bad.key))}」出现的日子，睡眠平均只有 <b style="color:var(--accent-pink)">${bad.avg.toFixed(1)} 颗月亮</b>，比平时低 ${Math.abs(bad.diff).toFixed(1)}——小心，它可能就是你的"睡眠小偷"！`));
    if(!good&&!bad)html.push(insightItem('🔭','暂时还没发现特别明显的关联，继续记录，线索会越来越清晰~'));
  }else{
    html.push(insightItem('🔭',`再记录 <b style="color:var(--accent-purple)">${5-n}</b> 天，就能帮你分析"什么在影响你的睡眠"啦~`));
  }
  wrap.innerHTML=html.join('');
}

/* ============ 历史记录 ============ */
function renderHistory(){
  const list=$('#historyList');
  if(!state.records.length){list.innerHTML='<div class="text-center py-5 text-sm" style="color:var(--text-muted)">还没有记录，今晚睡醒后来记第一笔吧~ 🌙</div>';return}
  list.innerHTML=state.records.slice().reverse().map(r=>{
    const q=r.quality?['🌑','🌘','🌗','🌖','🌕'][r.quality-1]:'❔';
    const mood=r.mood?(MOOD_EMOJIS[r.mood]||''):'';
    const factorCount=Object.values(r.factors||{}).reduce((s,v)=>s+(Array.isArray(v)?v.length:(v?1:0)),0)+(r.customFactors||[]).length;
    const parts=[];
    if(r.fallAsleep)parts.push(FALL_ASLEEP_LABELS[r.fallAsleep]);
    if(r.nightWake)parts.push(NIGHT_WAKE_LABELS[r.nightWake]);
    parts.push(factorCount?`影响因素 ${factorCount} 项`:'未记录影响因素');
    const titleAttr=r.note?` title="${escapeHtml(r.note)}"`:'';
    return `<div class="history-item"${titleAttr}><div class="history-info"><span style="font-size:1.1rem;flex-shrink:0">${q}</span><div style="min-width:0"><div style="font-size:.8rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.date.slice(5).replace('-','/')} <span style="color:var(--text-secondary);font-weight:600">· ${sleepRangeText(r)}</span>${mood?' '+mood:''}</div><div style="font-size:.65rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(parts.join(' · '))}</div></div></div><button class="history-del" data-date="${r.date}" title="删除这条记录">🗑️</button></div>`;
  }).join('');
}

/* ============ 数据统计 ============ */
function renderStats(){
  $('#statRecords').textContent=state.records.length;
  const json=localStorage.getItem(STORAGE_KEY)||'';
  let size=json.length;try{size=new Blob([json]).size}catch(e){}
  $('#statSize').textContent=state.records.length?(size/1024).toFixed(1):'0';
  const avg=state.records.length?state.records.reduce((s,r)=>s+(r.sleepHours||0),0)/state.records.length:0;
  $('#statAvg').textContent=state.records.length?avg.toFixed(1)+'h':'--';
}

/* ============ 导出 / 导入 ============ */
function buildExportJson(){return JSON.stringify({app:'成长健研社·睡眠微手帐',version:2,exportedAt:new Date().toLocaleString('zh-CN'),recordCount:state.records.length,customFactors:state.customFactors,records:state.records},null,2)}
function downloadJson(json){
  try{
    const blob=new Blob([json],{type:'application/json'});
    const a=document.createElement('a'),url=URL.createObjectURL(blob);
    a.href=url;a.download=`睡眠微手帐备份_${getDateKey()}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    markBackup();
    showToast('导出成功！记得妥善保管~','📥');
  }catch(e){showToast('导出失败，请重试~','⚠️')}
}
function exportData(){
  if(!state.records.length){showToast('还没有记录可以导出哦~','📭');return}
  const json=buildExportJson();
  if(isWeChat()){$('#wxExportText').value=json;$('#wxExportModal').classList.add('show')}
  else{downloadJson(json)}
}

/* 解析导入文件 */
function parseImportFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      let records,customFactors=[];
      if(Array.isArray(data))records=data;
      else if(data&&Array.isArray(data.records))records=data.records;
      else throw new Error('format');
      if(data&&Array.isArray(data.customFactors))customFactors=data.customFactors;
      const valid=records.filter(r=>r&&r.date);
      if(!valid.length){showToast('文件里没有可导入的记录','⚠️');return}
      state.pendingImport={records:valid,customFactors};
      $('#importCount').textContent=valid.length;
      $('#importChoiceModal').classList.add('show');
    }catch(err){showToast('文件格式不对哦，请选择导出的备份文件','⚠️')}
  };
  reader.readAsText(file);
}

/* 执行导入 */
function execImport(mode){
  const p=state.pendingImport;
  if(!p){closeImportChoice();return}
  if(mode==='replace'){
    /* 覆盖：完全使用文件数据 */
    const normalized=p.records.map(r=>normalizeRecord(r));
    state.records=normalized.sort((a,b)=>a.date<b.date?-1:1);
    /* 自定义因素合并（按名称去重） */
    mergeCustomFactors(p.customFactors);
    saveRecords(state.records);saveCustomFactors(state.customFactors);
    renderCustomFactors();resetForm();
    const today=getDateKey(),tr=state.records.find(r=>r.date===today);
    if(tr)fillForm(tr);
    refreshAll();closeImportChoice();
    showToast(`已覆盖导入 ${state.records.length} 天记录`,'📤');
  }else{
    /* 合并：保留本机记录，只补充文件里没有的日期 */
    const map={};state.records.forEach(r=>map[r.date]=r);
    let added=0;
    p.records.forEach(r=>{
      if(!map[r.date]){map[r.date]=normalizeRecord(r);added++}
    });
    state.records=Object.values(map).sort((a,b)=>a.date<b.date?-1:1);
    mergeCustomFactors(p.customFactors);
    saveRecords(state.records);saveCustomFactors(state.customFactors);
    renderCustomFactors();resetForm();
    const today=getDateKey(),tr=state.records.find(r=>r.date===today);
    if(tr)fillForm(tr);
    refreshAll();closeImportChoice();
    showToast(added?`合并完成，新增 ${added} 天记录`:'数据已是最新，没有新增记录','📤');
  }
}
function normalizeRecord(r){
  return {
    date:r.date,
    sleepRange:r.sleepRange||rangeFromHours(r.sleepHours)||'',
    sleepHours:r.sleepRange?(RANGE_HOURS[r.sleepRange]||r.sleepHours||0):(r.sleepHours||0),
    quality:+r.quality||0,mood:r.mood||'',
    fallAsleep:r.fallAsleep||'',nightWake:r.nightWake||'',
    factors:(r.factors&&typeof r.factors==='object')?r.factors:{},
    customFactors:Array.isArray(r.customFactors)?r.customFactors:[],
    note:r.note||'',createdAt:r.createdAt||Date.now()
  };
}
function mergeCustomFactors(list){
  const names=new Set(state.customFactors.map(f=>f.name));
  list.forEach(f=>{
    if(f&&f.name&&!names.has(f.name)){
      names.add(f.name);
      state.customFactors.push({id:f.id||('c_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)),name:f.name,type:f.type||'neutral'});
    }
  });
}
function closeImportChoice(){state.pendingImport=null;$('#importChoiceModal').classList.remove('show')}

/* ============ 事件绑定 ============ */
$('#addCustomFactorBtn').addEventListener('click',openFactorModal);
$('#factorCancel').addEventListener('click',()=>$('#factorModal').classList.remove('show'));
$('#factorAdd').addEventListener('click',addCustomFactor);
$('#factorName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomFactor()}});
$('#factorTypeSelector').addEventListener('click',e=>{
  const btn=e.target.closest('.type-btn');if(!btn)return;
  $$('#factorTypeSelector .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');state.factorType=btn.dataset.type;
});
$('#quickPresets').addEventListener('click',e=>{
  const chip=e.target.closest('.preset-chip');if(!chip)return;
  $('#factorName').value=chip.dataset.preset;
});

$('#saveBtn').addEventListener('click',saveRecord);
$('#clearBtn').addEventListener('click',()=>{
  if(!state.records.length){showToast('还没有记录哦~','📭');return}
  showModal('⚠️','确定要清空吗？','所有记录都将被删除，无法恢复！建议先点「导出数据」备份。',()=>{
    state.records=[];saveRecords(state.records);
    resetForm();refreshAll();checkBackupReminder();
    showToast('已清空所有记录','🗑️');
  });
});
$('#historyList').addEventListener('click',e=>{
  const del=e.target.closest('.history-del');if(!del)return;
  deleteRecord(del.dataset.date);
});

$('#newTipBtn').addEventListener('click',showTip);
$('#exportJsonBtn').addEventListener('click',exportData);
$('#importBtn').addEventListener('click',()=>$('#importFile').click());
$('#importFile').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  parseImportFile(file);e.target.value='';
});

/* 导入选择弹窗 */
$('#importMergeBtn').addEventListener('click',()=>execImport('merge'));
$('#importReplaceBtn').addEventListener('click',()=>execImport('replace'));
$('#importCancelBtn').addEventListener('click',closeImportChoice);
$('#importChoiceClose').addEventListener('click',closeImportChoice);

/* 微信导出弹窗 */
$('#wxDownloadBtn').addEventListener('click',()=>downloadJson($('#wxExportText').value));
$('#wxExportCopyBtn').addEventListener('click',async()=>{
  const ta=$('#wxExportText');
  try{
    await navigator.clipboard.writeText(ta.value);
    markBackup();
    showToast('已复制，去备忘录粘贴保存吧','📋');
  }catch(e){
    ta.select();
    if(document.execCommand('copy')){markBackup();showToast('已复制，去备忘录粘贴保存吧','📋')}
    else showToast('复制失败，请长按文本手动复制','⚠️');
  }
});
$('#wxExportClose').addEventListener('click',()=>$('#wxExportModal').classList.remove('show'));
$('#wxExportClose2').addEventListener('click',()=>$('#wxExportModal').classList.remove('show'));

/* 通用确认弹窗 */
$('#modalConfirm').addEventListener('click',()=>{const cb=modalCallback;hideModal();if(cb)cb()});
$('#modalCancel').addEventListener('click',hideModal);
$('#modal').addEventListener('click',e=>{if(e.target===e.currentTarget)hideModal()});

/* 使用说明弹窗 */
$('#instructionBtn').addEventListener('click',()=>$('#instructionModal').classList.add('show'));
$('#instructionClose').addEventListener('click',()=>$('#instructionModal').classList.remove('show'));
$('#instructionConfirm').addEventListener('click',()=>$('#instructionModal').classList.remove('show'));

/* 其他弹窗遮罩关闭 */
['instructionModal','factorModal','wxExportModal','importChoiceModal'].forEach(id=>{
  const ov=document.getElementById(id);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('show')});
});

/* ============ 初始化 ============ */
function refreshAll(){showDate();renderCharts();renderInsights();renderHistory();renderStats()}
(function init(){
  initStars();showDate();showTip();renderCustomFactors();
  const today=getDateKey();
  const todayRec=state.records.find(r=>r.date===today);
  if(todayRec)fillForm(todayRec);
  updateFactorBadge();
  renderBackupInfo();
  if(isWeChat())$('#wxTip').classList.add('show');
  refreshAll();
  checkBackupReminder();
})();
