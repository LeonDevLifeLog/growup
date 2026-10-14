import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { productionFixture } from "./helpers/enrollment.mjs";

const fixture = await productionFixture({ setup: "web" });
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
  await platform.goto(fixture.base + "/#admin");
  await expect(
    platform.getByRole("heading", { name: "欢迎使用成长健研社" }),
  ).toBeVisible();
  await expect(platform.locator(".sidebar")).toHaveCount(0);
  await platform.getByRole("button", { name: /下一步/ }).click();
  await platform.getByLabel("你的称呼", { exact: true }).fill("平台负责人");
  await platform.getByLabel("登录账号", { exact: true }).fill("platform.owner");
  await platform.getByLabel("密码", { exact: true }).fill(fixture.password);
  await platform
    .getByLabel("确认密码", { exact: true })
    .fill(fixture.password + "x");
  await platform.getByRole("button", { name: /下一步/ }).click();
  await expect(platform.getByRole("alert")).toContainText(
    "两次输入的密码不一致",
  );
  await platform.getByLabel("确认密码", { exact: true }).fill(fixture.password);
  await platform.getByRole("button", { name: /下一步/ }).click();
  await expect(
    platform.getByRole("heading", { name: "开通第一个组织（可选）" }),
  ).toBeVisible();
  await noOverflow(platform);
  await platform.screenshot({
    path: resolve(artifact, "setup-wizard.png"),
    fullPage: true,
  });
  await platform.getByRole("button", { name: "跳过，稍后创建" }).click();
  await expect(
    platform.getByRole("heading", { name: "平台管理", exact: true }),
  ).toBeVisible();
  assert.equal((await fixture.ok("/setup")).needsSetup, false);
  const late = await newPage();
  await late.goto(fixture.base);
  await expect(
    late.getByRole("heading", { name: "欢迎使用成长健研社" }),
  ).toHaveCount(0);
  await late.close();
  record(
    "空库首次访问自动进入网页初始化向导，校验确认密码后创建平台管理员并自动登录，完成后向导永久关闭",
  );
  await platform.reload();
  await expect(
    platform.getByRole("heading", { name: "平台管理", exact: true }),
  ).toBeVisible();
  const onboarding = platform.getByRole("region", { name: "开通进度" });
  await expect(onboarding).toContainText("0 / 6");
  await onboarding
    .getByRole("button", { name: "去新增大区", exact: true })
    .click();
  let form = platform.getByRole("dialog", { name: "新增大区", exact: true });
  await form.getByLabel("大区名称", { exact: true }).fill("华东试点大区");
  await form.getByRole("button", { name: "创建大区", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(
    platform.locator("td").filter({ hasText: "华东试点大区" }),
  ).toBeVisible();
  await expect(onboarding).toContainText("1 / 6");
  await onboarding
    .getByRole("button", { name: "去新增学校", exact: true })
    .click();
  await expect(platform.getByRole("tab", { name: /学校/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  form = platform.getByRole("dialog", { name: "新增学校", exact: true });
  await expect(form.getByLabel("所属大区", { exact: true })).toContainText(
    "华东试点大区",
  );
  await form.getByLabel("学校名称", { exact: true }).fill("成长试点第一学校");
  await form.getByRole("button", { name: "创建学校", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(
    platform.locator("td").filter({ hasText: "成长试点第一学校" }),
  ).toBeVisible();
  for (const [role, account, name] of [
    ["region_admin", "area.manager", "区域负责人"],
    ["school_admin", "school.manager", "学校负责人"],
  ]) {
    await platform
      .locator(".sidebar")
      .getByRole("button", { name: "用户管理", exact: true })
      .click();
    await platform
      .getByRole("button", { name: "新增工作人员", exact: true })
      .click();
    form = platform.getByRole("dialog", { name: "新增工作人员", exact: true });
    await form.getByLabel("用户称呼", { exact: true }).fill(name);
    await form.getByLabel("登录账号", { exact: true }).fill(account);
    await form.getByLabel("初始密码", { exact: true }).fill(fixture.password);
    await form.getByRole("button", { name: "创建用户", exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(
      platform
        .getByRole("region", { name: "用户列表", exact: true })
        .getByText(account, { exact: true }),
    ).toBeVisible();
    await platform
      .locator(".sidebar")
      .getByRole("button", { name: "平台管理", exact: true })
      .click();
    await platform.getByRole("tab", { name: /管理员/ }).click();
    await platform
      .getByRole("button", { name: "任命管理员", exact: true })
      .click();
    form = platform.getByRole("dialog", { name: "任命管理员", exact: true });
    await form
      .getByRole("combobox", { name: "选择已有用户", exact: true })
      .selectOption({ label: `${name} · ${account}` });
    await expect(
      form.getByLabel("角色", { exact: true }).locator("option"),
    ).toHaveCount(3);
    await form.getByLabel("角色", { exact: true }).selectOption(role);
    if (role === "school_admin")
      await expect(form.getByLabel("所属学校", { exact: true })).toContainText(
        "成长试点第一学校",
      );
    await form.getByRole("button", { name: "保存任命", exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(
      platform.locator("td").filter({ hasText: account }),
    ).toBeVisible();
  }
  await expect(onboarding).toContainText("4 / 6");
  await expect(onboarding).toContainText("由学校管理员或学生完成");
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
    "空正式库按开通进度引导，在平台分页签中通过弹窗新增大区、学校，在用户管理建档后从既有用户任命两级管理员，列表不被表单挤占，桌面/375px无页面横向溢出",
  );

  const school = await newPage();
  await login(school, "school.manager");
  await school
    .locator(".sidebar")
    .getByRole("button", { name: "学校与邀请", exact: true })
    .click();
  await school.getByRole("button", { name: "生成邀请码", exact: true }).click();
  let inviteDialog = school.getByRole("dialog", {
    name: "生成学生邀请码",
    exact: true,
  });
  await expect(inviteDialog).toContainText("成长试点第一学校");
  await inviteDialog
    .getByLabel("邀请备注", { exact: true })
    .fill("2026秋季开通");
  await inviteDialog.getByLabel("注册名额", { exact: true }).fill("2");
  await inviteDialog
    .getByRole("button", { name: "生成邀请码", exact: true })
    .click();
  inviteDialog = school.getByRole("dialog", {
    name: "邀请码已生成",
    exact: true,
  });
  await expect(inviteDialog.locator(".invitation-created code")).toBeVisible();
  const code = await inviteDialog
    .locator(".invitation-created code")
    .innerText();
  await inviteDialog
    .getByRole("button", { name: "我已记录", exact: true })
    .click();
  await expect(inviteDialog).toHaveCount(0);
  await expect(school.getByText("2026秋季开通", { exact: true })).toBeVisible();
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
  await student
    .getByRole("button", { name: "记录今天的心情", exact: true })
    .click();
  const checkin = student.getByRole("dialog", {
    name: "今天，你感觉怎么样？",
    exact: true,
  });
  await checkin.locator("textarea").fill("还没写完的心里话");
  await student.keyboard.press("Escape");
  const discard = student.getByRole("dialog", {
    name: "放弃未保存的内容？",
    exact: true,
  });
  await discard.getByRole("button", { name: "取消", exact: true }).click();
  await expect(discard).toHaveCount(0);
  await expect(checkin.locator("textarea")).toHaveValue("还没写完的心里话");
  await checkin.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await discard
    .getByRole("button", { name: "放弃并关闭", exact: true })
    .click();
  await expect(checkin).toHaveCount(0);
  record("手机网页学生核对学校、确认密码后自行注册，退出重登成功且无演示入口");
  record("填写中的弹窗被 Esc 或关闭按钮关闭前会先确认，取消后内容保留");

  await school.reload();
  await school.getByRole("button", { name: "使用记录", exact: true }).click();
  const uses = school.getByRole("dialog", {
    name: "邀请使用记录",
    exact: true,
  });
  await expect(
    uses.getByText("web.new.student", { exact: true }),
  ).toBeVisible();
  await expect(school.getByText("1 / 2", { exact: true })).toBeVisible();
  await school.screenshot({
    path: resolve(artifact, "school-invitation-records.png"),
    fullPage: true,
  });
  await uses.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await expect(uses).toHaveCount(0);
  await school.getByRole("button", { name: "停用", exact: true }).click();
  await school
    .getByRole("dialog")
    .getByRole("button", { name: "确认停用", exact: true })
    .click();
  await expect(
    school.locator("td .badge").filter({ hasText: "已停用" }),
  ).toBeVisible();
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
  record(
    "邀请码在弹窗中生成并一次性展示，使用记录以弹窗查看，停用经确认后阻止新注册",
  );

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
  await area.getByRole("button", { name: "新增工作人员", exact: true }).click();
  form = area.getByRole("dialog", { name: "新增工作人员", exact: true });
  await form.getByLabel("用户称呼", { exact: true }).fill("学校协管员");
  await form.getByLabel("登录账号", { exact: true }).fill("school.helper");
  await form.getByLabel("初始密码", { exact: true }).fill(fixture.password);
  await form
    .getByLabel("所属学校", { exact: true })
    .selectOption({ label: "成长试点第一学校" });
  await form.getByRole("button", { name: "创建用户", exact: true }).click();
  await expect(form).toHaveCount(0);
  let helperRow = area.locator("tr").filter({ hasText: "school.helper" });
  await expect(helperRow).toContainText("成长试点第一学校");
  await helperRow
    .getByRole("button", { name: "任命为学校管理员", exact: true })
    .click();
  const appointment = area.getByRole("dialog");
  await expect(appointment).toContainText("任命学校管理员");
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
  await userRow.getByRole("button", { name: "编辑", exact: true }).click();
  let userDialog = platform.getByRole("dialog", {
    name: "编辑用户 · school.manager",
    exact: true,
  });
  await userDialog
    .getByLabel("用户称呼", { exact: true })
    .fill("学校负责人已更新");
  await userDialog
    .getByRole("button", { name: "保存用户资料", exact: true })
    .click();
  await expect(userDialog).toHaveCount(0);
  await expect(userRow).toContainText("学校负责人已更新");
  await userRow.getByRole("button", { name: "重置密码", exact: true }).click();
  userDialog = platform.getByRole("dialog");
  await userDialog
    .getByLabel("新密码", { exact: true })
    .fill(fixture.password + ".new");
  await userDialog
    .getByLabel("确认新密码", { exact: true })
    .fill(fixture.password + ".other");
  await userDialog
    .getByRole("button", { name: "重置密码", exact: true })
    .click();
  await expect(userDialog.getByRole("alert")).toContainText(
    "两次输入的密码不一致",
  );
  await userDialog
    .getByLabel("确认新密码", { exact: true })
    .fill(fixture.password + ".new");
  await userDialog
    .getByRole("button", { name: "重置密码", exact: true })
    .click();
  await expect(userDialog).toHaveCount(0);
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
  await platform.getByRole("tab", { name: /管理员/ }).click();
  userRow = platform.locator("tr").filter({ hasText: "school.manager" });
  await userRow.getByRole("button", { name: "撤销权限", exact: true }).click();
  await platform
    .getByRole("dialog")
    .getByRole("button", { name: "确认撤销", exact: true })
    .click();
  await expect(userRow).toHaveCount(0);
  await platform
    .locator(".sidebar")
    .getByRole("button", { name: "用户管理", exact: true })
    .click();
  await platform
    .getByRole("searchbox", { name: "搜索账号或称呼", exact: true })
    .fill("school.manager");
  await expect(platform.locator("tbody tr")).toHaveCount(1);
  await expect(
    platform.locator("tr").filter({ hasText: "school.manager" }),
  ).toContainText("待授权用户");
  await noOverflow(platform);
  await platform.screenshot({
    path: resolve(artifact, "user-management-desktop.png"),
    fullPage: true,
  });
  record(
    "用户管理在弹窗中编辑、重置密码（含确认校验）、即时搜索及撤销管理员闭环通过，账号沿用且旧会话失效",
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
