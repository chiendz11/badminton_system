import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { getProfile, updateProfile } from "../api/profile.js";

export default function ProfilePage() {
  const {
    user,
    loading: sessionLoading,
    setUser,
  } = useContext(SessionContext) || {};
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const userId = user?.userId;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getProfile()
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch(() => {
        if (active) setError("Không tải được hồ sơ. Vui lòng thử lại.");
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await updateProfile({
        name: form.get("name").trim(),
        phone: form.get("phone").trim() || null,
      });
      setProfile(next);
      setUser({ ...user, name: next.name, phone: next.phone });
      setMessage("Đã lưu hồ sơ.");
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          "Không lưu được hồ sơ. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sessionLoading)
    return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if (!user)
    return (
      <main className="mx-auto max-w-xl p-6">
        <p>Vui lòng đăng nhập để xem hồ sơ.</p>
        <Link to="/">Về trang chủ để đăng nhập</Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-xl p-6">
      <Link to="/">Trang chủ</Link>
      <h1 className="my-6 text-2xl font-semibold">Hồ sơ cá nhân</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!profile && !error && <p role="status">Đang tải hồ sơ…</p>}
      {profile && (
        <form onSubmit={save} className="grid gap-4">
          <p>Email — {profile.email}</p>
          <label className="grid gap-1">
            Họ và tên
            <input
              className="rounded border p-3"
              name="name"
              required
              maxLength={150}
              defaultValue={profile.name}
              autoComplete="name"
            />
          </label>
          <label className="grid gap-1">
            Số điện thoại
            <input
              className="rounded border p-3"
              name="phone"
              type="tel"
              maxLength={32}
              defaultValue={profile.phone || ""}
              autoComplete="tel"
            />
          </label>
          <button
            className="rounded bg-emerald-700 p-3 text-white"
            disabled={busy}
          >
            {busy ? "Đang lưu…" : "Lưu hồ sơ"}
          </button>
        </form>
      )}
    </main>
  );
}
