"""Run one reviewed db/ops/write/*.sql file in a single transaction.

Usage: DATABASE_URL=... python3 db/ops/run-write.py <file>   (URL from the environment, never argv)

Deliberately not psql: psql meta-commands (\\!, \\gexec, \\copy, \\o) could otherwise run from the
file with the production URL in the environment. This sends the SQL text only, in one
transaction: any error rolls back everything; success commits once at the end. Server notices
(RAISE NOTICE) and each result set are printed.
"""
import os
import sys

import psycopg

url, path = os.environ["DATABASE_URL"], sys.argv[1]
sql = open(path, encoding="utf-8").read()
with psycopg.connect(url, connect_timeout=15, autocommit=False) as conn:
    conn.add_notice_handler(lambda d: print(f"NOTICE: {d.message_primary}"))
    with conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute(sql, prepare=False)
        n = 0
        while True:
            n += 1
            if cur.description:
                rows = cur.fetchall()
                print(f"\n-- result {n}: {len(rows)} row(s)")
                print(" | ".join(d.name for d in cur.description))
                for r in rows:
                    print(" | ".join("" if v is None else str(v) for v in r))
            elif cur.statusmessage:
                print(f"-- {cur.statusmessage}")
            if not cur.nextset():
                break
    conn.commit()
    print("\nCommitted.")
