#!/usr/bin/env python3
"""Build agent-facing documentation artifacts from the curated LCARS-WebUI docs.

One pass over the wiki and package docs produces four things:

1. ``llms.txt``      - curated link index at the repository root.
2. ``llms-full.txt`` - every indexed section concatenated, one fetch.
3. ``.king-context/data/lcars-ui.json`` - corpus for ``kctx index``.
4. ``lcars-ui/build/docs-bundle/`` - flattened markdown for ``context add``.

No network, no API keys, deterministic: run it twice and the tracked outputs are
byte-identical. See ``make docs-index``.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PKG_ROOT.parent

DOC_NAME = "lcars-ui"
DISPLAY_NAME = "LCARS-WebUI"
REPO_URL = "https://github.com/darsrc/LCARS-WebUI"
WIKI_URL = f"{REPO_URL}/wiki"
HOME_DESC = "Start here: what the library builds, the mental model, and a minimal app."
BLOB_URL = f"{REPO_URL}/blob/main"

KCTX_DATA = Path.home() / ".king-context" / "data" / f"{DOC_NAME}.json"
BUNDLE_DIR = PKG_ROOT / "build" / "docs-bundle"

# Wiki pages in reading order; ``_Sidebar``/``_Footer`` are navigation chrome.
WIKI_ORDER = [
    "Home", "Getting-Started", "Build-a-Dashboard", "Concepts",
    "Layouts", "Surface-Engine", "Widgets", "Knowledge-Graph",
    "Graph-Workspace", "Actions-and-State", "Recipes",
    "Reference", "Deployment", "Troubleshooting", "Visual-Gallery",
]

# Package docs. This explicit allowlist excludes MAP.md and finished records in
# docs/history/; the visual specs are design law for work inside the repo, covered by AGENTS.md.
PACKAGE_DOCS = [
    "docs/quickstart.md", "docs/dsl.md", "docs/widgets.md",
    "docs/surface.md", "docs/deployment.md", "docs/lcars_language.md",
    "README.md",
]

# Higher priority breaks search ties (searcher.py adds priority * 0.5).
PRIORITY = {
    "Home": 9, "Getting-Started": 9, "Reference": 9, "Widgets": 8,
    "Concepts": 8, "Layouts": 8, "Surface-Engine": 8, "Actions-and-State": 8,
    "Build-a-Dashboard": 7, "Recipes": 7, "Knowledge-Graph": 6,
    "Graph-Workspace": 6, "Deployment": 6, "Troubleshooting": 6,
    "Visual-Gallery": 4,
    "docs/dsl.md": 8, "docs/widgets.md": 8, "docs/surface.md": 8,
    "docs/quickstart.md": 7, "docs/deployment.md": 6,
    "docs/lcars_language.md": 5, "README.md": 7,
}

STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are",
    "not", "but", "its", "it", "a", "an", "of", "to", "in", "on", "or", "is",
    "as", "at", "by", "be", "if", "when", "how", "use", "using", "used", "can",
    "all", "one", "two", "new", "via", "per", "into", "out", "up", "do", "so",
}

CODE_FENCE = re.compile(r"^```")
PY_IDENT = re.compile(r"\blcars\.([a-z_][a-z0-9_]*)\b")
BACKTICKED = re.compile(r"`([^`\n]{1,60})`")
WORD = re.compile(r"[a-z][a-z0-9_]{2,}")


def github_anchor(heading: str) -> str:
    """Reproduce GitHub's heading -> anchor slug rules."""
    s = heading.strip().lower()
    s = re.sub(r"[`*_\[\]()<>.,:;!?'\"/\\]", "", s)
    s = re.sub(r"\s+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.strip().lower())
    return re.sub(r"-+", "-", s).strip("-")


@dataclass
class Section:
    title: str
    path: str
    url: str
    keywords: list[str]
    use_cases: list[str]
    tags: list[str]
    priority: int
    content: str
    source: str
    heading: str = ""
    order: int = 0


@dataclass
class SourceDoc:
    key: str          # "Widgets" or "docs/dsl.md"
    label: str        # human title
    rel_path: str     # path relative to repo root
    text: str
    base_url: str
    tags: list[str] = field(default_factory=list)


def read_version() -> str:
    text = (PKG_ROOT / "pyproject.toml").read_text()
    m = re.search(r'^version\s*=\s*"([^"]+)"', text, re.M)
    if not m:
        sys.exit("could not read version from pyproject.toml")
    return m.group(1)


def page_use_cases() -> dict[str, str]:
    """Harvest the 'Use it when you need to' column of the wiki Home doc map.

    Those descriptions are already written in exactly the voice searcher.py
    substring-matches against, so reuse them verbatim rather than inventing new ones.
    """
    home = REPO_ROOT / "wiki" / "Home.md"
    out: dict[str, str] = {}
    if not home.exists():
        return out
    row = re.compile(r"^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.+?)\s*\|\s*$")
    for line in home.read_text().splitlines():
        m = row.match(line)
        if m:
            out[m.group(2).strip()] = m.group(3).strip()
    return out


def strip_code(text: str) -> str:
    out, fenced = [], False
    for line in text.splitlines():
        if CODE_FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced:
            out.append(line)
    return "\n".join(out)


def extract_keywords(heading: str, body: str) -> list[str]:
    """Single-token keywords only.

    searcher.py scores keywords with ``term == key.lower()`` where ``term`` comes
    from ``query.lower().split()``. A keyword containing a space can therefore never
    match anything, so multi-word phrases belong in use_cases (substring) instead.
    """
    kws: set[str] = set()

    for ident in PY_IDENT.findall(body):
        kws.add(ident)
        kws.add(f"lcars.{ident}")

    for tick in BACKTICKED.findall(body):
        t = tick.strip().rstrip("()").strip()
        if not t or " " in t or len(t) > 40:
            continue
        low = t.lower()
        if re.fullmatch(r"[a-z0-9_.\-]+", low):
            kws.add(low)
            if "." in low:
                kws.add(low.rsplit(".", 1)[-1])

    for w in WORD.findall(heading.lower()):
        if w not in STOPWORDS:
            kws.add(w)

    prose = strip_code(body).lower()
    freq: dict[str, int] = {}
    for w in WORD.findall(prose):
        if w not in STOPWORDS:
            freq[w] = freq.get(w, 0) + 1
    for w, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:14]:
        kws.add(w)

    cleaned = {k for k in kws if k and " " not in k and 2 < len(k) <= 40}
    return sorted(cleaned)[:40]


