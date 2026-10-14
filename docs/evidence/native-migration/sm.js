
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）

/* ================= 图标 ================= */
var IC={
latency:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="7" cy="13" r="2"/></svg>',
duration:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
stability:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
wake:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
habit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>'};
var DIM_NAMES={latency:'入睡情况',duration:'睡眠时长',stability:'夜间安稳',wake:'日间状态',habit:'睡前习惯'};
var ORD=['latency','duration','stability','wake','habit'];

/* ================= 共享题目（各版本完全重复，选项分值 3→0 降序） ================= */
var LAT_TIME={d:'latency',h:'入睡潜伏期',t:'晚上关灯上床后，孩子通常需要多久能睡着？',o:['15分钟以内，倒头就睡','15-30分钟，翻一会儿','30-60分钟，经常说睡不着','超过1小时，入睡非常困难']};
var NIGHT_WAKE={d:'stability',h:'睡眠连续性',t:'孩子半夜会突然醒来，并且很难再次入睡吗？',o:['一觉到天亮，很少夜醒','偶尔醒来（如上厕所），能迅速接着睡','经常半夜醒来，需要很久才能再睡','每晚都醒，醒来后基本睡不着了']};
var WEEKEND={d:'duration',h:'作息规律度',t:'孩子周末的睡眠时间和工作日相比如何？',o:['基本一致，误差不超过1小时','周末稍多睡1-2小时','周末经常补觉3小时以上','周末昼夜颠倒，白天睡到下午']};
var SLEEP_ENV={d:'habit',h:'睡眠物理环境',t:'孩子睡觉时房间的光线和声音环境如何？（住校生以宿舍环境为准）',o:['全黑且安静，环境极佳','基本暗和安静，偶尔有轻微声响','开着小夜灯，或能听到家人/室友动静','光线很亮，或经常有嘈杂声严重干扰']};
var GETUP={d:'wake',h:'唤醒难度',t:'早上叫孩子起床时的状态通常是？',o:['一叫就醒，或自己能醒','需要叫2-3次，稍微赖床','要催促十几分钟，很不情愿','根本叫不醒，必须反复大声吼']};

/* ================= 小学题库 ================= */
var Q_PRIMARY=[
LAT_TIME,
{d:'latency',h:'睡眠抗拒表现',t:'到了平时睡觉时间，孩子是否经常找借口拖延（如要喝水、上厕所）？',o:['从不拖延，作息规律','偶尔拖延，提醒后能去睡','经常拖延，每天都要催促','每次都激烈抗拒，讨价还价']},
{d:'latency',h:'睡前心理状态',t:'入睡前，孩子会在床上想白天的事情（如作业、同学矛盾）导致兴奋或焦虑吗？',o:['不会，能很快平静下来','偶尔会说白天的事，但能平复','经常想事情，导致翻来覆去','每次都很焦虑/兴奋，无法控制']},
{d:'duration',h:'小学生建议 9-10 小时',t:'孩子工作日（周一到周五）晚上的平均睡眠时长大约是？',o:['9-10小时及以上','8-9小时','7-8小时','不足7小时']},
WEEKEND,
{d:'duration',h:'白天精神状态',t:'白天上课或周末在家时，孩子会出现打哈欠、犯困的情况吗？',o:['精力充沛，从不犯困','偶尔在午后犯困','经常打哈欠，显得没精神','白天萎靡不振，甚至打盹']},
NIGHT_WAKE,
{d:'stability',h:'睡眠动作与呼吸',t:'孩子睡觉时打呼噜、磨牙、说梦话或频繁翻身的情况多吗？',o:['睡得很安静，没有这些情况','偶尔有一点点动静','经常有，动静比较大','打呼噜声很大，甚至有憋气现象']},
{d:'stability',h:'夜惊与梦境',t:'孩子最近有频繁做噩梦或半夜惊醒哭泣的情况吗？',o:['没有，睡眠很安稳','偶尔做梦，但不影响睡眠','每月都有几次噩梦惊醒','几乎每周都发生，非常害怕睡觉']},
GETUP,
{d:'wake',h:'起床气表现',t:'起床后半小时内，孩子的情绪状态如何？',o:['心情愉快，主动打招呼','情绪平静，开始慢慢清醒','有起床气，烦躁易怒','极度哭闹或昏昏沉沉，状态很差']},
{d:'habit',h:'睡前活动安排',t:'睡前一小时，孩子通常会做什么？',o:['看纸质书、听轻音乐或聊天','玩积木、画画等安静玩具','看动画片或玩手机游戏','进行剧烈运动或看恐怖刺激的内容']},
{d:'habit',h:'睡前饮食情况',t:'孩子睡前会吃东西（包括喝牛奶以外的零食）吗？',o:['不会，最多喝点温水','偶尔吃一点水果','经常吃零食或喝甜饮料','每次都要吃得很饱才肯睡']},
SLEEP_ENV];

/* ================= 初中题库 ================= */
var Q_MID=[
LAT_TIME,
{d:'latency',h:'睡前心理状态',t:'躺在床上时，孩子是否经常因为想白天的事情（如考试成绩、同学关系）而难以平静？',o:['不会，能很快放空大脑','偶尔会想，但不太影响入睡','经常想事情，导致翻来覆去','每次都很焦虑/兴奋，无法控制']},
{d:'latency',h:'心理代偿机制',t:'孩子是否有「报复性熬夜」现象（明明困了却强撑着不睡，只为拥有个人时间）？',o:['没有，困了就顺势去睡','偶尔（周末），会稍微晚睡一会儿','经常如此，哪怕很困也要玩手机','每晚都强撑熬夜，不到凌晨不睡']},
{d:'duration',h:'初中生建议 8-9 小时',t:'孩子工作日（周一到周五）晚上的平均睡眠时长大约是？',o:['8-9小时及以上','7-8小时','6-7小时','不足6小时']},
WEEKEND,
NIGHT_WAKE,
{d:'stability',h:'夜醒诱因排查',t:'孩子半夜醒来的常见原因是什么？',o:['几乎没有醒来的情况','做梦惊醒，或自然醒后很快入睡','被室友动静、走廊声音或家人声响吵醒','因为心慌、胸闷或想心事突然惊醒且极难平复']},
{d:'stability',h:'睡眠动作与呼吸',t:'孩子睡觉时打呼噜、说梦话或频繁翻身的情况多吗？',o:['睡得很安静，没有这些情况','偶尔有一点点动静','经常翻身或说梦话，动静比较大','打呼噜声很大，甚至有憋气现象']},
GETUP,
{d:'wake',h:'日间嗜睡程度',t:'白天上课时，孩子犯困打瞌睡的情况严重吗？',o:['精力充沛，从不犯困','仅下午第一二节课有点困','上午也经常打哈欠，注意力不集中','多节课都在打瞌睡，甚至站着都能睡']},
{d:'wake',h:'日间睡眠代偿',t:'周末或节假日白天，孩子是否会睡午觉？',o:['基本不睡，晚上自然困','偶尔眯20分钟左右','经常睡1-2小时，导致晚上不困','每次都睡半天，作息完全混乱']},
{d:'habit',h:'睡前活动安排',t:'晚上临睡前一小时，孩子通常会做什么？',o:['看纸质书、听轻音乐或做拉伸','和家人聊天或整理书包','玩手机游戏、刷短视频或与室友卧谈','进行剧烈运动或看恐怖刺激的内容']},
{d:'habit',h:'咖啡因摄入情况',t:'孩子下午或晚上是否会摄入含咖啡因的饮料（奶茶、可乐、咖啡、红牛）？',o:['从不喝，主要喝白水或牛奶','偶尔喝一点，但在下午4点前','经常喝，有时晚饭后还在喝','每天靠咖啡或奶茶续命提神']},
SLEEP_ENV];

/* ================= 高中题库（12-14 题按前两版结构补全） ================= */
var Q_HIGH=[
LAT_TIME,
{d:'latency',h:'睡前心理状态',t:'躺在床上时，孩子是否经常因为想学业、考试或未来而焦虑难眠？',o:['不会，能很快放空大脑','偶尔会想，但不太影响入睡','经常因为焦虑而翻来覆去','每次躺下就心慌，大脑高速运转']},
{d:'latency',h:'心理代偿机制',t:'孩子是否有「报复性熬夜」现象（作业写完/宿舍熄灯后，仍强撑着玩手机不肯睡）？',o:['没有，困了就顺势去睡','偶尔（周末），会多玩半小时','经常如此，哪怕很困也要在被窝里刷手机','每晚都强撑熬夜，不到凌晨不睡']},
{d:'duration',h:'高中生建议 7-8 小时',t:'孩子工作日（周一到周五）晚上的平均睡眠时长大约是？',o:['7-8小时及以上','6-7小时','5-6小时','不足5小时']},
WEEKEND,
NIGHT_WAKE,
{d:'stability',h:'夜醒诱因排查',t:'孩子半夜醒来的常见原因是什么？',o:['几乎没有醒来的情况','做梦惊醒，或自然醒后很快入睡','被室友动静、走廊声音或家人声响吵醒','因为心慌、胸闷或想学业突然惊醒且极难平复']},
{d:'stability',h:'呼吸暂停筛查',t:'孩子睡觉时打呼噜声音大吗？是否曾被憋醒？',o:['睡得很安静，没有这些情况','偶尔有一点轻微鼾声','经常打呼噜，动静比较大','鼾声如雷，且伴有突然憋气停止呼吸']},
{d:'wake',h:'清晨唤醒水平',t:'早读或第一二节课时，孩子的精神状态通常是？',o:['精力充沛，思维活跃','基本清醒，偶尔走神','经常打哈欠，强撑着听课','极度困倦，甚至趴在桌上睡着']},
{d:'wake',h:'咖啡因依赖度',t:'孩子是否依赖咖啡、浓茶或功能饮料来维持白天精神？',o:['从不喝，主要喝白水','偶尔喝，仅在特别困时','每天至少一杯，不喝就没精神','当水喝，一天多杯依然犯困']},
{d:'wake',h:'日间微睡眠',t:'下午或晚自习期间，孩子会困到无法控制地打盹吗？',o:['不会，能保持专注','偶尔觉得累，但能挺过去','经常在自习课上趴着睡十几分钟','多节课都在打瞌睡，甚至站着都能睡着']},
{d:'habit',h:'睡前活动安排',t:'晚自习后到睡前，孩子通常会做什么？',o:['看纸质闲书、听轻音乐或做拉伸','整理书包、洗漱、和家人说晚安','玩手机游戏、刷短视频','继续刷题，或看刺激性内容']},
{d:'habit',h:'睡前饮食情况',t:'晚自习后孩子会吃夜宵吗？',o:['不会，最多喝点温水','偶尔喝半杯温牛奶','经常吃泡面、烧烤等夜宵','每次都吃得很饱才肯睡']},
SLEEP_ENV];

/* ================= 维度分析（小学独立；初中/高中共享，仅留实质差异） ================= */
var D_PRIMARY={
latency:{good:'孩子入睡迅速且规律，没有明显的睡前焦虑。睡前安抚到位，孩子建立了良好的条件反射，能快速从兴奋状态切换到休息模式。',
 ok:'孩子有时入睡较慢，或存在轻微的拖延。可能是白天精力未完全释放，或睡前活动稍显刺激。建议增加白天的运动量，并提前半小时进入安静时光。',
 low:'孩子存在明显的入睡困难，通常与睡前过度兴奋（如看屏幕）、心理压力或作息不规律有关。建议立刻建立固定的睡前仪式，严格限制睡前一小时的屏幕时间。'},
duration:{good:'孩子的睡眠时长达标，且工作日与周末作息一致。充足睡眠为身高发育和大脑恢复提供了坚实保障，请继续保持。',
 ok:'睡眠时长基本够用，但可能存在周末补觉的情况，这会打乱生物钟。建议周末起床时间不比平时晚超过1小时。',
 low:'睡眠时长严重不足，会直接影响生长激素的分泌和记忆力的发展。建议重新审视作业与课外班安排，确保每天至少9小时。'},
stability:{good:'孩子夜间睡眠非常安稳，连续性好，没有呼吸障碍。神经系统发育良好，深睡眠比例高。',
 ok:'夜间偶尔有翻身或轻微动作，但总体不影响睡眠。注意晚餐别吃得太饱，观察是否冷热不适导致的夜间不安。',
 low:'夜间睡眠不连续，可能伴随打鼾、夜醒或噩梦。打鼾严重建议去耳鼻喉科排查腺样体肥大；噩梦频繁则白天减少刺激性内容、多给予心理安抚。'},
wake:{good:'孩子早晨唤醒轻松，起床后精神饱满。这是高质量睡眠的直接体现，大脑已完全重启，准备好迎接新的一天。',
 ok:'早晨有些赖床，需要缓冲时间。建议提前15分钟拉开一点窗帘，用自然光线帮助孩子唤醒，不要大声催促。',
 low:'起床极其困难且伴随起床气，说明深睡眠被强行打断。建议将入睡时间提前，用轻柔的音乐渐进式唤醒。'},
habit:{good:'睡前习惯非常健康：没有蓝光干扰、没有饱腹负担、环境舒适，为高质量睡眠打下了完美的生理基础。',
 ok:'睡前习惯有待优化，偶尔接触屏幕或环境不够安静。建议建立「睡前一小时无屏幕」规矩，用亲子阅读替代电子产品。',
 low:'睡前习惯较差。电子屏幕的蓝光会抑制褪黑素分泌，睡前过饱会让肠胃加班。建议立刻停止睡前零食和电子产品，营造全黑的睡眠环境。'}};

var D_TEEN={
latency:{good:'孩子入睡迅速且规律，没有明显的睡前焦虑或报复性熬夜——能高强度学习后迅速切换到休息模式，这是难得的心理调节能力。',
 ok:'孩子有时入睡较慢，可能因学业压力产生轻度焦虑，或想「夺回控制权」而晚睡。建议睡前留出半小时的「无任务放空期」，允许大脑彻底停转。',
 low:'孩子存在明显的入睡障碍。「报复性熬夜」往往源于白天自主权被剥夺。建议白天减少过度管控、留出自主时间，睡前严禁使用电子产品。'},
duration:{good:'睡眠时长达标且作息稳定，为记忆巩固、情绪稳定和免疫力提供了坚实保障——这才是高效学习的底层逻辑。',
 ok:'时长勉强及格，但周末补觉差距大会造成「社交时差」，让周一早晨异常痛苦。建议周末起床不比平时晚超过1.5小时。',
 low:'睡眠时长严重不足，相当于慢性剥夺大脑清洗代谢废物的机会，会直接阻碍生长激素分泌、损害记忆力。必须砍掉低效熬夜，强行提前熄灯时间。'},
stability:{good:'夜间睡眠安稳、连续性好，大脑能顺利进入深度睡眠阶段，负责记忆的神经突触正在高效修剪和加固。',
 ok:'夜间偶有翻身或做梦，总体不影响。留意晚饭过饱、被子太热或考前紧张；住校生需留意室友作息差异带来的短暂干扰。',
 low:'夜间睡眠不连续，多梦或打鼾。若打鼾伴憋气，务必去耳鼻喉科排查睡眠呼吸暂停（夜间缺氧、白天极度嗜睡）；若因环境吵醒，需改善睡眠物理环境。'},
wake:{good:'白天精力充沛、无需咖啡因也能保持专注，说明前额叶皮层得到充分恢复，能应对繁重的学业。',
 ok:'早晨有些赖床、下午偶有困倦。利用早晨的自然光线唤醒，周末不要过度补觉，困倦时试试20分钟内的短时午休。',
 low:'白天嗜睡严重、依赖咖啡因续命。继续透支会导致神经衰弱和抑郁倾向，必须立即干预作息、停止咖啡因滥用。'},
habit:{good:'睡前习惯健康：没有蓝光干扰、没有饱腹负担、环境舒适，为褪黑素分泌提供了完美条件。',
 ok:'习惯有待优化，偶尔接触屏幕或吃夜宵。建议「睡前1小时无屏幕」；饿了用温牛奶或全麦面包替代泡面。',
 low:'睡前习惯极差。短视频的强刺激会压制褪黑素分泌，深夜碳水会加重肠胃负担。建议立刻停止睡前电子产品，改用纸质闲书过渡，睡前3小时禁食。'}};

/* ================= 行动建议 ================= */
var SUG_PRIMARY={
latency:['建立固定的「睡前仪式」：洗澡—换睡衣—读绘本—关灯，每天按顺序进行','睡前1小时避免接触手机、平板等电子屏幕','白天保证至少1小时户外运动，让精力充分释放'],
duration:['小学生建议晚上9点前上床、早上7点后起床，保证10小时睡眠','周末起床时间不比平时晚超过1小时，维持生物钟稳定','合理规划放学后的时间，避免作业拖拉挤占睡眠'],
stability:['晚餐别太晚太饱，睡前避免含咖啡因饮料（可乐、奶茶）','保持卧室温度适宜（20-22度），被子不要盖得太厚','频繁打鼾或张口呼吸，建议就医检查腺样体或扁桃体'],
wake:['早上提前15分钟稍微拉开窗帘，用自然光帮助孩子清醒','用轻柔的音乐或抚摸代替大声吼叫唤醒，减少起床气','确保前一晚入睡时间足够早，让睡眠周期自然完整'],
habit:['设立「屏幕宵禁」：睡前1小时全家交出电子产品','睡前若饿，可喝半杯温牛奶或吃一小口香蕉，忌甜食和油炸','使用遮光窗帘确保卧室全黑，必要时用白噪音屏蔽杂音']};
var SUG_TEEN={
latency:['睡前30分钟停止一切学习与高强度思考，听白噪音或做正念呼吸，让大脑从「做题模式」切换到「待机模式」','理解「报复性熬夜」的心理需求：白天给孩子留出一段完全自主的时间','躺下20分钟仍睡不着就起来看会儿枯燥的纸质书，有困意再回床，别在床上翻烙饼'],
duration:['初中尽量22:00前、高中尽量23:30前上床，至少睡够相应时长——低于6小时的熬夜复习，第二天记忆效率反而更低','周末起床时间不比平时晚超过1.5小时，维持生物钟稳定，避免「周一综合征」','重新审视作业与复习计划，砍掉低效重复的刷题，把睡眠作为第一优先级'],
stability:['晚餐别太晚太饱，睡前3小时禁食，避免肠胃加班导致多梦夜醒','打呼噜声大且白天极度嗜睡，务必去耳鼻喉科排查腺样体/扁桃体或睡眠呼吸暂停','白天增加中高强度运动有助加深深睡，但睡前2小时避免剧烈运动'],
wake:['早上提前15分钟拉开一点窗帘，用自然光唤醒大脑、抑制褪黑素','午休严格控制在20-30分钟内，超过30分钟进入深睡眠，醒后反而更困','下午4点后严禁咖啡和奶茶，避免陷入「晚上睡不着—白天靠咖啡」的恶性循环'],
habit:['设立「屏幕宵禁」：睡前1小时手机留在客厅或宿舍外，绝不带上床','饿了可喝半杯温牛奶或吃一小把坚果，忌泡面、烧烤等高糖高油夜宵','遮光眼罩和降噪耳塞（住校生必备），营造全黑安静的睡眠环境']};

/* ================= 版本配置 ================= */
var CFG={
primary:{tag:'6–12岁 · 小学阶段',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],board:false,
 sleep:['21:00前','21:00-22:00','22:00-23:00','23:00后'],
 lead:'小学阶段是睡眠习惯养成的黄金窗口。这一版聚焦规律作息与睡前仪式：入睡快不快、睡得够不够、夜里安不安稳，以及睡前一小时在做什么。',
 qs:Q_PRIMARY,descr:D_PRIMARY,sug:SUG_PRIMARY},
middle:{tag:'12–15岁 · 初中阶段',grades:['初一','初二','初三'],board:true,
 sleep:['22:00前','22:00-23:00','23:00-00:00','00:00后'],
 lead:'初中阶段伴随课业压力增加与青春期生理变化，睡眠极易受到冲击。无论走读还是住校，长期熬夜都会严重影响生长发育。这一版聚焦熬夜、失眠与作息紊乱的早期信号。',
 qs:Q_MID,descr:D_TEEN,sug:SUG_TEEN},
high:{tag:'15–18岁 · 高中阶段',grades:['高一','高二','高三'],board:true,
 sleep:['22:30前','22:30-23:30','23:30-00:30','00:30后'],
 lead:'高中阶段睡眠往往成为最先被牺牲的代价，而长期睡眠不足会直接损害记忆巩固与逻辑思维。这一版帮你在冲刺期找回最高效的休息方式。',
 qs:Q_HIGH,descr:D_TEEN,sug:SUG_TEEN}};

