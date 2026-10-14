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
    regionId: "hainan",
    schoolName: "容器验收学校",
    name: "容器验收管理员",
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
    body: { regionId: input.regionId, account: input.account, password },
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(login.body.user.schoolName, input.schoolName);
  record("容器标准输入初始化真实管理员，账号可登录且密码不进入输出");
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
  record("重建容器后账号和会话仍在，命名卷持久化通过");
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
