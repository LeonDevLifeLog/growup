import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, statSync, createReadStream } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, hashPassword, verifyPassword } from "./db.mjs";
import { careStatus, currentStreak, shanghaiDate } from "./mood.mjs";
import {
  createPersonalApi,
  ownJournals as getOwnJournals,
} from "./personal.mjs";
import { serviceForms, formatServiceForm } from "./service-forms.mjs";
import { createEnrollmentApi, findInvite } from "./enrollment.mjs";
import { createManagementApi } from "./management.mjs";
import { createSetupApi, hasPlatformAdmin } from "./setup.mjs";
import { isCareAdmin, inCareScope, careScope } from "./permissions.mjs";

const TOPICS = ["成长烦恼", "校园日常", "家庭关系", "小小确幸"];
const SESSION_MS = 7 * 86400000;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requiredText(value, label, max, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    throw new ApiError(400, `${label}需为 ${min}–${max} 个字符`);
  }
  return value.trim();
}

function optionalText(value, label, max) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, `${label}不能超过 ${max} 个字符`);
  return value.trim();
}

function accountText(value) {
  const account = requiredText(value, "账号", 40, 3).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(account))
    throw new ApiError(400, "账号只能使用英文字母、数字、点、下划线或短横线");
  return account;
}

function passwordText(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128)
    throw new ApiError(400, "密码需为 8–128 个字符");
  return value;
}

function choice(value, choices, label) {
  if (!choices.includes(value)) throw new ApiError(400, `${label}无效`);
  return value;
}

async function readBody(req, limit = 32768) {
  const declared = req.headers["content-type"]?.split(";")[0];
  if (declared !== "application/json")
    throw new ApiError(415, "请使用 JSON 格式提交");
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw new ApiError(413, "提交内容过长");
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new ApiError(400, "JSON 内容无效");
  }
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

