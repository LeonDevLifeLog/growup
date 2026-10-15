import { resolve } from "node:path";
import { writeSync } from "node:fs";
import { createApp } from "./app.mjs";
import { createLogger, describeError } from "./logging.mjs";

const logger = createLogger();
// Exit after a fatal error; write synchronously so the last record is retained.
const fatalLogger = createLogger({
  stderr: { write: (line) => writeSync(2, line) },
});
process.once("uncaughtException", (error, origin) => {
  fatalLogger("error", "process_failed", {
    origin,
    error: describeError(error),
  });
  process.exit(1);
});

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw Object.assign(new Error("PORT 必须为 0–65535 的整数"), {
    code: "INVALID_PORT",
  });
const demo = process.env.DEMO_MODE === "1";
const app = createApp({
  dbPath: resolve(
    process.env.DATA_PATH ?? (demo ? "data/demo.sqlite" : "data/growup.sqlite"),
  ),
  demo,
  setupToken: process.env.SETUP_TOKEN || "",
  logger,
});
app.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  logger("info", "server_started", {
    host: process.env.HOST ?? "127.0.0.1",
    port: app.address().port,
    demo,
    nodeVersion: process.version,
  });
});
app.once("error", (error) => {
  logger("error", "server_failed", { error: describeError(error) });
  process.exitCode = 1;
  app.close();
});
app.once("close", () => logger("info", "server_stopped"));
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    logger("info", "server_stopping", { signal });
    app.close();
  });
