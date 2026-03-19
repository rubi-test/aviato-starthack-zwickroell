import { useState, useRef, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ErrorBar,
} from "recharts";
import { buildGraph } from "../api";
import { useToast } from "../components/Toast";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

const QUICK_PROMPTS = [
  "Line chart of max force over time for Steel",
  "Bar chart comparing max force across all materials",
  "Histogram of max force distribution",
  "Pie chart of tests by material",
  "Pie chart of tests by test type",
  "Bar chart comparing Steel and FEP",
];

function GraphRenderer({ result }) {
  if (!result || !result.success) return null;

  const { chart_type, series, title, x_label, y_label } = result;

  if (chart_type === "line") {
    // Merge all series into unified time series
    const dateMap = new Map();
    for (const s of series) {
      for (const pt of s.data) {
        const existing = dateMap.get(pt.x) || { date: pt.x };
        existing[s.name] = pt.y;
        dateMap.set(pt.x, existing);
      }
    }
    const merged = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={merged} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={60} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={800} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "bar") {
    const data = series[0]?.data || [];
    return (
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-15} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={60} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155" }} />
          <Bar dataKey="mean" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <ErrorBar dataKey="std" width={6} strokeWidth={2} stroke="#94a3b8" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 10, fill: "#64748b" }}
            label={{ value: x_label, position: "insideBottom", offset: -10, fontSize: 10, fill: "#64748b" }} />
          <YAxis dataKey="y" type="number" tick={{ fontSize: 10, fill: "#64748b" }} width={60}
            label={{ value: y_label, angle: -90, position: "insideLeft", fontSize: 10, fill: "#64748b" }} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155" }}
            formatter={(v, name) => [v, name === "x" ? x_label : y_label]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Scatter key={s.name} name={s.name} data={s.data} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} isAnimationActive animationDuration={800} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "histogram") {
    const data = series[0]?.data || [];
    return (
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#64748b" }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={40} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "pie") {
    const data = series[0]?.data || [];
    return (
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130} innerRadius={60}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: "#475569" }}
            isAnimationActive animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#334155" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

export default function GraphBuilderScreen({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [graphSpec, setGraphSpec] = useState(null);
  const [history, setHistory] = useState([]);
  const chartRef = useRef(null);
  const bottomRef = useRef(null);
  const addToast = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || isLoading) return;
    setInput("");

    const userMsg = { role: "user", content: prompt, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      console.log("[GraphBuilder] Sending spec:", JSON.stringify(graphSpec));
      const result = await buildGraph(prompt, history, graphSpec);
      console.log("[GraphBuilder] Got spec back:", JSON.stringify(result.spec));
      setHistory((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: result.message }]);

      if (result.success) {
        setCurrentResult(result);
        setGraphSpec(result.spec || null);
        setMessages((prev) => [...prev, { role: "assistant", content: result.message, explanation: result.explanation, time: new Date() }]);
      } else {
        setCurrentResult(null);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: result.message,
          suggestions: result.suggestions,
          time: new Date(),
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to build graph. Try rephrasing." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPNG = () => {
    const el = chartRef.current;
    if (!el) return;
    const svg = el.querySelector("svg.recharts-surface");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width * 2; canvas.height = img.height * 2;
      ctx.scale(2, 2); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a"); a.href = pngUrl;
      a.download = `testmind_graph_${Date.now()}.png`; a.click();
    };
    img.src = url;
    addToast("Graph exported as PNG", "success");
  };

  const handleExportSVG = () => {
    const el = chartRef.current;
    if (!el) return;
    const svg = el.querySelector("svg.recharts-surface");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `testmind_graph_${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
    addToast("Graph exported as SVG", "success");
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-xs text-blue-600 hover:text-blue-500 transition-colors font-mono">← BACK</button>
        <span className="text-slate-200">|</span>
        <span className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Graph Builder</span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-200 font-mono">AI-POWERED</span>
        </div>
        <div className="flex-1" />
        {currentResult && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportPNG} className="text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-2 py-1 font-mono transition-colors">↓ PNG</button>
            <button onClick={handleExportSVG} className="text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-2 py-1 font-mono transition-colors">↓ SVG</button>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat panel (35%) */}
        <div className="w-[35%] border-r border-slate-200 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center pt-4 space-y-4">
                <div className="text-slate-500 text-xs font-mono space-y-1">
                  <p className="text-slate-700 text-sm font-semibold mb-3">Build custom graphs with AI</p>
                  <p>Describe the chart you want in plain English.</p>
                  <p>I'll build it or explain what won't work.</p>
                </div>
                <div className="space-y-1.5 mt-4">
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Quick starts</p>
                  {QUICK_PROMPTS.map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)}
                      className="w-full text-left text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-3 py-2 transition-colors font-mono truncate">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                }`}>
                  <p>{msg.content}</p>
                  {msg.explanation && (
                    <p className="text-xs text-blue-400/60 mt-1 font-mono">{msg.explanation}</p>
                  )}
                  {msg.suggestions && (
                    <div className="mt-2 space-y-1">
                      {msg.suggestions.map((s, j) => (
                        <p key={j} className="text-xs text-amber-600/70 font-mono">• {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-500 font-mono flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Building graph...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe your graph..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 font-mono"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-mono hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
              >
                BUILD
              </button>
            </div>
          </div>
        </div>

        {/* Right: Graph canvas (65%) */}
        <div className="flex-1 flex flex-col bg-slate-50 grid-pattern">
          {!currentResult ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-slate-500 font-mono">Your graph will render here</p>
                <p className="text-xs text-slate-400 font-mono">Describe what you want in the chat</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Title bar */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 font-mono">{currentResult.title}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{currentResult.explanation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 font-mono uppercase">{currentResult.chart_type}</span>
                </div>
              </div>

              {/* Chart */}
              <div ref={chartRef} className="card-dark p-4 animate-fadeIn">
                <GraphRenderer result={currentResult} />
              </div>

              {/* Axis labels */}
              <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-mono">
                <span>X: {currentResult.x_label}</span>
                <span>Y: {currentResult.y_label}</span>
              </div>

              {/* Data summary */}
              {currentResult.series && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentResult.series.map((s, i) => (
                    <div key={i} className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded px-3 py-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-500 font-mono">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.data?.length || 0} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Active graph spec indicator */}
              {graphSpec && (
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase tracking-wider">ACTIVE GRAPH SPEC</span>
                    <button
                      onClick={() => { setGraphSpec(null); setCurrentResult(null); setMessages((prev) => [...prev, { role: "assistant", content: "Graph cleared. Describe a new graph to start fresh.", time: new Date() }]); }}
                      className="text-[10px] text-red-400/60 hover:text-red-600 font-mono transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 font-mono">{graphSpec.chart_type}</span>
                    {graphSpec.materials?.map((m) => (
                      <span key={m} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 font-mono">{m}</span>
                    ))}
                    {graphSpec.properties?.map((p) => (
                      <span key={p} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-200 font-mono">{p.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-2">Say "add Steel" or "remove FEP" to modify</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
