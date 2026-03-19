import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

export async function fetchDashboard() {
  const { data } = await api.get("/api/dashboard");
  return data;
}

export async function sendChatMessage(message, history = [], context = {}) {
  const { data } = await api.post("/api/chat", { message, history, context });
  return data;
}
