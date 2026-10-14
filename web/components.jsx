import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  CircleHelp,
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
export function SectionTitle({ eyebrow, title, action, onAction, tip }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <div className="title-with-tip">
          <h2>{title}</h2>
          {tip && <InfoTip label={`${title}说明`}>{tip}</InfoTip>}
        </div>
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
export function Modal({ title, children, wide = false, onClose, tip }) {
  const ref = useRef(null);
  const titleId = useId();
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
      aria-labelledby={titleId}
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
          {/* The tip sits beside the title so it is not part of the dialog's name. */}
          <div className="title-with-tip">
            <h2 id={titleId}>{title}</h2>
            {tip && <InfoTip label="说明">{tip}</InfoTip>}
          </div>
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
/** A short privacy label; the full explanation opens from its help button. */
export function PrivateNote({ label = "谁能看到？", children }) {
  return (
    <p className="privacy-note">
      <LockKeyhole size={14} />
      {label}
      <InfoTip label="隐私说明">{children}</InfoTip>
    </p>
  );
}

/**
 * Secondary explanations stay out of the layout until asked for: a small
 * circled question mark opens a bubble, closed by a second tap, Esc or a tap elsewhere.
 */
export function InfoTip({ label = "说明", children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef(null);
  const bubble = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key !== "Escape") return;
      // Close only the bubble, not a dialog it sits in.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    // Keep the bubble inside the viewport on narrow screens.
    const element = bubble.current;
    if (!open || !element) return;
    element.style.transform = "";
    const rect = element.getBoundingClientRect();
    const shift =
      rect.right > innerWidth - 12
        ? innerWidth - 12 - rect.right
        : rect.left < 12
          ? 12 - rect.left
          : 0;
    element.style.transform = `translateX(${shift}px)`;
  }, [open]);
  return (
    <span className="info-tip" ref={root}>
      <button
        type="button"
        className="info-tip-button"
        aria-label={`查看${label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <CircleHelp size={15} />
      </button>
      {open && (
        <span id={id} role="note" className="info-tip-bubble" ref={bubble}>
          {children}
        </span>
      )}
    </span>
  );
}

// Create/edit forms open in a dialog so lists keep their place on the page.
// Errors stay inside the dialog, next to the fields that caused them.
export function FormDialog({
  title,
  tip,
  description,
  error,
  busy,
  submitLabel,
  disabled = false,
  danger = false,
  wide = false,
  onSubmit,
  onClose,
  children,
}) {
  const close = () => !busy && onClose();
  return (
    <Modal title={title} wide={wide} onClose={close} tip={tip}>
      <form
        className="form-stack dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) onSubmit();
        }}
      >
        {description && <div className="dialog-lead">{description}</div>}
        {children}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={close}
            disabled={busy}
          >
            取消
          </button>
          <button
            className={`button ${danger ? "danger" : "primary"}`}
            disabled={busy || disabled}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ConfirmDialog({ confirmLabel, children, ...props }) {
  return (
    <FormDialog submitLabel={confirmLabel} description={children} {...props} />
  );
}
export function ActiveBadge({ active }) {
  return (
    <span className={`badge ${active ? "green" : "gray"}`}>
      <span />
      {active ? "启用" : "停用"}
    </span>
  );
}
export function ListHeader({ title, count, unit = "", children }) {
  return (
    <div className="list-header">
      <h2>
        {title}
        {count !== undefined && (
          <small>
            {count}
            {unit}
          </small>
        )}
      </h2>
      {children && <div className="list-actions">{children}</div>}
    </div>
  );
}
export function Tabs({ label, tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={value === tab.id}
          className={value === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Each guide section matches one page, so help opens exactly where it is needed.
export function HelpLink({ anchor, label = "使用帮助", icon = true }) {
  return (
    <a
      className="help-link"
      href={`/guide/#${anchor}`}
      target="_blank"
      rel="noopener"
    >
      {icon && <CircleHelp size={15} />}
      {label}
    </a>
  );
}
