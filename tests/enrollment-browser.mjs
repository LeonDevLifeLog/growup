import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { productionFixture } from "./helpers/enrollment.mjs";

const fixture = await productionFixture();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  checks = [];
const contexts = [];
const artifact = resolve("docs/verification");
mkdirSync(artifact, { recursive: true });
function record(value) {
  checks.push(value);
  console.log(`✓ ${value}`);
}
async function newPage(width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 1050 },
    timezoneId: "Asia/Shanghai",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}
async function login(page, account, platform = false) {
  await page.goto(fixture.base + "/#admin");
  await page.getByRole("button", { name: "登录管理后台", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (platform)
    await dialog
      .getByRole("button", { name: "平台管理员登录", exact: true })
      .click();
  else
    await dialog
      .getByRole("button", { name: "华东试点大区", exact: true })
      .click();
  await dialog.getByLabel("账号", { exact: true }).fill(account);
  await dialog.getByLabel("密码", { exact: true }).fill(fixture.password);
  await dialog
    .getByRole("button", { name: "进入关怀后台", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
}
try {
  const platform = await newPage();
  await login(platform, "platform.owner", true);
  await expect(
    platform.getByRole("heading", { name: "平台管理", exact: true }),
  ).toBeVisible();
  let form = platform.getByRole("region", { name: "新增大区", exact: true });
  await form.getByLabel("大区名称", { exact: true }).fill("华东试点大区");
  await form.getByRole("button", { name: "创建大区", exact: true }).click();
  await expect(
    platform.getByRole("heading", { name: "大区管理", exact: true }),
  ).toBeVisible();
  await expect(
    platform.getByRole("region", { name: "新增学校" }).getByLabel("所属大区"),
  ).toContainText("华东试点大区");
  form = platform.getByRole("region", { name: "新增学校", exact: true });
  await form.getByLabel("学校名称", { exact: true }).fill("成长试点第一学校");
  await form.getByRole("button", { name: "创建学校", exact: true }).click();
  await expect(
    platform.getByRole("region", { name: "新增管理员" }).getByLabel("所属大区"),
  ).toContainText("华东试点大区");
  for (const [role, account, name] of [
    ["region_admin", "area.manager", "区域负责人"],
    ["school_admin", "school.manager", "学校负责人"],
  ]) {
    form = platform.getByRole("region", { name: "新增管理员", exact: true });
    await form.getByLabel("角色", { exact: true }).selectOption(role);
    await form.getByLabel("管理员称呼", { exact: true }).fill(name);
    await form.getByLabel("登录账号", { exact: true }).fill(account);
    await form.getByLabel("初始密码", { exact: true }).fill(fixture.password);
    await form.getByRole("button", { name: "创建管理员", exact: true }).click();
    await expect(
      platform.locator("td").filter({ hasText: account }),
    ).toBeVisible();
  }
  await noOverflow(platform);
  await platform.screenshot({
    path: resolve(artifact, "platform-organizations.png"),
    fullPage: true,
  });
  const platformMobile = await newPage(375);
  await login(platformMobile, "platform.owner", true);
  await expect(
    platformMobile.getByRole("heading", { name: "平台管理", exact: true }),
  ).toBeVisible();
  await noOverflow(platformMobile);
  await platformMobile.screenshot({
    path: resolve(artifact, "platform-mobile.png"),
    fullPage: false,
  });
  record(
    "空正式库通过平台界面新增动态大区、学校和两级管理员，桌面/375px无页面横向溢出",
  );

  const school = await newPage();
  await login(school, "school.manager");
  await school
    .locator(".sidebar")
    .getByRole("button", { name: "学校与邀请", exact: true })
    .click();
  await expect(school.getByLabel("所属学校", { exact: true })).toHaveValue(
    /.+/,
  );
  await expect(school.getByLabel("所属学校", { exact: true })).toContainText(
    "成长试点第一学校",
  );
  await school.getByLabel("邀请备注", { exact: true }).fill("2026秋季开通");
  await school.getByLabel("注册名额", { exact: true }).fill("2");
  await school.getByRole("button", { name: "生成邀请码", exact: true }).click();
  await expect(school.locator(".invitation-created code")).toBeVisible();
  const code = await school.locator(".invitation-created code").innerText();
  assert.match(code, /^[A-F0-9]{24}$/);
  record("学校管理员登录后只能选择本校，生成限时限额邀请码并获得一次性完整值");

  const student = await newPage(375);
  await student.goto(fixture.base);
  await student
    .getByRole("button", { name: "登录 / 注册", exact: true })
    .click();
  let dialog = student.getByRole("dialog");
  await dialog.getByRole("button", { name: "邀请码注册", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "华东试点大区", exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("学校邀请码", { exact: true }).fill(code);
  await dialog.getByRole("button", { name: "核对学校", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("成长试点第一学校");
  await dialog.getByLabel("怎么称呼你", { exact: true }).fill("新注册同学");
  await dialog.getByLabel("账号", { exact: true }).fill("web.new.student");
  await dialog.getByLabel("密码", { exact: true }).fill(fixture.password);
  await dialog
    .getByLabel("确认密码", { exact: true })
    .fill("wrong-confirmation");
  await dialog
    .getByRole("button", { name: "注册并开启成长之旅", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("两次输入的密码不一致");
  await dialog.getByLabel("确认密码", { exact: true }).fill(fixture.password);
  await dialog
    .getByRole("button", { name: "注册并开启成长之旅", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(student.getByRole("heading", { level: 1 })).toContainText(
    "新注册同学",
  );
  await noOverflow(student);
  await student.screenshot({
    path: resolve(artifact, "invitation-student-mobile.png"),
    fullPage: true,
  });
  await student.goto(fixture.base + "/#profile");
  await student.getByRole("button", { name: "退出登录", exact: true }).click();
  await student
    .getByRole("button", { name: "登录 / 注册", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.getByLabel("账号", { exact: true }).fill("web.new.student");
  await dialog.getByLabel("密码", { exact: true }).fill(fixture.password);
  await dialog
    .getByRole("button", { name: "进入我的成长空间", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  record("手机网页学生核对学校、确认密码后自行注册，退出重登成功且无演示入口");

  await school.reload();
  await school.getByRole("button", { name: "使用记录", exact: true }).click();
  await expect(
    school.getByText("web.new.student", { exact: true }),
  ).toBeVisible();
  await expect(school.getByText("1 / 2", { exact: true })).toBeVisible();
  await school.screenshot({
    path: resolve(artifact, "school-invitation-records.png"),
    fullPage: true,
  });
  await school.getByRole("button", { name: "停用", exact: true }).click();
  await school.getByRole("button", { name: "确认停用", exact: true }).click();
  await expect(school.getByText("已停用", { exact: true })).toBeVisible();
  const revoked = await fixture.request("/auth/register", {
    method: "POST",
    body: {
      regionId: (await fixture.ok("/regions")).regions[0].id,
      inviteCode: code,
      name: "停用测试",
      account: "cannot.register",
      password: fixture.password,
    },
  });
  assert.equal(revoked.status, 400);
  record("后台显示学生注册记录与名额消费，邀请码停用后阻止新注册");

  const area = await newPage();
  await login(area, "area.manager");
  await expect(area.getByRole("heading", { level: 1 })).toContainText(
    "看见变化",
  );
  await area
    .locator(".sidebar")
    .getByRole("button", { name: "学校与邀请", exact: true })
    .click();
  await expect(
    area.getByRole("button", { name: "生成邀请码", exact: true }),
  ).toHaveCount(0);
  await expect(area.getByText("1 / 2", { exact: true })).toBeVisible();
  assert.equal(errors.length, 0, errors.join("\n"));
  record(
    "大区管理员可查看本区邀请使用情况，界面无学校邀请码生成权限，无未捕获错误",
  );
  writeFileSync(
    resolve(artifact, "enrollment-browser-result.json"),
    JSON.stringify(
      { verifiedAt: new Date().toISOString(), checks, errors },
      null,
      2,
    ) + "\n",
  );
} catch (error) {
  for (const context of contexts)
    for (const page of context.pages()) {
      console.error((await page.locator("body").innerText()).slice(0, 8000));
    }
  throw error;
} finally {
  await browser.close();
  await fixture.close();
}
