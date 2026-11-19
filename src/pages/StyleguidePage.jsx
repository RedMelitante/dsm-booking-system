// Ported from the design handoff board canvas-source/Tokens.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';

class StyleguidePageLogic extends DCLogic {
  renderVals() {
    var accent = this.props.accent ?? '#5B4BDB';
    var h = String(accent).replace('#', '');
    var n = parseInt(h, 16);
    var rgb = h.length === 6 && !isNaN(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [91, 75, 219];
    var m = function (v) {
      return Math.round(255 + (v - 255) * 0.09);
    };
    return { accent: accent, soft: 'rgb(' + m(rgb[0]) + ', ' + m(rgb[1]) + ', ' + m(rgb[2]) + ')' };
  }
}

export default class StyleguidePage extends StyleguidePageLogic {
  render() {
    const v = this.renderVals();
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          minHeight: '100vh',
          margin: '0 auto',
          boxSizing: 'border-box',
          padding: '44px 48px',
          background: '#FFFFFF',
          color: '#0F1115',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px',
          lineHeight: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1
              style={{
                margin: '0',
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: '30px',
                lineHeight: '36px',
                fontWeight: '800',
                letterSpacing: '-0.02em',
              }}
            >
              {'Design tokens & components'}
            </h1>
            <p style={{ margin: '0', fontSize: '14px', color: '#5B616E' }}>
              Neutral app shell, one accent per business. Mobile-first, 4 px spacing grid, 44 px minimum touch targets.
            </p>
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: '12px',
              color: '#4A505C',
              background: '#F1F1F4',
              borderRadius: '8px',
              padding: '6px 10px',
            }}
          >
            tokens v0.1
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '48px',
            flex: '1 1 auto',
            minHeight: '0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minWidth: '0' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2
                style={{
                  margin: '0',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Colour
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px 10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#0F1115' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Ink · #0F1115</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Text, primary button</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#4A505C' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Body · #4A505C</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Descriptions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#5B616E' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Muted · #5B616E</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Meta, captions (6:1)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#D9DBE1' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Border · #D9DBE1</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Inputs, slots</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#E6E7EB' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Line · #E6E7EB</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Card borders</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: '#F1F1F4' }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Subtle · #F1F1F4</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Chips, active nav</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#F7F7F8',
                      border: '1px solid #E6E7EB',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Canvas · #F7F7F8</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Page background</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Surface · #FFFFFF</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Cards, embed bg</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ height: '44px', borderRadius: '10px', background: v.accent }} />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>
                    {'Accent · '}
                    {v.accent}
                  </span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>
                    Per business: selection
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: v.soft,
                      border: `1px solid ${v.accent}`,
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Accent soft · 9%</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Selected card fill</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#E7F6EE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#0B6B45',
                    }}
                  >
                    #0B6B45
                  </span>
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Success</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Confirmed, next slot</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#FEF3E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#8A4A06',
                    }}
                  >
                    #8A4A06
                  </span>
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Warning</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Pending approval</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#FDECEA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#A12A20',
                    }}
                  >
                    #A12A20
                  </span>
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Danger</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Cancel, no-show</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      height: '44px',
                      borderRadius: '10px',
                      background: '#FEF6E7',
                      border: '1px solid #F6E2B8',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#2B2F36',
                    }}
                  >
                    Notice
                  </span>
                  <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '700' }}>Info · #FEF6E7</span>
                  <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>Time zone notes</span>
                </div>
              </div>
            </section>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2
                style={{
                  margin: '0',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Type · Plus Jakarta Sans + Inter
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #E6E7EB',
                  borderRadius: '14px',
                  padding: '4px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    Display 28/34 · 800
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: '28px',
                      lineHeight: '34px',
                      fontWeight: '800',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    You're booked
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    H1 26/32 · 800
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: '26px',
                      lineHeight: '32px',
                      fontWeight: '800',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    Select a service
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    H2 20/26 · 800
                  </span>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: '20px',
                      lineHeight: '26px',
                      fontWeight: '800',
                    }}
                  >
                    Lumen Skin Studio
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    Title 15/20 · 700
                  </span>
                  <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>Thursday, 19 November</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    Body 15/22 · 400
                  </span>
                  <span style={{ fontSize: '15px', lineHeight: '22px', color: '#4A505C' }}>
                    Deep cleanse, gentle exfoliation and a hydrating mask.
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    Small 13/18 · 500
                  </span>
                  <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '500', color: '#5B616E' }}>
                    60 min · Next: Today, 2:00 PM
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', padding: '10px 0' }}>
                  <span
                    style={{
                      width: '120px',
                      flex: '0 0 auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#5B616E',
                    }}
                  >
                    Label 12/16 · 700
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      lineHeight: '16px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#5B616E',
                    }}
                  >
                    Morning · Step 2 of 4
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                Inputs are 16 px on mobile so iOS does not zoom. Prices and times use tabular figures.
              </span>
            </section>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minWidth: '0' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2
                style={{
                  margin: '0',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Spacing, radius, elevation
              </h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '4px', height: '4px', background: v.accent, borderRadius: '1px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>4</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: v.accent, borderRadius: '2px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>8</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '12px', height: '12px', background: v.accent, borderRadius: '2px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>12</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '16px', height: '16px', background: v.accent, borderRadius: '3px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>16</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '20px', height: '20px', background: v.accent, borderRadius: '3px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>20</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '24px', height: '24px', background: v.accent, borderRadius: '4px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>24</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '32px', height: '32px', background: v.accent, borderRadius: '4px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>32</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '48px', height: '48px', background: v.accent, borderRadius: '6px' }} />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>48</span>
                </div>
                <span style={{ width: '1px', height: '48px', background: '#E6E7EB', margin: '0 6px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      border: '2px solid #0F1115',
                      borderRadius: '10px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>r10</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      border: '2px solid #0F1115',
                      borderRadius: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>r14</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      border: '2px solid #0F1115',
                      borderRadius: '16px',
                      boxSizing: 'border-box',
                      boxShadow: '0 1px 2px rgba(16,17,21,0.04), 0 8px 24px rgba(16,17,21,0.10)',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>r16 + lift</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '64px',
                      height: '44px',
                      border: '2px solid #0F1115',
                      borderRadius: '999px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#5B616E' }}>pill</span>
                </div>
              </div>
              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                Inputs and buttons r10 · time slots r10 · day cells r12 · service cards r14 · panels r16 · chips and
                status pills full round. Shadow only on the floating summary, popovers and drawer.
              </span>
            </section>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2
                style={{
                  margin: '0',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                {'Components & states'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    height: '48px',
                    padding: '0 22px',
                    borderRadius: '12px',
                    border: '0',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    fontWeight: '700',
                  }}
                >
                  Continue
                </button>
                <button
                  type="button"
                  disabled={true}
                  style={{
                    height: '48px',
                    padding: '0 22px',
                    borderRadius: '12px',
                    border: '0',
                    background: '#E6E7EB',
                    color: '#6B7280',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    fontWeight: '700',
                  }}
                >
                  Continue
                </button>
                <button
                  type="button"
                  style={{
                    height: '48px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Add to Google Calendar
                </button>
                <button
                  type="button"
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '0',
                    background: 'transparent',
                    color: '#A12A20',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Cancel booking
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  aria-pressed="true"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '999px',
                    border: '1px solid #0F1115',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  aria-pressed="false"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '999px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Facials
                </button>
                <span style={{ width: '1px', height: '28px', background: '#E6E7EB', margin: '0 4px' }} />
                <button
                  type="button"
                  style={{
                    height: '44px',
                    width: '96px',
                    borderRadius: '10px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  9:30 AM
                </button>
                <button
                  type="button"
                  aria-pressed="true"
                  style={{
                    height: '44px',
                    width: '96px',
                    borderRadius: '10px',
                    border: `1px solid ${v.accent}`,
                    background: v.accent,
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  10:00 AM
                </button>
                <button
                  type="button"
                  style={{
                    height: '44px',
                    width: '96px',
                    borderRadius: '10px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '14px',
                  }}
                >
                  1:00 AM
                  <span style={{ fontSize: '10px', lineHeight: '12px' }}>next day</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: '#0F1115',
                      fontFamily: 'inherit',
                      fontWeight: '600',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      padding: '0',
                    }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: '16px' }}>18</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '999px', background: v.accent }} />
                  </button>
                  <button
                    type="button"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid #D9DBE1',
                      background: 'transparent',
                      color: '#0F1115',
                      fontFamily: 'inherit',
                      fontWeight: '600',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      padding: '0',
                    }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: '16px' }}>19</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '999px', background: v.accent }} />
                  </button>
                  <button
                    type="button"
                    aria-pressed="true"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid transparent',
                      background: v.accent,
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontWeight: '700',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      padding: '0',
                    }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: '16px' }}>20</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '999px', background: '#FFFFFF' }} />
                  </button>
                  <button
                    type="button"
                    disabled={true}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: '#A9AEB8',
                      fontFamily: 'inherit',
                      fontWeight: '400',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      padding: '0',
                    }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: '16px' }}>21</span>
                    <span style={{ width: '4px', height: '4px' }} />
                  </button>
                </div>
                <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E', maxWidth: '200px' }}>
                  Day cells: available (dot), today (ring), selected, unavailable. Taken time slots are hidden, never
                  shown greyed.
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#E7F6EE',
                    color: '#0B6B45',
                  }}
                >
                  Confirmed
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#FEF3E2',
                    color: '#8A4A06',
                  }}
                >
                  Pending
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#EEEFF2',
                    color: '#3F4450',
                  }}
                >
                  Completed
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#FDECEA',
                    color: '#A12A20',
                  }}
                >
                  Cancelled
                </span>
                <span style={{ width: '1px', height: '24px', background: '#E6E7EB', margin: '0 4px' }} />
                <button
                  type="button"
                  role="switch"
                  aria-checked="true"
                  aria-label="Switch on"
                  style={{
                    width: '44px',
                    height: '26px',
                    borderRadius: '999px',
                    border: '0',
                    padding: '3px',
                    background: '#5B4BDB',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '999px',
                      background: '#FFFFFF',
                      transform: 'translateX(18px)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked="false"
                  aria-label="Switch off"
                  style={{
                    width: '44px',
                    height: '26px',
                    borderRadius: '999px',
                    border: '0',
                    padding: '3px',
                    background: '#8C929C',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ width: '20px', height: '20px', borderRadius: '999px', background: '#FFFFFF' }} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                    lineHeight: '18px',
                    fontWeight: '600',
                    color: '#2B2F36',
                  }}
                >
                  <span>
                    {'Email '}
                    <span style={{ color: '#C2362B' }}>*</span>
                  </span>
                  <input
                    type="email"
                    value="maria@example.com"
                    readOnly
                    style={{
                      height: '48px',
                      border: '1px solid #D9DBE1',
                      borderRadius: '10px',
                      padding: '0 14px',
                      fontFamily: 'inherit',
                      fontSize: '16px',
                      color: '#0F1115',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      width: '100%',
                    }}
                  />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}>
                    {'First visit? '}
                    <span style={{ color: '#C2362B' }}>*</span>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      aria-pressed="true"
                      style={{
                        height: '48px',
                        padding: '0 18px',
                        borderRadius: '999px',
                        border: `1px solid ${v.accent}`,
                        boxShadow: `0 0 0 1px ${v.accent}`,
                        background: v.soft,
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      aria-pressed="false"
                      style={{
                        height: '48px',
                        padding: '0 18px',
                        borderRadius: '999px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  border: `1px solid ${v.accent}`,
                  boxShadow: `0 0 0 1px ${v.accent}`,
                  background: v.soft,
                  borderRadius: '14px',
                  padding: '14px 16px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>Hydrating signature facial</span>
                  <span style={{ fontSize: '13px', color: '#5B616E' }}>60 min</span>
                </span>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>₱2,800</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '999px',
                    background: v.accent,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }
}
