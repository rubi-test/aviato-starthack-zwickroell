import ChartArea from "./ChartArea";
import AuditTrail from "./AuditTrail";

export default function ResultsPanel({ response }) {
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

  const { answer, chart_type, chart_data, steps, tool_used, tool_result } = response;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Natural language answer */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {tool_used && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {tool_used.replace(/_/g, " ")}
          </p>
        )}
        <p className="text-sm leading-relaxed text-gray-800">{answer}</p>
      </div>

      {/* Chart / table */}
      {chart_type && chart_data && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <ChartArea chartType={chart_type} chartData={chart_data} />
        </div>
      )}

      {/* Audit trail with source documents */}
      {(steps?.length > 0 || tool_result) && (
        <AuditTrail steps={steps} toolResult={tool_result} toolUsed={tool_used} />
      )}
    </div>
  );
}
