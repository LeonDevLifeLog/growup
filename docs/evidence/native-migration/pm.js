
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};

/* ================= 配置 ================= */
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）

/* ================= 图标 ================= */
var ICONS={
duration:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
content:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
control:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
dependency:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
boundary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>'};

/* ================= 维度名 ================= */
var DIM_NAMES={
primary:{duration:'使用时长',content:'内容偏好',control:'自控能力',dependency:'依赖程度',boundary:'场景边界'},
teen:{duration:'使用时长',content:'内容与社交',control:'自控与规则',dependency:'心理依赖',boundary:'场景与边界'}};

/* ================= 小学题库（选项按分值 3→0 降序） ================= */
var Q_PRIMARY=[
{d:'duration',t:'工作日（周一到周五），孩子每天使用电子产品的总时间大约是？',h:'包括看电视、玩手机、平板等',o:['30分钟以内','30-60分钟','1-2小时','超过2小时']},
{d:'duration',t:'周末或节假日，孩子单日的屏幕时间通常是？',h:'观察无约束状态下的时长',o:['1小时以内','1-2小时','2-4小时','几乎整天都挂着屏幕']},
{d:'duration',t:'孩子是否经常因为玩电子产品而推迟睡觉时间？',h:'作息影响',o:['从不，到点就交','偶尔，提醒后能去睡','经常，总要催促多次','每天都因为屏幕熬夜']},
{d:'content',t:'孩子平时在电子产品上看得最多的是什么内容？',h:'内容消费倾向',o:['科普教育、纪录片或优质动画片','普通的娱乐动画片或益智游戏','短视频平台的搞笑视频','含有打斗、惊悚或成人元素的游戏/直播']},
{d:'content',t:'您是否清楚并筛选过孩子常看的视频和常玩的游戏？',h:'家长把关程度',o:['非常清楚，会提前筛选并陪伴观看','知道他在看什么，但没仔细甄别内容','只管他别看太久了，不管内容是什么','完全不知道他在看什么/玩什么']},
{d:'content',t:'孩子是否会模仿短视频里的网络烂梗，或游戏里的粗俗用语？',h:'内容影响行为',o:['从未出现过','偶尔说一两次，纠正后不再说','经常挂在嘴边，觉得这样很酷','不仅说，还会做危险或极不雅的动作']},
{d:'control',t:'当约定的使用时间到了时，孩子的反应通常是？',h:'规则意识与情绪',o:['主动关掉，无需提醒','需要提醒，但能遵守约定关掉','讨价还价“再玩最后五分钟”','拒绝关掉，强行没收会大闹一场']},
{d:'control',t:'如果孩子正在打游戏/看视频到了精彩处，您让他暂停，他能做到吗？',h:'延迟满足能力',o:['能立刻暂停，去做该做的事','稍有不情愿，但能放下','很难停下来，会发脾气','完全沉浸，听不见大人说话']},
{d:'control',t:'孩子是否会为了偷偷多玩一会儿而撒谎（如假装上厕所带手机）？',h:'诚信与规则博弈',o:['从不撒谎，遵守规矩','偶尔试探底线，被识破后承认','经常找借口偷偷玩','谎话连篇，甚至偷拿大人的设备']},
{d:'dependency',t:'当不带电子产品出门（如去公园、串门）时，孩子的表现是？',h:'脱机状态适应性',o:['玩得很开心，完全不惦记屏幕','偶尔觉得无聊，但能找到别的事做','频繁抱怨好无聊，想回家看手机','焦躁不安，甚至哭闹要求玩手机']},
{d:'dependency',t:'当孩子感到无聊、失落或生气时，他首选的安抚方式是？',h:'情绪依赖度',o:['找大人抱抱、聊天或找玩具','吃东西或听音乐','要求看动画片或玩游戏','只有给屏幕才能立刻止哭/安静']},
{d:'dependency',t:'孩子与同龄人聚会时，他们的互动方式通常是？',h:'社交影响',o:['一起跑跳玩耍、做游戏','有时玩实体玩具，有时交流动画片','经常围着一个屏幕各玩各的','几乎没有现实互动，只各自低头看手机']},
{d:'boundary',t:'吃饭时，孩子是否会要求边看屏幕边吃饭？',h:'餐桌边界',o:['从不，专心吃饭','偶尔提出，被拒绝后能接受','经常要求，不给就不吃或吃得极慢','已经养成习惯，每顿饭必须配屏幕']},
{d:'boundary',t:'在商场、餐厅等公共场合，孩子一闹脾气，您的处理方式通常是？',h:'安抚策略',o:['冷处理或讲道理，转移注意力','偶尔为了面子给手机看一会儿','经常用手机当“哄娃神器”','只要给手机就不闹，成了唯一手段']},
{d:'boundary',t:'睡前一小时，孩子的状态通常是？',h:'睡前边界',o:['看纸质书、听故事或聊天','偶尔看一会儿电视，睡前收起','经常在床上玩手机/平板','必须抱着手机/平板睡着']}
];

/* ================= 中学共享题库（初中/高中通用） ================= */
var Q_TEEN=[
{d:'duration',t:'',h:'包括手机、平板、电脑等娱乐时间',o:['1小时以内','1-2小时','2-4小时','超过4小时，几乎除了睡觉都在看']}, /* 第 1 题按版本覆写 */
{d:'duration',t:'周末或节假日，孩子单日的屏幕时间通常是？',h:'观察无约束状态下的时长',o:['2小时以内','2-4小时','4-6小时','超过6小时，连饭都要端到电脑前吃']},
{d:'duration',t:'孩子是否经常因为玩手机/电脑而推迟睡觉时间？',h:'作息影响',o:['从不，到点就交设备','偶尔，提醒后能去睡','经常，总要催促多次','每天都因为屏幕熬夜到凌晨']},
{d:'content',t:'孩子平时在电子产品上花时间最多的是？',h:'内容消费倾向',o:['查阅学习资料、看纪录片或益智内容','看普通的娱乐视频或玩单机休闲游戏','高强度竞技游戏（如王者荣耀、吃鸡）','刷短视频、看直播或在社交软件闲聊']},
{d:'content',t:'数字产品在孩子同龄人社交中的作用是？',h:'社交同侪压力',o:['偶尔交流热门话题，不影响现实友谊','需要共同的游戏话题才能融入圈子','大部分社交在线上进行，现实交流变少','因为网络言论或游戏纠纷与同学产生矛盾']},
{d:'content',t:'孩子是否接触过不良网络内容（如软色情、暴力、赌博或网络暴力）？',h:'网络风险暴露',o:['从未发现，有安全过滤机制','偶尔无意弹窗看到，会主动关掉','和同学偷偷分享过不良网址或梗','沉迷于此类内容，甚至参与网络骂战']},
{d:'control',t:'当约定的使用时间到了时，孩子的反应通常是？',h:'规则意识与情绪',o:['主动关掉，无需提醒','需要提醒，但能遵守约定关掉','讨价还价“打完这局”，经常超时','拒绝关掉，强行没收会大发脾气甚至砸东西']},
{d:'control',t:'孩子写作业或晚自习时，是否会偷偷分心使用电子产品？',h:'专注力与违规',o:['从不，作业时设备放客厅或关机','偶尔查资料时顺手看眼消息','经常借口查题，实际在聊天或搜答案','作业边写边玩，一小时只写几个字']},
{d:'control',t:'如果发现孩子违规使用手机，您没收设备后的结果是？',h:'亲子权力博弈',o:['孩子能接受后果，第二天正常沟通','冷战半天，之后能和好','激烈抗议，拒绝吃饭或沟通','离家出走、锁门反锁等极端对抗行为']},
{d:'dependency',t:'当不带电子产品出门（如去公园、串门、旅游）时，孩子的表现是？',h:'脱机状态适应性',o:['能享受现实生活，完全不惦记屏幕','偶尔觉得无聊，想看眼手机','频繁抱怨好无聊，一直催促回家','焦躁不安，脾气暴躁，甚至哭闹']},
{d:'dependency',t:'当孩子感到学业压力大或被批评后，他首选的解压方式是？',h:'情绪应对机制',o:['运动、听音乐或找家人朋友倾诉','睡觉或吃东西','躲进房间疯狂打游戏或刷视频','只有在虚拟世界才能找到成就感，拒绝现实交流']},
{d:'dependency',t:'孩子是否有“报复性熬夜”现象（写完作业已很晚，仍强撑着玩手机不肯睡）？',h:'心理代偿机制',o:['没有，困了就顺势去睡','偶尔（周末），会多玩半小时','经常如此，哪怕很困也要在被窝里刷手机','每晚都强撑熬夜，不到凌晨不睡']},
{d:'boundary',t:'在餐桌上或家庭聚餐时，孩子是否会一直盯着手机？',h:'现实社交边界',o:['从不，专心吃饭并与家人交流','偶尔看一眼消息，被提醒能放下','经常边吃边看，不理会家人','完全沉浸，一顿饭全程离不开屏幕']},
{d:'boundary',t:'在禁止使用手机的场合（如课堂、自习、就寝后），孩子的表现是？',h:'纪律与规则底线',o:['严格遵守纪律，从不违规','偶尔偷偷看眼时间或回消息','经常被老师/宿管发现在桌兜或被窝里玩','因违规使用多次被没收设备或受处分']},
{d:'boundary',t:'睡前一小时，孩子的状态通常是？',h:'睡前物理边界',o:['看闲书、听音乐或准备第二天的东西','偶尔看会儿手机，睡前主动放下','经常在床上玩游戏/刷视频到很晚','必须抱着手机/平板睡着，设备从不离床']}
];
var Q1_TEEN={
middle:{t:'工作日（周一到周五），孩子每天使用电子产品的总时间大约是？'},
high:{t:'工作日（周一到周五），孩子每天使用电子产品（纯娱乐非学习）的总时间大约是？'}};

/* ================= 维度分析文案 ================= */
var DESCR={
primary:{
duration:{high:'孩子的屏幕时间控制得非常理想，留出了充足的时间用于户外运动、阅读和睡眠。这为保护视力和大脑发育提供了最好的保障。',
 medium:'屏幕时间基本在可控范围内，但周末或假期可能存在超标的情况。建议设立明确的时间沙漏，帮助孩子建立时间概念。',
 low:'屏幕时间严重超标，已经挤占了睡眠和运动时间。长期如此不仅影响视力，更会导致注意力涣散。必须强制削减。'},
content:{high:'孩子接触的内容健康优质，您也深度参与了内容的筛选与陪伴。屏幕不仅是娱乐工具，更成为了拓宽认知的窗口。',
 medium:'内容以普通娱乐为主，偶尔会接触短视频平台。由于算法推荐的存在，建议开启青少年模式，并增加优质纪录片的输入。',
 low:'内容处于失控状态，充斥着短视频烂梗或不适宜的游戏。这些高刺激低营养的内容会破坏孩子的审美与价值观。建议立即启用家长控制，切断不良内容源。'},
control:{high:'孩子具备极好的规则意识和自控力，能主动遵守约定。这说明您在日常教育中注重契约精神的培养，而非简单的强权压制。',
 medium:'基本能遵守规则，但在精彩内容面前难以自控。建议在游戏或视频开始前设定明确的结束节点（如“这集播完”），避免突兀打断。',
 low:'自控力薄弱，离开屏幕伴随激烈情绪反应。这是典型的屏幕成瘾前兆。建议不要再用“没收”引发冲突，而是建立“代币机制”，通过赚取屏幕时间来培养自律。'},
dependency:{high:'电子产品只是孩子生活中的调味品，而非必需品。他在脱离屏幕的现实世界中能找到丰富的乐趣，具备强大的现实感知力。',
 medium:'偶尔会喊无聊，对电子产品有一定眷恋。建议丰富家庭的实体玩具和绘本库存，多带孩子进行户外探索，降低对数字娱乐的心理依赖。',
 low:'孩子对电子产品产生了重度心理依赖，现实感薄弱。屏幕已成为唯一的安抚奶嘴。建议全家实施“数字排毒”，用高质量的陪伴填补脱机初期的空虚。'},
boundary:{high:'家庭建立了清晰的屏幕使用边界，餐桌、睡前、聚会等场景完全去电子化。这保护了孩子的消化系统、睡眠节律和社交能力。',
 medium:'部分场景边界模糊，偶尔会用手机安抚孩子。建议坚守底线，特别是在餐桌和睡前这两个关键场景，绝不妥协。',
 low:'屏幕已经入侵了生活的所有场景。边吃边看影响消化，睡前看屏抑制褪黑素分泌。建议立刻划定“无屏区”（如餐厅和卧室），并严格执行。'}},
teen:{
duration:{high:'孩子的屏幕时间控制得非常理想，留出了充足的时间用于睡眠、学业和现实社交。这为保护视力和维持稳定的情绪提供了最好的保障。',
 medium:'屏幕时间基本在可控范围内，但周末或假期可能存在超标的情况。建议与孩子协商制定一份“屏幕时间契约”，培养其自主管理能力。',
 low:''}, /* 按版本覆写 */
content:{high:'孩子接触的内容健康优质，网络社交也是现实友谊的良性延伸。您与孩子保持了开放的沟通，他能主动与您分享网络见闻。',
 medium:'内容以普通娱乐和竞技游戏为主，这虽然是青春期社交的常见需求，但需警惕算法推荐带来的信息茧房。建议多引导孩子关注科技、人文等广度内容。',
 low:'内容处于失控状态，充斥着短视频碎片或不良信息。高刺激的短视频正在破坏他的深度思考能力。建议立即启用青少年模式，并与孩子深入探讨网络内容的虚假与极端性。'},
control:{high:'孩子具备较强的规则意识和自控力，能主动遵守约定。这说明您在日常教育中注重平等协商，而非简单的强权压制，赢得了孩子的配合。',
 medium:'基本能遵守规则，但在游戏胜负欲面前难以自控。建议在游戏开始前设定明确的结束节点（如“打完这局”），避免突兀打断引发情绪爆发。',
 low:'自控力薄弱，离开屏幕伴随激烈情绪反应，甚至出现极端对抗。这是典型的屏幕成瘾症状。建议不要用暴力没收引发悲剧，应寻求专业心理干预，并重建亲子信任。'},
dependency:{high:'电子产品只是孩子生活中的工具和调剂品。他在现实世界中有其他兴趣爱好和成就感来源，具备强大的现实感知力。',
 medium:'对电子产品有一定眷恋，偶尔会用手机缓解压力。建议丰富孩子的现实生活，培养一项热爱的体育运动或艺术特长，转移注意力。',
 low:'孩子对电子产品产生了重度心理依赖，将其作为逃避学业压力的唯一避风港。建议深入了解孩子在现实中遇到了什么挫折，先解开心结，再谈断网。'},
boundary:{high:'家庭和学校建立了清晰的屏幕使用边界，餐桌、睡前、课堂等场景完全去电子化。这保护了孩子的消化系统、睡眠节律和课堂专注力。',
 medium:'部分场景边界模糊，偶尔会在餐桌上或被窝里偷玩。建议坚守底线，特别是在睡前一小时，严禁设备进卧室，大人也要带头遵守。',
 low:'屏幕已经入侵了生活的所有场景，不仅破坏规矩，还引发了多起违纪事件。建议立刻划定“无屏区”，并严格执行违规后果，绝不妥协。'}}};
var DUR_LOW_TEEN={
middle:'屏幕时间严重超标，已经挤占了睡眠和运动时间。初中生自控力尚弱，长期超时会导致多巴胺分泌紊乱，注意力涣散。必须采取技术手段（如路由器限速）进行强制干预。',
high:'屏幕时间严重超标，已经挤占了睡眠和运动时间。高中生虽自控力有所增强，但面对高考压力易产生补偿心理，长期超时会导致注意力涣散。必须采取技术手段（如断网）进行强制干预。'};

/* ================= 行动建议 ================= */
var SUG={
primary:{duration:'使用实体计时器或沙漏，让时间可视化。时间一到，立刻收走设备',
 content:'开启各大视频/社交 App 的青少年模式，锁定优质内容池',
 control:'在开始观看前约定结束的标志（如“这一集结束”），而非单纯约定时间',
 dependency:'在客厅设置一个“手机停车场”，回家后全家把手机放在那里',
 boundary:'设立严格的“餐桌无屏”和“卧室无屏”规矩，大人也要带头遵守'},
teen:{duration:'与孩子协商签订《屏幕时间契约》，工作日每天不超过 1 小时，违规有明确后果',
 content:'主动了解孩子常玩的游戏，以请教的姿态进入他的数字世界，避免一上来就批判',
 control:'在游戏开始前约定明确的结束标志（如“打完这局”），而非单纯约定时间',
 dependency:'丰富现实生活：鼓励孩子培养一项需要出汗的体育运动或实体爱好',
 boundary:'设立严格的“卧室无屏”规矩，设备晚上统一在客厅充电，大人带头遵守'}};

/* ================= 版本配置 ================= */
var CFG={
primary:{k:'primary',tag:'6–12岁 · 小学阶段',lead:'小学阶段是习惯养成的黄金窗口。这一版的观察聚焦规则意识与内容把关：刷牙……不，是刷牙之外的另一场“习惯战役”——按时交设备、看什么内容、餐桌和睡前有没有屏幕。答案没有对错，如实观察就好。',
 title:'孩子基本信息',nameLabel:'孩子昵称',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],boarding:false,devices:['手机/平板','电视/投影','游戏机','电脑']},
middle:{k:'teen',tag:'12–15岁 · 初中阶段',lead:'初中阶段，电子产品往往是社交的硬通货和压力的避风港，强行没收极易引发激烈冲突。这一版的观察聚焦自控力与心理韧性，帮助您发现潜在的沉迷风险，学习从“管理者”转变为“引导者”。',
 title:'学生基本信息',nameLabel:'学生昵称',grades:['初一','初二','初三'],boarding:true,devices:['智能手机','平板电脑','电脑/笔记本','游戏机']},
high:{k:'teen',tag:'15–18岁 · 高中阶段',lead:'高中阶段，手机几乎成了身体的延伸，既是社交刚需，也是释放高考压力的出口，强行剥夺极易引发剧烈冲突。这一版的观察聚焦自我管理与压力疏导，帮助您识别潜在的成瘾风险，从“管理者”转变为“契约协商者”。',
 title:'学生基本信息',nameLabel:'学生昵称',grades:['高一','高二','高三'],boarding:true,devices:['智能手机','平板电脑','电脑/笔记本','游戏机']}};

