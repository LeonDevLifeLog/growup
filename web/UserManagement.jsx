import { useState } from "react";
import { useApp, useResource } from "./context.jsx";
import { ResourceState } from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { roleNames } from "./api.js";

// Mirrors the server directory scope: each administrator sees lower roles only.
const visibleRoles = {
  platform_admin: Object.keys(roleNames),
  region_admin: ["user", "student", "school_admin"],
  school_admin: ["user", "student"],
};
const scopeText = {
  platform_admin:
    "统一维护全部账号资料与状态。工作人员建档后，可在平台管理中被任命为管理员；学生通过学校邀请码注册。",
  region_admin:
    "维护本大区的学生、学校管理员与待授权工作人员，可将本区工作人员任命为学校管理员。",
  school_admin:
    "维护本校学生与待授权工作人员的资料和状态。管理员任命由大区或平台管理员负责。",
};

export default function UserManagement() {
  const { user, call, bump, notify } = useApp();
  const isRegion = user.role === "region_admin";
  const schools = useResource("/admin/schools", isRegion);
  const activeSchools = (schools.data?.schools || []).filter(
    (row) => row.active,
  );
  const [school, setSchool] = useState(""),
    [appointment, setAppointment] = useState(null);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [role, setRole] = useState(""),
    [page, setPage] = useState(1);
  const [account, setAccount] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState("");
  const [editor, setEditor] = useState(null),
    [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const resource = useResource(
    `/users?q=${encodeURIComponent(search)}&role=${role}&page=${page}`,
  );
  async function mutate(path, body, method, after = () => {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await call(path, { method, body });
      after();
      bump();
      notify("已保存");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PEOPLE IN OUR COMMUNITY"
        title="用户管理"
        description={scopeText[user.role]}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section className="panel" aria-label="新增工作人员">
        <h2>新增工作人员</h2>
        <form
          className="form-stack user-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutate(
              "/users",
              {
                account,
                name,
                password,
                ...(school ? { schoolId: school } : {}),
              },
              "POST",
              () => {
                setSchool("");
                setAccount("");
                setName("");
                setPassword("");
                setPage(1);
              },
            );
          }}
        >
          <label>
            用户称呼
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
              disabled={busy}
            />
          </label>
          <label>
            登录账号
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9._-]+"
              autoComplete="off"
              placeholder="3–40位字母、数字、点、下划线或短横线"
              disabled={busy}
            />
          </label>
          <label>
            初始密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          {isRegion && (
            <label>
              所属学校
              <select
                aria-label="所属学校"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                disabled={busy}
              >
                <option value="">本大区（暂不指定学校）</option>
                {activeSchools.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <small>
            {user.role === "platform_admin"
              ? "新账号待授权，任命管理员后可登录对应范围。"
              : `新账号建立在${user.schoolName || user.regionName}，待上级任命后方可登录。`}
            通过受控渠道告知本人初始凭据。
          </small>
          <button className="button primary" disabled={busy}>
            创建用户
          </button>
        </form>
      </section>
      {editor && (
        <section className="panel" aria-label="编辑用户">
          <h2>编辑用户 · {editor.account}</h2>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(
                `/users/${editor.id}`,
                {
                  name: editor.name,
                  ...(editor.password ? { password: editor.password } : {}),
                },
                "PATCH",
                () => setEditor(null),
              );
            }}
          >
            <label>
              用户称呼
              <input
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                required
                maxLength={40}
                disabled={busy}
              />
            </label>
            <label>
              重置密码
              <input
                type="password"
                value={editor.password}
                onChange={(e) =>
                  setEditor({ ...editor, password: e.target.value })
                }
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="留空保留原密码"
                disabled={busy}
              />
            </label>
            <small>重置密码会退出该用户的所有登录会话。</small>
            <div className="invite-actions">
              <button className="button primary" disabled={busy}>
                保存用户资料
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                取消编辑
              </button>
            </div>
          </form>
        </section>
      )}
      {appointment && (
        <section className="panel" aria-label="任命学校管理员">
          <h2>任命学校管理员 · {appointment.name}</h2>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(
                "/admins",
                {
                  userId: appointment.id,
                  role: "school_admin",
                  schoolId: appointment.schoolId,
                },
                "POST",
                () => setAppointment(null),
              );
            }}
          >
            <label>
              管理学校
              <select
                aria-label="管理学校"
                value={appointment.schoolId}
                onChange={(e) =>
                  setAppointment({ ...appointment, schoolId: e.target.value })
                }
                required
                disabled={busy}
              >
                <option value="">请选择本大区学校</option>
                {activeSchools.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <small>任命后该账号需重新登录，仅能管理所选学校。</small>
            <div className="invite-actions">
              <button
                className="button primary"
                disabled={busy || !appointment.schoolId}
              >
                确认任命
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setAppointment(null)}
              >
                取消
              </button>
            </div>
          </form>
        </section>
      )}
      {confirmation?.revoke && (
        <section className="panel" role="alert">
          <h3>确认撤销“{confirmation.name}”的学校管理员权限？</h3>
          <p>撤销后该账号保留在本校，成为待授权用户并退出所有会话。</p>
          <div className="invite-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                mutate(`/admins/${confirmation.id}/revoke`, {}, "POST", () =>
                  setConfirmation(null),
                )
              }
            >
              确认撤销
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              取消
            </button>
          </div>
        </section>
      )}
      {confirmation && !confirmation.revoke && (
        <section className="panel" role="alert">
          <h3>
            确认{confirmation.active ? "停用" : "启用"}“{confirmation.name}”？
          </h3>
          <p>停用将退出该用户的所有会话，保留历史记录。</p>
          <div className="invite-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                mutate(
                  `/users/${confirmation.id}`,
                  { active: !confirmation.active },
                  "PATCH",
                  () => setConfirmation(null),
                )
              }
            >
              确认{confirmation.active ? "停用" : "启用"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              取消
            </button>
          </div>
        </section>
      )}
      <section className="panel" aria-label="用户列表">
        <h2>用户列表</h2>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
            setPage(1);
          }}
        >
          <label>
            搜索账号或称呼
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
            />
          </label>
          <label>
            用户类型
            <select
              aria-label="用户类型"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部用户</option>
              {visibleRoles[user.role].map((id) => (
                <option key={id} value={id}>
                  {roleNames[id]}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary">查询用户</button>
        </form>
        <ResourceState {...resource}>
          {resource.data && (
            <>
              <p className="muted">共 {resource.data.total} 位用户</p>
              <div className="table-scroll">
                <table className="platform-admin-table">
                  <thead>
                    <tr>
                      <th>称呼 / 账号</th>
                      <th>类型</th>
                      <th>归属</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.users.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.name}
                          <small>{row.account}</small>
                        </td>
                        <td>{roleNames[row.role]}</td>
                        <td>
                          {row.regionName || "—"}
                          {row.schoolName ? ` · ${row.schoolName}` : ""}
                        </td>
                        <td>{row.active ? "启用" : "停用"}</td>
                        <td>
                          <div className="invite-actions">
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() => {
                                setEditor({ ...row, password: "" });
                                setError("");
                              }}
                            >
                              编辑 / 重置密码
                            </button>
                            <button
                              className="text-button"
                              disabled={busy || row.id === user.id}
                              onClick={() => setConfirmation(row)}
                            >
                              {row.active ? "停用" : "启用"}
                            </button>
                            {isRegion &&
                              row.role === "user" &&
                              row.active === 1 && (
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() => {
                                    setAppointment({
                                      ...row,
                                      schoolId: row.schoolId || "",
                                    });
                                    setError("");
                                  }}
                                >
                                  任命为学校管理员
                                </button>
                              )}
                            {isRegion && row.role === "school_admin" && (
                              <button
                                className="text-button"
                                disabled={busy}
                                onClick={() =>
                                  setConfirmation({ ...row, revoke: true })
                                }
                              >
                                撤销管理员
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!resource.data.users.length && (
                <p className="muted">没有符合条件的用户。</p>
              )}
              <div className="invite-actions">
                <button
                  className="text-button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </button>
                <span>第 {page} 页</span>
                <button
                  className="text-button"
                  disabled={page * 50 >= resource.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </button>
              </div>
            </>
          )}
        </ResourceState>
      </section>
    </>
  );
}
