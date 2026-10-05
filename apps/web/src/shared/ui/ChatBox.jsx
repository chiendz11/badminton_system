// src/components/ChatBox.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, ArrowLeft, Send } from "lucide-react";
import "../styles/chatbox.css";

// --- MOCK DATA BẠN BÈ (Giả lập trả về từ API) ---
const MOCK_FRIENDS_API = [
  {
    id: 101,
    name: "Bùi Anh Chiến",
    avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
    lastMessage: "Bạn: Tái sử dụng cái component này đi",
    time: "6 phút",
    unread: 0,
    online: true,
    type: "human",
  },
  {
    id: 102,
    name: "Minh Quânn",
    avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=2",
    lastMessage: "Bạn: mang tiếng vl",
    time: "37 phút",
    unread: 0,
    online: false,
    type: "human",
  },
];

// --- HẰNG SỐ BOT ---
const AI_CONVERSATION_DEFAULT = {
  id: "ai-assistant",
  name: "Trợ lý ảo AI",
  avatar: "https://cdn-icons-png.flaticon.com/512/8943/8943377.png",
  lastMessage: "Chào bạn, tôi là AI hỗ trợ đặt sân.",
  time: "Luôn sẵn sàng",
  unread: 0,
  online: true,
  type: "ai", // Quan trọng: Đánh dấu đây là AI
};

const ChatBox = ({ isOpen, onClose }) => {
  // State lưu danh sách hội thoại hiển thị
  const [conversations, setConversations] = useState([]);

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // 1. Fetch dữ liệu và GHIM AI LÊN ĐẦU
  useEffect(() => {
    // Giả lập gọi API lấy danh sách bạn bè
    const fetchConversations = async () => {
      // const response = await fetch('/api/conversations');
      // const friendList = await response.json();

      const friendList = MOCK_FRIENDS_API; // Dữ liệu giả

      // KỸ THUẬT GHIM: Tạo mảng mới với AI đứng đầu, sau đó rải (...) danh sách bạn bè vào sau
      const mergedList = [AI_CONVERSATION_DEFAULT, ...friendList];

      setConversations(mergedList);
    };

    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  // 2. Xử lý khi bấm vào một cuộc hội thoại
  const handleSelectChat = (conv) => {
    setActiveChat(conv);
    setMessages([]); // Reset tin nhắn cũ

    if (conv.type === "ai") {
      // Nếu là AI: Load tin nhắn chào mừng của AI
      setMessages([
        {
          id: 1,
          sender: "them",
          text: "Xin chào! Tôi là trợ lý ảo. Bạn cần tìm sân cầu lông ở đâu?",
        },
      ]);
    } else {
      // Nếu là Người: Gọi API lấy lịch sử chat cũ
      // fetch(`/api/messages/${conv.id}`)...
      // Ở đây mình giả lập:
      setMessages([
        { id: 1, sender: "them", text: `Hello, tôi là ${conv.name}` },
        { id: 2, sender: "me", text: "Chào bạn!" },
      ]);
    }
  };

  // ... (Phần logic gửi tin nhắn và render giữ nguyên)

  // Logic gửi tin nhắn (cần phân biệt gửi cho AI hay gửi cho Người)
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const newMsg = { id: Date.now(), sender: "me", text: inputValue };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");

    if (activeChat.type === "ai") {
      // GỌI API CHATBOT (Python/NestJS AI)
      // const res = await fetch('http://localhost:5001/api/chat', ...);

      // Giả lập AI trả lời sau 1s
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "them",
            text: "Đây là câu trả lời tự động từ AI.",
          },
        ]);
      }, 1000);
    } else {
      // GỌI API CHAT NGƯỜI (Socket.io)
      // socket.emit('send_message', ...);
      console.log(`Gửi tin nhắn tới user ID: ${activeChat.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="msg-widget-container">
      {/* HEADER */}
      <div className="msg-header">
        {activeChat ? (
          <div className="header-user-info">
            <button className="back-btn" onClick={() => setActiveChat(null)}>
              <ArrowLeft size={20} />
            </button>
            <div className="header-avatar">
              <img src={activeChat.avatar} alt="" />
              {activeChat.online && <span className="dot-online"></span>}
            </div>
            <span className="header-name">{activeChat.name}</span>
          </div>
        ) : (
          <span className="header-title">Đoạn chat</span>
        )}
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* BODY */}
      <div className="msg-body">
        {/* VIEW DANH SÁCH (Sử dụng state conversations đã gộp) */}
        {!activeChat && (
          <div className="conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${conv.type === "ai" ? "ai-item-highlight" : ""}`}
                onClick={() => handleSelectChat(conv)}
              >
                <div className="conv-avatar-wrapper">
                  <img src={conv.avatar} alt="" />
                  {conv.unread > 0 && <span className="unread-badge"></span>}
                </div>
                <div className="conv-info">
                  <div className="conv-name">{conv.name}</div>
                  <div className="conv-last-msg">
                    {conv.lastMessage} ·{" "}
                    <span className="time">{conv.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW CHAT */}
        {activeChat && (
          <div className="chat-window">
            <div className="messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-bubble ${msg.sender === "me" ? "me" : "them"}`}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Nhập tin nhắn..."
              />
              <button onClick={handleSendMessage}>
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
