export const ROLES = ["user", "center_manager", "super_admin"] as const;
export type Role = (typeof ROLES)[number];
export interface Actor {
  userId: string;
  role: Role;
  name: string;
  loyaltyPoints?: number;
}
