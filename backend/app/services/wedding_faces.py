"""Persistent default faces. Explicit wardrobes and the groom are left intact."""
from collections import Counter
from secrets import choice

FACE_PRESETS = tuple(f'face-completes-face{i}' for i in range(1, 5))
NPC_KEYS = ('npc:florist', 'npc:juggler')


def ensure_default_faces(conn, groom_username, now):
    users = conn.execute('SELECT id FROM user WHERE username<>? ORDER BY id', (groom_username,)).fetchall()
    keys = [*((key, None) for key in NPC_KEYS), *((f'user:{row[0]}', row[0]) for row in users)]
    faces = dict(conn.execute('SELECT actor_key,preset_id FROM wedding_face_defaults'))
    counts = Counter(faces.values())
    for key, user_id in keys:
        if key in faces:
            continue
        least = min(counts[preset] for preset in FACE_PRESETS)
        preset = choice([preset for preset in FACE_PRESETS if counts[preset] == least])
        conn.execute('INSERT OR IGNORE INTO wedding_face_defaults(actor_key,user_id,preset_id,created_at) VALUES(?,?,?,?)',
                     (key, user_id, preset, now))
        counts[preset] += 1
    return dict(conn.execute('SELECT actor_key,preset_id FROM wedding_face_defaults'))
