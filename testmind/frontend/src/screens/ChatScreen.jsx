import { useState, useEffect, useRef, useCallback } from "react";
import { sendChatMessage } from "../api";
import ChatThread from "../components/ChatThread";
import ResultsPanel from "../components/ResultsPanel";
import { useToast } from "../components/Toast";

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
  const [savedQueries, setSavedQueries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tm_saved_templates") || "[]");
    } catch {
      return [];
    }
  });
  const sentInitial = useRef(false);
  const resultsPanelRef = useRef(null);
  const resultRefs = useRef([]);

  // Auto-scroll results panel to the newest result when responses grow
  useEffect(() => {
    if (responses.length === 0) return;
    const lastRef = resultRefs.current[responses.length - 1];
    lastRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [responses.length]);

  const scrollToResult = useCallback((index) => {
    resultRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Auto-send the initial message once on mount
  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      handleSend(initialMessage);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text) => {
    if (isLoading || !text.trim()) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    saveToHistory(text);

    try {
      const result = await sendChatMessage(text, history, { default_site: "Ulm" });

      const assistantMsg = { role: "assistant", content: result.answer };
      setMessages((prev) => [...prev, assistantMsg]);

      // Include tool_result in history so the LLM has data context in follow-ups
      const toolContext = result.tool_result
        ? `\n\n[Data retrieved: ${JSON.stringify(result.tool_result).substring(0, 1200)}]`
        : "";
      setHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: result.answer + toolContext },
      ]);

      setResponses((prev) => [...prev, { ...result, question: text }]);
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 font-medium"
        >
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">TestMind Chat</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Site: Ulm</span>
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
            onScrollToResult={scrollToResult}
          />
        </div>

        {/* Right — Results (60%) */}
        <div ref={resultsPanelRef} className="w-3/5 bg-white overflow-y-auto">
          {responses.length === 0 && !isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center space-y-2">
                <p className="text-5xl">📊</p>
                <p className="text-sm font-medium text-gray-500">Results will appear here</p>
                <p className="text-xs text-gray-400">Ask a question on the left to get started</p>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-8">
              {responses.map((resp, i) => (
                <div key={i} ref={(el) => (resultRefs.current[i] = el)}>
                  {responses.length > 1 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">{i + 1}</span>
                      {resp.question}
                    </p>
                  )}
                  <ResultsPanel response={resp} onFollowUp={handleSend} />
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <span className="animate-stepPulse">⋯</span> Analysing…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
