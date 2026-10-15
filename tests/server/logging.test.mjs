import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { connect } from "node:net";
import { createApp } from "../../server/app.mjs";
import { createLogger, describeError } from "../../server/logging.mjs";

function capture() {
  const stdout = [],
    stderr = [];
  const logger = createLogger({
    stdout: { write: (line) => stdout.push(line) },
    stderr: { write: (line) => stderr.push(line) },
  });
  return {
    logger,
    stdout,
    stderr,
    records: () => [...stdout, ...stderr].map(JSON.parse),
  };
}

async function fixture(t, options = {}) {
  const logs = capture();
  const app = createApp({
    dbPath: ":memory:",
    logger: logs.logger,
    ...options,
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => new Promise((resolve) => app.close(resolve)));
  return { app, logs, base: `http://127.0.0.1:${app.address().port}` };
}

test("request logs correlate responses, exclude secrets, and omit successful health probes", async (t) => {
  const { base, logs } = await fixture(t, {
    staticPath: "/nonexistent-static",
  });
  const health = await fetch(base + "/api/health");
  assert.equal(health.status, 200);
  assert.match(health.headers.get("x-request-id"), /^[a-f0-9-]{36}$/);
  assert.equal(logs.records().length, 0);
  const success = await fetch(base + "/api/regions?password=QUERY_SECRET", {
    headers: {
      Authorization: "Bearer HEADER_SECRET",
      Cookie: "session=COOKIE_SECRET",
      "X-Request-ID": "UNTRUSTED_ID",
    },
  });
  assert.equal(success.status, 200);
  const failure = await fetch(base + "/api/auth/login?token=QUERY_SECRET", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: "PRIVATE_ACCOUNT",
      password: "BODY_SECRET",
      name: "PRIVATE_STUDENT_NAME",
    }),
  });
  assert.equal(failure.status, 401);
  const body = await failure.json();
  assert.equal(body.requestId, failure.headers.get("x-request-id"));
  const records = logs.records();
  assert.equal(records.length, 2);
  const ok = records.find((entry) => entry.status === 200);
  const rejected = records.find((entry) => entry.status === 401);
  assert.equal(ok.requestId, success.headers.get("x-request-id"));
  assert.equal(rejected.requestId, body.requestId);
  assert.equal(ok.path, "/api/regions");
  assert.equal(rejected.path, "/api/auth/login");
  assert.equal(rejected.level, "warn");
  assert.equal(ok.completed, true);
  assert.equal(logs.stdout.length, 1);
  assert.equal(logs.stderr.length, 1);
  for (const record of records) {
    assert.equal(record.event, "http_request");
    assert.ok(Number.isFinite(Date.parse(record.timestamp)));
    assert.ok(record.durationMs >= 0);
  }
  assert.doesNotMatch(
    JSON.stringify(records),
    /QUERY_SECRET|HEADER_SECRET|COOKIE_SECRET|UNTRUSTED_ID|BODY_SECRET|PRIVATE_ACCOUNT|PRIVATE_STUDENT_NAME/,
  );
});

test("real SQLite failures produce correlated 500 diagnostics and failing health checks remain logged", async (t) => {
  const { app, base, logs } = await fixture(t);
  // This connection and schema belong only to this isolated in-memory server.
  app.db.exec("DROP TABLE regions");
  const response = await fetch(base + "/api/regions");
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error, "服务暂时不可用，请稍后再试");
  assert.equal(body.requestId, response.headers.get("x-request-id"));
  const records = logs.records();
  assert.equal(records.length, 2);
  assert.ok(
    records.every(
      (entry) => entry.requestId === body.requestId && entry.level === "error",
    ),
  );
  const failure = records.find((entry) => entry.event === "request_error");
  assert.equal(failure.error.code, "ERR_SQLITE_ERROR");
  assert.equal(failure.error.sqliteCode, 1);
  assert.ok(
    failure.error.stack.some((frame) => frame.includes("server/app.mjs:")),
  );
  assert.doesNotMatch(JSON.stringify(body), /SQLITE|stack|no such table/);
  app.db.exec("ALTER TABLE users RENAME COLUMN role TO missing_role");
  const health = await fetch(base + "/api/health");
  assert.equal(health.status, 500);
  assert.ok(
    logs
      .records()
      .some(
        (entry) =>
          entry.event === "http_request" &&
          entry.path === "/api/health" &&
          entry.status === 500,
      ),
  );
});

