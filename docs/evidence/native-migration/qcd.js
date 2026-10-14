
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= 题库 ================= */
var DATA={
ms:{
  label:'初中版',
  title:'青春期这件事，<br>我们坐下来<em>一起聊</em>。',
  tag:'— 亲子共填 · 适用于初中生',
  intro:'<p>这不是测试，也不打分。它更像一本小册子，把青春期里那些家长不知道怎么开口、孩子也不知道怎么问的事，拆成 18 个具体的小问题。</p><p>用法很简单：<strong>家长和孩子坐在一起，每道题先聊一两分钟，再共同选一个答案</strong>。没有标准答案，“诚实”比“正确”重要。如果某一题聊出了新东西，可以在最后写下来。</p>',
  note:'全程约 15–20 分钟，建议挑一个不赶时间的傍晚。所有回答只保存在这台手机上，不会上传任何服务器。',
  chapters:['身体变化 · 月经、遗精、变声那些事','性知识 · 从哪里学的、学到什么程度','心理与情绪 · 长大里的情绪起伏','家庭对话 · 家里怎么聊这些','网络与信息 · 屏幕里的性','边界与安全 · 身体是谁的'],
  sections:[
  {name:'身体变化',desc:'这一节关于身体。先让孩子说说自己最近留意到的，家长再补充观察。',items:[
    {q:'孩子最近半年身体变化最明显的是？',hint:'让孩子先说，家长再补充自己观察到的。',opts:['月经初潮已来 / 已开始遗精','乳房发育 / 变声 / 喉结出现','身高体重明显变化','痘痘、体毛、体味变化','暂时看不出明显变化']},
    {q:'当这些变化第一次出现时，家里',hint:'回忆具体那个时刻，谁说了什么。',opts:['提前讲过，孩子有心理准备','发生时聊了几句，但有点尴尬','至今没有正式聊过','主要靠学校生理课或书本']},
    {q:'孩子对自己身体最在意的是？',hint:'这一题让孩子自己选，家长不要插话。',opts:['身高','体型胖瘦','长相 / 痘痘','发育比同龄人早或晚','没什么特别在意的']}]},
  {name:'性知识来源',desc:'这一节关于从哪里学到的。诚实比正确重要——家长可能不知道孩子真正的来源。',items:[
    {q:'孩子目前对"青春期身体变化和性"的了解，主要来自',hint:'孩子诚实回答，家长不评判。',opts:['家里讲的','学校生理课','同学朋友','网络（B站、小红书、抖音、搜索引擎）','不太清楚']},
    {q:'关于月经、遗精、变声这些，孩子觉得自己',hint:'让孩子评估自己，不是家长评估孩子。',opts:['都清楚原理，不困惑','知道大概，细节不太懂','听说过，但没系统了解','应该还不太清楚']},
    {q:'关于避孕和性传播疾病，你们俩',hint:'这一题两个人商量着选。',opts:['聊过，孩子也知道一些','想聊但不知道从哪开口','觉得孩子还小，等高中再说','没想过要聊这个']}]},
  {name:'心理与情绪',desc:'这一节关于感受。孩子说，家长听，不反驳。',items:[
    {q:'青春期以来，孩子的情绪起伏',hint:'家长先说观察，孩子再确认是否准确。',opts:['和以前差不多，偶尔烦躁','比以前容易发脾气，但能沟通','经常低落或暴躁，沟通变难','看不太出来']},
    {q:'孩子提到自己外貌/身材的频率',hint:'让孩子回想最近一个月。',opts:['很少提','偶尔抱怨一两句','经常说不喜欢自己某部分','不太愿意和家长说']},
    {q:'关于异性/恋爱话题，孩子',hint:'这一题选完后可以多聊几句——不评判地听。',opts:['主动聊过同学的事','问过一些相关问题','没主动提过，但应该有想法','看起来完全没兴趣']}]},
  {name:'家庭对话',desc:'这一节关于你们俩的对话方式。两个人都回答。',items:[
    {q:'在家里聊身体或性相关话题时',hint:'回忆上一次聊这类话题时的状态。',opts:['双方都比较自然','孩子愿意，家长有点尴尬','家长愿意，孩子抗拒','双方都尽量回避']},
    {q:'家长谈这些话题最大的难点是',hint:'家长诚实回答，孩子听着。',opts:['不知道怎么开口','自己也不太懂','怕说多反而引导孩子好奇','觉得孩子还小']},
    {q:'你们俩最近一次正式聊身体/性话题，是',hint:'"正式"指专门坐下来聊，不是顺带一句。',opts:['这一个月内','半年内','一年以上','记不清了 / 没正式聊过']}]},
  {name:'网络与信息',desc:'这一节关于屏幕里的性。家长可能没孩子知道得多——没关系。',items:[
    {q:'孩子在网上看性相关内容，家长',hint:'孩子诚实说，家长不批评。',opts:['知道，一起看过科普','知道孩子会看，但不知道具体看什么','不太了解情况','应该没看过']},
    {q:'关于网络色情内容（包括短视频里的擦边内容）',hint:'这一题可能让双方都尴尬，但请诚实选一个。',opts:['孩子接触过，家长知道并聊过','孩子接触过，家长知道但没聊过','不确定，但猜测可能接触过','应该没接触过']},
    {q:'如果孩子在网上看到让他/她困惑的性内容，他/她会',hint:'让孩子选自己真实会做的，不是"应该"做的。',opts:['问家长','问同学或朋友','自己继续搜','谁都不说，自己消化']}]},
  {name:'边界与安全',desc:'这一节关于保护。最重要的部分，请认真聊。',items:[
    {q:'关于"哪些身体接触是不可以的"，孩子',hint:'让孩子试着举一个例子。',opts:['清楚，能举例','大概知道','听说过但说不出具体','不太清楚']},
    {q:'关于"身体自主权"——任何人不能强迫你做不愿意的事',hint:'包括亲戚、长辈、老师、同学。',opts:['家里明确讲过','小时候讲过，最近没提','没专门讲过','觉得不需要专门讲']},
    {q:'孩子有没有遇到过让他/她不舒服的言语或行为',hint:'这一题如果孩子说有，请认真听完，不要追问细节，先肯定他/她愿意说。',opts:['没有','有，孩子主动说过','有，从其他渠道知道','不确定']}]}
]},
hs:{
  label:'高中版',
  title:'高中这三年，<br>有些事<em>得直接聊</em>。',
  tag:'— 亲子共填 · 适用于高中生',
  intro:'<p>高中生的身体基本发育完成，但性、爱、自我认同这些事，才刚刚真正开始。这份手册把那些家长不知道怎么开口、孩子也不愿主动说的事，拆成 18 个具体问题。</p><p>用法：<strong>家长和孩子坐在一起，每题先聊一两分钟，再共同选一个答案</strong>。没有标准答案。高中生已经接近成年，这份手册不是用来"教育"的，是用来"对话"的。</p>',
  note:'全程约 15–20 分钟。涉及性、身体、情绪、网络、边界等话题，会比初中版更直接。所有回答只保存在这台手机上。',
  chapters:['身体与自我认同 · 长大后的身体观','性知识与性健康 · 避孕、性同意、性病','心理与情感 · 恋爱、情绪、性少数','家庭对话 · 家里能不能聊这些','网络与信息 · 色情内容、约会软件','边界与安全 · 同意、骚扰、危险信号'],
  sections:[
  {name:'身体与自我认同',desc:'高中生身体发育基本完成，但对自己身体的感受才刚刚开始复杂。',items:[
    {q:'孩子对自己身体现状的整体感受是？',hint:'让孩子自己说，家长不补充、不反驳。',opts:['满意或比较接受','有不满但能接受','经常否定自己的外貌或身材','不太关注身体']},
    {q:'关于"自慰是正常的"这件事，家里',hint:'这一题可能让双方都尴尬。但高中生需要知道这不是病。',opts:['聊过，孩子知道是正常的生理现象','没正式聊过，但孩子应该知道','觉得这是不该谈的话题','没想过要聊这个']},
    {q:'孩子有没有表达过对自己身体的不安（外貌、发育、性别特征）',hint:'回忆具体那次对话，不是泛泛的印象。',opts:['说过，我们认真聊过','说过，但我没太当回事','没主动说过，但我感觉有','完全没提过']}]},
  {name:'性知识与性健康',desc:'这一节直接些。高中生需要的信息比家长以为的多。',items:[
    {q:'孩子目前对性知识的了解，主要来自',hint:'孩子诚实回答。家长可能不知道真相。',opts:['家里讲的','学校生理课或心理健康课','网络科普（B站、知乎、专业账号）','同学朋友','不太清楚']},
    {q:'关于避孕方法，孩子',hint:'包括避孕套、短效避孕药、紧急避孕药。',opts:['清楚知道主要方式和使用场景','知道避孕套，其他不太清楚','听说过但说不出具体','应该不太了解']},
    {q:'关于"性同意"——任何一方都有权在任何时候说"不"',hint:'这一题是整份手册最重要的一题。',opts:['家里明确聊过，孩子有清晰理解','隐约提过，没系统说过','没专门讲过，但觉得孩子应该懂','没专门讲过']}]},
  {name:'心理与情感',desc:'高中生的情感世界比家长看到的复杂。先听，再聊。',items:[
    {q:'孩子最近半年的情绪状态',hint:'让孩子先说，家长再补充观察。',opts:['基本稳定，偶尔烦躁','起伏较大，但能自我调节','经常低落、焦虑或暴躁','看不太出来']},
    {q:'关于恋爱/异性/同性关系，孩子',hint:'"恋爱"包括过去的、现在的、想谈的。',opts:['正在恋爱或有过恋爱经历','没谈过但表达过兴趣','没主动提过，但应该有想法','看起来完全没兴趣']},
    {q:'关于性少数群体（LGBTQ+）',hint:'这一题反映家庭的开放度，也影响孩子能不能跟家长聊身份认同。',opts:['家里聊过，孩子有开放态度','没正式聊过，但孩子应该能接受','家长不太了解这个话题','家庭观念比较传统，不好聊']}]},
  {name:'家庭对话',desc:'这一节关于你们俩的对话方式。两个人都诚实回答。',items:[
    {q:'在家里聊身体/性/恋爱话题时',hint:'回忆上一次聊这类话题时的状态。',opts:['双方都比较自然','孩子愿意，家长有点尴尬','家长愿意，孩子抗拒','双方都尽量回避']},
    {q:'家长谈这些话题最大的难点是',hint:'家长诚实回答，孩子听着。',opts:['不知道怎么开口','自己也不太懂','怕说多反而引导孩子','觉得孩子已经大了，应该自己懂']},
    {q:'孩子主动跟家长聊情感/性话题的频率',hint:'包括主动提起同学恋爱、网络看到的、自己的困惑。',opts:['偶尔会主动说','很少主动，被问到会说','基本不主动说','问了也不太愿意说']}]},
  {name:'网络与信息',desc:'这一节关于屏幕里的性。高中生几乎都接触过，区别在家长知不知道。',items:[
    {q:'孩子在网上接触性相关内容的情况，家长',hint:'孩子诚实说，家长不批评、不没收手机。',opts:['知道，主要看科普类','知道孩子看，但不确定具体内容','不太了解情况','应该没怎么看']},
    {q:'关于网络色情内容',hint:'这一题可能让双方都尴尬，但请诚实。',opts:['孩子接触过，家长知道并聊过','孩子接触过，家长知道但没聊过','不确定，但猜测可能接触过','应该没接触过']},
    {q:'关于网络性骚扰（不雅照片、言语骚扰、被要求发隐私照）',hint:'这一题如果孩子说遇到过，请认真听完。',opts:['聊过，孩子知道怎么应对','想聊但不知怎么开口','没专门聊过','没想过要聊']}]},
  {name:'边界与安全',desc:'最后一节，最重要的部分。请认真聊。',items:[
    {q:'关于恋爱中的身体边界',hint:'包括牵手、接吻、进一步亲密行为。',opts:['聊过，孩子有清晰认识','想聊但不知怎么开口','觉得孩子还没到那时候','没专门聊过']},
    {q:'孩子有没有遇到过让他/她不舒服的言语或行为',hint:'包括来自同学、熟人、网友、长辈。如果孩子说有，先听完，不要追问细节。',opts:['没有','有，孩子主动说过','有，从其他渠道知道','不确定']},
    {q:'如果孩子遇到让他/她不舒服的事，他/她会',hint:'让孩子选自己真实会做的，不是"应该"做的。',opts:['告诉家长','告诉朋友或同学','自己处理，不一定说','看情况，不一定告诉任何人']}]}
]}};

