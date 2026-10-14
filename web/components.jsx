import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  X,
  Sprout,
  Heart,
  MessageCircle,
  Moon,
  CloudSun,
  BookOpen,
  Sparkles,
  Orbit,
  School,
  Leaf,
  FlaskConical,
  Users,
  ChevronRight,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";
import { useApp } from "./context.jsx";
import { statusMeta, studentStatus } from "./api.js";

export function Mark({ small = false }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`}>
      <Sprout size={small ? 20 : 27} strokeWidth={1.8} />
    </span>
  );
}
export function Icon({ name, ...props }) {
  const Item =
    {
      sprout: Sprout,
      heart: Heart,
      chat: MessageCircle,
      moon: Moon,
      cloud: CloudSun,
      book: BookOpen,
      sparkles: Sparkles,
      orbit: Orbit,
      school: School,
      leaf: Leaf,
      flask: FlaskConical,
      users: Users,
    }[name] || Sprout;
  return <Item size={24} strokeWidth={1.7} {...props} />;
}
export function SectionTitle({ eyebrow, title, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={17} />
        </button>
      )}
    </div>
  );
}
export function Badge({ status, student }) {
  const m = student
    ? studentStatus(student)
    : statusMeta[status] || statusMeta.gray;
  return (
    <span className={`badge ${m.className}`}>
      <span />
      {m.label}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
  onAction,
  icon = "sprout",
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button primary" onClick={onAction}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
export function ResourceState({ loading, error, children }) {
  const { bump } = useApp();
  if (loading)
    return (
      <div className="loading" role="status">
        <RefreshCw size={20} className="spin" /> 正在整理你的成长碎片…
      </div>
    );
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
        <button className="text-button" onClick={bump}>
          重新加载
          <RefreshCw size={15} />
        </button>
      </div>
    );
  return children;
}
export function Locked({
  title = "这里，是只属于你的成长空间",
  description = "选择所在大区，登录后开始记录和分享。",
  purpose = "student",
}) {
  const { open } = useApp();
  return (
    <Empty
      icon="leaf"
      title={title}
      description={description}
      action={purpose === "admin" ? "登录管理后台" : "登录我的成长空间"}
      onAction={() => open({ type: "auth", purpose })}
    />
  );
}
export function Modal({ title, children, wide = false, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭弹窗"
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function PrivateNote({ children }) {
  return (
    <p className="privacy-note">
      <LockKeyhole size={14} />
      {children}
    </p>
  );
}
