import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartHandshake,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useApp, useDirty, useMutation, useResource } from "./context.jsx";
import {
  Badge,
  ConfirmDialog,
  Empty,
  ListHeader,
  ResourceState,
  SectionTitle,
  Tabs,
} from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { MoodFace } from "./Illustrations.jsx";
import { shortDate, statusMeta } from "./api.js";

export function AdminOverview() {
  const { user, open, setView } = useApp();
  const resource = useResource("/admin/overview");
  const data = resource.data;
  const stats = data?.stats || {};
  const attention = (data?.students || []).filter((s) =>
    ["red", "yellow"].includes(s.status),
  );
  return (
    <>
      <PageTitle
        eyebrow="CARE BEGINS WITH NOTICING"
        title="看见变化，让关怀及时发生"
        description={`${user.regionName} · 每一个数字背后，都是一个值得被认真对待的孩子。`}
        action="查看关怀规则"
        onAction={() => open({ type: "rules" })}
      />
      <ResourceState {...resource}>
        <div className="admin-stat-grid">
          {[
            {
              label: "本区学生",
              value: stats.students,
              icon: Users,
              color: "sage",
              foot: "服务范围内的成长伙伴",
            },
            {
              label: "今日已打卡",
              value: stats.todayCheckins,
              icon: CheckCircle2,
              color: "blue",
              foot: "认真感受自己的每一天",
            },
            {
              label: "优先关怀",
              value: stats.red,
              icon: HeartHandshake,
              color: "peach",
              foot: "连续低落 5 天及以上",
            },
            {
              label: "需要关注",
              value: stats.yellow,
              icon: Clock3,
              color: "sand",
              foot: "连续低落 3–4 天",
            },
          ].map((item) => (
            <div className="panel admin-stat" key={item.label}>
              <span className={`stat-icon ${item.color}`}>
                <item.icon size={23} />
              </span>
              <span className="stat-label">{item.label}</span>
              <strong>
                {item.value ?? "—"}
                <small>人</small>
              </strong>
              <p>{item.foot}</p>
            </div>
          ))}
        </div>
        <div className="admin-overview-grid">
          <section className="panel">
            <SectionTitle
              title="此刻，需要多一点关怀"
              action="查看全部学生"
              onAction={() => setView("admin-students")}
            />
            <p className="section-sub">
              由连续记录自动提示，具体情况需结合交流了解。
            </p>
            {attention.length ? (
              <StudentTable students={attention.slice(0, 6)} />
            ) : (
              <Empty
                title="目前没有达到提示阈值的记录"
                description="保持关注，也给尚未打卡的孩子一点耐心。"
              />
            )}
          </section>
          <aside>
            <section className="panel overview-distribution">
              <SectionTitle title="本区记录状态" />
              {[
                ["red", stats.red],
                ["yellow", stats.yellow],
                ["green", stats.green],
                [
                  "gray",
                  Math.max(
                    0,
                    (stats.students || 0) -
                      (stats.red || 0) -
                      (stats.yellow || 0) -
                      (stats.green || 0),
                  ),
                ],
              ].map(([status, count]) => (
                <div className="distribution-row" key={status}>
                  <div>
                    <Badge status={status} />
                    <strong>
                      {count || 0}
                      <small> 人</small>
                    </strong>
                  </div>
                  <div className="distribution-track">
                    <span
                      className={status}
                      style={{
                        width: `${stats.students ? ((count || 0) / stats.students) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <section className="pending-box">
              <ShieldCheck size={25} />
              <h3>把好每一份表达的关</h3>
              <p>
                待审纸条及回应 <strong>{stats.pendingPosts || 0}</strong> 组
              </p>
              <button
                className="text-button"
                onClick={() => setView("admin-posts")}
              >
                前往树洞审核
                <ArrowRight size={16} />
              </button>
            </section>
          </aside>
        </div>
      </ResourceState>
    </>
  );
}

export function StudentTable({ students }) {
  const { open } = useApp();
  return (
    <div className="table-scroll">
      <table className="stack-table">
        <thead>
          <tr>
            <th>学生</th>
            <th>最近打卡</th>
            <th>连续低落</th>
            <th>关怀提示</th>
            <th>跟进</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td data-label="学生">
                <strong>{student.name}</strong>
                <small>{student.schoolName}</small>
              </td>
              <td data-label="最近打卡">
                {typeof student.lastCheckin === "object"
                  ? student.lastCheckin?.date || "暂未打卡"
                  : student.lastCheckin || "暂未打卡"}
              </td>
              <td data-label="连续低落">
                {student.lowDays ? (
                  <span className="low-days">{student.lowDays} 天</span>
                ) : (
                  "—"
                )}
              </td>
              <td data-label="关怀提示">
                <Badge student={student} />
              </td>
              <td data-label="跟进">
                <button
                  className="text-button"
                  onClick={() => open({ type: "student", id: student.id })}
                >
                  查看
                  <ChevronRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminStudents() {
  const resource = useResource("/admin/students");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const all = resource.data?.students || [];
  const count = (key) =>
    key === "all" ? all.length : all.filter((s) => s.status === key).length;
  const students = all.filter(
    (s) =>
      (filter === "all" || filter === s.status) &&
      `${s.name}${s.schoolName}${s.account}`.includes(query.trim()),
  );
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE MORE CARE"
        title="学生关怀，每一次靠近都有意义"
        description="留意变化，先理解情境，再给予合适的支持。"
      />
      <section className="panel">
        <div className="explore-toolbar">
          <div className="filter-row">
            {[
              ["all", "全部学生"],
              ["red", "优先关怀"],
              ["yellow", "需要关注"],
              ["green", "状态平稳"],
              ["gray", "观察中"],
            ].map(([key, label]) => (
              <button
                className={`chip ${filter === key ? "active" : ""}`}
                key={key}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                {resource.data && ` ${count(key)}`}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="搜索学生"
              placeholder="搜索学生、学校或账号"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <ResourceState {...resource}>
          {students.length ? (
            <StudentTable students={students} />
          ) : (
            <Empty
              title={all.length ? "没有符合条件的学生" : "本范围还没有学生"}
              description={
                all.length
                  ? "试试其他筛选条件或关键词。"
                  : "学生通过学校邀请码注册后会出现在这里。"
              }
            />
          )}
        </ResourceState>
      </section>
      <p className="source-note">
        本页仅显示所属大区数据。分数与连续天数是关怀线索，不是诊断；日记和心情备注不向管理端开放。
      </p>
    </>
  );
}

export function StudentDetail({ id }) {
  const { call, bump, notify } = useApp();
  const resource = useResource(`/admin/students/${id}`);
  const student = resource.data?.student;
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useDirty(note.trim());
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call(`/admin/students/${id}/followups`, {
        method: "POST",
        body: { note },
      });
      setNote("");
      bump();
      notify("跟进记录已保存。");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResourceState {...resource}>
      {student && (
        <div>
          <div className="student-detail-top">
            <div>
              <h3>{student.name}</h3>
              <p>
                {student.schoolName} · {student.account}
              </p>
            </div>
            <Badge student={student} />
          </div>
          <div className="info-box">
            连续低落 {student.lowDays}{" "}
            天。提示根据日历日计算；请结合实际交流了解情况。
            {!student.lastCheckin && "目前还没有打卡记录。"}
          </div>
          <h3 className="detail-subtitle">最近的心情记录</h3>
          <div className="student-timeline">
            {student.checkins?.length ? (
              student.checkins.slice(-14).map((row) => (
                <div key={row.date}>
                  <MoodFace score={row.score} size={32} />
                  <span>{row.date.slice(5)}</span>
                </div>
              ))
            ) : (
              <p className="muted">暂时没有记录</p>
            )}
          </div>
          <PrivateAdminNote />
          <h3 className="detail-subtitle">关怀跟进</h3>
          {student.followups?.length ? (
            student.followups.map((row) => (
              <div className="followup" key={row.id}>
                <div>
                  <strong>{row.adminName}</strong>
                  <time>{shortDate(row.createdAt)}</time>
                </div>
                <p>{row.note}</p>
              </div>
            ))
          ) : (
            <p className="muted">还没有跟进记录，从一次温柔的询问开始。</p>
          )}
          <form className="form-stack" onSubmit={submit}>
            <label>
              添加跟进记录
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={3}
                maxLength={1000}
                placeholder="记录联系情况、已提供的支持与后续安排。避免无关的隐私和主观标签。"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "正在保存…" : "保存跟进记录"}
              <Check size={16} />
            </button>
          </form>
        </div>
      )}
    </ResourceState>
  );
}
function PrivateAdminNote() {
  return (
    <p className="privacy-note">
      <ShieldCheck size={14} />
      此处不展示学生私人日记与心情备注。
    </p>
  );
}

export function AdminPosts() {
  const { call, bump, notify } = useApp();
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState("");
  const resource = useResource(`/admin/posts?status=${status}`);
  const posts = resource.data?.posts || [];
  async function moderate(id, next, reply = false) {
    const key = `${reply ? "r" : "p"}${id}`;
    setBusy(key);
    try {
      await call(`/admin/${reply ? "replies" : "posts"}/${id}/moderate`, {
        method: "POST",
        body: { status: next },
      });
      bump();
      notify(next === "approved" ? "内容已审核发布。" : "内容已驳回。");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LISTEN WITH KINDNESS"
        title="守护树洞，让善意安心抵达"
        description="先审核，再发布。保护匿名表达，也守护每一位读到纸条的人。"
      />
      <div className="filter-row admin-post-filters">
        {[
          ["pending", "待审核"],
          ["approved", "已发布"],
          ["rejected", "已驳回"],
        ].map(([key, label]) => (
          <button
            className={`chip ${status === key ? "active" : ""}`}
            onClick={() => setStatus(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
      <ResourceState {...resource}>
        {posts.length ? (
          <div className="moderation-grid">
            {posts.map((post) => (
              <article className="panel moderation-card" key={post.id}>
                <div className="post-topline">
                  <strong>{post.nickname}</strong>
                  <span className="post-topic">{post.topic}</span>
                </div>
                <p className="moderation-content">{post.content}</p>
                <small className="muted">
                  {shortDate(post.createdAt)} ·{" "}
                  {post.status === "pending"
                    ? "待审纸条"
                    : post.status === "approved"
                      ? "已发布纸条"
                      : "已驳回纸条"}
                </small>
                {post.reports?.length > 0 && (
                  <div className="report-reasons">
                    <strong>举报记录</strong>
                    {post.reports.map((r, i) => (
                      <p key={i}>{r.reason}</p>
                    ))}
                  </div>
                )}
                <div className="moderation-actions">
                  {post.status !== "approved" && (
                    <button
                      className="button primary"
                      disabled={busy === `p${post.id}`}
                      onClick={() => moderate(post.id, "approved")}
                    >
                      <Check size={15} />
                      审核通过
                    </button>
                  )}
                  {post.status !== "rejected" && (
                    <button
                      className="button secondary"
                      disabled={busy === `p${post.id}`}
                      onClick={() => moderate(post.id, "rejected")}
                    >
                      <X size={15} />
                      {post.status === "approved" ? "下架纸条" : "驳回"}
                    </button>
                  )}
                </div>
                {post.replies?.length > 0 && (
                  <div className="moderation-replies">
                    <h4>纸条回应</h4>
                    {post.replies.map((reply) => (
                      <div className="moderation-reply" key={reply.id}>
                        <strong>{reply.nickname}</strong>
                        <p>{reply.content}</p>
                        <small>
                          {reply.status === "pending"
                            ? "待审回复"
                            : reply.status === "approved"
                              ? "已发布回复"
                              : "已驳回回复"}
                        </small>
                        {reply.status !== "approved" && (
                          <button
                            className="text-button"
                            disabled={busy === `r${reply.id}`}
                            onClick={() => moderate(reply.id, "approved", true)}
                          >
                            通过回复
                            <Check size={14} />
                          </button>
                        )}
                        {reply.status !== "rejected" && (
                          <button
                            className="text-button danger-text"
                            disabled={busy === `r${reply.id}`}
                            onClick={() => moderate(reply.id, "rejected", true)}
                          >
                            驳回回复
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={
              status === "pending"
                ? "待审内容已处理完毕"
                : "这个分类暂时没有纸条"
            }
            description="谢谢你，认真对待每一份表达。"
          />
        )}
      </ResourceState>
      <p className="source-note">
        审核列表仅展示化名与内容，不向审核人员公开学生身份。被举报内容隐藏后需重新人工审核。
      </p>
    </>
  );
}

export function AdminServices() {
  const { open } = useApp();
  const resource = useResource("/admin/service-requests");
  const [tab, setTab] = useState("pending");
  const [handling, setHandling] = useState(null);
  const all = resource.data?.requests || [];
  const pending = all.filter((r) => r.status !== "handled");
  const rows =
    tab === "pending"
      ? pending
      : tab === "handled"
        ? all.filter((r) => r.status === "handled")
        : all;
  return (
    <>
      <PageTitle
        eyebrow="SUPPORT, WITHIN REACH"
        title="把需要，连接到合适的支持"
        description="认真了解需求，联系并完成实际跟进后，再更新处理状态。"
      />
      <section className="panel">
        <ListHeader title="本区支持需求">
          <button
            className="button secondary"
            onClick={() =>
              open({
                type: "serviceForm",
                formId: "r22",
                title: "教师需求与身心状态",
              })
            }
          >
            填写教师需求
          </button>
          <button
            className="button secondary"
            onClick={() =>
              open({
                type: "serviceForm",
                formId: "fk2",
                title: "活动服务反馈",
              })
            }
          >
            填写活动反馈
          </button>
        </ListHeader>
        <Tabs
          label="需求状态"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "pending", label: "待跟进", count: pending.length },
            {
              id: "handled",
              label: "已跟进",
              count: all.length - pending.length,
            },
            { id: "all", label: "全部", count: all.length },
          ]}
        />
        <ResourceState {...resource}>
          {rows.length ? (
            rows.map((row) => (
              <div className="service-row" key={row.id}>
                <div>
                  <span className="article-category">{row.type}</span>
                  <h3>
                    {row.userName} <small>{row.schoolName}</small>
                  </h3>
                  <p className="preserve-lines">{row.message}</p>
                  <small className="muted">{shortDate(row.createdAt)}</small>
                </div>
                {row.status === "handled" ? (
                  <span className="badge green">
                    <CheckCircle2 size={13} />
                    已跟进
                  </span>
                ) : (
                  <button
                    className="button secondary"
                    onClick={() => setHandling(row)}
                  >
                    标记已跟进
                    <Check size={15} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty
              title={
                tab === "pending" ? "待跟进需求已全部处理" : "这里还没有需求"
              }
              description="新的需求会出现在“待跟进”中。"
            />
          )}
        </ResourceState>
      </section>
      {handling && (
        <HandleDialog row={handling} onClose={() => setHandling(null)} />
      )}
    </>
  );
}

function HandleDialog({ row, onClose }) {
  const { busy, error, run } = useMutation();
  return (
    <ConfirmDialog
      title="确认已完成跟进？"
      confirmLabel="确认已跟进"
      busy={busy}
      error={error}
      onSubmit={async () => {
        const result = await run(`/admin/service-requests/${row.id}`, {
          body: { status: "handled" },
          success: "需求已标记为已跟进。",
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      <p>
        {row.userName}（{row.schoolName}）· {row.type}
      </p>
      <p>请在实际联系并提供支持后再标记。标记后不能撤回。</p>
    </ConfirmDialog>
  );
}
