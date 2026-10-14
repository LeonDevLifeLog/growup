import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { productionFixture } from "../helpers/enrollment.mjs";
import { openDatabase, hashPassword } from "../../server/db.mjs";

async function fixture(t) {
  const f = await productionFixture();
  t.after(f.close);
  return { ...f, ...(await f.setup()) };
}

test("platform owns dynamic organizations and admin lifecycle; lower roles cannot change hierarchy", async (t) => {
  const f = await fixture(t);
  const regions = await f.ok("/regions");
  assert.equal(regions.regions.length, 2);
  assert.equal(
    regions.regions.some((row) => row.id === "hainan"),
    false,
  );
  assert.equal(regions.regions[0].schools.length, 2);
  for (const manager of [f.areaA, f.schoolAdminA]) {
    for (const path of ["/platform/organizations", "/platform/audit"])
      assert.equal(
        (await f.request(path, { token: manager.token })).status,
        403,
      );
    assert.equal(
      (
        await f.request("/platform/regions", {
          method: "POST",
          token: manager.token,
          body: { name: "越权大区" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request("/admins", {
          method: "POST",
          token: manager.token,
          body: {
            account: "attack",
            role: "platform_admin",
            password: f.password,
            name: "越权",
          },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request("/admin/schools", {
          method: "POST",
          token: manager.token,
          body: { name: "越权学校" },
        })
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await f.request("/admins", {
        method: "POST",
        token: f.owner.token,
        body: {
          userId: f.schoolAdminA.user.id,
          role: "school_admin",
          regionId: f.regionB.id,
          schoolId: f.schoolA.id,
          account: "mismatch",
          password: f.password,
          name: "错误归属",
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(`/admins/${f.owner.user.id}`, {
        method: "PATCH",
        token: f.owner.token,
        body: { active: false },
      })
    ).status,
    400,
  );
  const all = await f.ok("/platform/organizations", { token: f.owner.token });
  assert.equal(all.admins.length, 6);
  assert.equal(JSON.stringify(all).includes("password"), false);
  assert.equal(
    (await f.ok("/admin/schools", { token: f.areaA.token })).schools.length,
    2,
  );
  assert.deepEqual(
    (await f.ok("/admin/schools", { token: f.schoolAdminA.token })).schools.map(
      (row) => row.id,
    ),
    [f.schoolA.id],
  );
  assert.equal(
    (await f.request("/admin/overview", { token: f.owner.token })).status,
    403,
  );
});

test("school invitation closes registration, stores only hash, records use and rejects role and school injection", async (t) => {
  const f = await fixture(t);
  for (const manager of [f.areaA, f.areaB, f.owner])
    assert.equal(
      (
        await f.request("/admin/invites", {
          method: "POST",
          token: manager.token,
          body: { schoolId: f.schoolA.id, days: 30, maxUses: 3 },
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await f.request("/admin/invites", {
        method: "POST",
        token: f.schoolAdminA.token,
        body: { schoolId: f.schoolA2.id, days: 30, maxUses: 3 },
      })
    ).status,
    404,
  );
  const invitation = await f.invite(f.schoolA.id, f.schoolAdminA.token, {
    maxUses: 3,
  });
  assert.match(invitation.code, /^[A-F0-9]{24}$/);
  assert.notEqual(
    f.app.db.prepare("SELECT code FROM invites WHERE id=?").get(invitation.id)
      .code,
    invitation.code,
  );
  const preview = await f.ok("/auth/invite", {
    method: "POST",
    body: { regionId: f.regionA.id, inviteCode: invitation.code.toLowerCase() },
  });
  assert.equal(preview.invitation.schoolName, "西南第一学校");
  const result = await f.register(
    "real.student",
    f.regionA.id,
    invitation.code,
    { role: "platform_admin", schoolId: f.schoolB.id, userId: f.owner.user.id },
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.user.role, "student");
  assert.equal(result.body.user.schoolId, f.schoolA.id);
  assert.equal(
    (await f.request("/admin/invites", { token: result.body.token })).status,
    403,
  );
  assert.equal(
    (await f.request("/platform/organizations", { token: result.body.token }))
      .status,
    403,
  );
  const uses = await f.ok(`/admin/invites/${invitation.id}`, {
    token: f.schoolAdminA.token,
  });
  assert.equal(uses.invite.usedCount, 1);
  assert.equal(uses.uses[0].account, "real.student");
  assert.equal(JSON.stringify(uses).includes(invitation.code), false);
  for (const manager of [f.schoolAdminA2, f.schoolAdminB, f.areaB])
    assert.equal(
      (
        await f.request(`/admin/invites/${invitation.id}`, {
          token: manager.token,
        })
      ).status,
      404,
    );
  assert.equal(
    (await f.ok("/admin/invites", { token: f.areaA.token })).invites.length,
    1,
  );
  await f.ok("/auth/logout", { method: "POST", token: result.body.token });
  assert.equal(
    (await f.login("real.student", f.regionA.id)).user.schoolId,
    f.schoolA.id,
  );
});

test("expiry, revocation, wrong region and failed registration cannot consume quota; concurrent last seats never exceed limit", async (t) => {
  const f = await fixture(t);
  const invite = await f.invite(f.schoolA.id, f.schoolAdminA.token, {
    maxUses: 2,
  });
  assert.equal(
    (await f.register("wrong.region", f.regionB.id, invite.code)).status,
    400,
  );
  assert.equal(
    (await f.register("school.a", f.regionA.id, invite.code)).status,
    409,
  );
  assert.equal(
    f.app.db.prepare("SELECT used_count FROM invites WHERE id=?").get(invite.id)
      .used_count,
    0,
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      f.register(`seat.${i}`, f.regionA.id, invite.code),
    ),
  );
  assert.equal(results.filter((result) => result.status === 201).length, 2);
  assert.equal(results.filter((result) => result.status === 400).length, 6);
  assert.equal(
    (await f.ok(`/admin/invites/${invite.id}`, { token: f.schoolAdminA.token }))
      .uses.length,
    2,
  );
  const revoked = await f.invite(f.schoolA.id, f.schoolAdminA.token);
  await f.ok("/auth/invite", {
    method: "POST",
    body: { regionId: f.regionA.id, inviteCode: revoked.code },
  });
  assert.equal(
    (
      await f.request(`/admin/invites/${revoked.id}/revoke`, {
        method: "POST",
        token: f.areaA.token,
      })
    ).status,
    403,
  );
  await f.ok(`/admin/invites/${revoked.id}/revoke`, {
    method: "POST",
    token: f.schoolAdminA.token,
  });
  assert.equal(
    (await f.register("revoked.student", f.regionA.id, revoked.code)).status,
    400,
  );
  const expiring = await f.invite(f.schoolA.id, f.schoolAdminA.token, {
    days: 1,
  });
  f.setNow(expiring.expiresAt);
  assert.equal(
    (await f.register("expired.student", f.regionA.id, expiring.code)).status,
    400,
  );
  assert.equal(
    (
      await f.request("/auth/invite", {
        method: "POST",
        body: { regionId: f.regionA.id, inviteCode: expiring.code },
      })
    ).status,
    400,
  );
  assert.equal(
    f.app.db
      .prepare("SELECT used_count FROM invites WHERE id=?")
      .get(expiring.id).used_count,
    0,
  );
});

test("school and region boundaries apply to statistics, student details, followups, moderation and service requests", async (t) => {
  const f = await fixture(t),
    students = [];
  for (const [i, school, manager, region] of [
    [1, f.schoolA, f.schoolAdminA, f.regionA],
    [2, f.schoolA2, f.schoolAdminA2, f.regionA],
    [3, f.schoolB, f.schoolAdminB, f.regionB],
  ]) {
    const invite = await f.invite(school.id, manager.token);
    const result = await f.register(`student.${i}`, region.id, invite.code);
    assert.equal(result.status, 201);
    const student = result.body;
    await f.ok("/checkins", {
      method: "POST",
      token: student.token,
      body: { score: 2, note: "私密备注", tags: ["私密标签"] },
    });
    const post = await f.create(
      "/posts",
      { nickname: "匿名同学", topic: "成长烦恼", content: `学校${i}的纸条` },
      student.token,
    );
    const service = await f.create(
      "/service-requests",
      { type: "校园成长服务", message: `学校${i}的需求` },
      student.token,
    );
    students.push({ ...student, post: post.post, service: service.request });
  }
  assert.equal(
    (await f.ok("/admin/overview", { token: f.schoolAdminA.token })).stats
      .students,
    1,
  );
  assert.equal(
    (await f.ok("/admin/overview", { token: f.areaA.token })).stats.students,
    2,
  );
  assert.equal(
    (await f.ok("/admin/overview", { token: f.schoolAdminA.token })).stats
      .todayCheckins,
    1,
  );
  const own = students[0],
    other = students[1],
    outside = students[2];
  for (const target of [other, outside]) {
    for (const [path, method, body] of [
      [`/admin/students/${target.user.id}`, "GET"],
      [`/admin/students/${target.user.id}/followups`, "POST", { note: "越权" }],
      [
        `/admin/posts/${target.post.id}/moderate`,
        "POST",
        { status: "approved" },
      ],
      [
        `/admin/service-requests/${target.service.id}`,
        "POST",
        { status: "handled" },
      ],
    ])
      assert.equal(
        (await f.request(path, { token: f.schoolAdminA.token, method, body }))
          .status,
        404,
        path,
      );
  }
  assert.equal(
    (
      await f.request(`/admin/students/${outside.user.id}`, {
        token: f.areaA.token,
      })
    ).status,
    404,
  );
  assert.equal(
    (await f.ok("/admin/posts?status=all", { token: f.schoolAdminA.token }))
      .posts.length,
    1,
  );
  assert.equal(
    (await f.ok("/admin/posts?status=all", { token: f.areaA.token })).posts
      .length,
    2,
  );
  assert.equal(
    (await f.ok("/admin/service-requests", { token: f.schoolAdminA.token }))
      .requests.length,
    1,
  );
  assert.equal(
    (await f.ok("/admin/service-requests", { token: f.areaA.token })).requests
      .length,
    2,
  );
  await f.create(
    `/admin/students/${own.user.id}/followups`,
    { note: "本校跟进" },
    f.schoolAdminA.token,
  );
  await f.ok(`/admin/posts/${own.post.id}/moderate`, {
    method: "POST",
    token: f.schoolAdminA.token,
    body: { status: "approved" },
  });
  await f
    .create(
      `/posts/${own.post.id}/replies`,
      { nickname: "外校同学", content: "同区回应" },
      other.token,
    )
    .catch((error) => {
      throw error;
    });
  const reply = f.app.db
    .prepare("SELECT id FROM replies WHERE post_id=?")
    .get(own.post.id);
  assert.equal(
    (
      await f.request(`/admin/replies/${reply.id}/moderate`, {
        method: "POST",
        token: f.schoolAdminA.token,
        body: { status: "approved" },
      })
    ).status,
    404,
  );
  await f.ok(`/admin/replies/${reply.id}/moderate`, {
    method: "POST",
    token: f.areaA.token,
    body: { status: "approved" },
  });
  const managed = await f.ok(`/admin/students/${own.user.id}`, {
    token: f.schoolAdminA.token,
  });
  assert.equal(JSON.stringify(managed).includes("私密备注"), false);
  assert.equal(JSON.stringify(managed).includes("私密标签"), false);
});

test("organization and account disable invalidate sessions; password reset and self change revoke old tokens without audit secrets", async (t) => {
  const f = await fixture(t);
  const patch = (kind, id, body) =>
    f.ok(kind === "admins" ? `/admins/${id}` : `/platform/${kind}/${id}`, {
      method: "PATCH",
      token: f.owner.token,
      body,
    });
  const invite = await f.invite(f.schoolA.id, f.schoolAdminA.token);
  await patch("schools", f.schoolA.id, { active: false });
  assert.equal(
    (await f.request("/admin/overview", { token: f.schoolAdminA.token }))
      .status,
    401,
  );
  assert.equal(
    (await f.register("disabled.school", f.regionA.id, invite.code)).status,
    400,
  );
  await patch("schools", f.schoolA.id, { active: true, name: "已更名学校" });
  assert.equal(
    (await f.request("/auth/me", { token: f.schoolAdminA.token })).status,
    401,
  );
  const manager = await f.login("school.a", f.regionA.id);
  assert.equal(manager.user.schoolName, "已更名学校");
  await patch("admins", manager.user.id, { active: false });
  assert.equal(
    (await f.request("/auth/me", { token: manager.token })).status,
    401,
  );
  const newPassword = "New-Secret-For-Account-93821";
  await patch("admins", manager.user.id, {
    active: true,
    password: newPassword,
  });
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: {
          regionId: f.regionA.id,
          account: "school.a",
          password: f.password,
        },
      })
    ).status,
    401,
  );
  const reset = await f.login("school.a", f.regionA.id, newPassword);
  const changed = await f.ok("/auth/password", {
    method: "POST",
    token: reset.token,
    body: { currentPassword: newPassword, password: f.password },
  });
  assert.equal(
    (await f.request("/auth/me", { token: reset.token })).status,
    401,
  );
  assert.equal(
    (await f.ok("/auth/me", { token: changed.token })).user.id,
    manager.user.id,
  );
  const events = await f.ok("/platform/audit", { token: f.owner.token });
  assert.equal(JSON.stringify(events).includes(newPassword), false);
  await patch("regions", f.regionA.id, { active: false });
  assert.equal(
    (await f.request("/admin/students", { token: f.areaA.token })).status,
    401,
  );
  assert.equal(
    (await f.ok("/regions")).regions.some((row) => row.id === f.regionA.id),
    false,
  );
  assert.equal(
    (await f.register("disabled.area", f.regionA.id, invite.code)).status,
    400,
  );
});

test("legacy database upgrade preserves referenced data and maps admin to region scope without creating demo data", () => {
  const directory = mkdtempSync(join(tmpdir(), "growup-legacy-"));
  const path = join(directory, "legacy.sqlite");
  try {
    const legacy = new DatabaseSync(path);
    legacy.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE regions(id TEXT PRIMARY KEY,name TEXT NOT NULL);
      CREATE TABLE schools(id TEXT PRIMARY KEY,region_id TEXT NOT NULL REFERENCES regions(id),name TEXT NOT NULL);
      CREATE TABLE users(id TEXT PRIMARY KEY,account TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('student','admin')),region_id TEXT NOT NULL REFERENCES regions(id),school_id TEXT NOT NULL REFERENCES schools(id),created_at TEXT NOT NULL);
      CREATE TABLE invites(code TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),active INTEGER NOT NULL DEFAULT 1);
      INSERT INTO regions VALUES('legacy-area','旧大区'); INSERT INTO schools VALUES('legacy-school','legacy-area','真实旧学校');
      INSERT INTO invites VALUES('LEGACYCODE','legacy-school',1);`);
    legacy
      .prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)")
      .run(
        "legacy-admin",
        "old.admin",
        hashPassword("Existing-Password"),
        "旧管理员",
        "admin",
        "legacy-area",
        "legacy-school",
        "2026-01-01T00:00:00.000Z",
      );
    legacy.exec(`CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL);
      INSERT INTO sessions VALUES('preserved-session','legacy-admin','2026-12-01T00:00:00.000Z');`);
    legacy.exec(
      "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1; UPDATE users SET active=0 WHERE id='legacy-admin'",
    );
    legacy.close();
    const db = openDatabase(path, false, new Date("2026-10-14T00:00:00Z"));
    try {
      const user = db.prepare("SELECT * FROM users").get();
      assert.equal(user.role, "region_admin");
      assert.equal(user.active, 0);
      assert.equal(user.school_id, null);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM regions").get().n, 1);
      assert.equal(
        db.prepare("SELECT name FROM schools").get().name,
        "真实旧学校",
      );
      assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
      assert.equal(
        db
          .prepare(
            "SELECT user_id FROM sessions WHERE token_hash='preserved-session'",
          )
          .get().user_id,
        "legacy-admin",
      );
      const invite = db.prepare("SELECT * FROM invites").get();
      assert.equal(
        invite.code,
        createHash("sha256").update("LEGACYCODE").digest("hex"),
      );
      assert.equal(invite.active, 1);
      assert.equal(invite.used_count, 0);
    } finally {
      db.close();
    }
    const reopened = openDatabase(path, false, new Date());
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("user directory owns identities and assignments reuse accounts while revoking previous scope", async (t) => {
  const f = await fixture(t);
  const staff = await f.create("/users", {
    account: "existing.staff",
    name: "既有工作人员",
    password: f.password,
    role: "platform_admin",
  });
  const ownerOptions = { token: f.owner.token };
  const target = f.app.db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(staff.id);
  assert.equal(target.role, "user");
  assert.equal(
    (
      await f.ok("/platform/organizations", { token: f.owner.token })
    ).admins.some((row) => row.id === staff.id),
    false,
  );
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: { account: "existing.staff", password: f.password },
      })
    ).status,
    403,
  );
  const search = await f.ok("/users?q=existing.staff", ownerOptions);
  assert.equal(search.total, 1);
  assert.equal(search.users[0].id, staff.id);
  assert.equal(JSON.stringify(search).includes("password"), false);
  const count = f.app.db.prepare("SELECT COUNT(*) n FROM users").get().n;
  const appoint = (body) =>
    f.ok("/admins", {
      method: "POST",
      token: f.owner.token,
      body: { userId: staff.id, ...body },
    });
  await appoint({
    role: "school_admin",
    regionId: f.regionA.id,
    schoolId: f.schoolA.id,
  });
  let manager = await f.login("existing.staff", f.regionA.id);
  assert.equal(manager.user.id, staff.id);
  assert.equal(
    f.app.db.prepare("SELECT password_hash FROM users WHERE id=?").get(staff.id)
      .password_hash,
    target.password_hash,
  );
  const teacherRequest = await f.create(
    "/service-requests",
    {
      formId: "r22",
      answers: Object.fromEntries(
        (await f.ok("/service-forms", { token: manager.token })).forms
          .find((form) => form.id === "r22")
          .profiles[0].fields.filter((field) => field.required)
          .map((field) => [
            field.id,
            field.type === "single"
              ? field.options[0].value
              : field.type === "multi"
                ? [field.options[0].value]
                : field.type === "number"
                  ? (field.min ?? 1)
                  : "真实教师需求",
          ]),
      ),
    },
    manager.token,
  );
  await appoint({ role: "region_admin", regionId: f.regionB.id });
  assert.equal(
    (await f.request("/auth/me", { token: manager.token })).status,
    401,
  );
  manager = await f.login("existing.staff", f.regionB.id);
  assert.equal(manager.user.role, "region_admin");
  assert.equal(manager.user.schoolId, null);
  assert.equal(
    (
      await f.ok("/admin/service-requests", { token: manager.token })
    ).requests.some((row) => row.id === teacherRequest.request.id),
    false,
  );
  assert.equal(
    (
      await f.ok("/admin/service-requests", { token: f.areaA.token })
    ).requests.some((row) => row.id === teacherRequest.request.id),
    true,
  );
  assert.equal(
    (
      await f.request(`/admin/students/${"student-hainan"}`, {
        token: manager.token,
      })
    ).status,
    404,
  );
  assert.equal(f.app.db.prepare("SELECT COUNT(*) n FROM users").get().n, count);
  await f.ok(`/admins/${staff.id}/revoke`, {
    method: "POST",
    token: f.owner.token,
    body: {},
  });
  assert.equal(
    (await f.request("/auth/me", { token: manager.token })).status,
    401,
  );
  assert.equal(
    f.app.db.prepare("SELECT role FROM users WHERE id=?").get(staff.id).role,
    "user",
  );
  await f.ok(`/users/${staff.id}`, {
    method: "PATCH",
    token: f.owner.token,
    body: { active: false },
  });
  assert.equal(
    (
      await f.request("/admins", {
        method: "POST",
        token: f.owner.token,
        body: { userId: staff.id, role: "platform_admin" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.ok("/users?assignable=1", { token: f.schoolAdminA.token })
    ).users.some((row) => row.id === staff.id),
    false,
  );
  assert.equal(
    (
      await f.request("/users", {
        token: f.owner.token,
        method: "POST",
        body: { account: "existing.staff", name: "重复", password: f.password },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request("/admins", {
        token: f.owner.token,
        method: "POST",
        body: {
          userId: f.owner.user.id,
          role: "region_admin",
          regionId: f.regionA.id,
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(`/admins/${f.owner.user.id}/revoke`, {
        token: f.owner.token,
        method: "POST",
        body: {},
      })
    ).status,
    400,
  );
  const invitation = await f.invite(f.schoolA.id, f.schoolAdminA.token);
  const student = (
    await f.register("directory.student", f.regionA.id, invitation.code)
  ).body;
  assert.equal(
    (
      await f.request("/admins", {
        token: f.owner.token,
        method: "POST",
        body: {
          userId: student.user.id,
          role: "region_admin",
          regionId: f.regionA.id,
        },
      })
    ).status,
    400,
  );
  const candidates = await f.ok("/users?assignable=1", ownerOptions);
  assert.equal(
    candidates.users.some((row) => row.id === student.user.id),
    false,
  );
});

test("user directory pagination, filters, disable and password reset remain platform-only", async (t) => {
  const f = await fixture(t);
  const staff = await f.create("/users", {
    account: "search.person",
    name: "可检索用户",
    password: f.password,
  });
  const digest = f.app.db
    .prepare("SELECT password_hash FROM users WHERE id=?")
    .get(staff.id).password_hash;
  const insert = f.app.db.prepare(
    "INSERT INTO users (id,account,password_hash,name,role,created_at) VALUES (?,?,?,?,'user',?)",
  );
  for (let i = 0; i < 53; i++)
    insert.run(
      "list-" + i,
      "list." + i,
      digest,
      "列表用户" + i,
      new Date().toISOString(),
    );
  const options = { token: f.owner.token };
  const first = await f.ok("/users?role=user", options),
    second = await f.ok("/users?role=user&page=2", options);
  assert.equal(first.total, 54);
  assert.equal(first.users.length, 50);
  assert.equal(second.users.length, 4);
  assert.equal(
    new Set([...first.users, ...second.users].map((row) => row.id)).size,
    54,
  );
  assert.equal((await f.request("/users?page=Infinity", options)).status, 400);
  assert.equal((await f.ok("/users?q=可检索", options)).users[0].id, staff.id);
  await f.ok("/admins", {
    method: "POST",
    token: f.owner.token,
    body: {
      userId: staff.id,
      role: "school_admin",
      regionId: f.regionA.id,
      schoolId: f.schoolA.id,
    },
  });
  const manager = await f.login("search.person", f.regionA.id);
  await f.ok(`/users/${staff.id}`, {
    method: "PATCH",
    token: f.owner.token,
    body: { name: "已更名", password: "Reset-For-Staff-92929" },
  });
  assert.equal(
    (await f.request("/auth/me", { token: manager.token })).status,
    401,
  );
  const reset = await f.login(
    "search.person",
    f.regionA.id,
    "Reset-For-Staff-92929",
  );
  assert.equal(reset.user.name, "已更名");
  await f.ok(`/users/${staff.id}`, {
    method: "PATCH",
    token: f.owner.token,
    body: { active: false },
  });
  assert.equal(
    (await f.request("/auth/me", { token: reset.token })).status,
    401,
  );
  assert.equal(
    JSON.stringify(await f.ok("/platform/audit", options)).includes(
      "Reset-For-Staff-92929",
    ),
    false,
  );
});

test("scoped administrators manage only lower roles in their own region or school", async (t) => {
  const f = await fixture(t);
  const as = (manager) => ({ token: manager.token });
  const send = (manager, path, method, body = {}) =>
    f.request(path, { method, token: manager.token, body });
  const ids = (list) => list.users.map((row) => row.id);
  const schoolAInvite = await f.invite(f.schoolA.id, f.schoolAdminA.token);
  const schoolA2Invite = await f.invite(f.schoolA2.id, f.schoolAdminA2.token);
  const schoolBInvite = await f.invite(f.schoolB.id, f.schoolAdminB.token);
  const studentA = (
    await f.register("scope.student.a", f.regionA.id, schoolAInvite.code)
  ).body.user;
  const studentA2 = (
    await f.register("scope.student.a2", f.regionA.id, schoolA2Invite.code)
  ).body.user;
  const studentB = (
    await f.register("scope.student.b", f.regionB.id, schoolBInvite.code)
  ).body.user;
  const unscoped = await f.create("/users", {
    account: "platform.staff",
    name: "平台工作人员",
    password: f.password,
  });

  const regionList = ids(await f.ok("/users", as(f.areaA)));
  for (const id of [
    f.schoolAdminA.user.id,
    f.schoolAdminA2.user.id,
    studentA.id,
    studentA2.id,
  ])
    assert.equal(regionList.includes(id), true);
  for (const id of [
    f.owner.user.id,
    f.areaA.user.id,
    f.areaB.user.id,
    f.schoolAdminB.user.id,
    studentB.id,
    unscoped.id,
  ])
    assert.equal(regionList.includes(id), false);
  assert.deepEqual((await f.ok("/users", as(f.areaA))).assignableRoles, [
    "school_admin",
  ]);
  assert.deepEqual(
    (await f.ok("/users?role=region_admin", as(f.areaA))).users,
    [],
  );
  const schoolList = await f.ok("/users", as(f.schoolAdminA));
  assert.deepEqual(ids(schoolList), [studentA.id]);
  assert.deepEqual(schoolList.assignableRoles, []);

  // Region administrators create staff inside their region and appoint school administrators only.
  assert.equal(
    (
      await send(f.areaA, "/users", "POST", {
        account: "cross.region",
        name: "跨区",
        password: f.password,
        regionId: f.regionB.id,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await send(f.areaA, "/users", "POST", {
        account: "cross.school",
        name: "跨区学校",
        password: f.password,
        schoolId: f.schoolB.id,
      })
    ).status,
    400,
  );
  const teacher = await f.create(
    "/users",
    {
      account: "region.teacher",
      name: "大区教师",
      password: f.password,
      schoolId: f.schoolA2.id,
    },
    f.areaA.token,
  );
  let row = f.app.db.prepare("SELECT * FROM users WHERE id=?").get(teacher.id);
  assert.deepEqual(
    [row.role, row.region_id, row.school_id],
    ["user", f.regionA.id, f.schoolA2.id],
  );
  assert.equal(
    ids(await f.ok("/users?q=region.teacher", as(f.areaB))).length,
    0,
  );
  for (const [body, status] of [
    [{ role: "platform_admin" }, 403],
    [{ role: "region_admin", regionId: f.regionA.id }, 403],
    [{ role: "school_admin", schoolId: f.schoolB.id }, 400],
    [
      { role: "school_admin", regionId: f.regionB.id, schoolId: f.schoolB.id },
      403,
    ],
  ])
    assert.equal(
      (await send(f.areaA, "/admins", "POST", { userId: teacher.id, ...body }))
        .status,
      status,
    );
  for (const userId of [f.areaB.user.id, f.schoolAdminB.user.id, unscoped.id])
    assert.equal(
      (
        await send(f.areaA, "/admins", "POST", {
          userId,
          role: "school_admin",
          schoolId: f.schoolA.id,
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await send(f.areaA, "/admins", "POST", {
        userId: studentA.id,
        role: "school_admin",
        schoolId: f.schoolA.id,
      })
    ).status,
    400,
  );
  await f.ok("/admins", {
    method: "POST",
    token: f.areaA.token,
    body: { userId: teacher.id, role: "school_admin", schoolId: f.schoolA.id },
  });
  const teacherSession = await f.login("region.teacher", f.regionA.id);
  assert.equal(teacherSession.user.role, "school_admin");
  assert.equal(teacherSession.user.schoolId, f.schoolA.id);

  // Peers, superiors and other regions are outside the directory scope.
  for (const id of [
    f.owner.user.id,
    f.areaA.user.id,
    f.areaB.user.id,
    f.schoolAdminB.user.id,
    studentB.id,
  ]) {
    assert.equal(
      (await send(f.areaA, `/users/${id}`, "PATCH", { active: false })).status,
      403,
    );
    assert.equal(
      (await send(f.areaA, `/admins/${id}/revoke`, "POST")).status,
      403,
    );
  }
  await f.ok(`/users/${studentA2.id}`, {
    method: "PATCH",
    token: f.areaA.token,
    body: { name: "大区已更名" },
  });
  await f.ok(`/admins/${teacher.id}/revoke`, {
    method: "POST",
    token: f.areaA.token,
    body: {},
  });
  assert.equal(
    (await f.request("/auth/me", { token: teacherSession.token })).status,
    401,
  );
  row = f.app.db.prepare("SELECT * FROM users WHERE id=?").get(teacher.id);
  assert.deepEqual(
    [row.role, row.region_id, row.school_id],
    ["user", f.regionA.id, f.schoolA.id],
  );
  assert.equal(
    ids(await f.ok("/users", as(f.schoolAdminA))).includes(teacher.id),
    true,
  );

  // School administrators manage their own school but cannot appoint anyone.
  for (const role of ["school_admin", "region_admin", "platform_admin"])
    assert.equal(
      (
        await send(f.schoolAdminA, "/admins", "POST", {
          userId: teacher.id,
          role,
          regionId: f.regionA.id,
          schoolId: f.schoolA.id,
        })
      ).status,
      403,
    );
  for (const id of [
    f.schoolAdminA2.user.id,
    f.areaA.user.id,
    studentA2.id,
    f.schoolAdminA.user.id,
  ])
    assert.equal(
      (await send(f.schoolAdminA, `/users/${id}`, "PATCH", { active: false }))
        .status,
      403,
    );
  assert.equal(
    (
      await send(f.schoolAdminA, "/users", "POST", {
        account: "other.school",
        name: "外校",
        password: f.password,
        schoolId: f.schoolA2.id,
      })
    ).status,
    403,
  );
  const assistant = await f.create(
    "/users",
    { account: "school.assistant", name: "学校助理", password: f.password },
    f.schoolAdminA.token,
  );
  row = f.app.db.prepare("SELECT * FROM users WHERE id=?").get(assistant.id);
  assert.deepEqual(
    [row.region_id, row.school_id],
    [f.regionA.id, f.schoolA.id],
  );
  const studentSession = await f.login("scope.student.a", f.regionA.id);
  await f.ok(`/users/${studentA.id}`, {
    method: "PATCH",
    token: f.schoolAdminA.token,
    body: { active: false },
  });
  assert.equal(
    (await f.request("/auth/me", { token: studentSession.token })).status,
    401,
  );
  const learner = await f.login("scope.student.a2", f.regionA.id);
  assert.equal((await f.request("/users", as(learner))).status, 403);
  assert.equal(
    (
      await send(learner, "/users", "POST", {
        account: "student.made",
        name: "越权",
        password: f.password,
      })
    ).status,
    403,
  );
});

test("passwords set by someone else must be replaced by their owner before using the system", async (t) => {
  const f = await fixture(t);
  const initial = "Initial-Issued-Password-1";
  const own = "Chosen-By-Owner-Password-2";
  const staff = await f.ok(
    "/users",
    {
      method: "POST",
      token: f.owner.token,
      body: { account: "first.login", name: "首次登录", password: initial },
    },
    201,
  );
  await f.ok("/admins", {
    method: "POST",
    token: f.owner.token,
    body: {
      userId: staff.id,
      role: "school_admin",
      regionId: f.regionA.id,
      schoolId: f.schoolA.id,
    },
  });
  const first = await f.login("first.login", f.regionA.id, initial);
  assert.equal(first.user.mustChangePassword, true);
  const blocked = await f.request("/admin/overview", { token: first.token });
  assert.equal(blocked.status, 403);
  assert.match(blocked.body.error, /修改初始密码/);
  assert.equal(
    (await f.ok("/auth/me", { token: first.token })).user.mustChangePassword,
    true,
  );
  assert.equal(
    (
      await f.request("/auth/password", {
        method: "POST",
        token: first.token,
        body: { currentPassword: initial, password: initial },
      })
    ).status,
    400,
  );
  const changed = await f.ok("/auth/password", {
    method: "POST",
    token: first.token,
    body: { currentPassword: initial, password: own },
  });
  assert.equal(changed.user.mustChangePassword, false);
  assert.equal(
    (await f.request("/auth/me", { token: first.token })).status,
    401,
  );
  await f.ok("/admin/overview", { token: changed.token });

  // A school administrator resetting a student's password forces the same step.
  const invite = await f.invite(f.schoolA.id, changed.token);
  const registered = await f.register(
    "reset.student",
    f.regionA.id,
    invite.code,
  );
  assert.equal(registered.body.user.mustChangePassword, false);
  await f.ok(`/users/${registered.body.user.id}`, {
    method: "PATCH",
    token: changed.token,
    body: { password: initial },
  });
  const student = await f.login("reset.student", f.regionA.id, initial);
  assert.equal(student.user.mustChangePassword, true);
  assert.equal(
    (await f.request("/dashboard", { token: student.token })).status,
    403,
  );
  const studentChanged = await f.ok("/auth/password", {
    method: "POST",
    token: student.token,
    body: { currentPassword: initial, password: own },
  });
  await f.ok("/dashboard", { token: studentChanged.token });

  // Owners changing or resetting their own password are not asked again.
  await f.ok(`/users/${f.owner.user.id}`, {
    method: "PATCH",
    token: f.owner.token,
    body: { password: own },
  });
  assert.equal(
    (await f.login("platform.owner", null, own)).user.mustChangePassword,
    false,
  );
});
