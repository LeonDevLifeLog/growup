import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Heart,
  HeartHandshake,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sprout,
  Sun,
  UserRound,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { AppContext, useApp } from "./context.jsx";
import { request, isAdmin, roleNames } from "./api.js";
import { ConfirmDialog, Locked, Mark, Modal } from "./components.jsx";
import Auth from "./Auth.jsx";
import Enrollment from "./Enrollment.jsx";
import Platform, { ChangePassword } from "./Platform.jsx";
import UserManagement from "./UserManagement.jsx";
import Setup from "./Setup.jsx";
import {
  GrowthTool,
  ToolCatalog,
  StructuredServiceForm,
} from "./GrowthTools.jsx";
import {
  CheckinForm,
  Explore,
  Home,
  Journal,
  JournalForm,
  ModuleDetail,
  MoodPage,
  PostForm,
  Profile,
  ReplyDetail,
  ServiceForm,
  Tree,
} from "./Student.jsx";
import {
  AdminOverview,
  AdminPosts,
  AdminServices,
  AdminStudents,
  StudentDetail,
} from "./Admin.jsx";

const studentNav = [
  { id: "home", label: "成长首页", icon: House },
  { id: "mood", label: "心情记录", icon: Sun },
  { id: "explore", label: "成长探索", icon: BookOpen },
  { id: "journal", label: "我的星图", icon: Sprout },
  { id: "tree", label: "匿名树洞", icon: MessageCircle },
];
const adminNav = [
  { id: "admin", label: "关怀概览", icon: LayoutDashboard },
  { id: "admin-students", label: "学生关怀", icon: Users },
  { id: "admin-posts", label: "树洞审核", icon: MessageCircle },
  { id: "admin-services", label: "支持需求", icon: HeartHandshake },
  { id: "admin-enrollment", label: "学校与邀请", icon: Users },
];
const allowedViews = new Set(
  [...studentNav, ...adminNav, { id: "admin-users" }, { id: "profile" }].map(
    (n) => n.id,
  ),
);

