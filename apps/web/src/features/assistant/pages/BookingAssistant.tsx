import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Header from "../../../shared/ui/Header.jsx";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import {
  createConversation,
  getConversation,
  getTrace,
  sendMessage,
  type ChatResponse,
  type ChatRequest,
  type Option,
} from "../api/chat";

export default function BookingAssistant() {
  const { user } = useContext(SessionContext) as unknown as {
    user: { userId?: string } | null;
  };
  const owner = user?.userId;
  const [id, setId] = useState<string | null>(null),
    [messages, setMessages] = useState<{ role: string; text: string }[]>([]),
    [text, setText] = useState(""),
    [result, setResult] = useState<ChatResponse | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [trace, setTrace] = useState<
      { node: string; outcome: string; plan_version: number }[]
    >([]);
  const uncertain = useRef<ChatRequest | null>(null);
  useEffect(() => {
    let active = true;
    setId(null);
    setMessages([]);
    setResult(null);
    setError("");
    uncertain.current = null;
    if (!owner) return;
    const saved = localStorage.getItem(`booking-assistant:${owner}`);
    if (saved)
      getConversation(saved)
        .then((data) => {
          if (!active) return;
          setId(saved);
          setMessages(data.messages.map(({ role, text }) => ({ role, text })));
          if (data.pending_turn) {
            uncertain.current = data.pending_turn;
            setError(
              "Yêu cầu trước chưa trả lời xong. Thử lại để lấy kết quả với cùng mã yêu cầu.",
            );
          }
          const last = [...data.messages]
            .reverse()
            .find((m) => m.response)?.response;
          if (last)
            setResult({
              ...last,
              options: data.state.options,
              selected_option_id: data.state.selected_option_id,
              confirmation_id: data.state.confirmation_id,
              requires_confirmation:
                !!data.state.confirmation_id &&
                !data.state.pending_booking &&
                !data.state.booking,
              booking: data.state.booking,
              action: data.state.next_action,
            });
        })
        .catch(() => {
          if (active) localStorage.removeItem(`booking-assistant:${owner}`);
        });
    return () => {
      active = false;
    };
  }, [owner]);
  const post = useCallback(
    async (
      payload: Omit<ChatRequest, "client_message_id">,
      retryNetwork = false,
    ) => {
      if (busy || !owner) return;
      setBusy(true);
      setError("");
      const request =
        retryNetwork && uncertain.current
          ? uncertain.current
          : { ...payload, client_message_id: crypto.randomUUID() };
      uncertain.current = request;
      try {
        let current = id;
        if (!current) {
          const created = await createConversation();
          current = created.conversation_id;
          setId(current);
          localStorage.setItem(`booking-assistant:${owner}`, current);
        }
        const data = await sendMessage(current, request);
        setMessages((old) => [
          ...old,
          { role: "user", text: request.text },
          { role: "assistant", text: data.assistant_message },
        ]);
        setResult(data);
        uncertain.current = null;
        setText("");
      } catch (e: unknown) {
        const message = e as {
          response?: { data?: { message?: string; detail?: string } };
          message?: string;
        };
        setError(
          message.response?.data?.message ||
            message.response?.data?.detail ||
            message.message ||
            "Chưa nhận được kết quả. Bạn thử lại cùng yêu cầu nhé.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, id, owner],
  );
  async function reset() {
    if (busy || uncertain.current || result?.action === "RETRY_BOOKING") return;
    localStorage.removeItem(`booking-assistant:${owner}`);
    setId(null);
    setMessages([]);
    setResult(null);
    setTrace([]);
    setError("");
    uncertain.current = null;
  }
  async function showTrace() {
    if (!id) return;
    try {
      setTrace((await getTrace(id)).traces);
    } catch {
      setError("Chưa tải được các bước xử lý.");
    }
  }
  const selected = result?.options.find(
    (o) => o.option_id === result.selected_option_id,
  );
  function card(option: Option) {
    return (
      <article
        key={option.option_id}
        className="rounded-lg border border-green-300 bg-white p-4 space-y-2"
      >
        <h3 className="font-bold text-green-900">
          {option.court_name} · {option.center_name}
        </h3>
        <p>
          {new Date(option.start).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}{" "}
          →{" "}
          {new Date(option.end).toLocaleTimeString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p>
          Tổng giá:{" "}
          <strong>{option.total_price_vnd.toLocaleString("vi-VN")} đ</strong>
        </p>
        {option.relaxed_fields.length > 0 && (
          <p className="text-sm text-amber-800">
            Phương án theo ưu tiên mềm đã cho phép:{" "}
            {option.relaxed_fields
              .map((f) =>
                f === "area" ? "ngoài khu vực ưu tiên" : "giờ gần giờ ưu tiên",
              )
              .join(", ")}
          </p>
        )}
        <button
          disabled={
            busy || !!uncertain.current || result?.action === "RETRY_BOOKING"
          }
          className="bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={() =>
            post({
              text: "Chọn phương án",
              action: "select",
              option_id: option.option_id,
            })
          }
        >
          Chọn sân
        </button>
      </article>
    );
  }
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-6 pt-32 space-y-5 text-gray-900">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">Trợ lý đặt sân</h1>
          <button
            onClick={reset}
            disabled={
              busy || !!uncertain.current || result?.action === "RETRY_BOOKING"
            }
            className="border rounded px-3 py-2"
          >
            Hội thoại mới
          </button>
        </div>
        <p>
          Mỗi slot là 1 tiếng. Ví dụ: “Tối mai khoảng 19:00, chơi 2 tiếng, dưới
          250 nghìn, gần Cầu Giấy”. Chọn sân rồi xác nhận cuối để đặt.
        </p>
        {!owner && (
          <p role="alert" className="bg-yellow-100 p-4 rounded">
            Cần session người dùng do host/Identity cung cấp để chat và đặt sân.
          </p>
        )}
        {result?.provider === "fake" && (
          <p className="bg-amber-100 p-3 rounded">
            Chế độ kiểm thử offline: bộ phân tích câu mẫu, chưa dùng LLM thật.
          </p>
        )}
        <section
          aria-label="Lịch sử hội thoại"
          className="bg-green-50 border rounded-xl p-5 space-y-3 min-h-40"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "ml-10 bg-white p-3 rounded-lg"
                  : "mr-10 bg-green-100 p-3 rounded-lg"
              }
            >
              <strong>{message.role === "user" ? "Bạn" : "Trợ lý"}: </strong>
              {message.text}
            </div>
          ))}
        </section>
        {error && (
          <div role="alert" className="bg-red-50 p-4 rounded">
            <p>{error}</p>
            <button
              onClick={() => post({ text: "Thử lại" }, true)}
              disabled={busy}
            >
              Thử lại yêu cầu vừa gửi
            </button>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) void post({ text: text.trim() });
          }}
          className="flex gap-3"
        >
          <label className="sr-only" htmlFor="assistant-input">
            Yêu cầu đặt sân
          </label>
          <input
            id="assistant-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            disabled={busy || !owner || !!uncertain.current}
            className="flex-1 border rounded p-3"
            placeholder="Nhập ngày, giờ, thời lượng hoặc sửa yêu cầu..."
          />
          <button
            disabled={busy || !owner || !text.trim() || !!uncertain.current}
            className="bg-green-700 text-white p-3 rounded disabled:opacity-50"
          >
            {busy ? "Đang xử lý..." : "Gửi"}
          </button>
        </form>
        <div className="grid md:grid-cols-2 gap-4">
          {result?.options.map(card)}
        </div>
        {result?.requires_confirmation && selected && (
          <section className="bg-yellow-100 border rounded-lg p-5 space-y-3">
            <h2 className="font-bold">Xác nhận cuối</h2>
            <p>
              {selected.court_name} · {selected.center_name}
            </p>
            <p>
              {new Date(selected.start).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}{" "}
              –{" "}
              {new Date(selected.end).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <p>Tổng: {selected.total_price_vnd.toLocaleString("vi-VN")} đ</p>
            <button
              disabled={busy || !!uncertain.current}
              onClick={() =>
                post({
                  text: "Xác nhận đặt sân",
                  action: "confirm",
                  confirmation_id: result.confirmation_id!,
                })
              }
              className="bg-green-800 text-white p-3 rounded"
            >
              Xác nhận đặt sân
            </button>
          </section>
        )}
        {result?.action === "RETRY_BOOKING" && (
          <button
            disabled={busy}
            onClick={() =>
              post(
                { text: "Kiểm tra lại", action: "retry" },
                !!uncertain.current,
              )
            }
            className="bg-amber-200 p-3 rounded"
          >
            Kiểm tra lại kết quả đặt
          </button>
        )}
        {result?.booking && (
          <section className="bg-green-100 p-5 rounded-lg">
            <h2 className="font-bold">Booking đã xác nhận</h2>
            <p>Mã: {result.booking.id}</p>
            <p>
              Tổng giá Core: {result.booking.totalPrice.toLocaleString("vi-VN")}{" "}
              đ
            </p>
          </section>
        )}
        {id && (
          <details className="border rounded p-4">
            <summary
              onClick={() => void showTrace()}
              className="cursor-pointer"
            >
              Xem các bước xử lý (demo)
            </summary>
            <ol>
              {trace.map((step, index) => (
                <li key={index}>
                  {step.node}: {step.outcome} · plan {step.plan_version}
                </li>
              ))}
            </ol>
          </details>
        )}
      </main>
    </>
  );
}
