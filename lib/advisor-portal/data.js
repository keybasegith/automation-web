import { createClient } from "@supabase/supabase-js";
import {
  EMPTY_PAGE,
  DEFAULT_STATS,
  lockBranding,
  COMPANY_DESCRIPTION,
  transition,
  validatePage,
  newAdvisorDraft,
} from "./workflow";
export function createPortalApi(demo = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase =
    !demo && url && key
      ? createClient(url, key, {
          auth: { storageKey: "keybase-advisor-portal-auth" },
        })
      : null;
  if (!demo && !supabase)
    throw Error("Supabase is not configured for the advisor portal.");
  const storageKey = "keybase-advisor-portal-template-demo-v1";
  const profiles = [
    { id: "advisor-demo", name: "Johnathan Leung", role: "advisor" },
    { id: "compliance-demo", name: "David", role: "compliance" },
    { id: "it-demo", name: "Keith", role: "it" },
  ];
  function read() {
    const saved = localStorage.getItem(storageKey);
    return saved
      ? JSON.parse(saved)
      : {
          profiles,
          drafts: { "advisor-demo": structuredClone(EMPTY_PAGE) },
          requests: [],
          messages: [],
          events: [],
        };
  }
  function write(s) {
    localStorage.setItem(storageKey, JSON.stringify(s));
  }
  async function check(p) {
    const { data, error } = await p;
    if (error) throw error;
    return data;
  }
  async function getData(user) {
    if (!supabase) {
      const s = read();
      const requests = s.requests.filter(r => user.role === 'compliance' || (user.role === 'advisor' && r.advisor_id === user.id) || (user.role === 'it' && ['approved','published'].includes(r.status)));
      return {
        ...s,
        requests,
        events: s.events.filter(e => requests.some(r => r.id === e.request_id)),
        messages: s.messages.filter(m => m.recipient_id === user.id),
        draft: s.drafts[user.id] || EMPTY_PAGE,
        organization: COMPANY_DESCRIPTION,
      };
    }
    const [drafts, requests, messages, events, org, people] = await Promise.all(
      [
        check(
          supabase.from("portal_drafts").select("*").eq("advisor_id", user.id),
        ),
        check(
          supabase
            .from("portal_requests")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
        check(
          supabase
            .from("portal_messages")
            .select("*")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false }),
        ),
        check(
          supabase
            .from("portal_events")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
        check(
          supabase.from("portal_organization").select("*").eq("id", 1).single(),
        ),
        check(supabase.from("portal_profiles").select("*")),
      ],
    );
    return {
      draft: lockBranding(drafts[0]?.content ? { ...drafts[0].content, stats: drafts[0].content.stats?.length ? drafts[0].content.stats : structuredClone(DEFAULT_STATS) } : newAdvisorDraft(user)),
      requests,
      messages,
      events,
      profiles: people,
      organization: org.description,
      organizationReady: org.ready,
    };
  }
  async function saveDraft(user, content) {
    content = lockBranding(content);
    if (supabase)
      return check(supabase.rpc("portal_save_draft", { p_content: content }));
    const s = read();
    s.drafts[user.id] = content;
    write(s);
  }
  async function submit(user, content) {
    content = lockBranding(content);
    validatePage(content);
    if (supabase)
      return check(supabase.rpc("portal_submit", { p_content: content }));
    const s = read();
    if (
      s.requests.some(
        (r) =>
          r.advisor_id === user.id &&
          ["submitted", "approved"].includes(r.status),
      )
    )
      throw Error(
        "Complete your pending request before submitting another version.",
      );
    const r = {
      id: crypto.randomUUID(),
      advisor_id: user.id,
      advisor_name: content.name,
      content: structuredClone(content),
      baseline:
        s.requests.find(
          (r) => r.advisor_id === user.id && r.status === "published",
        )?.content || {},
      status: "submitted",
      created_at: new Date().toISOString(),
      version: s.requests.filter((r) => r.advisor_id === user.id).length + 1,
    };
    s.requests.unshift(r);
    s.drafts[user.id] = content;
    s.events.unshift({
      id: crypto.randomUUID(),
      request_id: r.id,
      actor_name: user.name,
      action: "Submitted for compliance review",
      created_at: r.created_at,
    });
    s.messages.unshift({
      id: crypto.randomUUID(),
      recipient_id: "compliance-demo",
      request_id: r.id,
      body: `${user.name} submitted version ${r.version} for review.`,
      created_at: r.created_at,
    });
    write(s);
    return r.id;
  }
  async function act(user, request, action, note) {
    if (supabase)
      return check(
        supabase.rpc("portal_transition", {
          p_request_id: request.id,
          p_action: action,
          p_note: note,
        }),
      );
    const s = read();
    const i = s.requests.findIndex((r) => r.id === request.id);
    s.requests[i] = transition(s.requests[i], user.role, action, note);
    const body =
      action === "approve"
        ? `David approved version ${request.version}. Keith can now publish it.${note ? " " + note : ""}`
        : action === "return"
          ? `David requested changes to version ${request.version}: ${note}`
          : `Keith marked version ${request.version} as manually published.${note ? " " + note : ""}`;
    for (const id of [
      request.advisor_id,
      ...(action === "approve" ? ["it-demo"] : []),
    ])
      s.messages.unshift({
        id: crypto.randomUUID(),
        recipient_id: id,
        request_id: request.id,
        body,
        created_at: new Date().toISOString(),
      });
    s.events.unshift({
      id: crypto.randomUUID(),
      request_id: request.id,
      actor_name: user.name,
      action: body,
      created_at: new Date().toISOString(),
    });
    write(s);
  }
  async function markRead(id) {
    if (supabase)
      return check(supabase.rpc("portal_mark_read", { p_message_id: id }));
    const s = read();
    s.messages = s.messages.map((m) =>
      m.id === id ? { ...m, read_at: new Date().toISOString() } : m,
    );
    write(s);
  }
  async function profile(id) {
    return check(
      supabase.from("portal_profiles").select("*").eq("id", id).single(),
    );
  }
  return {
    supabase,
    getData,
    saveDraft,
    submit,
    act,
    markRead,
    profile,
    demoProfiles: profiles,
  };
}
