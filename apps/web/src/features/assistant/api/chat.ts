import http from "../../../shared/api/http.js";
export interface Option {
  option_id: string;
  center_name: string;
  court_name: string;
  start: string;
  end: string;
  total_price_vnd: number;
  relaxed_fields: string[];
}
export interface ChatResponse {
  conversation_id: string;
  assistant_message: string;
  action: string;
  options: Option[];
  assistance?: AssistanceResult | null;
  proposals?: Proposal[];
  diagnostics?: {
    coverage: string;
    candidate_count: number;
    dominant_violations: string[];
  } | null;
  search_metadata?: {
    search_id: string;
    constraints_version: number;
    searched_at: string;
    centers_queried: number;
  } | null;
  pending_negotiation?: { proposals: Proposal[]; expires_at: string } | null;
  selected_option_id: string | null;
  confirmation_id: string | null;
  requires_confirmation: boolean;
  booking: { id: string; status: string; totalPrice: number } | null;
  provider: string;
  slot_minutes: number;
  plan_version: number;
}
export interface Proposal {
  proposal_id: string;
  center_name: string;
  court_name: string;
  start: string;
  end: string;
  total_price_vnd: number;
  expires_at: string;
  requires_constraint_change: true;
  violations: {
    field: string;
    requested: string | number | null;
    actual: string | number;
    delta: number | null;
  }[];
  suggested_changes: { field: string; value: string | number }[];
}
export interface ChatRequest {
  text: string;
  client_message_id: string;
  action?:
    | "select"
    | "confirm"
    | "retry"
    | "accept_proposal"
    | "reject_proposal"
    | "select_booking"
    | "confirm_cancellation"
    | "dismiss_cancellation"
    | "retry_cancellation"
    | "more_bookings";
  option_id?: string;
  confirmation_id?: string;
  proposal_id?: string;
  booking_choice_id?: string;
  cancellation_id?: string;
}
export async function createConversation() {
  return (await http.post("/api/conversations", {})).data as {
    conversation_id: string;
    provider: string;
  };
}
export async function getConversation(id: string) {
  return (await http.get(`/api/conversations/${id}`)).data as {
    conversation_id: string;
    pending_turn: ChatRequest | null;
    messages: { role: string; text: string; response?: ChatResponse }[];
    state: {
      options: Option[];
      selected_option_id: string | null;
      confirmation_id: string | null;
      booking: ChatResponse["booking"];
      next_action: string;
      pending_booking: unknown | null;
      pending_cancellation?: unknown | null;
      assistance?: AssistanceResult | null;
      pending_negotiation?: {
        proposals: Proposal[];
        expires_at: string;
      } | null;
    };
  };
}
export async function sendMessage(id: string, request: ChatRequest) {
  return (
    await http.post(`/api/conversations/${id}/messages`, request, {
      timeout: 65000,
    })
  ).data as ChatResponse;
}
export async function getTrace(id: string) {
  return (await http.get(`/api/conversations/${id}/trace`)).data as {
    traces: { node: string; outcome: string; plan_version: number }[];
  };
}

export interface BookingCard {
  choice_id: string;
  booking_id: string;
  center_name: string;
  date: string;
  status: "CONFIRMED" | "CANCELLED";
  total_price_vnd: number;
  slots: string[];
  cancellable: boolean;
}
export interface AssistanceResult {
  kind: "bookings" | "statistics" | "centers" | "faq" | "cancellation";
  bookings: BookingCard[];
  centers: {
    center_id: string;
    name: string;
    address: string;
    opening_hours: string | null;
    active_courts: number | null;
    pricing: string[];
    description: string | null;
  }[];
  statistics: {
    confirmed: number;
    cancelled: number;
    booked_court_hours: number;
    confirmed_booking_value_vnd: number;
    centers: { name: string; bookings: number }[];
  } | null;
  citations: {
    article_id: string;
    title: string;
    version: string;
    source_paths: string[];
    excerpt: string;
  }[];
  cancellation: {
    cancellation_id: string;
    expires_at: string;
    booking: BookingCard;
  } | null;
  cancellation_pending: boolean;
  has_more: boolean;
  coverage: "complete" | "partial";
  scope: string;
  notice: string;
}
