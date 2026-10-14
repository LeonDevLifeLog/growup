import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// The role guide lives in docs/ and is served from /guide/ by the app.
const guide = resolve("docs/guide/index.html");
const guidePlugin = {
  name: "growup-guide",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!/^\/guide\/?(index\.html)?(\?.*)?$/.test(req.url)) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(readFileSync(guide));
    });
  },
  closeBundle() {
    mkdirSync(resolve("dist/guide"), { recursive: true });
    copyFileSync(guide, resolve("dist/guide/index.html"));
  },
};

export default defineConfig({
  esbuild: { jsx: "automatic" },
  plugins: [guidePlugin],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { outDir: "dist" },
});
