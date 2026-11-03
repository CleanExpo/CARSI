"""Refuse a db/ops/read/*.sql file unless every statement is a plain query.

Usage: python3 db/ops/check-read-sql.py <file>           (read file: exit 0 = allowed, 1 = refused)
       python3 db/ops/check-read-sql.py --write <file>   (write file: lexes cleanly, no backslash)

The read job's read-only session can be switched off from SQL, so this check (run before any
connection) is what keeps a read file from writing. It is a single-pass lexer, not a regex
pipeline: it walks the file the way PostgreSQL does, so a comment marker inside a string, or a
string marker inside a comment, cannot hide a statement.

  - Tokens: -- line comments, /* nested */ comments, 'strings' (with '' and E'\\' escapes),
    $tag$ dollar-quoted strings, "quoted identifiers", words, and punctuation.
  - Any backslash outside a string or comment is refused (psql meta-commands such as \\gexec
    or \\!). The read job does not use psql anyway (db/ops/run-read.py sends plain SQL).
  - Every statement must begin with SELECT, WITH or VALUES (TABLE x is SELECT * and is refused).
  - No forbidden word anywhere in a statement, whether bare or "quoted": writes, DDL, session
    and transaction control, set_config, dblink, lo_*, pg_read_file and friends.
  - Tables: a word naming any table in prisma/schema.prisma must be on ALLOWED_TABLES (an
    allowlist, not a denylist), so learner, admin, payment and CRM tables cannot be read.
    pg_* catalog names are refused too.
  - Columns: learner ids and quiz content (question text, options, answers) are refused, and so is
    a bare * (count(*) is fine), so an allowed table cannot be dumped whole.
  - Functions: only those on FUNCTIONS may be called, so no serialiser (table_to_xml,
    query_to_xml_and_xmlschema, row_to_json, json_agg...) can dump a table named in a string.
  - FROM/JOIN: every source is an allowed table, a CTE or a (subquery); comma joins are refused,
    so every table in the statement is checked.
  - Whole rows: a table or its alias may only be used as alias.column, so SELECT c FROM t c,
    c::text and (c) cannot print a whole row.
  - Words: every other word must be a keyword, an allowed function, a column on ALLOWED_COLUMNS
    (an allowlist, so checkpoint JSON or lesson bodies cannot be named), or a name the
    statement defines (alias, CTE, AS output name). A CTE is never callable as a function.
  - No & (U&"..." escapes).
  Logs of this public repository are public; the allowlist is what keeps learner data out of them.
"""
import re
import sys

FORBIDDEN = {
    "insert", "update", "delete", "merge", "upsert", "alter", "create", "drop", "truncate",
    "grant", "revoke", "copy", "call", "do", "set", "reset", "commit", "rollback", "begin",
    "start", "savepoint", "release", "abort", "end", "lock", "vacuum", "analyze", "analyse",
    "reindex", "cluster", "refresh", "notify", "listen", "unlisten", "prepare", "execute",
    "deallocate", "discard", "import", "load", "security", "comment", "into", "explain", "table",
    "set_config", "transaction_read_only", "default_transaction_read_only", "dblink",
    "dblink_exec", "pg_read_file", "pg_read_binary_file", "pg_ls_dir", "pg_terminate_backend",
    "pg_cancel_backend", "pg_reload_conf", "pg_sleep", "query_to_xml", "query_to_json",
}
SENSITIVE = re.compile(r"email|password|phone|token|stripe|secret|hash|address", re.I)
ALLOWED_TABLES = {
    "lms_courses", "lms_modules", "lms_lessons", "lms_quizzes", "lms_quiz_questions",
    "lms_quiz_attempts", "lms_enrollments", "lms_lesson_progress",
}
SENSITIVE_COLUMNS = {
    "question_text", "options", "correct_index", "explanation", "answers", "student_id",
    "user_id", "payment_reference", "content_version", "score_percent", "notes",
}
SERIALISER = re.compile(r"_to_xml$|^xml|to_jsonb?$|_to_json$|^json_|^jsonb_|_agg$|^row_to", re.I)


def known_tables() -> set:
    import pathlib
    schema = pathlib.Path(__file__).resolve().parents[2] / "prisma" / "schema.prisma"
    names = set(re.findall(r'@@map\("([A-Za-z0-9_]+)"\)', schema.read_text(encoding="utf-8")))
    if len(names) < 10:
        raise SystemExit(f"::error::could not read table names from {schema}")
    return {n.lower() for n in names}
