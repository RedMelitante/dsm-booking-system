// Ported from the design handoff board canvas-source/Onboarding.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';
import { HOST, withHost } from '../lib/site.js';
import { api, getMe } from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { RESERVED_SLUGS } from '../lib/reserved.js';
import { browserTimeZone } from '../lib/clock.js';

class SetupPageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = {
      w: 0,
      step: 1,
      name: '',
      slug: '',
      slugEdited: false,
      site: '',
      template: null,
      currency: 'PHP',
      tz: browserTimeZone(
        [
          'Asia/Manila',
          'Asia/Singapore',
          'Australia/Perth',
          'Australia/Brisbane',
          'Australia/Sydney',
          'Pacific/Auckland',
          'America/Los_Angeles',
          'Europe/London',
        ],
        'Asia/Manila',
      ),
      tried1: false,
      tried2: false,
      check: { slug: '', status: '', message: '', suggestions: [] },
      busy: false,
      finishErr: '',
    };
    // Homepage hero passes ?slug= through sign-up.
    var qs = new URLSearchParams(window.location.search);
    if (qs.get('slug')) {
      this.state.slug = this.slugify(qs.get('slug'));
      this.state.slugEdited = true;
    }
    this.rootRef = (el) => {
      this.el = el;
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.slug !== this.state.slug) this.queueCheck();
  }

  // Availability is checked against the database as the owner types (debounced).
  queueCheck() {
    clearTimeout(this.checkTimer);
    var slug = String(this.state.slug || '').replace(/-+$/, '');
    if (slug.length < 3 || RESERVED_SLUGS.indexOf(slug) >= 0) return;
    this.checkTimer = setTimeout(async () => {
      try {
        var r = await api('/slugs/' + encodeURIComponent(slug));
        if (String(this.state.slug || '').replace(/-+$/, '') === slug) this.setState({ check: r });
      } catch (e) {
        if (e.status === 401) navigate('/login?next=/setup', { replace: true });
      }
    }, 300);
  }

  async finish() {
    var s = this.state;
    if (s.busy) return;
    this.setState({ busy: true, finishErr: '' });
    try {
      await api('/businesses', {
        method: 'POST',
        body: {
          name: s.name.trim(),
          slug: String(s.slug).replace(/-+$/, ''),
          website: s.site.trim(),
          template: s.template,
          currency: s.currency,
          timezone: s.tz,
        },
      });
      await getMe(true);
      navigate('/dashboard');
    } catch (e) {
      var errs = (e.data && e.data.errors) || {};
      if (errs.slug || errs.name) {
        this.setState({ busy: false, step: 1, tried1: true, check: e.data.slugStatus || this.state.check });
      } else {
        this.setState({ busy: false, finishErr: e.message });
      }
    }
  }

  async logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      /* ignore */
    }
    await getMe(true).catch(function () {});
    navigate('/');
  }

  componentDidMount() {
    if (this.state.slug) this.queueCheck();
    this.measure();
    try {
      if (typeof ResizeObserver !== 'undefined' && this.el) {
        this.ro = new ResizeObserver(() => this.measure());
        this.ro.observe(this.el);
      }
    } catch (e) {}
  }

  componentWillUnmount() {
    clearTimeout(this.checkTimer);
    try {
      if (this.ro) this.ro.disconnect();
    } catch (e) {}
  }

  measure() {
    if (!this.el) return;
    var w = this.el.offsetWidth || 0;
    if (w && Math.abs(w - (this.state.w || 0)) > 4) this.setState({ w: w });
  }

  slugify(v) {
    return String(v || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 40);
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var p = this.props || {};
    var narrow = !!p.phone || (s.w > 0 && s.w < 600);
    var ACC = '#5B4BDB',
      SOFT = 'rgb(240, 239, 252)',
      LINE = '#E6E7EB';

    // ---- step 1: slug claim
    var slug = String(s.slug || '').replace(/-+$/, '');
    var RESERVED = RESERVED_SLUGS;
    var status = 'empty',
      msg = 'Pick a short web address for your page.';
    if (slug.length > 0 && slug.length < 3) {
      status = 'error';
      msg = 'Use at least 3 characters.';
    } else if (RESERVED.indexOf(slug) >= 0) {
      status = 'error';
      msg = 'That address is reserved. Try another.';
    } else if (slug.length >= 3 && s.check.slug === slug) {
      status = s.check.status;
      msg = withHost(s.check.message);
    } else if (slug.length >= 3) {
      status = 'checking';
      msg = 'Checking ' + HOST + '/' + slug + '…';
    }
    if (status === 'empty' && s.tried1) {
      status = 'error';
      msg = 'Choose an address for your booking page.';
    }
    var suggest =
      status === 'taken'
        ? (s.check.suggestions || []).map(function (x) {
            return {
              label: x,
              pick: function () {
                self.setState({ slug: x, slugEdited: true });
              },
            };
          })
        : [];
    var nameBad = s.tried1 && !String(s.name || '').trim();
    var slugBad = status === 'error' || status === 'taken';
    var words = String(s.name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    var initials = words.length ? (words[0].charAt(0) + (words[1] ? words[1].charAt(0) : '')).toUpperCase() : '?';

    // ---- step 2: templates
    var TPL = [
      {
        id: 'clinic',
        label: 'Clinics & Medical',
        desc: 'Dental, medical, physio and aesthetic clinics',
        noun: 'Dentist / Doctor',
        services: ['Consultation', 'Check-up & cleaning', 'Follow-up visit'],
        qs: 3,
      },
      {
        id: 'salon',
        label: 'Salons & Wellness',
        desc: 'Skin, hair, nails, spa and massage',
        noun: 'Professional',
        services: ['Signature facial', 'Haircut & blow-dry', '60-min massage'],
        qs: 3,
      },
      {
        id: 'events',
        label: 'Events & Rentals',
        desc: 'Photo booths, venues, equipment and party rentals',
        noun: 'Booth / resource',
        services: ['2-hour package', 'Wedding package', 'Extra hour add-on'],
        qs: 3,
      },
    ];
    var templates = TPL.map(function (t) {
      var on = s.template === t.id;
      return {
        label: t.label,
        desc: t.desc,
        services: t.services,
        meta: t.qs + ' intake questions · staff called "' + t.noun + '"',
        on: on,
        isClinic: t.id === 'clinic',
        isSalon: t.id === 'salon',
        isEvents: t.id === 'events',
        bg: on ? SOFT : '#FFFFFF',
        border: on ? ACC : LINE,
        ring: on ? ACC : 'transparent',
        iconBg: on ? ACC : '#F1F1F4',
        iconFg: on ? '#FFFFFF' : '#2B2F36',
        pick: function () {
          self.setState({ template: t.id, tried2: false });
        },
      };
    });
    var chosen =
      TPL.filter(function (t) {
        return t.id === s.template;
      })[0] || null;
    var blankOn = s.template === 'blank';
    var CUR = {
      PHP: 'Philippine peso (₱)',
      AUD: 'Australian dollar ($)',
      USD: 'US dollar ($)',
      SGD: 'Singapore dollar (S$)',
      NZD: 'New Zealand dollar ($)',
      GBP: 'British pound (£)',
    };
    var summary = [
      { k: 'Booking page', v: HOST + '/' + (slug || 'your-business') },
      { k: 'Business', v: String(s.name || '').trim() || 'Your business' },
      {
        k: 'Template',
        v: chosen
          ? chosen.label + ' · ' + chosen.services.length + ' sample services, ' + chosen.qs + ' questions'
          : blankOn
            ? 'Blank, no sample services'
            : 'Not chosen yet',
      },
      { k: 'Prices and hours', v: CUR[s.currency] + ' · ' + s.tz + ' · Mon–Fri 9:00–6:00 to start' },
    ];

    return {
      rootRef: this.rootRef,
      minH: p.minh || (p.phone ? '844px' : '100vh'),
      headPad: narrow ? '16px 16px 0' : '24px 32px',
      brandSize: narrow ? '15px' : '17px',
      prefixSize: narrow ? '13px' : '15px',
      mainPad: narrow ? '16px 16px 28px' : '16px 32px 48px',
      cardPad: narrow ? '22px 18px' : '32px',
      h1Size: narrow ? '22px' : '26px',
      step: s.step,
      stepName: s.step === 1 ? 'Your business' : 'Template & region',
      bar1: s.step >= 2 ? ACC : '#0F1115',
      bar2: s.step >= 2 ? '#0F1115' : LINE,
      isStep1: s.step === 1,
      isStep2: s.step === 2,
      name: s.name,
      setName: function (e) {
        var v = e.target.value;
        var o = { name: v };
        if (!self.state.slugEdited) o.slug = self.slugify(v);
        self.setState(o);
      },
      nameBad: nameBad,
      nameBorder: nameBad ? '#C2362B' : '#D9DBE1',
      nameRing: nameBad ? '0 0 0 3px rgba(194,54,43,0.12)' : 'none',
      slug: s.slug,
      setSlug: function (e) {
        var v = String(e.target.value || '')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-{2,}/g, '-')
          .slice(0, 40);
        self.setState({ slug: v, slugEdited: true });
      },
      slugOk: status === 'ok',
      slugErr: slugBad,
      slugMsg: msg,
      slugMsgColor: status === 'ok' ? '#0B6B45' : slugBad ? '#A12A20' : '#5B616E',
      slugBorder: slugBad ? '#C2362B' : status === 'ok' ? '#0E7A4F' : '#D9DBE1',
      slugRing: slugBad ? '0 0 0 3px rgba(194,54,43,0.12)' : 'none',
      hasSuggest: suggest.length > 0,
      suggest: suggest,
      site: s.site,
      setSite: function (e) {
        self.setState({ site: e.target.value });
      },
      initials: initials,
      previewName: String(s.name || '').trim() || 'Your business name',
      previewSlug: slug || 'your-business',
      next: function () {
        if (String(self.state.name || '').trim() && status === 'ok') self.setState({ step: 2 });
        else self.setState({ tried1: true });
      },
      templates: templates,
      blankOn: blankOn,
      blankLabel: blankOn ? 'Starting from scratch' : 'Start from scratch instead',
      blankBg: blankOn ? SOFT : '#FFFFFF',
      blankBorder: blankOn ? ACC : '#B8BCC6',
      blankStyle: blankOn ? 'solid' : 'dashed',
      pickBlank: function () {
        self.setState({ template: 'blank', tried2: false });
      },
      tplBad: (s.tried2 && !s.template) || !!s.finishErr,
      currency: s.currency,
      setCurrency: function (e) {
        self.setState({ currency: e.target.value });
      },
      tz: s.tz,
      setTz: function (e) {
        self.setState({ tz: e.target.value });
      },
      summary: summary,
      back: function () {
        self.setState({ step: 1 });
      },
      canFinish: false,
      cantFinish: true,
      finishLabel: s.busy ? 'Creating your page…' : 'Create my booking page',
      finishErr: s.finishErr,
      logout: function (e) {
        e.preventDefault();
        self.logout();
      },
      tryFinish: function () {
        if (self.state.template) return self.finish();
        self.setState({ tried2: true });
      },
    };
  }
}

