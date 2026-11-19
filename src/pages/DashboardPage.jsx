// Ported from the design handoff board canvas-source/Dashboard.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';

import { api, getMe } from '../lib/api.js';
import { navigate } from '../lib/router.js';
import { offsetHours } from '../lib/clock.js';
import { withHost } from '../lib/site.js';
import { dateKeyInZone, dowOfKey, addDays, zonedToUtc, partsInZone } from '../../worker/lib/time.js';

const initialsOf = (name) => {
  const w = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return w.length ? (w[0].charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase() : '?';
};

const ACCENT = '#5B4BDB';
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const hhmm = (min) => pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
const toMin = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s || ''));
  return m ? +m[1] * 60 + +m[2] : 0;
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NOTIFY_KEYS = [
  ['newBooking', 'New booking alert', 'Email you the moment someone books, with their answers.'],
  ['confirmation', 'Customer confirmation', 'Booking details and an .ics calendar file for the customer.'],
  ['changes', 'Reschedules & cancellations', 'Notify both you and the customer.'],
  ['digest', 'Daily agenda', "Today's bookings at 7:00 AM."],
  ['followUp', 'Follow-up after visit', 'Thank-you email 2 hours after the visit.'],
];
const TIMEZONES = [
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Perth',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

// Service as edited in the form (numbers kept as strings for the inputs).
function toEditor(x) {
  return {
    id: x.id,
    name: x.name,
    cat: x.isPackage ? 'pkg' : x.category,
    dur: String(x.duration),
    price: String(x.price),
    buffer: String(x.buffer),
    active: x.active,
    pkg: x.isPackage,
    staff: x.staffIds.slice(),
    desc: x.description,
    includes: x.includes || [],
    fromPrice: x.fromPrice,
    badge: x.badge,
    meta: x.meta,
    addons: (x.addons || []).map((a) => ({ id: a.id, name: a.name, price: String(a.price) })),
    questions: (x.questions || []).map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      req: q.req,
      options: q.options || [],
    })),
  };
}
function fromEditor(x) {
  return {
    name: x.name,
    category: x.cat,
    duration: Number(x.dur) || 60,
    price: Number(x.price) || 0,
    buffer: Number(x.buffer) || 0,
    active: x.active,
    isPackage: x.cat === 'pkg',
    staffIds: x.staff,
    description: x.desc,
    includes: x.includes,
    fromPrice: x.fromPrice,
    badge: x.badge,
    meta: x.meta,
    addons: x.addons.map((a) => ({ id: a.id, name: a.name, price: Number(a.price) || 0 })),
    questions: x.questions.map((q) => ({ id: q.id, label: q.label, type: q.type, req: q.req, options: q.options })),
  };
}

class DashboardPageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    var props = args[0] || {};
    var d = props.data;
    var biz = d.business;
    var byDow = {};
    d.hours.forEach(function (h) {
      byDow[h.dow] = h;
    });
    this.state = {
      tab: props.tab || 'bookings',
      view: 'week',
      weekOffset: 0,
      staffFilter: 'all',
      openId: null,
      bizMenu: false,
      bookings: [],
      bLoading: true,
      bError: '',
      pendingCount: 0,
      services: d.services.map(toEditor),
      selSvc: d.services[0] ? d.services[0].id : null,
      saved: false,
      svcErr: '',
      staff: d.staff,
      hours: [1, 2, 3, 4, 5, 6, 0].map(function (dow) {
        var h = byDow[dow] || { isOpen: false, open: 540, close: 1080 };
        return { dow: dow, d: DAY_NAMES[dow], on: h.isOpen, a: hhmm(h.open), b: hhmm(h.close) };
      }),
      interval: String(biz.settings.interval),
      notice: String(biz.settings.notice),
      advance: String(biz.settings.advance),
      bizTz: biz.timezone,
      approval: biz.settings.approval,
      savedAll: false,
      saveErr: '',
      timeOff: d.timeOff,
      toDraft: null,
      toError: '',
      slug: biz.slug,
      liveSlug: biz.slug,
      slugMsg: '',
      slugBad: false,
      copied: '',
      embedTab: 'inline',
      brand: biz.accent,
      staffStep: biz.settings.staffStep,
      prices: biz.settings.prices,
      google: d.google,
      calendars: [],
      notify: Object.assign({}, biz.settings.notify),
      ownerEmail: biz.settings.ownerEmail,
      fromName: biz.settings.fromName,
      testSent: false,
      testError: '',
      note: '',
      rescheduling: false,
      rsDate: '',
      rsTime: '',
      rsSlots: [],
      rsNote: '',
      opError: '',
    };
  }

  // ---- data

  get bizId() {
    return this.props.data.business.id;
  }

  api(path, opts) {
    return api('/businesses/' + this.bizId + path, opts).catch((e) => {
      if (e.status === 401) navigate('/login?next=/dashboard', { replace: true });
      throw e;
    });
  }

  tz() {
    return this.state.bizTz || this.props.data.business.timezone;
  }

  weekStartKey(offset) {
    var tz = this.props.data.business.timezone;
    var today = dateKeyInZone(Date.now(), tz);
    var dow = dowOfKey(today);
    return addDays(today, -((dow + 6) % 7) + 7 * offset);
  }

  async loadWeek() {
    var tz = this.props.data.business.timezone;
    var mon = this.weekStartKey(this.state.weekOffset);
    var from = zonedToUtc(mon, 0, tz),
      to = zonedToUtc(addDays(mon, 7), 0, tz);
    var offset = this.state.weekOffset;
    this.setState({ bLoading: true, bError: '' });
    try {
      var r = await this.api('/bookings?from=' + from + '&to=' + to);
      if (offset === this.state.weekOffset)
        this.setState({ bookings: r.bookings, pendingCount: r.pendingCount, bLoading: false });
    } catch (e) {
      this.setState({ bLoading: false, bError: e.message });
    }
  }

  async loadCalendars() {
    if (!this.state.google.connected) return;
    try {
      var r = await this.api('/google/calendars');
      this.setState({ calendars: r.calendars || [] });
    } catch (e) {
      /* the select falls back to the saved calendar id */
    }
  }

  componentDidMount() {
    this.loadWeek();
    this.loadCalendars();
  }

  componentDidUpdate(prev, prevState) {
    if (prev.tab !== this.props.tab && this.props.tab && this.props.tab !== this.state.tab) {
      this.setState({ tab: this.props.tab, bizMenu: false });
    }
    if (prevState.weekOffset !== this.state.weekOffset) this.loadWeek();
  }

  async patchBusiness(body) {
    var r = await this.api('', { method: 'PATCH', body: body });
    return r;
  }

  async saveSettings(patch) {
    try {
      await this.patchBusiness({ settings: patch });
    } catch (e) {
      window.alert(e.message);
    }
  }

  replaceBooking(b) {
    this.setState((st) => ({ bookings: st.bookings.map((x) => (x.id === b.id ? b : x)) }));
  }

  async setStatus(b, status) {
    if (
      status === 'cancelled' &&
      !window.confirm('Cancel this booking? ' + (this.state.notify.changes ? 'The customer will get an email.' : ''))
    )
      return;
    this.setState({ opError: '' });
    try {
      var r = await this.api('/bookings/' + b.id, { method: 'PATCH', body: { status: status } });
      this.replaceBooking(r.booking);
      this.setState((st) => ({ pendingCount: Math.max(0, st.pendingCount - (b.status === 'pending' ? 1 : 0)) }));
    } catch (e) {
      this.setState({ opError: e.message });
    }
  }

  async loadSlots(b, date) {
    this.setState({ rsDate: date, rsSlots: [], rsTime: '', rsNote: 'Checking free times…' });
    try {
      var r = await this.api('/bookings/' + b.id + '/slots?date=' + date);
      this.setState({
        rsSlots: r.slots,
        rsTime: r.slots.length ? String(r.slots[0]) : '',
        rsNote: r.slots.length ? '' : 'No free times that day.',
      });
    } catch (e) {
      this.setState({ rsNote: e.message });
    }
  }

  async saveReschedule(b) {
    this.setState({ opError: '' });
    try {
      var r = await this.api('/bookings/' + b.id + '/reschedule', {
        method: 'POST',
        body: { date: this.state.rsDate, time: Number(this.state.rsTime) },
      });
      this.replaceBooking(r.booking);
      this.setState({ rescheduling: false });
      this.loadWeek();
    } catch (e) {
      this.setState({ opError: e.message });
    }
  }

  updSvc(id, patch) {
    this.setState({
      saved: false,
      svcErr: '',
      services: this.state.services.map(function (x) {
        return x.id === id ? Object.assign({}, x, patch) : x;
      }),
    });
  }

  async persistSvc(x) {
    try {
      var r = await this.api('/services/' + x.id, { method: 'PUT', body: fromEditor(x) });
      this.setState((st) => ({ services: st.services.map((y) => (y.id === x.id ? toEditor(r.service) : y)) }));
      return true;
    } catch (e) {
      this.setState({ svcErr: e.message });
      return false;
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

  fmt(min) {
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60),
      mm = m % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }

  durLabel(d) {
    d = Number(d) || 0;
    if (d < 60) return d + ' min';
    var h = Math.floor(d / 60),
      m = d % 60;
    return h + (h === 1 ? ' hr' : ' hrs') + (m ? ' ' + m + ' min' : '');
  }

  money(n) {
    n = Number(n) || 0;
    return n ? this.props.data.business.currencySymbol + n.toLocaleString('en-US') : 'Free';
  }

  sw(on, toggle) {
    return { on: !!on, track: on ? ACCENT : '#8C929C', knob: on ? '18px' : '0px', toggle: toggle };
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var p = this.props;
    var D = p.data;
    var B = D.business;
    var tz = B.timezone;
    var INK = '#0F1115';
    var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var WDL = DAY_NAMES;
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var host = window.location.host;
    var origin = window.location.origin;
    var setter = function (k) {
      return function (e) {
        var o = {};
        o[k] = e.target.value;
        self.setState(o);
      };
    };
    var off = offsetHours(tz) || 0;
    var gmt =
      'GMT' +
      (off >= 0 ? '+' : '-') +
      Math.floor(Math.abs(off)) +
      (Math.abs(off) % 1 ? ':' + pad2(Math.round((Math.abs(off) % 1) * 60)) : '');

    // ---- business switcher
    var me = p.me || { user: {}, businesses: [] };
    var biz = {
      name: B.name,
      initials: initialsOf(B.name),
      site: B.website || host + '/' + s.liveSlug,
      color: s.brand,
    };
    var bizList = me.businesses.map(function (bz) {
      var on = bz.id === B.id;
      return {
        name: bz.name,
        initials: bz.initials,
        site: bz.website || host + '/' + bz.slug,
        color: bz.accent,
        on: on,
        bg: on ? '#F4F3FE' : 'transparent',
        pick: function () {
          self.setState({ bizMenu: false });
          if (!on && p.onSwitchBusiness) p.onSwitchBusiness(bz.id);
        },
      };
    });

    // ---- staff
    var STAFF = {};
    s.staff.forEach(function (st) {
      var c = st.color;
      var rgb = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      var soft =
        'rgb(' +
        rgb
          .map(function (v) {
            return Math.round(255 + (v - 255) * 0.12);
          })
          .join(', ') +
        ')';
      var words = st.name.split(' ');
      STAFF[st.id] = {
        name: st.name,
        short: /^(dr|mr|mrs|ms|prof)\.?$/i.test(words[0]) && words[1] ? words[0] + ' ' + words[1] : words[0],
        initials: st.initials,
        color: c,
        soft: soft,
      };
    });
    var unknownStaff = { name: 'Unassigned', short: '—', initials: '?', color: '#6B7280', soft: '#F1F1F4' };

    var ST = {
      confirmed: { label: 'Confirmed', bg: '#E7F6EE', fg: '#0B6B45' },
      pending: { label: 'Pending', bg: '#FEF3E2', fg: '#8A4A06' },
      completed: { label: 'Completed', bg: '#EEEFF2', fg: '#3F4450' },
      cancelled: { label: 'Cancelled', bg: '#FDECEA', fg: '#A12A20' },
      'no-show': { label: 'No-show', bg: '#FDECEA', fg: '#A12A20' },
    };

    // ---- week
    var mon = this.weekStartKey(s.weekOffset);
    var todayKey = dateKeyInZone(Date.now(), tz);
    var nowP = partsInZone(Date.now(), tz);
    var hoursByDow = {};
    s.hours.forEach(function (h) {
      hoursByDow[h.dow] = h;
    });
    var bookings = s.bookings.map(function (b) {
      var pz = partsInZone(b.start, tz);
      var key = pz.y + '-' + pad2(pz.m) + '-' + pad2(pz.d);
      var dur = Math.round((b.end - b.start) / 60000);
      return Object.assign({}, b, {
        key: key,
        day: Math.round(
          (Date.UTC(pz.y, pz.m - 1, pz.d) - Date.UTC(+mon.slice(0, 4), +mon.slice(5, 7) - 1, +mon.slice(8, 10))) /
            86400000,
        ),
        t: pz.min,
        dur: dur,
        staff: STAFF[b.staffId] || unknownStaff,
        cust: (b.firstName + ' ' + b.lastName).trim(),
      });
    });
    var live = bookings.filter(function (b) {
      return b.status !== 'cancelled';
    });
    var value = live
      .filter(function (b) {
        return b.status !== 'no-show';
      })
      .reduce(function (n, b) {
        return n + b.total;
      }, 0);
    var todayCount = live.filter(function (b) {
      return b.key === todayKey;
    }).length;
    var tp = partsInZone(Date.now(), tz);
    var stats = [
      { label: 'Today', value: String(todayCount), sub: WDL[tp.dow] + ', ' + tp.d + ' ' + MON[tp.m - 1], color: INK },
      {
        label: s.weekOffset === 0 ? 'This week' : 'That week',
        value: String(live.length),
        sub: 'Bookings, excluding cancellations',
        color: INK,
      },
      {
        label: 'Awaiting confirmation',
        value: String(s.pendingCount),
        sub: s.pendingCount ? 'Open a booking to confirm it' : 'All caught up',
        color: s.pendingCount ? '#8A4A06' : INK,
      },
      {
        label: 'Booked value',
        value: value ? self.money(value) : B.currencySymbol + '0',
        sub: (s.weekOffset === 0 ? 'This week' : 'That week') + ', before discounts',
        color: INK,
      },
    ];

    // Days shown: Monday–Saturday, plus Sunday when open or booked.
    var showSunday =
      hoursByDow[0].on ||
      bookings.some(function (b) {
        return b.day === 6;
      });
    var dayIdx = showSunday ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5];
    var sat = addDays(mon, dayIdx.length - 1);
    var monM = +mon.slice(5, 7) - 1,
      satM = +sat.slice(5, 7) - 1;
    var weekLabel =
      +mon.slice(8, 10) +
      (monM !== satM ? ' ' + MON[monM] : '') +
      ' – ' +
      +sat.slice(8, 10) +
      ' ' +
      MON[satM] +
      ' ' +
      sat.slice(0, 4);
    var shown = bookings.filter(function (b) {
      return s.staffFilter === 'all' || b.staffId === s.staffFilter;
    });

    // Grid spans opening hours (and any booking outside them), in whole hours.
    var openDays = s.hours.filter(function (h) {
      return h.on;
    });
    var gs = openDays.length
      ? Math.min.apply(
          null,
          openDays.map(function (h) {
            return toMin(h.a);
          }),
        )
      : 540;
    var ge = openDays.length
      ? Math.max.apply(
          null,
          openDays.map(function (h) {
            return toMin(h.b);
          }),
        )
      : 1080;
    shown.forEach(function (b) {
      gs = Math.min(gs, b.t);
      ge = Math.max(ge, Math.min(1440, b.t + b.dur));
    });
    gs = Math.floor(gs / 60) * 60;
    ge = Math.max(gs + 60, Math.ceil(ge / 60) * 60);
    var gridH = ge - gs;

    var blockFor = function (b) {
      var cancelled = b.status === 'cancelled' || b.status === 'no-show';
      return {
        top: b.t - gs,
        h: Math.max(b.dur, 32),
        lane: 0,
        lanes: 1,
        start: b.t,
        end: b.t + Math.max(b.dur, 32),
        time: self.fmt(b.t) + ' – ' + self.fmt(b.t + b.dur),
        cust: b.cust,
        svc: b.serviceName,
        aria: b.cust + ', ' + b.serviceName + ', ' + self.fmt(b.t) + ', ' + ST[b.status].label,
        bg: cancelled ? '#F3F4F6' : b.staff.soft,
        fg: cancelled ? '#5B616E' : INK,
        border: cancelled ? '#D9DBE1' : b.status === 'pending' ? '#B45309' : b.staff.soft,
        borderStyle: b.status === 'pending' ? 'dashed' : 'solid',
        dot: cancelled ? '#A9AEB8' : b.staff.color,
        deco: cancelled ? 'line-through' : 'none',
        open: function () {
          self.setState({ openId: b.id, note: b.note || '', rescheduling: false, opError: '' });
        },
      };
    };
    // Overlapping bookings sit side by side in lanes.
    var laneOut = function (blocks) {
      blocks.sort(function (x, y) {
        return x.start - y.start;
      });
      var cluster = [],
        laneEnds = [],
        clusterEnd = -1;
      var flush = function () {
        cluster.forEach(function (b) {
          b.lanes = laneEnds.length;
        });
        cluster = [];
        laneEnds = [];
      };
      blocks.forEach(function (b) {
        if (b.start >= clusterEnd) flush();
        var lane = laneEnds.findIndex(function (e) {
          return e <= b.start;
        });
        if (lane < 0) {
          lane = laneEnds.length;
          laneEnds.push(b.end);
        } else laneEnds[lane] = b.end;
        b.lane = lane;
        cluster.push(b);
        clusterEnd = Math.max(clusterEnd, b.end);
      });
      flush();
      return blocks;
    };
    var week = dayIdx.map(function (di) {
      var key = addDays(mon, di);
      var dow = dowOfKey(key);
      var isToday = key === todayKey;
      var h = hoursByDow[dow];
      var closed = [];
      if (!h.on) closed.push({ top: 0, h: gridH });
      else {
        if (toMin(h.a) > gs) closed.push({ top: 0, h: toMin(h.a) - gs });
        if (toMin(h.b) < ge) closed.push({ top: toMin(h.b) - gs, h: ge - toMin(h.b) });
      }
      return {
        wd: WD[dow],
        num: +key.slice(8, 10),
        numBg: isToday ? ACCENT : 'transparent',
        numFg: isToday ? '#FFFFFF' : INK,
        colBg: isToday ? '#FBFAFF' : '#FFFFFF',
        closed: closed,
        showNow: isToday && nowP.min >= gs && nowP.min <= ge,
        nowTop: nowP.min - gs,
        blocks: laneOut(
          shown
            .filter(function (b) {
              return b.day === di;
            })
            .map(blockFor),
        ),
      };
    });
    var hours = [];
    for (var hh = gs / 60; hh <= ge / 60; hh++)
      hours.push({ label: self.fmt(hh * 60).replace(':00', ''), top: hh * 60 - gs - 7 });

    var listGroups = dayIdx
      .map(function (di, gi) {
        var key = addDays(mon, di);
        var dow = dowOfKey(key);
        var rows = shown
          .filter(function (b) {
            return b.day === di;
          })
          .map(function (b) {
            var x = ST[b.status];
            return {
              time: self.fmt(b.t),
              dur: self.durLabel(b.dur),
              cust: b.cust,
              svc: b.serviceName,
              staff: b.staffName,
              dot: b.staff.color,
              status: x.label,
              stBg: x.bg,
              stFg: x.fg,
              price: self.money(b.total),
              deco: b.status === 'cancelled' ? 'line-through' : 'none',
              open: function () {
                self.setState({ openId: b.id, note: b.note || '', rescheduling: false, opError: '' });
              },
            };
          });
        return {
          label: WDL[dow] + ', ' + +key.slice(8, 10) + ' ' + MON[+key.slice(5, 7) - 1],
          isToday: key === todayKey,
          count: rows.length + (rows.length === 1 ? ' booking' : ' bookings'),
          rows: rows,
          topLine: gi === 0 ? 'transparent' : '#EEEFF2',
        };
      })
      .filter(function (g) {
        return g.rows.length;
      });

    var staffChips = [{ id: 'all', label: 'All staff' }]
      .concat(
        s.staff.map(function (st) {
          return { id: st.id, label: STAFF[st.id].short, dot: st.color };
        }),
      )
      .map(function (c) {
        var on = s.staffFilter === c.id;
        return {
          label: c.label,
          on: on,
          hasDot: !!c.dot,
          dot: c.dot || 'transparent',
          bg: on ? INK : '#FFFFFF',
          fg: on ? '#FFFFFF' : INK,
          border: on ? INK : '#D9DBE1',
          pick: function () {
            self.setState({ staffFilter: c.id });
          },
        };
      });

    // ---- drawer
    var ob = s.openId
      ? bookings.filter(function (b) {
          return b.id === s.openId;
        })[0]
      : null;
    var op = {
      stBg: '#FFFFFF',
      stFg: INK,
      status: '',
      ref: '',
      cust: '',
      email: '',
      phone: '',
      rows: [],
      answers: [],
      isPending: false,
      isConfirmed: false,
      isClosed: false,
      confirm: null,
      cancel: null,
    };
    if (ob) {
      var pz = partsInZone(ob.start, tz);
      var orows = [
        ['Service', ob.serviceName],
        ['With', ob.staffName],
        [
          'When',
          WDL[pz.dow] +
            ', ' +
            pz.d +
            ' ' +
            MON[pz.m - 1] +
            ' ' +
            pz.y +
            '\n' +
            self.fmt(ob.t) +
            ' – ' +
            self.fmt(ob.t + ob.dur),
        ],
        ['Price', self.money(ob.total)],
        ['Booked via', ob.source],
      ];
      var upcoming = ob.end > Date.now();
      op = {
        stBg: ST[ob.status].bg,
        stFg: ST[ob.status].fg,
        status: ST[ob.status].label,
        ref: ob.ref,
        cust: ob.cust,
        email: ob.email,
        phone: ob.phone || '—',
        rows: orows.map(function (r, i) {
          return { k: r[0], v: r[1], line: i < orows.length - 1 ? '#EEEFF2' : 'transparent' };
        }),
        answers: ob.answers.length
          ? ob.answers.map(function (x) {
              return { q: x.q, a: x.a || '—' };
            })
          : [{ q: 'Questions', a: 'No questions asked for this booking.' }],
        isPending: ob.status === 'pending',
        isConfirmed: ob.status === 'confirmed' && upcoming,
        isClosed:
          ['completed', 'cancelled', 'no-show'].indexOf(ob.status) >= 0 || (ob.status === 'confirmed' && !upcoming),
        confirm: function () {
          self.setStatus(ob, 'confirmed');
        },
        cancel: function () {
          self.setStatus(ob, 'cancelled');
        },
        note: s.note,
        setNote: function (e) {
          self.setState({ note: e.target.value });
        },
        saveNote: async function () {
          if ((ob.note || '') === s.note) return;
          try {
            var r = await self.api('/bookings/' + ob.id, { method: 'PATCH', body: { note: self.state.note } });
            self.replaceBooking(r.booking);
          } catch (e) {
            self.setState({ opError: e.message });
          }
        },
        rescheduling: s.rescheduling,
        reschedule: function () {
          if (self.state.rescheduling) return self.setState({ rescheduling: false });
          self.setState({ rescheduling: true });
          self.loadSlots(ob, ob.key);
        },
        rsDate: s.rsDate,
        rsTime: s.rsTime,
        rsNote: s.rsNote,
        rsSlots: s.rsSlots.map(function (m) {
          return [String(m), self.fmt(m)];
        }),
        setRsDate: function (e) {
          if (e.target.value) self.loadSlots(ob, e.target.value);
        },
        setRsTime: function (e) {
          self.setState({ rsTime: e.target.value });
        },
        saveReschedule: function () {
          self.saveReschedule(ob);
        },
        bookAgain: function () {
          window.open(
            '/' + s.liveSlug + (ob.serviceId ? '?service=' + encodeURIComponent(ob.serviceId) : ''),
            '_blank',
            'noopener',
          );
        },
        error: s.opError,
      };
    }

    // ---- nav
    var mk = function (key) {
      var on = s.tab === key;
      return {
        bg: on ? '#F1F1F4' : 'transparent',
        fg: on ? INK : '#4A505C',
        icon: on ? ACCENT : '#6B7280',
        cur: on ? 'page' : undefined,
        go: function () {
          self.setState({ tab: key, bizMenu: false });
          if (p.onTabChange) p.onTabChange(key);
        },
      };
    };
    var nav = {
      bookings: mk('bookings'),
      services: mk('services'),
      availability: mk('availability'),
      page: mk('page'),
      integrations: mk('integrations'),
    };
    var PAGES = {
      bookings: { title: 'Bookings', sub: B.name + ' · ' + tz + ' (' + gmt + ')' },
      services: {
        title: 'Services & packages',
        sub: 'What customers can book, and what you ask them before they arrive.',
      },
      availability: { title: 'Availability', sub: 'When customers can book. Staff use these hours.' },
      page: { title: 'Booking page & embed', sub: 'Share your link or put the booking flow on any website.' },
      integrations: { title: 'Calendar & email', sub: 'Keep Google Calendar in sync and choose who gets notified.' },
    };

    // ---- services editor
    var groupsSvc = [
      ['Services', false],
      ['Packages', true],
    ]
      .map(function (g) {
        return {
          label: g[0],
          items: s.services
            .filter(function (x) {
              return (x.cat === 'pkg') === g[1];
            })
            .map(function (x) {
              var on = x.id === s.selSvc;
              var sw0 = self.sw(x.active, function () {
                var next = Object.assign({}, x, { active: !x.active });
                self.updSvc(x.id, { active: !x.active });
                self.persistSvc(next);
              });
              return {
                name: x.name || 'Untitled',
                meta: self.durLabel(x.dur) + ' · ' + self.money(x.price) + ' · ' + x.staff.length + ' staff',
                on: on,
                bg: on ? '#F4F3FE' : 'transparent',
                nameColor: x.active ? INK : '#5B616E',
                active: x.active,
                track: sw0.track,
                knob: sw0.knob,
                toggle: sw0.toggle,
                switchLabel: (x.active ? 'Hide ' : 'Show ') + (x.name || 'service') + ' on booking page',
                pick: function () {
                  self.setState({ selSvc: x.id, svcErr: '' });
                },
              };
            }),
        };
      })
      .filter(function (g) {
        return g.items.length;
      });

    var cur =
      s.services.filter(function (x) {
        return x.id === s.selSvc;
      })[0] || null;
    var ed = {};
    var catOptions = (B.categories || []).filter(function (c) {
      return c[0] !== 'all';
    });
    if (
      !catOptions.some(function (c) {
        return c[0] === 'pkg';
      })
    )
      catOptions = catOptions.concat([['pkg', 'Packages']]);
    var durOptions = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];
    var bufferOptions = [0, 5, 10, 15, 20, 30, 45, 60];
    if (cur) {
      if (
        cur.cat &&
        !catOptions.some(function (c) {
          return c[0] === cur.cat;
        })
      )
        catOptions = catOptions.concat([[cur.cat, cur.cat.charAt(0).toUpperCase() + cur.cat.slice(1)]]);
      if (durOptions.indexOf(Number(cur.dur)) < 0)
        durOptions = durOptions.concat([Number(cur.dur)]).sort(function (a, b) {
          return a - b;
        });
      if (bufferOptions.indexOf(Number(cur.buffer)) < 0)
        bufferOptions = bufferOptions.concat([Number(cur.buffer)]).sort(function (a, b) {
          return a - b;
        });
      var id = cur.id;
      var upQ = function (qid, patch) {
        self.updSvc(id, {
          questions: cur.questions.map(function (q) {
            return q.id === qid ? Object.assign({}, q, patch) : q;
          }),
        });
      };
      var upA = function (aid, patch) {
        self.updSvc(id, {
          addons: (cur.addons || []).map(function (a) {
            return a.id === aid ? Object.assign({}, a, patch) : a;
          }),
        });
      };
      var isPkg = cur.cat === 'pkg';
      ed = {
        name: cur.name,
        cat: cur.cat,
        dur: cur.dur,
        price: cur.price,
        buffer: cur.buffer,
        desc: cur.desc,
        pkg: isPkg,
        kind: isPkg ? 'Package' : 'Service',
        kindLower: isPkg ? 'package' : 'service',
        visLabel: cur.active ? 'Visible on booking page' : 'Hidden',
        visBg: cur.active ? '#E7F6EE' : '#EEEFF2',
        visFg: cur.active ? '#0B6B45' : '#3F4450',
        setName: function (e) {
          self.updSvc(id, { name: e.target.value });
        },
        setCat: function (e) {
          self.updSvc(id, { cat: e.target.value });
        },
        setDur: function (e) {
          self.updSvc(id, { dur: e.target.value });
        },
        setPrice: function (e) {
          self.updSvc(id, { price: e.target.value.replace(/[^0-9]/g, '') });
        },
        setBuffer: function (e) {
          self.updSvc(id, { buffer: e.target.value });
        },
        setDesc: function (e) {
          self.updSvc(id, { desc: e.target.value });
        },
        staff: s.staff.map(function (st) {
          var on = cur.staff.indexOf(st.id) >= 0;
          return {
            name: st.name,
            initials: st.initials,
            color: st.color,
            on: on,
            bg: on ? '#F4F3FE' : '#FFFFFF',
            border: on ? ACCENT : '#D9DBE1',
            toggle: function () {
              var list = cur.staff.slice();
              var i = list.indexOf(st.id);
              if (i >= 0) list.splice(i, 1);
              else list.push(st.id);
              self.updSvc(id, { staff: list });
            },
          };
        }),
        includes: cur.includes || [],
        addons: (cur.addons || []).map(function (a) {
          return {
            name: a.name,
            price: a.price,
            setName: function (e) {
              upA(a.id, { name: e.target.value });
            },
            setPrice: function (e) {
              upA(a.id, { price: e.target.value.replace(/[^0-9]/g, '') });
            },
            remove: function () {
              self.updSvc(id, {
                addons: cur.addons.filter(function (z) {
                  return z.id !== a.id;
                }),
              });
            },
          };
        }),
        addAddon: function () {
          self.updSvc(id, {
            addons: (cur.addons || []).concat([{ id: 'x' + Date.now(), name: 'New add-on', price: '' }]),
          });
        },
        questions: cur.questions.map(function (q) {
          var t = self.sw(q.req, function () {
            upQ(q.id, { req: !q.req });
          });
          return {
            label: q.label,
            type: q.type,
            req: q.req,
            track: t.track,
            knob: q.req ? '16px' : '0px',
            toggleReq: t.toggle,
            isChoice: q.type === 'select',
            optionsText: (q.options || []).join(', '),
            setOptions: function (e) {
              upQ(q.id, {
                options: e.target.value
                  .split(',')
                  .map(function (o) {
                    return o.trim();
                  })
                  .filter(function (o, i, arr) {
                    return o || i === arr.length - 1;
                  }),
              });
            },
            setLabel: function (e) {
              upQ(q.id, { label: e.target.value });
            },
            setType: function (e) {
              upQ(q.id, { type: e.target.value });
            },
            remove: function () {
              self.updSvc(id, {
                questions: cur.questions.filter(function (z) {
                  return z.id !== q.id;
                }),
              });
            },
          };
        }),
        addQ: function () {
          self.updSvc(id, {
            questions: cur.questions.concat([
              { id: 'q' + Date.now(), label: 'New question', type: 'short', req: false, options: [] },
            ]),
          });
        },
        del: async function () {
          if (!window.confirm('Delete "' + cur.name + '"? Existing bookings keep their details.')) return;
          try {
            await self.api('/services/' + id, { method: 'DELETE' });
            var rest = self.state.services.filter(function (z) {
              return z.id !== id;
            });
            self.setState({ services: rest, selSvc: rest.length ? rest[0].id : null });
          } catch (e) {
            self.setState({ svcErr: e.message });
          }
        },
        save: async function () {
          var x = self.state.services.filter(function (z) {
            return z.id === id;
          })[0];
          if (x && (await self.persistSvc(x))) self.setState({ saved: true });
        },
        savedNote: s.svcErr || (s.saved ? 'Saved' : ''),
      };
    }

    // ---- availability
    var hoursRows = s.hours.map(function (r, i) {
      var upd = function (patch) {
        self.setState({
          hours: self.state.hours.map(function (z, j) {
            return j === i ? Object.assign({}, z, patch) : z;
          }),
          savedAll: false,
          saveErr: '',
        });
      };
      var t = self.sw(r.on, function () {
        upd({ on: !r.on });
      });
      return {
        day: r.d,
        on: r.on,
        off: !r.on,
        a: r.a,
        b: r.b,
        track: t.track,
        knob: t.knob,
        toggle: t.toggle,
        switchLabel: 'Open on ' + r.d,
        fromLabel: r.d + ' opening time',
        toLabel: r.d + ' closing time',
        setA: function (e) {
          upd({ a: e.target.value });
        },
        setB: function (e) {
          upd({ b: e.target.value });
        },
      };
    });
    var tzList = TIMEZONES.indexOf(s.bizTz) >= 0 ? TIMEZONES : [s.bizTz].concat(TIMEZONES);
    var tzOptions = tzList.map(function (z) {
      var o = offsetHours(z);
      return [z, z + (o === null ? '' : ' (GMT' + (o >= 0 ? '+' : '') + o + ')')];
    });
    var saveAll = async function () {
      var st = self.state;
      var bad = st.hours.filter(function (h) {
        return h.on && toMin(h.b) <= toMin(h.a);
      })[0];
      if (bad) {
        window.alert(bad.d + ': closing time must be after opening time.');
        return self.setState({ saveErr: 'bad hours' });
      }
      try {
        await self.api('/hours', {
          method: 'PUT',
          body: {
            hours: st.hours.map(function (h) {
              return { dow: h.dow, isOpen: h.on, open: toMin(h.a), close: toMin(h.b) };
            }),
          },
        });
        await self.patchBusiness({
          timezone: st.bizTz,
          settings: {
            interval: Number(st.interval),
            notice: Number(st.notice),
            advance: Number(st.advance),
            approval: st.approval,
          },
        });
        self.setState({ savedAll: true, saveErr: '' });
      } catch (e) {
        self.setState({ saveErr: e.message });
        window.alert(e.message);
      }
    };
    var timeOff = s.timeOff.map(function (t) {
      var fmtD = function (k) {
        return +k.slice(8, 10) + ' ' + MON[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
      };
      return {
        label: t.startDate === t.endDate ? fmtD(t.startDate) : fmtD(t.startDate) + ' – ' + fmtD(t.endDate),
        note: t.note || 'Closed',
        remove: async function () {
          try {
            var r = await self.api('/time-off/' + t.id, { method: 'DELETE' });
            self.setState({ timeOff: r.timeOff });
          } catch (e) {
            self.setState({ toError: e.message });
          }
        },
      };
    });
    var staffRows = s.staff.map(function (st) {
      var upd = function (patch) {
        self.setState({
          staff: self.state.staff.map(function (z) {
            return z.id === st.id ? Object.assign({}, z, patch) : z;
          }),
        });
      };
      return {
        name: st.name,
        role: st.role,
        initials: st.initials,
        color: st.color,
        canRemove: s.staff.length > 1,
        setName: function (e) {
          upd({ name: e.target.value });
        },
        setRole: function (e) {
          upd({ role: e.target.value });
        },
        save: async function () {
          var x = self.state.staff.filter(function (z) {
            return z.id === st.id;
          })[0];
          try {
            var r = await self.api('/staff/' + st.id, { method: 'PUT', body: { name: x.name, role: x.role } });
            self.setState({ staff: r.staff });
          } catch (e) {
            window.alert(e.message);
          }
        },
        remove: async function () {
          if (!window.confirm('Remove ' + st.name + '? Their existing bookings stay on the calendar.')) return;
          try {
            var r = await self.api('/staff/' + st.id, { method: 'DELETE' });
            self.setState({ staff: r.staff, services: r.services.map(toEditor) });
          } catch (e) {
            window.alert(e.message);
          }
        },
      };
    });

    // ---- booking page & embed
    var link = origin + '/' + s.liveSlug;
    var embedCodes = {
      inline:
        '<iframe src="' +
        link +
        '?embed=true"\n  title="Book with ' +
        B.name +
        '" loading="lazy"\n  style="width:100%;min-height:720px;border:0"></iframe>\n<script src="' +
        origin +
        '/embed.js" async></' +
        'script>',
      popup:
        '<button data-book="' +
        s.liveSlug +
        '">Book now</button>\n<script src="' +
        origin +
        '/embed.js" async></' +
        'script>',
      link: link,
    };
    var embedHelps = {
      inline: 'Shows the full booking flow inside a section of the page. embed.js resizes the frame to fit each step.',
      popup: 'Turns any button into a booking popup. The flow opens in a modal over your page.',
      link: 'A plain link for Instagram and Facebook bios, Google Business Profile, WhatsApp or email signatures.',
    };
    var embedTabs = [
      ['inline', 'Inline'],
      ['popup', 'Popup button'],
      ['link', 'Link'],
    ].map(function (e) {
      var on = s.embedTab === e[0];
      return {
        label: e[1],
        on: on,
        bg: on ? '#FFFFFF' : 'transparent',
        shadow: on ? '0 1px 2px rgba(16,17,21,0.12)' : 'none',
        pick: function () {
          self.setState({ embedTab: e[0], copied: '' });
        },
      };
    });
    var swatches = [
      ['#5B4BDB', 'Violet'],
      ['#0F766E', 'Teal'],
      ['#1D4ED8', 'Blue'],
      ['#B4235A', 'Raspberry'],
      ['#B45309', 'Amber'],
      ['#0F1115', 'Ink'],
    ].map(function (c) {
      var on = s.brand === c[0];
      return {
        hex: c[0],
        label: c[1] + ' accent',
        on: on,
        ring: on ? c[0] : 'transparent',
        pick: async function () {
          var prev = self.state.brand;
          self.setState({ brand: c[0] });
          try {
            await self.patchBusiness({ accent: c[0] });
          } catch (e) {
            self.setState({ brand: prev });
            window.alert(e.message);
          }
        },
      };
    });
    var settingSwitch = function (key) {
      return self.sw(s[key], function () {
        var v = !self.state[key];
        var o = {};
        o[key] = v;
        self.setState(o);
        var patch = {};
        patch[key] = v;
        self.saveSettings(patch);
      });
    };

    // ---- Google Calendar & email
    var g = s.google;
    var gPatch = function (key, field) {
      return self.sw(g[key], async function () {
        var v = !self.state.google[key];
        self.setState({ google: Object.assign({}, self.state.google, { [key]: v }) });
        try {
          var body = {};
          body[field || key] = v;
          var r = await self.api('/google', { method: 'PATCH', body: body });
          self.setState({ google: r.google });
        } catch (e) {
          window.alert(e.message);
        }
      });
    };
    var calOptions = s.calendars.length
      ? s.calendars.map(function (c) {
          return [c.primary ? 'primary' : c.id, c.name + (c.primary ? ' (primary)' : '')];
        })
      : [[g.calendarId, g.calendarId === 'primary' ? (g.email || 'Primary') + ' (primary)' : g.calendarId]];
    var mailRows = NOTIFY_KEYS.map(function (m) {
      var t = self.sw(s.notify[m[0]], function () {
        var v = !self.state.notify[m[0]];
        self.setState({ notify: Object.assign({}, self.state.notify, { [m[0]]: v }) });
        var n = {};
        n[m[0]] = v;
        self.saveSettings({ notify: n });
      });
      return { title: m[1], sub: m[2], on: t.on, track: t.track, knob: t.knob, toggle: t.toggle };
    });

    var tabs = s.tab;
    return {
      user: { name: me.user ? me.user.name : '', initials: initialsOf(me.user ? me.user.name : '') },
      logout: function (e) {
        e.preventDefault();
        self.logout();
      },
      biz: biz,
      bizList: bizList,
      bizMenu: s.bizMenu,
      toggleBiz: function () {
        self.setState({ bizMenu: !self.state.bizMenu });
      },
      addBusiness: function () {
        navigate('/setup');
      },
      nav: nav,
      page: PAGES[tabs] || PAGES.bookings,
      hasPending: s.pendingCount > 0,
      pendingCount: s.pendingCount,
      isBookings: tabs === 'bookings',
      isServices: tabs === 'services',
      isAvailability: tabs === 'availability',
      isPage: tabs === 'page',
      isIntegrations: tabs === 'integrations',
      copyLink: function () {
        self.setState({ copied: 'link' });
        try {
          navigator.clipboard.writeText(link);
        } catch (e) {
          /* ignore */
        }
      },
      copyLinkLabel: s.copied === 'link' ? 'Link copied' : 'Copy booking link',
      newBooking: function () {
        window.open('/' + s.liveSlug, '_blank', 'noopener');
      },
      stats: stats,
      weekLabel: weekLabel,
      prevWeek: function () {
        self.setState({ weekOffset: self.state.weekOffset - 1 });
      },
      nextWeek: function () {
        self.setState({ weekOffset: self.state.weekOffset + 1 });
      },
      thisWeek: function () {
        self.setState({ weekOffset: 0 });
      },
      staffChips: staffChips,
      isWeek: s.view === 'week',
      isList: s.view === 'list',
      weekBtnBg: s.view === 'week' ? '#FFFFFF' : 'transparent',
      weekBtnShadow: s.view === 'week' ? '0 1px 2px rgba(16,17,21,0.12)' : 'none',
      listBtnBg: s.view === 'list' ? '#FFFFFF' : 'transparent',
      listBtnShadow: s.view === 'list' ? '0 1px 2px rgba(16,17,21,0.12)' : 'none',
      setWeekView: function () {
        self.setState({ view: 'week' });
      },
      setListView: function () {
        self.setState({ view: 'list' });
      },
      weekEmpty: !s.bLoading && bookings.length === 0,
      showWeekGrid: (s.bLoading || bookings.length > 0) && s.view === 'week',
      showList: !s.bLoading && bookings.length > 0 && s.view === 'list',
      week: week,
      hours: hours,
      gridH: gridH,
      dayCount: dayIdx.length,
      listGroups: listGroups,
      hasOpen: !!ob,
      op: op,
      closeOpen: function () {
        self.setState({ openId: null, rescheduling: false });
      },
      svcGroups: groupsSvc,
      hasEdit: !!cur,
      ed: ed,
      catOptions: catOptions,
      durOptions: durOptions.map(function (d) {
        return [String(d), self.durLabel(d)];
      }),
      bufferOptions: bufferOptions.map(function (d) {
        return [String(d), d ? d + ' min' : 'None'];
      }),
      addService: async function () {
        try {
          var r = await self.api('/services', {
            method: 'POST',
            body: {
              name: 'New service',
              category: (catOptions[0] || ['general'])[0] === 'pkg' ? 'general' : (catOptions[0] || ['general'])[0],
              duration: 60,
              price: 0,
              active: false,
              staffIds: s.staff.map(function (x) {
                return x.id;
              }),
            },
          });
          self.setState({
            services: self.state.services.concat([toEditor(r.service)]),
            selSvc: r.service.id,
            saved: false,
          });
        } catch (e) {
          self.setState({ svcErr: e.message });
        }
      },
      hoursRows: hoursRows,
      interval: s.interval,
      notice: s.notice,
      advance: s.advance,
      bizTz: s.bizTz,
      tzOptions: tzOptions,
      setInterval: setter('interval'),
      setNotice: setter('notice'),
      setAdvance: setter('advance'),
      setBizTz: setter('bizTz'),
      saveAll: saveAll,
      saveLabel: s.saveErr ? 'Try again' : s.savedAll ? 'Saved' : 'Save changes',
      saveErr: s.saveErr,
      timeOff: timeOff,
      addTimeOff: function () {
        self.setState({
          toDraft: self.state.toDraft ? null : { start: todayKey, end: todayKey, note: '' },
          toError: '',
        });
      },
      toDraft: s.toDraft,
      toError: s.toError,
      setToStart: function (e) {
        var v = e.target.value;
        self.setState({
          toDraft: Object.assign({}, self.state.toDraft, {
            start: v,
            end: self.state.toDraft.end < v ? v : self.state.toDraft.end,
          }),
        });
      },
      setToEnd: function (e) {
        self.setState({ toDraft: Object.assign({}, self.state.toDraft, { end: e.target.value }) });
      },
      setToNote: function (e) {
        self.setState({ toDraft: Object.assign({}, self.state.toDraft, { note: e.target.value }) });
      },
      saveTimeOff: async function () {
        var dft = self.state.toDraft;
        try {
          var r = await self.api('/time-off', {
            method: 'POST',
            body: { startDate: dft.start, endDate: dft.end, note: dft.note },
          });
          self.setState({ timeOff: r.timeOff, toDraft: null, toError: '' });
        } catch (e) {
          self.setState({ toError: e.message });
        }
      },
      staffRows: staffRows,
      addStaff: async function () {
        try {
          var r = await self.api('/staff', { method: 'POST', body: { name: 'New staff member', role: '' } });
          self.setState({ staff: r.staff });
        } catch (e) {
          window.alert(e.message);
        }
      },
      sw: {
        approval: self.sw(s.approval, function () {
          self.setState({ approval: !self.state.approval, savedAll: false });
        }),
        staffStep: settingSwitch('staffStep'),
        prices: settingSwitch('prices'),
        conflicts: gPatch('blockBusy'),
        twoWay: gPatch('twoWay'),
        details: gPatch('addAnswers'),
      },
      host: host,
      liveSlug: s.liveSlug,
      slug: s.slug,
      setSlug: function (e) {
        self.setState({
          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          copied: '',
          slugMsg: '',
          slugBad: false,
        });
      },
      saveSlug: async function () {
        var v = self.state.slug.replace(/-+$/, '');
        if (v === self.state.liveSlug) return;
        try {
          await self.patchBusiness({ slug: v });
          self.setState({
            liveSlug: v,
            slug: v,
            slugMsg: 'Saved. Your page is now at ' + host + '/' + v + '.',
            slugBad: false,
          });
          if (p.onSlugChange) p.onSlugChange(v);
        } catch (e) {
          self.setState({ slugMsg: withHost(e.message), slugBad: true });
        }
      },
      slugHelp: s.slugMsg || "Each business gets its own address. Changing it breaks links you've already shared.",
      slugHelpColor: s.slugBad ? '#A12A20' : s.slugMsg ? '#0B6B45' : '#5B616E',
      embedTabs: embedTabs,
      embedCode: embedCodes[s.embedTab],
      embedHelp: embedHelps[s.embedTab],
      copyCode: function () {
        self.setState({ copied: 'code' });
        try {
          navigator.clipboard.writeText(embedCodes[self.state.embedTab]);
        } catch (e) {
          /* ignore */
        }
      },
      copyCodeLabel: s.copied === 'code' ? 'Copied' : 'Copy',
      swatches: swatches,
      brand: s.brand,
      gcal: g.connected,
      gcalOff: !g.connected,
      gcalConfigured: g.configured,
      toggleGcal: async function () {
        if (!window.confirm('Disconnect Google Calendar? Bookings stop syncing.')) return;
        try {
          var r = await self.api('/google', { method: 'DELETE' });
          self.setState({ google: r.google, calendars: [] });
        } catch (e) {
          window.alert(e.message);
        }
      },
      connectGcal: function () {
        window.location.href = '/api/auth/google/start?mode=calendar&business=' + encodeURIComponent(B.id);
      },
      gcalHelp: g.configured
        ? 'Connect with Google sign-in. New bookings appear on your calendar, and its busy events block times on your booking page.'
        : "Google Calendar sync isn't switched on for this site yet. The site owner adds Google OAuth credentials to enable it.",
      gcalSub: g.connected ? 'Connected as ' + g.email : 'Not connected',
      gcalPill: g.connected ? 'Connected' : 'Off',
      gcalPillBg: g.connected ? '#E7F6EE' : '#EEEFF2',
      gcalPillFg: g.connected ? '#0B6B45' : '#3F4450',
      gcalCal: g.calendarId,
      calOptions: calOptions,
      setGcalCal: async function (e) {
        var v = e.target.value;
        try {
          var r = await self.api('/google', { method: 'PATCH', body: { calendarId: v } });
          self.setState({ google: r.google });
        } catch (err) {
          window.alert(err.message);
        }
      },
      mailRows: mailRows,
      remWhen: s.notify.remind,
      setRemWhen: function (e) {
        var v = e.target.value;
        self.setState({ notify: Object.assign({}, self.state.notify, { remind: v }) });
        self.saveSettings({ notify: { remind: v } });
      },
      ownerEmail: s.ownerEmail,
      setOwnerEmail: setter('ownerEmail'),
      fromName: s.fromName,
      setFromName: setter('fromName'),
      saveEmailSettings: function () {
        self.saveSettings({ ownerEmail: self.state.ownerEmail, fromName: self.state.fromName });
      },
      sendTest: async function () {
        self.setState({ testSent: false, testError: '' });
        try {
          await self.saveSettings({ ownerEmail: self.state.ownerEmail, fromName: self.state.fromName });
          await self.api('/test-email', { method: 'POST' });
          self.setState({ testSent: true });
        } catch (e) {
          self.setState({ testError: e.message });
        }
      },
      testSent: s.testSent,
      testError: s.testError,
    };
  }
}

