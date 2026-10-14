
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）
var HINT='选最接近自己真实状态的一项';

/* ================= 图标 ================= */
var IC={
peer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
teacher:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
opposite:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>',
scene:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
self:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/></svg>',
parent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'};

/* ================= 维度名 & 顺序 ================= */
var NAMES_PM={peer:'同学关系',teacher:'师生关系',opposite:'异性同学交往',scene:'场景适应',parent:'家庭观察'};
var ORD_PM=['peer','teacher','opposite','scene','parent'];
var NAMES={primary:NAMES_PM,middle:NAMES_PM,
  high:{peer:'同学关系',teacher:'师生关系',opposite:'异性/情感关系',scene:'场景适应',self:'自我认知与未来',parent:'家庭观察'}};
var ORD={primary:ORD_PM,middle:ORD_PM,
  high:['peer','teacher','opposite','scene','self','parent']};

/* ================= 题库（选项分值 3→0 降序；v = 住校/走读分支） ================= */
var RAW={
primary:[
{d:'peer',t:'在班里，你大多数时候是和谁一起玩？',o:['经常和好几个同学一起玩','和固定的一两个好朋友玩','有时自己玩，有时跟别人玩','经常一个人玩，不太主动找别人']},
{d:'peer',t:'当你想加入同学的游戏或活动时，你会怎么做？',o:['直接跑过去问“我可以一起玩吗？”','在旁边看一会儿，等别人叫','有点犹豫，不太敢主动说','不想加入，一个人待着更自在']},
{d:'peer',t:'当同学不小心弄坏了你的东西时，你通常会……',o:['虽然有点不开心，但会说“没关系”','会不太高兴，但过一会儿就好了','会生气，想让对方赔','会告诉老师或家长']},
{d:'peer',t:'当好朋友要转学或很久不能见面时，你心里的感受是……',o:['会觉得舍不得，但能接受','会难过一段时间','会特别难过，不想让 ta 走','不知道，好像还没经历过']},
{d:'teacher',t:'上课时，你举手回答问题的次数是……',o:['经常举手，答错也不怕','有时举手，有把握才举','很少举手，怕答错','从来不举手，希望老师别点我']},
{d:'teacher',t:'当老师批评你时，你心里的感受是……',o:['能接受，知道自己哪里做得不对','有点难过，但能改正','觉得委屈，不太想说话','会很生气，觉得老师不公平']},
{d:'teacher',t:'遇到不会的问题时，你会主动去问老师吗？',o:['经常会，不懂就问','有时会，看情况','很少会，怕被老师说','从来不会，自己硬想']},
{d:'opposite',t:'当你和异性同学一起值日或做小组作业时，你的感觉是……',o:['像和其他同学一样，没什么特别','刚开始会有点紧张，一会儿就好','不太自在，有点不知道说什么','会想避开，不想一起做']},
{d:'opposite',t:'当有人开玩笑说“某某喜欢某某”时，你的想法是……',o:['觉得是闹着玩的，不太当真','听着有点不好意思，但不会说什么','会觉得不太舒服，不喜欢这种话题','心里会想到某个人，但不说']},
{d:'opposite',t:'对于班上异性同学，你最近的感觉是……',o:['和普通同学一样，没什么特别','个别同学比较有意思，但不会多想','有时会偷偷多看几眼','不太关注，也没什么感觉']},
{d:'scene',v:{b:{t:'在宿舍里，你和室友相处得怎么样？',o:['相处得很好，像好朋友一样','还行，能一起聊天活动','一般般，有时会觉得有点不舒服','不太好，经常有矛盾或摩擦']},
  w:{t:'放学回到家后，你通常喜欢做什么？',o:['先吃点东西，跟家人聊聊天','先写作业，做完再玩','先玩一会儿手机或看电视','进房间关上门，不太想说话']}}},
{d:'scene',v:{b:{t:'想家的时候，你通常会怎么做？',o:['告诉朋友，说说就好了','打电话或发消息给家人','一个人偷偷难过','尽量不去想，忍一忍']},
  w:{t:'你希望家人用什么方式和你聊学校的事？',o:['轻松地随便聊聊，不要追问细节','先问“今天有没有什么开心的事”','等我主动说，不要一直问','不太想聊，希望家人不要问']}}},
{d:'parent',h:'',t:'【家长填写】最近孩子提起班里同学时，您观察到的情况是……',o:['经常会主动提到一两个好朋友的名字','偶尔提起，没有特别多细节','比较少提到同学相关的事','似乎有意回避聊同学的话题']},
{d:'parent',h:'',t:'【家长填写】您最近观察到的孩子情绪状态大致是……',o:['比较平和稳定，有说有笑','起伏属于正常范围，偶尔烦躁','时好时坏，不太容易捉摸','有些低落或烦躁，比往常沉默']},
{d:'parent',h:'',t:'【家长填写】您与孩子目前的沟通状态是……',o:['经常能聊一些学校里的事','日常事务沟通比较顺畅','沟通比较少，主要聊学习','容易因小事产生摩擦或冲突']}
],
middle:[
{d:'peer',t:'课间或自由活动时，你大多数时候的状态是……',o:['加入一小群同学的聊天或活动','和一两位好友单独聊几句','自己看书、写作业或刷手机','想加入别人，但没人邀请我']},
{d:'peer',t:'当你需要借文具或请教问题时，你会……',o:['直接找附近的同学，开口很自然','找最熟悉的那一两位同学','犹豫一会儿，最后才开口','宁可自己想办法，也不想麻烦别人']},
{d:'peer',t:'当班里发生意见分歧或小争执时，你通常是……',o:['帮大家理清思路、调和一下的人','不站队，等大家自己说清楚','会表达自己的看法，但不太说服别人','尽量走开，不想卷入']},
{d:'peer',t:'当朋友主动跟你分享心事或秘密时，你会……',o:['认真听完，告诉对方“我不会跟别人说”','听完之后给一两条建议','不知道该说什么，怕接不住','有点担心自己说错话让对方不开心']},
{d:'teacher',t:'上课被老师点名回答问题时，你的第一反应是……',o:['站起来平静作答，答错也没关系','有点紧张，但能开口回答','脑子突然一片空白','希望老师下次别再点自己']},
{d:'teacher',t:'课后遇到不太懂的地方，你会去找老师吗？',o:['经常会，老师讲完就清楚了','偶尔会，实在搞不懂才去','很少去，怕打扰老师','从不主动去，怕被觉得“没听懂”']},
{d:'teacher',t:'当老师当众指出你的问题或批评你时，你心里的感受通常是……',o:['能接受，知道自己哪里需要改','表面点头，心里不太舒服','有点委屈，觉得自己被误解了','不太想理这件事，过一会就忘']},
{d:'opposite',t:'当有异性同学主动和你说话时，你会……',o:['像跟其他同学一样自然地交流','稍微有点紧张，但能接住话','不太知道该说什么，回答简短','想赶紧结束对话，转身走开']},
{d:'opposite',t:'当班里有人聊起“谁喜欢谁”这类话题时，你的态度是……',o:['不参与，专注于自己的事','偶尔听一听，不评价','觉得跟自己没什么关系','心里会想到某个人，但不说']},
{d:'opposite',t:'当你发现自己最近对某位异性同学多了几分留意时，你会……',o:['觉得这是青春期很正常的现象，该学习就学习','偶尔想起，但不影响正常生活','心里有点乱，不知道这种感受算什么','担心被同学或家长发现，会刻意回避']},
{d:'scene',v:{b:{t:'寝室里同学作息习惯不太一样时，你的处理方式是……',o:['主动跟大家商量一个都能接受的时间','默默适应，尽量不打扰别人','偶尔觉得委屈，但忍着不说','经常因此睡不好，心里有些烦躁']},
  w:{t:'放学回到家后，你和家人聊得最多的是……',o:['学校里发生的各种事','当天的学习情况、考试或作业','简单回应家人的询问，不太展开','不太想说话，想自己待一会儿']}}},
{d:'scene',v:{b:{t:'离开家人住在学校，你最近的感受是……',o:['已经比较适应，能享受集体生活','基本适应，偶尔会想家','经常想家，晚上特别明显','很不习惯，希望能早点回家']},
  w:{t:'当家人问起“今天在学校怎么样”时，你的反应通常是……',o:['愿意分享，会说上几句','挑几件说，剩下的留着','觉得家人不太理解，简单应付','不太想聊，希望家人别再追问']}}},
{d:'parent',h:'',t:'【家长填写】最近孩子提起班里同学时，您观察到的情况是……',o:['经常会主动提到一两个好朋友的名字','偶尔提起，没有特别多细节','比较少提到同学相关的事','似乎有意回避聊同学的话题']},
{d:'parent',h:'',t:'【家长填写】您最近观察到的孩子情绪状态大致是……',o:['比较平和稳定，有说有笑','起伏属于正常范围，偶尔烦躁','时好时坏，不太容易捉摸','有些低落或烦躁，比往常沉默']},
{d:'parent',h:'',t:'【家长填写】您与孩子目前的沟通状态是……',o:['经常能聊一些较深入的话题','日常事务沟通比较顺畅','沟通比较少，主要聊学习','容易因小事产生摩擦或冲突']}
],
high:[
{d:'peer',t:'清晨走进教室时，你大多数时候的状态是……',o:['电量比较满，能自然跟人打招呼','一般般，跟固定几个人点个头就坐下','有点闷，想先自己待一会儿再说','觉得有点喘不过气，不太想面对人群']},
{d:'peer',h:'不必选“应该有的反应”，选最真实的那一个',t:'当好朋友最近一次大考成绩大幅超过你时，你心里的真实反应是……',o:['真心为 ta 高兴，不太影响自己','表面祝贺，心里有一点不舒服但能消化','心里挺别扭，会忍不住跟自己比较','会有意无意地疏远 ta 一阵子']},
{d:'peer',t:'当朋友情绪低落、反复找你倾诉同一件事时，你通常会……',o:['能耐心陪着，知道自己能接多少','会陪着，但过后觉得挺累','听几次后会建议 ta 找别人聊聊','心里烦，但不好意思说出口']},
{d:'peer',t:'当你在班级群或社交媒体上看到同学讨论，你通常会……',o:['积极参与讨论','偶尔冒个泡','只看不说话，默默刷过去','会觉得有压力，不想看']},
{d:'teacher',t:'当某科老师讲课你跟不太上时，你的做法通常是……',o:['课后找老师或同学请教','自己查资料、问同学解决','标记下来，等复习时再说','默默放着，心里有些焦虑但不知怎么开口']},
{d:'teacher',t:'当你被老师当众批评或指出问题时，你的内心反应通常是……',o:['能接受，知道自己哪里需要改','表面接受，心里不太舒服，过会儿就好','觉得没面子，会反复想很久','会下意识对抗，觉得老师不理解自己']},
{d:'teacher',t:'关于选科/选专业方向，老师对你的影响……',o:['比较大，会认真参考老师的意见','中等，会听但主要自己决定','不大，主要看自己和家人','没怎么跟老师聊过这些']},
{d:'opposite',t:'当班里有同学对你表示出超出普通朋友的好感时，你会……',o:['像平常一样自然相处，不让气氛尴尬','会留意，但保持平常距离','有点紧张，不知道该怎么应对','会下意识想躲开，怕处理不好']},
{d:'opposite',t:'当你发现自己最近对某位同学多几分留意时，你会……',o:['觉得是正常的，专注当下的事','偶尔想起，不影响正常生活','心里有些乱，有时会影响专注','担心被同学或家长发现，刻意回避']},
{d:'opposite',t:'关于“喜欢”和“被喜欢”，你目前的状态比较接近……',o:['没有特别的心动，专注学业','有欣赏的人，但没想发展','有过心动，但没说出口','正在或曾经有过一段关系']},
{d:'self',t:'关于选科/选专业/未来方向，你目前的状态是……',o:['有比较清晰的方向','有大致方向，但不完全确定','比较模糊，正在摸索','比较迷茫，希望有人能指点']},
{d:'self',t:'当最近一次努力了但结果不理想时，你的反应通常是……',o:['先消化情绪，然后找原因、调整方法','难过一阵子，过几天就恢复了','会反复回想，怀疑自己是不是不行','会想要放弃，一时提不起劲']},
{d:'self',t:'独处（没有别人在身边）的时候，你通常……',o:['挺享受的，有自己的节奏','还行，偶尔会觉得有点空','会觉得无聊，不知道干什么','不太喜欢独处，容易胡思乱想']},
{d:'self',t:'当成绩排名波动比较大时，你通常……',o:['能平常心看待，专注下一步','会有点在意，但能调整过来','会焦虑，忍不住反复和别人比较','会情绪低落好几天，学不进去']},
{d:'scene',v:{b:{t:'寝室里大家作息不一致时，你通常……',o:['会主动商量出大家都能接受的方案','默默适应，尽量不打扰别人','偶尔觉得委屈，但忍着不说','经常因此睡不好，心里烦躁']},
  w:{t:'放学回家后，你通常的状态是……',o:['比较放松，会跟家人聊几句','一般，按部就班做自己的事','比较累，不太想说话','很压抑，回家也不轻松']}}},
{d:'scene',v:{b:{t:'周末返校时，你的感受是……',o:['挺平静的，已经习惯了','有点不舍，但能接受','明显不想回学校','会很低落，周日晚上尤其难受']},
  w:{t:'当家人问“今天在学校怎么样”时，你通常……',o:['愿意分享，会说上几句','挑几件说，剩下的留着','简单应付，不太展开','不太想聊，希望别再追问']}}},
{d:'scene',v:{b:{t:'想家的时候，你通常……',o:['跟室友或家人说说，就好了','打电话回家，聊完就缓过来','一个人偷偷难过','尽量不去想，忍一忍']},
  w:{t:'每天早晨出门上学时，你的心情通常是……',o:['比较平静，有时还有点期待','一般般，没什么特别感觉','有点抵触，尤其是有考试的日子','经常不想去，会想办法拖延']}}},
{d:'parent',h:'',t:'【家长填写】最近孩子提起班里同学时，您观察到的情况是……',o:['经常会主动提到一两个好朋友的名字','偶尔提起，没有特别多细节','比较少提到同学相关的事','似乎有意回避聊同学的话题']},
{d:'parent',h:'',t:'【家长填写】您最近观察到的孩子情绪状态大致是……',o:['比较平和稳定，有说有笑','起伏属于正常范围，偶尔烦躁','时好时坏，不太容易捉摸','有些低落或烦躁，比往常沉默']},
{d:'parent',h:'',t:'【家长填写】您与孩子目前的沟通状态是……',o:['经常能聊一些较深入的话题','日常事务沟通比较顺畅','沟通比较少，主要聊学习','容易因小事产生摩擦或冲突']}
]};

/* ================= 维度分析（共享 + 覆写） ================= */
var D_PEER={good:'孩子在同学群体中比较自在，能主动建立联系，也愿意在朋友需要时给予支持。',
 ok:'孩子与同学相处基本顺畅，但更依赖少数熟悉的朋友，在陌生社交情境中可能略显被动。',
 watch:'孩子在同学关系中可能有一些不被看见的退缩，建议留意是否在某些情境中感到不被接纳。',
 care:'孩子与同学的连接较弱，可能存在孤立感。建议家长以陪伴姿态了解具体情况。'};
var D_PEER_HS={good:'孩子在同学关系中比较自在，能处理竞争与边界，也能在朋友需要时给予支持。',
 ok:'孩子与同学相处基本顺畅，但在竞争压力或情绪边界上偶尔会有些内耗。',
 watch:'孩子在同伴关系中可能有一些未被表达的退缩或比较压力，建议留意具体场景。',
 care:'孩子与同学的连接较弱，可能存在孤立感或较强的比较焦虑。建议找一个信任的人聊聊真实感受。'};
var D_TEACHER={good:'孩子与老师的互动自然，能从师生关系中获得支持感和方向感。',
 ok:'孩子对老师整体接受，但主动互动较少，可能错过一些被关注和被引导的机会。',
 watch:'孩子与老师之间可能存在一些未被表达的紧张或委屈，建议轻柔地了解。',
 care:'孩子对师生关系感到明显不适，可能影响学习状态，建议必要时与班主任沟通。'};
var D_OPP={good:'孩子对异性同学的态度自然，没有过多困扰，符合这个年龄段健康发展的节奏。',
 ok:'孩子对异性同学略有紧张，但能正常交往，这是成长过程中常见的状态。',
 watch:'孩子对异性同学的关注可能带来一些内心困扰，建议以轻松的方式打开话题。',
 care:'孩子在异性交往方面可能感到明显焦虑或回避，建议家长以接纳态度了解。'};
var D_OPP_M={good:'孩子对异性同学的态度自然，没有过多困扰，符合青春期健康发展的节奏。',
 ok:'孩子对异性同学略有紧张，但能正常交往，这是青春期常见的状态。',
 watch:'孩子对异性同学的关注可能带来一些内心困扰，建议以轻松的方式打开话题。',
 care:'孩子在异性交往方面可能感到明显焦虑或回避，建议家长以接纳态度了解。'};
var D_OPP_HS={good:'孩子对情感话题态度自然，没有过多困扰，符合青春期健康发展的节奏。',
 ok:'孩子对情感略有留意或紧张，但能基本正常交往，这是高中阶段常见的状态。',
 watch:'孩子对情感话题可能有一些内心困扰，甚至影响专注，建议以轻松的方式打开这个话题。',
 care:'孩子在情感方面可能感到明显焦虑或回避，建议以接纳态度了解自己的真实感受。'};
var D_SCENE={
 primary:{good:'孩子已经较好地适应了校园生活，无论是在校还是回家都能找到自己的节奏。',
  ok:'孩子基本适应校园生活，但在某些环节可能还有一些小摩擦或不适应。',
  watch:'校园生活节奏可能给孩子带来一些压力，建议关注具体场景中的情绪反应。',
  care:'孩子对校园生活明显不适应，建议家长与学校加强沟通，共同寻找解决方案。'},
 middle:{good:'孩子已经较好地适应了校园生活，住校或走读的节奏都比较顺畅。',
  ok:'孩子基本适应校园生活，但偶尔会有想家或寝室小摩擦，属于正常范围。',
  watch:'校园生活节奏可能给孩子带来一些压力，建议关注具体场景中的情绪反应。',
  care:'孩子对校园生活明显不适应，建议家长与学校加强沟通，共同寻找解决方案。'},
 high:{good:'孩子已经较好地适应了校园生活，住校或走读的节奏都比较顺畅。',
  ok:'孩子基本适应校园生活，压力大时偶有想家或寝室小摩擦，属于正常范围。',
  watch:'校园生活节奏可能给孩子带来一些压力，建议关注具体场景中的情绪反应。',
  care:'孩子对校园生活明显不适应，建议家长与学校加强沟通，共同寻找解决方案。'}};
var D_SELF={good:'孩子对未来有较清晰的方向感，能面对成绩波动，独处时也有自己的节奏。',
 ok:'孩子对未来有大方向但未完全确定，能基本应对起伏，独处时偶有空虚感。',
 watch:'孩子在自我认知和未来方向上存在一些迷茫，这是高中阶段的常见议题，值得花时间探索。',
 care:'孩子对未来比较迷茫，且容易被成绩波动击溃，建议主动找一个信任的成年人聊一聊。'};
var D_PARENT={good:'您对孩子的观察细致而积极，与孩子的连接较为顺畅。',
 ok:'您对孩子有一定了解，但部分信号可能被忽略，可以多留心日常细节。',
 watch:'您对孩子最近的状态可能存在一些盲区，建议主动但不强求地增加相处时间。',
 care:'您与孩子之间的观察和沟通存在明显缺口，建议优先重建日常连接。'};
function buildDescr(v){
  var d={teacher:D_TEACHER,parent:D_PARENT};
  d.peer=v==='high'?D_PEER_HS:D_PEER;
  d.opposite=v==='primary'?D_OPP:(v==='middle'?D_OPP_M:D_OPP_HS);
  d.scene=D_SCENE[v];
  if(v==='high')d.self=D_SELF;
  return d;
}

/* ================= 行动建议 ================= */
var SUG_PM={ // 小学/初中共享
 peer:{watch:{t:'试着发起一次“低成本”的互动',d:'不必追求“交到新朋友”。可以从一件小事开始：课间主动问同桌一道题、给前后桌递一块糖、加入一次小组讨论。友谊常常是从这种 5 秒钟的善意开始的。'},
  care:{t:'了解孩子具体的卡点在哪里',d:'是被某几个同学排挤？还是没有共同话题？还是觉得自己“不合群”？不同的卡点需要不同的回应。可以先和孩子聊聊“班里的同学大概分成几拨”，从外部观察切入。'}},
 teacher:{watch:{t:'鼓励孩子下周主动找一位老师问一次问题',d:'不必是班主任，选 ta 觉得“没那么怕”的那位老师即可。哪怕只是课后留下来问一句“老师，刚才那道题我没太听懂”，都是一次有意义的突破。'},
  care:{t:'先了解孩子怕老师背后的具体原因',d:'是因为某次被批评？还是觉得老师偏心？还是自己学不会而羞愧？不要急着评价“老师也是为你好”，先让 ta 说完。'}}};
var SUG={
primary:{peer:SUG_PM.peer,teacher:SUG_PM.teacher,
 opposite:{watch:{t:'把“对异性同学的好奇”正常化',d:'小学中高年级对异性同学多几分关注是很正常的，不必把它当作“问题”。可以找机会，用轻松的语气聊聊“班里有没有比较有意思的同学”。'},
  care:{t:'不要追问，先建立“可以聊”的氛围',d:'如果孩子对异性话题明显回避，强行追问只会让 ta 关上门。可以先分享自己小时候的故事，让孩子感到“大人也经历过这个阶段”。'}},
 scene:{watch:{t:'关注孩子每天的“情绪电量”',d:'放学后可以问问“今天在学校里，哪件事让你觉得开心？哪件事让你觉得累？”这比“今天怎么样”更能让孩子打开话匣子。'},
  care:{t:'评估当前的学校安排是否合适',d:'如果孩子持续情绪低落、睡眠差、不想上学，可能需要与学校沟通，调整学习节奏或寻求心理支持。这不是“娇气”，而是需要被看见的信号。'}}},
middle:{peer:SUG_PM.peer,teacher:SUG_PM.teacher,
 opposite:{watch:{t:'把“对异性同学的好奇”正常化',d:'青春期对异性同学多几分关注是非常正常的，不必把它当作“问题”。可以找机会，用轻松的语气聊聊“班里有没有比较有意思的同学”，让孩子知道这个话题在家里是安全的。'},
  care:{t:'不要追问，先建立“可以聊”的氛围',d:'如果孩子对异性话题明显回避，强行追问只会让 ta 关上门。可以先分享自己青春期的小故事，让孩子感到“大人也经历过这个阶段”。'}},
 scene:{watch:{t:'关注孩子的睡眠质量',d:'住校不适最常体现在睡眠上。可以问 ta：“寝室晚上一般几点能安静下来？”如果长期睡不好，可能需要与生活老师沟通调整寝室安排。'},
  care:{t:'评估住校/走读是否仍然合适',d:'如果孩子持续低落、睡眠差、情绪波动大，可以与学校协商是否调整方式。这不是“放弃”，而是为孩子选择更匹配的成长环境。'}}},
high:{
 peer:{watch:{t:'区分“朋友的情绪”和“自己的情绪”',d:'高中阶段朋友倾诉频繁，容易产生“情绪耗竭”。可以试着在心里画一条线：ta 的事我愿意听，但 ta 的情绪不一定是我的责任。当自己电量低时，允许说“我今天也累，明天再聊好吗”。'},
  care:{t:'先了解自己具体的卡点',d:'是觉得跟同学没有共同话题？还是在意成绩差距？还是觉得自己“不合群”？不同的卡点需要不同的回应。可以先观察一周：哪些时刻你觉得最孤立，哪些时刻又意外地舒服。'}},
 teacher:{watch:{t:'主动找一位老师问一次问题',d:'不必是班主任，选觉得“没那么怕”的那位老师即可。师生关系往往是在这种小互动里被重塑的。'},
  care:{t:'先分清“怕老师”和“被老师误解”',d:'前者需要自己练习主动沟通，后者可能需要家长协助。可以试着写下：“我最不希望老师对我做的事是___，我希望老师知道的是___”。'}},
 opposite:{watch:{t:'把“对某人的留意”正常化',d:'高中阶段对某位同学多几分留意是非常正常的，不必把它当作“问题”或“错误”。可以找机会，用轻松的语气跟信任的朋友或家人聊聊。'},
  care:{t:'评估这份留意是否在消耗你',d:'如果这种留意已经让你难以专注、情绪大起大落，可以先试着拉开一点物理距离，让情绪先降温。不必急着“想清楚这算不算喜欢”。'}},
 scene:{watch:{t:'关注自己的睡眠质量',d:'住校不适最常体现在睡眠上。如果长期睡不好，可能需要与生活老师沟通调整寝室安排，这是基本的生理需要。'},
  care:{t:'评估住校/走读是否仍然合适',d:'如果持续低落、睡眠差、情绪波动大，可以与家长、学校协商是否调整方式。这不是“放弃”，而是为自己选择更匹配的成长环境。'}},
 self:{watch:{t:'允许“还没想清楚”是一种状态',d:'高中阶段不需要立刻回答“我未来想干什么”。可以先观察：哪些事让你做完有满足感？哪些课你愿意多花时间？这些是方向的线索。'},
  care:{t:'把“未来”拆成可以试探的小问题',d:'不要问自己“我未来想干什么”——这个问题太大。可以问：下周我想多了解哪一门课？这个月我想试试哪件没做过的事？未来是一块块小砖头垒起来的。'}}}};

/* ================= 版本配置 ================= */
var CFG={
primary:{tag:'6–12岁 · 小学阶段',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],
 lead:'这一版聚焦友谊的建立与集体的融入：和谁一起玩、敢不敢举手、怎么看老师和异性同学，以及走读/住校生活里的那些小感受。'},
middle:{tag:'12–15岁 · 初中阶段',grades:['初一','初二','初三'],
 lead:'青春期的人际关系悄悄变了模样。这一版聚焦同伴压力、师生距离、对异性同学的留意，以及住校或走读生活里的适应。'},
high:{tag:'15–18岁 · 高中阶段',grades:['高一','高二','高三'],
 lead:'这一版聚焦竞争与边界、情感困扰、自我认知与未来方向——那些高中生活里容易藏在心里的事，变成可以一起聊的话题。'}};

