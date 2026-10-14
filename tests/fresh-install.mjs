import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

// A brand-new container driven only through browsers: no commands inside it.
// The test owns its Compose project and removes only that disposable volume.
const project = `growup-fresh-${randomBytes(4).toString("hex")}`;
const setupToken = randomBytes(12).toString("hex");
const env = {
  ...process.env,
  APP_PORT: "0",
  BIND_ADDRESS: "127.0.0.1",
  SETUP_TOKEN: setupToken,
};
const compose = (args) =>
  execFileSync("docker", ["compose", "-p", project, ...args], {
    cwd: resolve("."),
    env,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const artifact = resolve("docs/verification");
mkdirSync(artifact, { recursive: true });
const checks = [],
  errors = [];
const record = (value) => {
  checks.push(value);
  console.log(`✓ ${value}`);
};
const ownerPassword = randomBytes(12).toString("base64url");
const issued = randomBytes(12).toString("base64url");
const teacherPassword = randomBytes(12).toString("base64url");
const studentPassword = randomBytes(12).toString("base64url");
let browser;
try {
  compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "60"]);
  const base = `http://${compose(["port", "app", "8787"])}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  async function page(width = 1440) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      timezoneId: "Asia/Shanghai",
    });
    const result = await context.newPage();
    result.setDefaultTimeout(15000);
    result.on("pageerror", (error) => errors.push(error.message));
    return result;
  }

  const owner = await page();
  await owner.goto(base);
  await expect(
    owner.getByRole("heading", { name: "欢迎使用成长健研社" }),
  ).toBeVisible();
  await owner.getByLabel("初始化口令").fill("wrong-token");
  await owner.getByRole("button", { name: /下一步/ }).click();
  await owner.getByLabel("你的称呼", { exact: true }).fill("平台负责人");
  await owner.getByLabel("登录账号", { exact: true }).fill("owner");
  await owner.getByLabel("密码", { exact: true }).fill(ownerPassword);
  await owner.getByLabel("确认密码", { exact: true }).fill(ownerPassword);
  await owner.getByRole("button", { name: /下一步/ }).click();
  await owner.getByLabel("大区名称", { exact: true }).fill("华南大区");
  await owner.getByLabel("学校名称", { exact: true }).fill("南山实验学校");
  await owner.getByRole("button", { name: /完成初始化/ }).click();
  await expect(owner.getByRole("alert")).toContainText("初始化口令不正确");
  await expect(
    owner.getByRole("heading", { name: "欢迎使用成长健研社" }),
  ).toBeVisible();
  await owner.getByLabel("初始化口令").fill(setupToken);
  for (let step = 0; step < 2; step++)
    await owner.getByRole("button", { name: /下一步/ }).click();
  await owner.getByRole("button", { name: /完成初始化/ }).click();
  const onboarding = owner.getByRole("region", { name: "开通进度" });
  await expect(onboarding).toContainText("2 / 6");
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.needsSetup, false);
  record(
    "全新容器首次访问进入初始化向导，错误口令被拒并退回第一步，正确口令下一次完成平台管理员与首个大区、学校",
  );

  await onboarding.getByRole("button", { name: "去用户管理" }).click();
  await owner
    .getByRole("button", { name: "新增工作人员", exact: true })
    .click();
  let dialog = owner.getByRole("dialog", { name: "新增工作人员" });
  await dialog.getByLabel("用户称呼", { exact: true }).fill("南山老师");
  await dialog.getByLabel("登录账号", { exact: true }).fill("nanshan.teacher");
  await dialog.getByLabel("初始密码", { exact: true }).fill(issued);
  await dialog.getByRole("button", { name: "创建用户", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await owner
    .locator(".sidebar")
    .getByRole("button", { name: "平台管理", exact: true })
    .click();
  await onboarding.getByRole("button", { name: "去任命" }).click();
  dialog = owner.getByRole("dialog", { name: "任命管理员" });
  await dialog
    .getByRole("combobox", { name: "选择已有用户" })
    .selectOption({ label: "南山老师 · nanshan.teacher" });
  await dialog.getByLabel("角色", { exact: true }).selectOption("school_admin");
  await dialog.getByRole("button", { name: "保存任命", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(onboarding).toContainText("4 / 6");
  record("按开通进度引导建立工作人员账号并任命为学校管理员");

  const teacher = await page();
  await teacher.goto(`${base}/#admin`);
  await teacher
    .getByRole("button", { name: "登录管理后台", exact: true })
    .click();
  dialog = teacher.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "选择你的大区" })
    .selectOption({ label: "华南大区" });
  await dialog.getByLabel("账号", { exact: true }).fill("nanshan.teacher");
  await dialog.getByLabel("密码", { exact: true }).fill(issued);
  await dialog
    .getByRole("button", { name: "进入关怀后台", exact: true })
    .click();
  await expect(
    teacher.getByRole("heading", { name: "请先设置你自己的密码" }),
  ).toBeVisible();
  await teacher.getByLabel("当前密码", { exact: true }).fill(issued);
  await teacher.getByLabel("新密码", { exact: true }).fill(teacherPassword);
  await teacher.getByLabel("确认新密码", { exact: true }).fill(teacherPassword);
  await teacher
    .getByRole("button", { name: "更新我的密码", exact: true })
    .click();
  await teacher
    .locator(".sidebar")
    .getByRole("button", { name: "学校与邀请", exact: true })
    .click();
  await teacher
    .getByRole("button", { name: "生成邀请码", exact: true })
    .click();
  dialog = teacher.getByRole("dialog", { name: "生成学生邀请码" });
  await dialog.getByLabel("邀请备注", { exact: true }).fill("首批学生");
  await dialog.getByRole("button", { name: "生成邀请码", exact: true }).click();
  dialog = teacher.getByRole("dialog", { name: "邀请码已生成" });
  const code = await dialog.locator("code").innerText();
  await dialog.getByRole("button", { name: "我已记录", exact: true }).click();
  record("学校管理员首次登录先改掉代设密码，再生成本校邀请码");

  const student = await page(375);
  await student.goto(base);
  await student
    .getByRole("button", { name: "登录 / 注册", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.getByRole("button", { name: "邀请码注册", exact: true }).click();
  await dialog.getByLabel("学校邀请码", { exact: true }).fill(code);
  await dialog.getByRole("button", { name: "核对学校", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("南山实验学校");
  await dialog.getByLabel("怎么称呼你", { exact: true }).fill("小南");
  await dialog.getByLabel("账号", { exact: true }).fill("xiaonan");
  await dialog.getByLabel("密码", { exact: true }).fill(studentPassword);
  await dialog.getByLabel("确认密码", { exact: true }).fill(studentPassword);
  await dialog
    .getByRole("button", { name: "注册并开启成长之旅", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await student.goto(`${base}/#profile`);
  await student.getByRole("button", { name: /提交新需求/ }).click();
  dialog = student.getByRole("dialog");
  await dialog
    .getByLabel("你希望获得什么支持？")
    .fill("最近学习压力有点大，想和老师聊一聊。");
  await dialog.getByRole("button", { name: /提交支持需求/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(student.locator(".service-row")).toContainText("待跟进");
  record("学生凭邀请码在手机网页自行注册，并在“我的”中提交支持需求");

  await teacher
    .locator(".sidebar")
    .getByRole("button", { name: "支持需求", exact: true })
    .click();
  const row = teacher.locator(".service-row").filter({ hasText: "学习压力" });
  await row.getByRole("button", { name: /标记已跟进/ }).click();
  dialog = teacher.getByRole("dialog", { name: "确认已完成跟进？" });
  await dialog
    .getByLabel("处理说明（学生可见）")
    .fill("周三午休时来心理辅导室，我们慢慢聊。");
  await dialog.getByRole("button", { name: "确认已跟进", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await student.reload();
  await expect(student.locator(".service-reply")).toContainText(
    "周三午休时来心理辅导室",
  );
  await student.screenshot({
    path: resolve(artifact, "fresh-install-student-reply.png"),
    fullPage: true,
  });
  await owner.reload();
  await expect(owner.getByRole("region", { name: "开通进度" })).toHaveCount(0);
  record(
    "学校管理员填写处理说明完成跟进，学生看到回复；全部开通步骤完成后平台进度清单自动收起",
  );

  compose([
    "up",
    "-d",
    "--no-build",
    "--force-recreate",
    "--wait",
    "--wait-timeout",
    "60",
  ]);
  const rebuilt = `http://${compose(["port", "app", "8787"])}`;
  assert.equal(
    (await (await fetch(`${rebuilt}/api/health`)).json()).needsSetup,
    false,
  );
  const relogin = await fetch(`${rebuilt}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: "owner",
      password: ownerPassword,
      regionId: null,
    }),
  });
  assert.equal(relogin.status, 200);
  const logs = compose(["logs", "app"]);
  for (const secret of [
    setupToken,
    ownerPassword,
    issued,
    teacherPassword,
    studentPassword,
  ])
    assert.equal(logs.includes(secret), false);
  assert.equal(errors.length, 0, errors.join("\n"));
  record(
    "重建容器后不再出现初始化向导、数据保留；日志不含口令或任何密码；页面无未捕获错误",
  );
  writeFileSync(
    resolve(artifact, "fresh-install-result.json"),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        image: "growup:local",
        checks,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser?.close();
  compose(["down", "-v"]);
}
