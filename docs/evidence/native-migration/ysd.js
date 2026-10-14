
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var AUTO_NEXT=true, AUTO_DELAY=380;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var C=553; // 评分环周长（r=88）

/* ================= 图标 ================= */
var IC={
structure:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9 0 6-1 16-2 16z"/><path d="M13 20a7 7 0 0 0 7-7c0-5-4-9-9-9 0 6 1 16 2 16z"/></svg>',
snack:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1.2 12a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z"/><path d="M14 8l1-4"/></svg>',
takeout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/></svg>',
weight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 13l3.5-3.5"/><path d="M9 3h6"/></svg>',
habit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v6a3 3 0 0 0 6 0V3"/><path d="M8 9v12"/><path d="M17 3v18"/></svg>'};
var DIM_NAMES={structure:'饮食结构',snack:'零食饮料',takeout:'外卖宵夜',weight:'体重认知',habit:'就餐习惯'};
var ORD=['structure','snack','takeout','weight','habit'];

/* ================= 小学题库（选项分值 3→0 降序） ================= */
var Q_PRIMARY=[
{d:'structure',h:'膳食纤维与维生素来源',t:'孩子日常三餐中，蔬菜（特别是绿叶菜）的摄入情况是？',o:['每餐都吃，种类丰富','每天吃一顿，只吃特定几种','很少吃，挑食严重','几乎不吃蔬菜']},
{d:'structure',h:'开启一天新陈代谢的关键',t:'孩子的早餐通常包含哪些食物？',o:['碳水+蛋白质+果蔬（如包子+鸡蛋+牛奶）','仅碳水或仅蛋白质（如光吃面包/光喝奶）','经常吃油条、饼干等深加工食品','经常不吃早餐去上学']},
{d:'structure',h:'B族维生素与膳食纤维',t:'孩子每周吃粗粮（如玉米、红薯、燕麦）的频率是？',o:['每周3次以上','每周1-2次','偶尔吃一次','几乎只吃精白米面']},
{d:'snack',h:'隐形热量炸弹',t:'孩子平时吃零食（薯片、辣条、糖果等深加工食品）的频率是？',o:['很少吃，零食主要是坚果/酸奶/水果','每周吃1-2次解馋','每天都要吃一点','经常当饭吃，不离手']},
{d:'snack',h:'液体热量最易被忽视',t:'孩子平时喝什么水？',o:['以白开水为主，偶尔喝纯牛奶','偶尔喝100%果汁或无糖茶','经常喝含糖饮料或乳酸菌饮料','把奶茶/可乐当水喝，不喝白水']},
{d:'snack',h:'夜间肠胃负担',t:'孩子睡前是否有吃东西的习惯？',o:['睡前2小时不进食','偶尔喝点温牛奶','经常吃宵夜或甜食','每天睡前必须吃零食才睡']},
{d:'takeout',h:'重油重盐环境暴露',t:'您家每周点外卖或去外面餐厅吃饭（快餐、烧烤等）的频率是？',o:['极少，基本都在家做','每周1次','每周2-3次','几乎天天吃外卖/外食']},
{d:'takeout',h:'外食品类选择',t:'如果外出就餐，孩子通常会点什么？',o:['清蒸/炖煮肉类和炒青菜','常规炒菜，荤素搭配','炸鸡、汉堡、披萨等快餐','重口味烧烤、火锅且只吃肉不吃菜']},
{d:'takeout',h:'食品安全与高脂摄入',t:'学校门口常有路边摊（烤肠、炸串等），孩子是否会买？',o:['从不买，知道不健康','偶尔馋了买一次','每周都会买几次','每天放学必买，成了习惯']},
{d:'weight',h:'生长曲线监测',t:'与半年前相比，孩子的体重变化趋势是？',o:['稳步增长，与身高匹配','体重增长过快（明显发胖）','体重几乎不长或极度偏瘦','忽胖忽瘦，极度不规律']},
{d:'weight',h:'大脑饱腹中枢反馈',t:'孩子吃饭时的「饱腹感」感知如何？',o:['吃饱了就主动停筷','有时需要大人提醒别吃撑','遇到爱吃的经常吃到撑','不知饥饱，常暴饮暴食']},
{d:'weight',h:'身体意象与心理认知',t:'孩子是否经常抱怨自己「胖」，或表现出对体重的过度焦虑？',o:['从不，对身体很自信','偶尔开玩笑说自己胖','经常抱怨，试图节食减肥','极度焦虑，因体型产生自卑']},
{d:'habit',h:'进食速度与消化',t:'孩子吃一顿正餐通常需要多长时间？',o:['15-25分钟，细嚼慢咽','10-15分钟，正常速度','10分钟以内，狼吞虎咽','超过40分钟，含在嘴里不下咽']},
{d:'habit',h:'分心进食导致过量',t:'吃饭时，孩子是否会边吃边看电视/手机/平板？',o:['从不，专心吃饭','偶尔看一眼，基本专注','经常边看边吃','必须看屏幕才肯吃饭']},
{d:'habit',h:'餐桌情绪与强迫进食',t:'如果孩子不好好吃饭，您的处理方式通常是？',o:['随他去，下顿饿了自然吃','稍微劝几句，不吃就算了','追着喂，或者威逼利诱吃完','经常在餐桌上训斥孩子，边哭边吃']}];

/* ================= 中学共享题库（初中为底；高中按索引覆写差异题） ================= */
var Q_TEEN=[
{d:'structure',h:'开启一天新陈代谢的关键',t:'在早晨上学前，孩子吃早餐的情况是？',o:['每天吃，有碳水有蛋白质（如包子+鸡蛋+牛奶）','每天吃，但经常随便对付（只吃面包或光喝奶）','偶尔不吃，经常饿着肚子去上学','几乎从不吃早餐，习惯成自然']},
{d:'structure',h:'膳食纤维与维生素来源',t:'孩子正餐中蔬菜（特别是绿叶菜）的摄入情况是？',o:['每餐都吃，种类丰富','每天吃一顿，只挑特定几种','很少吃，挑食严重','几乎只吃肉和主食']},
{d:'structure',h:'钙质与B族维生素补充',t:'孩子每周喝纯牛奶/酸奶和吃粗粮（玉米、红薯等）的频率？',o:['每天喝奶，每周吃3次以上粗粮','每周喝几次奶，偶尔吃粗粮','偶尔喝奶，基本只吃精白米面','几乎不碰奶制品和粗粮']},
{d:'snack',h:'高糖与咖啡因摄入',t:'孩子喝奶茶、咖啡或功能饮料（如红牛）的频率是？',o:['几乎不喝，主要喝白水','偶尔喝（每月1-2次）','每周喝几次，作为提神或解馋','几乎每天一杯，甚至当水喝']},
{d:'snack',h:'压力性进食',t:'孩子在写作业或晚自习时，吃深加工零食（薯片、辣条等）的频率？',o:['很少吃，零食多为坚果/水果','偶尔解馋吃一点','经常边学边吃','每天必吃，不离手']},
{d:'snack',h:'水分补充来源',t:'孩子平时的饮水习惯是？',o:['以白开水为主，每天1.5L以上','喝白水，但量不够','经常用饮料或汤代替水','几乎不喝白水，只喝甜饮料']},
{d:'takeout',h:'夜间肠胃负担',t:'孩子晚自习后或睡前吃宵夜的频率是？',o:['从不吃，睡前禁食','偶尔饿了吃点水果/牛奶','经常吃泡面/烧烤等重口味','每晚必吃，不吃睡不着']},
{d:'takeout',h:'重油重盐暴露',t:'周末或假期，孩子点外卖的频率和品类通常是？',o:['极少点，家里做饭为主','偶尔点，选清淡中餐','经常点炸鸡、奶茶等高热量','几乎天天点外卖']},
{d:'takeout',h:'食品安全与高脂摄入',t:'对于学校门口的路边摊（烤肠、炸串等），孩子的态度是？',o:['从不买，知道不健康','偶尔馋了买一次','每周都会买几次','放学必买，已成习惯']},
{d:'weight',h:'生长曲线监测',t:'与半年前相比，孩子的体重变化趋势是？',o:['稳步增长，与身高匹配','体重增长过快（明显发胖）','体重几乎不长或极度偏瘦','忽胖忽瘦，极度不规律']},
{d:'weight',h:'容貌焦虑与进食障碍',t:'孩子是否对自己的体型过度焦虑，甚至采取极端节食？',o:['从不，对身体很自信','偶尔抱怨自己胖，但行为正常','经常节食或不吃晚饭','极度焦虑，催吐或暴食交替']},
{d:'weight',h:'情绪化进食',t:'当孩子学业压力大或心情不好时，饮食行为有何变化？',o:['没有影响，饮食规律','食欲稍微下降或增加','狂吃零食发泄，或绝食抗议','经常暴饮暴食或情绪性厌食']},
{d:'habit',h:'进食速度与消化',t:'孩子吃一顿正餐通常需要多长时间？',o:['15-25分钟，细嚼慢咽','10-15分钟，正常速度','不到10分钟，狼吞虎咽','超过40分钟，含着不下咽']},
{d:'habit',h:'分心进食导致过量',t:'吃饭时，孩子是否会边吃边玩手机/看视频？',o:['从不，专心吃饭','偶尔看一眼，基本专注','经常边看边吃','必须看手机才肯吃饭']},
{d:'habit',h:'食物可获得性',t:'家里或宿舍囤积零食的情况？',o:['基本不囤，现做现吃','只囤少量健康零食','抽屉里塞满饼干泡面','床头柜就是个「小卖部」']}];

/* 高中版覆写（索引 → 差异题） */
var SENIOR_OV={
0:{t:'孩子早晨上学前，吃早餐的情况是？',o:['每天规律吃，有碳水有蛋白质','经常随便对付（如只吃面包或饼干）','经常因赶时间不吃早餐','几乎从不吃早餐，习惯空腹上课']},
2:{t:'孩子每周喝纯牛奶/豆浆和吃粗粮（玉米、燕麦等）的频率？',o:['每天喝奶/豆浆，每周3次以上粗粮','每周喝几次，偶尔吃粗粮','偶尔喝奶，基本只吃精白米面','几乎不碰奶制品和粗粮']},
3:{t:'孩子喝咖啡、功能饮料（如红牛、魔爪）的频率是？',o:['几乎不喝，主要喝白水','偶尔喝（每月1-2次）','每周喝几次，作为提神','每天必喝，甚至一天几杯']},
4:{o:['很少吃，零食多为坚果/水果','偶尔解馋吃一点','经常边学边吃','每天必吃，靠零食续命']},
5:{o:['以白开水为主，每天1.5L以上','喝白水，但量不够','经常用饮料或咖啡代替水','几乎不喝白水，只喝甜饮/咖啡']},
6:{h:'夜间肠胃与睡眠质量'},
13:{t:'吃饭时，孩子是否会边吃边玩手机/背单词/刷题？',o:['从不，专心吃饭','偶尔看一眼，基本专注','经常边看边吃','必须看着手机/资料才肯吃饭']}};
function buildTeen(senior){
  return Q_TEEN.map(function(q,i){
    var ov=senior?SENIOR_OV[i]:null;
    if(!ov)return q;
    return{d:q.d,h:ov.h||q.h,t:ov.t||q.t,o:ov.o||q.o};
  });
}

/* ================= 维度分析 ================= */
var D_PRIMARY={
structure:{good:'孩子的三餐结构非常合理，营养均衡。丰富的蔬菜和优质蛋白为他的大脑发育和身高增长提供了充足的弹药。',
 ok:'饮食结构基本过得去，但可能存在蔬菜种类单一或粗粮摄入不足的情况。建议增加餐桌上的色彩，多引入几种绿叶菜。',
 low:'饮食结构严重失衡，缺乏必需的维生素和膳食纤维。长期如此不仅影响生长发育，还会导致免疫力低下。必须立即调整食谱，增加蔬菜比例。'},
snack:{good:'孩子对零食的依赖度很低，饮品也非常健康。这极大减少了精制糖和反式脂肪对身体的伤害，保护了代谢系统。',
 ok:'偶尔吃点零食解馋无伤大雅，但需警惕含糖饮料的频率。一杯奶茶的糖分往往超过儿童两天的建议摄入量。建议用水果替代深加工零食。',
 low:'零食和含糖饮料摄入严重超标。高糖不仅导致肥胖，还会引发「胰岛素飙升」，让孩子注意力涣散。建议立刻清空家里的零食柜，用白开水全面替代甜饮料。'},
takeout:{good:'家庭烹饪为主，极少外食。这不仅控制了油盐摄入，还营造了极佳的家庭就餐氛围，为身心健康打下了双重基础。',
 ok:'外食频率适中，但在品类选择上可能偏向口味。建议外出就餐时主动要求少油少盐，并必点一道绿叶青菜。',
 low:'外卖和路边摊频率过高，这是导致儿童期高血脂和脂肪肝的隐形杀手。餐厅的油盐量是家里的3-5倍。建议必须削减外食次数，周末在家做饭。'},
weight:{good:'孩子的体重增长轨迹完美契合身高发育，且具备良好的饱腹感知力。他听从身体的信号进食，这是维持终身健康体重的关键能力。',
 ok:'体重状况基本正常，但偶尔会出现吃撑的情况，或对体型有轻微焦虑。建议引导孩子学会体会「七八分饱」的感觉，不要过度关注数字。',
 low:'体重存在明显问题（超重/过瘦/波动剧烈），且饱腹感知失灵。这极易导致成年后的代谢疾病。建议定期记录身高体重曲线，必要时咨询儿科内分泌医生。'},
habit:{good:'就餐习惯极佳，吃饭专注且速度适中。家庭餐桌没有压力，孩子能愉悦地享受食物，消化吸收效率极高。',
 ok:'就餐习惯有待优化，可能存在吃得太快或边吃边看屏幕的情况。建议设立「餐桌无屏」规矩，每口饭嚼15下再咽。',
 low:'就餐习惯极差，分心进食或被强迫喂食。这会导致大脑无法及时接收饱腹信号，引发厌食或暴食。建议立刻停止追喂和餐桌训斥，把吃饭的自主权还给孩子。'}};

var D_TEEN={
structure:{good:'孩子的三餐结构非常合理，营养均衡。丰富的蔬菜和优质蛋白为大脑发育和身高猛长提供了充足的弹药。',
 ok:'饮食结构基本过得去，但可能存在蔬菜种类单一或早餐敷衍的情况。建议增加餐桌上的色彩，确保每天有一顿高质量的早餐。',
 low:'饮食结构严重失衡，缺乏必需的维生素和蛋白质。长期如此不仅影响身高发育，还会导致免疫力低下。必须立即调整食谱，增加蔬菜和奶制品比例。'},
snack:{good:'孩子对零食饮料的依赖度很低，饮品也非常健康。这极大减少了精制糖和咖啡因对内分泌的干扰，保护了代谢系统和皮肤状态。',
 ok:'偶尔喝点奶茶解馋无伤大雅，但需警惕咖啡因依赖。一杯奶茶的糖分往往超过成人两天的建议摄入量。建议用水果和无糖茶替代深加工零食。',
 low:'零食和含糖饮料摄入严重超标。高糖不仅导致肥胖和长痘，还会引发「胰岛素飙升」，让孩子上课注意力涣散。建议立刻停止购买含糖饮料，用白开水全面替代。'},
takeout:{good:'家庭烹饪为主，极少外食和吃路边摊。这不仅控制了油盐摄入，还营造了极佳的家庭就餐氛围，为身心健康打下了双重基础。',
 ok:'外食和宵夜频率适中，但在品类选择上可能偏向口味。建议晚自习后若饿，以温牛奶或全麦面包替代泡面烧烤。',
 low:'外卖、宵夜和路边摊频率过高，这是导致青春期高血脂和脂肪肝的隐形杀手。夜间进食会加重肠胃负担，严重影响睡眠和生长激素分泌。必须强行削减。'},
weight:{good:'孩子的体重增长轨迹完美契合身高发育，且情绪性进食极少。他能理性看待身体变化，这是维持终身健康体重的关键能力。',
 ok:'体重状况基本正常，但偶尔会出现压力性进食或对外貌的轻微焦虑。建议多关注孩子的情绪状态，不要仅用体重数字评价他。',
 low:'体重存在明显问题，且伴随严重的情绪化进食或容貌焦虑。这极易导致神经性厌食或暴食症。建议立刻停止对体重的唠叨，必要时寻求心理医生帮助。'},
habit:{good:'就餐习惯极佳，吃饭专注且速度适中。家庭餐桌没有压力，孩子能愉悦地享受食物，消化吸收效率极高。',
 ok:'就餐习惯有待优化，可能存在吃得太快或边吃边看手机的情况。建议设立「餐桌无屏」规矩，每口饭嚼15下再咽。',
 low:'就餐习惯极差，分心进食且环境充满诱惑。这会导致大脑无法及时接收饱腹信号，引发胃炎或肥胖。建议立刻清空宿舍的零食库存，专心吃饭。'}};

/* ================= 建议 ================= */
var SUG_PRIMARY={
structure:['每餐一半蔬菜，1/4 优质蛋白，1/4 主食','每周至少 3 次粗粮（玉米/红薯/燕麦）'],
snack:['零食以坚果/水果/酸奶为主，薯片辣条每周最多 1 次','白开水是最好的饮料，含糖饮料尽量不买'],
takeout:['外食每周不超过 1 次，点餐备注少油少盐','放学路上避开小吃摊，带根香蕉垫肚子'],
weight:['定期记录身高体重，关注 BMI 百分位','吃饱即停，不追喂，不强迫'],
habit:['专心吃饭，餐桌不看手机电视','细嚼慢咽，每餐至少 15 分钟']};
var SUG_TEEN={
structure:['早餐必须有碳水+蛋白质（全麦面包+蛋+奶）','每周 3 次粗粮，蔬菜每餐都要有'],
snack:['奶茶/咖啡每周最多 1 次，用白水代替甜饮料','零食选坚果/酸奶/水果，远离薯片辣条'],
takeout:['晚自习后饿就喝牛奶或吃全麦面包，不用泡面烧烤','周末外食选清淡中餐，涮油再吃'],
weight:['关注 BMI 百分位，微胖可能是生长前兆','不节食，七八分饱即可，多运动'],
habit:['专心吃饭，不看手机','每口嚼 15 下，吃够 20 分钟']};

/* ================= 个性化规则（替代原 personalize/extraDesc） ================= */
var PERSONAL=[
{f:function(u){return u.waist==='明显'},dim:'weight',tag:'腰腹提示',d:'腰腹凸出提示中心性肥胖风险：建议实际测量腰围并定期跟踪，控糖控油，增加跑步/游泳等有氧运动'},
{f:function(u){return u.waist==='微凸'},dim:'weight',tag:'腰腹提示',d:'腰腹略有赘肉：少喝含糖饮料，每天快走或跳绳 30 分钟'},
{f:function(u){return u.body==='偏瘦'},dim:'weight',tag:'体型提示',d:'体型偏瘦：增加优质蛋白（鱼/蛋/奶/瘦肉）和健康脂肪（坚果），持续偏瘦建议就医排查'},
{f:function(u){return u.board==='住校生'},dim:'structure',tag:'住校提示',d:'住校生：食堂打饭必选绿叶菜+优质蛋白；宿舍不囤深加工零食，每周只带少量坚果和牛奶'},
{f:function(u){return u.meal==='学校食堂'},dim:'structure',tag:'就餐场景',d:'在学校吃饭：打饭必选绿叶菜+优质蛋白，避免只打肉菜'},
{f:function(u){return u.meal==='经常外食/外卖'},dim:'takeout',tag:'就餐场景',d:'经常外食：尽量选粥品/蒸菜，额外加一份蔬菜，点餐备注少油少盐'}];
function weightExtra(u){
  var e='';
  if(u.waist==='明显')e+=' 腰围凸出提示中心性肥胖风险，建议测量腰围跟踪变化。';
  if(u.body==='偏瘦')e+=' 体型偏瘦需排查疾病因素，加强营养密度。';
  return e;
}

/* ================= 版本配置 ================= */
var BODY=['偏瘦（肋骨明显）','正常（匀称）','微胖（肚子有肉）','超重（明显肥胖）'];
var BODY_V=['偏瘦','正常','微胖','超重'];
var WAIST=['平坦，没有赘肉','微微凸起，但穿衣服不明显','明显凸出，像“啤酒肚”'];
var WAIST_V=['平坦','微凸','明显'];

var PROF={
primary:{good:{t:'健康小食客',d:'孩子的饮食习惯非常棒，营养均衡且充满自律。良好的饱腹感知和健康的食谱，为他的生长发育提供了最优质的燃料。请继续保持这种充满生机的家庭饮食氛围。'},
 ok:{t:'嘴馋小达人',d:'孩子的饮食基本及格，但在零食选择或外食频率上还有提升空间。偶尔贪嘴是孩子的天性，通过优化家里的食物库存和引导点餐选择，他很快能拥有更健康的体魄。'},
 low:{t:'饮食失衡预警',d:'目前孩子的饮食与体重状况存在隐患，高糖高油摄入或不良就餐习惯正在侵蚀他的代谢健康。儿童期的肥胖极易延续到成年。建议从今天起，大刀阔斧地改革食谱，重塑餐桌规矩。'}},
junior:{good:{t:'青春期活力源',d:'孩子的饮食习惯非常棒，营养均衡且充满自律。良好的饱腹感知和健康的食谱，为他繁重的学业和生长发育提供了最优质的燃料。请继续保持。'},
 ok:{t:'压力小食客',d:'孩子的饮食基本及格，但在奶茶选择或宵夜频率上还有提升空间。偶尔贪嘴是青春期释放压力的方式，通过优化家里的食物库存和引导夜宵选择，他很快能拥有更健康的体魄。'},
 low:{t:'代谢红灯区',d:'目前孩子的饮食与体重状况存在隐患，高糖高油摄入、情绪化进食或不良就餐习惯正在侵蚀他的代谢健康。青春期发胖极易延续到成年。建议从今天起改革食谱，重塑餐桌规矩。'}},
senior:{good:{t:'冲刺期稳定器',d:'孩子的饮食结构扎实、依赖少，稳定的代谢是他应对高强度学习的底层保障。冲刺期拼的不只是意志力，更是身体本钱——请继续保持这种健康的饮食节奏。'},
 ok:{t:'压力小食客',d:'基本及格，但咖啡因、宵夜或外卖频率还有优化空间。高压之下的“随手一口”最容易被忽视，先从一两个习惯开始调整就好。'},
 low:{t:'代谢红灯区',d:'高糖高油、情绪化进食或作息紊乱可能正在侵蚀代谢健康，这类状态在冲刺期尤其消耗精力。建议尽快调整食谱与作息，必要时联系营养师或医生。'}}};

var CFG={
primary:{tag:'6–12岁 · 小学阶段',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],board:false,meal:true,
 lead:'儿童期的饮食结构不仅影响当下的生长发育，更决定了成年后的代谢健康。这一版聚焦家庭喂养、挑食偏食、零食诱惑与餐桌情绪，帮助您发现隐藏的营养盲区。',
 qs:Q_PRIMARY,descr:D_PRIMARY,sug:SUG_PRIMARY,prof:PROF.primary},
junior:{tag:'12–15岁 · 初中阶段',grades:['初一','初二','初三'],board:true,meal:false,
 lead:'初中阶段是生长发育的猛增期，也是饮食习惯最容易失控的时期——学业压力、青春期焦虑、零花钱的增加，让奶茶、外卖和宵夜成为常态。这一版聚焦猛长期的代谢健康。',
 qs:buildTeen(false),descr:D_TEEN,sug:SUG_TEEN,prof:PROF.junior},
senior:{tag:'15–18岁 · 高中阶段',grades:['高一','高二','高三'],board:true,meal:false,
 lead:'高中阶段是学业压力的巅峰期，也是饮食最容易失控的时期——咖啡因依赖、情绪化进食、熬夜宵夜、容貌焦虑……这一版帮您识别高压学习下的饮食隐患，让孩子以更稳健的身体状态迎接人生大考。',
 qs:buildTeen(true),descr:D_TEEN,sug:SUG_TEEN,prof:PROF.senior}};

