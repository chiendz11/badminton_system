import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.providers import FakeParser, LLMParser
from app.schemas import ParsedMessage, initial_state


async def main():
    suite = os.environ.get("GOLDEN_SUITE", "small")
    cases = [
        json.loads(line)
        for line in Path(__file__).with_name("scenarios.jsonl").read_text().splitlines()
    ]
    if suite not in {"small", "full"}:
        raise ValueError("Invalid golden suite")
    if suite == "small":
        cases = cases[:30]
    # CI uses an explicit fake. Real evaluation is opt-in and requires private env credentials.
    mode = os.environ.get("AI_PROVIDER", "fake")
    parser = FakeParser() if mode == "fake" else LLMParser(settings())
    true_positive = false_positive = false_negative = valid = critical = intents = 0
    details = []
    for case in cases:
        try:
            parsed = await parser.parse(
                case["text"], initial_state(), datetime(2030, 1, 7, 0, tzinfo=timezone.utc)
            )
            ParsedMessage.model_validate(parsed)
            valid += 1
            actual = {change.field: change.value for change in parsed.changes}
        except Exception:
            parsed, actual = None, {}
        expected = case["expected"]
        true_positive += sum(k in actual and actual[k] == v for k, v in expected.items())
        false_negative += sum(k not in actual or actual[k] != v for k, v in expected.items())
        false_positive += sum(k not in expected or expected[k] != v for k, v in actual.items())
        critical += parsed is not None and all(
            actual.get(k, object()) == v
            for k, v in expected.items()
            if k in {"date", "duration_minutes", "max_total_price_vnd"}
        )
        intents += parsed is not None and parsed.intent == case["intent"]
        details.append(
            {
                "text": case["text"],
                "expected": expected,
                "actual": actual,
                "schema_valid": parsed is not None,
                "intent_correct": parsed is not None and parsed.intent == case["intent"],
            }
        )
    denominator = 2 * true_positive + false_positive + false_negative
    report = {
        "suite": suite,
        "provider": mode,
        "sample_count": len(cases),
        "schema_validity": valid / len(cases),
        "constraint_f1": 2 * true_positive / denominator if denominator else 1,
        "critical_field_accuracy": critical / len(cases),
        "intent_accuracy": intents / len(cases),
        "results": details,
        "note": "Fake-provider regression metrics are not real LLM accuracy or end-to-end task success.",
    }
    path = Path(os.environ.get("GOLDEN_REPORT", "reports/golden.json"))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
