import { useState, useEffect } from "react";
import { fetchHealthScores } from "../api";

function RingGauge({ score, size = 90, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const bgColor = score >= 75 ? "#dcfce7" : score >= 50 ? "#fef3c7" : "#fee2e2";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

function BreakdownBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-24 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-gray-600 font-mono w-8">{value}</span>
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-gray-700">Material Health Scores</h2>
        </div>
        <div className="p-6 flex gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-[90px] h-[90px] rounded-full bg-gray-100 animate-pulse" />
              <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!scores.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <h2 className="text-sm font-semibold text-gray-700">Material Health Scores</h2>
        <span className="ml-auto text-xs text-gray-400">Composite score from trend, variability, and boundary risk</span>
      </div>

      <div className="p-5">
        {/* Ring gauges row */}
        <div className="flex justify-around flex-wrap gap-4">
          {scores.map((s) => {
            const isExpanded = expanded === s.material;
            const statusColor = s.status === "healthy" ? "text-green-600" : s.status === "attention" ? "text-amber-600" : "text-red-600";

            return (
              <button
                key={s.material}
                onClick={() => setExpanded(isExpanded ? null : s.material)}
                className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                  isExpanded ? "bg-blue-50 ring-2 ring-blue-200" : "hover:bg-gray-50"
                }`}
              >
                <div className="relative">
                  <RingGauge score={s.score} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${statusColor}`}>{s.score}</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 mt-1.5 text-center max-w-[100px] leading-tight">{s.material}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${statusColor}`}>{s.status}</p>
              </button>
            );
          })}
        </div>

        {/* Expanded breakdown */}
        {expanded && (() => {
          const s = scores.find((x) => x.material === expanded);
          if (!s) return null;
          const b = s.breakdown;
          const d = s.details;

          return (
            <div className="mt-5 pt-5 border-t border-gray-200 animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{s.material} — Score Breakdown</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.n_tests} tests analyzed · Mean: {d.mean} MPa · CV: {d.cv_pct}%
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(`Summarize all properties for ${s.material}`); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Full analysis →
                </button>
              </div>
              <div className="space-y-2.5">
                <BreakdownBar
                  label="Trend Stability"
                  value={b.trend_stability}
                  color={b.trend_stability >= 75 ? "#16a34a" : b.trend_stability >= 50 ? "#d97706" : "#dc2626"}
                />
                <BreakdownBar
                  label="Low Variability"
                  value={b.variability}
                  color={b.variability >= 75 ? "#16a34a" : b.variability >= 50 ? "#d97706" : "#dc2626"}
                />
                <BreakdownBar
                  label="Boundary Safety"
                  value={b.boundary_proximity}
                  color={b.boundary_proximity >= 75 ? "#16a34a" : b.boundary_proximity >= 50 ? "#d97706" : "#dc2626"}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
