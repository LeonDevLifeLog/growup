import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  LockKeyhole,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp, useResource } from "./context.jsx";
import { Empty, PrivateNote, ResourceState } from "./components.jsx";

const localDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
const hasValue = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  (!Array.isArray(value) || value.length > 0);
export function downloadJson(data, filename) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importInBatches(call, path, key, entries) {
  let imported = 0,
    skipped = 0;
  let batch = [],
    bytes = 0;
  const encoder = new TextEncoder();
  async function flush() {
    if (!batch.length) return;
    const result = await call(path, { method: "POST", body: { [key]: batch } });
    imported += result.imported;
    skipped += result.skipped;
    batch = [];
    bytes = 0;
  }
  try {
    for (const entry of entries) {
      const length = encoder.encode(JSON.stringify(entry)).length;
      if (length > 1024 * 1024) throw new Error("单条记录过大，请检查备份文件");
      if (batch.length >= 100 || bytes + length > 1024 * 1024) await flush();
      batch.push(entry);
      bytes += length;
    }
    await flush();
    return { imported, skipped };
  } catch (error) {
    if (imported || skipped) {
      error.partialImport = true;
      error.message = `已导入 ${imported} 条、跳过 ${skipped} 条；后续导入失败：${error.message}。修正后可重试，已导入项不会重复。`;
    }
    throw error;
  }
}

