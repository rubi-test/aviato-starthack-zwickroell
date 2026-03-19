import { useState, useEffect } from "react";
import { fetchDashboard } from "../api";
import MetricCard from "../components/MetricCard";
import StarterPrompts from "../components/StarterPrompts";

export default function HomeScreen({ onNavigateToChat }) {
  const [dashboard, setDashboard] = useState(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
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
          />
          <MetricCard
            label="Anomalies flagged"
            value={loading ? "—" : (dashboard?.anomalies_flagged ?? 0)}
            color={(dashboard?.anomalies_flagged ?? 0) > 0 ? "warning" : "default"}
          />
          <MetricCard
            label="Materials tracked"
            value={loading ? "—" : (dashboard?.materials_in_db ?? 0)}
          />
          <MetricCard
            label="Boundary risks"
            value={loading ? "—" : (dashboard?.boundary_risks ?? 0)}
            color={(dashboard?.boundary_risks ?? 0) > 0 ? "danger" : "default"}
          />
        </div>

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

        {/* Two-column row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Tests */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Recent Tests</h2>
            </div>
            {loading ? (
              <p className="px-5 py-5 text-sm text-gray-400">Loading…</p>
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
                  <p className="text-sm text-gray-400 px-2 py-2">Loading…</p>
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
                  <p className="text-sm text-gray-400 px-2 py-2">Loading…</p>
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
