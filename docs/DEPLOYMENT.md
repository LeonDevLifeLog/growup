# Docker 部署

服务镜像包含 Node.js API 和构建后的学生端、网页管理后台。需要 Docker Engine 与 Compose v2。默认使用国内 Node 镜像和 npm 源；构建参数可以按所在网络更换。

## 启动

```sh
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/api/health
```

默认只绑定本机 `127.0.0.1:8080`，供同机 HTTPS 反向代理使用。返回 `{"ok":true,"demo":false}`。网页位于 `/`，管理后台位于 `/#admin`。容器内固定监听 8787；通过 `APP_PORT` 改变宿主机端口，通过 `BIND_ADDRESS` 指定监听地址。

数据库保存在 Compose 管理的 `growup-data` 命名卷中。正式服务始终关闭演示模式，不会加载本机 `data/demo.sqlite`。镜像运行用户为 `node`；应用文件只读，数据卷可写，配置了健康检查、日志轮转和 `unless-stopped` 重启策略。

## 初始化区域管理员

先在受控环境准备权限为 `600` 的临时 `operator.json`，不要提交到版本库或复制到镜像。内容示例：

```json
{
  "regionId": "hainan",
  "schoolName": "填写实际学校名称",
  "account": "填写管理员账号",
  "password": "填写实际强密码",
  "name": "填写管理员称呼"
}
```

```sh
chmod 600 operator.json
docker compose exec -T app node server/bootstrap.mjs < operator.json
rm operator.json
```

密码通过标准输入传入，不放进命令参数、环境变量或日志。初始化不会覆盖已有账号。分别为需要开通的区域创建管理员；不提供公网管理员注册。

## 更新和持久化

```sh
docker compose up -d --build
docker compose logs --tail=100 app
```

重新创建容器不会删除命名卷。`docker compose down` 保留数据；不要使用 `down -v`，该参数会删除数据库卷。当前 SQLite 部署采用单实例，不要把同一个数据库文件挂载给多个跨主机实例。

备份应先停止写入，再将完整数据目录保存到受限备份目录；包括 SQLite 的数据库、WAL 和 SHM 文件。恢复时同样先停止服务，将完整目录恢复到数据卷并保持 uid/gid 1000 的写权限，然后启动并核验账号与记录。不要只复制运行中主数据库文件。

## 微信与公网

正式环境将域名的 HTTPS 请求反向代理到应用端口，保留 `/api/` 路径。将小程序 `miniprogram/config.js` 的 `apiBase` 配置为 `https://实际域名/api`，在微信后台配置 request 合法域名，并使用真实 AppID。

本地容器健康和浏览器验证不表示公网证书、微信白名单或真机发布已经完成；这些步骤需实际域名、服务器和微信账号。

容器构建和数据持久化配置依据 [Docker Node.js 指南](https://docs.docker.com/guides/nodejs/) 与 [Compose 持久化说明](https://docs.docker.com/compose/gettingstarted/)。
