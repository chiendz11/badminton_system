"""Validate/run service-owned Python CI commands from pyproject.toml."""
import argparse
import os
from pathlib import Path
import shlex
import subprocess
import tomllib

COMMANDS = ['lint', 'typecheck', 'unit', 'integration', 'contract', 'golden', 'smoke']


def load_commands():
    if not Path('uv.lock').is_file():
        raise ValueError('Commit uv.lock for reproducible Python CI')
    config = tomllib.loads(Path('pyproject.toml').read_text())
    commands = config.get('tool', {}).get('badminton-ci', {}).get('commands', {})
    for name in COMMANDS:
        command = commands.get(name)
        if not isinstance(command, str) or not command.strip():
            raise ValueError(f'Missing tool.badminton-ci.commands.{name}; see docs/CI.md')
        if any(token in command for token in ['--fix', '--watch', '--allow-no-tests', '|| true']):
            raise ValueError(f'{name}: CI commands must be real, non-mutating, single-pass checks')
        if not shlex.split(command):
            raise ValueError(f'{name}: empty command')
    return commands


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', choices=COMMANDS)
    args = parser.parse_args()
    commands = load_commands()
    if args.run:
        env = dict(os.environ, AI_PROVIDER='fake', AI_OFFLINE='true')
        subprocess.run(['uv', 'run', '--frozen', *shlex.split(commands[args.run])], check=True, env=env)
    else:
        print('Validated Python CI commands and uv.lock; external AI credentials are not used')


if __name__ == '__main__':
    main()
