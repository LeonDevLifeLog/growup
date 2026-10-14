// Cross-platform quick start (Windows included): build, then serve with demo data.
// Usage: npm run demo        or  npm run demo -- --prod --port 9000
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const prod = args.includes("--prod");
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "8787";
if (!/^\d+$/.test(port)) throw new Error(`端口必须是数字：${port}`);

const build = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build", "--silent"],
  {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
  },
);
if (build.status !== 0) process.exit(build.status ?? 1);

const env = {
  ...process.env,
  HOST: "127.0.0.1",
  PORT: port,
  DEMO_MODE: prod ? "0" : "1",
  DATA_PATH: prod ? "data/growup.sqlite" : "data/demo.sqlite",
};
const server = spawn(
  process.execPath,
  ["--disable-warning=ExperimentalWarning", "server/index.mjs"],
  { cwd: root, env, stdio: "inherit" },
);
const url = `http://127.0.0.1:${port}`;
// Print the addresses once the server answers its health check.
for (let attempt = 0; attempt < 60; attempt++) {
  const ready = await fetch(`${url}/api/health`).then(
    (response) => response.ok,
    () => false,
  );
  if (ready) {
    console.log(`
成长健研社（${prod ? "正式模式" : "演示模式"}）
  学生端    ${url}/
  管理后台  ${url}/#admin
  使用指南  ${url}/guide/
${
  prod
    ? "  首次打开网页会进入“首次安装初始化”向导。"
    : "  演示账号：hainan.student / hainan.admin，密码 Growup123!，登录时选择“海南”；邀请码 HN2026。"
}
  按 Ctrl+C 停止。`);
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill("SIGTERM"));
server.on("exit", (code) => process.exit(code ?? 0));
