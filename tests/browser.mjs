import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApp } from "../server/app.mjs";

const artifactDir = resolve("docs/verification");
mkdirSync(artifactDir, { recursive: true });
const app = createApp({ dbPath: ":memory:", demo: true });
await new Promise((done) => app.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${app.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const checks = [];
function record(check) {
  checks.push(check);
  console.log(`✓ ${check}`);
}
const studentContext = await browser.newContext({
  viewport: { width: 1440, height: 1060 },
  timezoneId: "Asia/Shanghai",
});
const adminContext = await browser.newContext({
  viewport: { width: 1440, height: 1060 },
  timezoneId: "Asia/Shanghai",
});
const student = await studentContext.newPage();
const admin = await adminContext.newPage();
for (const page of [student, admin]) {
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
}
async function login(page, purpose = "student") {
  await page.goto(`${base}/${purpose === "admin" ? "#admin" : ""}`);
  await page
    .getByRole("button", {
      name: purpose === "admin" ? "登录管理后台" : "登录 / 注册",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("账号", { exact: true })
    .fill(`hainan.${purpose === "admin" ? "admin" : "student"}`);
  await dialog.getByLabel("密码", { exact: true }).fill("Growup123!");
  await dialog
    .getByRole("button", {
      name: purpose === "admin" ? "进入关怀后台" : "进入我的成长空间",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
}
async function nav(page, name) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
}
async function noOverflow(page, label) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    `${label} horizontal overflow`,
  );
}

try {
  await student.goto(base);
  await expect(student.getByRole("heading", { level: 1 })).toContainText(
    "每一份心情",
  );
  await noOverflow(student, "Desktop home");
  await student.screenshot({
    path: resolve(artifactDir, "desktop-home.png"),
    fullPage: true,
  });
  record("桌面首页实际渲染，无横向溢出");

  await student
    .getByRole("button", { name: "登录 / 注册", exact: true })
    .click();
  let dialog = student.getByRole("dialog");
  await dialog.getByRole("button", { name: "山东大区", exact: true }).click();
  await dialog.getByLabel("账号", { exact: true }).fill("hainan.student");
  await dialog.getByLabel("密码", { exact: true }).fill("Growup123!");
  await dialog
    .getByRole("button", { name: "进入我的成长空间", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("不属于所选区域");
  await dialog.getByRole("button", { name: "海南大区", exact: true }).click();
  await dialog
    .getByRole("button", { name: "进入我的成长空间", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(student.getByRole("heading", { level: 1 })).toContainText(
    "林小满",
  );
  record("选错大区被服务器拒绝，切回正确大区登录成功");

  await student
    .getByRole("button", { name: "记录今天的心情", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.getByRole("button", { name: "很开心", exact: true }).click();
  await dialog.getByRole("button", { name: "朋友", exact: true }).click();
  await dialog.locator("textarea").fill("今天和朋友一起认真完成了练习。");
  await dialog
    .getByRole("button", { name: "收好今天的心情", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await student
    .getByRole("button", { name: "看看今天的心情", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await expect(dialog.locator("textarea")).toHaveValue(
    "今天和朋友一起认真完成了练习。",
  );
  await expect(
    dialog.getByRole("button", { name: "很开心", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "还不错", exact: true }).click();
  await dialog
    .getByRole("button", { name: "收好今天的心情", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await nav(student, "心情记录");
  await expect(student.locator(".record-row").first()).toContainText(
    "今天和朋友",
  );
  await expect(student.locator(".record-row").first()).toContainText("还不错");
  record("打卡保存、当日更新及原备注回填真实通过");

  await nav(student, "我的星图");
  await student
    .getByRole("button", { name: "写一片成长碎片", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.getByLabel("给今天一个标题").fill("浏览器验收的成长碎片");
  await dialog
    .locator("textarea")
    .fill("这一刻，我发现认真记录也能让普通的一天变得珍贵。");
  await dialog
    .getByRole("button", { name: "珍藏这片成长碎片", exact: true })
    .click();
  await expect(
    student
      .locator(".journal-card")
      .filter({ hasText: "浏览器验收的成长碎片" }),
  ).toBeVisible();
  await student.reload();
  await expect(
    student
      .locator(".journal-card")
      .filter({ hasText: "浏览器验收的成长碎片" }),
  ).toBeVisible();
  record("私人日记创建并在浏览器刷新后保持");

  await nav(student, "成长探索");
  await student.getByRole("button", { name: /Star-Track 成长观察/ }).click();
  dialog = student.getByRole("dialog");
  await expect(dialog.locator(".tool-links button")).toHaveCount(18);
  await expect(dialog.locator(".tool-links a")).toHaveCount(0);
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();
  await student.getByRole("button", { name: /家庭成长支持/ }).click();
  await student
    .getByRole("dialog")
    .getByRole("button", { name: "提交家庭支持需求" })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.locator("textarea").fill("希望了解适合家庭共同参加的成长活动。");
  await dialog
    .getByRole("button", { name: "提交支持需求", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  record("18个应用内工具入口可见，家庭支持需求可提交");

  await nav(student, "匿名树洞");
  await expect(student.locator(".post-card")).toHaveCount(3);
  await student
    .getByRole("button", { name: "留一张心情纸条", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.getByLabel("你的化名").fill("验收小树苗");
  await dialog.locator("textarea").fill("今天的小小进步，也值得认真记住。");
  await dialog
    .getByRole("button", { name: "把这份心情寄出去", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    student.locator(".post-card").filter({ hasText: "验收小树苗" }),
  ).toHaveCount(0);
  await student.getByRole("button", { name: "我的纸条", exact: true }).click();
  await expect(
    student.locator(".post-card").filter({ hasText: "验收小树苗" }),
  ).toContainText("等待温柔上架");
  record("树洞投稿待审，公共列表隐藏，仅本人可查状态");

  await login(admin, "admin");
  await expect(admin.getByRole("heading", { level: 1 })).toContainText(
    "让关怀及时发生",
  );
  await expect(
    admin.locator(".admin-stat").filter({ hasText: "优先关怀" }),
  ).toContainText("1");
  await expect(
    admin.locator(".admin-stat").filter({ hasText: "需要关注" }),
  ).toContainText("1");
  await noOverflow(admin, "Admin overview");
  await admin.screenshot({
    path: resolve(artifactDir, "desktop-admin.png"),
    fullPage: true,
  });
  await nav(admin, "学生关怀");
  await expect(admin.locator("tr").filter({ hasText: "苏思远" })).toContainText(
    "待补充记录",
  );
  await admin
    .locator("tr")
    .filter({ hasText: "许小雨" })
    .getByRole("button", { name: "查看", exact: true })
    .click();
  dialog = admin.getByRole("dialog");
  await expect(dialog).toContainText("优先关怀");
  await expect(dialog).not.toContainText("只有本人可见的演示心情备注");
  await dialog.locator("textarea").fill("已进行课间关怀，约定下一次交流时间。");
  await dialog
    .getByRole("button", { name: "保存跟进记录", exact: true })
    .click();
  await expect(dialog).toContainText("已进行课间关怀");
  await expect(dialog).toContainText("优先关怀");
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();
  record("后台红黄提示、缺勤状态及关怀跟进通过，跟进不清除持续提示");

  await nav(admin, "树洞审核");
  let card = admin
    .locator(".moderation-card")
    .filter({ hasText: "验收小树苗" });
  await card.getByRole("button", { name: "审核通过", exact: true }).click();
  await expect(card).toHaveCount(0);
  await student.getByRole("button", { name: "所有心事", exact: true }).click();
  await expect(
    student.locator(".post-card").filter({ hasText: "验收小树苗" }),
  ).toBeVisible();
  let post = student.locator(".post-card").filter({ hasText: "验收小树苗" });
  await post
    .getByRole("button", { name: "给验收小树苗送温暖", exact: true })
    .click();
  await expect(
    post.getByRole("button", { name: "给验收小树苗送温暖" }),
  ).toBeDisabled();
  await post.getByRole("button", { name: /回应/ }).click();
  dialog = student.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "写一句温柔回应", exact: true })
    .click();
  dialog = student.getByRole("dialog");
  await dialog.locator("textarea").fill("为认真生活的你，送来一份小小的鼓励。");
  await dialog
    .getByRole("button", { name: "把这份心情寄出去", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await admin.reload();
  card = admin.locator(".moderation-card").filter({ hasText: "验收小树苗" });
  await card.getByRole("button", { name: "通过回复", exact: true }).click();
  await expect(card).toHaveCount(0);
  await student.reload();
  post = student.locator(".post-card").filter({ hasText: "验收小树苗" });
  await post.getByRole("button", { name: "回应 1", exact: true }).click();
  await expect(student.getByRole("dialog")).toContainText("为认真生活的你");
  await student
    .getByRole("dialog")
    .getByRole("button", { name: "关闭弹窗" })
    .click();
  record("后台审核发布、送温暖防重复、回复审核后可见形成完整闭环");

  await post.getByRole("button", { name: "举报", exact: true }).click();
  dialog = student.getByRole("dialog");
  await dialog.locator("textarea").fill("验收举报后暂时隐藏并交人工复核。");
  await dialog
    .getByRole("button", { name: "提交举报并隐藏纸条", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    student.locator(".post-card").filter({ hasText: "验收小树苗" }),
  ).toHaveCount(0);
  await nav(admin, "支持需求");
  const service = admin
    .locator(".service-row")
    .filter({ hasText: "希望了解适合家庭共同参加" });
  await service
    .getByRole("button", { name: "标记已跟进", exact: true })
    .click();
  await expect(service).toContainText("已跟进");
  record("举报即时隐藏与支持需求后台跟进通过");

  await student.setViewportSize({ width: 375, height: 812 });
  for (const name of ["首页", "心情", "探索", "星图", "树洞"]) {
    await student
      .locator(".mobile-nav")
      .getByRole("button", { name, exact: true })
      .click();
    await noOverflow(student, `375px ${name}`);
  }
  await student
    .locator(".mobile-nav")
    .getByRole("button", { name: "首页", exact: true })
    .click();
  if (await student.locator(".toast button").count())
    await student.locator(".toast button").click();
  await student.screenshot({
    path: resolve(artifactDir, "mobile-home.png"),
    fullPage: false,
  });
  await student.setViewportSize({ width: 812, height: 375 });
  await noOverflow(student, "Landscape home");
  await student.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await student.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    true,
  );
  await admin.setViewportSize({ width: 375, height: 812 });
  await admin.goto(`${base}/#admin`);
  await expect(admin.getByRole("heading", { level: 1 })).toBeVisible();
  await noOverflow(admin, "375px Admin");
  record("375px全部学生页面、横屏及后台无页面横向溢出，减少动态效果生效");

  assert.deepEqual(errors, [], `Browser runtime errors: ${errors.join(", ")}`);
  record("浏览器运行时无未捕获错误");
  writeFileSync(
    resolve(artifactDir, "browser-result.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        source:
          "built dist served by real local API with isolated in-memory SQLite",
        checks,
        errors,
        screenshots: [
          "desktop-home.png",
          "desktop-admin.png",
          "mobile-home.png",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `\n${checks.length} browser checks passed. Artifacts: ${artifactDir}`,
  );
} catch (error) {
  console.error("Browser errors:", errors);
  await student
    .screenshot({
      path: "/tmp/growup-test-student-failure.png",
      fullPage: true,
    })
    .catch(() => {});
  await admin
    .screenshot({ path: "/tmp/growup-test-admin-failure.png", fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
  await new Promise((done) => app.close(done));
}
