import { useState } from "react";
import { useApp, useResource } from "./context.jsx";
import { ResourceState } from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { roleNames } from "./api.js";

export function ChangePassword() {
  const { call, authenticate, notify } = useApp();
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    try {
      const result = await call("/auth/password", {
        method: "POST",
        body: { currentPassword, password },
      });
      authenticate(result);
      notify("密码已更新，其他会话已退出");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <h3>修改我的密码</h3>
      <label>
        当前密码
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
          maxLength={128}
          autoComplete="current-password"
        />
      </label>
      <label>
        新密码
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label>
        确认新密码
        <input
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button secondary" disabled={busy}>
        更新我的密码
      </button>
    </form>
  );
}

const actionNames = {
  "region.create": "新增大区",
  "school.create": "新增学校",
  "regions.update": "更新大区",
  "schools.update": "更新学校",
  "user.create": "新增用户",
  "user.update": "更新用户",
  "admin.assign": "任命管理员",
  "admin.revoke": "撤销管理员权限",
};
export default function Platform() {
  const { user, call, bump, notify } = useApp();
  const resource = useResource("/platform/organizations");
  const audit = useResource("/platform/audit");
  const [regionName, setRegionName] = useState(""),
    [schoolName, setSchoolName] = useState("");
  const [schoolRegion, setSchoolRegion] = useState("");
  const [adminRegion, setAdminRegion] = useState(""),
    [adminSchool, setAdminSchool] = useState("");
  const [role, setRole] = useState("region_admin");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [userId, setUserId] = useState("");
  const candidates = useResource(
    "/users?assignable=1&q=" + encodeURIComponent(candidateQuery),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [editor, setEditor] = useState(null),
    [confirmation, setConfirmation] = useState(null);
  const regions = resource.data?.regions || [],
    schools = resource.data?.schools || [],
    admins = resource.data?.admins || [];
  const activeRegions = regions.filter((row) => row.active === 1);
  const chosenSchoolRegion = schoolRegion || activeRegions[0]?.id || "";
  const chosenAdminRegion = adminRegion || activeRegions[0]?.id || "";
  const eligibleSchools = schools.filter(
    (row) => row.regionId === chosenAdminRegion && row.active === 1,
  );
  const chosenAdminSchool = eligibleSchools.some(
    (row) => row.id === adminSchool,
  )
    ? adminSchool
    : eligibleSchools[0]?.id || "";
  async function mutate(path, body, method = "POST", after = () => {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await call(path, { method, body });
      after();
      setConfirmation(null);
      bump();
      notify("已保存");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function toggle(kind, row) {
    setConfirmation({ kind, row });
  }
  function edit(kind, row) {
    setEditor({ kind, id: row.id, name: row.name });
    setError("");
  }
  return (
    <>
      <PageTitle
        eyebrow="GROWTH COMMUNITY ADMINISTRATION"
        title="平台管理"
        description="维护大区与学校，从已有工作人员中任命管理员。账号资料在用户管理中维护。"
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <ResourceState {...resource}>
        <div className="platform-grid">
          <section className="panel" aria-label="新增大区">
            <h2>新增大区</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                mutate("/platform/regions", { name: regionName }, "POST", () =>
                  setRegionName(""),
                );
              }}
            >
              <label>
                大区名称
                <input
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  maxLength={80}
                  placeholder="例如：华东大区"
                  required
                  disabled={busy}
                />
              </label>
              <button className="button primary" disabled={busy}>
                创建大区
              </button>
            </form>
          </section>
          <section className="panel" aria-label="新增学校">
            <h2>新增学校</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                mutate(
                  "/platform/schools",
                  { name: schoolName, regionId: chosenSchoolRegion },
                  "POST",
                  () => setSchoolName(""),
                );
              }}
            >
              <label>
                所属大区
                <select
                  value={chosenSchoolRegion}
                  onChange={(e) => setSchoolRegion(e.target.value)}
                  required
                  disabled={busy}
                >
                  {!activeRegions.length && (
                    <option value="">请先创建大区</option>
                  )}
                  {activeRegions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                学校名称
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </label>
              <button
                className="button primary"
                disabled={busy || !chosenSchoolRegion}
              >
                创建学校
              </button>
            </form>
          </section>
          <section className="panel" aria-label="任命管理员" id="assign-admin">
            <h2>任命管理员</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                mutate(
                  "/admins",
                  {
                    userId,
                    role,
                    regionId: chosenAdminRegion,
                    schoolId: chosenAdminSchool,
                  },
                  "POST",
                );
              }}
            >
              <label>
                搜索已有用户
                <input
                  value={candidateQuery}
                  onChange={(e) => {
                    setCandidateQuery(e.target.value);
                    setUserId("");
                  }}
                  placeholder="输入工作人员账号或称呼"
                  disabled={busy}
                />
              </label>
              <label>
                选择已有用户
                <select
                  aria-label="选择已有用户"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  disabled={busy || candidates.loading}
                >
                  <option value="">请选择工作人员</option>
                  {(candidates.data?.users || [])
                    .filter((row) => row.id !== user.id)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.account}
                      </option>
                    ))}
                </select>
              </label>
              {candidates.error && (
                <p role="alert" className="form-error">
                  {candidates.error}
                </p>
              )}
              <label>
                角色
                <select
                  aria-label="角色"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={busy}
                >
                  {Object.entries(roleNames)
                    .filter(([id]) =>
                      [
                        "platform_admin",
                        "region_admin",
                        "school_admin",
                      ].includes(id),
                    )
                    .map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              {role !== "platform_admin" && (
                <label>
                  所属大区
                  <select
                    value={chosenAdminRegion}
                    onChange={(e) => setAdminRegion(e.target.value)}
                    required
                    disabled={busy}
                  >
                    {!activeRegions.length && (
                      <option value="">请先创建大区</option>
                    )}
                    {activeRegions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {role === "school_admin" && (
                <label>
                  所属学校
                  <select
                    value={chosenAdminSchool}
                    onChange={(e) => setAdminSchool(e.target.value)}
                    required
                    disabled={busy}
                  >
                    {!eligibleSchools.length && (
                      <option value="">请先在此大区创建学校</option>
                    )}
                    {eligibleSchools.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <small>
                请先在用户管理中建立工作人员账号。任命沿用已有账号和密码，调整权限后须重新登录。
              </small>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !userId ||
                  (role !== "platform_admin" && !chosenAdminRegion) ||
                  (role === "school_admin" && !chosenAdminSchool)
                }
              >
                保存任命
              </button>
            </form>
          </section>
        </div>
        {confirmation && (
          <section className="panel" role="alert">
            <h3>
              {confirmation.kind === "revoke"
                ? "确认撤销权限"
                : confirmation.row.active
                  ? "确认停用"
                  : "确认启用"}
              “{confirmation.row.name}”？
            </h3>
            <p>
              {confirmation.kind === "revoke"
                ? "撤销后账号保留为待授权用户，所有会话退出。"
                : "停用大区或学校会阻止所属账号访问和新学生注册，历史数据保留。"}
            </p>
            <div className="invite-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  mutate(
                    confirmation.kind === "revoke"
                      ? `/admins/${confirmation.row.id}/revoke`
                      : `/platform/${confirmation.kind}/${confirmation.row.id}`,
                    confirmation.kind === "revoke"
                      ? {}
                      : { active: !confirmation.row.active },
                    confirmation.kind === "revoke" ? "POST" : "PATCH",
                  )
                }
              >
                确认
                {confirmation.kind === "revoke"
                  ? "撤销权限"
                  : confirmation.row.active
                    ? "停用"
                    : "启用"}
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
        {editor && (
          <section className="panel" aria-label="编辑资料">
            <h2>编辑{editor.kind === "admins" ? "管理员" : "组织"}资料</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                mutate(
                  `/platform/${editor.kind}/${editor.id}`,
                  {
                    name: editor.name,
                  },
                  "PATCH",
                  () => setEditor(null),
                );
              }}
            >
              <label>
                名称
                <input
                  value={editor.name}
                  onChange={(e) =>
                    setEditor({ ...editor, name: e.target.value })
                  }
                  required
                  maxLength={editor.kind === "admins" ? 40 : 80}
                />
              </label>
              <div className="invite-actions">
                <button className="button primary" disabled={busy}>
                  保存资料
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
        <section className="panel">
          <h2>大区管理</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>大区</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.active ? "启用" : "停用"}</td>
                    <td>
                      <div className="invite-actions">
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => edit("regions", row)}
                        >
                          编辑
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => toggle("regions", row)}
                        >
                          {row.active ? "停用" : "启用"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!regions.length && <p className="muted">尚未开通大区。</p>}
          </div>
        </section>
        <section className="panel">
          <h2>学校管理</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>学校</th>
                  <th>所属大区</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.regionName}</td>
                    <td>{row.active ? "启用" : "停用"}</td>
                    <td>
                      <div className="invite-actions">
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => edit("schools", row)}
                        >
                          编辑
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => toggle("schools", row)}
                        >
                          {row.active ? "停用" : "启用"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!schools.length && <p className="muted">尚未创建学校。</p>}
          </div>
        </section>
        <section className="panel">
          <h2>管理员账号</h2>
          <div className="table-scroll">
            <table className="platform-admin-table">
              <thead>
                <tr>
                  <th>称呼 / 账号</th>
                  <th>角色</th>
                  <th>管理范围</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <small className="muted">{row.account}</small>
                    </td>
                    <td>{roleNames[row.role]}</td>
                    <td>
                      {row.regionName || "平台"}
                      {row.schoolName ? ` · ${row.schoolName}` : ""}
                    </td>
                    <td>{row.active ? "启用" : "停用"}</td>
                    <td>
                      <div className="invite-actions">
                        <button
                          className="text-button"
                          disabled={busy || row.id === user.id}
                          onClick={() => {
                            setCandidateQuery(row.account);
                            setUserId(row.id);
                            setRole(row.role);
                            setAdminRegion(row.regionId || "");
                            setAdminSchool(row.schoolId || "");
                            document
                              .getElementById("assign-admin")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          调整权限
                        </button>
                        <button
                          className="text-button"
                          disabled={busy || user.id === row.id}
                          onClick={() => toggle("revoke", row)}
                        >
                          撤销权限
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </ResourceState>
      <section className="panel">
        <h2>最近管理操作</h2>
        <ResourceState {...audit}>
          {audit.data?.events.length ? (
            <ul className="audit-list">
              {audit.data.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.actorName} ·{" "}
                    {actionNames[event.action] || event.action}
                  </strong>
                  <span>{event.detail.name || event.detail.account || ""}</span>
                  <small>
                    {new Date(event.createdAt).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                      hour12: false,
                    })}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">管理操作会记录在这里。</p>
          )}
        </ResourceState>
      </section>
    </>
  );
}
