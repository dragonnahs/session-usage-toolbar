import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const VERSION = "0.2.1";
const el = React.createElement;
let host;
let activeOverlay = null;

const labelMap = { input: "输入", cacheRead: "缓存命中", cacheCreation: "缓存创建", output: "输出", reasoning: "思考" };
const accents = ["#5b6ee1", "#3fa9e0", "#9b6ee8", "#3fae8a", "#d0894a"];
const compact = (n) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Math.max(0, Number(n) || 0));
const exact = (n) => new Intl.NumberFormat("en-US").format(Math.max(0, Number(n) || 0));

async function call(method, args) { return host.dispatch("plugin.call", { method, args }); }

const T = {
  bg: "var(--ds-bg-primary, #f5f6fa)",
  card: "var(--ds-bg-secondary, #ffffff)",
  border: "var(--ds-border, #e5e8f1)",
  text: "var(--ds-fg-primary, #151c2c)",
  sub: "var(--ds-fg-secondary, #6b778d)",
  accent: "var(--ds-accent, #5b6ee1)",
  soft: "rgba(91,110,225,.10)",
};
const shadow = "0 1px 2px rgba(17,24,39,.04), 0 10px 26px -18px rgba(17,24,39,.35)";
const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: shadow, boxSizing: "border-box", minWidth: 0 };
const subText = { color: T.sub, fontSize: 12, margin: 0, lineHeight: 1.45 };
const thinScroll = { scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent`, overscrollBehavior: "contain" };

const shell = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  width: "100vw", height: "100vh", boxSizing: "border-box",
  zIndex: 2147483000, display: "flex", flexDirection: "column",
  padding: "22px clamp(16px, 3.6vw, 56px) 20px",
  background: T.bg, color: T.text, overflow: "hidden",
  fontFamily: "var(--ds-font-family, system-ui, -apple-system, 'Segoe UI', sans-serif)",
  lineHeight: 1.5,
};
const header = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flex: "0 0 auto", marginBottom: 16 };
const scroller = { flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 4, display: "grid", gap: 16, alignContent: "start", ...thinScroll };
const stack = { display: "grid", gap: 16, maxWidth: 1040, width: "100%", margin: "0 auto" };

function UsageIcon({ size = 17 }) {
  return el("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    el("path", { d: "M4 19V5" }), el("path", { d: "M4 19h16" }),
    el("rect", { x: 7, y: 12, width: 2.8, height: 4, rx: 1, fill: "currentColor", stroke: "none" }),
    el("rect", { x: 11.3, y: 9, width: 2.8, height: 7, rx: 1, fill: "currentColor", stroke: "none" }),
    el("rect", { x: 15.6, y: 6, width: 2.8, height: 10, rx: 1, fill: "currentColor", stroke: "none" }));
}
const CloseIcon = () => el("svg", { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }, el("path", { d: "m7 7 10 10M17 7 7 17" }));
const RefreshIcon = () => el("svg", { viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, el("path", { d: "M20 11a8 8 0 0 0-14.8-4L3 10" }), el("path", { d: "M3 4v6h6" }), el("path", { d: "M4 13a8 8 0 0 0 14.8 4L21 14" }), el("path", { d: "M21 20v-6h-6" }));

const ghostButton = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", font: "inherit", fontSize: 12,
  border: `1px solid ${T.border}`, borderRadius: 9, background: T.card, color: T.sub, cursor: "pointer", lineHeight: 1,
};

function SectionHead({ title, chips }) {
  return el("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 } },
    el("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
      el("span", { style: { width: 3, height: 14, borderRadius: 3, background: T.accent } }),
      el("h2", { style: { margin: 0, fontSize: 13.5, fontWeight: 650, letterSpacing: ".01em" } }, title)),
    chips ? el("span", { style: { ...subText, fontSize: 11, whiteSpace: "nowrap" } }, chips) : null);
}

function MetricCard({ label, value, color }) {
  return el("div", { style: { ...card, padding: "13px 15px", boxShadow: "none", background: T.card } },
    el("div", { style: { display: "flex", alignItems: "center", gap: 7 } },
      el("span", { style: { width: 7, height: 7, borderRadius: "50%", background: color } }),
      el("span", { style: { ...subText, fontSize: 11.5 } }, label)),
    el("strong", { style: { display: "block", fontSize: 23, fontWeight: 650, letterSpacing: "-.03em", margin: "7px 0 2px" } }, compact(value)),
    el("small", { style: { ...subText, fontSize: 10.5, opacity: .85 } }, `${exact(value)} tokens`));
}

function TrendBars({ rows }) {
  const visible = rows.slice(-12);
  if (!visible.length) return el("div", { style: { ...subText, padding: "30px 0", textAlign: "center" } }, "完成回合后显示趋势");
  const max = Math.max(1, ...visible.map((r) => r.input + r.cacheRead + r.cacheCreation + r.output));
  return el("div", { style: { display: "flex", alignItems: "flex-end", gap: 7, height: 158, marginTop: 4 } },
    visible.map((row, i) => {
      const amount = row.input + row.cacheRead + row.cacheCreation + row.output;
      return el("div", { key: row.id, title: `第 ${i + 1} 次 · ${exact(amount)} tokens`, style: { flex: 1, minWidth: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 5 } },
        el("span", { style: { fontSize: 9, color: T.sub, fontVariantNumeric: "tabular-nums" } }, compact(amount)),
        el("div", { style: { width: "100%", maxWidth: 30, height: 116, display: "flex", alignItems: "flex-end", background: T.soft, borderRadius: 6 } },
          el("div", { style: { width: "100%", height: `${Math.max(6, (amount / max) * 100)}%`, background: "linear-gradient(180deg, #7d8bff, #5b6ee1)", borderRadius: 6 } })),
        el("span", { style: { fontSize: 9, color: T.sub } }, i + 1));
    }));
}

function Breakdown({ row }) {
  return el("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 3 } },
    ["input", "cacheRead", "cacheCreation", "output", "reasoning"].filter((k) => row[k] > 0).map((k) =>
      el("span", { key: k, style: { fontSize: 10, color: T.sub } }, `${labelMap[k]} ${compact(row[k])}`)));
}

function DetailRow({ row }) {
  const total = row.input + row.cacheRead + row.cacheCreation + row.output;
  return el("div", { style: { display: "grid", gridTemplateColumns: "8px minmax(0, 1fr) auto", gap: 11, alignItems: "center", padding: "10px 8px", borderRadius: 9 } },
    el("span", { style: { width: 7, height: 7, borderRadius: "50%", background: T.accent } }),
    el("div", { style: { minWidth: 0 } },
      el("div", { style: { display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 } },
        el("b", { style: { fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, row.model),
        el("span", { style: { ...subText, fontSize: 10 } }, row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "时间未记录")),
      el(Breakdown, { row })),
    el("strong", { style: { fontSize: 13, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, compact(total)));
}

function StateCard({ title, hint }) {
  return el("div", { style: { ...card, padding: "44px 24px", textAlign: "center" } },
    el("span", { style: { display: "grid", placeItems: "center", width: 42, height: 42, margin: "0 auto 12px", borderRadius: 12, background: T.soft, color: T.accent } }, el(UsageIcon, { size: 20 })),
    el("strong", { style: { display: "block", fontSize: 14.5, marginBottom: 6 } }, title),
    el("p", { style: { ...subText, margin: 0 } }, hint));
}

function UsagePage({ onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const active = await call("getActiveSession");
      if (!active?.sessionId) { setData({ status: "empty" }); return; }
      setData(await call("getUsage", { sessionId: active.sessionId }));
    } catch (cause) {
      setError(cause?.message ? `${cause.message}${cause.code ? `（${cause.code}）` : ""}` : String(cause));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const total = data?.total ?? {};
  const rows = data?.rows ?? [];
  const models = data?.models ?? [];
  const ready = data?.status === "ready";
  const pct = Math.round((data?.cacheHitRate ?? 0) * 1000) / 10;

  return el("div", { style: shell, role: "dialog", "aria-label": "会话用量" },
    el("header", { style: header },
      el("div", { style: { display: "flex", alignItems: "center", gap: 11, minWidth: 0, maxWidth: 1040, margin: "0 auto", width: "100%", justifyContent: "space-between" } },
        el("div", { style: { display: "flex", alignItems: "center", gap: 11, minWidth: 0 } },
          el("span", { style: { display: "grid", placeItems: "center", width: 38, height: 38, flexShrink: 0, borderRadius: 11, background: T.soft, color: T.accent } }, el(UsageIcon, { size: 19 })),
          el("div", { style: { minWidth: 0 } },
            el("h1", { style: { margin: 0, fontSize: 17.5, fontWeight: 660, letterSpacing: "-.02em" } }, "会话用量"),
            el("p", { style: { ...subText, fontSize: 11.5 } }, `当前会话 · v${VERSION}`))),
        el("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 } },
          el("button", { onClick: () => void load(), disabled: loading, style: { ...ghostButton, opacity: loading ? .55 : 1 } }, el(RefreshIcon), loading ? "读取中" : "刷新"),
          el("button", { onClick: onClose, "aria-label": "关闭", style: { ...ghostButton, padding: 8 } }, el(CloseIcon))))),

    el("div", { style: scroller },
      el("div", { style: stack },
        error ? el(StateCard, { title: "读取用量失败", hint: error })
          : loading && !data ? el(StateCard, { title: "正在读取当前会话用量…", hint: "数据来自宿主已完成的回合。" })
          : !ready ? el(StateCard, { title: "当前会话暂无可用用量", hint: "完成一次模型回复后，这里会显示统计数据。" })
          : el(React.Fragment, null,
            el("section", { style: { ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "20px 22px" } },
              el("div", { style: { minWidth: 0 } },
                el("span", { style: { ...subText, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" } }, "总消耗"),
                el("strong", { style: { display: "block", fontSize: 38, fontWeight: 660, lineHeight: 1.1, letterSpacing: "-.05em", margin: "4px 0 2px", fontVariantNumeric: "tabular-nums" } }, compact(data.totalTokens)),
                el("small", { style: { ...subText, fontSize: 11 } }, `${exact(data.totalTokens)} tokens`)),
              el("div", { style: { width: 84, height: 84, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", alignContent: "center", textAlign: "center", background: `conic-gradient(#5b6ee1 ${pct}%, ${T.border} ${pct}% 100%)` } },
                el("div", { style: { width: 68, height: 68, borderRadius: "50%", display: "grid", placeItems: "center", alignContent: "center", background: T.card } },
                  el("b", { style: { fontSize: 15.5, fontVariantNumeric: "tabular-nums" } }, `${pct.toFixed(1)}%`),
                  el("span", { style: { ...subText, fontSize: 9.5 } }, "缓存命中")))),

            el("section", null,
              el(SectionHead, { title: "Token 明细", chips: "按类型拆分" }),
              el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 10 } },
                Object.entries(labelMap).map(([key, label], i) => el(MetricCard, { key, label, value: total[key], color: accents[i % accents.length] })))),

            el("section", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14 } },
              el("div", { style: { ...card, padding: "16px 18px" } },
                el(SectionHead, { title: "用量趋势", chips: `最近 ${Math.min(rows.length, 12)} 次回复` }),
                el(TrendBars, { rows })),
              el("div", { style: { ...card, padding: "16px 18px" } },
                el(SectionHead, { title: "模型分布", chips: `${models.length} 个模型` }),
                el("div", { style: { display: "grid", gap: 14 } },
                  models.map((item) => {
                    const amount = item.input + item.cacheRead + item.cacheCreation + item.output;
                    const ratio = data.totalTokens ? (amount / data.totalTokens) * 100 : 0;
                    return el("div", { key: item.model },
                      el("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 } },
                        el("b", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, item.model),
                        el("span", { style: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, compact(amount))),
                      el("div", { style: { height: 6, borderRadius: 99, background: T.soft, margin: "7px 0 4px", overflow: "hidden" } },
                        el("div", { style: { width: `${Math.max(2, ratio)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #7d8bff, #5b6ee1)" } })),
                      el("small", { style: { ...subText, fontSize: 10 } }, `${item.turns} 次回复 · ${ratio.toFixed(1)}%`));
                  })))),

            el("section", { style: { ...card, padding: "16px 18px", display: "flex", flexDirection: "column", minHeight: 0 } },
              el(SectionHead, { title: "回复明细", chips: `${rows.length} 条已完成请求` }),
              el("div", { style: { maxHeight: 300, overflowY: "auto", paddingRight: 6, display: "grid", gap: 2, ...thinScroll } },
                rows.slice().reverse().map((row) => el(DetailRow, { key: row.id, row }))))))));
}

function TokenButton() {
  const [busy, setBusy] = useState(false);
  const open = () => {
    try {
      activeOverlay?.();
      setBusy(true);
      const mount = document.createElement("div");
      mount.setAttribute("data-sut-overlay", "");
      document.body.appendChild(mount);
      const root = createRoot(mount);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (activeOverlay === close) activeOverlay = null;
        try { root.unmount(); } catch { /* already gone */ }
        mount.remove();
      };
      activeOverlay = close;
      root.render(el(UsagePage, { onClose: close }));
    } catch (cause) {
      console.error("Session usage failed", cause);
      if (host?.ui?.showToast) void host.ui.showToast(`会话用量打开失败：${cause?.message ?? cause}`);
    } finally { setBusy(false); }
  };
  return el("button", {
    onClick: open, disabled: busy, title: "会话用量", "aria-label": "打开会话用量",
    style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 28, padding: 0, border: 0, borderRadius: 8, background: "transparent", color: "var(--ds-fg-secondary, #6b778d)", cursor: "pointer" },
  }, el(UsageIcon));
}

export function onLoad(pi) {
  host = pi;
  pi.slots.register({ slot: "composerControl", positions: ["right"], component: () => el(TokenButton) });
}

export function onUnload() {
  activeOverlay?.();
  activeOverlay = null;
  host = null;
}
