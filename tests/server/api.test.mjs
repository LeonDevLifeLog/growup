import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/app.mjs";
import {
  careStatus,
  currentStreak,
  shanghaiDate,
  shiftDate,
} from "../../server/mood.mjs";
import { bootstrap } from "../../server/bootstrap.mjs";

const NOW = "2026-10-14T06:00:00.000Z";
const PASSWORD = "Growup123!";

async function fixture(
  t,
  { demo = true, dbPath = ":memory:", now = NOW, setupToken = "" } = {},
) {
  let current = new Date(now);
  const app = createApp({
    dbPath,
    demo,
    setupToken,
    now: () => current,
    staticPath: "/nonexistent-growup-static",
  });
  await new Promise((done) => app.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${app.address().port}/api`;
  let closed = false;
  const close = () =>
    closed
      ? Promise.resolve()
      : new Promise((done) => {
          closed = true;
          app.close(done);
        });
  t.after(close);
  async function request(
    path,
    { method = "GET", token, body, headers = {} } = {},
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined
        ? { body: typeof body === "string" ? body : JSON.stringify(body) }
        : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  async function login(account = "hainan.student", regionId = "hainan") {
    const response = await request("/auth/login", {
      method: "POST",
      body: { account, regionId, password: PASSWORD },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
  }
  return {
    app,
    request,
    login,
    close,
    setNow: (value) => {
      current = new Date(value);
    },
  };
}

test("Shanghai calendar and exact care thresholds cover 2/3/4/5/6 days and healthy 7 days", () => {
  assert.equal(shanghaiDate("2026-10-14T15:59:59Z"), "2026-10-14");
  assert.equal(shanghaiDate("2026-10-14T16:00:00Z"), "2026-10-15");
  const history = (length, score = 2, anchor = "2026-10-14") =>
    Array.from({ length }, (_, i) => ({ date: shiftDate(anchor, -i), score }));
  for (const [days, expected] of [
    [2, "gray"],
    [3, "yellow"],
    [4, "yellow"],
    [5, "red"],
    [6, "red"],
  ]) {
    assert.deepEqual(careStatus(history(days), "2026-10-14"), {
      status: expected,
      lowDays: days,
      lastCheckin: "2026-10-14",
    });
  }
  assert.equal(careStatus(history(6, 3), "2026-10-14").status, "gray");
  assert.equal(careStatus(history(7, 3), "2026-10-14").status, "green");
  assert.equal(
    careStatus(history(7, 5, "2026-10-13"), "2026-10-14").status,
    "green",
  );
  assert.deepEqual(careStatus([], "2026-10-14"), {
    status: "gray",
    lowDays: 0,
    lastCheckin: null,
  });
});

test("gaps, recovered mood and stale records break care streaks without marking missing records green", () => {
  const checkins = [
    { date: "2026-10-14", score: 2 },
    { date: "2026-10-13", score: 2 },
    { date: "2026-10-11", score: 1 },
    { date: "2026-10-10", score: 1 },
    { date: "2026-10-09", score: 1 },
  ];
  assert.equal(careStatus(checkins, "2026-10-14").lowDays, 2);
  assert.equal(careStatus(checkins, "2026-10-14").status, "gray");
  assert.equal(currentStreak(checkins, "2026-10-14"), 2);
  checkins[0].score = 3;
  assert.equal(careStatus(checkins, "2026-10-14").lowDays, 0);
  assert.equal(careStatus(checkins, "2026-10-16").status, "gray");
  assert.equal(currentStreak(checkins, "2026-10-16"), 0);
});

test("production creates no demo accounts/invites; explicit demo adds stable fictional examples", async (t) => {
  const production = await fixture(t, { demo: false });
  assert.deepEqual((await production.request("/health")).body, {
    ok: true,
    demo: false,
    needsSetup: true,
  });
  assert.equal(
    production.app.db.prepare("SELECT COUNT(*) count FROM users").get().count,
    0,
  );
  assert.equal(
    production.app.db.prepare("SELECT COUNT(*) count FROM invites").get().count,
    0,
  );
  assert.equal((await production.request("/regions")).body.regions.length, 0);
  assert.equal(
    (
      await production.request("/auth/login", {
        method: "POST",
        body: {
          regionId: "hainan",
          account: "hainan.student",
          password: PASSWORD,
        },
      })
    ).status,
    401,
  );
  const f = await fixture(t);
  const { token } = await f.login("hainan.admin");
  const overview = await f.request("/admin/overview", { token });
  assert.equal(overview.status, 200);
  assert.deepEqual(overview.body.stats, {
    students: 6,
    todayCheckins: 3,
    red: 1,
    yellow: 1,
    green: 2,
    pendingPosts: 2,
    requests: 1,
  });
});

test("local bootstrap provisions only the first platform administrator without demo organizations", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "growup-bootstrap-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const dbPath = join(directory, "production.sqlite");
  const input = {
    account: "official.admin",
    password: PASSWORD,
    name: "平台管理员",
  };
  const provisioned = bootstrap(input, { dbPath });
  assert.equal(provisioned.role, "platform_admin");
  assert.equal(JSON.stringify(provisioned).includes(PASSWORD), false);
  assert.throws(
    () => bootstrap({ ...input, account: "another.admin" }, { dbPath }),
    /已存在/,
  );
  assert.throws(() => createApp({ dbPath, demo: true }), /正式账号/);
  const f = await fixture(t, { dbPath, demo: false });
  const admin = await f.login("official.admin", null);
  assert.equal(admin.user.role, "platform_admin");
  assert.equal(admin.user.regionId, null);
  assert.equal((await f.request("/regions")).body.regions.length, 0);
  assert.equal(
    (await f.request("/admin/overview", { token: admin.token })).status,
    403,
  );
  assert.equal(
    (await f.request("/platform/organizations", { token: admin.token })).status,
    200,
  );
});

test("login binds region; account/password, role and token fields never leak secrets", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: {
          regionId: "shandong",
          account: "hainan.student",
          password: PASSWORD,
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: {
          regionId: "hainan",
          account: "hainan.student",
          password: "Incorrect!",
        },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: {
          regionId: "unknown",
          account: "hainan.student",
          password: PASSWORD,
        },
      })
    ).status,
    400,
  );
  const session = await f.login();
  assert.equal(session.user.role, "student");
  assert.equal(session.user.regionId, "hainan");
  assert.equal(JSON.stringify(session).includes("password"), false);
  const row = f.app.db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(session.user.id);
  assert.notEqual(row.password_hash, PASSWORD);
  assert.match(row.password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(
    f.app.db
      .prepare("SELECT token_hash FROM sessions")
      .get()
      .token_hash.includes(session.token),
    false,
  );
});

test("registration uses invite school/region, rejects duplicate accounts, and ignores injected admin identity", async (t) => {
  const f = await fixture(t);
  const body = {
    regionId: "hainan",
    inviteCode: "HN2026",
    account: "new.student",
    password: PASSWORD,
    name: "新同学",
    role: "admin",
    userId: "admin-hainan",
    schoolId: "shandong-school",
  };
  const result = await f.request("/auth/register", { method: "POST", body });
  assert.equal(result.status, 201);
  assert.equal(result.body.user.role, "student");
  assert.equal(result.body.user.schoolId, "hainan-school");
  assert.notEqual(result.body.user.id, "admin-hainan");
  assert.equal(
    (await f.request("/admin/overview", { token: result.body.token })).status,
    403,
  );
  assert.equal(
    (
      await f.request("/auth/register", {
        method: "POST",
        body: { ...body, account: "NEW.STUDENT" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request("/auth/register", {
        method: "POST",
        body: { ...body, account: "bad.region", regionId: "shandong" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/auth/register", {
        method: "POST",
        body: { ...body, account: "no.invite", inviteCode: "fake" },
      })
    ).status,
    400,
  );
});

test("sessions expire exactly after 7 days and logout invalidates a bearer token", async (t) => {
  const f = await fixture(t);
  const { token } = await f.login();
  assert.equal((await f.request("/auth/me")).status, 401);
  assert.equal((await f.request("/auth/me", { token: "fake" })).status, 401);
  f.setNow("2026-10-21T05:59:59.999Z");
  assert.equal((await f.request("/auth/me", { token })).status, 200);
  f.setNow("2026-10-21T06:00:00.000Z");
  assert.equal((await f.request("/auth/me", { token })).status, 401);
  const next = await f.login();
  assert.equal(
    (await f.request("/auth/logout", { method: "POST", token: next.token }))
      .status,
    200,
  );
  assert.equal(
    (await f.request("/auth/me", { token: next.token })).status,
    401,
  );
});

test("server-owned day/user, daily upsert and Shanghai midnight prevent forged history or duplicate streaks", async (t) => {
  const f = await fixture(t, { now: "2026-10-14T15:59:59.000Z" });
  const { token } = await f.login();
  const first = await f.request("/checkins", {
    method: "POST",
    token,
    body: {
      score: 2,
      note: "私人秘密 A",
      tags: ["学习"],
      date: "2026-01-01",
      userId: "student-shandong",
      regionId: "shandong",
    },
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.checkin.date, "2026-10-14");
  const second = await f.request("/checkins", {
    method: "POST",
    token,
    body: { score: 4, note: "私人秘密 B", tags: ["朋友", "朋友"] },
  });
  assert.equal(second.body.checkin.id, first.body.checkin.id);
  assert.equal(second.body.checkin.score, 4);
  assert.deepEqual(second.body.checkin.tags, ["朋友"]);
  assert.equal(
    f.app.db
      .prepare(
        "SELECT COUNT(*) count FROM checkins WHERE user_id = ? AND date = ?",
      )
      .get("student-hainan", "2026-10-14").count,
    1,
  );
  assert.equal(
    f.app.db
      .prepare("SELECT score FROM checkins WHERE user_id = ? AND date = ?")
      .get("student-shandong", "2026-10-14").score,
    4,
  );
  f.setNow("2026-10-14T16:00:00.000Z");
  const next = await f.request("/checkins", {
    method: "POST",
    token,
    body: { score: 3 },
  });
  assert.equal(next.body.checkin.date, "2026-10-15");
  assert.notEqual(next.body.checkin.id, first.body.checkin.id);
  const dashboard = (await f.request("/dashboard", { token })).body;
  assert.equal(dashboard.today, "2026-10-15");
  assert.equal(dashboard.stats.totalCheckins, 9);
  assert.equal(dashboard.stats.streak, 9);
});

test("actual day-by-day API writes progress gray → yellow → red, recover on edit, and reset after absence", async (t) => {
  const f = await fixture(t);
  const registered = await f.request("/auth/register", {
    method: "POST",
    body: {
      regionId: "hainan",
      inviteCode: "HN2026",
      account: "threshold.student",
      password: PASSWORD,
      name: "阈值验证同学",
    },
  });
  const student = registered.body;
  const admin = await f.login("hainan.admin");
  for (let day = 1; day <= 6; day += 1) {
    f.setNow(`${shiftDate("2026-10-14", day - 1)}T06:00:00Z`);
    assert.equal(
      (
        await f.request("/checkins", {
          method: "POST",
          token: student.token,
          body: { score: (day % 2) + 1 },
        })
      ).status,
      200,
    );
    const status = (
      await f.request(`/admin/students/${student.user.id}`, {
        token: admin.token,
      })
    ).body.student;
    assert.equal(status.lowDays, day);
    assert.equal(
      status.status,
      day >= 5 ? "red" : day >= 3 ? "yellow" : "gray",
    );
  }
  await f.request("/checkins", {
    method: "POST",
    token: student.token,
    body: { score: 3 },
  });
  let detail = (
    await f.request(`/admin/students/${student.user.id}`, {
      token: admin.token,
    })
  ).body.student;
  assert.equal(detail.lowDays, 0);
  assert.equal(detail.status, "gray");
  f.setNow("2026-10-22T06:00:00Z");
  const refreshedStudent = await f.login("threshold.student");
  const refreshedAdmin = await f.login("hainan.admin");
  detail = (
    await f.request(`/admin/students/${student.user.id}`, {
      token: refreshedAdmin.token,
    })
  ).body.student;
  assert.equal(detail.status, "gray");
  await f.request("/checkins", {
    method: "POST",
    token: refreshedStudent.token,
    body: { score: 1 },
  });
  detail = (
    await f.request(`/admin/students/${student.user.id}`, {
      token: refreshedAdmin.token,
    })
  ).body.student;
  assert.equal(detail.lowDays, 1);
  assert.equal(detail.status, "gray");
});

test("journals and mood notes stay private; care followups preserve current warning and are not student-visible", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const other = await f.login("hainan.muyang");
  await f.request("/checkins", {
    method: "POST",
    token: student.token,
    body: { score: 2, note: "不可泄露的心情备注" },
  });
  const journal = await f.request("/journals", {
    method: "POST",
    token: student.token,
    body: { title: "秘密标题", content: "不可泄露的日记正文" },
  });
  assert.equal(journal.status, 201);
  assert.equal(
    (await f.request("/journals", { token: student.token })).body.journals.some(
      (item) => item.id === journal.body.journal.id,
    ),
    true,
  );
  assert.equal(
    (await f.request("/journals?userId=student-hainan", { token: other.token }))
      .body.journals.length,
    0,
  );
  const overview = await f.request("/admin/overview", { token: admin.token });
  const detail = await f.request(`/admin/students/${student.user.id}`, {
    token: admin.token,
  });
  for (const result of [overview, detail]) {
    const encoded = JSON.stringify(result.body);
    for (const secret of ["不可泄露", "秘密标题", "journals", "tags"])
      assert.equal(encoded.includes(secret), false);
  }
  assert.deepEqual(Object.keys(detail.body.student.checkins[0]).sort(), [
    "date",
    "score",
  ]);
  const followup = await f.request("/admin/students/student-red/followups", {
    method: "POST",
    token: admin.token,
    body: { note: "已关怀但仍需持续关注" },
  });
  assert.equal(followup.status, 201);
  assert.equal(
    (await f.request("/admin/students/student-red", { token: admin.token }))
      .body.student.status,
    "red",
  );
  assert.equal(
    JSON.stringify(
      (await f.request("/dashboard", { token: student.token })).body,
    ).includes("followups"),
    false,
  );
});

test("all student writes reject admin sessions; every admin endpoint rejects student sessions", async (t) => {
  const f = await fixture(t);
  const admin = await f.login("hainan.admin");
  const student = await f.login();
  for (const path of [
    "/checkins",
    "/journals",
    "/posts",
    "/posts/post-light/warm",
    "/posts/post-light/replies",
    "/posts/post-light/report",
    "/service-requests",
  ]) {
    assert.equal(
      (await f.request(path, { method: "POST", token: admin.token, body: {} }))
        .status,
      403,
      path,
    );
  }
  for (const path of [
    "/admin/overview",
    "/admin/students",
    "/admin/students/student-red",
    "/admin/posts",
    "/admin/service-requests",
  ]) {
    assert.equal(
      (await f.request(path, { token: student.token })).status,
      403,
      path,
    );
  }
  for (const path of [
    "/admin/students/student-red/followups",
    "/admin/posts/post-light/moderate",
    "/admin/replies/reply-cloud/moderate",
    "/admin/service-requests/service-demo",
  ]) {
    assert.equal(
      (
        await f.request(path, {
          method: "POST",
          token: student.token,
          body: {},
        })
      ).status,
      403,
      path,
    );
  }
});

test("regional admin/student reads and every object mutation stay within token region despite forged parameters", async (t) => {
  const f = await fixture(t);
  const admin = await f.login("hainan.admin");
  const student = await f.login();
  const sd = await f.login("shandong.student", "shandong");
  const request = await f.request("/service-requests", {
    method: "POST",
    token: sd.token,
    body: { type: "校园成长服务", message: "山东区域申请" },
  });
  const reply = await f.request("/posts/post-other/replies", {
    method: "POST",
    token: sd.token,
    body: { nickname: "麦穗", content: "山东区域回复" },
  });
  assert.equal(reply.status, 201);
  const replyId = f.app.db
    .prepare("SELECT id FROM replies WHERE post_id = 'post-other'")
    .get().id;
  const list = await f.request("/admin/students?regionId=shandong", {
    token: admin.token,
  });
  assert.equal(
    list.body.students.some((entry) => entry.id === "student-shandong"),
    false,
  );
  assert.equal(
    (
      await f.request("/posts?regionId=shandong", { token: student.token })
    ).body.posts.some((entry) => entry.id === "post-other"),
    false,
  );
  assert.equal(
    (
      await f.request("/admin/students/student-shandong", {
        token: admin.token,
      })
    ).status,
    404,
  );
  const writes = [
    [
      admin.token,
      "/admin/students/student-shandong/followups",
      { note: "越权" },
    ],
    [admin.token, "/admin/posts/post-other/moderate", { status: "approved" }],
    [admin.token, `/admin/replies/${replyId}/moderate`, { status: "approved" }],
    [
      admin.token,
      `/admin/service-requests/${request.body.request.id}`,
      { status: "handled" },
    ],
    [student.token, "/posts/post-other/warm", {}],
    [
      student.token,
      "/posts/post-other/replies",
      { nickname: "云", content: "越权" },
    ],
    [student.token, "/posts/post-other/report", { reason: "越权" }],
  ];
  for (const [token, path, body] of writes)
    assert.equal(
      (await f.request(path, { method: "POST", token, body })).status,
      404,
      path,
    );
});

test("post publication is moderated, public/admin DTOs omit identity and mine stays owner-only", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const other = await f.login("hainan.muyang");
  const submitted = await f.request("/posts", {
    method: "POST",
    token: student.token,
    body: {
      nickname: "一粒种子",
      topic: "成长烦恼",
      content: "慢慢来也是一种进步",
      status: "approved",
      regionId: "shandong",
      userId: "student-shandong",
    },
  });
  assert.equal(submitted.status, 201);
  const id = submitted.body.post.id;
  assert.equal(submitted.body.post.status, "pending");
  assert.equal(
    (await f.request("/posts", { token: other.token })).body.posts.some(
      (post) => post.id === id,
    ),
    false,
  );
  assert.equal(
    (
      await f.request("/posts?mine=1", { token: student.token })
    ).body.posts.find((post) => post.id === id).status,
    "pending",
  );
  assert.equal(
    (
      await f.request("/posts?mine=1&userId=student-hainan", {
        token: other.token,
      })
    ).body.posts.some((post) => post.id === id),
    false,
  );
  assert.equal(
    (
      await f.request(`/posts/${id}/warm`, {
        method: "POST",
        token: student.token,
        body: {},
      })
    ).status,
    404,
  );
  const queue = (
    await f.request("/admin/posts?status=pending", { token: admin.token })
  ).body;
  assert.equal(
    queue.posts.some((post) => post.id === id),
    true,
  );
  const encoded = JSON.stringify(queue);
  for (const forbidden of [
    "user_id",
    "userId",
    "account",
    "schoolName",
    "schoolId",
    "regionId",
    "林小满",
  ])
    assert.equal(encoded.includes(forbidden), false);
  assert.equal(
    (
      await f.request(`/admin/posts/${id}/moderate`, {
        method: "POST",
        token: admin.token,
        body: { status: "approved" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request("/posts?topic=成长烦恼", { token: other.token })
    ).body.posts.some((post) => post.id === id),
    true,
  );
  const publicJson = JSON.stringify(
    (await f.request("/posts", { token: other.token })).body,
  );
  assert.equal(publicJson.includes(student.user.id), false);
  assert.equal(publicJson.includes("林小满"), false);
  assert.equal(
    (
      await f.request(`/admin/posts/${id}/moderate`, {
        method: "POST",
        token: admin.token,
        body: { status: "rejected" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request("/posts", { token: other.token })).body.posts.some(
      (post) => post.id === id,
    ),
    false,
  );
});

test("reply approval is independent, pending replies remain discoverable under approved parents", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const submitted = await f.request("/posts/post-light/replies", {
    method: "POST",
    token: student.token,
    body: { nickname: "小树", content: "我听见了你的心声" },
  });
  assert.deepEqual(submitted.body, { ok: true, status: "pending" });
  let publicPost = (
    await f.request("/posts", { token: student.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal(
    publicPost.replies.some((reply) => reply.content === "我听见了你的心声"),
    false,
  );
  const parent = (
    await f.request("/admin/posts?status=pending", { token: admin.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal(parent.status, "approved");
  const replyId = parent.replies.find(
    (reply) => reply.content === "我听见了你的心声",
  ).id;
  assert.equal(
    (
      await f.request(`/admin/replies/${replyId}/moderate`, {
        method: "POST",
        token: admin.token,
        body: { status: "approved" },
      })
    ).status,
    200,
  );
  publicPost = (
    await f.request("/posts", { token: student.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal(
    publicPost.replies.some((reply) => reply.id === replyId),
    true,
  );
  assert.equal(
    "status" in publicPost.replies.find((reply) => reply.id === replyId),
    false,
  );
  assert.equal(
    (
      await f.request(`/admin/replies/${replyId}/moderate`, {
        method: "POST",
        token: admin.token,
        body: { status: "rejected" },
      })
    ).status,
    200,
  );
  publicPost = (
    await f.request("/posts", { token: student.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal(
    publicPost.replies.some((reply) => reply.id === replyId),
    false,
  );
});

test("warmth is once per student/post/Shanghai day, and concurrent duplicates cannot increase count", async (t) => {
  const f = await fixture(t, { now: "2026-10-14T15:59:59Z" });
  const { token } = await f.login();
  const before = (await f.request("/posts", { token })).body.posts.find(
    (post) => post.id === "post-light",
  ).warmCount;
  const attempts = await Promise.all(
    Array.from({ length: 5 }, () =>
      f.request("/posts/post-light/warm", { method: "POST", token, body: {} }),
    ),
  );
  assert.equal(
    attempts.filter((response) => response.status === 200).length,
    1,
  );
  assert.equal(
    attempts.filter((response) => response.status === 409).length,
    4,
  );
  let post = (await f.request("/posts", { token })).body.posts.find(
    (entry) => entry.id === "post-light",
  );
  assert.equal(post.warmCount, before + 1);
  assert.equal(post.warmed, true);
  f.setNow("2026-10-14T16:00:00Z");
  post = (await f.request("/posts", { token })).body.posts.find(
    (entry) => entry.id === "post-light",
  );
  assert.equal(post.warmed, false);
  assert.equal(
    (
      await f.request("/posts/post-light/warm", {
        method: "POST",
        token,
        body: {},
      })
    ).status,
    200,
  );
});

test("report hides public post immediately and exposes reason only to regional moderation", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const result = await f.request("/posts/post-light/report", {
    method: "POST",
    token: student.token,
    body: { reason: "内容可能涉及个人信息" },
  });
  assert.equal(result.status, 200);
  assert.equal(
    (await f.request("/posts", { token: student.token })).body.posts.some(
      (post) => post.id === "post-light",
    ),
    false,
  );
  const flagged = (
    await f.request("/admin/posts?status=pending", { token: admin.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal(flagged.status, "pending");
  assert.equal(flagged.reports[0].reason, "内容可能涉及个人信息");
  assert.equal("userId" in flagged.reports[0], false);
  await f.request("/admin/posts/post-light/moderate", {
    method: "POST",
    token: admin.token,
    body: { status: "approved" },
  });
  const visible = (
    await f.request("/posts", { token: student.token })
  ).body.posts.find((post) => post.id === "post-light");
  assert.equal("reports" in visible, false);
});

test("service request is private to owner and regional admins, can be marked handled", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const other = await f.login("hainan.muyang");
  const result = await f.request("/service-requests", {
    method: "POST",
    token: student.token,
    body: {
      type: "家庭成长服务",
      message: "想学习如何更好地表达",
      userId: "student-shandong",
      regionId: "shandong",
      status: "handled",
    },
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.request.status, "pending");
  assert.equal(
    (
      await f.request("/service-requests", { token: other.token })
    ).body.requests.some((entry) => entry.id === result.body.request.id),
    false,
  );
  const managed = (
    await f.request("/admin/service-requests", { token: admin.token })
  ).body.requests.find((entry) => entry.id === result.body.request.id);
  assert.equal(managed.userName, "林小满");
  assert.equal(
    (
      await f.request(`/admin/service-requests/${managed.id}`, {
        method: "POST",
        token: admin.token,
        body: { status: "handled" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request("/service-requests", { token: student.token })
    ).body.requests.find((entry) => entry.id === managed.id).status,
    "handled",
  );
});

test("request input validation rejects invalid JSON, score, enums, long content and malformed account", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const writes = [
    ["/checkins", { score: "2" }],
    ["/checkins", { score: 0 }],
    ["/checkins", { score: 2.5 }],
    ["/checkins", { score: 3, tags: "学习" }],
    ["/checkins", { score: 3, note: "x".repeat(501) }],
    ["/journals", { title: "", content: "" }],
    ["/journals", { title: "标题", content: "x".repeat(5001) }],
    ["/posts", { nickname: "云", topic: "无效", content: "内容" }],
    [
      "/posts",
      { nickname: "云", topic: "成长烦恼", content: "x".repeat(1001) },
    ],
    ["/posts/post-light/report", { reason: "" }],
    ["/posts/post-light/replies", { nickname: "", content: "内容" }],
    ["/service-requests", { type: "", message: "内容" }],
  ];
  for (const [path, body] of writes)
    assert.equal(
      (await f.request(path, { method: "POST", token: student.token, body }))
        .status,
      400,
      path,
    );
  assert.equal(
    (
      await f.request("/checkins", {
        method: "POST",
        token: student.token,
        body: "{",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/checkins", {
        method: "POST",
        token: student.token,
        body: "[]",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/checkins", {
        method: "POST",
        token: student.token,
        body: {},
        headers: { "Content-Type": "text/plain" },
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await f.request("/posts", {
        method: "POST",
        token: student.token,
        body: { content: "x".repeat(40000) },
      })
    ).status,
    413,
  );
  assert.equal(
    (await f.request("/posts?topic=invalid", { token: student.token })).status,
    400,
  );
  assert.equal(
    (
      await f.request("/admin/posts/post-light/moderate", {
        method: "POST",
        token: admin.token,
        body: { status: "anything" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/auth/register", {
        method: "POST",
        body: {
          regionId: "hainan",
          inviteCode: "HN2026",
          account: "x'; DROP TABLE users;--",
          password: PASSWORD,
          name: "名字",
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (await f.request("/auth/me", { token: student.token })).status,
    200,
  );
});

test("login throttles repeated attempts and allows retries after the limit window", async (t) => {
  const f = await fixture(t, { demo: false });
  const body = {
    regionId: "hainan",
    account: "no.student",
    password: PASSWORD,
  };
  for (let i = 0; i < 30; i += 1)
    assert.equal(
      (await f.request("/auth/login", { method: "POST", body })).status,
      401,
    );
  assert.equal(
    (await f.request("/auth/login", { method: "POST", body })).status,
    429,
  );
  f.setNow("2026-10-14T06:15:00Z");
  assert.equal(
    (await f.request("/auth/login", { method: "POST", body })).status,
    401,
  );
});

test("successful sign-ins and other accounts sharing one IP do not consume each other’s failed-login allowance", async (t) => {
  const f = await fixture(t);
  const failed = {
    regionId: "hainan",
    account: "no.student",
    password: PASSWORD,
  };
  for (let i = 0; i < 30; i += 1)
    assert.equal(
      (await f.request("/auth/login", { method: "POST", body: failed })).status,
      401,
    );
  assert.equal(
    (await f.request("/auth/login", { method: "POST", body: failed })).status,
    429,
  );
  for (let i = 0; i < 31; i += 1) await f.login();
  assert.equal(
    (
      await f.request("/auth/login", {
        method: "POST",
        body: { ...failed, account: "another.missing" },
      })
    ).status,
    401,
  );
});

test("SQLite data, sessions, moderation and private content survive server restart without reseeding", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "growup-api-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const dbPath = join(directory, "data.sqlite");
  const first = await fixture(t, { dbPath });
  const student = await first.login();
  const admin = await first.login("hainan.admin");
  await first.request("/checkins", {
    method: "POST",
    token: student.token,
    body: { score: 5, note: "持久化心情" },
  });
  const journal = await first.request("/journals", {
    method: "POST",
    token: student.token,
    body: { title: "重启前日记", content: "持久化正文" },
  });
  await first.request("/admin/posts/post-home/moderate", {
    method: "POST",
    token: admin.token,
    body: { status: "approved" },
  });
  const count = first.app.db
    .prepare("SELECT COUNT(*) count FROM checkins")
    .get().count;
  await first.close();
  assert.throws(() => createApp({ dbPath, demo: false }), /演示账号/);
  const second = await fixture(t, { dbPath, now: "2026-10-15T06:00:00Z" });
  assert.equal(
    (await second.request("/auth/me", { token: student.token })).status,
    200,
  );
  assert.equal(
    (
      await second.request("/journals", { token: student.token })
    ).body.journals.some((item) => item.id === journal.body.journal.id),
    true,
  );
  assert.equal(
    (
      await second.request("/checkins", { token: student.token })
    ).body.checkins.find((item) => item.date === "2026-10-14").note,
    "持久化心情",
  );
  assert.equal(
    (await second.request("/posts", { token: student.token })).body.posts.find(
      (post) => post.id === "post-home",
    ).status,
    "approved",
  );
  assert.equal(
    second.app.db.prepare("SELECT COUNT(*) count FROM checkins").get().count,
    count,
  );
  await second.close();
});

test("native catalog exposes 19 tools and all age/gender profiles accept valid fields with private reports", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const other = await f.login("shandong.student", "shandong");
  const catalog = await f.request("/tools", { token: student.token });
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.tools.length, 19);
  assert.equal(
    catalog.body.tools.filter((tool) => tool.group === "中长期成长观察").length,
    9,
  );
  assert.equal((await f.request("/tools", { token: admin.token })).status, 403);
  assert.equal((await f.request("/tools")).status, 401);
  let first;
  for (const tool of catalog.body.tools) {
    for (const profile of tool.profiles) {
      const answers = Object.fromEntries(
        profile.fields.map((field) => [
          field.id,
          field.type === "single"
            ? field.options[0].value
            : field.type === "multi"
              ? [field.options[0].value]
              : field.type === "number"
                ? (field.min ?? 1)
                : field.type === "date"
                  ? "2026-10-14"
                  : field.type === "time"
                    ? "12:30"
                    : "真实观察",
        ]),
      );
      const response = await f.request(`/tools/${tool.id}/records`, {
        token: student.token,
        method: "POST",
        body: {
          profileId: profile.id,
          date: "2026-10-14",
          answers,
          userId: other.user.id,
        },
      });
      assert.equal(
        response.status,
        201,
        `${tool.id}/${profile.id} ${JSON.stringify(response.body)}`,
      );
      const record = response.body.record;
      assert.equal(record.toolId, tool.id);
      assert.equal(typeof record.result.summary, "string");
      assert.ok(Array.isArray(record.result.metrics));
      assert.ok(Array.isArray(record.result.sections));
      assert.equal(record.userId, undefined);
      first ??= record;
      const report = await f.request(`/tools/${tool.id}/report?month=2026-10`, {
        token: student.token,
      });
      assert.equal(report.status, 200, JSON.stringify(report.body));
      assert.equal(typeof report.body.report.summary, "string");
    }
    assert.deepEqual(
      (await f.request(`/tools/${tool.id}/records`, { token: other.token }))
        .body.records,
      [],
    );
    assert.equal(
      (await f.request(`/tools/${tool.id}/records`, { token: admin.token }))
        .status,
      403,
    );
  }
  assert.equal(
    (
      await f.request(`/tools/${first.toolId}/records/${first.id}`, {
        token: other.token,
        method: "DELETE",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(`/tools/${first.toolId}/records/${first.id}`, {
        token: student.token,
        method: "DELETE",
      })
    ).status,
    200,
  );
});

test("trackers upsert by profile/day and questionnaires retain attempts without trusting forged results", async (t) => {
  const f = await fixture(t);
  const { token } = await f.login();
  const write = (path, body) =>
    f.request(path, { token, method: "POST", body });
  const data = {
    profileId: "daily",
    date: "2026-10-14",
    answers: { sleepRange: "7-8", quality: 4 },
  };
  const first = await write("/tools/sl/records", data);
  assert.equal(first.status, 201);
  const update = await write("/tools/sl/records", {
    ...data,
    answers: { ...data.answers, quality: 2 },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.record.id, first.body.record.id);
  assert.equal(update.body.record.answers.quality, 2);
  for (const bad of [
    { ...data, date: "2026-99-14" },
    { ...data, date: "2026-02-30" },
    { ...data, date: "2026-10-15" },
    { ...data, profileId: "forged" },
    { ...data, answers: { quality: 5 } },
    { ...data, answers: { ...data.answers, quality: "4" } },
    { ...data, answers: { ...data.answers, injected: 1 } },
  ])
    assert.equal(
      (await write("/tools/sl/records", bad)).status,
      400,
      JSON.stringify(bad),
    );
  assert.equal(
    (await f.request("/tools/sl/report?month=2026-13", { token })).status,
    400,
  );
  assert.equal(
    (await f.request("/tools/missing/records", { token })).status,
    404,
  );
  const fresh = {
    ...data,
    date: "2026-10-13",
    id: "forged",
    userId: "student-shandong",
    result: { title: "forged" },
  };
  assert.equal((await write("/tools/sl/records", fresh)).status, 201);
  const saved = (
    await f.request("/tools/sl/records", { token })
  ).body.records.find((row) => row.date === "2026-10-13");
  assert.notEqual(saved.id, "forged");
  assert.notEqual(saved.result.title, "forged");
  const tool = (await f.request("/tools", { token })).body.tools.find(
    (entry) => entry.id === "ya",
  );
  const profile = tool.profiles[0];
  const answers = Object.fromEntries(
    profile.fields
      .filter((field) => field.required)
      .map((field) => [
        field.id,
        field.type === "single" ? field.options[0].value : "真实填写",
      ]),
  );
  const attempt = { profileId: profile.id, date: "2026-10-14", answers };
  const a = await write("/tools/ya/records", attempt),
    b = await write("/tools/ya/records", attempt);
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.notEqual(a.body.record.id, b.body.record.id);
  const monthly = (await f.request("/tools/sl/report?month=2026-10", { token }))
    .body.report;
  assert.equal(
    monthly.metrics.find((metric) => metric.label === "最近7条平均睡眠质量")
      .value,
    3,
  );
  const body = await write("/tools/ys/records", {
    profileId: "body",
    date: "2026-10-14",
    answers: { gender: "male", age: 12, weight: 50, height: 160, waist: 70 },
  });
  assert.equal(body.status, 201, JSON.stringify(body.body));
  assert.equal(
    body.body.record.result.metrics.find((metric) => metric.label === "BMI")
      .value,
    19.5,
  );
});

test("STARMAP mood-only entries, co-occurrence, Shanghai streak, private persistence and owner deletion", async (t) => {
  const f = await fixture(t);
  const { token } = await f.login("hainan.xingchen");
  const other = await f.login("shandong.student", "shandong");
  const admin = await f.login("hainan.admin");
  const write = (path, body) =>
    f.request(path, { token, method: "POST", body });
  const quick = await write("/journals", {
    mood: 4,
    intensity: 3,
    tags: ["朋友", "学习", "朋友"],
    goal: "明天主动打招呼",
  });
  assert.equal(quick.status, 201);
  assert.equal(quick.body.journal.content, "");
  assert.equal(quick.body.journal.title, "心情随记");
  const incoming = [
    {
      title: "昨天",
      content: "文字",
      mood: 2,
      intensity: 1,
      tags: ["朋友", "学习"],
      createdAt: "2026-10-12T17:00:00.000Z",
    }, // 上海13日
    {
      title: "上周",
      content: "文字",
      mood: 1,
      tags: ["家庭"],
      createdAt: "2026-10-05T04:00:00.000Z",
      id: "forged",
      userId: other.user.id,
    },
  ];
  for (const item of incoming) {
    const result = await write("/journals", item);
    assert.equal(result.status, 201);
    f.app.db
      .prepare("UPDATE journals SET created_at=? WHERE id=?")
      .run(item.createdAt, result.body.journal.id);
  }
  const map = (await f.request("/journals/map", { token })).body;
  assert.deepEqual(map.stats, {
    total: 3,
    last7Days: 2,
    streak: 2,
    moodAverage: 2.33,
    moodChange: 2,
  });
  assert.equal(map.nodes.find((node) => node.id === "朋友").count, 2);
  assert.equal(
    map.edges.find((edge) => [edge.source, edge.target].includes("朋友"))
      .weight,
    2,
  );
  assert.equal(
    (await f.request("/journals/map", { token: other.token })).body.stats.total,
    0,
  );
  assert.equal(
    (await f.request("/journals/map", { token: admin.token })).status,
    403,
  );
  for (const bad of [
    {},
    { mood: 0 },
    { mood: 2.5 },
    { mood: 3, intensity: 4 },
    { mood: 3, tags: Array(7).fill("x") },
    { mood: 3, tags: [" "] },
    { mood: 3, goal: "x".repeat(201) },
  ])
    assert.equal((await write("/journals", bad)).status, 400);
  assert.equal(
    (
      await f.request(`/journals/${quick.body.journal.id}`, {
        token: other.token,
        method: "DELETE",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(`/journals/${quick.body.journal.id}`, {
        token,
        method: "DELETE",
      })
    ).status,
    200,
  );
});

test("native service form validation and regional admin teacher submissions use authenticated identity", async (t) => {
  const f = await fixture(t);
  const student = await f.login();
  const admin = await f.login("hainan.admin");
  const other = await f.login("shandong.admin", "shandong");
  const catalog = await f.request("/service-forms", { token: admin.token });
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.forms.length, 4);
  const definition = catalog.body.forms.find((form) => form.id === "r22");
  const answers = Object.fromEntries(
    definition.profiles[0].fields
      .filter((field) => field.required)
      .map((field) => [
        field.id,
        field.type === "single" ? field.options[0].value : "海口向阳实验学校",
      ]),
  );
  const write = (body, token = student.token) =>
    f.request("/service-requests", { token, method: "POST", body });
  assert.equal((await write({ formId: "missing", answers })).status, 400);
  assert.equal((await write({ formId: "r22", answers: {} })).status, 400);
  assert.equal(
    (await write({ formId: "r22", answers: { ...answers, work: ["invalid"] } }))
      .status,
    400,
  );
  assert.equal(
    (await write({ formId: "r22", answers: { ...answers, work: "invalid" } }))
      .status,
    400,
  );
  assert.equal(
    (
      await write({
        formId: "r22",
        answers: { ...answers, school: "x".repeat(81) },
      })
    ).status,
    400,
  );
  assert.equal(
    (await write({ formId: "r22", answers: { ...answers, injected: "yes" } }))
      .status,
    400,
  );
  const saved = await write(
    { formId: "r22", answers, userId: other.user.id, regionId: "shandong" },
    admin.token,
  );
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  const own = (await f.request("/service-requests", { token: admin.token }))
    .body.requests;
  assert.ok(own.some((entry) => entry.id === saved.body.request.id));
  const local = (
    await f.request("/admin/service-requests", { token: admin.token })
  ).body.requests;
  const regional = (
    await f.request("/admin/service-requests", { token: other.token })
  ).body.requests;
  assert.ok(local.some((entry) => entry.id === saved.body.request.id));
  assert.ok(!regional.some((entry) => entry.id === saved.body.request.id));
  assert.equal(
    (await write({ type: "普通申请", message: "说明" }, admin.token)).status,
    403,
  );
});

test("manual JSON transfer endpoints are absent and cannot write or expose records", async (t) => {
  const f = await fixture(t);
  const { token } = await f.login("hainan.xingchen");
  for (const path of ["/journals/export", "/tools/sl/export"])
    assert.equal((await f.request(path, { token })).status, 404);
  for (const path of ["/journals/import", "/tools/sl/import"])
    assert.equal(
      (
        await f.request(path, {
          token,
          method: "POST",
          body: { journals: [{ content: "不可写入" }], records: [] },
        })
      ).status,
      404,
    );
  assert.equal(
    (await f.request("/journals", { token })).body.journals.length,
    0,
  );
  const tool = (await f.request("/tools", { token })).body.tools.find(
    (row) => row.id === "sl",
  );
  const homework = tool.profiles[0].fields.find((row) => row.id === "homework")
    .options[0].value;
  for (const [index, quality] of [5, 3, 3, 3, 3, 3, 3, 1, 2].entries())
    assert.equal(
      (
        await f.request("/tools/sl/records", {
          token,
          method: "POST",
          body: {
            profileId: "daily",
            date: shiftDate("2026-09-30", -index),
            answers: {
              sleepRange: "8-9",
              quality,
              ...(index < 7 ? { homework } : {}),
            },
          },
        })
      ).status,
      201,
    );
  const report = (await f.request("/tools/sl/report?month=2026-09", { token }))
    .body.report;
  assert.deepEqual(
    report.sections.find((section) => section.title === "睡眠因素共现线索")
      .items,
    ["目前的记录尚未呈现明显的睡眠因素共现线索，可以继续观察。"],
  );
});

test("first-run web setup creates one platform administrator and optional organization, then closes", async (t) => {
  const f = await fixture(t, { demo: false });
  const strong = "Setup-Owner-Password-2026";
  assert.deepEqual((await f.request("/setup")).body, {
    needsSetup: true,
    tokenRequired: false,
  });
  for (const body of [
    { name: "负责人", account: "owner", password: "short" },
    { name: "负责人", account: "x", password: strong },
    {
      name: "负责人",
      account: "owner",
      password: strong,
      schoolName: "孤立学校",
    },
  ])
    assert.equal(
      (await f.request("/setup", { method: "POST", body })).status,
      400,
    );
  assert.equal(f.app.db.prepare("SELECT COUNT(*) n FROM users").get().n, 0);
  const body = {
    name: "平台负责人",
    account: "Platform.Owner",
    password: strong,
    regionName: "华东大区",
    schoolName: "第一中学",
  };
  const [first, second] = await Promise.all([
    f.request("/setup", { method: "POST", body }),
    f.request("/setup", {
      method: "POST",
      body: { ...body, account: "racer" },
    }),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [201, 409]);
  const winner = first.status === 201 ? first : second;
  assert.equal(winner.body.user.role, "platform_admin");
  assert.equal(
    (await f.request("/auth/me", { token: winner.body.token })).body.user.role,
    "platform_admin",
  );
  assert.equal(
    f.app.db
      .prepare("SELECT COUNT(*) n FROM users WHERE role='platform_admin'")
      .get().n,
    1,
  );
  const regions = (await f.request("/regions")).body.regions;
  assert.deepEqual(
    regions.map((row) => [row.name, row.schools.map((s) => s.name)]),
    [["华东大区", ["第一中学"]]],
  );
  assert.deepEqual(
    f.app.db
      .prepare("SELECT action FROM admin_audit ORDER BY rowid")
      .all()
      .map((row) => row.action),
    ["system.setup", "region.create", "school.create"],
  );
  assert.equal(
    JSON.stringify(
      f.app.db.prepare("SELECT detail FROM admin_audit").all(),
    ).includes(strong),
    false,
  );
  assert.deepEqual((await f.request("/setup")).body, {
    needsSetup: false,
    tokenRequired: false,
  });
  assert.equal((await f.request("/health")).body.needsSetup, false);
  assert.equal(
    (
      await f.request("/setup", {
        method: "POST",
        body: { ...body, account: "late.owner" },
      })
    ).status,
    409,
  );
});

test("setup token guards first-run setup and demo mode never offers setup", async (t) => {
  const guarded = await fixture(t, {
    demo: false,
    setupToken: "deploy-secret-7788",
  });
  assert.equal((await guarded.request("/setup")).body.tokenRequired, true);
  const body = {
    name: "负责人",
    account: "owner",
    password: "Setup-Owner-Password-2026",
  };
  for (const setupToken of [undefined, "", "wrong-secret"])
    assert.equal(
      (
        await guarded.request("/setup", {
          method: "POST",
          body: { ...body, setupToken },
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await guarded.request("/setup", {
        method: "POST",
        body: { ...body, setupToken: "deploy-secret-7788" },
      })
    ).status,
    201,
  );
  assert.equal((await guarded.request("/setup")).body.tokenRequired, false);
  const demo = await fixture(t, { demo: true });
  assert.equal((await demo.request("/setup")).body.needsSetup, false);
  assert.equal(
    (await demo.request("/setup", { method: "POST", body })).status,
    409,
  );
});