/* ================= 画像 & 等级 ================= */
var PROFILE={
good:{title:'自在融入',desc:'孩子在校园人际关系中整体比较舒展，能自然与同学、老师相处，对校园生活有较好的适应感。这是很宝贵的状态，请继续保持日常的倾听与陪伴。'},
ok:{title:'稳步成长',desc:'孩子整体基本适应校园生活，但在某些具体环节上会有一些小摩擦或不确定。这些都是成长过程中常见的、可以慢慢调整的部分。'},
watch:{title:'需要支持',desc:'孩子当前的校园人际关系可能有一些未被表达的困扰，已经影响到日常情绪或学习状态。建议家长以陪伴而非追问的姿态，先了解具体的卡点。'}};
var LVL={good:'顺畅',ok:'尚可',watch:'留意',care:'关注'};
var PARENT_NOTE={
good:'您对孩子的观察细致而积极，与孩子的连接较为顺畅。继续保持这份“看见”——被理解的经验，本身就是孩子面对人际关系时最好的底气。',
ok:'您对孩子有一定了解，但部分信号可能被忽略。可以在接送、饭桌这些自然的场合多听少问，让“聊聊同学”变成日常的一部分。',
watch:'您对孩子最近的状态可能存在一些盲区。不必刻意追问，可以先从分享自己一天的见闻开始，把说话的氛围先养起来。',
care:'您与孩子之间的观察和沟通存在明显缺口。建议优先重建日常的轻量连接——先修复关系，再谈建议；必要时欢迎联系我们获取支持。'};
var KEEP_ADVICE='目前各维度状态都不错，无需刻意调整。可以隔一两个月再做一次，观察状态的自然变化。';
function lvlOf(p){return p>=75?'good':p>=55?'ok':p>=35?'watch':'care'}

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),result:$('#page-result'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formLead:$('#formLead'),formFields:$('#formFields'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),resultTitle:$('#resultTitle'),
  pfCard:$('#pfCard'),pfTitle:$('#pfTitle'),pfDesc:$('#pfDesc'),pfStats:$('#pfStats'),
  dimList:$('#dimList'),adviceList:$('#adviceList'),parentAdvice:$('#parentAdvice'),
  ageCards:$('#ageCards'),backBtn:$('#backBtn'),toast:$('#toast')
};
var ver='',set=null,flat=[],answers=[],idx=0,stage='landing',user={},timer=null,pushed=false,toastT=null;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function opts(a){return a.map(function(t){return '<option>'+t+'</option>'}).join('')}
function toast(msg){
  els.toast.textContent=msg;els.toast.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){els.toast.classList.remove('show')},2200);
}

