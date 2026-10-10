"""Validate OpenAPI, AsyncAPI and JSON Schemas plus positive/negative examples."""
import argparse
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlparse
import yaml
from jsonschema import validators
from openapi_spec_validator import validate_spec
from referencing import Registry, Resource
from ci_manifest import ROOT


def load(path):
    return yaml.safe_load(path.read_text()) if path.suffix in {'.yaml', '.yml'} else json.loads(path.read_text())


def retrieve(uri):
    parsed = urlparse(uri)
    if parsed.scheme != 'file':
        raise ValueError(f'Vendor referenced schema locally for reproducible validation: {uri}')
    path = Path(unquote(parsed.path)).resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError('Contract references cannot escape the repository')
    return Resource.from_contents(load(path))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('path')
    args = parser.parse_args()
    folder = (ROOT / args.path).resolve()
    if not folder.is_relative_to(ROOT.resolve()) or not folder.is_dir():
        raise ValueError('Contract path must be an existing repository directory')
    files = sorted(path for path in folder.rglob('*') if path.suffix in {'.json', '.yaml', '.yml'} and not path.name.endswith('.examples.json'))
    if not files:
        raise ValueError('Contract groups must contain real schema files')
    registry = Registry(retrieve=retrieve)
    for path in files:
        document = load(path)
        if isinstance(document, dict) and '$schema' in document:
            resource = Resource.from_contents(document)
            registry = registry.with_resource(path.as_uri(), resource)
            if '$id' in document:
                registry = registry.with_resource(document['$id'], resource)
    for path in files:
        document = load(path)
        if not isinstance(document, dict):
            raise ValueError(f'{path}: expected a schema object')
        if 'openapi' in document:
            validate_spec(document, base_uri=path.as_uri())
        elif 'asyncapi' in document:
            subprocess.run(['npx', '--yes', '@asyncapi/cli@3.4.0', 'validate', str(path)], check=True)
        elif '$schema' in document:
            cls = validators.validator_for(document)
            cls.check_schema(document)
            document = dict(document)
            document.setdefault('$id', path.as_uri())
            validation = cls(document, registry=registry.with_resource(path.as_uri(), Resource.from_contents(document)))
            examples_path = path.with_name(path.stem + '.examples.json')
            if not examples_path.is_file():
                raise ValueError(f'{path}: add {examples_path.name} with valid and invalid examples')
            examples = json.loads(examples_path.read_text())
            for key in ['valid', 'invalid']:
                if not isinstance(examples.get(key), list) or not examples[key]:
                    raise ValueError(f'{examples_path}: {key} examples must be a nonempty list')
            for sample in examples['valid']:
                validation.validate(sample)
            for sample in examples['invalid']:
                if validation.is_valid(sample):
                    raise ValueError(f'{examples_path}: a negative example unexpectedly passes')
        else:
            raise ValueError(f'{path}: expected OpenAPI, AsyncAPI or JSON Schema with $schema')
        print('Validated', path.relative_to(ROOT))


if __name__ == '__main__':
    main()
