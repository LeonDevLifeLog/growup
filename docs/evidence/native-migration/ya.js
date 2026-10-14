
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）

/* ================= 图标 ================= */
var IC={
awareness:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
soothing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 12h13a3 3 0 1 1-3 3"/><path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/></svg>',
regulation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 12h13a3 3 0 1 1-3 3"/><path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/></svg>',
adapt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3L3 8l5 5"/><path d="M3 8h13a4 4 0 0 1 4 4v1"/><path d="M16 21l5-5-5-5"/><path d="M21 16H8a4 4 0 0 1-4-4v-1"/></svg>',
cognition:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>',
adaptation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
expression:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.4 2.4.9-2.4.9L19 22l-.9-2.4-2.4-.9 2.4-.9z"/></svg>',
growth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22V10"/><path d="M12 14c0-4-3-7-7-7 0 4 3 7 7 7z"/><path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7z"/></svg>',
help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
connection:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
encourage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>',
pressure:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>'};

/* ================= 维度名 & 顺序 ================= */
var NAMES_P={awareness:'情绪察觉',soothing:'自我平复',adapt:'变化适应',expression:'挫折转化',help:'主动求助',encourage:'自我鼓励',pressure:'压力感知'};
var ORD_P=['awareness','soothing','adapt','expression','help','encourage','pressure'];
var NAMES_T={awareness:'情绪觉察',regulation:'情绪调节',cognition:'认知弹性',adaptation:'压力适应',connection:'连接求助',growth:'成长赋能',pressure:'压力感知'};
var ORD_T=['awareness','regulation','cognition','adaptation','connection','growth','pressure'];

/* ================= 小学题库（家长陪孩子作答；选项分值 3→0 降序） ================= */
var Q_PRIMARY=[
{d:'awareness',h:'观察孩子是否能自然流露和表达情绪',t:'放学回家后，孩子能让您从表情或语气中判断出今天在学校过得好不好吗？',o:['一看就知道——开心会主动分享学校趣事，不开心也会写在脸上或说出来','大部分时候能感觉到，但有时会把情绪藏着不马上说','很难看出来，问也只说“还行”或“没事”，像个小闷葫芦','几乎不表达情绪，脸上总是同一个表情，让人猜不透']},
{d:'awareness',h:'对身体-情绪连接的觉察能力',t:'明天要上台表演或考试，孩子前一天晚上会注意到自己身体的变化吗？',o:['会说“我肚子有点不舒服”或“我心跳好快”，并知道这是因为紧张','会说不舒服，但不会主动联想到是因为紧张','只有大人问他/她才说身体感觉不对劲','从来不提身体的感觉，即使明显紧张也说不出来']},
{d:'awareness',h:'对社交中他人情绪的敏锐度',t:'和好朋友一起玩时，如果朋友突然不说话了或者表情变了，孩子会注意到吗？',o:['马上注意到，会停下来说“你怎么了？”或主动关心','过一会儿才察觉，可能继续玩一会儿才去问','通常注意不到，除非朋友直接说出来','完全不关注别人的情绪变化，只顾自己玩']},
{d:'soothing',h:'面对即时满足被打断的情绪调节能力',t:'到了约定时间提醒孩子关掉平板/电视/手机时，他/她的反应是？',o:['虽然不太乐意，但能自己关掉，去做别的事','会磨蹭或小声抱怨，但在大人坚持下能关掉','会发脾气、讨价还价很久，最后不情愿地关掉','大哭大闹，摔东西或完全拒绝，场面失控']},
{d:'soothing',h:'在独处时自我安抚入睡的能力',t:'晚上躺在床上，如果想到明天要考试或者白天被老师批评了，孩子通常？',o:['翻几分钟后自己调整呼吸或想点开心的事，慢慢就睡着了','会翻来覆去比较久，最后累了才睡着','要叫大人来陪，或者要听很久故事才能睡着','经常翻到很晚都睡不着，或者半夜醒来再也睡不着']},
{d:'soothing',h:'社交受挫后的情绪恢复方式',t:'如果在学校被同学取笑或说了难听的话，孩子回到家后通常？',o:['跟家长说说就释然了，很快恢复正常状态，该吃吃该玩玩','会闷闷不乐一段时间，需要吃点好吃的或做喜欢的事才好转','对家里人发脾气或摔东西，过很久才恢复','不说话也不吃饭，把自己关在房间里，情绪低落好几天']},
{d:'adapt',h:'面对重大计划改变的心理弹性',t:'孩子期待了一整周的春游（或生日聚会）突然因为暴雨取消了，他/她的反应？',o:['失望一会儿后说“那改天再去吧”，主动提议在家做别的好玩的','会难过哭一下或抱怨天气，但半小时后能接受现实','非常生气和难过，觉得太倒霉了，大半天心情都很差','崩溃大哭，一整天甚至好几天都念念不忘，什么都提不起兴趣']},
{d:'adapt',h:'面对重大环境变化的适应力',t:'新学期发现换了班主任，或者被分到了新班级，孩子的表现？',o:['虽然有点不舍旧老师，但很快观察新老师的特点，主动和新同桌说话','第一天比较安静拘谨，但几天后就能正常上课交朋友','好几周都不太适应，上课不敢发言，也不主动和新同学玩','非常抗拒，哭着不想去学校，甚至装病逃避']},
{d:'adapt',h:'面对日常小意外的冷静程度',t:'到了学校才发现忘带作业或红领巾，孩子通常的反应？',o:['着急一下但很快想出办法——借用同学的、跟老师说明情况','会比较慌张，需要同学或老师提醒该怎么处理','急得快哭了，不知道怎么办，站在原地发呆','直接哭出来或非常害怕，不敢进教室面对老师']},
{d:'expression',h:'面对心血白费的恢复力',t:'孩子花了很长时间画的画或做的手工，不小心被水弄湿或被碰坏了，他/她会？',o:['难过一会儿后说“我再做一个，这次会更好的”','会哭或生气，但在大人安慰下愿意重新做','非常愤怒伤心，把剩下的也扔了，当天不愿意再碰','崩溃大哭，说再也不做这个了，很久都不愿意再试']},
{d:'expression',h:'努力后仍失败的心理承受力',t:'孩子明明认真复习了，但考试成绩还是不理想，他/她的反应？',o:['虽然失落，但会看看哪里出错了，说“下次注意这些地方”','很难过，会说“我明明努力了”，需要大人鼓励才愿意再看错题','觉得自己就是笨，再怎么努力也没用，想放弃这门课','把试卷藏起来或撕掉，拒绝讨论，完全不想面对']},
{d:'expression',h:'面对公开失败的韧性',t:'孩子参加班干部竞选或比赛没选上，之后的态度？',o:['虽然遗憾，但会为选上的同学鼓掌，说“下次再努力”','有点难过和羡慕，但过一两天就不再纠结了','觉得不公平或怀疑自己不好，很久都闷闷不乐','当场哭或生气，之后再也不参加任何竞选或比赛']},
{d:'help',h:'学业困难时的求助习惯',t:'做作业遇到不会的题，孩子的第一反应是？',o:['先自己想想，想不出来就主动问家长或老师','看一会儿不会做，就放着等大人来检查时再问','不会做就空着或乱写答案，不主动问也不说','急得哭或发脾气，把作业本摔在一边']},
{d:'help',h:'面对校园欺凌的求助意识',t:'如果在学校被同学推搡、起难听绰号或故意排挤，孩子会怎么做？',o:['当场就说“你不能这样”，回家后也会马上告诉家长','当场不敢说什么，但回家会告诉爸爸妈妈','觉得丢脸或怕惹更大麻烦，选择忍耐不说','完全不告诉任何人，默默忍受，家长问也不承认']},
{d:'help',h:'最基本的自我保护与求助能力',t:'在学校如果觉得头晕、肚子疼等身体不舒服，孩子会？',o:['马上举手告诉老师，联系家长接回家休息','忍一会儿，实在不舒服才告诉老师','一直忍着不说，等放学回家才告诉家长','强忍着不说，怕被说矫情或不坚强，直到撑不住才被发现']},
{d:'encourage',h:'挑战前的内在自我对话',t:'孩子要上台表演、参加比赛或竞选班干部之前，心里通常怎么想？',o:['“我练了好久了，一定没问题！”能给自己打气','“有点紧张，但试试看吧”——有点紧张但不退缩','“我肯定做不好，别人都比我厉害”——自我怀疑','“千万别叫到我”——极度回避，想取消或逃跑']},
{d:'encourage',h:'面对批评的心理弹性',t:'被老师或家长指出做得不对的地方时，孩子心里怎么想？',o:['虽然当时不太高兴，但能想想自己哪里没做好，愿意改进','当场会辩解或不服气，冷静下来后会想一想','觉得很难过很丢脸，认为自己什么都做不好','非常愤怒或委屈，觉得大人故意找茬，完全听不进去']},
{d:'encourage',h:'挫折后重返赛场的勇气',t:'之前在某件事上表现不好（比如某次考试考砸了、表演忘词了），之后还愿意再做类似的事吗？',o:['愿意，而且会说“这次我会准备得更好”','有点犹豫，但在大人鼓励下还是愿意再试','很抗拒，会说“我不要，上次就搞砸了”','坚决拒绝，一提到就紧张或生气，完全不想再面对']},
{d:'pressure',h:'面对高负荷日程的压力反应',t:'当孩子的日程被作业、课外班、练琴/练字等排满时，他/她的状态？',o:['虽然有点累，但能按顺序一件件完成，中途会自己休息调整','会抱怨“太多做不完”，但催一催还是能完成','经常拖拖拉拉，明显心不在焉，效率很低','压力大到出现头痛肚子疼等身体反应，或情绪崩溃什么都不想做']},
{d:'pressure',h:'面对社会比较的压力承受力',t:'家长聚会时听到别的孩子成绩好、得奖多，孩子知道后的反应？',o:['不太在意，说“我也有我厉害的地方呀”','会有点羡慕或不服气，但不会太往心里去','很沮丧，觉得自己什么都不如别人，闷闷不乐','当场或回家后情绪崩溃，大哭或说“你们就是觉得我不好”']},
{d:'pressure',h:'面对家长期望压力的应对',t:'当家长说“你看人家多自觉”“你应该考多少分以上”这类话时，孩子的反应？',o:['虽然不爱听，但知道自己尽力就好，不会太受影响','当时会不高兴或沉默，过后会想想自己是不是可以做得更好','很受伤，觉得自己怎么做都不够好，压力很大','当场爆发或完全关闭沟通，之后很长一段时间对家长的话充耳不闻']}];

/* ================= 中学共享题库（初中版；高中按索引覆写差异题） ================= */
var Q_TEEN=[
{d:'awareness',h:'区分复合情绪的能力',t:'月考成绩出来后，你能清楚分辨自己当下的感受吗？',o:['能分辨是失望、羞耻、不甘还是愤怒等具体情绪','知道心情很差，但说不清到底是什么感受','只觉得一团糟，脑子很乱，理不出头绪','完全无法分辨，只会觉得“我就是很不爽”']},
{d:'awareness',h:'对社交比较引发情绪的觉察',t:'刷到同学在社交媒体上晒成绩、旅行或聚会时，你能察觉到自己内心微妙的反应吗？',o:['能敏锐察觉到羡慕、酸楚或不安，并意识到这很正常','能感觉到有点不舒服，但不太愿意细想','表面没什么，但会不自觉地反复去看那条动态','完全没意识到自己情绪受到了影响']},
{d:'awareness',h:'穿透表层情绪找到核心需求',t:'和父母发生激烈争吵后，你能意识到自己真正在意的是什么吗？',o:['能意识到表面是生气，实际是因为觉得不被理解或没有自主权','大概知道自己在气什么，但说不清深层原因','只觉得他们太烦太不讲道理，不想再想了','完全被愤怒淹没，只觉得都是他们的错']},
{d:'regulation',h:'公开受挫后的即时情绪调节',t:'在课堂上被老师当众批评或点名回答不会的问题时，你如何让自己平复？',o:['深呼吸或转移注意力，告诉自己下课再处理','表面撑住，但心里很难受，课间找同学说说就好些','脸涨红或发抖，整节课都无法集中注意力','当场想顶嘴或冲出去，完全坐不住']},
{d:'regulation',h:'考前焦虑的调节策略',t:'重要考试前夜，如果紧张到睡不着，你会怎么做？',o:['用深呼吸、听白噪音或闭眼回忆知识点来放松','翻来覆去一阵，最后累了还是能睡着','忍不住看手机或刷题到很晚，越刷越焦虑','彻夜难眠，脑子里全是考砸了的各种画面']},
{d:'regulation',h:'社交触发后的夜间情绪管理',t:'晚上躺下后，在同学群里看到有人说了让你生气的话，你会？',o:['告诉自己明天再说，放下手机做几次深呼吸入睡','心里不舒服但忍住不回复，翻一会儿才睡着','马上打字回怼，越聊越气，很久才放下手机','反复翻聊天记录越想越气，整晚都在想怎么反驳']},
{d:'cognition',h:'对学业挫折的解释风格',t:'月考排名比上次掉了很多，你内心的第一想法是？',o:['这次某些知识点没掌握好，针对性补一补下次能上来','有点受打击，觉得这阶段是不是松懈了','觉得自己就是学不过别人，再努力也没用','觉得自己完了，排名只会越来越低，前途没了']},
{d:'cognition',h:'面对社交冷落的归因方式',t:'发现好朋友最近和小团体走得很近，好像不太叫你了，你会怎么想？',o:['可能最近凑巧了，我也可以主动找他们，或者拓展新朋友','有点难过和失落，会想是不是自己哪里做得不好','觉得他们就是故意排挤我，人心太假了','觉得自己就是不讨人喜欢，谁都不会真的在乎我']},
{d:'cognition',h:'付出后失败的认知弹性',t:'努力准备了很久的社团面试或比赛没通过，你怎么看待这件事？',o:['说明还有差距，总结一下经验，下次表现会更好','很遗憾和不甘，觉得自己可能确实不太适合','觉得努力根本没用，别人随便搞搞就过了','觉得选拔不公平，自己什么都做不好']},
{d:'adaptation',h:'短期高压下的韧性',t:'期末复习周，语数英各科作业和复习同时压过来，你的状态？',o:['列计划分优先级，按节奏完成，中途给自己小休息','感觉喘不过气，但硬着头皮一个个做','觉得根本做不完，经常发呆或拖延，效率很低','焦虑到学不进去，甚至出现头痛胃痛等身体反应']},
{d:'adaptation',h:'面对长期升压的调整能力',t:'进入初二/初三后课业量明显加重了，你的适应过程？',o:['调整了学习节奏和作息，几周后基本适应新强度','前一两个月比较吃力，慢慢摸索出了自己的节奏','一直觉得扛不住，成绩和状态都在下滑','完全跟不上，每天都想请假或逃避']},
{d:'adaptation',h:'多重压力叠加下的稳定性',t:'同一周里既要备考又有社团活动，还和好朋友闹了矛盾，你？',o:['虽然很累，但能分开处理——先搞定考试，矛盾等考完再说','觉得分身乏术，总有一头顾不上，心情起伏很大','什么都做不好，脑子很乱，哪件事都无法专注','觉得要崩溃了，什么都不想管']},
{d:'connection',h:'在脆弱时寻求支持的意愿',t:'当你感到压力大到快撑不住时，你会主动找人倾诉吗？',o:['会，我知道找谁说，说出来真的会好很多','如果有人主动问我可能会说，但自己不太会主动开口','觉得说了别人也不懂，或者怕被觉得矫情，自己扛着','绝不让人看到自己脆弱的样子，谁也不找']},
{d:'connection',h:'人际受损后的修复连接',t:'和最好的朋友闹了比较严重的矛盾，情绪很糟，你会？',o:['给自己一点冷静时间，然后主动找对方沟通','找其他朋友说说，希望有人帮忙调解','等对方先来找我，否则宁可就这么不联系了','觉得交朋友太累了，以后再也不对谁交心']},
{d:'connection',h:'对家人关心的开放度',t:'父母发现你状态不对来问你怎么了时，你的反应？',o:['虽然不全说，但会分享一部分，知道他们是关心我的','说“没事”，不想让他们担心或啰嗦','觉得他们管太多，语气不太好地让他们别管我','很烦躁，直接关上房门或戴上耳机']},
{d:'growth',h:'从情绪风暴中提炼经验',t:'经历了一次严重的情绪崩溃后，你会复盘吗？',o:['会，想想导火索是什么、下次遇到类似情况怎么应对更好','过后偶尔会想一下，但不太深入','不想再回忆，太难受了，过去了就好','只觉得是自己太脆弱了，没什么好想的']},
{d:'growth',h:'正向经验的内化能力',t:'当你成功克服了一次很大的困难后，你对自己的看法？',o:['觉得自己比想象中更强大，下次遇到类似的事更有信心了','有点自豪，但不确定下次还能不能扛住','觉得那次只是运气好或者别人帮的多','没什么感觉，只觉得终于熬过去了，再也不想经历']},
{d:'growth',h:'接纳不完美的成长心态',t:'面对自己的弱项或短板（如某科总学不好、社恐），你的态度？',o:['承认它是我的弱项，在想能不能找到适合自己的方法','心里清楚但不太愿意直面，尽量绕着走','很焦虑和自卑，怕被别人发现和嘲笑','非常讨厌自己这个样子，觉得自己处处不如人']},
{d:'pressure',h:'长期学业压力的感知与承受',t:'面对班级排名和升学压力，你的日常状态？',o:['有压力但能转化为动力，知道按自己的节奏来就好','经常感到焦虑，特别是大考临近时更明显','压力像石头压在胸口，总觉得自己不够好、来不及了','压力大到经常失眠、头痛，或莫名其妙想哭']},
{d:'pressure',h:'社交比较压力',t:'刷社交媒体看到同龄人晒成绩、晒生活时，你的感受？',o:['有时会有点羡慕，但很快想到每个人都有自己的节奏','看了会焦虑和自卑，忍不住比较但事后能放下','每次看完都觉得自己的生活很失败，心情低落很久','越刷越觉得自己一无是处，但又停不下来']},
{d:'pressure',h:'家长期望压力的应对',t:'当父母说“你看谁谁谁考了多少分”“人家多自觉”这类话时，你的反应？',o:['不太爱听，但知道他们也是着急，不会太往心里去','当时很难受和抵触，事后会暗暗较劲想证明自己','觉得他们只看成绩看不到我的努力，很受伤','当场爆发争吵或彻底沉默，觉得在他们眼里自己什么都做不好']}];

/* 高中版覆写（索引 → 新题） */
var HIGH_OV={
0:{t:'模考成绩出来后，你能清楚分辨自己当下的感受吗？'},
5:{t:'晚自习结束回到宿舍/家，躺下后刷到群里有人说了让你生气的话，你会？'},
8:{t:'努力准备了很久的竞赛、强基计划或自主选拔没通过，你怎么看待这件事？',o:['说明还有差距，总结一下经验，下个阶段还有机会','很遗憾和不甘，觉得自己可能确实不太适合','觉得努力根本没用，别人随便搞搞就过了','觉得选拔不公平，自己什么都做不好']},
10:{t:'升入高二后课业量明显加重（或进入高三冲刺阶段），你的适应过程？'},
18:{t:'面对高考倒计时和模考排名压力，你的日常状态？',o:['有压力但能转化为动力，知道按自己的节奏来就好','经常感到焦虑，特别是模考临近时更明显','压力像石头压在胸口，总觉得来不及了、不够好','压力大到经常失眠、头痛，或莫名其妙想哭']},
19:{t:'刷社交媒体看到同龄人晒录取通知书、保送、竞赛获奖时，你的感受？'}};
function buildTeen(high){
  return Q_TEEN.map(function(q,i){
    var ov=high&&HIGH_OV[i];
    if(!ov)return q;
    return{d:q.d,h:q.h,t:ov.t,o:ov.o||q.o};
  });
}

/* ================= 维度分析 ================= */
var D_PRIMARY={
awareness:{good:'孩子具备很好的情绪察觉能力，能准确识别自己的情绪，也敏锐感知身体反应和周围人的情绪变化。这种觉察力是情绪韧性的基石——只有先“看见”情绪，才能管理情绪。',
 ok:'孩子能意识到基本的情绪，但对复杂情绪（如又气又委屈）或身体反应的感知还在发展中。有时分不清自己到底是什么感受，需要大人帮忙“命名”情绪。',
 low:'孩子目前对情绪的感知较为模糊，往往只在情绪爆发时才表现出来，平时像戴了面具让人看不透。建议家长多帮孩子指认情绪，丰富他/她的情绪词汇库。'},
soothing:{good:'孩子拥有出色的自我平复能力，在激动或受挫后能较快运用深呼吸、转移注意力等方法让自己冷静下来，像装了情绪“小刹车”一样可靠。',
 ok:'孩子能够在外界帮助下逐渐平复，或者需要一定时间自行消化。自我安抚的“工具箱”还需要更多练习和充实。',
 low:'孩子目前情绪平复较慢，容易长时间陷入坏情绪中，甚至影响进食和睡眠。建议家长教给孩子深呼吸、数数等简单方法，并在孩子激动时先给予温和陪伴而非讲道理。'},
adapt:{good:'孩子面对变化和新环境展现出很强的适应力，能灵活调整心态，快速接受现实并找到应对方法——像水一样能随容器改变形态。',
 ok:'孩子对熟悉的环境有依赖感，面对变化会有短暂的不适，但基本能在短时间内调整过来。中等的适应力正在稳步发展。',
 low:'孩子目前对变化较为敏感和抗拒，喜欢一切按计划进行，意外会引发较大情绪波动。建议家长在变化发生前提前预告，并多创造小变化让孩子练习适应。'},
expression:{good:'孩子具备优秀的挫折转化能力，面对失败和不如意时能较快调整心态，把失败看作经验，并有勇气再次尝试。这种韧性将伴随他/她克服人生中的各种困难。',
 ok:'孩子面对小挫折能较快恢复，但遇到较大的失败时容易产生自我怀疑。需要更多的成功体验来巩固“我能行”的信念。',
 low:'孩子目前对失败的承受力较弱，遇到挫折容易放弃或情绪崩溃，甚至出现撕试卷、拒绝再碰等回避行为。建议家长降低任务难度让孩子多体验成功，并强调“努力的过程比结果更重要”。'},
help:{good:'孩子懂得在困难时主动寻求帮助，明白求助不是无能而是智慧。他/她信任家人和朋友，能勇敢地表达自己的需求——这是非常健康的社交韧性表现。',
 ok:'孩子在遇到明显困难时会求助，但有时因为害羞或怕被批评而选择自己硬扛。需要一个更安全、不被评判的表达环境。',
 low:'孩子目前较少主动求助，倾向于把困难藏在心里默默忍受。建议家长多关注孩子的微小情绪变化，主动询问，并确保每一次孩子求助时都给予积极回应而非说教。'},
encourage:{good:'孩子内心充满了积极的自我鼓励力量，遇到挑战时能给自己打气，面对批评能理性看待。这种内在力量是他/她不断成长的发动机。',
 ok:'孩子在顺利时能保持积极，但在遇到困难或批评时，内心的自我怀疑会占上风，需要外界的肯定来重建信心。',
 low:'孩子目前自我评价偏低，遇到困难容易产生“我不行”的念头，面对批评容易觉得自己一无是处。建议家长多关注具体努力而非天赋，多用“我看到你刚才一直在坚持”这类语言描述进步。'},
pressure:{good:'孩子面对学业和生活的压力时，能清醒地感知压力并运用有效策略应对——合理安排、积极自我对话、分清主次。已初步具备健康的压力管理能力。',
 ok:'孩子能感受到压力，但在应对策略上还不够成熟，容易在多任务或被比较时产生焦虑。需要家长帮助建立时间管理意识和合理的自我期待。',
 low:'孩子目前对压力较为敏感且缺乏有效应对方式，容易出现身体症状（头痛、肚子疼）或情绪崩溃。建议家长关注压力源、适当减负，同时留意自己的表达方式是否无意中增加了孩子的压力。'}};

var D_TEEN={
awareness:{good:'你拥有敏锐的情绪觉察力，能像旁观者一样观察自己的内心世界。你清楚情绪的起落和成因——这种觉察力是你掌控情绪、做出理智反应的坚实基础。',
 ok:'你具备基本的情绪感知能力，能察觉到明显的情绪波动，但对复杂情绪（如又气又委屈）的辨别和深层原因的洞察还有提升空间。有时情绪会让你感到模糊和困惑。',
 low:'你目前较难及时捕捉到自己的情绪变化，往往被情绪支配后才后知后觉。建议多练习停下来问自己“我现在感觉怎样”，增强对内心信号的关注。'},
regulation:{good:'你掌握了一套适合自己的情绪调节方法，在压力和冲突面前能迅速平复心情，恢复理智。你像一位熟练的冲浪者，能在情绪的波峰浪谷中保持平衡。',
 ok:'你能应对日常的情绪波动，但在遇到强烈冲击时，平复速度较慢，有时会采用压抑或逃避的方式。学习更多的放松技巧会让你更有力量。',
 low:'你目前较难控制强烈的情绪，容易被冲动左右，事后常感后悔。建议从深呼吸和暂时离开现场开始练习，给自己按下“暂停键”。'},
cognition:{good:'你具备出色的认知弹性，能多角度看待问题，不钻牛角尖。面对挫折你能将其视为暂时的、特定的挑战，而不是自我否定的理由——这种思维模式是韧性的核心。',
 ok:'你在顺利时能保持理性，但遭遇较大挫折时容易陷入片面或悲观的思维。练习转换视角、寻找事件的积极面将有助于提升弹性。',
 low:'你目前容易陷入绝对化或灾难化的思维，把一次失败放大为整体的失败。建议挑战自己的消极想法，问问自己“这真的有那么糟吗？”'},
adaptation:{good:'你拥有强大的压力适应力，在高压环境下依然能保持稳定输出，并能快速从疲劳中恢复。你像一根有弹性的弹簧，压力越大，反弹的潜力越足。',
 ok:'你能承受一定的压力，但在长期高压下会感到疲惫和效率下降。学会合理分配精力和主动休息，是保持长久韧性的关键。',
 low:'你目前对压力较为敏感，容易在多重任务或高压环境下感到崩溃。建议将大任务拆解成小步骤，并降低对自己的完美主义要求。'},
connection:{good:'你懂得连接的力量，在困难时敢于展现脆弱并寻求支持。你拥有健康的社交支持网络，明白求助不是软弱而是智慧。',
 ok:'你在遇到明显困难时会寻求帮助，但有时因为面子或怕麻烦别人而独自承受。更开放地表达需求，会让你走得更轻松。',
 low:'你目前倾向于把问题藏在心里，缺乏向外求助的习惯。建议尝试向一个最信任的人分享一点小烦恼，体验被支持的温暖。'},
growth:{good:'你具备强大的成长赋能特质，能从每一次情绪波动和挫折中汲取养分。你把经历转化为经验，让内在力量不断壮大——这种成长型思维将伴随你跨越未来的所有挑战。',
 ok:'你能从简单的经历中学习，但在深度复盘和将经验转化为能力方面还有提升空间。养成写日记或定期反思的习惯会很有帮助。',
 low:'你目前较难从挫折中看到积极的一面，容易陷入自我否定。建议将注意力从“我失败了”转移到“我学到了什么”，逐步培养成长视角。'},
pressure:{good:'你对压力有清醒的感知，并能把压力转化为行动力。面对排名焦虑、社交比较、家长期望，你能守住自己的节奏，不被外界裹挟。这是非常难得的心理定力。',
 ok:'你能感受到压力的存在，有时能应对，有时会被压得喘不过气。特别是在大考前或被比较时，焦虑会明显加重。需要建立更稳定的自我评价体系。',
 low:'你目前对压力较为敏感，容易在排名、比较、期望等多重压力下出现身心反应（失眠、头痛、想哭）或情绪崩溃。建议首先识别压力来源，适当减负，并学会对自己说“我不需要满足所有人的期待”。'}};

/* ================= 行动建议 ================= */
var SUG_PRIMARY={
awareness:['和孩子一起玩“猜猜我什么心情”的游戏——大人做表情，孩子来猜','当孩子有情绪时帮他/她命名：“你现在是不是觉得又气又委屈？”','放学后问：“今天最开心的事和最不开心的事是什么？”养成情绪复盘习惯','读绘本时讨论角色感受：“你觉得小熊现在心里在想什么？”'],
soothing:['教孩子“闻花香、吹蜡烛”深呼吸法——鼻子吸气 3 秒，嘴巴慢慢呼气 6 秒','在家布置一个“冷静角”，放上软垫、喜欢的玩偶和几本减压书','孩子情绪激动时，家长先保持平静——用温和的声音说“我陪你一会儿”','制作“情绪急救卡”——写上孩子认可的安抚方式（抱抱、听歌、喝水）让他/她自己选'],
adapt:['偶尔改变一下周末的常规安排，让孩子体验“意外也能很有趣”','去新环境前提前描述细节：“新教室靠窗的位置有绿植”，减少未知带来的不安','玩“Plan B”游戏：“如果下雨了不能去公园，我们还能做什么？”','出门前和孩子一起检查物品，培养“有备无患”的习惯'],
expression:['当孩子失败时说：“没关系，这说明你在挑战有难度的事，了不起！”','分享家长自己失败又重来的小故事——让孩子知道大人也会失败','把错误当探索机会：“这次我们知道了这条路不行，再试试别的”','帮孩子建立“进步本”：记录每次比上次进步的地方，哪怕很小'],
help:['告诉孩子：“遇到困难找爸爸妈妈，我们永远是你最强的队友”','角色扮演练习如何礼貌求助：“老师，这道题我不太明白，能再讲讲吗？”','当孩子主动求助时及时表扬：“你遇到困难愿意说出来，这很勇敢！”','教孩子区分“自己能解决”和“需要大人帮忙”的事——可以一起列个清单'],
encourage:['每天睡前和孩子互相分享一件“今天我做得棒的事”','把孩子的努力过程挂在嘴边：“我看到你刚才试了三种方法都没放弃”','教孩子说魔力口诀：“我可能还没学会，但我一定能学会”','在家里贴一张“勇敢尝试记录表”，不管成败每次尝试都贴一颗星'],
pressure:['帮孩子把大任务拆成小步骤：“先做第一题，做完休息 2 分钟再做第二题”','和孩子一起制作可视化时间表，完成一项划掉一项','减少不必要的比较，告诉孩子：“你的对手只有昨天的自己”','留意身体信号——孩子反复说头痛肚子疼又查不出毛病，可能是压力的“求救信号”','检视课外班数量，和孩子商量是否需要精简——留出自由玩耍的时间']};

var SUG_TEEN={
awareness:['每天设三个“情绪打卡”时刻，用具体词汇记录当下感受——不只是“烦”，是“委屈”还是“焦虑”？','留意情绪出现前的身体信号：肩膀紧绷、胃不舒服、心跳加快——它们是情绪的“预警系统”','写情绪日记：记录触发事件→身体反应→情绪名称→后续行为，一周后回看会发现规律'],
regulation:['练习 4-7-8 呼吸法：吸气 4 秒→屏气 7 秒→呼气 8 秒，快速激活副交感神经让身体放松','建立“情绪急救歌单”——放上能让你迅速平静或振奋的歌，情绪上头时第一时间戴上耳机','执行“10 分钟延迟策略”：激动时先离开现场做点别的事，10 分钟后再决定怎么回应'],
cognition:['当消极想法冒出来时，问自己三个问题：这是事实还是我的想象？最坏的结果真的会发生吗？一个月后回头看，它还这么重要吗？','把“我完了”改写成“这次没考好”——一次事件不等于整个人生，练习把挫折限定在“这一次、这一科”','给挫折找三个外部原因：状态、题目难度、运气，而不是全部归结为“我不行”'],
adaptation:['把大任务拆成 25 分钟的“番茄钟”，做完一块就休息 5 分钟——看得见的进度是最好的减压药','每周留出固定的“空白时段”什么都不安排，让身心有恢复弹性的空间','睡前写三行“今日复盘”：完成了什么、卡在哪里、明天第一件事做什么，清空大脑再入睡'],
connection:['准备一个“支持者名单”：写下 3 个你遇到困难时可以找的人——不一定要深聊，发条消息也算','试着向最信任的人说一句“我最近有点难”，你会发现暴露脆弱反而让关系更近','当同学向你倾诉时也认真陪伴——支持是双向的，你在别人那里存下的善意，也会回流到你身上'],
growth:['准备一个“成长记录本”：每克服一次困难就写一笔——情绪低谷时翻一翻，会看到自己比想象中强大','每次挫折后问自己一个问题：“这件事教会了我什么？”——哪怕只想到一条，也是收获','把“我又失败了”改成“我又发现了一条行不通的路”，像科学家对待实验一样对待挫折'],
pressure:['给压力“称重”：0-10 分给现在的压力打分，超过 7 分时主动启动减法——砍任务、降期待、找人聊','识别身体信号：失眠、头痛、胃不舒服、想哭，都是压力超载的警报，出现两个以上就该认真减负','每天留 20 分钟“纯充电时间”：运动、听歌、发呆都行，这段时间不为任何目标服务']};

/* ================= 版本配置 ================= */
var CFG={
primary:{grp:'p',tag:'6–12岁 · 小学阶段',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],board:false,
 lead:'请家长和孩子就每道题的场景聊一聊——“如果遇到这种情况，你会怎么做呀？”——然后选择最符合孩子真实表现的选项。',
 names:NAMES_P,ord:ORD_P,qs:Q_PRIMARY,descr:D_PRIMARY,sug:SUG_PRIMARY},
middle:{grp:'t',tag:'12–15岁 · 初中阶段',grades:['初一','初二','初三'],board:true,
 lead:'通过回顾日常真实的情绪体验，了解你面对压力、挫折和情绪波动时的复原力与内在韧性，发现让自己更快恢复平静的力量。',
 names:NAMES_T,ord:ORD_T,qs:buildTeen(false),descr:D_TEEN,sug:SUG_TEEN},
high:{grp:'t',tag:'15–18岁 · 高中阶段',grades:['高一','高二','高三'],board:true,
 lead:'高中阶段的韧性面临真正的考验：模考、排名、选科、住校与高考倒计时。这一版帮你看清自己在高压下的真实状态，找到更快恢复平静的力量。',
 names:NAMES_T,ord:ORD_T,qs:buildTeen(true),descr:D_TEEN,sug:SUG_TEEN}};

