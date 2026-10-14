export const adminRoles = ["platform_admin", "region_admin", "school_admin"];
export const isCareAdmin = (user) =>
  ["region_admin", "school_admin"].includes(user.role);
export function inCareScope(user, target) {
  return (
    isCareAdmin(user) &&
    target.region_id === user.region_id &&
    (user.role !== "school_admin" || target.school_id === user.school_id)
  );
}
export function careScope(user, alias = "u") {
  return user.role === "school_admin"
    ? {
        sql: `${alias}.region_id=? AND ${alias}.school_id=?`,
        args: [user.region_id, user.school_id],
      }
    : { sql: `${alias}.region_id=?`, args: [user.region_id] };
}

// User-directory rank: an administrator manages only users with a lower rank
// inside their own organization and may appoint only lower administrator roles.
const rank = { platform_admin: 3, region_admin: 2, school_admin: 1 };
export const assignableRoles = (user) =>
  adminRoles.filter((role) =>
    user.role === "platform_admin" ? true : rank[role] < (rank[user.role] ?? 0),
  );
export function inDirectoryScope(user, target) {
  if (user.role === "platform_admin") return true;
  if (!adminRoles.includes(user.role)) return false;
  return (
    (rank[target.role] ?? 0) < rank[user.role] &&
    target.region_id === user.region_id &&
    (user.role !== "school_admin" || target.school_id === user.school_id)
  );
}
export function directoryScope(user, alias = "u") {
  if (user.role === "platform_admin") return { sql: "1=1", args: [] };
  const roles = ["user", "student", ...assignableRoles(user)]
    .map((role) => `'${role}'`)
    .join(",");
  const scope = careScope(user, alias);
  return {
    sql: `${scope.sql} AND ${alias}.role IN (${roles})`,
    args: scope.args,
  };
}

export function migrateIdentity(db) {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasActive = columns.some((column) => column.name === "active");
  const schema = db
    .prepare("SELECT sql FROM sqlite_master WHERE name='users'")
    .get().sql;
  // Unassigned staff may belong to a region or school so scoped administrators
  // can manage the accounts they create.
  if (!hasActive || !schema.includes("role='user' AND")) {
    // Rebuild with foreign keys temporarily disabled; preserve referenced IDs.
    db.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE");
    try {
      db.exec(`CREATE TABLE users_next (
        id TEXT PRIMARY KEY, account TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
        name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','student','platform_admin','region_admin','school_admin')),
        region_id TEXT REFERENCES regions(id), school_id TEXT REFERENCES schools(id), created_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
        CHECK((role='platform_admin' AND region_id IS NULL AND school_id IS NULL)
          OR (role='user' AND (school_id IS NULL OR region_id IS NOT NULL))
          OR (role='region_admin' AND region_id IS NOT NULL AND school_id IS NULL)
          OR (role IN ('student','school_admin') AND region_id IS NOT NULL AND school_id IS NOT NULL))
      );
      INSERT INTO users_next (id,account,password_hash,name,role,region_id,school_id,created_at,active)
        SELECT id,account,password_hash,name,CASE WHEN role='admin' THEN 'region_admin' ELSE role END,
          region_id,CASE WHEN role='admin' THEN NULL ELSE school_id END,created_at,${hasActive ? "active" : "1"} FROM users;
      DROP TABLE users;
      ALTER TABLE users_next RENAME TO users;
      CREATE INDEX users_region ON users(region_id,role);
      COMMIT;`);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys=ON");
    }
  }
  for (const table of ["regions", "schools"]) {
    if (
      !db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((column) => column.name === "active")
    )
      db.exec(
        `ALTER TABLE ${table} ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))`,
      );
  }
  db.exec(`CREATE TABLE IF NOT EXISTS admin_audit (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
    target_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
  );`);
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("数据库升级后外键检查失败");
}
