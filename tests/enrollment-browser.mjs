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
  await expect(page.locator(".sidebar nav button")).toHaveCount(0);
  await expect(page.locator(".mobile-nav button")).toHaveCount(0);
  await expect(page.locator(".admin-switch")).toHaveCount(0);
  await page.getByRole("button", { name: "登录管理后台", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (platform)
    await dialog
      .getByRole("button", { name: "平台管理员登录", exact: true })
      .click();
  else
    await dialog
      .getByRole("combobox", { name: "选择你的大区", exact: true })
      .selectOption({ label: "华东试点大区" });
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
    platform.getByRole("region", { name: "任命管理员" }).getByLabel("所属大区"),
  ).toContainText("华东试点大区");
  for (const [role, account, name] of [
    ["region_admin", "area.manager", "区域负责人"],
    ["school_admin", "school.manager", "学校负责人"],
  ]) {
    await platform
      .locator(".sidebar")
      .getByRole("button", { name: "用户管理", exact: true })
      .click();
    form = platform.getByRole("region", { name: "新增工作人员", exact: true });
    await form.getByLabel("用户称呼", { exact: true }).fill(name);
    await form.getByLabel("登录账号", { exact: true }).fill(account);
    await form.getByLabel("初始密码", { exact: true }).fill(fixture.password);
    await form.getByRole("button", { name: "创建用户", exact: true }).click();
    await expect(
      platform
        .getByRole("region", { name: "用户列表", exact: true })
        .getByText(account, { exact: true }),
    ).toBeVisible();
    await platform
      .locator(".sidebar")
      .getByRole("button", { name: "平台管理", exact: true })
      .click();
    form = platform.getByRole("region", { name: "任命管理员", exact: true });
    await form
      .getByRole("combobox", { name: "选择已有用户", exact: true })
      .selectOption({ label: `${name} · ${account}` });
    await expect(
      form.getByLabel("角色", { exact: true }).locator("option"),
    ).toHaveCount(3);
    await form.getByLabel("角色", { exact: true }).selectOption(role);
    await form.getByRole("button", { name: "保存任命", exact: true }).click();
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
  await platformMobile
    .locator(".mobile-nav")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  await expect(
    platformMobile.getByRole("heading", { name: "用户管理", exact: true }),
  ).toBeVisible();
  await expect(
    platformMobile
      .getByRole("region", { name: "用户列表", exact: true })
      .getByText("school.manager", { exact: true }),
  ).toBeVisible();
  await noOverflow(platformMobile);
  await platformMobile.screenshot({
    path: resolve(artifact, "user-management-mobile.png"),
    fullPage: false,
  });
  record(
    "空正式库通过平台界面新增大区、学校，在用户管理建档后从既有用户任命两级管理员，桌面/375px无页面横向溢出",
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
    dialog.getByRole("combobox", { name: "选择你的大区", exact: true }),
  ).toContainText("华东试点大区");
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
  await area
    .locator(".sidebar")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  let areaList = area.getByRole("region", { name: "用户列表", exact: true });
  await expect(
    areaList.getByText("school.manager", { exact: true }),
  ).toBeVisible();
  await expect(
    areaList.getByText("web.new.student", { exact: true }),
  ).toBeVisible();
  for (const hidden of ["platform.owner", "area.manager"])
    await expect(areaList.getByText(hidden, { exact: true })).toHaveCount(0);
  await expect(
    areaList.getByLabel("用户类型", { exact: true }).locator("option"),
  ).toHaveCount(4);
  form = area.getByRole("region", { name: "新增工作人员", exact: true });
  await form.getByLabel("用户称呼", { exact: true }).fill("学校协管员");
  await form.getByLabel("登录账号", { exact: true }).fill("school.helper");
  await form.getByLabel("初始密码", { exact: true }).fill(fixture.password);
  await form
    .getByLabel("所属学校", { exact: true })
    .selectOption({ label: "成长试点第一学校" });
  await form.getByRole("button", { name: "创建用户", exact: true }).click();
  let helperRow = area.locator("tr").filter({ hasText: "school.helper" });
  await expect(helperRow).toContainText("成长试点第一学校");
  await helperRow
    .getByRole("button", { name: "任命为学校管理员", exact: true })
    .click();
  const appointment = area.getByRole("region", {
    name: "任命学校管理员",
    exact: true,
  });
  await expect(appointment.getByLabel("管理学校", { exact: true })).toHaveValue(
    /.+/,
  );
  await appointment
    .getByRole("button", { name: "确认任命", exact: true })
    .click();
  await expect(appointment).toHaveCount(0);
  await expect(helperRow).toContainText("学校管理员");
  await noOverflow(area);
  await area.screenshot({
    path: resolve(artifact, "region-user-management.png"),
    fullPage: true,
  });
  await fixture.login(
    "school.helper",
    (await fixture.ok("/regions")).regions[0].id,
  );
  await helperRow
    .getByRole("button", { name: "撤销管理员", exact: true })
    .click();
  await area.getByRole("button", { name: "确认撤销", exact: true }).click();
  await expect(helperRow).toContainText("待授权用户");
  await expect(helperRow).toContainText("成长试点第一学校");
  record(
    "大区管理员仅看到本区下级用户，可在本区学校建档、任命并撤销学校管理员",
  );

  await school
    .locator(".sidebar")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  const schoolList = school.getByRole("region", {
    name: "用户列表",
    exact: true,
  });
  await expect(
    schoolList.getByText("web.new.student", { exact: true }),
  ).toBeVisible();
  await expect(
    schoolList.getByText("school.helper", { exact: true }),
  ).toBeVisible();
  for (const hidden of ["school.manager", "area.manager", "platform.owner"])
    await expect(schoolList.getByText(hidden, { exact: true })).toHaveCount(0);
  await expect(
    school.getByRole("button", { name: "任命为学校管理员" }),
  ).toHaveCount(0);
  await expect(
    schoolList.getByLabel("用户类型", { exact: true }).locator("option"),
  ).toHaveCount(3);
  await noOverflow(school);
  record("学校管理员仅看到本校学生与待授权用户，界面无任命管理员入口");
  await platform
    .locator(".sidebar")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  let userRow = platform.locator("tr").filter({ hasText: "school.manager" });
  await userRow
    .getByRole("button", { name: "编辑 / 重置密码", exact: true })
    .click();
  const userEditor = platform.getByRole("region", {
    name: "编辑用户",
    exact: true,
  });
  await userEditor
    .getByLabel("用户称呼", { exact: true })
    .fill("学校负责人已更新");
  await userEditor
    .getByLabel("重置密码", { exact: true })
    .fill(fixture.password + ".new");
  await userEditor
    .getByRole("button", { name: "保存用户资料", exact: true })
    .click();
  await expect(userEditor).toHaveCount(0);
  await expect(userRow).toContainText("学校负责人已更新");
  const staleToken = await school.evaluate(() =>
    sessionStorage.getItem("growup-token"),
  );
  assert.equal(
    (await fixture.request("/auth/me", { token: staleToken })).status,
    401,
  );
  await fixture.login(
    "school.manager",
    (await fixture.ok("/regions")).regions[0].id,
    fixture.password + ".new",
  );
  await platform
    .locator(".sidebar")
    .getByRole("button", { name: "平台管理", exact: true })
    .click();
  userRow = platform.locator("tr").filter({ hasText: "school.manager" });
  await userRow.getByRole("button", { name: "撤销权限", exact: true }).click();
  await platform
    .getByRole("button", { name: "确认撤销权限", exact: true })
    .click();
  await expect(userRow).toHaveCount(0);
  await platform
    .locator(".sidebar")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  const userList = platform.getByRole("region", {
    name: "用户列表",
    exact: true,
  });
  await userList
    .getByLabel("搜索账号或称呼", { exact: true })
    .fill("school.manager");
  await userList.getByRole("button", { name: "查询用户", exact: true }).click();
  await expect(
    platform.locator("tr").filter({ hasText: "school.manager" }),
  ).toContainText("待授权用户");
  await noOverflow(platform);
  await platform.screenshot({
    path: resolve(artifact, "user-management-desktop.png"),
    fullPage: true,
  });
  record(
    "用户管理编辑、重置密码、查询及撤销管理员界面闭环通过，账号沿用且旧会话失效",
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
