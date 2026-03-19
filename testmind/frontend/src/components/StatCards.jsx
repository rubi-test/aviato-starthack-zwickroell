import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
} from "recharts";

function unitFor(property) {
  if (!property) return "";
  if (property.includes("mpa")) return " MPa";
  if (property.includes("_j")) return " J";
  if (property.includes("pct")) return "%";
  return "";
}

export default function StatCards({ data }) {
  if (!data?.group_a || !data?.group_b) return null;

  const { group_a, group_b, p_value, significant, property } = data;
  const unit = unitFor(property);

  const chartData = [
    { name: group_a.name, mean: group_a.mean, errorY: group_a.std },
    { name: group_b.name, mean: group_b.mean, errorY: group_b.std },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 mb-1 truncate">{group_a.name}</p>
          <p className="text-2xl font-bold text-blue-900">
            {group_a.mean}
            <span className="text-sm font-normal text-blue-600">{unit}</span>
          </p>
          <p className="text-xs text-blue-400 mt-0.5">
            ±{group_a.std} &nbsp;·&nbsp; n={group_a.n}
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-orange-500 mb-1 truncate">{group_b.name}</p>
          <p className="text-2xl font-bold text-orange-900">
            {group_b.mean}
            <span className="text-sm font-normal text-orange-600">{unit}</span>
          </p>
          <p className="text-xs text-orange-400 mt-0.5">
            ±{group_b.std} &nbsp;·&nbsp; n={group_b.n}
          </p>
        </div>

        <div
          className={`border rounded-xl p-4 ${
            significant
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 ${
              significant ? "text-green-500" : "text-gray-400"
            }`}
          >
            p-value
          </p>
          <p
            className={`text-2xl font-bold ${
              significant ? "text-green-900" : "text-gray-700"
            }`}
          >
            {p_value?.toFixed(3)}
          </p>
          <p
            className={`text-xs font-semibold mt-0.5 ${
              significant ? "text-green-600" : "text-gray-400"
            }`}
          >
            {significant ? "✓ Significant" : "Not significant"}
          </p>
        </div>
      </div>

      {/* Bar chart with error bars */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v}${unit}`}
            tick={{ fontSize: 11 }}
            width={60}
          />
          <Tooltip
            formatter={(v) => [`${v}${unit}`, "Mean"]}
          />
          <Bar dataKey="mean" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <ErrorBar
              dataKey="errorY"
              width={8}
              strokeWidth={2}
              stroke="#1e40af"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
