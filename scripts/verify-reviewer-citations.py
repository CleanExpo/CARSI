#!/usr/bin/env python3
"""Reject reviewer findings whose quoted_line does not exist in the diff.

A blocking finding must anchor to a line that literally appears in the unified
diff, under the file it names. Anything else is an unanchored claim and cannot
block a release.

Usage:  verify_citations.py <reviewer.json> <diff.txt>
Exit 0 = every blocking finding is anchored. Exit 2 = at least one is not.
"""
from __future__ import annotations

import json
import re
import sys


def norm(s: str) -> str:
    """Collapse whitespace and strip quote-style noise so cosmetic differences
    between what the model echoed and what the diff holds do not matter."""
    s = s.replace("‘", "'").replace("’", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("‑", "-").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip()


def diff_index(diff_text: str) -> dict[str, list[str]]:
    """Map each file path in the diff to the lines that EXIST AFTER the change —
    additions and context only.

    Removed lines are excluded deliberately. Round 7 quoted a `-` line
    ("CARSI is an Australian IICRC-aligned...") and reported it as a live defect,
    when the diff was the commit that DELETED it. A quote is only evidence about
    the head if the line survives at the head."""
    files: dict[str, list[str]] = {}
    current: list[str] | None = None
    for line in diff_text.splitlines():
        m = re.match(r"^diff --git a/(\S+) b/(\S+)", line)
        if m:
            for path in {m.group(1), m.group(2)}:
                files.setdefault(path, [])
            current = files[m.group(2)]
            continue
        if current is None:
            continue
        if line.startswith(("+++", "---", "@@", "index ", "new file", "deleted file",
                            "similarity ", "rename ", "old mode", "new mode",
                            "Binary files")):
            continue
        if line[:1] in ("+", " "):
            current.append(line[1:])
    return files


def resolve(path: str, files: dict[str, list[str]]) -> list[str] | None:
    if path in files:
        return files[path]
    # tolerate a leading a/ or b/, or a path the model shortened to a suffix
    stripped = re.sub(r"^[ab]/", "", path)
    if stripped in files:
        return files[stripped]
    matches = [v for k, v in files.items() if k.endswith("/" + stripped) or stripped.endswith("/" + k)]
    return matches[0] if len(matches) == 1 else None


def main() -> int:
    report = json.load(open(sys.argv[1], encoding="utf-8"))
    files = diff_index(open(sys.argv[2], encoding="utf-8", errors="replace").read())

    findings = report.get("blocking_findings") or []
    if not findings:
        print("No blocking findings to anchor.")
        return 0

    unanchored = []
    for i, f in enumerate(findings, 1):
        path = (f.get("file") or "").strip()
        quoted = norm(f.get("quoted_line") or "")
        sev = f.get("severity", "?")
        lines = resolve(path, files)

        if not quoted:
            unanchored.append((i, sev, path, "no quoted_line supplied"))
            continue
        if lines is None:
            unanchored.append((i, sev, path, "file does not appear in the diff"))
            continue
        # A quote anchors if it is a whole diff line, or a substring of one.
        hit = any(quoted == norm(l) or quoted in norm(l) for l in lines)
        if hit:
            print(f"  ANCHORED   [{sev}] {path}: {quoted[:70]}")
        else:
            unanchored.append((i, sev, path, "quoted_line is absent from that file's diff"))

    if unanchored:
        print()
        print(f"REJECTED {len(unanchored)} of {len(findings)} blocking finding(s) as unanchored:")
        for i, sev, path, why in unanchored:
            print(f"  #{i} [{sev}] {path} — {why}")
        return 2

    print(f"\nAll {len(findings)} blocking finding(s) anchored to real diff lines.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
