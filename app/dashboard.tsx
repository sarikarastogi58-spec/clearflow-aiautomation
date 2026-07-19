"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Lead = {
  id: string; name: string; category: string; city: string; rating: number;
  reviewCount: number; score: number; priority: string; stage: string;
  gaps?: string[]; pitchAngle?: string; phone?: string; websiteUrl?: string | null;
};

const demoLeads: Lead[] = [
  { id: "demo-1", name: "The Pepper Table", category: "Restaurant", city: "Pune", rating: 4.6, reviewCount: 428, score: 89, priority: "high", stage: "warm", gaps: ["No online booking flow", "No WhatsApp CTA"], pitchAngle: "Turn strong local interest into direct table bookings." },
  { id: "demo-2", name: "Namma Filter Coffee", category: "Café", city: "Bengaluru", rating: 4.5, reviewCount: 216, score: 82, priority: "high", stage: "contacted", gaps: ["No business website linked"], pitchAngle: "Create a fast menu-first website for local discovery." },
  { id: "demo-3", name: "Glow & Go Studio", category: "Salon", city: "Mumbai", rating: 4.4, reviewCount: 173, score: 74, priority: "medium", stage: "researched", gaps: ["Website needs a clearer conversion path"], pitchAngle: "Simplify service discovery and appointment enquiries." },
  { id: "demo-4", name: "CoreFit Arena", category: "Gym", city: "Hyderabad", rating: 4.2, reviewCount: 119, score: 68, priority: "medium", stage: "replied", gaps: ["No WhatsApp enquiry CTA found"], pitchAngle: "Convert profile visits into trial-session enquiries." },
  { id: "demo-5", name: "Dr. Mehta Dental", category: "Clinic", city: "Ahmedabad", rating: 4.7, reviewCount: 91, score: 61, priority: "medium", stage: "researched", gaps: ["No online booking flow found"], pitchAngle: "Make patient appointment requests easier." },
];

const demoMetrics = { total: 247, high: 68, sent: 184, replies: 43, interested: 19, won: 7, conversionRate: 3.8 };
const nav = [
  ["overview", "⌂", "Overview"], ["leads", "◎", "Lead CRM"], ["inbox", "✦", "AI Inbox"],
  ["campaigns", "↗", "Campaigns"], ["settings", "⚙", "Connections"],
];

