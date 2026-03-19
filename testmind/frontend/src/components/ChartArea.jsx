import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Area,
  ComposedChart,
  ReferenceDot,
  Brush,
} from "recharts";
import StatCards from "./StatCards";
import WhatIfSimulator from "./WhatIfSimulator";

const DARK_TOOLTIP = { background: "#1e2433", border: "1px solid #2a3144", borderRadius: "8px" };

function unitFor(property) {
  if (!property) return "";
  if (property.includes("mpa")) return " MPa";
  if (property.includes("_j")) return " J";
  if (property.includes("pct")) return "%";
  return "";
}

// ─── Table ────────────────────────────────────────────────────────────────────

function SortableTestTable({ tests, count }) {
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const cols = ["date", "material", "test_type", "machine", "site", "tester"];

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = [...tests].sort((a, b) => {
    const va = (a[sortCol] ?? "").toString();
    const vb = (b[sortCol] ?? "").toString();
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2 font-mono">{count} results</p>
      <div className="overflow-auto max-h-[380px]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#141820] z-10">
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  onClick={() => toggleSort(c)}
                  className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-[#2a3144] cursor-pointer hover:text-blue-400 select-none transition-colors font-mono"
                >
                  {c.replace(/_/g, " ")}
                  {sortCol === c && (
                    <span className="ml-1 text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-[#1e2433]" : "bg-[#141820]"} hover:bg-blue-950/30 transition-colors`}>
                {cols.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 text-slate-300 border-b border-[#2a3144] truncate max-w-[140px] font-mono"
                  >
                    {t[c] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataTable({ data }) {
  if (data.tests) {
    const tests = data.tests;
    if (!tests.length)
      return <p className="text-sm text-slate-500 py-4 text-center font-mono">No results found.</p>;

    return <SortableTestTable tests={tests} count={data.count} />;
  }

  if (data.properties) {
    const props = data.properties;
    if (!props.length)
      return <p className="text-sm text-slate-500 py-4 text-center font-mono">No properties found.</p>;

    const radarData = props
      .filter((p) => p.mean != null && p.max > p.min)
      .map((p) => ({
        property: p.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: Math.round(((p.mean - p.min) / (p.max - p.min)) * 100),
        fullMark: 100,
      }));

    return (
      <div>
        <p className="text-xs text-slate-500 mb-2 font-mono">{data.material}</p>

        {radarData.length >= 3 && (
          <div className="mb-4 animate-scaleIn">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a3144" />
                <PolarAngleAxis dataKey="property" tick={{ fontSize: 10, fill: "#64748b" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
                <Radar
                  name={data.material}
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  isAnimationActive={true}
                  animationDuration={800}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Relative Score"]}
                  contentStyle={DARK_TOOLTIP}
                  itemStyle={{ color: "#e2e8f0" }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-600 text-center -mt-2 font-mono">Property profile (normalized min→max)</p>
          </div>
        )}

        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-[#141820] z-10">
              <tr>
                {["Property", "Unit", "n", "Mean", "±Std", "Min", "Max"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-[#2a3144] font-mono"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.map((p, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-[#1e2433]" : "bg-[#141820]"} animate-fadeInUp`} style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="px-3 py-2 text-slate-200 font-medium border-b border-[#2a3144] font-mono">
                    {p.name.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-slate-500 border-b border-[#2a3144] font-mono">{p.unit}</td>
                  <td className="px-3 py-2 text-slate-400 border-b border-[#2a3144] font-mono">{p.n}</td>
                  <td className="px-3 py-2 text-slate-200 font-semibold border-b border-[#2a3144] font-mono">
                    {p.mean}
                  </td>
                  <td className="px-3 py-2 text-slate-500 border-b border-[#2a3144] font-mono">±{p.std}</td>
                  <td className="px-3 py-2 text-slate-500 border-b border-[#2a3144] font-mono">{p.min}</td>
                  <td className="px-3 py-2 text-slate-500 border-b border-[#2a3144] font-mono">{p.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Time Series ─────────────────────────────────────────────────────────────

function TimeSeriesChart({ data, onDotClick }) {
  const { time_series, slope_per_month, r_squared, trend_direction, property } = data;
  if (!time_series?.length) return null;

  const unit = unitFor(property);
  const dirColor =
    trend_direction === "decreasing"
      ? "text-red-400"
      : trend_direction === "increasing"
      ? "text-emerald-400"
      : "text-slate-400";

  const validPoints = time_series.filter((p) => p.mean_value != null);
  const minPt = validPoints.reduce((a, b) => (a.mean_value < b.mean_value ? a : b), validPoints[0]);
  const maxPt = validPoints.reduce((a, b) => (a.mean_value > b.mean_value ? a : b), validPoints[0]);

  const withBands = time_series.map(pt => {
    const std = pt.std_value ?? 0;
    return {
      ...pt,
      band_upper: pt.mean_value != null ? +(pt.mean_value + std).toFixed(2) : null,
      band_lower: pt.mean_value != null ? +(pt.mean_value - std).toFixed(2) : null,
    };
  });

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3 font-mono">
        <span>
          Trend:{" "}
          <span className={`font-semibold ${dirColor}`}>{trend_direction}</span>
        </span>
        <span>
          Slope:{" "}
          <span className="font-semibold">
            {slope_per_month > 0 ? "+" : ""}
            {slope_per_month?.toFixed(2)}
            {unit}/month
          </span>
        </span>
        <span>
          R²: <span>{r_squared?.toFixed(2)}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={withBands} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2433" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} interval="preserveStartEnd" stroke="#2a3144" />
          <YAxis
            tickFormatter={(v) => `${v}${unit}`}
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={65}
            stroke="#2a3144"
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const filtered = payload.filter(p => !p.dataKey?.startsWith("band_"));
              return (
                <div className="bg-[#1e2433] border border-[#2a3144] rounded-lg shadow-lg px-3 py-2 text-xs font-mono">
                  <p className="font-semibold text-slate-200 mb-1">{label}</p>
                  {filtered.map((p, i) => (
                    <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{unit}</p>
                  ))}
                  {onDotClick && <p className="text-blue-400 mt-1 text-[10px]">Click to drill down</p>}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Area type="monotone" dataKey="band_upper" stroke="none" fill="#3b82f6" fillOpacity={0.1} name="±1σ band" isAnimationActive={true} animationDuration={800} />
          <Area type="monotone" dataKey="band_lower" stroke="none" fill="transparent" fillOpacity={0} legendType="none" isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="mean_value"
            name="Monthly avg"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, cursor: onDotClick ? "pointer" : "default" }}
            activeDot={{
              r: 6,
              onClick: onDotClick ? (_, payload) => onDotClick(payload.payload) : undefined,
            }}
            isAnimationActive={true}
            animationDuration={800}
          />
          <Line type="monotone" dataKey="trend_value" name="Trend" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive={true} animationDuration={800} />
          {withBands.length > 4 && (
            <Brush dataKey="date" height={20} stroke="#3b82f6" fill="#141820" travellerWidth={8} />
          )}
          {minPt && (
            <ReferenceDot x={minPt.date} y={minPt.mean_value} r={6} fill="#dc2626" stroke="#1e2433" strokeWidth={2}
              label={{ value: `Min: ${minPt.mean_value}${unit}`, position: "bottom", fontSize: 10, fill: "#ef4444", fontWeight: 600 }} />
          )}
          {maxPt && maxPt.date !== minPt?.date && (
            <ReferenceDot x={maxPt.date} y={maxPt.mean_value} r={6} fill="#16a34a" stroke="#1e2433" strokeWidth={2}
              label={{ value: `Max: ${maxPt.mean_value}${unit}`, position: "top", fontSize: 10, fill: "#22c55e", fontWeight: 600 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Forecast ────────────────────────────────────────────────────────────────

function ForecastChart({ data }) {
  const { time_series, forecast_series, boundary, will_violate, estimated_violation_date, property } = data;
  if (!time_series?.length) return null;

  const unit = unitFor(property);

  const combined = [
    ...time_series.map((pt) => ({ date: pt.date, actual: pt.mean_value, trend: pt.trend_value })),
    ...(forecast_series || []).map((pt) => ({ date: pt.date, forecast: pt.forecast_value })),
  ];

  return (
    <div>
      {will_violate && (
        <div className="mb-3 px-3 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-sm text-red-400 flex items-center gap-2 font-mono">
          <span>WARNING</span>
          <span>
            Boundary violation expected:{" "}
            <strong>{estimated_violation_date}</strong>
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={combined} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2433" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} interval="preserveStartEnd" stroke="#2a3144" />
          <YAxis tickFormatter={(v) => `${v}${unit}`} tick={{ fontSize: 11, fill: "#64748b" }} width={65} stroke="#2a3144" />
          <Tooltip formatter={(v, name) => v !== undefined && v !== null ? [`${v}${unit}`, name] : [undefined, name]} contentStyle={DARK_TOOLTIP} itemStyle={{ color: "#e2e8f0" }} />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={true} animationDuration={800} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} isAnimationActive={true} animationDuration={800} />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} isAnimationActive={true} animationDuration={800} />
          <ReferenceLine y={boundary} stroke="#dc2626" strokeWidth={2} strokeDasharray="8 3"
            label={{ value: `Boundary: ${boundary}${unit}`, position: "insideTopRight", fontSize: 11, fill: "#ef4444" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Scatter / Correlation ────────────────────────────────────────────────────

const SCATTER_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

function ScatterCorrelationChart({ data }) {
  const { scatter_data, trend_line, property_x, property_y, unit_x, unit_y, correlation_coefficient: r, p_value, significant, strength, direction, n } = data;

  if (!scatter_data?.length) return null;

  const materials = [...new Set(scatter_data.map((d) => d.material))];
  const colorMap = {};
  materials.forEach((m, i) => { colorMap[m] = SCATTER_COLORS[i % SCATTER_COLORS.length]; });

  const rColor = significant ? Math.abs(r) >= 0.7 ? "text-emerald-400" : "text-amber-400" : "text-slate-500";

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3 font-mono">
        <span>r = <span className={`font-bold ${rColor}`}>{r}</span></span>
        <span>p = <span>{p_value}</span></span>
        <span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            significant ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/40" : "bg-[#1e2433] text-slate-500 border border-[#2a3144]"
          }`}>
            {significant ? `${strength} ${direction}` : "not significant"}
          </span>
        </span>
        <span className="text-slate-600">n={n}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
          <XAxis dataKey="x" name={property_x?.replace(/_/g, " ")} type="number" unit={unit_x ? ` ${unit_x}` : ""} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#2a3144"
            label={{ value: `${property_x?.replace(/_/g, " ")} (${unit_x})`, position: "insideBottom", offset: -10, fontSize: 11, fill: "#64748b" }} />
          <YAxis dataKey="y" name={property_y?.replace(/_/g, " ")} type="number" unit={unit_y ? ` ${unit_y}` : ""} tick={{ fontSize: 11, fill: "#64748b" }} width={70} stroke="#2a3144"
            label={{ value: `${property_y?.replace(/_/g, " ")} (${unit_y})`, angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
          <ZAxis range={[30, 30]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="bg-[#1e2433] border border-[#2a3144] rounded shadow-sm px-3 py-2 text-xs font-mono">
                  <p className="font-semibold text-slate-200 mb-1">{d.material}</p>
                  <p className="text-slate-400">{property_x?.replace(/_/g, " ")}: {d.x} {unit_x}</p>
                  <p className="text-slate-400">{property_y?.replace(/_/g, " ")}: {d.y} {unit_y}</p>
                  {d.date && <p className="text-slate-600 mt-1">{d.date}</p>}
                </div>
              );
            }}
          />
          <Scatter name="Tests" data={scatter_data} isAnimationActive={true} animationDuration={800}>
            {scatter_data.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.material] || "#3b82f6"} fillOpacity={0.7} />
            ))}
          </Scatter>
          {trend_line?.length === 2 && (
            <Scatter name="Trend" data={trend_line} line={{ stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5 3" }} shape={() => null} isAnimationActive={false}>
              {trend_line.map((_, i) => (<Cell key={i} fill="transparent" />))}
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {materials.map((m) => (
          <span key={m} className="flex items-center gap-1 text-xs text-slate-500 font-mono">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[m] }} />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Compliance ───────────────────────────────────────────────────────────────

function ComplianceChart({ data }) {
  const { material, property, threshold_value, direction, unit, total_tests, passing_tests, failing_tests, pass_rate_pct, mean_value, verdict, verdict_detail, failed_test_samples } = data;

  const verdictStyle =
    verdict === "COMPLIANT"
      ? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
      : verdict === "AT RISK"
      ? "bg-amber-950/30 text-amber-400 border-amber-800/40"
      : "bg-red-950/30 text-red-400 border-red-800/40";

  return (
    <div className="space-y-4">
      <div className={`border rounded-xl px-4 py-3 font-semibold text-sm ${verdictStyle} flex items-center gap-2 font-mono`}>
        <span className="text-lg">
          {verdict === "COMPLIANT" ? "PASS" : verdict === "AT RISK" ? "WARN" : "FAIL"}
        </span>
        <div>
          <span>{verdict}: {verdict_detail}</span>
          <p className="text-xs font-normal mt-0.5 opacity-75">
            Rule: {property?.replace(/_/g, " ")} must be {direction === "above" ? "≥" : "≤"} {threshold_value} {unit} · Mean: {mean_value} {unit}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Tests", value: total_tests },
          { label: "Passing", value: passing_tests, color: "text-emerald-400" },
          { label: "Failing", value: failing_tests, color: "text-red-400" },
          { label: "Pass Rate", value: `${pass_rate_pct}%`, color: pass_rate_pct >= 95 ? "text-emerald-400" : pass_rate_pct >= 80 ? "text-amber-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#141820] rounded-lg p-3 text-center border border-[#2a3144]">
            <p className="text-[10px] text-slate-500 mb-1 font-mono">{label}</p>
            <p className={`text-xl font-bold font-mono ${color || "text-slate-200"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500 font-mono">
        Mean: <span className="font-semibold text-slate-300">{mean_value} {unit}</span>
        {" "}· Threshold: <span className="font-semibold text-slate-300">{threshold_value} {unit}</span>
        {" "}· Rule: {property?.replace(/_/g, " ")} must be {direction === "above" ? "≥" : "≤"} {threshold_value} {unit}
      </div>

      {failed_test_samples?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2 font-mono">NON-COMPLIANT SAMPLES (up to 10)</p>
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-red-950/30">
                <tr>
                  {["date", "material", "machine", "site", "value"].map((c) => (
                    <th key={c} className="text-left px-2 py-1.5 font-semibold text-red-400 border-b border-red-800/40 font-mono">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failed_test_samples.map((t, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-[#1e2433]" : "bg-red-950/10"}>
                    <td className="px-2 py-1.5 border-b border-[#2a3144] text-slate-400 font-mono">{t.date}</td>
                    <td className="px-2 py-1.5 border-b border-[#2a3144] text-slate-400 font-mono">{t.material}</td>
                    <td className="px-2 py-1.5 border-b border-[#2a3144] text-slate-400 font-mono">{t.machine}</td>
                    <td className="px-2 py-1.5 border-b border-[#2a3144] text-slate-400 font-mono">{t.site}</td>
                    <td className="px-2 py-1.5 border-b border-[#2a3144] font-semibold text-red-400 font-mono">{t.value} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ChartArea (router) ───────────────────────────────────────────────────────

function DrillDownPanel({ date, data, unit, onClose }) {
  if (!date || !data) return null;
  const point = data.time_series?.find((p) => p.date === date);
  if (!point) return null;

  return (
    <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl p-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-400 font-mono">DRILL-DOWN — {date}</h3>
        <button onClick={onClose} className="text-xs text-slate-600 hover:text-slate-400 font-mono">CLOSE</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {point.mean_value != null && (
          <div className="bg-[#141820] rounded-lg p-3 text-center border border-[#2a3144]">
            <p className="text-[10px] text-slate-500 font-mono">Mean</p>
            <p className="text-lg font-bold text-blue-400 font-mono">{point.mean_value}{unit}</p>
          </div>
        )}
        {point.min_value != null && (
          <div className="bg-[#141820] rounded-lg p-3 text-center border border-[#2a3144]">
            <p className="text-[10px] text-slate-500 font-mono">Min</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{point.min_value}{unit}</p>
          </div>
        )}
        {point.max_value != null && (
          <div className="bg-[#141820] rounded-lg p-3 text-center border border-[#2a3144]">
            <p className="text-[10px] text-slate-500 font-mono">Max</p>
            <p className="text-lg font-bold text-red-400 font-mono">{point.max_value}{unit}</p>
          </div>
        )}
      </div>
      {point.n != null && (
        <p className="text-xs text-slate-500 mt-2 font-mono">Based on {point.n} individual test{point.n !== 1 ? "s" : ""} this month</p>
      )}
      {point.trend_value != null && (
        <p className="text-xs text-slate-600 mt-1 font-mono">Trend line value: {point.trend_value}{unit}</p>
      )}
    </div>
  );
}

function FullScreenModal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn" onClick={onClose}>
      <div className="bg-[#1e2433] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto p-6 border border-[#2a3144]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 font-mono">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ChartArea({ chartType, chartData }) {
  const [drillDown, setDrillDown] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);

  if (!chartType || !chartData) return null;

  if (chartType === "table") return <DataTable data={chartData} />;
  if (chartType === "stat_cards") return <StatCards data={chartData} />;
  if (chartType === "compliance") return <ComplianceChart data={chartData} />;

  const unit = unitFor(chartData.property);

  const expandButton = (
    <button
      onClick={() => setFullScreen(true)}
      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-mono"
      title="Expand chart"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
      EXPAND
    </button>
  );

  const chartContent = (isFullScreen) => {
    if (chartType === "time_series") {
      return (
        <div className="space-y-4">
          <TimeSeriesChart data={chartData} onDotClick={(pt) => setDrillDown(pt.date)} />
          {drillDown && (
            <DrillDownPanel date={drillDown} data={chartData} unit={unit} onClose={() => setDrillDown(null)} />
          )}
          {!isFullScreen && <WhatIfSimulator chartType={chartType} chartData={chartData} />}
        </div>
      );
    }
    if (chartType === "forecast") {
      return (
        <div className="space-y-4">
          <ForecastChart data={chartData} />
          {!isFullScreen && <WhatIfSimulator chartType={chartType} chartData={chartData} />}
        </div>
      );
    }
    if (chartType === "scatter") {
      return (
        <div className="space-y-4">
          <ScatterCorrelationChart data={chartData} />
          {!isFullScreen && <WhatIfSimulator chartType={chartType} chartData={chartData} />}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex justify-end mb-1">{expandButton}</div>
      {chartContent(false)}
      {fullScreen && (
        <FullScreenModal onClose={() => setFullScreen(false)}>
          {chartContent(true)}
        </FullScreenModal>
      )}
    </div>
  );
}
