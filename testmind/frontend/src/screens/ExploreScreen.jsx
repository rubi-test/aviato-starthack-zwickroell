import { useState, useEffect } from "react";
import { fetchExploreData } from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, Area, ComposedChart,
  BarChart, Bar, Cell,
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

const COMPARE_COLORS = { primary: "#2563eb", compare: "#f59e0b" };

export default function ExploreScreen({ onBack }) {
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [property, setProperty] = useState(PROPERTIES[0].key);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // Comparison mode
  const [compareMaterial, setCompareMaterial] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const propInfo = PROPERTIES.find((p) => p.key === property) || PROPERTIES[0];

  useEffect(() => {
    setLoading(true);
    setSelectedTest(null);
    fetchExploreData(material, property)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [material, property]);

  // Fetch compare data
  useEffect(() => {
    if (!compareMaterial) {
      setCompareData(null);
      return;
    }
    setCompareLoading(true);
    fetchExploreData(compareMaterial, property)
      .then(setCompareData)
      .catch(console.error)
      .finally(() => setCompareLoading(false));
  }, [compareMaterial, property]);

  const handleDotClick = (dotData) => {
    if (!data?.individual_tests) return;
    const month = dotData?.date;
    if (!month) return;
    const tests = data.individual_tests.filter((t) => t.month === month);
    setSelectedTest({ month, tests });
  };

  // Merge primary + compare datasets for overlay chart
  const mergedTimeSeries = (() => {
    if (!data?.time_series) return [];
    if (!compareData?.time_series) return data.time_series;

    const map = new Map();
    for (const pt of data.time_series) {
      map.set(pt.date, { date: pt.date, mean_value: pt.mean_value, min_value: pt.min_value, max_value: pt.max_value, trend_value: pt.trend_value });
    }
    for (const pt of compareData.time_series) {
      const existing = map.get(pt.date) || { date: pt.date };
      existing.compare_mean = pt.mean_value;
      existing.compare_trend = pt.trend_value;
      map.set(pt.date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
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
                  onClick={() => { setMaterial(m); if (compareMaterial === m) setCompareMaterial(null); }}
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
                <option key={p.key} value={p.key}>{p.label} ({p.unit})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compare with:</span>
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.filter(m => m !== material).map((m) => (
                <button
                  key={m}
                  onClick={() => setCompareMaterial(compareMaterial === m ? null : m)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    compareMaterial === m
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-500 hover:border-amber-400 hover:text-amber-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {compareMaterial && (
            <button onClick={() => setCompareMaterial(null)} className="text-xs text-gray-400 hover:text-gray-700">
              Clear comparison
            </button>
          )}
        </div>

        {/* Stats row */}
        {data?.stats && !loading && (
          <div className="animate-fadeIn">
            <div className={`grid gap-3 ${compareMaterial && compareData ? "grid-cols-2" : "grid-cols-5"}`}>
              {compareMaterial && compareData ? (
                <>
                  {/* Side-by-side comparison stats */}
                  <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wide">{material}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "n", value: data.stats.n },
                        { label: "Mean", value: `${data.stats.mean}` },
                        { label: "Std", value: `±${data.stats.std}` },
                        { label: "Min", value: `${data.stats.min}` },
                        { label: "Max", value: `${data.stats.max}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                          <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-amber-600 mb-3 uppercase tracking-wide">{compareMaterial}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "n", value: compareData.stats.n },
                        { label: "Mean", value: `${compareData.stats.mean}` },
                        { label: "Std", value: `±${compareData.stats.std}` },
                        { label: "Min", value: `${compareData.stats.min}` },
                        { label: "Max", value: `${compareData.stats.max}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                          <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                [
                  { label: "Tests", value: data.stats.n, color: "" },
                  { label: "Mean", value: `${data.stats.mean} ${data.unit}`, color: "text-blue-700" },
                  { label: "Std Dev", value: `±${data.stats.std}`, color: "" },
                  { label: "Min", value: `${data.stats.min} ${data.unit}`, color: "text-green-700" },
                  { label: "Max", value: `${data.stats.max} ${data.unit}`, color: "text-red-700" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm animate-scaleIn">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className={`text-lg font-bold mt-1 ${color || "text-gray-800"}`}>{value}</p>
                  </div>
                ))
              )}
            </div>
            {/* Delta banner when comparing */}
            {compareMaterial && compareData && (
              <div className="mt-3 bg-gradient-to-r from-blue-50 to-amber-50 rounded-xl border border-gray-200 p-3 flex items-center justify-center gap-6 text-xs animate-fadeIn">
                <span className="text-gray-500">Mean difference:</span>
                <span className={`font-bold text-sm ${
                  data.stats.mean > compareData.stats.mean ? "text-blue-700" : "text-amber-700"
                }`}>
                  {data.stats.mean > compareData.stats.mean ? "+" : ""}{(data.stats.mean - compareData.stats.mean).toFixed(2)} {data.unit}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{material} is {
                  data.stats.mean > compareData.stats.mean ? "higher" : "lower"
                } by {Math.abs(((data.stats.mean - compareData.stats.mean) / compareData.stats.mean) * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {loading || compareLoading ? (
            <div className="h-[360px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading data...
              </div>
            </div>
          ) : !mergedTimeSeries.length ? (
            <div className="h-[360px] flex items-center justify-center text-gray-400 text-sm">
              No data available for this combination
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {material}{compareMaterial ? ` vs ${compareMaterial}` : ""} — {propInfo.label} over time
                </h3>
                {data?.trend && (
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
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={mergedTimeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
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
                          {payload.filter(p => p.value != null).map((p, i) => (
                            <p key={i} style={{ color: p.color }}>
                              {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value} {propInfo.unit}
                            </p>
                          ))}
                          <p className="text-gray-400 mt-1">Click dot to drill down</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {/* Confidence band for primary material */}
                  <Area
                    type="monotone"
                    dataKey="max_value"
                    name="Range (max)"
                    stroke="none"
                    fill="#2563eb"
                    fillOpacity={0.06}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="min_value"
                    name="Range (min)"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="mean_value"
                    name={compareMaterial ? `${material} avg` : "Monthly Avg"}
                    stroke={COMPARE_COLORS.primary}
                    strokeWidth={2}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 6, onClick: (_, payload) => handleDotClick(payload.payload) }}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  {data?.trend && (
                    <Line
                      type="monotone"
                      dataKey="trend_value"
                      name={compareMaterial ? `${material} trend` : "Trend"}
                      stroke="#7c3aed"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  )}
                  {/* Compare material lines */}
                  {compareMaterial && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="compare_mean"
                        name={`${compareMaterial} avg`}
                        stroke={COMPARE_COLORS.compare}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Line
                        type="monotone"
                        dataKey="compare_trend"
                        name={`${compareMaterial} trend`}
                        stroke="#d97706"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                    </>
                  )}
                  <Brush
                    dataKey="date"
                    height={24}
                    stroke="#2563eb"
                    fill="#f0f4ff"
                    tickFormatter={(v) => v}
                    travellerWidth={8}
                  />
                </ComposedChart>
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
              <button onClick={() => setSelectedTest(null)} className="text-xs text-gray-400 hover:text-gray-700">
                ✕ Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    {["Date", "Value", "Machine", "Site", "Tester"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-blue-700 border-b border-blue-200">{h}</th>
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

        {/* Distribution + Individual scatter side by side */}
        {data?.individual_tests?.length > 0 && !loading && (
          <div className="grid grid-cols-2 gap-4">
            {/* Distribution histogram */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Value Distribution
              </h3>
              {(() => {
                const values = data.individual_tests.map(t => t.value);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min || 1;
                const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(values.length))));
                const binWidth = range / binCount;
                const bins = Array.from({ length: binCount }, (_, i) => {
                  const lo = min + i * binWidth;
                  const hi = lo + binWidth;
                  const count = values.filter(v => i === binCount - 1 ? v >= lo && v <= hi : v >= lo && v < hi).length;
                  return { range: `${lo.toFixed(1)}`, count, lo, hi };
                });
                const mean = data.stats?.mean || 0;
                const std = data.stats?.std || 1;
                return (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bins} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 10 }} width={30} />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                                <p className="font-semibold">{d.lo.toFixed(1)} - {d.hi.toFixed(1)} {data.unit}</p>
                                <p>{d.count} tests</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" isAnimationActive={true} animationDuration={600}>
                          {bins.map((bin, idx) => {
                            const midpoint = (bin.lo + bin.hi) / 2;
                            const z = Math.abs((midpoint - mean) / std);
                            const fill = z > 2 ? "#f87171" : z > 1 ? "#fbbf24" : "#60a5fa";
                            return <Cell key={idx} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-gray-400">
                      <span>Mean: <span className="font-semibold text-gray-600">{mean.toFixed(1)}</span></span>
                      <span>Std: <span className="font-semibold text-gray-600">{std.toFixed(2)}</span></span>
                      <span>n: <span className="font-semibold text-gray-600">{values.length}</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Individual scatter heatmap */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Individual Measurements ({data.individual_tests.length})
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
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Within 1σ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> 1-2σ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &gt;2σ outlier</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
