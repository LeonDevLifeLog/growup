import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import vm from "node:vm";
import { productionFixture } from "./helpers/enrollment.mjs";

const f = await productionFixture(),
  checks = [];
const root = resolve("miniprogram"),
  cache = new Map(),
  storage = new Map(),
  navigations = [];
const app = { globalData: {} };
const wx = {
  getStorageSync: (key) => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  switchTab: (options) => navigations.push(options.url),
  reLaunch: (options) => navigations.push(options.url),
  request(options) {
    fetch(options.url, {
      method: options.method,
      headers: options.header,
      ...(options.data ? { body: JSON.stringify(options.data) } : {}),
    })
      .then(async (response) =>
        options.success({
          statusCode: response.status,
          data: await response.json(),
        }),
      )
      .catch(options.fail);
  },
};
function load(file) {
  if (file === join(root, "config.js")) return { apiBase: f.base + "/api" };
  if (cache.has(file)) return cache.get(file);
  let page;
  const module = { exports: {} };
  new vm.Script(readFileSync(file, "utf8"), { filename: file }).runInNewContext(
    {
      module,
      exports: module.exports,
      wx,
      getApp: () => app,
      Page: (definition) => {
        page = definition;
      },
      require: (path) => load(resolve(dirname(file), path + ".js")),
    },
  );
  const value = page || module.exports;
  cache.set(file, value);
  return value;
}
const makePage = () => {
  const definition = load(join(root, "pages/login/index.js"));
  return {
    ...definition,
    data: structuredClone(definition.data),
    setData(values) {
      Object.assign(this.data, values);
    },
  };
};
function record(value) {
  checks.push(value);
  console.log(`✓ ${value}`);
}
try {
  const { regionA, regionB, schoolA, schoolAdminA } = await f.setup();
  const invite = await f.invite(schoolA.id, schoolAdminA.token, { maxUses: 2 });
  const page = makePage();
  await page.onLoad();
  assert.equal(page.useDemo, undefined);
  assert.equal(page.data.regionIndex, 0);
  assert.equal(page.data.regions.length, 2);
  assert.equal(page.data.regionId, regionA.id);
  page.setData({
    mode: "register",
    inviteCode: invite.code,
    name: "原生新同学",
    account: "mini.new.student",
    password: f.password,
    confirmPassword: f.password,
  });
  await page.checkInvite();
  assert.equal(page.data.invitation.schoolId, schoolA.id);
  page.selectRegion({ detail: { value: "1" } });
  assert.equal(page.data.regionIndex, 1);
  assert.equal(page.data.regionId, regionB.id);
  assert.equal(page.data.invitation, null);
  await page.checkInvite();
  assert.match(page.data.error, /邀请码/);
  page.selectRegion({ detail: { value: "0" } });
  await page.checkInvite();
  page.setData({ confirmPassword: "incorrect" });
  await page.submit();
  assert.match(page.data.error, /密码不一致/);
  assert.equal(storage.has("growup.token"), false);
  page.setData({ confirmPassword: f.password });
  await page.submit();
  assert.equal(page.data.error, "");
  assert.equal(storage.get("growup.user").schoolId, schoolA.id);
  assert.equal(storage.get("growup.user").role, "student");
  assert.equal(navigations.at(-1), "/pages/home/index");
  assert.equal(page.data.password, "");
  assert.equal(page.data.confirmPassword, "");
  record(
    "原生选择器事件读取动态大区、切区清除学校核对、确认密码后注册并进入首页",
  );
  const uses = await f.ok(`/admin/invites/${invite.id}`, {
    token: schoolAdminA.token,
  });
  assert.equal(uses.invite.usedCount, 1);
  assert.equal(uses.uses[0].account, "mini.new.student");
  storage.clear();
  app.globalData.user = null;
  const login = makePage();
  await login.onLoad();
  login.setData({ account: "mini.new.student", password: f.password });
  await login.submit();
  assert.equal(login.data.error, "");
  assert.equal(storage.get("growup.user").schoolId, schoolA.id);
  record(
    "原生注册写入真实临时 SQLite 邀请记录，清理会话后可凭自设账号重新登录",
  );
  await f.ok(`/admin/invites/${invite.id}/revoke`, {
    method: "POST",
    token: schoolAdminA.token,
  });
  storage.clear();
  const disabled = makePage();
  await disabled.onLoad();
  disabled.setData({ inviteCode: invite.code });
  await disabled.checkInvite();
  assert.equal(disabled.data.invitation, null);
  assert.match(disabled.data.error, /停用/);
  record("邀请码停用后原生核对被服务端拒绝，不产生注册账号");
  mkdirSync("docs/verification", { recursive: true });
  writeFileSync(
    "docs/verification/mini-enrollment-result.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        checks,
        scope: "Node 执行真实 Page 事件与真实临时 API；不代替微信运行或真机",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await f.close();
}
