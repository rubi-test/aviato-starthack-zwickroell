import { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../api";
import ChatThread from "../components/ChatThread";
import ResultsPanel from "../components/ResultsPanel";
import { useToast } from "../components/Toast";

function ProgressBar({ active }) {
  if (!active) return null;
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 overflow-hidden z-50">
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
  const [response, setResponse] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [savedQueries, setSavedQueries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tm_saved_templates") || "[]");
    } catch {
      return [];
    }
  });
  const sentInitial = useRef(false);

  // Auto-send the initial message once on mount
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

      const assistantMsg = { role: "assistant", content: result.answer, time: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: result.answer },
      ]);
      setResponse(result);
    } catch {
      const errorMsg = {
        role: "assistant",
        content: "Something went wrong — try rephrasing your question.",
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  // Determine context from latest response
  const contextInfo = (() => {
    if (!response) return null;
    const { tool_used, chart_data } = response;
    const parts = [];
    if (chart_data?.material) parts.push(chart_data.material);
    if (chart_data?.property) parts.push(chart_data.property.replace(/_/g, " "));
    if (tool_used) parts.push(tool_used.replace(/_/g, " "));
    return parts.length > 0 ? parts : null;
  })();

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden relative">
      <ProgressBar active={isLoading} />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 font-medium"
        >
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">TestMind Chat</span>
        {contextInfo && (
          <div className="flex items-center gap-1.5 ml-2">
            {contextInfo.map((tag, i) => (
              <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {responseTime && (
            <span className="text-[10px] text-green-600 font-mono bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              {responseTime}s
            </span>
          )}
          <span className="text-[10px] text-gray-400 font-mono">{messages.length} messages</span>
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
                const a = document.createElement("a");
                a.href = url;
                a.download = `testmind_chat_${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                addToast("Conversation exported", "success");
              }}
              className="text-[10px] text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 rounded-md px-2 py-1 transition-colors flex items-center gap-1"
              title="Export conversation"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          )}
          {messages.length > 1 && (
            <button
              onClick={() => {
                setMessages([]);
                setHistory([]);
                setResponse(null);
                setResponseTime(null);
                addToast("Conversation cleared", "info");
              }}
              className="text-[10px] text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-md px-2 py-1 transition-colors flex items-center gap-1"
              title="Clear conversation"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Site: Ulm</span>
        </div>
      </header>

      {/* Body: 40% chat | 60% results */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Chat (40%) */}
        <div className="w-2/5 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <ChatThread
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            disabled={isLoading}
            onBookmark={handleBookmark}
            savedQueries={savedQueries}
          />
        </div>

        {/* Right — Results (60%) */}
        <div className="w-3/5 bg-white overflow-hidden">
          <ResultsPanel
            response={response}
            onFollowUp={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
