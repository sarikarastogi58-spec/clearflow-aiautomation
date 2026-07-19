"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Lead = {
  id: string; name: string; category: string; city: string; rating: number;
  reviewCount: number; score: number; priority: string; stage: string;
  gaps?: string[]; pitchAngle?: string; phone?: string; websiteUrl?: string | null;
  email?: string; address?: string; placeId?: string; mapsUrl?: string;
};

type DiscoveredPlace = Omit<Lead, "id" | "score" | "priority" | "stage"> & {
  placeId: string; source: "apify"; websiteStatus: "none" | "weak"; preferred: boolean;
};

type ProviderId = "openai" | "apify" | "gmail" | "twilio";
type ConnectionState = { id: ProviderId; connected: boolean; configured: boolean; lastTestedAt: string | null; lastError: string | null };
type ConnectionField = { key: string; label: string; required?: boolean; hint?: string; type?: "password" | "text" | "email" };
type ConnectionOption = { id: ProviderId; icon: string; name: string; use: string; required: boolean; helpUrl: string; fields: ConnectionField[] };
type Metrics = { total: number; high: number; sent: number; replies: number; interested: number; won: number; conversionRate: number };

const connectionOptions: ConnectionOption[] = [
  { id: "openai", icon: "AI", name: "OpenAI", use: "Hinglish support and personalized replies", required: true, helpUrl: "https://platform.openai.com/api-keys", fields: [
    { key: "OPENAI_API_KEY", label: "OpenAI API key", required: true, hint: "Create a fresh project key. The earlier key shared in chat should remain revoked." },
    { key: "OPENAI_MODEL", label: "Model", type: "text", hint: "Optional. Defaults to gpt-5-mini." },
  ] },
  { id: "apify", icon: "AP", name: "Apify", use: "Multi-city local business discovery", required: true, helpUrl: "https://console.apify.com/account/integrations", fields: [
    { key: "APIFY_API_TOKEN", label: "Apify API token", required: true, hint: "Use a personal API token from Apify Integrations." },
    { key: "APIFY_ACTOR_ID", label: "Google Places actor ID", type: "text", hint: "Optional. Defaults to compass~crawler-google-places." },
  ] },
  { id: "gmail", icon: "G", name: "Gmail", use: "Personalized email sending and reply sync", required: true, helpUrl: "https://console.cloud.google.com/apis/credentials", fields: [
    { key: "GOOGLE_CLIENT_ID", label: "Google OAuth client ID", required: true, type: "text", hint: "Enable Gmail API and create a Web application OAuth client." },
    { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth client secret", required: true, hint: "Authorized redirect URI: https://clearflow-cws-india.sarikarastogi58.chatgpt.site/api/oauth/gmail/callback" },
  ] },
  { id: "twilio", icon: "T", name: "Twilio Calls + SMS", use: "AI phone calls, SMS outreach and delivery tracking", required: true, helpUrl: "https://console.twilio.com/", fields: [
    { key: "TWILIO_ACCOUNT_SID", label: "Account SID", required: true, type: "text" },
    { key: "TWILIO_AUTH_TOKEN", label: "Auth token", required: true },
    { key: "TWILIO_SMS_FROM", label: "SMS sender / number", required: true, type: "text", hint: "For India, review Twilio international routing or complete domestic DLT registration." },
    { key: "TWILIO_VOICE_FROM", label: "Voice caller ID", required: true, type: "text", hint: "Use a Twilio number or verified outbound caller ID." },
    { key: "TWILIO_MESSAGING_SERVICE_SID", label: "Messaging Service SID", type: "text", hint: "Optional. When present, this is used instead of the SMS sender field." },
  ] },
];

const emptyMetrics: Metrics = { total: 0, high: 0, sent: 0, replies: 0, interested: 0, won: 0, conversionRate: 0 };
const nav = [
  ["overview", "⌂", "Overview"], ["leads", "◎", "Lead CRM"], ["inbox", "✦", "AI Inbox"],
  ["campaigns", "↗", "Campaigns"], ["settings", "⚙", "Connections"],
];

export function Dashboard() {
  const [section, setSection] = useState("overview");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [dataLoading, setDataLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [discoverModal, setDiscoverModal] = useState(false);
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/leads"), fetch("/api/analytics")]).then(async ([leadRes, metricRes]) => {
      if (leadRes.ok) {
        const leadData = await leadRes.json() as { leads: Lead[] };
        if (active) setLeads(leadData.leads);
      }
      if (metricRes.ok) {
        const metricData = await metricRes.json() as Metrics;
        if (active) setMetrics(metricData);
      }
    }).catch(() => undefined).finally(() => { if (active) setDataLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const gmail = parameters.get("gmail");
    if (!gmail) return;
    window.history.replaceState({}, "", window.location.pathname);
    const show = window.setTimeout(() => {
      setSection("settings");
      setToast(gmail === "connected" ? "Gmail authorized successfully" : parameters.get("message") ?? "Gmail authorization failed");
    }, 0);
    const hide = window.setTimeout(() => setToast(""), 3200);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  const filtered = useMemo(() => leads.filter((lead) =>
    (priority === "all" || lead.priority === priority) &&
    `${lead.name} ${lead.category} ${lead.city}`.toLowerCase().includes(query.toLowerCase())), [leads, query, priority]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3200); }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><div><b>ClearFlow</b><small>by Clear Web Solutions</small></div></div>
        <nav>{nav.map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><span>{icon}</span>{label}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="ai-status"><i></i><div><b>AI core online</b><small>OpenAI + Apify ready</small></div></div>
          <div className="profile"><span>AK</span><div><b>Agency Admin</b><small>Clear Web Solutions</small></div><em>•••</em></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSection("overview")}>C</button>
          <div><p>Live operations</p><h1>{nav.find((item) => item[0] === section)?.[2]}</h1></div>
          <div className="top-actions"><span className="mode"><i></i>Live workspace</span><button className="icon-button" aria-label="Notifications">♢</button><button className="primary" onClick={() => setModal(true)}>＋ Add lead</button></div>
        </header>

        {section === "overview" && <Overview metrics={metrics} leads={leads} loading={dataLoading} openLeads={() => setSection("leads")} onDiscover={() => setDiscoverModal(true)} />}
        {section === "leads" && <LeadCRM leads={filtered} pipelineLeads={leads} query={query} setQuery={setQuery} priority={priority} setPriority={setPriority} onAdd={() => setModal(true)} onDiscover={() => setDiscoverModal(true)} onContact={setContactLead} />}
        {section === "inbox" && <AIInbox flash={flash} />}
        {section === "campaigns" && <Campaigns metrics={metrics} flash={flash} />}
        {section === "settings" && <Connections flash={flash} />}

        <nav className="mobile-nav">{nav.slice(0, 4).map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><span>{icon}</span>{label}</button>)}</nav>
      </main>
      {modal && <AddLeadModal close={() => setModal(false)} onCreated={(lead) => { setLeads((current) => [lead, ...current]); setMetrics((current) => ({ ...current, total: current.total + 1, high: current.high + (lead.score >= 75 ? 1 : 0) })); setModal(false); flash("Lead scored and added to CRM"); }} flash={flash} />}
      {discoverModal && <DiscoveryModal close={() => setDiscoverModal(false)} onImported={(imported) => { setLeads((current) => [...imported, ...current]); setMetrics((current) => ({ ...current, total: current.total + imported.length, high: current.high + imported.filter((lead) => lead.score >= 75).length })); setDiscoverModal(false); flash(`${imported.length} Apify leads scored and added to CRM`); }} flash={flash} />}
      {contactLead && <OutreachModal lead={contactLead} close={() => setContactLead(null)} sent={(message) => { setContactLead(null); setLeads((current) => current.map((lead) => lead.id === contactLead.id ? { ...lead, stage: "contacted" } : lead)); flash(message); }} flash={flash} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function Overview({ metrics, leads, loading, openLeads, onDiscover }: { metrics: Metrics; leads: Lead[]; loading: boolean; openLeads: () => void; onDiscover: () => void }) {
  const firstUse = !loading && leads.length === 0;
  const cards = [
    ["Total leads", metrics.total, "Live", "in CRM", "◎"], ["High-quality", metrics.high, "Live", "score 75+", "✦"],
    ["Replies", metrics.replies, "Live", `${metrics.sent} sent`, "↩"], ["Interested", metrics.interested, "Live", "sales ready", "♥"],
  ];
  const funnel = [metrics.total, metrics.high, metrics.replies, metrics.interested, metrics.won];
  const funnelMax = Math.max(1, ...funnel);
  return <div className="content">
    <section className="welcome"><div><span>AI AUTOMATION CONTROL CENTRE</span><h2>{firstUse ? "Your live workspace is ready." : "Your real pipeline, in one place."}</h2><p>{firstUse ? "Start by discovering qualified local businesses with Apify." : <><b>{metrics.total} leads</b> are stored in your ClearFlow CRM.</>}</p></div><div className="welcome-orb"><span>LIVE</span><small>private workspace</small></div></section>
    {firstUse && <div className="first-use-banner"><div><span>FIRST USE</span><b>No sample data is being shown.</b> Run a small discovery to create your first scored lead.</div><button onClick={onDiscover}>Discover restaurants</button></div>}
    <section className="metrics">{cards.map(([label, value, change, detail, icon]) => <article key={String(label)}><div className="metric-top"><span>{icon}</span><em>{change}</em></div><h3>{value}</h3><p>{label}</p><small>{detail}</small></article>)}</section>
    <div className="overview-grid">
      <section className="panel performance"><PanelTitle title="Pipeline performance" sub="Current live totals" action="Open CRM" onAction={openLeads} />
        <div className="chart"><div className="y-labels"><span>{funnelMax}</span><span>{Math.round(funnelMax / 2)}</span><span>0</span></div><div className="chart-area"><i className="grid g1"></i><i className="grid g2"></i><i className="grid g3"></i><div className="bars">{funnel.map((value, i) => <span key={i} style={{ height: `${Math.max(value ? 8 : 2, (value / funnelMax) * 100)}%` }}><b></b></span>)}</div><div className="x-labels"><span>Leads</span><span>High</span><span>Replies</span><span>Warm</span><span>Won</span></div></div></div>
        <div className="legend"><span><i className="orange"></i>Qualified leads</span><span><i></i>Replies</span><b>{metrics.conversionRate}% conversion</b></div>
      </section>
      <section className="panel activity"><PanelTitle title="Live activity" sub="Latest CRM records" action="See CRM" onAction={openLeads} />
        <div className="activity-list">{leads.slice(0, 4).map((lead) => <Activity key={lead.id} icon="✦" color={lead.priority === "high" ? "orange" : "purple"} title={`${lead.name} scored ${lead.score}/100`} detail={`${lead.category} · ${lead.city} · ${lead.stage}`} time="CRM" />)}{!leads.length && <div className="empty">Your first discovery will appear here.</div>}</div>
      </section>
    </div>
    <section className="panel lead-table-panel"><PanelTitle title="Priority opportunities" sub="Highest-scoring leads to work next" action="Open CRM" onAction={openLeads} /><LeadTable leads={leads.slice(0, 5)} /></section>
  </div>;
}

function PanelTitle({ title, sub, action, onAction }: { title: string; sub: string; action: string; onAction?: () => void }) {
  return <div className="panel-title"><div><h3>{title}</h3><p>{sub}</p></div><button onClick={onAction}>{action} →</button></div>;
}

function Activity({ icon, color, title, detail, time }: { icon: string; color: string; title: string; detail: string; time: string }) {
  return <div className="activity-item"><span className={color}>{icon}</span><div><b>{title}</b><p>{detail}</p></div><small>{time}</small></div>;
}

function LeadCRM({ leads, pipelineLeads, query, setQuery, priority, setPriority, onAdd, onDiscover, onContact }: { leads: Lead[]; pipelineLeads: Lead[]; query: string; setQuery: (s: string) => void; priority: string; setPriority: (s: string) => void; onAdd: () => void; onDiscover: () => void; onContact: (lead: Lead) => void }) {
  const count = (stages: string[]) => pipelineLeads.filter((lead) => stages.includes(lead.stage)).length;
  return <div className="content"><section className="page-intro"><div><span>SMART CRM</span><h2>Every opportunity, clearly prioritized.</h2><p>Scores are evidence-based. Outreach stays locked until consent is recorded.</p></div><div className="intro-actions"><button onClick={onDiscover}>◎ Discover with Apify</button><button className="primary" onClick={onAdd}>＋ New lead</button></div></section>
    <section className="pipeline-summary"><div><small>RESEARCHED</small><b>{count(["researched"])}</b><i></i></div><div><small>CONTACTED</small><b>{count(["contacted"])}</b><i></i></div><div><small>WARM</small><b>{count(["warm", "replied"])}</b><i></i></div><div><small>BOOKED</small><b>{count(["booked"])}</b><i></i></div><div><small>WON</small><b>{count(["won"])}</b><i></i></div></section>
    <section className="panel lead-table-panel"><div className="filters"><label>⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search businesses, cities…" /></label><div>{["all", "high", "medium", "low"].map((item) => <button key={item} className={priority === item ? "active" : ""} onClick={() => setPriority(item)}>{item}</button>)}</div><button className="filter-button">☷ More filters</button></div><LeadTable leads={leads} detailed onContact={onContact} /></section>
  </div>;
}

function LeadTable({ leads, detailed = false, onContact }: { leads: Lead[]; detailed?: boolean; onContact?: (lead: Lead) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Business</th><th>Location</th><th>Proof</th><th>Score</th><th>Status</th>{detailed && <th>Opportunity</th>}<th></th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><div className="business-cell"><span>{lead.name.slice(0, 1)}</span><div><b>{lead.name}</b><small>{lead.category}</small></div></div></td><td>{lead.city}</td><td><div className="rating">★ {lead.rating ?? "—"}<small>{lead.reviewCount ?? 0} reviews</small></div></td><td><div className={`score ${lead.priority}`}><b>{lead.score}</b><span><i style={{ width: `${lead.score}%` }}></i></span></div></td><td><span className={`stage ${lead.stage}`}>{lead.stage.replace("_", " ")}</span></td>{detailed && <td><small className="gap">{lead.gaps?.[0] ?? "Needs review"}</small></td>}<td><button className="row-action" aria-label={`Contact ${lead.name}`} onClick={() => onContact?.(lead)}>{onContact ? "Contact" : "•••"}</button></td></tr>)}</tbody></table>{!leads.length && <div className="empty">No live leads yet. Use Discover with Apify to import the first batch.</div>}</div>;
}

function AIInbox({ flash }: { flash: (s: string) => void }) {
  const [input, setInput] = useState(""); const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Array<{ from: string; text: string; time: string }>>([]);
  async function send(e: FormEvent) { e.preventDefault(); if (!input.trim()) return; const text = input; setInput(""); setMessages((m) => [...m, { from: "customer", text, time: "now" }]); setSending(true);
    try { const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setMessages((m) => [...m, { from: "ai", text: data.reply, time: "now" }]); }
    catch (error) { flash(error instanceof Error ? error.message : "AI connection unavailable"); } finally { setSending(false); }
  }
  return <div className="content inbox-page"><section className="inbox-list panel"><div className="inbox-head"><div><h3>AI test console</h3><p>Uses your live OpenAI connection</p></div></div><button className="conversation active"><span>C</span><div><b>ClearFlow assistant</b><p>No customer is contacted from this screen</p></div><small>LIVE</small></button></section>
    <section className="chat panel"><div className="chat-head"><div className="business-cell"><span>C</span><div><b>ClearFlow AI test</b><small><i></i> Private test session</small></div></div></div><div className="ai-note">✦ Test English, Hindi, or Hinglish replies here. This does not send email, SMS, or calls.</div><div className="messages">{!messages.length && <div className="empty">Type a customer question below to test the live assistant.</div>}{messages.map((message, i) => <div className={`message ${message.from}`} key={i}><p>{message.text}</p><small>{message.from === "ai" && "✦ AI · "}{message.time}</small></div>)}{sending && <div className="typing">AI is typing <i></i><i></i><i></i></div>}</div><form className="composer" onSubmit={send}><button type="button">＋</button><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Restaurant website ka price kya hai?" /><button type="submit">Test AI ↗</button></form></section>
    <aside className="contact-card panel"><div className="contact-cover"><span>AI</span></div><h3>Safe first-use test</h3><p>Private · No outreach</p><div className="mini-score"><b>✓</b><div><strong>Prompt guardrails active</strong><small>Natural Hindi and Hinglish</small></div></div><dl><dt>Service range</dt><dd>₹999–₹18,999</dd><dt>Channels</dt><dd><span>Test chat</span><span>Gmail</span><span>Twilio</span></dd><dt>Next step</dt><dd>Connect Gmail and Twilio before real outreach.</dd></dl></aside>
  </div>;
}

function Campaigns({ metrics, flash }: { metrics: Metrics; flash: (s: string) => void }) {
  return <div className="content"><section className="page-intro"><div><span>CONSENT-FIRST OUTREACH</span><h2>Real outreach, without sample campaigns.</h2><p>Select Contact on a CRM lead after Gmail or Twilio is connected and channel-specific consent is recorded.</p></div><button className="primary" onClick={() => flash("Open Lead CRM and select Contact on an eligible lead")}>Open first campaign</button></section>
    <section className="metrics compact"><article><div className="metric-top"><span>↗</span><em>Live</em></div><h3>{metrics.sent}</h3><p>Messages sent</p><small>Gmail + Twilio</small></article><article><div className="metric-top"><span>↩</span><em>Live</em></div><h3>{metrics.replies}</h3><p>Replies received</p><small>inbound tracked</small></article><article><div className="metric-top"><span>♥</span><em>Live</em></div><h3>{metrics.interested}</h3><p>Interested leads</p><small>warm, booked or won</small></article><article><div className="metric-top"><span>✓</span><em>Live</em></div><h3>{metrics.won}</h3><p>Won leads</p><small>{metrics.conversionRate}% conversion</small></article></section>
    <section className="campaign-grid"><article className="campaign-card draft"><div><span>READY</span><small>Automation</small></div><h3>Consent-gated first outreach</h3><p>Every email, SMS, or call requires recorded proof before ClearFlow contacts a lead.</p><div className="checklist"><p>✓ Six-hour per-lead rate limit</p><p>✓ Automatic STOP suppression</p><p>✓ Delivery and reply tracking</p></div><footer><small>Use Lead CRM → Contact</small></footer></article><article className="campaign-card draft"><div><span>READY</span><small>Follow-ups</small></div><h3>3-day and 7-day sequence</h3><p>Follow-ups are queued after successful email or SMS delivery and cancelled automatically after a reply.</p><div className="checklist"><p>✓ Reply cancellation</p><p>✓ Warm-lead detection</p><p>✓ Provider retry handling</p></div><footer><small>Requires Gmail or Twilio connection</small></footer></article></section>
  </div>;
}

function Connections({ flash }: { flash: (s: string) => void }) {
  const [statuses, setStatuses] = useState<Record<string, ConnectionState>>({});
  const [selected, setSelected] = useState<ConnectionOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultReady, setVaultReady] = useState(true);

  async function refresh() {
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      const data = await response.json() as { connections?: ConnectionState[]; vaultReady?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load connection status");
      setStatuses(Object.fromEntries((data.connections ?? []).map((item) => [item.id, item])));
      setVaultReady(data.vaultReady !== false);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not load connection status");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/connections", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { connections?: ConnectionState[]; vaultReady?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load connection status");
      if (active) {
        setStatuses(Object.fromEntries((data.connections ?? []).map((item) => [item.id, item])));
        setVaultReady(data.vaultReady !== false);
      }
    }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="content"><section className="page-intro"><div><span>CONNECTION CENTRE</span><h2>Connect your services securely.</h2><p>Open a provider, enter its credentials, and ClearFlow will verify or authorize the connection before saving.</p></div></section><div className="security-callout"><span>▣</span><div><b>Your credentials are encrypted</b><p>Secrets are sent over HTTPS, encrypted before storage, and never returned to the browser, AI context, analytics, logs, or GitHub.</p></div></div>{!vaultReady && !loading && <div className="connection-warning">Secure storage is being initialized. Please try again after the latest update finishes publishing.</div>}<section className="connections">{connectionOptions.map((item, index) => { const status = statuses[item.id]; return <article key={item.id} className={status?.connected ? "connected" : ""}><span className={`connection-icon c${index}`}>{item.icon}</span><div><h3>{item.name}</h3><p>{item.use}</p><span className={`connection-state ${status?.connected ? "is-connected" : status?.lastError ? "has-error" : ""}`}><i></i>{loading ? "Checking…" : status?.connected ? "Connected and verified" : status?.lastError ? "Needs attention" : "Not connected"}</span></div><button onClick={() => setSelected(item)} disabled={loading}>{status?.connected ? "Manage" : item.id === "gmail" ? "Authorize" : "Add key"}</button><i className={item.required ? "required" : "optional"}>{item.required ? "Required" : "Optional"}</i></article>; })}</section><section className="panel launch-check"><PanelTitle title="Launch checklist" sub="Provider approvals need to be completed once" action="Connect OpenAI" onAction={() => setSelected(connectionOptions[0])} /><div><p><span>1</span><b>Connect core services</b><small>OpenAI, Apify, Gmail and Twilio</small></p><p><span>2</span><b>Authorize the Gmail mailbox</b><small>Google OAuth enables sending and reply sync</small></p><p><span>3</span><b>Configure Twilio compliance</b><small>Voice consent and India SMS routing or DLT</small></p><p><span>4</span><b>Run safe test conversations</b><small>Email, SMS, call, opt-out and handoff</small></p></div></section>{selected && <ConnectionModal option={selected} status={statuses[selected.id]} close={() => setSelected(null)} saved={async () => { await refresh(); setSelected(null); flash(`${selected.name} connected successfully`); }} flash={flash} />}</div>;
}

function ConnectionModal({ option, status, close, saved, flash }: { option: ConnectionOption; status?: ConnectionState; close: () => void; saved: () => Promise<void>; flash: (s: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(status?.lastError ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value).trim()]));
    try {
      const response = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: option.id, values }) });
      const data = await response.json() as { error?: string; authorizationRequired?: boolean; authorizationUrl?: string };
      if (!response.ok) throw new Error(data.error ?? "Connection test failed");
      if (data.authorizationRequired && data.authorizationUrl) { window.location.assign(data.authorizationUrl); return; }
      form.reset(); await saved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Connection test failed"); }
    finally { setSaving(false); }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect ${option.name}? Saved credentials for this provider will be permanently removed.`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/connections?provider=${option.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not disconnect provider");
      close(); flash(`${option.name} disconnected`); window.location.reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not disconnect provider"); setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={close}><form className="modal connection-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} autoComplete="off"><div className="modal-head"><div><span>{status?.connected ? "MANAGE CONNECTION" : "SECURE CONNECTION"}</span><h2>{option.name}</h2><p>{option.id === "gmail" ? "Credentials are encrypted first, then Google opens its secure authorization screen." : `Credentials are verified with ${option.name} before encrypted storage.`}</p></div><button type="button" onClick={close}>×</button></div><div className="connection-form">{status?.configured && <div className="saved-secret-note"><b>Saved credentials are hidden</b><span>Leave a field blank to keep its current value, or enter a replacement.</span></div>}{option.fields.map((field) => <label key={field.key}>{field.label}{field.required && <em>Required</em>}<input name={field.key} type={field.type ?? "password"} required={Boolean(field.required && !status?.configured)} placeholder={status?.configured ? "Saved securely — enter only to replace" : field.required ? "Enter credential" : "Optional"} autoComplete="new-password" />{field.hint && <small>{field.hint}</small>}</label>)}{error && <div className="connection-error"><b>Connection not saved</b><span>{error}</span></div>}<a href={option.helpUrl} target="_blank" rel="noreferrer">Open {option.name} setup ↗</a></div><footer>{status?.connected && <button type="button" className="danger" onClick={disconnect} disabled={saving}>Disconnect</button>}<button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving ? option.id === "gmail" ? "Preparing Google…" : "Testing securely…" : option.id === "gmail" ? "Save & authorize Gmail" : status?.connected ? "Test & update" : "Test & connect"}</button></footer></form></div>;
}

function OutreachModal({ lead, close, sent, flash }: { lead: Lead; close: () => void; sent: (message: string) => void; flash: (s: string) => void }) {
  const [channel, setChannel] = useState<"email" | "sms" | "voice">("email");
  const [destination, setDestination] = useState(lead.email ?? "");
  const [saving, setSaving] = useState(false);

  function changeChannel(next: "email" | "sms" | "voice") {
    setChannel(next); setDestination(next === "email" ? lead.email ?? "" : lead.phone ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const consentResponse = await fetch("/api/consents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, channel, source: "operator_verified", proof: values.proof }) });
      const consent = await consentResponse.json() as { error?: string };
      if (!consentResponse.ok) throw new Error(consent.error ?? "Consent proof could not be recorded");
      const outreachResponse = await fetch("/api/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, channel, to: destination, subject: values.subject, body: values.body }) });
      const outreach = await outreachResponse.json() as { error?: string; status?: string };
      if (!outreachResponse.ok) throw new Error(outreach.error ?? "Outreach could not be sent");
      sent(channel === "voice" ? "Twilio call queued successfully" : `${channel === "email" ? "Gmail email" : "Twilio SMS"} sent successfully`);
    } catch (error) { flash(error instanceof Error ? error.message : "Outreach failed"); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={close}><form className="modal outreach-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span>CONSENT-FIRST OUTREACH</span><h2>Contact {lead.name}</h2><p>Choose Gmail, Twilio SMS, or an AI-assisted Twilio call.</p></div><button type="button" onClick={close}>×</button></div><div className="form-grid"><label>Channel<select value={channel} onChange={(event) => changeChannel(event.target.value as "email" | "sms" | "voice")}><option value="email">Gmail email</option><option value="sms">Twilio SMS</option><option value="voice">Twilio call</option></select></label><label>{channel === "email" ? "Recipient email" : "Phone number"}<input value={destination} onChange={(event) => setDestination(event.target.value)} type={channel === "email" ? "email" : "tel"} required placeholder={channel === "email" ? "owner@business.com" : "+91 98765 43210"} /></label>{channel === "email" && <label className="full">Subject<input name="subject" required defaultValue={`A website growth idea for ${lead.name}`} /></label>}{channel !== "voice" && <label className="full">Message<textarea name="body" required defaultValue={channel === "email" ? `Hi ${lead.name} team,\n\nI noticed an opportunity to improve how local customers discover and contact your business online. Clear Web Solutions builds focused websites and booking journeys for local businesses.\n\nWould you be open to a short consultation?\n\nRegards,\nClear Web Solutions` : `Hi ${lead.name}, Clear Web Solutions has an idea to improve your online enquiries. Would you be open to a short consultation? Reply STOP to opt out.`} /></label>}<label className="full">Consent proof<input name="proof" required placeholder="Where and when this contact explicitly agreed to this channel" /><small>Public listing contact details alone are not consent.</small></label></div><div className="modal-note">Calls and messages are sent only after you record channel-specific consent. India DLT/UCC and Twilio routing requirements still apply.</div><footer><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving ? channel === "voice" ? "Queuing call…" : "Sending…" : channel === "voice" ? "Queue Twilio call" : "Record consent & send"}</button></footer></form></div>;
}

function DiscoveryModal({ close, onImported, flash }: { close: () => void; onImported: (leads: Lead[]) => void; flash: (s: string) => void }) {
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<DiscoveredPlace[]>([]);
  const [notice, setNotice] = useState("Find independent businesses with strong reviews and no linked website.");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSearching(true); setResults([]);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { places?: DiscoveredPlace[]; storageNotice?: string; error?: string; setupRequired?: boolean };
      if (!response.ok) throw new Error(data.setupRequired ? "Connect Apify in Connections before discovering leads." : data.error ?? "Discovery failed");
      setResults(data.places ?? []); setNotice(data.storageNotice ?? "Review the results before importing.");
      if (!data.places?.length) flash("No businesses matched these filters");
    } catch (error) { flash(error instanceof Error ? error.message : "Discovery failed"); }
    finally { setSearching(false); }
  }

  async function importAll() {
    setImporting(true);
    const imported: Lead[] = []; let skipped = 0;
    for (const place of results) {
      try {
        const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(place) });
        const data = await response.json() as { lead?: Lead; error?: string };
        if (!response.ok || !data.lead) { skipped += 1; continue; }
        imported.push({ ...place, ...data.lead, category: place.category, rating: place.rating, reviewCount: place.reviewCount, stage: "researched" });
      } catch { skipped += 1; }
    }
    setImporting(false);
    if (!imported.length) { flash(skipped ? "These businesses are already in the CRM or could not be imported" : "Nothing to import"); return; }
    if (skipped) flash(`${skipped} duplicate or invalid leads skipped`);
    onImported(imported);
  }

  return <div className="modal-backdrop" onMouseDown={close}><form className="modal discovery-modal" onSubmit={search} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span>APIFY DISCOVERY</span><h2>Find local business leads</h2><p>Search a city, apply quality filters, then score and import the results.</p></div><button type="button" onClick={close}>×</button></div><div className="form-grid"><label>City<input name="city" required defaultValue="Pune" placeholder="Pune" /></label><label>Business type<select name="category" defaultValue="restaurant"><option value="restaurant">Restaurants</option><option value="cafe">Cafés</option><option value="salon">Salons</option><option value="gym">Gyms</option><option value="clinic">Clinics</option><option value="local business">Other local businesses</option></select></label><label>Maximum results<input name="maxResults" type="number" min="1" max="100" defaultValue="25" /></label><label>Minimum rating<input name="minRating" type="number" min="0" max="5" step="0.1" defaultValue="4" /></label><label>Minimum reviews<input name="minReviews" type="number" min="0" defaultValue="100" /></label><label>Website filter<select name="websiteFilter" defaultValue="missing"><option value="missing">No website linked</option><option value="any">Any website status</option></select></label></div>{results.length > 0 && <div className="discovery-results"><div><b>{results.length} qualified businesses found</b><small>{notice}</small></div><div className="discovery-list">{results.map((place) => <article key={place.placeId}><span>{place.name.slice(0, 1)}</span><div><b>{place.name}</b><small>{place.category} · {place.address || place.city}</small></div><em>★ {place.rating} · {place.reviewCount}</em><i>{place.websiteUrl ? "Website linked" : "No website"}</i></article>)}</div></div>}<div className="modal-note">Apify usage may incur charges. Verify listing data and consent before any email or SMS outreach.</div><footer><button type="button" onClick={close}>Cancel</button>{results.length > 0 && <button type="button" className="primary" onClick={importAll} disabled={importing}>{importing ? "Importing and scoring…" : `Import all ${results.length}`}</button>}<button className="primary" disabled={searching}>{searching ? "Searching Apify…" : results.length ? "Search again" : "Find leads"}</button></footer></form></div>;
}

function AddLeadModal({ close, onCreated, flash }: { close: () => void; onCreated: (lead: Lead) => void; flash: (s: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setSaving(true); const fd = new FormData(e.currentTarget); const body = Object.fromEntries(fd.entries()); try { const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); onCreated({ ...data.lead, category: String(body.category), rating: Number(body.rating), reviewCount: Number(body.reviewCount), stage: "researched", gaps: data.lead.gaps }); } catch (error) { flash(error instanceof Error ? error.message : "Could not create lead"); } finally { setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><span>NEW OPPORTUNITY</span><h2>Add and score a lead</h2><p>The score is calculated from evidence, not AI guesswork.</p></div><button type="button" onClick={close}>×</button></div><div className="form-grid"><label>Business name<input name="name" required placeholder="e.g. Spice Route Café" /></label><label>Business type<select name="category"><option>Restaurant</option><option>Café</option><option>Salon</option><option>Gym</option><option>Clinic</option><option>Local Business</option></select></label><label>City<input name="city" required placeholder="Pune" /></label><label>Phone<input name="phone" placeholder="+91 98765 43210" /></label><label>Email<input name="email" type="email" placeholder="owner@business.com" /></label><label>Rating<input name="rating" type="number" min="0" max="5" step="0.1" placeholder="4.5" /></label><label>Review count<input name="reviewCount" type="number" min="0" placeholder="150" /></label><label className="full">Website URL<input name="websiteUrl" type="url" placeholder="Leave blank if no website" /></label></div><div className="modal-note">Consent is not assumed from public contact information. Outreach remains locked until proof is recorded.</div><footer><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Scoring…" : "Add & score lead"}</button></footer></form></div>;
}
