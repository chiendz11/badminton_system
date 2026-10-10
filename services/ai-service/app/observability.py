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
logger = logging.getLogger("badminton-ai")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)
logger.propagate = False


def log(event: str, **fields):
    logger.info(json.dumps({"service": "ai-service", "event": event, **fields}, ensure_ascii=False))