var LVL={good:'良好',ok:'尚可',low:'需关注'};
var DK={good:'good',ok:'ok',low:'low'};
var KEEP_ADVICE='各维度状态都不错，无需刻意调整。可以隔一两个月再做一次，观察状态的自然变化。';

/* ================= 状态 ================= */
var els={
  landing:$('#page-landing'),form:$('#page-form'),quiz:$('#page-quiz'),report:$('#page-report'),
  brand:$('#brand'),topQuiz:$('#topQuiz'),dimText:$('#dimText'),
  qIdx:$('#qIdx'),qTotal:$('#qTotal'),progressTrack:$('#progressTrack'),progressFill:$('#progressFill'),
  qCard:$('#qCard'),qText:$('#qText'),qHint:$('#qHint'),qOptions:$('#qOptions'),
  prevBtn:$('#prevBtn'),nextBtn:$('#nextBtn'),nextLabel:$('#nextLabel'),autoTip:$('#autoTip'),
  formTag:$('#formTag'),formTitle:$('#formTitle'),formLead:$('#formLead'),formFields:$('#formFields'),
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
  els.formTitle.innerHTML=ver==='primary'?'健康饮食小雷达<br>在成长中<em class="accent">吃出好体魄</em>':
    ver==='junior'?'青春期饮食雷达<br>在猛长期<em class="accent">吃出好状态</em>':
    '冲刺期饮食雷达<br>在高压下<em class="accent">守住代谢底线</em>';
  els.formLead.textContent=cfg.lead;
  var g='<div><label class="f-label" for="fName">孩子昵称（选填）</label>'+
    '<input class="f-input" id="fName" type="text" maxlength="12" placeholder="用于报告展示，可不填" autocomplete="off"></div>'+
    '<div><label class="f-label" for="fGrade">年级</label><select class="f-input" id="fGrade">'+opts(cfg.grades)+'</select></div>';
  if(cfg.board)g+='<div><label class="f-label" for="fBoard">就读方式</label><select class="f-input" id="fBoard">'+opts(['走读生','住校生'])+'</select></div>';
  if(cfg.meal)g+='<div><label class="f-label" for="fMeal">孩子平时主要在哪吃饭？</label><select class="f-input" id="fMeal">'+opts(['家里做饭','学校食堂','长辈家/托管班','经常外食/外卖'])+'</select></div>';
  g+='<div class="f-row">'+
    '<div><label class="f-label" for="fBody">您觉得孩子目前的体型是？</label><select class="f-input" id="fBody">'+opts(BODY)+'</select></div>'+
    '<div><label class="f-label" for="fWaist">孩子肚子（腰腹部）的形态是？</label><select class="f-input" id="fWaist">'+opts(WAIST)+'</select></div></div>';
  els.formFields.innerHTML=g;
  if(!pushed){try{history.pushState({s:1},'');pushed=true}catch(e){}}
  showStage('form');
}

