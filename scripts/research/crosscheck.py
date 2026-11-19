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
import math
import re
import subprocess
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser

API = "https://openrouter.ai/api/v1"
MODELS = ["moonshotai/kimi-k3.1-pro", "deepseek/deepseek-v4.1-flash-1017"]
DAILY_CAP_USD = 20.0
PER_CALL_RESERVE_USD = 0.25  # refuse a call unless this much headroom remains

# The reserve is only a cap if no single call can cost more than it. Each request
# therefore carries a provider-enforced price ceiling (USD per million tokens) and a
# completion-token limit, and every response is checked against the assumed prompt
# size. worst_case_call_usd() must stay at or below PER_CALL_RESERVE_USD (tested).
PRICE_CEILING = {  # model -> (prompt, completion) USD per million tokens, OpenRouter max_price
    "moonshotai/kimi-k3.1-pro": (0.30, 9.00),
    "deepseek/deepseek-v4.1-flash-1017": (0.35, 1.30),
}
MAX_COMPLETION_TOKENS = 4000
MAX_PROMPT_TOKENS = 50_000  # our prompt is ~400 tokens; web results add the rest
WEB_RESULTS = 5
WEB_USD_PER_RESULT = 0.004  # OpenRouter web plugin, USD 4 per 1,000 results
JURISDICTIONS = {"AU", "NZ", "AU+NZ"}


def worst_case_call_usd(model):
    p, c = PRICE_CEILING[model]
    return (MAX_PROMPT_TOKENS * p + MAX_COMPLETION_TOKENS * c) / 1e6 + WEB_RESULTS * WEB_USD_PER_RESULT

# IICRC prohibits entering its standards into any AI tool (CLAUDE.md). Claims that
# name an IICRC standard are refused here and go to the licensed-index route instead.
def names_iicrc(text):
    """True if text names IICRC or an IICRC S-standard. Run on text model_safe() has passed.

    It keeps only runs of letters and runs of digits and drops everything else (spaces, line
    breaks, any punctuation, in any amount), so nothing between the parts is described and no
    separator can slip through. Apostrophes are dropped first, so a possessive ("worker's")
    stays one word. Refused: the letters alone contain IICRC; or a standalone S is followed by
    digit runs whose first three digits form 100-999 ("S500", "S-500", "S 5 0 0", "S\n500").
    Named limit: a disguise a person would not type by accident ("S five hundred") is not caught.
    """
    runs = re.findall(r"[A-Za-z]+|[0-9]+", text.replace("'", ""))
    if "IICRC" in "".join(r for r in runs if r.isalpha()).upper():
        return True
    for i, r in enumerate(runs):
        if r.upper() != "S":
            continue
        digits = ""
        for nxt in runs[i + 1:]:
            if not nxt.isdigit() or len(digits) >= 3:
                break
            digits += nxt
        if len(digits) >= 3 and digits[0] != "0":
            return True
    return False


def model_safe(text):
    """Single owner of what may be sent to a model: printable ASCII and newlines only.
    An allow-list, so look-alike letters, other dashes, other digits and invisible
    characters are refused rather than listed."""
    return all(32 <= ord(ch) <= 126 or ch == "\n" for ch in text)


def real_number(v):
    """Single owner of every number read from OpenRouter (spend, cost, tokens): a real
    int or float only (never true/false, a string or null), finite and at least 0.
    Anything else returns None, and every caller treats None as fail-closed."""
    if type(v) not in (int, float) or not math.isfinite(v) or v < 0:
        return None
    return float(v)
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


