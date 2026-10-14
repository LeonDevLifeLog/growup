import { readFileSync } from "node:fs";

export const trackerTools = JSON.parse(
  readFileSync(new URL("./tracker-schema.json", import.meta.url), "utf8"),
);
const NOTICE =
  "这是本人填写内容的描述性汇总，不是心理测量、能力评定或医学诊断。记录缺失不等于状况良好；需要帮助时请联系信任的成人或专业人员。";
const mean = (values) =>
  values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
      100
    : null;
const numeric = (records, key) =>
  records
    .map((r) => r.answers[key])
    .filter((v) => typeof v === "number" && Number.isFinite(v));
const display = (v) => (v === null ? "暂无样本" : v);

export function answerText(field, value) {
  const label = (item) =>
    field.options?.find((option) => option.value === item)?.label ??
    String(item);
  return Array.isArray(value)
    ? value.map(label).join("、")
    : field.options
      ? label(value)
      : String(value);
}

function distributions(tool, records) {
  const sections = [];
  for (const profile of tool.profiles) {
    const entries = records.filter((record) => record.profileId === profile.id);
    if (!entries.length) continue;
    const items = [];
    for (const field of profile.fields.filter((entry) => entry.options)) {
      const counts = new Map();
      for (const record of entries) {
        const value = record.answers[field.id];
        if (value === undefined || value === null || value === "") continue;
        for (const selection of Array.isArray(value) ? value : [value])
          counts.set(selection, (counts.get(selection) ?? 0) + 1);
      }
      if (counts.size)
        items.push(
          `${field.label}：${[...counts].map(([key, count]) => `${answerText(field, key)} ${count} 次`).join("；")}`,
        );
    }
    if (items.length)
      sections.push({ title: `${profile.name} · 选项出现频次`, items });
  }
  return sections;
}

function bodyMetrics(answer) {
  if (!(answer.weight > 0 && answer.height > 0 && answer.waist > 0)) return [];
  const bmi =
    Math.round((answer.weight / (answer.height / 100) ** 2) * 10) / 10;
  const whtr = Math.round((answer.waist / answer.height) * 100) / 100;
  return [
    {
      label: "BMI",
      value: bmi,
      note: "体重kg ÷ 身高m²，青少年需结合年龄、性别与专业标准解读",
    },
    { label: "腰围身高比", value: whtr, note: "腰围cm ÷ 身高cm" },
  ];
}

/** One saved record uses the same report structure as monthly reports. */
export function evaluateTracker(id, profileId, answers) {
  const tool = trackerTools.find((entry) => entry.id === id);
  const profile = tool.profiles.find((entry) => entry.id === profileId);
  return {
    title: `${tool.name} · ${profile.name}`,
    summary: "记录已保存。以下只呈现你填写的内容及可核对的数学指标。",
    metrics: id === "ys" && profileId === "body" ? bodyMetrics(answers) : [],
    sections: [
      {
        title: "本次记录",
        items: profile.fields
          .filter(
            (field) =>
              answers[field.id] !== undefined &&
              answers[field.id] !== "" &&
              !(Array.isArray(answers[field.id]) && !answers[field.id].length),
          )
          .map(
            (field) =>
              `${field.label}：${answerText(field, answers[field.id])}`,
          ),
      },
    ],
    notice: NOTICE,
  };
}