/* ================= 评语文案 ================= */
var VERDICTS=[
[85,'孩子的屏幕使用习惯整体<span class="hl">健康且自律</span>。时长可控、内容优质、边界清晰，说明家庭中已经建立了良好的规则与信任。接下来只需保持，并随学业阶段的变化弹性调整约定即可。'],
[70,'整体状况<span class="hl">基本健康</span>，但个别维度已出现松动——可能是周末时长、睡前边界或内容把关。趁习惯尚未固化，现在正是微调约定的最佳时机，分项地图中标出了值得留意的地方。'],
[50,'孩子的屏幕使用已<span class="hl">出现失衡迹象</span>：部分场景的边界被突破，或屏幕正在挤占睡眠与运动。先不要急着“一刀切”没收，建议从分项地图中最薄弱的一两个维度入手，与孩子重新协商规则。'],
[0,'当前状态<span class="hl">风险较高</span>，屏幕可能已对孩子的生活形成明显侵蚀，亲子之间也容易因此爆发冲突。建议暂缓强硬对抗，先修复沟通渠道；必要时欢迎联系我们，或寻求专业心理支持。']];
var PARENT={
good:'你们已经建立了健康的屏幕规则与信任关系。接下来只需保持弹性：随孩子学业阶段的变化，定期和他一起重新协商约定，让规则始终“长得像他自己的选择”。',
ok:'规则的框架在了，但执行中还留着缝隙。建议把“没收—对抗”换成“约定—复盘”：每周找一个轻松的时刻，和孩子一起看看本周的执行情况，让他参与规则的修订，而不是单方面接受。',
low:'屏幕之争可能已经消耗了不少亲子信任。这个阶段，先修复关系比执行规则更重要：暂停强硬没收，从孩子感兴趣的数字内容聊起，先听他说，再谈约定；必要时欢迎联系我们获取专业支持。'};
var LVL={good:'状态良好',ok:'有待改善',low:'重点关注'};
var DK={good:'high',ok:'medium',low:'low'};
var KEEP_ADVICE='目前的习惯运转良好，无需新增限制。可以每学期和孩子一起复盘一次约定，随学业节奏弹性调整。';

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),report:$('#page-report'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formLead:$('#formLead'),formTitle:$('#formTitle'),formFields:$('#formFields'),
  ring:$('#ringFg'),totalScore:$('#totalScore'),resultTitle:$('#resultTitle'),verdictText:$('#verdictText'),
  dimList:$('#dimList'),adviceList:$('#adviceList'),parentAdvice:$('#parentAdvice'),
  ageCards:$('#ageCards'),backBtn:$('#backBtn')
};
var ver='',set=null,flat=[],answers=[],idx=0,stage='landing',user={},timer=null,pushed=false;

