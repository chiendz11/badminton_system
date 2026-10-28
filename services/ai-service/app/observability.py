import json
import logging

from prometheus_client import CollectorRegistry, Counter, Histogram

registry = CollectorRegistry()
requests = Counter(
    "ai_http_requests_total", "Completed requests", ["method", "route", "status"], registry=registry
)
latency = Histogram("ai_http_duration_seconds", "HTTP latency", ["route"], registry=registry)
actions = Counter("ai_agent_actions_total", "Planner decisions", ["action"], registry=registry)
tools = Counter(
    "ai_tool_calls_total", "Allowlisted tool calls", ["tool", "outcome"], registry=registry
)
llm_tokens = Counter("ai_llm_tokens_total", "LLM token use", ["direction"], registry=registry)
search_outcomes = Counter(
    "ai_search_outcomes_total", "Bounded Core search outcomes", ["outcome"], registry=registry
)
near_misses = Counter(
    "ai_near_miss_candidates_total", "Eligible near-miss candidates", registry=registry
)
proposals = Counter("ai_proposals_total", "Proposal lifecycle", ["outcome"], registry=registry)
negotiation_turns = Histogram(
    "ai_negotiation_turns",
    "Turns in a negotiation",
    buckets=(1, 2, 3, 5, 10, 20, 50),
    registry=registry,
)
revalidation_failures = Counter(
    "ai_revalidation_failures_total",
    "Fresh proposal revalidation failures",
    ["reason"],
    registry=registry,
)
guard_rejections = Counter(
    "ai_constraint_guard_rejections_total",
    "Rejected unsafe or stale actions",
    ["reason"],
    registry=registry,
)
search_duration = Histogram(
    "ai_search_duration_seconds", "Search stage duration", ["stage"], registry=registry
)
parser_failures = Counter(
    "ai_parser_failures_total", "Parser exception/schema failures", registry=registry
)
logger = logging.getLogger("badminton-ai")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)
logger.propagate = False


def log(event: str, **fields):
    logger.info(json.dumps({"service": "ai-service", "event": event, **fields}, ensure_ascii=False))
