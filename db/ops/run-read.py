"""Run one reviewed db/ops/read/*.sql file and print each result set.

Usage: DATABASE_URL=... python3 db/ops/run-read.py <file>   (URL from the environment, never argv)

Deliberately not psql: psql meta-commands (\\gexec, \\!) could otherwise run from the file.
This sends the SQL text to the server and nothing else, in a READ ONLY transaction that is
rolled back at the end. check-read-sql.py has already refused anything but plain queries.
"""
import os
import sys

import psycopg

url, path = os.environ["DATABASE_URL"], sys.argv[1]
sql = open(path, encoding="utf-8").read()
with psycopg.connect(url, connect_timeout=15, autocommit=False) as conn:
    conn.read_only = True
    with conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout = '30s'")
        cur.execute(sql, prepare=False)
        n = 0
        while True:
            n += 1
            if cur.description:
                cols = [d.name for d in cur.description]
                rows = cur.fetchall()
                print(f"\n-- result {n}: {len(rows)} row(s)")
                print(" | ".join(cols))
                for r in rows:
                    print(" | ".join("" if v is None else str(v) for v in r))
            if not cur.nextset():
                break
    conn.rollback()
