const PROMPTS = [
  "Summarize all properties for Steel",
  "Show all tensile tests",
  "Compare Steel and FEP max force",
  "What standards are used in our tests?",
  "Show compression test results",
  "List all materials in the database",
];

export default function StarterPrompts({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="text-xs px-3 py-2 rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 hover:border-blue-400 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-mono"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