/** A real HTTP Server with a SQLite connection exposed for local administration/tests. */
export function createApp({
  dbPath = resolve(ROOT, "data/growup.sqlite"),
  demo = false,
  now = () => new Date(),
  staticPath = resolve(ROOT, "dist"),
  setupToken = "",
} = {}) {
  const clock = () => new Date(typeof now === "function" ? now() : now);
  const db = openDatabase(dbPath, demo, clock());
  const managementApi = createManagementApi({
    db,
    clock,
    readBody,
    requiredText,
    accountText,
    passwordText,
    ApiError,
    json,
  });
  const enrollmentApi = createEnrollmentApi({
    db,
    clock,
    readBody,
    requiredText,
    ApiError,
    json,
  });
  const personalApi = createPersonalApi({
    db,
    clock,
    readBody,
    json,
    ApiError,
  });
  const queryUser =
    db.prepare(`SELECT u.*, r.name region_name, s.name school_name,r.active region_active,s.active school_active
    FROM users u LEFT JOIN regions r ON r.id = u.region_id LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?`);
  const publicUser = (user) => ({
    id: user.id,
    account: user.account,
    name: user.name,
    role: user.role,
    regionId: user.region_id,
    regionName: user.region_name,
    schoolId: user.school_id,
    schoolName: user.school_name,
    mustChangePassword: user.must_change_password === 1,
  });
  const enabledUser = (user) =>
    user &&
    user.active === 1 &&
    (user.role === "platform_admin" ||
      (user.region_active === 1 &&
        (user.role === "region_admin" || user.school_active === 1)));
  function regionIdText(value) {
    if (
      typeof value !== "string" ||
      !db.prepare("SELECT 1 FROM regions WHERE id=? AND active=1").get(value)
    )
      throw new ApiError(400, "请选择有效的大区");
    return value;
  }
  const stamp = () => clock().toISOString();
  const today = () => shanghaiDate(clock());
  const authAttempts = new Map();
  const setupApi = createSetupApi({
    db,
    demo,
    setupToken,
    clock,
    readBody,
    requiredText,
    accountText,
    passwordText,
    ApiError,
    json,
    session,
    limitedAuth,
  });

  function session(user) {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(
      clock().getTime(),
    );
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
      tokenHash(token),
      user.id,
      clock().getTime() + SESSION_MS,
    );
    return { token, user: publicUser(user) };
  }

  function requireUser(req) {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(
      req.headers.authorization ?? "",
    );
    if (!match) throw new ApiError(401, "请先登录");
    const found = db
      .prepare(
        "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",
      )
      .get(tokenHash(match[1]), clock().getTime());
    if (!found) throw new ApiError(401, "登录已过期，请重新登录");
    const user = queryUser.get(found.user_id);
    if (!enabledUser(user))
      throw new ApiError(401, "账号或所属机构已停用，请联系管理员");
    return user;
  }

  function role(user, expected) {
    if (user.role !== expected)
      throw new ApiError(
        403,
        expected === "admin" ? "需要区域管理员权限" : "此操作仅限学生账号",
      );
  }

  function limitedAuth(req, account, operation) {
    // Schools and reverse proxies share an address. Only repeated failures for
    // the same account consume its allowance; successful sign-ins clear it.
    const key = `${req.socket.remoteAddress ?? "local"}:${operation}:${account}`;
    const moment = clock().getTime();
    let state = authAttempts.get(key);
    if (!state || moment - state.start >= 15 * 60000) {
      state = { start: moment, count: 0 };
      authAttempts.set(key, state);
    }
    state.count += 1;
    if (state.count > 30)
      throw new ApiError(429, "登录尝试过于频繁，请稍后再试");
    if (authAttempts.size > 10000) {
      for (const [ip, entry] of authAttempts)
        if (moment - entry.start >= 15 * 60000) authAttempts.delete(ip);
      while (authAttempts.size > 10000)
        authAttempts.delete(authAttempts.keys().next().value);
    }
    return () => authAttempts.delete(key);
  }

  function ownCheckins(userId) {
    return db
      .prepare(
        "SELECT id, date, score, note, tags FROM checkins WHERE user_id = ? ORDER BY date",
      )
      .all(userId)
      .map((entry) => ({ ...entry, tags: JSON.parse(entry.tags) }));
  }

  function ownJournals(userId) {
    return getOwnJournals(db, userId);
  }

  function studentData(row) {
    const checkins = db
      .prepare(
        "SELECT date, score FROM checkins WHERE user_id = ? ORDER BY date",
      )
      .all(row.id);
    const followups = db
      .prepare(
        `SELECT f.id, f.note, f.created_at createdAt, a.name adminName
      FROM followups f JOIN users a ON a.id = f.admin_id WHERE f.user_id = ? ORDER BY f.created_at DESC, f.rowid DESC`,
      )
      .all(row.id);
    return {
      id: row.id,
      name: row.name,
      account: row.account,
      schoolName: row.school_name,
      ...careStatus(checkins, today()),
      checkins,
      followups,
    };
  }

  function students(user) {
    const scope = careScope(user);
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.account, s.name school_name FROM users u
      JOIN schools s ON s.id = u.school_id WHERE ${scope.sql} AND u.role = 'student' ORDER BY u.name`,
      )
      .all(...scope.args);
    const order = { red: 0, yellow: 1, gray: 2, green: 3 };
    return rows
      .map(studentData)
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          a.name.localeCompare(b.name, "zh-CN"),
      );
  }

  function regionStudent(user, id) {
    const found = queryUser.get(id);
    if (!found || !inCareScope(user, found) || found.role !== "student")
      throw new ApiError(404, "学生不存在");
    return found;
  }

  function regionPost(user, id, approved = false) {
    const found = db
      .prepare(
        "SELECT p.*,u.school_id FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id = ? AND p.region_id = ?",
      )
      .get(id, user.region_id);
    if (
      !found ||
      (isCareAdmin(user) && !inCareScope(user, found)) ||
      (approved && found.status !== "approved")
    )
      throw new ApiError(404, "纸条不存在或暂未公开");
    return found;
  }

  function postData(post, user, admin = false) {
    const replies = db
      .prepare(
        `SELECT id, nickname, content, created_at createdAt${admin ? ", status" : ""}
    FROM replies WHERE post_id = ? ${admin ? (user.role === "school_admin" ? "AND user_id IN (SELECT id FROM users WHERE school_id=?)" : "") : "AND status = 'approved'"} ORDER BY created_at, rowid`,
      )
      .all(
        ...(admin && user.role === "school_admin"
          ? [post.id, user.school_id]
          : [post.id]),
      );
    const warmCount = db
      .prepare("SELECT COUNT(*) count FROM warms WHERE post_id = ?")
      .get(post.id).count;
    const warmed = Boolean(
      db
        .prepare(
          "SELECT 1 FROM warms WHERE post_id = ? AND user_id = ? AND date = ?",
        )
        .get(post.id, user.id, today()),
    );
    const result = {
      id: post.id,
      nickname: post.nickname,
      topic: post.topic,
      content: post.content,
      createdAt: post.created_at,
      warmCount,
      warmed,
      status: post.status,
      replies,
    };
    if (admin)
      result.reports = db
        .prepare(
          "SELECT reason, created_at createdAt FROM reports WHERE post_id = ? ORDER BY created_at DESC",
        )
        .all(post.id);
    return result;
  }

  async function api(req, res, url) {
    const path = url.pathname.slice(4);
    const method = req.method;
    if (method === "GET" && path === "/health")
      return json(res, 200, {
        ok: true,
        demo,
        needsSetup: !demo && !hasPlatformAdmin(db),
      });
    if (await setupApi(req, res, path)) return;
    if (method === "GET" && path === "/regions") {
      const regions = db
        .prepare("SELECT id, name FROM regions WHERE active=1 ORDER BY rowid")
        .all()
        .map((region) => ({
          ...region,
          schools: db
            .prepare(
              "SELECT id, name FROM schools WHERE region_id = ? AND active=1 ORDER BY name",
            )
            .all(region.id),
        }));
      return json(res, 200, { regions });
    }
    if (method === "POST" && path === "/auth/invite") {
      const body = await readBody(req);
      const clearAttempts = limitedAuth(req, "invite-check", path);
      const regionId = regionIdText(body.regionId);
      const invite = findInvite(
        db,
        requiredText(body.inviteCode, "学校邀请码", 40),
        regionId,
        clock(),
        ApiError,
      );
      clearAttempts();
      return json(res, 200, {
        invitation: {
          regionId: invite.region_id,
          regionName: invite.region_name,
          schoolId: invite.school_id,
          schoolName: invite.school_name,
          expiresAt: invite.expires_at,
        },
      });
    }
    if (method === "POST" && ["/auth/login", "/auth/register"].includes(path)) {
      const body = await readBody(req);
      const account = accountText(body.account);
      const password = passwordText(body.password);
      const clearAttempts = limitedAuth(req, account, path);
      if (path === "/auth/login") {
        const row = db
          .prepare("SELECT id, password_hash FROM users WHERE account = ?")
          .get(account);
        if (!row || !verifyPassword(password, row.password_hash))
          throw new ApiError(401, "账号或密码不正确");
        const user = queryUser.get(row.id);
        if (user.role === "user")
          throw new ApiError(403, "账号尚未分配访问权限，请联系平台管理员");
        if (!enabledUser(user))
          throw new ApiError(403, "账号或所属机构已停用，请联系平台管理员");
        if (user.role !== "platform_admin") regionIdText(body.regionId);
        if (
          user.role === "platform_admin"
            ? body.regionId != null
            : user.region_id !== body.regionId
        )
          throw new ApiError(403, "该账号不属于所选区域，请选择学校所属大区");
        clearAttempts();
        return json(res, 200, session(user));
      }
      const regionId = regionIdText(body.regionId);
      const inviteCode = requiredText(
        body.inviteCode,
        "学校邀请码",
        40,
      ).toUpperCase();
      const name = requiredText(body.name, "姓名", 40);
      const passwordHash = hashPassword(password);
      let result;
      db.exec("BEGIN IMMEDIATE");
      try {
        const invite = findInvite(db, inviteCode, regionId, clock(), ApiError);
        if (db.prepare("SELECT 1 FROM users WHERE account = ?").get(account))
          throw new ApiError(409, "该账号已被使用");
        const id = randomUUID();
        db.prepare(
          "INSERT INTO users (id,account,password_hash,name,role,region_id,school_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          id,
          account,
          passwordHash,
          name,
          "student",
          invite.region_id,
          invite.school_id,
          stamp(),
        );
        db.prepare("UPDATE invites SET used_count=used_count+1 WHERE id=?").run(
          invite.id,
        );
        db.prepare(
          "INSERT INTO invite_uses (invite_id,user_id,created_at) VALUES (?,?,?)",
        ).run(invite.id, id, stamp());
        result = session(queryUser.get(id));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      clearAttempts();
      return json(res, 201, result);
    }

    const user = requireUser(req);
    if (
      user.must_change_password === 1 &&
      !["/auth/me", "/auth/password", "/auth/logout"].includes(path)
    )
      throw new ApiError(403, "请先修改初始密码后再继续使用");
    if (await managementApi(req, res, path, user)) return;
    if (method === "GET" && path === "/auth/me")
      return json(res, 200, { user: publicUser(user) });
    if (method === "POST" && path === "/auth/logout") {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        tokenHash(req.headers.authorization.slice(7)),
      );
      return json(res, 200, { ok: true });
    }
    if (method === "POST" && path === "/auth/password") {
      const body = await readBody(req);
      const clearAttempts = limitedAuth(req, user.account, path);
      if (
        !verifyPassword(passwordText(body.currentPassword), user.password_hash)
      )
        throw new ApiError(400, "当前密码不正确");
      const password = passwordText(body.password);
      if (verifyPassword(password, user.password_hash))
        throw new ApiError(400, "新密码不能与当前密码相同");
      const digest = hashPassword(password);
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?",
        ).run(digest, user.id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        const result = session({ ...user, must_change_password: 0 });
        db.exec("COMMIT");
        clearAttempts();
        return json(res, 200, result);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    if (await personalApi(req, res, path, url, user)) return;
    if (method === "GET" && path === "/dashboard") {
      role(user, "student");
      const date = today();
      const checkins = ownCheckins(user.id);
      const journals = ownJournals(user.id);
      return json(res, 200, {
        today: date,
        checkin: checkins.find((entry) => entry.date === date) ?? null,
        checkins,
        stats: {
          totalCheckins: checkins.length,
          streak: currentStreak(checkins, date),
          journalCount: journals.length,
        },
        journals,
      });
    }
    if (method === "GET" && path === "/checkins")
      return json(res, 200, { checkins: ownCheckins(user.id) });
    if (method === "POST" && path === "/checkins") {
      role(user, "student");
      const body = await readBody(req);
      if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5)
        throw new ApiError(400, "请选择 1–5 分的心情");
      const note = optionalText(body.note, "心情备注", 500);
      const tags = body.tags ?? [];
      if (
        !Array.isArray(tags) ||
        tags.length > 6 ||
        tags.some(
          (tag) => typeof tag !== "string" || !tag.trim() || tag.length > 20,
        )
      )
        throw new ApiError(400, "最多选择 6 个标签，每个标签不超过 20 字");
      const date = today();
      db.prepare(
        `INSERT INTO checkins VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date)
        DO UPDATE SET score = excluded.score, note = excluded.note, tags = excluded.tags`,
      ).run(
        randomUUID(),
        user.id,
        date,
        body.score,
        note,
        JSON.stringify([...new Set(tags.map((tag) => tag.trim()))]),
      );
      return json(res, 200, {
        checkin: ownCheckins(user.id).find((entry) => entry.date === date),
      });
    }
    if (method === "GET" && path === "/posts") {
      role(user, "student");
      const mine = url.searchParams.get("mine") === "1";
      const topic = url.searchParams.get("topic") ?? "all";
      if (topic !== "all") choice(topic, TOPICS, "纸条主题");
      let sql = "SELECT * FROM posts WHERE region_id = ?";
      const args = [user.region_id];
      if (mine) {
        sql += " AND user_id = ?";
        args.push(user.id);
      } else sql += " AND status = 'approved'";
      if (topic !== "all") {
        sql += " AND topic = ?";
        args.push(topic);
      }
      sql += " ORDER BY created_at DESC, rowid DESC";
      return json(res, 200, {
        posts: db
          .prepare(sql)
          .all(...args)
          .map((post) => postData(post, user)),
      });
    }
    if (method === "POST" && path === "/posts") {
      role(user, "student");
      const body = await readBody(req);
      const nickname = requiredText(body.nickname, "化名", 20);
      const topic = choice(body.topic, TOPICS, "纸条主题");
      const content = requiredText(body.content, "纸条内容", 1000);
      const id = randomUUID();
      db.prepare("INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        id,
        user.id,
        user.region_id,
        nickname,
        topic,
        content,
        "pending",
        stamp(),
      );
      return json(res, 201, { post: postData(regionPost(user, id), user) });
    }
    const postAction = /^\/posts\/([^/]+)\/(warm|replies|report)$/.exec(path);
    if (method === "POST" && postAction) {
      role(user, "student");
      const [, id, action] = postAction;
      const post = regionPost(user, id, true);
      if (action === "warm") {
        const added = db
          .prepare("INSERT OR IGNORE INTO warms VALUES (?, ?, ?)")
          .run(id, user.id, today());
        if (!added.changes) throw new ApiError(409, "今天已经送过温暖了");
        return json(res, 200, {
          warmCount: postData(post, user).warmCount,
          warmed: true,
        });
      }
      const body = await readBody(req);
      if (action === "replies") {
        const nickname = requiredText(body.nickname, "化名", 20);
        const content = requiredText(body.content, "回复内容", 500);
        db.prepare("INSERT INTO replies VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          randomUUID(),
          id,
          user.id,
          nickname,
          content,
          "pending",
          stamp(),
        );
        return json(res, 201, { ok: true, status: "pending" });
      }
      const reason = requiredText(body.reason, "举报原因", 300);
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO reports VALUES (?, ?, ?, ?, ?)").run(
          randomUUID(),
          id,
          user.id,
          reason,
          stamp(),
        );
        db.prepare("UPDATE posts SET status = 'pending' WHERE id = ?").run(id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return json(res, 200, { ok: true });
    }
    if (path === "/service-forms" && method === "GET")
      return json(res, 200, { forms: serviceForms });
    if (path === "/service-requests" && method === "GET") {
      const requests = db
        .prepare(
          "SELECT id, type, message, status, created_at createdAt FROM service_requests WHERE user_id = ? ORDER BY created_at DESC, rowid DESC",
        )
        .all(user.id);
      return json(res, 200, { requests });
    }
    if (path === "/service-requests" && method === "POST") {
      if (user.role === "platform_admin")
        throw new ApiError(403, "平台账号不提交校园服务申请");
      const body = await readBody(req, 131072);
      let type, message;
      if (body.formId !== undefined) {
        try {
          ({ type, message } = formatServiceForm(body.formId, body.answers));
        } catch (error) {
          throw new ApiError(error.status ?? 400, error.message);
        }
        message = requiredText(message, "申请说明", 16000);
      } else {
        role(user, "student");
        type = requiredText(body.type, "服务类型", 60);
        message = requiredText(body.message, "申请说明", 1000);
      }
      const request = {
        id: randomUUID(),
        type,
        message,
        status: "pending",
        createdAt: stamp(),
      };
      db.prepare(
        "INSERT INTO service_requests (id,user_id,region_id,type,message,status,created_at,school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        request.id,
        user.id,
        user.region_id,
        type,
        message,
        request.status,
        request.createdAt,
        user.school_id,
      );
      return json(res, 201, { request });
    }

    if (path.startsWith("/admin/") && !isCareAdmin(user))
      throw new ApiError(403, "需要大区或学校管理员权限");
    if (
      path.startsWith("/admin/") &&
      (await enrollmentApi(req, res, path, user))
    )
      return;
    if (method === "GET" && path === "/admin/overview") {
      const list = students(user);
      const scope = careScope(user);
      const pendingPosts = db
        .prepare(
          `SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE ${scope.sql} AND
        (p.status = 'pending' OR EXISTS(SELECT 1 FROM replies r JOIN users ru ON ru.id=r.user_id WHERE r.post_id = p.id AND r.status = 'pending' ${user.role === "school_admin" ? "AND ru.school_id=u.school_id" : ""})) ORDER BY p.created_at DESC, p.rowid DESC`,
        )
        .all(...scope.args)
        .map((post) => postData(post, user, true));
      const stats = {
        students: list.length,
        todayCheckins: db
          .prepare(
            `SELECT COUNT(*) count FROM checkins c JOIN users u ON u.id = c.user_id WHERE ${scope.sql} AND u.role = 'student' AND c.date = ?`,
          )
          .get(...scope.args, today()).count,
        red: list.filter((entry) => entry.status === "red").length,
        yellow: list.filter((entry) => entry.status === "yellow").length,
        green: list.filter((entry) => entry.status === "green").length,
        pendingPosts: pendingPosts.length,
        requests: db
          .prepare(
            `SELECT COUNT(*) count FROM service_requests sr WHERE ${careScope(user, "sr").sql} AND sr.status = 'pending'`,
          )
          .get(...scope.args).count,
      };
      return json(res, 200, { stats, students: list, pendingPosts });
    }
    if (method === "GET" && path === "/admin/students")
      return json(res, 200, { students: students(user) });
    const studentMatch = /^\/admin\/students\/([^/]+)(\/followups)?$/.exec(
      path,
    );
    if (studentMatch && ["GET", "POST"].includes(method)) {
      const target = regionStudent(user, studentMatch[1]);
      if (method === "GET" && !studentMatch[2])
        return json(res, 200, { student: studentData(target) });
      if (method === "POST" && studentMatch[2]) {
        const body = await readBody(req);
        const note = requiredText(body.note, "跟进说明", 1000);
        const followup = {
          id: randomUUID(),
          note,
          createdAt: stamp(),
          adminName: user.name,
        };
        db.prepare("INSERT INTO followups VALUES (?, ?, ?, ?, ?)").run(
          followup.id,
          target.id,
          user.id,
          note,
          followup.createdAt,
        );
        return json(res, 201, { followup });
      }
    }
    if (method === "GET" && path === "/admin/posts") {
      const scope = careScope(user);
      const status = url.searchParams.get("status") ?? "pending";
      choice(status, ["all", "pending", "approved", "rejected"], "审核状态");
      // Include parents of pending replies so replies have a visible review queue.
      const condition =
        status === "all"
          ? ""
          : status === "pending"
            ? `AND (p.status = 'pending' OR EXISTS(SELECT 1 FROM replies r JOIN users ru ON ru.id=r.user_id WHERE r.post_id = p.id AND r.status = 'pending' ${user.role === "school_admin" ? "AND ru.school_id=u.school_id" : ""}))`
            : "AND p.status = ?";
      const args = [...scope.args];
      if (status !== "all" && status !== "pending") args.push(status);
      const posts = db
        .prepare(
          `SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE ${scope.sql} ${condition} ORDER BY p.created_at DESC, p.rowid DESC`,
        )
        .all(...args)
        .map((post) => postData(post, user, true));
      return json(res, 200, { posts });
    }
    const moderatePost = /^\/admin\/posts\/([^/]+)\/moderate$/.exec(path);
    if (method === "POST" && moderatePost) {
      const post = regionPost(user, moderatePost[1]);
      const body = await readBody(req);
      const status = choice(body.status, ["approved", "rejected"], "审核状态");
      db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(
        status,
        post.id,
      );
      return json(res, 200, { ok: true });
    }
    const moderateReply = /^\/admin\/replies\/([^/]+)\/moderate$/.exec(path);
    if (method === "POST" && moderateReply) {
      const scope = careScope(user);
      const reply = db
        .prepare(
          `SELECT r.id FROM replies r JOIN posts p ON p.id = r.post_id JOIN users u ON u.id=p.user_id
          JOIN users ru ON ru.id=r.user_id WHERE r.id = ? AND ${scope.sql} ${user.role === "school_admin" ? "AND ru.school_id=u.school_id" : ""}`,
        )
        .get(moderateReply[1], ...scope.args);
      if (!reply) throw new ApiError(404, "回复不存在");
      const body = await readBody(req);
      const status = choice(body.status, ["approved", "rejected"], "审核状态");
      db.prepare("UPDATE replies SET status = ? WHERE id = ?").run(
        status,
        reply.id,
      );
      return json(res, 200, { ok: true });
    }
    if (method === "GET" && path === "/admin/service-requests") {
      const scope = careScope(user, "sr");
      const requests = db
        .prepare(
          `SELECT sr.id, sr.type, sr.message, sr.status, sr.created_at createdAt, u.name userName, s.name schoolName
        FROM service_requests sr JOIN users u ON u.id = sr.user_id LEFT JOIN schools s ON s.id = sr.school_id
        WHERE ${scope.sql} ORDER BY sr.created_at DESC, sr.rowid DESC`,
        )
        .all(...scope.args);
      return json(res, 200, { requests });
    }
    const requestMatch = /^\/admin\/service-requests\/([^/]+)$/.exec(path);
    if (method === "POST" && requestMatch) {
      const scope = careScope(user, "sr");
      const request = db
        .prepare(
          `SELECT sr.id FROM service_requests sr JOIN users u ON u.id=sr.user_id WHERE sr.id = ? AND ${scope.sql}`,
        )
        .get(requestMatch[1], ...scope.args);
      if (!request) throw new ApiError(404, "申请不存在");
      const body = await readBody(req);
      choice(body.status, ["handled"], "处理状态");
      db.prepare(
        "UPDATE service_requests SET status = 'handled' WHERE id = ?",
      ).run(request.id);
      return json(res, 200, { ok: true });
    }
    throw new ApiError(404, "接口不存在");
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (["GET", "HEAD"].includes(req.method) && existsSync(staticPath)) {
        const decoded = decodeURIComponent(url.pathname);
        const candidate = resolve(staticPath, `.${decoded}`);
        const base = resolve(staticPath);
        if (candidate !== base && !candidate.startsWith(`${base}/`))
          throw new ApiError(404, "页面不存在");
        const file =
          existsSync(candidate) && statSync(candidate).isFile()
            ? candidate
            : resolve(base, "index.html");
        if (!existsSync(file)) throw new ApiError(404, "请先构建网页端");
        res.writeHead(200, {
          "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        });
        if (req.method === "HEAD") res.end();
        else
          createReadStream(file)
            .on("error", () => res.destroy())
            .pipe(res);
        return;
      }
      throw new ApiError(404, "页面不存在");
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (!(error instanceof ApiError)) console.error("Request failed:", error);
      json(res, error instanceof ApiError ? error.status : 500, {
        error:
          error instanceof ApiError
            ? error.message
            : "服务暂时不可用，请稍后再试",
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.db = db;
  server.once("close", () => db.close());
  return server;
}
