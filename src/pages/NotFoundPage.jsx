import React from 'react';

// Not in the handoff boards: built from the auth-page shell (logo header,
// centred card, small footer) so unknown slugs land somewhere on-brand.
export default function NotFoundPage({ path }) {
  const slug = String(path || '').replace(/^\/+|\/+$/g, '');
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F7F7F8',
        color: '#0F1115',
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: '15px',
        lineHeight: '22px',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', padding: '24px 32px 0', boxSizing: 'border-box' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0F1115' }}>
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: '#0F1115',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
              <path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
            </svg>
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", fontSize: '17px', fontWeight: '800', whiteSpace: 'nowrap' }}>
            Digital Services Master
          </span>
        </a>
      </header>
      <main style={{ flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: '#FFFFFF',
            border: '1px solid #E6E7EB',
            borderRadius: '16px',
            padding: '32px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5B616E' }}>
              404
            </span>
            <h1 style={{ margin: '0', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", fontSize: '26px', lineHeight: '32px', fontWeight: '800', letterSpacing: '-0.015em' }}>
              We can't find that page
            </h1>
            <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>
              {slug ? `[domain]/${slug} isn't a booking page or part of the app. Check the link, or start from the homepage.` : 'Check the link, or start from the homepage.'}
            </p>
          </div>
          <a
            href="/"
            style={{ height: '52px', borderRadius: '12px', background: '#0F1115', color: '#FFFFFF', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700' }}
          >
            Go to the homepage
          </a>
          <a
            href="/lumen-skin-studio"
            style={{ height: '48px', borderRadius: '12px', border: '1px solid #D9DBE1', background: '#FFFFFF', color: '#0F1115', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '600' }}
          >
            Try the demo booking page
          </a>
        </div>
      </main>
      <footer style={{ padding: '16px 20px 24px', textAlign: 'center', fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
        © 2026 Digital Services Master
      </footer>
    </div>
  );
}
