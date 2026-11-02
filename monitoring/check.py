"""Validate the shared monitoring sources without starting application services."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import yaml


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--promtool", help="Optional native promtool executable")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    values = yaml.safe_load((root / "chart/values.yaml").read_text())
    enabled = {name for name, item in values["services"].items() if item["enabled"]}
    prometheus = yaml.safe_load((root / "prometheus.yml").read_text())
    jobs = {item["job_name"] for item in prometheus["scrape_configs"]}
    if jobs != enabled:
        raise ValueError("Local scrape jobs must match the default enabled services")
    expected_rules = {f"/etc/prometheus/rules/{name}.yml" for name in enabled}
    if set(prometheus["rule_files"]) != expected_rules:
        raise ValueError("Local Prometheus must load the canonical enabled rule files")

    subprocess.run(["helm", "lint", str(root / "chart"), "--strict"], check=True)
    rendered = subprocess.check_output(
        ["helm", "template", "badminton-monitoring", str(root / "chart")], text=True
    )
    documents = [doc for doc in yaml.safe_load_all(rendered) if doc]
    for kind in ["ServiceMonitor", "PrometheusRule"]:
        names = {doc["metadata"]["name"] for doc in documents if doc["kind"] == kind}
        if names != enabled:
            raise ValueError(f"{kind} must be rendered only for enabled services")
    for document in documents:
        if document["kind"] == "PrometheusRule":
            name = document["metadata"]["name"]
            source = yaml.safe_load((root / "chart/rules" / f"{name}.yml").read_text())
            if document["spec"] != source:
                raise ValueError(f"Rendered rules differ from the local source: {name}")
        elif document["kind"] == "ConfigMap":
            for name, content in document["data"].items():
                source = json.loads((root / "chart/dashboards" / name).read_text())
                if json.loads(content) != source:
                    raise ValueError(f"Rendered dashboard differs from local: {name}")

    # Resolve Compose in memory only: its output may contain private .env values.
    compose = json.loads(subprocess.check_output(
        ["docker", "compose", "--profile", "monitoring", "config", "--format", "json"],
        cwd=root.parent, text=True,
    ))
    for name in ["prometheus", "grafana", "alertmanager"]:
        if compose["services"][name].get("profiles") != ["monitoring"]:
            raise ValueError(f"Monitoring service must remain optional: {name}")
    mounts = [
        ("prometheus", "chart/rules", "/etc/prometheus/rules"),
        ("grafana", "chart/dashboards", "/var/lib/grafana/dashboards"),
    ]
    for service, source, target in mounts:
        expected = str((root / source).resolve())
        if not any(
            item.get("source") == expected and item.get("target") == target
            and item.get("read_only")
            for item in compose["services"][service]["volumes"]
        ):
            raise ValueError(f"{service} must mount the canonical {source} read-only")
    mappings = [("api", "booking"), ("gateway", "gateway"), ("ai", "ai")]
    for service, token in mappings:
        supplied = compose["services"][service]["environment"]["METRICS_TOKEN"]
        mounted = compose["configs"][f"{token}-metrics-token"]["content"]
        if not supplied or supplied != mounted:
            raise ValueError(f"Local scrape credential does not match service: {service}")
    if args.promtool:
        rules = sorted(str(path) for path in (root / "chart/rules").glob("*.yml"))
        subprocess.run([args.promtool, "check", "rules", *rules], check=True)
        with tempfile.TemporaryDirectory(prefix="badminton-promtool-") as temporary:
            directory = Path(temporary)
            token = directory / "token"
            token.write_text("validation-only")
            prometheus["rule_files"] = [str(root / "chart/rules" / f"{name}.yml") for name in sorted(enabled)]
            for job in prometheus["scrape_configs"]:
                job["authorization"]["credentials_file"] = str(token)
            config = directory / "prometheus.yml"
            config.write_text(yaml.safe_dump(prometheus))
            subprocess.run([args.promtool, "check", "config", str(config)], check=True)
            queries = []
            for dashboard in (root / "chart/dashboards").glob("*.json"):
                for panel in json.loads(dashboard.read_text())["panels"]:
                    for target in panel.get("targets", []):
                        queries.append({"record": f"monitoring_validation_query_{len(queries)}", "expr": target["expr"].replace("$environment", "local")})
            query_file = directory / "dashboard-queries.yml"
            query_file.write_text(yaml.safe_dump({"groups": [{"name": "dashboard-validation", "rules": queries}]}))
            subprocess.run([args.promtool, "check", "rules", str(query_file)], check=True)
    print(f"Monitoring sources valid: {len(enabled)} active services; shared rules/dashboard match Helm output")


if __name__ == "__main__":
    main()
