import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp, useMutation, useResource } from "./context.jsx";
import {
  ActiveBadge,
  ConfirmDialog,
  Empty,
  FormDialog,
  ListHeader,
  ResourceState,
} from "./components.jsx";
import { PageTitle } from "./Student.jsx";
import { RevokeDialog } from "./Platform.jsx";
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
const pageSize = 50;

export default function UserManagement() {
  const { user } = useApp();
  const isRegion = user.role === "region_admin";
  const schools = useResource("/admin/schools", isRegion);
  const activeSchools = (schools.data?.schools || []).filter(
    (row) => row.active,
  );
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [role, setRole] = useState(""),
    [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    // Search as people type, without a request per keystroke.
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const resource = useResource(
    `/users?q=${encodeURIComponent(search)}&role=${role}&page=${page}`,
  );
  const data = resource.data;
  const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
  const close = () => setDialog(null);
  const filtered = search || role;
  return (
    <>
      <PageTitle
        eyebrow="PEOPLE IN OUR COMMUNITY"
        title="用户管理"
        help={
          {
            platform_admin: "platform-appoint",
            region_admin: "region-users",
            school_admin: "school-users",
          }[user.role]
        }
        description="管理你权限范围内的账号资料与状态。"
        tip={scopeText[user.role]}
      />
      <section className="panel" aria-label="用户列表">
        <ListHeader title="用户列表" count={data?.total} unit=" 位">
          <button
            className="button primary"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus size={16} />
            新增工作人员
          </button>
        </ListHeader>
        <form
          className="list-filters"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
            setPage(1);
          }}
        >
          <label className="search-field">
            <Search size={16} />
            <input
              type="search"
              aria-label="搜索账号或称呼"
              placeholder="搜索账号或称呼"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
            />
          </label>
          <select
            className="select-field"
            aria-label="用户类型"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部类型</option>
            {visibleRoles[user.role].map((id) => (
              <option key={id} value={id}>
                {roleNames[id]}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setQuery("");
                setSearch("");
                setRole("");
                setPage(1);
              }}
            >
              清除筛选
            </button>
          )}
        </form>
        <ResourceState {...resource}>
          {data &&
            (data.users.length ? (
              <>
                <div className="table-scroll">
                  <table className="stack-table platform-admin-table">
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
                      {data.users.map((row) => (
                        <tr key={row.id}>
                          <td data-label="称呼 / 账号">
                            {row.name}
                            {row.id === user.id && (
                              <span className="self-tag">（我）</span>
                            )}
                            <small>{row.account}</small>
                          </td>
                          <td data-label="类型">{roleNames[row.role]}</td>
                          <td data-label="归属">
                            {row.regionName || "—"}
                            {row.schoolName ? ` · ${row.schoolName}` : ""}
                          </td>
                          <td data-label="状态">
                            <ActiveBadge active={row.active} />
                          </td>
                          <td data-label="操作">
                            <div className="row-actions">
                              <button
                                className="text-button"
                                onClick={() => setDialog({ type: "edit", row })}
                              >
                                编辑
                              </button>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setDialog({ type: "password", row })
                                }
                              >
                                重置密码
                              </button>
                              {isRegion &&
                                row.role === "user" &&
                                row.active === 1 && (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      setDialog({ type: "appoint", row })
                                    }
                                  >
                                    任命为学校管理员
                                  </button>
                                )}
                              {isRegion && row.role === "school_admin" && (
                                <button
                                  className="text-button danger"
                                  onClick={() =>
                                    setDialog({ type: "revoke", row })
                                  }
                                >
                                  撤销管理员
                                </button>
                              )}
                              <button
                                className={`text-button ${row.active ? "danger" : ""}`}
                                disabled={row.id === user.id}
                                title={
                                  row.id === user.id
                                    ? "不能停用当前登录账号"
                                    : undefined
                                }
                                onClick={() =>
                                  setDialog({ type: "toggle", row })
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
                <div className="list-footer">
                  <span>
                    第 {page} / {pages} 页
                  </span>
                  {pages > 1 && (
                    <div className="invite-actions">
                      <button
                        className="text-button"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        上一页
                      </button>
                      <button
                        className="text-button"
                        disabled={page >= pages}
                        onClick={() => setPage(page + 1)}
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Empty
                icon="users"
                title={filtered ? "没有符合条件的用户" : "还没有用户"}
                description={
                  filtered
                    ? "换个关键词或类型试试。"
                    : "点击“新增工作人员”建立第一个账号。"
                }
              />
            ))}
        </ResourceState>
      </section>
      {dialog?.type === "create" && (
        <CreateUserDialog
          schools={isRegion ? activeSchools : null}
          onClose={close}
          onCreated={() => {
            setQuery("");
            setSearch("");
            setRole("");
            setPage(1);
          }}
        />
      )}
      {dialog?.type === "edit" && (
        <EditUserDialog row={dialog.row} onClose={close} />
      )}
      {dialog?.type === "password" && (
        <PasswordDialog row={dialog.row} onClose={close} />
      )}
      {dialog?.type === "toggle" && (
        <ToggleUserDialog row={dialog.row} onClose={close} />
      )}
      {dialog?.type === "appoint" && (
        <AppointSchoolDialog
          row={dialog.row}
          schools={activeSchools}
          onClose={close}
        />
      )}
      {dialog?.type === "revoke" && (
        <RevokeDialog
          row={dialog.row}
          onClose={close}
          note="撤销后该账号保留在原学校，成为待授权用户，并退出所有会话。"
        />
      )}
    </>
  );
}

function CreateUserDialog({ schools, onClose, onCreated }) {
  const { user } = useApp();
  const { busy, error, run } = useMutation();
  const [name, setName] = useState(""),
    [account, setAccount] = useState(""),
    [password, setPassword] = useState(""),
    [school, setSchool] = useState("");
  async function submit() {
    const result = await run("/users", {
      body: {
        account,
        name,
        password,
        ...(school ? { schoolId: school } : {}),
      },
      success: "账号已创建",
    });
    if (result) {
      onCreated();
      onClose();
    }
  }
  return (
    <FormDialog
      title="新增工作人员"
      tip={
        user.role === "platform_admin"
          ? "新账号为待授权状态，在平台管理中任命后才能登录；首次登录需本人修改初始密码。请通过受控渠道告知本人初始凭据。"
          : `新账号建立在${user.schoolName || user.regionName}，待上级任命后方可登录；首次登录需本人修改初始密码。请通过受控渠道告知本人初始凭据。`
      }
      submitLabel="创建用户"
      busy={busy}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <label>
        用户称呼
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={40}
          autoFocus
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
          pattern="[A-Za-z0-9._\-]+"
          title="3–40位字母、数字、点、下划线或短横线"
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
          placeholder="至少 8 位"
          disabled={busy}
        />
      </label>
      {schools && (
        <label>
          所属学校
          <select
            aria-label="所属学校"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={busy}
          >
            <option value="">本大区（暂不指定学校）</option>
            {schools.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </FormDialog>
  );
}

function EditUserDialog({ row, onClose }) {
  const { busy, error, run } = useMutation();
  const [name, setName] = useState(row.name);
  return (
    <FormDialog
      title={`编辑用户 · ${row.account}`}
      tip="登录账号不可修改；用户类型与归属通过任命调整。"
      submitLabel="保存用户资料"
      busy={busy}
      error={error}
      disabled={!name.trim() || name === row.name}
      onSubmit={async () => {
        const result = await run(`/users/${row.id}`, {
          method: "PATCH",
          body: { name },
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      <label>
        用户称呼
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={40}
          autoFocus
          disabled={busy}
        />
      </label>
    </FormDialog>
  );
}

function PasswordDialog({ row, onClose }) {
  const { busy, error, setError, run } = useMutation();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  return (
    <FormDialog
      title={`重置密码 · ${row.name}`}
      description="重置后该用户的所有登录会话会立即退出，请通过受控渠道告知新密码。"
      submitLabel="重置密码"
      danger
      busy={busy}
      error={error}
      onSubmit={async () => {
        if (password !== confirmation) {
          setError("两次输入的密码不一致");
          return;
        }
        const result = await run(`/users/${row.id}`, {
          method: "PATCH",
          body: { password },
          success: "密码已重置",
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
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
          placeholder="至少 8 位"
          autoFocus
          disabled={busy}
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
          disabled={busy}
        />
      </label>
    </FormDialog>
  );
}

function ToggleUserDialog({ row, onClose }) {
  const { busy, error, run } = useMutation();
  const verb = row.active ? "停用" : "启用";
  return (
    <ConfirmDialog
      title={`${verb}“${row.name}”？`}
      confirmLabel={`确认${verb}`}
      danger={!!row.active}
      busy={busy}
      error={error}
      onSubmit={async () => {
        const result = await run(`/users/${row.id}`, {
          method: "PATCH",
          body: { active: !row.active },
          success: `已${verb}`,
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      {row.active
        ? "停用后该用户会立即退出所有会话并无法登录，历史记录保留，可随时重新启用。"
        : "启用后该用户可以重新登录。"}
    </ConfirmDialog>
  );
}

function AppointSchoolDialog({ row, schools, onClose }) {
  const { busy, error, run } = useMutation();
  const [schoolId, setSchoolId] = useState(
    row.schoolId || (schools.length === 1 ? schools[0].id : ""),
  );
  return (
    <FormDialog
      title={`任命学校管理员 · ${row.name}`}
      description="任命后该账号需重新登录，仅能管理所选学校。"
      submitLabel="确认任命"
      busy={busy}
      error={error}
      disabled={!schoolId}
      onSubmit={async () => {
        const result = await run("/admins", {
          body: { userId: row.id, role: "school_admin", schoolId },
          success: "已任命",
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      <label>
        管理学校
        <select
          aria-label="管理学校"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          required
          disabled={busy}
        >
          <option value="">请选择本大区学校</option>
          {schools.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </FormDialog>
  );
}
