import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  Clock3,
  Heart,
  LockKeyhole,
  PenLine,
  Search,
  Send,
  Shuffle,
  Sprout,
  Sun,
  Wind,
  X,
} from "lucide-react";
import { useApp, useDirty, useResource } from "./context.jsx";
import {
  InfoTip,
  HelpLink,
  Empty,
  Icon,
  Locked,
  PrivateNote,
  ResourceState,
  SectionTitle,
} from "./components.jsx";
import { HeroArt, MoodFace, TreeArt } from "./Illustrations.jsx";
import { articles, modules, toolGroups } from "./content.js";
import { moodNames, shortDate, topics } from "./api.js";
import { StarMap, StarMapForm } from "./StarMap.jsx";

export function Home() {
  const { user, setView, open, requireStudent } = useApp();
  const { data, error, loading } = useResource(
    "/dashboard",
    user?.role === "student",
  );
  const [score, setScore] = useState(0);
  const today = data?.checkin;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A LITTLE BETTER, EVERY DAY</span>
          <h1>
            {user
              ? `${user.name}，今天也要好好爱自己`
              : "每一份心情，都值得被看见"}
            <span className="greeting-sun">
              <Sun size={25} />
            </span>
          </h1>
          <p>在这里，记录心情，发现自己，慢慢长成喜欢的模样。</p>
        </div>
        <span className="intro-note">
          <span className="tiny-dot" />
          今天，也在慢慢成长
        </span>
      </div>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">
            <Sprout size={15} />
            你的专属成长空间
          </span>
          <h2>
            成长不必着急，
            <br />
            每一步<span>都算数。</span>
          </h2>
          <p>
            晴天、阴天，都是生活的一部分。
            <br />
            给此刻的自己，一点温柔的陪伴。
          </p>
          <button
            className="button dark"
            onClick={() => {
              if (requireStudent()) open({ type: "checkin" });
            }}
          >
            {today ? "看看今天的心情" : "记录今天的心情"}
            <ArrowUpRight size={17} />
          </button>
          <span className="hero-footnote">
            从一个小小的记录开始，认识更完整的自己
          </span>
        </div>
        <HeroArt />
        <span className="hero-art-caption">GROW AT YOUR OWN PACE.</span>
      </section>
      {user?.role === "student" && <Welcome user={user} checkedIn={!!today} />}
      <div className="home-columns">
        <div className="home-primary">
          <section className="panel mood-panel">
            <SectionTitle
              title="今天，你的心情是什么颜色？"
              action="心情记录"
              onAction={() => setView("mood")}
            />
            <p className="section-sub">没有标准答案，真实的感受就很好。</p>
            <div className="mood-choices compact">
              {moodNames.map((name, i) => (
                <button
                  key={name}
                  className={
                    score === i + 1 ? "mood-choice selected" : "mood-choice"
                  }
                  aria-pressed={score === i + 1}
                  onClick={() => setScore(i + 1)}
                >
                  <MoodFace score={i + 1} size={55} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <div className="mood-footer">
              <span>
                <LockKeyhole size={13} />
                每种情绪，都可以被温柔接住
              </span>
              <button
                className="text-button"
                onClick={() => {
                  if (requireStudent())
                    open({ type: "checkin", score: score || undefined });
                }}
              >
                {today ? "更新今日记录" : "记下这一刻"}
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
          <section className="explore-home">
            <SectionTitle
              title="发现成长的更多可能"
              action="全部探索"
              onAction={() => setView("explore")}
            />
            <div className="quick-grid">
              {modules.slice(0, 4).map((item) => (
                <button
                  className={`quick-card ${item.theme}`}
                  key={item.id}
                  onClick={() =>
                    item.id === "starmap"
                      ? setView("journal")
                      : open({ type: "module", item })
                  }
                >
                  <span className="quick-icon">
                    <Icon name={item.icon} size={23} />
                  </span>
                  <ArrowUpRight className="quick-arrow" size={18} />
                  <h3>
                    {item.id === "star"
                      ? "成长观察"
                      : item.id === "starmap"
                        ? "成长星图"
                        : item.id === "school"
                          ? "校园支持"
                          : "家庭支持"}
                  </h3>
                  <p>
                    {item.eyebrow} ·{" "}
                    {item.id === "star"
                      ? "认识自己"
                      : item.id === "starmap"
                        ? "珍藏小事"
                        : item.id === "school"
                          ? "共同成长"
                          : "理解彼此"}
                  </p>
                </button>
              ))}
            </div>
          </section>
          <section>
            <SectionTitle
              title="给成长，补充一点养分"
              action="更多内容"
              onAction={() => setView("explore")}
            />
            <div className="article-home-grid">
              {articles.slice(0, 2).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        </div>
        <aside className="home-aside">
          <section className="panel footprints">
            <SectionTitle title="我的成长足迹" />
            <div className="footprint-stats">
              <div>
                <strong>{data?.stats.totalCheckins ?? "—"}</strong>
                <span>累计记录 / 天</span>
              </div>
              <span className="stat-divider" />
              <div>
                <strong>{data?.stats.streak ?? "—"}</strong>
                <span>连续记录 / 天</span>
              </div>
            </div>
            <div className="week-label">
              <span>最近 7 天的心情</span>
              <span>一点一滴，都是成长</span>
            </div>
            <WeekStrip checkins={data?.checkins || []} />
            <ResourceState error={error} loading={loading}>
              {user ? (
                <button
                  className="text-button footprint-link"
                  onClick={() => setView("mood")}
                >
                  查看我的心情轨迹
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  className="text-button footprint-link"
                  onClick={() => open({ type: "auth" })}
                >
                  登录，点亮第一天
                  <ArrowRight size={15} />
                </button>
              )}
            </ResourceState>
          </section>
          <section className="tree-invite">
            <div className="tree-label">
              <span className="tiny-dot" />
              匿名树洞 · 有人在听
            </div>
            <h3>
              说不出口的话，
              <br />
              放在这里就好。
            </h3>
            <p>
              不必署名，不必逞强。
              <br />
              让心事有个温柔的落脚点。
            </p>
            <TreeArt />
            <button className="button tree-cta" onClick={() => setView("tree")}>
              去树洞坐坐
              <ArrowUpRight size={16} />
            </button>
          </section>
          <section className="daily-note">
            <span>
              <Sun size={17} />
              今日小笺
            </span>
            <blockquote>
              “你不需要成为别人眼中的
              <br />
              满分，做自己就很好。”
            </blockquote>
            <div className="note-rule" />
            <small>留一点耐心，给正在成长的自己</small>
          </section>
        </aside>
      </div>
    </>
  );
}

export function WeekStrip({ checkins = [] }) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.parse(`${today}T00:00:00Z`) + (i - 6) * 86400000);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: ["日", "一", "二", "三", "四", "五", "六"][d.getUTCDay()],
      checkin: checkins.find((c) => c.date === date),
    };
  });
  return (
    <div className="week-strip">
      {days.map((d, i) => (
        <div key={d.date} className={i === 6 ? "today" : ""}>
          <span>{i === 6 ? "今" : d.label}</span>
          {d.checkin ? (
            <MoodFace score={d.checkin.score} size={29} />
          ) : (
            <span className="unrecorded" aria-label={`${d.date} 未记录`} />
          )}
          <span className="week-date">{d.date.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function ArticleCard({ article }) {
  const { open } = useApp();
  return (
    <button
      className="article-card"
      onClick={() => open({ type: "article", article })}
    >
      <div className={`article-visual ${article.theme}`}>
        <Icon name={article.icon} size={42} strokeWidth={1.1} />
        <span className="article-orbit" />
      </div>
      <div className="article-info">
        <span className="article-category">{article.category}</span>
        <h3>{article.title}</h3>
        <div>
          <span>
            <Clock3 size={12} />
            {article.minutes} 分钟阅读
          </span>
          <ArrowUpRight size={17} />
        </div>
      </div>
    </button>
  );
}

export function MoodPage() {
  const { user, open } = useApp();
  const resource = useResource("/dashboard", user?.role === "student");
  if (!user || user.role !== "student") return <Locked />;
  const rows = [...(resource.data?.checkins || [])].reverse();
  return (
    <>
      <PageTitle
        eyebrow="HOW ARE YOU, REALLY?"
        title="给今天的心情，一个位置"
        description="晴天值得记住，雨天也值得被照顾。"
      />
      <div className="mood-page-grid">
        <section className="panel">
          <SectionTitle title="最近的心情轨迹" />
          <ResourceState {...resource}>
            <WeekStrip checkins={rows} />
            <div className="big-cta">
              <Sprout size={34} />
              <h3>
                {resource.data?.checkin
                  ? "今天的感受，已经被好好收下"
                  : "先停一停，听听自己的心情"}
              </h3>
              <p>
                {resource.data?.checkin
                  ? "感受会变化，你可以随时更新今日记录。"
                  : "用一个小小的记录，和自己打个招呼。"}
              </p>
              <button
                className="button primary"
                onClick={() => open({ type: "checkin" })}
              >
                {resource.data?.checkin ? "更新今日记录" : "记录今天的心情"}
                <PenLine size={16} />
              </button>
            </div>
          </ResourceState>
        </section>
        <aside className="panel note-panel">
          <Sun size={27} />
          <h3>
            每一种情绪
            <br />
            都在告诉你些什么
          </h3>
          <p>
            不开心的时候，不必强迫自己开心。把感受写下来，也可以告诉一个你信任的人。
          </p>
          <button
            className="text-button"
            onClick={() => open({ type: "help" })}
          >
            我想找人聊聊
            <ArrowUpRight size={16} />
          </button>
        </aside>
      </div>
      <section className="panel records">
        <SectionTitle title="我的心情记录" />
        <PrivateNote>
          心情分数供学校授权的老师关怀参考；你写下的备注和心事只对你自己可见。
        </PrivateNote>
        <ResourceState {...resource}>
          {rows.length ? (
            rows.map((row) => (
              <div className="record-row" key={row.id}>
                <MoodFace score={row.score} size={42} />
                <div>
                  <h3>
                    {moodNames[row.score - 1]}
                    <time>{row.date}</time>
                  </h3>
                  <p>{row.note || "今天也认真感受了自己的心情。"}</p>
                  <div className="mini-tags">
                    {row.tags?.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="第一份记录，还在等你"
              description="今天的你，是什么心情呢？"
            />
          )}
        </ResourceState>
      </section>
    </>
  );
}

/** First steps for a new student; hidden for good once dismissed on this device. */
function Welcome({ user, checkedIn }) {
  const { open, setView } = useApp();
  const key = `growup-welcome-${user.id}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === "done";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const steps = [
    {
      text: "记录今天的心情：选一个最接近的表情就好",
      done: checkedIn,
      action: () => open({ type: "checkin" }),
    },
    {
      text: "写一篇星图日记，给日常贴上生活标签",
      action: () => setView("journal"),
    },
    {
      text: "去树洞看看，用化名说说心事或送一份温暖",
      action: () => setView("tree"),
    },
  ];
  return (
    <section className="panel welcome-card" aria-label="从这里开始">
      <div className="list-header">
        <h2>从这里开始</h2>
        <div className="list-actions">
          <HelpLink anchor="student" />
          <button
            className="text-button"
            onClick={() => {
              try {
                localStorage.setItem(key, "done");
              } catch {}
              setHidden(true);
            }}
          >
            知道了，不再显示
          </button>
        </div>
      </div>
      <ol>
        {steps.map((step) => (
          <li key={step.text} className={step.done ? "done" : ""}>
            <button className="text-button" onClick={step.action}>
              {step.done ? <Check size={14} /> : null}
              {step.text}
              <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ol>
      <p className="muted">
        日记和心情备注只有你自己能看；老师只能看到心情分数，用来及时关心你。
      </p>
    </section>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
  onAction,
  help,
  tip,
}) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>
          {description}
          {tip && <InfoTip label="页面说明">{tip}</InfoTip>}
          {help && (
            <>
              {" "}
              <HelpLink anchor={help} />
            </>
          )}
        </p>
      </div>
      {action && (
        <button className="button primary" onClick={onAction}>
          <CirclePlus size={17} />
          {action}
        </button>
      )}
    </div>
  );
}

export function CheckinForm({ initialScore }) {
  const { call, bump, close, notify } = useApp();
  const resource = useResource("/dashboard");
  const [score, setScore] = useState(initialScore || 0);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState([]);
  const [touched, setTouched] = useState(false);
  useDirty(touched);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!resource.data || prefilled) return;
    const existing = resource.data.checkin;
    if (existing) {
      setScore((current) => current || existing.score);
      setNote(existing.note || "");
      setTags(existing.tags || []);
    }
    setPrefilled(true);
  }, [resource.data, prefilled]);
  async function submit(event) {
    event.preventDefault();
    if (!score) {
      setError("先选一个最贴近此刻的心情吧");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await call("/checkins", { method: "POST", body: { score, note, tags } });
      bump();
      close();
      notify("心情已收好，谢谢你认真照顾自己。");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="dialog-lead">不用想“应该怎样”，选一个最接近现在的感受。</p>
      {resource.data?.checkin && (
        <div className="info-box">
          今天已记录过；提交将更新今天的心情，不会重复计数。当前心情：
          {moodNames[resource.data.checkin.score - 1]}。
        </div>
      )}
      <fieldset className="plain-field">
        <legend>
          此刻的心情 <span>必选</span>
        </legend>
        <div className="mood-choices">
          {moodNames.map((name, i) => (
            <button
              type="button"
              key={name}
              aria-pressed={score === i + 1}
              className={`mood-choice ${score === i + 1 ? "selected" : ""}`}
              onClick={() => setScore(i + 1)}
            >
              <MoodFace score={i + 1} size={51} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="plain-field">
        <legend>
          和什么有关？<span>选填</span>
        </legend>
        <div className="filter-row">
          {["学习", "朋友", "家庭", "身体", "睡眠", "说不清"].map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip ${tags.includes(tag) ? "active" : ""}`}
              aria-pressed={tags.includes(tag)}
              onClick={() =>
                setTags(
                  tags.includes(tag)
                    ? tags.filter((t) => t !== tag)
                    : [...tags, tag],
                )
              }
            >
              {tag}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        想对自己说的话<span className="optional">选填 · 仅自己可见</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setTouched(true);
          }}
          maxLength={500}
          rows={4}
          placeholder="发生了什么？有什么想记录的？写一点点也可以。"
        />
        <small className="character-count">{note.length} / 500</small>
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "正在收好…" : "收好今天的心情"}
        <Check size={17} />
      </button>
    </form>
  );
}

export function Explore() {
  const { open } = useApp();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const visible = modules.filter(
    (m) =>
      (filter === "全部" || m.category === filter) &&
      `${m.title}${m.description}`.includes(query),
  );
  return (
    <>
      <PageTitle
        eyebrow="A WORLD OF POSSIBILITIES"
        title="多一点了解，多一种成长"
        description="从认识自己开始，在探索中找到属于你的方向。"
      />
      <div className="explore-toolbar">
        <div className="filter-row">
          {["全部", "成长观察", "成长支持", "理念与共研"].map((item) => (
            <button
              className={`chip ${filter === item ? "active" : ""}`}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索成长内容"
            placeholder="寻找感兴趣的内容"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="module-grid">
        {visible.map((item) => (
          <button
            className="module-card"
            key={item.id}
            onClick={() => open({ type: "module", item })}
          >
            <div className={`module-icon ${item.theme}`}>
              <Icon name={item.icon} size={27} />
            </div>
            <span className="module-eyebrow">{item.eyebrow}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <div className="module-card-foot">
              <span>{item.category}</span>
              <ArrowUpRight size={20} />
            </div>
          </button>
        ))}
      </div>
      {!visible.length && (
        <Empty
          title="暂时没有找到"
          description="换个关键词，或查看全部内容。"
        />
      )}
      <section className="readings-section">
        <SectionTitle title="成长补给站" eyebrow="一点点，慢慢来" />
        <div className="article-home-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
      <p className="source-note">
        成长健研社 · 记录成长，理解自己，让支持更贴近生活。
      </p>
    </>
  );
}

export function ModuleDetail({ item }) {
  const { open, close, setView, requireStudent } = useApp();
  function launch(action) {
    if (requireStudent()) action();
  }
  return (
    <div className="module-detail">
      <span className={`module-icon ${item.theme}`}>
        <Icon name={item.icon} size={28} />
      </span>
      <p className="dialog-lead">{item.detail}</p>
      {item.paragraphs?.map((paragraph) => (
        <p className="dialog-lead" key={paragraph}>
          {paragraph}
        </p>
      ))}
      {item.tools &&
        toolGroups.map((group) => (
          <section className="tool-group" key={group.title}>
            <h3>
              {group.title}
              <span>{group.tools.length} 个工具</span>
            </h3>
            <div className="tool-links">
              {group.tools.map(([title, path]) => (
                <button
                  key={path}
                  onClick={() =>
                    launch(() =>
                      open({
                        type: "tool",
                        toolId: path.replace(".html", ""),
                        title,
                      }),
                    )
                  }
                >
                  {title}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </section>
        ))}
      {item.forms && (
        <div className="reference-links">
          {item.forms.map((form) => (
            <button
              key={form.id}
              onClick={() =>
                launch(() =>
                  open({
                    type: "serviceForm",
                    formId: form.id,
                    title: form.name,
                  }),
                )
              }
            >
              {form.name}
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      )}
      {item.id === "lab" && (
        <div className="reference-links">
          <button
            onClick={() =>
              launch(() =>
                open({
                  type: "tool",
                  toolId: "suipian",
                  title: "抗碎片化成长研究",
                }),
              )
            }
          >
            抗碎片化成长研究
            <ArrowRight size={15} />
          </button>
          <button
            onClick={() =>
              launch(() => open({ type: "service", service: "社群体验申请" }))
            }
          >
            月拾 WE · 了解与体验申请
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      {item.action && (
        <button
          className="button primary full"
          onClick={() =>
            launch(() => {
              if (item.action === "journal") {
                close();
                setView("journal");
              } else open({ type: "service", service: item.title });
            })
          }
        >
          {item.actionLabel}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

export function Journal() {
  const { user } = useApp();
  return user?.role === "student" ? <StarMap /> : <Locked />;
}
export function JournalForm() {
  return <StarMapForm />;
}

export function Tree() {
  const { user, open, notify, call, bump, requireStudent } = useApp();
  const [topic, setTopic] = useState("all");
  const [mine, setMine] = useState(false);
  const [offset, setOffset] = useState(0);
  const [pendingWarm, setPendingWarm] = useState(null);
  const resource = useResource(
    `/posts?topic=${encodeURIComponent(topic)}${mine ? "&mine=1" : ""}`,
    user?.role === "student",
  );
  const posts = resource.data?.posts || [];
  const rows = posts.length
    ? [
        ...posts.slice(offset % posts.length),
        ...posts.slice(0, offset % posts.length),
      ]
    : [];
  async function warm(id) {
    setPendingWarm(id);
    try {
      await call(`/posts/${id}/warm`, { method: "POST" });
      bump();
      notify("你的温暖，已经送到。");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setPendingWarm(null);
    }
  }
  return (
    <>
      <section className="tree-page-hero">
        <div>
          <span className="eyebrow">A SOFT PLACE TO LAND</span>
          <h1>把心事放下，把温暖带走。</h1>
          <p>
            这里不问你是谁，只认真听你说。
            <br />
            在同一片天空下，让陌生的善意轻轻靠近。
          </p>
          <div className="tree-hero-actions">
            <button
              className="button primary"
              onClick={() => {
                if (requireStudent()) open({ type: "post" });
              }}
            >
              <PenLine size={17} />
              留一张心情纸条
            </button>
            <button
              className="text-button"
              onClick={() => open({ type: "treeRules" })}
            >
              树洞小约定
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
        <TreeArt />
      </section>
      <div className="tree-toolbar">
        <div className="filter-row">
          {["all", ...topics].map((item) => (
            <button
              className={`chip ${!mine && topic === item ? "active" : ""}`}
              key={item}
              onClick={() => {
                setMine(false);
                setTopic(item);
                setOffset(0);
              }}
            >
              {item === "all" ? "所有心事" : item}
            </button>
          ))}
          <button
            className={`chip ${mine ? "active" : ""}`}
            onClick={() => {
              setMine(true);
              setTopic("all");
            }}
          >
            我的纸条
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => setOffset((value) => value + 1)}
          disabled={rows.length < 2}
        >
          <Shuffle size={16} />
          换个顺序
        </button>
      </div>
      {!user || user.role !== "student" ? (
        <Locked
          title="有些心事，写下来就轻一点了"
          description="登录后，和本大区的小伙伴匿名分享。每一张纸条都经过人工审核。"
        />
      ) : (
        <ResourceState {...resource}>
          {rows.length ? (
            <div className="post-grid">
              {rows.map((post, i) => (
                <article
                  className={`post-card ${["paper-green", "paper-sand", "paper-peach", "paper-lavender"][i % 4]}`}
                  key={post.id}
                >
                  <div className="post-topline">
                    <span>
                      <span className="post-avatar">
                        <Icon
                          name={["leaf", "cloud", "sprout", "moon"][i % 4]}
                          size={16}
                        />
                      </span>
                      {post.nickname}
                    </span>
                    <span className="post-topic">{post.topic}</span>
                  </div>
                  <p className="post-content">{post.content}</p>
                  {mine && post.status !== "approved" && (
                    <span
                      className={`moderation-label ${post.status === "rejected" ? "rejected" : ""}`}
                    >
                      {post.status === "rejected"
                        ? "未通过审核"
                        : "等待温柔上架"}
                    </span>
                  )}
                  <div className="post-footer">
                    <span>{shortDate(post.createdAt)}</span>
                    <div>
                      {post.status === "approved" && (
                        <>
                          <button
                            className={`warm-button ${post.warmed ? "warmed" : ""}`}
                            disabled={post.warmed || pendingWarm === post.id}
                            aria-label={`给${post.nickname}送温暖`}
                            onClick={() => warm(post.id)}
                          >
                            <Heart
                              size={15}
                              fill={post.warmed ? "currentColor" : "none"}
                            />
                            {post.warmCount}
                          </button>
                          <button
                            className="text-button"
                            onClick={() => open({ type: "replies", post })}
                          >
                            回应 {post.replies?.length || 0}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {post.status === "approved" && (
                    <button
                      className="report-button"
                      onClick={() => open({ type: "report", post })}
                    >
                      举报
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              icon="chat"
              title={
                mine ? "还没有属于你的纸条" : "这片树洞，静静等着第一声回响"
              }
              description={
                mine
                  ? "在这里留下心事，审核状态会显示在这儿。"
                  : "所有纸条都经过人工审核，分享一点小小的温暖吧。"
              }
              action="写一张纸条"
              onAction={() => open({ type: "post" })}
            />
          )}
        </ResourceState>
      )}
      <p className="tree-bottom-note">
        <Heart size={15} />
        如果看到让你难受的内容，可以随时离开，找信任的人聊一聊。
        <button className="text-button" onClick={() => open({ type: "help" })}>
          寻找支持
          <ArrowUpRight size={14} />
        </button>
      </p>
    </>
  );
}

export function PostForm({ post, report = false }) {
  const { call, bump, close, notify } = useApp();
  const [nickname, setNickname] = useState("一株小向日葵");
  const [topic, setTopic] = useState(topics[0]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDirty(content.trim());
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call(
        report
          ? `/posts/${post.id}/report`
          : post
            ? `/posts/${post.id}/replies`
            : "/posts",
        {
          method: "POST",
          body: report ? { reason: content } : { nickname, topic, content },
        },
      );
      bump();
      close();
      notify(
        report
          ? "已转交审核，这张纸条已暂时隐藏。"
          : "纸条已收到，审核通过后就会被看见。",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      {post && <blockquote className="reply-quote">{post.content}</blockquote>}
      {!report && (
        <>
          <p className="dialog-lead">
            用一个化名，写下真实的感受。不要留下姓名、联系方式或学校班级。
          </p>
          <label>
            你的化名
            <input
              value={nickname}
              maxLength={20}
              required
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          {!post && (
            <label>
              这张纸条关于
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      <label>
        {report ? "举报原因" : post ? "写下你的温柔回应" : "想说的心里话"}
        <textarea
          required
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={report ? 300 : post ? 500 : 1000}
          placeholder={
            report
              ? "请描述让你不舒服的内容或原因"
              : "不必组织好语言，这里愿意听你说…"
          }
        />
        <small className="character-count">
          {content.length} / {report ? 300 : post ? 500 : 1000}
        </small>
      </label>
      {!report && (
        <p className="privacy-note">
          对同学匿名 · 先审后发
          <InfoTip label="匿名说明">
            同学只能看到你的化名。平台保留审核所需的账号关联，纸条与回复都由老师审核后才公开。
          </InfoTip>
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button
        className={`button full ${report ? "danger" : "primary"}`}
        disabled={busy}
      >
        {busy
          ? "正在提交…"
          : report
            ? "提交举报并隐藏纸条"
            : "把这份心情寄出去"}
        <Send size={16} />
      </button>
    </form>
  );
}

export function ReplyDetail({ post }) {
  const { open } = useApp();
  return (
    <div>
      <div className="reply-quote">
        <strong>{post.nickname}</strong>
        <p>{post.content}</p>
      </div>
      <h3 className="replies-title">树洞里的回响</h3>
      {post.replies?.length ? (
        post.replies.map((row) => (
          <div className="reply-row" key={row.id}>
            <strong>{row.nickname}</strong>
            <span>{shortDate(row.createdAt)}</span>
            <p>{row.content}</p>
          </div>
        ))
      ) : (
        <p className="muted">还没有回应，也许你的温柔就是第一束光。</p>
      )}
      <button
        className="button primary full"
        onClick={() => open({ type: "reply", post })}
      >
        <PenLine size={16} />
        写一句温柔回应
      </button>
    </div>
  );
}

export function ServiceForm({ service = "成长支持" }) {
  const { call, bump, close, notify } = useApp();
  const [type, setType] = useState(service);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useDirty(message.trim());
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/service-requests", {
        method: "POST",
        body: { type, message },
      });
      bump();
      close();
      notify("需求已交给所在大区工作人员，可在“我的”查看。");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="dialog-lead">
        说说你希望获得的支持。这里不是即时咨询通道，紧急情况请直接寻求身边成人帮助。
      </p>
      <label>
        需求方向
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {[
            ...new Set([
              service,
              "校园成长支持",
              "家庭成长支持",
              "技能理论与服务",
              "合作与联系",
            ]),
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        你希望获得什么支持？
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          maxLength={1000}
          placeholder="可以描述希望了解的服务或需要的帮助，不必填写联系方式等额外敏感信息。"
        />
      </label>
      <PrivateNote>
        只有你自己和所属大区的工作人员可以看到这条需求，并由他们跟进。
      </PrivateNote>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "正在提交…" : "提交支持需求"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function Profile() {
  const { user, logout, open } = useApp();
  const resource = useResource("/service-requests", user?.role === "student");
  if (!user || user.role !== "student") return <Locked />;
  return (
    <>
      <PageTitle
        eyebrow="MY GROWTH SPACE"
        title="这里的每一步，都属于你"
        description="好好认识自己，也好好照顾自己。"
      />
      <section className="panel profile-card">
        <span className="profile-avatar">
          <Sprout size={36} />
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.regionName} · {user.schoolName}
          </p>
          <small>{user.account}</small>
        </div>
        <div className="invite-actions">
          <button
            className="button secondary"
            onClick={() => open({ type: "password" })}
          >
            修改密码
          </button>
          <button className="button secondary" onClick={logout}>
            退出登录
          </button>
        </div>
      </section>
      <section className="panel records">
        <SectionTitle
          title="我的支持需求"
          action="提交新需求"
          onAction={() => open({ type: "service" })}
        />
        <ResourceState {...resource}>
          {resource.data?.requests?.length ? (
            resource.data.requests.map((row) => (
              <div key={row.id} className="service-row">
                <div>
                  <h3>{row.type}</h3>
                  <p className="preserve-lines">{row.message}</p>
                  <small>{shortDate(row.createdAt)}</small>
                  {row.reply && (
                    <div className="service-reply">
                      <strong>工作人员回复 · {shortDate(row.handledAt)}</strong>
                      <p className="preserve-lines">{row.reply}</p>
                    </div>
                  )}
                </div>
                <span
                  className={`badge ${row.status === "handled" ? "green" : "yellow"}`}
                >
                  {row.status === "handled" ? "已跟进" : "待跟进"}
                </span>
              </div>
            ))
          ) : (
            <Empty
              title="需要的时候，支持就在这里"
              description="提交过的需求与跟进状态会在这里展示。"
            />
          )}
        </ResourceState>
      </section>
      <div className="privacy-card">
        <LockKeyhole size={23} />
        <div>
          <h3>关于你的成长数据</h3>
          <p>
            日记与心情备注仅自己可见；授权关怀人员可查看本大区学生的心情分数。树洞向同学展示化名，平台保留审核所需的关联。
          </p>
        </div>
      </div>
    </>
  );
}
