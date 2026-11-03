"""Tests for dburl.py: python3 db/ops/test_dburl.py (exit 1 on any failure). Fake credentials only."""
import contextlib
import importlib.util
import io
import pathlib
import sys

here = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("dburl", here / "dburl.py")
dburl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dburl)

WANT = "postgresql://doadmin:fakepass@db.example.com:25060/defaultdb?sslmode=require"
OK = {
    "connection string": WANT,
    "quoted": f'"{WANT}"',
    "spaces and newline": f"  {WANT}\n",
    "DATABASE_URL= prefix": f"DATABASE_URL={WANT}",
    "prisma schema param": WANT + "&schema=public",
    "postgres scheme": WANT.replace("postgresql://", "postgres://", 1),
    "psql with URL": f"psql '{WANT}'",
    "flags": "PGPASSWORD=fakepass psql -U doadmin -h db.example.com -p 25060 -d defaultdb --set=sslmode=require",
    "parameters": "username = doadmin\npassword = fakepass\nhost = db.example.com\nport = 25060\ndatabase = defaultdb\nsslmode = require\n",
}
BAD = {"empty": "", "just a password": "fakepass", "host only": "db.example.com"}

failed = 0
for name, raw in OK.items():
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        got = dburl.normalise(raw)
    if got.replace("postgres://", "postgresql://", 1) != WANT:
        print(f"FAIL {name}: got a different URL")
        failed += 1
    if "::add-mask::fakepass" not in out.getvalue():
        print(f"FAIL {name}: password was not masked")
        failed += 1
for name, raw in BAD.items():
    try:
        dburl.normalise(raw)
        print(f"FAIL {name}: accepted")
        failed += 1
    except dburl.BadUrl as e:
        if "fakepass" in str(e) or "example.com" in str(e):
            print(f"FAIL {name}: error message leaks the value")
            failed += 1
print(f"{len(OK)} accepted + {len(BAD)} refused formats, {failed} failed")
sys.exit(1 if failed else 0)
