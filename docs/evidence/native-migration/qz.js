
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）

/* ================= 图标 ================= */
var IC={
atmosphere:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
listening:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
emotion:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>',
conflict:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3L3 8l5 5"/><path d="M3 8h13a4 4 0 0 1 4 4v1"/><path d="M16 21l5-5-5-5"/><path d="M21 16H8a4 4 0 0 1-4-4v-1"/></svg>',
companion:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
trust:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
boundary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V5l10-2v18"/><path d="M4 21h16"/><circle cx="12.5" cy="12" r="1"/></svg>',
depth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/><path d="M2 15c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/></svg>',
empathy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>',
academic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
autonomy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>'};

/* ================= 维度 ================= */
var DIMS={
primary:{atmosphere:'沟通氛围',listening:'倾听习惯',emotion:'情绪表达',conflict:'冲突化解',companion:'陪伴互动',trust:'信任支持'},
teen:{boundary:'边界尊重',depth:'深度交流',empathy:'情绪共鸣',academic:'学业减压',autonomy:'自主放手',conflict:'冲突协商'}};
var ORD={primary:['atmosphere','listening','emotion','conflict','companion','trust'],
  teen:['boundary','depth','empathy','academic','autonomy','conflict']};

/* ================= 题库（选项分值 3→0 降序） ================= */
var Q_PRIMARY=[
{d:'atmosphere',t:'每天放学回家后，孩子主动跟您分享学校见闻的频率是？',h:'比如讲同学趣事、老师说的话等',o:['经常主动分享，滔滔不绝','偶尔会说一些，问起才答','不太爱说，多数敷衍回答','几乎从不主动说话，很沉默']},
{d:'atmosphere',t:'当家里给孩子报兴趣班或辅导班时，孩子是否参与决定？',h:'观察孩子在家的话语权',o:['会询问孩子意愿，听取他/她的意见','会告诉他/她结果，但不参与讨论','偶尔无意中被听到','孩子完全被排除在外，大人的安排小孩别管']},
{d:'atmosphere',t:'在辅导作业或检查功课时，家庭交流的氛围通常是？',h:'观察最常发生对话的场景',o:['基本平和，能互相探讨','时好时坏，有时会聊得很开心','比较平淡，基本只对答案','经常紧张，容易因为讲不懂而吵架']},
{d:'listening',t:'当孩子跟您讲他/她觉得很有意思的「网络热梗」或同学间的流行游戏时，您的反应通常是？',h:'观察倾听的耐心程度',o:['放下手头的事，认真倾听并回应','边做事边听，偶尔嗯嗯啊啊','觉得幼稚，让他/她自己玩去','打断他/她，别讲这些没用的']},
{d:'listening',t:'当您给孩子提要求或讲道理时，他/她的状态通常是？',h:'观察孩子对父母的倾听',o:['能安静听完，并点头或提出疑问','能听完，但表情显得不耐烦','经常插嘴或反驳','完全不听，左耳进右耳出']},
{d:'listening',t:'孩子跟您说话时，您的眼神交流通常是？',h:'观察父母的倾听专注度',o:['看着孩子的眼睛，认真听','偶尔看一眼，大多在做自己的事','盯着手机或电视，心不在焉','嫌孩子啰嗦，让他/她自己玩去']},
{d:'emotion',t:'当孩子哭泣或发脾气时，您的第一反应通常是？',h:'观察对孩子负面情绪的接纳',o:['先拥抱，询问怎么了，接纳情绪','试图讲道理，让他/她停止哭泣','责备他/她太脆弱或不懂事','生气，比他/她脾气还大']},
{d:'emotion',t:'孩子会主动跟您分享他的喜怒哀乐吗？',h:'观察孩子表达情绪的意愿',o:['经常主动分享，开心不开心都说','只说开心的事，不开心的憋着','除非实在忍不住，很少说','几乎从不分享内心感受']},
{d:'emotion',t:'孩子比赛失利或被批评后情绪低落时，您通常？',h:'观察情绪安抚的方式',o:['陪着他/她，等平静了再聊','说「下次努力就行」，简单带过','「哭有什么用，谁让你不认真」','看到他/她闹情绪就烦，让一边待着去']},
{d:'conflict',t:'当您和孩子因为规矩（如看电视、玩手机时间）发生分歧时，通常如何解决？',h:'观察分歧的处理方式',o:['一起商量，找到双方都能接受的方案','大人说了算，孩子执行','孩子哭闹后大人妥协','吵一架不了了之']},
{d:'conflict',t:'亲子吼叫或争吵之后，通常多久能和好？',h:'观察冲突后的修复速度',o:['很快，会有人先主动缓和','隔一会儿就当没发生过','冷战半天到一天','经常冷战好几天']},
{d:'conflict',t:'如果您错怪了孩子，您会怎么做？',h:'观察父母认错的姿态',o:['会认真道歉，说明自己错在哪','含糊过去，转移话题','觉得道歉有损权威，不会道歉','没意识到自己会错怪孩子']},
{d:'companion',t:'晚间或周末，您和孩子共同活动的质量如何？',h:'观察共处的真实状态',o:['有固定的共同时光（游戏、阅读、运动）','在一起，但各做各的','主要是接送、吃饭等功能性相处','很少有时间在一起']},
{d:'companion',t:'陪孩子的时候，您的手机通常放在哪里？',h:'观察陪伴的专注度',o:['收起来或静音，专心陪','放在旁边，偶尔看看','一直刷着，孩子叫我才抬头','经常孩子看屏幕、我刷手机']},
{d:'companion',t:'孩子邀请您一起玩他/她的游戏或看喜欢的动画时，您的反应是？',h:'观察进入孩子世界的意愿',o:['经常欣然加入，玩得很投入','偶尔配合一下','借口忙，让他/她自己玩','嫌幼稚，从不参与']},
{d:'trust',t:'孩子在外面遇到困难（忘带东西、和同学闹矛盾）时，第一个想到的求助对象是？',h:'观察孩子心中的支持排序',o:['父母，会直接说','先找老师','找同学朋友','谁也不说，自己扛']},
{d:'trust',t:'当孩子闯祸（打碎东西、弄丢物品）时，他/她通常？',h:'观察犯错后的第一反应',o:['主动来告诉我，寻求帮助','被发现后才承认','先想办法隐瞒，瞒不住才说','一口否认，甚至撒谎']},
{d:'trust',t:'孩子的小心事（收藏、日记、悄悄话）愿意让您知道吗？',h:'观察孩子对您的信任度',o:['愿意主动给我看或讲给我听','我知道有，但不细究','明确保密，不让我碰','完全不知道他/她心里在想什么']}];

var Q_MIDDLE=[
{d:'boundary',t:'进入孩子房间或动他/她的物品（书包、抽屉）前，您会？',h:'观察隐私边界的执行',o:['先敲门或征得同意','进房间会敲，翻东西不会','基本随意进出、翻动','觉得小孩子没什么隐私可讲']},
{d:'boundary',t:'您会翻看孩子的手机、聊天记录或日记吗？',h:'如实填写即可',o:['从不，给了孩子信任的空间','怀疑有问题时会看','经常悄悄检查','会看，发现「异常」会当场质问']},
{d:'boundary',t:'孩子和同学的聚会、交友，您的态度是？',h:'观察社交边界的松紧',o:['尊重他/她的选择，见面时热情招呼','大致过问一下圈子和时间','要逐一盘问是谁、去哪、干什么','基本不允许参加']},
{d:'depth',t:'除了学习和生活起居，你们还会聊什么？',h:'观察对话的深度',o:['人生观、社会热点、他/她的困惑都有','偶尔聊聊兴趣爱好','基本只聊学习和成绩','除了「吃饭没」「作业写没」没别的']},
{d:'depth',t:'孩子会跟您聊他/她将来的想法（想成为什么样的人）吗？',h:'观察精神世界的交流',o:['会主动聊，我们也认真讨论','提过，但聊不深','只说「还早呢，先考上高中」','从来不聊这个话题']},
{d:'depth',t:'当孩子分享他的偶像、游戏或喜欢的作品时，您会？',h:'观察进入孩子世界的姿态',o:['认真了解，甚至一起追','礼貌听听，不太感兴趣','觉得耽误学习，劝他/她少碰','直接否定「这些有什么用」']},
{d:'empathy',t:'孩子情绪低落、烦躁地回家时，您通常？',h:'观察情绪的第一响应',o:['先问问他/她怎么了，听他/她说','观察一下，忍不住会问学习的事','「又怎么了，一天到晚摆脸色」','不太留意他/她的情绪变化']},
{d:'empathy',t:'当孩子抱怨学校、老师或同学时，您的反应是？',h:'先听完，再作判断',o:['认真听完，帮他/她分析但不急着评判','听完先问「你自己有没有问题」','教育他/她「要从自己身上找原因」','嫌他/她事多，别想这些']},
{d:'empathy',t:'对于孩子的青春期变化（敏感、要面子、关房门），您的感受是？',h:'观察对「长大」的态度',o:['理解这是正常的长大，给予空间','有点失落，但尽量适应','觉得孩子变叛逆了','经常因此发生冲突']},
{d:'academic',t:'孩子考试失利时，您最常说的是？',h:'观察失利后的第一句话',o:['「我们一起看看问题出在哪」','「下次注意点就行」','「平时叫你努力你不听」','长叹气、冷脸或直接发火']},
{d:'academic',t:'谈到中考，家里的氛围通常是？',h:'观察学业话题的张力',o:['有目标，但不施加过度压力','偶尔会紧张、念叨','经常把中考挂在嘴边反复强调','一提学习就剑拔弩张']},
{d:'academic',t:'孩子学习松懈（刷手机、磨蹭）时，您通常？',h:'观察督促的方式',o:['和他/她约定规则，提醒后能放手','忍不住反复催促、唠叨','直接没收、断网强管','情绪上来先吼一顿再说']},
{d:'autonomy',t:'孩子的穿着发型、零花钱使用，您会管吗？',h:'观察个人领域的放手程度',o:['基本尊重他/她自己的选择','大方向把关，细节随他/她','事无巨细都要过问','必须按我的要求来']},
{d:'autonomy',t:'周末的时间安排（先玩还是先写作业），通常由谁决定？',h:'观察日常决策权',o:['孩子自己规划，我提参考意见','商量着来，大体听我的','基本我排好他/她执行','全由我安排，没得商量']},
{d:'autonomy',t:'当孩子做了您不认同的决定（选社团、交朋友）时？',h:'观察对「试错」的容忍度',o:['说出担心，但尊重他/她的选择','反复劝说直到他/她改主意','严肃禁止，不允许','表面同意，事后持续数落']},
{d:'conflict',t:'你们发生激烈争执后，通常怎么收场？',h:'观察冲突的收尾方式',o:['有人先缓和，事后能复盘','冷战一阵自然淡忘','以我方训话、他/她服软结束','摔门、锁门，好几天不说话']},
{d:'conflict',t:'冲突中孩子说「你根本不理解我」时，您会？',h:'观察被顶撞时的反应',o:['停下来问「那你希望我怎样理解」','觉得委屈，继续讲道理','「我是你爸/妈，还能害你？」','更生气，觉得他/她翅膀硬了']},
{d:'conflict',t:'事后回想，冲突里你们双方的位置是？',h:'观察对话的平等程度',o:['尽量平等，都能表达','我让一步，他/她也退一步','多数是我单向输出','我说他/她听，天经地义']}];

var Q_HIGH=[
{d:'boundary',t:'孩子的手机内容、社交账号，您会查看吗？',h:'观察数字边界的信任度',o:['从不，选择信任','怀疑有问题时会看','假期会检查使用记录','会定期翻看，并要求汇报密码']},
{d:'boundary',t:'对孩子在学校的交友和活动，您会？',h:'住校/走读都适用',o:['尊重他/她的社交，不主动盘问','会关心，但不过度干涉','会侧面找同学、老师打听','严防死守，发现一点苗头就谈话']},
{d:'boundary',t:'孩子周末回家的时间安排和外出，您的态度是？',h:'观察回家日的边界',o:['提前说一声就行，我们互相信任','需要报备去向和同伴','要精确到几点回、和谁、干什么','基本不允许单独外出']},
{d:'depth',t:'周末或电话里，你们的对话通常涉及？',h:'观察交流的内容层次',o:['专业方向、社会话题、他/她的想法都有','偶尔聊聊兴趣和见闻','基本围绕成绩和排名','只剩「吃了吗」「钱够不够」']},
{d:'depth',t:'关于选科、专业方向，家里的讨论方式是？',h:'观察重大话题的对话姿态',o:['提供信息，最终他/她来定','一起分析，各退一步','主要按我们的判断安排','没认真聊过，觉得还早']},
{d:'depth',t:'孩子聊他的偶像、游戏、喜欢的UP主时，您会？',h:'观察进入他/她世界的意愿',o:['愿意了解，偶尔一起看','听着，不置可否','提醒「都要高考了还玩这个」','直接打断，别耽误时间']},
{d:'empathy',t:'孩子说「累」「烦」「撑不住」时，您的第一反应？',h:'观察情绪的第一响应',o:['先接住情绪，问问他/她怎么了','「高三都这样，坚持一下」','「我们那时候条件更苦」','觉得他/她矫情、意志力差']},
{d:'empathy',t:'模考失利、排名下滑后，孩子回家/来电话时，您会？',h:'观察失利时刻的回应',o:['先安抚情绪，成绩放后面','一起分析错题和策略','忍不住先问「怎么回事」','明显的失望写在脸上或语气里']},
{d:'empathy',t:'孩子对您关上房门、话越来越少，您的感觉是？',h:'观察对「距离」的解读',o:['理解他/她需要空间，保持关注就好','有点失落，但不多问','觉得他/她在疏远、防着我','会想办法撬开他/她的话匣']},
{d:'academic',t:'模考成绩波动时，家里的气氛？',h:'观察对波动的耐受度',o:['平常心，一起看趋势不盯单次','嘴上说没事，脸色藏不住','反复盘问原因和排名','冷战，或爆发一场']},
{d:'academic',t:'关于高考的目标和期望，通常是？',h:'观察期望的来源',o:['和他/她一起定，符合实际','我们有期望，尽量不施压','经常把「必须考上XX」挂在嘴边','目标由我们定，他/她只管执行']},
{d:'academic',t:'孩子学习状态松懈时，您会？',h:'观察督促的方式',o:['找个平静的时机聊一聊','忍不住催促和唠叨','断网、收手机强管','电话里忍不住发火']},
{d:'autonomy',t:'选科、报志愿这类大事，最终决定权在？',h:'观察重大决策的归属',o:['孩子，我们提供参考和分析','商量着来，他/她多我们少','我们主导，他/她配合','完全由我们决定']},
{d:'autonomy',t:'孩子的作息、娱乐、零花钱安排，您？',h:'观察日常管理的松紧',o:['基本放手，大事提个醒','订好框架，细节随他/她','有明确要求并检查执行','事无巨细都要管']},
{d:'autonomy',t:'当您不认同孩子的选择时，您会？',h:'观察否决的方式',o:['说清担心，尊重他/她的决定','反复劝说直到改变','强硬否决','表面同意，事后不断数落']},
{d:'conflict',t:'电话或周末里的争执，通常如何收场？',h:'观察冲突的收尾方式',o:['有人先缓和，事后再复盘','挂了电话各自冷静，不了了之','以我方训话、他/她沉默结束','冷战持续到下次见面']},
{d:'conflict',t:'孩子说「你根本不懂」「别管我」时，您会？',h:'观察被顶撞时的反应',o:['停下来听他/她想怎样被对待','觉得委屈，继续讲道理','「我吃过的盐比你吃过的饭多」','更生气，觉得他/她不懂事']},
{d:'conflict',t:'冲突之后，家里谁先低头？',h:'观察修复的主动性',o:['我会主动缓和，孩子也会','冷处理，自然淡忘','多数要孩子先服软','谁都不低头，一直僵着']}];

/* ================= 维度分析 ================= */
var DESCR={
primary:{
atmosphere:{high:'家庭沟通氛围非常轻松积极。孩子把家当成最安全的表达场所，愿意主动分享生活点滴，说明您为孩子创造了极好的心理安全基地。',medium:'家庭基本能保持正常交流，但氛围时好时坏。孩子有些心里话会憋着，或者只在心情好时才说。多一些不带评价的倾听，会让氛围更融洽。',low:'家庭沟通目前较为沉闷或紧张。孩子可能觉得说话不安全，或觉得说了也没人听。建议暂时放下学习要求，多从生活趣事聊起，重建沟通的桥梁。'},
listening:{high:'亲子间建立了优秀的倾听模式。父母能耐心听完孩子的话，孩子也愿意听取父母的意见。这是一种相互尊重的双向流动。',medium:'日常倾听尚可，但在忙碌或情绪急躁时容易打断对方。父母有时急于给建议，孩子有时急于辩解。试着在关键时刻多忍住三秒钟。',low:'倾听目前存在障碍。可能父母经常打断孩子，或孩子完全拒绝听父母讲话。建议练习「闭嘴艺术」，在回应前先复述一遍对方的话。'},
emotion:{high:'家庭情绪流动非常健康。孩子敢于表达真实的喜怒哀乐，父母也能接纳和共情。这种情绪安全感是孩子未来高情商的基石。',medium:'基本能表达情绪，但对于负面情绪（如哭泣、愤怒）的处理还不够成熟。有时会被情绪带着走，建议多使用「我看到你很生气」这样的情绪标签。',low:'情绪表达目前受阻。孩子可能习惯压抑，或用破坏性方式发泄；父母可能对负面情绪缺乏容忍度。建议先从父母自身示范表达感受开始。'},
conflict:{high:'面对冲突，您和孩子能保持理性与温情。懂得立规矩的同时给予协商空间，误会后能坦诚修复。这种冲突解决模式非常成熟。',medium:'冲突处理有时偏向权威压制，有时又容易妥协。规矩执行不够一致，导致孩子在冲突中有时会试探底线。建议建立家庭规则本，按规则办事。',low:'冲突目前常以争吵、哭闹或冷战收场。双方情绪都容易失控。建议在冲突激烈时按下「暂停键」，各自冷静10分钟后再沟通。'},
companion:{high:'陪伴质量极高。您做到了「人在心也在」的陪伴，深度参与孩子的世界。这种高质量的互动是亲子关系的强力粘合剂。',medium:'有陪伴时间，但质量参差不齐。有时会一心二用看手机。建议每天设立15分钟的「纯净陪伴时间」，放下一切电子产品。',low:'目前陪伴严重不足或缺乏效果。可能虽然在一起，但心很远。建议从孩子最感兴趣的游戏入手，哪怕每天只有10分钟全心全意的玩耍。'},
trust:{high:'孩子对您有着绝对的信任。遇到困难第一时间想到您，犯错也敢坦白。您是他/她心中最坚实的后盾，这是最宝贵的亲子财富。',medium:'信任感基本建立，但在某些特定事情上孩子还有顾虑。可能在害怕被批评的事情上会选择隐瞒。建议对孩子的坦白多表达感谢。',low:'孩子目前对您缺乏足够信任，习惯自我保护或撒谎。这通常是因为以往犯错时受到了过重惩罚。建议重建「无论发生什么，妈妈/爸爸都爱你并帮你」的承诺。'}},
middle:{
boundary:{high:'您极其尊重孩子的隐私与边界。孩子拥有安全的心理空间，这让他感受到被当成独立的大人对待。这种尊重是青春期建立健康自尊的基础。',medium:'您有边界意识，但偶尔会因为「关心则乱」而越界。有时打着「为你好」的旗号打探隐私。建议把关心转化为等待，等孩子主动分享。',low:'目前对孩子的生活缺乏基本边界感，过度监控。这极易引发孩子的逆反心理，导致他彻底关闭心门，甚至学会用谎言保护自己。'},
depth:{high:'亲子交流既有广度又有深度。您不仅是父母，更是孩子精神成长路上的导师和朋友。能够探讨价值观，说明孩子高度认同您的智慧。',medium:'交流多停留在生活琐事和学习层面，缺乏精神层面的共振。孩子可能觉得「跟你们说了你们也不懂」。建议多抛出开放性问题，少下结论。',low:'目前交流极其匮乏，仅限于功能性对话或单向训话。代沟严重。建议从了解孩子的偶像或爱好的游戏开始，不带评判地进入他的世界。'},
empathy:{high:'您是孩子极佳的情绪容器。能敏锐捕捉他青春期敏感的情绪起伏，并给予接纳和缓冲。家真正成为了他卸下防备的避风港。',medium:'您能察觉孩子的情绪，但应对方式有时偏理性说教。容易用「这有什么大不了的」否定他的感受。建议多练习共情回应。',low:'面对孩子的情绪波动，您容易失去耐心，采取压制或对抗态度。这会让情绪变成定时炸弹。建议父母先处理自己的焦虑，再去面对孩子。'},
academic:{high:'在学业压力面前，您是孩子最坚实的后盾。不唯分数论，关注过程与心态。这种松弛感反而能让孩子发挥出更好的学习水平。',medium:'您对孩子学业比较关心，但有时会不自觉传递焦虑。在考砸时容易情绪失控。建议把关注点从分数转移到学习习惯和方法上。',low:'家庭目前是学业的第二战场，充满了高压和紧张。孩子背负双重压力，容易产生厌学情绪。建议立刻降低对分数的执念，先修复亲子关系。'},
autonomy:{high:'您成功地从管理者转型为顾问。给予孩子充分的试错空间和决策权。这种被信任的感觉，会激发他极强的内在责任感和独立性。',medium:'您在尝试放手，但总忍不住想拽一拽风筝线。对孩子还是管得太细。建议区分「原则问题」和「个人选择」，后者大胆交给他自己定。',low:'目前对孩子管控过严，包办代替过多。这会导致孩子要么极度依赖、缺乏主见，要么剧烈反抗、为了反抗而反抗。建议立即开始逐步放权。'},
conflict:{high:'你们拥有成熟健康的冲突解决机制。允许争吵，但懂得叫停和复盘。父母能放下身段道歉，这种平等的姿态会赢得孩子真正的敬佩。',medium:'冲突解决常采用冷战或回避策略，表面平息但核心问题未解决。建议学会「非暴力沟通」，表达感受而非指责行为。',low:'冲突常以激烈对抗或父母强权压制告终，关系修复困难。建议在情绪激动时绝对「闭嘴离开」，千万不要在气头上做决定或说狠话。'}},
high:{
boundary:{high:'您高度尊重孩子的隐私与个人空间。住校后孩子的生活有了更多独立维度，您以信任代替监控，这让他感受到被当成独立的大人对待。这种尊重是高中阶段建立健康自尊和自主性的基础。',medium:'您有边界意识，但面对住校后信息减少的情况，有时会因「不知道他在学校怎样」而过度追问或窥探。建议把焦虑转化为信任——不知道的，等他愿意说时再听。',low:'目前对孩子缺乏基本边界感。住校后仍试图远程监控——翻手机、追问室友、找班主任打听。这极易引发逆反，导致他彻底关闭心门，甚至学会用谎言保护自己。越监控，越看不见真实的他。'},
depth:{high:'你们的交流超越了成绩和排名。周末或电话里能聊人生观、专业方向、社会话题，说明孩子高度认同您的智慧，愿意让您参与他的精神世界。这在高中阶段尤为珍贵。',medium:'交流多围绕学习和生活起居，较少触及内心世界。孩子可能觉得「跟你们说了也不懂」。建议周末聊天时从他的兴趣切入，先倾听再发表看法，少下结论多提问。',low:'亲子交流极其匮乏，住校后更只剩「吃了吗」「考了多少」的功能性对话。代沟严重。建议从了解他喜欢的游戏、歌手或UP主开始——不带评判地进入他的世界，是重建对话的第一步。'},
empathy:{high:'您是孩子极佳的情绪容器。能敏锐感知高三/住校带来的身心疲惫，给予接纳而非说教。家真正成为他卸下防备的避风港，周末回家是他喘息充电的时光。',medium:'您能察觉孩子的情绪，但回应方式有时偏理性说教。容易用「高三都这样」来否定他的感受。建议先共情再建议——第一句话先接住他的情绪，而非急着解决问题。',low:'面对孩子的疲惫和情绪波动，您容易不耐烦或反向施压。这让本就高压的高中生活雪上加霜。建议先处理自己的焦虑，再面对孩子的情绪——他需要的不是「加油」而是「我懂你累」。'},
academic:{high:'在高考重压下，您的家庭是孩子最坚实的后盾。不唯分数论，关注状态与过程。这种松弛感反而能让孩子发挥出更好水平——因为他的能量不用分给应对家庭压力。',medium:'您对孩子学业高度关注，有时不自觉传递焦虑。模考排名波动时可能比孩子还紧张。建议把关注点从分数转移到身心状态上——他状态好，成绩自然会跟上。',low:'家庭目前是学业的第二战场，高考压力在家庭被放大。孩子背负双重压力，极易产生厌学或崩溃。建议立刻降低对分数的执念——先修复亲子关系，关系好了，他才愿意听你说话。'},
autonomy:{high:'您成功地从管理者转型为顾问。在选科、专业、时间安排上给予孩子充分决策权。住校生活本身就在锻炼他的独立能力，您的信任会进一步激发他的责任感和自主性。',medium:'您在尝试放手，但总忍不住想拽一拽。选科时担心他选错，花钱时觉得他乱花，回家时又想管作息。建议区分「原则问题」和「个人选择」，后者大胆交给他自己定。',low:'对孩子管控过严，重大决策几乎全是您做主。这会导致孩子要么丧失主见、到大学后茫然无措，要么剧烈反抗、为了反抗而反抗。高中是练习决策的最后窗口期，请立即开始逐步放权。'},
conflict:{high:'你们拥有成熟的冲突解决机制。允许争吵，但懂得叫停和复盘。您能放下身段道歉，这种平等姿态会赢得孩子真正的敬佩。住校后冲突更多发生在电话里，您能控制不在电话里说狠话。',medium:'冲突解决常采用冷战或回避，表面平息但核心问题未解决。住校后冷战更方便——挂了电话就不理了。建议学会在电话里说「我们都冷静一下，周末再聊」，而非回避。',low:'冲突常以激烈对抗或强权压制告终，关系修复困难。住校后一句话挂电话就消失，冲突更难修复。建议绝对不在气头上做决定或说狠话——挂掉电话的那一刻，你无法知道那句话的伤害有多大。'}}};

/* ================= 建议 ================= */
var SUG={
primary:{atmosphere:'设立家庭「开心一刻」分享时间，每天饭桌上每人分享一件今天最开心的事',
 listening:'练习「蹲下来看着眼睛」听孩子说话，保持视线平齐',
 emotion:'帮孩子命名情绪：「你看起来有点委屈，是因为……」',
 conflict:'如果错怪了孩子，大方说「对不起」，这反而会赢得尊重',
 companion:'每天保证至少 15 分钟「无手机干扰」的专属陪伴时间',
 trust:'当孩子坦白错误时，第一句话说：「谢谢你愿意告诉妈妈/爸爸」'},
middle:{boundary:'进门必敲门，把孩子的房间视为他的私人领地',
 depth:'和孩子一起看一部电影或一场球赛，之后自然地讨论感受',
 empathy:'当孩子抱怨时，第一句话说「听起来你真的很心烦」',
 academic:'考砸时先给他一个拥抱，说「不管考怎样妈妈都爱你」',
 autonomy:'把周末的一天完全交给他自己安排，不干涉',
 conflict:'情绪失控前立刻说「我现在很生气，需要离开10分钟」'},
high:{boundary:'住校后孩子的生活您不可能全知道——把「不知道」当成正常，而非威胁',
 depth:'周末他回家时，第一句话聊「这周有什么好玩的事」而非「这周考了多少」',
 empathy:'孩子说累时，先接住情绪：「是不是压力太大了？」而非「高三都这样」',
 academic:'模考排名波动时说「一次考试说明不了什么，我们看趋势」',
 autonomy:'选科/志愿时，提供信息和分析，最后说「这是你的人生，你来定，我支持你」',
 conflict:'电话里吵起来时，主动说「我们都不在状态，先挂了，冷静后再聊」'}};

/* ================= 版本配置 ================= */
var VER={
primary:{grp:'primary',tag:'6–12岁 · 小学阶段',
 lead:'小学阶段是建立沟通习惯的黄金窗口。这一版的观察聚焦安全表达的氛围与倾听习惯：孩子敢不敢说、您听不听得完、冲突之后怎么和好。',
 grades:['一年级','二年级','三年级','四年级','五年级','六年级'],boarding:false,qs:Q_PRIMARY},
middle:{grp:'teen',tag:'12–15岁 · 初中阶段',
 lead:'青春期是一场渐行渐远的分离，沟通不再是「听话」，而是「对话」。这一版的观察聚焦边界尊重与情绪共鸣，帮助您以平等的姿态与孩子交流，从「说教者」转变为「倾听者」。',
 grades:['初一','初二','初三'],boarding:false,qs:Q_MIDDLE},
high:{grp:'teen',tag:'15–18岁 · 高中阶段',
 lead:'高中是亲子关系面临最大考验的阶段——高考重压、住校距离、日益强烈的独立需求，都在拉远你和孩子的距离。这份观察帮您看清当下的沟通模式，找到走近孩子内心的桥。',
 grades:['高一','高二','高三'],boarding:true,qs:Q_HIGH}};

/* ================= 画像 & 等级 ================= */
var PROFILE={
good:{title:'亲密无间',desc:'您和孩子之间拥有高质量的亲子沟通。家是孩子最安全的港湾，你们不仅分享生活，更能相互理解和信任。继续保持这份用心，这将化为孩子一生受用的心理底气。'},
ok:{title:'融洽发展中',desc:'你们的亲子沟通基础良好，虽然在倾听深度、情绪处理或陪伴质量上还有提升空间，但方向是正确的。多一些耐心和技巧，沟通的桥梁会越发坚固。'},
low:{title:'等待连接',desc:'目前亲子沟通可能存在一些障碍或冷战状态。孩子的心门暂时半掩，请不要焦虑。放下评判，用纯粹的陪伴和无条件的接纳，慢慢重新敲开它。爱，需要被正确地传达。'}};
var LVL={good:'顺畅',ok:'尚可',low:'受阻'};
var DK={good:'high',ok:'medium',low:'low'};
var KEEP_ADVICE='目前的沟通状态运转良好，无需刻意调整。可以每学期找一个轻松的时机，和孩子一起聊聊最近的相处感受。';

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),supp:$('#page-supp'),report:$('#page-report'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formLead:$('#formLead'),formTitle:$('#formTitle'),formFields:$('#formFields'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),resultTitle:$('#resultTitle'),
  pfCard:$('#pfCard'),pfTitle:$('#pfTitle'),pfDesc:$('#pfDesc'),pfStats:$('#pfStats'),
  dimList:$('#dimList'),echoWrap:$('#echoWrap'),adviceList:$('#adviceList'),
  ageCards:$('#ageCards'),backBtn:$('#backBtn'),toast:$('#toast')
};
var ver='',cfg=null,flat=[],answers=[],idx=0,stage='landing',user={},sup={b:'',i:'',o:''},timer=null,pushed=false,toastT=null;

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
  ver=v;cfg=VER[v];user={};sup={b:'',i:'',o:''};
  els.formTag.textContent=cfg.tag;
  els.formLead.textContent=cfg.lead;
  var g='<div><label class="f-label" for="fName">孩子昵称（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>';
  if(cfg.boarding){
    g+='<div class="f-row">'+
      '<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(cfg.grades)+'</select></div>'+
      '<div><label class="f-label" for="fBoard">就读方式</label><select class="f-input" id="fBoard">'+opts(['住校','走读'])+'</select></div></div>';
  }else{
    g+='<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(cfg.grades)+'</select></div>';
  }
  els.formFields.innerHTML=g;
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  var grade=$('#fGrade');
  if(!grade.value){toast('请选择年级');return}
  if(cfg.boarding&&!$('#fBoard').value){toast('请选择就读方式');return}
  user={name:($('#fName').value||'').trim(),grade:grade.value,board:cfg.boarding?$('#fBoard').value:''};
  flat=cfg.qs;
  answers=flat.map(function(){return -1});
  idx=0;
  els.qTotal.textContent=flat.length;
  showStage('quiz');
  renderQ(1);
}