class _RefuseRedirect(urllib.request.HTTPRedirectHandler):
    """urllib copies the Authorization header to a redirect's target. A request carrying
    the key must never leave the OpenRouter address, so every redirect is refused."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, "redirect refused", headers, fp)


_KEY_OPENER = urllib.request.build_opener(_RefuseRedirect)


def call(path, k, body=None, timeout=180):
    """The only function that sends the key, and only to API + path."""
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": f"Bearer {k}",
                                          "Content-Type": "application/json",
                                          "X-Title": "CARSI course research"})
    with _KEY_OPENER.open(req, timeout=timeout) as r:
        return json.load(r)


def daily_spend(k):
    """Today's spend from OpenRouter. Anything but a finite, non-negative number stops
    the program: a cap measured against an unreadable value is no cap."""
    try:
        v = real_number(call("/key", k)["data"]["usage_daily"])
    except Exception as e:
        sys.exit(f"BLOCKED: could not read today's OpenRouter spend ({type(e).__name__})")
    if v is None:
        sys.exit("BLOCKED: OpenRouter reported an unusable daily spend")
    return v


ANSWER_FIELDS = ("verdict", "correction", "source_url", "section", "quote")
VERDICTS = {"SUPPORTED", "CONTRADICTED", "PARTLY", "NOT_FOUND"}


def parse(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def coerce_answer(text):
    """The ONE place model output enters the program. Everything after this sees only
    these five string fields. Anything else (wrong type, unknown verdict, not an object)
    becomes UNPARSED or MALFORMED with empty fields, so it can never crash the run or
    pass a check."""
    raw = parse(text)
    out = {f: "" for f in ANSWER_FIELDS}
    if not isinstance(raw, dict):
        out["verdict"] = "UNPARSED"
        return out
    bad = False
    for f in ANSWER_FIELDS:
        v = raw.get(f, "")
        if isinstance(v, str):
            out[f] = v[:2000]
        else:
            bad = True
    if bad or out["verdict"] not in VERDICTS:
        return {**{f: "" for f in ANSWER_FIELDS}, "verdict": "MALFORMED"}
    return out


class _VisibleText(HTMLParser):
    """Collect only text a reader sees: no script, style, template, head or comments."""
    HIDDEN = {"script", "style", "template", "noscript", "head", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth, self.parts = 0, []

    def handle_starttag(self, tag, attrs):
        if tag in self.HIDDEN:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in self.HIDDEN and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.parts.append(data)


def visible_text(html_doc):
    p = _VisibleText()
    p.feed(html_doc)
    p.close()
    return " ".join(p.parts)


def norm(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"[^a-z0-9.%/]+", " ", s.lower()).strip()


def _scheme_ok(url):
    return url.startswith("https://")


def quote_found(url, quote):
    if not isinstance(url, str) or not isinstance(quote, str) or not url or not quote or not _scheme_ok(url):
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
    except Exception as e:  # any fetch failure is a failure, never a crash or a pass
        return f"FETCH_FAILED:{type(e).__name__}"
    if "pdf" in ctype.lower() or raw[:5] == b"%PDF-":
        try:
            import io
            from pypdf import PdfReader
            text = " ".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
        except Exception as e:  # unreadable PDF is a failure, never a pass
            return f"PDF_UNREADABLE:{type(e).__name__}"
    else:
        try:
            text = visible_text(raw.decode("utf-8", "replace"))
        except Exception as e:
            return f"HTML_UNREADABLE:{type(e).__name__}"
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
    if not math.isfinite(a.max_usd) or a.max_usd <= 0 or a.max_usd > DAILY_CAP_USD:
        sys.exit(f"--max-usd must be a number above 0 and at most {DAILY_CAP_USD}")
    claims = [json.loads(l) for l in open(a.claims) if l.strip()]
    for c in claims:
        if not (isinstance(c, dict) and all(isinstance(c.get(f), str) for f in ("id", "claim", "jurisdiction"))):
            sys.exit(f"REFUSED: each claim needs string id, claim and jurisdiction: {str(c)[:80]}")
        if c["jurisdiction"] not in JURISDICTIONS:
            sys.exit(f"REFUSED: claim {c['id']} jurisdiction must be one of {sorted(JURISDICTIONS)}")
    # Build each prompt once; the scanned text is exactly the text sent.
    for c in claims:
        c["_prompt"] = PROMPT.format(claim=c["claim"], jurisdiction=c["jurisdiction"])
    unsafe = [c["id"] for c in claims if not model_safe(c["_prompt"])]
    if unsafe:
        sys.exit(f"REFUSED: claims {unsafe} contain characters outside plain ASCII; retype them in plain text")
    banned = [c["id"] for c in claims if names_iicrc(c["_prompt"])]
    if banned:
        sys.exit(f"REFUSED: claims {banned} name an IICRC standard; check them against the licensed index, not an AI tool")
    k = key()
    run_spend = 0.0
    day_start = daily_spend(k)
    with open(a.out, "a") as out:
        for c in claims:
            for model in MODELS:
                # OpenRouter's figure can lag, so this run's own spend always counts too.
                today = max(daily_spend(k), day_start + run_spend)
                if today + PER_CALL_RESERVE_USD > DAILY_CAP_USD:
                    print(f"STOP: daily spend ${today:.2f} at the ${DAILY_CAP_USD} cap"); return 2
                if run_spend + PER_CALL_RESERVE_USD > a.max_usd:
                    print(f"STOP: run spend ${run_spend:.2f} at --max-usd {a.max_usd}"); return 2
                p_max, c_max = PRICE_CEILING[model]
                body = {"model": model, "max_tokens": MAX_COMPLETION_TOKENS,
                        "messages": [{"role": "user", "content": c["_prompt"]}],
                        "plugins": [{"id": "web", "max_results": WEB_RESULTS}],
                        "provider": {"max_price": {"prompt": p_max, "completion": c_max}},
                        "usage": {"include": True}}
                stop = None
                try:
                    r = call("/chat/completions", k, body)
                    text = r["choices"][0]["message"].get("content") or ""
                    usage = r.get("usage") or {}
                    cost = real_number(usage.get("cost"))
                    tokens = real_number(usage.get("prompt_tokens", 0))
                    err = None
                    if cost is None:
                        cost, stop = PER_CALL_RESERVE_USD, "cost not reported; counted the full reserve and stopped"
                    elif tokens is None or cost > PER_CALL_RESERVE_USD or tokens > MAX_PROMPT_TOKENS:
                        stop = f"one call cost ${cost:.4f}, past the per-call bound; stopped"
                except Exception as e:  # recorded, never treated as a pass
                    # A failed request may still have been billed: count the full reserve.
                    text, cost, err = "", PER_CALL_RESERVE_USD, type(e).__name__
                run_spend += cost
                ans = coerce_answer(text)
                if err:
                    ans["verdict"] = "ERROR"
                row = {"id": c["id"], "model": model, "cost_usd": round(cost, 5), **ans,
                       "quote_check": quote_found(ans["source_url"], ans["quote"]),
                       "error": err}
                out.write(json.dumps(row, ensure_ascii=False) + "\n"); out.flush()
                print(f"{c['id']} {model.split('/')[0]:<10} {row['verdict']:<12} {row['quote_check']:<22} "
                      f"${cost:.4f} sec={row['section']!r}")
                if row["correction"]:
                    print(f"    correction: {row['correction']}")
                if row["quote"]:
                    print(f"    quote: {row['quote']}")
                sys.stdout.flush()
                if stop:
                    print(f"STOP: {stop}"); return 2
    print(f"run spend ${run_spend:.4f}; today ${daily_spend(k):.2f} of ${DAILY_CAP_USD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
