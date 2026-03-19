import { useState, useEffect } from "react";
import { fetchHealthScores } from "../api";

function RingGauge({ score, size = 90, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const bgColor = score >= 75 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

function BreakdownBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-28 text-right font-mono">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-slate-500 font-mono w-8">{value}</span>
    </div>
  );
}

export default function HealthScores({ onNavigate }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchHealthScores()
      .then((data) => setScores(data.scores || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card-dark overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-700 font-mono uppercase tracking-wider">Material Health</h2>
        </div>
        <div className="p-6 flex gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-[90px] h-[90px] rounded-full bg-slate-100 animate-pulse" />
              <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!scores.length) return null;

  return (
    <div className="card-dark overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-700 font-mono uppercase tracking-wider">Material Health</h2>
        <span className="ml-auto text-xs text-slate-500 font-mono">trend + variability + boundary</span>
      </div>

      <div className="p-5">
        <div className="flex justify-around flex-wrap gap-4">
          {scores.map((s) => {
            const isExpanded = expanded === s.material;
            const statusColor = s.status === "healthy" ? "text-emerald-600" : s.status === "attention" ? "text-amber-600" : "text-red-600";

            return (
              <button
                key={s.material}
                onClick={() => setExpanded(isExpanded ? null : s.material)}
                className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                  isExpanded ? "bg-slate-100 ring-1 ring-blue-500/30" : "hover:bg-slate-50"
                }`}
              >
                <div className="relative">
                  <RingGauge score={s.score} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold font-mono ${statusColor}`}>{s.score}</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1.5 text-center max-w-[100px] leading-tight">{s.material}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 font-mono ${statusColor}`}>{s.status}</p>
              </button>
            );
          })}
        </div>

        {expanded && (() => {
          const s = scores.find((x) => x.material === expanded);
          if (!s) return null;
          const b = s.breakdown;
          const d = s.details;

          return (
            <div className="mt-5 pt-5 border-t border-slate-200 animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 font-mono">{s.material} — Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {d.n_tests} tests · Mean: {d.mean} MPa · CV: {d.cv_pct}%
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(`Summarize all properties for ${s.material}`); }}
                  className="text-xs text-blue-600 hover:text-blue-500 font-mono"
                >
                  ANALYZE →
                </button>
              </div>
              <div className="space-y-2.5">
                <BreakdownBar label="Trend Stability" value={b.trend_stability} color={b.trend_stability >= 75 ? "#10b981" : b.trend_stability >= 50 ? "#f59e0b" : "#ef4444"} />
                <BreakdownBar label="Low Variability" value={b.variability} color={b.variability >= 75 ? "#10b981" : b.variability >= 50 ? "#f59e0b" : "#ef4444"} />
                <BreakdownBar label="Boundary Safety" value={b.boundary_proximity} color={b.boundary_proximity >= 75 ? "#10b981" : b.boundary_proximity >= 50 ? "#f59e0b" : "#ef4444"} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
