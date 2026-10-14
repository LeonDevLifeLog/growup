import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { hashPassword } from "./db.mjs";

export const hasPlatformAdmin = (db) =>
  !!db.prepare("SELECT 1 FROM users WHERE role='platform_admin' LIMIT 1").get();

/** Shared by the web setup wizard and the command-line recovery path. */
export function insertFirstAdmin(db, { account, name, password }, stamp, fail) {
  if (hasPlatformAdmin(db)) fail(409, "系统已完成初始化，请直接登录");
  if (db.prepare("SELECT 1 FROM users WHERE account=?").get(account))
    fail(409, "该账号已存在，初始化不会覆盖已有账号");
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id,account,password_hash,name,role,region_id,school_id,created_at)
    VALUES (?,?,?,?,'platform_admin',NULL,NULL,?)`,
  ).run(id, account, hashPassword(password), name, stamp);
  return id;
}

const digest = (value) => createHash("sha256").update(String(value)).digest();

/**
 * First-run setup in the browser. Open only while no platform administrator
 * exists; an optional SETUP_TOKEN guards deployments reachable from the internet.
 */
export function createSetupApi({
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
}) {
  const needsSetup = () => !demo && !hasPlatformAdmin(db);
  const fail = (status, message) => {
    throw new ApiError(status, message);
  };
  return async function setup(req, res, path) {
    if (path !== "/setup") return false;
    if (req.method === "GET") {
      json(res, 200, {
        needsSetup: needsSetup(),
        tokenRequired: needsSetup() && !!setupToken,
      });
      return true;
    }
    if (req.method !== "POST") return false;
    if (!needsSetup()) fail(409, "系统已完成初始化，请直接登录");
    const body = await readBody(req);
    const clearAttempts = limitedAuth(req, "setup", path);
    if (
      setupToken &&
      !timingSafeEqual(digest(body.setupToken ?? ""), digest(setupToken))
    )
      fail(403, "初始化口令不正确");
    const name = requiredText(body.name, "称呼", 40);
    const account = accountText(body.account);
    const password = passwordText(body.password);
    const regionName =
      body.regionName == null || body.regionName === ""
        ? null
        : requiredText(body.regionName, "大区名称", 80);
    const schoolName =
      body.schoolName == null || body.schoolName === ""
        ? null
        : requiredText(body.schoolName, "学校名称", 80);
    if (schoolName && !regionName) fail(400, "请先填写学校所属大区");
    const stamp = clock().toISOString();
    let userId;
    db.exec("BEGIN IMMEDIATE");
    try {
      userId = insertFirstAdmin(db, { account, name, password }, stamp, fail);
      const audit = db.prepare("INSERT INTO admin_audit VALUES (?,?,?,?,?,?)");
      audit.run(
        randomUUID(),
        userId,
        "system.setup",
        userId,
        JSON.stringify({ account, name }),
        stamp,
      );
      if (regionName) {
        const regionId = randomUUID();
        db.prepare("INSERT INTO regions (id,name) VALUES (?,?)").run(
          regionId,
          regionName,
        );
        audit.run(
          randomUUID(),
          userId,
          "region.create",
          regionId,
          JSON.stringify({ name: regionName }),
          stamp,
        );
        if (schoolName) {
          const schoolId = randomUUID();
          db.prepare(
            "INSERT INTO schools (id,region_id,name) VALUES (?,?,?)",
          ).run(schoolId, regionId, schoolName);
          audit.run(
            randomUUID(),
            userId,
            "school.create",
            schoolId,
            JSON.stringify({ name: schoolName, regionId }),
            stamp,
          );
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    clearAttempts();
    const user = db
      .prepare(
        `SELECT u.*, NULL region_name, NULL school_name FROM users u WHERE u.id=?`,
      )
      .get(userId);
    json(res, 201, session(user));
    return true;
  };
}
