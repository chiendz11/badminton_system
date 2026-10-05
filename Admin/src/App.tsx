import { useEffect, useRef, useState } from "react";
import type {
  Booking,
  Center,
  Availability,
  PricingBand,
  Selection,
} from "@badminton/booking-contracts";
import {
  discountedQuote,
  formatMinute,
  localDate,
} from "@badminton/booking-contracts";
import {
  BookingList,
  SlotGrid,
  requestKey,
  money,
} from "@badminton/booking-ui";
import { useSession } from "./session";
type Tab = "centers" | "courts" | "pricing" | "schedule" | "fixed";
export default function App() {
  const { session, api, demo, logout } = useSession();
  const [tab, setTab] = useState<Tab>("schedule"),
    [centers, setCenters] = useState<Center[]>([]),
    [center, setCenter] = useState<Center | null>(null),
    [bookings, setBookings] = useState<Booking[]>([]),
    [availability, setAvailability] = useState<Availability | null>(null),
    [date, setDate] = useState(localDate()),
    [selected, setSelected] = useState<Selection[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [bands, setBands] = useState<PricingBand[]>([]),
    [courtName, setCourtName] = useState(""),
    [surface, setSurface] = useState("thảm"),
    [startDate, setStartDate] = useState(localDate()),
    [endDate, setEndDate] = useState(localDate()),
    [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]),
    [customer, setCustomer] = useState("demo-customer"),
    [customerName, setCustomerName] = useState("Khách Demo"),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [newCenter, setNewCenter] = useState({
    name: "",
    address: "",
    phone: "",
    managerId: "demo-manager",
    pricePerHour: 80000,
  });
  const attempt = useRef<{ body: string; key: string } | null>(null);
  function failed(value: unknown) {
    setError(value instanceof Error ? value.message : "Có lỗi xảy ra");
  }
  async function reloadCenters() {
    const result = await api.centers(true);
    setCenters(result.items);
    setCenter(
      (current) =>
        result.items.find((c) => c.id === current?.id) ||
        result.items[0] ||
        null,
    );
  }
  useEffect(() => {
    if (session) void reloadCenters().catch(failed);
    else {
      setCenters([]);
      setCenter(null);
    }
  }, [session?.token]);
  useEffect(() => {
    if (!center) return;
    setBands(center.pricing.map((b) => ({ ...b })));
    setSelected([]);
    attempt.current = null;
  }, [center?.id]);
  async function schedule() {
    if (!center) return;
    const result = await api.bookings(
      `/api/v1/centers/${center.id}/bookings?date=${date}&page=${page}&limit=20`,
    );
    setBookings(result.items);
    setTotal(result.total);
  }
  useEffect(() => {
    if (center && session && tab === "schedule") void schedule().catch(failed);
  }, [center?.id, session?.token, tab, date, page]);
  useEffect(() => {
    if (center && tab === "fixed") {
      let active = true;
      setSelected([]);
      setAvailability(null);
      api
        .fixedAvailability({
          centerId: center.id,
          startDate,
          endDate,
          weekdays,
        })
        .then((value) => {
          if (active) setAvailability(value);
        })
        .catch((value) => {
          if (active) failed(value);
        });
      return () => {
        active = false;
      };
    }
  }, [center?.id, tab, startDate, endDate, weekdays.join(",")]);
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(message);
      await reloadCenters();
      if (tab === "schedule") await schedule();
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  }
  function changeBand(index: number, key: keyof PricingBand, value: string) {
    setBands((current) =>
      current.map((b, i) =>
        i === index
          ? { ...b, [key]: key === "dayType" ? value : Number(value) }
          : b,
      ),
    );
  }
  function splitBand(dayType: PricingBand["dayType"]) {
    setBands((current) => {
      const index = current.findIndex(
        (b) => b.dayType === dayType && b.endMinute - b.startMinute >= 120,
      );
      if (index < 0) return current;
      const band = current[index],
        middle =
          band.startMinute +
          Math.floor((band.endMinute - band.startMinute) / 120) * 60;
      return [
        ...current.slice(0, index),
        { ...band, endMinute: middle },
        { ...band, startMinute: middle },
        ...current.slice(index + 1),
      ];
    });
  }
  async function createFixed() {
    if (!center) return;
    const payload = {
      centerId: center.id,
      userId: customer,
      userName: customerName,
      startDate,
      endDate,
      weekdays,
      selections: selected,
    };
    const body = JSON.stringify(payload);
    if (attempt.current?.body !== body)
      attempt.current = { body, key: requestKey() };
    await action(async () => {
      const result = await api.call<{ total: number }>(
        "/api/v1/bookings/fixed",
        {
          method: "POST",
          headers: { "Idempotency-Key": attempt.current!.key },
          body,
        },
      );
      setSelected([]);
      attempt.current = null;
      if (result.total)
        setAvailability(
          await api.fixedAvailability({
            centerId: center.id,
            startDate,
            endDate,
            weekdays,
          }),
        );
    }, "Lịch cố định đã được tạo.");
  }
  const nav: Record<Tab, string> = {
    schedule: "Lịch đặt sân",
    centers: "Trung tâm",
    courts: "Danh sách sân",
    pricing: "Bảng giá",
    fixed: "Đặt lịch cố định",
  };
  const fixedBase = selected.reduce(
    (sum, detail) =>
      sum +
      detail.slots.reduce(
        (subtotal, minute) =>
          subtotal +
          (availability?.courts
            .find((c) => c.id === detail.courtId)
            ?.slots.find((s) => s.minute === minute)?.price || 0),
        0,
      ),
    0,
  );
  const fixedEstimate = discountedQuote(
    fixedBase,
    selected.length,
    session?.actor.userId === customer ? session.actor.loyaltyPoints : 0,
  ).totalPrice;
  const isAdmin = session?.actor.role === "super_admin";
  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">↗</span>badminton
          <span className="badge">Quản lý</span>
        </div>
        <div className="auth">
          {session ? (
            <>
              <span>{session.actor.name}</span>
              <button
                className="button subtle"
                disabled={busy}
                onClick={logout}
              >
                Đăng xuất
              </button>
            </>
          ) : import.meta.env.VITE_ENABLE_DEMO_AUTH === "true" ? (
            <>
              <button
                className="button"
                onClick={() => void demo("manager").catch(failed)}
              >
                Demo quản lý
              </button>
              <button
                className="button subtle"
                onClick={() => void demo("admin").catch(failed)}
              >
                Demo admin
              </button>
            </>
          ) : (
            <span>Đăng nhập tài khoản quản lý</span>
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
      {!session ? (
        <div className="empty">
          Đăng nhập để quản lý trung tâm, sân và lịch đặt.
        </div>
      ) : (
        <div className="admin-layout">
          <aside className="sidebar">
            {Object.entries(nav).map(([key, label]) => (
              <button
                className={tab === key ? "active" : ""}
                key={key}
                onClick={() => {
                  setTab(key as Tab);
                  setError("");
                  setNotice("");
                }}
              >
                {label}
              </button>
            ))}
          </aside>
          <main>
            <div className="section-heading">
              <div>
                <span className="muted">Không gian quản lý</span>
                <h1 style={{ fontSize: 30, margin: "10px 0" }}>{nav[tab]}</h1>
              </div>
              <label className="field">
                Trung tâm
                <select
                  aria-label="Trung tâm"
                  disabled={busy}
                  value={center?.id || ""}
                  onChange={(e) => {
                    setCenter(
                      centers.find((c) => c.id === e.target.value) || null,
                    );
                    setPage(1);
                  }}
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isActive ? "" : " (tạm đóng)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {tab === "centers" ? (
              <>
                {center && (
                  <section className="panel">
                    <h2>{center.name}</h2>
                    <p>
                      {center.address}
                      <br />
                      Điện thoại: {center.phone}
                    </p>
                    <div className="form-grid">
                      <label className="field">
                        Tên trung tâm
                        <input
                          value={center.name}
                          onChange={(e) =>
                            setCenter({ ...center, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Địa chỉ
                        <input
                          value={center.address}
                          onChange={(e) =>
                            setCenter({ ...center, address: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Điện thoại
                        <input
                          value={center.phone}
                          onChange={(e) =>
                            setCenter({ ...center, phone: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Mô tả
                        <textarea
                          value={center.description}
                          onChange={(e) =>
                            setCenter({
                              ...center,
                              description: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="toolbar">
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          void action(
                            () =>
                              api.call(`/api/v1/centers/${center.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  name: center.name,
                                  address: center.address,
                                  phone: center.phone,
                                  description: center.description,
                                }),
                              }),
                            "Đã cập nhật trung tâm.",
                          )
                        }
                      >
                        Lưu thay đổi
                      </button>
                      <button
                        className="button subtle"
                        disabled={busy}
                        onClick={() =>
                          void action(
                            () =>
                              api.call(`/api/v1/centers/${center.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  isActive: !center.isActive,
                                }),
                              }),
                            center.isActive
                              ? "Đã tạm đóng trung tâm."
                              : "Đã mở trung tâm.",
                          )
                        }
                      >
                        {center.isActive
                          ? "Tạm đóng trung tâm"
                          : "Mở lại trung tâm"}
                      </button>
                    </div>
                  </section>
                )}
                {isAdmin && (
                  <section className="panel">
                    <h2>Thêm trung tâm</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void action(
                          () =>
                            api.call("/api/v1/centers", {
                              method: "POST",
                              body: JSON.stringify(newCenter),
                            }),
                          "Đã tạo trung tâm.",
                        );
                      }}
                    >
                      <div className="form-grid">
                        {(
                          ["name", "address", "phone", "managerId"] as const
                        ).map((key, index) => (
                          <label className="field" key={key}>
                            {
                              [
                                "Tên trung tâm",
                                "Địa chỉ",
                                "Điện thoại",
                                "Mã người quản lý",
                              ][index]
                            }
                            <input
                              required
                              value={newCenter[key]}
                              onChange={(e) =>
                                setNewCenter({
                                  ...newCenter,
                                  [key]: e.target.value,
                                })
                              }
                            />
                          </label>
                        ))}
                        <label className="field">
                          Giá ban đầu (VND / giờ)
                          <input
                            type="number"
                            min={0}
                            max={2000000}
                            required
                            value={newCenter.pricePerHour}
                            onChange={(e) =>
                              setNewCenter({
                                ...newCenter,
                                pricePerHour: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      <button className="button" disabled={busy}>
                        Tạo trung tâm
                      </button>
                    </form>
                  </section>
                )}
              </>
            ) : !center ? (
              <div className="empty">Chưa có trung tâm được phân công.</div>
            ) : tab === "courts" ? (
              <section className="panel">
                <h2>Các sân tại trung tâm</h2>
                <div className="slot-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tên sân</th>
                        <th>Mặt sân</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {center.courts.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <input
                              aria-label={`Tên ${c.name}`}
                              value={c.name}
                              disabled={busy}
                              onChange={(e) =>
                                setCenter({
                                  ...center,
                                  courts: center.courts.map((court) =>
                                    court.id === c.id
                                      ? { ...court, name: e.target.value }
                                      : court,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>
                            <select
                              aria-label={`Mặt sân ${c.name}`}
                              value={c.surface}
                              disabled={busy}
                              onChange={(e) =>
                                setCenter({
                                  ...center,
                                  courts: center.courts.map((court) =>
                                    court.id === c.id
                                      ? { ...court, surface: e.target.value }
                                      : court,
                                  ),
                                })
                              }
                            >
                              <option value="thảm">Thảm</option>
                              <option value="gỗ">Gỗ</option>
                              <option value="xi_măng">Xi măng</option>
                            </select>
                          </td>
                          <td>{c.isActive ? "Đang mở" : "Tạm đóng"}</td>
                          <td>
                            <button
                              className="button subtle"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  () =>
                                    api.call(
                                      `/api/v1/centers/${center.id}/courts/${c.id}`,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          name: c.name,
                                          surface: c.surface,
                                        }),
                                      },
                                    ),
                                  "Đã cập nhật sân.",
                                )
                              }
                            >
                              Lưu
                            </button>
                            <button
                              className="button subtle"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  () =>
                                    api.call(
                                      `/api/v1/centers/${center.id}/courts/${c.id}`,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          isActive: !c.isActive,
                                        }),
                                      },
                                    ),
                                  "Đã cập nhật sân.",
                                )
                              }
                            >
                              {c.isActive ? "Tạm đóng" : "Mở lại"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Thêm sân</h3>
                <form
                  className="toolbar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async () => {
                      await api.call(`/api/v1/centers/${center.id}/courts`, {
                        method: "POST",
                        body: JSON.stringify({ name: courtName, surface }),
                      });
                      setCourtName("");
                    }, "Đã thêm sân.");
                  }}
                >
                  <label className="field">
                    Tên sân
                    <input
                      required
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Mặt sân
                    <select
                      value={surface}
                      onChange={(e) => setSurface(e.target.value)}
                    >
                      <option>thảm</option>
                      <option>gỗ</option>
                      <option>xi_măng</option>
                    </select>
                  </label>
                  <button className="button" disabled={busy}>
                    Thêm sân
                  </button>
                </form>
              </section>
            ) : tab === "pricing" ? (
              <section className="panel">
                <h2>Bảng giá theo khung giờ</h2>
                <p className="muted">
                  Phủ đầy đủ {formatMinute(center.openMinute)} –{" "}
                  {formatMinute(center.closeMinute)} cho cả ngày thường và cuối
                  tuần. Giữ chỗ hiện tại vẫn dùng giá đã chốt.
                </p>
                {(["WEEKDAY", "WEEKEND"] as const).map((day) => (
                  <div key={day}>
                    <div className="section-heading">
                      <h3>{day === "WEEKDAY" ? "Ngày thường" : "Cuối tuần"}</h3>
                      <button
                        className="button subtle"
                        onClick={() => splitBand(day)}
                      >
                        Chia khung giờ
                      </button>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Từ</th>
                          <th>Đến</th>
                          <th>VND / giờ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bands.map(
                          (band, index) =>
                            band.dayType === day && (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="time"
                                    step="3600"
                                    value={formatMinute(band.startMinute)}
                                    onChange={(e) => {
                                      const [h, m] = e.target.value
                                        .split(":")
                                        .map(Number);
                                      changeBand(
                                        index,
                                        "startMinute",
                                        String(h * 60 + m),
                                      );
                                    }}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={band.endMinute}
                                    onChange={(e) =>
                                      changeBand(
                                        index,
                                        "endMinute",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    {Array.from(
                                      { length: 24 },
                                      (_, n) => (n + 1) * 60,
                                    ).map((minute) => (
                                      <option key={minute} value={minute}>
                                        {formatMinute(minute)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    max="2000000"
                                    step="1000"
                                    value={band.pricePerHour}
                                    onChange={(e) =>
                                      changeBand(
                                        index,
                                        "pricePerHour",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      () =>
                        api.call(`/api/v1/centers/${center.id}/pricing`, {
                          method: "PUT",
                          body: JSON.stringify({ bands }),
                        }),
                      "Đã cập nhật bảng giá.",
                    )
                  }
                >
                  Lưu bảng giá
                </button>
              </section>
            ) : tab === "schedule" ? (
              <section className="panel">
                <div className="toolbar">
                  <label className="field">
                    Ngày xem lịch
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <button
                    className="button subtle"
                    disabled={busy}
                    onClick={() => void schedule().catch(failed)}
                  >
                    Tải lại lịch
                  </button>
                  <span>{total} lịch</span>
                </div>
                <BookingList
                  items={bookings}
                  busy={busy}
                  onCancel={(id) => {
                    if (window.confirm("Hủy lịch đặt này?"))
                      void action(() => api.cancel(id), "Đã hủy lịch.");
                  }}
                />
                <div className="toolbar">
                  <button
                    className="button subtle"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Trang trước
                  </button>
                  <span>Trang {page}</span>
                  <button
                    className="button subtle"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </section>
            ) : (
              <section className="panel">
                <h2>Đặt lịch cố định cho khách</h2>
                <p className="muted">
                  Tất cả ngày được tạo cùng một lần. Nếu một khung giờ bị trùng,
                  toàn bộ yêu cầu sẽ được giữ nguyên để bạn điều chỉnh.
                </p>
                <div className="form-grid">
                  <label className="field">
                    Mã khách hàng
                    <input
                      required
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Tên khách
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Từ ngày
                    <input
                      type="date"
                      min={localDate()}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setSelected([]);
                      }}
                    />
                  </label>
                  <label className="field">
                    Đến ngày
                    <input
                      type="date"
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="days">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(
                    (label, day) => (
                      <button
                        className={`day ${weekdays.includes(day) ? "active" : ""}`}
                        key={day}
                        onClick={() =>
                          setWeekdays((current) =>
                            current.includes(day)
                              ? current.filter((d) => d !== day)
                              : [...current, day],
                          )
                        }
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
                <p>
                  Lịch trống trên toàn bộ các ngày đã chọn. Giá mỗi ô là tổng
                  giá cho cả lịch cố định.
                </p>
                {availability && (
                  <SlotGrid
                    availability={availability}
                    selected={selected}
                    disabled={busy}
                    onChange={setSelected}
                  />
                )}
                <p className="muted">
                  {selected.reduce((n, s) => n + s.slots.length, 0)} giờ trên{" "}
                  {selected.length} sân mỗi ngày. Giá các ngày được tính lại
                  theo bảng giá. Tổng dự kiến: {money(fixedEstimate)}.
                </p>
                <button
                  className="button"
                  disabled={
                    busy ||
                    !selected.length ||
                    !weekdays.length ||
                    !customer.trim() ||
                    !customerName.trim()
                  }
                  onClick={() => void createFixed()}
                >
                  {busy ? "Đang tạo lịch..." : "Tạo lịch cố định"}
                </button>
              </section>
            )}
          </main>
        </div>
      )}
      <footer className="footer">
        <span>badminton. · Quản lý lịch sân tập trung.</span>
        <span>Giờ sân Việt Nam · Không gian quản lý</span>
      </footer>
    </div>
  );
}
