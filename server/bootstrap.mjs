import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db.mjs";
import { insertFirstAdmin } from "./setup.mjs";

/** First platform operator only. Credentials enter through stdin. */
export function bootstrap(
  { account, password, name },
  { dbPath = resolve(process.env.DATA_PATH ?? "data/growup.sqlite") } = {},
) {
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
  const db = openDatabase(dbPath, false, new Date());
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      insertFirstAdmin(
        db,
        {
          account: account.toLowerCase(),
          name: name.trim(),
          password,
        },
        new Date().toISOString(),
        (status, message) => {
          throw new Error(
            status === 409 && message.startsWith("系统已完成")
              ? "平台管理员已存在，请通过管理后台维护账号"
              : message,
          );
        },
      );
      db.exec("COMMIT");
      return {
        created: true,
        account: account.toLowerCase(),
        role: "platform_admin",
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
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
    console.log(JSON.stringify(bootstrap(JSON.parse(input))));
  } catch (error) {
    console.error(`初始化失败：${error.message}`);
    process.exitCode = 1;
  }
}