export function Dashboard() {
  const [section, setSection] = useState("overview");
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [metrics, setMetrics] = useState(demoMetrics);
  const [demo, setDemo] = useState(true);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");

  useEffect(() => {
    Promise.all([fetch("/api/leads"), fetch("/api/analytics")]).then(async ([leadRes, metricRes]) => {
      if (leadRes.ok) {
        const leadData = await leadRes.json() as { leads: Lead[] };
        if (leadData.leads.length) { setLeads(leadData.leads); setDemo(false); }
      }
      if (metricRes.ok) {
        const metricData = await metricRes.json();
        if (metricData.total) { setMetrics(metricData); setDemo(false); }
      }
    }).catch(() => undefined);
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
          <div className="ai-status"><i></i><div><b>AI agent online</b><small>4 channels monitored</small></div></div>
          <div className="profile"><span>AK</span><div><b>Agency Admin</b><small>Clear Web Solutions</small></div><em>•••</em></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSection("overview")}>C</button>
          <div><p>Saturday, 18 July</p><h1>{nav.find((item) => item[0] === section)?.[2]}</h1></div>
          <div className="top-actions"><span className="mode"><i></i>{demo ? "Demo data" : "Live data"}</span><button className="icon-button" aria-label="Notifications">♢<b>3</b></button><button className="primary" onClick={() => setModal(true)}>＋ Add lead</button></div>
        </header>

        {section === "overview" && <Overview metrics={metrics} leads={leads} demo={demo} openLeads={() => setSection("leads")} />}
        {section === "leads" && <LeadCRM leads={filtered} query={query} setQuery={setQuery} priority={priority} setPriority={setPriority} onAdd={() => setModal(true)} />}
        {section === "inbox" && <AIInbox flash={flash} />}
        {section === "campaigns" && <Campaigns flash={flash} />}
        {section === "settings" && <Connections />}

        <nav className="mobile-nav">{nav.slice(0, 4).map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><span>{icon}</span>{label}</button>)}</nav>
      </main>
      {modal && <AddLeadModal close={() => setModal(false)} onCreated={(lead) => { setLeads((current) => [lead, ...current]); setModal(false); flash("Lead scored and added to CRM"); }} flash={flash} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function Overview({ metrics, leads, demo, openLeads }: { metrics: typeof demoMetrics; leads: Lead[]; demo: boolean; openLeads: () => void }) {
  const cards = [
    ["Total leads", metrics.total, "+18.2%", "this month", "◎"], ["High-quality", metrics.high, "+12.4%", "score 75+", "✦"],
    ["Replies", metrics.replies, "+8.1%", `${metrics.sent} sent`, "↩"], ["Interested", metrics.interested, "+5 leads", "sales ready", "♥"],
  ];
  return <div className="content">
    <section className="welcome"><div><span>AI AUTOMATION CONTROL CENTRE</span><h2>Good morning. Your pipeline is moving.</h2><p>ClearFlow found <b>12 new opportunities</b> and received <b>4 replies</b> since yesterday.</p></div><div className="welcome-orb"><span>24/7</span><small>AI coverage</small></div></section>
    {demo && <div className="demo-banner"><span>Preview mode</span> Add your API keys in Connections to activate live lead discovery, AI replies, and messaging.</div>}
    <section className="metrics">{cards.map(([label, value, change, detail, icon]) => <article key={String(label)}><div className="metric-top"><span>{icon}</span><em>{change}</em></div><h3>{value}</h3><p>{label}</p><small>{detail}</small></article>)}</section>
    <div className="overview-grid">
      <section className="panel performance"><PanelTitle title="Pipeline performance" sub="Last 30 days" action="View report" />
        <div className="chart"><div className="y-labels"><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="chart-area"><i className="grid g1"></i><i className="grid g2"></i><i className="grid g3"></i><div className="bars">{[34, 48, 41, 62, 54, 78, 71, 88, 68, 91, 82, 96].map((h, i) => <span key={i} style={{ height: `${h}%` }}><b></b></span>)}</div><div className="x-labels"><span>W1</span><span>W2</span><span>W3</span><span>W4</span></div></div></div>
        <div className="legend"><span><i className="orange"></i>Qualified leads</span><span><i></i>Replies</span><b>{metrics.conversionRate}% conversion</b></div>
      </section>
      <section className="panel activity"><PanelTitle title="Live activity" sub="AI agent events" action="See all" />
        <div className="activity-list"><Activity icon="↩" color="green" title="New reply from The Pepper Table" detail="Asked about restaurant website pricing" time="2m" /><Activity icon="✦" color="purple" title="Lead qualified at 89/100" detail="Namma Filter Coffee · Bengaluru" time="18m" /><Activity icon="✓" color="blue" title="Follow-up delivered" detail="Glow & Go Studio · WhatsApp" time="42m" /><Activity icon="◎" color="orange" title="12 leads discovered" detail="Restaurants in Pune" time="1h" /></div>
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

function LeadCRM({ leads, query, setQuery, priority, setPriority, onAdd }: { leads: Lead[]; query: string; setQuery: (s: string) => void; priority: string; setPriority: (s: string) => void; onAdd: () => void }) {
  return <div className="content"><section className="page-intro"><div><span>SMART CRM</span><h2>Every opportunity, clearly prioritized.</h2><p>Scores are evidence-based. Outreach stays locked until consent is recorded.</p></div><button className="primary" onClick={onAdd}>＋ New lead</button></section>
    <section className="pipeline-summary"><div><small>RESEARCHED</small><b>34</b><i></i></div><div><small>CONTACTED</small><b>21</b><i></i></div><div><small>WARM</small><b>11</b><i></i></div><div><small>BOOKED</small><b>6</b><i></i></div><div><small>WON</small><b>7</b><i></i></div></section>
    <section className="panel lead-table-panel"><div className="filters"><label>⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search businesses, cities…" /></label><div>{["all", "high", "medium", "low"].map((item) => <button key={item} className={priority === item ? "active" : ""} onClick={() => setPriority(item)}>{item}</button>)}</div><button className="filter-button">☷ More filters</button></div><LeadTable leads={leads} detailed /></section>
  </div>;
}

function LeadTable({ leads, detailed = false }: { leads: Lead[]; detailed?: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>Business</th><th>Location</th><th>Proof</th><th>Score</th><th>Status</th>{detailed && <th>Opportunity</th>}<th></th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><div className="business-cell"><span>{lead.name.slice(0, 1)}</span><div><b>{lead.name}</b><small>{lead.category}</small></div></div></td><td>{lead.city}</td><td><div className="rating">★ {lead.rating ?? "—"}<small>{lead.reviewCount ?? 0} reviews</small></div></td><td><div className={`score ${lead.priority}`}><b>{lead.score}</b><span><i style={{ width: `${lead.score}%` }}></i></span></div></td><td><span className={`stage ${lead.stage}`}>{lead.stage.replace("_", " ")}</span></td>{detailed && <td><small className="gap">{lead.gaps?.[0] ?? "Needs review"}</small></td>}<td><button className="row-action">•••</button></td></tr>)}</tbody></table>{!leads.length && <div className="empty">No leads match these filters.</div>}</div>;
}

function AIInbox({ flash }: { flash: (s: string) => void }) {
  const [input, setInput] = useState(""); const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([{ from: "customer", text: "Restaurant ke liye website kitne mein ban jayegi? Menu aur WhatsApp booking chahiye.", time: "10:32" }, { from: "ai", text: "Bilkul! Menu aur WhatsApp booking ke saath restaurant website aapke customers ke liye kaafi convenient rahegi. Hamare options ₹999–₹18,999 range mein hain. Aapka approx budget aur city bata denge?", time: "10:32" }]);
  async function send(e: FormEvent) { e.preventDefault(); if (!input.trim()) return; const text = input; setInput(""); setMessages((m) => [...m, { from: "customer", text, time: "now" }]); setSending(true);
    try { const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setMessages((m) => [...m, { from: "ai", text: data.reply, time: "now" }]); }
    catch (error) { flash(error instanceof Error ? error.message : "AI connection unavailable"); } finally { setSending(false); }
  }
  return <div className="content inbox-page"><section className="inbox-list panel"><div className="inbox-head"><div><h3>Conversations</h3><p>4 need attention</p></div><button>⌕</button></div>{["The Pepper Table", "Namma Filter Coffee", "Glow & Go Studio", "CoreFit Arena"].map((name, i) => <button className={`conversation ${i === 0 ? "active" : ""}`} key={name}><span>{name[0]}</span><div><b>{name}</b><p>{i === 0 ? "Restaurant ke liye website…" : "Thanks, can you share…"}</p></div><small>{i ? `${i + 1}h` : "2m"}</small>{i < 2 && <i>{i + 1}</i>}</button>)}</section>
    <section className="chat panel"><div className="chat-head"><div className="business-cell"><span>T</span><div><b>The Pepper Table</b><small><i></i> WhatsApp · Pune</small></div></div><div><button>☎</button><button>Human handoff</button></div></div><div className="ai-note">✦ AI is replying in Hinglish using approved service information.</div><div className="messages">{messages.map((message, i) => <div className={`message ${message.from}`} key={i}><p>{message.text}</p><small>{message.from === "ai" && "✦ AI · "}{message.time}</small></div>)}{sending && <div className="typing">AI is typing <i></i><i></i><i></i></div>}</div><form className="composer" onSubmit={send}><button type="button">＋</button><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message to test the assistant…" /><button type="submit">Send ↗</button></form></section>
    <aside className="contact-card panel"><div className="contact-cover"><span>T</span></div><h3>The Pepper Table</h3><p>Restaurant · Pune</p><div className="mini-score"><b>89</b><div><strong>High priority</strong><small>Website need: 30/35</small></div></div><dl><dt>Contact</dt><dd>+91 98••• ••210</dd><dt>Budget</dt><dd>₹10,000–₹15,000</dd><dt>Needs</dt><dd><span>Restaurant site</span><span>WhatsApp</span></dd></dl><button>Open lead profile →</button></aside>
  </div>;
}

function Campaigns({ flash }: { flash: (s: string) => void }) {
  return <div className="content"><section className="page-intro"><div><span>CONSENT-FIRST OUTREACH</span><h2>Campaigns that protect your reputation.</h2><p>Rate limits, quiet hours, template approvals, opt-outs, and follow-up cancellation are enforced before every send.</p></div><button className="primary" onClick={() => flash("Create campaign unlocks after messaging credentials are connected")}>＋ New campaign</button></section>
    <section className="metrics compact"><article><div className="metric-top"><span>↗</span><em>91.8%</em></div><h3>184</h3><p>Messages sent</p><small>169 delivered</small></article><article><div className="metric-top"><span>↩</span><em>23.4%</em></div><h3>43</h3><p>Replies received</p><small>healthy response</small></article><article><div className="metric-top"><span>♥</span><em>10.3%</em></div><h3>19</h3><p>Interested leads</p><small>7 consultations</small></article><article><div className="metric-top"><span>⊘</span><em>0.5%</em></div><h3>1</h3><p>Opt-outs</p><small>automatically blocked</small></article></section>
    <section className="campaign-grid"><article className="campaign-card live"><div><span>LIVE</span><small>WhatsApp</small></div><h3>Pune Restaurant Growth</h3><p>Website opportunity · Restaurants with 100+ reviews</p><div className="campaign-progress"><span><i style={{ width: "72%" }}></i></span><b>132 / 184</b></div><dl><div><dt>Delivered</dt><dd>121</dd></div><div><dt>Replies</dt><dd>31</dd></div><div><dt>Interested</dt><dd>12</dd></div></dl><footer><small>Next send window: 10:00 IST</small><button>Manage →</button></footer></article><article className="campaign-card draft"><div><span>DRAFT</span><small>Email</small></div><h3>Bengaluru Café Audit</h3><p>Menu and direct-order opportunity · 46 eligible leads</p><div className="checklist"><p>✓ Audience filtered</p><p>✓ Evidence checked</p><p>○ Approve message copy</p></div><footer><small>0 messages sent</small><button>Review →</button></footer></article></section>
  </div>;
}

function Connections() {
  const connections = [{ icon: "AI", name: "OpenAI", key: "OPENAI_API_KEY", use: "Hinglish support and personalization" }, { icon: "G", name: "Google Places", key: "GOOGLE_PLACES_API_KEY", use: "Local business discovery" }, { icon: "WA", name: "WhatsApp Business", key: "WHATSAPP_ACCESS_TOKEN", use: "Customer support and approved outreach" }, { icon: "SMS", name: "Twilio SMS + Voice", key: "TWILIO_AUTH_TOKEN", use: "DLT-approved SMS and AI call support" }, { icon: "✉", name: "Resend Email", key: "RESEND_API_KEY", use: "Support and consent-compliant email" }];
  return <div className="content"><section className="page-intro"><div><span>CONNECTION CENTRE</span><h2>Add keys. ClearFlow handles the workflow.</h2><p>Secrets are added in hosting settings—not pasted into this dashboard or stored in the CRM.</p></div></section><div className="security-callout"><span>▣</span><div><b>Your credentials stay server-side</b><p>Keys are read only by protected provider adapters. They are never sent to the browser, AI context, analytics, or logs.</p></div></div><section className="connections">{connections.map((item, index) => <article key={item.name}><span className={`connection-icon c${index}`}>{item.icon}</span><div><h3>{item.name}</h3><p>{item.use}</p><code>{item.key}</code></div><button>{index < 2 ? "Add key" : "Configure"}</button><i className={index < 2 ? "required" : "optional"}>{index < 2 ? "Required" : "Optional"}</i></article>)}</section><section className="panel launch-check"><PanelTitle title="Launch checklist" sub="Provider approvals need to be completed once" action="Setup guide" /><div><p><span>1</span><b>Connect required API keys</b><small>OpenAI and Google Places</small></p><p><span>2</span><b>Verify WhatsApp Business</b><small>Phone number and message templates</small></p><p><span>3</span><b>Complete India DLT registration</b><small>Required for domestic commercial SMS</small></p><p><span>4</span><b>Run test conversations</b><small>English, Hindi, Hinglish, opt-out and handoff</small></p></div></section></div>;
}

function AddLeadModal({ close, onCreated, flash }: { close: () => void; onCreated: (lead: Lead) => void; flash: (s: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setSaving(true); const fd = new FormData(e.currentTarget); const body = Object.fromEntries(fd.entries()); try { const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); onCreated({ ...data.lead, category: String(body.category), rating: Number(body.rating), reviewCount: Number(body.reviewCount), stage: "researched", gaps: data.lead.gaps }); } catch (error) { flash(error instanceof Error ? error.message : "Could not create lead"); } finally { setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><span>NEW OPPORTUNITY</span><h2>Add and score a lead</h2><p>The score is calculated from evidence, not AI guesswork.</p></div><button type="button" onClick={close}>×</button></div><div className="form-grid"><label>Business name<input name="name" required placeholder="e.g. Spice Route Café" /></label><label>Business type<select name="category"><option>Restaurant</option><option>Café</option><option>Salon</option><option>Gym</option><option>Clinic</option><option>Local Business</option></select></label><label>City<input name="city" required placeholder="Pune" /></label><label>Phone<input name="phone" placeholder="+91 98765 43210" /></label><label>Rating<input name="rating" type="number" min="0" max="5" step="0.1" placeholder="4.5" /></label><label>Review count<input name="reviewCount" type="number" min="0" placeholder="150" /></label><label className="full">Website URL<input name="websiteUrl" type="url" placeholder="Leave blank if no website" /></label></div><div className="modal-note">Consent is not assumed from public contact information. Outreach remains locked until proof is recorded.</div><footer><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Scoring…" : "Add & score lead"}</button></footer></form></div>;
}
