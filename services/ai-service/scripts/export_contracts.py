"""Export native FastAPI schemas without a lifespan, DB connection or provider call.

Run from services/ai-service: python -m scripts.export_contracts
Proposed routes/components and hand-authored ownership metadata are preserved.
"""

import json
from pathlib import Path

from app.main import create_app
from app.schemas import MessageRequest

ROOT = Path(__file__).resolve().parents[3]


def main():
    path = ROOT / "contracts/ai/openapi.json"
    document = json.loads(path.read_text())
    runtime = create_app(service=object(), config=object()).openapi()
    for route, item in runtime["paths"].items():
        existing = document["paths"].get(route, {})
        for method, operation in item.items():
            metadata = {
                k: v
                for k, v in existing.get(method, {}).items()
                if k.startswith("x-") or k == "security"
            }
            operation.update(metadata)
            operation["x-implementation-status"] = "implemented"
        document["paths"][route] = item
    document["components"]["schemas"].update(runtime["components"]["schemas"])
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    request_path = ROOT / "contracts/ai-tools/conversation-message.schema.json"
    original = json.loads(request_path.read_text())
    schema = {k: original[k] for k in ("$schema", "$id", "description") if k in original}
    schema.update(MessageRequest.model_json_schema())
    request_path.write_text(json.dumps(schema, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
