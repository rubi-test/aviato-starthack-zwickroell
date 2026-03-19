export default function MetricCard({ label, value, color = "default", onClick, active }) {
  const colorMap = {
    default: "text-gray-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-1 text-left transition-all ${
        active
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-200 hover:border-blue-300 hover:shadow-md"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-4xl font-semibold tabular-nums ${colorMap[color] ?? colorMap.default}`}>
        {value}
      </p>
      {onClick && (
        <p className="text-[10px] text-blue-400 mt-1">Click to view details</p>
      )}
    </button>
  );
}
