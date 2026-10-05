import { useEffect, useRef, useState } from "react";
import type {
  Availability,
  Booking,
  Center,
  Reservation,
  Selection,
} from "@badminton/booking-contracts";
import { discountedQuote, localDate } from "@badminton/booking-contracts";
import {
  ApiError,
  BookingList,
  SlotGrid,
  money,
  requestKey,
} from "@badminton/booking-ui";
import { useSession } from "./session";
export default function App() {
  const { session, api, demo, logout } = useSession();
  const [tab, setTab] = useState<"explore" | "history">("explore");
  const [centers, setCenters] = useState<Center[]>([]),
    [center, setCenter] = useState<Center | null>(null),
    [date, setDate] = useState(localDate()),
    [availability, setAvailability] = useState<Availability | null>(null),
    [selected, setSelected] = useState<Selection[]>([]),
    [reservation, setReservation] = useState<Reservation | null>(null),
    [bookings, setBookings] = useState<Booking[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [remaining, setRemaining] = useState(0);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const token = session?.token;
  function failed(value: unknown) {
    const failure = value instanceof Error ? value.message : "Có lỗi xảy ra";
    setError(failure);
    if (value instanceof ApiError && value.status === 401) logout();
  }
  useEffect(() => {
    let active = true;
    api
      .centers()
      .then((result) => {
        if (active) {
          setCenters(result.items);
          setCenter(result.items[0] || null);
          setLoading(false);
        }
      })
      .catch((value) => {
        if (active) {
          failed(value);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (!center) return;
    let active = true;
    setLoading(true);
    setSelected([]);
    attempt.current = null;
    api
      .availability(center.id, date)
      .then((value) => {
        if (active) {
          setAvailability(value);
          setLoading(false);
        }
      })
      .catch((value) => {
        if (active) {
          failed(value);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [center?.id, date]);
  async function refreshAvailability() {
    if (center) {
      const value = await api.availability(center.id, date);
      setAvailability(value);
      setSelected((current) =>
        current
          .map((s) => ({
            ...s,
            slots: s.slots.filter((minute) =>
              value.courts
                .find((c) => c.id === s.courtId)
                ?.slots.some(
                  (slot) => slot.minute === minute && slot.available,
                ),
            ),
          }))
          .filter((s) => s.slots.length),
      );
    }
  }
  async function loadHistory() {
    if (session) {
      const result = await api.bookings(
        `/api/v1/bookings/me?page=${page}&limit=10`,
      );
      setBookings(result.items);
      setTotal(result.total);
    }
  }
  useEffect(() => {
    if (tab === "history" && session) void loadHistory().catch(failed);
    else if (!session) setBookings([]);
  }, [tab, token, page]);
  useEffect(() => {
    if (!reservation) return;
    let expired = false;
    function tick() {
      const seconds = Math.max(
        0,
        Math.ceil((Date.parse(reservation!.expiresAt) - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0 && !expired) {
        expired = true;
        setReservation(null);
        setSelected([]);
        setError("Giữ chỗ đã hết hạn. Vui lòng chọn lại khung giờ.");
        void refreshAvailability().catch(failed);
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [reservation?.id]);
  const estimate = selected.reduce(
      (sum, detail) =>
        sum +
        detail.slots.reduce(
          (amount, minute) =>
            amount +
            (availability?.courts
              .find((c) => c.id === detail.courtId)
              ?.slots.find((s) => s.minute === minute)?.price || 0),
          0,
        ),
      0,
    ),
    hours = selected.reduce((sum, s) => sum + s.slots.length, 0);
  async function reserve() {
    if (!center || !session) return;
    setBusy(true);
    setError("");
    setNotice("");
    const payload = { centerId: center.id, date, selections: selected };
    const body = JSON.stringify(payload);
    if (attempt.current?.body !== body)
      attempt.current = { body, key: requestKey() };
    try {
      const value = await api.reserve(payload, attempt.current!.key);
      if (value.status !== "HELD") {
        attempt.current = null;
        throw new Error(
          "Yêu cầu cũ đã hết hạn hoặc được xác nhận. Vui lòng chọn lại.",
        );
      }
      setReservation(value);
    } catch (value) {
      failed(value);
      if (value instanceof ApiError && value.status === 409) {
        attempt.current = null;
        await refreshAvailability().catch(failed);
      }
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!reservation) return;
    setBusy(true);
    setError("");
    try {
      const booking = await api.confirm(reservation.id);
      setNotice(`Đặt sân thành công! Mã đặt ${booking.id.slice(0, 8)}.`);
      setReservation(null);
      setSelected([]);
      attempt.current = null;
      setTab("history");
      setPage(1);
      await loadHistory();
      await refreshAvailability();
    } catch (value) {
      failed(value);
      if (value instanceof ApiError && [409, 410].includes(value.status)) {
        setReservation(null);
        attempt.current = null;
        await refreshAvailability().catch(failed);
      }
    } finally {
      setBusy(false);
    }
  }
  async function release() {
    if (!reservation) return;
    setBusy(true);
    try {
      await api.release(reservation.id);
      setReservation(null);
      setSelected([]);
      attempt.current = null;
      await refreshAvailability();
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    if (!window.confirm("Bạn muốn hủy lịch đặt sân này?")) return;
    setBusy(true);
    setError("");
    try {
      await api.cancel(id);
      setNotice("Đã hủy lịch và trả lại khung giờ.");
      await loadHistory();
      await refreshAvailability();
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    try {
      await demo("customer");
      setError("");
    } catch (value) {
      failed(value);
    }
  }
  const loginUrl = import.meta.env.VITE_IDENTITY_LOGIN_URL;
  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">↗</span>badminton
          <span className="muted">.</span>
        </div>
        <nav className="nav">
          <button
            className={tab === "explore" ? "active" : ""}
            onClick={() => setTab("explore")}
          >
            Tìm & đặt sân
          </button>
          <button
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            Lịch đặt của tôi
          </button>
        </nav>
        <div className="auth">
          {session ? (
            <>
              <span>{session.actor.name}</span>
              <button
                className="button subtle"
                disabled={busy || !!reservation}
                onClick={logout}
              >
                Đăng xuất
              </button>
            </>
          ) : import.meta.env.VITE_ENABLE_DEMO_AUTH === "true" ? (
            <button className="button" onClick={signIn}>
              Dùng tài khoản demo
            </button>
          ) : loginUrl ? (
            <a className="button" href={loginUrl}>
              Đăng nhập
            </a>
          ) : (
            <span>Đăng nhập để đặt sân</span>
          )}
        </div>
      </header>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      {tab === "explore" ? (
        <>
          <section className="hero">
            <div>
              <span className="eyebrow">Một buổi chơi hay bắt đầu từ đây</span>
              <h1>
                Chọn sân vừa ý.
                <br />
                Sẵn sàng vào trận.
              </h1>
              <p>
                Lịch trống và giá sân rõ ràng. Chọn khung giờ, giữ chỗ và xác
                nhận buổi chơi của bạn.
              </p>
              <span className="badge">
                Giữ chỗ tạm thời · Xác nhận ngay
              </span>
            </div>
            <div className="hero-art" aria-hidden="true" />
          </section>
          <div className="section-heading">
            <h2>Trung tâm cầu lông</h2>
            <label className="field">
              <span className="sr-only">Tìm theo tên hoặc địa chỉ</span>
              <input
                placeholder="Tìm tên sân, địa chỉ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="centers-grid">
            {centers
              .filter((c) =>
                `${c.name} ${c.address}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  className={`center-card ${center?.id === c.id ? "active" : ""}`}
                  disabled={!!reservation || busy}
                  onClick={() => {
                    setCenter(c);
                    setError("");
                  }}
                  key={c.id}
                >
                  <div className="court-art" aria-hidden="true" />
                  <div className="card-content">
                    <span className="badge">
                      {c.courts.filter((court) => court.isActive).length} sân ·
                      Trong nhà
                    </span>
                    <h3>{c.name}</h3>
                    <p>⌖ {c.address}</p>
                    <p>
                      Từ{" "}
                      {money(Math.min(...c.pricing.map((b) => b.pricePerHour)))}
                      /giờ
                    </p>
                  </div>
                </button>
              ))}
          </div>
          {!loading && !centers.length && (
            <div className="empty">Chưa có trung tâm đang hoạt động.</div>
          )}
          {center && (
            <div className="booking-layout">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{center.name}</h2>
                    <p className="muted">{center.address}</p>
                  </div>
                  <label className="field">
                    Ngày chơi
                    <input
                      aria-label="Ngày chơi"
                      type="date"
                      min={localDate()}
                      value={date}
                      disabled={!!reservation || busy}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                </div>
                <p className="muted">{center.description}</p>
                <div className="days">
                  {center.facilities.map((f) => (
                    <span className="badge" key={f}>
                      {f}
                    </span>
                  ))}
                </div>
                {loading ? (
                  <div className="spinner">Đang tải lịch sân...</div>
                ) : (
                  availability && (
                    <SlotGrid
                      availability={availability}
                      selected={selected}
                      disabled={busy || !!reservation}
                      onChange={setSelected}
                    />
                  )
                )}
                <small>
                  Mỗi ô tương ứng 1 giờ. Giá hiển thị theo lịch ngày thường hoặc
                  cuối tuần.
                </small>
              </section>
              <aside className="panel summary">
                <h2>Buổi chơi của bạn</h2>
                <p>
                  {date}
                  <br />
                  {selected.length} sân · {hours} giờ
                </p>
                <div className="big-price">
                  {money(
                    reservation?.totalPrice ??
                      discountedQuote(
                        estimate,
                        selected.length,
                        session?.actor.loyaltyPoints,
                      ).totalPrice,
                  )}
                </div>
                {!!reservation?.discountAmount && (
                  <p className="muted">
                    Giảm {money(reservation.discountAmount)} (
                    {reservation.discountPercent}%)
                  </p>
                )}
                {reservation ? (
                  <>
                    <div className="countdown" aria-label="Thời gian giữ chỗ">
                      {Math.floor(remaining / 60)}:
                      {String(remaining % 60).padStart(2, "0")}
                    </div>
                    <p>Khung giờ đang được giữ riêng cho bạn.</p>
                    <button
                      className="button"
                      disabled={busy || remaining === 0}
                      onClick={confirm}
                    >
                      {busy ? "Đang xử lý..." : "Xác nhận đặt sân"}
                    </button>
                    <button
                      className="button subtle"
                      disabled={busy}
                      onClick={release}
                    >
                      Bỏ giữ chỗ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button"
                      disabled={!session || !hours || busy}
                      onClick={reserve}
                    >
                      {busy ? "Đang giữ chỗ..." : "Giữ chỗ đã chọn"}
                    </button>
                    <small>
                      {session
                        ? "Giá chính thức được kiểm tra khi giữ chỗ."
                        : "Vui lòng đăng nhập để giữ chỗ và đặt sân."}
                    </small>
                  </>
                )}
              </aside>
            </div>
          )}
        </>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Lịch đặt của tôi</h2>
            <span className="badge">{total} lịch</span>
          </div>
          {!session ? (
            <div className="empty">Đăng nhập để xem lịch của bạn.</div>
          ) : (
            <>
              <BookingList
                items={bookings}
                onCancel={(id) => void cancel(id)}
                busy={busy}
              />
              <div className="toolbar">
                <button
                  className="button subtle"
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trang trước
                </button>
                <span>Trang {page}</span>
                <button
                  className="button subtle"
                  disabled={page * 10 >= total || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <footer className="footer">
        <span>badminton. · Chơi hết mình, đặt sân dễ dàng.</span>
        <span>Giờ sân: Asia/Ho_Chi_Minh · Giá VND</span>
      </footer>
    </div>
  );
}
