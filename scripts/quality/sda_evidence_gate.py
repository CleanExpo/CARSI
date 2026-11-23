#!/usr/bin/env python3
"""Backward-compatible SDA gate entry (docs/agents). Implementation: sda-evidence-gate.mjs."""
from __future__ import annotations

import os
import subprocess
import sys


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        subprocess.run(
            ["npm", "run", "quality:sda-gate"],
            cwd=root,
            env=os.environ.copy(),
            check=True,
        )
    except subprocess.CalledProcessError as e:
        return e.returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())