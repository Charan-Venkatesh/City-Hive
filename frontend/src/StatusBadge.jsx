import React from 'react';

const TONE = {paid: 'success', recorded: 'success', active: 'success', sent: 'success', approved: 'success', resolved: 'success', reviewed: 'success', enrolled: 'success',
  due: 'warning', pending: 'warning', queued: 'warning', open: 'warning', needs_info: 'warning', in_progress: 'info',
  overdue: 'danger', rejected: 'danger', reversed: 'danger', failed: 'danger', inactive: 'neutral', expired: 'neutral'};

// One status vocabulary: text plus a colour tone, never colour alone.
export default function StatusBadge({value, label}) {
  const text = label || String(value).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  return <span className={'ds-pill ds-pill-' + (TONE[value] || 'neutral')}>{text}</span>;
}
