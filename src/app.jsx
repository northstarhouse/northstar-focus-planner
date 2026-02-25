const { useState, useEffect } = React;

const GOLD = "#886c44";
const GOLD_LIGHT = "#f5efe6";
const GOLD_MID = "#c9a96e";

const STATUSES = ["Exploring", "Active", "On Hold", "Not a Fit", "Complete"];

const STATUS_COLORS = {
  Exploring: { color: "#2c5f8a", bg: "#e8f0f7" },
  Active: { color: "#4a7c59", bg: "#edf5f0" },
  "On Hold": { color: "#888", bg: "#f5f5f5" },
  "Not a Fit": { color: "#b05a2f", bg: "#fdf0ea" },
  Complete: { color: GOLD, bg: GOLD_LIGHT },
};

const EMPTY_IDEA = {
  title: "",
  status: STATUSES[0],
  notes: "",
  blockers: "",
  gaps: "",
};
const EMPTY_WIN = { title: "", when: "", impact: "", grantUse: "" };
const LOCAL_KEY = "nsh-planner-v2";
const SHEETS_URL =
  window.PLANNER_SHEETS_URL ||
  "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

const storage = {
  async get(key) {
    if (window.storage?.get) return window.storage.get(key);
    return { value: localStorage.getItem(key) };
  },
  async set(key, value) {
    if (window.storage?.set) return window.storage.set(key, value);
    localStorage.setItem(key, value);
  },
};

function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__planner_jsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to load script"));
    };

    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

async function getRemotePlannerData() {
  if (!SHEETS_URL || SHEETS_URL.includes("PASTE_YOUR_APPS_SCRIPT")) return null;
  const result = await jsonp(`${SHEETS_URL}?action=get&key=${encodeURIComponent(LOCAL_KEY)}`);
  if (!result || result.ok !== true) throw new Error("Bad remote response");
  return result.data || null;
}

async function saveRemotePlannerData(payload) {
  if (!SHEETS_URL || SHEETS_URL.includes("PASTE_YOUR_APPS_SCRIPT")) return;
  await fetch(SHEETS_URL, {
    redirect: "follow",
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "save",
      key: LOCAL_KEY,
      data: payload,
    }),
  });
}

