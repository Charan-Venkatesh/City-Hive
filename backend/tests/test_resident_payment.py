from datetime import date
from tests.test_workflows import resident, room, signin, local_today, ctx

def test_resident_online_payment_and_invoice_update(ctx):
    c, h, sessions = ctx
    rid = resident(c, h, email='payresident@example.com')
    room_id = room(c, h)
    c.put(f'/api/residents/{rid}/allocation', headers=h, json={'room_id': room_id, 'discount': '0'})
    month = local_today().replace(day=1).isoformat()
    # Owner generates invoice
    c.post('/api/billing/generate', headers=h, json={'month': month})
    invoices = c.get('/api/invoices', headers=h).json()
    resident_inv = [inv for inv in invoices if inv['resident_id'] == rid][0]
    assert resident_inv['balance'] == '8500.00'
    assert resident_inv['status'] in ('due', 'overdue')

    # Resident logs in
    rh = signin(c, 'payresident@example.com')
    my_invoices = c.get('/api/invoices', headers=rh).json()
    assert len(my_invoices) == 1
    assert my_invoices[0]['id'] == resident_inv['id']
    assert my_invoices[0]['balance'] == '8500.00'

    # Resident pays online via UPI
    pay_payload = {
        'invoice_id': resident_inv['id'],
        'amount': '8500.00',
        'method': 'upi',
        'reference': 'UPI-TEST-998877',
        'idempotency_key': 'pay-online-idemp-12345678',
        'payer_name': 'Test Resident',
        'note': 'Paid via Cityhive Online Portal'
    }
    pay_res = c.post('/api/payments', headers=rh, json=pay_payload)
    assert pay_res.status_code == 201, pay_res.text
    payment_id = pay_res.json()['id']

    # Check resident's invoice is now marked PAID with 0 balance
    updated_inv = c.get('/api/invoices', headers=rh).json()[0]
    assert updated_inv['paid'] == '8500.00'
    assert updated_inv['balance'] == '0.00'
    assert updated_inv['status'] == 'paid'

    # Check owner view is also updated
    owner_inv = [inv for inv in c.get('/api/invoices', headers=h).json() if inv['id'] == resident_inv['id']][0]
    assert owner_inv['paid'] == '8500.00'
    assert owner_inv['balance'] == '0.00'
    assert owner_inv['status'] == 'paid'

    # Resident can download invoice PDF
    pdf_res = c.get(f"/api/invoices/{resident_inv['id']}/pdf", headers=rh)
    assert pdf_res.status_code == 200
    assert pdf_res.headers['content-type'] == 'application/pdf'
    assert pdf_res.content.startswith(b'%PDF-1.4')

    # Resident can download receipt PDF
    receipt_res = c.get(f"/api/payments/{payment_id}/receipt.pdf", headers=rh)
    assert receipt_res.status_code == 200
    assert receipt_res.headers['content-type'] == 'application/pdf'

def test_admission_aadhaar_verification_and_enrollment(ctx):
    from uuid import uuid4
    c, h, sessions = ctx
    # Create an available room so admission sharing has capacity
    room_id = room(c, h, capacity=2)
    branches = c.get('/api/branches').json()
    b_id = branches[0]['id']

    # 1. Submit admission enquiry with Aadhaar
    sub_key = uuid4().hex
    adm_payload = {
        'branch_id': b_id,
        'name': 'Aadhaar Applicant',
        'email': 'aadhaar.applicant@example.com',
        'phone': '9876543210',
        'preferred_sharing': 2,
        'move_in_date': local_today().isoformat(),
        'message': 'Looking for immediate move in',
        'submission_key': sub_key,
        'aadhaar_last4': '9876'
    }
    r = c.post('/api/admissions', json=adm_payload)
    assert r.status_code == 201, r.text
    adm_id = r.json()['id']

    # 2. Owner checks admissions table: aadhaar_last4 is present
    admissions = c.get('/api/admissions', headers=h).json()
    my_adm = [a for a in admissions if a['id'] == adm_id][0]
    assert my_adm['aadhaar_last4'] == '9876'
    assert my_adm['status'] == 'pending'

    # 3. Owner approves admission and confirms Aadhaar verification
    dec = c.put(f'/api/admissions/{adm_id}', headers=h, json={
        'status': 'approved',
        'note': 'Verified identity document',
        'aadhaar_last4': '9876'
    })
    assert dec.status_code == 200
    assert dec.json()['status'] == 'approved'

    # 4. Owner creates resident account (enrolling with Aadhaar verification)
    enroll_res = c.post(f'/api/admissions/{adm_id}/enroll', headers=h, json={
        'temporary_password': 'Applicant@12345',
        'aadhaar_last4': '9876',
        'id_status': 'reviewed'
    })
    assert enroll_res.status_code == 201, enroll_res.text

    # 5. Verify the created resident has verified Aadhaar and reviewed status
    residents = c.get('/api/residents', headers=h).json()
    enrolled_resident = [res for res in residents if res['email'] == 'aadhaar.applicant@example.com'][0]
    assert enrolled_resident['aadhaar_last4'] == '9876'
    assert enrolled_resident['id_status'] == 'reviewed'

