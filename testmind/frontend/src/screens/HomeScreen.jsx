import { useState, useEffect } from "react";
import { fetchDashboard, fetchInsights } from "../api";
import MetricCard from "../components/MetricCard";
import StarterPrompts from "../components/StarterPrompts";
import FilterBar from "../components/FilterBar";
import HealthScores from "../components/HealthScores";
import NotificationBell from "../components/NotificationBell";

function getRecentHistory() {
  try {
    return JSON.parse(localStorage.getItem("tm_query_history") || "[]");
  } catch {
    return [];
  }
}

export default function HomeScreen({ onNavigateToChat }) {
  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [recentHistory, setRecentHistory] = useState(getRecentHistory);
  const [expandedMetric, setExpandedMetric] = useState(null);

  const toggleMetric = (key) => setExpandedMetric((prev) => (prev === key ? null : key));

  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchInsights()
      .then((data) => setInsights(data.insights || []))
      .catch(console.error)
      .finally(() => setInsightsLoading(false));

    setRecentHistory(getRecentHistory());
  }, []);

  const handleNavigate = (msg) => {
    const text = msg.trim();
    if (text) onNavigateToChat(text);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] grid-pattern">
      {/* Header */}
      <header className="bg-[#141820] border-b border-[#1e2433] px-8 py-4 flex justify-between items-center">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-white tracking-tight font-mono">TestMind</span>
          <span className="text-slate-500 text-sm font-mono">/ ZwickRoell</span>
          <span className="text-[10px] text-slate-600 font-mono ml-2 bg-slate-800 px-2 py-0.5 rounded">v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToChat && onNavigateToChat("")}
            className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            title="Quick search (Cmd+K)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
            <kbd className="text-[10px] text-slate-500 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 font-mono ml-1">⌘K</kbd>
          </button>
          <NotificationBell onNavigate={handleNavigate} />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">ONLINE</span>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded font-mono border border-slate-700">
            SITE: ULM
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Tests this week"
            value={loading ? "—" : (dashboard?.tests_last_7_days ?? 0)}
            onClick={() => toggleMetric("tests")}
            active={expandedMetric === "tests"}
            sparklineData={dashboard?.sparkline_tests}
            subtitle="last 14 days activity"
          />
          <MetricCard
            label="Anomalies flagged"
            value={loading ? "—" : (dashboard?.anomalies_flagged ?? 0)}
            color={(dashboard?.anomalies_flagged ?? 0) > 0 ? "warning" : "default"}
            onClick={() => toggleMetric("anomalies")}
            active={expandedMetric === "anomalies"}
          />
          <MetricCard
            label="Materials tracked"
            value={loading ? "—" : (dashboard?.materials_in_db ?? 0)}
            onClick={() => toggleMetric("materials")}
            active={expandedMetric === "materials"}
          />
          <MetricCard
            label="Boundary risks"
            value={loading ? "—" : (dashboard?.boundary_risks ?? 0)}
            color={(dashboard?.boundary_risks ?? 0) > 0 ? "danger" : "default"}
            onClick={() => toggleMetric("boundaries")}
            active={expandedMetric === "boundaries"}
          />
        </div>

        {/* Metric Detail Panel */}
        {expandedMetric && dashboard && (
          <div className="card-dark p-5 animate-fadeIn border-blue-900/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider">
                {expandedMetric === "tests" && "Tests This Week"}
                {expandedMetric === "anomalies" && "Flagged Anomalies"}
                {expandedMetric === "materials" && "Tracked Materials"}
                {expandedMetric === "boundaries" && "Boundary Risks"}
              </h3>
              <button onClick={() => setExpandedMetric(null)} className="text-xs text-slate-500 hover:text-slate-300">✕ Close</button>
            </div>

            {expandedMetric === "tests" && (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs border-collapse table-dark">
                  <thead>
                    <tr>
                      {["Date", "Material", "Type", "Machine", "Site", "Tester"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_tests ?? []).map((t, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono text-slate-500">{t.date}</td>
                        <td className="px-3 py-1.5 font-medium text-slate-200">{t.material}</td>
                        <td className="px-3 py-1.5">{t.test_type}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-400">{t.machine}</td>
                        <td className="px-3 py-1.5">{t.site}</td>
                        <td className="px-3 py-1.5">{t.tester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expandedMetric === "anomalies" && (
              <div className="space-y-2">
                {(dashboard.anomalies ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No anomalies detected — all materials within normal range.</p>
                ) : (
                  (dashboard.anomalies ?? []).map((a, i) => (
                    <button key={i} onClick={() => handleNavigate(`Is ${a.material} tensile strength degrading?`)} className="w-full text-left bg-amber-950/30 border border-amber-800/40 rounded-lg px-4 py-3 hover:border-amber-600/60 transition-colors">
                      <p className="text-xs font-semibold text-amber-400 font-mono">{a.material}</p>
                      <p className="text-xs text-amber-300/70 mt-0.5">{a.issue}</p>
                      <p className="text-[10px] text-amber-500/50 mt-1">Click to investigate →</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {expandedMetric === "materials" && (
              <div className="flex flex-wrap gap-2">
                {["FancyPlast 42", "UltraPlast 99", "Hostacomp G2", "Stardust", "FancyPlast 84", "NovaTex 10"].map((m) => (
                  <button key={m} onClick={() => handleNavigate(`Summarize all properties for ${m}`)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors font-mono">
                    {m}
                    <span className="block text-[10px] text-slate-500 mt-0.5 font-sans">Click to view</span>
                  </button>
                ))}
              </div>
            )}

            {expandedMetric === "boundaries" && (
              <div className="space-y-2">
                {(dashboard.boundary_risks_detail ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No boundary risks detected.</p>
                ) : (
                  (dashboard.boundary_risks_detail ?? []).map((r, i) => (
                    <button key={i} onClick={() => handleNavigate(`Will ${r.material} ${r.property.replace(/_/g, " ")} violate ${r.boundary} MPa?`)} className="w-full text-left bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3 hover:border-red-600/60 transition-colors">
                      <p className="text-xs font-semibold text-red-400 font-mono">{r.material}</p>
                      <p className="text-xs text-red-300/70 mt-0.5">{r.property.replace(/_/g, " ")}: {r.current?.toFixed(1)} MPa → boundary {r.boundary} MPa in ~{r.eta_months}mo</p>
                      <p className="text-[10px] text-red-500/50 mt-1">Click to forecast →</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Material Health Scores */}
        <HealthScores onNavigate={handleNavigate} />

        {/* Visual Filters */}
        <FilterBar onFilter={handleNavigate} />

        {/* Chat Bar */}
        <div className="relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNavigate(inputText)}
                placeholder="Ask anything — 'Is FancyPlast 42 tensile strength declining?'"
                className="w-full h-[48px] px-5 pr-16 border border-slate-700 rounded-lg text-sm bg-[#1e2433] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 font-mono pointer-events-none">
                ⌘K
              </kbd>
            </div>
            <button
              onClick={() => handleNavigate(inputText)}
              disabled={!inputText.trim()}
              className="h-[48px] px-6 bg-blue-600 text-white rounded-lg font-mono text-sm hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              QUERY
            </button>
          </div>
        </div>

        {/* Starter Prompts */}
        <StarterPrompts onSelect={handleNavigate} />

        {/* Recent queries */}
        {recentHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 font-mono">Recent Queries</p>
            <div className="flex flex-wrap gap-2">
              {recentHistory.slice(0, 5).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleNavigate(q)}
                  className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded transition-colors truncate max-w-xs font-mono"
                  title={q}
                >
                  ↩ {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Proactive Insights */}
        {(insightsLoading || insights.length > 0) && (
          <div className="card-dark overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#2a3144] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">Proactive Insights</h2>
              <span className="ml-auto text-xs text-slate-500 font-mono">Auto-scanned</span>
            </div>
            <div className="p-4">
              {insightsLoading ? (
                <p className="text-sm text-slate-500 font-mono">Scanning materials for risks…</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {insights.map((insight, i) => (
                    <button
                      key={i}
                      onClick={() => handleNavigate(insight.action)}
                      className={`text-left rounded-lg border px-4 py-3 transition-all hover-lift group animate-fadeInUp ${
                        insight.severity === "critical"
                          ? "bg-red-950/30 border-red-800/40 hover:border-red-600/60"
                          : "bg-amber-950/30 border-amber-800/40 hover:border-amber-600/60"
                      }`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1.5 font-mono ${
                              insight.severity === "critical"
                                ? "bg-red-900/50 text-red-400"
                                : "bg-amber-900/50 text-amber-400"
                            }`}
                          >
                            {insight.severity}
                          </span>
                          <p className="text-sm font-semibold text-slate-200">{insight.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{insight.detail}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Quality Banner */}
        {dashboard && !loading && (
          <div className="card-dark px-5 py-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Data Quality</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span><span className="text-slate-300">{dashboard.recent_tests?.length || 0}</span> recent</span>
                <span><span className="text-slate-300">{dashboard.materials_in_db}</span> materials</span>
                <span>Coverage: <span className="text-emerald-400">2023-2025</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {["bg-emerald-500", "bg-emerald-500", "bg-emerald-500", "bg-amber-500", "bg-emerald-500"].map((c, i) => (
                  <span key={i} className={`w-1.5 h-4 rounded-full ${c}`} title={["Freshness", "Completeness", "Consistency", "Coverage", "Volume"][i]} />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">4/5 GREEN</span>
            </div>
          </div>
        )}

        {/* Two-column row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Tests */}
          <div className="card-dark overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#2a3144]">
              <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">Recent Tests</h2>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs table-dark">
                  <thead>
                    <tr>
                      {["Date", "Material", "Type", "Machine", "Site", "Tester"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.recent_tests ?? []).map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-mono text-slate-500">{t.date}</td>
                        <td className="px-4 py-2 font-medium text-slate-200">{t.material}</td>
                        <td className="px-4 py-2 text-slate-400">{t.test_type}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{t.machine}</td>
                        <td className="px-4 py-2 text-slate-400">{t.site}</td>
                        <td className="px-4 py-2 text-slate-400">{t.tester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div className="space-y-4">
            <div className="card-dark overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#2a3144]">
                <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">Anomalies</h2>
              </div>
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="space-y-2 px-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (dashboard?.anomalies ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500 px-2 py-2 font-mono">No anomalies detected</p>
                ) : (
                  (dashboard?.anomalies ?? []).map((a, i) => (
                    <div key={i} className="bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-400 font-mono">{a.material}</p>
                      <p className="text-xs text-amber-300/70 mt-0.5">{a.issue}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card-dark overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#2a3144]">
                <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">Boundary Risks</h2>
              </div>
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="space-y-2 px-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (dashboard?.boundary_risks_detail ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500 px-2 py-2 font-mono">No boundary risks</p>
                ) : (
                  (dashboard?.boundary_risks_detail ?? []).map((r, i) => (
                    <div key={i} className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-semibold text-red-400 font-mono">{r.material}</p>
                      <p className="text-xs text-red-300/70 mt-0.5">
                        {r.property.replace(/_/g, " ")}: {r.current?.toFixed(1)} MPa → boundary {r.boundary} MPa in ~{r.eta_months}mo
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
