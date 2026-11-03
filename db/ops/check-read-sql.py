"""Refuse a db/ops/read/*.sql file unless every statement is a plain query.

Usage: python3 db/ops/check-read-sql.py <file>   (exit 0 = allowed, 1 = refused)

The read job's read-only session can be switched off from SQL (SET ... read_only = off), so
this check, not the session setting, is what keeps a read file from writing. It runs before any
database connection. Rules, applied after removing comments and string literals:
  - no psql meta-commands (a line starting with a backslash: \\! runs a shell, \\copy writes files);
  - every statement starts with SELECT, WITH, TABLE, VALUES or EXPLAIN;
  - no write/DDL/session keyword anywhere (this also catches a data-modifying CTE such as
    WITH x AS (UPDATE ...) and EXPLAIN ANALYZE <write>);
  - no set_config(), transaction_read_only, dblink or lo_ functions;
  - no learner tables or sensitive columns (public logs).
"""
import re
import sys

FORBIDDEN = re.compile(
    r"\b(insert|update|delete|merge|upsert|alter|create|drop|truncate|grant|revoke|copy|call|do|"
    r"set|reset|commit|rollback|begin|start|savepoint|release|abort|end|lock|vacuum|analyze|reindex|"
    r"cluster|refresh|notify|listen|unlisten|prepare|execute|deallocate|discard|import|load|"
    r"security|comment|into)\b"
    r"|set_config\s*\(|transaction_read_only|default_transaction_read_only|\bdblink\w*\s*\(|\blo_\w+\s*\(",
    re.I,
)
SENSITIVE = re.compile(r"\blms_users\b|email|password|phone|token|stripe", re.I)
ALLOWED_START = re.compile(r"^\s*(select|with|table|values|explain)\b", re.I)


def strip(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)  # block comments
    sql = re.sub(r"--[^\n]*", " ", sql)  # line comments
    sql = re.sub(r"\$([A-Za-z_]*)\$.*?\$\1\$", " '' ", sql, flags=re.S)  # dollar-quoted bodies
    sql = re.sub(r"'(?:[^']|'')*'", " '' ", sql)  # string literals
    return sql


def problems(raw: str) -> list[str]:
    out = []
    for n, line in enumerate(raw.splitlines(), 1):
        if line.lstrip().startswith("\\"):
            out.append(f"line {n}: psql meta-command")
    body = strip(raw)
    for stmt in (s.strip() for s in body.split(";")):
        if not stmt:
            continue
        if not ALLOWED_START.match(stmt):
            out.append(f"statement is not a plain query: {stmt[:60]!r}")
        m = FORBIDDEN.search(stmt)
        if m:
            out.append(f"forbidden keyword {m.group(0)!r} in: {stmt[:60]!r}")
        m = SENSITIVE.search(stmt)
        if m:
            out.append(f"learner table or sensitive column {m.group(0)!r} (logs are public)")
    return out


if __name__ == "__main__":
    found = problems(open(sys.argv[1], encoding="utf-8").read())
    for p in found:
        print(f"::error::{sys.argv[1]}: {p}")
    sys.exit(1 if found else 0)