function startQuiz(){
  if(!$('#fGrade').value){toast('请选择年级');return}
  if(cfg.board&&!$('#fBoard').value){toast('请选择就读方式');return}
  user={name:($('#fName').value||'').trim(),grade:$('#fGrade').value,
    board:cfg.board?$('#fBoard').value:'',
    meal:cfg.meal?$('#fMeal').value:'',
    body:BODY_V[$('#fBody').selectedIndex],
    waist:WAIST_V[$('#fWaist').selectedIndex]};
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
  els.resultTitle.textContent=user.name?'「'+user.name+'」的健康饮食画像':'健康饮食画像';
  els.resultSub.textContent=user.grade+(user.board?' · '+user.board:'')+(user.meal?' · '+user.meal:'')+' · 基于五大维度';

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

  var pf=cfg.prof[res.g];
  els.pfCard.className='verdict-card lv-'+res.g;
  els.pfTitle.textContent=pf.t;
  els.pfDesc.textContent=pf.d;
  var cnt={good:0,ok:0,low:0};
  res.dims.forEach(function(d){cnt[d.lv]++});
  els.pfStats.innerHTML='五个维度中：<b class="sg">'+cnt.good+'</b> 个良好 · <b class="sy">'+cnt.ok+
    '</b> 个尚可 · <b class="sr">'+cnt.low+'</b> 个需关注';

  els.dimList.innerHTML='';
  res.dims.forEach(function(d,k){
    var card=document.createElement('div');
    card.className='dim-card lv-'+d.lv;
    card.style.animationDelay=(0.12+k*0.09)+'s';
    var extra=d.k==='weight'?weightExtra(user):'';
    card.innerHTML=
      '<div class="dim-head">'+
        '<div class="dim-name">'+IC[d.k]+d.name+'<span class="dim-level lvl-'+d.lv+'">'+LVL[d.lv]+'</span></div>'+
        '<div class="dim-score"><b>'+d.pct+'</b> /100</div>'+
      '</div>'+
      '<div class="dim-mini-bar"><i style="--p:'+(d.pct/100).toFixed(3)+';animation-delay:'+(0.35+k*0.09)+'s"></i></div>'+
      '<p class="dim-desc">'+cfg.descr[d.k][DK[d.lv]]+extra+'</p>';
    els.dimList.appendChild(card);
  });

  /* 建议：薄弱维度 + 个性化提示 */
  els.adviceList.innerHTML='';
  var m=0,added=false;
  var weak=res.dims.filter(function(d){return d.lv!=='good'})
    .sort(function(a,b){return a.pct-b.pct}).slice(0,2);
  if(weak.length){
    weak.forEach(function(d){
      cfg.sug[d.k].forEach(function(s){
        var el=document.createElement('div');
        el.className='advice-item';
        el.style.animationDelay=(0.2+m*0.08)+'s';
        el.innerHTML='<span class="a-tag">'+d.name+'</span><div class="d">'+s+'</div>';
        els.adviceList.appendChild(el);
        m++;added=true;
      });
    });
  }
  PERSONAL.forEach(function(p){
    if(!p.f(user))return;
    var el=document.createElement('div');
    el.className='advice-item personal';
    el.style.animationDelay=(0.2+m*0.08)+'s';
    el.innerHTML='<span class="a-tag">'+p.tag+'</span><div class="d">'+p.d+'</div>';
    els.adviceList.appendChild(el);
    m++;added=true;
  });
  if(!added){
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