export default function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("growup-token") || "",
  );
  const [user, setUser] = useState(null);
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState([]);
  const [view, changeView] = useState(() =>
    allowedViews.has(location.hash.slice(1)) ? location.hash.slice(1) : "home",
  );
  const [modal, setModal] = useState(null);
  const [discarding, setDiscarding] = useState(false);
  const dirty = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState(null);
  const [demo, setDemo] = useState(false);
  // undefined while checking; a fresh install shows the setup wizard instead of the app.
  const [setup, setSetup] = useState(undefined);
  const [ready, setReady] = useState(!token);
  const adminView = view.startsWith("admin");
  const notify = useCallback(
    (message, type = "success") => setToast({ message, type, key: Date.now() }),
    [],
  );
  const bump = useCallback(() => setRefresh((n) => n + 1), []);
  const setView = useCallback((next) => {
    changeView(next);
    location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const call = useCallback(
    async (path, options = {}) => {
      try {
        return await request(path, { token, ...options });
      } catch (e) {
        if (e.status === 401 && token && !path.startsWith("/auth/login")) {
          sessionStorage.removeItem("growup-token");
          setToken("");
          setUser(null);
        }
        throw e;
      }
    },
    [token],
  );
  useEffect(() => {
    request("/health")
      .then((data) => {
        setDemo(data.demo);
        return data.needsSetup ? request("/setup") : null;
      })
      .then((data) => setSetup(data?.needsSetup ? data : null))
      .catch(() => setSetup(null));
  }, []);
  useEffect(() => {
    let active = true;
    request("/regions")
      .then((data) => {
        if (!active) return;
        setRegions(data.regions);
        setRegion((current) =>
          data.regions.some((item) => item.id === current)
            ? current
            : data.regions[0]?.id || "",
        );
      })
      .catch((error) => notify(error.message, "error"));
    return () => {
      active = false;
    };
  }, [refresh, notify]);
  useEffect(() => {
    let active = true;
    if (!token) {
      setReady(true);
      return;
    }
    request("/auth/me", { token })
      .then((data) => {
        if (active) {
          setUser(data.user);
          setRegion(data.user.regionId || "");
        }
      })
      .catch((e) => {
        if (active) {
          if (e.status === 401) {
            sessionStorage.removeItem("growup-token");
            setToken("");
            setUser(null);
          } else notify(e.message, "error");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [token, notify]);
  useEffect(() => {
    function onHash() {
      const next = location.hash.slice(1);
      if (allowedViews.has(next)) changeView(next);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function authenticate(result) {
    sessionStorage.setItem("growup-token", result.token);
    setToken(result.token);
    setUser(result.user);
    setRegion(result.user.regionId || "");
    bump();
    setView(isAdmin(result.user) ? "admin" : "home");
  }
  async function logout() {
    try {
      await call("/auth/logout", { method: "POST" });
    } catch {}
    sessionStorage.removeItem("growup-token");
    setToken("");
    setUser(null);
    setModal(null);
    bump();
    setView("home");
    notify("已退出登录，记得好好照顾自己。");
  }
  const open = useCallback((item) => {
    dirty.current = false;
    setModal(item);
  }, []);
  const close = useCallback(() => {
    dirty.current = false;
    setModal(null);
  }, []);
  const setDirty = useCallback((value) => {
    dirty.current = value;
  }, []);
  // Dismissing (X, Esc, backdrop) asks first when a form has unsaved input;
  // forms still call close() directly after a successful save.
  const requestClose = useCallback(() => {
    if (dirty.current) setDiscarding(true);
    else close();
  }, [close]);
  function requireStudent() {
    if (user?.role === "student") return true;
    open({ type: "auth", purpose: "student" });
    return false;
  }
  const context = {
    token,
    user,
    region,
    regions,
    setRegion,
    demo,
    view,
    setView,
    call,
    refresh,
    bump,
    open,
    close,
    setDirty,
    notify,
    authenticate,
    logout,
    requireStudent,
  };
  const nav =
    adminView && !isAdmin(user)
      ? []
      : adminView
        ? user?.role === "platform_admin"
          ? [
              { id: "admin", label: "平台管理", icon: LayoutDashboard },
              { id: "admin-users", label: "用户管理", icon: Users },
            ]
          : [
              ...adminNav,
              { id: "admin-users", label: "用户管理", icon: UserCog },
            ]
        : studentNav;
  if (setup === undefined)
    return <div className="loading">正在打开成长空间…</div>;
  if (setup)
    return (
      <AppContext.Provider value={context}>
        <Setup
          tokenRequired={setup.tokenRequired}
          onDone={(result) => {
            setSetup(null);
            authenticate(result);
            notify("初始化完成，欢迎开始使用。");
          }}
        />
      </AppContext.Provider>
    );
  if (user?.mustChangePassword)
    return (
      <AppContext.Provider value={context}>
        <main className="setup-page">
          <section className="setup-card" aria-labelledby="password-gate">
            <div className="setup-brand">
              <Mark />
              <div>
                <strong>成长健研社</strong>
                <small>
                  {user.name} · {user.account}
                </small>
              </div>
            </div>
            <h1 id="password-gate">请先设置你自己的密码</h1>
            <p className="dialog-lead">
              当前密码由管理员设置。为保护账号安全，请换成只有你知道的新密码后再继续使用。
            </p>
            <ChangePassword title="" />
            <button className="text-button" onClick={logout}>
              退出登录
            </button>
          </section>
        </main>
        {toast && (
          <div key={toast.key} className={`toast ${toast.type}`} role="status">
            <span>{toast.message}</span>
          </div>
        )}
      </AppContext.Provider>
    );
  let content;
  if (!ready) content = <div className="loading">正在打开成长空间…</div>;
  else if (adminView && !isAdmin(user))
    content = (
      <Locked
        purpose="admin"
        title="成长关怀，需要认真守护"
        description="请使用学校授权的本大区管理账号登录。"
      />
    );
  else if (adminView && user?.role === "platform_admin")
    content = view === "admin-users" ? <UserManagement /> : <Platform />;
  else if (!adminView && isAdmin(user))
    content = (
      <div className="panel admin-student-gate">
        <ShieldCheck size={36} />
        <h2>当前登录的是关怀管理账号</h2>
        <p>前往后台了解学生状态，或退出后使用学生账号体验记录。</p>
        <button className="button primary" onClick={() => setView("admin")}>
          进入关怀后台
          <ArrowRight size={17} />
        </button>
        <button className="text-button" onClick={logout}>
          退出当前账号
        </button>
      </div>
    );
  else
    content = {
      home: <Home />,
      mood: <MoodPage />,
      explore: <Explore />,
      journal: <Journal />,
      tree: <Tree />,
      profile: <Profile />,
      admin: <AdminOverview />,
      "admin-students": <AdminStudents />,
      "admin-posts": <AdminPosts />,
      "admin-services": <AdminServices />,
      "admin-enrollment": <Enrollment />,
      "admin-users": <UserManagement />,
    }[view] || <Home />;
  return (
    <AppContext.Provider value={context}>
      <div className={`app-shell ${adminView ? "admin-shell" : ""}`}>
        <aside className="sidebar">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setView("home");
            }}
          >
            <Mark />
            <div>
              <strong>成长健研社</strong>
              <small>青少年身心健康成长服务品牌</small>
            </div>
          </a>
          <div className="sidebar-space-label">
            {adminView ? "成长关怀工作台" : "我的成长空间"}
          </div>
          <nav aria-label={adminView ? "管理后台导航" : "主导航"}>
            {nav.map((item) => (
              <button
                className={`nav-item ${view === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <item.icon size={20} strokeWidth={1.7} />
                <span>{item.label}</span>
                {view === item.id && <span className="nav-dot" />}
                {item.id === "tree" && (
                  <span className="nav-new" aria-hidden="true">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-lower">
            <div className="sidebar-kindness">
              <Sprout size={23} />
              <p>
                {adminView ? (
                  <>
                    一份温柔的关注，
                    <br />
                    可能就是新的开始。
                  </>
                ) : (
                  <>
                    按自己的节奏，
                    <br />
                    慢慢生长就很好。
                  </>
                )}
              </p>
              <span>ONE SMALL STEP AT A TIME</span>
            </div>
            <button
              className="nav-item support-link"
              onClick={() => open({ type: "help" })}
            >
              <Heart size={19} />
              我想找人聊聊
              <ArrowUpRight size={16} />
            </button>
            {isAdmin(user) && (
              <button
                className={`nav-item admin-switch ${adminView ? "active-sub" : ""}`}
                onClick={() => setView(adminView ? "home" : "admin")}
              >
                <ShieldCheck size={19} />
                {adminView ? "返回成长空间" : "成长关怀后台"}
                <ArrowUpRight size={15} />
              </button>
            )}
            <small className="sidebar-copyright">
              © 2026 成长健研社 · 陪伴每一种可能
            </small>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <Mark small />
              <strong>成长健研社</strong>
            </div>
            <div className="topbar-context">
              <span>
                {adminView ? "成长关怀工作台" : "欢迎来到你的成长小天地"}
              </span>
              <span className="topbar-divider" />
              <span className="topbar-date">
                {new Date().toLocaleDateString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                  timeZone: "Asia/Shanghai",
                })}
              </span>
            </div>
            <div className="topbar-right">
              <button
                className="region-select"
                onClick={() => open({ type: "region" })}
              >
                <MapPin size={15} />
                <span>
                  {user?.role === "platform_admin"
                    ? "平台管理"
                    : regions.find((r) => r.id === region)?.name || "选择大区"}
                </span>
                <ChevronDown size={13} />
              </button>
              {demo && <span className="demo-pill">演示空间</span>}
              <span className="topbar-divider" />
              {user ? (
                <button
                  className="account-button"
                  onClick={() =>
                    adminView ? open({ type: "account" }) : setView("profile")
                  }
                >
                  <span className="avatar-small">{user.name?.slice(-1)}</span>
                  <span>{user.name}</span>
                  <ChevronDown size={13} />
                </button>
              ) : (
                <button
                  className="login-button"
                  onClick={() =>
                    open({
                      type: "auth",
                      purpose: adminView ? "admin" : "student",
                    })
                  }
                >
                  <UserRound size={16} />
                  登录 / 注册
                </button>
              )}
            </div>
          </header>
          <main className="main-content" key={`${view}-${user?.id || "guest"}`}>
            {content}
            <footer className="page-footer">
              <span>
                <Sprout size={14} />
                成长健研社 · 愿每一次记录，都让你更靠近自己。
              </span>
              <div>
                <button onClick={() => open({ type: "privacy" })}>
                  隐私与数据
                </button>
                <span>·</span>
                <button onClick={() => open({ type: "about" })}>
                  关于成长健研社
                </button>
              </div>
            </footer>
          </main>
        </div>
        <nav className="mobile-nav" aria-label="移动端导航">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => setView(item.id)}
            >
              <item.icon size={20} />
              <span>
                {item.label
                  .replace("成长首页", "首页")
                  .replace("心情记录", "心情")
                  .replace("成长探索", "探索")
                  .replace("我的星图", "星图")
                  .replace("匿名树洞", "树洞")
                  .replace("学校与邀请", "邀请")}
              </span>
            </button>
          ))}
        </nav>
      </div>
      {modal && (
        <Modal
          key={`${modal.type}-${modal.toolId || modal.formId || modal.item?.id || ""}`}
          title={modalTitle(modal)}
          wide={[
            "module",
            "student",
            "tool",
            "toolCatalog",
            "serviceForm",
          ].includes(modal.type)}
          onClose={requestClose}
        >
          <ModalBody modal={modal} />
        </Modal>
      )}
      {discarding && (
        <ConfirmDialog
          title="放弃未保存的内容？"
          confirmLabel="放弃并关闭"
          danger
          onSubmit={() => {
            setDiscarding(false);
            close();
          }}
          onClose={() => setDiscarding(false)}
        >
          刚才填写的内容还没有保存，关闭后将无法恢复。
        </ConfirmDialog>
      )}
      {toast && (
        <div key={toast.key} className={`toast ${toast.type}`} role="status">
          {toast.type === "error" ? (
            <X size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.message}</span>
          <button aria-label="关闭提示" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}

function modalTitle(m) {
  return (
    {
      auth: m.purpose === "admin" ? "管理后台登录" : "开启我的成长空间",
      checkin: "今天，你感觉怎么样？",
      module: m.item?.title,
      tool: m.title || "成长观察工具",
      toolCatalog: "在这里，了解自己的成长",
      serviceForm: m.title || "需求与反馈",
      article: m.article?.category,
      journal: "收集一片成长碎片",
      journalRead: m.journal?.title,
      post: "留一张心情纸条",
      reply: "给这份心事，一个回响",
      replies: "树洞里的温柔回响",
      report: "反馈这张纸条",
      service: "让支持靠近一点",
      student: "学生关怀详情",
      help: "你不用一个人扛着",
      treeRules: "树洞里的温柔小约定",
      privacy: "认真守护你的成长数据",
      about: "关于成长健研社",
      region: "选择你所在的大区",
      rules: "把提示，变成合适的关怀",
      account: "当前管理账号",
      password: "修改密码",
    }[m.type] || "成长健研社"
  );
}

function ModalBody({ modal: m }) {
  const { user, region, regions, setRegion, close, open, logout, notify } =
    useApp();
  if (m.type === "auth") return <Auth purpose={m.purpose || "student"} />;
  if (m.type === "checkin") return <CheckinForm initialScore={m.score} />;
  if (m.type === "module") return <ModuleDetail item={m.item} />;
  if (m.type === "tool") return <GrowthTool toolId={m.toolId} />;
  if (m.type === "toolCatalog") return <ToolCatalog />;
  if (m.type === "serviceForm")
    return <StructuredServiceForm key={m.formId} formId={m.formId} />;
  if (m.type === "journal") return <JournalForm />;
  if (m.type === "journalRead")
    return (
      <div className="article-read">
        <p className="privacy-note">私人日记 · 仅自己可见</p>
        <p className="preserve-lines">{m.journal.content}</p>
        {m.journal.mood && (
          <p className="privacy-note">
            此刻心情 ·{" "}
            {
              ["很低落", "有点低落", "还不错", "很开心", "超开心"][
                m.journal.mood - 1
              ]
            }{" "}
            · 感受强度 {m.journal.intensity}/3
          </p>
        )}
        {!!m.journal.tags?.length && (
          <div className="journal-tags">
            {m.journal.tags.map((tag) => (
              <span key={tag}>#{tag} </span>
            ))}
          </div>
        )}
        {m.journal.goal && <p>我的小目标 · {m.journal.goal}</p>}
      </div>
    );
  if (m.type === "post") return <PostForm />;
  if (m.type === "reply") return <PostForm post={m.post} />;
  if (m.type === "report") return <PostForm post={m.post} report />;
  if (m.type === "replies") return <ReplyDetail post={m.post} />;
  if (m.type === "service") return <ServiceForm service={m.service} />;
  if (m.type === "student") return <StudentDetail id={m.id} />;
  if (m.type === "article")
    return (
      <article className="article-read">
        <span className="eyebrow">成长健研社 · 成长补给站</span>
        <h3>{m.article.title}</h3>
        <p className="article-subtitle">{m.article.subtitle}</p>
        {m.article.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <div className="info-box">
          这些日常练习帮助你留意感受，不能替代专业帮助。如果感到持续难受，请告诉信任的成人或专业人员。
        </div>
      </article>
    );
  if (m.type === "region")
    return (
      <div className="region-modal">
        <p className="dialog-lead">
          每个大区都有独立的学校与成长空间，账号只属于注册时的大区。
        </p>
        <div className="form-stack">
          <label>
            选择大区
            <select
              aria-label="选择大区"
              value={user?.regionId || region}
              disabled={!!user || !regions.length}
              onChange={(event) => setRegion(event.target.value)}
            >
              {!regions.length && <option value="">暂未开通大区</option>}
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary full" onClick={close}>
            完成
          </button>
        </div>
        {user && (
          <p className="muted">
            需要使用其他大区账号时，请先退出当前账号，再选择对应区域登录。
          </p>
        )}
      </div>
    );
  if (m.type === "help")
    return (
      <div className="prose">
        <div className="help-symbol">
          <HeartHandshake size={38} />
        </div>
        <p className="dialog-lead">
          不必先把话想好，也不用等到撑不住。你现在的感受，值得被认真听见。
        </p>
        <h3>先靠近一个你信任的人</h3>
        <p>
          可以是家人、班主任、学校心理老师，或其他让你感到安全的成人。你可以说：“我最近有些不好受，能陪我聊一会儿吗？”
        </p>
        <h3>如果此刻不安全</h3>
        <p>
          请立即联系身边的成人，或拨打当地紧急服务电话；在中国大陆，可拨 110 或
          120。不要独自待在危险的地方。
        </p>
        <div className="info-box">
          这里没有即时值守的咨询人员。树洞留言和支持需求需要人工审核与跟进，不能作为紧急求助通道。
        </div>
        {user?.role === "student" && (
          <button
            className="button primary full"
            onClick={() => open({ type: "service" })}
          >
            提交非紧急支持需求
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    );
  if (m.type === "treeRules")
    return (
      <div className="prose">
        <p className="dialog-lead">
          愿这里成为一片不会被催促、不会被评判的小小空间。
        </p>
        <h3>用化名，说真心话</h3>
        <p>
          不要填写姓名、班级、联系方式等身份信息。对同学匿名；平台保留审核所需的账号关联。
        </p>
        <h3>先审后发，对彼此温柔</h3>
        <p>
          纸条和回应经人工审核后才会展示。不伤害、不攻击，不分享危险行为细节；看到不适内容可以举报并离开。
        </p>
        <h3>传递温暖，不比较热闹</h3>
        <p>
          每张纸条每天可以送一次温暖，没有排行榜、粉丝和私信。你的善意，不需要被衡量。
        </p>
        <h3>需要帮助时，让真人靠近</h3>
        <p>树洞不是即时咨询。持续难受或感觉不安全时，请告诉信任的成人。</p>
      </div>
    );
  if (m.type === "rules")
    return (
      <div className="prose">
        <p className="dialog-lead">
          规则提供交流的线索。不要用一个数字定义孩子，也不要把未记录当作状态良好。
        </p>
        <ul>
          <li>1–2 分为低落；按上海时区自然日计算连续记录。</li>
          <li>连续 3–4 天低落：黄色，需要关注。</li>
          <li>连续 ≥5 天低落：红色，优先关怀。</li>
          <li>最近连续 7 天均 ≥3 分：绿色，状态平稳。</li>
          <li>
            其他情况：观察中；超过一个自然日没有记录：待补充，连续计数中断。
          </li>
          <li>当天更新不增加天数，断签中断连续。</li>
        </ul>
        <div className="info-box">
          管理端提示不对学生展示。“已跟进”只表示已保存关怀记录，不会覆盖仍存在的低落状态。当前仅提供后台可见提醒，未接入微信或短信推送。
        </div>
      </div>
    );
  if (m.type === "password") return <ChangePassword title="" />;
  if (m.type === "account")
    return (
      <div className="prose">
        <h3>{user.name}</h3>
        <p>
          {roleNames[user.role]} · {user.regionName || "全部大区"}
          {user.schoolName ? ` · ${user.schoolName}` : ""}
        </p>
        <p>{user.account}</p>
        <ChangePassword />
        <button className="button secondary full" onClick={logout}>
          <LogOut size={16} />
          退出当前管理账号
        </button>
      </div>
    );
  if (m.type === "privacy")
    return (
      <div className="prose">
        <p>账号与学校绑定所属大区，服务端按区域和角色授权。</p>
        <h3>仅自己可见</h3>
        <p>
          成长日记与星图、工具回答与报告、心情的私人备注与标签。其他同学和区域管理人员看不到这些具体内容。
        </p>
        <h3>用于校园关怀</h3>
        <p>
          本大区授权管理人员可查看学生称呼、学校、心情分数与日期、连续记录提示；支持需求也由所属区域人员处理。
        </p>
        <h3>树洞匿名的范围</h3>
        <p>
          同学和普通审核列表只看到化名与内容。平台为审核与举报保存账号关联，因此不承诺绝对匿名。
        </p>
        <h3>管理自己的记录</h3>
        <p>日记和成长工具记录按账号保存在系统中，可在对应页面查看和删除。</p>
      </div>
    );
  return (
    <div className="prose">
      <Mark />
      <h3>成长健研社</h3>
      <p>青少年身心健康成长服务品牌</p>
      <p>
        一个为青少年设计的成长陪伴空间。让心情有位置，让表达有回响，让关怀更及时。
      </p>
      <p>
        我们以成长服务、身心发展、思维表达与数据观测为核心，连接学校与家庭，陪伴青少年认识自己、理解彼此。
      </p>
      <p>
        在 Star-Track 中观察成长，在 STARMAP
        中收藏日常，在匿名树洞里表达心声。需要支持时，也可以向所在区域的工作人员提交需求。
      </p>
    </div>
  );
}
