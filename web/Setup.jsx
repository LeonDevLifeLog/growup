import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { request } from "./api.js";
import { InfoTip, Mark } from "./components.jsx";

const steps = ["开始", "平台管理员", "第一个组织"];
const accountPattern = /^[A-Za-z0-9._-]{3,40}$/;

/** Shown instead of the app until the first platform administrator exists. */
export default function Setup({ tokenRequired, onDone }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    setupToken: "",
    name: "",
    account: "",
    password: "",
    confirmation: "",
    regionName: "",
    schoolName: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key) => ({
    value: form[key],
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
    disabled: busy,
  });
  function next(event) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (!accountPattern.test(form.account))
        return setError("账号需为 3–40 位字母、数字、点、下划线或短横线");
      if (form.password.length < 8) return setError("密码至少 8 位");
      if (form.password !== form.confirmation)
        return setError("两次输入的密码不一致");
    }
    if (step < 2) return setStep(step + 1);
    submit(false);
  }
  async function submit(skipOrganization) {
    if (!skipOrganization && form.schoolName.trim() && !form.regionName.trim())
      return setError("请先填写学校所属大区");
    setBusy(true);
    setError("");
    try {
      const result = await request("/setup", {
        method: "POST",
        body: {
          setupToken: form.setupToken,
          name: form.name,
          account: form.account,
          password: form.password,
          ...(skipOrganization
            ? {}
            : { regionName: form.regionName, schoolName: form.schoolName }),
        },
      });
      onDone(result);
    } catch (e) {
      setError(e.message);
      // Send people back to the step that holds the rejected value.
      if (e.status === 403) setStep(0);
      else if (/账号|密码|称呼/.test(e.message)) setStep(1);
      else if (e.status === 409 && e.message.includes("已完成初始化"))
        location.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="setup-page">
      <section className="setup-card" aria-labelledby="setup-title">
        <div className="setup-brand">
          <Mark />
          <div>
            <strong>成长健研社</strong>
            <small>首次安装初始化</small>
          </div>
        </div>
        <ol className="setup-steps" aria-label="初始化步骤">
          {steps.map((label, index) => (
            <li
              key={label}
              className={
                index === step ? "current" : index < step ? "done" : ""
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? <Check size={13} /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <form className="form-stack" onSubmit={next}>
          {step === 0 && (
            <>
              <h1 id="setup-title">欢迎使用成长健研社</h1>
              <p className="dialog-lead">
                第一次启动：创建平台管理员，可顺手开通第一个大区和学校。完成后此页面永久关闭。
                <InfoTip label="初始化说明">
                  平台管理员负责维护大区、学校和各级管理员，不查看学生关怀记录。大区、学校管理员和学生账号在初始化后从管理后台开通。数据保存在本服务器，请按部署文档定期备份。
                </InfoTip>
              </p>
              {tokenRequired && (
                <label>
                  <span>
                    初始化口令
                    <InfoTip label="口令说明">
                      此服务器设置了初始化口令（SETUP_TOKEN），请向部署人员索取。
                    </InfoTip>
                  </span>
                  <input
                    aria-label="初始化口令"
                    type="password"
                    {...field("setupToken")}
                    required
                    autoComplete="off"
                    autoFocus
                    placeholder="部署时设置的 SETUP_TOKEN"
                  />
                </label>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h1 id="setup-title">创建平台管理员</h1>
              <p className="dialog-lead">
                这是系统的最高权限账号，请使用只有你知道的强密码。
              </p>
              <label>
                你的称呼
                <input
                  {...field("name")}
                  required
                  maxLength={40}
                  autoFocus
                  placeholder="例如：平台负责人"
                />
              </label>
              <label>
                登录账号
                <input
                  {...field("account")}
                  required
                  maxLength={40}
                  autoComplete="username"
                  placeholder="3–40 位字母、数字、点、下划线或短横线"
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  {...field("password")}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="至少 8 位"
                />
              </label>
              <label>
                确认密码
                <input
                  type="password"
                  {...field("confirmation")}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <h1 id="setup-title">开通第一个组织（可选）</h1>
              <p className="dialog-lead">
                填写后会立即创建；也可以跳过，稍后在“平台管理”中新增。
              </p>
              <label>
                大区名称
                <input
                  {...field("regionName")}
                  maxLength={80}
                  autoFocus
                  placeholder="例如：华东大区"
                />
              </label>
              <label>
                学校名称
                <input
                  {...field("schoolName")}
                  maxLength={80}
                  placeholder="例如：第一中学"
                />
              </label>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="setup-actions">
            {step > 0 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                <ArrowLeft size={16} />
                上一步
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => submit(true)}
              >
                跳过，稍后创建
              </button>
            )}
            <button className="button primary" disabled={busy}>
              {step < 2 ? (
                <>
                  下一步
                  <ArrowRight size={16} />
                </>
              ) : busy ? (
                "正在初始化…"
              ) : (
                <>
                  完成初始化
                  <Check size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
