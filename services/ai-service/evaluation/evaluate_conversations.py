"""Run deterministic multi-turn API scenarios against isolated test fixtures."""

import json
import os
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from time import perf_counter


def main():
    started = perf_counter()
    with tempfile.TemporaryDirectory(prefix="ai-conversation-evaluation-") as folder:
        junit = Path(folder) / "results.xml"
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "pytest",
                "tests/integration/test_negotiation.py",
                "tests/integration/test_assistance.py",
                "-q",
                "--junitxml=" + str(junit),
            ],
            check=False,
        )
        suites = ET.parse(junit).getroot().findall("testsuite")
        report = {
            key: sum(int(suite.get(key, "0")) for suite in suites)
            for key in ["tests", "failures", "errors", "skipped"]
        }
        report["suite_elapsed_seconds"] = round(perf_counter() - started, 6)
        report["note"] = (
            "Fake parser + HTTP Core protocol fixture + isolated SQLite/checkpoints. This is not live PostgreSQL/Core or real LLM evaluation."
        )
        path = Path(os.environ.get("CONVERSATION_REPORT", "reports/conversations.json"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report))
        return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
