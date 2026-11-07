"""Mark rooms as AC or non-AC."""
from alembic import op
import sqlalchemy as sa

revision = '0016_room_ac'
down_revision = '0015_gap_completion'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if 'ac' not in {c['name'] for c in sa.inspect(bind).get_columns('rooms')}:
        with op.batch_alter_table('rooms') as batch:
            batch.add_column(sa.Column('ac', sa.Boolean(), nullable=False, server_default=sa.false()))
        # Rooms numbered by the seed scripts carry their type in the suffix (…-AC / …-NAC).
        op.execute("UPDATE rooms SET ac = TRUE WHERE number LIKE '%-AC'" if bind.dialect.name == 'postgresql'
                   else "UPDATE rooms SET ac = 1 WHERE number LIKE '%-AC'")
    existing_cols = {c['name'] for c in sa.inspect(bind).get_columns('admissions')}
    with op.batch_alter_table('admissions') as batch:
        if 'aadhaar_last4' not in existing_cols:
            batch.add_column(sa.Column('aadhaar_last4', sa.String(4), nullable=True))
        if 'id_status' not in existing_cols:
            batch.add_column(sa.Column('id_status', sa.String(20), nullable=False, server_default='pending'))

def downgrade():
    raise RuntimeError('Downgrades are disabled to protect application data; restore from a verified backup.')