export default class SetupPage extends SetupPageLogic {
  render() {
    const v = this.renderVals();
    return (
      <div
        ref={v.rootRef}
        style={{
          width: '100%',
          minHeight: v.minH,
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
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: v.headPad,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: v.brandSize,
                fontWeight: '800',
                whiteSpace: 'nowrap',
              }}
            >
              Digital Services Master
            </span>
          </span>
          <a href="/" onClick={v.logout} style={{ fontSize: '14px', fontWeight: '600', color: '#4A505C' }}>
            Log out
          </a>
        </header>
        <main
          style={{
            flex: '1 0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: v.mainPad,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                {'Step '}
                {v.step}
                {' of 2 · '}
                {v.stepName}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                <span style={{ height: '4px', borderRadius: '999px', background: v.bar1 }} />
                <span style={{ height: '4px', borderRadius: '999px', background: v.bar2 }} />
              </div>
            </div>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E6E7EB',
                borderRadius: '16px',
                padding: v.cardPad,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
              }}
            >
              {v.isStep1 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h1
                      style={{
                        margin: '0',
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: v.h1Size,
                        lineHeight: '1.25',
                        fontWeight: '800',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      Tell us about your business
                    </h1>
                    <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>
                      This sets up your booking page. You can change all of it later.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="ob-name"
                      style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                    >
                      {'Business name '}
                      <span style={{ color: '#C2362B' }}>*</span>
                    </label>
                    <input
                      id="ob-name"
                      type="text"
                      value={v.name}
                      onChange={v.setName}
                      placeholder="e.g. Lumen Skin Studio"
                      aria-invalid={v.nameBad}
                      style={{
                        height: '48px',
                        border: `1px solid ${v.nameBorder}`,
                        boxShadow: v.nameRing,
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
                    {v.nameBad ? (
                      <>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            lineHeight: '18px',
                            color: '#A12A20',
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7.5v5.5M12 16.5v.01" />
                          </svg>
                          Enter your business name.
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="ob-slug"
                      style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                    >
                      {'Booking page address '}
                      <span style={{ color: '#C2362B' }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '48px',
                        border: `1px solid ${v.slugBorder}`,
                        boxShadow: v.slugRing,
                        borderRadius: '10px',
                        background: '#F7F7F8',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        style={{
                          padding: '0 6px 0 12px',
                          fontSize: v.prefixSize,
                          color: '#5B616E',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {HOST}/
                      </span>
                      <input
                        id="ob-slug"
                        type="text"
                        value={v.slug}
                        onChange={v.setSlug}
                        placeholder="your-business"
                        aria-describedby="ob-slug-status"
                        style={{
                          flex: '1 1 auto',
                          minWidth: '60px',
                          height: '46px',
                          border: '0',
                          borderLeft: '1px solid #E6E7EB',
                          background: '#FFFFFF',
                          padding: '0 12px',
                          fontFamily: 'inherit',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#0F1115',
                        }}
                      />
                    </div>
                    <span
                      id="ob-slug-status"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        lineHeight: '18px',
                        color: v.slugMsgColor,
                      }}
                    >
                      {v.slugOk ? (
                        <>
                          <svg
                            aria-hidden="true"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </>
                      ) : null}
                      {v.slugErr ? (
                        <>
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7.5v5.5M12 16.5v.01" />
                          </svg>
                        </>
                      ) : null}{' '}
                      {v.slugMsg}
                    </span>
                    {v.hasSuggest ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#4A505C' }}>Try:</span>
                          {(v.suggest || []).map((sg, sg_i) => (
                            <React.Fragment key={sg_i}>
                              <button
                                type="button"
                                onClick={sg?.pick}
                                style={{
                                  height: '36px',
                                  padding: '0 12px',
                                  borderRadius: '999px',
                                  border: '1px solid #D9DBE1',
                                  background: '#FFFFFF',
                                  color: '#0F1115',
                                  fontFamily: 'inherit',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                {sg?.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="ob-site"
                      style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                    >
                      {'Your website '}
                      <span style={{ fontWeight: '400', color: '#5B616E' }}>(optional)</span>
                    </label>
                    <input
                      id="ob-site"
                      type="url"
                      value={v.site}
                      onChange={v.setSite}
                      placeholder="https://yourbusiness.com"
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
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                      We'll show you how to embed your booking page there.
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      Preview
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid #E6E7EB',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        background: '#FCFCFD',
                      }}
                    >
                      <span
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#5B4BDB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                          fontWeight: '800',
                          fontSize: '14px',
                          flex: '0 0 auto',
                        }}
                      >
                        {v.initials}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            lineHeight: '20px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.previewName}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            lineHeight: '16px',
                            color: '#5B616E',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {HOST}/{v.previewSlug}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid #EEEFF2',
                      paddingTop: '18px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={v.next}
                      style={{
                        height: '48px',
                        padding: '0 24px',
                        borderRadius: '12px',
                        border: '0',
                        background: '#0F1115',
                        color: '#FFFFFF',
                        fontFamily: 'inherit',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {'Continue '}
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : null}
              {v.isStep2 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h1
                      style={{
                        margin: '0',
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: v.h1Size,
                        lineHeight: '1.25',
                        fontWeight: '800',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      Pick a starting template
                    </h1>
                    <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>
                      We'll pre-load sample services and intake questions for your industry. Edit or delete them any
                      time.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      role="radiogroup"
                      aria-label="Industry template"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {(v.templates || []).map((tp, tp_i) => (
                        <React.Fragment key={tp_i}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={tp?.on}
                            onClick={tp?.pick}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '16px',
                              borderRadius: '14px',
                              border: `1px solid ${tp?.border}`,
                              boxShadow: `0 0 0 1px ${tp?.ring}`,
                              background: tp?.bg,
                              fontFamily: 'inherit',
                              color: 'inherit',
                              textAlign: 'left',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: tp?.iconBg,
                                color: tp?.iconFg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {tp?.isClinic ? (
                                <>
                                  <svg
                                    aria-hidden="true"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
                                  </svg>
                                </>
                              ) : null}
                              {tp?.isSalon ? (
                                <>
                                  <svg
                                    aria-hidden="true"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
                                    <path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" />
                                  </svg>
                                </>
                              ) : null}
                              {tp?.isEvents ? (
                                <>
                                  <svg
                                    aria-hidden="true"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect x="3" y="7" width="18" height="13" rx="2.5" />
                                    <path d="M8.5 7l1.5-3h4l1.5 3" />
                                    <circle cx="12" cy="13.5" r="3.5" />
                                  </svg>
                                </>
                              ) : null}
                            </span>
                            <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>{tp?.label}</span>
                            <span style={{ fontSize: '13px', lineHeight: '18px', color: '#4A505C' }}>{tp?.desc}</span>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                              {(tp?.services || []).map((ts, ts_i) => (
                                <React.Fragment key={ts_i}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      lineHeight: '14px',
                                      fontWeight: '600',
                                      color: '#2B2F36',
                                      background: '#F1F1F4',
                                      borderRadius: '999px',
                                      padding: '3px 8px',
                                    }}
                                  >
                                    {ts}
                                  </span>
                                </React.Fragment>
                              ))}
                            </span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{tp?.meta}</span>
                            {tp?.on ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '999px',
                                    background: '#5B4BDB',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                                  </svg>
                                </span>
                              </>
                            ) : null}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={v.pickBlank}
                      aria-pressed={v.blankOn}
                      style={{
                        alignSelf: 'flex-start',
                        minHeight: '40px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: `1px ${v.blankStyle} ${v.blankBorder}`,
                        background: v.blankBg,
                        color: '#2B2F36',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {v.blankLabel}
                    </button>
                    {v.tplBad ? (
                      <>
                        <span
                          role="alert"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            lineHeight: '18px',
                            color: '#A12A20',
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7.5v5.5M12 16.5v.01" />
                          </svg>
                          {v.finishErr || 'Choose a template, or start from scratch.'}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                    }}
                  >
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
                      {'Currency '}
                      <select
                        value={v.currency}
                        onChange={v.setCurrency}
                        style={{
                          height: '48px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 10px',
                          fontFamily: 'inherit',
                          fontSize: '15px',
                          fontWeight: '400',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="PHP">PHP · Philippine peso (₱)</option>
                        <option value="AUD">AUD · Australian dollar ($)</option>
                        <option value="USD">USD · US dollar ($)</option>
                        <option value="SGD">SGD · Singapore dollar (S$)</option>
                        <option value="NZD">NZD · New Zealand dollar ($)</option>
                        <option value="GBP">GBP · British pound (£)</option>
                      </select>
                    </label>
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
                      {'Time zone '}
                      <select
                        value={v.tz}
                        onChange={v.setTz}
                        style={{
                          height: '48px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 10px',
                          fontFamily: 'inherit',
                          fontSize: '15px',
                          fontWeight: '400',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="Asia/Manila">(GMT+8) Manila</option>
                        <option value="Asia/Singapore">(GMT+8) Singapore</option>
                        <option value="Australia/Perth">(GMT+8) Perth</option>
                        <option value="Australia/Brisbane">(GMT+10) Brisbane</option>
                        <option value="Australia/Sydney">Sydney, Melbourne (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                      </select>
                      <span style={{ fontWeight: '400', fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                        Detected from your browser. Customers can still view times in their own zone.
                      </span>
                    </label>
                  </div>
                  <div
                    style={{
                      background: '#F7F7F8',
                      border: '1px solid #EEEFF2',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '700' }}>
                      Here's what we'll set up
                    </span>
                    {(v.summary || []).map((sm, sm_i) => (
                      <React.Fragment key={sm_i}>
                        <span
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            fontSize: '14px',
                            lineHeight: '20px',
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0E7A4F"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flex: '0 0 auto', marginTop: '2px' }}
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                          <span style={{ minWidth: '0' }}>
                            <span style={{ color: '#5B616E' }}>{sm?.k}:</span>{' '}
                            <span style={{ fontWeight: '600' }}>{sm?.v}</span>
                          </span>
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #EEEFF2',
                      paddingTop: '18px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={v.back}
                      style={{
                        height: '48px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 12H5M11 6l-6 6 6 6" />
                      </svg>
                      {' Back'}
                    </button>
                    {v.cantFinish ? (
                      <>
                        <button
                          type="button"
                          onClick={v.tryFinish}
                          style={{
                            flex: '1 1 220px',
                            maxWidth: '320px',
                            height: '48px',
                            padding: '0 22px',
                            borderRadius: '12px',
                            border: '0',
                            background: '#0F1115',
                            color: '#FFFFFF',
                            fontFamily: 'inherit',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          {v.finishLabel}
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E', textAlign: 'center' }}>
              Next stop: your dashboard, with sample services, hours and your booking link ready to share.
            </span>
          </div>
        </main>
      </div>
    );
  }
}
