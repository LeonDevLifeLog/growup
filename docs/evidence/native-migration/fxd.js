
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};

/* ================= 配置 ================= */
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= 题库 ================= */
var BANK={
ms:{
study:[
{q:'晚上写完作业合上书本那一刻，你心里通常是什么感觉？',hint:'选最接近自己最近一周真实状态的那一项',
 opts:['充实，大致知道今天解决了什么问题','松了一口气，总算写完了','很累但有点空虚，不知道一天怎么过的','烦躁，觉得作业是一种折磨']},
{q:'当某次考试成绩不理想时，你事后的真实反应是……',
 opts:['会分析错题，调整下一步的学法','难过一阵子，过几天就放下了','表面不在意，心里怀疑自己是不是不够聪明','会有点想放弃这门课，觉得学了也没用']},
{q:'写作业或复习时，你是否容易分心？',
 opts:['比较专注，能按计划完成','偶尔想看下手机或发呆，但能拉回来','经常忍不住看手机，导致写得很慢','完全坐不住，总是拖到很晚才匆忙写完']},
{q:'关于“我现在为什么要学习”，你的真实想法是……',
 opts:['有自己的目标（比如想考某所高中、将来做某件事）','知道是为了中考，但再深一层没细想','主要是怕父母批评或老师惩罚','经常觉得没意思，但也不敢不学']}
],
life:[
{q:'最近一周，你觉得开心或者完全放松的时刻多吗？',
 opts:['挺多的，经常有开心的事','一般，偶尔有放松的时候','比较少，总觉得有什么压在心里','几乎没有，每天都很烦']},
{q:'当你连续玩手机或打游戏一小时后，心里的感受通常是……',
 opts:['放松够了，能自然放下手机去做该做的事','有点空虚，但还是会忍不住接着玩','停下来后有罪恶感，觉得又浪费了时间','更烦躁，甚至因为被打断而发脾气']},
{q:'遇到烦心事时，你通常怎么处理？',
 opts:['找好朋友或父母倾诉','自己写写日记或听听歌消化掉','靠玩手机或吃东西来转移注意力','憋在心里，容易对身边的人发火']},
{q:'除了学习，你目前有自己喜欢并愿意投入时间的事吗？',
 opts:['有明确的爱好（如运动、画画、阅读等）','有兴趣但没时间做','以前有，现在觉得没意思了','没什么特别的爱好']}
],
future:[
{q:'想到中考后的高中生活，你的心情是……',
 opts:['有点期待，想快点长大','没什么特别感觉，走一步看一步','有点焦虑，担心考不上好高中','很抗拒，不想面对更大的压力']},
{q:'关于“将来想成为什么样的人”或“想做什么工作”，你想过吗？',
 opts:['有比较具体的想法','有几个大概的方向，但还没定','只想着考上高中，再远的事没想过','完全没概念，也不想去想']},
{q:'你平时了解高中、大学或各种职业信息的渠道主要是……',
 opts:['自己主动上网查过或问过长辈','听父母或老师说起过','看短视频或听同学聊到的','基本没主动了解过']},
{q:'当父母跟你聊起未来规划时，你的真实反应是……',
 opts:['愿意聊，能说出自己的想法','听着他们说，心里不一定认同','觉得他们不懂，不想聊','一聊就变成说教，容易吵起来']},
{q:'关于“如果中考没考好会怎样”，你内心的真实感受是……',
 opts:['能接受，知道人生不止这一条路','有点担心，但尽量不去想','一想就害怕，觉得前途全毁了','觉得这种事真的会发生，提前绝望']}
],
confusion:[
{q:'看到身边同学非常拼命学习时，你的心态通常是……',
 opts:['不太受影响，知道自己的节奏','会有点焦虑，觉得自己是不是该更努力','经常因此紧张，学不进去','会反向产生“不想学了”的抵触情绪']},
{q:'你觉得自己是个怎样的人？',
 opts:['比较清楚自己的优缺点和喜好','知道一点，但有点模糊','不太清楚，经常变','很迷茫，不知道真正的自己是什么样']},
{q:'你会觉得“没人真正懂我”吗？',
 opts:['不会，有懂我的人','偶尔这么觉得，但能自我调节','经常这么觉得，觉得有点孤单','一直这么觉得，也不想让人懂']},
{q:'当你感到迷茫或心情低落时，你会怎么做？',
 opts:['找信任的人聊聊','自己闷着，等它自己过去','用玩手机或睡觉来逃避','装作没事，不想让任何人看出来']}
],
parent:[
{q:'【家长填写】最近孩子主动跟你聊起学校趣事、朋友关系或心情的频率是……',
 opts:['比较频繁，愿意主动分享','偶尔会提一些','比较少主动开口','几乎不主动聊，问了也不愿说']},
{q:'【家长填写】你观察到孩子目前的学习动力大致是……',
 opts:['有较清晰的目标，主动安排学习','靠父母督促，但能配合','时好时坏，容易分心或烦躁','明显抗拒或敷衍，提不起劲']},
{q:'【家长填写】当你跟孩子聊起未来或高中规划时，你们的真实状态是……',
 opts:['能平和讨论，互相倾听','各说各的，难以说到一块去','容易变成单方面说教，孩子不爱听','几乎没法聊，一开口就容易起冲突']}
]},
hs:{
study:[
{q:'晚自习结束走在回寝室/家的路上，回想这一天，你心里的真实感受通常是……',hint:'选最接近自己最近一周真实状态的那一项',
 opts:['充实，大致知道今天解决了什么问题','好像很忙，但说不出具体做了什么','疲惫且空虚，觉得又是被推着走的一天','有点自责，觉得今天又没达到自己的期待']},
{q:'当你为某次考试努力复习了，结果却并不理想时，你事后的真实反应是……',
 opts:['会分析失分点，调整下一阶段的策略','难过一阵，过几天就放下了','表面不在意，心里怀疑自己是不是“不是这块料”','会有点想放弃这门课，觉得努力也没用']},
{q:'当你发现自己在书桌前坐了两个小时，但其实效率很低时，你会……',
 opts:['停下来休整一下，重新规划任务','继续坐着，至少要保持“在学习”的姿态','心里烦，开始刷手机逃避','会自责，但第二天还是会重复这种状态']},
{q:'关于“我为什么学习”这个问题，你目前的状态是……',
 opts:['有比较清晰的内在动力（比如为了某个领域、某种生活）','知道是为了考好大学，但再深一层没细想','主要是为了不让父母失望、不落后于同学','经常觉得没意义，但又不敢不学']}
],
life:[
{q:'当你连续刷了半小时以上短视频或游戏后，你心里的感受通常是……',
 opts:['放松够了，能自然切换到该做的事','有点空虚，但还是会继续刷','停下来后有明显的罪恶感，觉得自己又浪费了时间','经常因此熬夜，第二天很后悔']},
{q:'周末或休息日没有学习任务时，你通常会……',
 opts:['有自己喜欢做的事（爱好、运动、阅读等）','主要靠手机或游戏打发时间','想休息，但心里总觉得“该学习”，没法真正放松','睡觉，觉得怎么都睡不够']},
{q:'上一次你感到“活着真好”或“这一刻很值得”是什么时候？',
 opts:['最近一周内有过这种时刻','最近一个月内有过','记不太清了，好像挺久以前','几乎没什么这种时刻']},
{q:'当你情绪低落时，你通常的应对方式是……',
 opts:['能找到方式排解（运动、写东西、找人聊）','自己闷着，等它自己过去','用刷手机或吃东西来麻痹自己','会陷入更深的自我否定']}
],
future:[
{q:'当想到“大学专业”或“未来职业”时，你的状态是……',
 opts:['有比较明确的方向，知道大概想学什么','知道几个可能的方向，但还没确定','知道不想学什么，但不知道想学什么','完全没概念，想到就头疼']},
{q:'关于“理想生活”的画面，你脑海里……',
 opts:['有比较具体的场景（比如从事什么工作、过怎样的日子）','只有抽象的感觉（比如“自由”“稳定”）','只有“考上好大学”这一个目标，再往后没想过','不愿意想，觉得想也没用']},
{q:'你平时了解专业、职业信息的来源主要是……',
 opts:['主动看过书、网站或跟相关的人聊过','家长提过一些，自己偶尔留意','主要是短视频或同学聊天听来的','基本没主动了解过']},
{q:'当家人跟你聊起未来规划时，你的真实反应是……',
 opts:['愿意聊，能说出自己的想法','听他们说，心里有自己的想法但不一定说','觉得他们不懂现在的就业环境，不想聊','一聊就容易变成争吵或冷战']},
{q:'关于“考不上理想大学会怎样”这个问题，你的内心状态是……',
 opts:['能接受，知道路不止一条','有点担心，但尽量不去想','一想就焦虑，觉得人生会因此完蛋','觉得这真的会发生，提前放弃了一些期待']}
],
confusion:[
{q:'当“我究竟为了什么而学”这个念头冒出来时，你通常……',
 opts:['能较快找到一个具体的理由安顿下来','让它掠过，继续做手头的事','会陷入较长时间的内耗，影响效率','暂时去打游戏或睡觉，逃避这个问题']},
{q:'看到身边同学非常拼命（“卷”）时，你的真实心态是……',
 opts:['不太受影响，知道自己的节奏','会被带动一点焦虑，但能拉回来','经常因此焦虑，觉得自己不够努力','会反向产生“不想学了”的抵触情绪']},
{q:'当你感到迷茫、不知道下一步怎么走时，你会……',
 opts:['找信任的人聊聊，或自己查阅资料','跟好朋友吐槽一下，互相安慰','自己闷着想，但越想越乱','装作没事，不想让任何人看出来']},
{q:'面对“别人都已经想清楚了，只有我还迷茫”这种念头时，你的反应是……',
 opts:['知道其实多数人都没完全想清楚','偶尔会这么觉得，但能自我开解','经常这么觉得，心里更慌','深信自己就是落后了，更不愿意开口']}
],
parent:[
{q:'【家长填写】最近孩子主动跟你聊起“学习意义”“未来想做什么”这类话题的频率是……',
 opts:['比较频繁，会主动分享想法','偶尔会提一些','比较少主动开口','几乎不主动聊，一聊就抵触']},
{q:'【家长填写】你观察到孩子最近一段时间的“内在动力”状态大致是……',
 opts:['有较清晰的目标，主动安排学习','靠外部督促，但能配合','时好时坏，容易陷入内耗','明显懈怠或迷茫，提不起劲']},
{q:'【家长填写】当你跟孩子聊未来规划时，你们的真实状态是……',
 opts:['能平和讨论，互相倾听','各说各的，难以达成共识','容易变成说教，孩子不愿听','几乎没法深入聊，干脆不聊']}
]}};

