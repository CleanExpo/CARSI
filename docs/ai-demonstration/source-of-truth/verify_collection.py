#!/usr/bin/env python3
"""Read-only source collection checks; temporary SQLite register, never production."""
from pathlib import Path
import argparse
import hashlib
import html
import math
import json
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parent


def check_guide_arithmetic(guide):
    """Read the displayed exercise numbers; reject arithmetic and source mismatches."""
    sections = re.findall(r'<section class="workflow">(.*?)</section>', guide, re.S)
    assert len(sections) == 7, 'Expected six exercises and five-case section'
    text = html.unescape(re.sub(r'<[^>]+>', ' ', guide))
    equations = re.findall(
        r'((?:A?\$)?\d+(?:\s*[×x+]\s*(?:A?\$)?\d+)+)\s*=\s*(?:A?\$)?(\d+)', text)
    assert len(equations) >= 6, 'Missing displayed arithmetic checks'
    for expression, result in equations:
        terms = expression.replace('A$', '').replace('$', '').split('+')
        total = sum(math.prod(int(n.strip()) for n in re.split('[×x]', term)) for term in terms)
        assert total == int(result), f'Guide arithmetic mismatch: {expression} = {result}'
    # Bind the reply exercise to its actual source facts, including prepared output.
    source = re.search(r'<pre>(.*?)</pre>', sections[0], re.S).group(1)
    quantity = int(re.search(r'supply (\d+) lunch boxes', source).group(1))
    unit = int(re.search(r'AUD \$(\d+) per box', source).group(1))
    delivery = int(re.search(r'Delivery fee AUD \$(\d+)', source).group(1))
    subtotal = quantity * unit
    expected = {unit, delivery, subtotal, subtotal + delivery}
    amounts = {int(n) for n in re.findall(r'\$(\d+)', sections[0])}
    assert amounts == expected, f'Guide reply amounts disagree with source facts: {amounts} != {expected}'
    assert f'{quantity} × ${unit} = ${subtotal}' in sections[0], 'Missing source-bound food calculation'
    assert f'${subtotal} + ${delivery} = ${subtotal + delivery}' in sections[0], 'Missing source-bound total'
    prepared = re.findall(r'<pre>(.*?)</pre>', sections[0], re.S)[2]
    shown = re.search(r'food amount is \$(\d+), plus \$(\d+) delivery: \$(\d+)', prepared)
    assert shown and tuple(map(int, shown.groups())) == (subtotal, delivery, subtotal + delivery), 'Prepared draft arithmetic disagrees with source'
    assert f'At AUD ${unit} each' in prepared, 'Prepared draft unit price disagrees with source'
    assert f'Label ${subtotal + delivery} as' in sections[0], 'Follow-up amount disagrees with source'
    assert f'Check that the estimate is A${subtotal + delivery} ' in sections[-1], 'Known-quantity case disagrees with source'
    estimate = re.findall(r'<pre>(.*?)</pre>', sections[1], re.S)[0]
    hours = int(re.search(r'JOB: (\d+) hours', estimate).group(1))
    rate, materials = map(int, re.findall(r'AUD \$(\d+)', estimate))
    assert f'{hours} × ${rate} = ${hours * rate}' in sections[1], 'Labour calculation disagrees with source'
    assert f'${hours * rate} + ${materials} = ${hours * rate + materials}' in sections[1], 'Estimate total disagrees with source'
    stock = re.findall(r'<pre>(.*?)</pre>', sections[3], re.S)[0]
    beans, beans_min, cups, cups_min = map(int, re.findall(r'(\d+)', stock)[:4])
    assert f'Beans: gap {beans_min - beans} bags. Cups: gap {cups_min - cups}.' in sections[3], 'Stock gaps disagree with source'
    sales = re.findall(r'<pre>(.*?)</pre>', sections[4], re.S)[0]
    amounts_by_day = [int(n) for n in re.findall(r'^\w+,(\d+)$', sales, re.M)]
    displayed_sum = ' + '.join(f'${n}' for n in amounts_by_day)
    assert f'{displayed_sum} = ${sum(amounts_by_day)}' in sections[4], 'Known sales total disagrees with source'
    # The correction case must calculate the stated new quantity at the same rate.
    correction = re.search(r'<li><strong>Correction:</strong>(.*?)</li>', sections[-1], re.S).group(1)
    new_quantity = int(re.search(r'quantity is (\d+), not', correction).group(1))
    assert f'{new_quantity} × A${unit} + A${delivery} = A${new_quantity * unit + delivery}' in correction, 'Correction total disagrees with source facts'


