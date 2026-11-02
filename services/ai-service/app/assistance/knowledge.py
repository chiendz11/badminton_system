"""Small, versioned lexical retrieval; answers are curated, never generated policies."""

import json
import re
from functools import lru_cache
from pathlib import Path

from app.assistance.schemas import KnowledgeCitation
from app.domain import normalized


@lru_cache
def articles():
    return json.loads(Path(__file__).with_name("knowledge.json").read_text())


def retrieve(question):
    text = normalized(question)
    candidates = []
    for article in articles():
        score = sum(
            len(phrase.split())
            for phrase in article["phrases"]
            if re.search(r"(?<!\w)" + re.escape(normalized(phrase)) + r"(?!\w)", text)
        )
        if score >= 2:
            candidates.append((score, article))
    if not candidates:
        return (
            "Mình chưa có tài liệu đã xác minh cho câu hỏi này. Bạn có thể hỏi về lịch sử, hủy booking, slot một tiếng, giá hoặc cách xác nhận đặt sân.",
            [],
        )
    candidates.sort(key=lambda pair: (-pair[0], pair[1]["id"]))
    chosen = [a for score, a in candidates[:2] if score >= candidates[0][0] * 0.7]
    citations = [
        KnowledgeCitation(
            article_id=a["id"],
            title=a["title"],
            version=a["version"],
            source_paths=a["source_paths"],
            excerpt=a["answer"],
        )
        for a in chosen
    ]
    return "\n\n".join(a["answer"] for a in chosen), citations
