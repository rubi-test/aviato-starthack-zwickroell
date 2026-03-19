import { useRef, useState } from "react";
import ChartArea from "./ChartArea";
import AuditTrail from "./AuditTrail";
import Markdown from "./Markdown";
import { useToast } from "./Toast";

function exportAsPNG(chartRef, toolUsed) {
  const el = chartRef.current;
  if (!el) return;

  // Use SVG from Recharts
  const svg = el.querySelector("svg.recharts-surface");
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `testmind_${toolUsed || "chart"}_${Date.now()}.png`;
    a.click();
  };
  img.src = url;
}

function exportToCSV(chartData, toolUsed) {
  let rows = [];

  if (chartData?.tests) {
    rows = chartData.tests;
  } else if (chartData?.properties) {
    rows = chartData.properties;
  } else if (chartData?.failed_test_samples) {
    rows = chartData.failed_test_samples;
  } else if (Array.isArray(chartData)) {
    rows = chartData;
  }

  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    ),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `testmind_${toolUsed || "export"}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsPanel({ response, onFollowUp }) {
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const addToast = useToast();
  const [pinnedResponse, setPinnedResponse] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center space-y-4 max-w-xs">
          {/* Animated illustration */}
          <div className="relative mx-auto w-24 h-24">
            <svg viewBox="0 0 96 96" className="w-24 h-24 animate-fadeIn">
              <rect x="12" y="30" width="18" height="46" rx="3" fill="#dbeafe" className="animate-fadeInUp" style={{ animationDelay: "0.1s" }} />
              <rect x="38" y="18" width="18" height="58" rx="3" fill="#93c5fd" className="animate-fadeInUp" style={{ animationDelay: "0.2s" }} />
              <rect x="64" y="40" width="18" height="36" rx="3" fill="#3b82f6" className="animate-fadeInUp" style={{ animationDelay: "0.3s" }} />
              <line x1="8" y1="78" x2="88" y2="78" stroke="#e5e7eb" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Results will appear here</p>
            <p className="text-xs text-gray-400 mt-1">Ask a question on the left to get started</p>
          </div>
          <div className="flex flex-col gap-1.5 text-[10px] text-gray-400">
            <span>Try: "Is FancyPlast 42 tensile strength declining?"</span>
            <span>or press <kbd className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 font-mono">⌘K</kbd> for quick search</span>
          </div>
        </div>
      </div>
    );
  }

  const { answer, chart_type, chart_data, steps, tool_used, tool_result, suggested_followups } = response;

  const canExportCSV = chart_type === "table" || chart_type === "compliance";
  const canExportPNG = chart_type && !["table", "compliance"].includes(chart_type);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-5 space-y-4 thin-scrollbar relative"
      onScroll={(e) => setShowScrollTop(e.target.scrollTop > 200)}
    >
      {/* Quick stat badges from chart data */}
      {chart_data && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          {chart_data.material && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 font-medium">
              {chart_data.material}
            </span>
          )}
          {chart_data.trend_direction && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              chart_data.trend_direction === "decreasing" ? "bg-red-50 text-red-700 border-red-100" :
              chart_data.trend_direction === "increasing" ? "bg-green-50 text-green-700 border-green-100" :
              "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              Trend: {chart_data.trend_direction}
            </span>
          )}
          {chart_data.r_squared != null && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100 font-mono">
              R²={chart_data.r_squared}
            </span>
          )}
          {chart_data.pass_rate_pct != null && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
              chart_data.pass_rate_pct >= 95 ? "bg-green-50 text-green-700 border-green-100" :
              chart_data.pass_rate_pct >= 80 ? "bg-amber-50 text-amber-700 border-amber-100" :
              "bg-red-50 text-red-700 border-red-100"
            }`}>
              Pass rate: {chart_data.pass_rate_pct}%
            </span>
          )}
          {chart_data.correlation_coefficient != null && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 font-mono">
              r={chart_data.correlation_coefficient}
            </span>
          )}
          {chart_data.will_violate != null && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
              chart_data.will_violate ? "bg-red-50 text-red-700 border-red-100" : "bg-green-50 text-green-700 border-green-100"
            }`}>
              {chart_data.will_violate ? "Violation predicted" : "Within bounds"}
            </span>
          )}
          {chart_data.count != null && (
            <span className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
              {chart_data.count} results
            </span>
          )}
        </div>
      )}

      {/* Confidence indicator */}
      {chart_data && (() => {
        let score = 50; // base
        if (chart_data.r_squared != null) score += chart_data.r_squared * 30;
        if (chart_data.count != null) score += Math.min(chart_data.count / 10, 20);
        if (chart_data.significant) score += 15;
        if (chart_data.pass_rate_pct != null) score += 5;
        score = Math.min(Math.round(score), 100);
        const level = score >= 85 ? "High" : score >= 60 ? "Medium" : "Low";
        const color = score >= 85 ? "green" : score >= 60 ? "amber" : "red";
        return (
          <div className="flex items-center gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider text-${color}-600`}>
                {level} confidence
              </span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-${color}-500 transition-all duration-700`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{score}%</span>
            </div>
          </div>
        );
      })()}

      {/* Natural language answer */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {tool_used && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                {tool_used.replace(/_/g, " ")}
              </p>
            )}
            <Markdown>
              {answer || ""}
            </Markdown>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {/* Copy answer */}
            {answer && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(answer).then(() => addToast("Copied to clipboard", "success"));
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors"
                title="Copy answer text"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            )}
            {canExportCSV && chart_data && (
              <button
                onClick={() => { exportToCSV(chart_data, tool_used); addToast("CSV exported", "success"); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors"
                title="Export as CSV"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </button>
            )}
            {canExportPNG && chart_data && (
              <button
                onClick={() => { exportAsPNG(chartRef, tool_used); addToast("Chart exported as PNG", "success"); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors"
                title="Export chart as PNG"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                PNG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pin / Compare controls */}
      {chart_data && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPinnedResponse(pinnedResponse ? null : response);
              addToast(pinnedResponse ? "Unpinned result" : "Result pinned — ask another question to compare", pinnedResponse ? "info" : "success");
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
              pinnedResponse
                ? "bg-purple-50 border-purple-300 text-purple-700"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            <svg className="w-3 h-3" fill={pinnedResponse ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {pinnedResponse ? "Unpin" : "Pin to compare"}
          </button>
          {pinnedResponse && pinnedResponse !== response && (
            <span className="text-[10px] text-purple-500 animate-fadeIn">Comparing with pinned result</span>
          )}
        </div>
      )}

      {/* Pinned comparison strip */}
      {pinnedResponse && pinnedResponse !== response && pinnedResponse.chart_data && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Pinned Result
            </span>
            <button onClick={() => setPinnedResponse(null)} className="text-[10px] text-purple-400 hover:text-purple-700">Dismiss</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Pinned stats */}
            {pinnedResponse.chart_data.material && (
              <div className="bg-white rounded-lg p-2 border border-purple-100">
                <p className="text-[10px] text-gray-400">Material</p>
                <p className="text-xs font-semibold text-gray-700">{pinnedResponse.chart_data.material}</p>
              </div>
            )}
            {pinnedResponse.chart_data.trend_direction && (
              <div className="bg-white rounded-lg p-2 border border-purple-100">
                <p className="text-[10px] text-gray-400">Trend</p>
                <p className="text-xs font-semibold text-gray-700">{pinnedResponse.chart_data.trend_direction}</p>
              </div>
            )}
            {pinnedResponse.chart_data.r_squared != null && (
              <div className="bg-white rounded-lg p-2 border border-purple-100">
                <p className="text-[10px] text-gray-400">R²</p>
                <p className="text-xs font-semibold font-mono text-gray-700">{pinnedResponse.chart_data.r_squared}</p>
              </div>
            )}
            {pinnedResponse.chart_data.pass_rate_pct != null && (
              <div className="bg-white rounded-lg p-2 border border-purple-100">
                <p className="text-[10px] text-gray-400">Pass Rate</p>
                <p className="text-xs font-semibold text-gray-700">{pinnedResponse.chart_data.pass_rate_pct}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart / table */}
      {chart_type && chart_data && (
        <div ref={chartRef} className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm animate-borderGlow">
          <ChartArea chartType={chart_type} chartData={chart_data} />
        </div>
      )}

      {/* Follow-up suggestions */}
      {suggested_followups?.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
            Suggested next questions
          </p>
          <div className="flex flex-col gap-2">
            {suggested_followups.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp && onFollowUp(q)}
                className="text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg px-3 py-2 border border-blue-200 hover:border-blue-400 transition-all hover-lift"
              >
                → {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audit trail with source documents */}
      {(steps?.length > 0 || tool_result) && (
        <AuditTrail steps={steps} toolResult={tool_result} toolUsed={tool_used} />
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors animate-fadeIn z-40"
          title="Scroll to top"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
