# API 契约 v1

Base `/api`；JSON；失败 `{error: '中文原因'}`；身份为 `Authorization: Bearer <token>`。标记 * 的接口需登录，管理接口分别校验 `platform_admin`、`region_admin`、`school_admin`。令牌绑定用户，服务器从用户解析区域。时间使用 ISO 字符串；自然日字段 `YYYY-MM-DD`（Asia/Shanghai）。

## 公共/账号

- `GET /health` → `{ok:true,demo:boolean}`
- `GET /regions` → `{regions:[{id,name,schools:[{id,name}]}]}`。平台配置的动态大区，仅返回启用的大区及学校；正式空库为 `[]`。
- `POST /auth/login` `{regionId,account,password}` → `{token,user}`；用户 `{id,account,name,role,regionId,regionName,schoolId,schoolName}`。
- `POST /auth/invite` `{regionId,inviteCode}` → `{invitation:{regionId,regionName,schoolId,schoolName,expiresAt}}`；仅校验并核对，不占名额。
- `POST /auth/register` `{regionId,inviteCode,account,password,name}` → `{token,user}`；强制学生角色，邀请码决定区域/学校；注册与名额、使用记录在同一事务内，201。
- `GET /auth/me` * → `{user}`
- `POST /auth/logout` * → `{ok:true}`
- `POST /auth/password` * `{currentPassword,password}` → `{token,user}`；验证旧密码并撤销所有旧会话，返回新会话。

演示学生 `hainan.student` / `Growup123!`；海南管理员 `hainan.admin` / `Growup123!`。演示学校邀请码 `HN2026`、`SD2026`、`GD2026`。仅 DEMO_MODE 创建。

角色为 `student` / `platform_admin` / `region_admin` / `school_admin`。平台管理员登录时 `regionId:null`（或省略），其用户区域和学校字段为null；大区管理员学校字段为null；其他账号必须选择绑定的大区。停用账号、学校或大区不能登录或使用旧会话。账号3–40位ASCII字母/数字/点/下划线/短横线，密码8–128字符。

## 平台组织管理

仅 `platform_admin` 可调用；其他角色403。平台管理员不进入 `/admin/*` 学生关怀接口。

- `GET /platform/organizations` → `{regions:[{id,name,active}],schools:[{id,name,active,regionId,regionName}],admins:[{id,account,name,role,active,regionId,regionName,schoolId,schoolName,createdAt}]}`。
- `POST /platform/regions` `{name}` → `{id}`，201。生成动态UUID，不设固定区域。
- `POST /platform/schools` `{name,regionId}` → `{id}`，201；归属启用大区，同区校名唯一。
- `PATCH /platform/regions/:id` / `/platform/schools/:id` `{name?,active?:boolean}` → `{ok:true}`。不能迁移学校归属，停用撤销对应账号会话。
- `POST /platform/admins` `{account,password,name,role,regionId?,schoolId?}` → `{admin}`，201；role限三类管理员。平台角色无区域/学校，大区角色需启用区域，学校角色需本区启用学校。
- `PATCH /platform/admins/:id` `{name?,active?:boolean,password?}` → `{ok:true}`。角色、账号、归属不可修改；不能停用当前平台账号；停用或重置密码撤销所有会话。
- `GET /platform/audit` → `{events:[{id,action,targetId,detail,createdAt,actorName}]}`，最近100次组织/管理员变更，不含密码。

重复名称/账号409，无效归属400，未知对象404。首位平台管理员只通过 `server/bootstrap.mjs` 初始化；已有平台管理员则拒绝重复初始化。

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
- `GET /service-requests` * → `{requests:[...]}`；本人。

## 大区与学校关怀管理员

仅 `region_admin` / `school_admin`；大区管理员限制本区，学校管理员限制本校，跨范围对象404。学生与平台管理员403。

- `GET /admin/overview` * → `{stats:{students,todayCheckins,red,yellow,green,pendingPosts,requests},students:[Student],pendingPosts:[Post]}`
- `GET /admin/students` * → `{students:[Student]}`。Student `{id,name,account,schoolName,status:'red'|'yellow'|'green'|'gray',lowDays,lastCheckin,checkins:[{date,score}],followups:[{id,note,createdAt,adminName}]}`。不含私人备注/日记。
- `GET /admin/students/:id` * → `{student:Student}`
- `POST /admin/students/:id/followups` * `{note}` → `{followup}`
- `GET /admin/posts?status=pending` * → `{posts:[Post]}`，Post 与公共字段一致，额外 `reports:[{reason,createdAt}]`，无作者身份；回复含 status，可审核。
- `POST /admin/posts/:id/moderate` * `{status:'approved'|'rejected'}` → `{ok:true}`
- `POST /admin/replies/:id/moderate` * `{status:'approved'|'rejected'}` → `{ok:true}`
- `GET /admin/service-requests` * → `{requests:[{id,type,message,status,createdAt,userName,schoolName}]}`
- `POST /admin/service-requests/:id` * `{status:'handled'}` → `{ok:true}`

学生打卡、日记、匿名树洞和个人工具只允许 student；结构化校园表单另允许大区/学校管理员本人填写，见后文。跨区对象统一 404。会话过期 7 天，密码不返回，所有 SQL 用参数绑定。

