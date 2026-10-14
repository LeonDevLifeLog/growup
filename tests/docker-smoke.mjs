import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// This test owns a fresh Compose project and removes only its disposable volume.
const project = `growup-test-${randomBytes(4).toString("hex")}`;
const env = { ...process.env, APP_PORT: "0", BIND_ADDRESS: "127.0.0.1" };
const checks = [];
function compose(args, input) {
  return execFileSync("docker", ["compose", "-p", project, ...args], {
    cwd: resolve("."),
    env,
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
let base;
async function request(path, { token, body } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: await response.json() };
}
function record(value) {
  checks.push(value);
  console.log(`✓ ${value}`);
}
try {
  compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "60"]);
  base = `http://${compose(["port", "app", "8787"])}`;
  assert.deepEqual((await request("/health")).body, { ok: true, demo: false });
  const blank = JSON.parse(
    compose([
      "exec",
      "-T",
      "app",
      "node",
      "--input-type=module",
      "-e",
      "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(process.env.DATA_PATH); console.log(JSON.stringify({users:db.prepare('SELECT COUNT(*) n FROM users').get().n,invites:db.prepare('SELECT COUNT(*) n FROM invites').get().n}));",
    ]),
  );
  assert.deepEqual(blank, { users: 0, invites: 0 });
  assert.equal(compose(["exec", "-T", "app", "id", "-u"]), "1000");
  assert.equal((await fetch(base)).status, 200);
  record("正式空库无演示账号和邀请码，非 root 运行，网页与健康检查可用");

  const password = randomBytes(24).toString("base64url");
  const input = {
    name: "容器平台管理员",
    account: "container.admin",
    password,
  };
  const provisioned = JSON.parse(
    compose(
      ["exec", "-T", "app", "node", "server/bootstrap.mjs"],
      JSON.stringify(input),
    ),
  );
  assert.equal(provisioned.created, true);
  assert.equal(JSON.stringify(provisioned).includes(password), false);
  const login = await request("/auth/login", {
    body: { regionId: null, account: input.account, password },
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(login.body.user.role, "platform_admin");
  record("容器标准输入初始化真实管理员，账号可登录且密码不进入输出");
  const region = await request("/platform/regions", {
    token: login.body.token,
    body: { name: "容器验证大区" },
  });
  assert.equal(region.status, 201);
  const regionId = region.body.id;
  const school = await request("/platform/schools", {
    token: login.body.token,
    body: { name: "容器验证学校", regionId },
  });
  assert.equal(school.status, 201);
  const schoolId = school.body.id;
  assert.equal(
    (
      await request("/platform/admins", {
        token: login.body.token,
        body: {
          role: "school_admin",
          regionId,
          schoolId,
          account: "container.school",
          password,
          name: "学校负责人",
        },
      })
    ).status,
    201,
  );
  const teacher = await request("/auth/login", {
    body: { regionId, account: "container.school", password },
  });
  assert.equal(teacher.status, 200);
  const invitation = await request("/admin/invites", {
    token: teacher.body.token,
    body: { schoolId, days: 7, maxUses: 2, note: "容器注册验证" },
  });
  assert.equal(invitation.status, 201);
  const student = await request("/auth/register", {
    body: {
      regionId,
      inviteCode: invitation.body.invite.code,
      account: "container.student",
      password,
      name: "容器同学",
    },
  });
  assert.equal(student.status, 201);
  assert.equal(
    (
      await request("/checkins", {
        token: student.body.token,
        body: { score: 4, note: "持久化记录" },
      })
    ).status,
    200,
  );
  record("容器内新增大区、学校及校级账号，学校生成邀请，学生真实注册并打卡");
  compose([
    "up",
    "-d",
    "--no-build",
    "--force-recreate",
    "--wait",
    "--wait-timeout",
    "60",
  ]);
  base = `http://${compose(["port", "app", "8787"])}`;
  const me = await request("/auth/me", { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.account, input.account);
  const detail = await request(`/admin/invites/${invitation.body.invite.id}`, {
    token: teacher.body.token,
  });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.invite.usedCount, 1);
  assert.equal(detail.body.uses[0].account, "container.student");
  const checkins = await request("/checkins", { token: student.body.token });
  assert.equal(checkins.body.checkins[0].score, 4);
  record(
    "重建容器后账号、会话、邀请码用量、注册记录与打卡仍在，命名卷持久化通过",
  );
  mkdirSync("docs/verification", { recursive: true });
  writeFileSync(
    "docs/verification/docker-result.json",
    JSON.stringify(
      { verifiedAt: new Date().toISOString(), image: "growup:local", checks },
      null,
      2,
    ) + "\n",
  );
} finally {
  compose(["down", "-v"]);
}