STARTERS = {"select", "with", "values"}
# The only functions a read file may call. Anything else followed by "(" is refused.
FUNCTIONS = {
    "count", "sum", "min", "max", "avg", "coalesce", "nullif", "lower", "upper", "length",
    "round", "abs", "floor", "ceil", "greatest", "least", "now", "current_database", "date_trunc",
}
# SQL keywords that may be followed by "(" (they are syntax, not function calls).
PAREN_KEYWORDS = {
    "in", "exists", "as", "values", "from", "join", "using", "over", "filter", "on", "and", "or",
    "not", "where", "when", "then", "else", "select", "by", "any", "all", "some", "case", "with",
    "union", "except", "intersect", "is", "distinct", "having", "between", "like", "ilike",
}
# Words after a FROM/JOIN source that end it rather than name an alias.
SOURCE_END = {
    "where", "join", "inner", "left", "right", "full", "cross", "natural", "on", "using", "group",
    "order", "limit", "offset", "union", "except", "intersect", "having", "window", "fetch",
}
# Sources outside the Prisma tables: migration history and schema metadata (no learner data).
META_SOURCES = {"_prisma_migrations"}
INFO_SCHEMA_VIEWS = {"columns", "tables"}
# The only columns a read file may name. An allowlist: anything else (checkpoint JSON, lesson
# bodies, learner ids, quiz content) is refused, because job logs are public.
ALLOWED_COLUMNS = {
    "id", "slug", "title", "status", "is_published", "price_aud", "course_id", "module_id",
    "lesson_id", "quiz_id", "order_index", "pass_percentage", "attempts_allowed", "created_at",
    "updated_at", "prerequisite_gated",
    # _prisma_migrations and information_schema (schema metadata, no learner data)
    "migration_name", "finished_at", "rolled_back_at", "started_at", "applied_steps_count",
    "column_name", "data_type", "is_nullable", "column_default", "table_name", "table_schema",
}
KEYWORDS = {
    "select", "from", "where", "join", "inner", "left", "right", "full", "outer", "cross",
    "natural", "on", "using", "and", "or", "not", "in", "is", "null", "as", "order", "by", "group",
    "having", "limit", "offset", "asc", "desc", "nulls", "first", "last", "distinct", "union",
    "all", "except", "intersect", "exists", "like", "ilike", "between", "true", "false", "with",
    "values", "any", "some", "window", "fetch",
} | FUNCTIONS


class Refused(Exception):
    pass


def tokens(sql: str):
    """Yield (kind, text) for words and punctuation; skip comments and string contents."""
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        if c.isspace():
            i += 1
        elif sql.startswith("--", i):
            j = sql.find("\n", i)
            i = n if j < 0 else j + 1
        elif sql.startswith("/*", i):
            depth, i = 1, i + 2
            while i < n and depth:
                if sql.startswith("/*", i):
                    depth, i = depth + 1, i + 2
                elif sql.startswith("*/", i):
                    depth, i = depth - 1, i + 2
                else:
                    i += 1
            if depth:
                raise Refused("unterminated /* comment")
        elif c in "eE" and i + 1 < n and sql[i + 1] == "'":
            i = skip_string(sql, i + 1, backslash=True)
            yield ("str", "")
        elif c == "'":
            i = skip_string(sql, i, backslash=False)
            yield ("str", "")
        elif c == "$" and re.match(r"\$([A-Za-z_][A-Za-z_0-9]*)?\$", sql[i:]):
            tag = re.match(r"\$([A-Za-z_][A-Za-z_0-9]*)?\$", sql[i:]).group(0)
            j = sql.find(tag, i + len(tag))
            if j < 0:
                raise Refused("unterminated dollar-quoted string")
            i = j + len(tag)
            yield ("str", "")
        elif c == '"':
            j = i + 1
            buf = []
            while True:
                if j >= n:
                    raise Refused("unterminated quoted identifier")
                if sql[j] == '"':
                    if j + 1 < n and sql[j + 1] == '"':
                        buf.append('"')
                        j += 2
                        continue
                    break
                buf.append(sql[j])
                j += 1
            i = j + 1
            yield ("word", "".join(buf))
        elif c == "\\":
            raise Refused("backslash outside a string (psql meta-command)")
        elif c.isalnum() or c == "_":
            j = i
            while j < n and (sql[j].isalnum() or sql[j] in "_$"):
                j += 1
            yield ("word", sql[i:j])
            i = j
        else:
            yield ("punct", c)
            i += 1


def skip_string(sql: str, i: int, backslash: bool) -> int:
    j, n = i + 1, len(sql)
    while j < n:
        ch = sql[j]
        if backslash and ch == "\\":
            j += 2
            continue
        if ch == "'":
            if j + 1 < n and sql[j + 1] == "'":
                j += 2
                continue
            return j + 1
        j += 1
    raise Refused("unterminated string literal")


def problems(sql: str) -> list:
    out = []
    try:
        stmt = []
        statements = []
        for kind, text in tokens(sql):
            if kind == "punct" and text == ";":
                statements.append(stmt)
                stmt = []
            else:
                stmt.append((kind, text))
        statements.append(stmt)
    except Refused as e:
        return [str(e)]
    tables = known_tables()
    for stmt in statements:
        out.extend(structure_problems(stmt))
        words = [t for k, t in stmt if k == "word"]
        if not stmt:
            continue
        for idx, (kind, text) in enumerate(stmt):
            if kind == "punct" and text == "&":
                out.append("'&' is not allowed (blocks U&\"...\" escaped names)")
            if kind == "punct" and text == "*":
                prev = stmt[idx - 1] if idx else ("", "")
                if prev != ("punct", "("):
                    out.append("bare * is not allowed (name the columns; count(*) is fine)")
        if not words or words[0].lower() not in STARTERS:
            out.append(f"statement does not start with SELECT/WITH/VALUES: {words[:3]}")
        for w in words:
            lw = w.lower()
            if lw in FORBIDDEN or lw.startswith("lo_"):
                out.append(f"forbidden word {w!r}")
            if SENSITIVE.search(w) or lw in SENSITIVE_COLUMNS:
                out.append(f"sensitive column {w!r} (logs are public)")
            if (lw in tables and lw not in ALLOWED_TABLES) or lw.startswith("pg_"):
                out.append(f"table {w!r} is not on the read allowlist (logs are public)")
            if SERIALISER.search(lw):
                out.append(f"row/table serialiser {w!r} is not allowed")
    return out