def split_sections(doc: SourceDoc, use_case_hint: str) -> list[Section]:
    """Split a markdown document at level-2 headings."""
    lines = doc.text.splitlines()
    doc_title = doc.label
    for line in lines:
        if line.startswith("# "):
            doc_title = line[2:].strip()
            break

    chunks: list[tuple[str, list[str]]] = []
    current_heading = "Overview"
    buf: list[str] = []
    fenced = False
    for line in lines:
        if CODE_FENCE.match(line):
            fenced = not fenced
        if not fenced and line.startswith("## "):
            chunks.append((current_heading, buf))
            current_heading = line[3:].strip()
            buf = []
            continue
        buf.append(line)
    chunks.append((current_heading, buf))

    sections: list[Section] = []
    for idx, (heading, body_lines) in enumerate(chunks):
        body = "\n".join(body_lines).strip()
        if len(body) < 40:
            continue

        anchor = github_anchor(heading)
        url = doc.base_url if heading == "Overview" else f"{doc.base_url}#{anchor}"

        use_cases = []
        if use_case_hint:
            use_cases.append(use_case_hint)
        if heading != "Overview":
            use_cases.append(f"Use when working with {heading.lower()} in {DISPLAY_NAME}")
        if not use_cases:
            use_cases.append(f"Use when reading the {doc_title} documentation for {DISPLAY_NAME}")

        sections.append(Section(
            title=f"{doc_title} > {heading}",
            path=slugify(f"{doc.key}-{heading}")[:120] or f"{slugify(doc.key)}-{idx}",
            url=url,
            keywords=extract_keywords(heading, body),
            use_cases=use_cases,
            tags=doc.tags,
            priority=PRIORITY.get(doc.key, 5),
            content=body,
            source=doc.rel_path,
            heading=heading,
            order=idx,
        ))
    return sections


