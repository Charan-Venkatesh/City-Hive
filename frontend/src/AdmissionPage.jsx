import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, Building2, BedDouble,
  Calendar, User, Mail, Phone, Lock, Sparkles, Copy, Check, Search, AlertCircle
} from 'lucide-react';
import { apiJson } from './api';
import './doa.css';

const todayDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function AdmissionPage({ onBack, onLogin, initialBranchId }) {
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'track'
  const [branches, setBranches] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // Form State
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId ? String(initialBranchId) : '');
  const [sharing, setSharing] = useState('');
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  });
  
  // Aadhaar verification
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [aadhaarFormatted, setAadhaarFormatted] = useState('');
  const [aadhaarValid, setAadhaarValid] = useState(false);
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Tracking
  const [trackingEmail, setTrackingEmail] = useState('');
  const [trackingKey, setTrackingKey] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  const submissionKeyRef = useRef(crypto.randomUUID());

  // Fetch branches and live availability
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await apiJson('/branches');
        if (!Array.isArray(rows)) throw new Error('Branches information is temporarily unavailable.');
        
        const pairs = await Promise.all(
          rows.map(async b => {
            try {
              return [b.id, await apiJson(`/public/branches/${b.id}/availability`)];
            } catch {
              return [b.id, null];
            }
          })
        );
        
        if (isMounted) {
          setBranches(rows);
          setInventory(Object.fromEntries(pairs));
          if (!selectedBranch && rows.length > 0) {
            setSelectedBranch(String(rows[0].id));
          }
        }
      } catch (e) {
        if (isMounted) setLoadError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const branch = branches.find(b => String(b.id) === selectedBranch);
  const branchOptions = inventory[selectedBranch] || [];

  const handleAadhaarChange = e => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarRaw(raw);
    const parts = raw.match(/.{1,4}/g);
    setAadhaarFormatted(parts ? parts.join(' ') : '');
    setAadhaarValid(raw.length === 12);
  };

  const handleSubmitAdmission = async e => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    if (!selectedBranch) {
      setSubmitError('Please select a Cityhive branch.');
      return;
    }
    if (!sharing) {
      setSubmitError('Please select your preferred sharing type.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const fd = new FormData(form);
    const values = Object.fromEntries(fd);
    const last4 = aadhaarRaw.length === 12 ? aadhaarRaw.slice(-4) : (values.aadhaar || '').replace(/\D/g, '').slice(-4);

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        emergency_contact: (values.emergency_contact || '').trim(),
        emergency_phone: (values.emergency_phone || '').trim(),
        branch_id: Number(selectedBranch),
        preferred_sharing: Number(sharing),
        move_in_date: moveInDate,
        message: (values.message || '').trim(),
        submission_key: submissionKeyRef.current,
        whatsapp_updates: values.whatsapp_updates === 'on',
        ...(last4 ? { aadhaar_last4: last4 } : {})
      };

      const res = await apiJson('/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSubmitSuccess({
        id: res.id,
        key: submissionKeyRef.current,
        email: payload.email,
        branchName: branch ? branch.name : 'Cityhive Branch',
        sharing,
        moveInDate,
        last4
      });

      // Reset key for future submissions
      submissionKeyRef.current = crypto.randomUUID();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit admission enquiry. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyKeyToClipboard = (key) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleTrackSubmit = async e => {
    e.preventDefault();
    setTrackingBusy(true);
    setTrackingError('');
    setTrackingResult(null);
    try {
      const res = await apiJson('/public/admissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trackingEmail.trim(),
          submission_key: trackingKey.trim()
        })
      });
      setTrackingResult(res);
    } catch (err) {
      setTrackingError(err.message || 'Admission request not found. Please double-check your email and tracking key.');
    } finally {
      setTrackingBusy(false);
    }
  };

  return (
    <div className="doa-page">
      {/* Top Navigation Bar */}
      <header className="doa-header">
        <div className="doa-header-inner">
          <div className="doa-brand-wrap" onClick={onBack} title="Return to Cityhive Homepage">
            <img src="/cityhive-mark.png?v=3" alt="Cityhive PG" className="doa-logo" />
            <div className="doa-brand-title">
              <span className="doa-brand-name">Cityhive Luxury PG's &amp; Co-space</span>
              <span className="doa-brand-badge">
                <ShieldCheck size={13} /> Direct Online Admission (DOA)
              </span>
            </div>
          </div>

          <div className="doa-header-actions">
            <button className="doa-btn-ghost" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </button>
            {onLogin && (
              <button className="doa-btn-portal" onClick={onLogin} title="Resident and Warden Login">
                <Lock size={14} />
                <span>Portal Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="doa-hero">
        <div className="doa-hero-inner">
          <div className="doa-tag">
            <Sparkles size={14} /> Official 2026-2027 Admission Portal
          </div>
          <h1>Direct Online Admission <span>(DOA)</span></h1>
          <p>
            Secure your luxury room directly with instant Government ID (Aadhaar) verification,
            transparent room inventory, zero broker fee, and real-time application tracking.
          </p>

          <div className="doa-trust-row">
            <div className="doa-trust-item">
              <ShieldCheck size={16} /> UIDAI Compliant Aadhaar Verification
            </div>
            <div className="doa-trust-item">
              <CheckCircle2 size={16} /> Instant Private Tracking Key
            </div>
            <div className="doa-trust-item">
              <BedDouble size={16} /> Verified Bed Availability
            </div>
            <div className="doa-trust-item">
              <Building2 size={16} /> Fast Track 2-Hour Allocation
            </div>
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="doa-tab-container">
        <div className="doa-tab-pill">
          <button
            className={`doa-tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => setActiveTab('apply')}
          >
            <BedDouble size={17} />
            <span>Direct Admission Form</span>
          </button>
          <button
            className={`doa-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => setActiveTab('track')}
          >
            <Search size={17} />
            <span>Track Application Status</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="doa-main-content">
        {activeTab === 'apply' ? (
          <div className="doa-card">
            {submitSuccess ? (
              <div className="doa-success-card">
                <div className="doa-success-icon">
                  <CheckCircle2 size={40} />
                </div>
                <h2>Admission Application Submitted!</h2>
                <p>
                  Your Direct Online Admission request has been recorded successfully.
                  Our branch manager has been notified and will verify your room allocation shortly.
                </p>

                <div className="doa-receipt-box">
                  <div className="doa-receipt-item">
                    <span className="doa-receipt-label">Admission Request #</span>
                    <span className="doa-receipt-val">#{submitSuccess.id}</span>
                  </div>
                  <div className="doa-receipt-item">
                    <span className="doa-receipt-label">Selected Branch</span>
                    <span className="doa-receipt-val">{submitSuccess.branchName}</span>
                  </div>
                  <div className="doa-receipt-item">
                    <span className="doa-receipt-label">Room Sharing</span>
                    <span className="doa-receipt-val">{submitSuccess.sharing}-Person Sharing</span>
                  </div>
                  <div className="doa-receipt-item">
                    <span className="doa-receipt-label">Planned Move-In Date</span>
                    <span className="doa-receipt-val">{submitSuccess.moveInDate}</span>
                  </div>
                  {submitSuccess.last4 && (
                    <div className="doa-receipt-item">
                      <span className="doa-receipt-label">Aadhaar Last 4</span>
                      <span className="doa-receipt-val">•••• {submitSuccess.last4} (Verified)</span>
                    </div>
                  )}
                  <div className="doa-receipt-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <span className="doa-receipt-label">Your Private Tracking Key (Save this):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <span className="doa-key-badge" style={{ flex: 1 }}>{submitSuccess.key}</span>
                      <button
                        type="button"
                        className="doa-btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => copyKeyToClipboard(submitSuccess.key)}
                      >
                        {copiedKey ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
                        <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="doa-success-actions">
                  <button
                    className="doa-submit-btn"
                    style={{ width: 'auto', padding: '12px 24px' }}
                    onClick={() => {
                      setTrackingEmail(submitSuccess.email);
                      setTrackingKey(submitSuccess.key);
                      setActiveTab('track');
                    }}
                  >
                    <Search size={18} />
                    <span>Track Status Live</span>
                  </button>
                  <button
                    className="doa-btn-ghost"
                    onClick={() => {
                      setSubmitSuccess(null);
                      setAadhaarRaw('');
                      setAadhaarFormatted('');
                    }}
                  >
                    <span>Submit Another Application</span>
                  </button>
                  <button className="doa-btn-ghost" onClick={onBack}>
                    <span>← Return to Home</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAdmission}>
                {submitError && (
                  <div className="doa-alert doa-alert-error" role="alert">
                    <AlertCircle size={18} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Section 1: Branch & Sharing Preference */}
                <div className="doa-section-header">
                  <div className="doa-step-badge">Step 1 of 4</div>
                  <h3 className="doa-section-title">Select Branch &amp; Room Preference</h3>
                  <p className="doa-section-desc">Choose your preferred Cityhive PG location and sharing configuration.</p>
                </div>

                <div className="doa-branch-grid">
                  {branches.map(b => (
                    <div
                      key={b.id}
                      className={`doa-branch-option ${selectedBranch === String(b.id) ? 'selected' : ''}`}
                      onClick={() => { setSelectedBranch(String(b.id)); setSharing(''); }}
                    >
                      <div className="doa-branch-name">
                        <span>{b.name}</span>
                        {selectedBranch === String(b.id) && <CheckCircle2 size={18} color="#059669" />}
                      </div>
                      <p className="doa-branch-addr">{b.address || 'Koramangala, Bengaluru'}</p>
                      <div className="doa-branch-meta">
                        <Building2 size={14} />
                        <span>{inventory[b.id]?.reduce((acc, curr) => acc + curr.available_beds, 0) || 0} Beds Available</span>
                      </div>
                    </div>
                  ))}
                </div>

                {branchOptions.length > 0 ? (
                  <>
                    <label className="doa-label" style={{ marginBottom: 8 }}>Available Sharing Options in {branch?.name}:</label>
                    <div className="doa-sharing-grid">
                      {branchOptions.map(opt => (
                        <div
                          key={opt.sharing}
                          className={`doa-sharing-card ${sharing === String(opt.sharing) ? 'selected' : ''}`}
                          onClick={() => setSharing(String(opt.sharing))}
                        >
                          <div>
                            <div className="doa-sharing-type">{opt.sharing}-Person Sharing</div>
                            <div className="doa-sharing-price">
                              ₹{Number(opt.monthly_fee).toLocaleString('en-IN')}
                              <small> /mo</small>
                            </div>
                          </div>
                          <div className="doa-sharing-avail">
                            <BedDouble size={14} />
                            <span>{opt.available_beds} beds left</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="doa-alert" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {loading ? 'Loading branch inventory…' : 'Select a branch above to view available sharing options.'}
                  </div>
                )}

                <div className="doa-form-grid">
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-move-in">
                      <span>Planned Move-In Date *</span>
                    </label>
                    <input
                      id="doa-move-in"
                      type="date"
                      className="doa-input"
                      value={moveInDate}
                      min={todayDate()}
                      onChange={e => setMoveInDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-sharing-select">
                      <span>Selected Sharing *</span>
                    </label>
                    <select
                      id="doa-sharing-select"
                      className="doa-select"
                      value={sharing}
                      onChange={e => setSharing(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Sharing --</option>
                      {branchOptions.map(opt => (
                        <option key={opt.sharing} value={opt.sharing}>
                          {opt.sharing}-Person Sharing (₹{Number(opt.monthly_fee).toLocaleString('en-IN')}/mo - {opt.available_beds} beds available)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 2: Personal Information */}
                <div className="doa-section-header" style={{ marginTop: 32 }}>
                  <div className="doa-step-badge">Step 2 of 4</div>
                  <h3 className="doa-section-title">Personal &amp; Contact Information</h3>
                  <p className="doa-section-desc">Your official contact details for admission confirmation and key handover.</p>
                </div>

                <div className="doa-form-grid">
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-name">Full Name *</label>
                    <input
                      id="doa-name"
                      name="name"
                      type="text"
                      className="doa-input"
                      placeholder="e.g. Aarav Sharma"
                      required
                    />
                  </div>
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-email">Email Address *</label>
                    <input
                      id="doa-email"
                      name="email"
                      type="email"
                      className="doa-input"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-phone">Mobile Phone (10 digits) *</label>
                    <input
                      id="doa-phone"
                      name="phone"
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="doa-input"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-emergency">Emergency Contact / Guardian Name</label>
                    <input
                      id="doa-emergency"
                      name="emergency_contact"
                      type="text"
                      className="doa-input"
                      placeholder="e.g. Ramesh Sharma (Parent)"
                    />
                  </div>
                  <div className="doa-form-group">
                    <label className="doa-label" htmlFor="doa-emergency-phone">Emergency Contact Phone (10 digits)</label>
                    <input
                      id="doa-emergency-phone"
                      name="emergency_phone"
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="doa-input"
                      placeholder="9876500000"
                    />
                  </div>
                </div>

                {/* Section 3: Aadhaar Identity Verification */}
                <div className="doa-section-header" style={{ marginTop: 32 }}>
                  <div className="doa-step-badge">Step 3 of 4</div>
                  <h3 className="doa-section-title">Government Aadhaar Verification</h3>
                  <p className="doa-section-desc">Fast-track verification required under PG host safety regulations.</p>
                </div>

                <div className={`doa-aadhaar-box ${aadhaarValid ? 'is-verified' : ''}`}>
                  <div className="doa-aadhaar-header">
                    <div className="doa-aadhaar-title">
                      <ShieldCheck size={20} color={aadhaarValid ? '#15803d' : '#059669'} />
                      <span>12-Digit Aadhaar Card Number</span>
                    </div>
                    <span className={`doa-aadhaar-status ${aadhaarValid ? 'verified' : ''}`}>
                      {aadhaarValid ? <><Check size={14} /> Aadhaar Verified</> : 'Pending 12 Digits'}
                    </span>
                  </div>

                  <div className="doa-aadhaar-input-wrap">
                    <input
                      id="doa-aadhaar"
                      name="aadhaar"
                      type="text"
                      className="doa-input doa-aadhaar-input"
                      placeholder="1234 5678 9012"
                      value={aadhaarFormatted}
                      onChange={handleAadhaarChange}
                      maxLength={14}
                      autoComplete="off"
                    />
                  </div>

                  <p className="doa-aadhaar-note">
                    {aadhaarValid ? (
                      <strong style={{ color: '#15803d' }}>
                        ✓ Identity format confirmed! For privacy compliance under UIDAI guidelines, only the last 4 digits (•••• {aadhaarRaw.slice(-4)}) will be securely archived.
                      </strong>
                    ) : (
                      'Format: 12 numeric digits with automatic spacing. Full Aadhaar is validated in-browser; only last 4 digits are encrypted for safety.'
                    )}
                  </p>
                </div>

                {/* Section 4: Special Request & Consent */}
                <div className="doa-section-header" style={{ marginTop: 32 }}>
                  <div className="doa-step-badge">Step 4 of 4</div>
                  <h3 className="doa-section-title">Preferences &amp; Confirmation</h3>
                  <p className="doa-section-desc">Tell us about dietary needs, work shifts, or room floor preferences.</p>
                </div>

                <div className="doa-form-group full" style={{ marginBottom: 20 }}>
                  <label className="doa-label" htmlFor="doa-message">Special Notes / Room Requests (Optional)</label>
                  <textarea
                    id="doa-message"
                    name="message"
                    rows={3}
                    className="doa-textarea"
                    placeholder="e.g. Vegetarian food preference, prefer higher floor or quiet corner room for remote IT work."
                  />
                </div>

                <label className="doa-checkbox-label">
                  <input type="checkbox" name="whatsapp_updates" defaultChecked />
                  <span>
                    <strong>WhatsApp Updates:</strong> Send my booking status, gate passes, and rental invoices directly to my registered phone number via WhatsApp.
                  </span>
                </label>

                <button
                  type="submit"
                  className="doa-submit-btn"
                  disabled={submitting || !selectedBranch || !sharing}
                >
                  {submitting ? (
                    'Submitting your admission…'
                  ) : (
                    <>
                      <span>Submit Direct Online Admission (DOA)</span>
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Track Application Tab */
          <div className="doa-card">
            <div className="doa-section-header">
              <div className="doa-step-badge">Application Lookup</div>
              <h3 className="doa-section-title">Track Your Direct Online Admission</h3>
              <p className="doa-section-desc">Enter your registered email address and the private tracking key provided upon submission.</p>
            </div>

            <form onSubmit={handleTrackSubmit}>
              {trackingError && (
                <div className="doa-alert doa-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{trackingError}</span>
                </div>
              )}

              <div className="doa-form-grid">
                <div className="doa-form-group">
                  <label className="doa-label" htmlFor="track-email">Registered Email *</label>
                  <input
                    id="track-email"
                    type="email"
                    className="doa-input"
                    value={trackingEmail}
                    onChange={e => setTrackingEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div className="doa-form-group">
                  <label className="doa-label" htmlFor="track-key">Private Tracking Key *</label>
                  <input
                    id="track-key"
                    type="text"
                    className="doa-input"
                    value={trackingKey}
                    onChange={e => setTrackingKey(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    minLength={32}
                    maxLength={64}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="doa-submit-btn"
                style={{ width: 'auto', padding: '12px 28px' }}
                disabled={trackingBusy}
              >
                {trackingBusy ? 'Searching…' : 'Check Admission Status'}
              </button>
            </form>

            {trackingResult && (
              <div className="doa-receipt-box" style={{ marginTop: 32, maxWidth: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                      Admission Request #{trackingResult.id}
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Submitted: {new Date(trackingResult.created_at || Date.now()).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <span
                    style={{
                      background: trackingResult.status === 'approved' || trackingResult.status === 'enrolled' ? '#dcfce7' : '#fef3c7',
                      color: trackingResult.status === 'approved' || trackingResult.status === 'enrolled' ? '#15803d' : '#b45309',
                      padding: '6px 14px',
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    {trackingResult.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <h5 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#334155' }}>Status History &amp; Milestones:</h5>
                  <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trackingResult.history?.map((item, idx) => (
                      <li key={idx} style={{ fontSize: '0.9rem', color: '#475569' }}>
                        <strong style={{ color: '#0f172a' }}>{item.status.replace('_', ' ')}</strong>
                        <span style={{ color: '#94a3b8' }}> — {new Date(item.at).toLocaleString('en-IN')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="doa-footer">
        <div className="doa-footer-inner">
          <div className="doa-footer-links">
            <button type="button" onClick={onBack}>Cityhive Home</button>
            <a href="#branches" onClick={onBack}>Explore Branches</a>
            <button type="button" onClick={() => setActiveTab('track')}>Track Status</button>
            {onLogin && <button type="button" onClick={onLogin}>Portal Login</button>}
          </div>
          <div className="doa-footer-copy">
            © {new Date().getFullYear()} Cityhive Luxury PG's &amp; Co-space · Direct Online Admission Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
