import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { openDatabase, hashPassword } from "./db.mjs";

/** Local operator only; credentials enter through stdin and never enter CLI args/logs. */
export function bootstrap(
  { regionId, account, password, name, inviteCode, schoolName },
  { dbPath = resolve(process.env.DATA_PATH ?? "data/growup.sqlite") } = {},
) {
  if (!["hainan", "shandong", "guangdong"].includes(regionId))
    throw new Error("regionId 必须为 hainan、shandong 或 guangdong");
  if (typeof account !== "string" || !/^[a-zA-Z0-9._-]{3,40}$/.test(account))
    throw new Error("账号需为 3–40 位英文字母、数字、点、下划线或短横线");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    throw new Error("密码需为 8–128 个字符");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 40)
    throw new Error("姓名需为 1–40 个字符");
  if (
    inviteCode !== undefined &&
    (typeof inviteCode !== "string" ||
      !/^[A-Za-z0-9_-]{4,40}$/.test(inviteCode))
  )
    throw new Error("邀请码需为 4–40 位英文字母、数字、下划线或短横线");
  if (
    schoolName !== undefined &&
    (typeof schoolName !== "string" ||
      !schoolName.trim() ||
      schoolName.trim().length > 80)
  )
    throw new Error("学校名称需为 1–80 个字符");
  const db = openDatabase(dbPath, false, new Date());
  try {
    const normalizedAccount = account.toLowerCase();
    const code = inviteCode?.toUpperCase();
    const schoolId = `${regionId}-school`;
    if (
      db.prepare("SELECT 1 FROM users WHERE account = ?").get(normalizedAccount)
    )
      throw new Error("该账号已存在，初始化不会覆盖已有账号");
    if (code && db.prepare("SELECT 1 FROM invites WHERE code = ?").get(code))
      throw new Error("该邀请码已存在，初始化不会覆盖已有邀请码");
    db.exec("BEGIN");
    try {
      if (schoolName)
        db.prepare("UPDATE schools SET name = ? WHERE id = ?").run(
          schoolName.trim(),
          schoolId,
        );
      db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        randomUUID(),
        normalizedAccount,
        hashPassword(password),
        name.trim(),
        "admin",
        regionId,
        schoolId,
        new Date().toISOString(),
      );
      if (code)
        db.prepare("INSERT INTO invites VALUES (?, ?, 1)").run(code, schoolId);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return {
      created: true,
      account: normalizedAccount,
      regionId,
      schoolId,
      ...(code ? { inviteCode: code } : {}),
    };
  } finally {
    db.close();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const input = readFileSync(0, "utf8");
    if (Buffer.byteLength(input) > 32768) throw new Error("初始化内容过长");
    const result = bootstrap(JSON.parse(input));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`初始化失败：${error.message}`);
    process.exitCode = 1;
  }
}
