import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useApp, useMutation, useResource } from "./context.jsx";
import {
  ActiveBadge,
  ConfirmDialog,
  Empty,
  FormDialog,
  ListHeader,
  ResourceState,
  Tabs,
} from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { roleNames } from "./api.js";

export function ChangePassword({ title = "修改我的密码" }) {
  const { call, authenticate, notify, close } = useApp();
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
      close();
      notify("密码已更新，其他会话已退出");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      {title && <h3>{title}</h3>}
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
const adminRoleIds = ["platform_admin", "region_admin", "school_admin"];
const dateTime = (value) =>
  new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });

export default function Platform() {
  const { user, setView } = useApp();
  const resource = useResource("/platform/organizations");
  const [tab, setTab] = useState("regions");
  const audit = useResource("/platform/audit", tab === "audit");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [dialog, setDialog] = useState(null);
  const regions = resource.data?.regions || [],
    schools = resource.data?.schools || [],
    admins = resource.data?.admins || [];
  const activeRegions = regions.filter((row) => row.active === 1);
  const visibleSchools = schools.filter(
    (row) => !schoolFilter || row.regionId === schoolFilter,
  );
  const close = () => setDialog(null);
  const newButton = (label, type, disabled = false) => (
    <button
      className="button primary"
      disabled={disabled}
      onClick={() => setDialog({ type })}
    >
      <Plus size={16} />
      {label}
    </button>
  );
  return (
    <>
      <PageTitle
        eyebrow="GROWTH COMMUNITY ADMINISTRATION"
        title="平台管理"
        help="platform-orgs"
        description="维护大区与学校，从已有工作人员中任命管理员。账号资料在用户管理中维护。"
      />
      <ResourceState {...resource}>
        {resource.data && (
          <Onboarding
            regions={regions.length}
            schools={schools.length}
            progress={resource.data.progress}
            onStep={(step) => {
              if (step === "region") {
                setTab("regions");
                setDialog({ type: "region" });
              } else if (step === "school") {
                setTab("schools");
                setDialog({ type: "school" });
              } else if (step === "staff") setView("admin-users");
              else if (step === "appoint") {
                setTab("admins");
                setDialog({ type: "appoint" });
              }
            }}
          />
        )}
        <section className="panel">
          <Tabs
            label="平台管理分类"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "regions", label: "大区", count: regions.length },
              { id: "schools", label: "学校", count: schools.length },
              { id: "admins", label: "管理员", count: admins.length },
              { id: "audit", label: "操作记录" },
            ]}
          />
          {tab === "regions" && (
            <>
              <ListHeader title="大区管理" count={regions.length} unit=" 个">
                {newButton("新增大区", "region")}
              </ListHeader>
              {regions.length ? (
                <div className="table-scroll">
                  <table className="stack-table">
                    <thead>
                      <tr>
                        <th>大区</th>
                        <th>学校</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regions.map((row) => (
                        <tr key={row.id}>
                          <td data-label="大区">{row.name}</td>
                          <td data-label="学校">
                            {
                              schools.filter((item) => item.regionId === row.id)
                                .length
                            }{" "}
                            所
                          </td>
                          <td data-label="状态">
                            <ActiveBadge active={row.active} />
                          </td>
                          <td data-label="操作">
                            <div className="row-actions">
                              <button
                                className="text-button"
                                onClick={() =>
                                  setDialog({ type: "region", row })
                                }
                              >
                                编辑
                              </button>
                              <button
                                className={`text-button ${row.active ? "danger" : ""}`}
                                onClick={() =>
                                  setDialog({
                                    type: "toggle",
                                    kind: "regions",
                                    row,
                                  })
                                }
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
              ) : (
                <Empty
                  icon="school"
                  title="尚未开通大区"
                  description="先新增一个大区，再为它添加学校。"
                />
              )}
            </>
          )}
          {tab === "schools" && (
            <>
              <ListHeader
                title="学校管理"
                count={visibleSchools.length}
                unit=" 所"
              >
                <select
                  className="select-field"
                  aria-label="按大区筛选"
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                >
                  <option value="">全部大区</option>
                  {regions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                {newButton("新增学校", "school", !activeRegions.length)}
              </ListHeader>
              {visibleSchools.length ? (
                <div className="table-scroll">
                  <table className="stack-table">
                    <thead>
                      <tr>
                        <th>学校</th>
                        <th>所属大区</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSchools.map((row) => (
                        <tr key={row.id}>
                          <td data-label="学校">{row.name}</td>
                          <td data-label="所属大区">{row.regionName}</td>
                          <td data-label="状态">
                            <ActiveBadge active={row.active} />
                          </td>
                          <td data-label="操作">
                            <div className="row-actions">
                              <button
                                className="text-button"
                                onClick={() =>
                                  setDialog({ type: "school", row })
                                }
                              >
                                编辑
                              </button>
                              <button
                                className={`text-button ${row.active ? "danger" : ""}`}
                                onClick={() =>
                                  setDialog({
                                    type: "toggle",
                                    kind: "schools",
                                    row,
                                  })
                                }
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
              ) : (
                <Empty
                  icon="school"
                  title={activeRegions.length ? "还没有学校" : "请先开通大区"}
                  description={
                    activeRegions.length
                      ? "点击“新增学校”，为大区添加第一所学校。"
                      : "学校必须归属一个启用的大区。"
                  }
                  action={activeRegions.length ? undefined : "去新增大区"}
                  onAction={() => setTab("regions")}
                />
              )}
            </>
          )}
          {tab === "admins" && (
            <>
              <ListHeader title="管理员账号" count={admins.length} unit=" 位">
                {newButton("任命管理员", "appoint")}
              </ListHeader>
              <div className="table-scroll">
                <table className="stack-table platform-admin-table">
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
                        <td data-label="称呼 / 账号">
                          {row.name}
                          {row.id === user.id && (
                            <span className="self-tag">（我）</span>
                          )}
                          <small className="muted">{row.account}</small>
                        </td>
                        <td data-label="角色">{roleNames[row.role]}</td>
                        <td data-label="管理范围">
                          {row.regionName || "全平台"}
                          {row.schoolName ? ` · ${row.schoolName}` : ""}
                        </td>
                        <td data-label="状态">
                          <ActiveBadge active={row.active} />
                        </td>
                        <td data-label="操作">
                          <div className="row-actions">
                            <button
                              className="text-button"
                              disabled={row.id === user.id}
                              title={
                                row.id === user.id
                                  ? "不能调整当前登录账号"
                                  : undefined
                              }
                              onClick={() =>
                                setDialog({ type: "appoint", row })
                              }
                            >
                              调整权限
                            </button>
                            <button
                              className="text-button danger"
                              disabled={row.id === user.id}
                              onClick={() => setDialog({ type: "revoke", row })}
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
            </>
          )}
          {tab === "audit" && (
            <>
              <ListHeader title="最近管理操作" />
              <ResourceState {...audit}>
                {audit.data?.events.length ? (
                  <ul className="audit-list">
                    {audit.data.events.map((event) => (
                      <li key={event.id}>
                        <strong>
                          {event.actorName} ·{" "}
                          {actionNames[event.action] || event.action}
                        </strong>
                        <span>
                          {event.detail.name || event.detail.account || ""}
                          {event.detail.role
                            ? ` → ${roleNames[event.detail.role]}`
                            : ""}
                        </span>
                        <small>{dateTime(event.createdAt)}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">管理操作会记录在这里。</p>
                )}
              </ResourceState>
            </>
          )}
        </section>
      </ResourceState>
      {dialog?.type === "region" && (
        <OrganizationDialog kind="regions" row={dialog.row} onClose={close} />
      )}
      {dialog?.type === "school" && (
        <OrganizationDialog
          kind="schools"
          row={dialog.row}
          regions={activeRegions}
          defaultRegion={schoolFilter}
          onClose={close}
        />
      )}
      {dialog?.type === "appoint" && (
        <AppointDialog
          row={dialog.row}
          regions={activeRegions}
          schools={schools.filter((row) => row.active === 1)}
          onClose={close}
        />
      )}
      {dialog?.type === "toggle" && (
        <ToggleDialog kind={dialog.kind} row={dialog.row} onClose={close} />
      )}
      {dialog?.type === "revoke" && (
        <RevokeDialog row={dialog.row} onClose={close} />
      )}
    </>
  );
}

function Onboarding({ regions, schools, progress, onStep }) {
  const steps = [
    {
      id: "region",
      label: "新增第一个大区",
      done: regions > 0,
      action: "去新增大区",
    },
    {
      id: "school",
      label: "为大区新增学校",
      done: schools > 0,
      action: "去新增学校",
    },
    {
      id: "staff",
      label: "在用户管理中建立工作人员账号",
      done: progress.staff > 0,
      action: "去用户管理",
    },
    {
      id: "appoint",
      label: "任命学校管理员",
      done: progress.schoolAdmins > 0,
      action: "去任命",
    },
    {
      id: "invite",
      label: "学校管理员登录后生成学生邀请码",
      done: progress.invites > 0,
    },
    {
      id: "student",
      label: "第一位学生用邀请码注册",
      done: progress.students > 0,
    },
  ];
  const finished = steps.filter((step) => step.done).length;
  if (finished === steps.length) return null;
  // The first unfinished step is the one to act on now.
  const current = steps.find((step) => !step.done);
  return (
    <section className="panel onboarding" aria-label="开通进度">
      <ListHeader title="开通进度" count={`${finished} / ${steps.length}`} />
      <ol>
        {steps.map((step) => (
          <li
            key={step.id}
            className={step.done ? "done" : step === current ? "current" : ""}
          >
            <span className="onboarding-mark">
              {step.done ? <Check size={13} /> : steps.indexOf(step) + 1}
            </span>
            <span>{step.label}</span>
            {step === current && step.action && (
              <button className="text-button" onClick={() => onStep(step.id)}>
                {step.action}
              </button>
            )}
            {step === current && !step.action && (
              <small>由学校管理员或学生完成</small>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrganizationDialog({
  kind,
  row,
  regions = [],
  defaultRegion,
  onClose,
}) {
  const { busy, error, run } = useMutation();
  const isSchool = kind === "schools";
  const [name, setName] = useState(row?.name || "");
  const [regionId, setRegionId] = useState(
    regions.some((item) => item.id === defaultRegion)
      ? defaultRegion
      : regions[0]?.id || "",
  );
  const noun = isSchool ? "学校" : "大区";
  async function submit() {
    const result = row
      ? await run(`/platform/${kind}/${row.id}`, {
          method: "PATCH",
          body: { name },
        })
      : await run(`/platform/${kind}`, {
          body: isSchool ? { name, regionId } : { name },
          success: `${noun}已创建`,
        });
    if (result) onClose();
  }
  return (
    <FormDialog
      title={row ? `编辑${noun}` : `新增${noun}`}
      submitLabel={row ? "保存修改" : `创建${noun}`}
      busy={busy}
      error={error}
      disabled={isSchool && !row && !regionId}
      onSubmit={submit}
      onClose={onClose}
    >
      {isSchool &&
        (row ? (
          <div>
            <small>所属大区</small>
            <p className="readonly-field">{row.regionName}（创建后不可迁移）</p>
          </div>
        ) : (
          <label>
            所属大区
            <select
              aria-label="所属大区"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              required
              disabled={busy}
            >
              {regions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      <label>
        {noun}名称
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={isSchool ? "例如：第一中学" : "例如：华东大区"}
          required
          autoFocus
          disabled={busy}
        />
      </label>
    </FormDialog>
  );
}

function AppointDialog({ row, regions, schools, onClose }) {
  const { user } = useApp();
  const { busy, error, run } = useMutation();
  const [query, setQuery] = useState(row?.account || "");
  const [userId, setUserId] = useState(row?.id || "");
  const [role, setRole] = useState(row?.role || "region_admin");
  const [regionId, setRegionId] = useState(
    row?.regionId || regions[0]?.id || "",
  );
  const [schoolId, setSchoolId] = useState(row?.schoolId || "");
  const candidates = useResource(
    "/users?assignable=1&q=" + encodeURIComponent(query),
    !row,
  );
  const regionSchools = schools.filter((item) => item.regionId === regionId);
  const chosenSchool = regionSchools.some((item) => item.id === schoolId)
    ? schoolId
    : regionSchools[0]?.id || "";
  const options = (candidates.data?.users || []).filter(
    (item) => item.id !== user.id,
  );
  async function submit() {
    const result = await run("/admins", {
      body: { userId, role, regionId, schoolId: chosenSchool },
      success: row ? "权限已调整" : "已任命",
    });
    if (result) onClose();
  }
  return (
    <FormDialog
      title={row ? `调整权限 · ${row.name}` : "任命管理员"}
      tip="任命沿用已有账号和密码；调整后该账号需要重新登录。大区与学校管理员只能管理所选范围。"
      submitLabel="保存任命"
      busy={busy}
      error={error}
      disabled={
        !userId ||
        (role !== "platform_admin" && !regionId) ||
        (role === "school_admin" && !chosenSchool)
      }
      onSubmit={submit}
      onClose={onClose}
    >
      {row ? (
        <div>
          <small>工作人员</small>
          <p className="readonly-field">
            {row.name} · {row.account}
          </p>
        </div>
      ) : (
        <>
          <label>
            搜索已有用户
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setUserId("");
              }}
              placeholder="输入工作人员账号或称呼"
              autoFocus
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
              <option value="">
                {candidates.loading
                  ? "正在查找…"
                  : options.length
                    ? "请选择工作人员"
                    : "没有匹配的工作人员，请先在用户管理中建档"}
              </option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.account}
                </option>
              ))}
            </select>
          </label>
          {candidates.error && (
            <p role="alert" className="form-error">
              {candidates.error}
            </p>
          )}
        </>
      )}
      <label>
        角色
        <select
          aria-label="角色"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={busy}
        >
          {adminRoleIds.map((id) => (
            <option key={id} value={id}>
              {roleNames[id]}
            </option>
          ))}
        </select>
      </label>
      {role !== "platform_admin" && (
        <label>
          所属大区
          <select
            aria-label="所属大区"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            required
            disabled={busy}
          >
            {!regions.length && <option value="">请先创建大区</option>}
            {regions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {role === "school_admin" && (
        <label>
          所属学校
          <select
            aria-label="所属学校"
            value={chosenSchool}
            onChange={(e) => setSchoolId(e.target.value)}
            required
            disabled={busy}
          >
            {!regionSchools.length && (
              <option value="">请先在此大区创建学校</option>
            )}
            {regionSchools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </FormDialog>
  );
}

function ToggleDialog({ kind, row, onClose }) {
  const { busy, error, run } = useMutation();
  const noun = kind === "regions" ? "大区" : "学校";
  const verb = row.active ? "停用" : "启用";
  return (
    <ConfirmDialog
      title={`${verb}${noun}“${row.name}”？`}
      confirmLabel={`确认${verb}`}
      danger={!!row.active}
      busy={busy}
      error={error}
      onSubmit={async () => {
        const result = await run(`/platform/${kind}/${row.id}`, {
          method: "PATCH",
          body: { active: !row.active },
          success: `${noun}已${verb}`,
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      {row.active
        ? `停用后，该${noun}的账号会立即退出且无法登录，学生也不能再用邀请码注册。历史数据保留，可随时重新启用。`
        : `启用后，该${noun}的账号可以重新登录。`}
    </ConfirmDialog>
  );
}

export function RevokeDialog({ row, onClose, note }) {
  const { busy, error, run } = useMutation();
  return (
    <ConfirmDialog
      title={`撤销“${row.name}”的管理员权限？`}
      confirmLabel="确认撤销"
      danger
      busy={busy}
      error={error}
      onSubmit={async () => {
        const result = await run(`/admins/${row.id}/revoke`, {
          body: {},
          success: "权限已撤销",
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      {note ||
        "撤销后账号保留为待授权用户，原大区或学校归属不变，所有会话立即退出。"}
    </ConfirmDialog>
  );
}
