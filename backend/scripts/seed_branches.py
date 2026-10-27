"""Create or update the two CityHive branches. Safe to re-run; never deletes data.

Run from backend/ against the configured DATABASE_URL:  python scripts/seed_branches.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from app.main import initialize
from app.db import SessionLocal
from app.models import Branch

BRANCHES = [
    dict(name="Cityhive Luxury Men's PG", address='Plot No. 64', contact_phone='07075830975',
         description="Cityhive Luxury Men's PG: a boys' hostel with well-maintained rooms and food.",
         facilities='Well-maintained rooms; food provided'),
    dict(name='CityHive CoSpace', address='Plot No. 95', contact_phone='07075830975',
         description='CityHive CoSpace - Where Luxury Meets Home. A hostel with all facilities and homely food.',
         facilities='All facilities; homely food'),
]

def main():
    initialize()
    with SessionLocal() as db:
        for data in BRANCHES:
            branch = db.scalar(select(Branch).where(Branch.name == data['name']))
            if branch:
                for key, value in data.items(): setattr(branch, key, value)
            else:
                db.add(Branch(**data, active=True, published=False))
        db.commit()
        print([(b.id, b.name, b.published) for b in db.scalars(select(Branch))])

if __name__ == '__main__':
    main()
