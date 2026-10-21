#!/usr/bin/env python3
"""Write apps/desktop/resources/vecleap-logo-source.png from the embedded client mark."""
from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARK_TS = ROOT / "packages" / "client" / "ui-brand-official" / "src" / "client" / "vecleap-mark-data.ts"
OUT = ROOT / "apps" / "desktop" / "resources" / "vecleap-logo-source.png"


def main() -> None:
    text = MARK_TS.read_text(encoding="utf-8")
    match = re.search(r"data:image/png;base64,([^']+)", text)
    if match is None:
        raise SystemExit(f"No data URL in {MARK_TS}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(base64.b64decode(match.group(1)))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
