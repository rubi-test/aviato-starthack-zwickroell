import { useState, useEffect } from "react";
import { fetchHealthScores } from "../api";

function RingGauge({ score, size = 72, strokeWidth = 6 }) {
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

export default function HealthScores({ onNavigate }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="p-4 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-[72px] h-[72px] rounded-full bg-slate-100 animate-pulse" />
              <div className="w-14 h-2.5 bg-slate-100 rounded animate-pulse" />
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
        <span className="ml-auto text-xs text-slate-400 font-mono">click to analyze</span>
      </div>

      {/* Fixed height — shows ~2 rows, scrolls if more */}
      <div className="overflow-y-auto" style={{ maxHeight: "220px" }}>
        <div className="p-4 grid grid-cols-4 gap-3">
          {scores.map((s) => {
            const statusColor =
              s.status === "healthy"
                ? "text-emerald-600"
                : s.status === "attention"
                ? "text-amber-600"
                : "text-red-600";

            return (
              <button
                key={s.material}
                onClick={() => onNavigate && onNavigate(`Give me a full overview of the material "${s.material}". Use summarize_material_properties("${s.material}") to get its strength stats, trends, variability, and any quality concerns.`)}
                className="flex flex-col items-center p-2.5 rounded-xl hover:bg-slate-50 transition-all group"
                title={`${s.material} — Score: ${s.score}/100 · Click to analyze`}
              >
                <div className="relative">
                  <RingGauge score={s.score} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold font-mono ${statusColor}`}>{s.score}</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1 text-center leading-tight max-w-[90px] group-hover:text-blue-600 transition-colors">{s.material}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wider font-mono ${statusColor}`}>{s.status}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