export function trackerReport(id, records, month) {
  const tool = trackerTools.find((entry) => entry.id === id);
  const report = {
    title: `${tool.name} · ${month} 月度回顾`,
    summary: records.length
      ? `本月记录 ${new Set(records.map((r) => r.date)).size} 天，共 ${records.length} 条。不同页签分别统计，未填写项不按零分计入。`
      : "本月还没有记录，先记下一次真实的观察。",
    metrics: [
      { label: "记录条数", value: records.length, unit: "条" },
      {
        label: "记录天数",
        value: new Set(records.map((r) => r.date)).size,
        unit: "天",
      },
    ],
    sections: [],
    notice: NOTICE,
  };
  const metric = (label, value, unit, note) =>
    report.metrics.push({
      label,
      value: display(value),
      ...(unit ? { unit } : {}),
      ...(note ? { note } : {}),
    });
  if (id === "4c1" || id === "4cr") {
    metric(
      "高光时刻",
      records.filter((r) => r.answers.isHighlight === 1).length,
      "条",
    );
    metric(
      "感觉有效的活动",
      records.filter((r) => r.answers.isEffective === 1).length,
      "条",
    );
    const weather = records.filter((r) => r.profileId === "weather");
    const calm = weather.filter((r) =>
      ["yes", "no"].includes(r.answers.calmQuick),
    );
    metric(
      "主动平静比例",
      calm.length
        ? Math.round(
            (calm.filter((r) => r.answers.calmQuick === "yes").length /
              calm.length) *
              100,
          )
        : null,
      "%",
      `仅计算已选择“能/暂时不能”的 ${calm.length} 条情绪天气记录`,
    );
    if (new Set(records.map((r) => r.date)).size < 15)
      report.sections.push({
        title: "样本提醒",
        text: "建议每月观察至少15天。本报告仍可查看，少量记录只代表已记录的片段。",
      });
  }
  if (id === "sl") {
    const hours = {
      lt5: 4.5,
      "5-6": 5.5,
      "6-7": 6.5,
      "7-8": 7.5,
      "8-9": 8.5,
      "9-10": 9.5,
      gt10: 10.5,
    };
    const recent = records.slice(-7);
    metric(
      "最近7条睡眠区间代表值均值",
      mean(recent.map((r) => hours[r.answers.sleepRange])),
      "小时",
      "按睡眠区间代表值4.5～10.5小时估算，不是精确睡眠测量",
    );
    metric("最近7条平均睡眠质量", mean(numeric(recent, "quality")), "/5");
    report.sections.push({
      title: "最近7条睡眠轨迹",
      items: recent.map(
        (r) =>
          `${r.date}：${hours[r.answers.sleepRange]}小时（区间代表值），质量 ${r.answers.quality}/5`,
      ),
    });
    if (records.length >= 5) {
      const qualities = numeric(records, "quality");
      const average =
        qualities.reduce((sum, value) => sum + value, 0) / qualities.length;
      const groups = new Map();
      const profile = tool.profiles[0];
      for (const record of records) {
        for (const field of profile.fields.filter(
          (f) =>
            ![
              "sleepRange",
              "quality",
              "mood",
              "fallAsleep",
              "nightWake",
              "note",
            ].includes(f.id),
        )) {
          const answer = record.answers[field.id];
          if (answer === undefined || answer === "") continue;
          const values = Array.isArray(answer) ? answer : [answer];
          for (const value of values) {
            const key = `${field.label} · ${answerText(field, value)}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record.answers.quality);
          }
        }
      }
      const related = [...groups]
        .filter(([, values]) => values.length >= 2)
        .map(([key, values]) => ({
          key,
          count: values.length,
          average: mean(values),
          diff:
            values.reduce((sum, value) => sum + value, 0) / values.length -
            average,
        }))
        .filter((entry) => Math.abs(entry.diff) >= 0.4)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      report.sections.push({
        title: "睡眠因素共现线索",
        items: related.length
          ? related
              .slice(0, 6)
              .map(
                (entry) =>
                  `${entry.key}：出现${entry.count}次，平均质量${entry.average}/5，比本月均值${entry.diff >= 0 ? "高" : "低"}${Math.round(Math.abs(entry.diff) * 100) / 100}。共现不代表因果。`,
              )
          : ["目前的记录尚未呈现明显的睡眠因素共现线索，可以继续观察。"],
      });
    }
  }
  if (id === "gt" || id === "gt1") {
    for (const [key, label] of id === "gt"
      ? [
          ["parentEmotion", "家长情绪强度均值"],
          ["childEmotion", "孩子情绪强度均值"],
        ]
      : [
          ["myEmotion", "我的情绪强度均值"],
          ["parentEmotion", "感受到的家长情绪强度均值"],
        ])
      metric(
        label,
        mean(numeric(records, key)),
        "/10",
        "只统计填写该字段的记录，不评定沟通质量",
      );
  }
  if (id === "sz") {
    const daily = records.filter((r) => r.profileId === "daily");
    const feedback = records.filter((r) => r.profileId === "feedback");
    metric("平均单次屏幕使用", mean(numeric(daily, "screenTime")), "分钟");
    metric("平均冲突强度", mean(numeric(daily, "conflictLevel")), "/5");
    metric(
      "影响睡眠的记录",
      daily.filter((r) => r.answers.sleepImpact === 1).length,
      "次",
    );
    metric(
      "服务反馈关系改善均值",
      mean(numeric(feedback, "relationshipImprove")),
      "/5",
    );
    metric("家长效能自评均值", mean(numeric(feedback, "parentEfficacy")), "/5");
  }
  if (id === "ys") {
    const diet = records.filter((r) => r.profileId === "diet");
    const body = records.filter((r) => r.profileId === "body");
    metric("平均饮水估计", mean(numeric(diet, "waterIntake")), "毫升");
    metric("平均运动估计", mean(numeric(diet, "exerciseDuration")), "分钟");
    metric(
      "平均饮食执行度",
      mean(
        numeric(
          records.filter((r) => r.profileId === "feedback"),
          "adherenceLevel",
        ),
      ),
      "/5",
    );
    if (body.length) {
      const last = body.at(-1);
      report.metrics.push(...bodyMetrics(last.answers));
      const rows = body.map(
        (r) =>
          `${r.date}：${r.answers.weight}kg / ${r.answers.height}cm / 腰围${r.answers.waist}cm`,
      );
      report.sections.push({ title: "身体测量轨迹", items: rows });
      report.sections.push({
        title: "指标解释",
        text: "BMI与腰围身高比根据填写的测量值计算，仅用于记录身体变化，不用于判定肥胖、超重或偏瘦。专业评估需使用适龄标准并结合发育情况。",
      });
    }
  }
  report.sections.push(...distributions(tool, records));
  const reflections = records.flatMap((r) => {
    const profile = tool.profiles.find((p) => p.id === r.profileId);
    return profile.fields
      .filter((f) => ["text", "textarea"].includes(f.type) && r.answers[f.id])
      .map((f) => `${r.date} · ${f.label}：${r.answers[f.id]}`);
  });
  if (reflections.length)
    report.sections.push({
      title: "文字观察与反思",
      items: reflections.slice(-20),
    });
  return report;
}
