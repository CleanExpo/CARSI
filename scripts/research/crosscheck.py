#!/usr/bin/env python3
"""CARSI research cross-check: Kimi + DeepSeek via OpenRouter, capped.

Founder authority: Phill, 20/11/2026, "Yes, reopen it for CARSI with the cap".
Scope: CARSI course research only. Cap: USD 20/day (live OpenRouter usage_daily)
plus a hard --max-usd per run. Key read at run time from Keychain item
`openrouter-api-key`; never printed or written.

Model answers are LEADS. A claim is only marked QUOTE_FOUND when the quoted
words were fetched from the cited source URL by this script. Everything else
stays UNVERIFIED for a human to confirm against the primary source.

Usage:
  python3 scripts/research/crosscheck.py --claims claims.jsonl --out results.jsonl --max-usd 3
claims.jsonl rows: {"id": "...", "claim": "...", "jurisdiction": "AU|NZ|AU+NZ"}
"""
import argparse
import html
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request

API = "https://openrouter.ai/api/v1"
MODELS = ["moonshotai/kimi-k3.1-pro", "deepseek/deepseek-v4.1-flash-1017"]
DAILY_CAP_USD = 20.0
PER_CALL_RESERVE_USD = 0.25  # refuse a call unless this much headroom remains

# IICRC prohibits entering its standards into any AI tool (CLAUDE.md). Claims that
# name an IICRC standard are refused here and go to the licensed-index route instead.
IICRC_RX = re.compile(r"\bIICRC\b|\bS[\s-]?5[0-9]{2}\b|\bS[\s-]?100\b", re.I)
MIN_QUOTE_CHARS = 20  # a shorter quote matches too many pages to prove anything

PROMPT = """You are checking one factual claim for an Australian training course.
Use web search. Rely ONLY on primary sources: legislation (legislation.gov.au,
state legislation sites, legislation.govt.nz), regulators (Safe Work Australia,
state WHS regulators, WorkSafe New Zealand), standards bodies, manufacturers,
or peer-reviewed studies. Do not rely on blogs, trade press or your memory.

Claim ({jurisdiction}): {claim}

Reply with JSON only, no prose:
{{"verdict": "SUPPORTED" | "CONTRADICTED" | "PARTLY" | "NOT_FOUND",
  "correction": "<the accurate statement if not fully SUPPORTED, else empty>",
  "source_url": "<exact primary-source URL>",
  "section": "<regulation/section/clause number>",
  "quote": "<verbatim words from that source, 25 words or fewer>"}}"""


