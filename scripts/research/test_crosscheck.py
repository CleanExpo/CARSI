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


class IicrcGuard(unittest.TestCase):
    def test_refuses_iicrc_and_s_standard_claims_without_calling(self):
        for text in ["ANSI/IICRC S500 requires drying", "The S520 says", "IICRC guidance", "S 500 section 12"]:
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
            self.assertEqual(cc.quote_found(self.base + "/page", "kept for 7 years"), "QUOTE_NOT_IN_PAGE")
            self.assertEqual(cc.quote_found(self.base + "/missing", "x"), "FETCH_FAILED:HTTP404")


if __name__ == "__main__":
    unittest.main()
