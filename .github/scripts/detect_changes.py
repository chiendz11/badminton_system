#!/usr/bin/env python3
"""Map git changes to manifest components, then expand reverse dependencies."""
import fnmatch
import json
import os
from pathlib import Path
import re
import subprocess
from ci_manifest import ROOT, load_manifest


def changed_files():
    event = os.environ.get('EVENT_NAME', '')
    base = os.environ.get('BASE_SHA', '')
    head = os.environ.get('HEAD_SHA', 'HEAD')
    if event in {'workflow_dispatch', 'schedule'} or not base or set(base) == {'0'}:
        return [], True
    for sha in [base, head]:
        if sha != 'HEAD' and not re.fullmatch(r'[0-9a-f]{40}', sha):
            raise ValueError('Expected a Git commit SHA')
    if event == 'pull_request':
        base = subprocess.check_output(['git', 'merge-base', base, head], cwd=ROOT, text=True).strip()
    changed = subprocess.check_output(['git', 'diff', '--no-renames', '--name-only', '-z', base, head], cwd=ROOT)
    return [p for p in changed.decode().split('\0') if p], False


def affected_components(config, files, full):
    components = config['components']
    if full or any(fnmatch.fnmatchcase(file, pattern) for file in files for pattern in config.get('global_paths', [])):
        return set(components)
    selected = {name for name, component in components.items() if any(file == component['path'] or file.startswith(component['path'] + '/') for file in files)}
    # Lockfiles only affect the workspace/components that use that install root.
    for name, item in components.items():
        if item['runtime'] not in {'node', 'web', 'python'}:
            continue
        defaults = config.get('defaults', {})
        install = item.get('install_path', defaults.get('install_path', item['path']))
        lock = item.get('lockfile', defaults.get('lockfile', 'uv.lock'))
        install_files = {str(Path(install) / basename) for basename in [lock, 'package.json', 'pnpm-workspace.yaml', '.npmrc']}
        if files and set(files) & install_files:
            selected.add(name)
    # Changing provider implementation alone does not imply every consumer changed.
    # API/event/shared package edges drive consumer selection instead.
    while True:
        expanded = selected | {name for name, item in components.items() if set(item.get('depends_on', [])) & selected}
        if expanded == selected:
            return selected
        selected = expanded


def matrix_entry(name, item, config):
    defaults = config.get('defaults', {})
    entry = {'name': name, 'path': item['path']}
    if item['runtime'] in {'node', 'web'}:
        for key in ['node_version', 'package_manager', 'package_manager_version', 'install_path', 'lockfile']:
            entry[key] = item.get(key, defaults[key])
        entry['database'] = item.get('database', 'none')
        entry['prisma'] = item.get('prisma', False)
    if item['runtime'] == 'python':
        entry['python_version'] = item.get('python_version', defaults['python_version'])
        entry['uv_version'] = item.get('uv_version', defaults['uv_version'])
        entry['golden_thresholds'] = json.dumps(item['golden'], separators=(',', ':'))
    if item['runtime'] in {'node', 'python'}:
        entry['docker'] = item.get('docker', True)
        entry['dockerfile'] = item.get('dockerfile', item['path'] + '/Dockerfile')
        entry['docker_context'] = item.get('docker_context', '.')
    return entry


def emit(key, value):
    serialized = str(value).lower() if isinstance(value, bool) else (json.dumps(value, separators=(',', ':')) if isinstance(value, (list, dict)) else str(value))
    line = f'{key}={serialized}\n'
    print(line, end='')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write(line)


def main():
    config = load_manifest()
    if config['configuration_only']:
        selected = set()
        mode = 'configuration-only'
        message = 'CI configuration validated. Application jobs are intentionally disabled until configuration_only is set to false. No application tests ran.'
    else:
        files, full = changed_files()
        selected = affected_components(config, files, full)
        mode = 'application'
        # Validate only affected boundaries; untouched services are not probed.
        for name in selected:
            item = config['components'][name]
            if not (ROOT / item['path']).is_dir():
                raise ValueError(f"{name}: missing declared path {item['path']}. Keep configuration_only=true until the application exists.")
        message = 'Selected components: ' + (', '.join(sorted(selected)) or 'none (documentation-only change)')
    emit('mode', mode)
    emit('affected', sorted(selected))
    for runtime in ['node', 'python', 'web', 'contract']:
        include = [matrix_entry(name, config['components'][name], config) for name in sorted(selected) if config['components'][name]['runtime'] == runtime]
        emit(runtime, {'include': include})
        emit(runtime + '_count', len(include))
    print(message)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('## CI scope\n\n' + message + '\n')


if __name__ == '__main__':
    main()
