import { trackerTools, evaluateTracker, trackerReport } from "./trackers.mjs";
import {
  questionnaireTools,
  evaluateQuestionnaire,
} from "./questionnaires.mjs";

export const tools = [...trackerTools, ...questionnaireTools];
export function getTool(id) {
  const tool = tools.find((entry) => entry.id === id);
  if (!tool) throw Object.assign(new Error("成长工具不存在"), { status: 404 });
  return tool;
}

export function validateAnswers(tool, profileId, source) {
  const profile = tool.profiles.find((entry) => entry.id === profileId);
  const fail = (text) => {
    throw Object.assign(new Error(text), { status: 400 });
  };
  if (!profile) fail("请选择此工具的有效记录页签或年龄版本");
  if (!source || typeof source !== "object" || Array.isArray(source))
    fail("答案需为字段对象");
  const fields = new Map(profile.fields.map((field) => [field.id, field]));
  if (Object.keys(source).some((key) => !fields.has(key)))
    fail("答案包含此版本没有的字段");
  const answers = {};
  for (const field of profile.fields) {
    const value = source[field.id];
    const missing =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && !value.length);
    if (missing) {
      if (field.required) fail(`请填写：${field.label}`);
      continue;
    }
    if (field.type === "single") {
      if (!field.options?.some((option) => option.value === value))
        fail(`${field.label}的选项无效`);
      answers[field.id] = value;
    } else if (field.type === "multi") {
      if (
        !Array.isArray(value) ||
        value.length > field.options.length ||
        value.some(
          (item) => !field.options.some((option) => option.value === item),
        )
      )
        fail(`${field.label}的选项无效`);
      answers[field.id] = [...new Set(value)];
    } else if (field.type === "number") {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (field.min !== undefined && value < field.min) ||
        (field.max !== undefined && value > field.max)
      )
        fail(`${field.label}超出可填写范围`);
      if (
        field.step !== undefined &&
        Math.abs(
          (value - (field.min ?? 0)) / field.step -
            Math.round((value - (field.min ?? 0)) / field.step),
        ) > 1e-7
      )
        fail(`${field.label}的小数精度无效`);
      answers[field.id] = value;
    } else {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > (field.max ?? (field.type === "textarea" ? 2000 : 200))
      )
        fail(`${field.label}内容无效或过长`);
      if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value))
        fail(`${field.label}日期无效`);
      if (field.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
        fail(`${field.label}时间无效`);
      answers[field.id] = value.trim();
    }
  }
  const meaningful =
    tool.id === "gt"
      ? profileId === "daily"
        ? ["trigger", "scene"]
        : ["methodUsed", "practiceScene", "courseName"]
      : tool.id === "gt1"
        ? profileId === "daily"
          ? ["myState", "topic"]
          : ["confusionDesc", "confusionScene"]
        : null;
  if (
    meaningful &&
    !meaningful.some((key) =>
      Array.isArray(answers[key]) ? answers[key].length : answers[key],
    )
  )
    fail("请至少填写一次真实情境或观察内容");
  if (!Object.keys(answers).length) fail("请至少填写一项内容");
  return answers;
}

export function evaluateTool(tool, profileId, answers) {
  return tool.mode === "tracker"
    ? evaluateTracker(tool.id, profileId, answers)
    : evaluateQuestionnaire(tool.id, profileId, answers);
}

export function reportTool(tool, records, month) {
  if (tool.mode === "tracker") return trackerReport(tool.id, records, month);
  const latest = records.at(-1);
  if (!latest)
    return {
      title: `${tool.name} · ${month} 回顾`,
      summary: "本月尚未完成此工具。",
      metrics: [{ label: "完成次数", value: 0 }],
      sections: [],
      notice: "仅供自我观察，不构成诊断。",
    };
  return {
    ...latest.result,
    title: `${tool.name} · ${month} 最近一次结果`,
    summary: `本月完成${records.length}次，以下为${latest.date}最近一次记录；不同年龄与版本不混合平均。${latest.result.summary}`,
    metrics: [
      { label: "本月完成次数", value: records.length },
      ...latest.result.metrics,
    ],
  };
}
