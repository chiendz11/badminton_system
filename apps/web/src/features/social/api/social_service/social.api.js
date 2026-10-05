import axiosInstance from "../../../../shared/api/http.js";

// 1. Search for Friends
export const searchFriends = async (keyword) => {
  try {
    // Matches: router.get("/social/search-friends"...)
    const response = await axiosInstance.get(
      `/api/social/search-friends?keyword=${keyword}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error searching friends:", error);
    throw error;
  }
};

// 2. Get My Friends List
export const getMyFriends = async () => {
  try {
    // Matches: router.get("/social/my-friends"...)
    const response = await axiosInstance.get("/api/social/my-friends");
    return response.data;
  } catch (error) {
    console.error("Error fetching friends list:", error);
    throw error;
  }
};

// 3. Get Pending Requests
export const getPendingRequests = async () => {
  try {
    // Matches: router.get("/social/pending-requests"...)
    const response = await axiosInstance.get("/api/social/pending-requests");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    throw error;
  }
};

// 4. Send Friend Request
export const sendFriendRequest = async (friendId) => {
  try {
    // Matches: router.post("/social/send-request"...)
    const response = await axiosInstance.post("/api/social/send-request", {
      friendId,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

// 5. Accept Friend Request
export const acceptFriendRequest = async (friendId) => {
  try {
    // Matches: router.post("/social/accept-request"...)
    const response = await axiosInstance.post("/api/social/accept-request", {
      friendId,
    });
    return response.data;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// 6. Decline Friend Request
export const declineFriendRequest = async (friendId) => {
  try {
    // Matches: router.post("/social/decline-request"...)
    const response = await axiosInstance.post("/api/social/decline-request", {
      friendId,
    });
    return response.data;
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
};

// 7. Remove Friend
export const removeFriend = async (friendId) => {
  try {
    // Matches: router.delete("/social/remove-friend"...)
    // ⚠️ CRITICAL: Axios DELETE requires body to be in 'data' key
    const response = await axiosInstance.delete("/api/social/remove-friend", {
      data: { friendId },
    });
    return response.data;
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

export const getConversations = async () => {
  try {
    const res = await axiosInstance.get("/api/social/conversations");
    return res.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getConversationById = async (friendId) => {
  try {
    const res = await axiosInstance.get(
      "/api/social/conversations?friendId=" + friendId,
    );
    return res.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
