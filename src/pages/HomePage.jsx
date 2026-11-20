// Ported from the design handoff board canvas-source/Home.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';
import { HOST, ORIGIN } from '../lib/site.js';

class HomePageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = {
      w: 0,
      menu: false,
      tab: 'salon',
      iSvc: 0,
      iAns: 0,
      iStep: 1,
      iStaff: 0,
      iTime: null,
      svc: 's1',
      day: 0,
      slot: null,
      booked: false,
      slug: '',
      copied: false,
    };
    this.rootRef = (el) => {
      this.el = el;
    };
  }

  componentDidMount() {
    this.measure();
    try {
      if (typeof ResizeObserver !== 'undefined' && this.el) {
        this.ro = new ResizeObserver(() => this.measure());
        this.ro.observe(this.el);
      }
    } catch (e) {}
  }

  componentWillUnmount() {
    try {
      if (this.ro) this.ro.disconnect();
    } catch (e) {}
  }

  measure() {
    if (!this.el) return;
    var w = this.el.offsetWidth || 0;
    if (w && Math.abs(w - (this.state.w || 0)) > 4) this.setState({ w: w });
  }

  rgb(hex) {
    var h = String(hex || '').replace('#', '');
    var n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return [91, 75, 219];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  lum(c) {
    var f = function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }

  mix(c, a) {
    var m = function (v) {
      return Math.round(255 + (v - 255) * a);
    };
    return 'rgb(' + m(c[0]) + ', ' + m(c[1]) + ', ' + m(c[2]) + ')';
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var p = this.props || {};
    var INK = '#0F1115',
      LINE = '#E6E7EB',
      LINE2 = '#D9DBE1';
    var accent = p.accent || '#5B4BDB';
    var rgb = this.rgb(accent);
    var soft = this.mix(rgb, 0.09);
    var onAccent = this.lum(rgb) > 0.45 ? INK : '#FFFFFF';
    var narrow = !!p.phone || (s.w > 0 && s.w < 760);

    // ---- hero mini booking card
    // Generic sample business: works for any industry.
    var SV = [
      { id: 's1', name: 'Standard Session', meta: '60 min', price: 80 },
      { id: 's2', name: 'Initial Consultation', meta: '30 min', price: 0 },
      { id: 's3', name: 'Extended Package', meta: '90 min', price: 120 },
    ];
    var money = function (n) {
      return n ? '$' + n.toLocaleString('en-US') : 'Free';
    };
    var svc =
      SV.filter(function (x) {
        return x.id === s.svc;
      })[0] || SV[0];
    // The next five days from tomorrow, skipping Sundays.
    var WDS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONL = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    var DAYS = [];
    for (var di = 1; DAYS.length < 5; di++) {
      var dt = new Date();
      dt.setHours(12, 0, 0, 0);
      dt.setDate(dt.getDate() + di);
      if (dt.getDay() !== 0) DAYS.push([WDS[dt.getDay()], String(dt.getDate()), WDL[dt.getDay()], MONL[dt.getMonth()]]);
    }
    var ALL = ['9:30 AM', '10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];
    var KEEP = [
      [0, 1, 2, 3, 4, 5],
      [0, 1, 3],
      [1, 2, 4, 5],
      [0, 2, 3, 5],
      [0, 1, 2, 4],
    ];
    var dayIdx = Math.min(Math.max(s.day, 0), 4);
    var mini = {
      services: SV.map(function (x) {
        var on = x.id === svc.id;
        return {
          name: x.name,
          meta: x.meta,
          price: money(x.price),
          on: on,
          bg: on ? soft : '#FFFFFF',
          border: on ? accent : LINE,
          ring: on ? accent : 'transparent',
          pick: function () {
            self.setState({ svc: x.id });
          },
        };
      }),
      days: DAYS.map(function (d, i) {
        var on = i === dayIdx;
        return {
          wd: d[0],
          num: d[1],
          on: on,
          bg: on ? accent : '#FFFFFF',
          fg: on ? onAccent : INK,
          border: on ? accent : LINE2,
          pick: function () {
            self.setState({ day: i, slot: null });
          },
        };
      }),
      slots: KEEP[dayIdx].map(function (i) {
        var t = ALL[i];
        var on = t === s.slot;
        return {
          label: t,
          on: on,
          bg: on ? accent : '#FFFFFF',
          fg: on ? onAccent : INK,
          border: on ? accent : LINE2,
          pick: function () {
            self.setState({ slot: t });
          },
        };
      }),
      total: money(svc.price),
      sub: s.slot
        ? svc.name + ' · ' + DAYS[dayIdx][0] + ' ' + DAYS[dayIdx][1] + ' ' + DAYS[dayIdx][3].slice(0, 3) + ', ' + s.slot
        : svc.name + ' · ' + svc.meta,
      disabled: !s.slot,
      ctaBg: s.slot ? INK : '#E6E7EB',
      ctaFg: s.slot ? '#FFFFFF' : '#6B7280',
      cursor: s.slot ? 'pointer' : 'not-allowed',
      ctaLabel: s.slot ? 'Book now' : 'Pick a time',
      book: function () {
        if (self.state.slot) self.setState({ booked: true });
      },
      booked: !!s.booked,
      notBooked: !s.booked,
      doneLine:
        svc.name + ' · ' + DAYS[dayIdx][2] + ' ' + DAYS[dayIdx][1] + ' ' + DAYS[dayIdx][3] + ', ' + (s.slot || ''),
      month: DAYS[dayIdx][3],
      reset: function () {
        self.setState({ booked: false, slot: null });
      },
    };

    // ---- industries
    var IND = {
      clinic: {
        label: 'Clinics & Medical',
        biz: 'Your Clinic Name',
        initials: 'YC',
        place: 'Your City, Location',
        template: 'Dental & Medical Clinic',
        times: ['9:00 AM', '10:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'],
        accent: '#1D4ED8',
        noun: 'Dentist',
        desc: 'For dental, medical, physio and aesthetic clinics. Patients choose a treatment and a practitioner, answer intake questions before they arrive, and get reminder emails before the visit.',
        points: [
          'Staff appear as Dentists or Doctors, each with their own calendar',
          'New-patient, payment and pain questions ready to edit',
          'Treatment packages, such as a braces starter visit',
          '"From" pricing for treatments that vary',
        ],
        services: [
          ['Check-up & cleaning', '45 min', '₱1,200'],
          ['Tooth-colored filling', '1 hr', 'from ₱1,800'],
          ['In-clinic teeth whitening', '1 hr 30 min', '₱9,500'],
        ],
        q: 'Are you a new patient?',
        opts: ['Yes', 'No'],
        deposit: '',
      },
      salon: {
        label: 'Salons & Wellness',
        biz: 'Your Studio Name',
        initials: 'YS',
        place: 'Your City, Location',
        template: 'Salon & Wellness Studio',
        times: ['9:30 AM', '11:00 AM', '1:30 PM', '3:00 PM', '5:30 PM'],
        accent: '#5B4BDB',
        noun: 'Professional',
        desc: 'For skin studios, salons, spas and massage therapists. Clients pick a treatment, add extras, and choose a favourite professional or whoever is free first.',
        points: [
          '"Any professional" option for the most availability',
          'Packages with add-ons such as LED light therapy',
          'First-visit, skin-concern and allergy questions',
          'Buffer time between treatments for room turnover',
        ],
        services: [
          ['Hydrating signature facial', '1 hr', '₱2,800'],
          ['Pico laser toning', '45 min', '₱4,500'],
          ['Glow reset package', '3 sessions', '₱7,500'],
        ],
        q: 'Is this your first visit with us?',
        opts: ['Yes', 'No'],
        deposit: '',
      },
      events: {
        label: 'Events & Rentals',
        biz: 'Your Event Company',
        initials: 'YE',
        place: 'Your City, Location',
        template: 'Event & Booth Rental',
        times: ['10:00 AM', '2:00 PM', '6:00 PM'],
        accent: '#B4235A',
        noun: 'Booth',
        desc: 'For photo booths, venues, equipment and party rentals. Customers book a resource by the hour, add extras, and tell you about the venue up front.',
        points: [
          'Book resources like booths, rooms or equipment instead of people',
          'Hour-based packages with extras: extra hour, backdrop, second booth',
          'Event type, venue address and guest count questions',
          'Deposit shown on the summary and confirmation',
        ],
        services: [
          ['2-hour photo booth', '2 hrs', '$450'],
          ['3-hour 360 video booth', '3 hrs', '$850'],
          ['Wedding all-inclusive', '5 hrs', '$1,450'],
        ],
        q: 'What kind of event is it?',
        opts: ['Wedding', 'Birthday', 'Corporate'],
        deposit: '30% deposit ($135) due after the business confirms',
      },
    };
    var tabKey = IND[s.tab] ? s.tab : 'salon';
    var I = IND[tabKey];
    var iSoft = this.mix(this.rgb(I.accent), 0.09);
    // Frontend-only preview: local state, nothing is saved.
    var iSvc = I.services[s.iSvc] || I.services[0];
    var iAns = s.iAns === null ? null : I.opts[s.iAns];
    var nounLower = I.noun.toLowerCase();
    var iStaffList = ['Any available ' + nounLower, I.noun + ' 1', I.noun + ' 2'];
    var iCan = [false, iAns !== null && iAns !== undefined, true, s.iTime !== null, false][s.iStep];
    var ind = {
      label: I.label,
      biz: I.biz,
      initials: I.initials,
      place: I.place,
      accent: I.accent,
      soft: iSoft,
      noun: I.noun,
      desc: I.desc,
      points: I.points,
      q: I.q,
      template: I.template,
      templateHref: '/signup?template=' + tabKey,
      isStep1: s.iStep === 1,
      isStep2: s.iStep === 2,
      isStep3: s.iStep === 3,
      isDone: s.iStep === 4,
      stepLabel: [
        '',
        'Step 1 of 4 · Service',
        'Step 2 of 4 · ' + I.noun,
        'Step 3 of 4 · Date & time',
        'Step 4 of 4 · Details',
      ][s.iStep],
      summary: iSvc[0] + ' · ' + iSvc[2],
      services: I.services.map(function (r, i) {
        var on = r === iSvc;
        return {
          name: r[0],
          meta: r[1],
          price: r[2],
          on: on,
          bg: on ? iSoft : '#FFFFFF',
          border: on ? I.accent : LINE,
          ring: on ? I.accent : 'transparent',
          pick: function () {
            self.setState({ iSvc: i });
          },
        };
      }),
      opts: I.opts.map(function (o, i) {
        var on = i === s.iAns;
        return {
          label: o,
          on: on,
          bg: on ? iSoft : '#FFFFFF',
          border: on ? I.accent : LINE2,
          weight: on ? 700 : 500,
          pick: function () {
            self.setState({ iAns: self.state.iAns === i ? null : i });
          },
        };
      }),
      staff: iStaffList.map(function (n, i) {
        var on = i === s.iStaff;
        return {
          name: n,
          initials: i === 0 ? 'ANY' : I.noun.charAt(0) + i,
          avBg: i === 0 ? iSoft : I.accent,
          avFg: i === 0 ? I.accent : '#FFFFFF',
          on: on,
          bg: on ? iSoft : '#FFFFFF',
          border: on ? I.accent : LINE,
          ring: on ? I.accent : 'transparent',
          pick: function () {
            self.setState({ iStaff: i });
          },
        };
      }),
      times: I.times.map(function (t) {
        var on = t === s.iTime;
        return {
          label: t,
          on: on,
          bg: on ? I.accent : '#FFFFFF',
          fg: on ? '#FFFFFF' : INK,
          border: on ? I.accent : LINE2,
          pick: function () {
            self.setState({ iTime: t });
          },
        };
      }),
      doneLine: iSvc[0] + ' · ' + iStaffList[s.iStaff] + ' · Tomorrow, ' + (s.iTime || ''),
      doneAnswer: iAns ? I.q + ' ' + iAns : '',
      canContinue: iCan,
      ctaBg: iCan ? '#0F1115' : '#E6E7EB',
      ctaFg: iCan ? '#FFFFFF' : '#6B7280',
      ctaCursor: iCan ? 'pointer' : 'not-allowed',
      ctaHint: ['', 'Answer the question to continue.', '', 'Pick a time to continue.', ''][s.iStep],
      showHint: !iCan && s.iStep < 4,
      canBack: s.iStep > 1 && s.iStep < 4,
      next: function () {
        if (iCan) self.setState({ iStep: self.state.iStep + 1 });
      },
      back: function () {
        self.setState({ iStep: Math.max(1, self.state.iStep - 1) });
      },
      restart: function () {
        self.setState({ iStep: 1, iSvc: 0, iAns: 0, iStaff: 0, iTime: null });
      },
      hasDeposit: !!I.deposit,
      deposit: I.deposit,
    };
    var tabs = [
      ['clinic', 'Clinics & Medical'],
      ['salon', 'Salons & Wellness'],
      ['events', 'Events & Rentals'],
    ].map(function (t) {
      var on = t[0] === tabKey;
      return {
        label: t[1],
        on: on,
        isClinic: t[0] === 'clinic',
        isSalon: t[0] === 'salon',
        isEvents: t[0] === 'events',
        bg: on ? '#FFFFFF' : 'transparent',
        fg: on ? INK : '#4A505C',
        shadow: on ? '0 1px 2px rgba(16,17,21,0.12)' : 'none',
        pick: function () {
          self.setState({ tab: t[0], iStep: 1, iSvc: 0, iAns: 0, iStaff: 0, iTime: null });
        },
      };
    });

    // ---- pricing comparison
    var ROWS = [
      ['Booking pages (businesses or websites)', '1', 'Unlimited'],
      ['Staff or resources', '1', 'Unlimited'],
      ['Shareable link and website embed', true, true],
      ['Email alerts and .ics invites', true, true],
      ['Two-way Google Calendar sync', '1 calendar', 'Every staff member'],
      ['Custom intake questions', 'Up to 3', 'Unlimited, per service'],
      ['Packages, add-ons and deposits', false, true],
      ['Custom domain, no "Powered by" badge', false, true],
    ];
    var compare = ROWS.map(function (r, i) {
      return {
        label: r[0],
        free: typeof r[1] === 'string' ? r[1] : '',
        pro: typeof r[2] === 'string' ? r[2] : '',
        freeYes: r[1] === true,
        freeNo: r[1] === false,
        freeText: typeof r[1] === 'string',
        proYes: r[2] === true,
        proText: typeof r[2] === 'string',
        line: i < ROWS.length - 1 ? '#EEEFF2' : 'transparent',
      };
    });

    return {
      rootRef: this.rootRef,
      minH: p.minh || (p.phone ? '844px' : '100vh'),
      accent: accent,
      soft: soft,
      onAccent: onAccent,
      wide: !narrow,
      narrow: narrow,
      menu: !!s.menu,
      menuClosed: !s.menu,
      showMenu: narrow && !!s.menu,
      toggleMenu: function () {
        self.setState({ menu: !self.state.menu });
      },
      closeMenu: function () {
        self.setState({ menu: false });
      },
      padX: narrow ? '20px' : '32px',
      brandSize: narrow ? '15px' : '17px',
      heroPad: narrow ? '36px 20px 48px' : '80px 32px 88px',
      secPad: narrow ? '56px 20px' : '96px 32px',
      ctaOuter: narrow ? '48px 20px' : '88px 32px',
      ctaPad: narrow ? '32px 24px' : '48px 56px',
      panelPad: narrow ? '20px' : '40px',
      h1Size: narrow ? '36px' : '56px',
      h1Line: narrow ? '42px' : '62px',
      h2Size: narrow ? '28px' : '38px',
      h2Line: narrow ? '34px' : '46px',
      leadSize: narrow ? '16px' : '18px',
      slug: s.slug,
      setSlug: function (e) {
        self.setState({
          slug: String(e.target.value || '')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-'),
        });
      },
      mini: mini,
      toPreview: function (e) {
        var el = document.getElementById('live-preview');
        if (!el) return;
        e.preventDefault();
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      },
      tabs: tabs,
      ind: ind,
      compare: compare,
      copyCode: function () {
        self.setState({ copied: true });
        try {
          navigator.clipboard.writeText(
            '<iframe src="' +
              ORIGIN +
              '/your-business?embed=true" title="Book an appointment" loading="lazy" style="width:100%;min-height:720px;border:0"></iframe>',
          );
        } catch (e) {}
      },
      copyLabel: s.copied ? 'Copied' : 'Copy',
    };
  }
}

export default class HomePage extends HomePageLogic {
  render() {
    const v = this.renderVals();
    return (
      <div
        id="top"
        ref={v.rootRef}
        style={{
          width: '100%',
          minHeight: v.minH,
          background: '#FFFFFF',
          color: '#0F1115',
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: '15px',
          lineHeight: '22px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {' '}
        <header
          style={{
            position: 'sticky',
            top: '0',
            zIndex: '30',
            background: '#FFFFFF',
            borderBottom: '1px solid #E6E7EB',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: `0 ${v.padX}`,
              height: '68px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxSizing: 'border-box',
            }}
          >
            <a
              href="#top"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: '#0F1115',
                flex: '0 0 auto',
              }}
            >
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
            </a>
            {v.wide ? (
              <>
                <nav aria-label="Main" style={{ display: 'flex', gap: '2px', marginLeft: '16px', flex: '1 1 auto' }}>
                  <a
                    href="#features"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#2B2F36',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Features
                  </a>
                  <a
                    href="#industries"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#2B2F36',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Industries
                  </a>
                  <a
                    href="#embed"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#2B2F36',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Embed
                  </a>
                  <a
                    href="#pricing"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#2B2F36',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Pricing
                  </a>
                </nav>
                <a
                  href="/login"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                  }}
                >
                  Start free
                </a>
              </>
            ) : null}
            {v.narrow ? (
              <>
                <span style={{ flex: '1 1 auto' }} />
                <button
                  type="button"
                  onClick={v.toggleMenu}
                  aria-expanded={v.menu}
                  aria-label="Menu"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '0',
                    flex: '0 0 auto',
                  }}
                >
                  {v.menuClosed ? (
                    <>
                      <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 7h16M4 12h16M4 17h16" />
                      </svg>
                    </>
                  ) : null}
                  {v.menu ? (
                    <>
                      <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </>
                  ) : null}
                </button>
              </>
            ) : null}
          </div>{' '}
          {v.showMenu ? (
            <>
              <nav
                aria-label="Main"
                style={{
                  borderTop: '1px solid #E6E7EB',
                  padding: '8px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#FFFFFF',
                }}
              >
                <a
                  href="#features"
                  onClick={v.closeMenu}
                  style={{
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  Features
                </a>
                <a
                  href="#industries"
                  onClick={v.closeMenu}
                  style={{
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  Industries
                </a>
                <a
                  href="#embed"
                  onClick={v.closeMenu}
                  style={{
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  Embed
                </a>
                <a
                  href="#pricing"
                  onClick={v.closeMenu}
                  style={{
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  Pricing
                </a>
                <a
                  href="/login"
                  style={{
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0F1115',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  style={{
                    marginTop: '8px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                  }}
                >
                  Start free
                </a>
              </nav>
            </>
          ) : null}
        </header>{' '}
        <section style={{ background: '#F7F7F8', borderBottom: '1px solid #E6E7EB' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: v.heroPad,
              boxSizing: 'border-box',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <span
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  lineHeight: '18px',
                  fontWeight: '600',
                  color: '#2B2F36',
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '999px',
                  padding: '6px 12px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: '8px', height: '8px', borderRadius: '999px', background: v.accent }}
                />
                {' For clinics, salons and event businesses'}
              </span>
              <h1
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h1Size,
                  lineHeight: v.h1Line,
                  fontWeight: '800',
                  letterSpacing: '-0.025em',
                }}
              >
                Launch a booking page or embed a scheduler on your website in minutes.
              </h1>
              <p style={{ margin: '0', fontSize: v.leadSize, lineHeight: '1.55', color: '#4A505C', maxWidth: '560px' }}>
                Customers pick a service, a staff member and a time in a few taps. You get your own page at {HOST}
                /your-business, a one-line embed for any website, two-way Google Calendar sync and instant email alerts.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '640px' }}>
                <div
                  style={{
                    flex: '1 1 360px',
                    display: 'flex',
                    alignItems: 'center',
                    height: '52px',
                    border: '1px solid #D9DBE1',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    overflow: 'hidden',
                    minWidth: '0',
                    boxSizing: 'border-box',
                  }}
                >
                  <label
                    htmlFor="hero-slug"
                    style={{ paddingLeft: '14px', color: '#5B616E', fontSize: '14px', whiteSpace: 'nowrap' }}
                  >
                    {HOST}/
                  </label>
                  <input
                    id="hero-slug"
                    type="text"
                    value={v.slug}
                    onChange={v.setSlug}
                    placeholder="your-business"
                    style={{
                      flex: '1 1 auto',
                      minWidth: '40px',
                      height: '50px',
                      border: '0',
                      padding: '0 12px 0 2px',
                      fontFamily: 'inherit',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#0F1115',
                      background: 'transparent',
                    }}
                  />
                </div>
                <a
                  href={v.slug ? '/signup?slug=' + encodeURIComponent(v.slug) : '/signup'}
                  style={{
                    flex: '1 0 auto',
                    height: '52px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: '700',
                    boxSizing: 'border-box',
                  }}
                >
                  {'Create your booking page '}
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
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px 20px',
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: '#4A505C',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0E7A4F"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  Free plan
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0E7A4F"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  Works on any website
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0E7A4F"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  Google Calendar sync
                </span>
              </div>
              <a
                href="#live-preview"
                onClick={v.toPreview}
                style={{ alignSelf: 'flex-start', fontSize: '14px', fontWeight: '600', color: '#0F1115' }}
              >
                Or try the live preview
              </a>
            </div>
            <div
              id="live-preview"
              style={{
                flex: '1 1 360px',
                maxWidth: '440px',
                minWidth: '0',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span
                style={{
                  alignSelf: 'center',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Live preview · try it
              </span>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,17,21,0.04), 0 16px 40px rgba(16,17,21,0.10)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: v.accent,
                      color: v.onAccent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontWeight: '800',
                      fontSize: '13px',
                      flex: '0 0 auto',
                    }}
                  >
                    YB
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                    <span style={{ fontSize: '14px', lineHeight: '18px', fontWeight: '700' }}>Your Business Name</span>
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
                      {HOST}/your-business
                    </span>
                  </span>
                </div>{' '}
                {v.mini?.notBooked ? (
                  <>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            lineHeight: '14px',
                            fontWeight: '700',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#5B616E',
                          }}
                        >
                          1 · Service
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(v.mini?.services || []).map((ms, ms_i) => (
                            <React.Fragment key={ms_i}>
                              <button
                                type="button"
                                onClick={ms?.pick}
                                aria-pressed={ms?.on}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  minHeight: '48px',
                                  padding: '6px 12px',
                                  borderRadius: '12px',
                                  border: `1px solid ${ms?.border}`,
                                  boxShadow: `0 0 0 1px ${ms?.ring}`,
                                  background: ms?.bg,
                                  fontFamily: 'inherit',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <span
                                  style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: '0' }}
                                >
                                  <span style={{ fontSize: '14px', lineHeight: '18px', fontWeight: '600' }}>
                                    {ms?.name}
                                  </span>
                                  <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                                    {ms?.meta}
                                  </span>
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {ms?.price}
                                </span>
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            lineHeight: '14px',
                            fontWeight: '700',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#5B616E',
                          }}
                        >
                          2 · Day · {v.mini?.month}
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px' }}>
                          {(v.mini?.days || []).map((md, md_i) => (
                            <React.Fragment key={md_i}>
                              <button
                                type="button"
                                onClick={md?.pick}
                                aria-pressed={md?.on}
                                style={{
                                  height: '54px',
                                  borderRadius: '12px',
                                  border: `1px solid ${md?.border}`,
                                  background: md?.bg,
                                  color: md?.fg,
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  padding: '0',
                                }}
                              >
                                <span style={{ fontSize: '11px', lineHeight: '14px', fontWeight: '600' }}>
                                  {md?.wd}
                                </span>
                                <span style={{ fontSize: '16px', lineHeight: '20px', fontWeight: '700' }}>
                                  {md?.num}
                                </span>
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            lineHeight: '14px',
                            fontWeight: '700',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#5B616E',
                          }}
                        >
                          3 · Time
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                          {(v.mini?.slots || []).map((mt, mt_i) => (
                            <React.Fragment key={mt_i}>
                              <button
                                type="button"
                                onClick={mt?.pick}
                                aria-pressed={mt?.on}
                                style={{
                                  height: '44px',
                                  borderRadius: '10px',
                                  border: `1px solid ${mt?.border}`,
                                  background: mt?.bg,
                                  color: mt?.fg,
                                  fontFamily: 'inherit',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  padding: '0',
                                }}
                              >
                                {mt?.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>{' '}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderTop: '1px solid #EEEFF2',
                        background: '#FCFCFD',
                      }}
                    >
                      <span style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                        <span
                          style={{
                            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                            fontSize: '16px',
                            lineHeight: '20px',
                            fontWeight: '800',
                          }}
                        >
                          {v.mini?.total}
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
                          {v.mini?.sub}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={v.mini?.book}
                        disabled={v.mini?.disabled}
                        style={{
                          height: '44px',
                          padding: '0 18px',
                          borderRadius: '12px',
                          border: '0',
                          background: v.mini?.ctaBg,
                          color: v.mini?.ctaFg,
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: v.mini?.cursor,
                          flex: '0 0 auto',
                        }}
                      >
                        {v.mini?.ctaLabel}
                      </button>
                    </div>
                  </>
                ) : null}{' '}
                {v.mini?.booked ? (
                  <>
                    <div
                      style={{
                        padding: '36px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '999px',
                          background: '#E7F6EE',
                          color: '#0E7A4F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          aria-hidden="true"
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                          fontSize: '20px',
                          lineHeight: '26px',
                          fontWeight: '800',
                        }}
                      >
                        You're booked
                      </span>
                      <span style={{ fontSize: '14px', lineHeight: '20px', fontWeight: '600' }}>
                        {v.mini?.doneLine}
                      </span>
                      <span style={{ fontSize: '13px', lineHeight: '18px', color: '#5B616E' }}>
                        Confirmation and calendar invite sent by email.
                      </span>
                      <button
                        type="button"
                        onClick={v.mini?.reset}
                        style={{
                          marginTop: '6px',
                          height: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          color: '#0F1115',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Try it again
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>{' '}
        <section id="industries" style={{ padding: v.secPad, boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'center',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: v.accent,
                }}
              >
                Industries
              </span>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h2Size,
                  lineHeight: v.h2Line,
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  maxWidth: '760px',
                }}
              >
                One booking system, shaped to your industry
              </h2>
              <p style={{ margin: '0', fontSize: '16px', lineHeight: '24px', color: '#4A505C', maxWidth: '620px' }}>
                Pick a template and the labels, packages and questions change to fit. The booking flow your customers
                use stays the same.
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Industries"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                background: '#F1F1F4',
                padding: '4px',
                borderRadius: '14px',
                alignSelf: 'center',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              {(v.tabs || []).map((tb, tb_i) => (
                <React.Fragment key={tb_i}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tb?.on}
                    onClick={tb?.pick}
                    style={{
                      flex: '1 1 auto',
                      height: '44px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: '0',
                      background: tb?.bg,
                      boxShadow: tb?.shadow,
                      color: tb?.fg,
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tb?.isClinic ? (
                      <>
                        <svg
                          aria-hidden="true"
                          width="17"
                          height="17"
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
                    {tb?.isSalon ? (
                      <>
                        <svg
                          aria-hidden="true"
                          width="17"
                          height="17"
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
                    {tb?.isEvents ? (
                      <>
                        <svg
                          aria-hidden="true"
                          width="17"
                          height="17"
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
                    ) : null}{' '}
                    {tb?.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div
              role="tabpanel"
              aria-label={v.ind?.label}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '40px',
                alignItems: 'center',
                border: '1px solid #E6E7EB',
                borderRadius: '20px',
                padding: v.panelPad,
                background: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: '1 1 420px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3
                  style={{
                    margin: '0',
                    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                    fontSize: '24px',
                    lineHeight: '30px',
                    fontWeight: '800',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {v.ind?.label}
                </h3>
                <p style={{ margin: '0', fontSize: '15px', lineHeight: '23px', color: '#4A505C' }}>{v.ind?.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(v.ind?.points || []).map((pt, pt_i) => (
                    <React.Fragment key={pt_i}>
                      <span
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#2B2F36',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            background: v.ind?.soft,
                            color: v.ind?.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: '0 0 auto',
                            marginTop: '0',
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>{' '}
                        {pt}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2B2F36',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 10px',
                    }}
                  >
                    {'Staff label: '}
                    {v.ind?.noun}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2B2F36',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 10px',
                    }}
                  >
                    {'Template: '}
                    {v.ind?.template}
                  </span>
                  <a
                    href={v.ind?.templateHref}
                    style={{ fontSize: '14px', fontWeight: '600', color: '#0F1115', marginLeft: '4px' }}
                  >
                    Start with this template
                  </a>
                </div>
              </div>
              <div
                style={{
                  flex: '1 1 320px',
                  maxWidth: '420px',
                  minWidth: '0',
                  margin: '0 auto',
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,17,21,0.04), 0 8px 24px rgba(16,17,21,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    borderBottom: '1px solid #EEEFF2',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: v.ind?.accent,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontWeight: '800',
                      fontSize: '13px',
                      flex: '0 0 auto',
                    }}
                  >
                    {v.ind?.initials}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                    <span style={{ fontSize: '14px', lineHeight: '18px', fontWeight: '700' }}>{v.ind?.biz}</span>
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{v.ind?.place}</span>
                  </span>
                </div>{' '}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      lineHeight: '14px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#5B616E',
                    }}
                  >
                    {v.ind?.stepLabel}
                  </span>
                  {v.ind?.isStep1 ? (
                    <>
                      {(v.ind?.services || []).map((is, is_i) => (
                        <React.Fragment key={is_i}>
                          <button
                            type="button"
                            onClick={is?.pick}
                            aria-pressed={is?.on}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              fontFamily: 'inherit',
                              color: '#0F1115',
                              textAlign: 'left',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              border: `1px solid ${is?.border}`,
                              boxShadow: `0 0 0 1px ${is?.ring}`,
                              background: is?.bg,
                            }}
                          >
                            <span style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                              <span style={{ fontSize: '14px', lineHeight: '18px', fontWeight: '600' }}>
                                {is?.name}
                              </span>
                              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{is?.meta}</span>
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              {is?.price}
                            </span>
                          </button>
                        </React.Fragment>
                      ))}
                      <div
                        style={{
                          borderTop: '1px solid #EEEFF2',
                          paddingTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600' }}>
                          {v.ind?.q} <span style={{ color: '#C2362B' }}>*</span>
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(v.ind?.opts || []).map((io, io_i) => (
                            <React.Fragment key={io_i}>
                              <button
                                type="button"
                                onClick={io?.pick}
                                aria-pressed={io?.on}
                                style={{
                                  height: '34px',
                                  padding: '0 12px',
                                  borderRadius: '999px',
                                  border: `1px solid ${io?.border}`,
                                  background: io?.bg,
                                  color: '#0F1115',
                                  fontFamily: 'inherit',
                                  fontSize: '13px',
                                  fontWeight: io?.weight,
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                {io?.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      {v.ind?.hasDeposit ? (
                        <span
                          style={{
                            fontSize: '12px',
                            lineHeight: '16px',
                            color: '#4A505C',
                            background: '#F7F7F8',
                            borderRadius: '8px',
                            padding: '8px 10px',
                          }}
                        >
                          {v.ind?.deposit}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  {v.ind?.isStep2 ? (
                    <>
                      <span style={{ fontSize: '13px', lineHeight: '18px', color: '#4A505C' }}>{v.ind?.summary}</span>
                      {(v.ind?.staff || []).map((st, st_i) => (
                        <React.Fragment key={st_i}>
                          <button
                            type="button"
                            onClick={st?.pick}
                            aria-pressed={st?.on}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              fontFamily: 'inherit',
                              color: '#0F1115',
                              textAlign: 'left',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              border: `1px solid ${st?.border}`,
                              boxShadow: `0 0 0 1px ${st?.ring}`,
                              background: st?.bg,
                            }}
                          >
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '999px',
                                background: st?.avBg,
                                color: st?.avFg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '700',
                                flex: '0 0 auto',
                              }}
                            >
                              {st?.initials}
                            </span>
                            <span style={{ fontSize: '14px', lineHeight: '18px', fontWeight: '600' }}>{st?.name}</span>
                          </button>
                        </React.Fragment>
                      ))}
                    </>
                  ) : null}
                  {v.ind?.isStep3 ? (
                    <>
                      <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600' }}>Tomorrow</span>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {(v.ind?.times || []).map((tm, tm_i) => (
                          <React.Fragment key={tm_i}>
                            <button
                              type="button"
                              onClick={tm?.pick}
                              aria-pressed={tm?.on}
                              style={{
                                height: '40px',
                                borderRadius: '10px',
                                border: `1px solid ${tm?.border}`,
                                background: tm?.bg,
                                color: tm?.fg,
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {tm?.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {v.ind?.isDone ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '8px 0',
                      }}
                    >
                      <span
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '999px',
                          background: '#E7F6EE',
                          color: '#0E7A4F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          aria-hidden="true"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>This is what your customers see</span>
                      <span style={{ fontSize: '13px', lineHeight: '18px', color: '#4A505C' }}>{v.ind?.doneLine}</span>
                      {v.ind?.doneAnswer ? (
                        <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                          {v.ind?.doneAnswer}
                        </span>
                      ) : null}
                      <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                        Preview only. Nothing was booked.
                      </span>
                      <a
                        href={v.ind?.templateHref}
                        style={{
                          width: '100%',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#0F1115',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '700',
                        }}
                      >
                        Start with this template
                      </a>
                      <button
                        type="button"
                        onClick={v.ind?.restart}
                        style={{
                          border: '0',
                          background: 'transparent',
                          padding: '4px',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0F1115',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        Try it again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {v.ind?.canBack ? (
                          <button
                            type="button"
                            onClick={v.ind?.back}
                            style={{
                              flex: '0 0 auto',
                              height: '44px',
                              padding: '0 14px',
                              borderRadius: '12px',
                              border: '1px solid #D9DBE1',
                              background: '#FFFFFF',
                              color: '#0F1115',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Back
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={v.ind?.next}
                          aria-disabled={!v.ind?.canContinue}
                          style={{
                            flex: '1 1 auto',
                            height: '44px',
                            borderRadius: '12px',
                            border: '0',
                            background: v.ind?.ctaBg,
                            color: v.ind?.ctaFg,
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: v.ind?.ctaCursor,
                          }}
                        >
                          Continue
                        </button>
                      </div>
                      {v.ind?.showHint ? (
                        <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E', textAlign: 'center' }}>
                          {v.ind?.ctaHint}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>{' '}
        <section
          id="features"
          style={{
            padding: v.secPad,
            background: '#F7F7F8',
            borderTop: '1px solid #E6E7EB',
            borderBottom: '1px solid #E6E7EB',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'center',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: v.accent,
                }}
              >
                Features
              </span>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h2Size,
                  lineHeight: v.h2Line,
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  maxWidth: '760px',
                }}
              >
                Everything a booking page needs, nothing it doesn't
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <article
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    background: '#F7F7F8',
                    border: '1px solid #EEEFF2',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                    minHeight: '156px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                    </svg>
                    <span style={{ overflowWrap: 'anywhere' }}>
                      {HOST}/<span style={{ color: v.accent }}>your-business</span>
                    </span>
                  </span>
                  <code
                    style={{
                      display: 'block',
                      background: '#1B1D22',
                      color: '#E6E7EB',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                      fontSize: '11.5px',
                      lineHeight: '18px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {'<iframe src="' + ORIGIN + '/your-business?embed=true"></iframe>'}
                  </code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: v.soft,
                      color: v.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: '0 0 auto',
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
                      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                    </svg>
                  </span>
                  <h3 style={{ margin: '0', fontSize: '17px', lineHeight: '22px', fontWeight: '700' }}>
                    {'Shareable link & 1-line website embed'}
                  </h3>
                </div>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '21px', color: '#4A505C' }}>
                  Every business gets its own page at /your-business. Add ?embed=true in one iframe line to put the same
                  flow on WordPress, Wix, Squarespace, Webflow or Astro.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#2B2F36',
                  }}
                >
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Auto-resizes to each step, no inner scrollbars
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Inline, popup-button and plain-link modes
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Uses your logo and accent colour
                  </span>
                </div>
              </article>
              <article
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    background: '#F7F7F8',
                    border: '1px solid #EEEFF2',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '156px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                    <span
                      style={{
                        width: '56px',
                        flex: '0 0 auto',
                        fontSize: '11px',
                        lineHeight: '14px',
                        color: '#5B616E',
                        paddingTop: '8px',
                      }}
                    >
                      9:00 AM
                    </span>
                    <span
                      style={{
                        flex: '1 1 auto',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        fontWeight: '600',
                        color: '#3F4450',
                        border: '1px solid #E6E7EB',
                        backgroundImage:
                          'repeating-linear-gradient(135deg, #EEEFF2 0, #EEEFF2 6px, #FFFFFF 6px, #FFFFFF 12px)',
                      }}
                    >
                      Busy · from Google Calendar
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                    <span
                      style={{
                        width: '56px',
                        flex: '0 0 auto',
                        fontSize: '11px',
                        lineHeight: '14px',
                        color: '#5B616E',
                        paddingTop: '8px',
                      }}
                    >
                      10:30 AM
                    </span>
                    <span
                      style={{
                        flex: '1 1 auto',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        fontWeight: '600',
                        color: '#0F1115',
                        border: `1px solid ${v.accent}`,
                        background: v.soft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      {'Booking · Maria D. · Facial '}
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
                        <path d="M20 7h-9a5 5 0 0 0 0 10h1M4 17h9a5 5 0 0 0 0-10h-1" />
                        <path d="M17 4l3 3-3 3M7 14l-3 3 3 3" />
                      </svg>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                    <span
                      style={{
                        width: '56px',
                        flex: '0 0 auto',
                        fontSize: '11px',
                        lineHeight: '14px',
                        color: '#5B616E',
                        paddingTop: '8px',
                      }}
                    >
                      1:00 PM
                    </span>
                    <span
                      style={{
                        flex: '1 1 auto',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        fontWeight: '600',
                        color: '#3F4450',
                        border: '1px solid #E6E7EB',
                        backgroundImage:
                          'repeating-linear-gradient(135deg, #EEEFF2 0, #EEEFF2 6px, #FFFFFF 6px, #FFFFFF 12px)',
                      }}
                    >
                      Busy · Team lunch
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: v.soft,
                      color: v.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: '0 0 auto',
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
                      <path d="M3.5 10h17M8 3v4M16 3v4" />
                    </svg>
                  </span>
                  <h3 style={{ margin: '0', fontSize: '17px', lineHeight: '22px', fontWeight: '700' }}>
                    Two-way Google Calendar sync
                  </h3>
                </div>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '21px', color: '#4A505C' }}>
                  Connect with your Google sign-in and pick a calendar. Busy events block those times automatically, and
                  moves or cancellations sync both ways. No email password required.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#2B2F36',
                  }}
                >
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    One calendar per staff member
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Customer answers added to the event
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Disconnect any time from the dashboard
                  </span>
                </div>
              </article>
              <article
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    background: '#F7F7F8',
                    border: '1px solid #EEEFF2',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                    minHeight: '156px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: '600' }}>
                      {'Is this your first visit? '}
                      <span style={{ color: '#C2362B' }}>*</span>
                    </span>
                    <span style={{ display: 'flex', gap: '6px' }}>
                      <span
                        style={{
                          height: '28px',
                          padding: '0 12px',
                          borderRadius: '999px',
                          border: `1px solid ${v.accent}`,
                          background: v.soft,
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        Yes
                      </span>
                      <span
                        style={{
                          height: '28px',
                          padding: '0 12px',
                          borderRadius: '999px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        No
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: v.soft,
                        color: v.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2.5" />
                        <path d="M3.5 7l8.5 6 8.5-6" />
                      </svg>
                    </span>
                    <span style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          lineHeight: '16px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        New booking: Maria Dela Cruz
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          lineHeight: '14px',
                          color: '#5B616E',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Fri 20 Nov · 10:30 AM · Signature facial
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: '11px',
                        fontWeight: '500',
                        color: '#2B2F36',
                        background: '#F1F1F4',
                        borderRadius: '6px',
                        padding: '3px 6px',
                      }}
                    >
                      .ics
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: v.soft,
                      color: v.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: '0 0 auto',
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
                      <path d="M4 5h16v11H8l-4 4z" />
                      <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 14.5v.01" />
                    </svg>
                  </span>
                  <h3 style={{ margin: '0', fontSize: '17px', lineHeight: '22px', fontWeight: '700' }}>
                    {'Custom intake questions & instant email alerts'}
                  </h3>
                </div>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '21px', color: '#4A505C' }}>
                  Ask what you need before each service: yes/no, multiple choice or free text. You get an email the
                  moment someone books, and customers get a confirmation with an .ics calendar invite.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#2B2F36',
                  }}
                >
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Different questions for each service
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Reminder emails before each booking
                  </span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
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
                    Answers saved on the booking for your team
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>{' '}
        <section id="embed" style={{ padding: v.secPad, boxSizing: 'border-box' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 420px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: v.accent,
                }}
              >
                Embed
              </span>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h2Size,
                  lineHeight: v.h2Line,
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                }}
              >
                One line of code. Any website.
              </h2>
              <p style={{ margin: '0', fontSize: '16px', lineHeight: '24px', color: '#4A505C' }}>
                Keep the website you already have. The embed version drops the header and footer, so it sits inside your
                page like it was built there.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                <span
                  style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '15px', lineHeight: '22px' }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      flex: '0 0 auto',
                    }}
                  >
                    1
                  </span>
                  Create your page, services and hours
                </span>
                <span
                  style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '15px', lineHeight: '22px' }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      flex: '0 0 auto',
                    }}
                  >
                    2
                  </span>
                  Copy the embed line from your dashboard
                </span>
                <span
                  style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '15px', lineHeight: '22px' }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      flex: '0 0 auto',
                    }}
                  >
                    3
                  </span>
                  Paste it into any page builder or HTML
                </span>
              </div>
            </div>
            <div style={{ flex: '1 1 460px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#1B1D22', borderRadius: '16px', overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid #2C2F36',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: '12px',
                      color: '#B8BCC6',
                    }}
                  >
                    your-website / book.html
                  </span>
                  <button
                    type="button"
                    onClick={v.copyCode}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #3A3D45',
                      background: '#26292F',
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {v.copyLabel}
                  </button>
                </div>{' '}
                <code
                  style={{
                    display: 'block',
                    padding: '16px 18px',
                    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                    fontSize: '13px',
                    lineHeight: '22px',
                    color: '#E6E7EB',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {'<iframe src="' + ORIGIN + '/'}
                  <span style={{ color: '#B9B2F5' }}>{'your-business'}</span>
                  {
                    '?embed=true"\n  title="Book an appointment" loading="lazy"\n  style="width:100%;min-height:720px;border:0"></iframe>'
                  }
                </code>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  WordPress
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  Wix
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  Squarespace
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  Webflow
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  Astro
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2B2F36',
                    background: '#F1F1F4',
                    borderRadius: '999px',
                    padding: '6px 12px',
                  }}
                >
                  Plain HTML
                </span>
              </div>
            </div>
          </div>
        </section>{' '}
        <section
          id="pricing"
          style={{ padding: v.secPad, background: '#F7F7F8', borderTop: '1px solid #E6E7EB', boxSizing: 'border-box' }}
        >
          <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'center',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: v.accent,
                }}
              >
                Pricing
              </span>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h2Size,
                  lineHeight: v.h2Line,
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                }}
              >
                Simple pricing
              </h2>
              <p style={{ margin: '0', fontSize: '16px', lineHeight: '24px', color: '#4A505C', maxWidth: '560px' }}>
                Start free with one page. Move to Pro when you add staff, more websites or your own domain.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E7EB',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>Free</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: '36px',
                        lineHeight: '44px',
                        fontWeight: '800',
                      }}
                    >
                      0
                    </span>
                    <span style={{ fontSize: '14px', color: '#5B616E' }}>forever</span>
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: '20px', color: '#4A505C' }}>
                    For a solo business taking its first online bookings.
                  </span>
                </div>
                <a
                  href="/signup"
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    border: '1px solid #D9DBE1',
                    background: '#FFFFFF',
                    color: '#0F1115',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: '700',
                  }}
                >
                  Start free
                </a>
              </div>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #0F1115',
                  boxShadow: '0 0 0 1px #0F1115',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>Pro</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.04em',
                        color: v.accent,
                        background: v.soft,
                        borderRadius: '999px',
                        padding: '3px 8px',
                      }}
                    >
                      FOR GROWING TEAMS
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: '36px',
                        lineHeight: '44px',
                        fontWeight: '800',
                      }}
                    >
                      [Price]
                    </span>
                    <span style={{ fontSize: '14px', color: '#5B616E' }}>/ month</span>
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: '20px', color: '#4A505C' }}>
                    For teams, multi-location businesses and agencies.
                  </span>
                </div>
                <a
                  href="/signup"
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: '700',
                  }}
                >
                  Choose Pro
                </a>
              </div>
            </div>
            <div
              style={{ background: '#FFFFFF', border: '1px solid #E6E7EB', borderRadius: '16px', overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)',
                  gap: '12px',
                  padding: '12px 18px',
                  background: '#FAFAFB',
                  borderBottom: '1px solid #EEEFF2',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                <span>Compare</span>
                <span style={{ textAlign: 'center' }}>Free</span>
                <span style={{ textAlign: 'center' }}>Pro</span>
              </div>{' '}
              {(v.compare || []).map((cr, cr_i) => (
                <React.Fragment key={cr_i}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: `1px solid ${cr?.line}`,
                      fontSize: '14px',
                      lineHeight: '20px',
                    }}
                  >
                    <span style={{ color: '#2B2F36' }}>{cr?.label}</span>
                    <span style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', color: '#2B2F36' }}>
                      {cr?.freeYes ? (
                        <>
                          <svg
                            role="img"
                            aria-label="Included"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0E7A4F"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </>
                      ) : null}
                      {cr?.freeNo ? (
                        <>
                          <span aria-label="Not included" style={{ color: '#8C929C' }}>
                            —
                          </span>
                        </>
                      ) : null}
                      {cr?.freeText ? (
                        <>
                          <span>{cr?.free}</span>
                        </>
                      ) : null}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        textAlign: 'center',
                        color: '#0F1115',
                        fontWeight: '600',
                      }}
                    >
                      {cr?.proYes ? (
                        <>
                          <svg
                            role="img"
                            aria-label="Included"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0E7A4F"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </>
                      ) : null}
                      {cr?.proText ? (
                        <>
                          <span>{cr?.pro}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>{' '}
        <section style={{ padding: v.ctaOuter, boxSizing: 'border-box' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              background: '#0F1115',
              color: '#FFFFFF',
              borderRadius: '24px',
              padding: v.ctaPad,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 360px', minWidth: '0' }}>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: v.h2Size,
                  lineHeight: v.h2Line,
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
              >
                Ready to take bookings?
              </h2>
              <p style={{ margin: '0', fontSize: '16px', lineHeight: '24px', color: '#C4C7CE' }}>
                Set up your page, connect Google Calendar and share your link today.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <a
                href="/signup"
                style={{
                  height: '52px',
                  padding: '0 22px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  color: '#0F1115',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '15px',
                  fontWeight: '700',
                }}
              >
                Create your booking page
              </a>
              <a
                href="/login"
                style={{
                  height: '52px',
                  padding: '0 20px',
                  borderRadius: '12px',
                  border: '1px solid #4A505C',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '15px',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                }}
              >
                Log in
              </a>
            </div>
          </div>
        </section>{' '}
        <footer style={{ borderTop: '1px solid #E6E7EB' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: `40px ${v.padX} 28px`,
              boxSizing: 'border-box',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '32px',
            }}
          >
            <div style={{ flex: '2 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#0F1115',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
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
                  style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", fontSize: '16px', fontWeight: '800' }}
                >
                  Digital Services Master
                </span>
              </span>
              <span style={{ fontSize: '14px', lineHeight: '21px', color: '#4A505C', maxWidth: '320px' }}>
                Booking pages and website scheduling for clinics, salons and event businesses.
              </span>
            </div>
            <nav
              aria-label="Product"
              style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Product
              </span>
              <a href="#features" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Features
              </a>
              <a href="#industries" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Industries
              </a>
              <a href="#embed" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Embed
              </a>
              <a href="#pricing" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Pricing
              </a>
            </nav>
            <nav
              aria-label="Get started"
              style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Get started
              </span>
              <a href="/signup" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Create an account
              </a>
              <a href="/login" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Log in
              </a>
            </nav>
            <nav
              aria-label="Company"
              style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5B616E',
                }}
              >
                Company
              </span>
              <a href="#top" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Contact
              </a>
              <a href="#top" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Privacy
              </a>
              <a href="#top" style={{ color: '#2B2F36', textDecoration: 'none' }}>
                Terms
              </a>
            </nav>
          </div>{' '}
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: `16px ${v.padX} 28px`,
              boxSizing: 'border-box',
              borderTop: '1px solid #EEEFF2',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '13px',
              lineHeight: '18px',
              color: '#5B616E',
            }}
          >
            <span>© 2026 Digital Services Master. All rights reserved.</span>
            <span>Hosted on Cloudflare</span>
          </div>
        </footer>
      </div>
    );
  }
}
