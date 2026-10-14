import { useState } from "react";
import { Copy, School, Ticket, X } from "lucide-react";
import { useApp, useResource } from "./context.jsx";
import { Empty, ResourceState } from "./components.jsx";
import { PageTitle } from "./Student.jsx";

const labels = {
  active: "可注册",
  expired: "已过期",
  exhausted: "名额已满",
  revoked: "已停用",
};
const dateText = (value) =>
  new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });

export default function Enrollment() {
  const { user, call, bump, notify } = useApp();
  const schools = useResource("/admin/schools");
  const invites = useResource("/admin/invites");
  const [schoolId, setSchoolId] = useState("");
  const [days, setDays] = useState("30");
  const [maxUses, setMaxUses] = useState("100");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState(null);
  const [selected, setSelected] = useState("");
  const [revoking, setRevoking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const detail = useResource(
    selected ? `/admin/invites/${selected}` : "",
    !!selected,
  );
  const list = schools.data?.schools || [];
  const chosenSchool = schoolId || list[0]?.id || "";
  async function mutate(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      bump();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function createInvite(event) {
    event.preventDefault();
    await mutate(async () => {
      const result = await call("/admin/invites", {
        method: "POST",
        body: {
          schoolId: chosenSchool,
          days: Number(days),
          maxUses: Number(maxUses),
          note,
        },
      });
      setCreated(result.invite);
      setNote("");
      notify("邀请码已生成，请妥善记录");
    });
  }
  async function revoke(id) {
    await mutate(async () => {
      await call(`/admin/invites/${id}/revoke`, { method: "POST" });
      setRevoking("");
      if (created?.id === id) setCreated(null);
      notify("邀请码已停用，已注册账号可继续使用");
    });
  }
  return (
    <>
      <PageTitle
        eyebrow="WELCOME TO OUR GROWTH COMMUNITY"
        title="学校与邀请"
        description={`${user.regionName}${user.schoolName ? " · " + user.schoolName : ""} · 学生使用学校邀请码建立个人账号。`}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="enrollment-forms">
        <section className="panel">
          <h2>
            <School size={21} />{" "}
            {user.role === "school_admin" ? "本校" : "本区域学校"}
          </h2>
          <ResourceState {...schools}>
            {list.length ? (
              <ul className="school-list">
                {list.map((school) => (
                  <li key={school.id}>
                    <span>{school.name}</span>
                    <small>{school.studentCount} 位学生</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">学校由平台管理员开通与维护。</p>
            )}
          </ResourceState>
        </section>
        {user.role === "school_admin" && (
          <section className="panel">
            <h2>
              <Ticket size={21} /> 生成学生邀请码
            </h2>
            <form className="form-stack" onSubmit={createInvite}>
              <label>
                所属学校
                <select
                  aria-label="所属学校"
                  value={chosenSchool}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                  disabled={busy || !list.length}
                >
                  {!list.length && <option value="">请先添加学校</option>}
                  {list.map((school) => (
                    <option value={school.id} key={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                邀请备注
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                  placeholder="例如：高一年级秋季开通"
                  disabled={busy}
                />
              </label>
              <div className="enrollment-numbers">
                <label>
                  有效天数
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  注册名额
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
              </div>
              <small>
                学生自行设置账号密码。邀请码只能加入所选学校，不能用于管理员注册。
              </small>
              <button
                className="button primary"
                disabled={busy || !chosenSchool}
              >
                生成邀请码
              </button>
            </form>
          </section>
        )}
      </div>
      {created && (
        <section className="panel invitation-created" role="status">
          <h2>邀请码已生成</h2>
          <p>
            {created.schoolName} · {created.maxUses} 个名额 ·{" "}
            {dateText(created.expiresAt)} 到期
          </p>
          <code>{created.code}</code>
          <p>
            完整邀请码仅本次显示。请及时记录，并通过学校渠道发给学生；丢失后可停用并重新生成。
          </p>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.code);
                notify("邀请码已复制");
              } catch {
                notify("请长按或选择上方邀请码复制", "error");
              }
            }}
          >
            <Copy size={16} />
            复制邀请码
          </button>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>邀请记录</h2>
          <small>时间按北京时间显示</small>
        </div>
        <ResourceState {...invites}>
          {invites.data?.invites.length ? (
            <div className="table-scroll">
              <table className="invitation-table">
                <thead>
                  <tr>
                    <th>学校 / 备注</th>
                    <th>邀请码尾号</th>
                    <th>状态</th>
                    <th>已用 / 名额</th>
                    <th>到期时间</th>
                    <th>管理</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.data.invites.map((invite) => (
                    <tr key={invite.id}>
                      <td>
                        <strong>{invite.schoolName}</strong>
                        <small>{invite.note}</small>
                      </td>
                      <td>…{invite.codeHint}</td>
                      <td>
                        <span
                          className={`badge ${invite.status === "active" ? "green" : "gray"}`}
                        >
                          {labels[invite.status]}
                        </span>
                      </td>
                      <td>
                        {invite.usedCount} / {invite.maxUses}
                      </td>
                      <td>{dateText(invite.expiresAt)}</td>
                      <td>
                        <div className="invite-actions">
                          <button
                            className="text-button"
                            onClick={() => setSelected(invite.id)}
                          >
                            使用记录
                          </button>
                          {user.role === "school_admin" &&
                            invite.active === 1 &&
                            (revoking === invite.id ? (
                              <>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() => revoke(invite.id)}
                                >
                                  确认停用
                                </button>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() => setRevoking("")}
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <button
                                className="text-button"
                                disabled={busy}
                                onClick={() => setRevoking(invite.id)}
                              >
                                停用
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="还没有邀请记录"
              description={
                user.role === "school_admin"
                  ? "为本校生成首个学生邀请码。"
                  : "学校管理员生成邀请码后，可在此查看本区使用情况。"
              }
              icon="school"
            />
          )}
        </ResourceState>
      </section>
      {selected && (
        <section className="panel">
          <div className="section-heading">
            <h2>邀请使用记录</h2>
            <button
              className="icon-button"
              aria-label="关闭使用记录"
              onClick={() => setSelected("")}
            >
              <X size={20} />
            </button>
          </div>
          <ResourceState {...detail}>
            {detail.data && (
              <>
                <p>
                  {detail.data.invite.schoolName} · {detail.data.invite.note} ·
                  已注册 {detail.data.invite.usedCount} 人
                </p>
                {detail.data.uses.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>学生称呼</th>
                          <th>账号</th>
                          <th>注册时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.uses.map((use) => (
                          <tr key={use.id}>
                            <td>{use.name}</td>
                            <td>{use.account}</td>
                            <td>{dateText(use.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">尚无学生使用此邀请注册。</p>
                )}
              </>
            )}
          </ResourceState>
        </section>
      )}
    </>
  );
}