/* ================= 画像 & 等级 ================= */
var PROFILE={
good:{title:'韧劲十足',desc:'展现出相当扎实的心理韧性——能觉察情绪、较快平复、从挫折中汲取养分，面对压力也守得住自己的节奏。请继续保持，也别忘记在硬扛的时候允许自己求助。'},
ok:{title:'稳步成长中',desc:'韧性正在发展中：某些环节（可能是情绪调节、认知弹性或求助意愿）还有提升空间。这完全正常——韧性不是天赋，而是可以练习的能力。从分项地图里挑一两个薄弱处开始就好。'},
low:{title:'需要更多支持',desc:'最近的压力可能已经超出了目前能消化的范围，情绪和身体都在发出信号。这不是脆弱，而是提醒。建议先照顾好睡眠和作息，把困扰告诉一个信任的人；必要时欢迎联系我们获取专业支持。'}};
var LVL={good:'稳固',ok:'尚可',low:'待成长'};
var DK={good:'good',ok:'ok',low:'low'};
var KEEP_ADVICE='各维度状态都不错，无需刻意调整。可以把这份韧性保持下去，隔一两个月再观察一次自然的变化。';

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),supp:$('#page-supp'),report:$('#page-report'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formLead:$('#formLead'),formFields:$('#formFields'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),resultTitle:$('#resultTitle'),resultSub:$('#resultSub'),
  pfCard:$('#pfCard'),pfTitle:$('#pfTitle'),pfDesc:$('#pfDesc'),pfStats:$('#pfStats'),
  dimList:$('#dimList'),echoWrap:$('#echoWrap'),adviceList:$('#adviceList'),
  ageCards:$('#ageCards'),backBtn:$('#backBtn'),toast:$('#toast')
};
var ver='',cfg=null,flat=[],answers=[],idx=0,stage='landing',user={},sup={p:'',r:'',o:''},timer=null,pushed=false,toastT=null;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function opts(a){return a.map(function(t){return '<option>'+t+'</option>'}).join('')}
function toast(msg){
  els.toast.textContent=msg;els.toast.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){els.toast.classList.remove('show')},2200);
}