## 原生工具（v1 扩展）

以下工具和日记接口仅 `student` 本人可用，管理员返回403；服务器从会话取本人，不接受请求中的 userId/regionId。`GET /tools` 返回19个完整schema（9观察工具、9现状问卷、1碎片自评），客户端不需要访问参考站。

- `GET /tools` * → `{tools:[Tool]}`。
- `GET /tools/:id/records` * → `{records:[Record]}`，日期、创建时间升序。
- `POST /tools/:id/records` * `{profileId,date:'YYYY-MM-DD',answers:{fieldId:value}}` → `{record}`。日期为1900年至上海今天的真实日期；`tracker`同页签同日更新返回200，新增201；`questionnaire`每次新增201。
- `DELETE /tools/:id/records/:recordId` * → `{ok:true}`；非本人或不存在404。
- `GET /tools/:id/report?month=YYYY-MM` * → `{report:Report}`；默认本月，空月提供明确无样本报告。
- `GET /tools/:id/export` * → `{version:1,toolId,records}`。
- `POST /tools/:id/import` * `{records:[Record]}`（可含version、toolId）→ `{imported,skipped}`；最多2000条/2MiB，先全部验证再事务合并。tracker按页签/日期去重、不覆盖已有记录；questionnaire按页签/日期/完整答案去重。忽略外部id、用户身份、结果，重新计算报告。

`Tool`：`{id,name,group,mode:'tracker'|'questionnaire',description,sourceUrl,profiles:[{id,name,description?,fields:[Field]}]}`。`sourceUrl`为追溯元数据，不是产品跳转入口。group为`中长期成长观察`/`成长现状分析`/`成长共研室`。

`Field`：`{id,label,type:'single'|'multi'|'number'|'text'|'textarea'|'date'|'time',required,options?:[{value,label}],min?,max?,step?,unit?,section?,help?}`。选项value保留原始数字/字符串类型；数字需在范围与步长内；不接受该profile未知字段。

`Record`：`{id,toolId,profileId,date,answers,result:Report,createdAt,updatedAt}`。`Report`：`{title,summary:string,metrics:[{label,value,unit?,note?}],sections:[{title,text?,items?:string[]}],notice}`。tracker描述性统计，不臆造心理总分；问卷按原站实际算法计算，不混合不同版本。

## STARMAP 日记（v1 扩展）

- `GET /journals` * → `{journals:[Journal]}`，创建时间降序。
- `POST /journals` * `{title?,content?,mood?:1..5|null,intensity?:1..3,tags?:string[],goal?}` → `{journal:Journal}`，201。内容最多5000字、标题80、行动目标200；标签最多6个，每个1至20字，去重。至少有内容或有效心情；无标题自动生成，支持只记录心情；旧title/content调用兼容。
- `DELETE /journals/:id` * → `{ok:true}`，非本人404。
- `GET /journals/map` * → `{nodes:[{id,label,count,lastDate}],edges:[{source,target,weight}],stats:{total,last7Days,streak,moodAverage,moodChange},recent:[Journal]}`。
- `GET /journals/export` * → `{version:1,exportedAt,journals}`；可选`?ids=id1,id2`只导出选中且本人拥有的条目。
- `POST /journals/import` * `{journals:[Journal]}` → `{imported,skipped}`；最多2000篇/2MiB。全部先验证，时间不得未来；事务合并，完整内容和创建时间相同的记录去重，忽略外部id/身份。

`Journal`为`{id,title,content,createdAt,mood:null|number,intensity,tags:[],goal}`，强度默认2。旧库启动自动增加新列，无需删库。标签id即标签原文；同篇每对标签共现计1。统计按上海日：last7Days含今天共7日的篇数，streak从今天或昨天向前连续有记录的天数；moodAverage仅统计实际选过心情的条目。moodChange为最近7日平均心情减去此前7日均值，任一窗口无心情为null；recent为最近7日条目。节点/连线与个人工具均不进入后台预警。

## 校园需求和反馈表（v1 扩展）

- `GET /service-forms` * → `{forms:[{id,name,description,sourceUrl,profiles:[{id:'default',name,fields:[]}]}]}`，学生/大区管理员/学校管理员均可访问；id为r21、r22、fk2、fk。
- `POST /service-requests` * 增加`{formId,answers:{fieldId:value}}`形式。学生与大区/学校管理员均可提交已定义表单；服务类型和说明由服务器按schema生成，拒绝未知表单、未知字段、缺必填、非法选项、超长文本。单字段上限见schema，生成说明最大16000字、请求最大128KiB。
- 旧`{type,message}`提交仍仅student，message最多1000字。GET本人申请与区域后台处理保持原有契约；管理员提交教师需求仍绑定本人、本人区域；学校管理员绑定本校。

通用状态：未登录401、无角色权限403、未知对象404、填写无效400、请求体过大413。个人工具/日记导入上限2MiB；普通请求32KiB。参考站源代码快照与迁移映射见`docs/MIGRATION_TRACKERS.md`和`docs/MIGRATION_QUESTIONNAIRES.md`。
