
(function () {
  'use strict';

  /* ============================================================
   *  量表数据（理论 2.0：双线修复 + 四重缝合）
   *  内在线：个体修复力（认知、情绪、叙事、意义）
   *  外在线：环境支持力（家庭、学校、同伴、社会）
   * ============================================================ */
  var OPTS_3 = [
    { v: 3, icon: '😊', label: '经常是这样' },
    { v: 2, icon: '😐', label: '有时是这样' },
    { v: 1, icon: '😢', label: '很少是这样' }
  ];
  var OPTS_4 = [
    { v: 4, label: '非常符合我的情况' },
    { v: 3, label: '比较符合我的情况' },
    { v: 2, label: '不太符合我的情况' },
    { v: 1, label: '完全不符合我的情况' }
  ];
  var OPTS_5 = [
    { v: 5, label: '完全符合' },
    { v: 4, label: '比较符合' },
    { v: 3, label: '不确定' },
    { v: 2, label: '比较不符合' },
    { v: 1, label: '完全不符合' }
  ];

  var SCALES = {
    /* ---------------- 小学低年级 6-9（双线融合·简单版） ---------------- */
    p1: {
      key: 'p1', name: '小学低年级', age: '6-9岁', icon: '🧸',
      meta: '24 题 · 约 10 分钟 · 家长可协助',
      max: 3, optionStyle: 'emoji', options: OPTS_3,
      dims: [
        { key: 'time', name: '时间缝合', sub: '成长故事', items: [
          '我能讲出昨天、上个星期和放假时发生的事。',
          '爸爸妈妈会帮我一起回忆以前的事。',
          '我知道从开学到现在我学会了什么新东西。',
          '我每天的生活都差不多，我知道接下来要做什么。',
          '我能说出我小时候和现在有什么不一样。',
          '家里人会跟我说我长大以后的事。'
        ]},
        { key: 'relation', name: '关系缝合', sub: '好朋友', items: [
          '我有可以说悄悄话的好朋友。',
          '我难过的时候，家里人会抱抱我、听我说。',
          '我能感觉到别人是开心还是难过。',
          '学校里有我喜欢的老师。',
          '我可以和好朋友一起玩很久，不只是各自玩各自的手机。',
          '邻居或亲戚里也有认识我、关心我的人。'
        ]},
        { key: 'meaning', name: '意义缝合', sub: '我喜欢的事', items: [
          '我知道我为什么每天要去上学。',
          '爸爸妈妈会跟我说他们为什么要做自己的工作。',
          '做某些事的时候，我会觉得特别开心、特别有意思。',
          '家里人会让我帮忙做一些小事，我觉得自己有用。',
          '我知道学的东西以后可以用在哪里。',
          '有人跟我说过我做的事情帮到了别人。'
        ]},
        { key: 'identity', name: '身份缝合', sub: '我是谁', items: [
          '我能说出自己擅长什么、不擅长什么。',
          '爸爸妈妈说我是个怎样的孩子时，我觉得说的挺对。',
          '我接受自己有些事情做得不够好。',
          '老师会看到我做得好的地方，不只是看分数。',
          '我知道自己和别人不一样的地方，我觉得这挺好的。',
          '家里人喜欢我本来的样子，不用我变成别人。'
        ]}
      ]
    },

    /* ---------------- 小学高年级 10-12（双线平衡·过渡版） ---------------- */
    p2: {
      key: 'p2', name: '小学高年级', age: '10-12岁', icon: '🎒',
      meta: '32 题 · 约 15 分钟 · 可独立完成',
      max: 4, optionStyle: 'number', options: OPTS_4,
      dims: [
        { key: 'time', name: '时间缝合', sub: '我的成长故事', items: [
          '我能把从幼儿园到现在的经历讲成一个完整的故事。',
          '家里人会和我一起看以前的照片、聊以前的事。',
          '我能发现自己在哪些方面进步了、在哪些方面还需要努力。',
          '我每天的日程虽然很满，但我知道自己在做什么、为什么做。',
          '家人会帮我安排时间，也会让我自己决定一些事情。',
          '我能想到小学毕业以后我想做什么。',
          '就算做错了事，我也能从中学到东西，不会一直难过。',
          '身边的人会告诉我"你已经长大了"、"你进步了"。'
        ]},
        { key: 'relation', name: '关系缝合', sub: '我和他人', items: [
          '我有至少一个可以分享内心想法的好朋友。',
          '家里有人愿意听我说心里话，不只是问成绩。',
          '我能分辨哪些朋友是真心的，哪些只是表面上的。',
          '班里有些同学会在我需要的时候帮我。',
          '我可以在朋友面前做真实的自己，不用假装。',
          '老师了解我是一个怎样的人，而不只是知道我的分数。',
          '当我和别人有矛盾时，我知道怎么去沟通解决。',
          '我参加的课外班或社团里，有人真正关心我。'
        ]},
        { key: 'meaning', name: '意义缝合', sub: '我为什么做这些', items: [
          '我知道每天学习这些东西是为了什么。',
          '爸爸妈妈会和我聊他们觉得什么是重要的、为什么。',
          '我做某些事情的时候，会觉得特别有意思、特别值得。',
          '学校里不只是教我们考试，也会让我们做一些真正有用的事。',
          '我能把现在学的东西和以后想做的事情联系起来。',
          '家里人会让我参与家里的事情，让我觉得自己是重要的一员。',
          '我知道自己做的某些事情能帮助到别人。',
          '有人（老师、家长或朋友）跟我说过我做的事情很有意义。'
        ]},
        { key: 'identity', name: '身份缝合', sub: '我是谁', items: [
          '我能用很多不同的词来描述自己，而不只是"好学生"或"差学生"。',
          '爸爸妈妈喜欢我本来的样子，而不是要我变成"别人家的孩子"。',
          '我知道自己的优点，也接受自己的缺点。',
          '老师会用不同的话来夸不同的同学，不只是"你真聪明"。',
          '我不会因为一次没考好，就觉得自己很笨。',
          '家人会支持我发展自己的兴趣爱好，即使这不是"正经"的事。',
          '我对自己的未来有很多想法，不只是"考上好大学"。',
          '周围的人能看到我不同的样子，而不只是我在学校的样子。'
        ]}
      ]
    },

    /* ---------------- 初中 13-15（双线修复·发展版） ---------------- */
    p3: {
      key: 'p3', name: '初中', age: '13-15岁', icon: '🎧',
      meta: '40 题 · 约 15 分钟 · 自评',
      max: 5, optionStyle: 'number', options: OPTS_5,
      dims: [
        { key: 'time', name: '时间缝合', sub: '成长的连贯性', items: [
          '我能清晰讲述从小学到现在的成长经历，包括变化和转折。',
          '家里人会认真听我讲我的经历，而不是打断我说"你要……"。',
          '我能理解过去发生的困难事情（比如失败或受伤）是怎么让我成长的。',
          '我的日程虽然很忙，但我知道每件事对我的意义，而不只是"必须做"。',
          '家里或学校有人帮我一起规划时间，而不是全部帮我安排好。',
          '我能从过去的挫折中总结经验，下次遇到类似情况知道怎么办。',
          '父母或老师会和我一起回顾我的进步，而不只是指出我的问题。',
          '我对未来有一些自己的想法，不只是"考上什么学校"。',
          '家人会支持我的想法，即使他们不完全理解。',
          '我能把现在做的事情和长远的人生方向联系起来。'
        ]},
        { key: 'relation', name: '关系缝合', sub: '深度联结', items: [
          '我有至少一个可以真正说心里话的朋友，而不只是"一起玩"的关系。',
          '当我心情不好的时候，家里有人愿意听我说，而不只是说"你要坚强"。',
          '我能和信任的人聊我的脆弱和烦恼，而不只是聊成绩和八卦。',
          '学校里有老师真正关心我这个人，而不只是关心我的分数。',
          '我能在朋友面前展示真实的自己，包括不好的一面。',
          '我有稳定的朋友圈，他们不会因为我的成绩或表现而改变对我的态度。',
          '当我和别人有冲突时，我有能力去沟通和修复关系。',
          '我的家是一个让我感到安全的地方，可以放松做我自己。',
          '我能感觉到别人的情绪，知道什么时候该说什么话。',
          '社区或课外活动里有人认识我、关心我，而不只是学校里的人。'
        ]},
        { key: 'meaning', name: '意义缝合', sub: '价值与方向', items: [
          '我知道学习这些知识对我的未来真正有什么用，而不只是"为了考试"。',
          '家里人会和我讨论什么是重要的、什么是值得追求的。',
          '我有自己真正感兴趣、愿意花时间去做的事情。',
          '学校不只用分数来评价我，也看重我其他方面的能力。',
          '我能把现在做的事情和我未来想成为的人联系起来。',
          '有人支持我发展自己的兴趣，即使这不是"主流"的选择。',
          '我觉得自己做的事情对别人或社会有价值。',
          '社会上有让我参与的机会，让我觉得自己是重要的。',
          '面对"为什么要学习"这个问题，我有自己的答案，而不只是"别人让我学"。',
          '我崇拜的人或榜样不是因为他们的成就，而是因为他们做的事情有意义。'
        ]},
        { key: 'identity', name: '身份缝合', sub: '自我认同', items: [
          '我能用很多不同的方式描述自己，而不只是用一个标签（如"学霸"、"差生"）。',
          '家人接受我本来的样子，而不是要求我成为他们想要的样子。',
          '我接受自己的不完美，不会因为一次失败就全盘否定自己。',
          '老师或长辈能看到我不同的优点，而不只是关注我的弱项。',
          '我能整合在不同场合的自己（家里的我、学校的我、和朋友的我）。',
          '我的朋友喜欢的是真实的我，而不是我表现出来的样子。',
          '我对自己的看法不会轻易因为别人的评价而改变。',
          '身边有让我感到被理解的人，我不用在他们面前伪装。',
          '我能说出自己的价值观（什么对我来说重要、什么不重要）。',
          '即使别人给我贴标签（正面的或负面的），我知道那不是我全部的样子。'
        ]}
      ]
    },

    /* ---------------- 高中 16-18（双线修复·深化版） ---------------- */
    p4: {
      key: 'p4', name: '高中', age: '16-18岁', icon: '📚',
      meta: '40 题 · 约 15 分钟 · 自评',
      max: 5, optionStyle: 'number', options: OPTS_5,
      dims: [
        { key: 'time', name: '时间缝合', sub: '生命叙事', items: [
          '我能连贯地讲述自己的成长故事，理解其中的主题和转折点。',
          '家人或师长会和我讨论人生方向，而不是只告诉我"该怎么做"。',
          '我能理解过去的困难经历（包括挫折和失败）如何塑造了今天的我。',
          '我的日程虽然紧张，但我知道每件事的意义，有一种掌控感。',
          '学校提供空间让我思考自己的未来，而不只是填志愿。',
          '我能从失败中提取智慧，把它转化为下次的力量。',
          '父母能接受我的选择和我对未来的想法，即使和他们的期待不一样。',
          '我对人生有更大的方向感，不只是"考上什么大学"。',
          '身边有人见证我的成长，能告诉我"你已经走了多远"。',
          '我能把高中阶段的学习和长远的人生使命联系起来。'
        ]},
        { key: 'relation', name: '关系缝合', sub: '深度联结', items: [
          '我有至少一个可以深度交流的关系（朋友、家人或导师）。',
          '当我遇到困难时，有人能真正理解我的感受，而不只是给建议。',
          '我能向信任的人展示我的脆弱和不确定，而不用担心被评判。',
          '我有一个稳定的支持网络，而不只是依赖一两个人。',
          '我能和别人建立真实的联结，而不只是"有用"的关系。',
          '我的家人能和我进行成人式的对话，尊重我的独立性。',
          '当关系出现问题时，我有能力去沟通和修复。',
          '学校或社区有让我感到归属的团体或活动。',
          '我能感觉到自己"被看见"——有人真正了解我是谁。',
          '我有可以一起讨论人生、价值观的伙伴，而不只是聊日常。'
        ]},
        { key: 'meaning', name: '意义缝合', sub: '价值与使命', items: [
          '我清楚地知道自己为什么要学习——这与我的内在价值观相连。',
          '家人或老师会和我讨论什么是值得追求的人生，而不只是成功标准。',
          '我的学习由内在兴趣驱动，而不只是外在压力。',
          '学校提供机会让我探索自己的兴趣和方向，而不只是应试。',
          '我有超越"高考"的更大梦想和目标。',
          '社会或学校有让我参与的渠道，让我感到自己的贡献有价值。',
          '我能把个人理想和他人福祉或社会价值联系起来。',
          '有人支持我追求自己认为有意义的事情，即使这条路不好走。',
          '面对"我为什么而活"这个问题，我有自己的答案。',
          '我的榜样让我看到：人可以活出自己认为有意义的样子。'
        ]},
        { key: 'identity', name: '身份缝合', sub: '整合自我', items: [
          '我有丰富多元的自我描述，远超任何单一标签。',
          '身边的人接纳真实的我，而不是要求我符合某个"标准"。',
          '我接纳自己的全部——包括优点、缺点和犯过的错误。',
          '老师或长辈能看到我独特的价值，而不只是用统一标准衡量。',
          '我能整合在不同场合的自己（学生、子女、朋友、公民）。',
          '我的朋友欣赏的是我的本质，而不只是我的表现。',
          '我对自己的看法是稳定的，不会轻易被他人的评价动摇。',
          '社会环境让我有机会展现不同的自己，而不只是"学生"这一个身份。',
          '我知道自己的核心价值观，能以此指导选择。',
          '即使面对失败或挫折，我依然知道自己是谁、想成为什么样的人。'
        ]}
      ]
    },

    /* ---------------- 大学 18-22（双线修复·成熟版） ---------------- */
    p5: {
      key: 'p5', name: '大学', age: '18-22岁', icon: '🎓',
      meta: '40 题 · 约 15 分钟 · 自评',
      max: 5, optionStyle: 'number', options: OPTS_5,
      dims: [
        { key: 'time', name: '时间缝合', sub: '生命历程整合', items: [
          '我能连贯讲述自己的生命故事，理解其中的主题、转折和深层意义。',
          '有长辈或导师能和我讨论人生历程，帮我看到更完整的图景。',
          '我能把过去的失败和挫折转化为成长的资源，而不是心理负担。',
          '我对自己的生活有掌控感，知道每个选择背后的意义。',
          '社会环境提供机会让我探索不同的人生道路，而不只是"标准路径"。',
          '我能从过去的经验中提取智慧，指导现在的决策。',
          '家人支持我的选择，即使他们对我的未来有自己的期待。',
          '我对人生有清晰的方向感，知道"我从哪里来、要到哪里去"。',
          '有平台或机会让我将所学与社会需求连接，感到自己的努力有意义。',
          '我能把当前的学习/工作与长远的人生使命有机联系起来。'
        ]},
        { key: 'relation', name: '关系缝合', sub: '深度联结与自主', items: [
          '我有至少一个可以进行深度情感交流的关系（伴侣、挚友或导师）。',
          '当我遇到困难时，有真正理解我的人，而不只是给建议的人。',
          '我能与他人建立真实、深入的关系，而不只是功能性的联结。',
          '我有一个稳定、多元的支持网络（家庭、朋友、社群等）。',
          '我能与家人建立成人式的关系——既保持亲密又保有自主。',
          '学校或工作环境提供真诚的交流和合作机会。',
          '当关系出现问题时，我有能力主动沟通和修复。',
          '有社群或组织让我有归属感，感到自己是重要的成员。',
          '我在关系中既能给予支持，也能坦然接受支持。',
          '社会环境尊重个体的差异和选择，让我能做真实的自己。'
        ]},
        { key: 'meaning', name: '意义缝合', sub: '生命价值与社会贡献', items: [
          '我清楚地知道自己的人生使命或方向——这与我的核心价值观深度相连。',
          '有长辈或榜样向我展示了什么是"有意义的人生"。',
          '我的学习和工作由内在动机驱动，感到充实和有价值。',
          '社会提供有意义的参与渠道，让我能贡献自己的力量。',
          '我能将个人理想与更大的社会价值或他人福祉深度整合。',
          '所处的环境鼓励创新和追求个人意义，而不只是"安全选择"。',
          '我对"我为什么而活"这个问题有清晰而内在的答案。',
          '有平台让我将才能用于解决真实的问题，感到自己的工作有价值。',
          '我的存在对世界有独特的积极影响，我清楚这一点。',
          '社会的多元价值让我能找到属于自己的意义路径。'
        ]},
        { key: 'identity', name: '身份缝合', sub: '整合的成人自我', items: [
          '我有丰富、多元且整合的自我认同，远超任何单一角色或标签。',
          '身边的人接纳真实的我，包括我的不确定和探索。',
          '我完全接纳自己——包括优点、缺点和犯过的错误。',
          '所处的环境允许我展现不同面向的自己，而不只是一种身份。',
          '我能整合不同的社会角色（学生、子女、朋友、公民等）为一个整体。',
          '社会认可多元化的成功标准，而不只是金钱和地位。',
          '我对自己的认知是稳定的，不会轻易因外界评价而动摇。',
          '有导师或前辈帮我看到自己独特的潜力和价值。',
          '我知道自己的核心价值观，并以此指导重大人生选择。',
          '即使面对不确定的未来，我依然清楚自己是谁、要成为什么样的人。'
        ]}
      ]
    }
  };

  /* ============================================================
   *  前端只展示状态词，不展示任何数值
   * ============================================================ */
  var DIM_COLOR = { time:'#a78bfa', relation:'#ff8fb8', meaning:'#4dd4ac', identity:'#6fb8ff' };

  var STATUS_LEVELS = [
    { min: .80, emoji: '🌿', title: '整合得挺好',
      desc: '你正把生活的线索稳稳地握在手里。时间、关系、意义与自我，在你这里能连成一片。' },
    { min: .60, emoji: '🌤️', title: '正在连接中',
      desc: '大部分线索已经连上了，还有一些地方在慢慢生长。这种"半成型"的状态，本来就是成长的样子。' },
    { min: .40, emoji: '🌱', title: '有些线还散着',
      desc: '有几条线还没有系紧，偶尔会觉得飘。没关系——能看见它们，就已经是缝合的开始了。' },
    { min: 0,   emoji: '🫧', title: '需要多一点陪伴',
      desc: '此刻的你也许有些疲惫或迷惘。不必一个人扛着，找个人说说话，会好很多。' }
  ];

  var DIM_STATES = {
    time: [
      { min: .80, text: '你能把自己的故事串起来，也知道接下来要去哪里' },
      { min: .60, text: '大多时候，你知道自己从哪里来、往哪里去' },
      { min: .40, text: '时间线有时清晰，有时模糊，在慢慢找到方向' },
      { min: 0,   text: '回想过去、想象未来，可能都有点费力，需要一些支持' }
    ],
    relation: [
      { min: .80, text: '你有能真正说心里话的人，也被真正听见' },
      { min: .60, text: '身边有让你安心的人，可以再靠近一点' },
      { min: .40, text: '关系不少，但真正能深入的还需要时间和勇气' },
      { min: 0,   text: '此刻可能有些孤单，值得找个人说说话' }
    ],
    meaning: [
      { min: .80, text: '你清楚自己为什么做这些事，方向感很足' },
      { min: .60, text: '多数事情，你能找到它对你的意义' },
      { min: .40, text: '有时会问"这有什么意义"，这也是成长的一部分' },
      { min: 0,   text: '意义感比较淡，可以先从小事里找一点喜欢' }
    ],
    identity: [
      { min: .80, text: '你了解并接纳自己的各种样子，不容易被标签定义' },
      { min: .60, text: '你正在慢慢看清自己是谁' },
      { min: .40, text: '对自己的认识还在变化中，慢慢来' },
      { min: 0,   text: '现在可能不太确定自己是谁，这份不确定也值得被温柔对待' }
    ]
  };

  var ADVICE = {
    time:     '这周挑一件小事，用三句话把它写下来或者讲给别人听。<b>故事被讲出来，才会变成你的。</b>',
    relation: '找一个你信任的人，认真聊五分钟最近的感受——不是聊作业、不是聊八卦，是聊你自己。',
    meaning:  '做每件事之前，问自己一句："这件事对我真正重要的是什么？"找到那个"为什么"，行动会轻很多。',
    identity: '试着用三句话描述你自己，但禁止使用成绩、排名、学校和你身上的任何标签。剩下的，才是你。'
  };

  /* ============================================================
   *  状态
   * ============================================================ */
  var state = { key: null, scale: null, flat: [], answers: [], index: 0, locked: false, startTime: 0 };

  function $(id) { return document.getElementById(id); }

  function showScreen(id) {
    ['screen-home', 'screen-quiz', 'screen-result'].forEach(function (sid) {
      var el = document.getElementById(sid);
      if (el) el.classList.toggle('active', sid === id);
    });
    window.scrollTo(0, 0);
  }

  function openOverlay(id) { var el = $(id); if (el) el.classList.add('show'); }
  function closeOverlay(id) { var el = $(id); if (el) el.classList.remove('show'); }

  function pickLevel(table, ratio) {
    for (var i = 0; i < table.length; i++) if (ratio >= table[i].min) return table[i];
    return table[table.length - 1];
  }

  /* ============================================================
   *  首页
   * ============================================================ */
  function initHome() {
    var wrap = $('ageList');
    wrap.innerHTML = '';
    Object.keys(SCALES).forEach(function (k) {
      var s = SCALES[k];
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'age-card';
      el.setAttribute('data-key', k);
      el.innerHTML =
        '<span class="age-emoji">' + s.icon + '</span>' +
        '<span class="age-info">' +
          '<span class="age-name">' + s.name + '<em>' + s.age + '</em></span>' +
          '<span class="age-meta">' + s.meta + '</span>' +
        '</span>' +
        '<span class="age-check">✓</span>';
      el.addEventListener('click', function () { selectAge(k); });
      wrap.appendChild(el);
    });
  }

  function selectAge(k) {
    state.key = k;
    var cards = document.querySelectorAll('.age-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('sel', cards[i].getAttribute('data-key') === k);
    }
    var btn = $('startBtn');
    btn.disabled = false;
    btn.textContent = '参与研究 · ' + SCALES[k].name;
    if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} }
  }

  /* ============================================================
   *  答题
   * ============================================================ */
  function startQuiz() {
    var s = SCALES[state.key];
    if (!s) return;

    state.scale = s;
    state.flat = [];
    s.dims.forEach(function (d, di) {
      d.items.forEach(function (t) {
        state.flat.push({ dimIndex: di, dimName: d.name, dimSub: d.sub, text: t });
      });
    });
    state.answers = state.flat.map(function () { return null; });
    state.index = 0;
    state.locked = false;
    state.startTime = Date.now();

    $('qTotal').textContent = state.flat.length;
    showScreen('screen-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    var s = state.scale;
    var q = state.flat[state.index];
    var total = state.flat.length;

    $('qIndex').textContent = state.index + 1;
    $('qTotal').textContent = total;
    $('progressBar').style.width = ((state.index / total) * 100) + '%';
    $('dimTag').textContent = q.dimName + ' · ' + q.dimSub;
    $('qNum').textContent = 'Q' + (state.index + 1);
    $('qText').textContent = q.text;

    var optWrap = $('options');
    optWrap.innerHTML = '';
    var prev = state.answers[state.index];

    s.options.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (prev === o.v ? ' picked' : '');
      var keyHtml = s.optionStyle === 'emoji'
        ? '<span class="opt-key emoji">' + o.icon + '</span>'
        : '<span class="opt-key">' + o.v + '</span>';
      b.innerHTML = keyHtml + '<span class="opt-label">' + o.label + '</span>';
      b.addEventListener('click', function () { choose(o.v, b); });
      optWrap.appendChild(b);
    });

    var card = $('qCard');
    card.classList.remove('anim');
    void card.offsetWidth;
    card.classList.add('anim');

    var body = document.querySelector('.quiz-body');
    if (body) body.scrollTop = 0;
  }

  function choose(v, btn) {
    if (state.locked) return;
    state.locked = true;
    state.answers[state.index] = v;

    var sibs = btn.parentNode.querySelectorAll('.opt');
    for (var i = 0; i < sibs.length; i++) sibs[i].classList.remove('picked');
    btn.classList.add('picked');

    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }

    setTimeout(function () {
      state.locked = false;
      if (state.index < state.flat.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        $('progressBar').style.width = '100%';
        setTimeout(finish, 200);
      }
    }, 230);
  }

  function goBack() {
    if (state.index > 0) { state.index--; renderQuestion(); }
    else { showScreen('screen-home'); }
  }

  /* ============================================================
   *  计算（数值只用于上传，不用于展示）
   * ============================================================ */
  function finish() {
    var s = state.scale;

    var dims = s.dims.map(function (d, di) {
      var sum = 0, n = 0;
      state.flat.forEach(function (q, i) {
        if (q.dimIndex === di) { sum += state.answers[i]; n++; }
      });
      return { key: d.key, name: d.name, sub: d.sub, score: sum / n };
    });

    var totalSum = 0;
    for (var i = 0; i < state.answers.length; i++) totalSum += state.answers[i];
    var total = totalSum / state.answers.length;

    renderResult(s, dims, total);
    submitResult(s, dims, total);
    openOverlay('thanksOverlay');
  }

  /* ============================================================
   *  结果渲染（只有状态词，无分数、无诊断）
   * ============================================================ */
  function renderResult(s, dims, total) {
    var status = pickLevel(STATUS_LEVELS, total / s.max);

    $('statusEmoji').textContent = status.emoji;
    $('bandTitle').textContent = status.title;
    $('bandDesc').textContent = status.desc;

    var list = $('dimList');
    list.innerHTML = '';

    dims.forEach(function (d) {
      var st = pickLevel(DIM_STATES[d.key], d.score / s.max);
      var color = DIM_COLOR[d.key] || '#a78bfa';
      var row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML =
        '<div class="dim-head">' +
          '<span class="dim-dot" style="background:' + color + ';color:' + color + '"></span>' +
          '<span class="dim-name">' + d.name + '</span>' +
          '<span class="dim-sub">' + d.sub + '</span>' +
        '</div>' +
        '<div class="dim-state">' + st.text + '</div>';
      list.appendChild(row);
    });

    var lowest = dims[0];
    dims.forEach(function (d) { if (d.score < lowest.score) lowest = d; });
    var allHigh = dims.every(function (d) { return d.score / s.max >= 0.8; });

    $('adviceText').innerHTML = allHigh
      ? '四个维度你都在高位，说明你已经把生活缝得相当完整。<b>接下来可以试试：把你的方法讲给身边需要的人听——教别人，是最好的巩固。</b>'
      : '<b>此刻最值得多看一眼前的是：' + lowest.name + '。</b><br>' + (ADVICE[lowest.key] || '');
  }

  /* ============================================================
   *  数据上传（写入 yanjiu 数据库，绑定名 DB_YANJIU）
   * ============================================================ */
  var QUEUE_KEY = 'afg_pending_v2';
  var ENDPOINT = '/api/submit-afg';

  function buildPayload(s, dims, total) {
    var map = {};
    dims.forEach(function (d) { map[d.key] = Number(d.score.toFixed(3)); });
    return {
      age_group: s.key,
      age_label: s.name,
      scale_max: s.max,
      total_score: Number(total.toFixed(3)),
      dim_time: map.time,
      dim_relation: map.relation,
      dim_meaning: map.meaning,
      dim_identity: map.identity,
      item_count: state.flat.length,
      duration_sec: Math.round((Date.now() - state.startTime) / 1000),
      created_at: new Date().toISOString()
    };
  }

  function setChip(text, cls) {
    var chip = $('saveChip');
    chip.textContent = text;
    chip.className = 'save-chip' + (cls ? ' ' + cls : '');
  }

  function submitResult(s, dims, total) {
    var payload = buildPayload(s, dims, total);
    setChip('正在保存…', '');

    send(payload)
      .then(function () { setChip('✓ 已匿名保存', 'ok'); flushQueue(); })
      .catch(function () { enqueue(payload); setChip('📴 已离线暂存，联网后自动上传', 'warn'); });
  }

  function send(payload) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    });
  }

  function enqueue(payload) {
    try {
      var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      q.push(payload);
      if (q.length > 20) q = q.slice(-20);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  }

  function flushQueue() {
    var q;
    try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch (e) { q = []; }
    if (!q.length) return;

    var remain = [], i = 0;
    function next() {
      if (i >= q.length) {
        try {
          if (remain.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
          else localStorage.removeItem(QUEUE_KEY);
        } catch (e) {}
        return;
      }
      var item = q[i++];
      send(item).then(function () { next(); })
                .catch(function () { remain.push(item); next(); });
    }
    next();
  }

  /* ============================================================
   *  绑定与启动
   * ============================================================ */
  function bind() {
    $('startBtn').addEventListener('click', startQuiz);
    $('backBtn').addEventListener('click', goBack);
    $('restartBtn').addEventListener('click', function () { showScreen('screen-home'); });
    $('homeBtn').addEventListener('click', function () { showScreen('screen-home'); });

    $('introOkBtn').addEventListener('click', function () {
      closeOverlay('introOverlay');
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    });
    $('aboutBtn').addEventListener('click', function () { openOverlay('introOverlay'); });

    $('thanksOkBtn').addEventListener('click', function () {
      closeOverlay('thanksOverlay');
      showScreen('screen-result');
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      if ($('thanksOverlay').classList.contains('show')) {
        closeOverlay('thanksOverlay');
        showScreen('screen-result');
      } else if ($('introOverlay').classList.contains('show')) {
        closeOverlay('introOverlay');
      }
    });
  }

  function init() {
    initHome();
    bind();
    openOverlay('introOverlay');
    setTimeout(flushQueue, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
