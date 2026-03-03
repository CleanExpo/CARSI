"""
CARSI Linear Issue State Updater
Usage: python scripts/linear_update.py <identifier> <state>
       python scripts/linear_update.py GP-96 in_progress
       python scripts/linear_update.py GP-96 done

States: backlog | todo | in_progress | in_review | done
"""
import sys
import json
import os
import urllib.request
import ssl

def _load_api_key() -> str:
    """Load the Linear API key from environment or .env.local file."""
    key = os.environ.get("LINEAR_API_KEY")
    if key:
        return key
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("LINEAR_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("ERROR: LINEAR_API_KEY not set. Add it to .env.local or export it as an environment variable.")
    sys.exit(1)

API_KEY = _load_api_key()

STATE_MAP = {
    "backlog":     "fd635199-7bd7-442a-9df0-8c9afda1d646",
    "todo":        "b7ba26fa-c315-4b44-ad63-016fd2645044",
    "in_progress": "aa3c68b5-6ee9-4557-b7ac-59f0f70fa6a0",
    "in_review":   "5f41830f-e55a-4b83-9d01-c1aba6c9bbd4",
    "done":        "5b7ee027-d815-4af9-8e2a-eb12e2399e77",
}

# GP identifier -> Linear issue ID (pre-fetched for speed)
ISSUE_ID_MAP = {
    "GP-96":  None,  # Populated on first run via API
    "GP-97":  None,
    "GP-98":  None,
    "GP-99":  None,
    "GP-100": None,
    "GP-101": None,
    "GP-102": None,
    "GP-103": None,
    "GP-104": None,
    "GP-105": None,
    "GP-106": None,
    "GP-107": None,
    "GP-108": None,
    "GP-109": None,
    "GP-110": None,
    "GP-111": None,
}


def run_query(query: str, variables: dict = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        "https://api.linear.app/graphql",
        data=payload,
        headers={
            "Authorization": API_KEY,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())


def get_issue_id(identifier: str) -> str:
    """Fetch the internal UUID for a GP-### identifier from the CARSI project."""
    result = run_query(
        '{ project(id: "20538e04-ba27-467d-b632-1fb346063089") { issues { nodes { id identifier title } } } }'
    )
    nodes = result["data"]["project"]["issues"]["nodes"]
    for node in nodes:
        if node["identifier"] == identifier:
            return node["id"]
    raise ValueError(f"Issue {identifier} not found in CARSI project.")


def update_issue_state(identifier: str, state_name: str) -> None:
    if state_name not in STATE_MAP:
        print(f"Unknown state '{state_name}'. Valid options: {', '.join(STATE_MAP.keys())}")
        sys.exit(1)

    state_id = STATE_MAP[state_name]
    issue_id = get_issue_id(identifier)

    mutation = """
    mutation UpdateIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue {
          identifier
          title
          state { name }
          url
        }
      }
    }
    """
    result = run_query(mutation, {"id": issue_id, "stateId": state_id})
    data = result["data"]["issueUpdate"]

    if data["success"]:
        issue = data["issue"]
        print(f"[OK] {issue['identifier']}: {issue['title']}")
        print(f"     State: {issue['state']['name']}")
        print(f"     URL: {issue['url']}")
    else:
        print(f"[FAIL] Failed to update {identifier}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    identifier = sys.argv[1].upper()
    state_name = sys.argv[2].lower()
    update_issue_state(identifier, state_name)
