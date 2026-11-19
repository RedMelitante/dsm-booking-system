// Ported from the design handoff board canvas-source/Dashboard.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';

class DashboardPageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = {
      tab: (args[0] && args[0].tab) || 'bookings',
      view: 'week',
      weekOffset: 0,
      staffFilter: 'all',
      openId: null,
      overrides: {},
      bizMenu: false,
      bizIdx: 0,
      services: this.seedServices(),
      selSvc: 'a2',
      saved: false,
      hours: [
        { d: 'Monday', on: true, a: '09:00', b: '18:00' },
        { d: 'Tuesday', on: true, a: '09:00', b: '18:00' },
        { d: 'Wednesday', on: true, a: '09:00', b: '18:00' },
        { d: 'Thursday', on: true, a: '09:00', b: '18:00' },
        { d: 'Friday', on: true, a: '09:00', b: '18:00' },
        { d: 'Saturday', on: true, a: '09:00', b: '15:00' },
        { d: 'Sunday', on: false, a: '09:00', b: '15:00' },
      ],
      interval: '30',
      notice: '2',
      advance: '60',
      bizTz: 'Asia/Manila',
      approval: true,
      savedAll: false,
      timeOff: [
        { id: 'o1', label: '24 – 25 Dec 2026', note: 'Christmas' },
        { id: 'o2', label: '31 Dec 2026 – 1 Jan 2027', note: 'New Year' },
      ],
      slug: 'lumen-skin-studio',
      copied: '',
      embedTab: 'inline',
      brand: '#5B4BDB',
      staffStep: true,
      prices: true,
      gcal: true,
      gcalCal: 'bookings',
      conflicts: true,
      twoWay: true,
      details: false,
      mNew: true,
      mConfirm: true,
      mChanges: true,
      mDigest: false,
      mReview: false,
      remWhen: '24',
      ownerEmail: 'hello@lumenskin.example',
      fromName: 'Lumen Skin Studio',
      testSent: false,
    };
  }

  componentDidUpdate(prev) {
    if (prev.tab !== this.props.tab && this.props.tab && this.props.tab !== this.state.tab) {
      this.setState({ tab: this.props.tab, bizMenu: false });
    }
  }

  seedServices() {
    var qs = function () {
      return [
        { id: 'q1', label: 'Is this your first visit with us?', type: 'yesno', req: true },
        { id: 'q2', label: 'What is your main skin concern?', type: 'choice', req: false },
        {
          id: 'q3',
          label: 'Any allergies, medications or recent treatments we should know about?',
          type: 'long',
          req: false,
        },
      ];
    };
    return [
      {
        id: 'a1',
        name: 'Skin consultation',
        cat: 'consult',
        dur: '30',
        price: '0',
        buffer: '0',
        active: true,
        pkg: false,
        staff: ['t1'],
        desc: 'Skin assessment and a personalised treatment plan with our doctor.',
        questions: qs().filter(function (q) {
          return q.id !== 'q2';
        }),
      },
      {
        id: 'a2',
        name: 'Hydrating signature facial',
        cat: 'facial',
        dur: '60',
        price: '2800',
        buffer: '10',
        active: true,
        pkg: false,
        staff: ['t1', 't2'],
        desc: 'Deep cleanse, gentle exfoliation, extractions and a hydrating mask.',
        questions: qs(),
      },
      {
        id: 'a3',
        name: 'Acne clearing facial',
        cat: 'facial',
        dur: '75',
        price: '3200',
        buffer: '10',
        active: true,
        pkg: false,
        staff: ['t2'],
        desc: 'Targeted extractions, blue LED and a calming mask.',
        questions: qs(),
      },
      {
        id: 'a7',
        name: 'Chemical peel',
        cat: 'facial',
        dur: '45',
        price: '2500',
        buffer: '10',
        active: false,
        pkg: false,
        staff: ['t2'],
        desc: 'Medium-depth peel. Hidden while the new formula arrives.',
        questions: qs(),
      },
      {
        id: 'a4',
        name: 'Pico laser toning',
        cat: 'laser',
        dur: '45',
        price: '4500',
        buffer: '15',
        active: true,
        pkg: false,
        staff: ['t1', 't3'],
        desc: 'Evens skin tone and fades pigmentation. Numbing cream included.',
        questions: qs(),
      },
      {
        id: 'a5',
        name: 'Laser hair removal — underarm',
        cat: 'laser',
        dur: '30',
        price: '1500',
        buffer: '5',
        active: true,
        pkg: false,
        staff: ['t3'],
        desc: 'Diode laser, priced per session.',
        questions: qs().filter(function (q) {
          return q.id === 'q1';
        }),
      },
      {
        id: 'a6',
        name: 'Glow reset package',
        cat: 'pkg',
        dur: '60',
        price: '7500',
        buffer: '10',
        active: true,
        pkg: true,
        staff: ['t2'],
        desc: 'Three signature facials. Book your first session now and the rest later.',
        includes: ['3 × Hydrating signature facial', 'Take-home hydrating serum'],
        addons: [
          { id: 'x1', name: 'LED light therapy', price: '800' },
          { id: 'x2', name: 'Neck & décolleté add-on', price: '600' },
        ],
        questions: qs(),
      },
    ];
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

  peso(n) {
    n = Number(n) || 0;
    return n ? '₱' + n.toLocaleString('en-US') : 'Free';
  }

  sw(on, toggle) {
    return { on: !!on, track: on ? '#5B4BDB' : '#8C929C', knob: on ? '18px' : '0px', toggle: toggle };
  }

  updSvc(id, patch) {
    this.setState({
      saved: false,
      services: this.state.services.map(function (x) {
        return x.id === id ? Object.assign({}, x, patch) : x;
      }),
    });
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var INK = '#0F1115';
    var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var tg = function (k) {
      return function () {
        var o = {};
        o[k] = !self.state[k];
        self.setState(o);
      };
    };
    var setter = function (k) {
      return function (e) {
        var o = {};
        o[k] = e.target.value;
        self.setState(o);
      };
    };

    var BIZ = [
      { name: 'Lumen Skin Studio', initials: 'LS', site: 'lumenskin.example', color: '#5B4BDB' },
      { name: 'Brightside Dental Care', initials: 'BD', site: 'brightsidedental.example', color: '#1D4ED8' },
      { name: 'Snapshot Booth Co.', initials: 'SB', site: 'snapshotbooth.example', color: '#B4235A' },
    ];
    var biz = BIZ[s.bizIdx] || BIZ[0];
    var bizList = BIZ.map(function (bz, i) {
      return {
        name: bz.name,
        initials: bz.initials,
        site: bz.site,
        color: bz.color,
        on: i === s.bizIdx,
        bg: i === s.bizIdx ? '#F4F3FE' : 'transparent',
        pick: function () {
          self.setState({ bizIdx: i, bizMenu: false });
        },
      };
    });

    var STAFF = {
      t1: { name: 'Dr. Ana Reyes', short: 'Dr. Ana', initials: 'AR', color: '#5B4BDB', soft: '#ECE9FB' },
      t2: { name: 'Mia Santos', short: 'Mia', initials: 'MS', color: '#0F766E', soft: '#E0F2EF' },
      t3: { name: 'Jules Tan', short: 'Jules', initials: 'JT', color: '#B45309', soft: '#FBEEDD' },
    };
    var CAT = {
      a1: { name: 'Skin consultation', dur: 30, price: 0 },
      a2: { name: 'Hydrating signature facial', dur: 60, price: 2800 },
      a3: { name: 'Acne clearing facial', dur: 75, price: 3200 },
      a4: { name: 'Pico laser toning', dur: 45, price: 4500 },
      a5: { name: 'Laser hair removal — underarm', dur: 30, price: 1500 },
      a6: { name: 'Glow reset package', dur: 60, price: 7500 },
    };
    var RAW = [
      ['b1', 0, 570, 'a2', 't2', 'Carla Mendoza', 'completed'],
      ['b2', 0, 660, 'a1', 't1', 'Paolo Garcia', 'completed'],
      ['b3', 0, 840, 'a4', 't3', 'Trisha Lim', 'completed'],
      ['b4', 1, 600, 'a3', 't2', 'Nina Villanueva', 'completed'],
      ['b5', 1, 810, 'a5', 't3', 'Jasmine Co', 'no-show'],
      ['b6', 2, 540, 'a6', 't2', 'Bea Ramos', 'completed'],
      ['b7', 2, 900, 'a1', 't1', 'Kevin Ong', 'cancelled'],
      ['b8', 3, 600, 'a2', 't2', 'Andrea Cruz', 'completed'],
      ['b9', 3, 840, 'a4', 't3', 'Liza Fernandez', 'confirmed'],
      ['b10', 3, 930, 'a1', 't1', 'Marco Reyes', 'pending'],
      ['b11', 3, 960, 'a3', 't2', 'Sofia Tan', 'confirmed'],
      ['b12', 4, 570, 'a5', 't3', 'Hannah Lopez', 'confirmed'],
      ['b13', 4, 660, 'a1', 't1', 'Gabriel Santos', 'pending'],
      ['b14', 4, 780, 'a6', 't2', 'Rina Aquino', 'confirmed'],
      ['b15', 5, 540, 'a2', 't2', 'Celine Uy', 'confirmed'],
      ['b16', 5, 630, 'a4', 't3', 'Mae Dizon', 'confirmed'],
      ['b17', 5, 720, 'a3', 't2', 'Joy Bautista', 'pending'],
    ];
    var ST = {
      confirmed: { label: 'Confirmed', bg: '#E7F6EE', fg: '#0B6B45' },
      pending: { label: 'Pending', bg: '#FEF3E2', fg: '#8A4A06' },
      completed: { label: 'Completed', bg: '#EEEFF2', fg: '#3F4450' },
      cancelled: { label: 'Cancelled', bg: '#FDECEA', fg: '#A12A20' },
      'no-show': { label: 'No-show', bg: '#FDECEA', fg: '#A12A20' },
    };
    var SOURCES = ['Website embed', 'Booking page', 'Added by staff'];
    var CONCERNS = ['Pigmentation', 'Acne', 'Dryness', 'Fine lines'];
    var NOTES = ['None', 'Sensitive to fragrance', 'Had a peel 3 weeks ago', 'None'];
    var bookings = RAW.map(function (r, i) {
      var c = CAT[r[3]];
      var first = r[5].split(' ')[0].toLowerCase();
      return {
        id: r[0],
        day: r[1],
        t: r[2],
        svc: c.name,
        dur: c.dur,
        price: c.price,
        staffId: r[4],
        staff: STAFF[r[4]],
        cust: r[5],
        status: s.overrides[r[0]] || r[6],
        email: first + '.' + r[5].split(' ')[1].toLowerCase().charAt(0) + '@example.com',
        phone: '+63 917 000 ' + (1000 + i * 37),
        source: SOURCES[i % 3],
        ref: 'BK-' + (482910 + i * 113),
        answers: [
          { q: 'Is this your first visit with us?', a: i % 2 ? 'No' : 'Yes' },
          { q: 'What is your main skin concern?', a: CONCERNS[i % 4] },
          { q: 'Allergies, medications or recent treatments', a: NOTES[i % 4] },
        ],
      };
    });

    var live = bookings.filter(function (b) {
      return b.status !== 'cancelled';
    });
    var pendingCount = bookings.filter(function (b) {
      return b.status === 'pending';
    }).length;
    var todayCount = live.filter(function (b) {
      return b.day === 3;
    }).length;
    var value = live
      .filter(function (b) {
        return b.status !== 'no-show';
      })
      .reduce(function (n, b) {
        return n + b.price;
      }, 0);
    var stats = [
      { label: 'Today', value: String(todayCount), sub: 'Thursday, 19 Nov', color: INK },
      { label: 'This week', value: String(live.length), sub: 'Bookings, excluding cancellations', color: INK },
      {
        label: 'Awaiting confirmation',
        value: String(pendingCount),
        sub: pendingCount ? 'Open a booking to confirm it' : 'All caught up',
        color: pendingCount ? '#8A4A06' : INK,
      },
      { label: 'Booked value', value: self.peso(value), sub: 'This week, before discounts', color: INK },
    ];

    var mon = new Date(2026, 10, 16 + 7 * s.weekOffset);
    var sat = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 5);
    var weekLabel =
      mon.getDate() +
      (mon.getMonth() !== sat.getMonth() ? ' ' + MON[mon.getMonth()] : '') +
      ' – ' +
      sat.getDate() +
      ' ' +
      MON[sat.getMonth()] +
      ' ' +
      sat.getFullYear();
    var inWeek = s.weekOffset === 0 ? bookings : [];
    var shown = inWeek.filter(function (b) {
      return s.staffFilter === 'all' || b.staffId === s.staffFilter;
    });

    var blockFor = function (b) {
      var cancelled = b.status === 'cancelled' || b.status === 'no-show';
      return {
        top: b.t - 540,
        h: Math.max(b.dur, 32),
        time: self.fmt(b.t) + ' – ' + self.fmt(b.t + b.dur),
        cust: b.cust,
        svc: b.svc,
        aria: b.cust + ', ' + b.svc + ', ' + self.fmt(b.t) + ', ' + ST[b.status].label,
        bg: cancelled ? '#F3F4F6' : b.staff.soft,
        fg: cancelled ? '#5B616E' : INK,
        border: cancelled ? '#D9DBE1' : b.status === 'pending' ? '#B45309' : b.staff.soft,
        borderStyle: b.status === 'pending' ? 'dashed' : 'solid',
        dot: cancelled ? '#A9AEB8' : b.staff.color,
        deco: cancelled ? 'line-through' : 'none',
        open: function () {
          self.setState({ openId: b.id });
        },
      };
    };
    var week = [0, 1, 2, 3, 4, 5].map(function (di) {
      var dt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + di);
      var isToday = s.weekOffset === 0 && di === 3;
      return {
        wd: WD[dt.getDay()],
        num: dt.getDate(),
        numBg: isToday ? '#5B4BDB' : 'transparent',
        numFg: isToday ? '#FFFFFF' : INK,
        colBg: isToday ? '#FBFAFF' : '#FFFFFF',
        hasClosed: di === 5,
        closedTop: 360,
        closedH: 180,
        showNow: isToday,
        nowTop: 708 - 540,
        blocks: shown
          .filter(function (b) {
            return b.day === di;
          })
          .map(blockFor),
      };
    });
    var hours = [];
    for (var h = 9; h <= 18; h++) hours.push({ label: self.fmt(h * 60).replace(':00', ''), top: (h - 9) * 60 - 7 });

    var listGroups = [0, 1, 2, 3, 4, 5]
      .map(function (di, gi) {
        var dt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + di);
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
              svc: b.svc,
              staff: b.staff.name,
              dot: b.staff.color,
              status: x.label,
              stBg: x.bg,
              stFg: x.fg,
              price: self.peso(b.price),
              deco: b.status === 'cancelled' ? 'line-through' : 'none',
              open: function () {
                self.setState({ openId: b.id });
              },
            };
          });
        return {
          label: WDL[dt.getDay()] + ', ' + dt.getDate() + ' ' + MON[dt.getMonth()],
          isToday: s.weekOffset === 0 && di === 3,
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
        ['t1', 't2', 't3'].map(function (id) {
          return { id: id, label: STAFF[id].short, dot: STAFF[id].color };
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

    // drawer
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
      var odt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + ob.day);
      var setStatus = function (st) {
        return function () {
          var o = Object.assign({}, self.state.overrides);
          o[ob.id] = st;
          self.setState({ overrides: o });
        };
      };
      var orows = [
        ['Service', ob.svc],
        ['With', ob.staff.name],
        [
          'When',
          WDL[odt.getDay()] +
            ', ' +
            odt.getDate() +
            ' ' +
            MON[odt.getMonth()] +
            ' 2026\n' +
            self.fmt(ob.t) +
            ' – ' +
            self.fmt(ob.t + ob.dur),
        ],
        ['Price', self.peso(ob.price)],
        ['Booked via', ob.source],
      ];
      op = {
        stBg: ST[ob.status].bg,
        stFg: ST[ob.status].fg,
        status: ST[ob.status].label,
        ref: ob.ref,
        cust: ob.cust,
        email: ob.email,
        phone: ob.phone,
        rows: orows.map(function (r, i) {
          return { k: r[0], v: r[1], line: i < orows.length - 1 ? '#EEEFF2' : 'transparent' };
        }),
        answers: ob.answers,
        isPending: ob.status === 'pending',
        isConfirmed: ob.status === 'confirmed',
        isClosed: ['completed', 'cancelled', 'no-show'].indexOf(ob.status) >= 0,
        confirm: setStatus('confirmed'),
        cancel: setStatus('cancelled'),
      };
    }

    // nav
    var mk = function (key) {
      var on = s.tab === key;
      return {
        bg: on ? '#F1F1F4' : 'transparent',
        fg: on ? INK : '#4A505C',
        icon: on ? '#5B4BDB' : '#6B7280',
        cur: on ? 'page' : undefined,
        go: function () {
          self.setState({ tab: key, bizMenu: false });
          if (self.props.onTabChange) self.props.onTabChange(key);
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
      bookings: { title: 'Bookings', sub: biz.name + ' · Asia/Manila (GMT+8)' },
      services: {
        title: 'Services & packages',
        sub: 'What customers can book, and what you ask them before they arrive.',
      },
      availability: {
        title: 'Availability',
        sub: 'When customers can book. Staff use these hours unless you customize theirs.',
      },
      page: { title: 'Booking page & embed', sub: 'Share your link or put the booking flow on any website.' },
      integrations: { title: 'Calendar & email', sub: 'Keep Google Calendar in sync and choose who gets notified.' },
    };

    // services editor
    var groupsSvc = [
      ['Services', false],
      ['Packages', true],
    ]
      .map(function (g) {
        return {
          label: g[0],
          items: s.services
            .filter(function (x) {
              return !!x.pkg === g[1];
            })
            .map(function (x) {
              var on = x.id === s.selSvc;
              var sw0 = self.sw(x.active, function () {
                self.updSvc(x.id, { active: !x.active });
              });
              return {
                name: x.name || 'Untitled',
                meta: self.durLabel(x.dur) + ' · ' + self.peso(x.price) + ' · ' + x.staff.length + ' staff',
                on: on,
                bg: on ? '#F4F3FE' : 'transparent',
                nameColor: x.active ? INK : '#5B616E',
                active: x.active,
                track: sw0.track,
                knob: sw0.knob,
                toggle: sw0.toggle,
                switchLabel: (x.active ? 'Hide ' : 'Show ') + (x.name || 'service') + ' on booking page',
                pick: function () {
                  self.setState({ selSvc: x.id });
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
    if (cur) {
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
      ed = {
        name: cur.name,
        cat: cur.cat,
        dur: cur.dur,
        price: cur.price,
        buffer: cur.buffer,
        desc: cur.desc,
        pkg: !!cur.pkg,
        kind: cur.pkg ? 'Package' : 'Service',
        kindLower: cur.pkg ? 'package' : 'service',
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
        staff: ['t1', 't2', 't3'].map(function (sid) {
          var on = cur.staff.indexOf(sid) >= 0;
          return {
            name: STAFF[sid].name,
            initials: STAFF[sid].initials,
            color: STAFF[sid].color,
            on: on,
            bg: on ? '#F4F3FE' : '#FFFFFF',
            border: on ? '#5B4BDB' : '#D9DBE1',
            toggle: function () {
              var list = cur.staff.slice();
              var i = list.indexOf(sid);
              if (i >= 0) list.splice(i, 1);
              else list.push(sid);
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
              { id: 'q' + Date.now(), label: 'New question', type: 'short', req: false },
            ]),
          });
        },
        del: function () {
          var rest = self.state.services.filter(function (z) {
            return z.id !== id;
          });
          self.setState({ services: rest, selSvc: rest.length ? rest[0].id : null });
        },
        save: function () {
          self.setState({ saved: true });
        },
        savedNote: s.saved ? 'Saved' : '',
      };
    }

    var hoursRows = s.hours.map(function (r, i) {
      var upd = function (patch) {
        var hs = self.state.hours.map(function (z, j) {
          return j === i ? Object.assign({}, z, patch) : z;
        });
        self.setState({ hours: hs, savedAll: false });
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

    var embedCodes = {
      inline:
        '<iframe src="https://[domain]/' +
        s.slug +
        '?embed=true"\n  title="Book with ' +
        biz.name +
        '" loading="lazy"\n  style="width:100%;min-height:720px;border:0"></iframe>\n<script src="https://[domain]/embed.js" async></' +
        'script>',
      popup:
        '<button data-book="' +
        s.slug +
        '">Book now</button>\n<script src="https://[domain]/embed.js" async></' +
        'script>',
      link: 'https://[domain]/' + s.slug,
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
        pick: function () {
          self.setState({ brand: c[0] });
        },
      };
    });

    var mailDefs = [
      ['mNew', 'New booking alert', 'Email you the moment someone books, with their answers.'],
      ['mConfirm', 'Customer confirmation', 'Booking details and an .ics calendar file for the customer.'],
      ['mChanges', 'Reschedules & cancellations', 'Notify both you and the customer.'],
      ['mDigest', 'Daily agenda', "Today's bookings at 7:00 AM."],
      ['mReview', 'Follow-up after visit', 'Thank-you email with a review link, 2 hours after.'],
    ];
    var mailRows = mailDefs.map(function (m) {
      var t = self.sw(s[m[0]], tg(m[0]));
      return { title: m[1], sub: m[2], on: t.on, track: t.track, knob: t.knob, toggle: t.toggle };
    });

    var tabs = s.tab;
    return {
      biz: biz,
      bizList: bizList,
      bizMenu: s.bizMenu,
      toggleBiz: tg('bizMenu'),
      nav: nav,
      page: PAGES[tabs] || PAGES.bookings,
      hasPending: pendingCount > 0,
      pendingCount: pendingCount,
      isBookings: tabs === 'bookings',
      isServices: tabs === 'services',
      isAvailability: tabs === 'availability',
      isPage: tabs === 'page',
      isIntegrations: tabs === 'integrations',
      copyLink: function () {
        self.setState({ copied: 'link' });
        try {
          navigator.clipboard.writeText('https://[domain]/' + self.state.slug);
        } catch (e) {}
      },
      copyLinkLabel: s.copied === 'link' ? 'Link copied' : 'Copy booking link',
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
      weekEmpty: inWeek.length === 0,
      showWeekGrid: inWeek.length > 0 && s.view === 'week',
      showList: inWeek.length > 0 && s.view === 'list',
      week: week,
      hours: hours,
      listGroups: listGroups,
      hasOpen: !!ob,
      op: op,
      closeOpen: function () {
        self.setState({ openId: null });
      },
      svcGroups: groupsSvc,
      hasEdit: !!cur,
      ed: ed,
      addService: function () {
        var nid = 'n' + Date.now();
        self.setState({
          services: self.state.services.concat([
            {
              id: nid,
              name: 'New service',
              cat: 'facial',
              dur: '60',
              price: '',
              buffer: '0',
              active: false,
              pkg: false,
              staff: [],
              desc: '',
              questions: [],
            },
          ]),
          selSvc: nid,
          saved: false,
        });
      },
      hoursRows: hoursRows,
      interval: s.interval,
      notice: s.notice,
      advance: s.advance,
      bizTz: s.bizTz,
      setInterval: setter('interval'),
      setNotice: setter('notice'),
      setAdvance: setter('advance'),
      setBizTz: setter('bizTz'),
      saveAll: function () {
        self.setState({ savedAll: true });
      },
      saveLabel: s.savedAll ? 'Saved' : 'Save changes',
      timeOff: s.timeOff.map(function (t) {
        return {
          label: t.label,
          note: t.note,
          remove: function () {
            self.setState({
              timeOff: self.state.timeOff.filter(function (z) {
                return z.id !== t.id;
              }),
            });
          },
        };
      }),
      addTimeOff: function () {
        self.setState({
          timeOff: self.state.timeOff.concat([{ id: 'o' + Date.now(), label: 'Choose dates', note: 'New time off' }]),
        });
      },
      staffRows: ['t1', 't2', 't3'].map(function (id) {
        return {
          name: STAFF[id].name,
          initials: STAFF[id].initials,
          color: STAFF[id].color,
          note: id === 't1' ? 'Tue & Thu only · custom hours' : 'Uses business hours',
        };
      }),
      sw: {
        approval: self.sw(s.approval, tg('approval')),
        staffStep: self.sw(s.staffStep, tg('staffStep')),
        prices: self.sw(s.prices, tg('prices')),
        conflicts: self.sw(s.conflicts, tg('conflicts')),
        twoWay: self.sw(s.twoWay, tg('twoWay')),
        details: self.sw(s.details, tg('details')),
      },
      slug: s.slug,
      setSlug: function (e) {
        self.setState({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'), copied: '' });
      },
      embedTabs: embedTabs,
      embedCode: embedCodes[s.embedTab],
      embedHelp: embedHelps[s.embedTab],
      copyCode: function () {
        self.setState({ copied: 'code' });
        try {
          navigator.clipboard.writeText(embedCodes[self.state.embedTab]);
        } catch (e) {}
      },
      copyCodeLabel: s.copied === 'code' ? 'Copied' : 'Copy',
      swatches: swatches,
      brand: s.brand,
      gcal: s.gcal,
      gcalOff: !s.gcal,
      toggleGcal: tg('gcal'),
      gcalSub: s.gcal ? 'Connected as hello@lumenskin.example' : 'Not connected',
      gcalPill: s.gcal ? 'Connected' : 'Off',
      gcalPillBg: s.gcal ? '#E7F6EE' : '#EEEFF2',
      gcalPillFg: s.gcal ? '#0B6B45' : '#3F4450',
      gcalCal: s.gcalCal,
      setGcalCal: setter('gcalCal'),
      mailRows: mailRows,
      remWhen: s.remWhen,
      setRemWhen: setter('remWhen'),
      ownerEmail: s.ownerEmail,
      setOwnerEmail: setter('ownerEmail'),
      fromName: s.fromName,
      setFromName: setter('fromName'),
      sendTest: function () {
        self.setState({ testSent: true });
      },
      testSent: s.testSent,
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
                    onClick={v.toggleBiz}
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
              href="/lumen-skin-studio"
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
                AR
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Ana Reyes</span>
                <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>Owner</span>
              </span>
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
                            gridTemplateColumns: '64px repeat(6, minmax(0, 1fr))',
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
                            gridTemplateColumns: '64px repeat(6, minmax(0, 1fr))',
                            padding: '12px 0',
                          }}
                        >
                          <div style={{ position: 'relative', height: '540px' }}>
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
                                  height: '540px',
                                  borderLeft: '1px solid #EEEFF2',
                                  backgroundColor: dd?.colBg,
                                  backgroundImage:
                                    'repeating-linear-gradient(to bottom, #EEEFF2 0, #EEEFF2 1px, transparent 1px, transparent 60px)',
                                }}
                              >
                                {dd?.hasClosed ? (
                                  <>
                                    <div
                                      aria-hidden="true"
                                      style={{
                                        position: 'absolute',
                                        left: '0',
                                        right: '0',
                                        top: `${dd?.closedTop}px`,
                                        height: `${dd?.closedH}px`,
                                        backgroundImage:
                                          'repeating-linear-gradient(135deg, #F1F2F4 0, #F1F2F4 6px, #FFFFFF 6px, #FFFFFF 12px)',
                                      }}
                                    />
                                  </>
                                ) : null}{' '}
                                {(dd?.blocks || []).map((bk, bk_i) => (
                                  <React.Fragment key={bk_i}>
                                    <button
                                      type="button"
                                      onClick={bk?.open}
                                      aria-label={bk?.aria}
                                      style={{
                                        position: 'absolute',
                                        left: '4px',
                                        right: '4px',
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
                              <option value="consult">Consultations</option>
                              <option value="facial">Facials</option>
                              <option value="laser">Laser</option>
                              <option value="pkg">Packages</option>
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
                              <option value="15">15 min</option>
                              <option value="30">30 min</option>
                              <option value="45">45 min</option>
                              <option value="60">1 hr</option>
                              <option value="75">1 hr 15 min</option>
                              <option value="90">1 hr 30 min</option>
                              <option value="120">2 hrs</option>
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
                              <option value="0">None</option>
                              <option value="5">5 min</option>
                              <option value="10">10 min</option>
                              <option value="15">15 min</option>
                              <option value="30">30 min</option>
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
                                  <option value="choice">Multiple choice</option>
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
                              <button
                                type="button"
                                style={{
                                  height: '40px',
                                  padding: '0 10px',
                                  borderRadius: '10px',
                                  border: '0',
                                  background: 'transparent',
                                  color: '#3F33B8',
                                  fontFamily: 'inherit',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                + Add break
                              </button>
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
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="Australia/Sydney">Australia/Sydney</option>
                        <option value="Australia/Brisbane">Australia/Brisbane</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
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
                          <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '0' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{sr?.name}</span>
                            <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>{sr?.note}</span>
                          </span>
                          <button
                            type="button"
                            style={{
                              height: '36px',
                              padding: '0 12px',
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
                            Customize
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
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
                          [domain]/
                        </span>
                        <input
                          type="text"
                          aria-label="Page address"
                          value={v.slug}
                          onChange={v.setSlug}
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
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                      Each business gets its own slug. Use a custom domain per website in Settings.
                    </span>
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
                        PNG or SVG, square, at least 256 px
                      </span>
                    </span>
                    <button
                      type="button"
                      style={{
                        height: '36px',
                        padding: '0 12px',
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
                      Upload
                    </button>
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
                            <option value="bookings">Lumen Skin Studio — Bookings</option>
                            <option value="primary">hello@lumenskin.example (primary)</option>
                            <option value="new">Create a new calendar…</option>
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
                        <span style={{ fontSize: '14px', color: '#4A505C' }}>
                          Connect once per staff member. New bookings appear on their calendar, and their busy events
                          block slots on your booking page.
                        </span>
                        <button
                          type="button"
                          onClick={v.toggleGcal}
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
