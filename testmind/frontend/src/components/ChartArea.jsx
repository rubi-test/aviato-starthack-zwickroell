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
} from "recharts";
import StatCards from "./StatCards";

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

    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">{data.material}</p>
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
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
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

function TimeSeriesChart({ data }) {
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
          <Tooltip formatter={(v) => [`${v}${unit}`]} />
          <Legend />
          <Line
            type="monotone"
            dataKey="mean_value"
            name="Monthly avg"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="trend_value"
            name="Trend"
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
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

// ─── ChartArea (router) ───────────────────────────────────────────────────────

export default function ChartArea({ chartType, chartData }) {
  if (!chartType || !chartData) return null;

  if (chartType === "table") return <DataTable data={chartData} />;
  if (chartType === "stat_cards") return <StatCards data={chartData} />;
  if (chartType === "time_series") return <TimeSeriesChart data={chartData} />;
  if (chartType === "forecast") return <ForecastChart data={chartData} />;

  return null;
}
