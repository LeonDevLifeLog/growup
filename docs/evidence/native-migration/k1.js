
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};

/* ================= 配置 ================= */
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=2*Math.PI*50; // 评分环周长（viewBox 120 / r 50）

var ICON={
teeth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5C10.8 4 9.3 3.2 7.7 3.2 4.9 3.2 3 5.6 3 8.4c0 2.2.9 3.4 1.5 5.6.4 1.7.6 4.8 2.2 4.8 1.6 0 1.2-3.7 2.8-3.7h5c1.6 0 1.2 3.7 2.8 3.7 1.6 0 1.8-3.1 2.2-4.8.6-2.2 1.5-3.4 1.5-5.6 0-2.8-1.9-5.2-4.7-5.2-1.6 0-3.1.8-4.3 2.3z"/></svg>',
vision:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'};

/* ================= 题库 ================= */
var QUIZ={
primary:{sections:[
{key:'teeth',name:'牙齿',questions:[
{text:'你每天刷牙几次？',options:[{t:'每天 2 次（早晚）',s:4},{t:'每天 1 次',s:2},{t:'有时候会忘',s:1},{t:'不常刷牙',s:0}]},
{text:'每次刷牙大概多久？',options:[{t:'2 分钟以上',s:4},{t:'1 分钟左右',s:3},{t:'不到 1 分钟',s:1},{t:'没注意过',s:0}]},
{text:'你用的牙膏是含氟的吗？',options:[{t:'是的，含氟牙膏',s:4},{t:'不太确定',s:2},{t:'不是含氟的',s:1},{t:'不知道',s:0}]},
{text:'你多久吃一次甜食（糖果、蛋糕、巧克力）？',options:[{t:'很少吃',s:4},{t:'每周几次',s:3},{t:'每天都吃',s:1},{t:'一天好几次',s:0}]},
{text:'吃完饭后你会漱口吗？',options:[{t:'经常漱口',s:4},{t:'偶尔会',s:2},{t:'很少',s:1},{t:'从来不',s:0}]},
{text:'最近牙齿有没有不舒服？',options:[{t:'没有，挺好的',s:4},{t:'偶尔有点酸',s:3},{t:'有蛀牙',s:1},{t:'牙疼或出血',s:0}]}
]},
{key:'vision',name:'视力',questions:[
{text:'上课时看黑板上的字清楚吗？',options:[{t:'很清楚',s:4},{t:'偶尔有点模糊',s:2},{t:'经常模糊',s:1},{t:'看不清',s:0}]},
{text:'读书写字时你的姿势怎么样？',options:[{t:'很端正',s:4},{t:'还可以',s:3},{t:'容易歪着',s:1},{t:'常常趴着',s:0}]},
{text:'你连续看书或看屏幕大概多久休息一下？',options:[{t:'不到 30 分钟',s:4},{t:'30 - 60 分钟',s:3},{t:'1 - 2 小时',s:1},{t:'超过 2 小时',s:0}]},
{text:'你每天户外活动（玩耍、走路、运动）多久？',options:[{t:'1 小时以上',s:4},{t:'每周几次',s:3},{t:'偶尔出去',s:1},{t:'几乎不出门',s:0}]},
{text:'眼睛最近有没有不舒服？',options:[{t:'没有',s:4},{t:'偶尔干涩',s:3},{t:'经常酸胀',s:1},{t:'经常不舒服',s:0}]},
{text:'你现在戴眼镜吗？',options:[{t:'不戴，看得很清楚',s:4},{t:'戴眼镜，看得清楚',s:4},{t:'戴了但还是有点模糊',s:1},{t:'不戴，但有点看不清',s:0}]}
]}
]},
middle:{sections:[
{key:'teeth',name:'牙齿',questions:[
{text:'你每天刷牙几次？',options:[{t:'每天 2 次及以上',s:4},{t:'每天 1 次',s:2},{t:'偶尔忘',s:1},{t:'不常刷',s:0}]},
{text:'你的刷牙方式是？',options:[{t:'巴氏刷牙法',s:4},{t:'上下刷',s:3},{t:'随便横刷',s:1},{t:'不太清楚',s:0}]},
{text:'你会使用牙线或冲牙器吗？',options:[{t:'每天用',s:4},{t:'经常用',s:3},{t:'偶尔用',s:1},{t:'从来不用',s:0}]},
{text:'你用含氟牙膏吗？',options:[{t:'是的',s:4},{t:'不太确定',s:2},{t:'不用',s:1},{t:'不知道',s:0}]},
{text:'甜食和碳酸饮料的频率？',options:[{t:'很少',s:4},{t:'每周几次',s:3},{t:'每天都喝/吃',s:1},{t:'一天多次',s:0}]},
{text:'最近半年牙齿有什么问题吗？',options:[{t:'没有',s:4},{t:'偶尔敏感',s:3},{t:'有蛀牙',s:1},{t:'疼痛或牙龈出血',s:0}]},
{text:'智齿和牙齿矫正情况你关注过吗？',options:[{t:'已检查处理',s:4},{t:'定期复查中',s:3},{t:'知道但没处理',s:1},{t:'完全不了解',s:0}]}
]},
{key:'vision',name:'视力',questions:[
{text:'你现在的视力状况？',options:[{t:'双眼都清晰',s:4},{t:'一眼好一眼差',s:2},{t:'都有些模糊',s:1},{t:'严重模糊',s:0}]},
{text:'近一年度数有没有变化？',options:[{t:'基本稳定',s:4},{t:'略增加',s:2},{t:'明显增加',s:1},{t:'没查过',s:0}]},
{text:'每天连续用眼（不休息）多久？',options:[{t:'不到 1 小时',s:4},{t:'1 - 2 小时',s:3},{t:'2 - 4 小时',s:1},{t:'4 小时以上',s:0}]},
{text:'你会用 20-20-20 法则休息眼睛吗？',options:[{t:'经常这样',s:4},{t:'偶尔',s:2},{t:'很少',s:1},{t:'不知道这是什么',s:0}]},
{text:'你每天户外活动多久？',options:[{t:'1 小时以上',s:4},{t:'每周几次',s:3},{t:'偶尔',s:1},{t:'几乎没有',s:0}]},
{text:'电子屏幕使用情况？',options:[{t:'主要是学习',s:4},{t:'学习加少量娱乐',s:3},{t:'长时间娱乐',s:1},{t:'几乎全天盯着',s:0}]},
{text:'最近一年做过散瞳验光吗？',options:[{t:'做过，遵医嘱',s:4},{t:'做过',s:3},{t:'没做过',s:1},{t:'不清楚',s:0}]}
]}
]}};

/* ================= 文案 ================= */
var GRADE_TEXT={
teeth:{
a:{label:'优秀',analysis:'你的口腔习惯很扎实——刷牙频率、时长、含氟牙膏使用都到位，甜食也控制得当。继续保持这份自律，牙齿会陪你很久。',advice:['继续坚持早晚各 2 分钟刷牙，使用含氟牙膏','每 6 个月做一次口腔检查和洁牙','吃完甜食后及时漱口，减少糖分停留','学习使用牙线清理牙缝，预防邻面龋']},
b:{label:'良好',analysis:'整体不错，但还有提升空间。可能是刷牙时长不够，或甜食频率略高，稍微调整就能进入优秀区间。',advice:['把每次刷牙时间延长到 2 分钟以上','学会巴氏刷牙法，关注牙龈沟清洁','减少甜食和碳酸饮料，改用水果替代','餐后漱口，养成使用牙线的习惯']},
c:{label:'需关注',analysis:'有些习惯需要调整了。甜食、刷牙时长或方法可能存在问题，建议尽快改善，否则容易出现蛀牙或牙龈问题。',advice:['每天早晚认真刷牙 2 分钟，用含氟牙膏','尽量减少甜食和含糖饮料的摄入','建议尽快去口腔科做一次检查','学习正确的刷牙方法（巴氏法）']},
d:{label:'建议就医',analysis:'当前口腔状况存在明显风险。可能已经有蛀牙或牙龈问题，建议尽快就医，同时建立基础的日常护理习惯。',advice:['尽快预约口腔科检查，处理现有问题','从每天 2 次刷牙开始建立基础习惯','使用含氟牙膏，每次刷满 2 分钟','大幅减少甜食，餐后认真漱口']}},
vision:{
a:{label:'优秀',analysis:'你的用眼习惯很健康，户外时间充足，眼睛状态良好。继续保持，把好习惯坚持下来。',advice:['继续保持每天 1 小时以上户外活动','坚持 20-20-20 法则：每 20 分钟远眺 20 英尺外 20 秒','保持正确读写姿势，眼睛离书本一尺','每学期做一次视力检查']},
b:{label:'良好',analysis:'整体不错，但连续用眼时长或户外时间可以再优化。稍加调整就能进入优秀区间。',advice:['把连续用眼时间控制在 1 小时以内','增加户外活动，每天争取 1 小时以上','注意读写姿势，避免趴着或躺着看书','已经近视的同学要定期复查度数']},
c:{label:'需关注',analysis:'用眼习惯需要调整了。连续用眼过长、户外不足或姿势不当，都可能让视力进一步下降，建议尽快改变。',advice:['严格遵守 20-20-20 法则','每天保证 1 小时以上户外活动','减少非学习类屏幕使用时间','建议尽快做一次视力检查']},
d:{label:'建议就医',analysis:'当前视力状况需要重视。可能已经存在较明显的视力问题，建议尽快做专业检查并遵医嘱。',advice:['尽快到眼科做散瞳验光检查','遵医嘱配镜或调整度数','严格控制用眼时长，增加户外活动','保持正确读写姿势，定期复查']}}
};
var WORD={a:'整体表现优秀',b:'整体表现良好',c:'整体需要关注',d:'建议尽快就医'};
function grade(pct){return pct>=85?'a':pct>=70?'b':pct>=50?'c':'d'}

/* ================= 状态 ================= */
var els={
  home:$('#page-home'),quiz:$('#page-quiz'),result:$('#page-result'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  ageCards:$('#ageCards'),resultSub:$('#resultSub'),verdictText:$('#verdictText'),
  dualRings:$('#dualRings'),resultCards:$('#resultCards'),backBtn:$('#backBtn')
};
var ver='',flat=[],answers=[],idx=0,stage='home',timer=null,pushed=false;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}

function showStage(s){
  clearTimeout(timer);
  stage=s;
  [['home',els.home],['quiz',els.quiz],['result',els.result]].forEach(function(p){
    var on=p[0]===s;p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  els.brand.hidden=q;els.topQuiz.hidden=!q;els.progressTrack.hidden=!q;
  window.scrollTo(0,0);
}

/* ================= 问卷 ================= */
function flatten(v){
  var out=[];
  QUIZ[v].sections.forEach(function(sec){
    sec.questions.forEach(function(q){out.push({k:sec.key,n:sec.name,q:q})});
  });
  return out;
}

function start(v){
  ver=v;
  flat=flatten(v);
  answers=flat.map(function(){return -1});
  idx=0;
  els.qTotal.textContent=flat.length;
  if(!pushed){try{history.pushState({q:1},'');pushed=true}catch(e){}}
  showStage('quiz');
  renderQ(1);
}

function renderQ(dir){
  var it=flat[idx];
  els.dimText.textContent=it.n;
  els.qIdx.textContent=idx+1;
  els.progressFill.style.width=((idx+1)/flat.length*100).toFixed(1)+'%';
  els.qText.textContent=it.q.text;
  els.qOptions.innerHTML='';
  it.q.options.forEach(function(o,i){
    var b=document.createElement('button');
    b.type='button';
    b.className='q-opt'+(answers[idx]===i?' sel':'');
    b.innerHTML='<span class="q-mark">'+'ABCD'[i]+'</span><span>'+o.t+'</span>';
    b.addEventListener('click',function(){pick(i)});
    els.qOptions.appendChild(b);
  });
  els.autoTip.hidden=idx!==0;
  updateNav();
  if(dir){
    els.qCard.classList.remove('q-anim','q-anim-back');
    void els.qCard.offsetWidth;
    els.qCard.classList.add(dir>0?'q-anim':'q-anim-back');
  }
}

function updateNav(){
  els.prevBtn.disabled=idx===0;
  els.nextBtn.disabled=answers[idx]<0;
  els.nextLabel.textContent=idx===flat.length-1?'查看报告':'下一题';
}

function pick(i){
  answers[idx]=i;
  Array.prototype.forEach.call(els.qOptions.children,function(el,j){el.classList.toggle('sel',j===i)});
  buzz(8);
  clearTimeout(timer);
  if(idx<flat.length-1){
    if(AUTO_NEXT)timer=setTimeout(function(){go(1)},AUTO_DELAY);
    else updateNav();
  }else{
    updateNav();
    els.nextBtn.classList.remove('nudge');void els.nextBtn.offsetWidth;els.nextBtn.classList.add('nudge');
  }
}

function go(d){
  clearTimeout(timer);
  if(d>0&&answers[idx]<0)return;
  var t=idx+d;
  if(t<0)return;
  if(t>=flat.length){finish();return}
  idx=t;
  renderQ(d);
  window.scrollTo({top:0,behavior:REDUCED?'auto':'smooth'});
}

/* ================= 结果 ================= */
function compute(){
  var acc={},cnt={};
  flat.forEach(function(it,i){
    var a=answers[i];
    acc[it.k]=(acc[it.k]||0)+(a>=0?it.q.options[a].s:0);
    cnt[it.k]=(cnt[it.k]||0)+1;
  });
  var secs=QUIZ[ver].sections.map(function(sec){
    var max=cnt[sec.key]*4,score=acc[sec.key]||0;
    var pct=Math.round(score/max*100);
    return{key:sec.key,name:sec.name,score:score,max:max,pct:pct,grade:grade(pct)};
  });
  var avg=Math.round(secs.reduce(function(s,r){return s+r.pct},0)/secs.length);
  return{secs:secs,avg:avg,grade:grade(avg)};
}

function countUp(el,to,dur){
  if(REDUCED){el.textContent=to;return}
  var t0=performance.now();
  (function step(t){
    var p=Math.min((t-t0)/dur,1);
    el.textContent=Math.round((1-Math.pow(1-p,3))*to);
    if(p<1)requestAnimationFrame(step);
  })(t0);
}

function renderResult(res){
  els.resultSub.textContent=WORD[res.grade];
  els.verdictText.innerHTML='根据你刚刚的回答，你的牙齿与视力健康整体得分为 <b class="hl">'+res.avg+
    '</b> 分。下面是分项的详细分析和具体建议，请重点关注需要改善的部分。';

  /* 双评分环 */
  els.dualRings.innerHTML=res.secs.map(function(s,i){
    return '<div class="ring-unit g-'+s.grade+'" style="animation-delay:'+(i*0.12)+'s">'+
      '<svg viewBox="0 0 120 120" aria-hidden="true">'+
      '<circle class="ru-bg" cx="60" cy="60" r="50"/>'+
      '<circle class="ru-fg" cx="60" cy="60" r="50"/></svg>'+
      '<div class="ru-num"><b>0</b><span>'+s.name+'</span></div></div>';
  }).join('');
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    var fgs=els.dualRings.querySelectorAll('.ru-fg');
    Array.prototype.forEach.call(fgs,function(f,i){
      f.style.strokeDashoffset=(C*(1-res.secs[i].pct/100)).toFixed(1);
    });
    var nums=els.dualRings.querySelectorAll('.ru-num b');
    Array.prototype.forEach.call(nums,function(n,i){countUp(n,res.secs[i].pct,1200)});
  })});

  /* 分项报告卡片 */
  els.resultCards.innerHTML=res.secs.map(function(s,i){
    var gt=GRADE_TEXT[s.key][s.grade];
    return '<div class="report-card g-'+s.grade+'" style="animation-delay:'+(0.18+i*0.14)+'s">'+
      '<div class="rc-head"><h3>'+ICON[s.key]+s.name+'状况分析</h3>'+
        '<span class="grade-tag g-'+s.grade+'">'+gt.label+'</span></div>'+
      '<div class="rc-score"><b>'+s.score+'</b><span class="rc-max">/ '+s.max+' 分</span>'+
        '<span class="rc-bar"><i style="--p:'+(s.pct/100).toFixed(3)+';animation-delay:'+(0.45+i*0.14)+'s"></i></span>'+
        '<span class="rc-pct">'+s.pct+'%</span></div>'+
      '<p class="rc-analysis">'+gt.analysis+'</p>'+
      '<div class="rc-advice"><h4>行动指南</h4><ul>'+
        gt.advice.map(function(a){return '<li>'+a+'</li>'}).join('')+
      '</ul></div></div>';
  }).join('');
}