/* ================= 分析 ================= */
function analyzeMS(a){
  var R=[];
  /* 01 身体变化 */
  var b={status:'open',text:'',action:''};
  if(a.q2===2||a.q2===3){b.status='silent';b.text='身体变化已经发生，但家里至今没有正式聊过，主要靠学校或书本。孩子处于“自己消化”的状态。';b.action='散步时主动说一句“你最近身体变化挺大，有什么想问的随时问”，不追问。'}
  else if(a.q2===1){b.status='stuck';b.text='变化发生时聊过几句，但当时有点尴尬。这种“尴尬”会留在孩子记忆里，让他/她下次也不太想主动说。';b.action='借一本科普书或视频开头：“上次聊得匆忙，其实这没什么不能说的。”'}
  else{b.text='家里提前讲过身体变化，孩子有心理准备。这是很好的起点——孩子知道“家里能聊这些”。'}
  if(a.q3===3){b.text+=' 孩子最在意的是“发育比同龄人早或晚”——这种比较焦虑在青春期很常见，但不一定说出来。';b.action+=(b.action?' ':'')+'告诉孩子：发育时间差两三年都正常，没人按同一时间表长大。'}
  else if(a.q3!==4&&b.status==='open'){b.text+=' 孩子对身体有在意的地方。这不是问题，是信号。'}
  R.push({num:'01',title:'身体变化',s:b});
  /* 02 性知识来源 */
  var k={status:'open',text:'',action:''};
  if(a.q4===3){k.status='stuck';k.text='孩子关于性的知识主要来自网络。这不一定是坏事——网上确实有不错的科普——但信息质量参差，孩子不一定能分辨。';k.action='一起看一两个靠谱科普账号（如“第十一诊室”），建立信息判断力。'}
  else if(a.q4===2){k.status='stuck';k.text='孩子主要从同学朋友那里了解性知识。同龄人之间的信息互相补、也互相错。';k.action='让孩子知道：从朋友那听到什么，回家可以问家长，不评判。'}
  else if(a.q4===4){k.status='silent';k.text='家长不清楚孩子从哪里了解这些。这个“不清楚”本身就需要留意。'}
  else{k.text='孩子的性知识主要来自家里或学校，信息相对靠谱。'}
  if(a.q5>=2){if(k.status==='open')k.status='stuck';k.text+=' 孩子对月经、遗精、变声这些“知道名字但说不清原理”。这种半懂状态最容易在网上被带偏。';k.action+=(k.action?' ':'')+'推荐《我们的身体》或纪录片《人体的奥秘》，比口述更系统。'}
  if(a.q6===2||a.q6===3){k.text+=' 关于避孕和性传播疾病，家里还没聊过，且认为“还早”。';k.action+=(k.action?' ':'')+'从新闻或影视剧切入聊避孕套，初中生应该知道这些了。'}
  else if(a.q6===1){k.action+=(k.action?' ':'')+'买一本书放客厅，比直接开口容易。'}
  R.push({num:'02',title:'性知识来源',s:k});
  /* 03 心理与情绪 */
  var m={status:'open',text:'',action:''};
  if(a.q7===2){m.status='stuck';m.text='孩子青春期以来情绪经常低落或暴躁，沟通变难。这不只是“青春期闹脾气”，可能是真实的心理压力。';m.action='每天找 10 分钟不聊学习，只听孩子说，或安静待着。'}
  else if(a.q7===1){m.text='孩子情绪起伏但还能沟通，这是青春期正常的曲线。'}
  else if(a.q7===0){m.text='孩子情绪和以前差不多——但这不一定是“没问题”，有些孩子会把情绪藏起来。'}
  else{m.status='silent';m.text='家长看不太出孩子的情绪变化。可能孩子藏得比较好，也可能亲子相处时间不够。';m.action='增加不催任务的相处时间，如散步、看剧，情绪自然会流露。'}
  if(a.q8===2){m.text+=' 孩子经常说不喜欢自己外貌某部分。青春期对身体的不满很常见，但频繁否定自己需要关注。';m.action+=(m.action?' ':'')+'先认可感受“对自己挑剔是正常的”，再说一句具体的、不夸张的肯定。'}
  if(a.q9===2){m.text+=' 孩子对异性/恋爱有想法但没主动说。这不是“早恋苗头”，是正常的成长信号。';m.action+=(m.action?' ':'')+'借电影剧情聊：“你觉得他们这样谈恋爱怎么样？”'}
  R.push({num:'03',title:'心理与情绪',s:m});
  /* 04 家庭对话 */
  var f={status:'open',text:'',action:''};
  if(a.q10===3){f.status='silent';f.text='双方都尽量回避身体/性话题。这是很多家庭的常见状态，但不会自己变好。';f.action='承认尴尬：“我以前也没人聊这些，不知怎么开口，但我想试试。”'}
  else if(a.q10===2){f.status='stuck';f.text='家长愿意聊，但孩子抗拒。可能是孩子觉得“聊了你们也不懂”或者“会被教育”。';f.action='孩子开口时，第一句问“你怎么想的”，而不是“你应该怎样”。'}
  else if(a.q10===1){f.status='stuck';f.text='孩子愿意聊，家长尴尬。问题在家长这边。';f.action='家长坦白：“这事我也没人教过，有点不自在，但我愿意试。”'}
  else{f.text='双方聊这类话题比较自然——这是少数家庭的状态，值得保持。'}
  if(a.q11===0){f.text+=' 家长最大的难点是“不知道怎么开口”。';f.action+=(f.action?' ':'')+'说自己的经历：“我像你这么大时没人跟我聊这些，所以不知怎么开口。”'}
  else if(a.q11===1){f.text+=' 家长觉得自己也不太懂——这很正常，我们这一代家长大多没接受过系统性教育。';f.action+=(f.action?' ':'')+'找一本靠谱的书，两人各读一章互相讲给对方听。'}
  else if(a.q11===2){f.text+=' 家长担心“说多了反而引导孩子好奇”。研究证明相反——家长越躲闪，孩子越会从其他渠道找答案。'}
  else if(a.q11===3){f.text+=' 家长觉得孩子还小。但青春期身体变化已经开始了，时机其实正好。'}
  if(a.q12===2||a.q12===3){f.text+=' 最近一次正式聊这类话题已经是一年前甚至更久——或者根本没聊过。'}
  R.push({num:'04',title:'家庭对话',s:f});
  /* 05 网络与信息 */
  var n={status:'open',text:'',action:''};
  if(a.q14===1){n.status='stuck';n.text='孩子接触过网络色情内容（包括擦边），家长知道但没聊过。孩子带着一堆疑问和错位印象独自消化。';n.action='问孩子“看到那些是什么感觉”，并告诉孩子色情片是表演，不是真实的亲密关系。'}
  else if(a.q14===2){n.status='stuck';n.text='家长不确定孩子是否接触过，但猜测可能。这种“不确定”本身就是沟通不够的信号。';n.action='直接聊：“看到不舒服的内容可以告诉我，我不会批评你。”'}
  else if(a.q14===0){n.text='孩子接触过，且家长知道并聊过。这是最好的状态——孩子知道家长是“可以谈这个”的人。'}
  if(a.q15===2||a.q15===3){n.text+=' 孩子在网上看到困惑的性内容时，会选择自己搜或谁都不说。';n.action+=(n.action?' ':'')+'约定“问什么都不奇怪”规则：孩子问任何问题，家长先认真回答。'}
  else if(a.q15===1){n.text+=' 孩子会问同学，而不是家长。同龄人给的信息不一定准，但孩子觉得更安全。';n.action+=(n.action?' ':'')+'让家里成为“另一个答案来源”，孩子随时可问。'}
  else if(a.q15===0){n.text+=' 孩子会问家长——这是非常宝贵的信任。';n.action='认真回答，不会的就说“我也不确定，我们一起查查”。'}
  R.push({num:'05',title:'网络与信息',s:n});
  /* 06 边界与安全 */
  var d={status:'open',text:'',action:''};
  if(a.q16>=2){d.status='stuck';d.text='孩子对“哪些身体接触不可以”说不出具体。这是必须补的一课。';d.action='明确告诉孩子：内衣遮住的地方不能碰；不舒服的言语可拒绝；拒绝不需要理由。'}
  else if(a.q16===1){d.text='孩子大概知道边界，但说不出具体。可以再具体化。';d.action='让孩子举例“什么样的事是不行的”，能说出来才是真懂。'}
  else{d.text='孩子清楚身体边界，能举例。这是很好的自我保护基础。'}
  if(a.q17===1||a.q17===2){d.text+=' 关于“身体自主权”小时候讲过但最近没提，或者没专门讲过。';d.action+=(d.action?' ':'')+'青春期需重新强调身体自主权，这阶段社交更复杂。'}
  else if(a.q17===3){d.text+=' 家长觉得“身体自主权”不需要专门讲——其实需要。'}
  if(a.q18===1){d.status='stuck';d.text+=' 孩子主动说过遇到不舒服的言语或行为。孩子愿意说出来，说明他/她信任家长。';d.action='问孩子“你希望我怎么帮你”；如涉及霸凌或骚扰需联系学校。'}
  else if(a.q18===2){d.status='stuck';d.text+=' 孩子遇到过不舒服的事，但家长是从其他渠道知道的——孩子没主动说。';d.action='修复信任比追查细节重要，想想孩子为什么没说。'}
  else if(a.q18===3){d.status='silent';d.text+=' 家长不确定孩子是否遇到过。这个“不确定”本身就需要重视。';d.action='轻松场合聊别人：“你身边同学遇到过不舒服的事吗？”'}
  R.push({num:'06',title:'边界与安全',s:d});
  return R;
}

