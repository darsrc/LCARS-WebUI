"""Asset-path hygiene for widgets that load project files from /lcars/assets/.

This is path hygiene, not a security boundary. Scene modules are ordinary
same-origin project code with the same privileges as the rest of the page, so
there is nothing here to defend: the point is to reject paths that cannot mean
what the author intended — an absolute URL, a traversal, a Windows separator —
early and with a readable message, instead of letting them fail as a confusing
404 at runtime.
"""

from __future__ import annotations

from collections.abc import Sequence

_SCHEME_MARKERS = ("://", "data:", "javascript:", "blob:", "file:")


def validate_asset_path(path: str, *, extensions: Sequence[str]) -> str:
    """Normalize and check a relative asset path.

    Returns the cleaned path (leading ``./`` removed). Raises ``ValueError``
    with a message naming the specific problem.
    """
    raw = path.strip()
    if not raw:
        raise ValueError("asset path must not be empty")

    lowered = raw.lower()
    if any(marker in lowered for marker in _SCHEME_MARKERS):
        raise ValueError(
            f"asset path must be relative to the assets directory, got {path!r}. "
            "Remote and inline sources are not supported; copy the file into "
            "assets_dir and reference it by relative path."
        )
    if raw.startswith(("/", "\\")):
        raise ValueError(f"asset path must be relative, not absolute: {path!r}")
    if "\\" in raw:
        raise ValueError(f"asset path must use forward slashes: {path!r}")
    if "\x00" in raw:
        raise ValueError("asset path must not contain null bytes")

    cleaned = raw[2:] if raw.startswith("./") else raw
    segments = [segment for segment in cleaned.split("/") if segment not in ("", ".")]
    if any(segment == ".." for segment in segments):
        raise ValueError(f"asset path must not traverse above the assets directory: {path!r}")
    if not segments:
        raise ValueError(f"asset path must name a file: {path!r}")

    normalized = "/".join(segments)
    if not normalized.lower().endswith(tuple(ext.lower() for ext in extensions)):
        allowed = ", ".join(extensions)
        raise ValueError(f"asset path must end in one of [{allowed}], got {path!r}")
    return normalized


__all__ = ["validate_asset_path"]
