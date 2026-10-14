import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CirclePlus,
  Download,
  Search,
  Sprout,
  Trash2,
} from "lucide-react";
import { useApp, useDirty, useResource } from "./context.jsx";
import { Empty, PrivateNote, ResourceState } from "./components.jsx";
import { MoodFace } from "./Illustrations.jsx";
import { moodNames, shortDate } from "./api.js";

const suggestedTags = ["学习", "朋友", "家庭", "运动", "兴趣", "发现自己"];
export function StarMap() {
  const { user, open, call, bump, notify } = useApp();
  const resource = useResource("/journals", user?.role === "student");
  const map = useResource("/journals/map", user?.role === "student");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [error, setError] = useState("");
  const chart = useRef(null);
  const journals = resource.data?.journals || [];
  const rows = journals.filter((row) =>
    `${row.title}${row.content}${(row.tags || []).join(" ")}${row.goal || ""}`.includes(
      query,
    ),
  );
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await call(`/journals/${id}`, { method: "DELETE" });
      setDeleteId("");
      bump();
      notify("这片成长碎片已删除。");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function saveImage() {
    const svg = chart.current?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], {
        type: "image/svg+xml;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "我的成长星图.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stats = map.data?.stats;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">STARMAP · MY LITTLE UNIVERSE</span>
          <h1>把平凡日常，连成我的星图</h1>
          <p>心情、标签和小目标，让每一片成长碎片都有迹可循。</p>
        </div>
        <button
          className="button primary"
          onClick={() => open({ type: "journal" })}
        >
          <CirclePlus size={17} />
          写一片成长碎片
        </button>
      </div>
      <div className="journal-banner">
        <span className="journal-orbit">
          <Sprout size={42} />
        </span>
        <div>
          <h3>不需要惊天动地，也值得被记录。</h3>
          <p>点选一颗话题星星，看看它在生活中留下的轨迹。</p>
        </div>
        <PrivateNote label="仅自己可见">
          日记、标签和星图只对你自己开放，老师和同学都看不到。
        </PrivateNote>
      </div>
      <ResourceState {...map}>
        {stats && (
          <section className="panel starmap-panel">
            <div className="starmap-stats">
              {[
                ["成长碎片", stats.total],
                ["最近七天", stats.last7Days],
                ["连续记录", stats.streak],
                [
                  "心情均值",
                  stats.moodAverage == null
                    ? "—"
                    : Number(stats.moodAverage).toFixed(1),
                ],
              ].map(([name, value]) => (
                <div key={name}>
                  <strong>{value}</strong>
                  <span>{name}</span>
                </div>
              ))}
            </div>
            <div className="starmap-visual" ref={chart}>
              <TopicConstellation
                nodes={map.data.nodes || []}
                edges={map.data.edges || []}
                onSelect={setQuery}
              />
            </div>
            <div className="starmap-caption">
              <span>
                星星大小表示出现次数，连线表示话题在同一篇记录中出现。
                {stats.moodChange != null &&
                  `近七天心情均值较前七天${stats.moodChange >= 0 ? "增加" : "减少"} ${Math.abs(stats.moodChange).toFixed(1)}。`}
              </span>
              <button
                className="text-button"
                onClick={saveImage}
                disabled={!map.data.nodes?.length}
              >
                <Download size={15} />
                保存星图
              </button>
            </div>
          </section>
        )}
      </ResourceState>
      <div className="section-heading">
        <h2>
          我的成长碎片 <span className="count-label">{journals.length}</span>
        </h2>
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="寻找记忆中的小事或标签"
            aria-label="搜索日记"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ResourceState {...resource}>
        {rows.length ? (
          <div className="journal-grid">
            {rows.map((row, i) => (
              <article
                className={`journal-card ${["sage", "sand", "lavender"][i % 3]}`}
                key={row.id}
              >
                <div className="journal-card-top">
                  <span>
                    <CalendarDays size={14} />
                    {shortDate(row.createdAt)}
                  </span>
                </div>
                <button
                  className="journal-open"
                  onClick={() => open({ type: "journalRead", journal: row })}
                >
                  <h3>{row.title}</h3>
                  <p>
                    {row.content ||
                      (row.mood
                        ? `此刻的心情：${moodNames[row.mood - 1]}`
                        : "记住这一刻")}
                  </p>
                  <div className="journal-tags">
                    {row.mood && <span>{moodNames[row.mood - 1]}</span>}
                    {row.tags?.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                  {row.goal && (
                    <p className="journal-goal">小目标 · {row.goal}</p>
                  )}
                  <span className="journal-read-label">
                    看看这片成长碎片
                    <ArrowUpRight size={17} />
                  </span>
                </button>
                <div className="record-actions">
                  {deleteId === row.id ? (
                    <>
                      <span>删除后无法恢复</span>
                      <button
                        className="text-button danger"
                        disabled={busy}
                        onClick={() => remove(row.id)}
                      >
                        确认删除
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setDeleteId("")}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-button"
                      aria-label={`删除日记 ${row.title}`}
                      onClick={() => setDeleteId(row.id)}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={query ? "没有找到这片记忆" : "为自己的小宇宙，点亮第一颗星"}
            description={
              query
                ? "换个关键词，或清空搜索查看全部记录。"
                : "写下一个小发现，或只记录此刻的心情。"
            }
            action={query ? "查看全部碎片" : "写下第一片碎片"}
            onAction={() => (query ? setQuery("") : open({ type: "journal" }))}
          />
        )}
      </ResourceState>
    </>
  );
}

function TopicConstellation({ nodes, edges, onSelect }) {
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 600px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 600px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (!nodes.length)
    return (
      <div className="starmap-empty">
        <Sprout size={30} />
        <p>为记录添加标签，点亮属于你的话题星图。</p>
      </div>
    );
  const shown = [...nodes]
    .sort((a, b) => b.count - a.count)
    .slice(0, compact ? 12 : 24);
  const positions = new Map(
    shown.map((node, i) => {
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const distance =
        shown.length === 1 ? 0 : 48 + Math.sqrt(i / shown.length) * 99;
      return [
        node.id,
        {
          x:
            (compact ? 180 : 300) +
            Math.cos(angle) * distance * (compact ? 0.9 : 1.52),
          y:
            (compact ? 150 : 176) +
            Math.sin(angle) * distance * (compact ? 0.78 : 1),
          node,
        },
      ];
    }),
  );
  return (
    <svg
      viewBox={compact ? "0 0 360 310" : "0 0 600 360"}
      role="img"
      aria-label="由记录标签和共现关系生成的成长星图"
    >
      <rect
        width={compact ? 360 : 600}
        height={compact ? 310 : 360}
        rx="18"
        fill="#f4f6ee"
      />
      <g stroke="#b3c4a6">
        {edges.map((edge, i) => {
          const start = positions.get(edge.source);
          const end = positions.get(edge.target);
          return (
            start &&
            end && (
              <line
                key={i}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                strokeWidth={Math.min(5, 1 + edge.weight * 0.5)}
                opacity=".65"
              />
            )
          );
        })}
      </g>
      {[...positions.values()].map(({ x, y, node }) => (
        <g
          key={node.id}
          role="button"
          tabIndex={0}
          aria-label={`筛选标签 ${node.label}，${node.count} 次`}
          onClick={() => onSelect(node.label)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(node.label);
            }
          }}
        >
          <circle
            cx={x}
            cy={y}
            r={Math.min(25, 11 + Math.sqrt(node.count) * 4)}
            fill="#d9e7cc"
            stroke="#789368"
            strokeWidth="1.5"
          />
          <circle cx={x} cy={y} r="3.5" fill="#3e6640" />
          <text
            x={x}
            y={y + 38}
            textAnchor="middle"
            fontSize={compact ? 15 : 12}
            fontFamily="PingFang SC, Microsoft YaHei, sans-serif"
            fill="#39563b"
          >
            {node.label.length > 8 ? `${node.label.slice(0, 8)}…` : node.label}
          </text>
          <title>
            {node.label} · {node.count} 次
          </title>
        </g>
      ))}
    </svg>
  );
}

export function StarMapForm() {
  const { call, bump, close, notify } = useApp();
  const [mode, setMode] = useState("full");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(null);
  const [intensity, setIntensity] = useState(2);
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  useDirty(title.trim() || content.trim() || goal.trim());
  const [error, setError] = useState("");
  function toggleTag(tag) {
    setTags((values) =>
      values.includes(tag)
        ? values.filter((item) => item !== tag)
        : values.length < 6
          ? [...values, tag]
          : values,
    );
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const allTags = [
        ...new Set([
          ...tags,
          ...customTag
            .split(/[，,、]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ]),
      ];
      await call("/journals", {
        method: "POST",
        body: {
          title: mode === "mood" ? "" : title,
          content: mode === "mood" ? "" : content,
          mood,
          intensity,
          tags: allTags,
          goal,
        },
      });
      bump();
      close();
      notify("又一片成长碎片，被好好珍藏了。");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <PrivateNote label="仅自己可见">
        这片小小宇宙只对你自己开放，老师和同学都看不到。
      </PrivateNote>
      <div className="tool-tabs" aria-label="记录方式">
        {[
          ["full", "完整记录"],
          ["quick", "一句话"],
          ["mood", "仅心情"],
        ].map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            className={mode === id ? "selected" : ""}
            onClick={() => setMode(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {mode !== "mood" && (
        <>
          <label>
            给今天一个标题
            <input
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：今天，我举起了手（可不填）"
            />
          </label>
          <label>
            想记住的瞬间
            <textarea
              required={!mood}
              maxLength={mode === "quick" ? 200 : 5000}
              rows={mode === "quick" ? 3 : 6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="发生了什么？那一刻，你有什么感受或新发现？"
            />
            <small className="character-count">
              {content.length} / {mode === "quick" ? 200 : 5000}
            </small>
          </label>
        </>
      )}
      <fieldset className="journal-mood">
        <legend>此刻的心情{mode !== "mood" && "（选填）"}</legend>
        <div className="mood-choices compact">
          {moodNames.map((name, i) => (
            <button
              key={name}
              type="button"
              className={`mood-choice ${mood === i + 1 ? "selected" : ""}`}
              aria-pressed={mood === i + 1}
              onClick={() => setMood(mood === i + 1 ? null : i + 1)}
            >
              <MoodFace score={i + 1} size={40} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {mood && (
        <label>
          感受强度
          <select
            value={intensity}
            onChange={(event) => setIntensity(Number(event.target.value))}
          >
            <option value={1}>轻轻的</option>
            <option value={2}>比较明显</option>
            <option value={3}>很强烈</option>
          </select>
        </label>
      )}
      <fieldset className="journal-tag-options">
        <legend>这片碎片与什么有关？（最多 6 个）</legend>
        <div className="filter-row">
          {suggestedTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip ${tags.includes(tag) ? "active" : ""}`}
              aria-pressed={tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        自定义标签
        <input
          maxLength={120}
          value={customTag}
          onChange={(event) => setCustomTag(event.target.value)}
          placeholder="多个标签用逗号分开，每个最多 20 字"
        />
      </label>
      <label>
        一个小目标（选填）
        <input
          maxLength={200}
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="明天，我想试着……"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary full"
        disabled={busy || (mode === "mood" && !mood)}
      >
        {busy ? "正在珍藏…" : "珍藏这片成长碎片"}
        <Check size={16} />
      </button>
    </form>
  );
}
