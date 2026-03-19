import { useState } from "react";

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
    <div className="border border-[#2a3144] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#141820] transition-colors"
      >
        <span className="flex gap-3 text-xs text-slate-400">
          <span className="font-mono text-slate-600">{doc.date}</span>
          <span className="font-semibold text-slate-300">{doc.material}</span>
          <span className="text-slate-500">{doc.test_type}</span>
          <span className="text-slate-600">{doc.machine} · {doc.site}</span>
        </span>
        <span className="text-slate-600 text-xs ml-2">{open ? "▲" : "▶"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[#2a3144] bg-[#141820] grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ["Customer", doc.customer],
            ["Tester", doc.tester],
            ["Machine", doc.machine],
            ["Site", doc.site],
            ["Test type", doc.test_type],
            ["Record ID", doc.id?.slice(0, 12) + "…"],
          ].map(([label, val]) => (
            <p key={label} className="text-xs text-slate-500 font-mono">
              <span className="font-semibold text-slate-400">{label}:</span> {val || "—"}
            </p>
          ))}
          {measured.length > 0 && (
            <div className="col-span-2 mt-1 pt-1 border-t border-[#2a3144] flex flex-wrap gap-x-4 gap-y-1">
              {measured.map(([label, val, unit]) => (
                <p key={label} className="text-xs font-mono">
                  <span className="font-semibold text-slate-400">{label}:</span>{" "}
                  <span className="text-blue-400">{val} {unit}</span>
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
        <thead className="sticky top-0 bg-[#141820]">
          <tr>
            <th className="text-left px-3 py-1.5 text-slate-500 font-semibold border-b border-[#2a3144] font-mono">Period</th>
            <th className="text-right px-3 py-1.5 text-slate-500 font-semibold border-b border-[#2a3144] font-mono">{valueLabel}</th>
            <th className="text-right px-3 py-1.5 text-slate-500 font-semibold border-b border-[#2a3144] font-mono">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-[#1e2433]" : "bg-[#141820]"}>
              <td className="px-3 py-1.5 font-mono text-slate-400 border-b border-[#2a3144]">{row[labelKey]}</td>
              <td className="px-3 py-1.5 text-right font-mono font-semibold text-blue-400 border-b border-[#2a3144]">{row[valueKey]}</td>
              <td className="px-3 py-1.5 text-right text-slate-600 border-b border-[#2a3144] font-mono">{row.n ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceRecords({ toolResult, toolUsed }) {
  const [open, setOpen] = useState(false);

  let label = null;
  let content = null;

  if (toolResult?.tests?.length) {
    const count = toolResult.tests.length;
    const total = toolResult.count ?? count;
    label = `${total} test document${total !== 1 ? "s" : ""}`;
    content = (
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {toolResult.tests.map((doc, i) => (
          <TestDocCard key={i} doc={doc} />
        ))}
        {total > count && (
          <p className="text-xs text-slate-600 text-center py-1 font-mono">
            Showing first {count} of {total} records
          </p>
        )}
      </div>
    );
  } else if (toolResult?.time_series?.length) {
    const rows = toolResult.time_series;
    label = `${rows.length} monthly data point${rows.length !== 1 ? "s" : ""}`;
    const unit = toolResult.property?.includes("mpa") ? " MPa" : toolResult.property?.includes("_j") ? " J" : "%";
    content = <TimeSeriesTable rows={rows} labelKey="date" valueKey="mean_value" valueLabel={`Avg${unit}`} />;
  } else if (toolResult?.group_a && toolResult?.group_b) {
    const { group_a, group_b, property } = toolResult;
    const unit = property?.includes("mpa") ? " MPa" : property?.includes("_j") ? " J" : "";
    label = `2 groups compared`;
    content = (
      <div className="grid grid-cols-2 gap-3">
        {[group_a, group_b].map((g) => (
          <div key={g.name} className="bg-[#141820] border border-[#2a3144] rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-slate-300 font-mono">{g.name}</p>
            <p className="text-xs text-slate-500 font-mono">
              Mean: <span className="font-semibold text-blue-400">{g.mean}{unit}</span>
            </p>
            <p className="text-xs text-slate-500 font-mono">Std: <span>{g.std}{unit}</span></p>
            <p className="text-xs text-slate-500 font-mono">n: <span>{g.n}</span></p>
          </div>
        ))}
      </div>
    );
  } else if (toolResult?.properties?.length) {
    const props = toolResult.properties;
    label = `${props.length} propert${props.length !== 1 ? "ies" : "y"} measured`;
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
    <div className="mt-3 border-t border-dashed border-[#2a3144] pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors font-mono"
      >
        <span>{label}</span>
        <span className="text-slate-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-2">{content}</div>}
    </div>
  );
}

export default function AuditTrail({ steps = [], toolResult, toolUsed }) {
  const [open, setOpen] = useState(false);

  if (!steps.length && !toolResult) return null;

  return (
    <div className="border border-[#2a3144] rounded-xl overflow-hidden mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center justify-between text-sm text-slate-400 hover:bg-[#141820] transition-colors font-mono"
      >
        <span className="font-medium">AUDIT TRAIL ({steps.length} steps)</span>
        <span className="text-slate-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#2a3144] bg-[#141820]">
          <div className="relative ml-3 mt-3">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[#2a3144]" />
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 animate-listItemIn" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="relative -left-[4px] mt-0.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-[#141820] flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                  <p className="text-[10px] text-slate-600 font-mono">Step {i + 1}</p>
                </div>
              </div>
            ))}
          </div>
          {toolUsed && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 bg-[#1e2433] rounded-lg px-3 py-2 font-mono">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tool: <span className="font-semibold text-slate-400">{toolUsed.replace(/_/g, " ")}</span>
            </div>
          )}
          <SourceRecords toolResult={toolResult} toolUsed={toolUsed} />
        </div>
      )}
    </div>
  );
}
