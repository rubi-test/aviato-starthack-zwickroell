import { useState, useEffect, useRef } from "react";

/** Animated counter that counts from 0 to target value with ease-out cubic easing. */
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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/** Tiny inline SVG sparkline for visual micro-trend. */
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
    <svg width={width} height={height} className="flex-shrink-0 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MetricCard({ label, value, color = "default", onClick, active, sparklineData, subtitle }) {
  const colorMap = {
    default: "text-gray-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  const sparkColorMap = {
    default: "#6b7280",
    warning: "#d97706",
    danger: "#dc2626",
  };

  const animatedValue = useAnimatedValue(typeof value === "number" ? value : 0);
  const displayValue = typeof value === "number" ? animatedValue : value;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-1 text-left transition-all group hover-lift ${
        active
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-200 hover:border-blue-300"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        {sparklineData && <Sparkline data={sparklineData} color={sparkColorMap[color] || sparkColorMap.default} />}
      </div>
      <p className={`text-4xl font-semibold tabular-nums ${colorMap[color] ?? colorMap.default}`}>
        {displayValue}
      </p>
      {subtitle && (
        <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
      )}
      {onClick && (
        <p className="text-[10px] text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view details</p>
      )}
    </button>
  );
}
