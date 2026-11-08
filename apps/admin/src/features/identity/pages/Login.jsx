import { useContext, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { login } from "../api/auth.js";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";

export default function Login() {
  const { admin, loading, updateSession } = useContext(SessionContext);
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !from.startsWith("/login")
      ? from
      : "/dashboard";

  if (loading) return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if (admin) return <Navigate to={destination} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      updateSession(
        await login({ email: email.trim().toLowerCase(), password }),
      );
      setPassword("");
    } catch (failure) {
      setError(
        failure.response?.status === 401
          ? "Email hoặc mật khẩu không đúng."
          : failure.response?.status === 429
            ? "Quá nhiều lần đăng nhập. Vui lòng thử lại sau."
            : failure.response
              ? "Không thể đăng nhập. Vui lòng kiểm tra thông tin hoặc thử lại sau."
              : failure.message ===
                  "Tài khoản không có quyền quản trị hoặc phiên không hợp lệ."
                ? failure.message
                : "Không kết nối được máy chủ. Vui lòng thử lại sau.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
        <p className="text-emerald-700 font-bold tracking-widest mb-2">
          ĐẶT SÂN 247 · ADMIN
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Đăng nhập quản trị
        </h1>
        <p className="text-gray-600 mb-6">
          Dành cho quản lý hệ thống và quản lý trung tâm.
        </p>
        <form onSubmit={handleSubmit} aria-busy={busy} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block font-medium mb-1">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              autoFocus
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block font-medium mb-1">
              Mật khẩu
            </label>
            <div className="flex gap-2">
              <input
                id="admin-password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-3"
              />
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-pressed={visible}
                disabled={busy}
                className="text-emerald-700 text-sm"
              >
                {visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-600 text-white rounded-lg py-3 font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