def structure_problems(stmt: list) -> list:
    """Word allowlist: every word is a keyword, an allowed function or column, or a name the
    statement itself defines (a table alias, CTE, subquery alias or AS output name)."""
    out = []
    low = [(k, t.lower()) for k, t in stmt]

    def at(i):
        return low[i] if 0 <= i < len(low) else ("", "")

    def is_word(i):
        return at(i)[0] == "word"

    ctes, derived, protected = set(), set(), set()
    defining = set()       # positions where a name is declared, not used
    # CTE names: <word> AS ( ... ). Their output columns are checked inside the CTE.
    for i in range(len(low) - 2):
        if is_word(i) and at(i + 1) == ("word", "as") and at(i + 2) == ("punct", "("):
            ctes.add(low[i][1])
            defining.add(i)
    for i, (k, t) in enumerate(low):
        if k != "word" or t not in ("from", "join"):
            continue
        j = i + 1
        subquery = at(j) == ("punct", "(")
        if subquery:
            depth = 0
            while j < len(low):
                if low[j] == ("punct", "("):
                    depth += 1
                elif low[j] == ("punct", ")"):
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
        elif is_word(j):
            name = at(j)[1]
            if name in ("public", "information_schema") and at(j + 1) == ("punct", "."):
                schema = name
                defining.add(j)
                j += 2
                name = at(j)[1] if is_word(j) else ""
                ok = (name in INFO_SCHEMA_VIEWS) if schema == "information_schema" else (
                    name in ALLOWED_TABLES | META_SOURCES)
            else:
                ok = name in ALLOWED_TABLES | META_SOURCES | ctes
            if not ok:
                out.append(f"FROM/JOIN source {name!r} is not an allowed table, CTE or subquery")
            if name not in ctes:
                protected.add(name)
            defining.add(j)
        else:
            out.append(f"FROM/JOIN must be followed by a table or (subquery), not {at(j)[1]!r}")
            continue
        j += 1
        if at(j) == ("word", "as"):
            j += 1
        if is_word(j) and at(j)[1] not in KEYWORDS:
            (derived if subquery else protected).add(at(j)[1])
            defining.add(j)
            j += 1
        if at(j) == ("punct", ","):
            out.append("comma joins are not allowed (use JOIN ... ON so every table is checked)")
    # Output names: AS <word> (not a CTE). Allowed only where declared.
    for i in range(1, len(low)):
        if at(i - 1) == ("word", "as") and is_word(i) and i not in defining:
            defining.add(i)

    for i, (k, t) in enumerate(low):
        if k != "word" or i in defining or t.isdigit():
            continue  # numbers (1, 1.5) are values, not names
        if at(i - 1) == ("punct", ".") and is_word(i - 2):
            q = at(i - 2)[1]
            if q in ctes | derived:
                continue  # columns of a CTE or subquery were checked where they were selected
            if q == "information_schema" or q == "public":
                continue  # the source rule above checked this name
            if t not in ALLOWED_COLUMNS:
                out.append(f"column {stmt[i][1]!r} is not on the read allowlist (logs are public)")
            continue
        if at(i + 1) == ("punct", "("):
            if t not in FUNCTIONS | PAREN_KEYWORDS:
                out.append(f"function {stmt[i][1]!r} is not on the allowlist")
            continue
        if t in protected:
            if at(i + 1) != ("punct", "."):
                out.append(f"whole-row reference {stmt[i][1]!r} (select alias.column, not the row)")
            continue
        if at(i + 1) == ("punct", ".") and t in ctes | derived | {"public", "information_schema"}:
            continue
        if t in ctes | derived:
            continue  # a CTE or subquery row holds only columns already checked
        if t not in KEYWORDS | ALLOWED_COLUMNS:
            out.append(f"word {stmt[i][1]!r} is not a keyword or an allowed column")
    return out


def write_problems(sql: str) -> list:
    """Write files may contain any SQL, but must lex cleanly and carry no psql meta-command."""
    try:
        for _ in tokens(sql):
            pass
    except Refused as e:
        return [str(e)]
    return []


if __name__ == "__main__":
    write = sys.argv[1] == "--write"
    path = sys.argv[2] if write else sys.argv[1]
    text = open(path, encoding="utf-8").read()
    found = write_problems(text) if write else problems(text)
    for p in found:
        print(f"::error::{path}: {p}")
    sys.exit(1 if found else 0)
