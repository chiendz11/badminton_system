import { useEffect, useId, useRef, useState } from "react";
import "./login-modal.css";

// onSubmit sẽ được nối với API Identity ở bước tích hợp.
export default function LoginModal({ isOpen, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const emailRef = useRef(null);
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      setPassword("");
      setShowPassword(false);
      setError("");
      return;
    }
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    emailRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!onSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit({ email: email.trim().toLowerCase(), password });
      onClose();
    } catch {
      setError("Không thể đăng nhập. Vui lòng kiểm tra thông tin hoặc thử lại sau.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function requestClose() {
    if (!submittingRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="identity-login"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right ||
            event.clientY < box.top || event.clientY > box.bottom) requestClose();
      }}
    >
      <div className="identity-login__layout">
        <aside className="identity-login__welcome">
          <span className="identity-login__brand">ĐẶT<span>SÂN</span>247</span>
          <i className="fas fa-table-tennis identity-login__symbol" aria-hidden="true"></i>
          <h2>Xin chào bạn!</h2>
          <p>Đăng nhập để đặt sân và quản lý lịch chơi của bạn.</p>
        </aside>
        <section className="identity-login__content">
          <button type="button" className="identity-login__close" aria-label="Đóng đăng nhập"
            onClick={requestClose} disabled={busy}>×</button>
          <h2 id={titleId}>Đăng nhập</h2>
          <p className="identity-login__intro">Chào mừng bạn trở lại Đặt Sân 247.</p>
          <form onSubmit={handleSubmit} aria-busy={busy}>
            <div className="identity-login__field">
              <label htmlFor={emailId}>Email</label>
              <input ref={emailRef} id={emailId} name="email" type="email" autoComplete="username"
                placeholder="Email của bạn" value={email} onChange={(event) => setEmail(event.target.value)}
                required maxLength={254} disabled={busy} />
            </div>
            <div className="identity-login__field">
              <label htmlFor={passwordId}>Mật khẩu</label>
              <div className="identity-login__password">
                <input id={passwordId} name="password" type={showPassword ? "text" : "password"}
                  autoComplete="current-password" placeholder="Nhập mật khẩu" value={password}
                  onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
                <button type="button" className="identity-login__toggle" disabled={busy}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}>
                  <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} aria-hidden="true"></i>
                </button>
              </div>
            </div>
            {error && <p className="identity-login__error" role="alert">{error}</p>}
            <button type="submit" className="identity-login__submit" disabled={busy || !onSubmit}>
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>
        </section>
      </div>
    </dialog>
  );
}
