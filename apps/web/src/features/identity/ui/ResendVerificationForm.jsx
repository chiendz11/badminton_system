import { useEffect, useId, useRef, useState } from "react";
import { isValidEmailAddress, resendVerificationEmail } from "../api/auth.js";

const cooldownMs = 60_000;

export default function ResendVerificationForm({ email }) {
  const id = useId();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [inputEmail, setInputEmail] = useState("");
  const [now, setNow] = useState(Date.now);
  const [deadlines, setDeadlines] = useState(() =>
    new Map(email ? [[email.toLowerCase(), now + cooldownMs]] : []),
  );
  const address = (email ?? inputEmail).toLowerCase();
  const resendAt = deadlines.get(address) ?? 0;
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const coolingDown = secondsLeft > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [coolingDown]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current || resendAt > Date.now()) return;

    if (!isValidEmailAddress(address)) {
      setFeedback({ error: true, message: "Vui lòng nhập email đăng ký hợp lệ, không chứa khoảng trắng." });
      return;
    }

    submitting.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await resendVerificationEmail(address);
      const acceptedAt = Date.now();
      setNow(acceptedAt);
      setDeadlines((previous) => new Map(previous).set(address, acceptedAt + cooldownMs));
      setFeedback({ error: false, message: "Nếu tài khoản đang chờ xác minh, hãy kiểm tra hộp thư." });
    } catch (error) {
      const status = error?.response?.status;
      const message = status === 400
        ? "Vui lòng kiểm tra lại email đăng ký."
        : status === 429
          ? "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại."
          : "Chưa gửi được yêu cầu. Vui lòng thử lại sau.";
      setFeedback({ error: true, message });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} onSubmit={handleSubmit} className="mt-5 space-y-3">
      {email === undefined && (
        <div>
          <label htmlFor={id} className="mb-1 block text-sm font-semibold">Email đăng ký</label>
          <input
            id={id}
            name="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={inputEmail}
            onChange={(event) => {
              setInputEmail(event.target.value);
              setNow(Date.now());
              setFeedback(null);
            }}
            required
            disabled={busy}
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          />
        </div>
      )}
      {coolingDown && (
        <p id={id + "-hint"} className="mb-0 text-sm text-slate-600">
          Có thể gửi lại sau {secondsLeft} giây.
        </p>
      )}
      <button
        type="submit"
        disabled={busy || coolingDown}
        aria-describedby={coolingDown ? id + "-hint" : undefined}
        className="min-h-12 w-full rounded-xl border border-emerald-700 px-4 py-3 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Đang gửi yêu cầu…" : "Gửi lại thư xác minh"}
      </button>
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={feedback.error ? "mb-0 text-sm text-red-700" : "mb-0 text-sm text-emerald-800"}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
