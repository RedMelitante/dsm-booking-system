// Ported from the design handoff board canvas-source/Main.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';
import { todayParts, nowMinutes, browserTimeZone } from '../lib/clock.js';
import { googleCalendarUrl, icsDataUrl } from '../lib/calendar.js';

class BookingPageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = {
      step: 1,
      cat: 'all',
      serviceId: null,
      addons: [],
      staffId: null,
      monthOffset: 0,
      date: null,
      time: null,
      tz: null,
      first: '',
      last: '',
      email: '',
      phone: '',
      cc: '+63',
      answers: {},
      agree: false,
      sms: true,
      w: 0,
    };
    this.rootRef = (el) => {
      this.el = el;
    };
    this.applyDeepLink(args[0] || {});
  }

  // Embed deep links: &service=[id] and &staff=[id] preselect a choice.
  applyDeepLink(props) {
    var demoProp = String(props.demo || 'Aesthetic clinic');
    var dk = demoProp.indexOf('Dental') === 0 ? 'dental' : demoProp.indexOf('Photo') === 0 ? 'events' : 'aesthetic';
    var D = this.demos()[dk];
    // Slots default to the visitor's browser time zone when it is one we list.
    var tz = browserTimeZone(this.tzs().map((z) => z.id), null);
    if (tz && tz !== D.biz.tzId) this.state.tz = tz;
    if (props.service && D.services.some((x) => x.id === props.service)) this.state.serviceId = props.service;
    if (props.hideStaff) this.state.staffId = 'any';
    if (props.staff && (props.staff === 'any' || D.staff.some((x) => x.id === props.staff))) this.state.staffId = props.staff;
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

  componentDidUpdate(prev) {
    if (prev && prev.demo !== this.props.demo) {
      this.setState({
        step: 1,
        cat: 'all',
        serviceId: null,
        addons: [],
        staffId: null,
        monthOffset: 0,
        date: null,
        time: null,
        tz: null,
        answers: {},
      });
    }
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
    if (h.length === 3)
      h = h
        .split('')
        .map(function (c) {
          return c + c;
        })
        .join('');
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

  fmt(min) {
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60),
      mm = m % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }

  durLabel(d) {
    if (d < 60) return d + ' min';
    var h = Math.floor(d / 60),
      m = d % 60;
    return h + (h === 1 ? ' hr' : ' hrs') + (m ? ' ' + m + ' min' : '');
  }

  money(cur, n) {
    if (!n) return 'Free';
    return cur + Number(n).toLocaleString('en-US');
  }

  dkey(dt) {
    var m = dt.getMonth() + 1,
      d = dt.getDate();
    return dt.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }

  pdate(k) {
    var p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  tzs() {
    return [
      { id: 'Asia/Manila', city: 'Manila', off: 8 },
      { id: 'Asia/Singapore', city: 'Singapore', off: 8 },
      { id: 'Australia/Perth', city: 'Perth', off: 8 },
      { id: 'Australia/Brisbane', city: 'Brisbane', off: 10 },
      { id: 'Australia/Sydney', city: 'Sydney', off: 11 },
      { id: 'Asia/Dubai', city: 'Dubai', off: 4 },
      { id: 'Europe/London', city: 'London', off: 0 },
      { id: 'America/New_York', city: 'New York', off: -5 },
      { id: 'America/Los_Angeles', city: 'Los Angeles', off: -8 },
    ];
  }

  slotsFor(D, dt, staffId, dur) {
    var T = todayParts(D.biz.tzId);
    var today = new Date(T.y, T.m, T.d);
    var diff = Math.round((dt - today) / 86400000);
    var dow = dt.getDay();
    var b = D.biz;
    if (diff < 0 || diff > 60) return [];
    if (b.closed.indexOf(dow) >= 0) return [];
    var k = this.dkey(dt);
    if (this.hash(k + b.slug) % 7 === 3) return [];
    var close = dow === 6 ? b.satClose : b.close;
    var ids =
      staffId && staffId !== 'any'
        ? [staffId]
        : D.staff.map(function (x) {
            return x.id;
          });
    var out = [];
    for (var t = b.open; t + dur <= close; t += b.step) {
      // Minimum notice: 2 hours from now, in the business's time zone.
      if (diff === 0 && t < nowMinutes(b.tzId) + 120) continue;
      var free = false;
      for (var i = 0; i < ids.length; i++) {
        if (this.hash(k + ':' + t + ':' + ids[i]) % 3 !== 0) {
          free = true;
          break;
        }
      }
      if (free) out.push(t);
    }
    return out;
  }

  nextLabel(D, id, dur, delta) {
    var T = todayParts(D.biz.tzId);
    var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = 0; i <= 30; i++) {
      var dt = new Date(T.y, T.m, T.d + i);
      var sl = this.slotsFor(D, dt, id, dur);
      if (sl.length) {
        var day =
          i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WD[dt.getDay()] + ' ' + dt.getDate() + ' ' + MON[dt.getMonth()];
        return 'Next: ' + day + ', ' + this.fmt(sl[0] + delta);
      }
    }
    return 'Fully booked';
  }

  demos() {
    return {
      aesthetic: {
        biz: {
          name: 'Lumen Skin Studio',
          initials: 'LS',
          kind: 'Skin & laser clinic',
          place: 'Poblacion, Makati City',
          off: 8,
          tzId: 'Asia/Manila',
          cur: '₱',
          closed: [0],
          open: 540,
          close: 1080,
          satClose: 900,
          step: 30,
          slug: 'lumen-skin-studio',
        },
        svcNoun: 'service',
        svcTitle: 'Select a service',
        staffNoun: 'Professional',
        staffTitle: 'Choose a professional',
        anyName: 'Any professional',
        anyRole: 'Most availability',
        staffSub: 'Pick someone you know, or let the studio match you with whoever is free first.',
        cats: [
          ['all', 'All'],
          ['pkg', 'Packages'],
          ['consult', 'Consultations'],
          ['facial', 'Facials'],
          ['laser', 'Laser'],
        ],
        services: [
          {
            id: 'a1',
            cat: 'consult',
            name: 'Skin consultation',
            dur: 30,
            price: 0,
            desc: 'Skin assessment and a personalised treatment plan with our doctor.',
          },
          {
            id: 'a2',
            cat: 'facial',
            name: 'Hydrating signature facial',
            dur: 60,
            price: 2800,
            desc: 'Deep cleanse, gentle exfoliation, extractions and a hydrating mask.',
          },
          {
            id: 'a3',
            cat: 'facial',
            name: 'Acne clearing facial',
            dur: 75,
            price: 3200,
            desc: 'Targeted extractions, blue LED and a calming mask.',
          },
          {
            id: 'a4',
            cat: 'laser',
            name: 'Pico laser toning',
            dur: 45,
            price: 4500,
            desc: 'Evens skin tone and fades pigmentation. Numbing cream included.',
          },
          {
            id: 'a5',
            cat: 'laser',
            name: 'Laser hair removal — underarm',
            dur: 30,
            price: 1500,
            desc: 'Diode laser, priced per session.',
          },
          {
            id: 'a6',
            cat: 'pkg',
            pkg: true,
            name: 'Glow reset package',
            dur: 60,
            meta: '60 min per session',
            price: 7500,
            badge: '3 sessions',
            desc: 'Three signature facials. Book your first session now and the rest later.',
            includes: ['3 × Hydrating signature facial', 'Take-home hydrating serum'],
            addons: [
              { id: 'x1', name: 'LED light therapy', price: 800 },
              { id: 'x2', name: 'Neck & décolleté add-on', price: 600 },
            ],
          },
        ],
        staff: [
          { id: 't1', name: 'Dr. Ana Reyes', role: 'Dermatologist', initials: 'AR', color: '#5B4BDB' },
          { id: 't2', name: 'Mia Santos', role: 'Senior aesthetician', initials: 'MS', color: '#0F766E' },
          { id: 't3', name: 'Jules Tan', role: 'Laser specialist', initials: 'JT', color: '#B45309' },
        ],
        questions: [
          { id: 'q1', type: 'yesno', label: 'Is this your first visit with us?', req: true },
          {
            id: 'q2',
            type: 'select',
            label: 'What is your main skin concern?',
            options: ['Acne', 'Pigmentation', 'Dryness', 'Fine lines', 'Something else'],
            req: false,
          },
          {
            id: 'q3',
            type: 'long',
            label: 'Any allergies, medications or recent treatments we should know about?',
            req: false,
          },
        ],
        policy: 'Free cancellation or rescheduling up to 24 hours before your appointment.',
      },
      dental: {
        biz: {
          name: 'Brightside Dental Care',
          initials: 'BD',
          kind: 'Family dental clinic',
          place: 'IT Park, Cebu City',
          off: 8,
          tzId: 'Asia/Manila',
          cur: '₱',
          closed: [0],
          open: 540,
          close: 1080,
          satClose: 720,
          step: 30,
          slug: 'brightside-dental',
        },
        svcNoun: 'treatment',
        svcTitle: 'Select a treatment',
        staffNoun: 'Dentist',
        staffTitle: 'Choose a dentist',
        anyName: 'Any available dentist',
        anyRole: 'Earliest appointment',
        staffSub: 'Returning patients can keep their usual dentist. New patients can take the earliest slot.',
        cats: [
          ['all', 'All'],
          ['pkg', 'Packages'],
          ['general', 'General'],
          ['cosmetic', 'Cosmetic'],
          ['kids', 'Kids'],
        ],
        services: [
          {
            id: 'd1',
            cat: 'general',
            name: 'Check-up & cleaning',
            dur: 45,
            price: 1200,
            desc: 'Exam, scaling and polishing. X-rays quoted separately if needed.',
          },
          {
            id: 'd2',
            cat: 'general',
            name: 'Tooth-colored filling',
            dur: 60,
            price: 1800,
            from: true,
            desc: 'Composite filling, priced per surface.',
          },
          {
            id: 'd3',
            cat: 'general',
            name: 'Emergency visit',
            dur: 30,
            price: 800,
            desc: 'For pain, swelling or a broken tooth.',
          },
          {
            id: 'd4',
            cat: 'cosmetic',
            name: 'In-clinic teeth whitening',
            dur: 90,
            price: 9500,
            desc: 'One-visit whitening with a shade check before and after.',
          },
          {
            id: 'd5',
            cat: 'kids',
            name: "Kids' first visit",
            dur: 30,
            price: 800,
            desc: 'A gentle introduction to the dentist for ages 2 to 6.',
          },
          {
            id: 'd6',
            cat: 'pkg',
            pkg: true,
            name: 'Braces starter package',
            dur: 60,
            meta: '60 min per visit',
            price: 4500,
            badge: '2 visits',
            desc: 'Orthodontic consultation, records and a treatment plan.',
            includes: ['Orthodontic consultation', 'Panoramic X-ray and photos', 'Treatment plan visit'],
            addons: [
              { id: 'y1', name: 'Digital 3D scan', price: 2500 },
              { id: 'y2', name: 'Cleaning before records', price: 1200 },
            ],
          },
        ],
        staff: [
          { id: 'u1', name: 'Dr. Paolo Cruz', role: 'General dentist', initials: 'PC', color: '#1D4ED8' },
          { id: 'u2', name: 'Dr. Bea Lim', role: 'Orthodontist', initials: 'BL', color: '#7C3AED' },
          { id: 'u3', name: 'Dr. Karla Uy', role: 'Pediatric dentist', initials: 'KU', color: '#0F766E' },
        ],
        questions: [
          { id: 'q1', type: 'yesno', label: 'Are you a new patient?', req: true },
          {
            id: 'q2',
            type: 'select',
            label: 'How will you pay?',
            options: ['Cash or card', 'HMO', 'Company account'],
            req: true,
          },
          { id: 'q3', type: 'yesno', label: 'Are you in pain right now?', req: false },
          { id: 'q4', type: 'short', label: 'HMO provider (if paying by HMO)', req: false },
        ],
        policy: 'Please give at least 12 hours notice if you need to cancel or reschedule.',
      },
      events: {
        biz: {
          name: 'Snapshot Booth Co.',
          initials: 'SB',
          kind: 'Photo booth rentals',
          place: 'Serving Los Angeles & Orange County',
          off: -8,
          tzId: 'America/Los_Angeles',
          cur: '$',
          closed: [],
          open: 600,
          close: 1380,
          satClose: 1380,
          step: 60,
          slug: 'snapshot-booth-co',
        },
        svcNoun: 'package',
        svcTitle: 'Choose a package',
        staffNoun: 'Booth',
        staffTitle: 'Choose your booth',
        anyName: 'Any available booth',
        anyRole: 'Most dates open',
        staffSub: 'Each booth has a different look. Pick one, or take whichever is free on your date.',
        deposit: 0.3,
        cats: [
          ['all', 'All'],
          ['pkg', 'Packages'],
          ['booth', 'Booth rentals'],
        ],
        services: [
          {
            id: 'e1',
            cat: 'booth',
            name: '2-hour photo booth',
            dur: 120,
            price: 450,
            desc: 'Unlimited 4×6 prints, digital gallery and an on-site attendant.',
          },
          {
            id: 'e2',
            cat: 'booth',
            name: '3-hour photo booth',
            dur: 180,
            price: 650,
            desc: 'Everything in 2 hours, plus a custom print template.',
          },
          {
            id: 'e3',
            cat: 'booth',
            name: '3-hour 360 video booth',
            dur: 180,
            price: 850,
            desc: 'Slow-motion 360 videos shared by text and QR code.',
          },
          {
            id: 'e4',
            cat: 'pkg',
            pkg: true,
            name: 'Wedding all-inclusive',
            dur: 300,
            price: 1450,
            badge: '5 hours',
            desc: 'Built for receptions: booth, guest book and setup on the day.',
            includes: ['5 hours of booth time', 'Scrapbook guest book with attendant', 'Custom backdrop and props'],
            addons: [
              { id: 'z1', name: 'Extra hour', price: 150 },
              { id: 'z2', name: 'Flower wall backdrop', price: 180 },
              { id: 'z3', name: 'Second booth (360 video)', price: 600 },
            ],
          },
          {
            id: 'e5',
            cat: 'pkg',
            pkg: true,
            name: 'Corporate brand activation',
            dur: 240,
            price: 1200,
            badge: '4 hours',
            desc: 'Branded prints, lead capture and a live slideshow.',
            includes: ['4 hours of booth time', 'Branded print and screen overlays', 'Email and survey lead capture'],
            addons: [
              { id: 'z4', name: 'Extra hour', price: 175 },
              { id: 'z5', name: 'Post-event analytics report', price: 90 },
            ],
          },
        ],
        staff: [
          { id: 'b1', name: 'Classic white booth', role: 'Open-air, fits 8 people', initials: 'CW', color: '#334155' },
          { id: 'b2', name: 'Mirror booth', role: 'Full-length touch screen', initials: 'MB', color: '#0E7490' },
          {
            id: 'b3',
            name: 'Rose gold booth',
            role: 'Enclosed, popular for weddings',
            initials: 'RG',
            color: '#B4235A',
          },
        ],
        questions: [
          {
            id: 'q1',
            type: 'select',
            label: 'What kind of event is it?',
            options: ['Wedding', 'Birthday', 'Corporate', 'School or prom', 'Something else'],
            req: true,
          },
          { id: 'q2', type: 'short', label: 'Venue name and address', req: true },
          { id: 'q3', type: 'short', label: 'Estimated number of guests', req: false },
          { id: 'q4', type: 'yesno', label: 'Is the booth location indoors?', req: false },
        ],
        policy: 'A 30% deposit secures your date and is refundable up to 14 days before the event.',
      },
    };
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var p = this.props || {};
    var INK = '#0F1115',
      LINE = '#E6E7EB',
      LINE2 = '#D9DBE1';
    var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

    var demoProp = String(p.demo || 'Aesthetic clinic');
    var dk = demoProp.indexOf('Dental') === 0 ? 'dental' : demoProp.indexOf('Photo') === 0 ? 'events' : 'aesthetic';
    var D = this.demos()[dk];
    var b = D.biz;
    var T = todayParts(b.tzId);
    var todayKey = this.dkey(new Date(T.y, T.m, T.d));

    var accent = p.accent || '#5B4BDB';
    var rgb = this.rgb(accent);
    var onAccent = this.lum(rgb) > 0.45 ? INK : '#FFFFFF';
    var soft = this.mix(rgb, 0.09);

    var embed = !!p.embed;
    var phone = !!p.phone || (s.w > 0 && s.w < 760);

    var svc =
      D.services.filter(function (x) {
        return x.id === s.serviceId;
      })[0] || null;
    var dur = svc ? svc.dur : 60;
    var TZ = this.tzs();
    var tzId = s.tz || b.tzId;
    var tz =
      TZ.filter(function (z) {
        return z.id === tzId;
      })[0] || TZ[0];
    var delta = (tz.off - b.off) * 60;
    var gmt = function (o) {
      return 'GMT' + (o >= 0 ? '+' : '-') + Math.abs(o);
    };
    var staffKey = s.staffId || 'any';

    // ---------- step 1: categories + services
    var catKey = D.cats.some(function (c) {
      return c[0] === s.cat;
    })
      ? s.cat
      : 'all';
    var cats = D.cats.map(function (c) {
      var on = c[0] === catKey;
      return {
        label: c[1],
        on: on,
        bg: on ? INK : '#FFFFFF',
        fg: on ? '#FFFFFF' : INK,
        border: on ? INK : LINE2,
        pick: function () {
          self.setState({ cat: c[0] });
        },
      };
    });
    var svcList = D.services
      .filter(function (x) {
        return catKey === 'all' || x.cat === catKey;
      })
      .map(function (x) {
        var on = s.serviceId === x.id;
        return {
          name: x.name,
          desc: x.desc,
          pkg: !!x.pkg,
          badge: x.badge || '',
          includes: x.includes || [],
          durLabel: x.meta || self.durLabel(x.dur),
          priceLabel: (x.from ? 'from ' : '') + self.money(b.cur, x.price),
          on: on,
          off: !on,
          bg: on ? soft : '#FFFFFF',
          border: on ? accent : LINE,
          ring: on ? accent : 'transparent',
          iconBg: on ? accent : '#FFFFFF',
          iconFg: on ? onAccent : INK,
          iconBorder: on ? accent : LINE2,
          showAddons: on && !!(x.addons && x.addons.length),
          addonList: (x.addons || []).map(function (a) {
            return {
              name: a.name,
              price: self.money(b.cur, a.price),
              on: s.addons.indexOf(a.id) >= 0,
              toggle: function () {
                var cur = self.state.addons.slice();
                var i = cur.indexOf(a.id);
                if (i >= 0) cur.splice(i, 1);
                else cur.push(a.id);
                self.setState({ addons: cur });
              },
            };
          }),
          pick: function () {
            self.setState({
              serviceId: x.id,
              addons: self.state.serviceId === x.id ? self.state.addons : [],
              time: null,
            });
          },
        };
      });

    // ---------- step 2: staff / resources
    var staffAll = [{ id: 'any', any: true, name: D.anyName, role: D.anyRole, initials: '', color: accent }].concat(
      D.staff,
    );
    var staffList = staffAll.map(function (st) {
      var on = s.staffId === st.id;
      return {
        name: st.name,
        role: st.role,
        initials: st.initials,
        any: !!st.any,
        notAny: !st.any,
        on: on,
        next: self.nextLabel(D, st.id, dur, delta),
        bg: on ? soft : '#FFFFFF',
        border: on ? accent : LINE,
        ring: on ? accent : 'transparent',
        avBg: st.any ? soft : st.color,
        avFg: st.any ? accent : '#FFFFFF',
        pick: function () {
          self.setState({ staffId: st.id, time: null });
        },
      };
    });
    var staffSel = s.staffId
      ? staffAll.filter(function (x) {
          return x.id === s.staffId;
        })[0] || null
      : null;

    // ---------- step 3: calendar
    var firstAvail = null;
    for (var i = 0; i <= 60 && !firstAvail; i++) {
      var fdt = new Date(T.y, T.m, T.d + i);
      if (this.slotsFor(D, fdt, staffKey, dur).length) firstAvail = this.dkey(fdt);
    }
    var selKey = s.date || firstAvail;
    var mo = new Date(T.y, T.m + s.monthOffset, 1);
    var cy = mo.getFullYear(),
      cm = mo.getMonth();
    var lead = mo.getDay();
    var dim = new Date(cy, cm + 1, 0).getDate();
    var cells = [];
    for (var bI = 0; bI < lead; bI++)
      cells.push({
        blank: true,
        isDay: false,
        d: '',
        disabled: true,
        selected: false,
        aria: '',
        bg: 'transparent',
        fg: INK,
        dot: 'transparent',
        ring: 'transparent',
        weight: 400,
        cursor: 'default',
        pick: null,
      });
    for (let d = 1; d <= dim; d++) {
      let dt = new Date(cy, cm, d);
      let k = this.dkey(dt);
      let avail = this.slotsFor(D, dt, staffKey, dur).length > 0;
      let sel = k === selKey;
      let isToday = k === todayKey;
      cells.push({
        blank: false,
        isDay: true,
        d: d,
        disabled: !avail,
        selected: sel,
        aria: WDL[dt.getDay()] + ' ' + d + ' ' + MONL[cm] + (avail ? '' : ', unavailable'),
        bg: sel ? accent : 'transparent',
        fg: sel ? onAccent : avail ? INK : '#A9AEB8',
        weight: avail ? 600 : 400,
        dot: sel ? onAccent : avail ? accent : 'transparent',
        ring: isToday && !sel ? LINE2 : 'transparent',
        cursor: avail ? 'pointer' : 'default',
        pick: function () {
          self.setState({ date: k, time: null });
        },
      });
    }
    var cal = {
      title: MONL[cm] + ' ' + cy,
      wd: WD,
      cells: cells,
      prevDisabled: s.monthOffset <= 0,
      nextDisabled: s.monthOffset >= 2,
      prevColor: s.monthOffset <= 0 ? '#C4C7CE' : INK,
      nextColor: s.monthOffset >= 2 ? '#C4C7CE' : INK,
      prev: function () {
        if (self.state.monthOffset > 0) self.setState({ monthOffset: self.state.monthOffset - 1 });
      },
      next: function () {
        if (self.state.monthOffset < 2) self.setState({ monthOffset: self.state.monthOffset + 1 });
      },
    };

    // ---------- step 3: slots
    var selDt = selKey ? this.pdate(selKey) : null;
    var raw = selDt ? this.slotsFor(D, selDt, staffKey, dur) : [];
    var gm = { Morning: [], Afternoon: [], Evening: [] };
    raw.forEach(function (t) {
      var disp = t + delta;
      var shift = Math.floor(disp / 1440);
      var norm = ((disp % 1440) + 1440) % 1440;
      var g = norm < 720 ? 'Morning' : norm < 1020 ? 'Afternoon' : 'Evening';
      var on = s.time === t && s.date === selKey;
      gm[g].push({
        norm: norm,
        label: self.fmt(disp),
        shift: shift !== 0,
        shiftLabel: shift > 0 ? 'next day' : 'previous day',
        on: on,
        bg: on ? accent : '#FFFFFF',
        fg: on ? onAccent : INK,
        border: on ? accent : LINE2,
        pick: function () {
          self.setState({ time: t, date: selKey });
        },
      });
    });
    var groups = ['Morning', 'Afternoon', 'Evening']
      .filter(function (g) {
        return gm[g].length;
      })
      .map(function (g) {
        return {
          label: g,
          items: gm[g].sort(function (x, y) {
            return x.norm - y.norm;
          }),
        };
      });
    var slots = {
      dateLabel: selDt ? WDL[selDt.getDay()] + ', ' + selDt.getDate() + ' ' + MONL[selDt.getMonth()] : 'Select a date',
      countLabel: raw.length ? raw.length + ' start times available' : 'Fully booked',
      empty: !raw.length,
      groups: groups,
    };

    // ---------- summary
    var addSel =
      svc && svc.addons
        ? svc.addons.filter(function (a) {
            return s.addons.indexOf(a.id) >= 0;
          })
        : [];
    var total =
      (svc ? svc.price : 0) +
      addSel.reduce(function (n, a) {
        return n + a.price;
      }, 0);
    var totalLabel = svc ? (svc.from ? 'from ' : '') + this.money(b.cur, total) : '—';
    var hasWhen = !!svc && s.time !== null && s.time !== undefined && !!s.date;
    var whenDate = '',
      whenTime = '',
      clinicTime = '',
      whenShort = '';
    if (hasWhen) {
      var wd0 = this.pdate(s.date);
      var ds = s.time + delta;
      var shiftDays = Math.floor(ds / 1440);
      var shown = new Date(wd0.getFullYear(), wd0.getMonth(), wd0.getDate() + shiftDays);
      whenDate =
        WDL[shown.getDay()] + ', ' + shown.getDate() + ' ' + MONL[shown.getMonth()] + ' ' + shown.getFullYear();
      whenTime = this.fmt(ds) + ' – ' + this.fmt(ds + dur) + ' (' + gmt(tz.off) + ')';
      whenShort = WD[shown.getDay()] + ' ' + shown.getDate() + ' ' + MON[shown.getMonth()] + ', ' + this.fmt(ds);
      if (delta !== 0) clinicTime = b.name + ' local time: ' + this.fmt(s.time) + ' (' + gmt(b.off) + ')';
    }
    var sum = {
      noService: !svc,
      hasService: !!svc,
      svcName: svc ? svc.name : '',
      svcMeta: svc ? svc.meta || this.durLabel(svc.dur) : '',
      svcPrice: svc ? (svc.from ? 'from ' : '') + this.money(b.cur, svc.price) : '',
      addons: addSel.map(function (a) {
        return { name: a.name, price: self.money(b.cur, a.price) };
      }),
      hasStaff: !!staffSel,
      staffLine: staffSel ? (staffSel.any ? D.anyName : 'With ' + staffSel.name) : '',
      staffInitials: staffSel ? (staffSel.any ? 'ANY' : staffSel.initials) : '',
      staffAvBg: staffSel ? (staffSel.any ? soft : staffSel.color) : '#FFFFFF',
      staffAvFg: staffSel && staffSel.any ? accent : '#FFFFFF',
      hasWhen: hasWhen,
      whenDate: whenDate,
      whenTime: whenTime,
      hasClinicTime: !!clinicTime,
      clinicTime: clinicTime,
      total: totalLabel,
      hasDeposit: !!D.deposit && !!svc,
      deposit:
        D.deposit && svc
          ? Math.round(D.deposit * 100) +
            '% deposit (' +
            this.money(b.cur, Math.round(total * D.deposit)) +
            ') due after the business confirms'
          : '',
    };

    // ---------- step 4: questions + validation
    var ans = s.answers || {};
    var qList = D.questions.map(function (q) {
      var v = ans[q.id] || '';
      var set = function (val) {
        var a = Object.assign({}, self.state.answers);
        a[q.id] = val;
        self.setState({ answers: a });
      };
      var opts = q.type === 'yesno' ? ['Yes', 'No'] : q.options || [];
      return {
        fid: 'q-' + q.id,
        label: q.label,
        req: !!q.req,
        isChoice: q.type === 'yesno' || q.type === 'select',
        isShort: q.type === 'short',
        isLong: q.type === 'long',
        value: v,
        onInput: function (e) {
          set(e.target.value);
        },
        choices: opts.map(function (o, oi) {
          var on = v === o;
          return {
            id: oi === 0 ? 'q-' + q.id : 'q-' + q.id + '-' + oi,
            label: o,
            on: on,
            bg: on ? soft : '#FFFFFF',
            border: on ? accent : LINE2,
            ring: on ? accent : 'transparent',
            weight: on ? 700 : 500,
            pick: function () {
              set(o);
            },
          };
        }),
      };
    });
    var reqOk = D.questions.every(function (q) {
      return !q.req || String(ans[q.id] || '').trim();
    });
    var formOk = !!(s.first.trim() && /.+@.+\..+/.test(s.email) && s.agree && reqOk);
    var can = [false, !!svc, !!staffSel, hasWhen, formOk, false][s.step] || false;
    var hints = [
      '',
      'Choose a ' + D.svcNoun + ' to continue.',
      'Choose a ' + D.staffNoun.toLowerCase() + ' option to continue.',
      'Pick a start time to continue.',
      'Fill in the required fields (*) to continue.',
      '',
    ];
    var titles = ['', D.svcTitle, D.staffTitle, 'Pick a date & time', 'Your details', ''];
    var subs = [
      '',
      'Packages can be customized with add-ons before you continue.',
      D.staffSub,
      'Highlighted dates have open times. Times follow the time zone you choose.',
      'We only use these details to manage your booking.',
      '',
    ];
    var shorts = ['', 'Service', D.staffNoun, 'Date & time', 'Details', ''];

    var labels = ['Service', D.staffNoun, 'Date & time', 'Details'];
    var steps = labels.map(function (l, idx) {
      var n = idx + 1,
        done = n < s.step,
        cur = n === s.step;
      return {
        n: n,
        label: l,
        done: done,
        notDone: !done,
        sep: n < 4,
        locked: !done,
        cursor: done ? 'pointer' : 'default',
        ariaCurrent: cur ? 'step' : undefined,
        circleBg: done ? accent : cur ? INK : '#EEEFF2',
        circleFg: done ? onAccent : cur ? '#FFFFFF' : '#5B616E',
        labelColor: done || cur ? INK : '#5B616E',
        pillBg: cur ? '#EEEFF2' : 'transparent',
        bar: n < s.step ? accent : n === s.step ? INK : LINE,
        go: function () {
          if (done) self.setState({ step: n });
        },
      };
    });

    var refNum = (this.hash(String(s.serviceId) + String(s.date) + String(s.time) + s.email) % 900000) + 100000;
    var confRows = [
      [
        D.svcNoun.charAt(0).toUpperCase() + D.svcNoun.slice(1),
        svc ? svc.name + (addSel.length ? ' + ' + addSel.length + ' add-on' + (addSel.length > 1 ? 's' : '') : '') : '',
      ],
      [D.staffNoun, staffSel ? staffSel.name : ''],
      ['When', whenDate + '\n' + whenTime],
      ['Where', b.place],
      ['Total', totalLabel],
    ].map(function (r, ri, arr) {
      return { k: r[0], v: r[1], line: ri < arr.length - 1 ? '#EEEFF2' : 'transparent' };
    });

    var calLinks = { gcal: '#', ics: '#' };
    if (hasWhen) {
      var cd = this.pdate(s.date);
      var startUtc = Date.UTC(cd.getFullYear(), cd.getMonth(), cd.getDate()) + (s.time - b.off * 60) * 60000;
      var ev = {
        title: (svc ? svc.name : '') + ' · ' + b.name,
        start: new Date(startUtc), end: new Date(startUtc + dur * 60000),
        location: b.place, details: 'Booking reference BK-' + refNum + '. ' + D.policy,
        uid: 'BK-' + refNum + '@' + b.slug
      };
      calLinks = { gcal: googleCalendarUrl(ev), ics: icsDataUrl(ev) };
    }

    var fieldSetter = function (key) {
      return function (e) {
        var o = {};
        o[key] = e.target.value;
        self.setState(o);
      };
    };

    return {
      rootRef: this.rootRef,
      minH: p.minh || (embed ? '0px' : p.phone ? '844px' : '100vh'),
      pageBg: embed || phone ? '#FFFFFF' : '#F7F7F8',
      maxW: embed ? '100%' : '1160px',
      pad: phone ? '12px 16px 24px' : embed ? '24px' : '28px 32px 40px',
      h2Size: phone ? '22px' : '26px',
      accent: accent,
      onAccent: onAccent,
      soft: soft,
      biz: b,
      svcNoun: D.svcNoun,
      policy: D.policy,
      tzShort: tz.city + ' · ' + gmt(tz.off),
      showHeader: !embed && !phone,
      showPhoneHeader: !embed && phone,
      showFull: !(phone || embed) && s.step < 5,
      showCompact: (phone || embed) && s.step < 5,
      showStepperBack: embed && s.step > 1 && s.step < 5,
      showTitle: s.step < 5,
      showAside: !phone,
      showBar: phone && s.step < 5,
      showFooter: !embed,
      canBack: s.step > 1 && s.step < 5,
      back: function () {
        if (self.state.step > 1) {
          var pv = self.state.step - 1;
          if (pv === 2 && p.hideStaff) pv = 1; // &hide_staff=1 skips the staff step
          self.setState({ step: pv });
        }
      },
      steps: steps,
      stepNum: Math.min(s.step, 4),
      stepShort: shorts[s.step] || '',
      stepTitle: titles[s.step] || '',
      stepSub: subs[s.step] || '',
      isStep1: s.step === 1,
      isStep2: s.step === 2,
      isStep3: s.step === 3,
      isStep4: s.step === 4,
      isStep5: s.step === 5,
      cats: cats,
      svcList: svcList,
      staffList: staffList,
      tzValue: tz.id,
      setTz: function (e) {
        self.setState({ tz: e.target.value });
      },
      tzDiffers: delta !== 0,
      tzNote: 'Times are shown in ' + tz.city + ' time (' + gmt(tz.off) + '). ' + b.name + ' is in ' + gmt(b.off) + '.',
      cal: cal,
      slots: slots,
      first: s.first,
      last: s.last,
      email: s.email,
      phone: s.phone,
      cc: s.cc,
      setFirst: fieldSetter('first'),
      setLast: fieldSetter('last'),
      setEmail: fieldSetter('email'),
      setPhone: fieldSetter('phone'),
      setCc: fieldSetter('cc'),
      qList: qList,
      agree: s.agree,
      sms: s.sms,
      toggleAgree: function () {
        self.setState({ agree: !self.state.agree });
      },
      toggleSms: function () {
        self.setState({ sms: !self.state.sms });
      },
      sum: sum,
      showCta: s.step < 5,
      ctaLabel: s.step === 4 ? 'Confirm booking' : 'Continue',
      ctaDisabled: !can,
      ctaBg: can ? INK : '#E6E7EB',
      ctaFg: can ? '#FFFFFF' : '#6B7280',
      ctaCursor: can ? 'pointer' : 'not-allowed',
      showHint: !can && s.step < 5,
      ctaHint: hints[s.step] || '',
      next: function () {
        if (!can) return;
        var nx = s.step === 4 ? 5 : s.step + 1;
        if (nx === 2 && p.hideStaff) nx = 3; // &hide_staff=1 skips the staff step
        self.setState({ step: nx });
      },
      conf: { email: s.email || 'your email', ref: 'BK-' + refNum, rows: confRows, gcalHref: calLinks.gcal, icsHref: calLinks.ics, icsName: 'BK-' + refNum + '.ics' },
      reset: function () {
        self.setState({
          step: 1,
          cat: 'all',
          serviceId: null,
          addons: [],
          staffId: p.hideStaff ? 'any' : null,
          monthOffset: 0,
          date: null,
          time: null,
          answers: {},
          agree: false,
        });
      },
      bar: {
        top: svc ? totalLabel : 'Nothing selected',
        sub: svc
          ? [svc.name, hasWhen ? whenShort : svc.meta || self.durLabel(svc.dur)].join(' · ')
          : 'Choose a ' + D.svcNoun + ' to get started',
      },
    };
  }
}

