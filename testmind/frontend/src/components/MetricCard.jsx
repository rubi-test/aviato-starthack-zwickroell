export default function MetricCard({ label, value, color = "default" }) {
  const colorMap = {
    default: "text-gray-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-4xl font-semibold tabular-nums ${colorMap[color] ?? colorMap.default}`}>
        {value}
      </p>
    </div>
  );
}
