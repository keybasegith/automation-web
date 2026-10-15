"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  PanelTop,
  Inbox,
  History,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Check,
  LockKeyhole,
  LogOut,
  Save,
  Send,
  ImagePlus,
  Plus,
  Trash2,
  Eye,
  ChevronRight,
  Download,
  Globe,
  ClipboardCheck,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";
import { createPortalApi } from "@/lib/advisor-portal/data";
import { EMPTY_PAGE, STATUS } from "@/lib/advisor-portal/workflow";
import "./portal.css";
import AppShellClient from "@/components/AppShellClient";
const roles = {
  advisor: "Advisor workspace",
  compliance: "Compliance workspace",
  it: "Publishing workspace",
};
const date = (s) =>
  new Date(s).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function Badge({ status }) {
  return (
    <span className={"badge " + status}>
      <i />
      {STATUS[status] || status}
    </span>
  );
}
function Preview({ page, organization }) {
  const frame = useRef(null);
  const stage = useRef(null);
  const [device, setDevice] = useState("desktop");
  const [availableWidth, setAvailableWidth] = useState(0);
  const viewportWidth = device === "desktop" ? 1280 : 390;
  const scale = availableWidth ? Math.min(1, availableWidth / viewportWidth) : 1;
  const viewportHeight = Math.round(680 / scale);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const send = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "keybase-advisor-preview", page, organization },
      window.location.origin,
    );
  useEffect(() => {
    send();
    const ready = (e) => {
      if (
        e.origin === window.location.origin &&
        e.source === frame.current?.contentWindow &&
        e.data?.type === "keybase-advisor-preview-ready"
      )
        send();
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [page, organization]);
  return (
    <div className="device-preview">
      <div className="device-toolbar" role="group" aria-label="Preview device">
        <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
          <Monitor size={16} /> Desktop
        </button>
        <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
          <Smartphone size={16} /> Mobile
        </button>
        <span>{viewportWidth}px</span>
      </div>
      <div ref={stage} className="device-stage">
        <div style={{ width: viewportWidth * scale, height: 680, position: "relative", margin: "0 auto" }}>
          <iframe
            ref={frame}
            title="Advisor page template preview"
            src="/advisor-portal/preview"
            onLoad={send}
            className="template-frame"
            style={{ width: viewportWidth, height: viewportHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
      </div>
    </div>
  );
}
export default function AdvisorPortal({ demo = false, allowDemo = false }) {
  const {
    supabase,
    getData,
    saveDraft,
    submit,
    act,
    markRead,
    profile,
    demoProfiles,
  } = useMemo(() => createPortalApi(demo), [demo]);
  const [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [page, setPage] = useState(EMPTY_PAGE),
    [view, setView] = useState("overview"),
    [tab, setTab] = useState("Content"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [selected, setSelected] = useState(null),
    [note, setNote] = useState(""),
    [preview, setPreview] = useState(false),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  async function refresh(u = user, replace = false) {
    const d = await getData(u);
    setData(d);
    if (replace) {
      setPage(d.draft);
      setDirty(false);
    }
    return d;
  }
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session)
        try {
          setUser(await profile(session.user.id));
        } catch (e) {
          setError(
            "Your account needs an assigned portal role. Contact your administrator.",
          );
        }
    });
  }, []);
  useEffect(() => {
    if (user) {
      setData(null);
      refresh(user, true).catch((e) => setError(e.message));
      const timer = setInterval(() => refresh(user).catch(() => {}), 15000);
      return () => clearInterval(timer);
    }
  }, [user]);
  useEffect(() => {
    const listener = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  async function run(fn, message) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      if (message) {
        setToast(message);
        setTimeout(() => setToast(""), 4500);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const update = (k, v) => {
    setPage((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const switchUser = (u) => {
    if (dirty && !confirm("Discard your unsaved edits?")) return;
    setDirty(false);
    setUser(u);
    setView("overview");
    setSelected(null);
    setError("");
  };
  async function login(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: f.get("email"),
        password: f.get("password"),
      });
      if (error) throw error;
      setUser(await profile(data.user.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <AppShellClient
        title="Advisor portal"
        user={{ name: "Advisor portal", email: "Sign in to your account" }}
      >
        <div className="portal-ui">
          <div className="login">
            <div className="page-heading">
              <div>
                <p className="eyebrow">Keybase Automation</p>
                <h1>Advisor portal</h1>
                <p>
                  Manage your advisor page, review feedback, and track
                  publishing.
                </p>
              </div>
            </div>
            <div className="login-form card">
              <div className="login-icon">
                <PanelTop size={22} />
              </div>
              <h2>
                {supabase
                  ? "Sign in to your workspace"
                  : "Choose a demo workspace"}
              </h2>
              <p>
                {supabase
                  ? "Use your individual account to access your advisor page or review queue."
                  : "Explore the advisor, compliance, and publishing workflows."}
              </p>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              {supabase ? (
                <form onSubmit={login}>
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      name="email"
                      autoComplete="username"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      required
                      type="password"
                      name="password"
                      autoComplete="current-password"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Sign in <ArrowRight size={17} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="demo-notice">
                    <span className="dot" /> Local demonstration · Supabase not
                    connected
                  </div>
                  <p className="small">
                    Explore the complete workflow with sample roles. These are
                    demo views, not real login credentials.
                  </p>
                  {demoProfiles.map((u) => (
                    <button
                      className="demo-role"
                      key={u.id}
                      onClick={() => switchUser(u)}
                    >
                      <span className="avatar">{u.name[0]}</span>
                      <span>
                        <b>{u.name}</b>
                        <small>{roles[u.role]}</small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </>
              )}
              {allowDemo && supabase && (
                <a className="demo-link" href="/advisor-portal?demo=1">
                  Open local demo · existing advisor template
                </a>
              )}
              <a className="workspace-back" href="/dashboard">
                ← Back to Keybase Automation
              </a>
              <div className="login-footer">
                <LockKeyhole size={14} /> Individual access. One connected
                workflow.
              </div>
            </div>
          </div>
        </div>
      </AppShellClient>
    );
  if (!data)
    return (
      <div className="loading">
        {error || "Opening your workspace…"}
        {error && (
          <button onClick={() => setUser(null)}>Back to sign in</button>
        )}
      </div>
    );
  const advisor = user.role === "advisor",
    requests = data.requests.filter(
      (r) => !advisor || r.advisor_id === user.id,
    ),
    messages = data.messages.filter((m) => m.recipient_id === user.id),
    unread = messages.filter((m) => !m.read_at).length,
    pending = requests.some((r) =>
      ["submitted", "approved"].includes(r.status),
    ),
    queue = requests.filter(
      (r) => r.status === (user.role === "it" ? "approved" : "submitted"),
    );
  const visible = requests.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      `${r.advisor_name} ${r.version}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function open(r) {
    setSelected(r.id);
    setNote("");
    setView("requests");
  }
  const request = data.requests.find((r) => r.id === selected);
  const field = (label, key, multi = false) => (
    <label key={key}>
      {label}
      {multi ? (
        <textarea
          aria-label={label}
          value={page[key]}
          onChange={(e) => update(key, e.target.value)}
          rows={key === "headline" ? 2 : 4}
        />
      ) : (
        <input
          aria-label={label}
          value={page[key]}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </label>
  );
  const requestList = (rows) =>
    rows.length ? (
      <div className="request-list">
        {rows.map((r) => (
          <button className="request-row" key={r.id} onClick={() => open(r)}>
            <span className="avatar">{r.advisor_name?.[0]}</span>
            <span>
              <b>{r.advisor_name}</b>
              <small>
                Version {r.version} · {date(r.created_at)}
              </small>
            </span>
            <Badge status={r.status} />
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    ) : (
      <div className="empty">
        <ClipboardCheck size={28} />
        <h3>All clear for now</h3>
        <p>
          {advisor
            ? "Your page updates will appear here when you submit a draft."
            : "New requests will appear here when they’re ready for you."}
        </p>
      </div>
    );
  return (
    <AppShellClient
      title="Advisor portal"
      user={{ name: user.name, email: roles[user.role] }}
    >
      <div className="portal-ui">
        <div className="portal-toolbar">
          <nav aria-label="Advisor portal" className="portal-nav">
            {[
              ["overview", LayoutDashboard, "Overview"],
              ...(advisor ? [["editor", PanelTop, "My advisor page"]] : []),
              [
                "requests",
                ShieldCheck,
                user.role === "it"
                  ? "Publishing queue"
                  : advisor
                    ? "My submissions"
                    : "Compliance review",
              ],
              ["inbox", Inbox, "Inbox"],
              ["history", History, "Activity history"],
            ].map(([id, Icon, label]) => (
              <button
                key={id}
                aria-current={view === id ? "page" : undefined}
                className={view === id ? "active" : ""}
                onClick={() => {
                  setView(id);
                  setSelected(null);
                }}
              >
                <Icon size={16} />
                {label}
                {id === "inbox" && unread > 0 && (
                  <span className="count">{unread}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="portal-account-actions">
            {!supabase && (
              <select
                aria-label="Switch demo role"
                value={user.id}
                onChange={(e) =>
                  switchUser(demoProfiles.find((p) => p.id === e.target.value))
                }
              >
                {demoProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.role}
                  </option>
                ))}
              </select>
            )}
            <button
              aria-label="Sign out"
              title="Sign out"
              onClick={() =>
                run(async () => {
                  if (dirty && !confirm("Discard unsaved edits and sign out?"))
                    return;
                  if (supabase) await supabase.auth.signOut();
                  setUser(null);
                  setDirty(false);
                }, "")
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {!supabase && (
          <div className="demo-strip">
            LOCAL PREVIEW{" "}
            <span>
              Existing Johnathan template · Sample statistics · Changes stay in
              this browser · Real accounts pending Supabase connection
            </span>
          </div>
        )}
        <div className="portal-content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}
          {toast && (
            <div className="toast" role="status">
              <Check size={16} />
              {toast}
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Advisor workspace</span>
                  <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
                  <p>
                    {advisor
                      ? "Manage your page updates, submissions, and feedback."
                      : user.role === "compliance"
                        ? "Review advisor page updates and provide compliance feedback."
                        : "Manage approved page updates and confirm publication."}
                  </p>
                </div>
                <span className="date-pill">
                  {new Date().toLocaleDateString("en-CA", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="metrics">
                {[
                  [
                    advisor ? "Your submissions" : "Awaiting your action",
                    advisor ? requests.length : queue.length,
                    "All page updates",
                    PanelTop,
                  ],
                  [
                    "In compliance review",
                    requests.filter((r) => r.status === "submitted").length,
                    "With David for verification",
                    ShieldCheck,
                  ],
                  [
                    "Ready for publishing",
                    requests.filter((r) => r.status === "approved").length,
                    "Approved and queued for Keith",
                    Globe,
                  ],
                  [
                    "Unread messages",
                    unread,
                    "Your latest feedback and updates",
                    Inbox,
                  ],
                ].map(([label, num, sub, Icon]) => (
                  <div className="metric" key={label}>
                    <div>
                      {label}
                      <Icon size={18} />
                    </div>
                    <strong>{num.toString().padStart(2, "0")}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="card task-card">
                  <div className="task-icon">
                    <PanelTop size={21} />
                  </div>
                  <h2>
                    {advisor
                      ? "Your advisor page"
                      : user.role === "compliance"
                        ? "Advisor page reviews"
                        : "Approved page updates"}
                  </h2>
                  <p>
                    {advisor
                      ? "Update your content, photos, and statistics. Preview your page before submitting it for compliance review."
                      : user.role === "compliance"
                        ? "Review submitted pages, compare changes, and approve updates or send feedback to the advisor."
                        : "Open the compliance-approved version, make the changes in your system, and confirm publication."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => setView(advisor ? "editor" : "requests")}
                  >
                    {advisor ? "Customize my page" : "Open your queue"}
                    <ArrowRight size={16} />
                  </button>
                </section>
                <section className="card workflow-card">
                  <h3>Review & publishing</h3>
                  {[
                    [
                      "1",
                      "Advisor submission",
                      "Edit your page and submit a version.",
                    ],
                    [
                      "2",
                      "Compliance review",
                      "David approves or requests changes.",
                    ],
                    [
                      "3",
                      "Manual publishing",
                      "Keith updates the approved page.",
                    ],
                  ].map(([n, title, desc]) => (
                    <div className="step" key={n}>
                      <span>{n}</span>
                      <div>
                        <b>{title}</b>
                        <p>{desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="lock-note">
                    <LockKeyhole size={14} /> The Keybase company description is
                    protected.
                  </div>
                </section>
              </div>
              <section className="card">
                <div className="section-title">
                  <div>
                    <h3>
                      {advisor
                        ? "Recent submissions"
                        : "Requests needing attention"}
                    </h3>
                    <p>Follow each version from review to publication.</p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => setView("requests")}
                  >
                    View all <ArrowRight size={16} />
                  </button>
                </div>
                {requestList(
                  advisor ? requests.slice(0, 4) : queue.slice(0, 4),
                )}
              </section>
            </>
          )}
          {view === "editor" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR STORY, YOUR WAY</span>
                  <h1>My advisor page</h1>
                  <p>
                    Shape your page. Preview every detail. Submit when you’re
                    ready.
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => setPreview(true)}>
                    <Eye size={16} /> Preview
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await saveDraft(user, page);
                        setDirty(false);
                      }, "Draft saved")
                    }
                  >
                    <Save size={16} /> Save draft
                  </button>
                  <button
                    className="primary"
                    disabled={busy || pending}
                    onClick={() =>
                      run(async () => {
                        await submit(user, page);
                        setDirty(false);
                      }, "Submitted to David for compliance review")
                    }
                  >
                    <Send size={16} /> Submit for review
                  </button>
                </div>
              </div>
              {pending && (
                <div className="info">
                  A version is already in review or awaiting publishing. You can
                  keep editing your draft; your submitted version stays
                  unchanged.
                </div>
              )}
              <div className="editor-grid">
                <section className="card edit-panel">
                  <div className="editor-top">
                    <b>Page settings</b>
                    <span className="save-status">
                      {dirty ? "Unsaved changes" : "Draft saved"}
                    </span>
                  </div>
                  <div className="tabs">
                    {["Content", "Images", "Statistics"].map((t) => (
                      <button
                        className={tab === t ? "active" : ""}
                        onClick={() => setTab(t)}
                        key={t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="fields">
                    {tab === "Content" && (
                      <>
                        <h3>Introduce yourself</h3>
                        {field("Full name", "name")}
                        {field("Title & credentials", "credentials")}
                        {field("Company / practice name", "company")}
                        {field("Tagline", "headline", true)}
                        {field("Specialties", "intro", true)}
                        {field("Note label", "noteLabel")}
                        {field("Note heading", "noteHeading")}
                        {field("About you", "bio", true)}
                        <h3>Stay connected</h3>
                        {field("Email", "email")}
                        {field("Office phone", "phone")}
                        {field("Cell phone", "cell")}
                        {field("Location / address", "address", true)}
                        {field("Contact button text", "cta")}
                        {field("Contact heading", "contactHeading")}
                        {field("Contact introduction", "contactIntro", true)}
                        {field("Footer disclosure", "footerDisclosure", true)}
                        <h3>Page sections</h3>
                        {page.sections.map((s, i) => (
                          <div className="repeat" key={i}>
                            <label>
                              Section heading
                              <input
                                value={s.title}
                                onChange={(e) =>
                                  update(
                                    "sections",
                                    page.sections.map((x, j) =>
                                      j === i
                                        ? { ...x, title: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Section text
                              <textarea
                                rows={4}
                                value={s.body}
                                onChange={(e) =>
                                  update(
                                    "sections",
                                    page.sections.map((x, j) =>
                                      j === i
                                        ? { ...x, body: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <button
                              onClick={() =>
                                update(
                                  "sections",
                                  page.sections.filter((_, j) => j !== i),
                                )
                              }
                            >
                              <Trash2 size={14} /> Remove section
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            update("sections", [
                              ...page.sections,
                              { title: "New section", body: "" },
                            ])
                          }
                        >
                          <Plus size={16} /> Add section
                        </button>
                        <div className="locked-description">
                          <LockKeyhole size={17} />
                          <b>Keybase Financial Group</b>
                          <p>{data.organization}</p>
                          <small>
                            Company-managed content · Cannot be edited
                          </small>
                        </div>
                      </>
                    )}
                    {tab === "Images" && (
                      <>
                        <h3>Give your page a personal touch</h3>
                        <p className="small">
                          Upload a JPG, PNG, or WebP image, up to 2 MB. Uploaded
                          images are included in your submitted version.
                        </p>
                        {[
                          ["portrait", "Profile picture"],
                          ["background", "Background image"],
                        ].map(([k, title]) => (
                          <div className="upload" key={k}>
                            <h4>{title}</h4>
                            {page[k] && <img src={page[k]} alt={title} />}
                            <label className="file-label">
                              <ImagePlus size={21} />
                              <span>Choose an image</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const f = e.target.files[0];
                                  if (!f) return;
                                  if (
                                    f.size > 2 * 1024 * 1024 ||
                                    ![
                                      "image/jpeg",
                                      "image/png",
                                      "image/webp",
                                    ].includes(f.type)
                                  ) {
                                    setError(
                                      "Choose a JPG, PNG, or WebP smaller than 2 MB.",
                                    );
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    update(k, reader.result);
                                  reader.readAsDataURL(f);
                                }}
                              />
                            </label>
                            {page[k] && (
                              <button onClick={() => update(k, "")}>
                                Remove image
                              </button>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {tab === "Statistics" && (
                      <>
                        <h3>Your experience, at a glance</h3>
                        <p className="small">
                          Click a number to edit it. Default zeros are placeholders;
                          replace them with accurate figures before submitting.
                        </p>
                        {page.stats.map((s, i) => (
                          <div className="repeat" key={i}>
                            <label>
                              {s.label || "Statistic"}
                              <input
                                aria-label={`${s.label || "Statistic"} value`}
                                value={s.value}
                                onChange={(e) =>
                                  update(
                                    "stats",
                                    page.stats.map((x, j) =>
                                      i === j
                                        ? { ...x, value: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Label
                              <input
                                value={s.label}
                                onChange={(e) =>
                                  update(
                                    "stats",
                                    page.stats.map((x, j) =>
                                      i === j
                                        ? { ...x, label: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <button
                              onClick={() =>
                                update(
                                  "stats",
                                  page.stats.filter((_, j) => i !== j),
                                )
                              }
                            >
                              <Trash2 size={14} /> Remove statistic
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            update("stats", [
                              ...page.stats,
                              { value: "", label: "" },
                            ])
                          }
                        >
                          <Plus size={16} /> Add statistic
                        </button>
                      </>
                    )}

                  </div>
                </section>
                <div className="preview-wrap">
                  <div className="preview-bar">
                    <span>
                      <span className="dot" /> LIVE DRAFT PREVIEW
                    </span>
                  </div>
                  <Preview page={page} organization={data.organization} />
                  <p className="preview-caption">
                    <LockKeyhole size={12} /> Draft preview only. Changes go
                    live after compliance review and manual publishing.
                  </p>
                </div>
              </div>
            </>
          )}
          {view === "requests" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">EVERY VERSION, ACCOUNTED FOR</span>
                  <h1>
                    {advisor
                      ? "My submissions"
                      : user.role === "compliance"
                        ? "Compliance review"
                        : "Publishing queue"}
                  </h1>
                  <p>
                    {user.role === "it"
                      ? "Publish the approved version in your system, then mark the request complete."
                      : "Review page versions, decisions, and feedback in one place."}
                  </p>
                </div>
              </div>
              {request ? (
                <>
                  <button
                    className="text-btn"
                    onClick={() => setSelected(null)}
                  >
                    ← Back to submissions
                  </button>
                  <div className="review-heading">
                    <div>
                      <h2>
                        {request.advisor_name}{" "}
                        <span className="muted">
                          / Version {request.version}
                        </span>
                      </h2>
                      <p>
                        Submitted {date(request.created_at)} · Immutable
                        submitted version
                      </p>
                    </div>
                    <Badge status={request.status} />
                  </div>
                  <div className="review-grid">
                    <div>
                      <Preview
                        page={request.content}
                        organization={
                          request.organization_description || data.organization
                        }
                      />
                      <section className="card changes">
                        <h3>Changes from last published version</h3>
                        {Object.keys(request.content)
                          .filter(
                            (k) =>
                              JSON.stringify(request.content[k]) !==
                              JSON.stringify(request.baseline?.[k]),
                          )
                          .map((k) => (
                            <div className="change" key={k}>
                              <b>{k}</b>
                              {["background", "portrait"].includes(k) ? (
                                <span>
                                  Image{" "}
                                  {request.content[k]
                                    ? "added / updated"
                                    : "removed"}
                                </span>
                              ) : (
                                <>
                                  <small>
                                    Previously:{" "}
                                    {typeof request.baseline?.[k] === "object"
                                      ? JSON.stringify(request.baseline[k])
                                      : request.baseline?.[k] ||
                                        "Not yet published"}
                                  </small>
                                  <p>
                                    {typeof request.content[k] === "object"
                                      ? JSON.stringify(request.content[k])
                                      : request.content[k]}
                                  </p>
                                </>
                              )}
                            </div>
                          ))}
                      </section>
                    </div>
                    <div>
                      <section className="card decision">
                        <ShieldCheck size={25} />
                        <h3>
                          {user.role === "it"
                            ? "Publishing handoff"
                            : "Review & decision"}
                        </h3>
                        <p className="small">
                          {user.role === "it"
                            ? "This is the exact version approved by compliance. Update your system manually before confirming."
                            : "Check the page content, statistics, and images. Notes on returned requests appear in the advisor’s inbox."}
                        </p>
                        {((user.role === "compliance" &&
                          request.status === "submitted") ||
                          (user.role === "it" &&
                            request.status === "approved")) && (
                          <>
                            <label>
                              {user.role === "it"
                                ? "Publishing note (optional)"
                                : "Feedback for the advisor"}
                              <textarea
                                aria-label={
                                  user.role === "it"
                                    ? "Publishing note (optional)"
                                    : "Feedback for the advisor"
                                }
                                rows={5}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={
                                  user.role === "it"
                                    ? "Published URL or implementation details…"
                                    : "Explain what needs to change and why…"
                                }
                              />
                            </label>
                            {user.role === "compliance" ? (
                              <>
                                <button
                                  className="primary"
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () => act(user, request, "approve", note),
                                      "Approved and added to the IT publishing queue",
                                    )
                                  }
                                >
                                  <Check size={16} /> Approve & send to IT
                                </button>
                                <button
                                  disabled={busy || !note.trim()}
                                  onClick={() =>
                                    run(
                                      () => act(user, request, "return", note),
                                      "Returned with feedback to the advisor",
                                    )
                                  }
                                >
                                  Request changes
                                </button>
                              </>
                            ) : (
                              <button
                                className="primary"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => act(user, request, "publish", note),
                                    "Marked as manually published",
                                  )
                                }
                              >
                                <Check size={16} /> Confirm manually published
                              </button>
                            )}
                          </>
                        )}
                        {user.role === "it" &&
                          ["approved", "published"].includes(
                            request.status,
                          ) && (
                            <button
                              onClick={() => {
                                const blob = new Blob(
                                  [
                                    JSON.stringify(
                                      {
                                        ...request,
                                        organization:
                                          request.organization_description ||
                                          data.organization,
                                      },
                                      null,
                                      2,
                                    ),
                                  ],
                                  { type: "application/json" },
                                );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `advisor-v${request.version}-approved.json`;
                                a.click();
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              }}
                            >
                              <Download size={16} /> Download approved content
                            </button>
                          )}
                        {advisor && request.status === "returned" && (
                          <button
                            className="primary"
                            onClick={() => setView("editor")}
                          >
                            Revise your draft <ArrowRight size={16} />
                          </button>
                        )}
                      </section>
                      <section className="card timeline">
                        <h3>Version activity</h3>
                        {data.events
                          .filter((e) => e.request_id === request.id)
                          .map((e) => (
                            <div key={e.id}>
                              <span className="timeline-dot" />
                              <b>{e.actor_name}</b>
                              <p>{e.action}</p>
                              <small>{date(e.created_at)}</small>
                            </div>
                          ))}
                      </section>
                    </div>
                  </div>
                </>
              ) : (
                <section className="card">
                  <div className="filters">
                    <input
                      aria-label="Search submissions"
                      placeholder="Search advisor or version…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="Filter submissions"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  {requestList(visible)}
                </section>
              )}
            </>
          )}
          {view === "inbox" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">KEEP THE CONVERSATION MOVING</span>
                  <h1>
                    Your inbox{" "}
                    <span className="muted">
                      {unread > 0 ? `(${unread})` : ""}
                    </span>
                  </h1>
                  <p>
                    Compliance notes, approval updates, and publishing
                    confirmations.
                  </p>
                </div>
              </div>
              <section className="card">
                {messages.length ? (
                  messages.map((m) => (
                    <div
                      className={"message " + (!m.read_at ? "unread" : "")}
                      key={m.id}
                    >
                      <span className="avatar">
                        <Inbox size={19} />
                      </span>
                      <div>
                        <b>
                          {m.body.startsWith("David")
                            ? "David · Compliance"
                            : m.body.startsWith("Keith")
                              ? "Keith · IT"
                              : "Submission update"}
                        </b>
                        <p>{m.body}</p>
                        <small>{date(m.created_at)}</small>
                        <div className="actions">
                          <button
                            className="text-btn"
                            onClick={() => {
                              run(() => markRead(m.id));
                              open(
                                data.requests.find(
                                  (r) => r.id === m.request_id,
                                ),
                              );
                            }}
                          >
                            View submission <ArrowRight size={14} />
                          </button>
                          {!m.read_at && (
                            <button
                              className="text-btn"
                              onClick={() => run(() => markRead(m.id))}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    <Inbox size={28} />
                    <h3>You’re all caught up</h3>
                    <p>Your feedback and status updates will appear here.</p>
                  </div>
                )}
              </section>
            </>
          )}
          {view === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A CLEAR RECORD</span>
                  <h1>Activity history</h1>
                  <p>
                    Submissions, compliance decisions, and publishing updates.
                  </p>
                </div>
              </div>
              <section className="card timeline">
                {data.events.filter((e) =>
                  requests.some((r) => r.id === e.request_id),
                ).length ? (
                  data.events
                    .filter((e) => requests.some((r) => r.id === e.request_id))
                    .map((e) => (
                      <div key={e.id}>
                        <span className="timeline-dot" />
                        <b>{e.actor_name}</b>
                        <p>{e.action}</p>
                        <small>{date(e.created_at)}</small>
                        <button
                          className="text-btn"
                          onClick={() =>
                            open(requests.find((r) => r.id === e.request_id))
                          }
                        >
                          View version <ArrowRight size={14} />
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="empty">
                    <History size={28} />
                    <h3>A fresh start</h3>
                    <p>Your workflow activity will be recorded here.</p>
                  </div>
                )}
              </section>
            </>
          )}
          <footer>
            <span>KEYBASE FINANCIAL GROUP</span>
            <span>Advisor portal</span>
          </footer>
        </div>
        {preview && (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Advisor page preview"
          >
            <div className="modal-inner">
              <div className="modal-head">
                <b>Advisor page · Draft preview</b>
                <button
                  aria-label="Close preview"
                  onClick={() => setPreview(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <Preview page={page} organization={data.organization} />
            </div>
          </div>
        )}
      </div>
    </AppShellClient>
  );
}
