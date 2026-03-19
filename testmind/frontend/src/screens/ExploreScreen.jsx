import { useState, useEffect } from "react";
import { fetchExploreData } from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, ReferenceLine,
} from "recharts";

const MATERIALS = [
  "FancyPlast 42", "UltraPlast 99", "Hostacomp G2",
  "Stardust", "FancyPlast 84", "NovaTex 10",
];

const PROPERTIES = [
  { key: "tensile_strength_mpa", label: "Tensile Strength", unit: "MPa" },
  { key: "tensile_modulus_mpa", label: "Tensile Modulus", unit: "MPa" },
  { key: "elongation_at_break_pct", label: "Elongation at Break", unit: "%" },
  { key: "impact_energy_j", label: "Impact Energy", unit: "J" },
  { key: "max_force_n", label: "Max Force", unit: "N" },
];

export default function ExploreScreen({ onBack }) {
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [property, setProperty] = useState(PROPERTIES[0].key);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const propInfo = PROPERTIES.find((p) => p.key === property) || PROPERTIES[0];

  useEffect(() => {
    setLoading(true);
    setSelectedTest(null);
    fetchExploreData(material, property)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [material, property]);

  const handleDotClick = (dotData) => {
    if (!data?.individual_tests) return;
    const month = dotData?.date;
    if (!month) return;
    const tests = data.individual_tests.filter((t) => t.month === month);
    setSelectedTest({ month, tests });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">Data Explorer</span>
        <span className="text-xs text-gray-400">Interactive analysis without typing</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Selectors */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Material pills */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Material
            </label>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterial(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    material === m
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Property selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Property
            </label>
            <select
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {PROPERTIES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats row */}
        {data?.stats && !loading && (
          <div className="grid grid-cols-5 gap-3 animate-fadeIn">
            {[
              { label: "Tests", value: data.stats.n, color: "" },
              { label: "Mean", value: `${data.stats.mean} ${data.unit}`, color: "text-blue-700" },
              { label: "Std Dev", value: `±${data.stats.std}`, color: "" },
              { label: "Min", value: `${data.stats.min} ${data.unit}`, color: "text-green-700" },
              { label: "Max", value: `${data.stats.max} ${data.unit}`, color: "text-red-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color || "text-gray-800"}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {loading ? (
            <div className="h-[360px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading data...
              </div>
            </div>
          ) : !data?.time_series?.length ? (
            <div className="h-[360px] flex items-center justify-center text-gray-400 text-sm">
              No data available for this combination
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {material} — {propInfo.label} over time
                </h3>
                {data.trend && (
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>
                      Slope:{" "}
                      <span className={`font-mono font-semibold ${
                        data.trend.slope < -0.1 ? "text-red-600" : data.trend.slope > 0.1 ? "text-green-600" : "text-gray-600"
                      }`}>
                        {data.trend.slope > 0 ? "+" : ""}{data.trend.slope} {data.unit}/mo
                      </span>
                    </span>
                    <span>R²: <span className="font-mono">{data.trend.r_squared}</span></span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.time_series} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 11 }}
                    width={55}
                    label={{ value: propInfo.unit, angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ payload, label }) => {
                      if (!payload?.length) return null;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-gray-700 mb-1">{label}</p>
                          {payload.map((p, i) => (
                            <p key={i} style={{ color: p.color }}>
                              {p.name}: {p.value} {propInfo.unit}
                            </p>
                          ))}
                          <p className="text-gray-400 mt-1">Click dot to drill down</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mean_value"
                    name="Monthly Avg"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 6, onClick: (_, payload) => handleDotClick(payload.payload) }}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="min_value"
                    name="Min"
                    stroke="#16a34a"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="max_value"
                    name="Max"
                    stroke="#dc2626"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  {data.trend && (
                    <Line
                      type="monotone"
                      dataKey="trend_value"
                      name="Trend"
                      stroke="#7c3aed"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  )}
                  <Brush
                    dataKey="date"
                    height={24}
                    stroke="#2563eb"
                    fill="#f0f4ff"
                    tickFormatter={(v) => v}
                    travellerWidth={8}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Drill-down panel */}
        {selectedTest && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Individual tests — {selectedTest.month}
              </h3>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    {["Date", "Value", "Machine", "Site", "Tester"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-blue-700 border-b border-blue-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTest.tests.map((t, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                      <td className="px-3 py-2 border-b border-gray-100">{t.date}</td>
                      <td className="px-3 py-2 border-b border-gray-100 font-semibold">{t.value} {data?.unit}</td>
                      <td className="px-3 py-2 border-b border-gray-100">{t.machine}</td>
                      <td className="px-3 py-2 border-b border-gray-100">{t.site}</td>
                      <td className="px-3 py-2 border-b border-gray-100">{t.tester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Individual scatter */}
        {data?.individual_tests?.length > 0 && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              All individual measurements ({data.individual_tests.length} tests)
            </h3>
            <div className="flex flex-wrap gap-1">
              {data.individual_tests.map((t, i) => {
                const mean = data.stats?.mean || 0;
                const std = data.stats?.std || 1;
                const z = Math.abs((t.value - mean) / std);
                const color = z > 2 ? "bg-red-400" : z > 1 ? "bg-amber-400" : "bg-blue-400";
                return (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-sm ${color} cursor-pointer hover:scale-150 transition-transform`}
                    title={`${t.date}: ${t.value} ${data.unit} (${t.machine}, ${t.site})`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Within 1σ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> 1-2σ from mean</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &gt;2σ outlier</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
