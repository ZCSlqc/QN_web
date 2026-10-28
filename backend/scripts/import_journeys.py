"""Validate Markdown journeys; --replace explicitly replaces the journeys table only."""
import argparse
from contextlib import closing
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
WHOLE_REGIONS = {'110000', '120000', '310000', '500000', '810000', '820000'}


def parse_records(source, geo_root):
    provinces = json.loads((geo_root / 'province.geojson').read_text(encoding='utf-8'))['features']
    cities = json.loads((geo_root / 'city.geojson').read_text(encoding='utf-8'))['features']
    province_aliases = {}
    for feature in provinces:
        code, name = str(feature['properties']['adcode']), feature['properties']['name']
        province_aliases[name] = code[:2]
        province_aliases[re.sub(r'(省|市|自治区|壮族自治区|回族自治区|维吾尔自治区|特别行政区)$', '', name)] = code[:2]
    features = [f for f in cities if str(f['properties']['adcode'])[:2] not in ('11', '12', '31', '50', '81', '82')]
    features += [f for f in provinces if str(f['properties']['adcode']) in WHOLE_REGIONS]
    aliases = {'大理白族自治州': '大理', '迪庆藏族自治州': '迪庆', '西双版纳傣族自治州': '西双版纳'}
    lookup = {}
    for feature in features:
        props = feature['properties']
        name, code = props['name'], str(props['adcode'])
        for alias in {name, name.removesuffix('市'), aliases.get(name, name), name.removesuffix('特别行政区')}:
            lookup.setdefault((code[:2], alias), set()).add((code, name))

    records = []
    for line in source.read_text(encoding='utf-8').splitlines():
        if not re.match(r'^\|\s*\d+\s*\|\s*`', line):
            continue
        cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
        if len(cells) != 6:
            raise ValueError(f'Expected 6 columns: {line}')
        number, dates, places, checkins, event, notes = cells
        start, end = dates.strip('`').split('-')
        start, end = (dt.datetime.strptime(date, '%Y%m%d').date().isoformat() for date in (start, end))
        if start > end:
            raise ValueError(f'Invalid date range in row {number}')
        region = None
        matched = {}
        for token in re.split('[、；;]', places):
            token = token.strip()
            province = next((name for name in sorted(province_aliases, key=len, reverse=True) if token.startswith(name)), None)
            if province:
                region = province_aliases[province]
                token = token[len(province):] or province
            candidates = lookup.get((region, token), set())
            if len(candidates) != 1:
                raise ValueError(f'Unresolved/ambiguous city in row {number}: {places} / {token}')
            code, name = next(iter(candidates))
            matched[code] = name
        clean = lambda value: '' if value in ('—', '') else value
        record = dict(source_row=int(number), name=list(matched.values()), adcodes=list(matched),
                      departure_date=start, return_date=end, checkin_points=clean(checkins),
                      event=clean(event), notes=clean(notes))
        if not matched or len(matched) > 30 or len(record['event']) > 500 or max(len(record['notes']), len(record['checkin_points'])) > 2000:
            raise ValueError(f'Invalid field size in row {number}')
        records.append(record)
    if not records or [r['source_row'] for r in records] != list(range(1, len(records) + 1)):
        raise ValueError('Missing/duplicate row numbers')
    keys = [(r['departure_date'], r['return_date'], tuple(sorted(r['adcodes']))) for r in records]
    if len(set(keys)) != len(keys):
        raise ValueError('Duplicate trip in Markdown')
    return records


def snapshot_other_tables(conn):
    tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('journeys','sqlite_sequence','pet_activity_rewards')")]
    return {name: conn.execute('SELECT * FROM "' + name.replace('"', '""') + '"').fetchall() for name in tables}


def replace_records(database, records, backup_dir):
    if not database.is_file():
        raise ValueError(f'Database not found: {database}')
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f'couple-before-md-import-{dt.datetime.now():%Y%m%d-%H%M%S-%f}.db'
    conn = sqlite3.connect(database, timeout=30)
    try:
        with closing(sqlite3.connect(backup)) as dest:
            conn.backup(dest)
        conn.execute('BEGIN IMMEDIATE')
        if conn.execute('SELECT 1 FROM photos WHERE journey_id IS NOT NULL LIMIT 1').fetchone():
            raise ValueError('Existing journey photos must be handled before replacing journeys; nothing was replaced')
        if conn.execute('SELECT 1 FROM journey_plans WHERE converted_journey_id IS NOT NULL LIMIT 1').fetchone():
            raise ValueError('Converted plans reference existing journeys; refusing to replace them')
        before = snapshot_other_tables(conn)
        old_count = conn.execute('SELECT count(*) FROM journeys').fetchone()[0]
        conn.execute('DELETE FROM journeys')
        now = dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        imported = []
        for record in records:
            result = conn.execute(
                'INSERT INTO journeys(name,adcodes,departure_date,return_date,checkin_points,event,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
                (json.dumps(record['name'], ensure_ascii=False), json.dumps(record['adcodes']),
                 record['departure_date'], record['return_date'], record['checkin_points'], record['event'],
                 record['notes'], now, now),
            )
            record_id = conn.execute('SELECT id FROM journeys WHERE rowid=?', (result.lastrowid,)).fetchone()[0]
            imported.append(dict(source_row=record['source_row'], id=record_id))
            if conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='pet_activity_rewards'").fetchone():
                conn.execute("INSERT OR IGNORE INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES ('journey',?,?,0,'can',0,?)", (str(record_id), record_id, now))
        assert conn.execute('SELECT count(*) FROM journeys').fetchone()[0] == len(records)
        for record, mapping in zip(records, imported):
            row = conn.execute('SELECT name,adcodes,departure_date,return_date,checkin_points,event,notes FROM journeys WHERE id=?', (mapping['id'],)).fetchone()
            assert (json.loads(row[0]), json.loads(row[1]), *row[2:]) == (
                record['name'], record['adcodes'], record['departure_date'], record['return_date'],
                record['checkin_points'], record['event'], record['notes'])
        assert snapshot_other_tables(conn) == before
        assert conn.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        conn.commit()
        return dict(backup=str(backup), replaced=old_count, imported=len(records), rows=imported)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / '旅行记录.md')
    parser.add_argument('--database', type=Path, default=ROOT / 'backend/couple.db')
    parser.add_argument('--replace', action='store_true')
    args = parser.parse_args()
    records = parse_records(args.source, ROOT / 'frontend/public/maps/china')
    report = dict(source=str(args.source), source_sha256=hashlib.sha256(args.source.read_bytes()).hexdigest(),
                  count=len(records), city_count=len({code for r in records for code in r['adcodes']}), records=records)
    output = ROOT / 'artifacts/journey-import-report.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.replace:
        report['result'] = replace_records(args.database, records, ROOT.parent / 'QN_web_backups')
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('count', 'city_count')}))
    if args.replace:
        print(json.dumps({key: report['result'][key] for key in ('backup', 'replaced', 'imported')}))
    else:
        print('Validation only; database unchanged.')
