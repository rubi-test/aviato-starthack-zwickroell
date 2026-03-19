import { useState, useEffect } from "react";

const MATERIALS = [
  "FancyPlast 42",
  "UltraPlast 99",
  "Hostacomp G2",
  "Stardust",
  "FancyPlast 84",
  "NovaTex 10",
];

const SAMPLE_QUERIES = [
  "Summarize all properties for FancyPlast 42",
  "Show all tests for customer Megaplant",
  "Compare Z05 and Z20 machine results",
  "Is Hostacomp G2 tensile strength degrading?",
  "List Charpy tests by MasterOfDesaster",
  "Will FancyPlast 42 tensile modulus violate 10 MPa?",
];

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("tm_query_history") || "[]");
  } catch {
    return [];
  }
}

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem("tm_saved_templates") || "[]");
  } catch {
    return [];
  }
}

export default function Sidebar({ onNavigate, onScreenChange, currentScreen }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("tm_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [openSection, setOpenSection] = useState("materials");
  const [history, setHistory] = useState(getHistory);
  const [saved, setSaved] = useState(getSaved);

  // Refresh history/saved when sidebar opens
  useEffect(() => {
    if (!collapsed) {
      setHistory(getHistory());
      setSaved(getSaved());
    }
  }, [collapsed]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("tm_sidebar_collapsed", String(next));
  };

  const toggleSection = (s) => setOpenSection(openSection === s ? null : s);

  const handleNav = (msg) => {
    if (onNavigate) onNavigate(msg);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center bg-gray-900 border-r border-gray-700 w-12 min-h-screen py-3 gap-4">
        <button
          onClick={toggleCollapse}
          className="text-gray-400 hover:text-white p-1 rounded"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={() => onScreenChange && onScreenChange("explore")} title="Explore Data" className={`p-1 ${currentScreen === "explore" ? "text-blue-400" : "text-gray-400 hover:text-white"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        <button onClick={() => { setCollapsed(false); setOpenSection("materials"); }} title="Materials" className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        <button onClick={() => { setCollapsed(false); setOpenSection("history"); }} title="History" className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button onClick={() => { setCollapsed(false); setOpenSection("saved"); }} title="Saved" className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-900 border-r border-gray-700 w-56 min-h-screen py-3 overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-4">
        <span className="text-white font-semibold text-sm tracking-wide">Navigator</span>
        <button
          onClick={toggleCollapse}
          className="text-gray-400 hover:text-white p-1 rounded"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Explore Data button */}
      <button
        onClick={() => onScreenChange && onScreenChange("explore")}
        className={`flex items-center gap-2 mx-2 mb-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          currentScreen === "explore"
            ? "bg-blue-600 text-white"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Explore Data
      </button>

      {/* Materials */}
      <SidebarSection
        icon={<MaterialIcon />}
        label="Materials"
        open={openSection === "materials"}
        onToggle={() => toggleSection("materials")}
      >
        {MATERIALS.map((mat) => (
          <SidebarItem
            key={mat}
            label={mat}
            onClick={() => handleNav(`Summarize all properties for ${mat}`)}
          />
        ))}
      </SidebarSection>

      {/* Quick Links */}
      <SidebarSection
        icon={<ZapIcon />}
        label="Sample Queries"
        open={openSection === "quick"}
        onToggle={() => toggleSection("quick")}
      >
        {SAMPLE_QUERIES.map((q) => (
          <SidebarItem key={q} label={q} onClick={() => handleNav(q)} truncate />
        ))}
      </SidebarSection>

      {/* Recent History */}
      <SidebarSection
        icon={<ClockIcon />}
        label={`Recent (${history.length})`}
        open={openSection === "history"}
        onToggle={() => toggleSection("history")}
      >
        {history.length === 0 ? (
          <p className="text-gray-500 text-xs px-2 py-1">No history yet</p>
        ) : (
          history.map((q, i) => (
            <SidebarItem key={i} label={q} onClick={() => handleNav(q)} truncate />
          ))
        )}
      </SidebarSection>

      {/* Saved Templates */}
      <SidebarSection
        icon={<BookmarkIcon />}
        label={`Saved (${saved.length})`}
        open={openSection === "saved"}
        onToggle={() => toggleSection("saved")}
      >
        {saved.length === 0 ? (
          <p className="text-gray-500 text-xs px-2 py-1">Bookmark queries from chat</p>
        ) : (
          saved.map((q, i) => (
            <SidebarItem key={i} label={q} onClick={() => handleNav(q)} truncate />
          ))
        )}
      </SidebarSection>
    </div>
  );
}

function SidebarSection({ icon, label, open, onToggle, children }) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-sm text-xs font-medium uppercase tracking-wider"
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="mt-1 mb-1">
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ label, onClick, truncate }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded text-xs ${truncate ? "truncate" : ""}`}
      title={label}
    >
      {label}
    </button>
  );
}

function MaterialIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}