function analyzeHS(a){
  var R=[];
  /* 01 身体与自我认同 */
  var b={status:'open',text:'',action:''};
  if(a.q1===2){b.status='stuck';b.text='孩子经常否定自己的外貌或身材。高中阶段对身体的不满很常见，但“经常否定”需要关注——可能是普通的青春期焦虑，也可能是身体意象问题的早期信号。';b.action='不要反着说“你挺好”。先认可感受：“你说自己丑的时候，我心疼。”如果持续半年以上且影响饮食、社交，建议找心理咨询师聊聊。'}
  else if(a.q1===0||a.q1===1){b.text='孩子对自己身体比较接受。这是好事——高中阶段能做到这一点不容易。'}
  else{b.text='孩子不太关注身体。可能是真不在意，也可能是回避。'}
  if(a.q2===2||a.q2===3){if(b.status==='open')b.status='silent';b.text+=' 关于自慰，家里认为是“不该谈的话题”或没想过要聊。但高中生几乎都会有这种行为或好奇——回避只会让孩子独自带着羞耻感处理。';b.action+=(b.action?' ':'')+'找合适时机说一句“这是正常的生理现象，注意卫生和隐私就行”——这一句比一整堂性教育课都管用。'}
  else if(a.q2===1){b.text+=' 自慰这事没正式聊过，但觉得孩子应该知道。“应该知道”不等于“知道这是正常的”。'}
  else{b.text+=' 自慰这事家里聊过，孩子知道是正常现象。这是很开放的家庭态度。'}
  if(a.q3===1){if(b.status==='open')b.status='stuck';b.text+=' 孩子表达过身体不安，但家长当时没太当回事。这种“没被接住”的信号，孩子可能不会再说第二次。';b.action+=(b.action?' ':'')+'主动提起：“上次你说……我那时没认真听，现在想再听你说说。”承认自己当时没做好，比假装没发生更有效。'}
  else if(a.q3===2){b.text+=' 孩子没主动说过身体不安，但家长感觉有。这种“感觉”通常是对的。'}
  R.push({num:'01',title:'身体与自我认同',s:b});
  /* 02 性知识与性健康 */
  var k={status:'open',text:'',action:''};
  if(a.q4===3){k.status='stuck';k.text='孩子的性知识主要来自同学朋友。同学间传递的性信息互相补、也互相错——尤其避孕和性病，错信息后果很严重。';k.action='让家里成为“另一个答案来源”。买一本《我们的身体》放家里，不强迫看。'}
  else if(a.q4===2){k.text='孩子主要从网络科普获取性知识。信息质量参差。';k.action='和孩子互相推荐靠谱科普账号，自己先看，再和孩子聊。'}
  else if(a.q4===4){k.status='silent';k.text='家长不清楚孩子从哪里获取性知识。这个“不清楚”本身就是问题。'}
  else{k.text='孩子的性知识主要来自家里或学校，信息相对靠谱。'}
  if(a.q5<=1){if(k.status==='open')k.status='stuck';k.text+=' 关于避孕，孩子只知道避孕套或了解得更少。高中生需要知道短效避孕药、紧急避孕药等。';k.action+=(k.action?' ':'')+'这周找时间聊一次。从新闻或影视剧切入：“你听说过避孕药吗？”不要假设孩子“应该知道”。'}
  else if(a.q5===2){k.text+=' 避孕知识孩子“听说过但说不出具体”。这种半懂状态最危险。'}
  if(a.q6===2||a.q6===3){k.status='stuck';k.text+=' 关于“性同意”——任何一方有权在任何时候说“不”——家里没专门讲过。这是整份手册最重要的一题。';k.action='必须补这一课。明确告诉孩子：不就是不；喝酒时给的不是同意；恋爱不等于永久同意；自己说不也不需要理由。'}
  else if(a.q6===1){k.text+=' 性同意隐约提过，没系统说过。';k.action='让孩子试着说说什么算同意、什么不算。能说出来才是真懂。'}
  else{k.text+=' 性同意家里明确聊过，孩子有清晰理解。这是非常关键的保护。'}
  R.push({num:'02',title:'性知识与性健康',s:k});
  /* 03 心理与情感 */
  var m={status:'open',text:'',action:''};
  if(a.q7===2){m.status='stuck';m.text='孩子经常低落、焦虑或暴躁。高中生心理压力来源复杂，如果不只是“青春期闹脾气”，需要认真对待。';m.action='这周找出 15 分钟，不聊学习只听孩子说。如果持续两周以上情绪低落、失眠，带孩子看心理科。'}
  else if(a.q7===1){m.text='孩子情绪起伏但能自我调节。这是高中生常见的状态。'}
  else if(a.q7===0){m.text='孩子情绪基本稳定。但有些孩子会把情绪藏起来——“看不出问题”不等于“没问题”。'}
  else{m.status='silent';m.text='家长看不太出孩子的情绪。可能是亲子相处时间不够，也可能是孩子藏得深。';m.action='增加不催任务的相处时间。孩子需要的是“被当成一个人，而不是分数”。'}
  if(a.q8===0){m.text+=' 孩子正在恋爱或有过恋爱经历。这不是“早恋问题”，是成长的一部分。';m.action+=(m.action?' ':'')+'不要禁止或审问。可以说：“恋爱是正常的，有困惑随时跟我说。”让孩子知道你是支持者。'}
  else if(a.q8===2){m.text+=' 孩子没主动提过恋爱，但应该有想法。这种“不主动说”通常是因为预判家长会反对。'}
  if(a.q9===2||a.q9===3){if(m.status==='open')m.status='silent';m.text+=' 关于性少数群体，家长不太了解或家庭观念比较传统。这个话题不聊，会让一些孩子永远无法跟家长说真话。';m.action+=(m.action?' ':'')+'可以表示“如果你或你的朋友是，我愿意听你说”。这一句话可能很重要。'}
  else if(a.q9===0){m.text+=' 关于性少数群体，家里聊过且孩子有开放态度。这是很重要的家庭氛围。'}
  R.push({num:'03',title:'心理与情感',s:m});
  /* 04 家庭对话 */
  var f={status:'open',text:'',action:''};
  if(a.q10===3){f.status='silent';f.text='双方都尽量回避身体/性/恋爱话题。这是很多家庭的常见状态——但高中生已经接近成年，再不聊就来不及了。';f.action='打破“必须正式谈”的预设。坦白说：“我以前也没人聊这些，不知怎么开口，但我想试试。”'}
  else if(a.q10===2){f.status='stuck';f.text='家长愿意聊，但孩子抗拒。高中生抗拒通常是因为预判家长会“教育”或“反对”。';f.action='下次孩子开口时，第一句问“你怎么想的”，而不是“你应该怎样”。'}
  else if(a.q10===1){f.status='stuck';f.text='孩子愿意聊，家长尴尬。问题在家长这边。';f.action='家长坦白：“这事我自己也没人教过，所以有点不自在。但我愿意试。”'}
  else{f.text='双方聊这类话题比较自然。这是少数家庭的状态，值得保持。'}
  if(a.q11===0){f.text+=' 家长最大的难点是“不知道怎么开口”。';f.action+=(f.action?' ':'')+'承认尴尬就是最好的开口：“我像你这么大时没人跟我说过这些，所以也不知道怎么跟你聊。但我想试试。”'}
  else if(a.q11===1){f.text+=' 家长觉得自己也不太懂。这很正常。';f.action+=(f.action?' ':'')+'可以和孩子一起学。找一本靠谱的书，各读一章互相讲给对方听。'}
  else if(a.q11===2){f.text+=' 家长担心“说多了引导孩子好奇”。其实相反——家长越躲闪，孩子越容易接触到错信息。'}
  else if(a.q11===3){f.text+=' 家长觉得“孩子已经大了，应该自己懂”。但“应该懂”和“真懂”差很远。';f.action+=(f.action?' ':'')+'高中阶段是最后窗口期。等离开家，孩子再有什么困惑未必会回头问家长。'}
  if(a.q12===2||a.q12===3){f.text+=' 孩子基本不主动聊情感/性话题，问了也不愿说。这种“沉默”是高中阶段最需要警惕的信号之一。';f.action+=(f.action?' ':'')+'不要追问。先在小事上重建信任——孩子说任何事时，先听完，不急着评价。'}
  else if(a.q12===0){f.text+=' 孩子偶尔会主动说。这是宝贵的信任，要珍惜。'}
  R.push({num:'04',title:'家庭对话',s:f});
  /* 05 网络与信息 */
  var n={status:'open',text:'',action:''};
  if(a.q14===1){n.status='stuck';n.text='孩子接触过网络色情内容，家长知道但没聊过。色情片把性拍成表演，跟真实的亲密关系完全不同，孩子带着这些印象独自消化。';n.action='不要质问。可以问：“网上那些东西，你看到时是什么感觉？”然后告诉孩子：那不是真实的性，真实的关系是互相尊重、双方愿意。'}
  else if(a.q14===2){n.status='stuck';n.text='家长不确定孩子是否接触过，但猜测可能。这种“不确定”本身就是沟通不够的信号。';n.action='直接聊：“网上什么都搜得到，看到不舒服的可以告诉我，我不会批评你。”'}
  else{n.text='孩子接触过且家长知道并聊过——孩子知道家长是“可以谈这个”的人。'}
  if(a.q13===1||a.q13===2){n.text+=' 家长对孩子在网上看什么只有模糊的了解。';n.action+=(n.action?' ':'')+'和孩子互相推荐一个靠谱科普账号，自己先看，再一起聊。'}
  if(a.q15>=2){if(n.status==='open')n.status='stuck';n.text+=' 关于网络性骚扰（不雅照片、言语骚扰、被索要隐私照）还没正式聊过。';n.action+=(n.action?' ':'')+'明确三条应对：不回应、保留截图、第一时间告诉信任的大人。'}
  R.push({num:'05',title:'网络与信息',s:n});
  /* 06 边界与安全 */
  var d={status:'open',text:'',action:''};
  if(a.q16===0){d.text='恋爱中的身体边界聊过，孩子有清晰认识。这是高中阶段很重要的保护。'}
  else if(a.q16===1){d.status='stuck';d.text='想聊恋爱中的身体边界，但不知道怎么开口。越拖越难开口。';d.action='从影视剧场景切入：“你觉得到哪一步需要对方明确同意？”'}
  else{d.status='stuck';d.text='恋爱中的身体边界没有正式聊过——或觉得“还没到时候”。但孩子可能已经在约会了。';d.action='明确底线：任何亲密行为都需要双方清醒地同意；不确定时停下来问；自己说不也不需要理由。'}
  if(a.q17===1){d.status='stuck';d.text+=' 孩子主动说过遇到不舒服的言语或行为。孩子愿意说出来，说明信任还在。';d.action='问孩子“你希望我怎么帮你”；如涉及骚扰或霸凌，联系学校一起处理。'}
  else if(a.q17===2){d.status='stuck';d.text+=' 孩子遇到过不舒服的事，但家长是从其他渠道知道的。';d.action='修复信任比追查细节重要——想想孩子为什么没直接说。'}
  else if(a.q17===3){d.status='silent';d.text+=' 家长不确定孩子是否遇到过。这个“不确定”本身就需要重视。';d.action='借别人的事开口：“你身边同学遇到过不舒服的事吗？”'}
  if(a.q18===2||a.q18===3){d.text+=' 孩子遇到不舒服的事更可能自己处理、或看情况说。';d.action+=(d.action?' ':'')+'让“告诉家长”成为选项之一：先听完、不评判、一起想办法。'}
  R.push({num:'06',title:'边界与安全',s:d});
  return R;
}

