// Ported from the design handoff board canvas-source/Embed.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';
import { ORIGIN } from '../lib/site.js';

class EmbedDemoPageLogic extends DCLogic {
  componentDidMount() {
    // Load the same script client websites use, so the iframe resizes to fit each step.
    if (!document.querySelector('script[data-dsm-embed]')) {
      var el = document.createElement('script');
      el.src = '/embed.js';
      el.async = true;
      el.setAttribute('data-dsm-embed', '');
      document.body.appendChild(el);
    }
  }

  renderVals() {
    return {
      demo: this.props.demo ?? 'Aesthetic clinic',
      accent: this.props.accent ?? '#5B4BDB',
    };
  }
}

export default class EmbedDemoPage extends EmbedDemoPageLogic {
  render() {
    const v = this.renderVals();
    return (
      <div
        style={{
          width: '100%',
          minWidth: '1120px',
          height: 'max(900px, 100vh)',
          boxSizing: 'border-box',
          background: '#F3EFE8',
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: '#2A2622',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '40px',
            flex: '0 0 auto',
            background: '#E4DED4',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
          }}
        >
          <span
            style={{
              flex: '0 1 460px',
              height: '26px',
              borderRadius: '999px',
              background: '#F8F5F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '12px',
              color: '#4A4540',
            }}
          >
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="10.5" width="14" height="10" rx="2" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
            {' yourclinicwebsite.com/book'}
          </span>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px', color: '#5C564F' }}>
            Example host site, not part of the app
          </span>
        </div>
        <header
          style={{
            height: '72px',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 48px',
            borderBottom: '1px solid #E1DACE',
          }}
        >
          <span style={{ fontSize: '22px', fontStyle: 'italic', letterSpacing: '0.01em' }}>Your Clinic Website</span>
          <nav
            aria-label="Host site"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '14px',
            }}
          >
            <a href="#" style={{ textDecoration: 'none' }}>
              Treatments
            </a>
            <a href="#" style={{ textDecoration: 'none' }}>
              About
            </a>
            <a href="#" style={{ textDecoration: 'none' }}>
              Journal
            </a>
            <a
              href="#"
              style={{
                textDecoration: 'none',
                background: '#2A2622',
                color: '#F8F5F0',
                padding: '10px 18px',
                borderRadius: '999px',
              }}
            >
              Book now
            </a>
          </nav>
        </header>
        <div style={{ flex: '1 1 auto', display: 'flex', gap: '48px', padding: '28px 48px 0', minHeight: '0' }}>
          <div
            style={{
              flex: '1 1 auto',
              minWidth: '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              paddingTop: '12px',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6B5F52',
              }}
            >
              Book online
            </span>
            <h1
              style={{ margin: '0', fontSize: '44px', lineHeight: '50px', fontWeight: '400', letterSpacing: '-0.01em' }}
            >
              Reserve your next treatment in under a minute.
            </h1>
            <p
              style={{
                margin: '0',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '15px',
                lineHeight: '24px',
                color: '#4A4540',
                maxWidth: '460px',
              }}
            >
              {
                "This left side is the client's own website. The panel on the right is the booking app running in an iframe with "
              }
              <strong>?embed=true</strong>: no app header, footer or grey page background, a compact stepper, and the
              summary moved into a sticky bottom bar so it works at any width.
            </p>
            <div
              style={{
                background: '#1B1D22',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '500px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#B8BCC6',
                  }}
                >
                  Embed snippet (from Dashboard › Booking page)
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#E6E7EB',
                    border: '1px solid #3A3D45',
                    borderRadius: '8px',
                    padding: '4px 10px',
                  }}
                >
                  Copy
                </span>
              </div>
              <code
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                  fontSize: '12.5px',
                  lineHeight: '20px',
                  color: '#E6E7EB',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {
                  '<iframe src="' + ORIGIN + '/lumen-skin-studio?embed=true"\n  title="Book an appointment" loading="lazy"\n  style="width:100%;min-height:720px;border:0"></iframe>\n<script src="' + ORIGIN + '/embed.js" async></script>'
                }
              </code>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#3A3530',
                maxWidth: '500px',
              }}
            >
              <span style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F6B4F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: '0 0 auto', marginTop: '1px' }}
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                embed.js listens for height messages from the iframe and resizes it, so there is no inner scrollbar on
                the live site.
              </span>
              <span style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F6B4F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: '0 0 auto', marginTop: '1px' }}
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                The widget uses the business's accent colour and logo from the dashboard, nothing from the host page's
                CSS.
              </span>
              <span style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F6B4F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: '0 0 auto', marginTop: '1px' }}
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {'Optional params: &service=, &staff=, &hide_staff=1 to deep-link straight into a step.'}
              </span>
            </div>
          </div>
          <div style={{ flex: '0 0 460px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '0' }}>
            <span
              style={{
                alignSelf: 'flex-start',
                fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                fontSize: '11.5px',
                color: '#4A4540',
                background: '#FFFFFF',
                border: '1px dashed #B9AE9F',
                borderRadius: '6px',
                padding: '3px 8px',
              }}
            >
              iframe · /lumen-skin-studio?embed=true
            </span>
            <div
              style={{
                width: '460px',
                height: '712px',
                overflowY: 'auto',
                overflowX: 'hidden',
                background: '#FFFFFF',
                border: '1px solid #E1DACE',
                borderRadius: '16px 16px 0 0',
                boxShadow: '0 12px 40px rgba(42,38,34,0.12)',
                position: 'relative',
              }}
            >
              {/* The real embed: an iframe of the booking page, resized by /embed.js */}
              <iframe
                src="/lumen-skin-studio?embed=true"
                title="Book an appointment"
                loading="lazy"
                style={{ width: '100%', minHeight: '710px', border: '0', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
