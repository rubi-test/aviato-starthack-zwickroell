import { useState } from "react";

const MATERIALS = [
  "FancyPlast 42", "UltraPlast 99", "Hostacomp G2",
  "Stardust", "FancyPlast 84", "NovaTex 10",
];

const TEST_TYPES = ["tensile", "compression", "charpy"];

const DATE_RANGES = [
  { label: "Last 3 months", value: "last 3 months" },
  { label: "Last 6 months", value: "last 6 months" },
  { label: "Last year", value: "last year" },
  { label: "All time", value: "" },
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visual Filters</span>
        <span className="text-xs text-gray-400 ml-auto">Click to build a query</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Materials */}
        <div className="flex flex-wrap gap-1.5">
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => toggleMaterial(m)}
              className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                selectedMaterials.includes(m)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <span className="text-gray-300">|</span>

        {/* Test types */}
        <div className="flex gap-1.5">
          {TEST_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded-full text-xs capitalize transition-all ${
                selectedTypes.includes(t)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="text-gray-300">|</span>

        {/* Date range */}
        <div className="flex gap-1.5">
          {DATE_RANGES.map((d) => (
            <button
              key={d.label}
              onClick={() => setDateRange(d.value)}
              className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                dateRange === d.value
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Go button */}
        {hasSelection && (
          <button
            onClick={handleFilter}
            className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition-colors animate-fadeIn"
          >
            Search →
          </button>
        )}
      </div>
    </div>
  );
}