/* ================= 状态 ================= */
var els={
  home:$('#stage-home'),quiz:$('#stage-quiz'),report:$('#stage-report'),
  topChip:$('#topChip'),progTrack:$('#progTrack'),progFill:$('#progFill'),
  dock:$('#dock'),doneCount:$('#doneCount'),totalCount:$('#totalCount'),
  dockBtn:$('#dockBtn'),dockLabel:$('#dockLabel'),toast:$('#toast'),
  backBtn:$('#backBtn'),versionGrid:$('#versionGrid')
};
var ST={open:['st-open','聊通'],stuck:['st-stuck','卡住'],silent:['st-silent','沉默']};
var ver='',answers={},note='',total=0,stage='home',io=null,toastT=null,pushed=false;
function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function pad(n){return n<10?'0'+n:''+n}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}

function showStage(s){
  stage=s;
  [['home',els.home],['quiz',els.quiz],['report',els.report]].forEach(function(p){
    var on=p[0]===s;p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  document.body.classList.toggle('has-dock',q);
  els.topChip.hidden=!q;els.progTrack.hidden=!q;els.dock.hidden=!q;
  if(!q&&io){Array.prototype.forEach.call(document.querySelectorAll('.sec'),function(el){io.unobserve(el)})}
  window.scrollTo(0,0);
}

/* ================= 草稿 ================= */
function key(){return'youthDialogDraft-'+ver}
function saveDraft(){try{localStorage.setItem(key(),JSON.stringify({a:answers,n:note}))}catch(e){}}
function clearDraft(){try{localStorage.removeItem(key())}catch(e){}}
function loadDraft(){try{var d=JSON.parse(localStorage.getItem(key()));if(d&&d.a)return d}catch(e){}return null}

function toast(msg){
  els.toast.textContent=msg;els.toast.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){els.toast.classList.remove('show')},2400);
}

