import React, {useEffect, useRef, useState} from 'react';
import {
 ArrowRight, ArrowUpRight, BedDouble, Building2, Check, ChevronRight,
 MapPin, Menu, Phone, Mail, X, Wifi, Utensils, ShieldCheck, Zap,
 Sparkles, Clock, HeartHandshake, Bell, Lock, Coffee, CheckCircle2
} from 'lucide-react';
import {apiJson} from './api';
import './public.css';
import {AdmissionTracking, Skeleton} from './GapFeatures';

const brand = "Cityhive Luxury PG's and Co-space";
const today = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Kolkata'});

const faq = [
 ['Does an enquiry reserve a room?', 'An enquiry starts a conversation with branch management. Admission is confirmed separately after in-person or virtual verification and room allocation.'],
 ['How are room charges and advances handled?', 'Room fees, advance deposit and seasonal discounts are provided directly by the branch team based on your preferred sharing and AC preference. Send an enquiry to receive the current schedule.'],
 ['How current is the availability?', 'Available beds are calculated in real-time from the branch inventory. Availability is updated live as admissions and room allocations occur.'],
 ['Can I extend my stay or change rooms?', 'Yes. Residents can request an extension, room shift or planned vacating anytime through the management team under the branch’s published policy.'],
 ['What amenities are included in each branch?', 'All branches include high-speed Wi-Fi, daily housekeeping, 3-time freshly prepared meals, 24/7 CCTV security, biometric access, and power backup.'],
];

const galleryPhotos = [
 {
  id: 1,
  cat: 'bedrooms',
  tag: 'Double Sharing Suite',
  title: 'Premium Double Sharing Room',
  desc: 'Ergonomic study desks, orthopedic mattresses & personal wardrobes',
  url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&q=80',
  large: true
 },
 {
  id: 2,
  cat: 'bedrooms',
  tag: 'Private Suite',
  title: 'Single Occupancy Room',
  desc: 'Quiet private sanctuary with AC and dedicated workspace',
  url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
  large: false
 },
 {
  id: 3,
  cat: 'lounge',
  tag: 'Community Space',
  title: 'Resident Lounge & Entertainment',
  desc: 'Comfortable seating to unwind, socialise, and relax after work',
  url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  large: false
 },
 {
  id: 4,
  cat: 'coworking',
  tag: 'Co-Space & Study',
  title: 'High-Speed Co-Working Zone',
  desc: 'Ergonomic chairs, power sockets at every desk & 300 Mbps Wi-Fi',
  url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
  large: false
 },
 {
  id: 5,
  cat: 'dining',
  tag: 'Pantry & Dining',
  title: 'Hygienic Dining Area',
  desc: 'Clean dining hall serving three freshly prepared, nutritious meals daily',
  url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
  large: false
 },
 {
  id: 6,
  cat: 'washrooms',
  tag: 'Sanitized Facilities',
  title: 'Modern & Clean Washrooms',
  desc: 'Daily sanitized bathrooms with 24/7 hot water supply',
  url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
  large: false
 }
];

const highlights = [
 {icon: Wifi, title: 'High-Speed Wi-Fi', desc: 'Seamless dual-band fiber internet with backup lines for remote work and study.'},
 {icon: Utensils, title: 'Homely Fresh Meals', desc: 'Hygiene-certified breakfast, lunch and dinner prepared fresh daily.'},
 {icon: ShieldCheck, title: '24/7 Security & CCTV', desc: 'Biometric gate entry, round-the-clock wardens and monitored premises.'},
 {icon: Zap, title: '100% Power Backup', desc: 'Full generator support ensuring your work and sleep remain uninterrupted.'},
 {icon: Sparkles, title: 'Daily Housekeeping', desc: 'Regular room cleaning, linen replacement and spotless communal spaces.'},
 {icon: Coffee, title: 'Co-Living & Lounge', desc: 'Dedicated breakout rooms, gaming lounges and collaborative work tables.'}
];

