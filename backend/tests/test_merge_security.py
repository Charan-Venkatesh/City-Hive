"""Regression coverage for private uploads and inactive-account challenges."""
from io import BytesIO
from cryptography.fernet import Fernet
from PIL import Image
from sqlalchemy import select
from test_workflows import ctx, resident, signin
from test_gaps import other_branch
from app.config import settings
from app.models import User, IdentityDocument
from app.security import token_for


def test_identity_document_all_operations_deny_other_resident_and_branch(ctx, monkeypatch):
    c, h, sessions = ctx
    rid = resident(c, h)
    rh = signin(c)
    other_id = resident(c, h, 'second@example.com')
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == 'second@example.com'))
        user.must_change_password = False
        db.commit()
        other = {'Authorization': 'Bearer ' + token_for(user, True)}
    branch_admin = other_branch(sessions)
    monkeypatch.setattr(settings, 'identity_document_key', Fernet.generate_key().decode())
    buf = BytesIO()
    Image.new('RGB', (10, 10), 'blue').save(buf, format='PNG')
    path = f'/api/residents/{rid}/identity-document'
    content = buf.getvalue()
    assert c.put(path, headers={**rh, 'Content-Type': 'image/png'}, content=content).status_code == 200
    for actor in [other, branch_admin]:
        for suffix in ['', '/download']:
            assert c.get(path + suffix, headers=actor).status_code == 403
        assert c.put(path, headers={**actor, 'Content-Type': 'image/png'}, content=content).status_code == 403
        assert c.delete(path, headers=actor).status_code == 403
    assert c.get(path + '/download').status_code == 401
    assert c.get(path + '/download', headers=rh).content == content
    assert c.put(path, headers={**rh, 'Content-Type': 'image/png'}, content=content).status_code == 200
    with sessions() as db:
        assert len(db.scalars(select(IdentityDocument).where(IdentityDocument.resident_id == rid)).all()) == 1
    monkeypatch.setattr(settings, 'identity_document_key', Fernet.generate_key().decode())
    response = c.get(path + '/download', headers=rh)
    assert response.status_code == 503
    assert 'Traceback' not in response.text and settings.identity_document_key not in response.text


def test_inactive_account_cannot_resend_existing_challenge(ctx):
    c, h, sessions = ctx
    resident(c, h)
    started = c.post('/api/auth/login', json={'email': 'resident@example.com', 'password': 'Temporary123!'})
    assert started.status_code == 200
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == 'resident@example.com'))
        user.active = False
        db.commit()
    response = c.post('/api/auth/otp/resend', json={'challenge_id': started.json()['challenge_id']})
    assert response.status_code == 400
    assert c.post('/api/auth/login', json={'email': 'resident@example.com', 'password': 'Temporary123!'}).status_code == 401
