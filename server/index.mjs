import { resolve } from "node:path";
import { createApp } from "./app.mjs";

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error("PORT 必须为 0–65535 的整数");
const demo = process.env.DEMO_MODE === "1";
const app = createApp({
  dbPath: resolve(
    process.env.DATA_PATH ?? (demo ? "data/demo.sqlite" : "data/growup.sqlite"),
  ),
  demo,
  setupToken: process.env.SETUP_TOKEN || "",
});
app.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  console.log(
    `成长健研社服务：http://${process.env.HOST ?? "127.0.0.1"}:${app.address().port}（演示模式：${process.env.DEMO_MODE === "1" ? "开启" : "关闭"}）`,
  );
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => app.close(() => process.exit(0)));