test("exception diagnostics retain call sites without multiline messages or extra properties", () => {
  const error = Object.assign(
    new Error("PASSWORD_SECRET\n    at PRIVATE_JOURNAL_CONTENT"),
    {
      code: "ERR_SQLITE_ERROR",
      errcode: 19,
      errstr: "constraint failed",
      token: "PRIVATE_TOKEN",
      sql: "PRIVATE_SQL",
    },
  );
  const detail = describeError(error);
  assert.equal(detail.type, "Error");
  assert.equal(detail.code, "ERR_SQLITE_ERROR");
  assert.ok(detail.stack.some((frame) => frame.includes("logging.test.mjs:")));
  assert.doesNotMatch(
    JSON.stringify(detail),
    /PASSWORD_SECRET|PRIVATE_JOURNAL_CONTENT|PRIVATE_TOKEN|PRIVATE_SQL/,
  );
});

test("client disconnects are recorded once as incomplete requests", async (t) => {
  const { app, logs } = await fixture(t);
  const socket = connect(app.address().port, "127.0.0.1");
  await once(socket, "connect");
  socket.write(
    "POST /api/auth/login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{",
  );
  // Allow the request handler to start awaiting the remaining body.
  await new Promise((resolve) => setTimeout(resolve, 30));
  socket.destroy();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const requests = logs
    .records()
    .filter((entry) => entry.event === "http_request");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].completed, false);
  assert.equal(requests[0].path, "/api/auth/login");
});

test("startup, graceful shutdown, and startup failure emit structured lifecycle records", async () => {
  const directory = mkdtempSync(join(tmpdir(), "growup-logging-"));
  const records = [];
  let processHandle;
  try {
    processHandle = spawn(process.execPath, ["server/index.mjs"], {
      env: {
        ...process.env,
        PORT: "0",
        HOST: "127.0.0.1",
        DATA_PATH: join(directory, "app.sqlite"),
        DEMO_MODE: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    processHandle.stdout.on("data", (chunk) => {
      output += chunk;
      let end;
      while ((end = output.indexOf("\n")) >= 0) {
        records.push(JSON.parse(output.slice(0, end)));
        output = output.slice(end + 1);
      }
    });
    let stderr = "";
    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    for (
      let i = 0;
      i < 100 && !records.some((entry) => entry.event === "server_started");
      i++
    )
      await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(records.some((entry) => entry.event === "server_started"));
    const exited = once(processHandle, "exit");
    processHandle.kill("SIGTERM");
    assert.equal((await exited)[0], 0);
    assert.ok(
      records.some(
        (entry) =>
          entry.event === "server_stopping" && entry.signal === "SIGTERM",
      ),
    );
    assert.ok(records.some((entry) => entry.event === "server_stopped"));
    assert.equal(stderr, "");
    const invalid = spawn(process.execPath, ["server/index.mjs"], {
      env: { ...process.env, PORT: "INVALID_PORT_SECRET" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let failure = "";
    invalid.stderr.on("data", (chunk) => {
      failure += chunk;
    });
    assert.equal((await once(invalid, "exit"))[0], 1);
    const record = JSON.parse(failure);
    assert.equal(record.event, "process_failed");
    assert.equal(record.error.code, "INVALID_PORT");
    assert.doesNotMatch(failure, /INVALID_PORT_SECRET/);
  } finally {
    if (processHandle && processHandle.exitCode === null)
      processHandle.kill("SIGKILL");
    rmSync(directory, { recursive: true, force: true });
  }
});