export default class BookingPage extends BookingPageLogic {
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
          background: v.pageBg,
          color: '#0F1115',
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: '15px',
          lineHeight: '22px',
          boxSizing: 'border-box',
        }}
      >
        {v.showHeader ? (
          <>
            <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E7EB' }}>
              <div
                style={{
                  maxWidth: '1160px',
                  margin: '0 auto',
                  padding: '16px 32px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: v.accent,
                    color: v.onAccent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                    fontWeight: '800',
                    fontSize: '17px',
                    flex: '0 0 auto',
                  }}
                >
                  {v.biz?.initials}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 240px', minWidth: '0' }}>
                  <h1
                    style={{
                      margin: '0',
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: '20px',
                      lineHeight: '26px',
                      fontWeight: '800',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {v.biz?.name}
                  </h1>
                  <span
                    style={{
                      fontSize: '13px',
                      lineHeight: '18px',
                      color: '#5B616E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {v.biz?.kind}
                    <span aria-hidden="true" style={{ color: '#A9AEB8' }}>
                      •
                    </span>
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
                      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    {v.biz?.place}
                  </span>
                </div>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#4A505C',
                    border: '1px solid #E6E7EB',
                    borderRadius: '999px',
                    padding: '7px 12px',
                    background: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
                  </svg>{' '}
                  {v.tzShort}
                </span>
              </div>
            </header>
          </>
        ) : null}
        {v.showPhoneHeader ? (
          <>
            <div style={{ padding: '14px 16px 4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {v.canBack ? (
                <>
                  <button
                    type="button"
                    onClick={v.back}
                    aria-label="Go back"
                    style={{
                      width: '44px',
                      height: '44px',
                      flex: '0 0 auto',
                      borderRadius: '999px',
                      border: '1px solid #D9DBE1',
                      background: '#FFFFFF',
                      color: '#0F1115',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '0',
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
                      <path d="M19 12H5M11 6l-6 6 6 6" />
                    </svg>
                  </button>
                </>
              ) : null}
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: v.accent,
                  color: v.onAccent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontWeight: '800',
                  fontSize: '14px',
                  flex: '0 0 auto',
                }}
              >
                {v.biz?.initials}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                    fontSize: '16px',
                    lineHeight: '20px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {v.biz?.name}
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
                  {v.biz?.place}
                </span>
              </div>
            </div>
          </>
        ) : null}
        <div
          style={{
            flex: '1 0 auto',
            width: '100%',
            maxWidth: v.maxW,
            margin: '0 auto',
            padding: v.pad,
            boxSizing: 'border-box',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '32px',
            alignItems: 'flex-start',
          }}
        >
          <main style={{ flex: '999 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {v.showFull ? (
              <>
                <nav
                  aria-label="Booking steps"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                >
                  {v.canBack ? (
                    <>
                      <button
                        type="button"
                        onClick={v.back}
                        aria-label="Go back"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '999px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          color: '#0F1115',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          marginRight: '6px',
                          padding: '0',
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
                          <path d="M19 12H5M11 6l-6 6 6 6" />
                        </svg>
                      </button>
                    </>
                  ) : null}
                  {(v.steps || []).map((sp, sp_i) => (
                    <React.Fragment key={sp_i}>
                      <button
                        type="button"
                        onClick={sp?.go}
                        disabled={sp?.locked}
                        aria-current={sp?.ariaCurrent}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          height: '40px',
                          padding: '0 14px 0 6px',
                          borderRadius: '999px',
                          border: '0',
                          background: sp?.pillBg,
                          color: sp?.labelColor,
                          fontFamily: 'inherit',
                          cursor: sp?.cursor,
                        }}
                      >
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '700',
                            background: sp?.circleBg,
                            color: sp?.circleFg,
                          }}
                        >
                          {sp?.done ? (
                            <>
                              <svg
                                aria-hidden="true"
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                            </>
                          ) : null}
                          {sp?.notDone ? <>{sp?.n}</> : null}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{sp?.label}</span>
                      </button>
                      {sp?.sep ? (
                        <>
                          <span aria-hidden="true" style={{ width: '16px', height: '1px', background: '#D9DBE1' }} />
                        </>
                      ) : null}
                    </React.Fragment>
                  ))}
                </nav>
              </>
            ) : null}
            {v.showCompact ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '24px' }}>
                    {v.showStepperBack ? (
                      <>
                        <button
                          type="button"
                          onClick={v.back}
                          aria-label="Go back"
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '999px',
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
                            <path d="M19 12H5M11 6l-6 6 6 6" />
                          </svg>
                        </button>
                      </>
                    ) : null}
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
                      {v.stepNum}
                      {' of 4 · '}
                      {v.stepShort}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
                    {(v.steps || []).map((sp, sp_i) => (
                      <React.Fragment key={sp_i}>
                        <span style={{ height: '4px', borderRadius: '999px', background: sp?.bar }} />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {v.showTitle ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h2
                    style={{
                      margin: '0',
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: v.h2Size,
                      lineHeight: '1.25',
                      fontWeight: '800',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {v.stepTitle}
                  </h2>
                  <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>{v.stepSub}</p>
                </div>
              </>
            ) : null}
            {v.isStep1 ? (
              <>
                <section aria-label="Services" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 2px 6px' }}>
                    {(v.cats || []).map((c, c_i) => (
                      <React.Fragment key={c_i}>
                        <button
                          type="button"
                          onClick={c?.pick}
                          aria-pressed={c?.on}
                          style={{
                            flex: '0 0 auto',
                            height: '40px',
                            padding: '0 16px',
                            borderRadius: '999px',
                            border: `1px solid ${c?.border}`,
                            background: c?.bg,
                            color: c?.fg,
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c?.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(v.svcList || []).map((sv, sv_i) => (
                      <React.Fragment key={sv_i}>
                        <div
                          style={{
                            border: `1px solid ${sv?.border}`,
                            boxShadow: `0 0 0 1px ${sv?.ring}`,
                            background: sv?.bg,
                            borderRadius: '14px',
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            onClick={sv?.pick}
                            aria-pressed={sv?.on}
                            style={{
                              display: 'flex',
                              width: '100%',
                              gap: '16px',
                              alignItems: 'flex-start',
                              padding: '16px 18px',
                              background: 'transparent',
                              border: '0',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              color: 'inherit',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span
                              style={{
                                flex: '1 1 auto',
                                minWidth: '0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '16px', lineHeight: '22px', fontWeight: '600' }}>
                                  {sv?.name}
                                </span>
                                {sv?.pkg ? (
                                  <>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        lineHeight: '16px',
                                        fontWeight: '700',
                                        padding: '3px 8px',
                                        borderRadius: '999px',
                                        background: '#F1F1F4',
                                        color: '#2B2F36',
                                      }}
                                    >
                                      {'Package · '}
                                      {sv?.badge}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              <span
                                style={{
                                  fontSize: '13px',
                                  lineHeight: '18px',
                                  color: '#5B616E',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
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
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M12 7v5l3 2" />
                                </svg>{' '}
                                {sv?.durLabel}
                              </span>
                              <span style={{ fontSize: '14px', lineHeight: '20px', color: '#4A505C' }}>{sv?.desc}</span>
                              {sv?.pkg ? (
                                <>
                                  <span
                                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}
                                  >
                                    {(sv?.includes || []).map((inc, inc_i) => (
                                      <React.Fragment key={inc_i}>
                                        <span
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            lineHeight: '18px',
                                            color: '#2B2F36',
                                          }}
                                        >
                                          <svg
                                            aria-hidden="true"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#0E7A4F"
                                            strokeWidth="2.4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                                          </svg>{' '}
                                          {inc}
                                        </span>
                                      </React.Fragment>
                                    ))}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            <span
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '10px',
                                flex: '0 0 auto',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '15px',
                                  lineHeight: '22px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sv?.priceLabel}
                              </span>
                              <span
                                aria-hidden="true"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '999px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: sv?.iconBg,
                                  color: sv?.iconFg,
                                  border: `1px solid ${sv?.iconBorder}`,
                                  boxSizing: 'border-box',
                                }}
                              >
                                {sv?.on ? (
                                  <>
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
                                  </>
                                ) : null}
                                {sv?.off ? (
                                  <>
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 5v14M5 12h14" />
                                    </svg>
                                  </>
                                ) : null}
                              </span>
                            </span>
                          </button>{' '}
                          {sv?.showAddons ? (
                            <>
                              <div
                                style={{
                                  borderTop: '1px solid #E6E7EB',
                                  padding: '12px 18px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  background: '#FFFFFF',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: '16px',
                                    fontWeight: '700',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: '#5B616E',
                                    padding: '4px 0',
                                  }}
                                >
                                  Customize with add-ons
                                </span>
                                {(sv?.addonList || []).map((ad, ad_i) => (
                                  <React.Fragment key={ad_i}>
                                    <label
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        minHeight: '44px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={ad?.on}
                                        onChange={ad?.toggle}
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          margin: '0',
                                          accentColor: v.accent,
                                          flex: '0 0 auto',
                                        }}
                                      />
                                      <span style={{ flex: '1 1 auto', fontSize: '14px', lineHeight: '20px' }}>
                                        {ad?.name}
                                      </span>
                                      <span style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                        +{ad?.price}
                                      </span>
                                    </label>
                                  </React.Fragment>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
            {v.isStep2 ? (
              <>
                <section
                  aria-label="Staff"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}
                >
                  {(v.staffList || []).map((st, st_i) => (
                    <React.Fragment key={st_i}>
                      <button
                        type="button"
                        onClick={st?.pick}
                        aria-pressed={st?.on}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '8px',
                          padding: '20px 12px 16px',
                          borderRadius: '14px',
                          border: `1px solid ${st?.border}`,
                          boxShadow: `0 0 0 1px ${st?.ring}`,
                          background: st?.bg,
                          fontFamily: 'inherit',
                          color: 'inherit',
                          cursor: 'pointer',
                          minHeight: '176px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '999px',
                            background: st?.avBg,
                            color: st?.avFg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '17px',
                            flex: '0 0 auto',
                          }}
                        >
                          {st?.any ? (
                            <>
                              <svg
                                aria-hidden="true"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="9" cy="8.5" r="3.5" />
                                <path d="M2.5 19.5c.9-3 3.4-4.8 6.5-4.8s5.6 1.8 6.5 4.8" />
                                <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.9c2 .6 3.4 2.2 4 4.6" />
                              </svg>
                            </>
                          ) : null}
                          {st?.notAny ? <>{st?.initials}</> : null}
                        </span>
                        <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '600' }}>{st?.name}</span>
                        <span style={{ fontSize: '13px', lineHeight: '18px', color: '#5B616E' }}>{st?.role}</span>
                        <span
                          style={{
                            marginTop: 'auto',
                            fontSize: '12px',
                            lineHeight: '16px',
                            fontWeight: '600',
                            color: '#0B6B45',
                            background: '#E7F6EE',
                            borderRadius: '999px',
                            padding: '4px 10px',
                          }}
                        >
                          {st?.next}
                        </span>
                      </button>
                    </React.Fragment>
                  ))}
                </section>
              </>
            ) : null}
            {v.isStep3 ? (
              <>
                <section aria-label="Date and time" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
                    <label htmlFor="tz-select" style={{ fontSize: '13px', fontWeight: '600', color: '#2B2F36' }}>
                      Time zone
                    </label>
                    <span
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        flex: '1 1 240px',
                        maxWidth: '340px',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5B616E"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
                      </svg>
                      <select
                        id="tz-select"
                        value={v.tzValue}
                        onChange={v.setTz}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          width: '100%',
                          height: '44px',
                          padding: '0 36px 0 38px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          background: '#FFFFFF',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color: '#0F1115',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="Asia/Manila">(GMT+8) Manila</option>
                        <option value="Asia/Singapore">(GMT+8) Singapore</option>
                        <option value="Australia/Perth">(GMT+8) Perth</option>
                        <option value="Australia/Brisbane">(GMT+10) Brisbane</option>
                        <option value="Australia/Sydney">(GMT+11) Sydney, Melbourne</option>
                        <option value="Asia/Dubai">(GMT+4) Dubai</option>
                        <option value="Europe/London">(GMT+0) London</option>
                        <option value="America/New_York">(GMT-5) New York</option>
                        <option value="America/Los_Angeles">(GMT-8) Los Angeles</option>
                      </select>
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5B616E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                  {v.tzDiffers ? (
                    <>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '13px',
                          lineHeight: '18px',
                          color: '#2B2F36',
                          background: '#FEF6E7',
                          border: '1px solid #F6E2B8',
                          borderRadius: '10px',
                          padding: '10px 12px',
                        }}
                      >
                        {v.tzNote}
                      </p>
                    </>
                  ) : null}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        flex: '1 1 300px',
                        minWidth: '0',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        padding: '16px',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={v.cal?.prev}
                          disabled={v.cal?.prevDisabled}
                          aria-label="Previous month"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid #E6E7EB',
                            background: '#FFFFFF',
                            color: v.cal?.prevColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '0',
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
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>{v.cal?.title}</span>
                        <button
                          type="button"
                          onClick={v.cal?.next}
                          disabled={v.cal?.nextDisabled}
                          aria-label="Next month"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid #E6E7EB',
                            background: '#FFFFFF',
                            color: v.cal?.nextColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '0',
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
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>{' '}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
                        {(v.cal?.wd || []).map((w, w_i) => (
                          <React.Fragment key={w_i}>
                            <span
                              style={{
                                textAlign: 'center',
                                fontSize: '12px',
                                lineHeight: '16px',
                                fontWeight: '600',
                                color: '#6B7280',
                                padding: '6px 0',
                              }}
                            >
                              {w}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>{' '}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
                        {(v.cal?.cells || []).map((c, c_i) => (
                          <React.Fragment key={c_i}>
                            {c?.blank ? (
                              <>
                                <span aria-hidden="true" style={{ height: '44px' }} />
                              </>
                            ) : null}
                            {c?.isDay ? (
                              <>
                                <button
                                  type="button"
                                  onClick={c?.pick}
                                  disabled={c?.disabled}
                                  aria-pressed={c?.selected}
                                  aria-label={c?.aria}
                                  style={{
                                    height: '44px',
                                    width: '100%',
                                    borderRadius: '12px',
                                    border: `1px solid ${c?.ring}`,
                                    background: c?.bg,
                                    color: c?.fg,
                                    fontFamily: 'inherit',
                                    fontWeight: c?.weight,
                                    cursor: c?.cursor,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    padding: '0',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <span style={{ fontSize: '14px', lineHeight: '16px' }}>{c?.d}</span>
                                  <span
                                    aria-hidden="true"
                                    style={{ width: '4px', height: '4px', borderRadius: '999px', background: c?.dot }}
                                  />
                                </button>
                              </>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </div>{' '}
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          marginTop: '12px',
                          fontSize: '12px',
                          lineHeight: '16px',
                          color: '#5B616E',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            aria-hidden="true"
                            style={{ width: '6px', height: '6px', borderRadius: '999px', background: v.accent }}
                          />
                          Times available
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            aria-hidden="true"
                            style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid #D9DBE1' }}
                          />
                          Today
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        flex: '1 1 260px',
                        minWidth: '0',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        padding: '16px',
                        background: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>
                          {v.slots?.dateLabel}
                        </span>
                        <span style={{ fontSize: '13px', lineHeight: '18px', color: '#5B616E' }}>
                          {v.slots?.countLabel}
                        </span>
                      </div>
                      {v.slots?.empty ? (
                        <>
                          <p
                            style={{
                              margin: '0',
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#4A505C',
                              background: '#F7F7F8',
                              borderRadius: '10px',
                              padding: '14px',
                            }}
                          >
                            No times left on this day for this selection. Pick another highlighted date.
                          </p>
                        </>
                      ) : null}
                      {(v.slots?.groups || []).map((g, g_i) => (
                        <React.Fragment key={g_i}>
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
                              {g?.label}
                            </span>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                                gap: '8px',
                              }}
                            >
                              {(g?.items || []).map((sl, sl_i) => (
                                <React.Fragment key={sl_i}>
                                  <button
                                    type="button"
                                    onClick={sl?.pick}
                                    aria-pressed={sl?.on}
                                    style={{
                                      height: '44px',
                                      borderRadius: '10px',
                                      border: `1px solid ${sl?.border}`,
                                      background: sl?.bg,
                                      color: sl?.fg,
                                      fontFamily: 'inherit',
                                      fontSize: '14px',
                                      lineHeight: '16px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0 4px',
                                    }}
                                  >
                                    {sl?.label}{' '}
                                    {sl?.shift ? (
                                      <>
                                        <span style={{ fontSize: '10px', lineHeight: '12px', fontWeight: '600' }}>
                                          {sl?.shiftLabel}
                                        </span>
                                      </>
                                    ) : null}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            ) : null}
            {v.isStep4 ? (
              <>
                <section aria-label="Your details" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '20px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
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
                          minWidth: '0',
                        }}
                      >
                        <span>
                          {'First name '}
                          <span style={{ color: '#C2362B' }}>*</span>
                        </span>
                        <input
                          type="text"
                          value={v.first}
                          onChange={v.setFirst}
                          placeholder="Maria"
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
                            minWidth: '0',
                          }}
                        />
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
                          minWidth: '0',
                        }}
                      >
                        <span>Last name</span>
                        <input
                          type="text"
                          value={v.last}
                          onChange={v.setLast}
                          placeholder="Dela Cruz"
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
                            minWidth: '0',
                          }}
                        />
                      </label>
                    </div>
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
                        value={v.email}
                        onChange={v.setEmail}
                        placeholder="you@example.com"
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
                      <label
                        htmlFor="phone-input"
                        style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                      >
                        Mobile number
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          aria-label="Country code"
                          value={v.cc}
                          onChange={v.setCc}
                          style={{
                            height: '48px',
                            border: '1px solid #D9DBE1',
                            borderRadius: '10px',
                            padding: '0 10px',
                            fontFamily: 'inherit',
                            fontSize: '15px',
                            color: '#0F1115',
                            background: '#FFFFFF',
                            flex: '0 0 96px',
                          }}
                        >
                          <option value="+63">PH +63</option>
                          <option value="+61">AU +61</option>
                          <option value="+1">US +1</option>
                          <option value="+65">SG +65</option>
                          <option value="+44">UK +44</option>
                        </select>
                        <input
                          id="phone-input"
                          type="tel"
                          value={v.phone}
                          onChange={v.setPhone}
                          placeholder="917 000 0000"
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
                            flex: '1 1 auto',
                            minWidth: '0',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '20px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>
                        {'Questions from '}
                        {v.biz?.name}
                      </span>
                      <span style={{ fontSize: '13px', lineHeight: '18px', color: '#5B616E' }}>
                        {'Set by the business for this '}
                        {v.svcNoun}.
                      </span>
                    </div>
                    {(v.qList || []).map((q, q_i) => (
                      <React.Fragment key={q_i}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label
                            htmlFor={q?.fid}
                            style={{ fontSize: '14px', lineHeight: '20px', fontWeight: '600', color: '#0F1115' }}
                          >
                            {q?.label}
                            {q?.req ? (
                              <>
                                <span style={{ color: '#C2362B' }}>*</span>
                              </>
                            ) : null}
                          </label>
                          {q?.isChoice ? (
                            <>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {(q?.choices || []).map((ch, ch_i) => (
                                  <React.Fragment key={ch_i}>
                                    <button
                                      type="button"
                                      id={ch?.id}
                                      onClick={ch?.pick}
                                      aria-pressed={ch?.on}
                                      style={{
                                        minHeight: '44px',
                                        padding: '0 16px',
                                        borderRadius: '999px',
                                        border: `1px solid ${ch?.border}`,
                                        boxShadow: `0 0 0 1px ${ch?.ring}`,
                                        background: ch?.bg,
                                        color: '#0F1115',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        fontWeight: ch?.weight,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {ch?.label}
                                    </button>
                                  </React.Fragment>
                                ))}
                              </div>
                            </>
                          ) : null}
                          {q?.isShort ? (
                            <>
                              <input
                                id={q?.fid}
                                type="text"
                                value={q?.value}
                                onChange={q?.onInput}
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
                            </>
                          ) : null}
                          {q?.isLong ? (
                            <>
                              <textarea
                                id={q?.fid}
                                rows="3"
                                value={q?.value}
                                onChange={q?.onInput}
                                style={{
                                  border: '1px solid #D9DBE1',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  fontFamily: 'inherit',
                                  fontSize: '16px',
                                  lineHeight: '22px',
                                  color: '#0F1115',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box',
                                  width: '100%',
                                  resize: 'vertical',
                                }}
                              />
                            </>
                          ) : null}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={v.agree}
                        onChange={v.toggleAgree}
                        style={{
                          width: '18px',
                          height: '18px',
                          margin: '2px 0 0',
                          accentColor: v.accent,
                          flex: '0 0 auto',
                        }}
                      />
                      <span style={{ fontSize: '14px', lineHeight: '20px', color: '#2B2F36' }}>
                        {'I agree to the booking policy: '}
                        {v.policy} <span style={{ color: '#C2362B' }}>*</span>
                      </span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={v.sms}
                        onChange={v.toggleSms}
                        style={{
                          width: '18px',
                          height: '18px',
                          margin: '2px 0 0',
                          accentColor: v.accent,
                          flex: '0 0 auto',
                        }}
                      />
                      <span style={{ fontSize: '14px', lineHeight: '20px', color: '#2B2F36' }}>
                        Text me a reminder the day before
                      </span>
                    </label>
                  </div>
                </section>
              </>
            ) : null}
            {v.isStep5 ? (
              <>
                <section
                  aria-label="Booking confirmed"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '20px',
                    padding: '24px 0 8px',
                  }}
                >
                  <span
                    style={{
                      width: '64px',
                      height: '64px',
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
                      width="30"
                      height="30"
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h2
                      style={{
                        margin: '0',
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: '28px',
                        lineHeight: '34px',
                        fontWeight: '800',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      You're booked
                    </h2>
                    <p style={{ margin: '0', fontSize: '15px', lineHeight: '22px', color: '#4A505C' }}>
                      {'A confirmation is on its way to '}
                      {v.conf?.email}.
                    </p>
                    <span
                      style={{
                        alignSelf: 'center',
                        fontSize: '13px',
                        lineHeight: '18px',
                        fontWeight: '600',
                        color: '#2B2F36',
                        background: '#F1F1F4',
                        borderRadius: '999px',
                        padding: '4px 12px',
                      }}
                    >
                      {'Reference '}
                      {v.conf?.ref}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      textAlign: 'left',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '4px 20px',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(v.conf?.rows || []).map((r, r_i) => (
                      <React.Fragment key={r_i}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '16px',
                            padding: '14px 0',
                            borderBottom: `1px solid ${r?.line}`,
                          }}
                        >
                          <span style={{ fontSize: '14px', lineHeight: '20px', color: '#5B616E', flex: '0 0 auto' }}>
                            {r?.k}
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              lineHeight: '20px',
                              fontWeight: '600',
                              textAlign: 'right',
                              whiteSpace: 'pre-line',
                            }}
                          >
                            {r?.v}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      justifyContent: 'center',
                      width: '100%',
                      maxWidth: '520px',
                    }}
                  >
                    <a
                      href={v.conf?.gcalHref}
 target="_blank"
 rel="noopener noreferrer"
                      style={{
                        flex: '1 1 200px',
                        height: '48px',
                        borderRadius: '12px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
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
                        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                        <path d="M3.5 10h17M8 3v4M16 3v4" />
                      </svg>
                      {' Add to Google Calendar'}
                    </a>
                    <a
                      href={v.conf?.icsHref}
 download={v.conf?.icsName}
                      style={{
                        flex: '1 1 200px',
                        height: '48px',
                        borderRadius: '12px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
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
                        <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
                      </svg>
                      {' Apple / Outlook (.ics)'}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px', lineHeight: '20px' }}>
                    <a href="#" style={{ color: '#2B2F36', fontWeight: '600' }}>
                      Reschedule
                    </a>
                    <a href="#" style={{ color: '#A12A20', fontWeight: '600' }}>
                      Cancel booking
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={v.reset}
                    style={{
                      height: '44px',
                      padding: '0 18px',
                      borderRadius: '12px',
                      border: '0',
                      background: 'transparent',
                      color: '#4A505C',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Book another appointment
                  </button>
                </section>
              </>
            ) : null}
          </main>
          {v.showAside ? (
            <>
              <aside
                aria-label="Booking summary"
                style={{ flex: '1 1 300px', maxWidth: '380px', minWidth: '0', position: 'sticky', top: '24px' }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 1px 2px rgba(16,17,21,0.04), 0 8px 24px rgba(16,17,21,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: v.accent,
                        color: v.onAccent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontWeight: '800',
                        fontSize: '14px',
                        flex: '0 0 auto',
                      }}
                    >
                      {v.biz?.initials}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                      <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '700' }}>{v.biz?.name}</span>
                      <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{v.biz?.place}</span>
                    </div>
                  </div>
                  <div style={{ height: '1px', background: '#EEEFF2' }} />
                  {v.sum?.noService ? (
                    <>
                      <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>
                        {'Nothing selected yet. Pick a '}
                        {v.svcNoun}
                        {' to see your summary here.'}
                      </p>
                    </>
                  ) : null}
                  {v.sum?.hasService ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                            <span style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '600' }}>
                              {v.sum?.svcName}
                            </span>
                            <span style={{ fontSize: '13px', lineHeight: '18px', color: '#5B616E' }}>
                              {v.sum?.svcMeta}
                            </span>
                          </div>
                          <span
                            style={{ fontSize: '15px', lineHeight: '20px', fontWeight: '600', whiteSpace: 'nowrap' }}
                          >
                            {v.sum?.svcPrice}
                          </span>
                        </div>
                        {(v.sum?.addons || []).map((a, a_i) => (
                          <React.Fragment key={a_i}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '12px',
                                fontSize: '13px',
                                lineHeight: '18px',
                                color: '#4A505C',
                              }}
                            >
                              <span>
                                {'+ '}
                                {a?.name}
                              </span>
                              <span style={{ whiteSpace: 'nowrap' }}>{a?.price}</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {v.sum?.hasStaff ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          lineHeight: '20px',
                        }}
                      >
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            background: v.sum?.staffAvBg,
                            color: v.sum?.staffAvFg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            flex: '0 0 auto',
                          }}
                        >
                          {v.sum?.staffInitials}
                        </span>
                        <span>{v.sum?.staffLine}</span>
                      </div>
                    </>
                  ) : null}
                  {v.sum?.hasWhen ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            background: '#F1F1F4',
                            color: '#2B2F36',
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
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                            <path d="M3.5 10h17M8 3v4M16 3v4" />
                          </svg>
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
                          <span style={{ fontSize: '14px', lineHeight: '20px', fontWeight: '600' }}>
                            {v.sum?.whenDate}
                          </span>
                          <span style={{ fontSize: '13px', lineHeight: '18px', color: '#4A505C' }}>
                            {v.sum?.whenTime}
                          </span>
                          {v.sum?.hasClinicTime ? (
                            <>
                              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                                {v.sum?.clinicTime}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div style={{ height: '1px', background: '#EEEFF2' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Total</span>
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                        fontSize: '20px',
                        lineHeight: '26px',
                        fontWeight: '800',
                      }}
                    >
                      {v.sum?.total}
                    </span>
                  </div>
                  {v.sum?.hasDeposit ? (
                    <>
                      <span style={{ fontSize: '13px', lineHeight: '18px', color: '#4A505C', marginTop: '-8px' }}>
                        {v.sum?.deposit}
                      </span>
                    </>
                  ) : null}
                  {v.showCta ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={v.next}
                          disabled={v.ctaDisabled}
                          style={{
                            height: '52px',
                            width: '100%',
                            borderRadius: '12px',
                            border: '0',
                            background: v.ctaBg,
                            color: v.ctaFg,
                            fontFamily: 'inherit',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: v.ctaCursor,
                          }}
                        >
                          {v.ctaLabel}
                        </button>
                        {v.showHint ? (
                          <>
                            <span
                              style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E', textAlign: 'center' }}
                            >
                              {v.ctaHint}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {v.isStep5 ? (
                    <>
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0B6B45',
                          background: '#E7F6EE',
                          borderRadius: '999px',
                          padding: '6px 12px',
                        }}
                      >
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        {' Confirmed'}
                      </span>
                    </>
                  ) : null}
                  <span style={{ fontSize: '12px', lineHeight: '17px', color: '#5B616E' }}>{v.policy}</span>
                </div>
              </aside>
            </>
          ) : null}
        </div>
        {v.showFooter ? (
          <>
            <footer
              style={{
                padding: '20px 16px 28px',
                textAlign: 'center',
                fontSize: '12px',
                lineHeight: '16px',
                color: '#5B616E',
              }}
            >
              {'Powered by '}
              <strong style={{ color: '#2B2F36' }}>Digital Services Master</strong>
              {' · '}
              <a href="#" style={{ color: '#5B616E' }}>
                Privacy
              </a>
              {' · '}
              <a href="#" style={{ color: '#5B616E' }}>
                Terms
              </a>
            </footer>
          </>
        ) : null}
        {v.showBar ? (
          <>
            <div
              style={{
                position: 'sticky',
                bottom: '0',
                zIndex: '5',
                background: '#FFFFFF',
                borderTop: '1px solid #E6E7EB',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 -6px 20px rgba(16,17,21,0.06)',
              }}
            >
              <div style={{ flex: '1 1 auto', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                    fontSize: '17px',
                    lineHeight: '22px',
                    fontWeight: '800',
                  }}
                >
                  {v.bar?.top}
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
                  {v.bar?.sub}
                </span>
              </div>
              <button
                type="button"
                onClick={v.next}
                disabled={v.ctaDisabled}
                style={{
                  height: '48px',
                  padding: '0 22px',
                  borderRadius: '12px',
                  border: '0',
                  background: v.ctaBg,
                  color: v.ctaFg,
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: v.ctaCursor,
                  flex: '0 0 auto',
                }}
              >
                {v.ctaLabel}
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  }
}
