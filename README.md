# 成长健研社

青少年身心健康成长服务品牌。

面向校园的青少年成长陪伴应用。包含原生微信小程序、可在浏览器体验的学生端、独立网页管理后台，以及真实 SQLite API。区域账号隔离、每日心情记录、红黄绿关怀提示、私人日记、匿名树洞审核与服务跟进均在本地服务运行。

## 快速体验

需要 Node.js 22.13+（建议 24+；本次验证 26.8.1）、npm。浏览器测试还需本机 Google Chrome。

```sh
npm ci --registry=https://registry.npmmirror.com
npm run dev
```

- 学生端：<http://127.0.0.1:5173/>
- 关怀后台：<http://127.0.0.1:5173/#admin>
- API：<http://127.0.0.1:8787/api/health>

`npm run dev` 默认明确开启本地演示模式，数据保存于 `data/demo.sqlite`。演示数据全部虚构。`npm start` 默认关闭演示模式且使用独立的 `data/growup.sqlite`；两类数据库拒绝混用。

| 大区 | 学生账号 | 管理员账号 | 学校邀请码 |
| --- | --- | --- | --- |
| 海南 | `hainan.student` | `hainan.admin` | `HN2026` |
| 山东 | `shandong.student` | `shandong.admin` | `SD2026` |
| 广东 | `guangdong.student` | `guangdong.admin` | `GD2026` |

演示密码统一为 `Growup123!`。学生或管理员必须选择其所属大区；海南账号选择山东会由 API 拒绝。树洞只展示当前区域已审核的内容。海南后台有红色、黄色、绿色、样本不足/待补充等虚构样本。

## 微信小程序

在微信开发者工具中导入 `miniprogram/`。原生 WXML/WXSS/JS，10 个页面、5 个 Tab。API 配置见 `miniprogram/config.js`；本地占位 AppID 为 `touristappid`。详细导入和真机网络说明见 [小程序说明](miniprogram/README.md)。

当前已完成源码和静态结构检查，全部 10 个页面通过开发者工具内置 `wcc` 的独立 WXML 编译；CLI 被“服务端口已关闭”阻止，尚未取得 IDE 完整项目编译或真机结果。实际发布需要微信 AppID、HTTPS API 与合法域名配置。成长工具通过原生页面填写与生成结果，不依赖外站业务域名、复制链接或外站跳转。

## 本地功能

- 学校邀请码决定注册区域和学校；令牌授权区域与角色，禁止跨区访问对象或越权审核。
- 1–5 级心情，每个上海自然日一条，可更新；连续低落 3–4 天黄色、≥5 天红色、最近连续 7 天均≥3 分绿色；断签及样本不足独立说明。
- 学生端不展示风险标签。管理端提供当前提示、分数日期和人工跟进记录；不读取私人日记、心情备注和标签。
- 区域内化名树洞，先审后发、回复审核、每日一次温暖、举报立即隐藏、本人查看审核状态。
- 18 个 Star-Track 工具原生化：9个持续记录工具与9个现状问答工具；另有抗碎片化研究问答，共19个工具。保留年龄、场景和记录子页签，提供本人报告、月度回顾、历史与JSON备份合并。
- STARMAP 私人日记支持心情/感受强度/标签/小目标、共现关系星图、搜索删除、备份导入导出；两端支持选择片段，网页保存SVG、小程序提供生成图片及保存相册控件。
- 青少年成长需求、教师需求、活动服务反馈、使用体验反馈4份结构化表单，在应用内填写并由本区域后台跟进。
- 本地预警是管理后台提醒，尚未接入微信订阅、短信或外部报警推送。

## 产品与数据

成长健研社官网、网页学生端、微信小程序与关怀管理后台属于同一产品体系，使用统一品牌。官网入口：[成长健研社](https://sdsqsnwh.cn/cz/)。功能范围和验收规则见 [PRODUCT](docs/PRODUCT.md)。

Star-Track、STARMAP、抗碎片化成长观察及需求反馈均可在应用内完成。账号保存个人记录和报告，JSON备份使用成长健研社v1格式；已有v1备份继续适用。工具规则见[问答工具说明](docs/MIGRATION_QUESTIONNAIRES.md)及[长期观察说明](docs/MIGRATION_TRACKERS.md)。

成长报告用于自我了解与交流，不构成医学诊断。课程、活动与支持需求由所属区域工作人员跟进，具体安排在沟通后确认。

## 验证

```sh
npm run check       # 构建、API测试、小程序结构检查与本机可用的WXML编译
npm run test:ui     # 原有业务闭环；独立内存库
npm run test:ui:migration # 19工具/报告/备份/星图/4表单的真实Chrome闭环
node miniprogram/api-smoke.mjs # 原生Page事件与真实API联调，不代替微信运行
node scripts/extract-questionnaires.mjs --verify # 公开问答算法1600案例对照
```

浏览器测试实际操作选区拒绝、登录、打卡/当天更新、私人日记刷新、18工具入口、服务提交、树洞投稿、管理员跟进、帖子及回复审核、温暖防重、举报隐藏，并检查 375px、桌面与横屏。截图与结果写入 `docs/verification/`。完整证据范围见 [验证记录](docs/VALIDATION.md)。

## 构建与运行

```sh
npm run build
DEMO_MODE=1 npm start     # 本地构建产物＋独立演示库，8787端口
```

正式初始化需要本地受控 JSON 输入，例如创建一个临时 `operator.json`（勿提交版本库）：

```json
{
  "regionId": "hainan",
  "account": "school.admin",
  "password": "替换为实际的强密码",
  "name": "学校管理员",
  "inviteCode": "替换为实际学校邀请码",
  "schoolName": "实际学校名称"
}
```

```sh
node server/bootstrap.mjs < operator.json
rm operator.json
npm start
```

仅本机 bootstrap 可创建管理员，对外不开放管理员注册。它不会覆盖已有账号/邀请码。默认每个区域有一个占位学校，正式初始化可设置实际学校名。当前支持三个固定区域、每区一个学校；更多区域、多学校及细分校级权限属于后续扩展，不能用来声称已经覆盖所有学校结构。

环境变量：`PORT`（8787）、`HOST`（127.0.0.1）、`DATA_PATH`（数据库路径）、`DEMO_MODE`（仅 `1` 开启）。真机局域网联调可显式 `HOST=0.0.0.0 DEMO_MODE=1 npm start`，小程序 API 使用电脑局域网地址；不要把手机 `127.0.0.1` 当作电脑地址。

正式提供服务还需实际学校与区域信息、学校/监护人授权和隐私流程、内容使用许可、关怀和审核值班安排、HTTPS/备份与数据删除流程、通知通道。当前代码没有部署到公网，也未发布到微信。

## 结构

```text
server/           HTTP、SQLite、授权、关怀算法、运维初始化
web/              React学生端与管理后台
miniprogram/      微信原生小程序
tests/            API集成测试与Chrome浏览器闭环
docs/             需求、参考证据、API契约、验收结果
```
