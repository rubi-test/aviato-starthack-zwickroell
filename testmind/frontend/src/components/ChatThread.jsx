import { useState, useEffect, useRef } from "react";

/** Extract the first plain-language summary line from the LLM response. */
function summarize(text) {
  if (!text) return "";
  // The LLM is prompted to put a plain summary on the first line, then a blank line
  const firstLine = text.split("\n")[0].replace(/[#*`_]/g, "").trim();
  if (firstLine.length > 0 && firstLine.length <= 200) return firstLine;
  // Fallback: first sentence
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

export default function ChatThread({ messages, isLoading, onSend, disabled, onBookmark, savedQueries = [] }) {
  const [input, setInput] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Step timeline progression during loading
  useEffect(() => {
    if (!isLoading) {
      setActiveStep(0);
      return;
    }
    setActiveStep(0);
    const timers = ANALYSIS_STEPS.map((_, i) =>
      i === 0 ? null : setTimeout(() => setActiveStep(i), i * 900)
    );
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || disabled || isLoading) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-8">
            Ask a question to get started
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
          >
            <div className="flex flex-col items-end gap-1 max-w-[88%]">
              <div
                className={`w-full px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div>
                    <p>{summarize(msg.content)}</p>
                    <p className="text-xs text-blue-500 mt-1.5">See full details in the results panel →</p>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {/* Bookmark button on user messages */}
              {msg.role === "user" && onBookmark && (
                <button
                  onClick={() => onBookmark(msg.content)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                    savedQueries.includes(msg.content)
                      ? "text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  title={savedQueries.includes(msg.content) ? "Bookmarked" : "Bookmark this query"}
                >
                  <svg className="w-3 h-3" fill={savedQueries.includes(msg.content) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {savedQueries.includes(msg.content) ? "Saved" : "Save"}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm text-sm w-64">
              <div className="space-y-1.5">
                {ANALYSIS_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      i <= activeStep ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                    }`}
                  >
                    {i < activeStep ? (
                      <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i === activeStep ? (
                      <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${i < activeStep ? "text-gray-400" : i === activeStep ? "text-blue-600 font-medium" : "text-gray-300"}`}>
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
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a follow-up question…"
            disabled={disabled || isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={disabled || isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
