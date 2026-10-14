import { randomUUID } from "node:crypto";
import { hashPassword } from "./db.mjs";
import { adminRoles } from "./permissions.mjs";

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
      WHERE u.role!='student' ORDER BY u.created_at,u.rowid`,
      )
      .all();
  }
  return async function management(req, res, path, user) {
    if (!path.startsWith("/platform/")) return false;
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
    if (req.method === "POST" && path === "/platform/admins") {
      const body = await readBody(req);
      if (!adminRoles.includes(body.role))
        throw new ApiError(400, "管理员角色无效");
      const account = accountText(body.account),
        name = requiredText(body.name, "管理员称呼", 40);
      const digest = hashPassword(passwordText(body.password));
      let regionId = null,
        schoolId = null;
      if (body.role !== "platform_admin")
        regionId = activeRegion(body.regionId).id;
      if (body.role === "school_admin") {
        const school =
          typeof body.schoolId === "string" &&
          db
            .prepare(
              "SELECT id FROM schools WHERE id=? AND region_id=? AND active=1",
            )
            .get(body.schoolId, regionId);
        if (!school) throw new ApiError(400, "请选择本大区有效学校");
        schoolId = school.id;
      }
      if (db.prepare("SELECT 1 FROM users WHERE account=?").get(account))
        throw new ApiError(409, "该账号已被使用");
      const id = randomUUID();
      audit(
        user,
        "admin.create",
        id,
        { account, role: body.role, regionId, schoolId },
        () =>
          db
            .prepare(
              `INSERT INTO users (id,account,password_hash,name,role,region_id,school_id,created_at) VALUES (?,?,?,?,?,?,?,?)`,
            )
            .run(
              id,
              account,
              digest,
              name,
              body.role,
              regionId,
              schoolId,
              clock().toISOString(),
            ),
      );
      json(res, 201, { admin: admins().find((row) => row.id === id) });
      return true;
    }
    const adminMatch = /^\/platform\/admins\/([^/]+)$/.exec(path);
    if (req.method === "PATCH" && adminMatch) {
      const row = db
        .prepare("SELECT * FROM users WHERE id=? AND role!='student'")
        .get(adminMatch[1]);
      if (!row) throw new ApiError(404, "管理员不存在");
      const body = await readBody(req);
      if (
        ["role", "regionId", "schoolId", "account"].some((key) =>
          Object.hasOwn(body, key),
        )
      )
        throw new ApiError(
          400,
          "账号、角色和归属创建后不可改动，请停用旧账号并新建",
        );
      if (body.active !== undefined && typeof body.active !== "boolean")
        throw new ApiError(400, "启用状态无效");
      const active =
        body.active === undefined ? row.active : Number(body.active);
      if (!active && row.id === user.id)
        throw new ApiError(400, "不能停用当前平台账号");
      const name =
        body.name === undefined
          ? row.name
          : requiredText(body.name, "管理员称呼", 40);
      const digest =
        body.password === undefined
          ? row.password_hash
          : hashPassword(passwordText(body.password));
      audit(
        user,
        "admin.update",
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
  };
}
