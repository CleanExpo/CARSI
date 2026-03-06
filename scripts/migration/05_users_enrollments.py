"""
Phase 5 - Users and Enrollment Extraction
Extracts:
  - kvq_users: email, display_name, registered date
  - kvq_usermeta: first_name, last_name, role
  - WooCommerce orders + order items to determine course enrollments
  - LearnDash course_access_list for direct enrollments (non-WooCommerce)

Output:
  - scripts/migration/output/users.json
  - scripts/migration/output/enrollments.json

Usage:
    python scripts/migration/05_users_enrollments.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

SQL_FILE = Path(r"C:\Users\Phill\Downloads\localhost.sql")
OUTPUT_DIR = Path(__file__).parent / "output"
COURSES_JSON = OUTPUT_DIR / "courses.json"


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    courses = json.loads(COURSES_JSON.read_text(encoding="utf-8"))
    # Build WooCommerce product_id -> course_wp_id lookup
    woo_to_course: dict[str, str] = {}
    for c in courses:
        if c.get("woo_product_id"):
            woo_to_course[c["woo_product_id"]] = c["wp_id"]
    pub_course_ids = {c["wp_id"] for c in courses if c["status"] == "publish"}

    print(f"Scanning: {SQL_FILE}\n")
    print(f"WooCommerce product->course mappings: {len(woo_to_course)}\n")

    # ── Pass 1: extract users ──────────────────────────────────────────────
    # kvq_users columns: ID, user_login, user_pass, user_nicename, user_email,
    #   user_url, user_registered, user_activation_key, user_status, display_name
    users: dict[str, dict] = {}

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_users = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_users`", s, re.IGNORECASE):
                in_users = True
                continue
            if in_users:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 10:
                        continue
                    uid = fields[0].strip("'")
                    email = fields[4].strip("'")
                    registered = fields[6].strip("'")
                    display_name = _decode_html(fields[9].strip("'"))
                    # Skip WordPress system accounts
                    if uid in ("1",) and "admin" in email.lower():
                        if s.endswith(";"):
                            in_users = False
                        continue
                    users[uid] = {
                        "wp_id": uid,
                        "email": email,
                        "display_name": display_name,
                        "registered": registered,
                        "first_name": "",
                        "last_name": "",
                        "role": "student",
                    }
                    if s.endswith(";"):
                        in_users = False
                else:
                    in_users = False

    print(f"Users collected: {len(users)}\n")

    # ── Pass 2: usermeta for first_name, last_name, role ──────────────────
    wanted_usermeta = {"first_name", "last_name", "kvq_capabilities"}

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_usermeta`", s, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    uid = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    meta_value = fields[3].strip("'")
                    if uid not in users or meta_key not in wanted_usermeta:
                        if s.endswith(";"):
                            in_meta = False
                        continue
                    if meta_key == "first_name":
                        users[uid]["first_name"] = meta_value
                    elif meta_key == "last_name":
                        users[uid]["last_name"] = meta_value
                    elif meta_key == "kvq_capabilities":
                        # PHP serialised: a:1:{s:13:"administrator";b:1;}
                        if "administrator" in meta_value:
                            users[uid]["role"] = "admin"
                        elif "instructor" in meta_value or "teacher" in meta_value:
                            users[uid]["role"] = "instructor"
                    if s.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    # ── Pass 3: WooCommerce orders to derive enrollments ──────────────────
    # kvq_posts with post_type="shop_order" -> post_status tells us if paid
    # kvq_woocommerce_order_items -> links order to product
    # paid statuses: wc-completed, wc-processing
    PAID_STATUSES = {"wc-completed", "wc-processing", "wc-active"}

    # First collect paid order IDs and their customer (post_author -> user_id via postmeta)
    paid_orders: dict[str, str] = {}  # order_post_id -> customer_user_id

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_posts = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_posts`", s, re.IGNORECASE):
                in_posts = True
                continue
            if in_posts:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 21:
                        continue
                    post_type = fields[20].strip("'")
                    post_status = fields[7].strip("'")
                    post_id = fields[0].strip("'")
                    if post_type == "shop_order" and post_status in PAID_STATUSES:
                        # customer user_id is in postmeta _customer_user
                        paid_orders[post_id] = None  # will fill from postmeta
                    if s.endswith(";"):
                        in_posts = False
                else:
                    in_posts = False

    # Fill customer_user from postmeta
    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_postmeta`", s, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    post_id = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    meta_value = fields[3].strip("'")
                    if post_id in paid_orders and meta_key == "_customer_user":
                        paid_orders[post_id] = meta_value
                    if s.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    print(f"Paid WooCommerce orders: {len(paid_orders)}\n")

    # ── Pass 4: order items -> product -> course ───────────────────────────
    # kvq_woocommerce_order_items columns: order_item_id, order_item_name, order_item_type, order_id
    # Then kvq_woocommerce_order_itemmeta: order_item_id -> _product_id
    enrollments: list[dict] = []
    order_item_to_order: dict[str, str] = {}  # item_id -> order_id

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_items = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_woocommerce_order_items`", s, re.IGNORECASE):
                in_items = True
                continue
            if in_items:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    item_id = fields[0].strip("'")
                    item_type = fields[2].strip("'")
                    order_id = fields[3].strip("'")
                    if item_type == "line_item" and order_id in paid_orders:
                        order_item_to_order[item_id] = order_id
                    if s.endswith(";"):
                        in_items = False
                else:
                    in_items = False

    # Get product IDs from order item meta
    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_woocommerce_order_itemmeta`", s, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    item_id = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    meta_value = fields[3].strip("'")
                    if item_id in order_item_to_order and meta_key == "_product_id":
                        order_id = order_item_to_order[item_id]
                        course_id = woo_to_course.get(meta_value)
                        customer_uid = paid_orders.get(order_id)
                        if course_id and customer_uid and customer_uid in users:
                            enrollments.append({
                                "user_wp_id": customer_uid,
                                "course_wp_id": course_id,
                                "source": "woocommerce",
                                "order_id": order_id,
                            })
                    if s.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    # Deduplicate enrollments (same user + course)
    seen = set()
    unique_enrollments = []
    for e in enrollments:
        key = (e["user_wp_id"], e["course_wp_id"])
        if key not in seen:
            seen.add(key)
            unique_enrollments.append(e)

    # ── Pass 5: LearnDash direct enrollments (course_access_list) ─────────
    # course_access_list in postmeta: "1,6,8,9,10" (comma-separated user IDs)
    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_postmeta`", s, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    post_id = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    meta_value = fields[3].strip("'")
                    if meta_key == "course_access_list" and post_id in pub_course_ids:
                        uid_list = [uid.strip() for uid in meta_value.split(",") if uid.strip()]
                        for uid in uid_list:
                            if uid in users:
                                key = (uid, post_id)
                                if key not in seen:
                                    seen.add(key)
                                    unique_enrollments.append({
                                        "user_wp_id": uid,
                                        "course_wp_id": post_id,
                                        "source": "learndash_direct",
                                        "order_id": None,
                                    })
                    if s.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    # ── Save output ────────────────────────────────────────────────────────
    user_list = sorted(users.values(), key=lambda x: int(x["wp_id"]))
    (OUTPUT_DIR / "users.json").write_text(
        json.dumps(user_list, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUTPUT_DIR / "enrollments.json").write_text(
        json.dumps(unique_enrollments, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # ── Report ─────────────────────────────────────────────────────────────
    roles = defaultdict(int)
    for u in user_list:
        roles[u["role"]] += 1

    woo_enrols = [e for e in unique_enrollments if e["source"] == "woocommerce"]
    ld_enrols = [e for e in unique_enrollments if e["source"] == "learndash_direct"]

    print("=" * 65)
    print(f"USERS:           {len(user_list):>5}")
    for role, count in sorted(roles.items()):
        print(f"  {role:15}   {count:>5}")
    print()
    print(f"ENROLLMENTS:     {len(unique_enrollments):>5} unique")
    print(f"  WooCommerce    {len(woo_enrols):>5}")
    print(f"  LearnDash      {len(ld_enrols):>5}")
    print("=" * 65)

    # Sample users
    print("\n-- Sample users --")
    for u in user_list[:10]:
        name = f"{u['first_name']} {u['last_name']}".strip() or u["display_name"]
        print(f"  WP#{u['wp_id']:>6}  [{u['role']:10}]  {name:30}  {u['email']}")

    print(f"\nOutput saved to: {OUTPUT_DIR}/")


def _strip_row(line: str) -> str:
    s = line.rstrip()
    if s.endswith(";"):
        s = s[:-1]
    elif s.endswith(","):
        s = s[:-1]
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]
    return s


def _decode_html(s: str) -> str:
    return (
        s.replace("&#8211;", "-")
        .replace("&#8217;", "'")
        .replace("&#8216;", "'")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
    )


def _parse_fields(row: str) -> list[str]:
    fields: list[str] = []
    current: list[str] = []
    in_string = False
    escape_next = False

    for ch in row:
        if escape_next:
            current.append(ch)
            escape_next = False
            continue
        if ch == "\\" and in_string:
            current.append(ch)
            escape_next = True
            continue
        if ch == "'":
            in_string = not in_string
            current.append(ch)
            continue
        if ch == "," and not in_string:
            fields.append("".join(current).strip())
            current = []
            continue
        current.append(ch)

    if current:
        fields.append("".join(current).strip())

    return fields


if __name__ == "__main__":
    main()
