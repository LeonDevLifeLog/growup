import { useState } from "react";
import { ArrowRight, MapPin, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useApp } from "./context.jsx";
import { regions } from "./api.js";
import { Mark } from "./components.jsx";

export default function Auth({ purpose = "student" }) {
  const { region, demo, authenticate, close, call } = useApp();
  const [register, setRegister] = useState(false);
  const [selected, setSelected] = useState(region);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await call(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: {
          regionId: selected,
          account,
          password,
          ...(register ? { name, inviteCode: invite } : {}),
        },
      });
      if (result.user.role !== purpose) {
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
        <fieldset className="region-field">
          <legend>
            <MapPin size={15} />
            选择你的大区
          </legend>
          <div className="region-options">
            {regions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? "selected" : ""}
                onClick={() => {
                  setSelected(item.id);
                  setError("");
                }}
                aria-pressed={selected === item.id}
              >
                {item.name}
              </button>
            ))}
          </div>
        </fieldset>
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
            placeholder="输入学校提供的账号"
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
            学校邀请码
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              required
              maxLength={40}
              placeholder="向学校老师获取邀请码"
            />
            <small>邀请码绑定大区和学校，注册后不能自行跨区。</small>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
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
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "直接登录" : "邀请码注册"}
          </button>
        </p>
      )}
      {demo && !register && (
        <div className="demo-credentials">
          <span>本地演示 · 虚构账号</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSelected("hainan");
              setAccount(`hainan.${purpose === "admin" ? "admin" : "student"}`);
              setPassword("Growup123!");
            }}
          >
            填入{purpose === "admin" ? "管理" : "学生"}演示账号
            <ArrowRight size={14} />
          </button>
          <small>密码 Growup123! · 仅在演示模式提供</small>
        </div>
      )}
      <p className="privacy-note">
        <ShieldCheck size={15} />
        账号仅可登录注册时所属的大区
      </p>
    </div>
  );
}
