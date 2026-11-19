"""Tests for crosscheck.py. No network, no key, no spend.

Run: python3 -m unittest scripts/research/test_crosscheck.py
"""
import http.server
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import crosscheck as cc  # noqa: E402


def claims_file(rows):
    f = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    f.write("\n".join(json.dumps(r) for r in rows) + "\n")
    f.close()
    return f.name


def run_main(argv):
    out = io.StringIO()
    with mock.patch.object(sys, "argv", ["crosscheck.py", *argv]), redirect_stdout(out):
        try:
            code = cc.main()
        except SystemExit as e:
            code = e.code
    return code, out.getvalue()


class FakeChat:
    """Stands in for OpenRouter: /key returns a daily spend, chat returns a fixed answer."""

    def __init__(self, daily, cost=0.01):
        self.daily, self.cost, self.chat_calls = daily, cost, 0

    def __call__(self, path, k, body=None, timeout=180):
        if path == "/key":
            return {"data": {"usage_daily": self.daily}}
        self.chat_calls += 1
        self.daily += self.cost
        ans = {"verdict": "SUPPORTED", "correction": "", "source_url": "", "section": "r 1", "quote": ""}
        return {"choices": [{"message": {"content": json.dumps(ans)}}], "usage": {"cost": self.cost}}


CLAIM = {"id": "C1", "claim": "Air monitoring records are kept for 30 years.", "jurisdiction": "AU"}


class Caps(unittest.TestCase):
    def setUp(self):
        self.out = tempfile.mktemp(suffix=".jsonl")
        patcher = mock.patch.object(cc, "key", return_value="test-key-not-real")
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_daily_cap_stops_before_any_chat_call(self):
        fake = FakeChat(daily=cc.DAILY_CAP_USD - 0.10)
        with mock.patch.object(cc, "call", fake):
            code, text = run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "5"])
        self.assertEqual(code, 2)
        self.assertIn("daily spend", text)
        self.assertEqual(fake.chat_calls, 0)

    def test_run_cap_stops_before_any_chat_call(self):
        fake = FakeChat(daily=0.0)
        with mock.patch.object(cc, "call", fake):
            code, text = run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "0.1"])
        self.assertEqual(code, 2)
        self.assertEqual(fake.chat_calls, 0)

    def test_run_cap_stops_mid_run(self):
        fake = FakeChat(daily=0.0, cost=0.20)
        rows = [dict(CLAIM, id=f"C{i}") for i in range(10)]
        with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="NO_URL_OR_QUOTE"):
            code, _ = run_main(["--claims", claims_file(rows), "--out", self.out, "--max-usd", "1"])
        self.assertEqual(code, 2)
        self.assertLessEqual(fake.chat_calls * 0.20, 1.0)
        self.assertGreater(fake.chat_calls, 0)

    def test_unusable_daily_spend_blocks_before_any_chat_call(self):
        for bad in [float("nan"), float("inf"), -1.0, "abc", None, True, False, "0.5", [1]]:
            fake = FakeChat(daily=0.0)
            orig = fake.__call__

            def wrapped(path, k, body=None, timeout=180, bad=bad):
                if path == "/key":
                    return {"data": {"usage_daily": bad}}
                return orig(path, k, body, timeout)

            with mock.patch.object(cc, "call", wrapped):
                code, _ = run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "5"])
            self.assertNotEqual(code, 0, bad)
            self.assertEqual(fake.chat_calls, 0, bad)

    def test_daily_cap_holds_when_openrouter_usage_lags(self):
        # OpenRouter's usage_daily never moves during the run; the run's own spend must still count.
        fake = FakeChat(daily=cc.DAILY_CAP_USD - 0.40, cost=0.20)
        fake_lag = lambda path, k, body=None, timeout=180: (  # noqa: E731
            {"data": {"usage_daily": cc.DAILY_CAP_USD - 0.40}} if path == "/key" else fake(path, k, body, timeout))
        rows = [dict(CLAIM, id=f"C{i}") for i in range(20)]
        with mock.patch.object(cc, "call", fake_lag), mock.patch.object(cc, "quote_found", return_value="NO_URL_OR_QUOTE"):
            code, text = run_main(["--claims", claims_file(rows), "--out", self.out, "--max-usd", "5"])
        self.assertEqual(code, 2)
        self.assertIn("daily spend", text)
        self.assertLessEqual(cc.DAILY_CAP_USD - 0.40 + fake.chat_calls * 0.20, cc.DAILY_CAP_USD)

    def test_max_usd_above_daily_cap_refused(self):
        with mock.patch.object(cc, "call", FakeChat(daily=0.0)):
            code, _ = run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "25"])
        self.assertNotEqual(code, 0)


