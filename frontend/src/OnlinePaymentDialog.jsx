import React, { useState } from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import { CheckCircle2, ShieldCheck, QrCode, CreditCard, Building, Smartphone, ArrowRight, Download, Receipt } from 'lucide-react';

export default function OnlinePaymentDialog({
  invoice,
  resident,
  money,
  monthLabel,
  dateLabel,
  busy,
  api,
  onDownloadInvoice,
  onDownloadReceipt,
  onSuccess,
  onCancel
}) {
  const [method, setMethod] = useState('upi'); // 'upi' | 'card' | 'bank'
  const [upiType, setUpiType] = useState('qr'); // 'qr' | 'id'
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(resident?.name || invoice.resident_name || '');
  const [bank, setBank] = useState('HDFC');
  
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const amountToPay = String(invoice.balance);

  const handlePay = async (e) => {
    e?.preventDefault();
    setError('');
    setPaying(true);

    try {
      let ref = '';
      if (method === 'upi') {
        if (upiType === 'id') {
          if (!upiId.includes('@')) {
            throw new Error('Please enter a valid UPI ID (e.g. name@okaxis)');
          }
          ref = `UPI-${upiId.split('@')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        } else {
          ref = `UPI-QR-${Date.now().toString(36).toUpperCase()}`;
        }
      } else if (method === 'card') {
        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 15) {
          throw new Error('Please enter a valid 16-digit card number');
        }
        ref = `CARD-${cleanCard.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
      } else {
        ref = `NETBANK-${bank}-${Date.now().toString(36).toUpperCase()}`;
      }

      const payload = {
        invoice_id: invoice.id,
        amount: amountToPay,
        method: method === 'card' ? 'card' : method === 'bank' ? 'bank' : 'upi',
        reference: ref,
        idempotency_key: `online-${invoice.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        payer_name: resident?.name || invoice.resident_name || 'Resident',
        note: `Online portal payment via ${method.toUpperCase()}`
      };

      // Simulated network authorization delay (800ms) for realistic UX
      await new Promise(r => setTimeout(r, 800));

      const res = await api('/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setReceiptData({
        id: res.id,
        reference: ref,
        amount: amountToPay,
        paid_at: new Date().toISOString(),
        method: payload.method
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (receiptData) {
    return (
      <DialogShell
        title="Payment Successful"
        subtitle="Your fee payment has been confirmed & recorded"
        onClose={onCancel}
        footer={
          <button type="button" className="btn btn-primary" onClick={onCancel}>
            Done
          </button>
        }
      >
        <div style={{ textAlign: 'center', padding: '16px 8px 24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            marginBottom: 16
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 700 }}>
            {money(receiptData.amount)} Paid Successfully
          </h3>
          <p style={{ margin: 0, color: 'var(--muted, #64748b)', fontSize: '0.9rem' }}>
            Reference: <strong>{receiptData.reference}</strong>
          </p>
          <div style={{
            margin: '20px auto 24px',
            padding: '14px 18px',
            background: 'var(--surface-hover, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 12,
            textAlign: 'left',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted, #64748b)' }}>Invoice No</span>
              <strong>{invoice.invoice_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted, #64748b)' }}>Billing Period</span>
              <span>{monthLabel(invoice.month)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted, #64748b)' }}>Payment Status</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Settled (₹0.00 Balance)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted, #64748b)' }}>Receipt ID</span>
              <span>SW-{String(receiptData.id).padStart(6, '0')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => onDownloadInvoice && onDownloadInvoice(invoice)}
            >
              <Download size={16} /> Download Paid Invoice PDF
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => onDownloadReceipt && onDownloadReceipt({ id: receiptData.id })}
            >
              <Receipt size={16} /> Download Receipt
            </button>
          </div>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      title="Online Fee Payment"
      subtitle={`${invoice.resident_name || 'Resident'} · ${monthLabel(invoice.month)}`}
      busy={paying || busy}
      error={error}
      onClose={onCancel}
      onSubmit={handlePay}
      footer={
        <>
          <button type="button" className="btn btn-secondary" disabled={paying || busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={paying || busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {paying ? 'Processing payment…' : `Pay ${money(amountToPay)} Now`} <ArrowRight size={16} />
          </button>
        </>
      }
    >
      {/* Bill summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.04) 0%, rgba(200, 169, 106, 0.08) 100%)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted, #64748b)', fontWeight: 600 }}>
              Invoice {invoice.invoice_number}
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 2 }}>
              Room {invoice.room_number || 'Allocated Room'} · {monthLabel(invoice.month)}
            </div>
            <small style={{ color: 'var(--muted, #64748b)' }}>
              Due by {dateLabel(invoice.due_on)}
            </small>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>Amount Due</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {money(amountToPay)}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted, #64748b)' }}>
          <span>Base Fee: {money(invoice.base_fee)}</span>
          {Number(invoice.discount) > 0 && <span>Discount: -{money(invoice.discount)}</span>}
          <span>Total Billed: {money(invoice.amount)}</span>
        </div>
      </div>

      {/* Payment Method Selector Tabs */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text, #1e293b)' }}>
          Select Payment Method
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMethod('upi')}
            style={{
              padding: '10px 8px',
              borderRadius: 10,
              border: method === 'upi' ? '2px solid #0f172a' : '1px solid var(--border, #e2e8f0)',
              background: method === 'upi' ? 'rgba(15, 23, 42, 0.04)' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              fontWeight: method === 'upi' ? 700 : 500,
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Smartphone size={20} color={method === 'upi' ? '#0f172a' : '#64748b'} />
            UPI / QR
          </button>

          <button
            type="button"
            onClick={() => setMethod('card')}
            style={{
              padding: '10px 8px',
              borderRadius: 10,
              border: method === 'card' ? '2px solid #0f172a' : '1px solid var(--border, #e2e8f0)',
              background: method === 'card' ? 'rgba(15, 23, 42, 0.04)' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              fontWeight: method === 'card' ? 700 : 500,
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
          >
            <CreditCard size={20} color={method === 'card' ? '#0f172a' : '#64748b'} />
            Card
          </button>

          <button
            type="button"
            onClick={() => setMethod('bank')}
            style={{
              padding: '10px 8px',
              borderRadius: 10,
              border: method === 'bank' ? '2px solid #0f172a' : '1px solid var(--border, #e2e8f0)',
              background: method === 'bank' ? 'rgba(15, 23, 42, 0.04)' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              fontWeight: method === 'bank' ? 700 : 500,
              fontSize: '0.85rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Building size={20} color={method === 'bank' ? '#0f172a' : '#64748b'} />
            Net Banking
          </button>
        </div>
      </div>

      {/* Method details */}
      {method === 'upi' && (
        <div style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12,
          padding: 16,
          background: '#fff'
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', fontWeight: upiType === 'qr' ? 600 : 400 }}>
              <input type="radio" name="upiType" checked={upiType === 'qr'} onChange={() => setUpiType('qr')} />
              Scan QR Code
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', fontWeight: upiType === 'id' ? 600 : 400 }}>
              <input type="radio" name="upiType" checked={upiType === 'id'} onChange={() => setUpiType('id')} />
              Enter UPI ID / VPA
            </label>
          </div>

          {upiType === 'qr' ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                display: 'inline-block',
                padding: 16,
                background: '#fff',
                border: '2px solid #0f172a',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}>
                <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Stylized realistic QR Code matrix representation */}
                  <rect width="100" height="100" fill="white" />
                  {/* Top-left position marker */}
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="9" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="13" width="12" height="12" rx="2" fill="#0f172a" />
                  {/* Top-right position marker */}
                  <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="71" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="75" y="13" width="12" height="12" rx="2" fill="#0f172a" />
                  {/* Bottom-left position marker */}
                  <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="9" y="71" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="75" width="12" height="12" rx="2" fill="#0f172a" />
                  {/* QR Data dots */}
                  <rect x="38" y="10" width="5" height="5" fill="#0f172a" />
                  <rect x="48" y="10" width="5" height="5" fill="#0f172a" />
                  <rect x="58" y="10" width="5" height="5" fill="#0f172a" />
                  <rect x="38" y="20" width="5" height="5" fill="#0f172a" />
                  <rect x="48" y="25" width="5" height="5" fill="#0f172a" />
                  <rect x="38" y="38" width="5" height="5" fill="#0f172a" />
                  <rect x="48" y="38" width="5" height="5" fill="#0f172a" />
                  <rect x="58" y="38" width="5" height="5" fill="#0f172a" />
                  <rect x="68" y="38" width="5" height="5" fill="#0f172a" />
                  <rect x="78" y="38" width="5" height="5" fill="#0f172a" />
                  <rect x="10" y="48" width="5" height="5" fill="#0f172a" />
                  <rect x="20" y="48" width="5" height="5" fill="#0f172a" />
                  <rect x="30" y="48" width="5" height="5" fill="#0f172a" />
                  <rect x="45" y="48" width="10" height="5" fill="#0f172a" />
                  <rect x="65" y="48" width="5" height="5" fill="#0f172a" />
                  <rect x="80" y="48" width="5" height="5" fill="#0f172a" />
                  <rect x="38" y="58" width="5" height="5" fill="#0f172a" />
                  <rect x="48" y="58" width="5" height="5" fill="#0f172a" />
                  <rect x="68" y="58" width="10" height="5" fill="#0f172a" />
                  <rect x="38" y="68" width="10" height="5" fill="#0f172a" />
                  <rect x="58" y="68" width="5" height="5" fill="#0f172a" />
                  <rect x="78" y="68" width="5" height="5" fill="#0f172a" />
                  <rect x="38" y="78" width="5" height="5" fill="#0f172a" />
                  <rect x="52" y="78" width="10" height="5" fill="#0f172a" />
                  <rect x="72" y="78" width="5" height="5" fill="#0f172a" />
                  <rect x="85" y="78" width="5" height="5" fill="#0f172a" />
                  <rect x="38" y="88" width="15" height="5" fill="#0f172a" />
                  <rect x="65" y="88" width="5" height="5" fill="#0f172a" />
                  <rect x="80" y="88" width="10" height="5" fill="#0f172a" />
                </svg>
              </div>
              <p style={{ margin: '10px 0 4px', fontSize: '0.85rem', fontWeight: 600 }}>
                Scan with any UPI app to pay {money(amountToPay)}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
                <span>• GPay</span>
                <span>• PhonePe</span>
                <span>• Paytm</span>
                <span>• BHIM</span>
              </div>
            </div>
          ) : (
            <div>
              <FormField label="Virtual Payment Address (VPA)" hint="Enter your registered UPI ID">
                <input
                  type="text"
                  placeholder="e.g. mobile@okaxis or username@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  required
                />
              </FormField>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {['@okaxis', '@okhdfcbank', '@paytm', '@ybl'].map(suffix => (
                  <button
                    key={suffix}
                    type="button"
                    className="btn btn-tertiary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => {
                      const prefix = upiId.split('@')[0] || 'resident';
                      setUpiId(prefix + suffix);
                    }}
                  >
                    {suffix}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {method === 'card' && (
        <div style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12,
          padding: 16,
          background: '#fff'
        }}>
          <FormField label="Card Number">
            <input
              type="text"
              placeholder="4532 •••• •••• 8899"
              maxLength={19}
              value={cardNumber}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                const formatted = v.match(/.{1,4}/g)?.join(' ') || v;
                setCardNumber(formatted);
              }}
              required
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
            <FormField label="Expiry Date">
              <input
                type="text"
                placeholder="MM/YY"
                maxLength={5}
                value={cardExpiry}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                  setCardExpiry(v);
                }}
                required
              />
            </FormField>
            <FormField label="CVV">
              <input
                type="password"
                placeholder="•••"
                maxLength={4}
                value={cardCvv}
                onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                required
              />
            </FormField>
          </div>
          <div style={{ marginTop: 10 }}>
            <FormField label="Name on Card">
              <input
                type="text"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                required
              />
            </FormField>
          </div>
        </div>
      )}

      {method === 'bank' && (
        <div style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12,
          padding: 16,
          background: '#fff'
        }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
            Select Your Bank
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'].map(b => (
              <label
                key={b}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: bank === b ? '2px solid #0f172a' : '1px solid var(--border, #e2e8f0)',
                  background: bank === b ? 'rgba(15, 23, 42, 0.04)' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: bank === b ? 600 : 400
                }}
              >
                <input
                  type="radio"
                  name="bank"
                  checked={bank === b}
                  onChange={() => setBank(b)}
                />
                {b} Bank
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Security badge note */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.78rem',
        color: 'var(--muted, #64748b)',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.02)',
        borderRadius: 8
      }}>
        <ShieldCheck size={18} color="#10b981" />
        <span>Instant credit to your resident ledger. A digitally verified invoice PDF and receipt will be generated automatically.</span>
      </div>
    </DialogShell>
  );
}
