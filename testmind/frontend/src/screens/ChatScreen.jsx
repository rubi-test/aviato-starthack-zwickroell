import { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../api";
import ChatThread from "../components/ChatThread";
import ResultsPanel from "../components/ResultsPanel";

export default function ChatScreen({ initialMessage, onBack }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
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
          />
        </div>

        {/* Right — Results (60%) */}
        <div className="w-3/5 bg-white overflow-hidden">
          <ResultsPanel response={response} />
        </div>
      </div>
    </div>
  );
}
