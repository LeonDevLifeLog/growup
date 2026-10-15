# API 契约 v1

Base `/api`；JSON；失败 `{error: '中文原因'}`；身份为 `Authorization: Bearer <token>`。标记 * 的接口需登录，管理接口分别校验 `platform_admin`、`region_admin`、`school_admin`。令牌绑定用户，服务器从用户解析区域。时间使用 ISO 字符串；自然日字段 `YYYY-MM-DD`（Asia/Shanghai）。

每个响应带 `X-Request-ID` 请求编号，API 错误响应增加同值 `requestId` 字段。500 仅返回通用错误文案和请求编号，异常类型、系统错误代码与堆栈位置由服务端日志记录；排查方式见 [服务部署](DEPLOYMENT.md#日志与错误排查)。

## 公共/账号

- `GET /health` → `{ok:true,demo:boolean}`
- `GET /health` → `{ok,demo,needsSetup}`；`needsSetup` 为 true 表示尚无平台管理员。
- `GET /setup` → `{needsSetup,tokenRequired}`。
- `POST /setup` `{setupToken?,name,account,password,regionName?,schoolName?}` → `{token,user}`，201。首次初始化：仅在正式模式且尚无平台管理员时可用，原子创建平台管理员（可选第一个大区和学校）并返回会话；已初始化或演示模式409；配置了 `SETUP_TOKEN` 时口令错误403；填学校未填大区400。操作写入管理审计，不记录密码或口令。
- `GET /regions` → `{regions:[{id,name,schools:[{id,name}]}]}`。平台配置的动态大区，仅返回启用的大区及学校；正式空库为 `[]`。
- `POST /auth/login` `{regionId,account,password}` → `{token,user}`；用户 `{id,account,name,role,regionId,regionName,schoolId,schoolName}`。
- `POST /auth/invite` `{regionId,inviteCode}` → `{invitation:{regionId,regionName,schoolId,schoolName,expiresAt}}`；仅校验并核对，不占名额。
- `POST /auth/register` `{regionId,inviteCode,account,password,name}` → `{token,user}`；强制学生角色，邀请码决定区域/学校；注册与名额、使用记录在同一事务内，201。
- `GET /auth/me` * → `{user}`
- `POST /auth/logout` * → `{ok:true}`
- `POST /auth/password` * `{currentPassword,password}` → `{token,user}`；所有角色可用。验证旧密码，新密码不能与当前密码相同（400），撤销所有旧会话并返回新会话，同时清除“需修改密码”标记。
- `user.mustChangePassword`：账号由他人新建（`POST /users`）或重置密码（他人 `PATCH /users/:id` 带 `password`）后为 true。为 true 时除 `/auth/me`、`/auth/password`、`/auth/logout` 外的接口一律返回403“请先修改初始密码后再继续使用”；网页与小程序登录后直接进入修改密码页。学生自助注册、首次初始化和本人修改不会设置该标记。

演示学生 `hainan.student` / `Growup123!`；海南管理员 `hainan.admin` / `Growup123!`。演示学校邀请码 `HN2026`、`SD2026`、`GD2026`。仅 DEMO_MODE 创建。

角色为 `user`（待授权工作人员） / `student` / `platform_admin` / `region_admin` / `school_admin`。待授权工作人员不能登录业务入口，任命后获得访问范围；其大区/学校归属可为空，仅用于用户目录分级管理。平台管理员登录时 `regionId:null`（或省略），其用户区域和学校字段为null；大区管理员学校字段为null；其他账号必须选择绑定的大区。停用账号、学校或大区不能登录或使用旧会话。账号3–40位ASCII字母/数字/点/下划线/短横线，密码8–128字符。

## 平台组织管理

仅 `platform_admin` 可调用；其他角色403。平台管理员不进入 `/admin/*` 学生关怀接口。

- `GET /platform/organizations` → `{regions:[{id,name,active}],schools:[{id,name,active,regionId,regionName}],admins:[{id,account,name,role,active,regionId,regionName,schoolId,schoolName,createdAt}]}`。
- `POST /platform/regions` `{name}` → `{id}`，201。生成动态UUID，不设固定区域。
- `POST /platform/schools` `{name,regionId}` → `{id}`，201；归属启用大区，同区校名唯一。
- `PATCH /platform/regions/:id` / `/platform/schools/:id` `{name?,active?:boolean}` → `{ok:true}`。不能迁移学校归属，停用撤销对应账号会话。
- `GET /platform/audit` → `{events:[{id,action,targetId,detail,createdAt,actorName}]}`，最近100次组织/管理员变更，不含密码。

重复名称/账号409，无效归属400，未知对象404。首位平台管理员通过下文“首次初始化”接口（网页向导）创建，`server/bootstrap.mjs` 仅作应急；已有平台管理员则拒绝重复初始化。

## 用户目录与管理员任命

三类管理员均可调用，按管理范围分级；学生和待授权用户403。管理范围由服务端根据当前账号计算，客户端传入的归属不扩大范围：

| 当前角色 | 可见/可维护的用户 | 可任命的角色 |
| --- | --- | --- |
| `platform_admin` | 全部用户 | 三类管理员 |
| `region_admin` | 本大区的待授权用户、学生、学校管理员 | 本大区学校的 `school_admin` |
| `school_admin` | 本校的待授权用户、学生 | 无 |

同级（含本人）和上级账号、其他大区或学校的账号不在范围内，操作返回403。

- `GET /users?q=&role=&page=1&assignable=1` → `{users:[User],total,page,pageSize:50,assignableRoles}`；只返回范围内用户，q按账号或称呼检索，role可选，assignable=1仅返回启用的非学生工作人员。分页从1开始。
- `POST /users` `{account,name,password,regionId?,schoolId?}` → `{id}`，201；创建待授权工作人员，忽略注入的角色。平台可不指定归属或指定启用大区/学校；大区管理员固定本大区，可选本区学校；学校管理员固定本校。指定范围外归属403。不能用此接口创建学生。
- `PATCH /users/:id` `{name?,active?:boolean,password?}` → `{ok:true}`；不返回密码，停用/重置撤销会话，禁止停用当前账号。
- `POST /admins` `{userId,role,regionId?,schoolId?}` → `{admin}`，200；从范围内启用工作人员任命或调整管理范围，保留用户ID、账号、密码，撤销旧会话。分配同级或更高角色403；大区管理员只能在本大区任命，`regionId`可省略。拒绝学生、无效归属和调整当前账号。
- `POST /admins/:id/revoke` → `{ok:true}`；撤销后保留为待授权工作人员并保留原大区/学校归属，仍由同一范围管理，退出旧会话；不能撤销当前账号。
- `PATCH /admins/:id` `{name?,active?:boolean,password?}` → `{ok:true}`。用户资料维护的兼容入口；角色/归属通过任命调整，账号不可改。

`User`含id、account、name、role、active、regionId、regionName、schoolId、schoolName、createdAt；无密码或私人记录字段。待授权用户可以没有归属，或归属某大区/学校。

## 学校邀请管理

以下需大区/学校管理员，服务器从会话取范围，忽略客户端声明的角色。大区管理员只读本区，学校管理员只管理本校。

- `GET /admin/schools` → `{schools:[{id,name,regionId,studentCount}]}`。
- `GET /admin/invites` → `{invites:[Invite]}`。
- `POST /admin/invites` `{schoolId,days:1..365,maxUses:1..10000,note?}` → `{invite:Invite & {code}}`，201；仅学校管理员，且必须本校。完整code仅本次返回，库内存摘要。
- `GET /admin/invites/:id` → `{invite:Invite,uses:[{id,account,name,registeredAt}]}`。
- `POST /admin/invites/:id/revoke` → `{ok:true}`；仅本校学校管理员。

`Invite` 为 `{id,schoolId,schoolName,codeHint,active,createdAt,expiresAt,maxUses,usedCount,note,createdByName,status}`；status为 `active` / `expired` / `exhausted` / `revoked`。后台列表与详情不返回完整code或摘要。跨区/跨校对象404。停用不影响已有学生；过期/停用/耗尽邀请均拒绝核对与注册。

## 学生

- `GET /dashboard` * → `{today,checkin,checkins,stats:{totalCheckins,streak,journalCount},journals}`；checkin 不存在为 null。
- `GET /checkins` * → `{checkins:[{id,date,score,note,tags:[]}]}`，按日期升序。
- `POST /checkins` * `{score:1..5,note,tags:[]}` → `{checkin}`；当日 upsert。
- `GET /journals` * → `{journals:[{id,title,content,createdAt}]}`
- `POST /journals` * `{title,content}` → `{journal}`
- `GET /posts?topic=all&mine=1` * → `{posts:[{id,nickname,topic,content,createdAt,warmCount,warmed,status,replies:[{id,nickname,content,createdAt}]}]}`；mine=1 只本人，包含审核状态；普通列表只 approved，同区域。
- `POST /posts` * `{nickname,topic,content}` → `{post}`；topic `成长烦恼` / `校园日常` / `家庭关系` / `小小确幸`，状态 pending。
- `POST /posts/:id/warm` * → `{warmCount,warmed:true}`；同日重复 409。
- `POST /posts/:id/replies` * `{nickname,content}` → `{ok:true,status:'pending'}`
- `POST /posts/:id/report` * `{reason}` → `{ok:true}`；隐藏帖子待审。
- `POST /service-requests` * `{type,message}` → `{request}`；type 见内容模块，自由文本限长。
- `GET /service-requests` * → `{requests:[{id,type,message,status,createdAt,reply,handledAt}]}`；本人。`reply` 为工作人员的处理说明，不返回处理人身份。

## 大区与学校关怀管理员

仅 `region_admin` / `school_admin`；大区管理员限制本区，学校管理员限制本校，跨范围对象404。学生与平台管理员403。

- `GET /admin/overview` * → `{stats:{students,todayCheckins,red,yellow,green,pendingPosts,requests},students:[Student],pendingPosts:[Post]}`
- `GET /admin/students` * → `{students:[Student]}`。Student `{id,name,account,schoolName,status:'red'|'yellow'|'green'|'gray',lowDays,lastCheckin,checkins:[{date,score}],followups:[{id,note,createdAt,adminName}]}`。不含私人备注/日记。
- `GET /admin/students/:id` * → `{student:Student}`
- `POST /admin/students/:id/followups` * `{note}` → `{followup}`
- `GET /admin/posts?status=pending` * → `{posts:[Post]}`，Post 与公共字段一致，额外 `reports:[{reason,createdAt}]`，无作者身份；回复含 status，可审核。
- `POST /admin/posts/:id/moderate` * `{status:'approved'|'rejected'}` → `{ok:true}`
- `POST /admin/replies/:id/moderate` * `{status:'approved'|'rejected'}` → `{ok:true}`
- `GET /admin/service-requests` * → `{requests:[{id,type,message,status,createdAt,userName,schoolName,reply,handledAt,handlerName}]}`
- `POST /admin/service-requests/:id` * `{status:'handled',reply}` → `{ok:true}`；`reply` 必填（1–1000字），学生可见；已跟进的需求再次提交返回409。

学生打卡、日记、匿名树洞和个人工具只允许 student；结构化校园表单另允许大区/学校管理员本人填写，见后文。跨区对象统一 404。会话过期 7 天，密码不返回，所有 SQL 用参数绑定。

## 原生工具（v1 扩展）

以下工具和日记接口仅 `student` 本人可用，管理员返回403；服务器从会话取本人，不接受请求中的 userId/regionId。`GET /tools` 返回19个完整schema（9观察工具、9现状问卷、1碎片自评），客户端不需要访问参考站。

- `GET /tools` * → `{tools:[Tool]}`。
- `GET /tools/:id/records` * → `{records:[Record]}`，日期、创建时间升序。
- `POST /tools/:id/records` * `{profileId,date:'YYYY-MM-DD',answers:{fieldId:value}}` → `{record}`。日期为1900年至上海今天的真实日期；`tracker`同页签同日更新返回200，新增201；`questionnaire`每次新增201。
- `DELETE /tools/:id/records/:recordId` * → `{ok:true}`；非本人或不存在404。
- `GET /tools/:id/report?month=YYYY-MM` * → `{report:Report}`；默认本月，空月提供明确无样本报告。

`Tool`：`{id,name,group,mode:'tracker'|'questionnaire',description,sourceUrl,profiles:[{id,name,description?,fields:[Field]}]}`。`sourceUrl`为追溯元数据，不是产品跳转入口。group为`中长期成长观察`/`成长现状分析`/`成长共研室`。

`Field`：`{id,label,type:'single'|'multi'|'number'|'text'|'textarea'|'date'|'time',required,options?:[{value,label}],min?,max?,step?,unit?,section?,help?}`。选项value保留原始数字/字符串类型；数字需在范围与步长内；不接受该profile未知字段。

`Record`：`{id,toolId,profileId,date,answers,result:Report,createdAt,updatedAt}`。`Report`：`{title,summary:string,metrics:[{label,value,unit?,note?}],sections:[{title,text?,items?:string[]}],notice}`。tracker描述性统计，不臆造心理总分；问卷按原站实际算法计算，不混合不同版本。

## STARMAP 日记（v1 扩展）

- `GET /journals` * → `{journals:[Journal]}`，创建时间降序。
- `POST /journals` * `{title?,content?,mood?:1..5|null,intensity?:1..3,tags?:string[],goal?}` → `{journal:Journal}`，201。内容最多5000字、标题80、行动目标200；标签最多6个，每个1至20字，去重。至少有内容或有效心情；无标题自动生成，支持只记录心情；旧title/content调用兼容。
- `DELETE /journals/:id` * → `{ok:true}`，非本人404。
- `GET /journals/map` * → `{nodes:[{id,label,count,lastDate}],edges:[{source,target,weight}],stats:{total,last7Days,streak,moodAverage,moodChange},recent:[Journal]}`。

`Journal`为`{id,title,content,createdAt,mood:null|number,intensity,tags:[],goal}`，强度默认2。旧库启动自动增加新列，无需删库。标签id即标签原文；同篇每对标签共现计1。统计按上海日：last7Days含今天共7日的篇数，streak从今天或昨天向前连续有记录的天数；moodAverage仅统计实际选过心情的条目。moodChange为最近7日平均心情减去此前7日均值，任一窗口无心情为null；recent为最近7日条目。节点/连线与个人工具均不进入后台预警。

## 校园需求和反馈表（v1 扩展）

- `GET /service-forms` * → `{forms:[{id,name,description,sourceUrl,profiles:[{id:'default',name,fields:[]}]}]}`，学生/大区管理员/学校管理员均可访问；id为r21、r22、fk2、fk。
- `POST /service-requests` * 增加`{formId,answers:{fieldId:value}}`形式。学生与大区/学校管理员均可提交已定义表单；服务类型和说明由服务器按schema生成，拒绝未知表单、未知字段、缺必填、非法选项、超长文本。单字段上限见schema，生成说明最大16000字、请求最大128KiB。
- 旧`{type,message}`提交仍仅student，message最多1000字。GET本人申请与区域后台处理保持原有契约；管理员提交教师需求仍绑定本人、本人区域；学校管理员绑定本校。

通用状态：未登录401、无角色权限403、未知对象404、填写无效400、请求体过大413。手工JSON导入/导出API已移除，相关路径返回404；普通请求32KiB，工具填写及结构化表单128KiB。参考站源代码快照与迁移映射见`docs/MIGRATION_TRACKERS.md`和`docs/MIGRATION_QUESTIONNAIRES.md`。
