import { readFileSync } from "node:fs";
const items = JSON.parse(
  readFileSync(new URL("./service-form-options.json", import.meta.url), "utf8"),
);
const multi = (id, label, values, section) => ({
  id,
  label,
  type: "multi",
  options: values.map((value) => ({ value, label: value })),
  section,
});
const single = (id, label, values, section) => ({
  ...multi(id, label, values, section),
  type: "single",
  required: true,
});
const text = (id, label, section, required = false) => ({
  id,
  label,
  section,
  type: "textarea",
  maxLength: 1000,
  required,
});
const school = {
  id: "school",
  label: "学校",
  type: "text",
  maxLength: 80,
  required: true,
  section: "基本信息",
};
const grade = single(
  "grade",
  "年级",
  [
    "一年级",
    "二年级",
    "三年级",
    "四年级",
    "五年级",
    "六年级",
    "七年级",
    "八年级",
    "九年级",
    "高一",
    "高二",
    "高三",
    "其他",
  ],
  "基本信息",
);
const rating = (label, labels) => ({
  id: "rating",
  label,
  type: "single",
  required: true,
  options: labels.map((label, index) => ({
    value: index + 1,
    label: `${index + 1} · ${label}`,
  })),
});
const satisfaction = ["需要改进", "一般", "还不错", "满意", "非常满意"];
const form = (id, name, description, fields) => ({
  id,
  name,
  description,
  sourceUrl: `https://sdsqsnwh.cn/cz/${id}.html`,
  profiles: [{ id: "default", name: "填写反馈", fields }],
});
export const serviceForms = [
  form(
    "r21",
    "青少年成长需求",
    "从内在力量、外在支持和家庭成长三个方面说说你的需要。家庭部分可以先与家长聊一聊。",
    [
      school,
      grade,
      multi("internal", "我想成为的样子", items.r21.internal, "内在力量"),
      text("internalOpen", "还有哪些希望自己进步的地方？", "内在力量"),
      multi(
        "external",
        "学校、家庭和同伴可以给我的帮助",
        items.r21.external,
        "外在支持",
      ),
      text("externalOpen", "对学校或家里还有什么期待？", "外在支持"),
      multi("family", "我们家需要的帮助", items.r21.family, "家庭成长"),
      text("familyOpen", "与家长商量后，还有哪些需要？", "家庭成长"),
    ],
  ),
  form(
    "r22",
    "教师需求与身心状态",
    "收集工作需求、沟通教学困惑及身心支持需要。可由教师与学生共同填写，或填写对教师支持的建议；提交不会改变账号角色。",
    [
      school,
      single("stage", "教学年龄段", items.r22.stage, "基本信息"),
      single("role", "主要职务", items.r22.role, "基本信息"),
      multi("work", "工作需求", items.r22.work, "工作需求"),
      text("workOpen", "还有哪些工作上的需要？", "工作需求"),
      multi("comm", "沟通与教学困惑", items.r22.comm, "沟通与教学困惑"),
      text("commOpen", "可以描述一个具体情境", "沟通与教学困惑"),
      {
        ...rating("近一个月整体身心状态", [
          "身心俱疲",
          "比较疲惫",
          "一般平稳",
          "状态不错",
          "充满活力",
        ]),
        section: "身心状态与支持",
      },
      multi("state", "近期常出现的身心状态", items.r22.state, "身心状态与支持"),
      multi("stress", "主要压力来源", items.r22.stress, "身心状态与支持"),
      multi("support", "希望获得的支持", items.r22.support, "身心状态与支持"),
      text("healthOpen", "关于身心状态还有什么想说的？", "身心状态与支持"),
    ],
  ),
  form(
    "fk2",
    "活动服务反馈",
    "记录参加活动后的成长收获、活动体验与改进建议，帮助所在大区跟进活动。",
    [
      school,
      grade,
      single("type", "参加的活动类型", items.fk2.type, "活动信息"),
      single(
        "cycle",
        "活动周期",
        ["单次活动", "短期（1 周内）", "中期（2–4 周）", "长期（1 个月以上）"],
        "活动信息",
      ),
      single(
        "times",
        "参加次数",
        ["1–2 次", "3–5 次", "6–10 次", "10 次以上"],
        "活动信息",
      ),
      text("activityOpen", "活动名称或补充信息", "活动信息"),
      multi("growth", "收获与变化", items.fk2.growth, "成长与收获"),
      text("growthOpen", "还有别的收获或印象最深的事情吗？", "成长与收获"),
      { ...rating("活动整体满意度", satisfaction), section: "活动体验" },
      multi("liked", "做得好的地方", items.fk2.liked, "活动体验"),
      multi("improve", "希望改进的地方", items.fk2.improve, "活动体验"),
      single("recommend", "会推荐给同学吗？", items.fk2.recommend, "活动体验"),
      text("experienceOpen", "对组织者想说的话", "活动体验"),
    ],
  ),
  form(
    "fk",
    "使用体验反馈",
    "说说你关注的成长话题、使用感受及想改进的地方。反馈由所在大区工作人员查看。",
    [
      multi("focus", "当前关注的成长方面", items.fk.focus, "成长关注点"),
      text("focusOpen", "还有其他关注点吗？", "成长关注点"),
      { ...rating("整体体验评分", satisfaction), section: "使用体验" },
      multi("liked", "做得好的地方", items.fk.liked, "使用体验"),
      multi("improve", "希望改进的地方", items.fk.improve, "使用体验"),
      text("experienceOpen", "还有什么使用建议？", "使用体验"),
    ],
  ),
];

export function formatServiceForm(formId, answers) {
  const definition = serviceForms.find((form) => form.id === formId);
  if (!definition) throw new Error("需求表类型无效");
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    throw new Error("需求表答案格式无效");
  const fields = definition.profiles[0].fields;
  if (
    Object.keys(answers).some((id) => !fields.some((field) => field.id === id))
  )
    throw new Error("需求表包含未知字段");
  const lines = [];
  for (const field of fields) {
    const value = answers[field.id];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    ) {
      if (field.required) throw new Error(`请填写：${field.label}`);
      continue;
    }
    if (field.type === "single" || field.type === "multi") {
      const values = field.type === "multi" ? value : [value];
      if (
        !Array.isArray(values) ||
        new Set(values).size !== values.length ||
        values.some(
          (item) => !field.options.some((option) => option.value === item),
        )
      )
        throw new Error(`${field.label}选项无效`);
      lines.push(
        `${field.label}：${values.map((item) => field.options.find((option) => option.value === item).label).join("；")}`,
      );
    } else {
      if (typeof value !== "string" || value.length > field.maxLength)
        throw new Error(`${field.label}不能超过 ${field.maxLength} 字`);
      if (field.required && !value.trim())
        throw new Error(`请填写：${field.label}`);
      lines.push(`${field.label}：${value.trim()}`);
    }
  }
  const message = lines.join("\n\n");
  if (!message || message.length > 16000)
    throw new Error("请检查需求表填写长度");
  return { type: definition.name, message };
}