class PerCallBound(unittest.TestCase):
    """Review finding 1 (UNI-3469 round 1): one call must not be able to break either cap."""

    def setUp(self):
        self.out = tempfile.mktemp(suffix=".jsonl")
        p = mock.patch.object(cc, "key", return_value="test-key-not-real")
        p.start()
        self.addCleanup(p.stop)

    def test_worst_case_call_fits_inside_the_reserve(self):
        for model in cc.MODELS:
            self.assertLessEqual(cc.worst_case_call_usd(model), cc.PER_CALL_RESERVE_USD, model)

    def test_every_request_carries_price_ceiling_and_token_limit(self):
        sent = []

        def fake(path, k, body=None, timeout=180):
            if path == "/key":
                return {"data": {"usage_daily": 0.0}}
            sent.append(body)
            return {"choices": [{"message": {"content": "{}"}}], "usage": {"cost": 0.01}}

        with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="X"):
            run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "1"])
        self.assertEqual(len(sent), len(cc.MODELS))
        for b in sent:
            self.assertEqual(b["provider"]["max_price"], dict(zip(("prompt", "completion"), cc.PRICE_CEILING[b["model"]])))
            self.assertEqual(b["max_tokens"], cc.MAX_COMPLETION_TOKENS)

    def test_call_above_bound_stops_the_run(self):
        fake = FakeChat(daily=0.0, cost=cc.PER_CALL_RESERVE_USD + 0.25)
        with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="X"):
            code, text = run_main(["--claims", claims_file([CLAIM, dict(CLAIM, id="C2")]), "--out", self.out, "--max-usd", "5"])
        self.assertEqual(code, 2)
        self.assertEqual(fake.chat_calls, 1)
        self.assertIn("per-call bound", text)

    def test_missing_cost_fails_closed(self):
        def fake(path, k, body=None, timeout=180):
            if path == "/key":
                return {"data": {"usage_daily": 0.0}}
            return {"choices": [{"message": {"content": "{}"}}], "usage": {}}

        with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="X"):
            code, text = run_main(["--claims", claims_file([CLAIM]), "--out", self.out, "--max-usd", "5"])
        self.assertEqual(code, 2)
        self.assertIn("cost not reported", text)

    def test_cost_that_is_not_a_real_number_fails_closed(self):
        for bad in [False, True, "0.01", None, [0.01], {"usd": 0.01}, float("nan"), -0.01]:
            calls = {"n": 0}

            def fake(path, k, body=None, timeout=180, bad=bad):
                if path == "/key":
                    return {"data": {"usage_daily": 0.0}}
                calls["n"] += 1
                return {"choices": [{"message": {"content": "{}"}}], "usage": {"cost": bad}}

            rows = [dict(CLAIM, id=f"C{i}") for i in range(5)]
            with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="X"):
                code, text = run_main(["--claims", claims_file(rows), "--out", self.out, "--max-usd", "5"])
            self.assertEqual(code, 2, bad)
            self.assertEqual(calls["n"], 1, bad)
            self.assertIn("cost not reported", text, bad)

    def test_failed_request_counts_the_full_reserve(self):
        calls = {"n": 0}

        def fake(path, k, body=None, timeout=180):
            if path == "/key":
                return {"data": {"usage_daily": 0.0}}
            calls["n"] += 1
            raise TimeoutError("slow")

        with mock.patch.object(cc, "call", fake), mock.patch.object(cc, "quote_found", return_value="X"):
            code, _ = run_main(["--claims", claims_file([dict(CLAIM, id=f"C{i}") for i in range(5)]),
                                "--out", self.out, "--max-usd", "0.5"])
        self.assertEqual(code, 2)
        self.assertEqual(calls["n"], 2)  # 2 x 0.25 reserve reaches the 0.50 run cap


