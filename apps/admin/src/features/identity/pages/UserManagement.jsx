import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import {
  assignManager,
  changeRole,
  changeStatus,
  listUsers,
  listManagers,
} from "../api/users.js";

const roleOptions = ["user", "center_manager", "super_admin"];
const inputClass = "rounded border border-slate-300 bg-white p-2";

function UserActions({ user, selfId, busy, onChange }) {
  const [role, setRole] = useState(user.role);
  const [reason, setReason] = useState("");
  const self = user.userId === selfId;
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(() => changeRole(user.userId, role, reason));
      }}
    >
      <input
        className={inputClass}
        aria-label={`Lý do cho ${user.email}`}
        placeholder="Lý do thay đổi"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        required
        maxLength={1000}
        disabled={busy}
      />
      <select
        className={inputClass}
        aria-label={`Vai trò của ${user.email}`}
        value={role}
        onChange={(event) => setRole(event.target.value)}
        disabled={busy || self}
      >
        {roleOptions.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <button
        className={inputClass}
        disabled={busy || self || !reason.trim() || role === user.role}
      >
        Đổi vai trò
      </button>
      <button
        className={inputClass}
        type="button"
        disabled={busy || !reason.trim()}
        onClick={() =>
          onChange(() => changeStatus(user.userId, !user.isActive, reason))
        }
      >
        {user.isActive ? "Khóa" : "Mở khóa"}
      </button>
    </form>
  );
}

export default function UserManagement() {
  const { admin, loading } = useContext(SessionContext) || {};
  const [filter, setFilter] = useState({
    search: "",
    role: "",
    isActive: "",
    offset: 0,
  });
  const [result, setResult] = useState({ users: [], total: 0 });
  const [managers, setManagers] = useState([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (admin?.role !== "super_admin") return;
    let active = true;
    setFetching(true);
    setError("");
    const params = { offset: filter.offset, limit: 20 };
    for (const key of ["search", "role", "isActive"])
      if (filter[key]) params[key] = filter[key];
    Promise.all([
      listUsers(params),
      listManagers(),
    ])
      .then(([users, candidates]) => {
        if (active) {
          setResult(users);
          setManagers(candidates);
        }
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách tài khoản.");
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [admin?.role, filter, revision]);
  async function mutate(operation) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage("Đã lưu thay đổi.");
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(failure.response?.data?.message || "Không lưu được thay đổi.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if (admin?.role !== "super_admin")
    return (
      <p role="alert">Chỉ quản trị viên hệ thống được quản lý người dùng.</p>
    );
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/dashboard">Bảng điều khiển</Link>
      <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilter({
            search: data.get("search"),
            role: data.get("role"),
            isActive: data.get("isActive"),
            offset: 0,
          });
        }}
      >
        <input
          className={inputClass}
          name="search"
          aria-label="Tìm theo email hoặc tên"
          placeholder="Email hoặc họ tên"
          maxLength={150}
        />
        <select className={inputClass} name="role" aria-label="Lọc vai trò">
          <option value="">Mọi vai trò</option>
          {roleOptions.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
        <select
          className={inputClass}
          name="isActive"
          aria-label="Lọc trạng thái"
        >
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
        <button className={inputClass} disabled={busy || fetching}>
          Tìm kiếm
        </button>
      </form>
      {fetching && <p role="status">Đang tải…</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {result.users.map((user) => (
              <tr key={`${user.userId}-${user.version}`} className="border-t">
                <td className="p-3">
                  {user.name}
                  <br />
                  {user.email}
                  <br />
                  {user.role}
                </td>
                <td>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</td>
                <td>
                  <UserActions
                    user={user}
                    selfId={admin.userId}
                    busy={busy || fetching}
                    onChange={mutate}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!fetching && result.total === 0 && <p>Không có tài khoản phù hợp.</p>}
      <div className="flex items-center gap-3">
        <button
          className={inputClass}
          disabled={!filter.offset || fetching}
          onClick={() =>
            setFilter({ ...filter, offset: Math.max(0, filter.offset - 20) })
          }
        >
          Trang trước
        </button>
        <span>{result.total} tài khoản</span>
        <button
          className={inputClass}
          disabled={filter.offset + 20 >= result.total || fetching}
          onClick={() => setFilter({ ...filter, offset: filter.offset + 20 })}
        >
          Trang sau
        </button>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Phân công quản lý trung tâm
        </h2>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void mutate(() =>
              assignManager({
                userId: data.get("userId"),
                centerId: data.get("centerId").trim(),
                active: data.get("active") === "true",
              }),
            );
          }}
        >
          <select
            className={inputClass}
            name="userId"
            aria-label="Quản lý trung tâm"
            required
            disabled={busy || fetching}
          >
            <option value="">Chọn center_manager</option>
            {managers.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.name} — {user.email}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            name="centerId"
            aria-label="ID trung tâm"
            placeholder="ID trung tâm (UUID)"
            pattern="[0-9a-fA-F-]{36}"
            required
          />
          <select
            className={inputClass}
            name="active"
            aria-label="Trạng thái phân công"
          >
            <option value="true">Phân công</option>
            <option value="false">Ngừng phân công</option>
          </select>
          <button className={inputClass} disabled={busy || fetching}>
            Lưu phân công
          </button>
        </form>
      </section>
    </main>
  );
}