/* ================= 问卷 ================= */
function dimName(d){return DIMS[cfg.grp][d]}
function renderQ(dir){
  var q=flat[idx];
  els.dimText.textContent=dimName(q.d);
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
  var last=idx===flat.length-1;
  els.prevBtn.disabled=idx===0;
  els.nextBtn.disabled=answers[idx]<0;
  els.nextLabel.textContent=last?(ver==='high'?'填写补充信息':'生成报告'):'下一题';
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
  if(t>=flat.length){finishQuiz();return}
  idx=t;
  renderQ(d);
  window.scrollTo({top:0,behavior:REDUCED?'auto':'smooth'});
}
function finishQuiz(){
  clearTimeout(timer);
  if(ver==='high')enterSupp();
  else finish();
}

/* ================= 补充信息 ================= */
function enterSupp(){
  ['supB','supI','supO'].forEach(function(id){
    var ta=$('#'+id);ta.value='';
    var c=ta.parentElement.querySelector('.char-count');if(c)c.textContent='0 / 500';
  });
  showStage('supp');
}
function collectSupp(){
  sup={b:$('#supB').value.trim(),i:$('#supI').value.trim(),o:$('#supO').value.trim()};
}
function hasSupp(){return !!(sup.b||sup.i||sup.o)}

/* ================= 计分与报告 ================= */
function compute(){
  var per={},cnt={};
  flat.forEach(function(q,i){
    per[q.d]=(per[q.d]||0)+(3-answers[i]);
    cnt[q.d]=(cnt[q.d]||0)+1;
  });
  var dims=ORD[cfg.grp].map(function(k){
    var pct=Math.round((per[k]||0)/(cnt[k]*3)*100);
    return{k:k,name:dimName(k),pct:pct,lv:pct>=75?'good':pct>=50?'ok':'low'};
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
  els.resultTitle.textContent=user.name?'「'+user.name+'」的沟通画像':'亲子沟通画像';

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
  els.pfStats.innerHTML='六个维度中：<b class="sg">'+cnt.good+'</b> 个顺畅 · <b class="sy">'+cnt.ok+'</b> 个尚可 · <b class="sr">'+cnt.low+'</b> 个受阻';

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
      '<p class="dim-desc">'+DESCR[ver][d.k][DK[d.lv]]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  /* 补充信息回显 */
  if(hasSupp()){
    var echo=[];
    if(sup.b)echo.push(['您觉得最大的沟通障碍',sup.b]);
    if(sup.i)echo.push(['您最想改善的方面',sup.i]);
    if(sup.o)echo.push(['其他补充',sup.o]);
    els.echoWrap.innerHTML='<div class="section-title"><span>补充信息</span><i class="line"></i></div>'+
      '<div class="echo-card">'+echo.map(function(e,i){
        return '<div class="echo-item" style="animation:fadeUp .5s var(--ease) '+(0.15+i*0.08)+'s both">'+
          '<div class="e-l">'+e[0]+'</div><div class="e-c">'+esc(e[1])+'</div></div>'}).join('')+'</div>';
  }else{els.echoWrap.innerHTML=''}

  /* 建议 */
  var weak=res.dims.filter(function(d){return d.lv!=='good'})
    .sort(function(a,b){return a.pct-b.pct}).slice(0,3);
  els.adviceList.innerHTML='';
  if(weak.length){
    var m=0;
    weak.forEach(function(d){
      var el=document.createElement('div');
      el.className='advice-item';
      el.style.animationDelay=(0.2+m*0.08)+'s';
      el.innerHTML='<span class="a-tag">'+d.name+'</span><div class="d">'+SUG[ver][d.k]+'</div>';
      els.adviceList.appendChild(el);
      m++;
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
 $('#skipBtn').addEventListener('click',function(){sup={b:'',i:'',o:''};finish()});
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

/* 桌面端键盘支持 */
document.addEventListener('keydown',function(e){
  if(stage!=='quiz')return;
  if(e.key==='ArrowRight')go(1);
  else if(e.key==='ArrowLeft')go(-1);
  else if(/^[1-4]$/.test(e.key))pick(+e.key-1);
});
})();
