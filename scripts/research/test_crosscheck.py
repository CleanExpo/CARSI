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


class IicrcGuard(unittest.TestCase):
    def test_refuses_iicrc_and_s_standard_claims_without_calling(self):
        for text in ["ANSI/IICRC S500 requires drying", "The S520 says", "IICRC guidance", "S 500 section 12",
                     "the s-500 says", "S500:2021 clause", "iicrc rules", "ANSI IICRC S100"]:
            fake = FakeChat(daily=0.0)
            with mock.patch.object(cc, "key", return_value="x"), mock.patch.object(cc, "call", fake):
                code, _ = run_main(["--claims", claims_file([dict(CLAIM, claim=text)]),
                                    "--out", tempfile.mktemp(), "--max-usd", "1"])
            self.assertNotEqual(code, 0, text)
            self.assertEqual(fake.chat_calls, 0, text)

    def test_allows_ordinary_whs_claim(self):
        self.assertIsNone(cc.IICRC_RX.search(CLAIM["claim"]))
        self.assertIsNone(cc.IICRC_RX.search("AS/NZS 1716:2012 respirators"))


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
