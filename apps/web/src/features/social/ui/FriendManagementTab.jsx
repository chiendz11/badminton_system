import React, { useState, useCallback, useEffect } from "react";
import { UserCheck, UserX, MessageCircle, X, Check } from "lucide-react";
// Reuse your CSS file if needed, or keep using inline styles as requested
import "../../../shared/styles/FriendsTab.css";

// Import API services
import {
  getMyFriends,
  getPendingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "../api/social_service/social.api.js";

// Configuration
const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

const FriendManagementTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("list"); // 'list' | 'requests'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeSubTab === "list") {
        const data = await getMyFriends();
        setFriends(data);
      } else {
        const data = await getPendingRequests();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSubTab]);

  // Fetch whenever the tab changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 2. ACTIONS ---

  const handleUnfriend = async (friendId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) return;

    // Optimistic Update
    setFriends((prev) => prev.filter((f) => f.userId !== friendId));

    try {
      await removeFriend(friendId);
    } catch (error) {
      alert("Lỗi khi hủy kết bạn");
      fetchData(); // Revert on error
    }
  };

  const handleAccept = async (requestId) => {
    // Optimistic Update
    setRequests((prev) => prev.filter((r) => r.userId !== requestId));

    try {
      await acceptFriendRequest(requestId);
      // Optional: Refresh friends list count implicitly or wait for tab switch
    } catch (error) {
      alert("Lỗi khi chấp nhận kết bạn");
      fetchData();
    }
  };

  const handleReject = async (requestId) => {
    // Optimistic Update
    setRequests((prev) => prev.filter((r) => r.userId !== requestId));

    try {
      await declineFriendRequest(requestId);
    } catch (error) {
      alert("Lỗi khi từ chối");
      fetchData();
    }
  };

  return (
    <div
      className="friend-manage-container"
      style={{
        background: "white",
        borderRadius: "8px",
        minHeight: "500px",
        overflow: "hidden",
      }}
    >
      {/* SUB TABS HEADER */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        <button
          onClick={() => setActiveSubTab("list")}
          style={{
            flex: 1,
            padding: "15px",
            background: activeSubTab === "list" ? "#f0f8ff" : "white",
            border: "none",
            borderBottom:
              activeSubTab === "list" ? "2px solid #0084ff" : "none",
            fontWeight: "bold",
            color: activeSubTab === "list" ? "#0084ff" : "#555",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Danh sách bạn bè ({friends.length})
        </button>
        <button
          onClick={() => setActiveSubTab("requests")}
          style={{
            flex: 1,
            padding: "15px",
            background: activeSubTab === "requests" ? "#f0f8ff" : "white",
            border: "none",
            borderBottom:
              activeSubTab === "requests" ? "2px solid #0084ff" : "none",
            fontWeight: "bold",
            color: activeSubTab === "requests" ? "#0084ff" : "#555",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Lời mời kết bạn
          {requests.length > 0 && (
            <span
              style={{
                background: "red",
                color: "white",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "11px",
                marginLeft: "8px",
              }}
            >
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* BODY CONTENT */}
      <div style={{ padding: "20px" }}>
        {isLoading ? (
          <p style={{ textAlign: "center", color: "#666", marginTop: "40px" }}>
            Đang tải dữ liệu...
          </p>
        ) : (
          <>
            {/* === DANH SÁCH BẠN BÈ === */}
            {activeSubTab === "list" && (
              <div
                className="friends-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "15px",
                }}
              >
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <div
                      key={friend.userId}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: "8px",
                        padding: "15px",
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        background: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      }}
                    >
                      <img
                        src={
                          friend.avataruserId
                            ? friend.avatar_url
                            : DEFAULT_AVATAR
                        }
                        alt={friend.name}
                        onError={(e) => (e.target.src = DEFAULT_AVATAR)}
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #eee",
                        }}
                      />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <h4
                          style={{
                            margin: "0 0 5px 0",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {friend.name}
                        </h4>
                        <span style={{ fontSize: "13px", color: "#888" }}>
                          @{friend.username}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {/* Nút nhắn tin (Placeholder) */}
                        <button
                          style={{
                            border: "none",
                            background: "#eef5ff",
                            color: "#0084ff",
                            padding: "8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MessageCircle size={18} />
                        </button>
                        {/* Nút hủy kết bạn */}
                        <button
                          onClick={() => handleUnfriend(friend.userId)}
                          style={{
                            border: "none",
                            background: "#ffebeb",
                            color: "#e74c3c",
                            padding: "8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Hủy kết bạn"
                        >
                          <UserX size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      textAlign: "center",
                      marginTop: "50px",
                      color: "#888",
                    }}
                  >
                    <p>Chưa có bạn bè nào.</p>
                  </div>
                )}
              </div>
            )}

            {/* === LỜI MỜI KẾT BẠN === */}
            {activeSubTab === "requests" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <div
                      key={req.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f5f5f5",
                        paddingBottom: "15px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "15px",
                        }}
                      >
                        <img
                          src={
                            req.avataruserId ? req.avatar_url : DEFAULT_AVATAR
                          }
                          alt={req.name}
                          onError={(e) => (e.target.src = DEFAULT_AVATAR)}
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <h4 style={{ margin: "0 0 5px 0" }}>{req.name}</h4>
                          <span style={{ fontSize: "13px", color: "#888" }}>
                            @{req.username}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleAccept(req.userId)}
                          style={{
                            background: "#0084ff",
                            color: "white",
                            border: "none",
                            padding: "8px 20px",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Check size={16} /> Đồng ý
                        </button>
                        <button
                          onClick={() => handleReject(req.userId)}
                          style={{
                            background: "#f0f2f5",
                            color: "#333",
                            border: "none",
                            padding: "8px 20px",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <X size={16} /> Xóa
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "50px",
                      color: "#888",
                    }}
                  >
                    <p>Không có lời mời kết bạn nào.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendManagementTab;
