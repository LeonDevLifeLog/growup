import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { House, Compass, Orbit, MessageCircle, UserRound } from "lucide-react";
import { chromium } from "@playwright/test";

const output = fileURLToPath(
  new URL("../miniprogram/assets/tabbar/", import.meta.url),
);
const icons = {
  today: House,
  explore: Compass,
  starmap: Orbit,
  treehole: MessageCircle,
  profile: UserRound,
};
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  for (const [name, icon] of Object.entries(icons)) {
    for (const selected of [false, true]) {
      const svg = renderToStaticMarkup(
        createElement(icon, {
          size: 63,
          color: selected ? "#245c45" : "#7a857e",
          strokeWidth: selected ? 2.25 : 1.85,
        }),
      );
      const png = await page.evaluate(async (source) => {
        const image = new Image();
        image.src =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 81;
        canvas.getContext("2d").drawImage(image, 9, 9, 63, 63);
        return canvas.toDataURL("image/png").split(",")[1];
      }, svg);
      writeFileSync(
        `${output}${name}${selected ? "-selected" : ""}.png`,
        Buffer.from(png, "base64"),
      );
    }
  }
  console.log("已生成 5 组透明 PNG 导航图标，81 × 81，含普通和选中状态。");
} finally {
  await browser.close();
}
