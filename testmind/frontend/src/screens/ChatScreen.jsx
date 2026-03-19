export default function ChatScreen({ initialMessage, onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <button onClick={onBack} className="text-blue-600 mb-4">
        &larr; Back
      </button>
      <h1 className="text-2xl font-bold">Chat</h1>
      <p className="text-gray-500">Chat — placeholder</p>
    </div>
  );
}
