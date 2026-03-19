import { useEffect } from "react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["Enter"], description: "Send message" },
  { keys: ["↑", "↓"], description: "Navigate autocomplete" },
  { keys: ["Tab"], description: "Fill autocomplete suggestion" },
  { keys: ["Esc"], description: "Close overlays / dismiss" },
  { keys: ["⌘", "?"], description: "Toggle this shortcuts panel" },
];

export default function KeyboardShortcuts({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs">
            Esc
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[10px] text-gray-400 text-center">
            Press <kbd className="bg-gray-100 border border-gray-200 rounded px-1 font-mono">⌘?</kbd> anywhere to toggle
          </p>
        </div>
      </div>
    </div>
  );
}
