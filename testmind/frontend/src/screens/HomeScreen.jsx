import { useState, useEffect } from "react";
import { fetchDashboard, fetchInsights } from "../api";
import MetricCard from "../components/MetricCard";
import StarterPrompts from "../components/StarterPrompts";
import FilterBar from "../components/FilterBar";
import HealthScores from "../components/HealthScores";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900">TestMind</span>
          <span className="text-gray-400 text-sm">/ ZwickRoell</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          Site: Ulm
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Tests this week"
            value={loading ? "—" : (dashboard?.tests_last_7_days ?? 0)}
            onClick={() => toggleMetric("tests")}
            active={expandedMetric === "tests"}
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
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {expandedMetric === "tests" && "Tests This Week"}
                {expandedMetric === "anomalies" && "Flagged Anomalies"}
                {expandedMetric === "materials" && "Tracked Materials"}
                {expandedMetric === "boundaries" && "Boundary Risks"}
              </h3>
              <button onClick={() => setExpandedMetric(null)} className="text-xs text-gray-400 hover:text-gray-700">✕ Close</button>
            </div>

            {expandedMetric === "tests" && (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-blue-50">
                    <tr>
                      {["Date", "Material", "Type", "Machine", "Site", "Tester"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-blue-700 border-b border-blue-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_tests ?? []).map((t, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-1.5 border-b border-gray-100">{t.date}</td>
                        <td className="px-3 py-1.5 border-b border-gray-100 font-medium">{t.material}</td>
                        <td className="px-3 py-1.5 border-b border-gray-100">{t.test_type}</td>
                        <td className="px-3 py-1.5 border-b border-gray-100">{t.machine}</td>
                        <td className="px-3 py-1.5 border-b border-gray-100">{t.site}</td>
                        <td className="px-3 py-1.5 border-b border-gray-100">{t.tester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expandedMetric === "anomalies" && (
              <div className="space-y-2">
                {(dashboard.anomalies ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">No anomalies detected — all materials within normal range.</p>
                ) : (
                  (dashboard.anomalies ?? []).map((a, i) => (
                    <button key={i} onClick={() => handleNavigate(`Is ${a.material} tensile strength degrading?`)} className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 hover:border-amber-400 transition-colors">
                      <p className="text-xs font-semibold text-amber-800">{a.material}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{a.issue}</p>
                      <p className="text-[10px] text-amber-500 mt-1">Click to investigate →</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {expandedMetric === "materials" && (
              <div className="flex flex-wrap gap-2">
                {["FancyPlast 42", "UltraPlast 99", "Hostacomp G2", "Stardust", "FancyPlast 84", "NovaTex 10"].map((m) => (
                  <button key={m} onClick={() => handleNavigate(`Summarize all properties for ${m}`)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
                    {m}
                    <span className="block text-[10px] text-gray-400 mt-0.5">Click to view properties</span>
                  </button>
                ))}
              </div>
            )}

            {expandedMetric === "boundaries" && (
              <div className="space-y-2">
                {(dashboard.boundary_risks_detail ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">No boundary risks detected — all properties within safe limits.</p>
                ) : (
                  (dashboard.boundary_risks_detail ?? []).map((r, i) => (
                    <button key={i} onClick={() => handleNavigate(`Will ${r.material} ${r.property.replace(/_/g, " ")} violate ${r.boundary} MPa?`)} className="w-full text-left bg-red-50 border border-red-200 rounded-lg px-4 py-3 hover:border-red-400 transition-colors">
                      <p className="text-xs font-semibold text-red-800">{r.material}</p>
                      <p className="text-xs text-red-700 mt-0.5">{r.property.replace(/_/g, " ")}: {r.current?.toFixed(1)} MPa → boundary {r.boundary} MPa in ~{r.eta_months} months</p>
                      <p className="text-[10px] text-red-500 mt-1">Click to forecast →</p>
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
        <div className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate(inputText)}
            placeholder="Ask anything — 'Is FancyPlast 42 tensile strength declining?'"
            className="flex-1 h-[52px] px-5 border border-gray-300 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <button
            onClick={() => handleNavigate(inputText)}
            disabled={!inputText.trim()}
            className="h-[52px] px-7 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Ask
          </button>
        </div>

        {/* Starter Prompts */}
        <StarterPrompts onSelect={handleNavigate} />

        {/* Recent queries from history */}
        {recentHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Recent Queries</p>
            <div className="flex flex-wrap gap-2">
              {recentHistory.slice(0, 5).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleNavigate(q)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-gray-900 rounded-full transition-colors truncate max-w-xs"
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-700">Proactive Insights</h2>
              <span className="ml-auto text-xs text-gray-400">Auto-scanned from your data</span>
            </div>
            <div className="p-4">
              {insightsLoading ? (
                <p className="text-sm text-gray-400">Scanning materials for risks…</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {insights.map((insight, i) => (
                    <button
                      key={i}
                      onClick={() => handleNavigate(insight.action)}
                      className={`text-left rounded-xl border px-4 py-3 transition-all hover:shadow-md group ${
                        insight.severity === "critical"
                          ? "bg-red-50 border-red-200 hover:border-red-400"
                          : "bg-amber-50 border-amber-200 hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded mb-1.5 ${
                              insight.severity === "critical"
                                ? "bg-red-200 text-red-800"
                                : "bg-amber-200 text-amber-800"
                            }`}
                          >
                            {insight.severity}
                          </span>
                          <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{insight.detail}</p>
                        </div>
                        <svg
                          className="w-4 h-4 text-gray-400 group-hover:text-gray-700 flex-shrink-0 mt-0.5"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
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

        {/* Two-column row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Tests */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Recent Tests</h2>
            </div>
            {loading ? (
              <div className="px-5 py-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Date", "Material", "Type", "Machine", "Site", "Tester"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-200"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.recent_tests ?? []).map((t, i) => (
                      <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                        <td className="px-4 py-2 text-gray-500 border-b border-gray-100">{t.date}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium border-b border-gray-100">{t.material}</td>
                        <td className="px-4 py-2 text-gray-500 border-b border-gray-100">{t.test_type}</td>
                        <td className="px-4 py-2 text-gray-500 border-b border-gray-100">{t.machine}</td>
                        <td className="px-4 py-2 text-gray-500 border-b border-gray-100">{t.site}</td>
                        <td className="px-4 py-2 text-gray-500 border-b border-gray-100">{t.tester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div className="space-y-4">
            {/* Anomalies */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">Anomalies</h2>
              </div>
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="space-y-2 px-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (dashboard?.anomalies ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 py-2">No anomalies detected</p>
                ) : (
                  (dashboard?.anomalies ?? []).map((a, i) => (
                    <div
                      key={i}
                      className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold text-amber-800">{a.material}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{a.issue}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Boundary Risks */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">Boundary Risks</h2>
              </div>
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="space-y-2 px-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (dashboard?.boundary_risks_detail ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 py-2">No boundary risks detected</p>
                ) : (
                  (dashboard?.boundary_risks_detail ?? []).map((r, i) => (
                    <div
                      key={i}
                      className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold text-red-800">{r.material}</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        {r.property.replace(/_/g, " ")}: {r.current?.toFixed(1)} MPa → boundary{" "}
                        {r.boundary} MPa in ~{r.eta_months} months
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
