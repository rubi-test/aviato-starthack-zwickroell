import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import ChatScreen from "./screens/ChatScreen";
import ExploreScreen from "./screens/ExploreScreen";
import Sidebar from "./components/Sidebar";
import { ToastProvider } from "./components/Toast";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [initialMessage, setInitialMessage] = useState("");
  const [chatKey, setChatKey] = useState(0);

  const navigateToChat = (message) => {
    setInitialMessage(message);
    setChatKey((k) => k + 1); // force remount so new message is sent
    setScreen("chat");
  };

  const navigateHome = () => {
    setScreen("home");
  };

  const handleScreenChange = (s) => {
    setScreen(s);
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar onNavigate={navigateToChat} onScreenChange={handleScreenChange} currentScreen={screen} />
        <div className="flex-1 min-w-0">
          {screen === "chat" ? (
            <ChatScreen key={chatKey} initialMessage={initialMessage} onBack={navigateHome} />
          ) : screen === "explore" ? (
            <ExploreScreen onBack={navigateHome} />
          ) : (
            <HomeScreen onNavigateToChat={navigateToChat} />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
