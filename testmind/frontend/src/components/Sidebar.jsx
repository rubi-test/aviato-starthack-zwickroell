import { useState, useEffect, useRef } from "react";

const TEST_TYPES = [
  { type: "tensile", count: "20,884" },
  { type: "compression", count: "8,465" },
  { type: "flexure", count: "1,750" },
];


function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("tm_query_history") || "[]");
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
  const [openSection, setOpenSection] = useState("test_types");
  const [history, setHistory] = useState(getHistory);

  // Refresh history when sidebar opens
  useEffect(() => {
    if (!collapsed) {
      setHistory(getHistory());
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
      <div className="flex flex-col items-center bg-white border-r border-slate-200 w-12 min-h-screen py-3 gap-3">
        <button
          onClick={toggleCollapse}
          className="text-slate-500 hover:text-slate-900 p-1 rounded"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="w-6 h-px bg-slate-200 my-1" />
        <button onClick={() => onScreenChange && onScreenChange("home")} title="Home" className={`p-1.5 rounded-lg ${currentScreen === "home" ? "bg-slate-50 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button onClick={() => onScreenChange && onScreenChange("explore")} title="Explore Data" className={`p-1.5 rounded-lg ${currentScreen === "explore" ? "bg-slate-50 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        <button onClick={() => onScreenChange && onScreenChange("graph-builder")} title="Graph Builder" className={`p-1.5 rounded-lg ${currentScreen === "graph-builder" ? "bg-slate-50 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </button>
        <div className="w-6 h-px bg-slate-200 my-1" />
        <button onClick={() => { setCollapsed(false); setOpenSection("test_types"); }} title="Test Types" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        <button onClick={() => { setCollapsed(false); setOpenSection("history"); }} title="History" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white border-r border-slate-200 w-56 min-h-screen py-3 overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-4">
        <span className="text-slate-900 font-semibold text-sm tracking-wide">Navigator</span>
        <button
          onClick={toggleCollapse}
          className="text-slate-500 hover:text-slate-900 p-1 rounded"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation buttons */}
      <div className="mx-2 mb-3 space-y-1">
        <button
          onClick={() => onScreenChange && onScreenChange("home")}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentScreen === "home"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </button>
        <button
          onClick={() => onScreenChange && onScreenChange("explore")}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentScreen === "explore"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Explore Data
        </button>
        <button
          onClick={() => onScreenChange && onScreenChange("graph-builder")}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentScreen === "graph-builder"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          Graph Builder
        </button>
      </div>

      {/* Test Types */}
      <SidebarSection
        icon={<TestTypeIcon />}
        label="Test Types"
        open={openSection === "test_types"}
        onToggle={() => toggleSection("test_types")}
      >
        {TEST_TYPES.map((t) => (
          <SidebarItem key={t.type} label={`${t.type.toUpperCase()} — ${t.count}`} onClick={() => handleNav(`Show all ${t.type} tests`)} truncate />
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
          <p className="text-slate-400 text-xs px-2 py-1">No history yet</p>
        ) : (
          history.map((q, i) => (
            <SidebarItem key={i} label={q} onClick={() => handleNav(q)} truncate />
          ))
        )}
      </SidebarSection>

      {/* Keyboard shortcut footer */}
      <div className="mt-auto px-3 py-3 border-t border-slate-200">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <kbd className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-mono text-slate-500">⌘K</kbd>
          <span>Quick search</span>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ icon, label, open, onToggle, children }) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-sm text-xs font-medium uppercase tracking-wider"
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
      className={`w-full text-left px-4 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded text-xs ${truncate ? "truncate" : ""}`}
      title={label}
    >
      {label}
    </button>
  );
}

function TestTypeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

