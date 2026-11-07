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
