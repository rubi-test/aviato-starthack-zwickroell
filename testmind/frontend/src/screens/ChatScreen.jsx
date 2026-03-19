import { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../api";
import ChatThread from "../components/ChatThread";
import ResultsPanel from "../components/ResultsPanel";
import { useToast } from "../components/Toast";

function ProgressBar({ active }) {
  if (!active) return null;
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800 overflow-hidden z-50">
      <div className="h-full bg-blue-500 animate-shimmer" style={{ width: "40%", background: "linear-gradient(90deg, transparent, #3b82f6, transparent)", backgroundSize: "200% 100%" }} />
    </div>
  );
}

function saveToHistory(query) {
  try {
    const existing = JSON.parse(localStorage.getItem("tm_query_history") || "[]");
    const updated = [query, ...existing.filter((q) => q !== query)].slice(0, 10);
    localStorage.setItem("tm_query_history", JSON.stringify(updated));
  } catch {}
}

function saveTemplate(query) {
  try {
    const existing = JSON.parse(localStorage.getItem("tm_saved_templates") || "[]");
    if (!existing.includes(query)) {
      localStorage.setItem("tm_saved_templates", JSON.stringify([query, ...existing].slice(0, 20)));
    }
  } catch {}
}

export default function ChatScreen({ initialMessage, onBack }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [scrollTrigger, setScrollTrigger] = useState({ id: null, seq: 0 });
  const [responseTime, setResponseTime] = useState(null);
  const [savedQueries, setSavedQueries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tm_saved_templates") || "[]"); }
    catch { return []; }
  });
  const sentInitial = useRef(false);

  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      handleSend(initialMessage);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text) => {
    if (isLoading || !text.trim()) return;
    const userMsg = { role: "user", content: text, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    saveToHistory(text);

    try {
      const t0 = performance.now();
      const result = await sendChatMessage(text, history, { default_site: "Ulm" });
      setResponseTime(((performance.now() - t0) / 1000).toFixed(1));

      const resultId = `result-${Date.now()}`;
      const assistantMsg = { role: "assistant", content: result.answer, time: new Date(), resultId };
      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: result.answer },
      ]);
      setResponses((prev) => [...prev, { ...result, id: resultId, question: text }]);
      setScrollTrigger((prev) => ({ id: resultId, seq: prev.seq + 1 }));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong — try rephrasing your question." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToast = useToast();

  const handleBookmark = (query) => {
    saveTemplate(query);
    setSavedQueries((prev) => {
      if (prev.includes(query)) return prev;
      return [query, ...prev].slice(0, 20);
    });
    addToast("Query saved to bookmarks", "success");
  };

  const contextInfo = (() => {
    const response = responses[0];
    if (!response) return null;
    const { tool_used, chart_data } = response;
    const parts = [];
    if (chart_data?.material) parts.push(chart_data.material);
    if (chart_data?.property) parts.push(chart_data.property.replace(/_/g, " "));
    if (tool_used) parts.push(tool_used.replace(/_/g, " "));
    return parts.length > 0 ? parts : null;
  })();

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden relative">
      <ProgressBar active={isLoading} />
      {/* Header */}
      <header className="bg-[#141820] border-b border-[#1e2433] px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-mono">
          ← BACK
        </button>
        <span className="text-slate-700">|</span>
        <span className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">TestMind Chat</span>
        {contextInfo && (
          <div className="flex items-center gap-1.5 ml-2">
            {contextInfo.map((tag, i) => (
              <span key={i} className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40 font-mono">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {responseTime && (
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800/40">
              {responseTime}s
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-mono">{messages.length} msg</span>
          {messages.length > 0 && (
            <button
              onClick={() => {
                const text = messages.map((m) => {
                  const prefix = m.role === "user" ? "You" : "TestMind";
                  const ts = m.time ? ` [${m.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]` : "";
                  return `${prefix}${ts}:\n${m.content}`;
                }).join("\n\n---\n\n");
                const blob = new Blob([`TestMind Conversation Export\n${"=".repeat(40)}\n\n${text}`], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `testmind_chat_${Date.now()}.txt`; a.click();
                URL.revokeObjectURL(url);
                addToast("Conversation exported", "success");
              }}
              className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500 rounded px-2 py-1 transition-colors flex items-center gap-1 font-mono"
              title="Export conversation"
            >
              ↓ EXPORT
            </button>
          )}
          {messages.length > 1 && (
            <button
              onClick={() => { setMessages([]); setHistory([]); setResponses([]); setScrollTrigger({ id: null, seq: 0 }); setResponseTime(null); addToast("Conversation cleared", "info"); }}
              className="text-[10px] text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-700 rounded px-2 py-1 transition-colors font-mono"
              title="Clear conversation"
            >
              CLEAR
            </button>
          )}
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2.5 py-1 rounded font-mono border border-slate-700">ULM</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/5 border-r border-[#1e2433] bg-[#0f1117] flex flex-col overflow-hidden">
          <ChatThread messages={messages} isLoading={isLoading} onSend={handleSend} disabled={isLoading} onBookmark={handleBookmark} savedQueries={savedQueries} onResultClick={(id) => setScrollTrigger((prev) => ({ id, seq: prev.seq + 1 }))} />
        </div>
        <div className="w-3/5 bg-[#141820] overflow-hidden">
          <ResultsPanel responses={responses} scrollTrigger={scrollTrigger} onFollowUp={handleSend} />
        </div>
      </div>
    </div>
  );
}