const stayImprovements = [
 {
  icon: ShieldCheck,
  title: 'Keep Profile Updated',
  copy: 'Ensure your phone number, institution/workplace, and emergency contacts are current so staff can assist immediately.'
 },
 {
  icon: Clock,
  title: 'Prompt Dues Clearance',
  copy: 'Invoices generate on the 1st of each month. Timely payments guarantee uninterrupted services and maintain a spotless record.'
 },
 {
  icon: Zap,
  title: 'Report Concerns Early',
  copy: 'Notice any plumbing, electrical or Wi-Fi issue? Raise it immediately to ensure quick resolution by maintenance staff.'
 },
 {
  icon: HeartHandshake,
  title: 'Notice for Stay Changes',
  copy: 'Planning a room shift, extension or vacating? Give advance notice as per branch policy to avoid unexpected fees.'
 },
 {
  icon: Sparkles,
  title: 'Respect Shared Spaces',
  copy: 'Keep dining, pantry and washroom spaces tidy. Observing quiet hours in study areas helps everyone thrive together.'
 },
 {
  icon: Bell,
  title: 'Stay Connected via WhatsApp',
  copy: 'Keep notification preferences enabled to receive timely alerts on maintenance schedules, community dinners and fee receipts.'
 }
];

function Brand() {
 return (
  <a className="ch-brand" href="#home">
   <img src="/cityhive-mark.png?v=3" alt="Cityhive emblem" width="50" height="50" />
   <span>
    {brand}
    <small>LUXURY PG &amp; CO-SPACE</small>
   </span>
  </a>
 );
}

function Photo({branch, hero = false}) {
 const [failed, setFailed] = useState(false);
 useEffect(() => setFailed(false), [branch?.image_url]);
 const actual = branch?.image_url && !failed;
 return (
  <figure className={hero ? 'ch-photo ch-hero-photo' : 'ch-photo'}>
   <img
    src={actual ? branch.image_url : '/representative-room.jpg'}
    onError={() => setFailed(true)}
    alt={actual ? `${branch.name} property photograph` : 'Cityhive luxury shared accommodation'}
    loading={hero ? 'eager' : 'lazy'}
    fetchPriority={hero ? 'high' : 'auto'}
   />
   <figcaption>{actual ? branch.name : 'Representative accommodation scene · actual rooms vary'}</figcaption>
  </figure>
 );
}

function Empty({children}) {
 return <div className="ch-empty"><Building2 size={30} />{children}</div>;
}

function Heading({eyebrow, title, children}) {
 return (
  <div className="ch-heading">
   <div>
    <span className="ch-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
   </div>
   {children && <p>{children}</p>}
  </div>
 );
}

