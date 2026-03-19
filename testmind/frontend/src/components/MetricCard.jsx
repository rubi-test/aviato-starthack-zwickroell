import { useState, useEffect, useRef } from "react";

function useAnimatedValue(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (typeof target !== "number" || isNaN(target)) {
      setDisplay(target);
      return;
    }
    const from = prevTarget.current ?? 0;
    prevTarget.current = target;
    const start = performance.now();
    let raf;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function Sparkline({ data = [], color = "#3b82f6", width = 64, height = 20 }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="flex-shrink-0 opacity-50">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MetricCard({ label, value, color = "default", onClick, active, sparklineData, subtitle }) {
  const colorMap = {
    default: "text-slate-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  const sparkColorMap = {
    default: "#475569",
    warning: "#d97706",
    danger: "#dc2626",
  };
  const borderColor = {
    default: active ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-slate-200 hover:border-slate-300",
    warning: active ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-slate-200 hover:border-amber-400",
    danger: active ? "border-red-500/50 ring-1 ring-red-500/20" : "border-slate-200 hover:border-red-400",
  };

  const animatedValue = useAnimatedValue(typeof value === "number" ? value : 0);
  const displayValue = typeof value === "number" ? animatedValue : value;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 flex flex-col gap-1 text-left transition-all group hover-lift ${
        borderColor[color] ?? borderColor.default
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">{label}</p>
        {sparklineData && <Sparkline data={sparklineData} color={sparkColorMap[color] || sparkColorMap.default} />}
      </div>
      <p className={`text-3xl font-bold tabular-nums font-mono ${colorMap[color] ?? colorMap.default}`}>
        {displayValue}
      </p>
      {subtitle && (
        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{subtitle}</p>
      )}
      {onClick && (
        <p className="text-[10px] text-blue-500/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">CLICK TO EXPAND</p>
      )}
    </button>
  );
}