def collect() -> tuple[list[SourceDoc], list[Section]]:
    hints = page_use_cases()
    docs: list[SourceDoc] = []

    for name in WIKI_ORDER:
        p = REPO_ROOT / "wiki" / f"{name}.md"
        if not p.exists():
            print(f"  ! missing wiki page: {name}.md", file=sys.stderr)
            continue
        docs.append(SourceDoc(
            key=name,
            label=name.replace("-", " "),
            rel_path=f"wiki/{name}.md",
            text=p.read_text(),
            base_url=f"{WIKI_URL}/{name}",
            tags=["wiki", "guide", DOC_NAME],
        ))

    for rel in PACKAGE_DOCS:
        p = PKG_ROOT / rel
        if not p.exists():
            print(f"  ! missing package doc: {rel}", file=sys.stderr)
            continue
        docs.append(SourceDoc(
            key=rel,
            label=Path(rel).stem.replace("_", " ").replace("-", " "),
            rel_path=f"lcars-ui/{rel}",
            text=p.read_text(),
            base_url=f"{BLOB_URL}/lcars-ui/{rel}",
            tags=["reference", DOC_NAME],
        ))

    sections: list[Section] = []
    for doc in docs:
        hint = hints.get(doc.key, "") if doc.rel_path.startswith("wiki/") else ""
        sections.extend(split_sections(doc, hint))

    seen: dict[str, int] = {}
    for s in sections:
        if s.path in seen:
            seen[s.path] += 1
            s.path = f"{s.path}-{seen[s.path]}"
        else:
            seen[s.path] = 0
    return docs, sections


def write_kctx(sections: list[Section], version: str) -> None:
    payload = {
        "name": DOC_NAME,
        "display_name": DISPLAY_NAME,
        "version": version,
        "base_url": WIKI_URL,
        "sections": [
            {
                "title": s.title,
                "path": s.path,
                "url": s.url,
                "keywords": s.keywords,
                "use_cases": s.use_cases,
                "tags": s.tags,
                "priority": s.priority,
                "content": s.content,
                "_meta": {"source": s.source},
            }
            for s in sections
        ],
        "_meta": {
            "schema_version": 1,
            "scraper_version": "build_docs_index.py",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "source_url": REPO_URL,
            "section_count": len(sections),
        },
    }
    KCTX_DATA.parent.mkdir(parents=True, exist_ok=True)
    KCTX_DATA.write_text(json.dumps(payload, indent=2) + "\n")


