/**
 * Đây là "Nguồn Chân lý" (Source of Truth) cho tất cả các chuỗi Role
 * được trả về từ Backend (AuthService).
 * * Chúng ta dùng file này để tránh lỗi gõ nhầm (typo) khi so sánh.
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  CENTER_MANAGER: "center_manager",
  USER: "user",
  // (Các Role này phải khớp 100% với 'enum Role' trong Prisma)
};
