import React, { useState, useEffect } from "react";
import { Search, UserPlus, Check, X, UserCheck } from "lucide-react";
import "../../../shared/styles/FriendsTab.css";

// Import your API functions
import {
  searchFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "../api/social_service/social.api.js";

// --- CONFIGURATION ---
// Your specific default avatar link
const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

const STATUS = {
  FRIENDS: "friends",
  REQUESTED: "requested",
  BEING_REQUESTED: "being_requested",
  NOT_FRIEND: "not_friend",
};

const FindFriendsTab = () => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!keyword.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchFriends(keyword);
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  // 2. Button Action Handlers
  const handleSendRequest = async (user) => {
    updateUserStatus(user.userId, STATUS.REQUESTED);
    try {
      await sendFriendRequest(user.userId);
    } catch (error) {
      updateUserStatus(user.userId, STATUS.NOT_FRIEND);
      alert("Could not send request");
    }
  };

  const handleAccept = async (user) => {
    updateUserStatus(user.userId, STATUS.FRIENDS);
    try {
      await acceptFriendRequest(user.userId);
    } catch (error) {
      updateUserStatus(user.userId, STATUS.BEING_REQUESTED);
    }
  };

  const handleDecline = async (user) => {
    updateUserStatus(user.userId, STATUS.NOT_FRIEND);
    try {
      await declineFriendRequest(user.userId);
    } catch (error) {
      updateUserStatus(user.userId, STATUS.BEING_REQUESTED);
    }
  };

  const handleCancelOrUnfriend = async (user, currentStatus) => {
    const confirmMsg =
      currentStatus === STATUS.FRIENDS
        ? "Bạn có chắc muốn hủy kết bạn?"
        : "Hủy lời mời kết bạn?";

    if (!window.confirm(confirmMsg)) return;

    updateUserStatus(user.userId, STATUS.NOT_FRIEND);
    try {
      await removeFriend(user.userId);
    } catch (error) {
      updateUserStatus(user.userId, currentStatus);
    }
  };

  const updateUserStatus = (userId, newStatus) => {
    setResults((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, friendStatus: newStatus } : u,
      ),
    );
  };

  // 3. Logic to decide which button to show
  const renderActionButtons = (user) => {
    switch (user.friendStatus) {
      case STATUS.FRIENDS:
        return (
          <button
            className="btn-friend"
            onClick={() => handleCancelOrUnfriend(user, STATUS.FRIENDS)}
          >
            <UserCheck size={16} /> Bạn bè
          </button>
        );
      case STATUS.REQUESTED:
        return (
          <button
            className="btn-sent"
            onClick={() => handleCancelOrUnfriend(user, STATUS.REQUESTED)}
          >
            <Check size={16} /> Đã gửi
          </button>
        );
      case STATUS.BEING_REQUESTED:
        return (
          <div className="action-row">
            <button className="btn-accept" onClick={() => handleAccept(user)}>
              Chấp nhận
            </button>
            <button className="btn-decline" onClick={() => handleDecline(user)}>
              <X size={16} />
            </button>
          </div>
        );
      default:
        return (
          <button className="btn-add" onClick={() => handleSendRequest(user)}>
            <UserPlus size={16} /> Kết bạn
          </button>
        );
    }
  };

  return (
    <div className="find-friends-container">
      <div className="find-header">
        <h3>Tìm kiếm bạn bè</h3>
        <div className="big-search-bar">
          <Search className="icon" />
          <input
            placeholder="Nhập tên, email hoặc số điện thoại..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="find-results-grid">
        {isLoading && <p className="loading-text">Đang tìm kiếm...</p>}

        {!isLoading && results.length > 0
          ? results.map((user) => (
              <div key={user.userId} className="user-card">
                {/* --- UPDATED IMAGE LOGIC HERE --- */}
                <img
                  src={user.avataruserId ? user.avatar_url : DEFAULT_AVATAR}
                  alt={user.name}
                  onError={(e) => (e.target.src = DEFAULT_AVATAR)} // Fallback if url breaks
                />
                <div className="card-info">
                  <h4>{user.name}</h4>
                  <span className="user-username">@{user.username}</span>
                  <div className="card-actions">
                    {renderActionButtons(user)}
                  </div>
                </div>
              </div>
            ))
          : !isLoading &&
            keyword && (
              <p className="no-result">Không tìm thấy người dùng nào.</p>
            )}
      </div>
    </div>
  );
};

export default FindFriendsTab;
