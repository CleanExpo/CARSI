"""Let this GitHub runner through carsi-db's Trusted sources for one DB ops run, then take it out.

Usage: python3 db/ops/do_firewall.py open     (adds this runner's public IPv4 address)
       python3 db/ops/do_firewall.py close    (removes exactly that address again)

Why: the database only accepts connections from its Trusted sources list (DigitalOcean's
database firewall). GitHub-hosted runners get a different address on every run, so no fixed
entry can let them in. Each run adds its own address before connecting and removes it in an
always-run step afterwards.

Needs DIGITALOCEAN_TOKEN (a DigitalOcean API token with database read + update) and
DB_CLUSTER_NAME (default carsi-db). DigitalOcean's API replaces the whole rule list on update,
so every existing rule is sent back unchanged; only this runner's ip_addr rule is added or
removed. Logs are public: no rule value other than this runner's own address is ever printed,
and API error bodies are not printed (only the HTTP status).
"""
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.digitalocean.com/v2"
STATE = os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "db-ops-runner-ip")


class FirewallError(Exception):
    pass


def _call(method, path, token, body=None):
    req = urllib.request.Request(
        API + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        hint = {401: " (token invalid or expired)", 403: " (token lacks database scope)",
                404: " (cluster not found)"}.get(e.code, "")
        raise FirewallError(f"DigitalOcean API {method} {path.split('?')[0]} returned "
                            f"HTTP {e.code}{hint}") from None


def cluster_id(token, name, call=_call):
    for db in call("GET", "/databases?per_page=200", token).get("databases", []):
        if db.get("name") == name:
            return db["id"]
    raise FirewallError(f"no database cluster named {name!r} is visible to this token")


def rules(token, cid, call=_call):
    return [{"type": r["type"], "value": r["value"]}
            for r in call("GET", f"/databases/{cid}/firewall", token).get("rules", [])]


def put(token, cid, new_rules, call=_call):
    call("PUT", f"/databases/{cid}/firewall", token, {"rules": new_rules})


def runner_ip():
    with urllib.request.urlopen("https://api.ipify.org", timeout=15) as r:
        ip = r.read().decode().strip()
    parts = ip.split(".")
    if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        raise FirewallError("could not read this runner's public IPv4 address")
    return ip


def open_for(ip, token, name, call=_call):
    cid = cluster_id(token, name, call)
    current = rules(token, cid, call)
    if {"type": "ip_addr", "value": ip} in current:
        return False
    put(token, cid, current + [{"type": "ip_addr", "value": ip}], call)
    return True


def close_for(ip, token, name, call=_call):
    cid = cluster_id(token, name, call)
    current = rules(token, cid, call)
    keep = [r for r in current if not (r["type"] == "ip_addr" and r["value"] == ip)]
    if len(keep) == len(current):
        return False
    put(token, cid, keep, call)
    return True


def main(argv):
    token = os.environ.get("DIGITALOCEAN_TOKEN", "")
    name = os.environ.get("DB_CLUSTER_NAME", "carsi-db")
    if not token:
        print("::error::DIGITALOCEAN_TOKEN secret is not set in production-db, so this runner "
              "cannot add itself to carsi-db's Trusted sources (see db/ops/README.md).")
        return 1
    try:
        if argv[1:] == ["open"]:
            ip = runner_ip()
            with open(STATE, "w") as f:
                f.write(ip)
            added = open_for(ip, token, name)
            print(f"Trusted sources: {'added' if added else 'already had'} this runner ({ip}).")
        elif argv[1:] == ["close"]:
            if not os.path.exists(STATE):
                print("Trusted sources: nothing to remove (open did not run).")
                return 0
            ip = open(STATE).read().strip()
            removed = close_for(ip, token, name)
            print(f"Trusted sources: {'removed' if removed else 'did not contain'} this runner ({ip}).")
        else:
            print("usage: do_firewall.py open|close")
            return 2
    except (FirewallError, urllib.error.URLError, OSError) as e:
        print(f"::error::{e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
