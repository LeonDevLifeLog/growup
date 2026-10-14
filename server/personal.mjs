import { randomUUID } from "node:crypto";
import { shanghaiDate, shiftDate } from "./mood.mjs";
import { questionnaireNotice } from "./tools/questionnaires.mjs";
import {
  tools,
  getTool,
  validateAnswers,
  evaluateTool,
  reportTool,
} from "./tools/catalog.mjs";

export function ownJournals(db, userId) {
  return db
    .prepare(
      "SELECT id,title,content,created_at createdAt,mood,intensity,tags,goal FROM journals WHERE user_id = ? ORDER BY created_at DESC,rowid DESC",
    )
    .all(userId)
    .map((row) => ({ ...row, tags: JSON.parse(row.tags) }));
}

export function createPersonalApi({ db, clock, readBody, json, ApiError }) {
  const fail = (status, message) => {
    throw new ApiError(status, message);
  };
  const stamp = () => clock().toISOString();
  const dateValid = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1900-01-01" &&
    value <= shanghaiDate(clock()) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const text = (value, label, max) => {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string" || value.length > max)
      fail(400, `${label}内容无效或超过${max}字`);
    return value.trim();
  };
  const journalInput = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body))
      fail(400, "日记需为对象");
    const mood = body.mood ?? null;
    if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 5))
      fail(400, "心情需为1至5");
    const intensity = body.intensity ?? 2;
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 3)
      fail(400, "情绪强度需为1至3");
    const tags = body.tags ?? [];
    if (
      !Array.isArray(tags) ||
      tags.length > 6 ||
      tags.some(
        (tag) =>
          typeof tag !== "string" || !tag.trim() || tag.trim().length > 20,
      )
    )
      fail(400, "标签最多6个，每个1至20字");
    const content = text(body.content, "日记", 5000);
    if (!content && mood === null) fail(400, "请写下内容或选择心情");
    const title =
      text(body.title, "日记标题", 80) || (mood ? "心情随记" : "成长碎片");
    return {
      title,
      content,
      mood,
      intensity,
      tags: [...new Set(tags.map((tag) => tag.trim()))],
      goal: text(body.goal, "行动目标", 200),
    };
  };
  const insertJournal = (userId, data, createdAt = stamp()) => {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO journals (id,user_id,title,content,created_at,mood,intensity,tags,goal) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      userId,
      data.title,
      data.content,
      createdAt,
      data.mood,
      data.intensity,
      JSON.stringify(data.tags),
      data.goal,
    );
    return { id, ...data, createdAt };
  };
  const parseRecord = (row) => {
    const result = JSON.parse(row.result);
    // 历史报告也使用当前的产品说明。
    if (getTool(row.toolId).mode === "questionnaire")
      result.notice = questionnaireNotice(row.toolId);
    return { ...row, answers: JSON.parse(row.answers), result };
  };
  const recordColumns =
    "id,tool_id toolId,profile_id profileId,date,answers,result,created_at createdAt,updated_at updatedAt";
  const records = (userId, toolId) =>
    db
      .prepare(
        `SELECT ${recordColumns} FROM tool_records WHERE user_id=? AND tool_id=? ORDER BY date,created_at,rowid`,
      )
      .all(userId, toolId)
      .map(parseRecord);
  const toolInput = (tool, body) => {
    if (!body || typeof body !== "object" || Array.isArray(body))
      fail(400, "记录需为对象");
    if (!dateValid(body.date)) fail(400, "日期需为1900年至今天的有效日期");
    try {
      const answers = validateAnswers(tool, body.profileId, body.answers);
      const result = evaluateTool(tool, body.profileId, answers);
      return {
        profileId: body.profileId,
        date: body.date,
        answers,
        result: { ...result, summary: String(result.summary) },
      };
    } catch (error) {
      fail(error.status ?? 400, error.message);
    }
  };
  const saveRecord = (userId, tool, data) => {
    const existing =
      tool.mode === "tracker"
        ? db
            .prepare(
              "SELECT id FROM tool_records WHERE user_id=? AND tool_id=? AND profile_id=? AND date=?",
            )
            .get(userId, tool.id, data.profileId, data.date)
        : null;
    const updatedAt = stamp();
    const id = existing?.id ?? randomUUID();
    if (existing)
      db.prepare(
        "UPDATE tool_records SET answers=?,result=?,updated_at=? WHERE id=?",
      ).run(
        JSON.stringify(data.answers),
        JSON.stringify(data.result),
        updatedAt,
        id,
      );
    else
      db.prepare("INSERT INTO tool_records VALUES (?,?,?,?,?,?,?,?,?,?)").run(
        id,
        userId,
        tool.id,
        data.profileId,
        tool.mode,
        data.date,
        JSON.stringify(data.answers),
        JSON.stringify(data.result),
        updatedAt,
        updatedAt,
      );
    return {
      record: parseRecord(
        db
          .prepare(
            `SELECT ${recordColumns} FROM tool_records WHERE id=? AND user_id=?`,
          )
          .get(id, userId),
      ),
      status: existing ? 200 : 201,
    };
  };
  return async function personalApi(req, res, path, url, user) {
    const isPersonal =
      path === "/tools" ||
      path.startsWith("/tools/") ||
      path === "/journals" ||
      path.startsWith("/journals/");
    if (!isPersonal) return false;
    if (user.role !== "student") fail(403, "此功能仅供学生本人使用");
    const method = req.method;
    const send = (status, data) => {
      json(res, status, data);
      return true;
    };
    if (path === "/tools" && method === "GET") return send(200, { tools });
    const match = /^\/tools\/([^/]+)\/(records|report)(?:\/([^/]+))?$/.exec(
      path,
    );
    if (match) {
      let tool;
      try {
        tool = getTool(match[1]);
      } catch (error) {
        fail(error.status ?? 400, error.message);
      }
      const action = match[2];
      const recordId = match[3];
      if (action === "records" && !recordId && method === "GET")
        return send(200, { records: records(user.id, tool.id) });
      if (action === "records" && !recordId && method === "POST") {
        const data = toolInput(tool, await readBody(req, 131072));
        const saved = saveRecord(user.id, tool, data);
        return send(saved.status, { record: saved.record });
      }
      if (action === "records" && recordId && method === "DELETE") {
        const outcome = db
          .prepare(
            "DELETE FROM tool_records WHERE id=? AND user_id=? AND tool_id=?",
          )
          .run(recordId, user.id, tool.id);
        if (!outcome.changes) fail(404, "记录不存在");
        return send(200, { ok: true });
      }
      if (action === "report" && !recordId && method === "GET") {
        const month =
          url.searchParams.get("month") ?? shanghaiDate(clock()).slice(0, 7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
          fail(400, "月份需为YYYY-MM");
        return send(200, {
          report: reportTool(
            tool,
            records(user.id, tool.id).filter((row) =>
              row.date.startsWith(month),
            ),
            month,
          ),
        });
      }
    }
    if (path === "/journals" && method === "GET")
      return send(200, { journals: ownJournals(db, user.id) });
    if (path === "/journals" && method === "POST")
      return send(201, {
        journal: insertJournal(user.id, journalInput(await readBody(req))),
      });
    if (path === "/journals/map" && method === "GET") {
      const journals = ownJournals(db, user.id);
      const today = shanghaiDate(clock());
      const date = (journal) => shanghaiDate(new Date(journal.createdAt));
      const dates = new Set(journals.map(date));
      let cursor = dates.has(today) ? today : shiftDate(today, -1);
      let streak = 0;
      while (dates.has(cursor)) {
        streak++;
        cursor = shiftDate(cursor, -1);
      }
      const nodes = new Map(),
        edges = new Map();
      for (const row of journals) {
        const tags = [...new Set(row.tags)].sort();
        for (const tag of tags) {
          const node = nodes.get(tag) ?? {
            id: tag,
            label: tag,
            count: 0,
            lastDate: date(row),
          };
          node.count++;
          node.lastDate = [node.lastDate, date(row)].sort().at(-1);
          nodes.set(tag, node);
        }
        for (let i = 0; i < tags.length; i++)
          for (let j = i + 1; j < tags.length; j++) {
            const key = JSON.stringify([tags[i], tags[j]]);
            const edge = edges.get(key) ?? {
              source: tags[i],
              target: tags[j],
              weight: 0,
            };
            edge.weight++;
            edges.set(key, edge);
          }
      }
      const average = (rows) => {
        const moods = rows
          .map((row) => row.mood)
          .filter((value) => typeof value === "number");
        return moods.length
          ? Math.round(
              (moods.reduce((sum, value) => sum + value, 0) / moods.length) *
                100,
            ) / 100
          : null;
      };
      const recent = journals.filter(
        (row) => date(row) >= shiftDate(today, -6) && date(row) <= today,
      );
      const previous = journals.filter(
        (row) =>
          date(row) >= shiftDate(today, -13) &&
          date(row) <= shiftDate(today, -7),
      );
      const recentAverage = average(recent),
        previousAverage = average(previous);
      return send(200, {
        nodes: [...nodes.values()].sort(
          (a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh"),
        ),
        edges: [...edges.values()],
        stats: {
          total: journals.length,
          last7Days: recent.length,
          streak,
          moodAverage: average(journals),
          moodChange:
            recentAverage === null || previousAverage === null
              ? null
              : Math.round((recentAverage - previousAverage) * 100) / 100,
        },
        recent,
      });
    }
    const journalDelete = /^\/journals\/([^/]+)$/.exec(path);
    if (journalDelete && method === "DELETE") {
      if (
        !db
          .prepare("DELETE FROM journals WHERE id=? AND user_id=?")
          .run(journalDelete[1], user.id).changes
      )
        fail(404, "日记不存在");
      return send(200, { ok: true });
    }
    fail(404, "接口不存在");
  };
}
