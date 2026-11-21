"""Tests for do_firewall.py: python3 db/ops/test_do_firewall.py (exit 1 on any failure).

A fake DigitalOcean API (no network). The key property: open/close add or remove ONLY this
runner's rule and send every other rule back unchanged, because the API replaces the list.
"""
import importlib.util
import pathlib
import sys

here = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("fw", here / "do_firewall.py")
fw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fw)

OTHERS = [
    {"type": "ip_addr", "value": "203.0.113.7"},   # someone's office (TablePlus)
    {"type": "app", "value": "app-uuid-1"},         # the App Platform site
    {"type": "droplet", "value": "123"},
]
RUNNER = "198.51.100.20"


def fake(rules):
    state = {"rules": [dict(r, uuid="x", cluster_uuid="c") for r in rules], "puts": 0}

    def call(method, path, token, body=None):
        if path.startswith("/databases?"):
            return {"databases": [{"name": "other-db", "id": "nope"}, {"name": "carsi-db", "id": "cid"}]}
        assert path == "/databases/cid/firewall", path
        if method == "GET":
            return {"rules": state["rules"]}
        state["puts"] += 1
        state["rules"] = [dict(r, uuid="y", cluster_uuid="c") for r in body["rules"]]
        return {}
    return state, call


def plain(rules):
    return [{"type": r["type"], "value": r["value"]} for r in rules]


failed = 0


def check(name, ok):
    global failed
    if not ok:
        print(f"FAIL {name}")
        failed += 1


s, call = fake(OTHERS)
check("open adds the runner", fw.open_for(RUNNER, "t", "carsi-db", call) is True)
check("open keeps every other rule", plain(s["rules"]) == OTHERS + [{"type": "ip_addr", "value": RUNNER}])
check("open twice does not duplicate", fw.open_for(RUNNER, "t", "carsi-db", call) is False and s["puts"] == 1)
check("close removes the runner", fw.close_for(RUNNER, "t", "carsi-db", call) is True)
check("close restores the original list exactly", plain(s["rules"]) == OTHERS)
check("close again is a no-op", fw.close_for(RUNNER, "t", "carsi-db", call) is False and s["puts"] == 2)

# close never removes a rule it did not add, even an ip_addr rule for another address
s, call = fake(OTHERS)
fw.close_for("203.0.113.8", "t", "carsi-db", call)
check("close leaves other addresses alone", plain(s["rules"]) == OTHERS and s["puts"] == 0)

# unknown cluster name fails loudly
s, call = fake(OTHERS)
try:
    fw.open_for(RUNNER, "t", "not-a-cluster", call)
    check("unknown cluster refused", False)
except fw.FirewallError:
    pass

# HTTP errors never echo the response body (it could contain rule values)
check("http error message has no body",
      "203.0.113.7" not in str(fw.FirewallError("DigitalOcean API GET /databases returned HTTP 403")))

# a missing token is an error, not a silent pass
import os  # noqa: E402
os.environ.pop("DIGITALOCEAN_TOKEN", None)
check("missing token exits non-zero", fw.main(["x", "open"]) == 1)

print(f"do_firewall: {failed} failed")
sys.exit(1 if failed else 0)
