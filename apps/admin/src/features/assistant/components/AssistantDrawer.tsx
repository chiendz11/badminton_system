import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Plus,
  Send,
  RotateCcw,
  Sparkles,
  Search,
  Calendar,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { SessionContext } from "../../../shared/session/SessionContext.jsx";
import { useChat } from "../../../shared/chat/ChatContext.jsx";
import { AssistancePanel } from "./AssistancePanel";
import {
  createConversation,
  getConversation,
  getTrace,
  sendMessage,
  type ChatResponse,
  type ChatRequest,
  type Option,
  type Proposal,
} from "../api/chat";

export default function AssistantDrawer() {
  const { isChatOpen, closeChat, goToLogin } = useChat();
  const { user } = (useContext(SessionContext) as unknown as {
    user: { userId?: string; name?: string } | null;
  }) || { user: null };
  const owner = user?.userId;

  const [id, setId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );
  const [text, setText] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showTraces, setShowTraces] = useState(false);
  const [trace, setTrace] = useState<
    { node: string; outcome: string; plan_version: number }[]
  >([]);

  const uncertain = useRef<ChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messages.length > 0 && typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy, result]);

  // Load existing conversation on user change
  useEffect(() => {
    let active = true;
    setId(null);
    setMessages([]);
    setResult(null);
    setError("");
    uncertain.current = null;
    if (!owner) return;

    const saved = localStorage.getItem(`booking-assistant:${owner}`);
    if (saved) {
      getConversation(saved)
        .then((data) => {
          if (!active) return;
          setId(saved);
          setMessages(
            data.messages.map(({ role, text }) => ({ role, text })),
          );
          if (data.pending_turn) {
            uncertain.current = data.pending_turn;
            setError(
              "Yêu cầu trước chưa trả lời xong. Thử lại để lấy kết quả với cùng mã yêu cầu.",
            );
          }
          const last = [...data.messages]
            .reverse()
            .find((m) => m.response)?.response;
          if (last) {
            setResult({
              ...last,
              options: data.state.options,
              assistance: data.state.assistance || null,
              proposals: data.state.pending_negotiation?.proposals || [],
              pending_negotiation: data.state.pending_negotiation || null,
              selected_option_id: data.state.selected_option_id,
              confirmation_id: data.state.confirmation_id,
              requires_confirmation:
                !!data.state.confirmation_id &&
                !data.state.pending_booking &&
                !data.state.booking,
              booking: data.state.booking,
              action: data.state.next_action,
            });
          }
        })
        .catch(() => {
          if (active) localStorage.removeItem(`booking-assistant:${owner}`);
        });
    }
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

  const reset = async () => {
    if (
      busy ||
      uncertain.current ||
      ["RETRY_BOOKING", "RETRY_CANCELLATION"].includes(result?.action || "")
    )
      return;
    if (owner) localStorage.removeItem(`booking-assistant:${owner}`);
    setId(null);
    setMessages([]);
    setResult(null);
    setTrace([]);
    setError("");
    uncertain.current = null;
  };

  const handleShowTrace = async () => {
    if (!id) return;
    try {
      setShowTraces(!showTraces);
      if (!showTraces) {
        const data = await getTrace(id);
        setTrace(data.traces);
      }
    } catch {
      setError("Chưa tải được các bước xử lý.");
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && !busy && owner && !uncertain.current) {
      void post({ text: text.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sendSuggestion = (promptText: string) => {
    if (busy || !owner || !!uncertain.current) return;
    void post({ text: promptText });
  };

  const selected = result?.options?.find(
    (o) => o.option_id === result.selected_option_id,
  );

  if (!isChatOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9988] transition-opacity"
        onClick={closeChat}
      />

      {/* Main Amazon Q Style Side Drawer */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-[9989] w-full sm:w-[440px] md:w-[480px] bg-slate-900 text-slate-100 shadow-2xl flex flex-col border-r border-slate-800 animate-in slide-in-from-left duration-300"
        aria-label="Khung chat trợ lý AI"
      >
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Hexagon AI Logo */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Sparkles size={16} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
                Trợ lý AI ĐẶT SÂN 247
              </span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                {result?.provider === "fake" ? "Chế độ Offline" : "Online"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              disabled={
                busy ||
                !!uncertain.current ||
                ["RETRY_BOOKING", "RETRY_CANCELLATION"].includes(
                  result?.action || "",
                )
              }
              title="Cuộc trò chuyện mới"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30"
            >
              <Plus size={18} />
            </button>
            {id && (
              <button
                onClick={handleShowTrace}
                title="Xem các bước xử lý (Trace)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={17} />
              </button>
            )}
            <button
              onClick={closeChat}
              title="Đóng khung chat"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Đóng"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </header>

        {/* Not Logged In Warning (if opened directly) */}
        {!owner && (
          <div className="m-4 p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
              <span>Cần đăng nhập để sử dụng đầy đủ trợ lý AI.</span>
            </div>
            <button
              onClick={goToLogin}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs"
            >
              Đăng nhập
            </button>
          </div>
        )}

        {/* Scrollable Chat / Initial Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200 text-sm">
          {/* Traces View */}
          {showTraces && trace.length > 0 && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5 font-mono">
              <p className="text-slate-400 font-bold mb-1">
                Các bước xử lý Agent Trace:
              </p>
              {trace.map((step, idx) => (
                <div key={idx} className="flex gap-2 text-slate-300">
                  <span className="text-indigo-400">[{step.node}]</span>
                  <span>{step.outcome}</span>
                  <span className="text-slate-500">(v{step.plan_version})</span>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE: Matches the AWS Console Amazon Q Screenshot */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-6 pb-2 text-center">
              {/* Central Hexagon Logo */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-xl shadow-indigo-500/10 mb-4 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                  <Sparkles size={32} className="text-emerald-400" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">
                Tôi có thể giúp gì cho bạn hôm nay?
              </h2>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Mô tả điều bạn muốn làm với ĐẶT SÂN 247 e.g., 'Tìm sân tối mai gần
                Cầu Giấy'.
              </p>

              {/* Main Input Box styled like the Amazon Q screenshot */}
              <div className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl text-left focus-within:border-emerald-500 transition-colors mb-6">
                <textarea
                  ref={textareaRef}
                  id="assistant-input-empty"
                  aria-label="Yêu cầu đặt sân"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mô tả điều bạn muốn làm với ĐẶT SÂN 247 e.g., 'Tìm sân tối mai lúc 19:00, chơi 2 tiếng, dưới 250k gần Cầu Giấy'..."
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 resize-none outline-none"
                  maxLength={2000}
                  disabled={busy || !owner || !!uncertain.current}
                />
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 mt-1 text-[11px] text-slate-400">
                  <span>Tối đa 2,000 ký tự</span>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={
                      busy || !owner || !text.trim() || !!uncertain.current
                    }
                    aria-label="Gửi"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium flex items-center gap-1.5 disabled:opacity-40 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Send size={13} />
                    <span>Gửi</span>
                  </button>
                </div>
              </div>

              {/* Suggestion Cards styled exactly like the AWS cards with tags */}
              <div className="w-full space-y-3 text-left">
                {/* Card 1 */}
                <button
                  onClick={() =>
                    sendSuggestion(
                      "Tối mai khoảng 19:00, chơi 2 tiếng, dưới 250 nghìn, gần Cầu Giấy",
                    )
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all text-left flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-100 text-xs group-hover:text-emerald-400 transition-colors">
                      Tìm sân cầu lông trống tối nay
                    </span>
                    <Search
                      size={14}
                      className="text-slate-400 group-hover:text-emerald-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Tìm sân trống quanh khu vực Cầu Giấy từ 19:00 đến 21:00 với
                    mức giá ưu đãi.
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-medium">
                    Đặt sân
                  </span>
                </button>

                {/* Card 2 */}
                <button
                  onClick={() =>
                    sendSuggestion("Xem danh sách lịch đặt sân của tôi")
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all text-left flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-100 text-xs group-hover:text-emerald-400 transition-colors">
                      Tra cứu lịch đặt sân của tôi
                    </span>
                    <Calendar
                      size={14}
                      className="text-slate-400 group-hover:text-emerald-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Xem danh sách các booking đã xác nhận, chi tiết giờ chơi và mã
                    đặt sân.
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-medium">
                    Lịch cá nhân
                  </span>
                </button>

                {/* Card 3 */}
                <button
                  onClick={() =>
                    sendSuggestion(
                      "Chính sách hủy sân và giá thuê sân các khung giờ",
                    )
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all text-left flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-100 text-xs group-hover:text-emerald-400 transition-colors">
                      Chính sách hủy sân & bảng giá
                    </span>
                    <HelpCircle
                      size={14}
                      className="text-slate-400 group-hover:text-emerald-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Quy định hoàn tiền khi hủy lịch và mức giá giờ vàng các sân
                    tiêu chuẩn.
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-medium">
                    Hỏi đáp
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* CONVERSATION ACTIVE STATE */
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                      message.role === "user"
                        ? "bg-emerald-700 text-white rounded-tr-sm"
                        : "bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-sm"
                    }`}
                  >
                    <p className="font-semibold text-[11px] text-slate-300 mb-1">
                      {message.role === "user" ? "Bạn" : "Trợ lý AI"}
                    </p>
                    {message.text}
                  </div>
                </div>
              ))}

              {/* Busy / Typing Indicator */}
              {busy && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-9">
                  <RefreshCw size={14} className="animate-spin text-emerald-400" />
                  <span>Đang suy nghĩ và kiểm tra lịch sân...</span>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/50 text-red-200 text-xs space-y-2"
                >
                  <p>{error}</p>
                  <button
                    onClick={() => post({ text: "Thử lại" }, true)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-medium"
                  >
                    Thử lại yêu cầu vừa gửi
                  </button>
                </div>
              )}

              {/* Assistance Panel (Booking list, cancellation preview, etc.) */}
              {result?.assistance && (
                <div className="pl-9 space-y-2">
                  <AssistancePanel
                    data={result.assistance}
                    disabled={busy || !!uncertain.current}
                    post={post}
                  />
                </div>
              )}

              {/* Options Cards */}
              {result?.options && result.options.length > 0 && (
                <div className="pl-9 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-400">
                    Các sân trống tìm thấy:
                  </p>
                  {result.options.map((option: Option) => (
                    <article
                      key={option.option_id}
                      className="p-3.5 rounded-xl bg-slate-800/80 border border-emerald-600/40 space-y-2"
                    >
                      <h4 className="font-bold text-emerald-400 text-xs">
                        {option.court_name} · {option.center_name}
                      </h4>
                      <p className="text-xs text-slate-300">
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
                      <p className="text-xs font-semibold text-amber-300">
                        {option.total_price_vnd.toLocaleString("vi-VN")} đ
                      </p>
                      {option.relaxed_fields.length > 0 && (
                        <p className="text-[11px] text-amber-400">
                          Theo ưu tiên mềm:{" "}
                          {option.relaxed_fields
                            .map((f) =>
                              f === "area"
                                ? "ngoài khu vực ưu tiên"
                                : "giờ gần giờ ưu tiên",
                            )
                            .join(", ")}
                        </p>
                      )}
                      <button
                        disabled={
                          busy ||
                          !!uncertain.current ||
                          ["RETRY_BOOKING", "RETRY_CANCELLATION"].includes(
                            result?.action || "",
                          )
                        }
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-40 transition-colors"
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
                  ))}
                </div>
              )}

              {/* Proposal Cards */}
              {result?.proposals && result.proposals.length > 0 && (
                <section
                  aria-label="Đề xuất thay đổi điều kiện"
                  className="pl-9 space-y-2.5"
                >
                  <p className="text-xs font-semibold text-amber-400">
                    Đề xuất thay đổi điều kiện:
                  </p>
                  {result.proposals.map((proposal: Proposal) => {
                    const expired =
                      new Date(proposal.expires_at).getTime() <= Date.now();
                    const disabled =
                      busy ||
                      !!uncertain.current ||
                      expired ||
                      ["RETRY_BOOKING", "RETRY_CANCELLATION"].includes(
                        result?.action || "",
                      );
                    return (
                      <article
                        key={proposal.proposal_id}
                        className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/50 space-y-2"
                      >
                        <h4 className="font-bold text-amber-300 text-xs">
                          {proposal.court_name} · {proposal.center_name}
                        </h4>
                        <p className="text-xs text-slate-300">
                          {new Date(proposal.start).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}{" "}
                          →{" "}
                          {new Date(proposal.end).toLocaleTimeString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs font-semibold text-amber-300">
                          {proposal.total_price_vnd.toLocaleString("vi-VN")} đ
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            disabled={disabled}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs disabled:opacity-40"
                            onClick={() =>
                              post({
                                text: "Đồng ý đổi điều kiện theo đề xuất",
                                action: "accept_proposal",
                                proposal_id: proposal.proposal_id,
                              })
                            }
                          >
                            Đồng ý đổi điều kiện
                          </button>
                          <button
                            disabled={disabled}
                            className="py-1.5 px-3 rounded-lg border border-slate-600 hover:bg-slate-800 text-slate-300 text-xs disabled:opacity-40"
                            onClick={() =>
                              post({
                                text: "Từ chối đề xuất, giữ điều kiện hiện tại",
                                action: "reject_proposal",
                                proposal_id: proposal.proposal_id,
                              })
                            }
                          >
                            Giữ điều kiện hiện tại
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

              {/* Booking Confirmation Card */}
              {result?.requires_confirmation && selected && (
                <section className="pl-9 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/60 space-y-2.5">
                  <h3 className="font-bold text-emerald-300 text-sm">
                    Xác nhận đặt sân
                  </h3>
                  <p className="text-xs text-slate-200">
                    {selected.court_name} · {selected.center_name}
                  </p>
                  <p className="text-xs text-slate-300">
                    {new Date(selected.start).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}{" "}
                    –{" "}
                    {new Date(selected.end).toLocaleTimeString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                  <p className="text-xs font-bold text-amber-300">
                    Tổng: {selected.total_price_vnd.toLocaleString("vi-VN")} đ
                  </p>
                  <button
                    disabled={busy || !!uncertain.current}
                    onClick={() =>
                      post({
                        text: "Xác nhận đặt sân",
                        action: "confirm",
                        confirmation_id: result.confirmation_id!,
                      })
                    }
                    className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all"
                  >
                    Xác nhận đặt sân
                  </button>
                </section>
              )}

              {/* Booking Success / Cancelled Status */}
              {result?.booking && (
                <section className="pl-9 p-3.5 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-xs space-y-1">
                  <h4 className="font-bold text-emerald-400">
                    {result.booking.status === "CANCELLED"
                      ? "Booking đã hủy"
                      : "Booking đã xác nhận thành công!"}
                  </h4>
                  <p className="text-slate-300">Mã booking: {result.booking.id}</p>
                  <p className="text-amber-300 font-semibold">
                    Tổng giá: {result.booking.totalPrice.toLocaleString("vi-VN")}{" "}
                    đ
                  </p>
                </section>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Area when conversation is active */}
        {messages.length > 0 && (
          <footer className="p-3 bg-slate-950 border-t border-slate-800 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label className="sr-only" htmlFor="assistant-input-bottom">
                Yêu cầu đặt sân
              </label>
              <input
                id="assistant-input-bottom"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
                disabled={busy || !owner || !!uncertain.current}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500"
                placeholder="Nhập yêu cầu tiếp theo hoặc câu hỏi..."
              />
              <button
                type="submit"
                disabled={busy || !owner || !text.trim() || !!uncertain.current}
                aria-label="Gửi"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white disabled:opacity-40 transition-colors shadow-sm"
              >
                <Send size={15} />
              </button>
            </form>
          </footer>
        )}
      </aside>
    </>
  );
}