function showStage(s){
  clearTimeout(timer);
  stage=s;
  [['landing',els.landing],['form',els.form],['quiz',els.quiz],['result',els.result]].forEach(function(p){
    var on=p[0]===s;p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  els.brand.hidden=q;els.topQuiz.hidden=!q;els.progressTrack.hidden=!q;
  window.scrollTo(0,0);
}

/* ================= 表单 ================= */
function pickAge(v){
  ver=v;
  set={names:NAMES[v],descr:buildDescr(v),sug:SUG[v],raw:RAW[v]};
  user={};
  els.formTag.textContent=CFG[v].tag;
  els.formLead.textContent=CFG[v].lead;
  els.formFields.innerHTML=
    '<div><label class="f-label" for="fName">昵称（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>'+
    '<div class="f-row">'+
    '<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(CFG[v].grades)+'</select></div>'+
    '<div><label class="f-label" for="fScene">就学场景</label><select class="f-input" id="fScene">'+opts(['走读','住校'])+'</select></div></div>';
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  var grade=$('#fGrade'),scene=$('#fScene');
  if(!grade.value){toast('请选择年级');return}
  if(!scene.value){toast('请选择就学场景');return}
  user={name:($('#fName').value||'').trim(),grade:grade.value,scene:scene.value};
  /* 按就学场景展开分支题目 */
  flat=set.raw.map(function(it){
    if(it.v){var q=user.scene==='住校'?it.v.b:it.v.w;return{d:it.d,t:q.t,h:it.h,o:q.o}}
    return it;
  });
  answers=flat.map(function(){return -1});
  idx=0;
  els.qTotal.textContent=flat.length;
  showStage('quiz');
  renderQ(1);
}

/* ================= 问卷 ================= */
function renderQ(dir){
  var q=flat[idx];
  els.dimText.textContent=set.names[q.d];
  els.qIdx.textContent=idx+1;
  els.progressFill.style.width=((idx+1)/flat.length*100).toFixed(1)+'%';
  els.qText.textContent=q.t;
  var h=q.h===undefined?HINT:q.h;
  els.qHint.textContent=h;els.qHint.hidden=!h;
  els.qOptions.innerHTML='';
  q.o.forEach(function(t,i){
    var b=document.createElement('button');
    b.type='button';
    b.className='q-opt'+(answers[idx]===i?' sel':'');
    b.innerHTML='<span class="q-mark">'+'ABCD'[i]+'</span><span>'+t+'</span>';
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
  els.nextLabel.textContent=idx===flat.length-1?'查看结果':'下一题';
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

/* ================= 计分与报告 ================= */
function compute(){
  var per={},cnt={};
  flat.forEach(function(q,i){
    per[q.d]=(per[q.d]||0)+(3-answers[i]);
    cnt[q.d]=(cnt[q.d]||0)+1;
  });
  var dims=ORD[ver].map(function(k){
    var pct=Math.round((per[k]||0)/(cnt[k]*3)*100);
    return{k:k,name:set.names[k],pct:pct,lv:lvlOf(pct)};
  });
  var core=dims.filter(function(d){return d.k!=='parent'});
  var total=Math.round(core.reduce(function(s,d){return s+d.pct},0)/core.length);
  return{dims:dims,total:total,g:total>=75?'good':total>=50?'ok':'watch'};
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

function renderReport(res){
  els.resultTitle.textContent=user.name?'「'+user.name+'」的校园日常地图':'你的校园日常地图';

  var col=res.g==='good'?'var(--olive)':res.g==='ok'?'#9C6A14':'var(--terra)';
  els.ring.style.transition='none';
  els.ring.style.strokeDashoffset=C;
  els.ring.style.stroke=col;
  els.totalScore.style.color=col;
  if(REDUCED){
    els.ring.style.strokeDashoffset=Math.round(C*(1-res.total/100));
    els.totalScore.textContent=res.total;
  }else{
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      els.ring.style.transition='';
      els.ring.style.strokeDashoffset=C*(1-res.total/100);
    })});
    countUp(els.totalScore,res.total,1300);
  }

  var pf=PROFILE[res.g];
  els.pfCard.className='verdict-card lv-'+res.g;
  els.pfTitle.textContent=pf.title;
  els.pfDesc.textContent=pf.desc;
  var cnt={good:0,ok:0,watch:0,care:0};
  res.dims.forEach(function(d){cnt[d.lv]++});
  els.pfStats.innerHTML='各维度中：<b class="sg">'+cnt.good+'</b> 个顺畅 · <b class="sy">'+cnt.ok+
    '</b> 个尚可 · <b class="sw">'+cnt.watch+'</b> 个留意 · <b class="sc">'+cnt.care+'</b> 个关注';

  els.dimList.innerHTML='';
  var k=0;
  res.dims.forEach(function(d){
    var card=document.createElement('div');
    card.className='dim-card lv-'+d.lv;
    card.style.animationDelay=(0.12+k*0.09)+'s';
    card.innerHTML=
      '<div class="dim-head">'+
        '<div class="dim-name">'+IC[d.k]+d.name+'<span class="dim-level lvl-'+d.lv+'">'+LVL[d.lv]+'</span></div>'+
        '<div class="dim-score"><b>'+d.pct+'</b> /100</div>'+
      '</div>'+
      '<div class="dim-mini-bar"><i style="--p:'+(d.pct/100).toFixed(3)+';animation-delay:'+(0.35+k*0.09)+'s"></i></div>'+
      '<p class="dim-desc">'+set.descr[d.k][d.lv]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  var weak=res.dims.filter(function(d){
      return d.k!=='parent'&&(d.lv==='watch'||d.lv==='care')&&set.sug[d.k];
    }).sort(function(a,b){return a.pct-b.pct}).slice(0,3);
  els.adviceList.innerHTML='';
  if(weak.length){
    var m=0;
    weak.forEach(function(d){
      var s=set.sug[d.k][d.lv];
      var el=document.createElement('div');
      el.className='advice-item';
      el.style.animationDelay=(0.2+m*0.08)+'s';
      el.innerHTML='<span class="a-tag">'+d.name+'</span><div class="t">'+s.t+'</div><div class="d">'+s.d+'</div>';
      els.adviceList.appendChild(el);
      m++;
    });
  }else{
    els.adviceList.innerHTML='<div class="advice-item" style="animation-delay:.2s"><span class="a-tag">保持</span><div class="t">状态不错</div><div class="d">'+KEEP_ADVICE+'</div></div>';
  }

  var pd=res.dims.filter(function(d){return d.k==='parent'})[0];
  els.parentAdvice.textContent=PARENT_NOTE[pd?pd.lv:'ok'];
}

function finish(){
  clearTimeout(timer);
  renderReport(compute());
  showStage('result');
}

/* ================= 事件 ================= */
els.ageCards.addEventListener('click',function(e){
  var c=e.target.closest('[data-age]');
  if(c)pickAge(c.dataset.age);
});
els.ageCards.addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){
    var c=e.target.closest('[data-age]');
    if(c){e.preventDefault();pickAge(c.dataset.age)}
  }
});
 $('#startBtn').addEventListener('click',startQuiz);
els.prevBtn.addEventListener('click',function(){go(-1)});
els.nextBtn.addEventListener('click',function(){go(1)});
 $('#restartBtn').addEventListener('click',function(){showStage('landing')});
els.backBtn.addEventListener('click',function(){
  if(stage==='landing'){location.href='index.html';return}
  if(stage==='quiz'&&pushed){history.back()}else{showStage('landing')}
});

/* 系统返回：问卷中挽留，其余回首页 */
window.addEventListener('popstate',function(){
  if(!pushed)return;
  pushed=false;
  if(stage==='quiz'&&answers.some(function(a){return a>=0})&&
     !confirm('确定退出本次探索吗？当前作答不会被保存。')){
    pushed=true;
    try{history.pushState({s:1},'')}catch(e){}
    return;
  }
  showStage('landing');
});

/* 桌面端键盘支持：← → 切题，1-4 选答案 */
document.addEventListener('keydown',function(e){
  if(stage!=='quiz')return;
  if(e.key==='ArrowRight')go(1);
  else if(e.key==='ArrowLeft')go(-1);
  else if(/^[1-4]$/.test(e.key))pick(+e.key-1);
});
})();