/* ================= 文案 ================= */
var DIMS={study:'学习状态反思',life:'生活觉察',future:'未来规划',confusion:'迷茫应对',parent:'家庭观察'};
var LEVELS=[[75,'稳定','lvl-good','good'],[55,'尚可','lvl-ok','ok'],[35,'留意','lvl-watch','watch'],[0,'关注','lvl-care','care']];
function levelOf(p){for(var i=0;i<4;i++){if(p>=LEVELS[i][0])return LEVELS[i]}return LEVELS[3]}

var TEXT={
ms:{
verdicts:[
[85,'你对自己当下的状态有<span class="hl">比较清晰的觉察</span>。你在学习上有自己的节奏，也能在情绪起伏时找到出口。即使偶尔迷茫，你也大概知道自己在往哪个方向走。继续保持这份对自己的诚实和关注。'],
[70,'你整体上<span class="hl">在努力适应初中生活的节奏</span>，但在某些环节会偶尔内耗或分心。这在青春期是非常正常的状态——觉察本身就是成长的开始。下面分项地图会指出哪些地方可以多留意。'],
[50,'你最近可能<span class="hl">处于一种“被推着走”的疲惫感</span>里。这不代表你出了问题，而是说明你跟自己内心的连接被外部的任务挤占了空间。允许自己暂时停下来整理一下，比硬撑着更有效。'],
[0,'你当前的内在状态<span class="hl">比较消耗</span>，可能已经影响到了日常的精力和情绪。这不是“矫情”，而是有些重要的问题还没被看见。建议找一个你信任的老师、朋友或家长聊聊；必要时可以联系学校心理老师，这是对自己负责的选择。']],
desc:{
study:{good:'你对学习状态有较清晰的觉察，能区分“真努力”和“假性努力”，也有一定的内在动力。',
 ok:'你基本能维持学习节奏，但偶尔会陷入“为了完成任务而学”的惯性，对意义的追问容易被作业压下去。',
 watch:'你可能正处于“假装努力”或“注意力涣散”的边缘，建议留意每天写作业时的真实感受。',
 care:'你对学习的意义感比较混乱，可能已出现明显的内耗或抵触。先停下来理一理，不必硬撑。'},
life:{good:'你在日常生活中能找到真实的“活着”的感觉，有恢复情绪的方式，也能基本驾驭娱乐与休息的边界。',
 ok:'生活节奏基本可控，但休息时容易带有罪恶感，娱乐后偶有空虚感。',
 watch:'你可能正在用玩手机等方式麻痹自己，真实的放松反而很少。留意情绪低落时自己的应对模式。',
 care:'你对日常生活的感知比较麻木，可能长期处于疲惫或烦躁中。试着主动寻找一件能让自己开心的小事。'},
future:{good:'你对未来有较具体的方向感，也在主动收集信息，能平和地与家人讨论规划。',
 ok:'你对未来有模糊的方向，但还没具体化，遇到具体选择时容易犹豫。',
 watch:'你对未来比较迷茫，想到就头疼，倾向于回避——这在初中阶段很常见，值得慢慢探索。',
 care:'你对未来几乎没有画面，且想到就焦虑。不急着“立刻想清楚”，先从了解身边大人从事的工作开始。'},
confusion:{good:'你面对迷茫有较成熟的方式，知道如何安顿自己，也不容易被“别人都在努力”的念头绑架。',
 ok:'偶尔被迷茫扰动，但基本能拉回来。可以多积累几个自我开解的具体方法。',
 watch:'经常陷入“为什么学”“我行不行”的内耗，且容易独自消化，找一个可倾诉的对象会轻松很多。',
 care:'迷茫已经明显影响你的状态，且你倾向于装作没事。找一个不会评判你的成年人聊一聊吧。'},
parent:{good:'孩子愿意主动分享，你们的沟通基础不错——这是青春期很重要的保护因素。',
 ok:'沟通时有时无很正常。聊学习前，先接住TA的情绪，效果会好很多。',
 watch:'孩子开口的次数在变少，说教可能正在替代倾听。试着先聊感受，再聊成绩。',
 care:'沟通通道比较封闭：问而不答。这个阶段修复关系比推进规划更重要，必要时可寻求专业支持。'}}
},
hs:{
verdicts:[
[85,'你对自己当下的状态有<span class="hl">比较清晰的觉察</span>。学习和生活之间有粗略的平衡，即使偶尔迷茫，你也大致知道自己在往哪走。高中是场长跑，保持这份对自己的诚实很重要。'],
[70,'你整体上<span class="hl">在适应高中的节奏</span>，但部分环节存在内耗——可能是效率、休息，或对未来的不确定感。这在高中阶段非常常见，觉察到它就是调整的开始，分项地图标出了值得留意的地方。'],
[50,'你最近可能<span class="hl">处于“被推着走”的疲惫感</span>里：日程很满，但与自己内心的连接被挤占了。允许自己停一停、整理一下，比硬撑更有效。'],
[0,'你当前的内在状态<span class="hl">比较消耗</span>，可能已影响到精力、情绪和睡眠。这不是“矫情”或“不够坚强”，而是有些重要的问题还没被看见。建议尽快找一个信任的老师、家长或学校心理老师聊聊，也欢迎联系我们。']],
desc:{
study:{good:'你对学习状态的觉察比较清晰，能区分“有效努力”和“耗时间”，受挫后能较快回到策略层面。',
 ok:'能维持学习节奏，但有时陷入“姿态性学习”——人在书桌前，心已游离。留意效率低下的时段。',
 watch:'可能正处于“低效努力＋自我批评”的循环：越累越自责，越自责越难专注。',
 care:'学习的意义感明显不足，内耗与回避可能在叠加。先照顾状态，再谈方法；必要时联系学校心理老师。'},
life:{good:'生活中保有真实的愉悦时刻，也有自己的恢复方式，娱乐与休息的边界基本清晰。',
 ok:'生活基本可控，但休息常带罪恶感，刷手机后的空虚感在累积。',
 watch:'可能正用刷手机、睡觉来“关机”，而非真正恢复。算算多久没有过“活着真好”的瞬间了？',
 care:'对日常的感知趋于麻木，疲惫在深层累积。请把“找到一件让自己放松的小事”当作正经任务来完成。'},
future:{good:'你对专业与方向有相对具体的思考，也在主动收集信息，与家人的讨论基本平和。',
 ok:'方向感是有的，但停在“知道几个可能”，遇到具体选择仍会摇摆。',
 watch:'提到未来就头疼或回避，“只知道不想学什么”。这在高中很常见，用小步探索代替硬想。',
 care:'对未来几乎没有画面，且伴随明显焦虑。先别逼自己“想清楚”，从了解一个职业、一个人开始。'},
confusion:{good:'你有安顿迷茫的办法，不容易被“别人都想清楚了”的念头绑架。',
 ok:'偶尔被迷茫扰动，但能自我开解。多备几个具体的“着陆”动作会更有底气。',
 watch:'内耗频繁且习惯独自消化，“装作没事”的次数在变多。给自己找一个出口。',
 care:'迷茫已明显影响状态，且倾向把所有人挡在门外。请找一个不会评判你的成年人，先说出来。'},
parent:{good:'家庭沟通渠道基本畅通，孩子愿意开口，这是很重要的保护因素。',
 ok:'沟通时而通畅时而各说各的。注意别让“规划话题”消耗了日常的亲近感。',
 watch:'孩子正在关闭部分沟通窗口，说教可能比沉默更常见。先聊感受，再聊规划。',
 care:'沟通通道比较紧张，一聊就冲突或干脆不聊。先修复关系氛围，必要时寻求专业支持。'}}
}};

