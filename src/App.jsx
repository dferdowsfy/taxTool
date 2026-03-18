import { useState, useMemo, useRef, useCallback } from "react";

const STANDARD_DEDUCTION_MFJ = 30000;
const QBI_RATE = 0.20;
const QBI_THRESHOLD_MFJ = 394600;

const MFJ_BRACKETS = [
  { rate: 0.10, max: 23200 },
  { rate: 0.12, max: 94300 },
  { rate: 0.22, max: 201050 },
  { rate: 0.24, max: 383900 },
  { rate: 0.32, max: 487450 },
  { rate: 0.35, max: 731200 },
  { rate: 0.37, max: Infinity },
];

function calcFederalTax(taxableIncome) {
  let tax = 0, prev = 0;
  for (const { rate, max } of MFJ_BRACKETS) {
    if (taxableIncome <= prev) break;
    tax += rate * (Math.min(taxableIncome, max) - prev);
    prev = max;
  }
  return Math.max(0, tax);
}

function marginalRate(taxableIncome) {
  for (const { rate, max } of MFJ_BRACKETS) {
    if (taxableIncome <= max) return rate;
  }
  return 0.37;
}

const INITIAL_EXPENSES = [
  { id: 1,  vendor: "Anthropic",       category: "Software",       amount: 20,   bizPct: 1.00 },
  { id: 2,  vendor: "YouTube Premium", category: "Software",       amount: 20,   bizPct: 1.00 },
  { id: 3,  vendor: "Gemini",          category: "Software",       amount: 20,   bizPct: 1.00 },
  { id: 4,  vendor: "ChatGPT",         category: "Software",       amount: 20,   bizPct: 1.00 },
  { id: 5,  vendor: "Apple",           category: "Software",       amount: 32,   bizPct: 1.00 },
  { id: 6,  vendor: "Cursor",          category: "Software",       amount: 40,   bizPct: 1.00 },
  { id: 7,  vendor: "WiFi",            category: "Infrastructure", amount: 70,   bizPct: 0.70 },
  { id: 8,  vendor: "Google Hosting",  category: "Infrastructure", amount: 30,   bizPct: 1.00 },
  { id: 9,  vendor: "GoDaddy",         category: "Infrastructure", amount: 50,   bizPct: 1.00 },
  { id: 10, vendor: "Phone",           category: "Phone",          amount: 120,  bizPct: 0.80 },
  { id: 11, vendor: "Electricity",     category: "Home Office",    amount: 300,  bizPct: 0.05 },
  { id: 12, vendor: "Water",           category: "Home Office",    amount: 400,  bizPct: 0.05 },
  { id: 13, vendor: "Meals",           category: "Meals",          amount: 5000, bizPct: 0.50 },
  { id: 14, vendor: "Uber",            category: "Travel",         amount: 200,  bizPct: 1.00 },
  { id: 15, vendor: "OpenRouter",      category: "AI/API",         amount: 42,   bizPct: 1.00 },
];

const INITIAL_ASSETS = [
  { id: 1, item: "MacBook Pro", cost: 1200, method: "Section 179" },
  { id: 2, item: "Keyboard",    cost: 50,   method: "Expense" },
];

function calcDeductible(e) {
  if (e.category === "Meals") return e.amount * 0.50;
  return e.amount * e.bizPct;
}

const fmt = (n) => "$" + Math.round(Math.abs(n)).toLocaleString();
const pct = (n) => (n * 100).toFixed(0) + "%";

