import { useRef, useState, useEffect } from "react";
import ChartArea from "./ChartArea";
import AuditTrail from "./AuditTrail";
import Markdown from "./Markdown";
import { useToast } from "./Toast";

function exportAsPNG(chartRef, toolUsed) {
  const el = chartRef.current;
  if (!el) return;
  const svg = el.querySelector("svg.recharts-surface");
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    canvas.width = img.width * 2; canvas.height = img.height * 2;
    ctx.scale(2, 2); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = pngUrl; a.download = `testmind_${toolUsed || "chart"}_${Date.now()}.png`; a.click();
  };
  img.src = url;
}

function exportToCSV(chartData, toolUsed) {
  let rows = [];
  if (chartData?.tests) rows = chartData.tests;
  else if (chartData?.properties) rows = chartData.properties;
  else if (chartData?.failed_test_samples) rows = chartData.failed_test_samples;
  else if (Array.isArray(chartData)) rows = chartData;
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => { const val = row[h] ?? ""; return typeof val === "string" && val.includes(",") ? `"${val}"` : val; }).join(","))
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `testmind_${toolUsed || "export"}_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function ResultEntry({ response, isActive, onFollowUp }) {
  const chartRef = useRef(null);
  const addToast = useToast();
  const { answer, chart_type, chart_data, steps, tool_used, tool_result, suggested_followups, question } = response;
  const canExportCSV = chart_type === "table" || chart_type === "compliance";
  const canExportPNG = chart_type && !["table", "compliance"].includes(chart_type);

  let confidenceScore = 50;
  if (chart_data?.r_squared != null) confidenceScore += chart_data.r_squared * 30;
  if (chart_data?.count != null) confidenceScore += Math.min(chart_data.count / 10, 20);
  if (chart_data?.significant) confidenceScore += 15;
  if (chart_data?.pass_rate_pct != null) confidenceScore += 5;
  confidenceScore = Math.min(Math.round(confidenceScore), 100);
  const confLevel = confidenceScore >= 85 ? "HIGH" : confidenceScore >= 60 ? "MED" : "LOW";
  const confColor = confidenceScore >= 85 ? "emerald" : confidenceScore >= 60 ? "amber" : "red";

  return (
    <div
      data-result-id={response.id}
      className={`p-5 space-y-4 border-b border-slate-200 transition-all duration-300 ${
        isActive ? "ring-1 ring-blue-500/30 bg-blue-50/50" : ""
      }`}
    >
      {/* Question header */}
      {question && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Q</span>
          <p className="text-xs text-slate-500 font-mono truncate">{question}</p>
        </div>
      )}

      {/* Quick stat badges */}
      {chart_data && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          {chart_data.material && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded border border-blue-200 font-mono">{chart_data.material}</span>
          )}
          {chart_data.trend_direction && (
            <span className={`text-[10px] px-2.5 py-1 rounded border font-mono ${
              chart_data.trend_direction === "decreasing" ? "bg-red-50 text-red-600 border-red-200" :
              chart_data.trend_direction === "increasing" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
              "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              TREND: {chart_data.trend_direction.toUpperCase()}
            </span>
          )}
          {chart_data.r_squared != null && (
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2.5 py-1 rounded border border-purple-200 font-mono">R²={chart_data.r_squared}</span>
          )}
          {chart_data.analysis_window_months != null && (
            <span className="text-[10px] bg-sky-50 text-sky-600 px-2.5 py-1 rounded border border-sky-200 font-mono">
              WINDOW: LAST {chart_data.analysis_window_months}MO
            </span>
          )}
          {chart_data.pass_rate_pct != null && (
            <span className={`text-[10px] px-2.5 py-1 rounded border font-mono font-semibold ${
              chart_data.pass_rate_pct >= 95 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
              chart_data.pass_rate_pct >= 80 ? "bg-amber-50 text-amber-600 border-amber-200" :
              "bg-red-50 text-red-600 border-red-200"
            }`}>
              PASS: {chart_data.pass_rate_pct}%
            </span>
          )}
          {chart_data.correlation_coefficient != null && (
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded border border-indigo-200 font-mono">r={chart_data.correlation_coefficient}</span>
          )}
          {chart_data.will_violate != null && (
            <span className={`text-[10px] px-2.5 py-1 rounded border font-mono font-semibold ${
              chart_data.will_violate ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}>
              {chart_data.will_violate ? "VIOLATION PREDICTED" : "WITHIN BOUNDS"}
            </span>
          )}
          {chart_data.count != null && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded border border-slate-200 font-mono">{chart_data.count} results</span>
          )}
        </div>
      )}

      {/* Confidence indicator */}
      {chart_data && (
        <div className="flex items-center gap-3 animate-fadeIn">
          <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono text-${confColor}-600`}>{confLevel} CONF</span>
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-${confColor}-500 transition-all duration-700`} style={{ width: `${confidenceScore}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{confidenceScore}%</span>
        </div>
      )}

      {/* Answer */}
      <div className="card-dark p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {tool_used && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 font-mono">{tool_used.replace(/_/g, " ")}</p>
            )}
            <Markdown>{answer || ""}</Markdown>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {answer && (
              <button onClick={() => { navigator.clipboard.writeText(answer).then(() => addToast("Copied", "success")); }}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-2 py-1 transition-colors font-mono">
                COPY
              </button>
            )}
            {canExportCSV && chart_data && (
              <button onClick={() => { exportToCSV(chart_data, tool_used); addToast("CSV exported", "success"); }}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-2 py-1 transition-colors font-mono">
                CSV
              </button>
            )}
            {canExportPNG && chart_data && (
              <button onClick={() => { exportAsPNG(chartRef, tool_used); addToast("PNG exported", "success"); }}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-2 py-1 transition-colors font-mono">
                PNG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chart_type && chart_data && (
        <div ref={chartRef} className="card-dark p-4 border-2 border-slate-200 animate-borderGlow">
          <ChartArea chartType={chart_type} chartData={chart_data} />
        </div>
      )}

      {/* Follow-ups */}
      {suggested_followups?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-2 font-mono">Suggested Next</p>
          <div className="flex flex-col gap-2">
            {suggested_followups.map((q, i) => (
              <button key={i} onClick={() => onFollowUp && onFollowUp(q)}
                className="text-left text-sm text-blue-600/80 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 hover:border-blue-400 transition-all hover-lift font-mono">
                → {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audit trail */}
      {(steps?.length > 0 || tool_result) && (
        <AuditTrail steps={steps} toolResult={tool_result} toolUsed={tool_used} />
      )}
    </div>
  );
}

export default function ResultsPanel({ responses, scrollTrigger, onFollowUp }) {
  const scrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (!scrollTrigger?.id || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-result-id="${scrollTrigger.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTrigger]);

  if (!responses || responses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-xs">
          <div className="relative mx-auto w-24 h-24">
            <svg viewBox="0 0 96 96" className="w-24 h-24 animate-fadeIn">
              <rect x="12" y="30" width="18" height="46" rx="3" fill="#bfdbfe" className="animate-fadeInUp" style={{ animationDelay: "0.1s" }} />
              <rect x="38" y="18" width="18" height="58" rx="3" fill="#2563eb" className="animate-fadeInUp" style={{ animationDelay: "0.2s" }} />
              <rect x="64" y="40" width="18" height="36" rx="3" fill="#3b82f6" className="animate-fadeInUp" style={{ animationDelay: "0.3s" }} />
              <line x1="8" y1="78" x2="88" y2="78" stroke="#e2e8f0" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Results will appear here</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">Ask a question on the left</p>
          </div>
          <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 font-mono">
            <span>Try: "Show all tensile tests for Steel"</span>
            <span>or press <kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5">⌘K</kbd></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto thin-scrollbar relative"
      onScroll={(e) => setShowScrollTop(e.target.scrollTop > 200)}
    >
      {responses.map((response) => (
        <ResultEntry
          key={response.id}
          response={response}
          isActive={response.id === scrollTrigger?.id}
          onFollowUp={onFollowUp}
        />
      ))}

      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-500 transition-colors animate-fadeIn z-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
