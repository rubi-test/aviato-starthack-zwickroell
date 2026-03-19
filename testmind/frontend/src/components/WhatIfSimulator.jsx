import { useState, useMemo } from "react";

export default function WhatIfSimulator({ chartType, chartData }) {
  // For scatter/correlation: predict Y from X using trend line
  if (chartType === "scatter" && chartData?.trend_line?.length === 2) {
    return <CorrelationSimulator data={chartData} />;
  }

  // For time_series/forecast: extend months forward
  if ((chartType === "time_series" || chartType === "forecast") && chartData?.slope_per_month != null) {
    return <TrendSimulator data={chartData} />;
  }

  return null;
}

function CorrelationSimulator({ data }) {
  const { trend_line, property_x, property_y, unit_x, unit_y, scatter_data } = data;

  // Calculate slope/intercept from trend_line endpoints
  const x1 = trend_line[0].x, y1 = trend_line[0].y;
  const x2 = trend_line[1].x, y2 = trend_line[1].y;
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = y1 - slope * x1;

  const xMin = Math.floor(Math.min(...scatter_data.map((d) => d.x)));
  const xMax = Math.ceil(Math.max(...scatter_data.map((d) => d.x)));

  const [xValue, setXValue] = useState(Math.round((xMin + xMax) / 2 * 10) / 10);
  const predictedY = (slope * xValue + intercept).toFixed(2);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-sm font-semibold text-purple-800">What-If Simulator</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Drag the slider to see how changing {property_x?.replace(/_/g, " ")} predicts {property_y?.replace(/_/g, " ")}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{xMin} {unit_x}</span>
            <span className="font-semibold text-purple-700">{xValue} {unit_x}</span>
            <span>{xMax} {unit_x}</span>
          </div>
          <input
            type="range"
            min={xMin}
            max={xMax}
            step={(xMax - xMin) / 200}
            value={xValue}
            onChange={(e) => setXValue(parseFloat(e.target.value))}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <p className="text-xs text-gray-400 mt-1">{property_x?.replace(/_/g, " ")}</p>
        </div>
        <div className="text-center px-4 py-3 bg-white rounded-xl border border-purple-200 shadow-sm min-w-[120px]">
          <p className="text-xs text-gray-400">Predicted</p>
          <p className="text-xl font-bold text-purple-700">{predictedY}</p>
          <p className="text-xs text-gray-500">{unit_y}</p>
        </div>
      </div>
    </div>
  );
}

function TrendSimulator({ data }) {
  const { slope_per_month, time_series, property } = data;
  const lastValue = time_series?.[time_series.length - 1]?.mean_value || 0;
  const unit = data.unit || ("mpa" in (property || "") ? "MPa" : "_j" in (property || "") ? "J" : "%");

  const [monthsForward, setMonthsForward] = useState(6);
  const predictedValue = (lastValue + slope_per_month * monthsForward).toFixed(1);

  const dirLabel = slope_per_month < 0 ? "declining" : slope_per_month > 0 ? "rising" : "stable";
  const dirColor = slope_per_month < -0.1 ? "text-red-600" : slope_per_month > 0.1 ? "text-green-600" : "text-gray-600";

  // Generate forecast points
  const forecastPoints = useMemo(() => {
    return Array.from({ length: monthsForward + 1 }, (_, i) => ({
      month: i,
      value: parseFloat((lastValue + slope_per_month * i).toFixed(1)),
    }));
  }, [monthsForward, lastValue, slope_per_month]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-sm font-semibold text-purple-800">Trend Simulator</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Slide to project the {dirLabel} trend ({slope_per_month > 0 ? "+" : ""}{slope_per_month} {unit}/mo) into the future
      </p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Now</span>
            <span className="font-semibold text-purple-700">+{monthsForward} months</span>
            <span>+24 months</span>
          </div>
          <input
            type="range"
            min={1}
            max={24}
            step={1}
            value={monthsForward}
            onChange={(e) => setMonthsForward(parseInt(e.target.value))}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          {/* Mini sparkline */}
          <div className="flex items-end gap-px mt-2 h-8">
            {forecastPoints.map((p, i) => {
              const min = Math.min(...forecastPoints.map((f) => f.value));
              const max = Math.max(...forecastPoints.map((f) => f.value));
              const range = max - min || 1;
              const height = ((p.value - min) / range) * 100;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${i === 0 ? "bg-blue-400" : "bg-purple-300"}`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
              );
            })}
          </div>
        </div>
        <div className="text-center px-4 py-3 bg-white rounded-xl border border-purple-200 shadow-sm min-w-[130px]">
          <p className="text-xs text-gray-400">Projected value</p>
          <p className={`text-xl font-bold ${dirColor}`}>{predictedValue}</p>
          <p className="text-xs text-gray-500">{unit} in {monthsForward}mo</p>
          <p className="text-xs text-gray-300 mt-1">
            ({slope_per_month > 0 ? "+" : ""}{(slope_per_month * monthsForward).toFixed(1)} from current)
          </p>
        </div>
      </div>
    </div>
  );
}
