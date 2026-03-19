import { useState, useEffect } from "react";
import { fetchExploreData } from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, Area, ComposedChart,
  BarChart, Bar, Cell,
} from "recharts";

const MATERIALS = [
  "Steel", "FEP", "Spur+ 1015",
  "BEAD WIRE 1.82", "UD-TP Tape", "PTL",
];

const PROPERTIES = [
  { key: "max_force_n", label: "Max Force", unit: "N" },
  { key: "tensile_modulus_mpa", label: "Young's Modulus", unit: "MPa" },
  { key: "upper_yield_point_mpa", label: "Upper Yield Point", unit: "MPa" },
  { key: "elongation_at_break_pct", label: "Elongation at Break", unit: "%" },
  { key: "force_at_break_n", label: "Force at Break", unit: "N" },
  { key: "work_to_max_force_j", label: "Work to Max Force", unit: "J" },
];

const COMPARE_COLORS = { primary: "#3b82f6", compare: "#f59e0b" };

export default function ExploreScreen({ onBack }) {
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [property, setProperty] = useState(PROPERTIES[0].key);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-500 font-mono font-medium">
          ← BACK
        </button>
        <span className="text-slate-200">|</span>
        <span className="text-sm font-semibold text-slate-800 font-mono">DATA EXPLORER</span>
        <span className="text-xs text-slate-500 font-mono">Interactive analysis without typing</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Selectors */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2 font-mono">
              MATERIAL
            </label>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setMaterial(m); if (compareMaterial === m) setCompareMaterial(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium font-mono transition-all ${
                    material === m
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2 font-mono">
              PROPERTY
            </label>
            <select
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">COMPARE:</span>
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.filter(m => m !== material).map((m) => (
                <button
                  key={m}
                  onClick={() => setCompareMaterial(compareMaterial === m ? null : m)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium font-mono transition-all ${
                    compareMaterial === m
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {compareMaterial && (
            <button onClick={() => setCompareMaterial(null)} className="text-xs text-slate-400 hover:text-slate-500 font-mono">
              CLEAR
            </button>
          )}
        </div>

        {/* Stats row */}
        {data?.stats && !loading && (
          <div className="animate-fadeIn">
            <div className={`grid gap-3 ${compareMaterial && compareData ? "grid-cols-2" : "grid-cols-5"}`}>
              {compareMaterial && compareData ? (
                <>
                  <div className="card-dark p-4 border-blue-200">
                    <p className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wide font-mono">{material}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "n", value: data.stats.n },
                        { label: "Mean", value: `${data.stats.mean}` },
                        { label: "Std", value: `±${data.stats.std}` },
                        { label: "Min", value: `${data.stats.min}` },
                        { label: "Max", value: `${data.stats.max}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-mono">{label}</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card-dark p-4 border-amber-200">
                    <p className="text-xs font-semibold text-amber-600 mb-3 uppercase tracking-wide font-mono">{compareMaterial}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "n", value: compareData.stats.n },
                        { label: "Mean", value: `${compareData.stats.mean}` },
                        { label: "Std", value: `±${compareData.stats.std}` },
                        { label: "Min", value: `${compareData.stats.min}` },
                        { label: "Max", value: `${compareData.stats.max}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-mono">{label}</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                [
                  { label: "Tests", value: data.stats.n, color: "" },
                  { label: "Mean", value: `${data.stats.mean} ${data.unit}`, color: "text-blue-600" },
                  { label: "Std Dev", value: `±${data.stats.std}`, color: "" },
                  { label: "Min", value: `${data.stats.min} ${data.unit}`, color: "text-emerald-600" },
                  { label: "Max", value: `${data.stats.max} ${data.unit}`, color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card-dark p-4 text-center animate-scaleIn">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-mono">{label}</p>
                    <p className={`text-lg font-bold mt-1 font-mono ${color || "text-slate-800"}`}>{value}</p>
                  </div>
                ))
              )}
            </div>
            {compareMaterial && compareData && (
              <div className="mt-3 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-center gap-6 text-xs animate-fadeIn">
                <span className="text-slate-500 font-mono">Mean diff:</span>
                <span className={`font-bold text-sm font-mono ${
                  data.stats.mean > compareData.stats.mean ? "text-blue-600" : "text-amber-600"
                }`}>
                  {data.stats.mean > compareData.stats.mean ? "+" : ""}{(data.stats.mean - compareData.stats.mean).toFixed(2)} {data.unit}
                </span>
                <span className="text-slate-200">|</span>
                <span className="text-slate-500 font-mono">{material} is {
                  data.stats.mean > compareData.stats.mean ? "higher" : "lower"
                } by {Math.abs(((data.stats.mean - compareData.stats.mean) / compareData.stats.mean) * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="card-dark p-5">
          {loading || compareLoading ? (
            <div className="h-[360px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading data...
              </div>
            </div>
          ) : !mergedTimeSeries.length ? (
            <div className="h-[360px] flex items-center justify-center text-slate-500 text-sm font-mono">
              No data available for this combination
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 font-mono">
                  {material}{compareMaterial ? ` vs ${compareMaterial}` : ""} — {propInfo.label}
                </h3>
                {data?.trend && (
                  <div className="flex gap-3 text-xs text-slate-500 font-mono">
                    <span>
                      Slope:{" "}
                      <span className={`font-semibold ${
                        data.trend.slope < -0.1 ? "text-red-600" : data.trend.slope > 0.1 ? "text-emerald-600" : "text-slate-500"
                      }`}>
                        {data.trend.slope > 0 ? "+" : ""}{data.trend.slope} {data.unit}/mo
                      </span>
                    </span>
                    <span>R²: <span>{data.trend.r_squared}</span></span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={mergedTimeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} stroke="#e2e8f0" />
                  <YAxis
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={55}
                    stroke="#e2e8f0"
                    label={{ value: propInfo.unit, angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
                  />
                  <Tooltip
                    content={({ payload, label }) => {
                      if (!payload?.length) return null;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-800 mb-1 font-mono">{label}</p>
                          {payload.filter(p => p.value != null).map((p, i) => (
                            <p key={i} style={{ color: p.color }} className="font-mono">
                              {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value} {propInfo.unit}
                            </p>
                          ))}
                          <p className="text-slate-400 mt-1 font-mono">Click dot to drill down</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#94a3b8" }} />
                  <Area type="monotone" dataKey="max_value" name="Range (max)" stroke="none" fill="#3b82f6" fillOpacity={0.1} isAnimationActive={true} animationDuration={800} />
                  <Area type="monotone" dataKey="min_value" name="Range (min)" stroke="none" fill="transparent" fillOpacity={0} isAnimationActive={false} legendType="none" />
                  <Line type="monotone" dataKey="mean_value" name={compareMaterial ? `${material} avg` : "Monthly Avg"} stroke={COMPARE_COLORS.primary} strokeWidth={2} dot={{ r: 4, cursor: "pointer" }} activeDot={{ r: 6, onClick: (_, payload) => handleDotClick(payload.payload) }} isAnimationActive={true} animationDuration={800} />
                  {data?.trend && (
                    <Line type="monotone" dataKey="trend_value" name={compareMaterial ? `${material} trend` : "Trend"} stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="6 3" dot={false} isAnimationActive={true} animationDuration={800} />
                  )}
                  {compareMaterial && (
                    <>
                      <Line type="monotone" dataKey="compare_mean" name={`${compareMaterial} avg`} stroke={COMPARE_COLORS.compare} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} animationDuration={800} />
                      <Line type="monotone" dataKey="compare_trend" name={`${compareMaterial} trend`} stroke="#d97706" strokeWidth={1.5} strokeDasharray="6 3" dot={false} isAnimationActive={true} animationDuration={800} />
                    </>
                  )}
                  <Brush dataKey="date" height={24} stroke="#3b82f6" fill="#f8fafc" tickFormatter={(v) => v} travellerWidth={8} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Drill-down panel */}
        {selectedTest && (
          <div className="card-dark p-5 border-blue-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 font-mono">
                Individual tests — {selectedTest.month}
              </h3>
              <button onClick={() => setSelectedTest(null)} className="text-xs text-slate-400 hover:text-slate-500 font-mono">
                CLOSE
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse table-dark">
                <thead>
                  <tr className="bg-blue-50">
                    {["Date", "Value", "Machine", "Site", "Tester"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-blue-600 border-b border-slate-200 font-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTest.tests.map((t, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 border-b border-slate-200 text-slate-500 font-mono">{t.date}</td>
                      <td className="px-3 py-2 border-b border-slate-200 font-semibold text-slate-800 font-mono">{t.value} {data?.unit}</td>
                      <td className="px-3 py-2 border-b border-slate-200 text-slate-500 font-mono">{t.machine}</td>
                      <td className="px-3 py-2 border-b border-slate-200 text-slate-500 font-mono">{t.site}</td>
                      <td className="px-3 py-2 border-b border-slate-200 text-slate-500 font-mono">{t.tester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Distribution + Individual scatter */}
        {data?.individual_tests?.length > 0 && !loading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 font-mono">Value Distribution</h3>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-30} textAnchor="end" height={40} stroke="#e2e8f0" />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={30} stroke="#e2e8f0" />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs font-mono">
                                <p className="font-semibold text-slate-800">{d.lo.toFixed(1)} - {d.hi.toFixed(1)} {data.unit}</p>
                                <p className="text-slate-500">{d.count} tests</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" isAnimationActive={true} animationDuration={600}>
                          {bins.map((bin, idx) => {
                            const midpoint = (bin.lo + bin.hi) / 2;
                            const z = Math.abs((midpoint - mean) / std);
                            const fill = z > 2 ? "#ef4444" : z > 1 ? "#f59e0b" : "#3b82f6";
                            return <Cell key={idx} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-mono">
                      <span>Mean: <span className="font-semibold text-slate-700">{mean.toFixed(1)}</span></span>
                      <span>Std: <span className="font-semibold text-slate-700">{std.toFixed(2)}</span></span>
                      <span>n: <span className="font-semibold text-slate-700">{values.length}</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 font-mono">
                Individual Measurements ({data.individual_tests.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {data.individual_tests.map((t, i) => {
                  const mean = data.stats?.mean || 0;
                  const std = data.stats?.std || 1;
                  const z = Math.abs((t.value - mean) / std);
                  const color = z > 2 ? "bg-red-500" : z > 1 ? "bg-amber-500" : "bg-blue-500";
                  return (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-sm ${color} cursor-pointer hover:scale-150 transition-transform`}
                      title={`${t.date}: ${t.value} ${data.unit} (${t.machine}, ${t.site})`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Within 1σ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 1-2σ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &gt;2σ outlier</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
