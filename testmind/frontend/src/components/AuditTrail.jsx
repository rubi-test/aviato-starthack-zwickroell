import { useState } from "react";

// ─── Source record renderers ──────────────────────────────────────────────────

function TestDocCard({ doc }) {
  const [open, setOpen] = useState(false);

  const measured = [
    ["Tensile strength", doc.tensile_strength_mpa, "MPa"],
    ["Tensile modulus", doc.tensile_modulus_mpa, "MPa"],
    ["Elongation", doc.elongation_at_break_pct, "%"],
    ["Impact energy", doc.impact_energy_j, "J"],
    ["Max force", doc.max_force_n, "N"],
  ].filter(([, v]) => v != null);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="flex gap-3 text-xs text-gray-600">
          <span className="font-mono text-gray-400">{doc.date}</span>
          <span className="font-semibold text-gray-700">{doc.material}</span>
          <span className="text-gray-400">{doc.test_type}</span>
          <span className="text-gray-400">{doc.machine} · {doc.site}</span>
        </span>
        <span className="text-gray-400 text-xs ml-2">{open ? "▲" : "▶"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ["Customer", doc.customer],
            ["Tester", doc.tester],
            ["Machine", doc.machine],
            ["Site", doc.site],
            ["Test type", doc.test_type],
            ["Record ID", doc.id?.slice(0, 12) + "…"],
          ].map(([label, val]) => (
            <p key={label} className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">{label}:</span> {val || "—"}
            </p>
          ))}
          {measured.length > 0 && (
            <div className="col-span-2 mt-1 pt-1 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-1">
              {measured.map(([label, val, unit]) => (
                <p key={label} className="text-xs">
                  <span className="font-semibold text-gray-600">{label}:</span>{" "}
                  <span className="font-mono text-blue-700">{val} {unit}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimeSeriesTable({ rows, labelKey, valueKey, valueLabel }) {
  return (
    <div className="overflow-auto max-h-48">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-gray-100">
          <tr>
            <th className="text-left px-3 py-1.5 text-gray-500 font-semibold border-b border-gray-200">
              Period
            </th>
            <th className="text-right px-3 py-1.5 text-gray-500 font-semibold border-b border-gray-200">
              {valueLabel}
            </th>
            <th className="text-right px-3 py-1.5 text-gray-500 font-semibold border-b border-gray-200">
              n
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-3 py-1.5 font-mono text-gray-600 border-b border-gray-100">
                {row[labelKey]}
              </td>
              <td className="px-3 py-1.5 text-right font-mono font-semibold text-blue-700 border-b border-gray-100">
                {row[valueKey]}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-400 border-b border-gray-100">
                {row.n ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceRecords({ toolResult, toolUsed }) {
  const [open, setOpen] = useState(false);

  // Determine what to show based on what's in tool_result
  let label = null;
  let content = null;

  if (toolResult?.tests?.length) {
    const count = toolResult.tests.length;
    const total = toolResult.count ?? count;
    label = `📎 ${total} test document${total !== 1 ? "s" : ""}`;
    content = (
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {toolResult.tests.map((doc, i) => (
          <TestDocCard key={i} doc={doc} />
        ))}
        {total > count && (
          <p className="text-xs text-gray-400 text-center py-1">
            Showing first {count} of {total} records
          </p>
        )}
      </div>
    );
  } else if (toolResult?.time_series?.length) {
    const rows = toolResult.time_series;
    label = `📎 ${rows.length} monthly data point${rows.length !== 1 ? "s" : ""}`;
    const unit = toolResult.property?.includes("mpa")
      ? " MPa"
      : toolResult.property?.includes("_j")
      ? " J"
      : "%";
    content = (
      <TimeSeriesTable
        rows={rows}
        labelKey="date"
        valueKey="mean_value"
        valueLabel={`Avg${unit}`}
      />
    );
  } else if (toolResult?.group_a && toolResult?.group_b) {
    const { group_a, group_b, property } = toolResult;
    const unit = property?.includes("mpa") ? " MPa" : property?.includes("_j") ? " J" : "";
    label = `📎 2 groups compared`;
    content = (
      <div className="grid grid-cols-2 gap-3">
        {[group_a, group_b].map((g) => (
          <div key={g.name} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-700">{g.name}</p>
            <p className="text-xs text-gray-500">
              Mean: <span className="font-mono font-semibold text-blue-700">{g.mean}{unit}</span>
            </p>
            <p className="text-xs text-gray-500">
              Std: <span className="font-mono">{g.std}{unit}</span>
            </p>
            <p className="text-xs text-gray-500">
              n: <span className="font-mono">{g.n}</span>
            </p>
          </div>
        ))}
      </div>
    );
  } else if (toolResult?.properties?.length) {
    const props = toolResult.properties;
    label = `📎 ${props.length} propert${props.length !== 1 ? "ies" : "y"} measured`;
    content = (
      <TimeSeriesTable
        rows={props.map((p) => ({
          date: p.name.replace(/_/g, " "),
          mean_value: `${p.mean} ±${p.std}`,
          n: p.n,
        }))}
        labelKey="date"
        valueKey="mean_value"
        valueLabel="Mean ± Std"
      />
    );
  }

  if (!label) return null;

  return (
    <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        <span>{label}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-2">{content}</div>}
    </div>
  );
}

// ─── Main AuditTrail ──────────────────────────────────────────────────────────

export default function AuditTrail({ steps = [], toolResult, toolUsed }) {
  const [open, setOpen] = useState(false);

  if (!steps.length && !toolResult) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center justify-between text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">▸ What I did ({steps.length} steps)</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-200 bg-gray-50">
          {steps.map((step, i) => (
            <p key={i} className="text-xs text-gray-500 font-mono leading-relaxed">
              <span className="text-gray-400">Step {i + 1} —</span> {step}
            </p>
          ))}
          <SourceRecords toolResult={toolResult} toolUsed={toolUsed} />
        </div>
      )}
    </div>
  );
}
