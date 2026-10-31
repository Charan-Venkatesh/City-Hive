import React from 'react';

// Label above, hint below, optional marker. The control is passed as children so any input or select can be used.
export default function FormField({label, hint, optional, children}) {
  return <label className="ff"><span className="ff-label">{label}{optional && <em>Optional</em>}</span>{children}{hint && <span className="ff-hint">{hint}</span>}</label>;
}
