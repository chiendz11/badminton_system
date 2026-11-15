import { useRef, useState } from "react";
import { CircleCheck, MailCheck, MailX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { verifyEmail } from "../api/auth.js";
import ResendVerificationForm from "../ui/ResendVerificationForm.jsx";

const buttonClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0c8040] px-5 py-3 font-semibold text-white no-underline hover:bg-emerald-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60";

function VerificationCard({ token }) {
  const [status, setStatus] = useState(token ? "ready" : "invalid");
  const submitting = useRef(false);
  const verified = status === "verified";
  const invalid = status === "invalid";
  const busy = status === "pending";

  async function confirmEmail() {
    if (submitting.current) return;
    submitting.current = true;
    setStatus("pending");
    try {
      await verifyEmail(token);
      setStatus("verified");
    } catch (error) {
      const code = error?.response?.status;
      setStatus(code === 400 ? "invalid" : code === 429 ? "rate-limited" : "failed");
    } finally {
      submitting.current = false;
    }
  }

  const Icon = verified ? CircleCheck : invalid ? MailX : MailCheck;

  return (
    <main className="grid min-h-dvh place-items-center bg-emerald-50 px-4 py-10 text-slate-900">
      <section
        aria-labelledby="verify-email-title"
        className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg sm:p-9"
      >
        <Link to="/" replace className="text-lg font-extrabold text-emerald-800 no-underline">
          ĐẶT SÂN <span className="text-emerald-600">247</span>
        </Link>
        <div
          className="mb-4 mt-7 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-800"
          aria-hidden="true"
        >
          <Icon size={24} />
        </div>
        <div aria-live="polite">
          <h1 id="verify-email-title" className="mb-2 text-2xl font-bold sm:text-3xl">
            {verified ? "Đã xác minh email" : invalid ? "Liên kết không hợp lệ" : "Xác minh email"}
          </h1>
          <p className="mb-6 leading-relaxed text-slate-600">
            {verified
              ? "Bạn có thể đăng nhập bằng tài khoản vừa tạo."
              : invalid
                ? "Liên kết có thể đã hết hạn hoặc đã được dùng. Nếu bạn đã xác minh email, hãy đăng nhập."
                : "Xác nhận địa chỉ email để kích hoạt tài khoản đặt sân của bạn."}
          </p>
        </div>

        {status === "failed" && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            Chưa thể xác minh email. Vui lòng thử lại.
          </p>
        )}
        {status === "rate-limited" && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.
          </p>
        )}

        {verified || invalid ? (
          <Link to="/" replace state={{ openLogin: true }} className={buttonClass}>
            Đăng nhập
          </Link>
        ) : (
          <button type="button" disabled={busy} onClick={confirmEmail} className={buttonClass}>
            {busy ? "Đang xác minh…" : status === "ready" ? "Xác minh email" : "Thử lại"}
          </button>
        )}
        {invalid && <ResendVerificationForm />}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  const validToken = token.length === 43 && !/[^A-Za-z0-9_-]/.test(token);
  return <VerificationCard key={hash} token={validToken ? token : null} />;
}
