export * from "../../../shared/api/auth.js";

export function isValidEmailAddress(email) {
  return email.length <= 254 && !/\s/.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
