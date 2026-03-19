import ChartArea from "./ChartArea";
import AuditTrail from "./AuditTrail";
import Markdown from "./Markdown";

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
  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center space-y-2">
          <p className="text-5xl">📊</p>
          <p className="text-sm font-medium text-gray-500">Results will appear here</p>
          <p className="text-xs text-gray-400">Ask a question on the left to get started</p>
        </div>
      </div>
    );
  }

  const { answer, chart_type, chart_data, steps, tool_used, tool_result, suggested_followups } = response;

  const canExport = chart_type === "table" || chart_type === "compliance";

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
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
          {canExport && chart_data && (
            <button
              onClick={() => exportToCSV(chart_data, tool_used)}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors"
              title="Export as CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Chart / table */}
      {chart_type && chart_data && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
                className="text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg px-3 py-2 border border-blue-200 hover:border-blue-400 transition-colors"
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
    </div>
  );
}
