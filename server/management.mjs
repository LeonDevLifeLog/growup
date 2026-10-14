import { randomUUID } from "node:crypto";
import { hashPassword } from "./db.mjs";
import {
  adminRoles,
  assignableRoles,
  directoryScope,
  inDirectoryScope,
} from "./permissions.mjs";

export function createManagementApi({
  db,
  clock,
  readBody,
  requiredText,
  accountText,
  passwordText,
  ApiError,
  json,
}) {
  function audit(user, action, target, detail, operation) {
    db.exec("BEGIN IMMEDIATE");
    try {
      operation();
      db.prepare("INSERT INTO admin_audit VALUES (?,?,?,?,?,?)").run(
        randomUUID(),
        user.id,
        action,
        target,
        JSON.stringify(detail),
        clock().toISOString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  function activeRegion(id) {
    const row =
      typeof id === "string" &&
      db.prepare("SELECT * FROM regions WHERE id=? AND active=1").get(id);
    if (!row) throw new ApiError(400, "请选择有效的大区");
    return row;
  }
  function admins() {
    return db
      .prepare(
        `SELECT u.id,u.account,u.name,u.role,u.active,u.region_id regionId,r.name regionName,
      u.school_id schoolId,s.name schoolName,u.created_at createdAt FROM users u
      LEFT JOIN regions r ON r.id=u.region_id LEFT JOIN schools s ON s.id=u.school_id
      WHERE u.role IN ('platform_admin','region_admin','school_admin') ORDER BY u.created_at,u.rowid`,
      )
      .all();
  }
  async function platform(req, res, path, user) {
    if (user.role !== "platform_admin")
      throw new ApiError(403, "需要平台管理员权限");
    if (req.method === "GET" && path === "/platform/organizations") {
      json(res, 200, {
        regions: db
          .prepare("SELECT id,name,active FROM regions ORDER BY rowid")
          .all(),
        schools: db
          .prepare(
            `SELECT s.id,s.name,s.active,s.region_id regionId,r.name regionName FROM schools s JOIN regions r ON r.id=s.region_id ORDER BY r.rowid,s.name`,
          )
          .all(),
        admins: admins(),
        // Counts only, for the onboarding checklist; no care data.
        progress: db
          .prepare(
            `SELECT
          (SELECT COUNT(*) FROM users WHERE role IN ('user','region_admin','school_admin')) staff,
          (SELECT COUNT(*) FROM users WHERE role='school_admin') schoolAdmins,
          (SELECT COUNT(*) FROM invites) invites,
          (SELECT COUNT(*) FROM users WHERE role='student') students`,
          )
          .get(),
      });
      return true;
    }
    if (
      req.method === "POST" &&
      ["/platform/regions", "/platform/schools"].includes(path)
    ) {
      const body = await readBody(req);
      const isSchool = path.endsWith("/schools");
      const name = requiredText(
        body.name,
        isSchool ? "学校名称" : "大区名称",
        80,
      );
      const regionId = isSchool ? activeRegion(body.regionId).id : null;
      const duplicate = isSchool
        ? db
            .prepare("SELECT 1 FROM schools WHERE region_id=? AND name=?")
            .get(regionId, name)
        : db.prepare("SELECT 1 FROM regions WHERE name=?").get(name);
      if (duplicate) throw new ApiError(409, "名称已存在");
      const id = randomUUID();
      audit(
        user,
        isSchool ? "school.create" : "region.create",
        id,
        { name, regionId },
        () => {
          if (isSchool)
            db.prepare(
              "INSERT INTO schools (id,region_id,name) VALUES (?,?,?)",
            ).run(id, regionId, name);
          else
            db.prepare("INSERT INTO regions (id,name) VALUES (?,?)").run(
              id,
              name,
            );
        },
      );
      json(res, 201, { id });
      return true;
    }
    const organization = /^\/platform\/(regions|schools)\/([^/]+)$/.exec(path);
    if (req.method === "PATCH" && organization) {
      const [, table, id] = organization;
      const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
      if (!row) throw new ApiError(404, "大区或学校不存在");
      const body = await readBody(req);
      if (body.active !== undefined && typeof body.active !== "boolean")
        throw new ApiError(400, "启用状态无效");
      const name =
        body.name === undefined
          ? row.name
          : requiredText(body.name, "名称", 80);
      const active =
        body.active === undefined ? row.active : Number(body.active);
      const duplicate =
        table === "schools"
          ? db
              .prepare(
                "SELECT 1 FROM schools WHERE region_id=? AND name=? AND id!=?",
              )
              .get(row.region_id, name, id)
          : db
              .prepare("SELECT 1 FROM regions WHERE name=? AND id!=?")
              .get(name, id);
      if (duplicate) throw new ApiError(409, "名称已存在");
      audit(user, `${table}.update`, id, { name, active }, () => {
        db.prepare(`UPDATE ${table} SET name=?,active=? WHERE id=?`).run(
          name,
          active,
          id,
        );
        if (!active)
          db.prepare(
            `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE ${table === "regions" ? "region_id" : "school_id"}=?)`,
          ).run(id);
      });
      json(res, 200, { ok: true });
      return true;
    }
    if (req.method === "GET" && path === "/platform/audit") {
      const events = db
        .prepare(
          `SELECT a.id,a.action,a.target_id targetId,a.detail,a.created_at createdAt,u.name actorName
        FROM admin_audit a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.rowid DESC LIMIT 100`,
        )
        .all()
        .map((row) => ({ ...row, detail: JSON.parse(row.detail) }));
      json(res, 200, { events });
      return true;
    }
    return false;
  }
  const directoryColumns = `u.id,u.account,u.name,u.role,u.active,u.region_id regionId,r.name regionName,
    u.school_id schoolId,s.name schoolName,u.created_at createdAt FROM users u
    LEFT JOIN regions r ON r.id=u.region_id LEFT JOIN schools s ON s.id=u.school_id`;
  function scopedUser(user, id, missing = "用户不存在") {
    const target =
      typeof id === "string" &&
      db.prepare("SELECT * FROM users WHERE id=?").get(id);
    if (!target) throw new ApiError(404, missing);
    if (!inDirectoryScope(user, target))
      throw new ApiError(403, "该用户不在你的管理范围内");
    return target;
  }
  function activeSchool(id, regionId) {
    const school =
      typeof id === "string" &&
      db
        .prepare(
          "SELECT id FROM schools WHERE id=? AND region_id=? AND active=1",
        )
        .get(id, regionId);
    if (!school) throw new ApiError(400, "请选择本大区有效学校");
    return school.id;
  }
  // Scoped administrators can only place accounts inside their own organization.
  function placement(user, body) {
    if (user.role === "school_admin") {
      if (
        (body.regionId || user.region_id) !== user.region_id ||
        (body.schoolId || user.school_id) !== user.school_id
      )
        throw new ApiError(403, "只能在本校建立账号");
      return [user.region_id, user.school_id];
    }
    if (user.role === "region_admin") {
      if ((body.regionId || user.region_id) !== user.region_id)
        throw new ApiError(403, "只能在本大区建立账号");
      return [
        user.region_id,
        body.schoolId ? activeSchool(body.schoolId, user.region_id) : null,
      ];
    }
    const regionId = body.regionId ? activeRegion(body.regionId).id : null;
    if (body.schoolId && !regionId)
      throw new ApiError(400, "请先选择学校所属大区");
    return [
      regionId,
      body.schoolId ? activeSchool(body.schoolId, regionId) : null,
    ];
  }
  async function directory(req, res, path, user) {
    if (!adminRoles.includes(user.role))
      throw new ApiError(403, "需要管理员权限");
    if (req.method === "GET" && path === "/users") {
      const params = new URL(req.url, "http://localhost").searchParams;
      const q = (params.get("q") || "").trim().slice(0, 80);
      const role = params.get("role") || "";
      const assignable = params.get("assignable") === "1";
      if (role && !["user", "student", ...adminRoles].includes(role))
        throw new ApiError(400, "用户类型无效");
      const page = Number(params.get("page") || 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000000)
        throw new ApiError(400, "页码无效");
      const scope = directoryScope(user);
      const where = [scope.sql],
        args = [...scope.args];
      if (q) {
        where.push("(instr(lower(u.account),lower(?))>0 OR instr(u.name,?)>0)");
        args.push(q, q);
      }
      if (role) {
        where.push("u.role=?");
        args.push(role);
      }
      if (assignable) where.push("u.active=1 AND u.role!='student'");
      const condition = where.join(" AND ");
      const total = db
        .prepare(`SELECT COUNT(*) n FROM users u WHERE ${condition}`)
        .get(...args).n;
      const users = db
        .prepare(
          `SELECT ${directoryColumns}
        WHERE ${condition} ORDER BY u.created_at DESC,u.rowid DESC LIMIT 50 OFFSET ?`,
        )
        .all(...args, (page - 1) * 50);
      json(res, 200, {
        users,
        total,
        page,
        pageSize: 50,
        assignableRoles: assignableRoles(user),
      });
      return true;
    }
    if (req.method === "POST" && path === "/users") {
      const body = await readBody(req);
      const account = accountText(body.account),
        name = requiredText(body.name, "用户称呼", 40);
      const digest = hashPassword(passwordText(body.password));
      const [regionId, schoolId] = placement(user, body);
      if (db.prepare("SELECT 1 FROM users WHERE account=?").get(account))
        throw new ApiError(409, "该账号已被使用");
      const id = randomUUID();
      audit(
        user,
        "user.create",
        id,
        { account, name, regionId, schoolId },
        () =>
          db
            .prepare(
              "INSERT INTO users (id,account,password_hash,name,role,region_id,school_id,created_at) VALUES (?,?,?,?,'user',?,?,?)",
            )
            .run(
              id,
              account,
              digest,
              name,
              regionId,
              schoolId,
              clock().toISOString(),
            ),
      );
      json(res, 201, { id });
      return true;
    }
    if (req.method === "POST" && path === "/admins") {
      const body = await readBody(req);
      if (!adminRoles.includes(body.role))
        throw new ApiError(400, "管理员角色无效");
      if (!assignableRoles(user).includes(body.role))
        throw new ApiError(403, "不能分配与自己同级或更高的管理员角色");
      const exists =
        typeof body.userId === "string" &&
        db.prepare("SELECT 1 FROM users WHERE id=?").get(body.userId);
      if (!exists) throw new ApiError(400, "请从已有用户列表选择工作人员");
      const target = scopedUser(user, body.userId);
      if (target.role === "student")
        throw new ApiError(
          400,
          "学生账号不能任命为管理员，请先在用户管理中建立工作人员账号",
        );
      if (!target.active) throw new ApiError(400, "请先启用该用户");
      if (target.id === user.id)
        throw new ApiError(400, "不能调整当前账号权限");
      let regionId = null,
        schoolId = null;
      if (body.role !== "platform_admin") {
        if (
          user.role !== "platform_admin" &&
          body.regionId &&
          body.regionId !== user.region_id
        )
          throw new ApiError(403, "只能在本大区内任命管理员");
        regionId =
          user.role === "platform_admin"
            ? activeRegion(body.regionId).id
            : user.region_id;
      }
      if (body.role === "school_admin")
        schoolId = activeSchool(body.schoolId, regionId);
      audit(
        user,
        "admin.assign",
        target.id,
        { account: target.account, role: body.role, regionId, schoolId },
        () => {
          db.prepare(
            "UPDATE users SET role=?,region_id=?,school_id=? WHERE id=?",
          ).run(body.role, regionId, schoolId, target.id);
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
        },
      );
      json(res, 200, {
        admin: db
          .prepare(`SELECT ${directoryColumns} WHERE u.id=?`)
          .get(target.id),
      });
      return true;
    }
    const revoke = /^\/admins\/([^/]+)\/revoke$/.exec(path);
    if (req.method === "POST" && revoke) {
      const target = scopedUser(user, revoke[1], "管理员不存在");
      if (!adminRoles.includes(target.role))
        throw new ApiError(404, "管理员不存在");
      if (target.id === user.id)
        throw new ApiError(400, "不能撤销当前账号权限");
      audit(
        user,
        "admin.revoke",
        target.id,
        { account: target.account },
        () => {
          // Keep the organization so the account stays in the same directory scope.
          db.prepare("UPDATE users SET role='user' WHERE id=?").run(target.id);
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
        },
      );
      json(res, 200, { ok: true });
      return true;
    }
    const userMatch = /^\/(users|admins)\/([^/]+)$/.exec(path);
    if (req.method === "PATCH" && userMatch) {
      const row = scopedUser(user, userMatch[2]);
      if (userMatch[1] === "admins" && !adminRoles.includes(row.role))
        throw new ApiError(404, "用户不存在");
      const body = await readBody(req);
      if (
        ["role", "regionId", "schoolId", "account"].some((key) =>
          Object.hasOwn(body, key),
        )
      )
        throw new ApiError(
          400,
          "账号不可修改；管理员权限与归属请通过任命功能调整",
        );
      if (body.active !== undefined && typeof body.active !== "boolean")
        throw new ApiError(400, "启用状态无效");
      const active =
        body.active === undefined ? row.active : Number(body.active);
      if (!active && row.id === user.id)
        throw new ApiError(400, "不能停用当前账号");
      const name =
        body.name === undefined
          ? row.name
          : requiredText(body.name, "用户称呼", 40);
      const digest =
        body.password === undefined
          ? row.password_hash
          : hashPassword(passwordText(body.password));
      audit(
        user,
        "user.update",
        row.id,
        { name, active, passwordReset: body.password !== undefined },
        () => {
          db.prepare(
            "UPDATE users SET name=?,active=?,password_hash=? WHERE id=?",
          ).run(name, active, digest, row.id);
          if (!active || body.password !== undefined)
            db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.id);
        },
      );
      json(res, 200, { ok: true });
      return true;
    }
    return false;
  }
  return async function management(req, res, path, user) {
    if (path.startsWith("/platform/")) return platform(req, res, path, user);
    if (/^\/(users|admins)(\/|$)/.test(path))
      return directory(req, res, path, user);
    return false;
  };
}