function buzz(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function shallow(o){var r={};for(var k in o)r[k]=o[k];return r}
function opts(a){return a.map(function(t){return '<option>'+t+'</option>'}).join('')}

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

/* ================= 数据集组装（合并中学共享数据） ================= */
function buildSet(v){
  var c=CFG[v],teen=c.k==='teen';
  var qs=(teen?Q_TEEN:Q_PRIMARY).slice();
  if(teen){qs[0]={d:'duration',t:Q1_TEEN[v].t,h:Q_TEEN[0].h,o:Q_TEEN[0].o}}
  var descr=teen?shallow(DESCR.teen):DESCR.primary;
  if(teen){descr.duration={high:DESCR.teen.duration.high,medium:DESCR.teen.duration.medium,low:DUR_LOW_TEEN[v]}}
  return{c:c,qs:qs,descr:descr,sug:SUG[c.k],names:DIM_NAMES[c.k]};
}

/* ================= 流程：选年龄 → 表单 → 问卷 ================= */
function pickAge(v){
  ver=v;set=buildSet(v);user={};
  var c=set.c;
  els.formTag.textContent=c.tag;
  els.formLead.textContent=c.lead;
  els.formTitle.textContent=c.title;
  var g='<div><label class="f-label" for="fName">'+c.nameLabel+'（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>'+
    '<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(c.grades)+'</select></div>';
  if(c.boarding)g+='<div><label class="f-label" for="fBoard">就读方式</label><select class="f-input" id="fBoard">'+opts(['走读生','住校生'])+'</select></div>';
  g+='<div><label class="f-label" for="fDevice">平时接触最多的设备</label><select class="f-input" id="fDevice">'+opts(c.devices)+'</select></div>';
  els.formFields.innerHTML=g;
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  var n=$('#fName');
  user={name:n?n.value.trim():'',grade:$('#fGrade').value,device:$('#fDevice').value,
        board:$('#fBoard')?$('#fBoard').value:''};
  flat=set.qs;
  answers=flat.map(function(){return -1});
  idx=0;
  els.qTotal.textContent=flat.length;
  showStage('quiz');
  renderQ(1);
}

/* ================= 问卷渲染 ================= */
function renderQ(dir){
  var q=flat[idx];
  els.dimText.textContent=set.names[q.d];
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
  var dims=Object.keys(set.names).map(function(k){
    var pct=Math.round((per[k]||0)/(cnt[k]*3)*100);
    return{k:k,name:set.names[k],pct:pct,lv:pct>=75?'good':pct>=50?'ok':'low'};
  });
  var total=Math.round(dims.reduce(function(s,d){return s+d.pct},0)/dims.length);
  return{dims:dims,total:total,g:total>=70?'good':total>=50?'ok':'low'};
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
  var who=user.name?'「'+user.name+'」':'';
  els.resultTitle.textContent=who+'的屏幕使用画像';

  var col=res.g==='good'?'var(--olive)':res.g==='ok'?'#C99432':'var(--terra)';
  var numCol=res.g==='ok'?'#9A6B14':col;
  els.ring.style.transition='none';
  els.ring.style.strokeDashoffset=C;
  els.ring.style.stroke=col;
  els.totalScore.style.color=numCol;
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
  var vd=VERDICTS.find(function(v){return res.total>=v[0]});
  els.verdictText.innerHTML=vd[1];

  els.dimList.innerHTML='';
  var k=0;
  res.dims.forEach(function(d){
    var card=document.createElement('div');
    card.className='dim-card lv-'+d.lv;
    card.style.animationDelay=(0.12+k*0.09)+'s';
    card.innerHTML=
      '<div class="dim-head">'+
        '<div class="dim-name">'+ICONS[d.k]+d.name+'<span class="dim-level lvl-'+d.lv+'">'+LVL[d.lv]+'</span></div>'+
        '<div class="dim-score"><b>'+d.pct+'</b> /100</div>'+
      '</div>'+
      '<div class="dim-mini-bar"><i style="--p:'+(d.pct/100).toFixed(3)+';animation-delay:'+(0.35+k*0.09)+'s"></i></div>'+
      '<p class="dim-desc">'+set.descr[d.k][DK[d.lv]]+'</p>';
    els.dimList.appendChild(card);
    k++;
  });

  var weak=res.dims.filter(function(d){return d.lv!=='good'})
    .sort(function(a,b){return a.pct-b.pct}).slice(0,3);
  els.adviceList.innerHTML='';
  if(weak.length){
    var m=0;
    weak.forEach(function(d){
      var el=document.createElement('div');
      el.className='advice-item';
      el.style.animationDelay=(0.2+m*0.08)+'s';
      el.innerHTML='<span class="a-tag">'+d.name+'</span><div class="d">'+set.sug[d.k]+'</div>';
      els.adviceList.appendChild(el);
      m++;
    });
  }else{
    els.adviceList.innerHTML='<div class="advice-item" style="animation-delay:.2s"><span class="a-tag">保持</span><div class="d">'+KEEP_ADVICE+'</div></div>';
  }
  els.parentAdvice.textContent=PARENT[res.g];
}

function finish(){
  clearTimeout(timer);
  renderReport(compute());
  showStage('report');
}

/* ================= 事件 ================= */
/* 首页维度图标注入 */
Array.prototype.forEach.call(document.querySelectorAll('.dp-ico'),function(el){
  el.innerHTML=ICONS[el.dataset.ico];
});

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
 $('#startBtn').addEventListener('click',function(){startQuiz()});
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
