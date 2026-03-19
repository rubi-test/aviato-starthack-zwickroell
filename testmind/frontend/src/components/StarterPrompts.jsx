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
          className="text-sm px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 text-gray-600 transition-colors cursor-pointer"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