/* ================= 问卷渲染 ================= */
function start(v){
  ver=v;var d=DATA[v];answers={};note='';
  var html='<div class="intro stage-in">'+
    '<div class="tag">'+d.tag+'</div><h1>'+d.title+'</h1>'+d.intro+
    '<div class="intro-note">'+d.note+'</div>'+
    '<div class="chapters"><div class="chapters-title">六个章节 · 18 个问题</div>'+
    d.chapters.map(function(c,i){return'<div class="chapter-row"><span class="ch-num">'+pad(i+1)+'</span><span class="ch-name">'+c+'</span></div>'}).join('')+
    '</div></div>';
  var n=0;
  d.sections.forEach(function(sec,si){
    html+='<section class="sec" data-label="'+pad(si+1)+' · '+sec.name+'">'+
      '<header class="section-title"><span class="section-num">'+pad(si+1)+'</span><h2>'+sec.name+'</h2></header>'+
      (sec.desc?'<p class="section-desc">'+sec.desc+'</p>':'');
    sec.items.forEach(function(it){
      n++;
      html+='<div class="q" id="q'+n+'">'+
        '<div class="q-head"><span class="q-num">'+pad(n)+'</span><div class="q-text">'+it.q+'</div></div>'+
        (it.hint?'<p class="q-hint">'+it.hint+'</p>':'')+
        '<div class="opts">'+it.opts.map(function(o,oi){
          return'<label class="opt"><input type="radio" name="q'+n+'" value="'+oi+'">'+
            '<span class="opt-box"></span><span class="opt-text">'+o+'</span></label>'}).join('')+
        '</div></div>';
    });
    html+='</section>';
  });
  total=n;
  html+='<div class="notes"><label class="notes-label" for="freeNote">NOTES · 聊出来的新东西</label>'+
    '<textarea class="text-in" id="freeNote" rows="4" placeholder="比如孩子说的一句让你意外的话、你们约定的一件小事……（选填）"></textarea></div>';
  els.quiz.innerHTML=html;
  els.totalCount.textContent=total;

  /* 恢复草稿 */
  var draft=loadDraft();
  if(draft&&draft.a){
    var has=false;
    for(var kk in draft.a){has=true;break}
    if(has){
      answers=draft.a;note=draft.n||'';
      for(var k2 in answers){
        var q=els.quiz.querySelector('#q'+k2.slice(1));
        if(q){q.classList.add('done');
          var inp=q.querySelector('input[value="'+answers[k2]+'"]');
          if(inp)inp.checked=true}
      }
      var ta=$('#freeNote');if(ta)ta.value=note;
      toast('已恢复上次的填写进度');
    }
  }
  updateProgress();
  if(!pushed){try{history.pushState({q:1},'');pushed=true}catch(e){}}
  showStage('quiz');
  bindScrollSpy();
}

