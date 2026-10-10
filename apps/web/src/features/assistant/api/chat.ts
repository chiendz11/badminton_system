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
  selected_option_id: string | null;
  confirmation_id: string | null;
  requires_confirmation: boolean;
  booking: { id: string; status: string; totalPrice: number } | null;
  provider: string;
  slot_minutes: number;
  plan_version: number;
}
export interface ChatRequest {
  text: string;
  client_message_id: string;
  action?: "select" | "confirm" | "retry";
  option_id?: string;
  confirmation_id?: string;
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