function finish(){
  clearTimeout(timer);
  renderResult(compute());
  showStage('result');
}

/* ================= 事件 ================= */
els.ageCards.addEventListener('click',function(e){
  var c=e.target.closest('[data-age]');
  if(c)start(c.dataset.age);
});
els.ageCards.addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){
    var c=e.target.closest('[data-age]');
    if(c){e.preventDefault();start(c.dataset.age)}
  }
});
els.prevBtn.addEventListener('click',function(){go(-1)});
els.nextBtn.addEventListener('click',function(){go(1)});
 $('#restartBtn').addEventListener('click',function(){showStage('home')});
 $('#homeBtn').addEventListener('click',function(){showStage('home')});
els.backBtn.addEventListener('click',function(){
  if(stage==='home'){location.href='index.html';return}
  if(stage==='quiz'&&pushed){history.back()}else{showStage('home')}
});

/* 系统返回：问卷中挽留，其余回首页 */
window.addEventListener('popstate',function(){
  if(!pushed)return;
  pushed=false;
  if(stage==='quiz'&&answers.some(function(a){return a>=0})&&
     !confirm('确定退出本次评估吗？当前作答不会被保存。')){
    pushed=true;
    try{history.pushState({q:1},'')}catch(e){}
    return;
  }
  showStage('home');
});

/* 桌面端键盘支持：← → 切题，1-4 选答案 */
document.addEventListener('keydown',function(e){
  if(stage!=='quiz')return;
  if(e.key==='ArrowRight')go(1);
  else if(e.key==='ArrowLeft')go(-1);
  else if(/^[1-4]$/.test(e.key))pick(+e.key-1);
});
})();