def write_llms_txt(docs: list[SourceDoc], version: str) -> None:
    hints = page_use_cases()
    groups = {
        "Learn": ["Home", "Getting-Started", "Build-a-Dashboard", "Concepts"],
        "Authoring": ["Layouts", "Surface-Engine", "Widgets", "Knowledge-Graph",
                      "Graph-Workspace", "Actions-and-State", "Recipes"],
        "Reference": ["Reference", "Deployment", "Troubleshooting", "Visual-Gallery"],
    }
    out = [
        f"# {DISPLAY_NAME}",
        "",
        f"> {DISPLAY_NAME} {version} is a Python library for building live, browser-rendered "
        "LCARS interfaces. Python declares the interface, Pydantic models define a versioned "
        "manifest, FastAPI "
        "serves it, and a bundled React frontend renders code-native LCARS geometry. "
        "No HTML, CSS, or JavaScript required to build an application.",
        "",
        "Install with `pip install -e \".[dev]\"` from `lcars-ui/`. A minimal app declares "
        "widgets inside `lcars.page()` and calls `lcars.run(ui)`. The renderer composes the "
        "screen from semantic LCARS panels; placement hints only direct the automatic result.",
        "",
        f"For the complete text of every page below in a single file, see "
        f"[llms-full.txt]({REPO_URL}/blob/main/llms-full.txt).",
        "",
    ]
    for group, names in groups.items():
        out.append(f"## {group}")
        out.append("")
        for name in names:
            desc = hints.get(name, HOME_DESC if name == "Home" else "").rstrip(".")
            label = name.replace("-", " ")
            out.append(f"- [{label}]({WIKI_URL}/{name})" + (f": {desc}." if desc else ""))
        out.append("")

    out.append("## Package reference")
    out.append("")
    pkg_desc = {
        "docs/quickstart.md": "Install, create a virtual environment, and run a first app",
        "docs/dsl.md": "Full Python DSL surface: pages, panels, widgets, state, effects",
        "docs/widgets.md": "Every widget signature and its typed capability options",
        "docs/surface.md": "Surface Engine: arcs, rings, elbows, paths, transforms, effects",
        "docs/deployment.md": "HTTPS, token auth, CORS, rate limits, uploads, reverse proxies",
        "docs/lcars_language.md": "Colour, typography, and geometry rules of the visual language",
        "README.md": "Package overview, runtime model, and development commands",
    }
    for rel in PACKAGE_DOCS:
        if any(d.key == rel for d in docs):
            out.append(f"- [{rel}]({BLOB_URL}/lcars-ui/{rel}): {pkg_desc.get(rel, '')}.")
    out.append("")

    out.append("## Optional")
    out.append("")
    out.append(f"- [AGENTS.md]({BLOB_URL}/AGENTS.md): parity guardrails for agents editing "
               "this repository - not needed to use the library.")
    out.append(f"- [STRICT_LCARS_VISUAL_SPEC.md]({BLOB_URL}/STRICT_LCARS_VISUAL_SPEC.md): "
               "authoritative visual design law.")
    out.append(f"- [LCARS_PORTING_SPEC.md]({BLOB_URL}/LCARS_PORTING_SPEC.md): porting rules "
               "for recreating canon screens.")
    out.append("")
    (REPO_ROOT / "llms.txt").write_text("\n".join(out))


def write_llms_full(sections: list[Section], version: str) -> None:
    out = [
        f"# {DISPLAY_NAME} {version} - complete documentation",
        "",
        f"Source: {REPO_URL}",
        "Generated by lcars-ui/scripts/build_docs_index.py. Do not edit by hand.",
        "",
    ]
    current = None
    for s in sections:
        if s.source != current:
            current = s.source
            out += ["", "=" * 78, f"# {s.source}", "=" * 78, ""]
        out += [f"## {s.heading}", "", f"Source: {s.url}", "", s.content, ""]
    (REPO_ROOT / "llms-full.txt").write_text("\n".join(out))


def write_bundle(docs: list[SourceDoc]) -> None:
    """Flattened markdown for ``context add``.

    A directory is used rather than the repository root because ``context add`` on the
    repo silently skipped wiki/ when this was last run; an explicit tree removes the guesswork.
    """
    if BUNDLE_DIR.exists():
        shutil.rmtree(BUNDLE_DIR)
    BUNDLE_DIR.mkdir(parents=True)
    for doc in docs:
        # Flat, readable names: these become the doc titles agents see in
        # context_get_docs results ("wiki-Layouts > Surface geometry").
        flat = doc.rel_path.removeprefix("lcars-ui/").replace("docs/", "docs-")
        flat = flat.replace("wiki/", "wiki-").replace("/", "-")
        (BUNDLE_DIR / flat).write_text(f"<!-- source: {doc.base_url} -->\n\n{doc.text}")


def main() -> int:
    version = read_version()
    docs, sections = collect()
    if not sections:
        sys.exit("no sections produced - check that wiki/ and lcars-ui/docs/ exist")

    write_kctx(sections, version)
    write_llms_txt(docs, version)
    write_llms_full(sections, version)
    write_bundle(docs)

    print(f"lcars-ui {version}: {len(docs)} documents -> {len(sections)} sections")
    print(f"  {REPO_ROOT / 'llms.txt'}")
    print(f"  {REPO_ROOT / 'llms-full.txt'}")
    print(f"  {KCTX_DATA}")
    print(f"  {BUNDLE_DIR}/")
    if os.environ.get("MAKELEVEL"):
        return 0
    print()
    print("Next:")
    print(f"  /home/darius/.king-context/bin/kctx index {KCTX_DATA}")
    print(f"  context remove {DOC_NAME}; context add {BUNDLE_DIR} "
          f"--name {DOC_NAME} --pkg-version {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
