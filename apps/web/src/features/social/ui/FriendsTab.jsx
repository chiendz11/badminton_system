import React, { useState, useCallback, useEffect, useRef } from "react";
import { Search, Send, MoreVertical, Phone, Video } from "lucide-react";
import { io } from "socket.io-client"; // Import Socket.io
import "../../../shared/styles/FriendsTab.css";

import {
  getConversations,
  getConversationById,
} from "../api/social_service/social.api.js";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

// ⚠️ Connect directly to your Social Service Port (e.g., 3001) or configure Gateway Proxy
// If your Social Service runs on localhost:3002, put that here.
const SOCKET_URL =
  import.meta.env.VITE_SOCIAL_SOCKET_URL || window.location.origin;

const FriendsTab = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [socket, setSocket] = useState(null); // Store socket instance

  const chatContainerRef = useRef(null);

  // --- 1. Initialize Socket Connection ---
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // --- 2. Fetch Conversations (Sidebar) ---
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchConversations();
  }, [currentUser]);

  const getFriendInfo = useCallback(
    (conversation) => {
      if (!conversation?.memberDetails || !currentUser) return {};
      return (
        conversation.memberDetails.find(
          (m) => m.userId !== currentUser.userId,
        ) || {}
      );
    },
    [currentUser],
  );

  // --- 3. Handle Room Joining & Real-time Listening ---
  useEffect(() => {
    if (!socket || !selectedConv) return;

    const roomId = selectedConv._id;

    // A. Define logic to Join Room (Reusable for reconnection)
    const joinRoom = () => {
      console.log(`(Re)Joining room: ${roomId}`);
      socket.emit("joinConversation", roomId);
    };

    // B. Initial Join
    joinRoom();

    // C. Load initial history via API
    const fetchHistory = async () => {
      try {
        const friend = getFriendInfo(selectedConv);
        // Ensure you are fetching by CONVERSATION ID or USER ID correctly depending on your API
        const data = await getConversationById(friend.userId);
        if (data?.messages) setMessages(data.messages);
      } catch (e) {
        console.error(e);
      }
    };
    fetchHistory();

    // D. Listen for NEW messages
    const handleNewMessage = (newMsg) => {
      // Double check the message belongs to this room
      if (newMsg.conversationId === roomId) {
        setMessages((prev) => [...prev, newMsg]);
      }
    };
    socket.on("newMessage", handleNewMessage);

    // E. CRITICAL FIX: Re-join if connection drops and restores
    socket.on("connect", joinRoom);

    // Cleanup
    return () => {
      socket.emit("leaveConversation", roomId);
      socket.off("newMessage", handleNewMessage);
      socket.off("connect", joinRoom); // Stop listening to connect on cleanup
    };
  }, [selectedConv, socket, getFriendInfo]);

  // --- 4. Send Message via Socket ---
  const handleSend = () => {
    if (!inputVal.trim() || !selectedConv || !socket) return;

    // Emit 'sendMessage' event to backend
    socket.emit("sendMessage", {
      senderId: currentUser.userId,
      conversationId: selectedConv._id,
      content: inputVal,
    });

    setInputVal("");
    // Note: We don't manually setMessages here anymore.
    // We wait for the server to emit 'newMessage' back to us.
  };

  // ... (Keep your getFriendInfo, formatTime, scroll logic, and return JSX the same) ...
  // (Helpers omitted for brevity, use previous code)

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  // Logic to auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    // ... Copy your JSX exactly as before, just ensure handleSend is used ...
    <div className="friends-tab-container">
      {/* ... Sidebar ... */}
      <div className="friends-sidebar">
        {/* ... Same as before ... */}
        <div className="friends-list">
          {conversations.map((conv) => {
            const friend = getFriendInfo(conv);
            return (
              <div
                key={conv._id}
                onClick={() => setSelectedConv(conv)}
                className={`friend-item ${selectedConv?._id === conv._id ? "active" : ""}`}
              >
                <img
                  src={friend.avatar_url || DEFAULT_AVATAR}
                  onError={(e) => (e.target.src = DEFAULT_AVATAR)}
                />
                <div className="friend-info">
                  <div className="friend-name">{friend.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ... Chat Area ... */}
      <div className="chat-area">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <h4>{getFriendInfo(selectedConv).name}</h4>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`msg-bubble ${msg.senderId === currentUser.userId ? "me" : "them"}`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="chat-input-wrapper">
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button onClick={handleSend}>
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">Select a chat</div>
        )}
      </div>
    </div>
  );
};

export default FriendsTab;