const DARK = {
  mode: "dark",
  bg: "#0a0a0f", surface: "#111827", surface2: "#0f172a",
  border: "#1e293b", border2: "#334155",
  text: "#e2e8f0", textMuted: "#94a3b8", textDim: "#64748b", textFaint: "#475569",
  inputBg: "#0f172a", inputBorder: "#334155", inputText: "#60a5fa",
  headerBg: "linear-gradient(135deg,#0f172a 0%,#0a0a0f 100%)",
  green: "#34d399", greenMid: "#6ee7b7",
  red: "#f87171",   redMid: "#fca5a5",
  blue: "#60a5fa",  purple: "#a78bfa", orange: "#fb923c",
  tfoot: "#0f172a",
  uploadBg: "#111827", uploadBorder: "#334155",
  uploadDragBg: "#0f2744", uploadDragBorder: "#3b82f6",
  effectiveBg: "#0f2a1e", effectiveBorder: "#10b98133",
  effectiveLabel: "#6ee7b7", effectiveNum: "#34d399",
  catColors: {
    "Software":             { bg:"#0f2744", accent:"#3b82f6", text:"#93c5fd" },
    "Infrastructure":       { bg:"#0f2a1e", accent:"#10b981", text:"#6ee7b7" },
    "Phone":                { bg:"#1e1a2e", accent:"#8b5cf6", text:"#c4b5fd" },
    "Home Office":          { bg:"#1a1a0f", accent:"#f59e0b", text:"#fcd34d" },
    "Meals":                { bg:"#2a1212", accent:"#ef4444", text:"#fca5a5" },
    "Travel":               { bg:"#1a2a1a", accent:"#22c55e", text:"#86efac" },
    "AI/API":               { bg:"#1a1f2a", accent:"#06b6d4", text:"#67e8f9" },
    "Equipment":            { bg:"#2a1a0f", accent:"#f97316", text:"#fdba74" },
    "Home Office Mortgage": { bg:"#1a1a0f", accent:"#f59e0b", text:"#fcd34d" },
  },
  optColors: {
    high:   { bg:"#0f2a1e", accent:"#10b981" },
    medium: { bg:"#0f2744", accent:"#3b82f6" },
    low:    { bg:"#1e1a2e", accent:"#8b5cf6" },
  },
};

const LIGHT = {
  mode: "light",
  bg: "#f8fafc", surface: "#ffffff", surface2: "#f1f5f9",
  border: "#e2e8f0", border2: "#cbd5e1",
  text: "#0f172a", textMuted: "#475569", textDim: "#64748b", textFaint: "#94a3b8",
  inputBg: "#f8fafc", inputBorder: "#cbd5e1", inputText: "#1d4ed8",
  headerBg: "linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)",
  green: "#16a34a", greenMid: "#15803d",
  red: "#dc2626",   redMid: "#b91c1c",
  blue: "#2563eb",  purple: "#7c3aed", orange: "#ea580c",
  tfoot: "#f1f5f9",
  uploadBg: "#f8fafc", uploadBorder: "#cbd5e1",
  uploadDragBg: "#eff6ff", uploadDragBorder: "#2563eb",
  effectiveBg: "#f0fdf4", effectiveBorder: "#16a34a33",
  effectiveLabel: "#15803d", effectiveNum: "#16a34a",
  catColors: {
    "Software":             { bg:"#eff6ff", accent:"#2563eb", text:"#1d4ed8" },
    "Infrastructure":       { bg:"#f0fdf4", accent:"#16a34a", text:"#15803d" },
    "Phone":                { bg:"#faf5ff", accent:"#7c3aed", text:"#6d28d9" },
    "Home Office":          { bg:"#fffbeb", accent:"#d97706", text:"#b45309" },
    "Meals":                { bg:"#fef2f2", accent:"#dc2626", text:"#b91c1c" },
    "Travel":               { bg:"#f0fdf4", accent:"#15803d", text:"#166534" },
    "AI/API":               { bg:"#ecfeff", accent:"#0891b2", text:"#0e7490" },
    "Equipment":            { bg:"#fff7ed", accent:"#ea580c", text:"#c2410c" },
    "Home Office Mortgage": { bg:"#fffbeb", accent:"#d97706", text:"#b45309" },
  },
  optColors: {
    high:   { bg:"#f0fdf4", accent:"#16a34a" },
    medium: { bg:"#eff6ff", accent:"#2563eb" },
    low:    { bg:"#faf5ff", accent:"#7c3aed" },
  },
};

