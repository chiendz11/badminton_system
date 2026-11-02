import re
from dataclasses import dataclass
from datetime import datetime

from app.domain import normalized
from app.schemas import Constraints, NegotiationContext


@dataclass
class ProposalError(Exception):
    reason: str
    message: str


def matches_proposal_words(proposal, text):
    """Bind a textual acceptance to the proposed value, not an LLM-chosen ID."""
    change = proposal.suggested_changes[0]
    words = normalized(text)
    if change.field in {"preferred_start", "earliest_start", "latest_start"}:
        values = set()
        for match in re.finditer(
            r"(?<!\d)(\d{1,2}):(\d{2})(?!\d)|(?<!\d)(\d{1,2})\s*(?:h|gio)\b(?!\s*\d)", words
        ):
            hour = int(match[1] or match[3])
            minute = int(match[2] or 0)
            suffix = words[match.end() : match.end() + 12]
            if hour < 12 and any(marker in suffix for marker in ["toi", "chieu"]):
                hour += 12
            if 0 <= hour < 24 and 0 <= minute < 60:
                values.add(hour * 60 + minute)
        return values == {change.value}
    if change.field == "max_total_price_vnd":
        values = set()
        for amount, unit in re.findall(r"(?<!\d)(\d[\d.,]*)\s*(k|nghin|ngan|vnd|dong)\b", words):
            value = int(re.sub(r"[.,]", "", amount)) * (
                1000 if unit in {"k", "nghin", "ngan"} else 1
            )
            values.add(value)
        return values == {change.value}
    return bool(re.search(r"(?<!\w)" + re.escape(normalized(str(change.value))) + r"(?!\w)", words))


def resolve_proposal(state, request, parsed, now):
    context = state.get("pending_negotiation")
    if not context:
        raise ProposalError(
            "stale_proposal", "Đề xuất không còn hiệu lực. Bạn tìm lại theo điều kiện hiện tại nhé."
        )
    context = NegotiationContext.model_validate(context)
    current = (state.get("search_result") or {}).get("search_metadata", {})
    if (
        current.get("search_id") != context.search_id
        or current.get("constraints_version") != state["version"]
    ):
        raise ProposalError("stale_proposal", "Đề xuất không thuộc kết quả tìm kiếm hiện tại.")
    if context.constraints_version != state["version"]:
        raise ProposalError("stale_proposal", "Điều kiện đã đổi; đề xuất cũ không còn hiệu lực.")
    if datetime.fromisoformat(context.expires_at) <= now:
        raise ProposalError(
            "expired_proposal", "Đề xuất đã hết hạn. Bạn tìm lại lịch và giá hiện tại nhé."
        )
    proposal = next((p for p in context.proposals if p.proposal_id == request.proposal_id), None)
    if not request.action:
        evidence = parsed.proposal_evidence or ""
        if not evidence or normalized(evidence) not in normalized(request.text):
            raise ProposalError(
                "missing_consent", "Bạn chọn rõ đề xuất muốn chấp nhận hoặc từ chối nhé."
            )
        if parsed.intent == "accept_proposal":
            words = normalized(request.text)
            if "?" in words or re.search(r"\b(?:neu|nhung)\b|duoc khong|co the", words):
                raise ProposalError(
                    "missing_consent",
                    "Câu hỏi hoặc điều kiện bổ sung chưa phải sự đồng ý rõ ràng; bạn chọn đề xuất muốn áp dụng nhé.",
                )
            if any(
                term in words
                for term in [
                    "khong dong y",
                    "khong chap nhan",
                    "khong duoc",
                    "khong lay",
                    "khong doi sang",
                    "khong phai",
                    "khong muon",
                    "khong chon",
                    "tu choi",
                ]
            ) or not any(
                term in normalized(evidence)
                for term in ["dong y", "chap nhan", "duoc", "doi", "lay", "chon"]
            ):
                raise ProposalError(
                    "missing_consent", "Mình chưa có sự đồng ý rõ ràng để đổi điều kiện."
                )
        if parsed.proposal_number and parsed.proposal_number <= len(context.proposals):
            proposal = context.proposals[parsed.proposal_number - 1]
        elif len(context.proposals) == 1 or parsed.intent == "reject_proposal":
            proposal = context.proposals[0] if context.proposals else None
    if not proposal or proposal.proposal_id not in context.proposal_ids:
        raise ProposalError(
            "invalid_proposal", "Bạn chọn một đề xuất đang hiển thị; mình chưa đổi điều kiện."
        )
    if not request.action and parsed.intent == "accept_proposal":
        ordinal = re.search(r"(?:de xuat|goi y)\s*(\d+)", normalized(request.text))
        matching = [p for p in context.proposals if matches_proposal_words(p, request.text)]
        generic = normalized(request.text).strip(" .,!?") in {
            "dong y",
            "duoc",
            "chap nhan",
            "dong y voi de xuat",
            "chap nhan de xuat",
        }
        bound = (
            (ordinal and int(ordinal[1]) == context.proposal_ids.index(proposal.proposal_id) + 1)
            or (len(matching) == 1 and matching[0].proposal_id == proposal.proposal_id)
            or (generic and len(context.proposals) == 1)
        )
        if not bound:
            raise ProposalError(
                "missing_consent",
                "Bạn nói rõ số đề xuất hoặc điều kiện muốn đổi nhé; mình chưa tự chọn.",
            )
    if proposal.search_id != context.search_id or proposal.constraints_version != state["version"]:
        raise ProposalError("stale_proposal", "Đề xuất không thuộc lần tìm kiếm hiện tại.")
    if datetime.fromisoformat(proposal.expires_at) <= now:
        raise ProposalError("expired_proposal", "Đề xuất đã hết hạn. Bạn tìm lại nhé.")
    return proposal


def approve_changes(state, proposal):
    values = dict(state["constraints"])
    for change in proposal.suggested_changes:
        if change.field in values.get("locked_fields", []):
            raise ProposalError(
                "locked_constraint",
                "Điều kiện này đã được khóa; bạn sửa yêu cầu rõ ràng trước nhé.",
            )
        if change.field in {"date", "duration_minutes"}:
            raise ProposalError(
                "invalid_proposal", "Đề xuất V1 không được đổi ngày hoặc thời lượng."
            )
        values[change.field] = change.value
    return Constraints.model_validate(values).model_dump()
