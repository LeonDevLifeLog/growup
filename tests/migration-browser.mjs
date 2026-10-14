import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createApp } from "../server/app.mjs";

const output = resolve("docs/verification");
mkdirSync(output, { recursive: true });
const app = createApp({ dbPath: ":memory:", demo: true });
await new Promise((done) => app.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${app.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1060 },
  timezoneId: "Asia/Shanghai",
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
const foreign = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
context.on("page", (popup) => {
  if (popup !== page) foreign.push("Unexpected new tab");
});
page.on("request", (request) => {
  if (
    !request.url().startsWith(base) &&
    !request.url().startsWith("data:") &&
    !request.url().startsWith("blob:")
  )
    foreign.push(request.url());
});
const check = (message) => {
  checks.push(message);
  console.log("✓ " + message);
};
const dialog = () => page.getByRole("dialog");
async function api(path, method = "GET", body) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch("/api" + path, {
        method,
        headers: {
          Authorization: "Bearer " + sessionStorage.getItem("growup-token"),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    { path, method, body },
  );
}
async function nav(name) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
}
async function fillSchema(fields) {
  const groups = dialog().locator(".schema-field");
  await expect(groups).toHaveCount(fields.length);
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const group = groups.nth(i);
    if (field.type === "single") await group.getByRole("radio").first().check();
    else if (field.type === "multi")
      await group.getByRole("checkbox").first().check();
    else if (field.type === "number") {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      const initial = field.label.includes("身高")
        ? 160
        : field.label.includes("体重")
          ? 50
          : min;
      await group
        .locator("input")
        .fill(String(Math.min(max, Math.max(min, initial))));
    } else if (field.type === "time")
      await group.locator("input").fill("22:00");
    else if (field.type === "date")
      await group
        .locator("input")
        .fill(
          new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
        );
    else
      await group
        .locator("textarea,input")
        .fill(
          field.id === "school" ? "海口向阳实验学校" : "浏览器实际填写与回顾",
        );
  }
}
async function noOverflow(label) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    label,
  );
}
try {
  await page.goto(base);
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).click();
  await dialog().getByLabel("账号", { exact: true }).fill("hainan.student");
  await dialog().getByLabel("密码", { exact: true }).fill("Growup123!");
  await dialog()
    .getByRole("button", { name: "进入我的成长空间", exact: true })
    .click();
  await expect(dialog()).toHaveCount(0);
  await nav("成长探索");
  await page.getByRole("button", { name: /Star-Track 成长观察/ }).click();
  await expect(dialog().locator(".tool-links button")).toHaveCount(18);
  await expect(dialog().locator("a")).toHaveCount(0);
  const tools = (await api("/tools")).tools;
  assert.equal(tools.length, 19);
  // Enter the first tool via the visible original module, then the in-app catalog.
  await dialog().locator(".tool-links button").first().click();
  await dialog().getByRole("button", { name: "全部成长工具" }).click();
  await expect(dialog().locator("[data-tool-id]")).toHaveCount(19);
  const catalogUrl = page.url();
  let expectedRecords = 0;
  for (const tool of tools) {
    await dialog().locator(`[data-tool-id="${tool.id}"]`).click();
    await expect(dialog().locator(".tool-form")).toBeVisible();
    await fillSchema(tool.profiles[0].fields);
    await dialog()
      .getByRole("button", {
        name: tool.mode === "tracker" ? "保存这份成长记录" : "生成我的观察结果",
        exact: true,
      })
      .click();
    await expect(
      dialog().getByRole("tab", { name: "观察结果" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(dialog().locator(".growth-report")).toBeVisible();
    await expect(dialog().getByRole("alert")).toHaveCount(0);
    assert.equal((await api(`/tools/${tool.id}/records`)).records.length, 1);
    expectedRecords++;
    assert.equal(page.url(), catalogUrl, `${tool.id} unexpectedly navigated`);
    if (tool.id === "ya") {
      await page.screenshot({
        path: resolve(output, "native-tool-result.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await noOverflow("375px tool result");
      await page.screenshot({
        path: resolve(output, "native-tool-mobile.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1060 });
    }
    await dialog().getByRole("button", { name: "全部成长工具" }).click();
  }
  check(
    `19个工具均通过实际填写、服务端保存和应用内结果展示，URL与标签页保持稳定（${expectedRecords}份记录）`,
  );
  await dialog().locator('[data-tool-id="sl"]').click();
  await dialog()
    .getByRole("tab", { name: /历史记录/ })
    .click();
  await dialog().getByRole("button", { name: "继续编辑", exact: true }).click();
  await expect(dialog().locator('input[type="radio"]:checked')).not.toHaveCount(
    0,
  );
  await dialog()
    .getByRole("button", { name: "保存这份成长记录", exact: true })
    .click();
  assert.equal((await api("/tools/sl/records")).records.length, 1);
  await dialog()
    .getByRole("tab", { name: /历史记录/ })
    .click();
  const download = page.waitForEvent("download");
  await dialog().getByRole("button", { name: "导出记录", exact: true }).click();
  const file = await download;
  const filePath = await file.path();
  assert.ok(file.suggestedFilename().endsWith(".json"));
  await dialog().locator('input[type="file"]').setInputFiles(filePath);
  await expect(
    page.getByRole("status").filter({ hasText: "跳过 1 条重复记录" }),
  ).toBeVisible();
  const backup = JSON.parse(readFileSync(filePath, "utf8"));
  const importBatchSizes = [];
  const recordBatchSize = (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/tools/sl/import")
    )
      importBatchSizes.push(request.postDataJSON().records.length);
  };
  page.on("request", recordBatchSize);
  await dialog()
    .locator('input[type="file"]')
    .setInputFiles({
      name: "large-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...backup,
          records: Array(205).fill(backup.records[0]),
        }),
      ),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "跳过 205 条重复记录" }),
  ).toBeVisible();
  page.off("request", recordBatchSize);
  assert.deepEqual(importBatchSizes, [100, 100, 5]);
  await dialog().getByRole("tab", { name: "观察结果" }).click();
  await dialog().getByRole("button", { name: "生成月度回顾" }).click();
  await expect(dialog().locator(".growth-report")).toContainText("睡眠");
  const currentMonth = await dialog()
    .locator('input[type="month"]')
    .inputValue();
  const previous = new Date(`${currentMonth}-01T12:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousMonth = previous.toISOString().slice(0, 7);
  let signalOld, releaseOld;
  const oldArrived = new Promise((resolve) => {
    signalOld = resolve;
  });
  const oldGate = new Promise((resolve) => {
    releaseOld = resolve;
  });
  const reportRoute = async (route) => {
    const response = await route.fetch();
    if (
      new URL(route.request().url()).searchParams.get("month") === currentMonth
    ) {
      signalOld();
      await oldGate;
    }
    await route.fulfill({ response });
  };
  await page.route("**/api/tools/sl/report?*", reportRoute);
  await dialog().getByRole("button", { name: "生成月度回顾" }).click();
  await oldArrived;
  await dialog().locator('input[type="month"]').fill(previousMonth);
  await dialog().getByRole("button", { name: "生成月度回顾" }).click();
  await expect(dialog().locator(".growth-report h3")).toContainText(
    previousMonth,
  );
  const oldReturned = page.waitForResponse((response) =>
    response.url().includes(`/tools/sl/report?month=${currentMonth}`),
  );
  releaseOld();
  await oldReturned;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(dialog().locator(".growth-report h3")).toContainText(
    previousMonth,
  );
  await page.unroute("**/api/tools/sl/report?*", reportRoute);
  await dialog()
    .getByRole("tab", { name: /历史记录/ })
    .click();
  await dialog()
    .getByRole("button", { name: /^删除 / })
    .click();
  await dialog().getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(
    dialog().getByText("还没有成长记录", { exact: true }),
  ).toBeVisible();
  check(
    "长期工具编辑、真实JSON下载、205条分批导入去重、月报乱序防覆盖及删除闭环通过",
  );
  await dialog().getByRole("button", { name: "关闭弹窗" }).click();

  await nav("我的星图");
  await page
    .getByRole("button", { name: "写一片成长碎片", exact: true })
    .click();
  await dialog().getByLabel("给今天一个标题").fill("星图迁移验收");
  await dialog()
    .getByLabel("想记住的瞬间")
    .fill("用同一份成长记录，连接生活中的学习和朋友。");
  await dialog().getByRole("button", { name: "很开心", exact: true }).click();
  await dialog().getByRole("button", { name: "学习", exact: true }).click();
  await dialog().getByRole("button", { name: "朋友", exact: true }).click();
  await dialog().getByLabel("一个小目标（选填）").fill("和朋友一起读书");
  await dialog()
    .getByRole("button", { name: "珍藏这片成长碎片", exact: true })
    .click();
  await expect(
    page.locator('svg[aria-label="由记录标签和共现关系生成的成长星图"]'),
  ).toBeVisible();
  await expect(
    page.locator(".journal-card").filter({ hasText: "星图迁移验收" }),
  ).toContainText("和朋友一起读书");
  const map = await api("/journals/map");
  assert.ok(map.edges.some((edge) => edge.weight > 0));
  await page.getByRole("button", { name: "筛选标签 学习，1 次" }).click();
  await expect(page.getByLabel("搜索日记")).toHaveValue("学习");
  await page.getByLabel("搜索日记").fill("");
  const journalCard = page
    .locator(".journal-card")
    .filter({ hasText: "星图迁移验收" });
  await journalCard.getByRole("checkbox").check();
  const partialDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出已选 1 篇", exact: true })
    .click();
  const partial = await partialDownload;
  await page
    .locator('.journal-tools input[type="file"]')
    .setInputFiles(await partial.path());
  await expect(
    page.getByRole("status").filter({ hasText: "跳过 1 条重复记录" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".journal-card").filter({ hasText: "星图迁移验收" }),
  ).toBeVisible();
  await noOverflow("desktop star map");
  await page.screenshot({
    path: resolve(output, "native-starmap.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await noOverflow("375px star map");
  await page.screenshot({
    path: resolve(output, "native-starmap-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1060 });
  check(
    "星图心情/标签/目标保存、真实共现图、标签搜索、选择导出、备份合并、刷新持久化与375px布局通过",
  );

  await nav("成长探索");
  const forms = (await api("/service-forms")).forms;
  for (const form of forms) {
    await page
      .getByRole("button", {
        name: form.id === "fk" ? /合作与联系/ : /校园成长支持/,
      })
      .click();
    await dialog()
      .getByRole("button", { name: form.name, exact: true })
      .click();
    await fillSchema(form.profiles[0].fields);
    await dialog()
      .getByRole("button", { name: "提交" + form.name, exact: true })
      .click();
    await expect(dialog()).toHaveCount(0);
  }
  check("4份需求与反馈表通过真实页面选择、填写及区域内提交");
  assert.equal(
    foreign.length,
    0,
    "Unexpected external requests or popups: " + foreign.join(", "),
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  check("全流程无外站请求、无新窗口、无未捕获浏览器错误");
  writeFileSync(
    resolve(output, "migration-browser-result.json"),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        checks,
        errors,
        externalRequests: foreign,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise((done) => app.close(done));
}
