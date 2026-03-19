import { useState, useEffect, useRef } from "react";
import { fetchInsights } from "../api";

export default function NotificationBell({ onNavigate }) {
  const [insights, setInsights] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tm_seen_insights") || "[]"); }
    catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    fetchInsights()
      .then((data) => setInsights(data.insights || []))
      .catch(() => {});
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unseen = insights.filter(i => !seen.includes(i.title));

  const markAllSeen = () => {
    const titles = insights.map(i => i.title);
    setSeen(titles);
    localStorage.setItem("tm_seen_insights", JSON.stringify(titles));
  };

  const handleClick = (insight) => {
    setOpen(false);
    if (onNavigate) onNavigate(insight.action);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) markAllSeen(); }}
        className="relative p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unseen.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scaleIn">
            {unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-scaleIn">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 font-mono">INSIGHTS</span>
            <span className="text-[10px] text-slate-500 font-mono">{insights.length} alerts</span>
          </div>
          <div className="max-h-72 overflow-y-auto thin-scrollbar">
            {insights.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 font-mono">No insights yet</p>
            ) : (
              insights.map((insight, i) => (
                <button
                  key={i}
                  onClick={() => handleClick(insight)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-200 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      insight.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{insight.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{insight.detail}</p>
                    </div>
                    <svg className="w-3 h-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
