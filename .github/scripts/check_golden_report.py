"""Enforce golden evaluation metrics produced by the future AI service."""
import json
import math
import os
from pathlib import Path

report = json.loads(Path(os.environ.get('GOLDEN_REPORT', 'reports/golden.json')).read_text())
thresholds = json.loads(os.environ['GOLDEN_THRESHOLDS'])
count = report.get('sample_count')
if isinstance(count, bool) or not isinstance(count, int) or count < 1:
    raise SystemExit('Golden evaluation must run at least one sample')
if report.get('suite') != os.environ.get('GOLDEN_SUITE', 'small'):
    raise SystemExit('Golden report must identify the requested suite')
for metric, threshold in thresholds.items():
    value = report.get(metric)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise SystemExit(f'Missing or invalid golden metric: {metric}')
    if value < threshold:
        raise SystemExit(f'{metric}: {value} is below threshold {threshold}')
    print(f'{metric}: {value} >= {threshold}')