export function SchemaFields({ fields, answers, onChange }) {
  return (
    <div className="schema-fields">
      {fields.map((field, index) => {
        const value = answers[field.id];
        const title = (
          <>
            {field.label}
            {field.required && <span className="required-mark"> *</span>}
          </>
        );
        return (
          <div className="schema-field" key={field.id}>
            {field.section && field.section !== fields[index - 1]?.section && (
              <h3 className="schema-section">{field.section}</h3>
            )}
            {field.type === "single" || field.type === "multi" ? (
              <fieldset>
                <legend>{title}</legend>
                {(field.description || field.help) && (
                  <p className="field-hint">
                    {field.description || field.help}
                  </p>
                )}
                <div className="schema-options">
                  {field.options.map((option, i) => {
                    const selected =
                      field.type === "multi"
                        ? (value || []).includes(option.value)
                        : value === option.value;
                    return (
                      <label
                        className={`schema-option ${selected ? "selected" : ""}`}
                        key={i}
                      >
                        <input
                          type={field.type === "multi" ? "checkbox" : "radio"}
                          name={field.id}
                          value={String(option.value)}
                          checked={selected}
                          required={field.type === "single" && field.required}
                          onChange={() =>
                            onChange(
                              field.id,
                              field.type === "multi"
                                ? selected
                                  ? value.filter(
                                      (item) => item !== option.value,
                                    )
                                  : [...(value || []), option.value]
                                : option.value,
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <label>
                {title}
                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    maxLength={field.maxLength || field.max || 1000}
                    value={value ?? ""}
                    required={field.required}
                    placeholder={field.placeholder || "写下你的真实感受"}
                    onChange={(event) => onChange(field.id, event.target.value)}
                  />
                ) : (
                  <input
                    type={
                      ["number", "date", "time"].includes(field.type)
                        ? field.type
                        : "text"
                    }
                    value={value ?? ""}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={
                      field.step ||
                      (field.type === "number" ? "any" : undefined)
                    }
                    maxLength={
                      field.maxLength ||
                      (field.type === "text" ? field.max : undefined) ||
                      200
                    }
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      onChange(
                        field.id,
                        field.type === "number" && event.target.value !== ""
                          ? Number(event.target.value)
                          : event.target.value,
                      )
                    }
                  />
                )}
                {(field.unit || field.description || field.help) && (
                  <small className="field-hint">
                    {[field.unit, field.description || field.help]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                )}
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReportView({ report }) {
  if (!report)
    return (
      <Empty
        title="还没有生成回顾"
        description="完成一份记录，或选择月份查看已有记录。"
      />
    );
  return (
    <article className="growth-report" aria-label="成长观察结果">
      <span className="eyebrow">A MOMENT TO UNDERSTAND YOURSELF</span>
      <h3>{report.title}</h3>
      {report.summary && <p className="report-summary">{report.summary}</p>}
      {!!report.metrics?.length && (
        <dl className="report-metrics">
          {report.metrics.map((metric, i) => (
            <div key={i}>
              <dt>{metric.label}</dt>
              <dd>
                {metric.value}
                <small>{metric.unit}</small>
              </dd>
              {metric.note && <p>{metric.note}</p>}
            </div>
          ))}
        </dl>
      )}
      {report.sections?.map((section, i) => (
        <section key={i}>
          <h4>{section.title}</h4>
          {section.text && <p className="preserve-lines">{section.text}</p>}
          {section.items?.length > 0 && (
            <ul>
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {report.notice && <p className="report-notice">{report.notice}</p>}
    </article>
  );
}

export function GrowthTool({ toolId }) {
  const { user, open } = useApp();
  const resource = useResource("/tools", user?.role === "student");
  const tool = resource.data?.tools.find((item) => item.id === toolId);
  return (
    <ResourceState {...resource}>
      {tool ? (
        <ToolWorkspace key={tool.id} tool={tool} />
      ) : (
        <Empty
          title="暂时无法打开这项工具"
          description="请返回成长探索重试。"
          action="返回工具目录"
          onAction={() => open({ type: "toolCatalog" })}
        />
      )}
    </ResourceState>
  );
}

export function ToolCatalog() {
  const { open, user } = useApp();
  const resource = useResource("/tools", user?.role === "student");
  return (
    <ResourceState {...resource}>
      {["中长期成长观察", "成长现状分析", "成长共研室"].map((group) => {
        const tools =
          resource.data?.tools.filter((item) => item.group === group) || [];
        return (
          tools.length > 0 && (
            <section className="tool-group" key={group}>
              <h3>
                {group}
                <span>{tools.length} 个工具</span>
              </h3>
              <div className="tool-links">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    data-tool-id={tool.id}
                    onClick={() =>
                      open({ type: "tool", toolId: tool.id, title: tool.name })
                    }
                  >
                    {tool.name}
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          )
        );
      })}
    </ResourceState>
  );
}

function ToolWorkspace({ tool }) {
  const { call, notify, open } = useApp();
  const [profileId, setProfileId] = useState(tool.profiles[0].id);
  const [answers, setAnswers] = useState({});
  const [date, setDate] = useState(localDate);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [tab, setTab] = useState("write");
  const [records, setRecords] = useState([]);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const fileInput = useRef(null);
  const workspace = useRef(null);
  const reportRequestId = useRef(0);
  function invalidateReportRequest() {
    reportRequestId.current++;
    setReportLoading(false);
  }
  const profile = tool.profiles.find((item) => item.id === profileId);
  const required = profile.fields.filter((field) => field.required);
  const completed = required.filter((field) =>
    hasValue(answers[field.id]),
  ).length;
  const isTracker = tool.mode === "tracker";
  useEffect(() => {
    workspace.current
      ?.closest("dialog")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  useEffect(() => {
    let active = true;
    call(`/tools/${tool.id}/records`)
      .then((data) => {
        if (active) {
          setRecords(data.records);
          if (tool.mode === "tracker") {
            const existing = data.records.find(
              (row) =>
                row.profileId === tool.profiles[0].id &&
                row.date === localDate(),
            );
            if (existing) setAnswers(existing.answers);
          }
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [call, tool.id]);
  function changeProfile(next) {
    setProfileId(next);
    setAnswers(
      isTracker
        ? records.find((row) => row.profileId === next && row.date === date)
            ?.answers || {}
        : {},
    );
    setError("");
  }
  function changeDate(next) {
    setDate(next);
    if (isTracker)
      setAnswers(
        records.find((row) => row.profileId === profileId && row.date === next)
          ?.answers || {},
      );
  }
  async function submit(event) {
    event.preventDefault();
    const missing = required.find((field) => !hasValue(answers[field.id]));
    if (missing) {
      setError(`请完成：${missing.label}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await call(`/tools/${tool.id}/records`, {
        method: "POST",
        body: { profileId, date, answers },
      });
      setRecords((rows) => [
        data.record,
        ...rows.filter((row) => row.id !== data.record.id),
      ]);
      setReport(data.record.result);
      setTab("report");
      notify(
        isTracker
          ? "记录已保存，可以继续积累成长回顾。"
          : "回答已保存，你的观察结果已生成。",
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function monthlyReport() {
    const requestId = ++reportRequestId.current;
    setReportLoading(true);
    setError("");
    try {
      const data = await call(`/tools/${tool.id}/report?month=${month}`);
      if (reportRequestId.current === requestId) setReport(data.report);
    } catch (error) {
      if (reportRequestId.current === requestId) setError(error.message);
    } finally {
      if (reportRequestId.current === requestId) setReportLoading(false);
    }
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await call(`/tools/${tool.id}/records/${id}`, { method: "DELETE" });
      setRecords((rows) => rows.filter((row) => row.id !== id));
      setReport(null);
      setDeleteId("");
      notify("这份记录已删除。");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportRecords() {
    setBusy(true);
    setError("");
    try {
      downloadJson(
        await call(`/tools/${tool.id}/export`),
        `成长健研社-${tool.id}-${localDate()}.json`,
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function importRecords(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("每次请选择不超过 50 MB 的备份文件");
      const data = JSON.parse(await file.text());
      if (
        data.version !== 1 ||
        data.toolId !== tool.id ||
        !Array.isArray(data.records)
      )
        throw new Error("请选择当前工具的成长健研社 v1 备份文件");
      const result = await importInBatches(
        call,
        `/tools/${tool.id}/import`,
        "records",
        data.records,
      );
      setRecords((await call(`/tools/${tool.id}/records`)).records);
      setReport(null);
      setTab("history");
      notify(
        `已导入 ${result.imported} 条，跳过 ${result.skipped} 条重复记录。`,
      );
    } catch (error) {
      if (error.partialImport) {
        try {
          setRecords((await call(`/tools/${tool.id}/records`)).records);
          setReport(null);
          setTab("history");
        } catch {
          /* 保留包含已完成条数的导入错误。 */
        }
      }
      setError(
        error instanceof SyntaxError
          ? "文件不是有效的 JSON 备份"
          : error.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tool-workspace" ref={workspace}>
      <button
        className="text-button"
        onClick={() => open({ type: "toolCatalog" })}
      >
        <ArrowLeft size={15} />
        全部成长工具
      </button>
      <p className="dialog-lead">{tool.description}</p>
      <PrivateNote>回答与记录仅自己可见，保存在你的账号中。</PrivateNote>
      <div className="tool-tabs" role="tablist" aria-label="工具功能">
        {[
          ["write", isTracker ? "填写记录" : "开始作答"],
          ["history", `历史记录 · ${records.length}`],
          ["report", "观察结果"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              invalidateReportRequest();
              setTab(id);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tab === "write" && (
        <form className="form-stack tool-form" onSubmit={submit}>
          <div className="tool-form-context">
            <label>
              {isTracker ? "记录类型" : "适用分组"}
              <select
                aria-label={isTracker ? "记录类型" : "适用分组"}
                value={profileId}
                onChange={(event) => changeProfile(event.target.value)}
              >
                {tool.profiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              记录日期
              <input
                type="date"
                required
                max={localDate()}
                value={date}
                onChange={(event) => changeDate(event.target.value)}
              />
            </label>
          </div>
          {profile.description && (
            <p className="field-hint">{profile.description}</p>
          )}
          {required.length > 0 && (
            <div className="question-progress">
              <span>
                已完成 {completed} / {required.length} 项必填
              </span>
              <progress value={completed} max={required.length} />
            </div>
          )}
          <SchemaFields
            fields={profile.fields}
            answers={answers}
            onChange={(id, value) =>
              setAnswers((state) => ({ ...state, [id]: value }))
            }
          />
          <button className="button primary full" disabled={busy}>
            {busy
              ? "正在保存…"
              : isTracker
                ? "保存这份成长记录"
                : "生成我的观察结果"}
            <Check size={16} />
          </button>
        </form>
      )}
      {tab === "history" && (
        <div className="tool-history">
          <div className="tool-backup">
            <button
              className="button secondary"
              disabled={busy}
              onClick={exportRecords}
            >
              <Download size={15} />
              导出记录
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => fileInput.current.click()}
            >
              <Upload size={15} />
              导入备份
            </button>
            <input
              hidden
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              onChange={importRecords}
            />
          </div>
          {historyLoading ? (
            <p className="loading">正在读取你的记录…</p>
          ) : records.length ? (
            records.map((row) => (
              <article className="tool-history-card" key={row.id}>
                <div>
                  <strong>{row.date}</strong>
                  <span>
                    {
                      tool.profiles.find((item) => item.id === row.profileId)
                        ?.name
                    }
                  </span>
                </div>
                <p>{row.result?.title || tool.name}</p>
                <div className="record-actions">
                  {isTracker && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setProfileId(row.profileId);
                        setDate(row.date);
                        setAnswers(row.answers);
                        setTab("write");
                        setError("");
                      }}
                    >
                      继续编辑
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setReport(row.result);
                      setTab("report");
                    }}
                  >
                    查看这次结果
                    <ArrowRight size={14} />
                  </button>
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
                      aria-label={`删除 ${row.date} 的记录`}
                      onClick={() => setDeleteId(row.id)}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="还没有成长记录"
              description="从一份真实的记录开始，之后可以在这里回顾。"
            />
          )}
        </div>
      )}
      {tab === "report" && (
        <div>
          <div className="report-toolbar">
            <label>
              回顾月份
              <input
                type="month"
                value={month}
                max={localDate().slice(0, 7)}
                onChange={(event) => {
                  invalidateReportRequest();
                  setMonth(event.target.value);
                  setReport(null);
                }}
              />
            </label>
            <button
              className="button secondary"
              disabled={busy || reportLoading || !month}
              onClick={monthlyReport}
            >
              生成月度回顾
            </button>
          </div>
          <ReportView report={report} />
        </div>
      )}
      {tool.notice && <p className="report-notice">{tool.notice}</p>}
    </div>
  );
}

export function StructuredServiceForm({ formId }) {
  const { call, bump, close, notify, user } = useApp();
  const resource = useResource("/service-forms");
  const form = resource.data?.forms.find((item) => item.id === formId);
  const [answers, setAnswers] = useState(() =>
    formId === "fk" ? {} : { school: user?.schoolName || "" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/service-requests", {
        method: "POST",
        body: { formId, answers },
      });
      bump();
      close();
      notify("已提交至所在大区，可在“我的”查看处理进度。");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResourceState {...resource}>
      {form && (
        <form className="form-stack" onSubmit={submit}>
          <p className="dialog-lead">{form.description}</p>
          <PrivateNote>
            由你的账号提交，仅自己与所属大区工作人员可见。
          </PrivateNote>
          <SchemaFields
            fields={form.profiles[0].fields}
            answers={answers}
            onChange={(id, value) =>
              setAnswers((state) => ({ ...state, [id]: value }))
            }
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? "正在提交…" : "提交" + form.name}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </ResourceState>
  );
}
