import React, {useState} from 'react';

// Owner tools: send one email now, or trigger due reminders and deliver everything queued.
export default function MailTools({api, onDone}) {
  const [busy, setBusy] = useState(''), [note, setNote] = useState(null);
  async function run(kind, call) {
    setBusy(kind); setNote(null);
    try { setNote({ok: true, text: await call()}); onDone && onDone(); }
    catch (e) { setNote({ok: false, text: e.message}); }
    finally { setBusy(''); }
  }
  const post = (path, body) => api(path, {method: 'POST', body: JSON.stringify(body || {})});
  return <section className="card mail-tools">
    <div className="card-heading"><div><h2>Send email</h2><p>Send a message now, or trigger due-fee reminders without waiting for the scheduler.</p></div>
      <button className="secondary" disabled={!!busy} onClick={() => run('now', async () => {
        const r = await post('/emails/send-now'); return `Queued ${r.queued} reminder(s). Sent ${r.sent}, failed ${r.failed}.`; })}>{busy === 'now' ? 'Sending…' : 'Send reminders & queued emails now'}</button></div>
    <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = e.currentTarget; const v = Object.fromEntries(new FormData(f));
      run('one', async () => { const r = await post('/emails/send', v); if (r.delivered) f.reset(); return r.delivered ? `Email sent to ${v.to}.` : `Not delivered yet (status: ${r.status}). It will retry; check SMTP settings.`; }); }}>
      <label className="field">To<input name="to" type="email" required placeholder="name@example.com"/></label>
      <label className="field">Subject<input name="subject" required maxLength={200}/></label>
      <label className="field" style={{gridColumn: '1 / -1'}}>Message<textarea name="body" rows={4} required maxLength={5000}/></label>
      <div><button className="primary" disabled={!!busy}>{busy === 'one' ? 'Sending…' : 'Send email'}</button></div>
    </form>
    {note && <p className={'alert ' + (note.ok ? 'success' : 'error')} role={note.ok ? 'status' : 'alert'}>{note.text}</p>}
  </section>;
}