var ADVICE={
study:[
{t:'给学习装一个“为什么”',d:'在便签上写下这周学习的具体理由（如“搞懂二次函数”），让任务重新连接意义，而不是只堆在“必须完成”上。'},
{t:'15 分钟启动法',d:'把“开始”的门槛降到 15 分钟：只专注 15 分钟，再决定是否继续。多数内耗发生在启动前，而不是过程中。'},
{t:'错题三问',d:'考砸后别急着自责，问自己三个问题：考什么？卡在哪？下次怎么补？把情绪反应换成具体动作。'}],
life:[
{t:'每天一个“充电角”',d:'留出 20 分钟做一件与学习完全无关、但真正让你放松的事，并理直气壮地把它写进日程。'},
{t:'睡前十分钟“清空”',d:'睡前写下三件今天真实发生的小事（与成绩无关）。找回对生活的感知，是对抗麻木最简单的方式。'},
{t:'给手机设一个“下班时间”',d:'用闹钟给娱乐划出明确的终点。停不下来的空虚感，往往来自“没有终点”而不是“玩得太久”。'}],
future:[
{t:'从了解一个人开始',d:'找一位从事你有点好奇的职业的大人，问 TA 三个问题：每天都做什么？最难的部分是什么？怎么走到今天？'},
{t:'写一份“不想做”清单',d:'规划不必从“想做什么”开始。写下确定不想做的事，排除法会让方向慢慢显形。'},
{t:'把大问题拆小',d:'不用回答“这一生想做什么”，先回答“下学期想搞定什么”。方向感是一步步长出来的，不是想出来的。'}],
confusion:[
{t:'给迷茫命名',d:'情绪低落时写下“我具体在烦什么”。能说清楚的问题会立刻小一圈，说不清的部分才需要找人聊。'},
{t:'准备一个“着陆动作”',d:'当“我为什么而学”的念头冒出来时，用一个固定动作（出门走十分钟、听一首歌）让自己先落地，再回来看它。'},
{t:'允许“暂时不知道”',d:'青春期的迷茫是任务，不是故障。绝大多数人都是边走边整理中想清楚的，包括你身边那些看起来“想明白了”的人。'}]
};

