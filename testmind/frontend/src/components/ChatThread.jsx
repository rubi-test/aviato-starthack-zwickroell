import { useState, useEffect, useRef } from "react";

function summarize(text) {
  if (!text) return "";
  const firstLine = text.split("\n")[0].replace(/[#*`_]/g, "").trim();
  if (firstLine.length > 0 && firstLine.length <= 200) return firstLine;
  const sentences = text.replace(/[#*`_]/g, "").replace(/\n+/g, " ").trim().match(/[^.!?]+[.!?]+/g);
  if (sentences) return sentences[0].trim();
  return firstLine.slice(0, 150) + "…";
}

const ANALYSIS_STEPS = [
  "Understanding your question...",
  "Selecting analysis tool...",
  "Querying test records...",
  "Running statistical analysis...",
  "Generating answer...",
];

const AUTOCOMPLETE_SUGGESTIONS = [
  "Summarize all properties for {material}",
  "Show all tensile tests for {material}",
  "Compare PVC and Steel max force",
  "What standards are used in our tests?",
  "Show compression test results for {material}",
  "Correlate max force and tensile modulus for {material}",
  "What is the trend for {material} max force?",
  "List all materials in the database",
  "Show test distribution by test type",
  "Show recent test results",
];

const MATERIALS = ["PVC", "Steel", "FEP", "Spur+ 1015", "BEAD WIRE 1.82", "UD-TP Tape", "PTL"];

function getAutocompleteSuggestions(input) {
  if (!input || input.length < 2) return [];
  const lower = input.toLowerCase();
  const suggestions = [];
  for (const template of AUTOCOMPLETE_SUGGESTIONS) {
    for (const mat of MATERIALS) {
      const expanded = template.replace("{material}", mat);
      if (expanded.toLowerCase().includes(lower) && expanded.toLowerCase() !== lower) {
        suggestions.push(expanded);
      }
    }
    if (!template.includes("{material}")) {
      if (template.toLowerCase().includes(lower) && template.toLowerCase() !== lower) {
        suggestions.push(template);
      }
    }
  }
  return [...new Set(suggestions)].slice(0, 5);
}

export default function ChatThread({ messages, isLoading, onSend, disabled, onResultClick }) {
  const [input, setInput] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const bottomRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) { setActiveStep(0); setElapsed(0); return; }
    setActiveStep(0); setElapsed(0);
    const timers = ANALYSIS_STEPS.map((_, i) =>
      i === 0 ? null : setTimeout(() => setActiveStep(i), i * 900)
    );
    const interval = setInterval(() => setElapsed((e) => +(e + 0.1).toFixed(1)), 100);
    return () => { timers.forEach((t) => t && clearTimeout(t)); clearInterval(interval); };
  }, [isLoading]);

  useEffect(() => {
    setSuggestions(getAutocompleteSuggestions(input));
    setSelectedSuggestion(-1);
  }, [input]);

  const handleSend = (text) => {
    const msg = (text || input).trim();
    if (!msg || disabled || isLoading) return;
    setInput(""); setSuggestions([]); onSend(msg);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedSuggestion(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedSuggestion(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Tab" && selectedSuggestion >= 0) { e.preventDefault(); setInput(suggestions[selectedSuggestion]); setSuggestions([]); return; }
    }
    if (e.key === "Enter") {
      if (selectedSuggestion >= 0 && suggestions.length > 0) { e.preventDefault(); handleSend(suggestions[selectedSuggestion]); }
      else { handleSend(); }
    }
    if (e.key === "Escape") { setSuggestions([]); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center pt-8 font-mono">
            Ask a question to get started
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
            <div className="flex flex-col items-end gap-1 max-w-[88%]">
              <div
                className={`w-full px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div>
                    <p>{summarize(msg.content)}</p>
                    {msg.resultId && onResultClick && (
                      <button
                        onClick={() => onResultClick(msg.resultId)}
                        className="text-xs text-blue-400/60 hover:text-blue-600 mt-1.5 font-mono transition-colors text-left"
                      >
                        See results panel →
                      </button>
                    )}
                  </div>
                ) : msg.content}
              </div>
              {msg.time && (
                <span className="text-[10px] text-slate-400 font-mono px-1">
                  {msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-lg rounded-bl-sm text-sm w-64">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-500 font-mono">{elapsed.toFixed(1)}s</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                {ANALYSIS_STEPS.map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 transition-all duration-300 ${i <= activeStep ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                    {i < activeStep ? (
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i === activeStep ? (
                      <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-200 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-mono ${i < activeStep ? "text-slate-500" : i === activeStep ? "text-blue-600" : "text-slate-400"}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-slate-200 bg-white relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20 animate-fadeIn">
            {suggestions.map((s, i) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                onMouseEnter={() => setSelectedSuggestion(i)}
                className={`w-full text-left px-4 py-2 text-sm font-mono transition-colors ${
                  i === selectedSuggestion ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
            <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200 flex gap-3 text-[10px] text-slate-400 font-mono">
              <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1">↑↓</kbd> nav</span>
              <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1">Tab</kbd> fill</span>
              <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1">Enter</kbd> send</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question…"
            disabled={disabled || isLoading}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-colors font-mono"
          />
          <button
            onClick={() => handleSend()}
            disabled={disabled || isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-mono hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
