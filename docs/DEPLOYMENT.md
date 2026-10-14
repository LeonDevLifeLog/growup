# Docker 部署

服务镜像包含 Node.js API 和构建后的学生端、网页管理后台。需要 Docker Engine 与 Compose v2。默认使用国内 Node 镜像和 npm 源；构建参数可以按所在网络更换。

## 最快上线路径

1. 服务器安装 Docker Engine 与 Compose v2，取得代码。
2. 公网可访问时先设置初始化口令，再启动：`SETUP_TOKEN='随机字符串' docker compose up -d --build`。
3. 配置域名 HTTPS 反向代理到 `127.0.0.1:8080`（见下文“HTTPS 反向代理”）。
4. 浏览器打开 `https://你的域名/`，按“首次安装初始化”向导创建平台管理员，按“开通进度”清单开通大区、学校和管理员。
5. 配置定时备份（见“备份与恢复”）；如使用小程序，按“微信小程序”一节修改 API 地址并配置合法域名。

全程不需要进入容器执行命令。

## 启动

```sh
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/api/health
```

默认只绑定本机 `127.0.0.1:8080`，供同机 HTTPS 反向代理使用。返回 `{"ok":true,"demo":false,"needsSetup":true}`；`needsSetup` 为 `true` 表示尚未完成首次初始化。网页位于 `/`，管理后台位于 `/#admin`。容器内固定监听 8787；通过 `APP_PORT` 改变宿主机端口，通过 `BIND_ADDRESS` 指定监听地址。

数据库保存在 Compose 管理的 `growup-data` 命名卷中。正式服务始终关闭演示模式，不会加载本机 `data/demo.sqlite`。镜像运行用户为 `node`；应用文件只读，数据卷可写，配置了健康检查、日志轮转和 `unless-stopped` 重启策略。

## 首次初始化（浏览器完成）

容器启动后，用浏览器打开站点地址（例如 `https://你的域名/`）。系统检测到还没有平台管理员时，会自动显示“首次安装初始化”向导：

1. **开始**：阅读说明；若部署时设置了 `SETUP_TOKEN`，在此输入。
2. **平台管理员**：填写称呼、登录账号、密码和确认密码。
3. **第一个组织（可选）**：填写第一个大区和学校名称，或点击“跳过，稍后创建”。

完成后自动登录并进入“平台管理”，初始化页面和接口永久关闭（`/api/health` 中 `needsSetup` 变为 `false`）。并发提交只会有一个成功。

**初始化口令**：如果服务启动后、完成初始化前可能被他人访问（例如直接暴露在公网），请先设置初始化口令，再启动：

```sh
SETUP_TOKEN='一段只有部署人员知道的随机字符串' docker compose up -d --build
```

向导会要求输入该口令；口令错误返回403，不会写入日志。初始化完成后口令不再起作用，可以从环境中删除。仅在内网或尚未开放访问时部署，可以不设置。

**命令行应急方式**：无法使用浏览器时，仍可在容器内通过标准输入初始化（同样只能在没有平台管理员时执行）：

```sh
docker compose exec -T app node server/bootstrap.mjs < operator.json   # {"account","password","name"}
```

初始化完成后，后续登录打开 `/#admin` 选择“平台管理员登录”。开通顺序：

1. 在“平台管理”的“大区”页签点击“新增大区”（名称与数量由平台维护），再到“学校”页签点击“新增学校”。
2. 进入“用户管理”点击“新增工作人员”建档，再到“平台管理 → 管理员”点击“任命管理员”，从已有用户任命大区/学校管理员并指定归属；沿用原账号和密码。通过学校受控渠道交付凭据，管理员可在账号菜单修改密码。
3. 学校管理员选择所属大区登录 → 学校与邀请 → 设置有效期及注册名额 → 生成本校邀请码。完整邀请码仅显示一次，及时记录并交付学生。
4. 学生在网页或小程序选择大区 → 邀请码注册 → 核对学校 → 自设账号、密码和确认密码。学校后台可查使用记录，大区后台可查本区记录。

