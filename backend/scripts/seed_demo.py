"""Load fictional demo residents, fee plans, invoices and payments through the running API.

Demo data only: names, emails (demoNN@example.com) and prices are invented. Re-running skips existing demo residents.
Usage (backend running on :8000, OTP_REQUIRED=false):  python scripts/seed_demo.py <owner-username> <owner-password>
"""
import sys, uuid
from datetime import date
import httpx

API = 'http://127.0.0.1:8000/api'
NAMES = ['Aarav Sharma', 'Vihaan Reddy', 'Arjun Nair', 'Rohan Gupta', 'Karthik Rao', 'Siddharth Jain', 'Ishaan Verma',
         'Aditya Kulkarni', 'Pranav Iyer', 'Manish Yadav', 'Rahul Singh', 'Harsha Vardhan', 'Naveen Kumar', 'Tarun Patel',
         'Varun Mehta', 'Kiran Das', 'Suresh Babu', 'Deepak Joshi', 'Akash Menon', 'Nikhil Bhat']
# monthly fee, advance per sharing type (invented demo prices)
PRICES = {1: (12000, 15000), 2: (9000, 10000), 3: (7500, 8000), 4: (6000, 6000)}

def main(user, password):
    c = httpx.Client(base_url=API, timeout=30)
    token = c.post('/auth/login', json={'email': user, 'password': password}).json()['access_token']
    c.headers['Authorization'] = 'Bearer ' + token
    branches = [b for b in c.get('/managed-branches').json() if b['name'] != 'Branch A']
    existing = {r['email'] for r in c.get('/residents').json()}
    rooms = c.get('/rooms').json()
    plans = {}
    for b in branches:
        for sharing, (fee, adv) in PRICES.items():
            name = f'{sharing} Sharing (demo)'
            r = c.post('/fee-plans', json={'branch_id': b['id'], 'name': name, 'sharing': sharing, 'monthly_fee': str(fee),
                       'advance_amount': str(adv), 'billing_day': 1, 'due_day': 5, 'effective_from': '2026-09-01'})
            if r.status_code == 201: plans[(b['id'], sharing)] = r.json().get('id')
    if len(plans) < len(branches) * 4:
        for p in c.get('/fee-plans').json(): plans.setdefault((p['branch_id'], p['sharing']), p['id'])
    n = 0
    for bi, b in enumerate(branches):
        free = [r for r in rooms if r['branch_id'] == b['id'] and r['active']]
        for k in range(10):
            n += 1; email = f'demo{n:02d}@example.com'
            if email in existing: continue
            room = free[(k * 5) % len(free)]
            rid = c.post('/residents', json={'branch_id': b['id'], 'name': NAMES[(n - 1) % len(NAMES)], 'email': email,
                'phone': f'90000{n:05d}', 'joined_on': '2026-09-01', 'temporary_password': 'Demo@12345'}).json()['id']
            sharing = room['capacity']
            r = c.put(f'/residents/{rid}/allocation', json={'room_id': room['id'], 'discount': '0', 'reason': 'Demo data'})
            if r.status_code != 200: print('allocation skipped', room['number'], r.text[:80]); continue
            c.put(f'/residents/{rid}/fee-plan', json={'fee_plan_id': plans[(b['id'], sharing)]})
    for month in ('2026-09-01', '2026-10-01'):
        print(month, c.post('/billing/generate', json={'month': month}).json())
    invoices = c.get('/invoices').json()
    for i, inv in enumerate(invoices):
        due = float(inv.get('balance', inv.get('total', 0)) or 0)
        if due <= 0: continue
        if inv['month'] < '2026-10-01' and i % 4 != 0: amount = due          # most September invoices paid
        elif i % 3 == 0: amount = round(due / 2, 2)                                    # partial
        elif i % 3 == 1: amount = due                                                  # paid
        else: continue                                                                 # pending
        c.post('/payments', json={'invoice_id': inv['id'], 'amount': str(amount), 'method': ['cash', 'upi', 'bank'][i % 3],
                                  'idempotency_key': 'demo-' + uuid.uuid4().hex[:12], 'note': 'Demo payment'})
    print('Done. Demo resident password: Demo@12345')

if __name__ == '__main__':
    main(*sys.argv[1:3])
