"""Turn whatever was pasted into the DATABASE_URL secret into a libpq URL, without printing it.

DigitalOcean's connection box offers three formats, and a pasted secret often carries quotes,
spaces or a leading "DATABASE_URL=". All of these are accepted:

  postgresql://user:pass@host:25060/db?sslmode=require      (Connection string)
  PGPASSWORD=pass psql -U user -h host -p 25060 -d db --set=sslmode=require   (Flags)
  username = user / password = pass / host = ... / port / database / sslmode   (Parameters)

Prisma-only URL params (schema=) are dropped; libpq rejects them. The password and host are
registered with ::add-mask:: so they stay hidden in the public log even outside the full URL.
When the value cannot be understood, the error describes its shape (length, lines, markers),
never its content.
"""
import os
import re
import shlex
from urllib.parse import parse_qsl, quote, urlencode

# Prisma-only URL params that libpq rejects.
PRISMA_PARAMS = {"schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout",
                 "statement_cache_size"}


class BadUrl(Exception):
    pass


def _mask(*values):
    """Hide values in the Actions log. Only on a runner: elsewhere it would print them."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    for v in values:
        for line in (v or "").splitlines():  # one command per line; a newline would end it
            if len(line) > 3:
                print(f"::add-mask::{line}")


def _build(user, password, host, port, db, sslmode):
    if not (user and password and host):
        raise BadUrl("connection details are missing a user, password or host")
    _mask(password, host)
    url = f"postgresql://{quote(user, safe='')}:{quote(password, safe='')}@{host}"
    url += f":{port}" if port else ""
    url += f"/{quote(db, safe='')}" if db else ""
    return url + f"?sslmode={sslmode or 'require'}"


def describe(raw: str) -> str:
    """Shape of the value only: safe to print."""
    s = raw.strip()
    marks = [m for m in ("://", "@", "psql", "PGPASSWORD", "host", "sslmode", "=") if m in s]
    first = "quote" if s[:1] in "\"'" else ("letter" if s[:1].isalpha() else "other")
    return (f"{len(raw)} characters, {raw.count(chr(10)) + 1} line(s), starts with a {first}, "
            f"contains: {', '.join(marks) or 'none of the expected markers'}")


def normalise(raw: str) -> str:
    s = raw.strip().strip("\"'").strip()
    s = re.sub(r"^(export\s+)?DATABASE_URL\s*=\s*", "", s).strip().strip("\"'").strip()
    m = re.search(r"postgres(?:ql)?://[^\s\"']+", s)
    if m:
        url = m.group(0)
        user = re.match(r"postgres(?:ql)?://([^:@/]*)(?::([^@/]*))?@([^:/?]+)", url)
        if user:
            _mask(user.group(2), user.group(3))
        base, _, query = url.partition("?")
        keep = [(k, v) for k, v in parse_qsl(query, keep_blank_values=True)
                if k.lower() not in PRISMA_PARAMS]
        return base + ("?" + urlencode(keep) if keep else "")
    pairs = dict((k.strip().lower(), v.strip()) for k, v in
                 re.findall(r"(?m)^\s*([A-Za-z_]+)\s*[=:]\s*(\S+)\s*$", s))
    if pairs.get("host") and pairs.get("password"):
        return _build(pairs.get("username") or pairs.get("user"), pairs.get("password"),
                      pairs.get("host"), pairs.get("port"),
                      pairs.get("database") or pairs.get("dbname"), pairs.get("sslmode"))
    if re.search(r"(^|\s)psql(\s|$)", s) or re.search(r"(^|\s)-h\s", s):
        try:
            tokens = shlex.split(s)
        except ValueError:
            raise BadUrl(f"the psql flags could not be read ({describe(raw)})") from None
        env = dict(t.split("=", 1) for t in tokens if re.match(r"^PG[A-Z]+=", t))
        opt = {}
        for i, t in enumerate(tokens):
            if t in ("-U", "-h", "-p", "-d") and i + 1 < len(tokens):
                opt[t] = tokens[i + 1]
        ssl = re.search(r"sslmode=(\w+)", s)
        return _build(opt.get("-U") or env.get("PGUSER"), env.get("PGPASSWORD"),
                      opt.get("-h") or env.get("PGHOST"), opt.get("-p") or env.get("PGPORT"),
                      opt.get("-d") or env.get("PGDATABASE"), ssl and ssl.group(1))
    raise BadUrl("DATABASE_URL is not a connection string, psql flags or connection "
                 f"parameters ({describe(raw)}). Paste DigitalOcean's 'Connection string'.")


def from_env(name: str = "DATABASE_URL") -> str:
    import os
    import sys
    try:
        return normalise(os.environ.get(name, ""))
    except BadUrl as e:
        print(f"::error::{e}")
        sys.exit(1)