正式新库不含任何预置大区、学校、账号或邀请码。大区管理员只管理本区，可在“用户管理”建立本区工作人员并任命学校管理员；学校管理员只管理本校学生与待授权人员；平台管理员负责组织和管理账号，不读取学生关怀记录。平台可以更名/停用组织、停用管理员或重置密码；停用组织或账号撤销对应会话。

## 更新和持久化

```sh
docker compose up -d --build
docker compose logs --tail=100 app
```

重新创建容器不会删除命名卷。`docker compose down` 保留数据；不要使用 `down -v`，该参数会删除数据库卷。当前 SQLite 部署采用单实例，不要把同一个数据库文件挂载给多个跨主机实例。

## 备份与恢复

使用 SQLite 在线备份，服务无需停机，得到一份一致的单文件副本：

```sh
docker compose exec -T app node --input-type=module -e "import { DatabaseSync, backup } from 'node:sqlite'; await backup(new DatabaseSync(process.env.DATA_PATH), '/app/data/backup.sqlite')"
docker compose cp app:/app/data/backup.sqlite ./growup-$(date +%Y%m%d).sqlite
```

可将这两行放入宿主机每日定时任务，并把备份文件保存到受限目录或异地存储。备份含学生个人数据，务必控制访问权限。不要只复制运行中的 `growup.sqlite`（WAL 中可能还有未合并的数据）。

恢复时先停止服务，把备份文件放入数据卷，再由应用用户覆盖数据库并删除旧的 `-wal`、`-shm` 文件（这样文件归属保持为容器内的 `node` 用户，否则数据库会变为只读），然后启动并核验账号与记录：

```sh
docker compose stop app
docker compose cp ./growup-20261014.sqlite app:/app/data/restore.sqlite
docker compose run --rm --entrypoint sh app -c "cp /app/data/restore.sqlite /app/data/growup.sqlite && rm -f /app/data/restore.sqlite /app/data/growup.sqlite-wal /app/data/growup.sqlite-shm"
docker compose start app
```

以上备份、恢复命令已在临时 Compose 项目中实测：恢复后数据回到备份时状态，账号可正常登录。

## 旧版本升级

先备份数据库目录，再更新镜像。启动自动执行幂等升级：保留原区域、学校、学生、记录与会话，旧 `admin` 映射为 `region_admin`；旧邀请码转为摘要，升级后30天到期，10000个后续名额，升级前注册不追溯补计。不会自动删除旧组织或注入演示数据。

升级后若尚无平台管理员，打开站点按向导完成初始化，再由平台为学校创建学校管理员并发放新的限时限额邀请码。既有管理员沿用原账号；可在平台任命表单调整管理员角色和管理范围，调整后旧会话失效。学校组织的区域归属保持固定。本次升级会重建用户表约束，使待授权用户可归属大区/学校，保留用户ID、密码摘要、角色和归属。请先在备份副本验证升级，当前测试覆盖旧结构、身份映射和外键关联保留。

## HTTPS 反向代理

应用默认只监听本机 `127.0.0.1:8080`，由同机反向代理提供 HTTPS，保留 `/api/` 路径。Caddy 会自动申请证书：

```
你的域名 {
  reverse_proxy 127.0.0.1:8080
}
```

使用 Nginx 时（证书自行配置）：

```nginx
server {
  listen 443 ssl;
  server_name 你的域名;
  client_max_body_size 1m;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
  }
}
```

## 微信小程序

将 `miniprogram/config.js` 的 `apiBase` 改为 `https://你的域名/api`，在微信公众平台“开发管理 → 服务器域名”中把该域名加入 request 合法域名，并使用真实 AppID 上传发布。学生在小程序中选择大区、凭邀请码注册，与网页共用同一账号和数据。

本地容器健康和浏览器验证不表示公网证书、微信白名单或真机发布已经完成；这些步骤需实际域名、服务器和微信账号。

容器构建和数据持久化配置依据 [Docker Node.js 指南](https://docs.docker.com/guides/nodejs/) 与 [Compose 持久化说明](https://docs.docker.com/compose/gettingstarted/)。