/* 滚动章节监测 */
function bindScrollSpy(){
  if(!('IntersectionObserver'in window))return;
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(en.isIntersecting)els.topChip.textContent=DATA[ver].label+' · '+en.target.dataset.label;
    });
  },{rootMargin:'-15% 0px -75% 0px'});
  Array.prototype.forEach.call(document.querySelectorAll('.sec'),function(el){io.observe(el)});
}

/* ================= 进度 & 跳转 ================= */
function doneCount(){var n=0;for(var k in answers)n++;return n}
function updateProgress(){
  var c=doneCount();
  els.progFill.style.width=(c/total*100)+'%';
  els.doneCount.textContent=c;
  var full=c>=total;
  els.dockBtn.classList.toggle('go',full);
  els.dockLabel.textContent=full?'生成对话报告':'下一题未答';
}
function nextUnanswered(){
  for(var i=1;i<=total;i++){
    if(answers['q'+i]==null)return document.getElementById('q'+i);
  }
  return null;
}
function jump(){
  var el=nextUnanswered();
  if(el){el.scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'center'});buzz(6)}
  else{showReport()}
}

/* ================= 报告渲染 ================= */
function showReport(){
  var res=(ver==='ms'?analyzeMS:analyzeHS)(answers);
  var cnt={open:0,stuck:0,silent:0};
  res.forEach(function(r){cnt[r.s.status]++});
  var now=new Date();
  var date=now.getFullYear()+'.'+pad(now.getMonth()+1)+'.'+pad(now.getDate());

  var html='<div class="report">'+
    '<div class="report-head"><div class="tag">— 对话报告 · '+DATA[ver].label+'</div>'+
    '<h2>你们的青春期对话地图</h2><div class="date">'+date+' · 亲子共填</div></div>'+
    '<div class="report-summary">六个章节里，你们<b>聊通了 '+cnt.open+' 个</b>，有 <b>'+cnt.stuck+' 个卡住</b>，还有 <b>'+cnt.silent+' 个处于沉默</b>。这不是成绩单，只是接下来的入口。</div>';
  res.forEach(function(r,i){
    var st=ST[r.s.status];
    html+='<div class="r-section" style="animation-delay:'+(0.1+i*0.08)+'s">'+
      '<h3><span class="num">'+r.num+'</span>'+r.title+'<span class="status '+st[0]+'">'+st[1]+'</span></h3>'+
      '<div class="r-desc">'+r.s.text+'</div>'+
      (r.s.action?'<div class="action"><strong>试试这样做：</strong>'+r.s.action+'</div>':'')+
      '</div>';
  });

  /* 汇总三件事 */
  var acts=[];
  res.forEach(function(r){if(r.s.status!=='open'&&r.s.action)acts.push(r.s.action)});
  res.forEach(function(r){if(acts.length<3&&r.s.status==='open'&&r.s.action)acts.push(r.s.action)});
  if(acts.length<3)acts=acts.concat(['这周找一个不赶时间的场合，把这页报告和孩子一起看一遍','从最容易开口的一条开始，不必全部做到','聊的过程中听比说重要：先问“你怎么想”，再说你的想法']).slice(0,3);
  html+='<div class="actions-list"><h3>接下来可以试的三件事</h3><ol>'+
    acts.slice(0,3).map(function(x){return'<li><strong>'+x+'</strong></li>'}).join('')+'</ol></div>';

  if(note.trim())html+='<div class="note-echo"><span class="label">你们写下的</span>'+esc(note.trim())+'</div>';

  html+='<div class="contact-card">'+
    '<div class="cg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg></div>'+
    '<div class="cg-title">联系我们获取专业支持</div>'+
    '<div class="cg-text">如果对话中发现了让你担心的情况，或不知道如何继续，欢迎联系我们获取更多专业支持与帮助。</div></div>'+
    '<div class="report-footer">本报告由亲子共填问卷生成，仅供参考，不构成任何诊断。<div class="warn">如孩子提到已发生让你不安的骚扰或侵害，请认真对待，必要时联系学校或专业机构介入。</div></div>'+
    '</div>'+
    '<div class="bottom-actions">'+
    '<button class="bottom-btn" id="rptHome" type="button">返回首页</button>'+
    '<button class="bottom-btn primary" id="rptRestart" type="button">重新填写</button></div>';
  els.report.innerHTML=html;
  $('#rptHome').addEventListener('click',function(){showStage('home')});
  $('#rptRestart').addEventListener('click',function(){clearDraft();showStage('home')});
  showStage('report');
}