def check(root, master_path=None):
    manifest = json.loads((root / 'manifest.json').read_text())
    expected = {r['path'] for r in manifest['files']}
    actual = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()
              and p.name != 'manifest.json' and '__pycache__' not in p.parts}
    assert expected == actual, f'File coverage mismatch: {expected ^ actual}'
    for r in manifest['files']:
        p = root / r['path']
        assert p.is_file(), f'Missing {p}'
        assert p.stat().st_size == r['bytes'], f'Size changed: {p}'
        assert hashlib.sha256(p.read_bytes()).hexdigest() == r['sha256'], f'Hash changed: {p}'
    edition = json.loads((root / 'editions.json').read_text())
    asset = json.loads((root / 'private-assets.json').read_text())['approvedMaster']
    approved_sha = '446042327ce9bb0c8a0f163f4658df8fbc4dc60637a6fdbfba14085599a2d88f'
    assert edition['approvedDemoSHA256'] == asset['sha256'] == approved_sha
    if master_path is not None:
        master = Path(master_path)
        assert master.stat().st_size == asset['bytes'], 'Private master size changed'
        assert hashlib.sha256(master.read_bytes()).hexdigest() == approved_sha, 'Private master hash changed'
    plan = json.loads((root / 'continuation-run-sheet.json').read_text())
    history = json.loads((root / 'history/full-talk.json').read_text())
    assert [s['sceneId'] for s in plan['scenes']] == [s['id'] for s in history['scenes']]
    assert len(plan['scenes']) == 14 and plan['totalSec'] == 900 and plan['totalFrames'] == 22500
    at = 0
    for s in plan['scenes']:
        assert s['startFrame'] == at and s['frames'] > 0, f'Gap/overlap: {s}'
        assert round(s['durationSec'] * plan['fps']) == s['frames']
        at += s['frames']
    assert at == 22500 and plan['scenes'][0]['frames'] == 6660
    timeline = json.loads((root / 'approved-demo/timeline.json').read_text())
    assert timeline['frames'] == 6660 and timeline['fps'] == 25
    check_guide_arithmetic((root / 'companion-guide/ChatGPT-business-task-guide.html').read_text())
    db = sqlite3.connect(':memory:')
    for _ in range(2):
        db.executescript((root / 'baseline/baseline-schema.sql').read_text())
        db.executescript((root / 'baseline/baseline-seed.sql').read_text())
    assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    # No executable actions are taken by this register or by checking the collection.
    for p in root.rglob('*.md'):
        for target in re.findall(r'\]\(([^)]+)\)', p.read_text()):
            if target.startswith(('https:', 'http:', '/', '#', 'plugin:')):
                continue  # Historical absolute custody links are recorded, not portable links.
            assert (p.parent / target.split('#')[0]).exists(), f'Broken relative link {p}: {target}'
    return {'status': 'PASS' if master_path is not None else 'SOURCE_PASS_MEDIA_NOT_CHECKED',
            'privateMediaVerified': master_path is not None, 'files': len(expected), 'masterSHA256': edition['approvedDemoSHA256'],
            'proposedDurationSec': 900, 'sceneCount': 14, 'sqlIntegrity': 'ok',
            'limitations': ['Integrity and structural checks only; no semantic-sync, independent watch/listen, visual acceptance or release claim.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--master', type=Path, help='Explicit local approved MP4 path; without it only source data is verified')
    args = parser.parse_args()
    try:
        print(json.dumps(check(ROOT, args.master), indent=2))
    except (AssertionError, OSError, ValueError, sqlite3.Error) as e:
        print(f'FAIL: {e}', file=sys.stderr)
        sys.exit(1)
