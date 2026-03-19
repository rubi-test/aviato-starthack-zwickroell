import { useState, useEffect, useCallback } from "react";
import HomeScreen from "./screens/HomeScreen";
import ChatScreen from "./screens/ChatScreen";
import ExploreScreen from "./screens/ExploreScreen";
import GraphBuilderScreen from "./screens/GraphBuilderScreen";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { ToastProvider } from "./components/Toast";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [initialMessage, setInitialMessage] = useState("");
  const [chatKey, setChatKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const navigateToChat = useCallback((message) => {
    setInitialMessage(message);
    setChatKey((k) => k + 1);
    setScreen("chat");
  }, []);

  const navigateHome = () => {
    setScreen("home");
  };

  const handleScreenChange = (s) => {
    setScreen(s);
  };

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar onNavigate={navigateToChat} onScreenChange={handleScreenChange} currentScreen={screen} />
        <div className="flex-1 min-w-0">
          <div className="screen-enter" key={screen}>
            {screen === "chat" ? (
              <ChatScreen key={chatKey} initialMessage={initialMessage} onBack={navigateHome} />
            ) : screen === "explore" ? (
              <ExploreScreen onBack={navigateHome} />
            ) : screen === "graph-builder" ? (
              <GraphBuilderScreen onBack={navigateHome} />
            ) : (
              <HomeScreen onNavigateToChat={navigateToChat} />
            )}
          </div>
        </div>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={(msg) => { setPaletteOpen(false); navigateToChat(msg); }}
          onScreenChange={(s) => { setPaletteOpen(false); handleScreenChange(s); }}
        />
        <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </ToastProvider>
  );
}
