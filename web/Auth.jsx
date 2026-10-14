import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  MapPin,
  School,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "./context.jsx";
import { isAdmin } from "./api.js";
import { HelpLink, Mark } from "./components.jsx";

export default function Auth({ purpose = "student" }) {
  const { region, regions, authenticate, close, call } = useApp();
  const [platform, setPlatform] = useState(false);
  const [register, setRegister] = useState(false);
  const [selected, setSelected] = useState(region);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!regions.some((item) => item.id === selected)) {
      setSelected(regions[0]?.id || "");
      setInvitation(null);
    }
  }, [regions, selected]);
  async function checkInvite() {
    setChecking(true);
    setError("");
    setInvitation(null);
    try {
      const result = await call("/auth/invite", {
        method: "POST",
        body: { regionId: selected, inviteCode: invite },
      });
      setInvitation(result.invitation);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (register && !invitation) {
      setError("请先核对学校邀请码");
      return;
    }
    if (register && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    try {
      const result = await call(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: {
          regionId: platform ? null : selected,
          account,
          password,
          ...(register ? { name, inviteCode: invite } : {}),
        },
      });
      if (
        purpose === "admin"
          ? !isAdmin(result.user)
          : result.user.role !== "student"
      ) {
        await call("/auth/logout", { method: "POST", token: result.token });
        throw new Error(
          purpose === "admin"
            ? "请使用所在大区的管理员账号"
            : "请使用学生账号；管理员请进入关怀后台",
        );
      }
      authenticate(result);
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-body">
      <div className="auth-intro">
        <Mark />
        <h3>
          {purpose === "admin"
            ? "让每一份需要，都被看见"
            : "欢迎来到你的成长空间"}
        </h3>
        <p>
          {purpose === "admin"
            ? "登录所属区域，开始今日的成长关怀。"
            : "不用急着长大，先学着好好照顾自己。"}
        </p>
      </div>
      <form onSubmit={submit} className="form-stack">
        {purpose === "admin" && (
          <div className="login-modes" role="group" aria-label="选择登录方式">
            {[
              {
                id: false,
                title: "大区 / 学校登录",
                hint: "大区、学校管理员 · 需选择所属大区",
                icon: School,
              },
              {
                id: true,
                title: "平台管理员登录",
                hint: "维护组织与账号 · 无需选择大区",
                icon: Building2,
              },
            ].map((mode) => (
              <button
                key={mode.title}
                type="button"
                className={`login-mode ${platform === mode.id ? "selected" : ""}`}
                aria-label={mode.title}
                aria-pressed={platform === mode.id}
                aria-describedby={`login-mode-${mode.id}`}
                disabled={busy}
                onClick={() => {
                  setPlatform(mode.id);
                  setError("");
                }}
              >
                <mode.icon size={20} strokeWidth={1.8} />
                <span>
                  <strong>{mode.title}</strong>
                  <small id={`login-mode-${mode.id}`}>{mode.hint}</small>
                </span>
                {platform === mode.id && (
                  <Check className="login-mode-check" size={16} />
                )}
              </button>
            ))}
          </div>
        )}
        {!platform && (
          <label>
            <span className="region-label">
              <MapPin size={15} />
              选择你的大区
            </span>
            <select
              aria-label="选择你的大区"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setInvitation(null);
                setError("");
              }}
              disabled={busy || checking || !regions.length}
              required
            >
              {!regions.length && <option value="">暂未开通大区</option>}
              {regions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {!regions.length && <small>暂未开通大区，请联系平台管理员。</small>}
          </label>
        )}
        {register && (
          <>
            <label>
              学校邀请码
              <input
                aria-label="学校邀请码"
                value={invite}
                onChange={(e) => {
                  setInvite(e.target.value);
                  setInvitation(null);
                }}
                required
                maxLength={40}
                placeholder="向学校老师获取邀请码"
                disabled={busy || checking}
                autoComplete="off"
              />
              <small>没有邀请码？请向所在学校工作人员申请。</small>
            </label>
            <button
              type="button"
              className="button secondary full"
              onClick={checkInvite}
              disabled={busy || checking || !invite.trim()}
            >
              {checking ? "正在核对…" : "核对学校"}
            </button>
            {invitation && (
              <div className="info-box" role="status">
                将加入：
                <strong>
                  {invitation.regionName} · {invitation.schoolName}
                </strong>
                <p>请确认是自己的学校，再设置账号和密码。</p>
              </div>
            )}
          </>
        )}
        {register && (
          <label>
            怎么称呼你
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的称呼"
              maxLength={30}
              required
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          账号
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            placeholder={
              register
                ? "自己设置 3–40 位字母、数字、点、下划线或短横线"
                : "输入你的账号"
            }
            autoComplete="username"
            maxLength={40}
          />
        </label>
        <label>
          密码
          <div className="password-input">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              minLength={register ? 8 : 1}
              maxLength={128}
              required
              placeholder={register ? "至少 8 位字符" : "输入密码"}
              autoComplete={register ? "new-password" : "current-password"}
            />
            <button
              type="button"
              aria-label={show ? "隐藏密码" : "显示密码"}
              className="icon-button"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {register && (
          <label>
            确认密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="再输入一次密码"
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!register && (
          <details className="forgot-password">
            <summary>忘记密码？</summary>
            <p>
              为保护账号安全，系统不提供自助找回。学生请联系本校老师（学校管理员）在“用户管理”中重置；管理员请联系上级管理员重置。重置后首次登录需设置新密码。
            </p>
          </details>
        )}
        <button
          className="button primary full"
          disabled={
            busy ||
            checking ||
            (!platform && !selected) ||
            (register && !invitation)
          }
        >
          {busy
            ? "正在连接…"
            : register
              ? "注册并开启成长之旅"
              : purpose === "admin"
                ? "进入关怀后台"
                : "进入我的成长空间"}
          <ArrowRight size={17} />
        </button>
      </form>
      {purpose === "student" && (
        <p className="auth-switch">
          {register ? "已经有账号？" : "还没有账号？"}
          <button
            className="text-button"
            disabled={busy || checking}
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "直接登录" : "邀请码注册"}
          </button>
          {!register && <small>邀请码请向本校老师索取</small>}
        </p>
      )}
      <p className="privacy-note">
        <ShieldCheck size={15} />
        {platform
          ? "平台管理员负责组织与管理账号，学生个人记录保持私密"
          : "账号仅可登录所属大区，学校账号只管理本校"}
      </p>
      <p className="auth-help">
        登录遇到问题？
        <HelpLink anchor="faq" label="查看常见问题" />
      </p>
    </div>
  );
}
