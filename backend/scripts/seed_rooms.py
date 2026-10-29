"""Create the room layout for both CityHive branches. Safe to re-run; never deletes data.

Each of 7 floors has 8 rooms: sharing 1-4, each AC and Non-AC. Room numbers are unique
across branches, so they carry a branch prefix (M = Men's PG, C = CoSpace). monthly_fee is
0 until real prices are supplied; set it in the management screen or via FEES below.
"""
import sys
from decimal import Decimal
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from app.main import initialize
from app.db import SessionLocal
from app.models import Branch, Room

PREFIX = {"Cityhive Luxury Men's PG": 'M', 'CityHive CoSpace': 'C'}
FLOORS = 7
TYPES = [(s, ac) for s in (1, 2, 3, 4) for ac in (True, False)]
FEES = {}  # {(sharing, is_ac): Decimal monthly fee per bed}, to be filled with real prices

def main():
    initialize()
    created = 0
    with SessionLocal() as db:
        for branch in db.scalars(select(Branch).where(Branch.name.in_(PREFIX))):
            for floor in range(1, FLOORS + 1):
                for index, (sharing, ac) in enumerate(TYPES, start=1):
                    number = f"{PREFIX[branch.name]}-{floor}{index:02d}-{'AC' if ac else 'NAC'}"
                    room = db.scalar(select(Room).where(Room.number == number))
                    fee = FEES.get((sharing, ac), Decimal('0'))
                    if room:
                        if (sharing, ac) in FEES: room.monthly_fee = fee
                        room.ac = ac
                        continue
                    db.add(Room(branch_id=branch.id, number=number, floor=f'Floor {floor}', capacity=sharing, monthly_fee=fee, ac=ac))
                    created += 1
        db.commit()
    print(f'Rooms created: {created}')

if __name__ == '__main__':
    main()
