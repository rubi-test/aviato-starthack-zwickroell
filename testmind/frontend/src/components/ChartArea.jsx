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
  BarChart,
  Bar,
} from "recharts";
import StatCards from "./StatCards";
import WhatIfSimulator from "./WhatIfSimulator";

function unitFor(property) {
  if (!property) return "";
  if (property.includes("mpa")) return " MPa";
  if (property.includes("_j")) return " J";
  if (property.includes("pct")) return "%";
  return "";
}

// ─── Table ────────────────────────────────────────────────────────────────────

function DataTable({ data }) {
  if (data.tests) {
    const tests = data.tests;
    if (!tests.length)
      return <p className="text-sm text-gray-400 py-4 text-center">No results found.</p>;

    const cols = ["date", "material", "test_type", "machine", "site", "tester"];
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">{data.count} results</p>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200"
                  >
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className="px-3 py-2 text-gray-700 border-b border-gray-100 truncate max-w-[140px]"
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

  if (data.properties) {
    const props = data.properties;
    if (!props.length)
      return <p className="text-sm text-gray-400 py-4 text-center">No properties found.</p>;

    // Build radar data — normalize each property's mean to 0-100 range
    const radarData = props
      .filter((p) => p.mean != null && p.max > p.min)
      .map((p) => ({
        property: p.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: Math.round(((p.mean - p.min) / (p.max - p.min)) * 100),
        fullMark: 100,
      }));

    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">{data.material}</p>

        {/* Radar chart */}
        {radarData.length >= 3 && (
          <div className="mb-4 animate-scaleIn">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="property" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name={data.material}
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.2}
                  isAnimationActive={true}
                  animationDuration={800}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Relative Score"]} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center -mt-2">Property profile (normalized min→max)</p>
          </div>
        )}

        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                {["Property", "Unit", "n", "Mean", "±Std", "Min", "Max"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.map((p, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} animate-fadeInUp`} style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="px-3 py-2 text-gray-800 font-medium border-b border-gray-100">
                    {p.name.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-gray-500 border-b border-gray-100">{p.unit}</td>
                  <td className="px-3 py-2 text-gray-700 border-b border-gray-100">{p.n}</td>
                  <td className="px-3 py-2 text-gray-800 font-semibold border-b border-gray-100">
                    {p.mean}
                  </td>
                  <td className="px-3 py-2 text-gray-500 border-b border-gray-100">±{p.std}</td>
                  <td className="px-3 py-2 text-gray-500 border-b border-gray-100">{p.min}</td>
                  <td className="px-3 py-2 text-gray-500 border-b border-gray-100">{p.max}</td>
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
      ? "text-red-600"
      : trend_direction === "increasing"
      ? "text-green-600"
      : "text-gray-600";

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
        <span>
          Trend:{" "}
          <span className={`font-semibold ${dirColor}`}>{trend_direction}</span>
        </span>
        <span>
          Slope:{" "}
          <span className="font-mono font-semibold">
            {slope_per_month > 0 ? "+" : ""}
            {slope_per_month?.toFixed(2)}
            {unit}/month
          </span>
        </span>
        <span>
          R²: <span className="font-mono">{r_squared?.toFixed(2)}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={time_series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tickFormatter={(v) => `${v}${unit}`}
            tick={{ fontSize: 11 }}
            width={65}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">{label}</p>
                  {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{unit}</p>
                  ))}
                  {onDotClick && <p className="text-blue-500 mt-1 text-[10px]">Click to drill down</p>}
                </div>
              );
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mean_value"
            name="Monthly avg"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, cursor: onDotClick ? "pointer" : "default" }}
            activeDot={{
              r: 6,
              onClick: onDotClick ? (_, payload) => onDotClick(payload.payload) : undefined,
            }}
            isAnimationActive={true}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="trend_value"
            name="Trend"
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Forecast ────────────────────────────────────────────────────────────────

function ForecastChart({ data }) {
  const {
    time_series,
    forecast_series,
    boundary,
    will_violate,
    estimated_violation_date,
    property,
  } = data;
  if (!time_series?.length) return null;

  const unit = unitFor(property);

  // Merge actual + trend from time_series, then forecast_series into one flat array
  const combined = [
    ...time_series.map((pt) => ({
      date: pt.date,
      actual: pt.mean_value,
      trend: pt.trend_value,
    })),
    ...(forecast_series || []).map((pt) => ({
      date: pt.date,
      forecast: pt.forecast_value,
    })),
  ];

  return (
    <div>
      {will_violate && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <span>⚠</span>
          <span>
            Boundary violation expected:{" "}
            <strong>{estimated_violation_date}</strong>
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={combined} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tickFormatter={(v) => `${v}${unit}`}
            tick={{ fontSize: 11 }}
            width={65}
          />
          <Tooltip
            formatter={(v, name) =>
              v !== undefined && v !== null ? [`${v}${unit}`, name] : [undefined, name]
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={true}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={true}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={true}
            animationDuration={800}
          />
          <ReferenceLine
            y={boundary}
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="8 3"
            label={{
              value: `Boundary: ${boundary}${unit}`,
              position: "insideTopRight",
              fontSize: 11,
              fill: "#dc2626",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Scatter / Correlation ────────────────────────────────────────────────────

const SCATTER_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function ScatterCorrelationChart({ data }) {
  const {
    scatter_data,
    trend_line,
    property_x,
    property_y,
    unit_x,
    unit_y,
    correlation_coefficient: r,
    p_value,
    significant,
    strength,
    direction,
    n,
  } = data;

  if (!scatter_data?.length) return null;

  // Group by material for coloring
  const materials = [...new Set(scatter_data.map((d) => d.material))];
  const colorMap = {};
  materials.forEach((m, i) => {
    colorMap[m] = SCATTER_COLORS[i % SCATTER_COLORS.length];
  });

  const rColor = significant
    ? Math.abs(r) >= 0.7
      ? "text-green-700"
      : "text-yellow-700"
    : "text-gray-500";

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3">
        <span>
          r ={" "}
          <span className={`font-mono font-bold ${rColor}`}>{r}</span>
        </span>
        <span>
          p = <span className="font-mono">{p_value}</span>
        </span>
        <span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              significant
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {significant ? `${strength} ${direction}` : "not significant"}
          </span>
        </span>
        <span className="text-gray-400">n={n}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            name={property_x?.replace(/_/g, " ")}
            type="number"
            unit={unit_x ? ` ${unit_x}` : ""}
            tick={{ fontSize: 11 }}
            label={{
              value: `${property_x?.replace(/_/g, " ")} (${unit_x})`,
              position: "insideBottom",
              offset: -10,
              fontSize: 11,
              fill: "#6b7280",
            }}
          />
          <YAxis
            dataKey="y"
            name={property_y?.replace(/_/g, " ")}
            type="number"
            unit={unit_y ? ` ${unit_y}` : ""}
            tick={{ fontSize: 11 }}
            width={70}
            label={{
              value: `${property_y?.replace(/_/g, " ")} (${unit_y})`,
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#6b7280",
            }}
          />
          <ZAxis range={[30, 30]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">{d.material}</p>
                  <p>{property_x?.replace(/_/g, " ")}: {d.x} {unit_x}</p>
                  <p>{property_y?.replace(/_/g, " ")}: {d.y} {unit_y}</p>
                  {d.date && <p className="text-gray-400 mt-1">{d.date}</p>}
                </div>
              );
            }}
          />
          <Scatter name="Tests" data={scatter_data} isAnimationActive={true} animationDuration={800}>
            {scatter_data.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.material] || "#2563eb"} fillOpacity={0.6} />
            ))}
          </Scatter>
          {trend_line?.length === 2 && (
            <Scatter
              name="Trend"
              data={trend_line}
              line={{ stroke: "#dc2626", strokeWidth: 2, strokeDasharray: "5 3" }}
              shape={() => null}
              isAnimationActive={false}
            >
              {trend_line.map((_, i) => (
                <Cell key={i} fill="transparent" />
              ))}
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {materials.map((m) => (
          <span key={m} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colorMap[m] }}
            />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Compliance ───────────────────────────────────────────────────────────────

function ComplianceChart({ data }) {
  const {
    material,
    property,
    threshold_value,
    direction,
    unit,
    total_tests,
    passing_tests,
    failing_tests,
    pass_rate_pct,
    mean_value,
    verdict,
    verdict_detail,
    failed_test_samples,
  } = data;

  const verdictStyle =
    verdict === "COMPLIANT"
      ? "bg-green-100 text-green-800 border-green-200"
      : verdict === "AT RISK"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-red-100 text-red-800 border-red-200";

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div className={`border rounded-xl px-4 py-3 font-semibold text-sm ${verdictStyle}`}>
        {verdict}: {verdict_detail}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Tests", value: total_tests },
          { label: "Passing", value: passing_tests, color: "text-green-700" },
          { label: "Failing", value: failing_tests, color: "text-red-700" },
          { label: "Pass Rate", value: `${pass_rate_pct}%`, color: pass_rate_pct >= 95 ? "text-green-700" : pass_rate_pct >= 80 ? "text-yellow-700" : "text-red-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color || "text-gray-800"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mean vs threshold */}
      <div className="text-xs text-gray-500">
        Mean: <span className="font-semibold text-gray-800">{mean_value} {unit}</span>
        {" "}· Threshold: <span className="font-semibold text-gray-800">{threshold_value} {unit}</span>
        {" "}· Rule: {property?.replace(/_/g, " ")} must be {direction === "above" ? "≥" : "≤"} {threshold_value} {unit}
      </div>

      {/* Failed samples */}
      {failed_test_samples?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 mb-2">Non-compliant samples (up to 10)</p>
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-red-50">
                <tr>
                  {["date", "material", "machine", "site", "value"].map((c) => (
                    <th key={c} className="text-left px-2 py-1.5 font-semibold text-red-700 border-b border-red-200">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failed_test_samples.map((t, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
                    <td className="px-2 py-1.5 border-b border-gray-100">{t.date}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100">{t.material}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100">{t.machine}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100">{t.site}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100 font-semibold text-red-700">
                      {t.value} {unit}
                    </td>
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

  // data.time_series has the point; show its details
  const point = data.time_series?.find((p) => p.date === date);
  if (!point) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-800">Drill-down — {date}</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700">✕ Close</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {point.mean_value != null && (
          <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
            <p className="text-xs text-gray-400">Mean</p>
            <p className="text-lg font-bold text-blue-700">{point.mean_value}{unit}</p>
          </div>
        )}
        {point.min_value != null && (
          <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
            <p className="text-xs text-gray-400">Min</p>
            <p className="text-lg font-bold text-green-700">{point.min_value}{unit}</p>
          </div>
        )}
        {point.max_value != null && (
          <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
            <p className="text-xs text-gray-400">Max</p>
            <p className="text-lg font-bold text-red-700">{point.max_value}{unit}</p>
          </div>
        )}
      </div>
      {point.n != null && (
        <p className="text-xs text-gray-500 mt-2">Based on {point.n} individual test{point.n !== 1 ? "s" : ""} this month</p>
      )}
      {point.trend_value != null && (
        <p className="text-xs text-gray-500 mt-1">Trend line value: {point.trend_value}{unit}</p>
      )}
    </div>
  );
}

function HistogramChart({ data }) {
  const { bins = [], property = "", material = "", unit = "", n, mean, std, min, max } = data;

  const label = property.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const barData = bins.map((b) => ({ name: b.label, count: b.count }));

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Samples", value: n },
          { label: "Mean", value: `${mean} ${unit}` },
          { label: "Std Dev", value: `${std} ${unit}` },
          { label: "Min", value: `${min} ${unit}` },
          { label: "Max", value: `${max} ${unit}` },
        ].map(({ label: l, value }) => (
          <div key={l} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{l}</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Histogram */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">
          Distribution of {label}{material ? ` — ${material}` : ""}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              label={{ value: `${label} (${unit})`, position: "insideBottom", offset: -36, fontSize: 11, fill: "#6b7280" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              allowDecimals={false}
              label={{ value: "Count", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6b7280" }}
            />
            <Tooltip
              formatter={(v) => [v, "Count"]}
              labelFormatter={(l) => `Range: ${l} ${unit}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ChartArea({ chartType, chartData }) {
  const [drillDown, setDrillDown] = useState(null);

  if (!chartType || !chartData) return null;

  if (chartType === "table") return <DataTable data={chartData} />;
  if (chartType === "stat_cards") return <StatCards data={chartData} />;
  if (chartType === "compliance") return <ComplianceChart data={chartData} />;
  if (chartType === "histogram") return <HistogramChart data={chartData} />;

  const unit = unitFor(chartData.property);

  // Charts that support What-If simulation
  if (chartType === "time_series") {
    return (
      <div className="space-y-4">
        <TimeSeriesChart data={chartData} onDotClick={(pt) => setDrillDown(pt.date)} />
        {drillDown && (
          <DrillDownPanel date={drillDown} data={chartData} unit={unit} onClose={() => setDrillDown(null)} />
        )}
        <WhatIfSimulator chartType={chartType} chartData={chartData} />
      </div>
    );
  }
  if (chartType === "forecast") {
    return (
      <div className="space-y-4">
        <ForecastChart data={chartData} />
        <WhatIfSimulator chartType={chartType} chartData={chartData} />
      </div>
    );
  }
  if (chartType === "scatter") {
    return (
      <div className="space-y-4">
        <ScatterCorrelationChart data={chartData} />
        <WhatIfSimulator chartType={chartType} chartData={chartData} />
      </div>
    );
  }

  return null;
}
