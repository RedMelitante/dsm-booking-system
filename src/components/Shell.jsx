import React from 'react';

// The auth-page shell from the design (logo header, centred 440px card, small
// footer), shared by screens the handoff didn't draw: 404, password reset,
// loading and error states.

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const DISPLAY = "'Plus Jakarta Sans', Inter, sans-serif";

export function Logo() {
  return (
    <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0F1115' }}>
      <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#0F1115', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
        </svg>
      </span>
      <span style={{ fontFamily: DISPLAY, fontSize: '17px', fontWeight: '800', whiteSpace: 'nowrap' }}>Digital Services Master</span>
    </a>
  );
}

export function Shell({ children, card = true }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F7F7F8', color: '#0F1115', fontFamily: FONT, fontSize: '15px', lineHeight: '22px', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '24px 32px 0', boxSizing: 'border-box' }}>
        <Logo />
      </header>
      <main style={{ flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
        {card ? (
          <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', border: '1px solid #E6E7EB', borderRadius: '16px', padding: '32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      <footer style={{ padding: '16px 20px 24px', textAlign: 'center', fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>© 2026 Digital Services Master</footer>
    </div>
  );
}

export function Heading({ eyebrow, title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {eyebrow ? <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5B616E' }}>{eyebrow}</span> : null}
      <h1 style={{ margin: '0', fontFamily: DISPLAY, fontSize: '26px', lineHeight: '32px', fontWeight: '800', letterSpacing: '-0.015em' }}>{title}</h1>
      {sub ? <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>{sub}</p> : null}
    </div>
  );
}

export const primaryBtn = { height: '52px', width: '100%', borderRadius: '12px', border: '0', background: '#0F1115', color: '#FFFFFF', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer' };
export const secondaryBtn = { height: '48px', borderRadius: '12px', border: '1px solid #D9DBE1', background: '#FFFFFF', color: '#0F1115', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '15px', fontWeight: '600', cursor: 'pointer' };

export function Field({ id, label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  const bad = !!error;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        aria-invalid={bad} aria-describedby={bad ? id + '-err' : undefined}
        style={{ height: '48px', border: '1px solid ' + (bad ? '#C2362B' : '#D9DBE1'), boxShadow: bad ? '0 0 0 3px rgba(194,54,43,0.12)' : 'none', borderRadius: '10px', padding: '0 14px', fontFamily: 'inherit', fontSize: '16px', color: '#0F1115', background: '#FFFFFF', boxSizing: 'border-box', width: '100%' }}
      />
      {bad ? <ErrorLine id={id + '-err'}>{error}</ErrorLine> : null}
    </div>
  );
}

export function ErrorLine({ id, children }) {
  return (
    <span id={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', lineHeight: '18px', color: '#A12A20' }}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
      {children}
    </span>
  );
}

export function Banner({ tone = 'error', children }) {
  const err = tone === 'error';
  return (
    <div role={err ? 'alert' : 'status'} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: err ? '#FDECEA' : '#E7F6EE', border: '1px solid ' + (err ? '#F5C6C0' : '#BFE5CF'), borderRadius: '12px', padding: '12px 14px', fontSize: '14px', lineHeight: '20px', color: err ? '#7A1F17' : '#0B6B45' }}>
      {children}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div aria-busy="true" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F8', fontFamily: FONT, fontSize: '14px', color: '#5B616E' }}>
      <span role="status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'dsm-spin 0.9s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.56" /></svg>
        Loading…
      </span>
    </div>
  );
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <Shell>
      <Heading title="Something went wrong" sub={message || 'We could not load this page.'} />
      {onRetry ? <button type="button" onClick={onRetry} style={primaryBtn}>Try again</button> : null}
      <a href="/" style={secondaryBtn}>Go to the homepage</a>
    </Shell>
  );
}