class InputValidation(unittest.TestCase):
    """Review findings 2 and 3 (UNI-3469 round 1)."""

    def _run(self, claim, max_usd="1"):
        fake = FakeChat(daily=0.0)
        k = mock.Mock(return_value="x")
        with mock.patch.object(cc, "key", k), mock.patch.object(cc, "call", fake):
            code, _ = run_main(["--claims", claims_file([claim]), "--out", tempfile.mktemp(), "--max-usd", max_usd])
        return code, fake.chat_calls, k.call_count

    def test_non_finite_max_usd_refused_before_key(self):
        for v in ["nan", "inf", "-inf"]:
            code, chats, keys = self._run(CLAIM, v)
            self.assertNotEqual(code, 0, v)
            self.assertEqual((chats, keys), (0, 0), v)

    def test_iicrc_in_jurisdiction_refused_before_key(self):
        code, chats, keys = self._run(dict(CLAIM, jurisdiction="AU; IICRC S500 standard says drying is required"))
        self.assertNotEqual(code, 0)
        self.assertEqual((chats, keys), (0, 0))

    def test_scan_covers_every_field_sent_not_just_claim(self):
        bad = "AU; IICRC S500 standard says drying is required"
        with mock.patch.object(cc, "JURISDICTIONS", {"AU", bad}):  # the scan alone must catch it
            code, chats, keys = self._run(dict(CLAIM, jurisdiction=bad))
        self.assertNotEqual(code, 0)
        self.assertEqual((chats, keys), (0, 0))

    def test_unknown_jurisdiction_refused(self):
        code, chats, keys = self._run(dict(CLAIM, jurisdiction="US"))
        self.assertNotEqual(code, 0)
        self.assertEqual((chats, keys), (0, 0))


class ModelOutput(unittest.TestCase):
    """Review round 2, finding 1: model output is untrusted; one owner coerces it."""

    def test_wrong_types_become_malformed_and_the_row_is_still_written(self):
        for bad in [{"verdict": "SUPPORTED", "source_url": 7, "quote": "these are long quoted words from a page"},
                    {"verdict": "SUPPORTED", "source_url": "https://x.test", "quote": ["a", "list"]},
                    {"verdict": "TRUE", "source_url": "", "quote": ""},
                    ["not", "an", "object"]]:
            out = tempfile.mktemp(suffix=".jsonl")

            def fake(path, k, body=None, timeout=180, bad=bad):
                if path == "/key":
                    return {"data": {"usage_daily": 0.0}}
                return {"choices": [{"message": {"content": json.dumps(bad)}}], "usage": {"cost": 0.01}}

            with mock.patch.object(cc, "key", return_value="x"), mock.patch.object(cc, "call", fake):
                code, _ = run_main(["--claims", claims_file([CLAIM]), "--out", out, "--max-usd", "1"])
            self.assertEqual(code, 0, bad)
            rows = [json.loads(l) for l in open(out)]
            self.assertEqual(len(rows), len(cc.MODELS), bad)
            for r in rows:
                self.assertIn(r["verdict"], {"MALFORMED", "UNPARSED"}, bad)
                self.assertEqual(r["cost_usd"], 0.01)
                for f in cc.ANSWER_FIELDS:
                    self.assertIsInstance(r[f], str)

    def test_quote_found_never_crashes_on_wrong_types(self):
        self.assertEqual(cc.quote_found(7, "x" * 30), "NO_URL_OR_QUOTE")
        self.assertEqual(cc.quote_found("https://x.test", ["x"]), "NO_URL_OR_QUOTE")


class VisibleTextOnly(unittest.TestCase):
    """Review round 2, finding 2: only words a reader sees can confirm a quote."""

    def _check(self, page, quote):
        class R(io.BytesIO):
            headers = {"Content-Type": "text/html"}

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        with mock.patch.object(cc.urllib.request, "urlopen", lambda req, timeout=0: R(page)):
            return cc.quote_found("https://example.test/p", quote)

    def test_script_style_comment_and_head_text_do_not_count(self):
        q = "the exact quotation appears only here"
        for page in [f"<html><script>{q}</script><body>Other content</body></html>",
                     f"<html><style>/* {q} */</style><body>Other</body></html>",
                     f"<html><!-- {q} --><body>Other</body></html>",
                     f"<html><head><meta content='{q}'><title>{q}</title></head><body>Other</body></html>",
                     f"<html><body><template>{q}</template>Other</body></html>"]:
            self.assertEqual(self._check(page.encode(), q), "QUOTE_NOT_IN_PAGE", page)

    def test_visible_body_text_counts(self):
        q = "the exact quotation appears only here"
        self.assertEqual(self._check(f"<html><body><p>See: {q}.</p></body></html>".encode(), q), "QUOTE_FOUND")


