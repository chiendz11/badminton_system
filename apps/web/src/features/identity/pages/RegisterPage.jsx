import { useRef, useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { isValidEmailAddress, register } from "../api/auth.js";
import ResendVerificationForm from "../ui/ResendVerificationForm.jsx";

const fields = [
  { name: "username", label: "Họ và tên", type: "text", autoComplete: "name", minLength: 3, maxLength: 80 },
  { name: "email", label: "Email", type: "text", inputMode: "email", autoComplete: "email", maxLength: 254 },
  { name: "password", label: "Mật khẩu", type: "password", autoComplete: "new-password", minLength: 12 },
];

const inputClass =
  "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700";

export default function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState(null);
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;

    const data = new FormData(event.currentTarget);
    const username = data.get("username").trim();
    const email = data.get("email").toLowerCase();
    const password = data.get("password");
    if (username.length < 3 || username.length > 80) {
      setError("Họ và tên phải có từ 3 đến 80 ký tự.");
      return;
    }
    if (/\s/.test(email)) {
      setError("Email không được chứa khoảng trắng.");
      return;
    }
    if (!isValidEmailAddress(email)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    if ([...password].length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu phải có ít nhất 12 ký tự và không quá 72 byte UTF-8.");
      return;
    }
    if (/\s/.test(password)) {
      setError("Mật khẩu không được chứa khoảng trắng.");
      return;
    }
    if (
      !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) ||
      !/[0-9]/.test(password) || !/[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(password)
    ) {
      setError("Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt như @, ! hoặc #.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const { verificationEmailSent } = await register({ email, username, password });
      setRegistration({ email, verificationEmailSent });
    } catch (error) {
      switch (error?.response?.status) {
        case 400:
          setError("Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.");
          break;
        case 409:
          setError("Email này đã được đăng ký. Nếu đã xác minh email, bạn có thể đăng nhập.");
          break;
        case 429:
          setError("Bạn đã thử đăng ký quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.");
          break;
        default:
          setError("Chưa nhận được kết quả đăng ký. Hãy kiểm tra hộp thư trước khi thử lại.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const Icon = registration ? Mail : UserPlus;

  return (
    <main className="grid min-h-dvh place-items-center bg-emerald-50 px-4 py-10 text-slate-900">
      <section
        aria-labelledby="registration-title"
        className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg sm:p-9"
      >
        <Link to="/" className="text-lg font-extrabold text-emerald-800 no-underline">
          ĐẶT SÂN <span className="text-emerald-600">247</span>
        </Link>
        <div className="mb-4 mt-6 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-800" aria-hidden="true">
          <Icon size={24} />
        </div>
        <div aria-live="polite">
          <h1 id="registration-title" className="mb-2 text-2xl font-bold sm:text-3xl">
            {registration
              ? registration.verificationEmailSent ? "Kiểm tra hộp thư" : "Đã tạo tài khoản"
              : "Đăng ký"}
          </h1>
          {registration && (
            <p className="mb-0 break-words leading-relaxed text-slate-600">
              {registration.verificationEmailSent ? (
                <>Mở thư gửi tới <strong>{registration.email}</strong> và bấm link để xác minh tài khoản.</>
              ) : (
                <>Hệ thống chưa gửi được thư tới <strong>{registration.email}</strong>. Tài khoản đang chờ xác minh.</>
              )}
            </p>
          )}
        </div>

        {registration ? <ResendVerificationForm email={registration.email} /> : (
          <>
            <form onSubmit={handleSubmit} aria-busy={busy} className="mt-5">
              <fieldset disabled={busy} className="space-y-4">
                {fields.map(({ label, ...field }) => (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="mb-1 block text-sm font-semibold">{label}</label>
                    <input
                      {...field}
                      id={field.name}
                      required
                      className={inputClass}
                      aria-describedby={field.name === "password" ? "signup-password-hint" : undefined}
                    />
                    {field.name === "password" && (
                      <p id="signup-password-hint" className="mb-0 mt-1 text-sm text-slate-600">
                        Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt như @, ! hoặc #. Không dùng khoảng trắng.
                      </p>
                    )}
                  </div>
                ))}
                {error && <p role="alert" className="mb-0 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-[#0c8040] px-5 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? "Đang đăng ký…" : "Đăng ký"}
                </button>
              </fieldset>
            </form>
            <p className="mb-0 mt-5 text-center text-sm text-slate-600">
              Đã có tài khoản?{" "}
              <Link to="/" replace state={{ openLogin: true }} className="font-semibold text-emerald-800">
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
