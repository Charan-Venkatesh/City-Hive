import React, {useId} from 'react';
import {X} from 'lucide-react';

// Dialog with a fixed header and footer; only the body scrolls. Pass onSubmit to make the footer buttons submit a form.
// Focus trap, Escape and focus return come from useDialogFocus in main.jsx (it finds role="dialog").
export default function DialogShell({title, subtitle, size = 'md', tall = false, error, busy, onClose, onSubmit, footer, children}) {
  const id = useId(), Inner = onSubmit ? 'form' : 'div';
  return <div className="modal-backdrop dlg-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section className={`dlg dlg-${size}${tall ? ' dlg-tall' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
      <header className="dlg-head"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className="dlg-close" aria-label="Close dialog" onClick={() => !busy && onClose()}><X size={20}/></button></header>
      {error && <div role="alert" className="dlg-alert">{error}</div>}
      <Inner className="dlg-inner" {...(onSubmit ? {onSubmit, noValidate: false} : {})}>
        <div className="dlg-body">{children}</div>
        {footer && <div className="dlg-foot" role="group" aria-label="Dialog actions">{footer}</div>}
      </Inner>
    </section>
  </div>;
}