function showStage(s){
  clearTimeout(timer);
  stage=s;
  [['landing',els.landing],['form',els.form],['quiz',els.quiz],['supp',els.supp],['report',els.report]].forEach(function(p){
    var on=p[0]===s;p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  els.brand.hidden=q;els.topQuiz.hidden=!q;els.progressTrack.hidden=!q;
  window.scrollTo(0,0);
}

/* ================= 表单 ================= */
function pickAge(v){
  ver=v;cfg=CFG[v];user={};sup={p:'',r:'',o:''};
  els.formTag.textContent=cfg.tag;
  els.formLead.textContent=cfg.lead;
  var g='<div><label class="f-label" for="fName">昵称（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>'+
    '<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(cfg.grades)+'</select></div>';
  if(cfg.board)g+='<div><label class="f-label" for="fBoard">就读方式</label><select class="f-input" id="fBoard">'+opts(['走读生','住校生'])+'</select></div>';
  els.formFields.innerHTML=g;
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  var grade=$('#fGrade');
  if(!grade.value){toast('请选择年级');return}
  if(cfg.board&&!$('#fBoard').value){toast('请选择就读方式');return}
  user={name:($('#fName').value||'').trim(),grade:grade.value,board:cfg.board?$('#fBoard').value:''};
  flat=cfg.qs;
  answers=flat.map(function(){return -1});
  idx=0;
  els.qTotal.textContent=flat.length;
  showStage('quiz');
  renderQ(1);
}

/* ================= 问卷 ================= */
function renderQ(dir){
  var q=flat[idx];
  els.dimText.textContent=cfg.names[q.d];
  els.qIdx.textContent=idx+1;
  els.progressFill.style.width=((idx+1)/flat.length*100).toFixed(1)+'%';
  els.qText.textContent=q.t;
  els.qHint.textContent=q.h||'';
  els.qHint.hidden=!q.h;
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
  els.nextLabel.textContent=idx===flat.length-1?'填写补充信息':'下一题';
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
  if(t>=flat.length){enterSupp();return}
  idx=t;
  renderQ(d);
  window.scrollTo({top:0,behavior:REDUCED?'auto':'smooth'});
}

/* ================= 补充信息 ================= */
function enterSupp(){
  ['supP','supR','supO'].forEach(function(id){
    var ta=$('#'+id);ta.value='';
    var c=ta.parentElement.querySelector('.char-count');if(c)c.textContent='0 / 500';
  });
  showStage('supp');
}
function collectSupp(){
  sup={p:$('#supP').value.trim(),r:$('#supR').value.trim(),o:$('#supO').value.trim()};
}
function hasSupp(){return !!(sup.p||sup.r||sup.o)}

/* ================= 计分与报告 ================= */
function compute(){
  var per={},cnt={};
  flat.forEach(function(q,i){
    per[q.d]=(per[q.d]||0)+(3-answers[i]);
    cnt[q.d]=(cnt[q.d]||0)+1;
  });
  var dims=cfg.ord.map(function(k){
    var pct=Math.round((per[k]||0)/(cnt[k]*3)*100);
    return{k:k,name:cfg.names[k],pct:pct,lv:pct>=75?'good':pct>=50?'ok':'low'};
  });
  var total=Math.round(dims.reduce(function(s,d){return s+d.pct},0)/dims.length);
  return{dims:dims,total:total,g:total>=75?'good':total>=50?'ok':'low'};
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
  els.resultTitle.textContent=user.name?'「'+user.name+'」的情绪韧性画像':'情绪韧性画像';
  els.resultSub.textContent=user.grade+(user.board?' · '+user.board:'')+' · 基于七大维度的观察与建议';

  var col=res.g==='good'?'var(--olive)':res.g==='ok'?'#9A6B14':'var(--terra)';
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
  var cnt={good:0,ok:0,low:0};
  res.dims.forEach(function(d){cnt[d.lv]++});
  els.pfStats.innerHTML='七个维度中：<b class="sg">'+cnt.good+'</b> 个稳固 · <b class="sy">'+cnt.ok+
    '</b> 个尚可 · <b class="sr">'+cnt.low+'</b> 个待成长';

  els.dimList.innerHTML='';
  var k=0;
  res.dims.forEach(function(d){
    var card=document.createElement('div');
    card.className='dim-card lv-'+d.lv;
    card.style.animationDelay=(0.1+k*0.07)+'s';
    card.innerHTML=
      '<div class="dim-head">'+
        '<div class="dim-name">'+IC[d.k]+d.name+'<span class="dim-level lvl-'+d.lv+'">'+LVL[d.lv]+'</span></div>'+
        '<div class="dim-score"><b>'+d.pct+'</b> /100</div>'+
      '</div>'+
      '<div class="dim-mini-bar"><i style="--p:'+(d.pct/100).toFixed(3)+';animation-delay:'+(0.32+k*0.07)+'s"></i></div>'+
      '<p class="dim-desc">'+cfg.descr[d.k][DK[d.lv]]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  /* 补充信息回显 */
  if(hasSupp()){
    var echo=[];
    if(sup.p)echo.push(['最大的压力来源',sup.p]);
    if(sup.r)echo.push(['通常的缓解方式',sup.r]);
    if(sup.o)echo.push(['其他补充',sup.o]);
    els.echoWrap.innerHTML='<div class="section-title"><span>补充信息</span><i class="line"></i></div>'+
      '<div class="echo-card">'+echo.map(function(e,i){
        return '<div class="echo-item" style="animation:fadeUp .5s var(--ease) '+(0.15+i*0.08)+'s both">'+
          '<div class="e-l">'+e[0]+'</div><div class="e-c">'+esc(e[1])+'</div></div>'}).join('')+'</div>';
  }else{els.echoWrap.innerHTML=''}

  /* 建议：最薄弱两维度 */
  var weak=res.dims.filter(function(d){return d.lv!=='good'})
    .sort(function(a,b){return a.pct-b.pct}).slice(0,2);
  els.adviceList.innerHTML='';
  if(weak.length){
    var m=0;
    weak.forEach(function(d){
      cfg.sug[d.k].slice(0,3).forEach(function(s){
        var el=document.createElement('div');
        el.className='advice-item';
        el.style.animationDelay=(0.2+m*0.07)+'s';
        el.innerHTML='<span class="a-tag">'+d.name+'</span><div class="d">'+s+'</div>';
        els.adviceList.appendChild(el);
        m++;
      });
    });
  }else{
    els.adviceList.innerHTML='<div class="advice-item" style="animation-delay:.2s"><span class="a-tag">保持</span><div class="d">'+KEEP_ADVICE+'</div></div>';
  }
}

function finish(){
  collectSupp();
  renderReport(compute());
  showStage('report');
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
 $('#skipBtn').addEventListener('click',function(){sup={p:'',r:'',o:''};finish()});
 $('#genBtn').addEventListener('click',finish);
 $('#restartBtn').addEventListener('click',function(){showStage('landing')});
els.backBtn.addEventListener('click',function(){
  if(stage==='landing'){location.href='index.html';return}
  if(pushed){history.back()}else{showStage('landing')}
});

/* 补充信息字数统计（事件委托） */
els.supp.addEventListener('input',function(e){
  var t=e.target;
  if(t.tagName==='TEXTAREA'){
    var c=t.parentElement.querySelector('.char-count');
    if(c)c.textContent=t.value.length+' / '+t.getAttribute('maxlength');
  }
});

/* 系统返回：有进度时挽留 */
window.addEventListener('popstate',function(){
  if(!pushed)return;
  pushed=false;
  var hasProgress=(stage==='quiz'&&answers.some(function(a){return a>=0}))||(stage==='supp'&&hasSupp());
  if(hasProgress&&!confirm('确定退出本次观察吗？当前作答不会被保存。')){
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
