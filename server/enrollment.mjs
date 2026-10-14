import { createHash, randomBytes, randomUUID } from "node:crypto";
import { careScope } from "./permissions.mjs";

export const inviteHash = (code) =>
  createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

// Upgrade the original three-column table without removing accounts or schools.
export function migrateInvites(db, now) {
  const columns = new Set(
    db
      .prepare("PRAGMA table_info(invites)")
      .all()
      .map((row) => row.name),
  );
  if (!columns.has("id")) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(`ALTER TABLE invites RENAME TO legacy_invites;
        CREATE TABLE invites (
          code TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), active INTEGER NOT NULL DEFAULT 1,
          id TEXT NOT NULL UNIQUE, code_hint TEXT NOT NULL, created_by TEXT REFERENCES users(id),
          created_at TEXT NOT NULL, expires_at TEXT NOT NULL, max_uses INTEGER NOT NULL CHECK(max_uses > 0),
          used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0), note TEXT NOT NULL DEFAULT ''
        );`);
      for (const row of db.prepare("SELECT * FROM legacy_invites").all()) {
        db.prepare(
          `INSERT INTO invites (code,school_id,active,id,code_hint,created_at,expires_at,max_uses,note)
          VALUES (?,?,?,?,?,?,?,?,?)`,
        ).run(
          inviteHash(row.code),
          row.school_id,
          row.active,
          randomUUID(),
          row.code.slice(-4),
          new Date(now).toISOString(),
          new Date(new Date(now).getTime() + 30 * 86400000).toISOString(),
          10000,
          "升级前创建的学校邀请，升级后 30 天到期",
        );
      }
      db.exec("DROP TABLE legacy_invites; COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS invite_uses (
    invite_id TEXT NOT NULL REFERENCES invites(id), user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    created_at TEXT NOT NULL, PRIMARY KEY(invite_id,user_id)
  );`);
}

export function issueInvite(
  db,
  {
    schoolId,
    createdBy = null,
    now,
    days = 30,
    maxUses = 100,
    note = "",
    code = randomBytes(12).toString("hex").toUpperCase(),
  },
) {
  const id = randomUUID();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(
    new Date(now).getTime() + days * 86400000,
  ).toISOString();
  db.prepare(
    `INSERT INTO invites (code,school_id,active,id,code_hint,created_by,created_at,expires_at,max_uses,note)
    VALUES (?,?,1,?,?,?,?,?,?,?)`,
  ).run(
    inviteHash(code),
    schoolId,
    id,
    code.slice(-4),
    createdBy,
    createdAt,
    expiresAt,
    maxUses,
    note,
  );
  return { id, code, expiresAt, maxUses };
}

export function findInvite(db, code, regionId, now, ApiError) {
  const row = db
    .prepare(
      `SELECT i.*, s.region_id, s.name school_name, r.name region_name
    FROM invites i JOIN schools s ON s.id=i.school_id JOIN regions r ON r.id=s.region_id WHERE i.code=? AND s.active=1 AND r.active=1`,
    )
    .get(inviteHash(code));
  if (!row || row.region_id !== regionId)
    throw new ApiError(400, "邀请码无效或不属于所选区域");
  if (!row.active)
    throw new ApiError(400, "该邀请码已停用，请向学校获取新的邀请码");
  if (row.expires_at <= new Date(now).toISOString())
    throw new ApiError(400, "该邀请码已过期，请向学校获取新的邀请码");
  if (row.used_count >= row.max_uses)
    throw new ApiError(400, "该邀请码名额已用完，请联系学校");
  return row;
}

export function createEnrollmentApi({
  db,
  clock,
  readBody,
  requiredText,
  ApiError,
  json,
}) {
  function schoolInRegion(id, regionId) {
    const school = db
      .prepare(
        "SELECT id,name,region_id regionId FROM schools WHERE id=? AND region_id=?",
      )
      .get(id, regionId);
    if (!school) throw new ApiError(404, "学校不存在");
    return school;
  }
  const state = (row) =>
    !row.active
      ? "revoked"
      : row.expiresAt <= clock().toISOString()
        ? "expired"
        : row.usedCount >= row.maxUses
          ? "exhausted"
          : "active";
  function list(user) {
    const scope = careScope(user, "s");
    // School rows have their own ID rather than a school_id column.
    if (user.role === "school_admin") scope.sql = "s.region_id=? AND s.id=?";
    return db
      .prepare(
        `SELECT i.id,i.school_id schoolId,s.name schoolName,i.code_hint codeHint,i.active,
      i.created_at createdAt,i.expires_at expiresAt,i.max_uses maxUses,i.used_count usedCount,i.note,u.name createdByName
      FROM invites i JOIN schools s ON s.id=i.school_id LEFT JOIN users u ON u.id=i.created_by
      WHERE ${scope.sql} ORDER BY i.created_at DESC,i.rowid DESC`,
      )
      .all(...scope.args)
      .map((row) => ({ ...row, status: state(row) }));
  }
  return async function enrollment(req, res, path, user) {
    if (req.method === "GET" && path === "/admin/schools") {
      const schools = db
        .prepare(
          `SELECT s.id,s.name,s.active,s.region_id regionId,
        (SELECT COUNT(*) FROM users u WHERE u.school_id=s.id AND u.role='student') studentCount
        FROM schools s WHERE s.region_id=? ${user.role === "school_admin" ? "AND s.id=?" : ""} ORDER BY s.name`,
        )
        .all(
          ...(user.role === "school_admin"
            ? [user.region_id, user.school_id]
            : [user.region_id]),
        );
      json(res, 200, { schools });
      return true;
    }
    if (req.method === "POST" && path === "/admin/schools") {
      throw new ApiError(403, "学校由平台管理员维护");
    }
    if (req.method === "GET" && path === "/admin/invites") {
      json(res, 200, { invites: list(user) });
      return true;
    }
    if (req.method === "POST" && path === "/admin/invites") {
      if (user.role !== "school_admin")
        throw new ApiError(403, "仅学校管理员可生成学生邀请码");
      const body = await readBody(req);
      const school = schoolInRegion(
        requiredText(body.schoolId, "学校", 80),
        user.region_id,
      );
      if (school.id !== user.school_id) throw new ApiError(404, "学校不存在");
      for (const [field, min, max, label] of [
        ["days", 1, 365, "有效天数"],
        ["maxUses", 1, 10000, "注册名额"],
      ]) {
        if (
          !Number.isInteger(body[field]) ||
          body[field] < min ||
          body[field] > max
        )
          throw new ApiError(400, `${label}需为 ${min}–${max} 的整数`);
      }
      const note = requiredText(body.note || "学校学生注册", "邀请备注", 100);
      const issued = issueInvite(db, {
        schoolId: school.id,
        createdBy: user.id,
        now: clock(),
        days: body.days,
        maxUses: body.maxUses,
        note,
      });
      json(res, 201, {
        invite: {
          ...list(user).find((row) => row.id === issued.id),
          code: issued.code,
        },
      });
      return true;
    }
    const match = /^\/admin\/invites\/([^/]+)(\/revoke)?$/.exec(path);
    if (match && ["GET", "POST"].includes(req.method)) {
      const invite = list(user).find((row) => row.id === match[1]);
      if (!invite) throw new ApiError(404, "邀请不存在");
      if (req.method === "POST" && match[2]) {
        if (user.role !== "school_admin")
          throw new ApiError(403, "仅学校管理员可停用学生邀请码");
        db.prepare("UPDATE invites SET active=0 WHERE id=?").run(invite.id);
        json(res, 200, { ok: true });
        return true;
      }
      if (req.method === "GET" && !match[2]) {
        const uses = db
          .prepare(
            `SELECT u.id,u.account,u.name,iu.created_at registeredAt FROM invite_uses iu
          JOIN users u ON u.id=iu.user_id WHERE iu.invite_id=? ORDER BY iu.created_at DESC,iu.rowid DESC`,
          )
          .all(invite.id);
        json(res, 200, { invite, uses });
        return true;
      }
    }
    return false;
  };
}
