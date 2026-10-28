from app.core.uuid_ids import inserted_id
"""Two-person private mailbox. Identity and ownership are enforced on every request."""
import re
from app.services.profiles import display_name
from app.services.pet_wallets import grant_letter_treat
from fastapi import APIRouter, Depends, Form, HTTPException, Query
from fastapi.responses import JSONResponse

KINDS = {'secret', 'apology', 'share', 'other'}


def build_mailbox_router(get_db, get_current_user, settings, now):
    router = APIRouter(prefix='/mailbox', tags=['私密信箱'])

    def context(username=Depends(get_current_user)):
        if username is None:
            raise HTTPException(401, '请先登录')
        if len(settings.ADMIN_USERS) != 2 or username not in settings.ADMIN_USERS:
            raise HTTPException(403, '此信箱仅限两位主人使用')
        peer_name = next(name for name in settings.ADMIN_USERS if name != username)
        with get_db() as conn:
            viewer = conn.execute('SELECT id FROM user WHERE username=?', (username,)).fetchone()
            peer = conn.execute('SELECT id FROM user WHERE username=?', (peer_name,)).fetchone()
        if not viewer:
            raise HTTPException(401, '账号已失效，请重新登录')
        return {'id': viewer['id'], 'name': username, 'peer_id': peer['id'] if peer else None, 'peer_name': peer_name}

    def private(data, status_code=200):
        return JSONResponse(data, status_code=status_code, headers={'Cache-Control': 'no-store', 'Vary': 'Authorization'})

    def pair(ctx):
        return ctx['id'], ctx['peer_id'], ctx['peer_id'], ctx['id']

    pair_sql = '((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?))'

    def letter(conn, letter_id, ctx):
        row = conn.execute(f'SELECT * FROM mailbox_letters WHERE id=? AND {pair_sql}', (letter_id, *pair(ctx))).fetchone()
        if not row:
            raise HTTPException(404, '信件不存在或不可查看')
        return row

    def validate_key(value):
        if not re.fullmatch(r'[A-Za-z0-9_-]{16,80}', value):
            raise HTTPException(400, '发送标识无效，请重新打开写信窗口')

    def summary(conn, ctx):
        incoming = conn.execute('SELECT count(*) FROM mailbox_letters WHERE sender_id=? AND recipient_id=? AND recipient_read_at IS NULL', (ctx['peer_id'], ctx['id'])).fetchone()[0]
        pending = conn.execute('SELECT count(*) FROM mailbox_letters WHERE sender_id=? AND recipient_id=? AND recipient_read_at IS NULL', (ctx['id'], ctx['peer_id'])).fetchone()[0]
        replies = conn.execute(f'''
            SELECT count(*) FROM mailbox_letters l WHERE {pair_sql}
            AND EXISTS (SELECT 1 FROM mailbox_comments c WHERE c.letter_id=l.id AND c.author_id<>?
              AND c.rowid>COALESCE((SELECT seen.rowid FROM mailbox_reads r JOIN mailbox_comments seen ON seen.id=r.last_comment_id WHERE r.letter_id=l.id AND r.user_id=?),0))
        ''', (*pair(ctx), ctx['id'], ctx['id'])).fetchone()[0]
        return {'unread_letters': incoming, 'pending_sent': pending, 'unread_reply_threads': replies,
                'partner': display_name(conn, user_id=ctx['peer_id'], fallback=ctx['peer_name']), 'partner_ready': ctx['peer_id'] is not None, 'username': ctx['name']}

    def metadata(conn, row, ctx):
        read = conn.execute('SELECT last_comment_id FROM mailbox_reads WHERE letter_id=? AND user_id=?', (row['id'], ctx['id'])).fetchone()
        last_seen = read[0] if read else 0
        replies = conn.execute('SELECT count(*) FROM mailbox_comments WHERE letter_id=? AND author_id<>? AND rowid>COALESCE((SELECT rowid FROM mailbox_comments WHERE id=?),0)', (row['id'], ctx['id'], last_seen)).fetchone()[0]
        return {key: row[key] for key in ('id', 'kind', 'title', 'sender_name', 'recipient_name', 'created_at', 'recipient_read_at')} | {
            'sender_name': display_name(conn, user_id=row['sender_id'], fallback=row['sender_name']),
            'recipient_name': display_name(conn, user_id=row['recipient_id'], fallback=row['recipient_name']),
            'is_sender': row['sender_id'] == ctx['id'], 'unread': row['recipient_id'] == ctx['id'] and row['recipient_read_at'] is None,
            'new_comments': replies,
        }

    @router.get('/summary')
    def get_summary(ctx=Depends(context)):
        with get_db() as conn:
            return private(summary(conn, ctx))

    @router.get('/letters')
    def list_letters(box: str = Query('inbox', pattern='^(inbox|sent)$'), page: int = Query(1, ge=1), ctx=Depends(context)):
        sender, recipient = (ctx['peer_id'], ctx['id']) if box == 'inbox' else (ctx['id'], ctx['peer_id'])
        with get_db() as conn:
            total = conn.execute('SELECT count(*) FROM mailbox_letters WHERE sender_id=? AND recipient_id=?', (sender, recipient)).fetchone()[0]
            rows = conn.execute('SELECT * FROM mailbox_letters WHERE sender_id=? AND recipient_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20 OFFSET ?',
                                (sender, recipient, (page - 1) * 20)).fetchall()
            return private({'data': [metadata(conn, row, ctx) for row in rows], 'total': total, 'page': page, 'page_size': 20})

    @router.post('/letters')
    def send_letter(title: str = Form(...), body: str = Form(...), kind: str = Form('secret'), request_key: str = Form(...), ctx=Depends(context)):
        title, body = title.strip(), body.replace('\r\n', '\n').strip()
        validate_key(request_key)
        if kind not in KINDS or not title or len(title) > 100 or not body or len(body) > 10000:
            raise HTTPException(400, '请填写有效分类、1至100字标题和1至10000字正文')
        if ctx['peer_id'] is None:
            raise HTTPException(409, '另一半还没有注册，暂时无法投递')
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            existing = conn.execute('SELECT * FROM mailbox_letters WHERE sender_id=? AND request_key=?', (ctx['id'], request_key)).fetchone()
            if existing:
                if (existing['title'], existing['body'], existing['kind'], existing['recipient_id']) != (title, body, kind, ctx['peer_id']):
                    raise HTTPException(409, '这封信已经发送，请先刷新发件箱确认')
                return private({'id': existing['id'], 'replayed': True})
            sent_at = now()
            result = conn.execute('''INSERT INTO mailbox_letters(sender_id,recipient_id,sender_name,recipient_name,kind,title,body,created_at,request_key)
                VALUES (?,?,?,?,?,?,?,?,?)''', (ctx['id'], ctx['peer_id'], ctx['name'], ctx['peer_name'], kind, title, body, sent_at, request_key))
            letter_id = inserted_id(conn, result, 'mailbox_letters')
            awarded = grant_letter_treat(conn, ctx['name'], letter_id, sent_at)
            return private({'id': letter_id, 'food_reward': {'food': 'treat', 'amount': awarded}}, 201)

    @router.get('/letters/{letter_id}')
    def get_letter(letter_id: str, ctx=Depends(context)):
        with get_db() as conn:
            row = letter(conn, letter_id, ctx)
            comments = conn.execute('SELECT id,author_id,author_name,content,created_at FROM mailbox_comments WHERE letter_id=? ORDER BY rowid', (letter_id,)).fetchall()
            return private(metadata(conn, row, ctx) | {'body': row['body'], 'comments': [
                {'id': c['id'], 'author': display_name(conn, user_id=c['author_id'], fallback=c['author_name']), 'content': c['content'], 'created_at': c['created_at'], 'is_mine': c['author_id'] == ctx['id']}
                for c in comments], 'last_comment_id': comments[-1]['id'] if comments else '0'})

    @router.post('/letters/{letter_id}/read')
    def read_letter(letter_id: str, through_comment_id: str = Form('0'), ctx=Depends(context)):
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            row = letter(conn, letter_id, ctx)
            incoming = conn.execute('SELECT rowid FROM mailbox_comments WHERE letter_id=? AND id=?', (letter_id, through_comment_id)).fetchone()
            if through_comment_id != '0' and not incoming:
                raise HTTPException(400, '留言阅读位置无效')
            if row['recipient_id'] == ctx['id']:
                conn.execute('UPDATE mailbox_letters SET recipient_read_at=COALESCE(recipient_read_at,?) WHERE id=?', (now(), letter_id))
            previous = conn.execute('SELECT r.last_comment_id,c.rowid FROM mailbox_reads r LEFT JOIN mailbox_comments c ON c.id=r.last_comment_id WHERE r.letter_id=? AND r.user_id=?', (letter_id, ctx['id'])).fetchone()
            if previous and (previous[1] or 0) > (incoming[0] if incoming else 0):
                through_comment_id = previous[0]
            conn.execute('''INSERT INTO mailbox_reads(letter_id,user_id,last_comment_id) VALUES (?,?,?)
                ON CONFLICT(letter_id,user_id) DO UPDATE SET last_comment_id=excluded.last_comment_id''',
                (letter_id, ctx['id'], through_comment_id))
            current = conn.execute('SELECT recipient_read_at FROM mailbox_letters WHERE id=?', (letter_id,)).fetchone()
            return private({'recipient_read_at': current[0], 'summary': summary(conn, ctx)})

    @router.post('/letters/{letter_id}/comments')
    def add_comment(letter_id: str, content: str = Form(...), request_key: str = Form(...), ctx=Depends(context)):
        content = content.replace('\r\n', '\n').strip()
        validate_key(request_key)
        if not content or len(content) > 2000:
            raise HTTPException(400, '留言需为1至2000字')
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            letter(conn, letter_id, ctx)
            existing = conn.execute('SELECT id,letter_id,content FROM mailbox_comments WHERE author_id=? AND request_key=?', (ctx['id'], request_key)).fetchone()
            if existing:
                if (existing['letter_id'], existing['content']) != (letter_id, content):
                    raise HTTPException(409, '这条留言已经发送，请先刷新查看')
                return private({'id': existing['id']})
            result = conn.execute('INSERT INTO mailbox_comments(letter_id,author_id,author_name,content,created_at,request_key) VALUES (?,?,?,?,?,?)',
                                  (letter_id, ctx['id'], ctx['name'], content, now(), request_key))
            return private({'id': inserted_id(conn, result, 'mailbox_comments')}, 201)

    return router
