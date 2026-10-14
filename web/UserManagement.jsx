import { useState } from "react";
import { useApp, useResource } from "./context.jsx";
import { ResourceState } from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { roleNames } from "./api.js";

export default function UserManagement() {
  const { user, call, bump, notify } = useApp();
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
    `/platform/users?q=${encodeURIComponent(search)}&role=${role}&page=${page}`,
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
        description="统一维护账号资料与状态。工作人员建档后，可在平台管理中被任命为管理员；学生通过学校邀请码注册。"
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
              "/platform/users",
              { account, name, password },
              "POST",
              () => {
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
          <small>
            新账号待授权，任命管理员后可登录对应范围。通过受控渠道告知本人初始凭据。
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
                `/platform/users/${editor.id}`,
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
      {confirmation && (
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
                  `/platform/users/${confirmation.id}`,
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
              {Object.entries(roleNames).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
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
