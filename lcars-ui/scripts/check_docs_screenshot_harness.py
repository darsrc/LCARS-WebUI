#!/usr/bin/env python3
"""Validate the example imports embedded in the documentation capture harness."""

from __future__ import annotations

import importlib
import re
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
HARNESS = PACKAGE_ROOT / "scripts" / "capture_docs_screenshots.mjs"
IMPORT = re.compile(
    r'^[ \t]*"from (examples(?:\.[A-Za-z_]\w*)+) import ([A-Za-z_]\w*)"',
    re.MULTILINE,
)
SERVE = re.compile(r'^[ \t]*"([A-Za-z_]\w*)\.serve\(', re.MULTILINE)


def main() -> int:
    source = HARNESS.read_text()
    start = source.find("const servers = [")
    end = source.find("\n];", start)
    if start < 0 or end < 0:
        raise SystemExit("could not find the servers array in capture_docs_screenshots.mjs")

    server_source = source[start:end]
    imports = IMPORT.findall(server_source)
    served_attributes = SERVE.findall(server_source)
    if not imports:
        raise SystemExit("screenshot harness has no discoverable example imports")
    if len(imports) != len(served_attributes):
        raise SystemExit(
            "each screenshot server must have one example import and one attribute.serve() call"
        )

    sys.path.insert(0, str(PACKAGE_ROOT))
    failures: list[str] = []
    for (module_name, attribute_name), served_attribute in zip(
        imports, served_attributes, strict=True
    ):
        if attribute_name != served_attribute:
            failures.append(
                f"{module_name}: imports {attribute_name!r} but serves {served_attribute!r}"
            )
            continue
        try:
            module = importlib.import_module(module_name)
            application = getattr(module, attribute_name)
        except (ImportError, AttributeError) as exc:
            failures.append(f"{module_name}.{attribute_name}: {exc}")
            continue
        if not callable(getattr(application, "serve", None)):
            failures.append(f"{module_name}.{attribute_name}.serve is missing or not callable")

    if failures:
        raise SystemExit("screenshot harness is stale:\n  " + "\n  ".join(failures))
    print(f"screenshot harness: {len(imports)} example imports and serve attributes are valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
