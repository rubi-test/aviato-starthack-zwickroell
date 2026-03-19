import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import ChatScreen from "./screens/ChatScreen";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [initialMessage, setInitialMessage] = useState("");

  const navigateToChat = (message) => {
    setInitialMessage(message);
    setScreen("chat");
  };

  const navigateHome = () => {
    setScreen("home");
  };

  if (screen === "chat") {
    return (
      <ChatScreen initialMessage={initialMessage} onBack={navigateHome} />
    );
  }

  return <HomeScreen onNavigateToChat={navigateToChat} />;
}
