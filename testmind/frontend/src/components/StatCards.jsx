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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-400 mb-1 truncate font-mono">{group_a.name}</p>
          <p className="text-2xl font-bold text-blue-300 font-mono">
            {group_a.mean}
            <span className="text-sm font-normal text-blue-500">{unit}</span>
          </p>
          <p className="text-xs text-blue-500/70 mt-0.5 font-mono">
            ±{group_a.std} · n={group_a.n}
          </p>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-400 mb-1 truncate font-mono">{group_b.name}</p>
          <p className="text-2xl font-bold text-amber-300 font-mono">
            {group_b.mean}
            <span className="text-sm font-normal text-amber-500">{unit}</span>
          </p>
          <p className="text-xs text-amber-500/70 mt-0.5 font-mono">
            ±{group_b.std} · n={group_b.n}
          </p>
        </div>

        <div
          className={`border rounded-xl p-4 ${
            significant
              ? "bg-emerald-950/30 border-emerald-800/40"
              : "bg-[#1e2433] border-[#2a3144]"
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 font-mono ${
              significant ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            p-value
          </p>
          <p
            className={`text-2xl font-bold font-mono ${
              significant ? "text-emerald-300" : "text-slate-300"
            }`}
          >
            {p_value?.toFixed(3)}
          </p>
          <p
            className={`text-xs font-semibold mt-0.5 font-mono ${
              significant ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            {significant ? "SIGNIFICANT" : "NOT SIGNIFICANT"}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2433" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#2a3144" />
          <YAxis
            tickFormatter={(v) => `${v}${unit}`}
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={60}
            stroke="#2a3144"
          />
          <Tooltip
            formatter={(v) => [`${v}${unit}`, "Mean"]}
            contentStyle={{ background: "#1e2433", border: "1px solid #2a3144", borderRadius: "8px", color: "#e2e8f0" }}
          />
          <Bar dataKey="mean" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <ErrorBar
              dataKey="errorY"
              width={8}
              strokeWidth={2}
              stroke="#60a5fa"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
