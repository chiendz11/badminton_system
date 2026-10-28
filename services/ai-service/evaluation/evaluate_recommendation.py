"""Offline B0/B1/B2 policy evaluation, separate from real LLM/user quality."""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from pydantic import SecretStr

from app.config import Settings
from app.recommendation.constraints import evaluate_candidate
from app.recommendation.ranking import make_proposal, ranked_proposals
from app.schemas import Candidate, Constraints, SearchMetadata


def evaluate():
    dataset = json.loads((Path(__file__).parent / "fixtures/recommendation.json").read_text())
    config = Settings(
        _env_file=None,
        app_env="test",
        ai_provider="fake",
        ai_offline=True,
        jwt_secret=SecretStr("offline-policy-evaluation-private-test-key"),
        near_miss_time_minutes=60,
        near_miss_price_ratio=0.2,
        near_miss_weights={"time": 0.4, "price": 0.4, "area": 0.2},
    )
    now = datetime(2030, 1, 7, tzinfo=timezone.utc)
    totals = {name: {"returned": 0, "relevant": 0, "covered": 0} for name in ["B0", "B1", "B2"]}
    details, no_match, started = [], 0, perf_counter()
    for case in dataset["cases"]:
        constraints = Constraints.model_validate(case["constraints"])
        metadata = SearchMetadata(
            search_id=str(uuid4()), constraints_version=1, searched_at=now.isoformat()
        )
        feasible, eligible = [], []
        for item in case["candidates"]:
            start = datetime.fromisoformat(constraints.date + "T00:00:00+07:00") + timedelta(
                minutes=item["minute"]
            )
            candidate = Candidate(
                candidate_id=str(uuid4()),
                center_id="synthetic-center",
                center_name="Fixture",
                court_id=item["id"],
                court_name=item["id"],
                date=constraints.date,
                start=start.isoformat(),
                end=(start + timedelta(minutes=120)).isoformat(),
                slots=[item["minute"], item["minute"] + 60],
                total_price_vnd=item["total_price_vnd"],
                verified_at=now.isoformat(),
                area_matches=item.get("area_matches", True),
                configured_neighbor=item.get("configured_neighbor"),
            )
            violations, _ = evaluate_candidate(candidate, constraints, config)
            if not violations:
                feasible.append(candidate.court_id)
            elif len(violations) == 1 and violations[0].negotiable:
                eligible.append(
                    make_proposal(candidate, violations[0], constraints, config, metadata, now)
                )
        if feasible:
            eligible = []
        else:
            no_match += 1
        assert set(feasible) == set(case["feasible"]), case["id"]
        assert {p.court_id for p in eligible} == set(case["near_miss"]), case["id"]

        def unweighted(proposal):
            violation = proposal.violations[0]
            if violation.field == "area":
                return 1.0
            if violation.field == "max_total_price_vnd":
                return violation.relative_delta / config.near_miss_price_ratio
            return abs(violation.delta) / config.near_miss_time_minutes

        outputs = {
            "B0": [],
            "B1": sorted(eligible, key=lambda p: (unweighted(p), p.total_price_vnd, p.court_id))[
                :3
            ],
            "B2": ranked_proposals(eligible, constraints)[:3],
        }
        record = {"case": case["id"], "feasible": feasible, "rankings": {}}
        for name, proposals in outputs.items():
            ids = [p.court_id for p in proposals]
            record["rankings"][name] = ids
            totals[name]["returned"] += len(ids)
            totals[name]["relevant"] += len(set(ids) & set(case["near_miss"]))
            totals[name]["covered"] += bool(ids)
        details.append(record)
    results = {
        name: {
            "precision_at_3": count["relevant"] / count["returned"] if count["returned"] else None,
            "recommendation_coverage": count["covered"] / no_match if no_match else None,
            "proposals_returned": count["returned"],
        }
        for name, count in totals.items()
    }
    report = {
        "case_count": len(details),
        "no_match_cases": no_match,
        "baselines": results,
        "suite_elapsed_seconds": round(perf_counter() - started, 6),
        "cases": details,
        "note": "Synthetic policy correctness only. No real Core/LLM calls, user-preference labels, nDCG, production latency or capacity claims.",
    }
    path = Path(os.environ.get("RECOMMENDATION_REPORT", "reports/recommendation.json"))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "cases"}, ensure_ascii=False))
    return report


if __name__ == "__main__":
    evaluate()
