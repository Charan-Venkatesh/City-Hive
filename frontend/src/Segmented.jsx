import React from 'react';

// Accessible segmented control built on native radios: arrow keys, space, screen-reader group name and an inline error.
export default function Segmented({legend, name, options, value, onChange, error, hint, optional, firstRef}) {
  return <fieldset className={'seg-field' + (error ? ' has-error' : '')}>
    <legend>{legend}{optional && <em className="seg-optional"> Optional</em>}</legend>
    <div className="seg">{options.map((o, i) => <label key={o.value} className={'seg-opt' + (String(value) === String(o.value) ? ' on' : '')}>
      <input type="radio" name={name} value={o.value} checked={String(value) === String(o.value)} onChange={() => onChange(String(o.value))}
        ref={i === 0 ? firstRef : undefined} aria-invalid={error ? 'true' : undefined}/>
      <span>{o.label}{o.count !== undefined && <small>{o.count}</small>}</span></label>)}</div>
    {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="ff-hint">{hint}</span> : null}
  </fieldset>;
}