// ── W-2 Uploader ──
function W2Uploader({ onParsed, t }) {
  const [status, setStatus] = useState("idle");
  const [parsed, setParsed] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const parseW2 = async (file) => {
    setStatus("loading");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPDF && !isImage) throw new Error("Use PDF or image");

      const mediaType = isPDF ? "application/pdf" : file.type;
      const docType   = isPDF ? "document" : "image";

      const content = [
        {
          type: docType,
          source: { type: "base64", media_type: mediaType, data: base64 },
        },
        {
          type: "text",
          text: `Parse this W-2 tax form. Return ONLY valid JSON, no markdown, no extra text:
{"employerName":string|null,"employeeName":string|null,"box1_wages":number|null,"box2_federalWithheld":number|null,"box3_socialSecurityWages":number|null,"box4_socialSecurityWithheld":number|null,"box5_medicareWages":number|null,"box6_medicareWithheld":number|null,"box16_stateWages":number|null,"box17_stateTax":number|null,"taxYear":number|null}
Numbers must be numeric not strings. Return null for any missing field.`,
        },
      ];

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content }],
        }),
      });
      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setParsed(result);
      onParsed(result);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleFile = (f) => { if (f) parseW2(f); };
  const borderColor = dragging ? t.uploadDragBorder : status === "done" ? t.green : status === "error" ? t.red : t.uploadBorder;
  const bgColor     = dragging ? t.uploadDragBg : t.uploadBg;

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ fontSize: "11px", color: t.textDim, marginBottom: "8px", letterSpacing: "0.5px", fontWeight: "600" }}>
        SPOUSE W-2 — AI UPLOAD
      </div>

      {status !== "done" && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          style={{
            background: bgColor, border: `2px dashed ${borderColor}`,
            borderRadius: "10px", padding: "28px 20px",
            textAlign: "center", cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,image/*"
            style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

          {status === "idle" && (
            <>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: t.text, marginBottom: "4px" }}>Drop wife's W-2 here or click to browse</div>
              <div style={{ fontSize: "12px", color: t.textDim }}>PDF or image · Box 1 & Box 2 extracted automatically</div>
            </>
          )}

          {status === "loading" && (
            <>
              <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize: "26px", display: "inline-block", animation: "kspin 0.9s linear infinite", marginBottom: "8px" }}>⟳</div>
              <div style={{ fontSize: "13px", color: t.textMuted }}>Reading W-2 with AI…</div>
            </>
          )}

          {status === "error" && (
            <>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
              <div style={{ fontSize: "13px", color: t.red }}>Parse failed — try a clearer image or PDF</div>
              <div style={{ fontSize: "12px", color: t.textDim, marginTop: "4px" }}>Click to retry</div>
            </>
          )}
        </div>
      )}

      {status === "done" && parsed && (
        <div style={{
          background: t.surface, border: `1px solid ${t.green}44`,
          borderLeft: `4px solid ${t.green}`, borderRadius: "10px", padding: "16px 18px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: t.green }}>✓ W-2 extracted — fields updated below</div>
            <button onClick={() => { setStatus("idle"); setParsed(null); }}
              style={{ background: "none", border: `1px solid ${t.border2}`, borderRadius: "5px", color: t.textDim, padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
              Replace
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "Employee",       value: parsed.employeeName || "—" },
              { label: "Employer",       value: parsed.employerName || "—" },
              { label: "Tax year",       value: parsed.taxYear ? String(parsed.taxYear) : "—" },
              { label: "Box 1 wages",    value: parsed.box1_wages != null ? fmt(parsed.box1_wages) : "—" },
              { label: "Box 2 withheld", value: parsed.box2_federalWithheld != null ? fmt(parsed.box2_federalWithheld) : "—" },
              { label: "Box 6 medicare", value: parsed.box6_medicareWithheld != null ? fmt(parsed.box6_medicareWithheld) : "—" },
            ].map(f => (
              <div key={f.label} style={{ background: t.surface2, borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "2px" }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: t.text, fontFamily: "'DM Mono', monospace" }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──
export default function KaptrixTaxOptimizer() {
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;

  const [expenses, setExpenses]   = useState(INITIAL_EXPENSES);
  const [w2Income, setW2Income]   = useState(225000);
  const [spouseIncome, setSpouseIncome] = useState(125000);
  const [w2Withheld, setW2Withheld]     = useState(54000);
  const [spouseWithheld, setSpouseWithheld] = useState(22000);
  const [bizIncome, setBizIncome]           = useState(5100);
  const [homeOfficeDed, setHomeOfficeDed]   = useState(3840);
  const [activeTab, setActiveTab] = useState("summary");

  const handleSpouseW2 = useCallback((p) => {
    if (p.box1_wages        != null) setSpouseIncome(p.box1_wages);
    if (p.box2_federalWithheld != null) setSpouseWithheld(p.box2_federalWithheld);
  }, []);

  const calc = useMemo(() => {
    const expDed = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + calcDeductible(e);
      return acc;
    }, {});
    const equipDed = INITIAL_ASSETS.reduce((s, a) => s + a.cost, 0);
    expDed["Equipment"] = equipDed;
    const totalBizDed = Object.values(expDed).reduce((a, b) => a + b, 0) + homeOfficeDed;

    const netSE   = Math.max(0, bizIncome - totalBizDed);
    const seTax   = netSE * 0.9235 * 0.153;
    const seDed   = seTax * 0.5;
    const totalIncome = w2Income + spouseIncome + bizIncome;
    const agi     = totalIncome - seDed;
    const qbiDed  = (agi <= QBI_THRESHOLD_MFJ && netSE > 0) ? netSE * QBI_RATE : 0;
    const stdDed  = STANDARD_DEDUCTION_MFJ;
    const taxable = Math.max(0, agi - stdDed - qbiDed);
    const fedTax  = calcFederalTax(taxable);
    const marginal = marginalRate(taxable);
    const withheld = w2Withheld + spouseWithheld;
    const liability = fedTax + seTax;
    const position  = withheld - liability;

    const opts = [
      { title: "SEP-IRA contribution", tag: "Retirement", priority: "high",
        description: `Contribute up to 25% of net SE profit (max $69K) to a SEP-IRA — reduces AGI dollar-for-dollar. Even a modest $5K contribution saves ~${fmt(5000 * marginal)}.`,
        savings: Math.max(5000, Math.min(netSE * 0.25, 69000)) * marginal },
      { title: "Self-employed health insurance", tag: "Insurance", priority: "high",
        description: "If your health/dental/vision premiums aren't covered by your employer's plan, 100% are deductible above-the-line, directly reducing AGI.",
        savings: 7000 * marginal },
      { title: "Increase home office allocation", tag: "Home Office", priority: "medium",
        description: "At 5% you may be under-claiming. A dedicated office ≥10% of sq ft qualifies. The IRS simplified method: $5/sqft × 300 sqft max = $1,500/yr.",
        savings: Math.max(0, 1500 - homeOfficeDed) * marginal },
      { title: "Mileage log", tag: "Travel", priority: "medium",
        description: `IRS standard mileage is $0.70/mile in 2026. 500 documented business miles = $350 deduction, saving ~${fmt(350 * marginal)}.`,
        savings: 500 * 0.70 * marginal },
      { title: "Professional development", tag: "Education", priority: "medium",
        description: "AI courses, conference tickets, books, and certifications tied to Kaptrix are 100% deductible. $2K/yr is conservative.",
        savings: 2000 * marginal },
      { title: "Document more client meals", tag: "Meals", priority: "low",
        description: `50% deductibility means every $200 in documented client meals with business purpose saves ~${fmt(100 * marginal)}. Keep receipts with client names.`,
        savings: 1000 * 0.5 * marginal },
    ];

    return { expDed, equipDed, totalBizDed, netSE, seTax, seDed, totalIncome, agi, qbiDed, stdDed, taxable, fedTax, marginal, withheld, liability, position, opts };
  }, [expenses, w2Income, spouseIncome, w2Withheld, spouseWithheld, bizIncome, homeOfficeDed]);

  const isRefund = calc.position >= 0;
  const updateExp = (id, field, val) =>
    setExpenses(prev => prev.map(e => e.id === id
      ? { ...e, [field]: (field === "bizPct" || field === "amount") ? parseFloat(val) || 0 : val }
      : e));

  const catTotals = useMemo(() => {
    const totals = {};
    for (const e of expenses) totals[e.category] = (totals[e.category] || 0) + calcDeductible(e);
    totals["Equipment"] = INITIAL_ASSETS.reduce((s, a) => s + a.cost, 0);
    totals["Home Office Mortgage"] = homeOfficeDed;
    return totals;
  }, [expenses, homeOfficeDed]);

  const inp = (extra = {}) => ({
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: "6px",
    color: t.inputText,
    fontFamily: "'DM Mono', monospace",
    fontSize: "13px",
    padding: "7px 10px",
    outline: "none",
    ...extra,
  });

  const bigInp = (extra = {}) => inp({ fontSize: "18px", fontWeight: "600", padding: "9px 12px", width: "100%", boxSizing: "border-box", ...extra });

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: t.bg, color: t.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}`, padding: "18px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: t.textDim, fontFamily: "'DM Mono',monospace", marginBottom: "4px" }}>KAPTRIX LLC · TAX YEAR 2026 · MFJ</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: t.text, letterSpacing: "-0.5px" }}>Tax Refund Optimizer</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button onClick={() => setIsDark(d => !d)} style={{
              background: t.surface, border: `1px solid ${t.border2}`, borderRadius: "20px",
              padding: "6px 14px", cursor: "pointer", fontSize: "12px", color: t.textMuted,
              display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: "14px" }}>{isDark ? "☀️" : "🌙"}</span>
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "2px", fontFamily: "'DM Mono',monospace" }}>EST. POSITION</div>
              <div style={{ fontSize: "28px", fontWeight: "600", color: isRefund ? t.green : t.red, fontFamily: "'DM Mono',monospace", letterSpacing: "-1px" }}>
                {isRefund ? "+" : "−"}{fmt(calc.position)}
              </div>
              <div style={{ fontSize: "11px", color: isRefund ? t.greenMid : t.redMid }}>
                {isRefund ? "estimated refund" : "estimated owed"}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {["summary","expenses","income","optimizations"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none",
              borderBottom: activeTab === tab ? `2px solid ${t.blue}` : "2px solid transparent",
              color: activeTab === tab ? t.blue : t.textDim,
              padding: "9px 18px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
              textTransform: "capitalize", transition: "all 0.15s", fontFamily: "inherit",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "22px 28px", maxWidth: "1080px" }}>

        {/* ── SUMMARY ── */}
        {activeTab === "summary" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "22px" }}>
              {[
                { label: "Total Income",     value: fmt(calc.totalIncome),  sub: "W-2 + spouse + biz",     color: t.blue },
                { label: "AGI",              value: fmt(calc.agi),          sub: "after SE deduction",     color: t.purple },
                { label: "Total Deductions", value: fmt(calc.totalBizDed + calc.stdDed), sub: "biz + standard", color: t.green },
                { label: "Taxable Income",   value: fmt(calc.taxable),      sub: `${pct(calc.marginal)} marginal`, color: t.orange },
              ].map(m => (
                <div key={m.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "5px", letterSpacing: "0.5px" }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: m.color, fontFamily: "'DM Mono',monospace" }}>{m.value}</div>
                  <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "3px" }}>{m.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px 24px", marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, marginBottom: "14px", letterSpacing: "0.5px" }}>TAX WATERFALL</div>
              {[
                { label: "Gross business income",        value: fmt(calc.taxable > 0 ? bizIncome : bizIncome), raw: bizIncome, sign: "", color: t.blue },
                { label: "Business deductions",          value: "− " + fmt(calc.totalBizDed), color: t.red, indent: 1 },
                { label: "Net SE income / (loss)",       value: fmt(calc.netSE), color: t.text, bold: true, divider: true },
                { label: "Self-employment tax (15.3%)",  value: fmt(calc.seTax), color: t.red, indent: 1 },
                { label: "½ SE tax deduction",           value: "− " + fmt(calc.seDed), color: t.redMid, indent: 2, small: true },
                { label: "Your W-2 income",              value: fmt(w2Income), color: t.blue },
                { label: "Spouse W-2 income",            value: fmt(spouseIncome), color: t.blue },
                { label: "Adjusted Gross Income",        value: fmt(calc.agi), color: t.text, bold: true, divider: true },
                { label: "Standard deduction (MFJ)",     value: "− " + fmt(calc.stdDed), color: t.red, indent: 1 },
                { label: "QBI deduction",                value: calc.qbiDed > 0 ? "− " + fmt(calc.qbiDed) : "—", color: t.red, indent: 1, small: true },
                { label: "Taxable Income",               value: fmt(calc.taxable), color: t.text, bold: true, divider: true },
                { label: "Federal income tax",           value: fmt(calc.fedTax), color: t.red, indent: 1 },
                { label: "Self-employment tax",          value: fmt(calc.seTax), color: t.red, indent: 1 },
                { label: "Total Tax Liability",          value: fmt(calc.liability), color: t.red, bold: true, divider: true },
                { label: "Your withholding",             value: fmt(w2Withheld), color: t.green, indent: 1 },
                { label: "Spouse withholding",           value: fmt(spouseWithheld), color: t.green, indent: 1 },
                { label: "Total Withheld",               value: fmt(calc.withheld), color: t.green, bold: true },
              ].map((row, i) => (
                <div key={i}>
                  {row.divider && <div style={{ borderTop: `1px solid ${t.border}`, margin: "5px 0" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: `${row.small ? "2px" : "5px"} 0 ${row.small ? "2px" : "5px"} ${(row.indent || 0) * 18}px` }}>
                    <span style={{ fontSize: row.bold ? "13px" : row.small ? "11px" : "12px", color: row.bold ? t.text : t.textMuted, fontWeight: row.bold ? "600" : "400" }}>{row.label}</span>
                    <span style={{ fontSize: row.bold ? "14px" : "13px", fontFamily: "'DM Mono',monospace", color: row.color, fontWeight: row.bold ? "600" : "400" }}>{row.value}</span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `2px solid ${t.border2}`, marginTop: "8px", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: t.text }}>{isRefund ? "Estimated Refund" : "Estimated Amount Owed"}</span>
                <span style={{ fontSize: "22px", fontFamily: "'DM Mono',monospace", fontWeight: "600", color: isRefund ? t.green : t.red }}>
                  {isRefund ? "+" : "−"}{fmt(calc.position)}
                </span>
              </div>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px 24px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, marginBottom: "12px", letterSpacing: "0.5px" }}>DEDUCTION BREAKDOWN</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "9px" }}>
                {Object.entries(catTotals).map(([cat, val]) => {
                  const c = t.catColors[cat] || t.catColors["Software"];
                  return (
                    <div key={cat} style={{ background: c.bg, borderLeft: `3px solid ${c.accent}`, borderRadius: "7px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "10px", color: c.text, opacity: 0.8, marginBottom: "3px" }}>{cat.toUpperCase()}</div>
                      <div style={{ fontSize: "17px", fontWeight: "600", fontFamily: "'DM Mono',monospace", color: c.accent }}>{fmt(val)}</div>
                      <div style={{ fontSize: "10px", color: t.textFaint, marginTop: "2px" }}>~{fmt(val * calc.marginal)} saved</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── EXPENSES ── */}
        {activeTab === "expenses" && (
          <div>
            <div style={{ fontSize: "13px", color: t.textDim, marginBottom: "14px" }}>
              Edit amounts and business-use %. At your {pct(calc.marginal)} bracket, every $1K deducted saves ~{fmt(calc.marginal * 1000)}.
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
                    {["Vendor","Category","Amount","Biz %","Deductible","Saves"].map(h => (
                      <th key={h} style={{ padding: "10px 13px", textAlign: "left", fontSize: "10px", color: t.textFaint, fontWeight: "500", letterSpacing: "0.5px" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e, i) => {
                    const ded = calcDeductible(e);
                    const c = t.catColors[e.category] || t.catColors["Software"];
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${t.border}`, background: i % 2 === 0 ? "transparent" : t.surface2 + "88" }}>
                        <td style={{ padding: "8px 13px", color: t.text }}>{e.vendor}</td>
                        <td style={{ padding: "8px 13px" }}>
                          <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.accent}33`, borderRadius: "4px", padding: "2px 7px", fontSize: "10px" }}>{e.category}</span>
                        </td>
                        <td style={{ padding: "8px 13px" }}>
                          <input type="number" value={e.amount} onChange={ev => updateExp(e.id, "amount", ev.target.value)} style={inp({ width: "74px" })} />
                        </td>
                        <td style={{ padding: "8px 13px" }}>
                          {e.category === "Meals"
                            ? <span style={{ color: t.textFaint, fontFamily: "'DM Mono',monospace", fontSize: "12px" }}>50% IRS</span>
                            : <input type="number" min="0" max="1" step="0.05" value={e.bizPct}
                                onChange={ev => updateExp(e.id, "bizPct", ev.target.value)} style={inp({ width: "64px" })} />
                          }
                        </td>
                        <td style={{ padding: "8px 13px", fontFamily: "'DM Mono',monospace", color: t.green, fontWeight: "500" }}>{fmt(ded)}</td>
                        <td style={{ padding: "8px 13px", fontFamily: "'DM Mono',monospace", color: t.greenMid, fontSize: "12px" }}>~{fmt(ded * calc.marginal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: t.tfoot, borderTop: `1px solid ${t.border2}` }}>
                    <td colSpan="4" style={{ padding: "10px 13px", fontWeight: "600", color: t.textMuted, fontSize: "12px" }}>TOTAL EXPENSES</td>
                    <td style={{ padding: "10px 13px", fontFamily: "'DM Mono',monospace", color: t.green, fontWeight: "600", fontSize: "14px" }}>
                      {fmt(Object.entries(calc.expDed).filter(([k]) => k !== "Equipment").reduce((s,[,v]) => s+v, 0))}
                    </td>
                    <td style={{ padding: "10px 13px", fontFamily: "'DM Mono',monospace", color: t.greenMid, fontSize: "12px" }}>
                      ~{fmt(Object.entries(calc.expDed).filter(([k]) => k !== "Equipment").reduce((s,[,v]) => s+v, 0) * calc.marginal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 20px", marginTop: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, marginBottom: "10px", letterSpacing: "0.5px" }}>EQUIPMENT (SECTION 179 / EXPENSED)</div>
              {INITIAL_ASSETS.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                  <span style={{ color: t.text, flex: 1, fontSize: "13px" }}>{a.item}</span>
                  <span style={{ background: t.catColors["Travel"].bg, color: t.catColors["Travel"].text, border: `1px solid ${t.catColors["Travel"].accent}33`, borderRadius: "4px", padding: "2px 8px", fontSize: "10px" }}>{a.method}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: t.green, fontSize: "13px" }}>{fmt(a.cost)}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: t.greenMid, fontSize: "12px" }}>~{fmt(a.cost * calc.marginal)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "9px", marginTop: "9px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: t.textMuted, fontSize: "13px" }}>Equipment total</span>
                <span style={{ fontFamily: "'DM Mono',monospace", color: t.green, fontWeight: "600" }}>{fmt(calc.equipDed)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── INCOME ── */}
        {activeTab === "income" && (
          <div>
            <div style={{ fontSize: "13px", color: t.textDim, marginBottom: "18px" }}>
              All figures flow into your joint 1040. Upload your wife's W-2 to auto-fill Box 1 & Box 2.
            </div>

            <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, marginBottom: "10px", letterSpacing: "0.5px" }}>YOUR W-2</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Wages (Box 1)", value: w2Income, set: setW2Income, desc: "Gross wages from your employer" },
                { label: "Federal withheld (Box 2)", value: w2Withheld, set: setW2Withheld, desc: "From Box 2 of your W-2" },
              ].map(f => (
                <div key={f.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "6px", letterSpacing: "0.5px" }}>{f.label.toUpperCase()}</div>
                  <input type="number" value={f.value} onChange={e => f.set(parseFloat(e.target.value)||0)} style={bigInp()} />
                  <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "6px" }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, marginBottom: "10px", letterSpacing: "0.5px" }}>SPOUSE W-2</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { label: "Spouse wages (Box 1)", value: spouseIncome, set: setSpouseIncome, desc: "Auto-filled from W-2 upload below" },
                { label: "Spouse withheld (Box 2)", value: spouseWithheld, set: setSpouseWithheld, desc: "Auto-filled from W-2 upload below" },
              ].map(f => (
                <div key={f.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "6px", letterSpacing: "0.5px" }}>{f.label.toUpperCase()}</div>
                  <input type="number" value={f.value} onChange={e => f.set(parseFloat(e.target.value)||0)} style={bigInp()} />
                  <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "6px" }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <W2Uploader onParsed={handleSpouseW2} t={t} />

            <div style={{ fontSize: "11px", fontWeight: "600", color: t.textMuted, margin: "20px 0 10px", letterSpacing: "0.5px" }}>KAPTRIX BUSINESS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { label: "Kaptrix gross revenue", value: bizIncome, set: setBizIncome, desc: "Web dev $2,000 + consulting $3,100" },
                { label: "Home office deduction", value: homeOfficeDed, set: setHomeOfficeDed, desc: "Mortgage/rent portion for home office" },
              ].map(f => (
                <div key={f.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "6px", letterSpacing: "0.5px" }}>{f.label.toUpperCase()}</div>
                  <input type="number" value={f.value} onChange={e => f.set(parseFloat(e.target.value)||0)} style={bigInp()} />
                  <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "6px" }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background: t.effectiveBg, border: `1px solid ${t.effectiveBorder}`, borderRadius: "10px", padding: "14px 18px", marginTop: "14px" }}>
              <div style={{ fontSize: "10px", color: t.effectiveLabel, marginBottom: "3px", letterSpacing: "0.5px" }}>EFFECTIVE TAX RATE</div>
              <div style={{ fontSize: "22px", fontFamily: "'DM Mono',monospace", color: t.effectiveNum, fontWeight: "600" }}>
                {((calc.liability / Math.max(calc.totalIncome, 1)) * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "3px" }}>
                {fmt(calc.liability)} liability ÷ {fmt(calc.totalIncome)} total income · marginal: {pct(calc.marginal)}
              </div>
            </div>
          </div>
        )}

        {/* ── OPTIMIZATIONS ── */}
        {activeTab === "optimizations" && (
          <div>
            <div style={{ fontSize: "13px", color: t.textDim, marginBottom: "16px" }}>
              Ranked by impact. At your {pct(calc.marginal)} bracket, every $1,000 in new deductions saves ~{fmt(calc.marginal * 1000)}.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {calc.opts.map((opt, i) => {
                const pc = t.optColors[opt.priority];
                return (
                  <div key={i} style={{ background: pc.bg, border: `1px solid ${pc.accent}33`, borderLeft: `4px solid ${pc.accent}`, borderRadius: "10px", padding: "15px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: t.text }}>{opt.title}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: pc.accent + "22", color: pc.accent, border: `1px solid ${pc.accent}44` }}>{opt.tag}</span>
                          <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: pc.accent + "15", color: pc.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>{opt.priority}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: t.textMuted, lineHeight: "1.55" }}>{opt.description}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "2px" }}>potential savings</div>
                        <div style={{ fontSize: "18px", fontFamily: "'DM Mono',monospace", color: t.green, fontWeight: "600" }}>~{fmt(opt.savings)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "13px 16px", marginTop: "12px" }}>
              <div style={{ fontSize: "10px", color: t.textDim, marginBottom: "4px", letterSpacing: "0.5px" }}>DISCLAIMER</div>
              <div style={{ fontSize: "12px", color: t.textFaint, lineHeight: "1.6" }}>
                Estimates only — not tax advice. Consult a licensed CPA before filing. Laws change annually and individual circumstances vary.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
