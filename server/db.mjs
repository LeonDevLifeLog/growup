import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { shanghaiDate, shiftDate } from "./mood.mjs";
import { migrateInvites, issueInvite } from "./enrollment.mjs";
import { migrateIdentity } from "./permissions.mjs";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [salt, digest] = stored.split(":");
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}

export function openDatabase(dbPath, demo, now) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS regions (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY, region_id TEXT NOT NULL REFERENCES regions(id), name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, account TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','admin')),
      region_id TEXT NOT NULL REFERENCES regions(id), school_id TEXT NOT NULL REFERENCES schools(id),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5), note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]', UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      content TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), region_id TEXT NOT NULL REFERENCES regions(id),
      nickname TEXT NOT NULL, topic TEXT NOT NULL, content TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), user_id TEXT NOT NULL REFERENCES users(id),
      nickname TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS warms (
      post_id TEXT NOT NULL REFERENCES posts(id), user_id TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL,
      PRIMARY KEY(post_id, user_id, date)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), user_id TEXT NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), admin_id TEXT NOT NULL REFERENCES users(id),
      note TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), region_id TEXT NOT NULL REFERENCES regions(id),
      type TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tool_records (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), tool_id TEXT NOT NULL,
      profile_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('tracker','questionnaire')),
      date TEXT NOT NULL, answers TEXT NOT NULL, result TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tools_owner ON tool_records(user_id, tool_id, date);
    CREATE UNIQUE INDEX IF NOT EXISTS tools_daily ON tool_records(user_id, tool_id, profile_id, date) WHERE mode='tracker';
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS users_region ON users(region_id, role);
    CREATE INDEX IF NOT EXISTS posts_region_status ON posts(region_id, status);
    CREATE INDEX IF NOT EXISTS replies_post_status ON replies(post_id, status);
    CREATE INDEX IF NOT EXISTS followups_user ON followups(user_id);
    CREATE INDEX IF NOT EXISTS requests_region ON service_requests(region_id);
  `);
  const journalColumns = new Set(
    db
      .prepare("PRAGMA table_info(journals)")
      .all()
      .map((column) => column.name),
  );
  for (const [name, definition] of [
    ["mood", "INTEGER"],
    ["intensity", "INTEGER NOT NULL DEFAULT 2"],
    ["tags", "TEXT NOT NULL DEFAULT '[]'"],
    ["goal", "TEXT NOT NULL DEFAULT ''"],
  ]) {
    if (!journalColumns.has(name))
      db.exec(`ALTER TABLE journals ADD COLUMN ${name} ${definition}`);
  }
  const seeded = db
    .prepare("SELECT value FROM settings WHERE key='demo_seeded'")
    .get();
  if (seeded && !demo) {
    db.close();
    throw new Error(
      "此数据库包含演示账号，正式模式请使用单独的 DATA_PATH；演示库只能在 DEMO_MODE=1 下打开",
    );
  }
  if (
    demo &&
    !seeded &&
    db.prepare("SELECT COUNT(*) count FROM users").get().count
  ) {
    db.close();
    throw new Error(
      "已有正式账号的数据库不能导入演示数据，请为演示模式使用单独的 DATA_PATH",
    );
  }
  migrateIdentity(db);
  const region = db.prepare(
    "INSERT OR IGNORE INTO regions (id,name) VALUES (?, ?)",
  );
  const school = db.prepare(
    "INSERT OR IGNORE INTO schools (id,region_id,name) VALUES (?, ?, ?)",
  );
  for (const [id, name, schoolName] of [
    ["hainan", "海南大区", "海口向阳实验学校"],
    ["shandong", "山东大区", "济南向阳实验学校"],
    ["guangdong", "广东大区", "广州向阳实验学校"],
  ]) {
    if (demo) {
      region.run(id, name);
      school.run(`${id}-school`, id, schoolName);
    }
  }
  migrateInvites(db, now);
  if (demo && !seeded) {
    seedDemo(db, now);
  }
  return db;
}

function seedDemo(db, now) {
  const today = shanghaiDate(now);
  const stamp = new Date(now).toISOString();
  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      "INSERT OR IGNORE INTO users (id,account,password_hash,name,role,region_id,school_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const users = [
      ["student-hainan", "hainan.student", "林小满", "student", "hainan"],
      ["admin-hainan", "hainan.admin", "陈老师", "admin", "hainan"],
      ["student-red", "hainan.xiaoyu", "许小雨", "student", "hainan"],
      ["student-yellow", "hainan.yiran", "周亦然", "student", "hainan"],
      ["student-green", "hainan.muyang", "陆沐阳", "student", "hainan"],
      ["student-gray", "hainan.xingchen", "宋星辰", "student", "hainan"],
      ["student-stale", "hainan.siyuan", "苏思远", "student", "hainan"],
      ["student-shandong", "shandong.student", "张晓禾", "student", "shandong"],
      ["admin-shandong", "shandong.admin", "王老师", "admin", "shandong"],
      [
        "student-guangdong",
        "guangdong.student",
        "梁安安",
        "student",
        "guangdong",
      ],
      ["admin-guangdong", "guangdong.admin", "李老师", "admin", "guangdong"],
    ];
    for (const [id, account, name, role, regionId] of users) {
      insertUser.run(
        id,
        account,
        hashPassword("Growup123!"),
        name,
        role === "admin" ? "region_admin" : role,
        regionId,
        role === "admin" ? null : `${regionId}-school`,
        stamp,
      );
    }
    for (const [code, regionId] of [
      ["HN2026", "hainan"],
      ["SD2026", "shandong"],
      ["GD2026", "guangdong"],
    ]) {
      issueInvite(db, {
        code,
        schoolId: `${regionId}-school`,
        now,
        days: 365,
        maxUses: 10000,
        note: "本地演示邀请",
      });
    }
    const checkin = db.prepare(
      "INSERT OR IGNORE INTO checkins VALUES (?, ?, ?, ?, ?, ?)",
    );
    const histories = [
      ["student-hainan", [4, 3, 4, 5, 4, 3, 4], -1],
      ["student-red", [2, 1, 2, 2, 1, 2], 0],
      ["student-yellow", [2, 1, 2], 0],
      ["student-green", [4, 5, 4, 3, 4, 5, 4, 4], 0],
      ["student-gray", [3], -1],
      ["student-stale", [2, 2, 1, 2, 1], -4],
      ["student-shandong", [4, 3, 4], 0],
      ["student-guangdong", [3, 4], 0],
    ];
    for (const [userId, scores, offset] of histories) {
      scores.forEach((score, i) => {
        const date = shiftDate(today, offset - scores.length + 1 + i);
        checkin.run(
          `checkin-${userId}-${date}`,
          userId,
          date,
          score,
          "这是一条只有本人可见的演示心情备注。",
          JSON.stringify(["学习", "朋友"]),
        );
      });
    }
    const post = db.prepare(
      "INSERT OR IGNORE INTO posts VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const row of [
      [
        "post-light",
        "student-green",
        "hainan",
        "追光的小鹿",
        "小小确幸",
        "今天鼓起勇气举手回答了问题。虽然声音有点小，但老师笑着说我讲得很好。原来小小的一步，也能让一天亮起来。",
        "approved",
      ],
      [
        "post-cloud",
        "student-red",
        "hainan",
        "一朵慢慢的云",
        "成长烦恼",
        "最近总觉得自己怎么努力都不够。看到大家都很厉害，会有一点点羡慕。想问问，你们也有过这样的时刻吗？",
        "approved",
      ],
      [
        "post-friend",
        "student-hainan",
        "hainan",
        "橘子汽水",
        "校园日常",
        "和同桌一起完成了班级黑板报，我们画了一整片星空。第一次觉得，合作的感觉真好。",
        "approved",
      ],
      [
        "post-home",
        "student-yellow",
        "hainan",
        "小小向日葵",
        "家庭关系",
        "想和爸爸妈妈好好聊一聊我的想法，可是每次开口又会紧张。我想先写下来，再慢慢告诉他们。",
        "pending",
      ],
      [
        "post-other",
        "student-shandong",
        "shandong",
        "麦田里的风",
        "校园日常",
        "学校操场边的树叶开始变黄了，放学路上捡到了一片像小扇子的叶子。",
        "approved",
      ],
    ])
      post.run(...row, stamp);
    db.prepare(
      "INSERT OR IGNORE INTO replies VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "reply-cloud",
      "post-cloud",
      "student-green",
      "慢慢发芽",
      "我也会这样。把今天做成的一件小事记下来，会发现自己其实一直在往前走。",
      "approved",
      stamp,
    );
    db.prepare(
      "INSERT OR IGNORE INTO replies VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "reply-pending",
      "post-friend",
      "student-yellow",
      "月亮邮差",
      "听起来很棒！可以试着把黑板报拍下来，留作美好的回忆。",
      "pending",
      stamp,
    );
    db.prepare("INSERT OR IGNORE INTO warms VALUES (?, ?, ?)").run(
      "post-light",
      "student-yellow",
      today,
    );
    db.prepare("INSERT OR IGNORE INTO warms VALUES (?, ?, ?)").run(
      "post-cloud",
      "student-green",
      today,
    );
    db.prepare(
      "INSERT OR IGNORE INTO journals (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "journal-demo",
      "student-hainan",
      "给今天的自己一朵小花",
      "今天和朋友一起走了很长一段路。我们聊了喜欢的书，也约好了周末去图书馆。原来平凡的一天，也有很多值得记住的小事。",
      stamp,
    );
    db.prepare("INSERT OR IGNORE INTO followups VALUES (?, ?, ?, ?, ?)").run(
      "followup-demo",
      "student-red",
      "admin-hainan",
      "已安排本周课间关怀，先倾听孩子的近况，持续关注。",
      stamp,
    );
    db.prepare(
      "INSERT OR IGNORE INTO service_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "service-demo",
      "student-yellow",
      "hainan",
      "校园成长服务",
      "希望预约一次关于学习压力与同伴关系的成长交流。",
      "pending",
      stamp,
    );
    db.prepare("INSERT INTO settings VALUES ('demo_seeded', ?)").run(stamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