export default class DashboardPage extends DashboardPageLogic {
  render() {
    const v = this.renderVals();
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          background: '#F7F7F8',
          color: '#0F1115',
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: '14px',
          lineHeight: '20px',
          boxSizing: 'border-box',
        }}
      >
        <aside
          aria-label="Dashboard navigation"
          style={{
            flex: '1 1 248px',
            minWidth: '0',
            background: '#FFFFFF',
            borderRight: '1px solid #E6E7EB',
            padding: '20px 16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px' }}>
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
                <path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                fontSize: '15px',
                lineHeight: '18px',
                fontWeight: '800',
              }}
            >
              Digital Services Master
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={v.toggleBiz}
              aria-expanded={v.bizMenu}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                border: '1px solid #E6E7EB',
                borderRadius: '12px',
                background: '#FFFFFF',
                fontFamily: 'inherit',
                color: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: v.biz?.color,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '12px',
                  flex: '0 0 auto',
                }}
              >
                {v.biz?.initials}
              </span>
              <span style={{ flex: '1 1 auto', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {v.biz?.name}
                </span>
                <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{v.biz?.site}</span>
              </span>
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
              >
                <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
              </svg>
            </button>{' '}
            {v.bizMenu ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: '0',
                    right: '0',
                    zIndex: '20',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 12px 32px rgba(16,17,21,0.12)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#5B616E',
                      padding: '6px 8px 4px',
                    }}
                  >
                    Your businesses
                  </span>
                  {(v.bizList || []).map((bz, bz_i) => (
                    <React.Fragment key={bz_i}>
                      <button
                        type="button"
                        onClick={bz?.pick}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          minHeight: '44px',
                          padding: '6px 8px',
                          border: '0',
                          borderRadius: '8px',
                          background: bz?.bg,
                          fontFamily: 'inherit',
                          color: 'inherit',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            background: bz?.color,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '10px',
                            flex: '0 0 auto',
                          }}
                        >
                          {bz?.initials}
                        </span>
                        <span style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>{bz?.name}</span>
                          <span style={{ fontSize: '11px', lineHeight: '14px', color: '#5B616E' }}>{bz?.site}</span>
                        </span>
                        {bz?.on ? (
                          <>
                            <svg
                              aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#3F33B8"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          </>
                        ) : null}
                      </button>
                    </React.Fragment>
                  ))}
                  <div style={{ height: '1px', background: '#EEEFF2', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={v.addBusiness}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '40px',
                      padding: '6px 8px',
                      border: '0',
                      borderRadius: '8px',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#2B2F36',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {' Add a business or website'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <nav aria-label="Sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button
              type="button"
              onClick={v.nav?.bookings?.go}
              aria-current={v.nav?.bookings?.cur}
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '44px',
                padding: '0 12px',
                border: '0',
                borderRadius: '10px',
                background: v.nav?.bookings?.bg,
                color: v.nav?.bookings?.fg,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={v.nav?.bookings?.icon}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              <span style={{ flex: '1 1 auto' }}>Bookings</span>
              {v.hasPending ? (
                <>
                  <span
                    style={{
                      minWidth: '22px',
                      height: '22px',
                      borderRadius: '999px',
                      background: '#FEF3E2',
                      color: '#8A4A06',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {v.pendingCount}
                  </span>
                </>
              ) : null}
            </button>
            <button
              type="button"
              onClick={v.nav?.services?.go}
              aria-current={v.nav?.services?.cur}
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '44px',
                padding: '0 12px',
                border: '0',
                borderRadius: '10px',
                background: v.nav?.services?.bg,
                color: v.nav?.services?.fg,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={v.nav?.services?.icon}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="4" width="7" height="7" rx="1.5" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" />
                <rect x="13" y="13" width="7" height="7" rx="1.5" />
              </svg>
              <span style={{ flex: '1 1 auto' }}>{'Services & packages'}</span>
            </button>
            <button
              type="button"
              onClick={v.nav?.availability?.go}
              aria-current={v.nav?.availability?.cur}
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '44px',
                padding: '0 12px',
                border: '0',
                borderRadius: '10px',
                background: v.nav?.availability?.bg,
                color: v.nav?.availability?.fg,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={v.nav?.availability?.icon}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span style={{ flex: '1 1 auto' }}>Availability</span>
            </button>
            <button
              type="button"
              onClick={v.nav?.page?.go}
              aria-current={v.nav?.page?.cur}
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '44px',
                padding: '0 12px',
                border: '0',
                borderRadius: '10px',
                background: v.nav?.page?.bg,
                color: v.nav?.page?.fg,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={v.nav?.page?.icon}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </svg>
              <span style={{ flex: '1 1 auto' }}>{'Booking page & embed'}</span>
            </button>
            <button
              type="button"
              onClick={v.nav?.integrations?.go}
              aria-current={v.nav?.integrations?.cur}
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '44px',
                padding: '0 12px',
                border: '0',
                borderRadius: '10px',
                background: v.nav?.integrations?.bg,
                color: v.nav?.integrations?.fg,
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={v.nav?.integrations?.icon}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v5" />
              </svg>
              <span style={{ flex: '1 1 auto' }}>{'Calendar & email'}</span>
            </button>
          </nav>
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderTop: '1px solid #EEEFF2',
              paddingTop: '14px',
            }}
          >
            <a
              href={`/${v.liveSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                color: '#2B2F36',
                textDecoration: 'none',
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
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
              {' View booking page'}
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px' }}>
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '999px',
                  background: '#EEEFF2',
                  color: '#2B2F36',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                {v.user?.initials}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 auto' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v.user?.name}
                </span>
                <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>Owner</span>
              </span>
              <a href="/" onClick={v.logout} style={{ fontSize: '12px', fontWeight: '600' }}>
                Log out
              </a>
            </div>
          </div>
        </aside>
        <main
          style={{
            flex: '999 1 560px',
            minWidth: '0',
            padding: '28px 32px 48px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px 16px',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
              <h1
                style={{
                  margin: '0',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: '26px',
                  lineHeight: '32px',
                  fontWeight: '800',
                  letterSpacing: '-0.015em',
                }}
              >
                {v.page?.title}
              </h1>
              <p style={{ margin: '0', fontSize: '14px', color: '#5B616E' }}>{v.page?.sub}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {v.isBookings ? (
                <>
                  <button
                    type="button"
                    onClick={v.copyLink}
                    style={{
                      height: '40px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1px solid #D9DBE1',
                      background: '#FFFFFF',
                      color: '#0F1115',
                      fontFamily: 'inherit',
                      fontSize: '14px',
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
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                    </svg>{' '}
                    {v.copyLinkLabel}
                  </button>
                  <button
                    type="button"
                    onClick={v.newBooking}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: '0',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '700',
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
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {' New booking'}
                  </button>
                </>
              ) : null}
              {v.isServices ? (
                <>
                  <button
                    type="button"
                    onClick={v.addService}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: '0',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '700',
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
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {' Add service'}
                  </button>
                </>
              ) : null}
              {v.isAvailability ? (
                <>
                  <button
                    type="button"
                    onClick={v.saveAll}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: '0',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {v.saveLabel}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {v.isBookings ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
                >
                  {(v.stats || []).map((st, st_i) => (
                    <React.Fragment key={st_i}>
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E6E7EB',
                          borderRadius: '14px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#5B616E', fontWeight: '600' }}>{st?.label}</span>
                        <span
                          style={{
                            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                            fontSize: '26px',
                            lineHeight: '32px',
                            fontWeight: '800',
                            color: st?.color,
                          }}
                        >
                          {st?.value}
                        </span>
                        <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{st?.sub}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={v.prevWeek}
                      aria-label="Previous week"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
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
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={v.thisWeek}
                      style={{
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={v.nextWeek}
                      aria-label="Next week"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '700', marginLeft: '6px' }}>{v.weekLabel}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {(v.staffChips || []).map((sc, sc_i) => (
                      <React.Fragment key={sc_i}>
                        <button
                          type="button"
                          onClick={sc?.pick}
                          aria-pressed={sc?.on}
                          style={{
                            height: '36px',
                            padding: '0 12px',
                            borderRadius: '999px',
                            border: `1px solid ${sc?.border}`,
                            background: sc?.bg,
                            color: sc?.fg,
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {sc?.hasDot ? (
                            <>
                              <span
                                aria-hidden="true"
                                style={{ width: '8px', height: '8px', borderRadius: '999px', background: sc?.dot }}
                              />
                            </>
                          ) : null}{' '}
                          {sc?.label}
                        </button>
                      </React.Fragment>
                    ))}
                    <div
                      style={{
                        display: 'flex',
                        background: '#EEEFF2',
                        borderRadius: '10px',
                        padding: '3px',
                        marginLeft: '4px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={v.setWeekView}
                        aria-pressed={v.isWeek}
                        style={{
                          height: '34px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          border: '0',
                          background: v.weekBtnBg,
                          boxShadow: v.weekBtnShadow,
                          color: '#0F1115',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Week
                      </button>
                      <button
                        type="button"
                        onClick={v.setListView}
                        aria-pressed={v.isList}
                        style={{
                          height: '34px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          border: '0',
                          background: v.listBtnBg,
                          boxShadow: v.listBtnShadow,
                          color: '#0F1115',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>
                {v.weekEmpty ? (
                  <>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        padding: '48px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <span
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '999px',
                          background: '#F1F1F4',
                          color: '#4A505C',
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
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                          <path d="M3.5 10h17M8 3v4M16 3v4" />
                        </svg>
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>No bookings this week yet</span>
                      <span style={{ fontSize: '14px', color: '#5B616E', maxWidth: '360px' }}>
                        Share your booking link or add the embed to your website to start filling this calendar.
                      </span>
                      <button
                        type="button"
                        onClick={v.nav?.page?.go}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          color: '#0F1115',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {'Get your link & embed code'}
                      </button>
                    </div>
                  </>
                ) : null}
                {v.showWeekGrid ? (
                  <>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        overflowX: 'auto',
                      }}
                    >
                      <div style={{ minWidth: '820px' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `64px repeat(${v.dayCount}, minmax(0, 1fr))`,
                            borderBottom: '1px solid #E6E7EB',
                          }}
                        >
                          <span />
                          {(v.week || []).map((dd, dd_i) => (
                            <React.Fragment key={dd_i}>
                              <div
                                style={{
                                  padding: '10px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  borderLeft: '1px solid #EEEFF2',
                                }}
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
                                  {dd?.wd}
                                </span>
                                <span
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '999px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    background: dd?.numBg,
                                    color: dd?.numFg,
                                  }}
                                >
                                  {dd?.num}
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>{' '}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `64px repeat(${v.dayCount}, minmax(0, 1fr))`,
                            padding: '12px 0',
                          }}
                        >
                          <div style={{ position: 'relative', height: `${v.gridH}px` }}>
                            {(v.hours || []).map((hr, hr_i) => (
                              <React.Fragment key={hr_i}>
                                <span
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: `${hr?.top}px`,
                                    fontSize: '11px',
                                    lineHeight: '14px',
                                    color: '#5B616E',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {hr?.label}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                          {(v.week || []).map((dd, dd_i) => (
                            <React.Fragment key={dd_i}>
                              <div
                                style={{
                                  position: 'relative',
                                  height: `${v.gridH}px`,
                                  borderLeft: '1px solid #EEEFF2',
                                  backgroundColor: dd?.colBg,
                                  backgroundImage:
                                    'repeating-linear-gradient(to bottom, #EEEFF2 0, #EEEFF2 1px, transparent 1px, transparent 60px)',
                                }}
                              >
                                {(dd?.closed || []).map((cl, cl_i) => (
                                  <React.Fragment key={cl_i}>
                                    <div
                                      aria-hidden="true"
                                      style={{
                                        position: 'absolute',
                                        left: '0',
                                        right: '0',
                                        top: `${cl.top}px`,
                                        height: `${cl.h}px`,
                                        backgroundImage:
                                          'repeating-linear-gradient(135deg, #F1F2F4 0, #F1F2F4 6px, #FFFFFF 6px, #FFFFFF 12px)',
                                      }}
                                    />
                                  </React.Fragment>
                                ))}{' '}
                                {(dd?.blocks || []).map((bk, bk_i) => (
                                  <React.Fragment key={bk_i}>
                                    <button
                                      type="button"
                                      onClick={bk?.open}
                                      aria-label={bk?.aria}
                                      style={{
                                        position: 'absolute',
                                        left: `calc(${bk?.lane} * (100% - 8px) / ${bk?.lanes} + 4px)`,
                                        width: `calc((100% - 8px) / ${bk?.lanes} - ${bk?.lanes > 1 ? 2 : 0}px)`,
                                        top: `${bk?.top}px`,
                                        height: `${bk?.h}px`,
                                        boxSizing: 'border-box',
                                        borderRadius: '8px',
                                        border: `1px ${bk?.borderStyle} ${bk?.border}`,
                                        background: bk?.bg,
                                        color: bk?.fg,
                                        padding: '4px 8px',
                                        fontFamily: 'inherit',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          lineHeight: '14px',
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '999px',
                                            background: bk?.dot,
                                            flex: '0 0 auto',
                                          }}
                                        />
                                        {bk?.time}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          lineHeight: '16px',
                                          fontWeight: '700',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          textDecoration: bk?.deco,
                                        }}
                                      >
                                        {bk?.cust}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          lineHeight: '14px',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {bk?.svc}
                                      </span>
                                    </button>
                                  </React.Fragment>
                                ))}{' '}
                                {dd?.showNow ? (
                                  <>
                                    <div
                                      aria-hidden="true"
                                      style={{
                                        position: 'absolute',
                                        left: '0',
                                        right: '0',
                                        top: `${dd?.nowTop}px`,
                                        height: '2px',
                                        background: '#C2362B',
                                        zIndex: '2',
                                      }}
                                    >
                                      <span
                                        style={{
                                          position: 'absolute',
                                          left: '-4px',
                                          top: '-3px',
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '999px',
                                          background: '#C2362B',
                                        }}
                                      />
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
                {v.showList ? (
                  <>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        overflowX: 'auto',
                      }}
                    >
                      <div style={{ minWidth: '700px' }}>
                        {(v.listGroups || []).map((lg, lg_i) => (
                          <React.Fragment key={lg_i}>
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 16px',
                                  background: '#FAFAFB',
                                  borderBottom: '1px solid #EEEFF2',
                                  borderTop: `1px solid ${lg?.topLine}`,
                                }}
                              >
                                <span style={{ fontSize: '13px', fontWeight: '700' }}>{lg?.label}</span>
                                {lg?.isToday ? (
                                  <>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#3F33B8',
                                        background: '#ECE9FB',
                                        borderRadius: '999px',
                                        padding: '2px 8px',
                                      }}
                                    >
                                      Today
                                    </span>
                                  </>
                                ) : null}
                                <span style={{ fontSize: '12px', color: '#5B616E', marginLeft: 'auto' }}>
                                  {lg?.count}
                                </span>
                              </div>{' '}
                              {(lg?.rows || []).map((rw, rw_i) => (
                                <React.Fragment key={rw_i}>
                                  <button
                                    type="button"
                                    onClick={rw?.open}
                                    style={{
                                      width: '100%',
                                      display: 'grid',
                                      gridTemplateColumns: '110px minmax(0, 2fr) minmax(0, 1.2fr) 110px 90px 20px',
                                      gap: '12px',
                                      alignItems: 'center',
                                      padding: '12px 16px',
                                      border: '0',
                                      borderBottom: '1px solid #EEEFF2',
                                      background: '#FFFFFF',
                                      fontFamily: 'inherit',
                                      color: 'inherit',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '14px', fontWeight: '700' }}>{rw?.time}</span>
                                      <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                                        {rw?.dur}
                                      </span>
                                    </span>
                                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                                      <span style={{ fontSize: '14px', fontWeight: '600', textDecoration: rw?.deco }}>
                                        {rw?.cust}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '13px',
                                          lineHeight: '18px',
                                          color: '#4A505C',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {rw?.svc}
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        minWidth: '0',
                                        fontSize: '13px',
                                      }}
                                    >
                                      <span
                                        aria-hidden="true"
                                        style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '999px',
                                          background: rw?.dot,
                                          flex: '0 0 auto',
                                        }}
                                      />
                                      <span
                                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                      >
                                        {rw?.staff}
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        justifySelf: 'start',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        background: rw?.stBg,
                                        color: rw?.stFg,
                                      }}
                                    >
                                      {rw?.status}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>
                                      {rw?.price}
                                    </span>
                                    <svg
                                      aria-hidden="true"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#8C929C"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M9 6l6 6-6 6" />
                                    </svg>
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
          {v.isServices ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: '1 1 320px',
                    maxWidth: '440px',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {(v.svcGroups || []).map((sg, sg_i) => (
                    <React.Fragment key={sg_i}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#5B616E',
                          padding: '12px 10px 6px',
                        }}
                      >
                        {sg?.label}
                      </span>
                      {(sg?.items || []).map((si, si_i) => (
                        <React.Fragment key={si_i}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderRadius: '10px',
                              background: si?.bg,
                              paddingRight: '10px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={si?.pick}
                              aria-pressed={si?.on}
                              style={{
                                flex: '1 1 auto',
                                minWidth: '0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                padding: '10px',
                                border: '0',
                                background: 'transparent',
                                fontFamily: 'inherit',
                                color: 'inherit',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '600', color: si?.nameColor }}>
                                {si?.name}
                              </span>
                              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{si?.meta}</span>
                            </button>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={si?.active}
                              aria-label={si?.switchLabel}
                              onClick={si?.toggle}
                              style={{
                                width: '44px',
                                height: '26px',
                                borderRadius: '999px',
                                border: '0',
                                padding: '3px',
                                background: si?.track,
                                cursor: 'pointer',
                                flex: '0 0 auto',
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
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                  transform: `translateX(${si?.knob})`,
                                }}
                              />
                            </button>
                          </div>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
                {v.hasEdit ? (
                  <>
                    <div
                      style={{
                        flex: '999 1 460px',
                        minWidth: '0',
                        background: '#FFFFFF',
                        border: '1px solid #E6E7EB',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '18px 20px',
                          borderBottom: '1px solid #EEEFF2',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                            fontSize: '18px',
                            lineHeight: '24px',
                            fontWeight: '800',
                            flex: '1 1 auto',
                            minWidth: '0',
                          }}
                        >
                          {v.ed?.name}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: '#F1F1F4',
                            color: '#2B2F36',
                          }}
                        >
                          {v.ed?.kind}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: v.ed?.visBg,
                            color: v.ed?.visFg,
                          }}
                        >
                          {v.ed?.visLabel}
                        </span>
                      </div>
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2B2F36',
                          }}
                        >
                          {'Name '}
                          <input
                            type="text"
                            value={v.ed?.name}
                            onChange={v.ed?.setName}
                            style={{
                              height: '44px',
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '0 12px',
                              fontFamily: 'inherit',
                              fontSize: '15px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                              width: '100%',
                            }}
                          />
                        </label>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '12px',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#2B2F36',
                            }}
                          >
                            {'Category '}
                            <select
                              value={v.ed?.cat}
                              onChange={v.ed?.setCat}
                              style={{
                                height: '44px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 10px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                              }}
                            >
                              {(v.catOptions || []).map((o) => (
                                <option key={o[0]} value={o[0]}>
                                  {o[1]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#2B2F36',
                            }}
                          >
                            {'Duration '}
                            <select
                              value={v.ed?.dur}
                              onChange={v.ed?.setDur}
                              style={{
                                height: '44px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 10px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                              }}
                            >
                              {(v.durOptions || []).map((o) => (
                                <option key={o[0]} value={o[0]}>
                                  {o[1]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#2B2F36',
                            }}
                          >
                            {'Price (₱) '}
                            <input
                              type="text"
                              inputMode="numeric"
                              value={v.ed?.price}
                              onChange={v.ed?.setPrice}
                              placeholder="0 = free"
                              style={{
                                height: '44px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 12px',
                                fontFamily: 'inherit',
                                fontSize: '15px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                                boxSizing: 'border-box',
                                width: '100%',
                              }}
                            />
                          </label>
                          <label
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#2B2F36',
                            }}
                          >
                            {'Buffer after '}
                            <select
                              value={v.ed?.buffer}
                              onChange={v.ed?.setBuffer}
                              style={{
                                height: '44px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 10px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                              }}
                            >
                              {(v.bufferOptions || []).map((o) => (
                                <option key={o[0]} value={o[0]}>
                                  {o[1]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2B2F36',
                          }}
                        >
                          {'Description shown to customers '}
                          <textarea
                            rows="2"
                            value={v.ed?.desc}
                            onChange={v.ed?.setDesc}
                            style={{
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                              width: '100%',
                              resize: 'vertical',
                            }}
                          />
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#2B2F36' }}>
                            Who can perform it
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(v.ed?.staff || []).map((es, es_i) => (
                              <React.Fragment key={es_i}>
                                <button
                                  type="button"
                                  onClick={es?.toggle}
                                  aria-pressed={es?.on}
                                  style={{
                                    height: '40px',
                                    padding: '0 14px 0 6px',
                                    borderRadius: '999px',
                                    border: `1px solid ${es?.border}`,
                                    background: es?.bg,
                                    color: '#0F1115',
                                    fontFamily: 'inherit',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '999px',
                                      background: es?.color,
                                      color: '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                    }}
                                  >
                                    {es?.initials}
                                  </span>{' '}
                                  {es?.name}{' '}
                                  {es?.on ? (
                                    <>
                                      <svg
                                        aria-hidden="true"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#3F33B8"
                                        strokeWidth="2.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                                      </svg>
                                    </>
                                  ) : null}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        {v.ed?.pkg ? (
                          <>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                border: '1px solid #EEEFF2',
                                borderRadius: '12px',
                                padding: '14px',
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: '700' }}>Package contents</span>
                              {(v.ed?.includes || []).map((inc, inc_i) => (
                                <React.Fragment key={inc_i}>
                                  <span
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      fontSize: '13px',
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
                                    </svg>
                                    {inc}
                                  </span>
                                </React.Fragment>
                              ))}
                              <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>
                                Optional add-ons
                              </span>
                              {(v.ed?.addons || []).map((ao, ao_i) => (
                                <React.Fragment key={ao_i}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      aria-label="Add-on name"
                                      value={ao?.name}
                                      onChange={ao?.setName}
                                      style={{
                                        flex: '1 1 auto',
                                        minWidth: '0',
                                        height: '40px',
                                        border: '1px solid #D9DBE1',
                                        borderRadius: '10px',
                                        padding: '0 12px',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        color: '#0F1115',
                                        background: '#FFFFFF',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <input
                                      type="text"
                                      aria-label="Add-on price"
                                      value={ao?.price}
                                      onChange={ao?.setPrice}
                                      style={{
                                        flex: '0 0 96px',
                                        height: '40px',
                                        border: '1px solid #D9DBE1',
                                        borderRadius: '10px',
                                        padding: '0 12px',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        color: '#0F1115',
                                        background: '#FFFFFF',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={ao?.remove}
                                      aria-label="Remove add-on"
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        flex: '0 0 auto',
                                        borderRadius: '10px',
                                        border: '1px solid #E6E7EB',
                                        background: '#FFFFFF',
                                        color: '#5B616E',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: '0',
                                      }}
                                    >
                                      <svg
                                        aria-hidden="true"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M6 6l12 12M18 6L6 18" />
                                      </svg>
                                    </button>
                                  </div>
                                </React.Fragment>
                              ))}
                              <button
                                type="button"
                                onClick={v.ed?.addAddon}
                                style={{
                                  alignSelf: 'flex-start',
                                  height: '36px',
                                  padding: '0 12px',
                                  borderRadius: '10px',
                                  border: '1px dashed #B8BCC6',
                                  background: '#FFFFFF',
                                  color: '#2B2F36',
                                  fontFamily: 'inherit',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                + Add add-on
                              </button>
                            </div>
                          </>
                        ) : null}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            borderTop: '1px solid #EEEFF2',
                            paddingTop: '18px',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '700' }}>Custom questions</span>
                            <span style={{ fontSize: '13px', color: '#5B616E' }}>
                              {'Asked on step 4 of the booking page for this '}
                              {v.ed?.kindLower}. Answers appear on the booking.
                            </span>
                          </div>
                          {(v.ed?.questions || []).map((eq, eq_i) => (
                            <React.Fragment key={eq_i}>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  alignItems: 'center',
                                  border: '1px solid #EEEFF2',
                                  borderRadius: '12px',
                                  padding: '10px',
                                  background: '#FCFCFD',
                                }}
                              >
                                <svg
                                  aria-hidden="true"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="#A9AEB8"
                                  stroke="none"
                                >
                                  <circle cx="9" cy="6" r="1.6" />
                                  <circle cx="15" cy="6" r="1.6" />
                                  <circle cx="9" cy="12" r="1.6" />
                                  <circle cx="15" cy="12" r="1.6" />
                                  <circle cx="9" cy="18" r="1.6" />
                                  <circle cx="15" cy="18" r="1.6" />
                                </svg>
                                <input
                                  type="text"
                                  aria-label="Question"
                                  value={eq?.label}
                                  onChange={eq?.setLabel}
                                  style={{
                                    flex: '1 1 220px',
                                    minWidth: '0',
                                    height: '40px',
                                    border: '1px solid #D9DBE1',
                                    borderRadius: '10px',
                                    padding: '0 12px',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    color: '#0F1115',
                                    background: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                                <select
                                  aria-label="Answer type"
                                  value={eq?.type}
                                  onChange={eq?.setType}
                                  style={{
                                    flex: '0 0 140px',
                                    height: '40px',
                                    border: '1px solid #D9DBE1',
                                    borderRadius: '10px',
                                    padding: '0 8px',
                                    fontFamily: 'inherit',
                                    fontSize: '13px',
                                    color: '#0F1115',
                                    background: '#FFFFFF',
                                  }}
                                >
                                  <option value="short">Short answer</option>
                                  <option value="long">Paragraph</option>
                                  <option value="yesno">Yes / No</option>
                                  <option value="select">Multiple choice</option>
                                </select>
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#4A505C',
                                  }}
                                >
                                  {'Required '}
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={eq?.req}
                                    aria-label="Required"
                                    onClick={eq?.toggleReq}
                                    style={{
                                      width: '40px',
                                      height: '24px',
                                      borderRadius: '999px',
                                      border: '0',
                                      padding: '3px',
                                      background: eq?.track,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '999px',
                                        background: '#FFFFFF',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                        transform: `translateX(${eq?.knob})`,
                                      }}
                                    />
                                  </button>
                                </span>
                                <button
                                  type="button"
                                  onClick={eq?.remove}
                                  aria-label="Delete question"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    border: '1px solid #E6E7EB',
                                    background: '#FFFFFF',
                                    color: '#5B616E',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: '0',
                                  }}
                                >
                                  <svg
                                    aria-hidden="true"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                                  </svg>
                                </button>
                                {eq?.isChoice ? (
                                  <input
                                    type="text"
                                    aria-label="Answer options"
                                    placeholder="Answer options, separated by commas"
                                    value={eq?.optionsText}
                                    onChange={eq?.setOptions}
                                    style={{
                                      flex: '1 1 100%',
                                      height: '40px',
                                      border: '1px solid #D9DBE1',
                                      borderRadius: '10px',
                                      padding: '0 12px',
                                      fontFamily: 'inherit',
                                      fontSize: '13px',
                                      color: '#0F1115',
                                      background: '#FFFFFF',
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                ) : null}
                              </div>
                            </React.Fragment>
                          ))}
                          <button
                            type="button"
                            onClick={v.ed?.addQ}
                            style={{
                              alignSelf: 'flex-start',
                              height: '40px',
                              padding: '0 14px',
                              borderRadius: '10px',
                              border: '1px dashed #B8BCC6',
                              background: '#FFFFFF',
                              color: '#2B2F36',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            + Add question
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '14px 20px',
                          borderTop: '1px solid #EEEFF2',
                          background: '#FCFCFD',
                          borderRadius: '0 0 16px 16px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={v.ed?.del}
                          style={{
                            height: '40px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            border: '0',
                            background: 'transparent',
                            color: '#A12A20',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#0B6B45', fontWeight: '600' }}>
                          {v.ed?.savedNote}
                        </span>
                        <button
                          type="button"
                          onClick={v.ed?.save}
                          style={{
                            height: '40px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            border: '0',
                            background: '#0F1115',
                            color: '#FFFFFF',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
          {v.isAvailability ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: '999 1 480px',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    padding: '8px 20px 12px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 0 8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>Weekly hours</span>
                    <span style={{ fontSize: '13px', color: '#5B616E' }}>
                      Customers can only pick start times inside these hours.
                    </span>
                  </div>{' '}
                  {(v.hoursRows || []).map((hr, hr_i) => (
                    <React.Fragment key={hr_i}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '10px 14px',
                          padding: '12px 0',
                          borderTop: '1px solid #EEEFF2',
                          minHeight: '44px',
                        }}
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={hr?.on}
                          aria-label={hr?.switchLabel}
                          onClick={hr?.toggle}
                          style={{
                            width: '44px',
                            height: '26px',
                            borderRadius: '999px',
                            border: '0',
                            padding: '3px',
                            background: hr?.track,
                            cursor: 'pointer',
                            flex: '0 0 auto',
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
                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              transform: `translateX(${hr?.knob})`,
                            }}
                          />
                        </button>
                        <span style={{ width: '100px', fontSize: '14px', fontWeight: '600' }}>{hr?.day}</span>
                        {hr?.on ? (
                          <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <input
                                type="time"
                                step="1800"
                                aria-label={hr?.fromLabel}
                                value={hr?.a}
                                onChange={hr?.setA}
                                style={{
                                  height: '40px',
                                  border: '1px solid #D9DBE1',
                                  borderRadius: '10px',
                                  padding: '0 10px',
                                  fontFamily: 'inherit',
                                  fontSize: '14px',
                                  color: '#0F1115',
                                  background: '#FFFFFF',
                                }}
                              />
                              <span style={{ color: '#5B616E' }}>to</span>
                              <input
                                type="time"
                                step="1800"
                                aria-label={hr?.toLabel}
                                value={hr?.b}
                                onChange={hr?.setB}
                                style={{
                                  height: '40px',
                                  border: '1px solid #D9DBE1',
                                  borderRadius: '10px',
                                  padding: '0 10px',
                                  fontFamily: 'inherit',
                                  fontSize: '14px',
                                  color: '#0F1115',
                                  background: '#FFFFFF',
                                }}
                              />
                            </span>
                          </>
                        ) : null}
                        {hr?.off ? (
                          <>
                            <span style={{ fontSize: '14px', color: '#5B616E' }}>Closed</span>
                          </>
                        ) : null}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={{ flex: '1 1 320px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>Booking rules</span>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '14px',
                      }}
                    >
                      {'Start times every '}
                      <select
                        value={v.interval}
                        onChange={v.setInterval}
                        style={{
                          height: '40px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="15">15 min</option>
                        <option value="30">30 min</option>
                        <option value="60">60 min</option>
                      </select>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '14px',
                      }}
                    >
                      {'Minimum notice '}
                      <select
                        value={v.notice}
                        onChange={v.setNotice}
                        style={{
                          height: '40px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="0">No minimum</option>
                        <option value="1">1 hour</option>
                        <option value="2">2 hours</option>
                        <option value="4">4 hours</option>
                        <option value="24">1 day</option>
                      </select>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '14px',
                      }}
                    >
                      {'Bookable up to '}
                      <select
                        value={v.advance}
                        onChange={v.setAdvance}
                        style={{
                          height: '40px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="14">2 weeks ahead</option>
                        <option value="30">30 days ahead</option>
                        <option value="60">60 days ahead</option>
                        <option value="90">90 days ahead</option>
                      </select>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '14px',
                      }}
                    >
                      {'Business time zone '}
                      <select
                        value={v.bizTz}
                        onChange={v.setBizTz}
                        style={{
                          height: '40px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color: '#0F1115',
                          background: '#FFFFFF',
                          maxWidth: '180px',
                        }}
                      >
                        {(v.tzOptions || []).map((o) => (
                          <option key={o[0]} value={o[0]}>
                            {o[1]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        borderTop: '1px solid #EEEFF2',
                        paddingTop: '14px',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Approve bookings manually</span>
                        <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                          New bookings arrive as Pending until you confirm.
                        </span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={v.sw?.approval?.on}
                        aria-label="Approve bookings manually"
                        onClick={v.sw?.approval?.toggle}
                        style={{
                          width: '44px',
                          height: '26px',
                          borderRadius: '999px',
                          border: '0',
                          padding: '3px',
                          background: v.sw?.approval?.track,
                          cursor: 'pointer',
                          flex: '0 0 auto',
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
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            transform: `translateX(${v.sw?.approval?.knob})`,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>{'Time off & holidays'}</span>
                    {(v.timeOff || []).map((to, to_i) => (
                      <React.Fragment key={to_i}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 0',
                            borderTop: '1px solid #EEEFF2',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{to?.label}</span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{to?.note}</span>
                          </span>
                          <button
                            type="button"
                            onClick={to?.remove}
                            aria-label="Remove time off"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: '1px solid #E6E7EB',
                              background: '#FFFFFF',
                              color: '#5B616E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: '0',
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
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                    {v.toDraft ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'flex-end',
                          padding: '10px 0',
                          borderTop: '1px solid #EEEFF2',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#2B2F36',
                            flex: '1 1 140px',
                          }}
                        >
                          From
                          <input
                            type="date"
                            value={v.toDraft.start}
                            onChange={v.setToStart}
                            style={{
                              height: '40px',
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '0 10px',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                              minWidth: '0',
                            }}
                          />
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#2B2F36',
                            flex: '1 1 140px',
                          }}
                        >
                          To
                          <input
                            type="date"
                            value={v.toDraft.end}
                            onChange={v.setToEnd}
                            style={{
                              height: '40px',
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '0 10px',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                              minWidth: '0',
                            }}
                          />
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#2B2F36',
                            flex: '2 1 180px',
                          }}
                        >
                          Note
                          <input
                            type="text"
                            value={v.toDraft.note}
                            onChange={v.setToNote}
                            placeholder="Holiday, training…"
                            style={{
                              height: '40px',
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '0 10px',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                              minWidth: '0',
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={v.saveTimeOff}
                          style={{
                            height: '40px',
                            padding: '0 14px',
                            borderRadius: '10px',
                            border: '0',
                            background: '#0F1115',
                            color: '#FFFFFF',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                        {v.toError ? (
                          <span style={{ flex: '1 1 100%', fontSize: '13px', color: '#A12A20' }}>{v.toError}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={v.addTimeOff}
                      style={{
                        alignSelf: 'flex-start',
                        height: '36px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px dashed #B8BCC6',
                        background: '#FFFFFF',
                        color: '#2B2F36',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      + Add time off
                    </button>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>Staff schedules</span>
                    {(v.staffRows || []).map((sr, sr_i) => (
                      <React.Fragment key={sr_i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                          <span
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '999px',
                              background: sr?.color,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '700',
                              flex: '0 0 auto',
                            }}
                          >
                            {sr?.initials}
                          </span>
                          <span
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '1 1 auto', minWidth: '0' }}
                          >
                            <input
                              type="text"
                              aria-label="Name"
                              value={sr?.name}
                              onChange={sr?.setName}
                              onBlur={sr?.save}
                              style={{
                                height: '40px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 10px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                                boxSizing: 'border-box',
                                minWidth: '0',
                                flex: '1 1 150px',
                              }}
                            />
                            <input
                              type="text"
                              aria-label="Role"
                              placeholder="Role"
                              value={sr?.role}
                              onChange={sr?.setRole}
                              onBlur={sr?.save}
                              style={{
                                height: '40px',
                                border: '1px solid #D9DBE1',
                                borderRadius: '10px',
                                padding: '0 10px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#0F1115',
                                background: '#FFFFFF',
                                boxSizing: 'border-box',
                                minWidth: '0',
                                flex: '1 1 120px',
                              }}
                            />
                          </span>
                          {sr?.canRemove ? (
                            <button
                              type="button"
                              onClick={sr?.remove}
                              aria-label={'Remove ' + sr?.name}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                border: '1px solid #E6E7EB',
                                background: '#FFFFFF',
                                color: '#5B616E',
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
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </React.Fragment>
                    ))}
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                      Staff use your business hours. Choose who offers each service in Services & packages.
                    </span>
                    <button
                      type="button"
                      onClick={v.addStaff}
                      style={{
                        alignSelf: 'flex-start',
                        height: '36px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px dashed #B8BCC6',
                        background: '#FFFFFF',
                        color: '#2B2F36',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      + Add staff member
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {v.isPage ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                <div
                  style={{ flex: '999 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>Public booking link</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <div
                        style={{
                          flex: '1 1 280px',
                          minWidth: '0',
                          display: 'flex',
                          alignItems: 'center',
                          height: '44px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          background: '#F7F7F8',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{ padding: '0 4px 0 12px', fontSize: '14px', color: '#5B616E', whiteSpace: 'nowrap' }}
                        >
                          {v.host}/
                        </span>
                        <input
                          type="text"
                          aria-label="Page address"
                          value={v.slug}
                          onChange={v.setSlug}
                          onBlur={v.saveSlug}
                          style={{
                            flex: '1 1 auto',
                            minWidth: '60px',
                            height: '42px',
                            border: '0',
                            background: '#FFFFFF',
                            padding: '0 10px',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0F1115',
                            borderLeft: '1px solid #E6E7EB',
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={v.copyLink}
                        style={{
                          height: '44px',
                          padding: '0 16px',
                          borderRadius: '10px',
                          border: '0',
                          background: '#0F1115',
                          color: '#FFFFFF',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {v.copyLinkLabel}
                      </button>
                      <a
                        href={`/${v.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          height: '44px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          color: '#0F1115',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {'Open '}
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
                          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                        </svg>
                      </a>
                    </div>
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: v.slugHelpColor }}>{v.slugHelp}</span>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E6E7EB',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>Embed on your website</span>
                      <div style={{ display: 'flex', background: '#EEEFF2', borderRadius: '10px', padding: '3px' }}>
                        {(v.embedTabs || []).map((et, et_i) => (
                          <React.Fragment key={et_i}>
                            <button
                              type="button"
                              onClick={et?.pick}
                              aria-pressed={et?.on}
                              style={{
                                height: '34px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '0',
                                background: et?.bg,
                                boxShadow: et?.shadow,
                                color: '#0F1115',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              {et?.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#4A505C' }}>{v.embedHelp}</span>
                    <div
                      style={{
                        position: 'relative',
                        background: '#1B1D22',
                        borderRadius: '12px',
                        padding: '16px 18px',
                      }}
                    >
                      <code
                        style={{
                          display: 'block',
                          fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
                          fontSize: '12.5px',
                          lineHeight: '20px',
                          color: '#E6E7EB',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          paddingRight: '80px',
                        }}
                      >
                        {v.embedCode}
                      </code>{' '}
                      <button
                        type="button"
                        onClick={v.copyCode}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
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
                        {v.copyCodeLabel}
                      </button>
                    </div>
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                      Paste into WordPress (Custom HTML block), Wix (Embed code), Squarespace (Code block), Webflow,
                      Astro or any HTML page.
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    flex: '1 1 300px',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>Branding</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#2B2F36' }}>Accent colour</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(v.swatches || []).map((sw2, sw2_i) => (
                        <React.Fragment key={sw2_i}>
                          <button
                            type="button"
                            onClick={sw2?.pick}
                            aria-pressed={sw2?.on}
                            aria-label={sw2?.label}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '999px',
                              border: `2px solid ${sw2?.ring}`,
                              padding: '3px',
                              background: '#FFFFFF',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span
                              style={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                borderRadius: '999px',
                                background: sw2?.hex,
                              }}
                            />
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      border: '1px dashed #B8BCC6',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <span
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: v.brand,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '14px',
                        flex: '0 0 auto',
                      }}
                    >
                      {v.biz?.initials}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>Logo</span>
                      <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                        Your initials in your accent colour. Image logos are coming soon.
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '14px' }}>Show the staff step</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={v.sw?.staffStep?.on}
                      aria-label="Show the staff step"
                      onClick={v.sw?.staffStep?.toggle}
                      style={{
                        width: '44px',
                        height: '26px',
                        borderRadius: '999px',
                        border: '0',
                        padding: '3px',
                        background: v.sw?.staffStep?.track,
                        cursor: 'pointer',
                        flex: '0 0 auto',
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
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          transform: `translateX(${v.sw?.staffStep?.knob})`,
                        }}
                      />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '14px' }}>Show prices</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={v.sw?.prices?.on}
                      aria-label="Show prices"
                      onClick={v.sw?.prices?.toggle}
                      style={{
                        width: '44px',
                        height: '26px',
                        borderRadius: '999px',
                        border: '0',
                        padding: '3px',
                        background: v.sw?.prices?.track,
                        cursor: 'pointer',
                        flex: '0 0 auto',
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
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          transform: `translateX(${v.sw?.prices?.knob})`,
                        }}
                      />
                    </button>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #EEEFF2',
                      paddingTop: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
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
                      Preview
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span
                        style={{
                          flex: '1 1 0',
                          height: '40px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        10:00 AM
                      </span>
                      <span
                        style={{
                          flex: '1 1 0',
                          height: '40px',
                          borderRadius: '10px',
                          background: v.brand,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        10:30 AM
                      </span>
                      <span
                        style={{
                          flex: '1 1 0',
                          height: '40px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        11:00 AM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {v.isIntegrations ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: '1 1 420px',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '18px 20px',
                      borderBottom: '1px solid #EEEFF2',
                    }}
                  >
                    <span
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#EAF1FE',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="22"
                        height="22"
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
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '0' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>Google Calendar</span>
                      <span style={{ fontSize: '13px', color: '#5B616E' }}>{v.gcalSub}</span>
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: v.gcalPillBg,
                        color: v.gcalPillFg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.gcalPill}
                    </span>
                  </div>
                  {v.gcal ? (
                    <>
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2B2F36',
                          }}
                        >
                          {'Add new bookings to '}
                          <select
                            value={v.gcalCal}
                            onChange={v.setGcalCal}
                            style={{
                              height: '44px',
                              border: '1px solid #D9DBE1',
                              borderRadius: '10px',
                              padding: '0 10px',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              color: '#0F1115',
                              background: '#FFFFFF',
                            }}
                          >
                            {(v.calOptions || []).map((o) => (
                              <option key={o[0]} value={o[0]}>
                                {o[1]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Block busy times</span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                              Events in Google Calendar hide those slots from customers.
                            </span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={v.sw?.conflicts?.on}
                            aria-label="Block busy times"
                            onClick={v.sw?.conflicts?.toggle}
                            style={{
                              width: '44px',
                              height: '26px',
                              borderRadius: '999px',
                              border: '0',
                              padding: '3px',
                              background: v.sw?.conflicts?.track,
                              cursor: 'pointer',
                              flex: '0 0 auto',
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
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                transform: `translateX(${v.sw?.conflicts?.knob})`,
                              }}
                            />
                          </button>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Two-way sync</span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                              Moving or deleting the event updates the booking.
                            </span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={v.sw?.twoWay?.on}
                            aria-label="Two-way sync"
                            onClick={v.sw?.twoWay?.toggle}
                            style={{
                              width: '44px',
                              height: '26px',
                              borderRadius: '999px',
                              border: '0',
                              padding: '3px',
                              background: v.sw?.twoWay?.track,
                              cursor: 'pointer',
                              flex: '0 0 auto',
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
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                transform: `translateX(${v.sw?.twoWay?.knob})`,
                              }}
                            />
                          </button>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>
                              Add customer answers to the event
                            </span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                              Puts intake answers in the event description.
                            </span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={v.sw?.details?.on}
                            aria-label="Add customer answers to the event"
                            onClick={v.sw?.details?.toggle}
                            style={{
                              width: '44px',
                              height: '26px',
                              borderRadius: '999px',
                              border: '0',
                              padding: '3px',
                              background: v.sw?.details?.track,
                              cursor: 'pointer',
                              flex: '0 0 auto',
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
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                transform: `translateX(${v.sw?.details?.knob})`,
                              }}
                            />
                          </button>
                        </div>
                        <div
                          style={{ display: 'flex', gap: '8px', borderTop: '1px solid #EEEFF2', paddingTop: '14px' }}
                        >
                          <button
                            type="button"
                            onClick={v.toggleGcal}
                            style={{
                              height: '40px',
                              padding: '0 14px',
                              borderRadius: '10px',
                              border: '1px solid #D9DBE1',
                              background: '#FFFFFF',
                              color: '#A12A20',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {v.gcalOff ? (
                    <>
                      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#4A505C' }}>{v.gcalHelp}</span>
                        {v.gcalConfigured ? (
                          <button
                            type="button"
                            onClick={v.connectGcal}
                            style={{
                              alignSelf: 'flex-start',
                              height: '44px',
                              padding: '0 18px',
                              borderRadius: '10px',
                              border: '0',
                              background: '#0F1115',
                              color: '#FFFFFF',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Connect Google Calendar
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
                <div
                  style={{
                    flex: '1 1 420px',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E6E7EB',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '18px 20px',
                      borderBottom: '1px solid #EEEFF2',
                    }}
                  >
                    <span
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#ECE9FB',
                        color: '#3F33B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2.5" />
                        <path d="M3.5 7l8.5 6 8.5-6" />
                      </svg>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '0' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>Email notifications</span>
                      <span style={{ fontSize: '13px', color: '#5B616E' }}>
                        Sent from your business name, replies go to you.
                      </span>
                    </span>
                  </div>
                  <div style={{ padding: '6px 20px 16px', display: 'flex', flexDirection: 'column' }}>
                    {(v.mailRows || []).map((mr, mr_i) => (
                      <React.Fragment key={mr_i}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '12px 0',
                            borderBottom: '1px solid #EEEFF2',
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{mr?.title}</span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{mr?.sub}</span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={mr?.on}
                            aria-label={mr?.title}
                            onClick={mr?.toggle}
                            style={{
                              width: '44px',
                              height: '26px',
                              borderRadius: '999px',
                              border: '0',
                              padding: '3px',
                              background: mr?.track,
                              cursor: 'pointer',
                              flex: '0 0 auto',
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
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                transform: `translateX(${mr?.knob})`,
                              }}
                            />
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: '1px solid #EEEFF2',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      {'Send reminders '}
                      <select
                        value={v.remWhen}
                        onChange={v.setRemWhen}
                        style={{
                          height: '40px',
                          border: '1px solid #D9DBE1',
                          borderRadius: '10px',
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#0F1115',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="24">24 hours before</option>
                        <option value="2">2 hours before</option>
                        <option value="both">24 hours and 2 hours before</option>
                        <option value="off">Don't send</option>
                      </select>
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        paddingTop: '14px',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#2B2F36',
                        }}
                      >
                        {'Owner alerts go to '}
                        <input
                          type="email"
                          value={v.ownerEmail}
                          onChange={v.setOwnerEmail}
                          onBlur={v.saveEmailSettings}
                          style={{
                            height: '44px',
                            border: '1px solid #D9DBE1',
                            borderRadius: '10px',
                            padding: '0 12px',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            color: '#0F1115',
                            background: '#FFFFFF',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}
                        />
                      </label>
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#2B2F36',
                        }}
                      >
                        {'Sender name '}
                        <input
                          type="text"
                          value={v.fromName}
                          onChange={v.setFromName}
                          onBlur={v.saveEmailSettings}
                          style={{
                            height: '44px',
                            border: '1px solid #D9DBE1',
                            borderRadius: '10px',
                            padding: '0 12px',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            color: '#0F1115',
                            background: '#FFFFFF',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '14px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={v.sendTest}
                        style={{
                          height: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: '1px solid #D9DBE1',
                          background: '#FFFFFF',
                          color: '#0F1115',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Send test email
                      </button>
                      {v.testSent ? (
                        <>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B6B45' }}>
                            {'Test sent to '}
                            {v.ownerEmail}
                          </span>
                        </>
                      ) : null}
                      {v.testError ? (
                        <span role="alert" style={{ fontSize: '13px', fontWeight: '600', color: '#A12A20' }}>
                          {v.testError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    flex: '1 1 100%',
                    minWidth: '0',
                    background: '#FFFFFF',
                    border: '1px dashed #D9DBE1',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: '700', marginRight: '6px' }}>Later</span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#4A505C',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 12px',
                    }}
                  >
                    SMS reminders
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#4A505C',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 12px',
                    }}
                  >
                    Outlook calendar
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#4A505C',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 12px',
                    }}
                  >
                    Online deposits
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#4A505C',
                      background: '#F1F1F4',
                      borderRadius: '999px',
                      padding: '5px 12px',
                    }}
                  >
                    Webhooks
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </main>
        {v.hasOpen ? (
          <>
            <button
              type="button"
              onClick={v.closeOpen}
              aria-label="Close booking details"
              style={{
                position: 'fixed',
                inset: '0',
                zIndex: '40',
                border: '0',
                padding: '0',
                margin: '0',
                background: 'rgba(15,17,21,0.32)',
                cursor: 'default',
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Booking details"
              style={{
                position: 'fixed',
                top: '0',
                right: '0',
                bottom: '0',
                zIndex: '41',
                width: '420px',
                maxWidth: '100%',
                background: '#FFFFFF',
                boxShadow: '-12px 0 40px rgba(16,17,21,0.16)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #EEEFF2',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: v.op?.stBg,
                    color: v.op?.stFg,
                  }}
                >
                  {v.op?.status}
                </span>
                <span style={{ fontSize: '12px', color: '#5B616E' }}>{v.op?.ref}</span>
                <button
                  type="button"
                  onClick={v.closeOpen}
                  aria-label="Close"
                  style={{
                    marginLeft: 'auto',
                    width: '40px',
                    height: '40px',
                    borderRadius: '999px',
                    border: '1px solid #E6E7EB',
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
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div
                style={{
                  flex: '1 1 auto',
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                      fontSize: '22px',
                      lineHeight: '28px',
                      fontWeight: '800',
                    }}
                  >
                    {v.op?.cust}
                  </span>
                  <a
                    href={`mailto:${v.op?.email}`}
                    style={{
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2.5" />
                      <path d="M3.5 7l8.5 6 8.5-6" />
                    </svg>
                    {v.op?.email}
                  </a>
                  <a
                    href={`tel:${String(v.op?.phone || '').replace(/\s+/g, '')}`}
                    style={{
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                    </svg>
                    {v.op?.phone}
                  </a>
                </div>
                <div style={{ border: '1px solid #EEEFF2', borderRadius: '12px', padding: '2px 14px' }}>
                  {(v.op?.rows || []).map((or, or_i) => (
                    <React.Fragment key={or_i}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 0',
                          borderBottom: `1px solid ${or?.line}`,
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#5B616E' }}>{or?.k}</span>
                        <span
                          style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right', whiteSpace: 'pre-line' }}
                        >
                          {or?.v}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#5B616E',
                    }}
                  >
                    Answers to your questions
                  </span>
                  {(v.op?.answers || []).map((oa, oa_i) => (
                    <React.Fragment key={oa_i}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: '#5B616E' }}>{oa?.q}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{oa?.a}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#5B616E',
                  }}
                >
                  {'Private note '}
                  <textarea
                    rows="3"
                    placeholder="Only your team sees this"
                    value={v.op?.note}
                    onChange={v.op?.setNote}
                    onBlur={v.op?.saveNote}
                    style={{
                      border: '1px solid #D9DBE1',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#0F1115',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      width: '100%',
                      resize: 'vertical',
                      textTransform: 'none',
                      letterSpacing: '0',
                      fontWeight: '400',
                    }}
                  />
                </label>
              </div>
              {v.op?.rescheduling ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'flex-end',
                    padding: '14px 20px',
                    borderTop: '1px solid #EEEFF2',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2B2F36',
                      flex: '1 1 150px',
                    }}
                  >
                    New date
                    <input
                      type="date"
                      value={v.op?.rsDate}
                      onChange={v.op?.setRsDate}
                      style={{
                        height: '40px',
                        border: '1px solid #D9DBE1',
                        borderRadius: '10px',
                        padding: '0 10px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        color: '#0F1115',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                        minWidth: '0',
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2B2F36',
                      flex: '1 1 150px',
                    }}
                  >
                    Start time
                    <select
                      value={v.op?.rsTime}
                      onChange={v.op?.setRsTime}
                      style={{
                        height: '40px',
                        border: '1px solid #D9DBE1',
                        borderRadius: '10px',
                        padding: '0 10px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        color: '#0F1115',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                        minWidth: '0',
                      }}
                    >
                      {(v.op?.rsSlots || []).map((o) => (
                        <option key={o[0]} value={o[0]}>
                          {o[1]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={v.op?.saveReschedule}
                    disabled={!v.op?.rsTime}
                    style={{
                      height: '40px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '0',
                      background: '#0F1115',
                      color: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Move booking
                  </button>
                  {v.op?.rsNote ? (
                    <span style={{ flex: '1 1 100%', fontSize: '13px', color: '#5B616E' }}>{v.op?.rsNote}</span>
                  ) : null}
                </div>
              ) : null}
              {v.op?.error ? (
                <div
                  role="alert"
                  style={{ padding: '10px 20px', fontSize: '13px', color: '#A12A20', borderTop: '1px solid #EEEFF2' }}
                >
                  {v.op?.error}
                </div>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '14px 20px',
                  borderTop: '1px solid #EEEFF2',
                }}
              >
                {v.op?.isPending ? (
                  <>
                    <button
                      type="button"
                      onClick={v.op?.confirm}
                      style={{
                        flex: '1 1 auto',
                        height: '44px',
                        borderRadius: '10px',
                        border: '0',
                        background: '#0F1115',
                        color: '#FFFFFF',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Confirm booking
                    </button>
                    <button
                      type="button"
                      onClick={v.op?.cancel}
                      style={{
                        height: '44px',
                        padding: '0 16px',
                        borderRadius: '10px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#A12A20',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </>
                ) : null}
                {v.op?.isConfirmed ? (
                  <>
                    <button
                      type="button"
                      onClick={v.op?.reschedule}
                      style={{
                        flex: '1 1 auto',
                        height: '44px',
                        borderRadius: '10px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={v.op?.cancel}
                      style={{
                        height: '44px',
                        padding: '0 16px',
                        borderRadius: '10px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#A12A20',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel booking
                    </button>
                  </>
                ) : null}
                {v.op?.isClosed ? (
                  <>
                    <button
                      type="button"
                      onClick={v.op?.bookAgain}
                      style={{
                        flex: '1 1 auto',
                        height: '44px',
                        borderRadius: '10px',
                        border: '1px solid #D9DBE1',
                        background: '#FFFFFF',
                        color: '#0F1115',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Book again
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }
}
