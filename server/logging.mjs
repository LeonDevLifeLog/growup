import { randomUUID } from "node:crypto";

export function createLogger({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  return (level, event, fields = {}) => {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      pid: process.pid,
      ...fields,
    });
    (level === "info" ? stdout : stderr).write(line + "\n");
  };
}

// Exception messages can contain submitted or stored private content. Retain
// machine error codes and call sites without the message, even if multiline.
export function describeError(error) {
  const detail = {
    type: error instanceof Error ? error.constructor.name : typeof error,
  };
  if (
    typeof error?.code === "string" &&
    /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
  )
    detail.code = error.code;
  if (error?.code === "ERR_SQLITE_ERROR" && Number.isInteger(error.errcode)) {
    detail.sqliteCode = error.errcode;
    detail.sqliteCategory = error.errstr;
  }
  if (error instanceof Error && typeof error.stack === "string") {
    const header = error.message
      ? `${error.name}: ${error.message}`
      : error.name;
    if (error.stack.startsWith(header)) {
      detail.stack = error.stack
        .slice(header.length)
        .split("\n")
        .filter((line) => /^\s+at /.test(line))
        .slice(0, 20)
        .map((line) => line.trim());
    }
  }
  return detail;
}

export function observeRequest(req, res, logger) {
  const requestId = randomUUID();
  const started = performance.now();
  let path = "[invalid-url]";
  try {
    path = new URL(req.url, "http://localhost").pathname
      .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, ":id")
      .slice(0, 512);
  } catch {
    // The request handler returns the error; the logger never needs the URL.
  }
  const fields = { requestId, method: req.method, path };
  let recorded = false;
  let failed = false;
  res.setHeader("X-Request-ID", requestId);
  const durationMs = () =>
    Math.round((performance.now() - started) * 100) / 100;
  function error(cause, status = 500) {
    if (failed) return;
    failed = true;
    logger(status >= 500 ? "error" : "warn", "request_error", {
      ...fields,
      status: res.headersSent ? res.statusCode : status,
      durationMs: durationMs(),
      error: describeError(cause),
    });
  }
  function completed() {
    if (recorded) return;
    recorded = true;
    const complete = res.writableFinished;
    const status = res.headersSent ? res.statusCode : null;
    if (complete && !failed && path === "/api/health" && status < 400) return;
    logger(
      failed || status >= 500
        ? "error"
        : !complete || status >= 400
          ? "warn"
          : "info",
      "http_request",
      { ...fields, status, durationMs: durationMs(), completed: complete },
    );
  }
  res.once("finish", completed);
  res.once("close", completed);
  req.once("error", (cause) => error(cause, 400));
  res.once("error", error);
  return { requestId, error };
}