var PARENT_NOTE={
good:'你们之间的沟通渠道基本畅通，孩子愿意开口，这是青春期最重要的保护因素之一。接下来要做的只是保持：少一点评判，多一点好奇，让TA愿意继续说下去。',
ok:'沟通时有时无很正常。试着把“你应该……”换成“我注意到……”，先接住情绪，再谈事情；未来规划类的话题可以拆成多次小聊，不必一次谈透。',
watch:'孩子开口的次数可能在变少，说教正在替代倾听。建议每周留一段“不谈学习”的专属时间，只聊生活和感受；聊未来时，先从TA感兴趣的领域切入。',
care:'目前沟通通道比较紧张：问而不答，或一聊就吵。这个阶段修复关系比推进规划更重要，必要时欢迎联系我们，或借助学校心理老师这样的第三方来破冰。'};

/* ================= 状态 ================= */
var els={
  home:$('#page-home'),quiz:$('#page-quiz'),result:$('#page-result'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),verdictText:$('#verdictText'),
  dimList:$('#dimList'),adviceList:$('#adviceList'),parentAdvice:$('#parentAdvice')
};
var ver='',flat=[],answers=[],idx=0,stage='home',timer=null,pushed=false;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}

function showStage(s){
  clearTimeout(timer);
  stage=s;
  [['home',els.home],['quiz',els.quiz],['result',els.result]].forEach(function(p){
    var on=p[0]===s; p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  els.brand.hidden=q; els.topQuiz.hidden=!q; els.progressTrack.hidden=!q;
}

/* ================= 问卷 ================= */
function start(v){
  ver=v;
  flat=Object.keys(BANK[v]).reduce(function(a,d){return a.concat(BANK[v][d].map(function(q){return{d:d,q:q}}))},[]);
  answers=new Array(flat.length).fill(-1);
  idx=0;
  els.qTotal.textContent=flat.length;
  if(!pushed){try{history.pushState({q:1},'');pushed=true}catch(e){}}
  showStage('quiz');
  window.scrollTo(0,0);
  renderQ(1);
}

function renderQ(dir){
  var item=flat[idx];
  els.dimText.textContent=DIMS[item.d];
  els.qIdx.textContent=idx+1;
  els.progressFill.style.width=((idx+1)/flat.length*100).toFixed(1)+'%';
  els.qText.textContent=item.q.q;
  if(item.q.hint){els.qHint.textContent=item.q.hint;els.qHint.hidden=false}
  else{els.qHint.hidden=true}
  els.qOptions.innerHTML='';
  item.q.opts.forEach(function(t,i){
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
  var last=idx===flat.length-1;
  els.prevBtn.disabled=idx===0;
  els.nextBtn.disabled=answers[idx]<0;
  els.nextLabel.textContent=last?'查看结果':'下一题';
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
  var per={};
  Object.keys(DIMS).forEach(function(d){
    var sum=0,n=0;
    flat.forEach(function(it,i){if(it.d===d){sum+=3-answers[i];n++}});
    per[d]=Math.round(sum/(n*3)*100);
  });
  var core=['study','life','future','confusion'];
  var total=Math.round(core.reduce(function(a,d){return a+per[d]},0)/core.length);
  return{per:per,total:total};
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
  var T=TEXT[ver],C=553;
  var col=res.total>=70?'var(--olive)':res.total>=50?'var(--amber)':'var(--terra)';
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
  var vd=T.verdicts.find(function(v){return res.total>=v[0]});
  els.verdictText.innerHTML=vd[1];

  els.dimList.innerHTML='';
  var k=0;
  Object.keys(res.per).forEach(function(d){
    var p=res.per[d],L=levelOf(p);
    var card=document.createElement('div');
    card.className='dim-card lv-'+L[3];
    card.style.animationDelay=(0.12+k*0.09)+'s';
    card.innerHTML=
      '<div class="dim-head">'+
        '<div class="dim-name">'+DIMS[d]+(d==='parent'?'<em>家长视角</em>':'')+
          '<span class="dim-level '+L[2]+'">'+L[1]+'</span></div>'+
        '<div class="dim-score"><b>'+p+'</b> /100</div>'+
      '</div>'+
      '<div class="dim-mini-bar"><i style="--p:'+(p/100).toFixed(3)+';animation-delay:'+(0.35+k*0.09)+'s"></i></div>'+
      '<p class="dim-desc">'+T.desc[d][L[3]]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  var weak=Object.keys(res.per).filter(function(d){return d!=='parent'})
    .sort(function(a,b){return res.per[a]-res.per[b]}).slice(0,2);
  els.adviceList.innerHTML='';
  var m=0;
  weak.forEach(function(d){
    ADVICE[d].slice(0,2).forEach(function(a){
      var el=document.createElement('div');
      el.className='advice-item';
      el.style.animationDelay=(0.2+m*0.08)+'s';
      el.innerHTML='<span class="a-tag">'+DIMS[d]+'</span><div class="t">'+a.t+'</div><div class="d">'+a.d+'</div>';
      els.adviceList.appendChild(el);
      m++;
    });
  });
  els.parentAdvice.textContent=PARENT_NOTE[levelOf(res.parent)[3]];
}

function finish(){
  clearTimeout(timer);
  renderResult(compute());
  showStage('result');
  window.scrollTo(0,0);
}

/* ================= 事件 ================= */
 $('#versionGrid').addEventListener('click',function(e){
  var c=e.target.closest('[data-version]');
  if(c)start(c.dataset.version);
});
 $('#versionGrid').addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){
    var c=e.target.closest('[data-version]');
    if(c){e.preventDefault();start(c.dataset.version)}
  }
});
els.prevBtn.addEventListener('click',function(){go(-1)});
els.nextBtn.addEventListener('click',function(){go(1)});
 $('#restartBtn').addEventListener('click',function(){exitToHome()});
 $('#backBtn').addEventListener('click',function(){
  if(stage==='home'){location.href='index.html';return}
  if(pushed){history.back()}else{exitToHome()}
});

function exitToHome(){showStage('home');window.scrollTo(0,0)}

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
  exitToHome();
});

/* 桌面端键盘支持：← → 切题，1-4 选答案 */
document.addEventListener('keydown',function(e){
  if(stage!=='quiz')return;
  if(e.key==='ArrowRight')go(1);
  else if(e.key==='ArrowLeft')go(-1);
  else if(/^[1-4]$/.test(e.key))pick(+e.key-1);
});
})();
