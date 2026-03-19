import { useState, useEffect, useRef, useCallback } from "react";

const MATERIALS = [
  "Steel", "FEP", "Spur+ 1015",
  "BEAD WIRE 1.82", "UD-TP Tape", "PTL",
];

const ACTIONS = [
  { label: "Explore Data", action: "screen:explore", icon: "chart" },
  { label: "Graph Builder", action: "screen:graph-builder", icon: "graph" },
  { label: "Go Home", action: "screen:home", icon: "home" },
];

const SAMPLE_QUERIES = [
  "Summarize all properties for Steel",
  "Show all tensile tests",
  "Compare Steel and FEP max force",
  "What standards are used in our tests?",
  "Show compression test results",
  "Correlate tensile strength and elongation",
  "List all materials in the database",
  "Show test distribution by test type",
];

function getHistory() {
  try { return JSON.parse(localStorage.getItem("tm_query_history") || "[]"); }
  catch { return []; }
}

function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette({ onNavigate, onScreenChange, open, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useCallback(() => {
    const items = [];
    const q = query.trim();

    if (!q) {
      items.push({ type: "header", label: "Actions" });
      ACTIONS.forEach(a => items.push({ type: "action", ...a }));
      items.push({ type: "header", label: "Materials" });
      MATERIALS.forEach(m => items.push({
        type: "query", label: m, query: `Summarize all properties for ${m}`,
      }));
      items.push({ type: "header", label: "Sample Queries" });
      SAMPLE_QUERIES.slice(0, 4).forEach(sq => items.push({ type: "query", label: sq, query: sq }));
      const history = getHistory();
      if (history.length > 0) {
        items.push({ type: "header", label: "Recent" });
        history.slice(0, 3).forEach(h => items.push({ type: "query", label: h, query: h }));
      }
      return items;
    }

    const matchedActions = ACTIONS.filter(a => fuzzyMatch(a.label, q));
    if (matchedActions.length) {
      items.push({ type: "header", label: "Actions" });
      matchedActions.forEach(a => items.push({ type: "action", ...a }));
    }

    const matchedMaterials = MATERIALS.filter(m => fuzzyMatch(m, q));
    if (matchedMaterials.length) {
      items.push({ type: "header", label: "Materials" });
      matchedMaterials.forEach(m => items.push({
        type: "query", label: m, query: `Summarize all properties for ${m}`,
      }));
    }

    const matchedQueries = SAMPLE_QUERIES.filter(sq => fuzzyMatch(sq, q));
    if (matchedQueries.length) {
      items.push({ type: "header", label: "Queries" });
      matchedQueries.forEach(sq => items.push({ type: "query", label: sq, query: sq }));
    }

    const matchedHistory = getHistory().filter(h => fuzzyMatch(h, q));
    if (matchedHistory.length) {
      items.push({ type: "header", label: "Recent" });
      matchedHistory.slice(0, 5).forEach(h => items.push({ type: "query", label: h, query: h }));
    }

    if (q.length > 2) {
      items.push({ type: "header", label: "Ask AI" });
      items.push({ type: "query", label: q, query: q, freeform: true });
    }

    return items;
  }, [query])();

  const selectableItems = results.filter(r => r.type !== "header");

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (item) => {
    if (!item) return;
    if (item.type === "action") {
      if (item.action.startsWith("screen:")) {
        onScreenChange(item.action.split(":")[1]);
      }
    } else if (item.type === "query") {
      onNavigate(item.query);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, selectableItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(selectableItems[selectedIndex]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let selectableIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search materials, queries, actions..."
            className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400 font-mono"
          />
          <kbd className="hidden sm:inline-block text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 font-mono">No results found</p>
          ) : (
            results.map((item, i) => {
              if (item.type === "header") {
                return (
                  <p key={`h-${i}`} className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 pt-3 pb-1 font-mono">
                    {item.label}
                  </p>
                );
              }

              selectableIndex++;
              const idx = selectableIndex;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={`${item.label}-${i}`}
                  data-index={idx}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors font-mono ${
                    isSelected ? "bg-blue-600/10 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.type === "action" ? (
                    <span className="w-5 h-5 flex items-center justify-center text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon === "chart" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        ) : item.icon === "graph" ? (
                          <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        )}
                      </svg>
                    </span>
                  ) : item.freeform ? (
                    <span className="w-5 h-5 flex items-center justify-center text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
                  <span className={`flex-1 truncate ${item.freeform ? "italic" : ""}`}>
                    {item.freeform ? `Ask: "${item.label}"` : item.label}
                  </span>
                  {isSelected && (
                    <kbd className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-mono">
                      Enter
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5">Enter</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
