import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { bootstrap } from "../../server/bootstrap.mjs";
import { createApp } from "../../server/app.mjs";

export async function productionFixture({
  now = new Date(),
  staticPath,
  initialize = "bootstrap",
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "growup-enrollment-"));
  const dbPath = join(directory, "official.sqlite");
  const password = randomBytes(18).toString("base64url");
  // initialize: "web" leaves an empty database for the browser setup wizard.
  if (initialize === "bootstrap")
    bootstrap(
      { account: "platform.owner", name: "平台负责人", password },
      { dbPath },
    );
  let current = new Date(now);
  const app = createApp({
    dbPath,
    demo: false,
    now: () => current,
    ...(staticPath ? { staticPath } : {}),
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  async function request(path, { method = "GET", token, body } = {}) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  async function ok(path, options, status = 200) {
    const response = await request(path, options);
    assert.equal(
      response.status,
      status,
      `${path}: ${JSON.stringify(response.body)}`,
    );
    return response.body;
  }
  const login = (account, regionId = null, secret = password) =>
    ok("/auth/login", {
      method: "POST",
      body: { account, regionId, password: secret },
    });
  const owner =
    initialize === "bootstrap" ? await login("platform.owner") : null;
  async function create(path, body, token = owner.token) {
    const result = await ok(path, { method: "POST", body, token }, 201);
    // Staff fixtures reuse the shared password; the forced first change has its own test.
    if (path === "/users")
      app.db
        .prepare("UPDATE users SET must_change_password=0 WHERE id=?")
        .run(result.id);
    return result;
  }
  async function setup() {
    const regionA = await create("/platform/regions", { name: "西南成长大区" });
    const regionB = await create("/platform/regions", { name: "华北成长大区" });
    const schoolA = await create("/platform/schools", {
      regionId: regionA.id,
      name: "西南第一学校",
    });
    const schoolA2 = await create("/platform/schools", {
      regionId: regionA.id,
      name: "西南第二学校",
    });
    const schoolB = await create("/platform/schools", {
      regionId: regionB.id,
      name: "华北第一学校",
    });
    const accounts = [
      ["area.a", "region_admin", regionA, null],
      ["area.b", "region_admin", regionB, null],
      ["school.a", "school_admin", regionA, schoolA],
      ["school.a2", "school_admin", regionA, schoolA2],
      ["school.b", "school_admin", regionB, schoolB],
    ];
    const managers = {};
    for (const [account, role, region, school] of accounts) {
      const target = await create("/users", {
        account,
        name: account,
        password,
      });
      await ok("/admins", {
        method: "POST",
        token: owner.token,
        body: {
          userId: target.id,
          account,
          role,
          regionId: region.id,
          schoolId: school?.id,
          name: account,
          password,
        },
      });
      managers[account] = await login(account, region.id);
    }
    return {
      regionA,
      regionB,
      schoolA,
      schoolA2,
      schoolB,
      areaA: managers["area.a"],
      areaB: managers["area.b"],
      schoolAdminA: managers["school.a"],
      schoolAdminA2: managers["school.a2"],
      schoolAdminB: managers["school.b"],
    };
  }
  const invite = (schoolId, token, extra = {}) =>
    create(
      "/admin/invites",
      { schoolId, days: 30, maxUses: 100, note: "秋季学生注册", ...extra },
      token,
    ).then((result) => result.invite);
  const register = (account, regionId, code, extra = {}) =>
    request("/auth/register", {
      method: "POST",
      body: {
        account,
        regionId,
        inviteCode: code,
        password,
        name: account,
        ...extra,
      },
    });
  return {
    app,
    base,
    dbPath,
    password,
    owner,
    request,
    ok,
    login,
    create,
    setup,
    invite,
    register,
    setNow: (value) => {
      current = new Date(value);
    },
    close: async () => {
      await new Promise((resolve) => app.close(resolve));
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