/* ================= 事件 ================= */
els.versionGrid.addEventListener('click',function(e){
  var c=e.target.closest('[data-version]');
  if(c)start(c.dataset.version);
});
els.versionGrid.addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){
    var c=e.target.closest('[data-version]');
    if(c){e.preventDefault();start(c.dataset.version)}
  }
});
els.quiz.addEventListener('change',function(e){
  var t=e.target;
  if(t.name&&/^q\d+$/.test(t.name)){
    answers[t.name]=+t.value;
    t.closest('.q').classList.add('done');
    updateProgress();saveDraft();buzz(6);
  }
});
els.quiz.addEventListener('input',function(e){
  if(e.target.id==='freeNote'){note=e.target.value;saveDraft()}
});
els.dockBtn.addEventListener('click',jump);
els.backBtn.addEventListener('click',function(){
  if(stage==='home'){location.href='index.html';return}
  if(stage==='quiz'&&pushed){history.back()}else{showStage('home')}
});

/* 系统返回：问卷中挽留，其余回首页 */
window.addEventListener('popstate',function(){
  if(!pushed)return;
  pushed=false;
  if(stage==='quiz'&&doneCount()>0&&!confirm('确定退出本次填写吗？已答内容会自动保留在这台手机上。')){
    pushed=true;try{history.pushState({q:1},'')}catch(e){}
    return;
  }
  showStage('home');
});
})();
