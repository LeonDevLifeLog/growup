import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import { useApp, useMutation, useResource } from "./context.jsx";
import {
  ConfirmDialog,
  Empty,
  FormDialog,
  ListHeader,
  Modal,
  ResourceState,
} from "./components.jsx";
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
  const { user } = useApp();
  const schools = useResource("/admin/schools");
  const invites = useResource("/admin/invites");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState(null);
  const list = schools.data?.schools || [];
  const isSchool = user.role === "school_admin";
  const all = invites.data?.invites || [];
  const rows = all.filter((invite) => !status || invite.status === status);
  const close = () => setDialog(null);
  return (
    <>
      <PageTitle
        eyebrow="WELCOME TO OUR GROWTH COMMUNITY"
        title="学校与邀请"
        help={user.role === "school_admin" ? "school-invite" : "region"}
        description={`${user.regionName}${user.schoolName ? " · " + user.schoolName : ""} · 学生使用学校邀请码建立个人账号。`}
      />
      <ResourceState {...schools}>
        {list.length ? (
          <ul className="school-strip" aria-label="学校">
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
      <section className="panel" aria-label="邀请记录">
        <ListHeader title="邀请记录" count={rows.length} unit=" 条">
          <select
            className="select-field"
            aria-label="按状态筛选"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            {Object.entries(labels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          {isSchool && (
            <button
              className="button primary"
              disabled={!list.length}
              onClick={() => setDialog({ type: "create" })}
            >
              <Plus size={16} />
              生成邀请码
            </button>
          )}
        </ListHeader>
        <ResourceState {...invites}>
          {rows.length ? (
            <div className="table-scroll">
              <table className="stack-table invitation-table">
                <thead>
                  <tr>
                    <th>学校 / 备注</th>
                    <th>邀请码尾号</th>
                    <th>状态</th>
                    <th>已用 / 名额</th>
                    <th>到期时间（北京时间）</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((invite) => (
                    <tr key={invite.id}>
                      <td data-label="学校 / 备注">
                        <strong>{invite.schoolName}</strong>
                        <small>{invite.note}</small>
                      </td>
                      <td data-label="邀请码尾号">…{invite.codeHint}</td>
                      <td data-label="状态">
                        <span
                          className={`badge ${invite.status === "active" ? "green" : "gray"}`}
                        >
                          {labels[invite.status]}
                        </span>
                      </td>
                      <td data-label="已用 / 名额">
                        {invite.usedCount} / {invite.maxUses}
                      </td>
                      <td data-label="到期时间（北京时间）">
                        {dateText(invite.expiresAt)}
                      </td>
                      <td data-label="操作">
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => setDialog({ type: "uses", invite })}
                          >
                            使用记录
                          </button>
                          {isSchool && invite.active === 1 && (
                            <button
                              className="text-button danger"
                              onClick={() =>
                                setDialog({ type: "revoke", invite })
                              }
                            >
                              停用
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={all.length ? "没有该状态的邀请" : "还没有邀请记录"}
              description={
                all.length
                  ? "换一个状态看看。"
                  : isSchool
                    ? "点击“生成邀请码”，为本校开通学生注册。"
                    : "学校管理员生成邀请码后，可在此查看本区使用情况。"
              }
              icon="school"
            />
          )}
        </ResourceState>
      </section>
      {dialog?.type === "create" && (
        <CreateInviteDialog schools={list} onClose={close} />
      )}
      {dialog?.type === "uses" && (
        <UsesDialog invite={dialog.invite} onClose={close} />
      )}
      {dialog?.type === "revoke" && (
        <RevokeInviteDialog invite={dialog.invite} onClose={close} />
      )}
    </>
  );
}

function CreateInviteDialog({ schools, onClose }) {
  const { notify } = useApp();
  const { busy, error, run } = useMutation();
  const [schoolId, setSchoolId] = useState(schools[0]?.id || "");
  const [days, setDays] = useState("30");
  const [maxUses, setMaxUses] = useState("100");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState(null);
  if (created)
    // The full code is shown once; ask for an explicit close so it is not lost.
    return (
      <Modal title="邀请码已生成" onClose={onClose}>
        <div className="form-stack dialog-form">
          <div className="code-reveal invitation-created" role="status">
            <small>
              {created.schoolName} · {created.maxUses} 个名额 ·{" "}
              {dateText(created.expiresAt)} 到期
            </small>
            <code>{created.code}</code>
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
          </div>
          <p className="dialog-lead">
            完整邀请码仅显示这一次。请通过学校渠道发给学生；丢失后可停用并重新生成。
          </p>
          <div className="dialog-actions">
            <button className="button primary" onClick={onClose}>
              我已记录
            </button>
          </div>
        </div>
      </Modal>
    );
  return (
    <FormDialog
      title="生成学生邀请码"
      description="学生凭邀请码自行设置账号密码，只能加入所选学校，不能用于管理员注册。"
      submitLabel="生成邀请码"
      busy={busy}
      error={error}
      disabled={!schoolId}
      onSubmit={async () => {
        const result = await run("/admin/invites", {
          body: {
            schoolId,
            days: Number(days),
            maxUses: Number(maxUses),
            note,
          },
          success: "邀请码已生成，请妥善记录",
        });
        if (result) setCreated(result.invite);
      }}
      onClose={onClose}
    >
      {schools.length > 1 ? (
        <label>
          所属学校
          <select
            aria-label="所属学校"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
            disabled={busy}
          >
            {schools.map((school) => (
              <option value={school.id} key={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div>
          <small>所属学校</small>
          <p className="readonly-field">{schools[0]?.name}</p>
        </div>
      )}
      <label>
        邀请备注
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="例如：高一年级秋季开通"
          autoFocus
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
    </FormDialog>
  );
}

function UsesDialog({ invite, onClose }) {
  const detail = useResource(`/admin/invites/${invite.id}`);
  return (
    <Modal title="邀请使用记录" wide onClose={onClose}>
      <ResourceState {...detail}>
        {detail.data && (
          <>
            <p className="dialog-lead">
              {detail.data.invite.schoolName}
              {detail.data.invite.note ? ` · ${detail.data.invite.note}` : ""} ·
              已注册 {detail.data.invite.usedCount} /{" "}
              {detail.data.invite.maxUses} 人
            </p>
            {detail.data.uses.length ? (
              <div className="table-scroll">
                <table className="stack-table">
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
                        <td data-label="学生称呼">{use.name}</td>
                        <td data-label="账号">{use.account}</td>
                        <td data-label="注册时间">
                          {dateText(use.registeredAt)}
                        </td>
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
    </Modal>
  );
}

function RevokeInviteDialog({ invite, onClose }) {
  const { busy, error, run } = useMutation();
  return (
    <ConfirmDialog
      title={`停用尾号 ${invite.codeHint} 的邀请码？`}
      confirmLabel="确认停用"
      danger
      busy={busy}
      error={error}
      onSubmit={async () => {
        const result = await run(`/admin/invites/${invite.id}/revoke`, {
          success: "邀请码已停用，已注册账号可继续使用",
        });
        if (result) onClose();
      }}
      onClose={onClose}
    >
      停用后无法再用此邀请码注册，且不能恢复；已注册的学生账号不受影响。
    </ConfirmDialog>
  );
}
