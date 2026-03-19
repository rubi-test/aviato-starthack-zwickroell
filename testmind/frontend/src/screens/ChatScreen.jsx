import { useState, useEffect, useRef } from "react";
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
  const [response, setResponse] = useState(null);
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

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    saveToHistory(text);

    try {
      const result = await sendChatMessage(text, history, { default_site: "Ulm" });

      const assistantMsg = { role: "assistant", content: result.answer };
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