class IicrcGuard(unittest.TestCase):
    def test_refuses_iicrc_and_s_standard_claims_without_calling(self):
        for text in ["ANSI/IICRC S500 requires drying", "The S520 says", "IICRC guidance", "S 500 section 12",
                     "the s-500 says", "S500:2021 clause", "iicrc rules", "ANSI IICRC S100",
                     "S700 section 4 covers fire damage", "s-800 inspection", "S 300 upholstery",
                     "S.220 flooring", "per S900", "the I.I.C.R.C. view",
                     "S\u2013500 drying", "S\u2011500 drying", "S/500 drying", "S_500 drying", "S -- 500",
                     "\uff33\uff15\uff10\uff10 drying", "\u0405500 drying", "S\u0665\u0660\u0660",
                     "IICR\u200bC rules", "S\u00a0500 drying",
                     "S\n500 requires drying", "S------500 drying", "S" + "-" * 40 + "500", "S 5 0 0 drying",
                     "S\n\n\n500", "I-I-C-R-C rules", "I\nI\nC\nR\nC", "s(500)", "S'500"]:
            fake = FakeChat(daily=0.0)
            with mock.patch.object(cc, "key", return_value="x"), mock.patch.object(cc, "call", fake):
                code, _ = run_main(["--claims", claims_file([dict(CLAIM, claim=text)]),
                                    "--out", tempfile.mktemp(), "--max-usd", "1"])
            self.assertNotEqual(code, 0, text)
            self.assertEqual(fake.chat_calls, 0, text)

    def test_refuses_any_character_outside_plain_ascii(self):
        for text in ["Air monitoring \u2013 30 years", "kept 30 years\u200b", "caf\u00e9 rule", "line\x00break"]:
            fake = FakeChat(daily=0.0)
            with mock.patch.object(cc, "key", return_value="x"), mock.patch.object(cc, "call", fake):
                code, _ = run_main(["--claims", claims_file([dict(CLAIM, claim=text)]),
                                    "--out", tempfile.mktemp(), "--max-usd", "1"])
            self.assertNotEqual(code, 0, repr(text))
            self.assertEqual(fake.chat_calls, 0, repr(text))

    def test_allows_ordinary_whs_claim(self):
        for text in [CLAIM["claim"], "AS/NZS 1716:2012 respirators", "reg 529CB(3)", "The PCBU's 100 workers",
                     "Schedule 14", "0.05 mg/m3", "Regulations 2017, 1 July 2024", "Victoria 319L(1)(a)",
                     cc.PROMPT.format(claim="x", jurisdiction="AU+NZ")]:
            self.assertFalse(cc.names_iicrc(text), text)


class QuoteCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pages = {"/page": (b"<html><p>kept for 30&nbsp;years after the date the record is made</p></html>", "text/html")}

        class H(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                body, ctype = pages.get(self.path, (b"", "text/html"))
                self.send_response(200 if self.path in pages else 404)
                self.send_header("Content-Type", ctype)
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a):
                pass

        cls.srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.srv.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def test_requires_https(self):
        self.assertEqual(cc.quote_found(self.base + "/page", "kept for 30 years"), "NO_URL_OR_QUOTE")

    def test_found_and_not_found(self):
        # The local server is http, so allow it only for this test.
        with mock.patch.object(cc, "_scheme_ok", lambda u: True):
            self.assertEqual(cc.quote_found(self.base + "/page", "kept for 30 years after the date"), "QUOTE_FOUND")
            self.assertEqual(cc.quote_found(self.base + "/page", "kept for 7 years after the date"), "QUOTE_NOT_IN_PAGE")
            self.assertEqual(cc.quote_found(self.base + "/missing", "a quote long enough to fetch"), "FETCH_FAILED:HTTP404")

    def test_short_or_empty_quote_never_found(self):
        with mock.patch.object(cc, "_scheme_ok", lambda u: True):
            for q in ["—", "  ", "30", "the record"]:
                self.assertEqual(cc.quote_found(self.base + "/page", q), "QUOTE_TOO_SHORT", repr(q))


if __name__ == "__main__":
    unittest.main()
