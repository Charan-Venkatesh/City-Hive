import React from 'react';
import {matchingPlans} from './features';

// Read-only monthly accommodation price for a new room: the single fee plan that applies to this branch and sharing today.
// Advance and other plan charges belong to the fee plan and resident onboarding, so they are deliberately not shown here.
export default function PricePreview({plans, branchId, sharing, today, money}) {
  if (!branchId || !sharing) return <div className="price-panel idle" role="status">Choose how many residents share the room to see its price.</div>;
  const found = matchingPlans(plans, branchId, sharing, today);
  if (found.length === 1) {
    const p = found[0];
    return <div className="price-panel" role="status"><span>Fee plan: {p.name}</span><strong>{money(p.monthly_fee)} / month</strong>
      <span>Monthly accommodation price. Applied automatically; nothing to enter.</span></div>;
  }
  return <div className="price-panel warn" role="status">{found.length ? 'More than one fee plan matches this sharing, so no price is shown. Fix the plan dates under Fees → Plans.'
    : `No single matching fee plan for ${sharing}-person sharing in this branch. You can still save the room; add or fix the plan under Fees → Plans so residents are priced.`}</div>;
}