def key():
    r = subprocess.run(["security", "find-generic-password", "-s", "openrouter-api-key", "-w"],
                       capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        sys.exit("BLOCKED: Keychain item openrouter-api-key not readable")
    return r.stdout.strip()


def call(path, k, body=None, timeout=180):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": f"Bearer {k}",
                                          "Content-Type": "application/json",
                                          "X-Title": "CARSI course research"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def daily_spend(k):
    return float(call("/key", k)["data"]["usage_daily"])


def parse(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def norm(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"[^a-z0-9.%/]+", " ", s.lower()).strip()


def _scheme_ok(url):
    return url.startswith("https://")


def quote_found(url, quote):
    if not url or not quote or not _scheme_ok(url):
        return "NO_URL_OR_QUOTE"
    if len(norm(quote)) < MIN_QUOTE_CHARS:
        return "QUOTE_TOO_SHORT"
    try:
        req = urllib.request.Request(url, headers=BROWSER_HEADERS)
        with urllib.request.urlopen(req, timeout=45) as r:
            ctype = r.headers.get("Content-Type", "")
            raw = r.read(20_000_000)
    except urllib.error.HTTPError as e:
        return f"FETCH_FAILED:HTTP{e.code}"
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        return f"FETCH_FAILED:{type(e).__name__}"
    if "pdf" in ctype.lower() or raw[:5] == b"%PDF-":
        try:
            import io
            from pypdf import PdfReader
            text = " ".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
        except Exception as e:  # unreadable PDF is a failure, never a pass
            return f"PDF_UNREADABLE:{type(e).__name__}"
    else:
        text = raw.decode("utf-8", "replace")
    return "QUOTE_FOUND" if norm(quote) in norm(text) else "QUOTE_NOT_IN_PAGE"


BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
}


def recheck(path):
    """Re-run the source quote check on an existing results file. No model calls, no spend."""
    rows = [json.loads(l) for l in open(path) if l.strip()]
    for r in rows:
        r["quote_check"] = quote_found(r.get("source_url"), r.get("quote"))
    with open(path, "w") as f:
        f.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
    return summary(path)


def summary(path):
    """Print verdicts, sections, corrections and quotes. Links stay in the file."""
    for l in open(path):
        if not l.strip():
            continue
        r = json.loads(l)
        print(f"{r['id']} {r['model'].split('/')[0]:<10} {r['verdict']:<12} {r['quote_check']:<22} "
              f"sec={r.get('section', '')!r}")
        if r.get("correction"):
            print(f"    correction: {r['correction']}")
        if r.get("quote"):
            print(f"    quote: {r['quote']}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--summary", help="print an existing results file without links")
    ap.add_argument("--recheck", help="re-run the quote check on an existing results file")
    ap.add_argument("--claims")
    ap.add_argument("--out")
    ap.add_argument("--max-usd", type=float)
    a = ap.parse_args()
    if a.summary:
        return summary(a.summary)
    if a.recheck:
        return recheck(a.recheck)
    if not (a.claims and a.out and a.max_usd is not None):
        sys.exit("--claims, --out and --max-usd are required for a model run")
    if a.max_usd <= 0 or a.max_usd > DAILY_CAP_USD:
        sys.exit(f"--max-usd must be between 0 and {DAILY_CAP_USD}")
    claims = [json.loads(l) for l in open(a.claims) if l.strip()]
    banned = [c["id"] for c in claims if IICRC_RX.search(c["claim"])]
    if banned:
        sys.exit(f"REFUSED: claims {banned} name an IICRC standard; check them against the licensed index, not an AI tool")
    k = key()
    run_spend = 0.0
    with open(a.out, "a") as out:
        for c in claims:
            for model in MODELS:
                today = daily_spend(k)
                if today + PER_CALL_RESERVE_USD > DAILY_CAP_USD:
                    print(f"STOP: daily spend ${today:.2f} at the ${DAILY_CAP_USD} cap"); return 2
                if run_spend + PER_CALL_RESERVE_USD > a.max_usd:
                    print(f"STOP: run spend ${run_spend:.2f} at --max-usd {a.max_usd}"); return 2
                body = {"model": model, "max_tokens": 4000,
                        "messages": [{"role": "user", "content": PROMPT.format(**c)}],
                        "plugins": [{"id": "web", "max_results": 5}],
                        "usage": {"include": True}}
                try:
                    r = call("/chat/completions", k, body)
                    text = r["choices"][0]["message"].get("content") or ""
                    cost = max(float(r.get("usage", {}).get("cost") or 0), 0.0)
                    err = None
                except Exception as e:  # recorded, never treated as a pass
                    text, cost, err = "", 0.0, f"{type(e).__name__}: {e}"
                run_spend += cost
                ans = parse(text) or {}
                row = {"id": c["id"], "model": model, "cost_usd": round(cost, 5),
                       "verdict": ans.get("verdict", "UNPARSED" if not err else "ERROR"),
                       "correction": ans.get("correction", ""), "source_url": ans.get("source_url", ""),
                       "section": ans.get("section", ""), "quote": ans.get("quote", ""),
                       "quote_check": quote_found(ans.get("source_url"), ans.get("quote")),
                       "error": err}
                out.write(json.dumps(row, ensure_ascii=False) + "\n"); out.flush()
                print(f"{c['id']} {model.split('/')[0]:<10} {row['verdict']:<12} {row['quote_check']:<22} "
                      f"${cost:.4f} sec={row['section']!r}")
                if row["correction"]:
                    print(f"    correction: {row['correction']}")
                if row["quote"]:
                    print(f"    quote: {row['quote']}")
                sys.stdout.flush()
    print(f"run spend ${run_spend:.4f}; today ${daily_spend(k):.2f} of ${DAILY_CAP_USD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
