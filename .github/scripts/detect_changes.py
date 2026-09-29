#!/usr/bin/env python3
"""Discover changed Node applications. AI is deliberately outside this CI."""
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
EXCLUDED = {"BM/services/ai_service"}


def component(path, backend):
    relative = path.relative_to(ROOT).as_posix()
    if relative in EXCLUDED or not (path / "package.json").is_file():
        return None
    if not re.fullmatch(r"[A-Za-z0-9_/-]+", relative):
        raise ValueError(f"Unsupported component path: {relative}")
    package = json.loads((path / "package.json").read_text())
    declared = package.get("packageManager", "")
    if declared and not declared.startswith(("npm@", "pnpm@")):
        raise ValueError(f"{relative}: only npm/pnpm are supported")
    manager = "pnpm" if declared.startswith("pnpm@") else "npm"
    if not declared and not (path / "package-lock.json").is_file():
        manager = "pnpm"
    lockfile = "pnpm-lock.yaml" if manager == "pnpm" else "package-lock.json"
    if not (path / lockfile).is_file():
        raise ValueError(f"{relative}: commit {lockfile} before enabling CI")
    item = {"name": path.name, "path": relative, "package_manager": manager, "lockfile": lockfile}
    if backend:
        item["dockerfile"] = next((name for name in ["Dockerfile", "dockerfile"] if (path / name).is_file()), "")
        if not item["dockerfile"]:
            raise ValueError(f"{relative}: Dockerfile is required")
    return item


def main():
    service_root = ROOT / "BM/services"
    backend_paths = [ROOT / "BM/api_gateway"]
    if service_root.is_dir():
        backend_paths += sorted(p for p in service_root.iterdir() if p.is_dir())
    backend = [p for p in backend_paths if p.relative_to(ROOT).as_posix() not in EXCLUDED and (p / "package.json").is_file()]
    web = [ROOT / name for name in ["Frontend", "Admin"] if (ROOT / name / "package.json").is_file()]
    if not backend and not web:
        raise SystemExit("No application source found. This branch contains CI configuration only. Copy .github into the application repository before running Application CI; ai_service is excluded.")
    base = os.environ.get("BASE_SHA", "")
    head = os.environ.get("HEAD_SHA", "HEAD")
    full = os.environ.get("EVENT_NAME") == "workflow_dispatch" or not base or set(base) == {"0"}
    for sha in [base, head]:
        if sha and sha != "HEAD" and not re.fullmatch(r"[0-9a-f]{40}", sha):
            raise ValueError("Expected a Git commit SHA")
    files = [] if full else subprocess.check_output(
        ["git", "diff", "--no-renames", "--name-only", "-z", base, head], cwd=ROOT
    ).decode().split("\0")
    shared = full or any(re.match(r"^(\.github/|package(?:-lock)?\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|\.npmrc$|\.nvmrc$|\.node-version$|\.gitattributes$)", f) for f in files)
    backend_shared = any(re.match(r"^BM/[^/]+$|^BM/(shared|contracts|nginx)/", f) for f in files)
    selected = {}
    for kind, paths in [("backend", backend), ("web", web)]:
        selected[kind] = []
        for path in paths:
            relative = path.relative_to(ROOT).as_posix()
            changed = any(f.startswith(relative + "/") for f in files)
            if shared or (kind == "backend" and backend_shared) or changed:
                selected[kind].append(component(path, kind == "backend"))
        output = f"{kind}={json.dumps({'include': selected[kind]}, separators=(',', ':'))}\n{kind}_count={len(selected[kind])}\n"
        print(output, end="")
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
                stream.write(output)
    summary = "## Selected applications\n\n" + ("\n".join("- " + c["path"] for items in selected.values() for c in items) or "No included application changes. Documentation-only and AI-only changes do not run application jobs.")
    summary += "\n\nAI service is excluded. Docker images are built for validation only.\n"
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
            stream.write(summary)


if __name__ == "__main__":
    main()
