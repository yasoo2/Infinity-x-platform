import React, { useState } from "react";
import Chatbot from "react-chatbotify";
import "react-chatbotify/build/main.css";
import axios from "axios";

export default function ChatPanel() {
  const [apiUrl] = useState(
    process.env.REACT_APP_API_URL || "http://localhost:10000/api/agent/execute"
  );

  async function handleMessage(message) {
    try {
      const response = await axios.post(apiUrl, {
        input: message,
        userId: "owner",
      });
      return response.data.output;
    } catch (err) {
      return "خطأ: " + err.message;
    }
  }

  return (
    <div style={{ backgroundColor: "#000", color: "#fff", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <Chatbot
        config={{
          botName: "InfinityX AI Architect",
          initialMessages: [
            { text: "أنا InfinityX. اسألني عن الخطة التقنية أو تطوير النظام." },
          ],
          theme: { primaryColor: "#d4af37" },
        }}
        messageParser={handleMessage}
      />
    </div>
  );
}
