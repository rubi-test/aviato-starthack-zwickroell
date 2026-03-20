import { useState } from "react";

const MATERIALS = [
  "PVC", "Steel", "FEP", "Spur+ 1015",
  "BEAD WIRE 1.82", "UD-TP Tape", "PTL",
];

const TEST_TYPES = ["tensile", "compression", "flexure"];

const DATE_RANGES = [
  { label: "3M", value: "last 3 months" },
  { label: "6M", value: "last 6 months" },
  { label: "1Y", value: "last year" },
  { label: "ALL", value: "" },
];

export default function FilterBar({ onFilter }) {
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateRange, setDateRange] = useState("");

  const toggleMaterial = (m) => {
    setSelectedMaterials((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const toggleType = (t) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleFilter = () => {
    const parts = [];
    if (selectedTypes.length === 1) parts.push(`${selectedTypes[0]}`);
    parts.push("tests");
    if (selectedMaterials.length) parts.push(`for ${selectedMaterials.join(" and ")}`);
    if (dateRange) parts.push(`from ${dateRange}`);
    const query = `Show all ${parts.join(" ")}`;
    onFilter(query);
  };

  const hasSelection = selectedMaterials.length > 0 || selectedTypes.length > 0;

  return (
    <div className="card-dark p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Filters</span>
        <span className="text-xs text-slate-400 ml-auto font-mono">Build a query</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => toggleMaterial(m)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                selectedMaterials.includes(m)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <span className="text-slate-200">|</span>

        <div className="flex gap-1.5">
          {TEST_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-all ${
                selectedTypes.includes(t)
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="text-slate-200">|</span>

        <div className="flex gap-1.5">
          {DATE_RANGES.map((d) => (
            <button
              key={d.label}
              onClick={() => setDateRange(d.value)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                dateRange === d.value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {hasSelection && (
          <button
            onClick={handleFilter}
            className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-xs font-mono uppercase rounded hover:bg-blue-500 transition-colors animate-fadeIn"
          >
            Execute →
          </button>
        )}
      </div>
    </div>
  );
}
