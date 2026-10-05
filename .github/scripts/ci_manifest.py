"""Validated declarative CI graph. This module never scans the old codebase."""
from pathlib import Path, PurePosixPath
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / '.github/ci/components.yml'
RUNTIMES = {'node', 'python', 'web', 'contract', 'shared'}


def safe_path(value, label, allow_root=False):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError(f'{label}: expected a repository-relative POSIX path')
    path = PurePosixPath(value)
    if path.is_absolute() or '..' in path.parts or (str(path) == '.' and not allow_root):
        raise ValueError(f'{label}: unsafe path {value!r}')
    if not re.fullmatch(r'[A-Za-z0-9_./-]+', value):
        raise ValueError(f'{label}: unsupported path characters')
    return value


def load_manifest():
    config = yaml.safe_load(MANIFEST.read_text())
    if not isinstance(config, dict) or config.get('version') != 1:
        raise ValueError('Expected components manifest version 1')
    if not isinstance(config.get('configuration_only'), bool):
        raise ValueError('configuration_only must be explicitly true or false')
    defaults = config.get('defaults', {})
    components = config.get('components')
    if not isinstance(components, dict) or not components:
        raise ValueError('components must be a nonempty mapping')
    paths = set()
    for name, entry in components.items():
        if not re.fullmatch(r'[a-z][a-z0-9_]*', name):
            raise ValueError(f'Invalid component name: {name}')
        if not isinstance(entry, dict) or entry.get('runtime') not in RUNTIMES:
            raise ValueError(f'{name}: unsupported runtime')
        path = safe_path(entry.get('path'), name)
        if path in paths:
            raise ValueError(f'Duplicate component path: {path}')
        paths.add(path)
        dependencies = entry.get('depends_on', [])
        if not isinstance(dependencies, list) or any(dep not in components for dep in dependencies):
            raise ValueError(f'{name}: depends_on references unknown components')
        if len(dependencies) != len(set(dependencies)) or name in dependencies:
            raise ValueError(f'{name}: duplicate/self dependencies')
        if entry['runtime'] in {'node', 'web'}:
            manager = entry.get('package_manager', defaults.get('package_manager'))
            if manager not in {'npm', 'pnpm'}:
                raise ValueError(f'{name}: package_manager must be npm or pnpm')
        if entry['runtime'] in {'node', 'python', 'web'}:
            if not isinstance(entry.get('docker', False), bool):
                raise ValueError(f'{name}: docker must be boolean')
            safe_path(entry.get('install_path', defaults.get('install_path', path)), name + '.install_path', True)
            safe_path(entry.get('lockfile', defaults.get('lockfile', 'uv.lock')), name + '.lockfile')
            if entry.get('docker'):
                safe_path(entry.get('dockerfile', path + '/Dockerfile'), name + '.dockerfile')
                safe_path(entry.get('docker_context', '.'), name + '.docker_context', True)
        if entry['runtime'] == 'node' and entry.get('database', 'none') not in {'none', 'postgres', 'mongodb'}:
            raise ValueError(f'{name}: unsupported database')
        if 'prisma' in entry and not isinstance(entry['prisma'], bool):
            raise ValueError(f'{name}: prisma must be boolean')
        if entry.get('prisma') and entry.get('database') != 'postgres':
            raise ValueError(f'{name}: Prisma migration CI requires postgres')
        if entry['runtime'] == 'python':
            golden = entry.get('golden', {})
            for metric in ['schema_validity', 'constraint_f1', 'critical_field_accuracy']:
                value = golden.get(metric)
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 1:
                    raise ValueError(f'{name}: invalid golden threshold {metric}')
            if golden['schema_validity'] != 1:
                raise ValueError(f'{name}: schema_validity threshold must equal 1')
    for name, entry in components.items():
        for other, sibling in components.items():
            if name != other and sibling['path'].startswith(entry['path'] + '/'):
                raise ValueError(f'Nested component paths are ambiguous: {name}, {other}')
    visiting, visited = set(), set()
    def visit(name):
        if name in visiting:
            raise ValueError(f'CI dependency cycle at {name}')
        if name in visited:
            return
        visiting.add(name)
        for dependency in components[name].get('depends_on', []):
            visit(dependency)
        visiting.remove(name)
        visited.add(name)
    for name in components:
        visit(name)
    patterns = config.get('global_paths', [])
    if not isinstance(patterns, list) or any(not isinstance(p, str) or p.startswith('/') or '..' in PurePosixPath(p).parts for p in patterns):
        raise ValueError('global_paths must contain repository-relative globs')
    if not config['configuration_only']:
        for name, entry in components.items():
            folder = ROOT / entry['path']
            if not folder.is_dir():
                raise ValueError(f'{name}: missing source path; keep configuration_only=true until adoption')
    return config


if __name__ == '__main__':
    manifest = load_manifest()
    print(f"Validated {len(manifest['components'])} components; configuration_only={manifest['configuration_only']}")
