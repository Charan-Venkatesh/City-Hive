import React, {useEffect, useRef, useState} from 'react';

// Accessible "more actions" menu. Opens with Enter/Space/click, arrows move, Escape closes and returns focus.
// Positioned with fixed coordinates so a scrolling table cannot clip it.
export default function RowMenu({items, label}) {
  const [open, setOpen] = useState(false), [pos, setPos] = useState({top: 0, right: 0});
  const button = useRef(null), menu = useRef(null);
  useEffect(() => {
    if (!open) return;
    const r = button.current.getBoundingClientRect();
    const below = innerHeight - r.bottom > items.length * 44 + 16;
    setPos({top: below ? r.bottom + 4 : Math.max(8, r.top - items.length * 44 - 12), right: Math.max(8, innerWidth - r.right)});
    const frame = requestAnimationFrame(() => menu.current?.querySelector('button')?.focus({preventScroll: true}));
    const close = () => setOpen(false);
    const outside = e => { if (!menu.current?.contains(e.target) && !button.current?.contains(e.target)) close(); };
    // Only scrolling that moves the trigger closes the menu; scrolling inside the menu or unrelated panels does not.
    const openedAt = performance.now();   // ignore the scroll that brought the trigger into view just before opening
    const scrolled = e => { if (performance.now() - openedAt < 300) return; const t = e.target; if (t === document || t === document.documentElement || (t.contains && t.contains(button.current))) close(); };
    const escape = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); button.current?.focus(); } };
    document.addEventListener('keydown', escape, true);
    document.addEventListener('mousedown', outside); window.addEventListener('scroll', scrolled, true); window.addEventListener('resize', close);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', escape, true); document.removeEventListener('mousedown', outside); window.removeEventListener('scroll', scrolled, true); window.removeEventListener('resize', close); };
  }, [open, items.length]);
  function key(e) {
    const all = [...menu.current.querySelectorAll('button')], i = all.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); button.current.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
    else if (e.key === 'Tab') setOpen(false);
  }
  return <>
    <button type="button" ref={button} className="ds-menu-btn" aria-label={label || 'More actions'} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
    {open && <div ref={menu} className="ds-menu" role="menu" style={{top: pos.top, right: pos.right}} onKeyDown={key}>
      {items.map(it => <button type="button" role="menuitem" key={it.label} className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>)}</div>}
  </>;
}
