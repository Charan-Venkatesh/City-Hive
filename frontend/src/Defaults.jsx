import React, {useEffect, useRef} from 'react';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SYMBOLS = '@#%+=';

// Cryptographically random temporary password, always containing upper, lower, digit and symbol.
export function generatePassword(length = 14) {
  const pick = (set, bytes) => set[bytes % set.length];
  const bytes = new Uint8Array(length + 4); crypto.getRandomValues(bytes);
  const chars = Array.from({length}, (_, i) => pick(ALPHABET, bytes[i]));
  chars[0] = pick('ABCDEFGHJKLMNPQRSTUVWXYZ', bytes[length]);
  chars[1] = pick('abcdefghijkmnopqrstuvwxyz', bytes[length + 1]);
  chars[2] = pick('23456789', bytes[length + 2]);
  chars[3] = pick(SYMBOLS, bytes[length + 3]);
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

// Current local time formatted for <input type="datetime-local">.
export function nowLocal() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Visible, editable, pre-filled temporary password. Shown to the administrator once, in the success notice.
export function PasswordField({label, minLength = 10, name = 'temporary_password'}) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && !ref.current.value) ref.current.value = generatePassword(Math.max(14, minLength + 2)); }, [minLength]);
  return <div className="field password-field"><label>{label}<input ref={ref} name={name} type="text" minLength={minLength} required autoComplete="off" spellCheck={false}/></label>
    <button type="button" className="text-btn" onClick={() => { ref.current.value = generatePassword(Math.max(14, minLength + 2)); }}>Generate a new one</button>
    <small className="muted">Generated securely. It is shown once in the confirmation; the person must change it at first sign-in.</small></div>;
}

// Plan name suggested from the chosen branch and sharing until the administrator types their own.
export function AutoPlanName({defaultValue = ''}) {
  const ref = useRef(null), touched = useRef(Boolean(defaultValue));
  useEffect(() => {
    const form = ref.current?.closest('form'); if (!form) return;
    const update = () => {
      if (touched.current) return;
      const branch = form.elements.branch_id, sharing = form.elements.sharing?.value;
      const branchName = branch?.selectedOptions?.[0]?.text || '';
      if (branchName && sharing) ref.current.value = `${branchName} · ${sharing}-person sharing`.slice(0, 100);
    };
    form.addEventListener('input', update); form.addEventListener('change', update); update();
    return () => { form.removeEventListener('input', update); form.removeEventListener('change', update); };
  }, []);
  return <label className="field">Plan name<input ref={ref} name="name" minLength={2} maxLength={100} required defaultValue={defaultValue} onInput={e => { if (e.nativeEvent.isTrusted) touched.current = true; }}/>
    <small className="muted">Suggested from branch and sharing; edit if you like.</small></label>;
}