function App() {
  const [tab, setTab] = useState("ideas");
  const [ideas, setIdeas] = useState([]);
  const [wins, setWins] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(LOCAL_KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (d.ideas) setIdeas(d.ideas);
          if (d.wins) setWins(d.wins);
        }
      } catch {}

      try {
        const remote = await getRemotePlannerData();
        if (remote?.ideas) setIdeas(remote.ideas);
        if (remote?.wins) setWins(remote.wins);
      } catch {}

      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const payload = { ideas, wins };
    storage.set(LOCAL_KEY, JSON.stringify(payload)).catch(() => {});
    saveRemotePlannerData(payload)
      .then(() => {})
      .catch(() => {});
  }, [ideas, wins, loaded]);

  function toggleExpand(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  function openAdd() {
    setForm(tab === "ideas" ? { ...EMPTY_IDEA } : { ...EMPTY_WIN });
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(item) {
    setForm({ ...item });
    setEditId(item.id);
    setShowForm(true);
  }

  function save() {
    if (!form.title?.trim()) return;
    const isIdea = tab === "ideas";
    const setter = isIdea ? setIdeas : setWins;
    setter((prev) => {
      if (editId) return prev.map((i) => (i.id === editId ? { ...form, id: editId } : i));
      return [...prev, { ...form, id: Date.now() }];
    });
    setShowForm(false);
    setEditId(null);
    setForm(null);
  }

  function remove(id) {
    if (tab === "ideas") setIdeas((p) => p.filter((i) => i.id !== id));
    else setWins((p) => p.filter((i) => i.id !== id));
  }

  const items = tab === "ideas" ? ideas : wins;

  return (
    <div style={{ fontFamily: "'Cardo', serif", fontSize: 18, fontWeight: 700, background: "#fdfbf8", minHeight: "100vh", color: "#2d2a26" }}>
      <div style={{ background: GOLD, padding: "16px 28px" }}>
        <div style={{ color: "#fff", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: 0.8 }}>North Star House</div>
        <div style={{ color: "#fff", fontSize: 19, letterSpacing: 0.5 }}>Organizational Focus Planner</div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d4", display: "flex" }}>
        {[
          { id: "ideas", label: "Ideas & Initiatives", count: ideas.length },
          { id: "wins", label: "Accomplishments", count: wins.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? `3px solid ${GOLD}` : "3px solid transparent",
              padding: "14px 24px",
              fontSize: 13,
              color: tab === t.id ? GOLD : "#999",
              cursor: "pointer",
              fontFamily: "'Cardo', serif",
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft: 8, background: GOLD_LIGHT, color: GOLD, borderRadius: 10, padding: "1px 8px", fontSize: 10 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "#aaa" }}>
            {tab === "ideas"
              ? "Grants, programs, projects, and anything you're considering - with space to note what's blocking or missing."
              : "Things you've done, built, or achieved. Useful for grant writing, board reports, and telling your story."}
          </div>
          <button
            onClick={openAdd}
            style={{
              background: GOLD,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "9px 18px",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              letterSpacing: 0.5,
              flexShrink: 0,
              marginLeft: 20,
              fontFamily: "'Cardo', serif",
            }}
          >
            + Add
          </button>
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc", fontSize: 13 }}>
            Nothing here yet - hit <strong>+ Add</strong> to get started.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item) => {
            const isIdea = tab === "ideas";
            const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Exploring;
            const open = expanded[item.id];
            const hasExtra = isIdea && (item.blockers || item.gaps);

            return (
              <div key={item.id} style={{ background: "#fff", border: "1px solid #e8e0d4", borderLeft: `4px solid ${GOLD_MID}`, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "#2d2a26", marginBottom: 6 }}>{item.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: item.notes ? 8 : 0 }}>
                      {item.status && <Tag color={sc.color} bg={sc.bg}>{item.status}</Tag>}
                      {item.when && <Tag color="#888" bg="#f5f5f5">{item.when}</Tag>}
                    </div>
                    {item.notes && <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{item.notes}</div>}
                    {!isIdea && item.impact && (
                      <div style={{ fontSize: 12, color: "#777", marginTop: 6, lineHeight: 1.6 }}>
                        <span style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: 1 }}>Impact </span>
                        {item.impact}
                      </div>
                    )}
                    {!isIdea && item.grantUse && (
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4, lineHeight: 1.6 }}>
                        <span style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: 1 }}>For grant writing </span>
                        {item.grantUse}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    {hasExtra && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        style={{
                          background: "none",
                          border: "1px solid #e0d8cc",
                          color: "#aaa",
                          borderRadius: 3,
                          padding: "4px 10px",
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "'Cardo', serif",
                        }}
                      >
                        {open ? "Less" : "More"}
                      </button>
                    )}
                    <Btn onClick={() => startEdit(item)}>Edit</Btn>
                    <Btn color="#b05a2f" onClick={() => remove(item.id)}>X</Btn>
                  </div>
                </div>

                {isIdea && open && (
                  <div style={{ borderTop: "1px solid #f0e8de", padding: "14px 18px", background: "#fdfaf7", display: "flex", flexDirection: "column", gap: 10 }}>
                    {item.blockers && (
                      <div>
                        <div style={{ fontSize: 10, color: "#b05a2f", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Blockers</div>
                        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{item.blockers}</div>
                      </div>
                    )}
                    {item.gaps && (
                      <div>
                        <div style={{ fontSize: 10, color: "#2c5f8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Gaps</div>
                        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{item.gaps}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showForm && form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: "28px", width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 15, color: GOLD, marginBottom: 20 }}>
              {editId ? "Edit" : "Add"} - {tab === "ideas" ? "Idea or Initiative" : "Accomplishment"}
            </div>

            {tab === "ideas" ? (
              <>
                <Field label="Title" placeholder="e.g. Apply for CAC grant, Launch youth program, New website">
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Apply for CAC grant, Launch youth program" style={inp} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={inp}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Notes - why it matters, context, ideas">
                  <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Background, rationale, opportunity..." style={{ ...inp, resize: "vertical" }} />
                </Field>
                <Field label="Blockers - what's in the way">
                  <textarea value={form.blockers} onChange={(e) => setForm((p) => ({ ...p, blockers: e.target.value }))} rows={2} placeholder="Capacity, funding, decisions needed, timing..." style={{ ...inp, resize: "vertical" }} />
                </Field>
                <Field label="Gaps - what's missing">
                  <textarea value={form.gaps} onChange={(e) => setForm((p) => ({ ...p, gaps: e.target.value }))} rows={2} placeholder="Skills, documentation, relationships, resources..." style={{ ...inp, resize: "vertical" }} />
                </Field>
              </>
            ) : (
              <>
                <Field label="What was accomplished">
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Completed roof restoration, Launched volunteer portal" style={inp} />
                </Field>
                <Field label="When">
                  <input value={form.when} onChange={(e) => setForm((p) => ({ ...p, when: e.target.value }))} placeholder="e.g. Fall 2024, January 2025" style={inp} />
                </Field>
                <Field label="Why it mattered">
                  <textarea value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value }))} rows={3} placeholder="Community impact, org capacity, historic preservation..." style={{ ...inp, resize: "vertical" }} />
                </Field>
                <Field label="How to use this in grant writing">
                  <textarea value={form.grantUse} onChange={(e) => setForm((p) => ({ ...p, grantUse: e.target.value }))} rows={2} placeholder="Proof of capacity, demonstrated need, organizational health..." style={{ ...inp, resize: "vertical" }} />
                </Field>
              </>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                style={{
                  background: "none",
                  border: "1px solid #e0d8cc",
                  color: "#888",
                  borderRadius: 4,
                  padding: "8px 18px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Cardo', serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                style={{
                  background: GOLD,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "8px 22px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Cardo', serif",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ color, bg, children }) {
  return <span style={{ fontSize: 10, background: bg, color, borderRadius: 3, padding: "3px 8px", letterSpacing: 0.5 }}>{children}</span>;
}

function Btn({ color = GOLD, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: `1px solid ${color}50`, color, borderRadius: 3, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Cardo', serif" }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = {
  width: "100%",
  border: "1px solid #e0d8cc",
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'Cardo', serif",
  color: "#2d2a26",
  boxSizing: "border-box",
  background: "#fdfbf8",
  outline: "none",
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