/* ================= 画像 & 等级 ================= */
var PROFILE={
good:{title:'优质小睡神',desc:'孩子的睡眠质量非常棒！入睡快、睡得香、起得来。良好的睡眠为生长发育和大脑发育提供了强大的支持。请继续保持现在的作息习惯，让孩子在梦乡中快乐长高。'},
ok:{title:'调整进行时',desc:'孩子的睡眠基本及格，但在入睡速度、睡前习惯或起床状态上还有一些小烦恼。不用担心，通过微调作息时间和睡前仪式，孩子很快就能拥有更好的睡眠。'},
low:{title:'疲惫小夜猫',desc:'孩子目前的睡眠状况存在较多问题，可能已经影响到了白天的精神状态和身体发育。长期熬夜或入睡困难需要引起高度重视。建议从今晚开始改革睡前习惯，必要时寻求专业帮助。'}};
var LVL={good:'良好',ok:'尚可',low:'需关注'};
var DK={good:'good',ok:'ok',low:'low'};
var KEEP_ADVICE='目前各维度状态都不错，无需刻意调整。可以隔一两个月再做一次，观察状态的自然变化。';

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),report:$('#page-report'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formLead:$('#formLead'),formFields:$('#formFields'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),resultTitle:$('#resultTitle'),resultSub:$('#resultSub'),
  pfCard:$('#pfCard'),pfTitle:$('#pfTitle'),pfDesc:$('#pfDesc'),pfStats:$('#pfStats'),
  dimList:$('#dimList'),adviceList:$('#adviceList'),
  ageCards:$('#ageCards'),backBtn:$('#backBtn'),toast:$('#toast')
};
var ver='',cfg=null,flat=[],answers=[],idx=0,stage='landing',user={},timer=null,pushed=false,toastT=null;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function opts(a){return a.map(function(t){return '<option>'+t+'</option>'}).join('')}
function toast(msg){
  els.toast.textContent=msg;els.toast.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){els.toast.classList.remove('show')},2200);
}

