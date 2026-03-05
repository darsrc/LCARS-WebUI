"""Phase 8 security audit helper.

Runs policy-gated dependency checks:
- Python dependency integrity (`pip check`)
- Python vulnerability scan (`pip-audit`) when available
- Frontend vulnerability scan (`npm audit --audit-level=high`)
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def _run(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    required: bool = True,
    env: dict[str, str] | None = None,
) -> bool:
    print(f"[security-audit] running: {' '.join(cmd)}")
    completed = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=env,
        check=False,
    )
    if completed.returncode == 0:
        return True
    if required:
        print(f"[security-audit] FAILED ({completed.returncode}): {' '.join(cmd)}")
        return False
    print(f"[security-audit] skipped/non-blocking failure ({completed.returncode}): {' '.join(cmd)}")
    return True


def main() -> int:
    strict = os.getenv("LCARS_SECURITY_AUDIT_STRICT", "0").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    cache_root = ROOT / ".cache"
    cache_root.mkdir(parents=True, exist_ok=True)
    npm_cache = ROOT / ".npm-cache"
    npm_cache.mkdir(parents=True, exist_ok=True)

    audit_env = os.environ.copy()
    audit_env["XDG_CACHE_HOME"] = str(cache_root)
    audit_env["NPM_CONFIG_CACHE"] = str(npm_cache)

    ok = True
    ok &= _run([sys.executable, "-m", "pip", "check"], env=audit_env)

    pip_audit = shutil.which("pip-audit")
    if pip_audit is None:
        message = "[security-audit] pip-audit not found."
        if strict:
            print(f"{message} Install dev dependencies and rerun.")
            ok = False
        else:
            print(f"{message} Continuing because LCARS_SECURITY_AUDIT_STRICT is disabled.")
    else:
        ok &= _run(
            [
                pip_audit,
                "--progress-spinner=off",
                "--cache-dir",
                str(cache_root / "pip-audit"),
            ],
            env=audit_env,
        )

    if (FRONTEND / "package-lock.json").exists():
        ok &= _run(
            ["npm", "audit", "--audit-level=high"],
            cwd=FRONTEND,
            env=audit_env,
        )

    if ok:
        print("[security-audit] PASS")
        return 0
    print("[security-audit] FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