export default function PublicSite({onLogin}) {
 const [branches, setBranches] = useState([]);
 const [inventory, setInventory] = useState({});
 const [selected, setSelected] = useState('');
 const [loading, setLoading] = useState(true);
 const [loadError, setLoadError] = useState('');
 const [retry, setRetry] = useState(0);
 const [menu, setMenu] = useState(false);
 const [shareFilter, setShareFilter] = useState('');
 const [sharing, setSharing] = useState('');
 const [receipt, setReceipt] = useState(null);
 const [sending, setSending] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [galleryTab, setGalleryTab] = useState('all');

 const sendingRef = useRef(false);
 const key = useRef(crypto.randomUUID());

 useEffect(() => {
  let active = true;
  const controller = new AbortController();
  setLoading(true);
  setLoadError('');

  (async () => {
   try {
    const rows = await apiJson('/branches', {signal: controller.signal});
    if (!Array.isArray(rows)) throw new Error('Location information is temporarily unavailable.');
    const pairs = await Promise.all(
     rows.map(async b => {
      try {
       return [b.id, await apiJson(`/public/branches/${b.id}/availability`, {signal: controller.signal})];
      } catch {
       return [b.id, null];
      }
     })
    );
    if (active) {
     setBranches(rows);
     setInventory(Object.fromEntries(pairs));
     const fromHash = location.hash.match(/^#branch-(\d+)$/)?.[1];
     setSelected(String(rows.find(b => String(b.id) === fromHash)?.id || rows[0]?.id || ''));
    }
   } catch (e) {
    if (active) setLoadError(e.message);
   } finally {
    if (active) setLoading(false);
   }
  })();

  return () => {
   active = false;
   controller.abort();
  };
 }, [retry]);

 useEffect(() => {
  function navigate() {
   const id = location.hash.match(/^#branch-(\d+)$/)?.[1];
   if (id && branches.some(b => String(b.id) === id)) setSelected(id);
   requestAnimationFrame(() => document.getElementById(id ? 'branch-detail' : location.hash.slice(1))?.scrollIntoView({behavior: 'smooth'}));
   setMenu(false);
  }
  window.addEventListener('hashchange', navigate);
  if (!loading) navigate();
  return () => window.removeEventListener('hashchange', navigate);
 }, [loading, branches]);

 useEffect(() => {
  if (!menu) return;
  const close = e => {
   if (e.key === 'Escape') setMenu(false);
  };
  document.addEventListener('keydown', close);
  return () => document.removeEventListener('keydown', close);
 }, [menu]);

 const branch = branches.find(b => String(b.id) === selected);
 const options = inventory[selected] || [];
 const filtered = options.filter(o => (!shareFilter || String(o.sharing) === shareFilter));
 const chooseBranch = id => {
  setSelected(String(id));
  setSharing('');
  setShareFilter('');
  setError('');
  setSuccess('');
 };

 const chooseRoom = o => {
  setSharing(String(o.sharing));
  location.hash = 'enquire';
 };

 const available = Object.values(inventory)
  .filter(Boolean)
  .flat()
  .reduce((sum, o) => sum + Number(o.available_beds), 0);

 async function enquire(event) {
  event.preventDefault();
  if (sendingRef.current) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  sendingRef.current = true;
  setSending(true);
  setError('');
  setSuccess('');
  const values = Object.fromEntries(new FormData(form));
  let aadhaarLast4 = null;
  if (values.aadhaar) {
    const clean = values.aadhaar.replace(/\D/g, '');
    if (clean.length === 12 || clean.length === 4) {
      aadhaarLast4 = clean.slice(-4);
    }
  }

  try {
   const result = await apiJson('/admissions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
     ...values,
     branch_id: Number(selected),
     preferred_sharing: Number(sharing),
     submission_key: key.current,
     whatsapp_updates: values.whatsapp_updates === 'on',
     ...(aadhaarLast4 ? {aadhaar_last4: aadhaarLast4} : {})
    })
   });
   setReceipt({key: key.current, email: values.email});
   setSuccess(`Thank you! Enquiry #${result.id} has been recorded for review. Our branch manager will contact you shortly.`);
   key.current = crypto.randomUUID();
   form.reset();
   setSharing('');
  } catch (e) {
   setError(e.message);
  } finally {
   sendingRef.current = false;
   setSending(false);
  }
 }

 const filteredGallery = galleryTab === 'all'
  ? galleryPhotos
  : galleryPhotos.filter(p => p.cat === galleryTab);

 return (
  <div className="ch-site">
   <a className="ch-skip" href="#main-content">Skip to content</a>

   <header className="ch-header">
    <Brand />
    <button
     className="ch-menu"
     onClick={() => setMenu(!menu)}
     aria-expanded={menu}
     aria-controls="public-navigation"
     aria-label={menu ? 'Close menu' : 'Open menu'}
    >
     {menu ? <X /> : <Menu />}
    </button>
    <nav id="public-navigation" className={menu ? 'is-open' : ''} aria-label="Public navigation">
     <a href="#branches">Our branches</a>
     <a href="#rooms">Rooms &amp; Sharing</a>
     <a href="#gallery">Life at Cityhive</a>
     <a href="#amenities">Amenities</a>
     <a href="#improve">How to improve</a>
     <a href="#contact">Contact</a>
     <a href="#track-enquiry">Track enquiry</a>
     <button className="ch-nav-portal-btn" onClick={()=>{setMenu(false);onLogin();}} title="Staff and Resident Workspace Login">
      <Lock size={13} />
      <span>Portal</span>
     </button>
     <a className="ch-nav-cta" href="#enquire" onClick={()=>setMenu(false)}>Check availability <ArrowRight size={15}/></a>
    </nav>
   </header>

   <main id="main-content" className="ch-main">
    {/* HERO SECTION */}
    <section id="home" className="ch-hero">
     <div className="ch-hero-copy">
      <div className="ch-hero-pill"><span className="ch-hero-dot" /> LUXURY PG &amp; CO-LIVING</div>
      <h1>A better place to live, work <em>and belong.</em></h1>
      <p>
       Experience high-end paying guest accommodation designed for professionals and students. Fully furnished rooms,
       nutritious home-style meals, dedicated co-working areas and seamless community living.
      </p>
      <div className="ch-actions">
       <a className="ch-button" href="#rooms">Explore rooms <ArrowRight size={18} /></a>
       <a className="ch-link" href="#gallery">View photo gallery <ArrowUpRight size={18} /></a>
      </div>
      <div className="ch-hero-features">
       <span><CheckCircle2 size={15} /> 300 Mbps Mesh Wi-Fi</span>
       <span><CheckCircle2 size={15} /> Homely Food Included</span>
       <span><CheckCircle2 size={15} /> 24/7 Security &amp; Power Backup</span>
      </div>
     </div>
     <div className="ch-hero-visual-wrap">
      <Photo branch={branches.find(b => b.image_url)} hero />
      <div className="ch-hero-badge">
       <strong>100%</strong>
       <span>Verified Luxury Accommodation</span>
      </div>
     </div>
    </section>

    {/* TRUST / METRICS STRIP */}
    <div className="ch-facts" aria-live="polite">
     <span><MapPin size={20} /><strong>{loading || loadError ? '—' : branches.length}</strong> Premium Locations</span>
     <span><BedDouble size={20} /><strong>{loading || loadError || Object.values(inventory).some(v => v === null) ? '—' : available}</strong> Live Available Beds</span>
     <span><Sparkles size={20} /><strong>Daily</strong> Housekeeping &amp; Care</span>
     <p>Live inventory verified directly with on-site management.</p>
    </div>

    {/* BRANCHES SECTION */}
    <section className="ch-section" id="branches">
     <Heading eyebrow="FIND YOUR NEIGHBOURHOOD" title="Our locations.">
      Thoughtfully situated close to major IT corridors, transit hubs and educational campuses. Choose a branch to inspect facilities and live bed inventory.
     </Heading>
     {loading ? (
      <Skeleton label="Loading locations and availability" />
     ) : loadError ? (
      <div className="ch-empty" role="alert">
       <strong>We couldn’t load the locations.</strong>
       <p>{loadError}</p>
       <button className="ch-button" onClick={() => setRetry(x => x + 1)}>Try again</button>
      </div>
     ) : !branches.length ? (
      <Empty>
       <h3>No locations are listed yet.</h3>
       <p>Published locations and their available rooms will appear here. Please check back for an update.</p>
      </Empty>
     ) : (
      <div className="ch-branches">
       {branches.map(b => {
        const rows = inventory[b.id];
        const beds = (rows || []).reduce((n, o) => n + Number(o.available_beds), 0);
        return (
         <article className="ch-branch" key={b.id}>
          <Photo branch={b} />
          <div className="ch-branch-content">
           <span className="ch-eyebrow">CITYHIVE LOCATION</span>
           <h3>{b.name}</h3>
           <p className="ch-address"><MapPin size={16} />{b.address || 'Central Location'}</p>
           <p>{b.description}</p>
           {b.facilities && (
            <div className="ch-branch-chips">
             {b.facilities.split(/[;,\n]/).slice(0, 4).map((f, i) => (
              <span key={i} className="ch-chip">{f.trim()}</span>
             ))}
            </div>
           )}
           <div className="ch-branch-price">
            <span className="ch-avail-pill">
             <span className="ch-avail-dot" />
             {rows === null ? 'Availability loading…' : `${beds} beds currently available`}
            </span>
            <span className="ch-pricing-pill">Custom plans upon enquiry</span>
           </div>
           <div className="ch-actions">
            <a className="ch-button outline" href={`#branch-${b.id}`} onClick={() => chooseBranch(b.id)}>
             Explore branch <ArrowRight size={16} />
            </a>
            <a className="ch-button" href="#enquire" onClick={() => chooseBranch(b.id)}>
             Enquire now <ChevronRight size={16} />
            </a>
           </div>
          </div>
         </article>
        );
       })}
      </div>
     )}
    </section>

    {/* BRANCH DETAIL ACCORDION */}
    {branch && (
     <section className="ch-section ch-detail" id="branch-detail">
      <div>
       <span className="ch-eyebrow">GET TO KNOW THE LOCATION</span>
       <h2>{branch.name}</h2>
       <p>{branch.description}</p>
       <p className="ch-address"><MapPin size={18} />{branch.address}</p>
       <a className="ch-link" href="#rooms">View sharing options <ArrowRight size={16} /></a>
      </div>
      <div>
       <h3>House rules &amp; policies</h3>
       {branch.rules ? <p className="preline">{branch.rules}</p> : <p>Friendly and respectful community guidelines. Ask branch staff for details.</p>}
       {branch.notice_days !== null && <p className="ch-policy">Notice period: {branch.notice_days} days</p>}
       <a href="#contact" className="ch-link">Speak to the branch manager <ArrowRight size={16} /></a>
      </div>
     </section>
    )}

    {/* ROOMS & SHARING SECTION (NO PRICE) */}
    <section className="ch-section ch-rooms" id="rooms">
     <Heading eyebrow="ROOM TO BE YOURSELF" title="Find your kind of space.">
      Browse our sharing options, from single private rooms to shared four-person suites. Every room comes with AC and Non-AC options. Pricing, deposits and offers are provided upon enquiry.
     </Heading>
     <div className="ch-filters">
      <label>
       Location
       <select value={selected} onChange={e => chooseBranch(e.target.value)} disabled={!branches.length}>
        <option value="" disabled>Select a location</option>
        {branches.map(b => (
         <option key={b.id} value={b.id}>{b.name}</option>
        ))}
       </select>
      </label>
      <label>
       Sharing
       <select value={shareFilter} onChange={e => setShareFilter(e.target.value)}>
        <option value="">All options</option>
        {options.map(o => (
         <option key={o.sharing} value={o.sharing}>{o.sharing}-person sharing</option>
        ))}
       </select>
      </label>
      <label>
       Offers &amp; discounts
       <a className="ch-link" href="#enquire">Ask manager about monthly offers</a>
      </label>
      {shareFilter && <button className="ch-link" onClick={() => setShareFilter('')}>Clear filter</button>}
     </div>

     {loading ? (
      <p role="status">Loading room options…</p>
     ) : !branch ? (
      <Empty><p>Room options will be available when a location is published.</p></Empty>
     ) : inventory[selected] === null ? (
      <Empty>
       <p>Availability is temporarily unavailable for this branch.</p>
       <button className="ch-link" onClick={() => setRetry(x => x + 1)}>Refresh availability</button>
      </Empty>
     ) : !filtered.length ? (
      <Empty>
       <h3>{options.length ? 'No options match these filters.' : 'No beds are currently available here.'}</h3>
       <p>{options.length ? 'Try another sharing preference.' : 'Contact us to ask about upcoming vacancies.'}</p>
      </Empty>
     ) : (
      <div className="ch-room-grid">
       {filtered.map(o => (
        <article className="ch-room" key={o.sharing}>
         <div className="ch-room-heading">
          <BedDouble />
          <span>{o.available_beds} beds available</span>
         </div>
         <h3>{o.sharing}-person sharing</h3>
         <p>{branch.name}</p>
         <p className="ch-room-types">AC &amp; Non-AC configurations available</p>
         <p className="ch-muted">Custom rates, deposit and special offers are shared instantly upon enquiry.</p>
         <button className="ch-button" onClick={() => chooseRoom(o)}>
          Request pricing &amp; offers <ArrowRight size={16} />
         </button>
        </article>
       ))}
      </div>
     )}
    </section>

    {/* LIFE AT CITYHIVE - GALLERY SECTION */}
    <section id="gallery" className="ch-section ch-gallery-section">
     <Heading eyebrow="LIFE AT CITYHIVE" title="A visual walkthrough of our spaces.">
      Step inside our luxury rooms, dedicated study desks, community lounge and modern co-living amenities. Everything is crafted for comfort, focus and community.
     </Heading>

     {/* Category Filter Tabs */}
     <div className="ch-gallery-tabs">
      {[
       ['all', 'All Spaces'],
       ['bedrooms', 'Bedrooms'],
       ['coworking', 'Work & Study'],
       ['lounge', 'Lounge'],
       ['dining', 'Kitchen & Dining'],
       ['washrooms', 'Washrooms']
      ].map(([id, label]) => (
       <button
        key={id}
        className={`ch-tab-btn ${galleryTab === id ? 'is-active' : ''}`}
        onClick={() => setGalleryTab(id)}
       >
        {label}
       </button>
      ))}
     </div>

     {/* Photo Grid */}
     <div className="ch-gallery-grid">
      {filteredGallery.map(photo => (
       <figure
        key={photo.id}
        className={`ch-gallery-item ${photo.large && galleryTab === 'all' ? 'ch-gallery-large' : ''}`}
       >
        <img src={photo.url} alt={photo.title} loading="lazy" />
        <figcaption>
         <span className="ch-gallery-tag">{photo.tag}</span>
         <strong>{photo.title}</strong>
         <small>{photo.desc}</small>
        </figcaption>
       </figure>
      ))}
     </div>
    </section>

    {/* AMENITIES SECTION */}
    <section id="amenities" className="ch-section">
     <Heading eyebrow="THE EVERYDAY DETAILS" title="Signature amenities included with every stay.">
      Enjoy hotel-grade comfort with the warmth and security of home. Designed to make your daily routine effortless.
     </Heading>
     <div className="ch-amenities-grid">
      {highlights.map((h, i) => {
       const Icon = h.icon;
       return (
        <article className="ch-amenity-card" key={i}>
         <div className="ch-amenity-icon"><Icon size={24} /></div>
         <h3>{h.title}</h3>
         <p>{h.desc}</p>
        </article>
       );
      })}
     </div>
    </section>

    {/* HOW TO IMPROVE YOUR STAY */}
    <section className="ch-section ch-improve-section" id="improve">
     <Heading eyebrow="RESIDENT GUIDE" title="How to improve your stay at Cityhive.">
      Helpful tips, etiquette and best practices to ensure your co-living experience is seamless, stress-free and enriching.
     </Heading>
     <div className="ch-improve-grid">
      {stayImprovements.map((item, i) => {
       const Icon = item.icon;
       return (
        <article className="ch-improve-card" key={i}>
         <div className="ch-improve-head">
          <span className="ch-improve-num">0{i + 1}</span>
          <div className="ch-improve-icon"><Icon size={20} /></div>
         </div>
         <h3>{item.title}</h3>
         <p>{item.copy}</p>
        </article>
       );
      })}
     </div>
    </section>

    {/* FAQ SECTION */}
    <section className="ch-section ch-faq" id="faq">
     <Heading eyebrow="FREQUENTLY ASKED" title="Everything you need to know.">
      Clear answers to common questions about admissions, room sharing, facilities, and house policies.
     </Heading>
     <div>
      {(branch?.faqs?.length ? branch.faqs.map(f => [f.question, f.answer]) : faq).map(([q, a]) => (
       <details key={q}>
        <summary>{q}<ChevronRight size={18} /></summary>
        <p>{a}</p>
       </details>
      ))}
     </div>
    </section>

    {/* CONTACT & ENQUIRY SECTION */}
    <section className="ch-section ch-contact" id="contact">
     <aside>
      <span className="ch-eyebrow">LET’S TALK ABOUT YOUR NEXT SPACE</span>
      <h2>A little more information.<br /><em>A better beginning.</em></h2>
      <p>Choose your preferred location and planned move-in date. Our on-site manager will reach out with sharing options and pricing.</p>
      <div className="ch-contact-details">
       {branches.map(b => (
        <article key={b.id}>
         <h3>{b.name}</h3>
         <p><MapPin size={17} />{b.address || 'Address provided on request'}</p>
         {b.contact_phone && (
          <a href={`tel:${b.contact_phone.replace(/[^+\d]/g, '')}`}>
           <Phone size={17} />{b.contact_phone}
          </a>
         )}
         {b.contact_phone && (
          <a
           className="ch-whatsapp-link"
           href={`https://wa.me/${b.contact_phone.replace(/\D/g, '').length === 10 ? '91' : ''}${b.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I would like to enquire about ' + b.name)}`}
           target="_blank"
           rel="noopener noreferrer"
          >
           Chat on WhatsApp
          </a>
         )}
         {b.contact_email && (
          <a href={`mailto:${b.contact_email}`}><Mail size={17} />{b.contact_email}</a>
         )}
        </article>
       ))}
      </div>
      {!branches.length && <p>Contact details will appear here when a location is published.</p>}
     </aside>

     <div className="ch-enquiry" id="enquire">
      <span className="ch-eyebrow">DIRECT ADMISSION ENQUIRY</span>
      <h3>Let’s find your place.</h3>
      <p>Fill out the form below. Submitting does not require payment and does not confirm a booking.</p>
      {loading ? (
       <p role="status">Loading available locations…</p>
      ) : loadError ? (
       <div role="alert">
        <p>Online enquiries are temporarily unavailable.</p>
        <button className="ch-button" onClick={() => setRetry(x => x + 1)}>Try again</button>
       </div>
      ) : !branches.length ? (
       <Empty><p>Enquiries will open when a location is published.</p></Empty>
      ) : (
       <form onSubmit={enquire}>
        <div className="ch-form-grid">
         <label>
          Location
          <select name="branch_id" value={selected} required onChange={e => chooseBranch(e.target.value)}>
           {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
           ))}
          </select>
         </label>
         <label>
          Sharing preference
          <select name="preferred_sharing" value={sharing} onChange={e => setSharing(e.target.value)} required disabled={!options.length}>
           <option value="" disabled>Select sharing</option>
           {options.map(o => (
            <option key={o.sharing} value={o.sharing}>{o.sharing}-person sharing</option>
           ))}
          </select>
         </label>
         <label>
          Full name
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name" />
         </label>
         <label>
          Email address
          <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" />
         </label>
         <label>
          Mobile number
          <input name="phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required autoComplete="tel-national" placeholder="10-digit mobile number" />
         </label>
         <label>
          Aadhaar Number <span>Govt ID Verification</span>
          <input
            name="aadhaar"
            type="text"
            inputMode="numeric"
            placeholder="12-digit Aadhaar (e.g. 5432 1234 5678)"
            maxLength={14}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '').slice(0, 12);
              const parts = v.match(/.{1,4}/g);
              e.target.value = parts ? parts.join(' ') : v;
            }}
          />
         </label>
         <label>
          Planned move-in
          <input name="move_in_date" type="date" required min={today()} defaultValue={today()} />
         </label>
        </div>
        <label>
         Anything you’d like us to know? <span>Optional</span>
         <textarea name="message" rows={3} maxLength={2000} placeholder="Any specific requirements (e.g. AC preference, study desk, food preferences)?" />
        </label>
        <p className="ch-privacy">
         Your contact and Aadhaar details are strictly encrypted for PG verification and local police/management compliance.
        </p>
        {error && <p className="alert error" role="alert">{error}</p>}
        {success && <p className="alert success" role="status">{success}</p>}
        <label className="ch-consent">
         <input type="checkbox" name="whatsapp_updates" defaultChecked />
         Send me WhatsApp updates &amp; pricing offers for this enquiry.
        </label>
        <button className="ch-button" disabled={sending || !options.length}>
         {sending ? 'Sending enquiry…' : 'Send admission enquiry'}
         <ArrowRight size={18} />
        </button>
        {!options.length && (
         <p className="ch-muted">There are no available sharing options at this location right now. Please choose another branch.</p>
        )}
       </form>
      )}
     </div>
    </section>
   </main>

   <section className="ch-section"><AdmissionTracking receipt={receipt} /></section>

   <footer className="ch-footer">
    <div>
     <Brand />
     <p>Thoughtful co-living &amp; paying guest accommodation for modern urban life.</p>
    </div>
    <nav aria-label="Footer">
     <a href="#branches">Our branches</a>
     <a href="#rooms">Rooms &amp; sharing</a>
     <a href="#gallery">Life at Cityhive</a>
     <a href="#amenities">Amenities</a>
     <a href="#improve">How to improve</a>
     <a href="#faq">FAQs</a>
     <a href="#contact">Contact &amp; enquiries</a>
    </nav>
    <div className="ch-footer-portal">
     <span>Staff &amp; Resident Access</span>
     <button className="ch-workspace-btn" onClick={onLogin}>
      <Lock size={13} /> Open Workspace Login
     </button>
    </div>
    <small>© {new Date().getFullYear()} {brand}. All rights reserved.</small>
   </footer>
  </div>
 );
}