function showStage(s){
  clearTimeout(timer);
  stage=s;
  [['landing',els.landing],['form',els.form],['quiz',els.quiz],['report',els.report]].forEach(function(p){
    var on=p[0]===s;p[1].hidden=!on;
    if(on){p[1].classList.remove('stage-in');void p[1].offsetWidth;p[1].classList.add('stage-in')}
  });
  var q=s==='quiz';
  els.brand.hidden=q;els.topQuiz.hidden=!q;els.progressTrack.hidden=!q;
  window.scrollTo(0,0);
}

/* ================= 表单 ================= */
function pickAge(v){
  ver=v;cfg=CFG[v];user={};
  els.formTag.textContent=cfg.tag;
  els.formLead.textContent=cfg.lead;
  var g='<div><label class="f-label" for="fName">孩子昵称（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>'+
    '<div class="f-row"><div><label class="f-label" for="fGrade">年级</label>'+
    '<select class="f-input" id="fGrade">'+opts(cfg.grades)+'</select></div>';
  if(cfg.board)g+='<div><label class="f-label" for="fBoard">就读方式</label>'+
    '<select class="f-input" id="fBoard">'+opts(['走读生','住校生'])+'</select></div>';
  g+='</div><div><label class="f-label" for="fSleep">平时晚上上床睡觉时间</label>'+
    '<select class="f-input" id="fSleep">'+opts(cfg.sleep)+'</select></div>';
  els.formFields.innerHTML=g;
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  var grade=$('#fGrade'),sleep=$('#fSleep');
  if(!grade.value){toast('请选择年级');return}
  if(!sleep.value){toast('请选择平时上床时间');return}
  if(cfg.board&&!$('#fBoard').value){toast('请选择就读方式');return}
  user={name:($('#fName').value||'').trim(),grade:grade.value,sleep:sleep.value,
        board:cfg.board?$('#fBoard').value:''};
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
  els.dimText.textContent=DIM_NAMES[q.d];
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

/* ================= 计分与报告 ================= */
function compute(){
  var per={},cnt={};
  flat.forEach(function(q,i){
    per[q.d]=(per[q.d]||0)+(3-answers[i]);
    cnt[q.d]=(cnt[q.d]||0)+1;
  });
  var dims=ORD.map(function(k){
    var pct=Math.round((per[k]||0)/(cnt[k]*3)*100);
    return{k:k,name:DIM_NAMES[k],pct:pct,lv:pct>=75?'good':pct>=50?'ok':'low'};
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
  els.resultTitle.textContent=user.name?'「'+user.name+'」的睡眠画像':'睡眠质量画像';
  els.resultSub.textContent=user.grade+(user.board?' · '+user.board:'')+' · 约 '+user.sleep+' 上床';

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
  els.pfStats.innerHTML='五个维度中：<b class="sg">'+cnt.good+'</b> 个良好 · <b class="sy">'+cnt.ok+
    '</b> 个尚可 · <b class="sr">'+cnt.low+'</b> 个需关注';

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
      '<p class="dim-desc">'+cfg.descr[d.k][DK[d.lv]]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  var weak=res.dims.filter(function(d){return d.lv!=='good'})
    .sort(function(a,b){return a.pct-b.pct}).slice(0,2);
  els.adviceList.innerHTML='';
  if(weak.length){
    var m=0;
    weak.forEach(function(d){
      cfg.sug[d.k].slice(0,2).forEach(function(s){
        var el=document.createElement('div');
        el.className='advice-item';
        el.style.animationDelay=(0.2+m*0.08)+'s';
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
  clearTimeout(timer);
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
     !confirm('确定退出本次观察吗？当前作答不会被保存。')){
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
