const PROMPTS = [
  "Summarize all properties for FancyPlast 42",
  "Show all tests for customer Megaplant",
  "Compare Z05 and Z20 machine results",
  "Is Hostacomp G2 tensile strength degrading?",
  "List Charpy tests by MasterOfDesaster",
  "Will FancyPlast 42 tensile modulus violate 10 MPa?",
];

export default function StarterPrompts({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="text-xs px-3 py-2 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-blue-500/40 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-mono"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
