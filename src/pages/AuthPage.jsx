// Ported from the design handoff board canvas-source/Signup.dc.html.
// Markup, inline styles and copy are kept as designed; the logic class is the board's own.
import React from 'react';
import { DCLogic } from '../lib/dc.js';

class AuthPageLogic extends DCLogic {
  constructor(...args) {
    super(...args);
    var props = args[0] || {};
    this.state = Object.assign(this.blank(), this.prefill(props), { w: 0 });
    this.rootRef = (el) => {
      this.el = el;
    };
  }

  blank() {
    return { name: '', email: '', pw: '', showPw: false, remember: true, submitted: false, serverErr: false };
  }

  isLoginMode(props) {
    return String((props && props.mode) || 'Sign up').indexOf('Log') === 0;
  }

  prefill(props) {
    if (!props || props.demo !== 'Errors') return {};
    if (this.isLoginMode(props))
      return { email: 'maria@lumenskin.example', pw: 'sunshine22', submitted: true, serverErr: true };
    return { name: '', email: 'maria@', pw: 'abc', submitted: true, serverErr: false };
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
    if (prev && (prev.demo !== this.props.demo || prev.mode !== this.props.mode)) {
      this.setState(Object.assign(this.blank(), this.prefill(this.props)));
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

  renderVals() {
    var self = this;
    var s = this.state;
    var p = this.props || {};
    var login = this.isLoginMode(p);
    var narrow = !!p.phone || (s.w > 0 && s.w < 600);

    var email = String(s.email || '').trim();
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var taken = !login && email.toLowerCase() === 'taken@example.com';
    var errs = {
      name: login ? '' : String(s.name || '').trim() ? '' : 'Enter your name.',
      email: !email
        ? 'Enter your email address.'
        : !emailOk
          ? 'Enter a valid email, like you@business.com.'
          : taken
            ? 'An account already uses this email.'
            : '',
      pw: login
        ? s.pw
          ? ''
          : 'Enter your password.'
        : String(s.pw || '').length < 8
          ? 'Use at least 8 characters.'
          : '',
    };
    var field = function (key) {
      var bad = s.submitted && !!errs[key];
      return {
        show: bad,
        msg: errs[key],
        invalid: bad,
        border: bad ? '#C2362B' : '#D9DBE1',
        ring: bad ? '0 0 0 3px rgba(194,54,43,0.12)' : 'none',
      };
    };
    var valid = !errs.name && !errs.email && !errs.pw;
    var serverErr = login && !!s.serverErr;

    var pw = String(s.pw || '');
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length < 8) score = Math.min(score, 1);
    var col = score <= 1 ? '#C2362B' : score === 2 ? '#B45309' : '#0E7A4F';
    var bars = [1, 2, 3, 4].map(function (i) {
      return { c: i <= score ? col : '#E6E7EB' };
    });
    var strengthLabel = pw.length < 8 ? 'Too short' : ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];

    var set = function (key) {
      return function (e) {
        var o = {};
        o[key] = e.target.value;
        if (key === 'pw' || key === 'email') o.serverErr = false;
        self.setState(o);
      };
    };

    return {
      rootRef: this.rootRef,
      minH: p.minh || (p.phone ? '844px' : '100vh'),
      wide: !narrow,
      headPad: narrow ? '16px 16px 0' : '24px 32px',
      mainPad: narrow ? '20px 16px 24px' : '24px 32px 48px',
      cardPad: narrow ? '24px 20px' : '32px',
      isLogin: login,
      isSignup: !login,
      title: login ? 'Welcome back' : 'Create your account',
      sub: login
        ? 'Log in to manage bookings, services and your booking page.'
        : 'Start on the free plan. Your booking page can be live in minutes.',
      emailLabel: login ? 'Email' : 'Work email',
      pwPlaceholder: login ? 'Your password' : 'At least 8 characters',
      submitLabel: login ? 'Log in' : 'Create account',
      doneHref: login ? '/dashboard' : '/setup',
      switchLead: login ? 'New here?' : 'Already have an account?',
      switchLabel: login ? (narrow ? 'Sign up' : 'Create an account') : 'Log in',
      brandSize: narrow ? '15px' : '17px',
      switchHref: login ? '/signup' : '/login',
      showBanner: serverErr,
      name: s.name,
      email: s.email,
      pw: s.pw,
      setName: set('name'),
      setEmail: set('email'),
      setPw: set('pw'),
      f: { name: field('name'), email: field('email'), pw: field('pw') },
      emailTaken: s.submitted && taken,
      showPw: !!s.showPw,
      pwHidden: !s.showPw,
      pwType: s.showPw ? 'text' : 'password',
      pwToggleLabel: s.showPw ? 'Hide password' : 'Show password',
      togglePw: function () {
        self.setState({ showPw: !self.state.showPw });
      },
      showStrength: !login && pw.length > 0,
      showPwHint: !login && pw.length === 0 && !(s.submitted && errs.pw),
      bars: bars,
      strengthLabel: strengthLabel,
      remember: !!s.remember,
      toggleRemember: function () {
        self.setState({ remember: !self.state.remember });
      },
      canGo: valid && !serverErr,
      cantGo: !(valid && !serverErr),
      submit: function () {
        self.setState({ submitted: true });
      },
    };
  }
}

export default class AuthPage extends AuthPageLogic {
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
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0F1115' }}
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
          <span style={{ fontSize: '14px', color: '#4A505C', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {v.wide ? (
              <>
                <span>{v.switchLead}</span>
              </>
            ) : null}
            <a href={v.switchHref} style={{ color: '#0F1115', fontWeight: '700' }}>
              {v.switchLabel}
            </a>
          </span>
        </header>
        <main
          style={{
            flex: '1 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: v.mainPad,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#FFFFFF',
              border: '1px solid #E6E7EB',
              borderRadius: '16px',
              padding: v.cardPad,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                {v.title}
              </h1>
              <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#5B616E' }}>{v.sub}</p>
            </div>
            {v.showBanner ? (
              <>
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    background: '#FDECEA',
                    border: '1px solid #F5C6C0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#A12A20"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: '0 0 auto', marginTop: '1px' }}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v5.5M12 16.5v.01" />
                  </svg>
                  <span style={{ fontSize: '14px', lineHeight: '20px', color: '#7A1F17' }}>
                    {"That email and password don't match. Try again or "}
                    <a href="#" style={{ color: '#7A1F17', fontWeight: '700' }}>
                      reset your password
                    </a>
                    .
                  </span>
                </div>
              </>
            ) : null}
            <a
              href={v.doneHref}
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
                gap: '10px',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '999px',
                  border: '1.5px solid #0F1115',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                  fontSize: '12px',
                  fontWeight: '800',
                  boxSizing: 'border-box',
                }}
              >
                G
              </span>
              {' Continue with Google'}
            </a>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                lineHeight: '16px',
                fontWeight: '600',
                color: '#5B616E',
              }}
            >
              <span style={{ flex: '1 1 auto', height: '1px', background: '#E6E7EB' }} />
              or use your email
              <span style={{ flex: '1 1 auto', height: '1px', background: '#E6E7EB' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {v.isSignup ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="auth-name"
                      style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                    >
                      Your name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={v.name}
                      onChange={v.setName}
                      placeholder="Maria Dela Cruz"
                      aria-invalid={v.f?.name?.invalid}
                      aria-describedby="auth-name-err"
                      style={{
                        height: '48px',
                        border: `1px solid ${v.f?.name?.border}`,
                        boxShadow: v.f?.name?.ring,
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
                    {v.f?.name?.show ? (
                      <>
                        <span
                          id="auth-name-err"
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
                          {v.f?.name?.msg}
                        </span>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="auth-email"
                  style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                >
                  {v.emailLabel}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={v.email}
                  onChange={v.setEmail}
                  placeholder="you@business.com"
                  aria-invalid={v.f?.email?.invalid}
                  aria-describedby="auth-email-err"
                  style={{
                    height: '48px',
                    border: `1px solid ${v.f?.email?.border}`,
                    boxShadow: v.f?.email?.ring,
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
                {v.f?.email?.show ? (
                  <>
                    <span
                      id="auth-email-err"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
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
                      {v.f?.email?.msg}
                      {v.emailTaken ? (
                        <>
                          <a href="/login" style={{ color: '#A12A20', fontWeight: '700' }}>
                            Log in instead
                          </a>
                        </>
                      ) : null}
                    </span>
                  </>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    htmlFor="auth-pw"
                    style={{ fontSize: '13px', lineHeight: '18px', fontWeight: '600', color: '#2B2F36' }}
                  >
                    Password
                  </label>
                  {v.isLogin ? (
                    <>
                      <a href="#" style={{ fontSize: '13px', fontWeight: '600', color: '#2B2F36' }}>
                        Forgot password?
                      </a>
                    </>
                  ) : null}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="auth-pw"
                    type={v.pwType}
                    value={v.pw}
                    onChange={v.setPw}
                    placeholder={v.pwPlaceholder}
                    aria-invalid={v.f?.pw?.invalid}
                    aria-describedby="auth-pw-err"
                    style={{
                      height: '48px',
                      border: `1px solid ${v.f?.pw?.border}`,
                      boxShadow: v.f?.pw?.ring,
                      borderRadius: '10px',
                      padding: '0 52px 0 14px',
                      fontFamily: 'inherit',
                      fontSize: '16px',
                      color: '#0F1115',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      width: '100%',
                    }}
                  />
                  <button
                    type="button"
                    onClick={v.togglePw}
                    aria-label={v.pwToggleLabel}
                    aria-pressed={v.showPw}
                    style={{
                      position: 'absolute',
                      right: '4px',
                      width: '44px',
                      height: '40px',
                      border: '0',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: '#4A505C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '0',
                    }}
                  >
                    {v.pwHidden ? (
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
                          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </>
                    ) : null}
                    {v.showPw ? (
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
                          <path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 7.4A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                        </svg>
                      </>
                    ) : null}
                  </button>
                </div>
                {v.showStrength ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          flex: '1 1 auto',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                          gap: '4px',
                        }}
                      >
                        {(v.bars || []).map((br, br_i) => (
                          <React.Fragment key={br_i}>
                            <span style={{ height: '4px', borderRadius: '999px', background: br?.c }} />
                          </React.Fragment>
                        ))}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          lineHeight: '16px',
                          fontWeight: '600',
                          color: '#4A505C',
                          minWidth: '64px',
                          textAlign: 'right',
                        }}
                      >
                        {v.strengthLabel}
                      </span>
                    </div>
                  </>
                ) : null}
                {v.f?.pw?.show ? (
                  <>
                    <span
                      id="auth-pw-err"
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
                      {v.f?.pw?.msg}
                    </span>
                  </>
                ) : null}
                {v.showPwHint ? (
                  <>
                    <span style={{ fontSize: '12px', lineHeight: '16px', color: '#5B616E' }}>
                      At least 8 characters. Mix in numbers and capitals to make it stronger.
                    </span>
                  </>
                ) : null}
              </div>
              {v.isLogin ? (
                <>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '32px',
                      fontSize: '14px',
                      color: '#2B2F36',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={v.remember}
                      onChange={v.toggleRemember}
                      style={{ width: '18px', height: '18px', margin: '0', accentColor: '#0F1115' }}
                    />
                    {' Keep me logged in on this device'}
                  </label>
                </>
              ) : null}
            </div>
            {v.canGo ? (
              <>
                <a
                  href={v.doneHref}
                  style={{
                    height: '52px',
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
                  {v.submitLabel}
                </a>
              </>
            ) : null}
            {v.cantGo ? (
              <>
                <button
                  type="button"
                  onClick={v.submit}
                  style={{
                    height: '52px',
                    width: '100%',
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
                  {v.submitLabel}
                </button>
              </>
            ) : null}
            {v.isSignup ? (
              <>
                <p style={{ margin: '0', fontSize: '12px', lineHeight: '17px', color: '#5B616E', textAlign: 'center' }}>
                  {'By creating an account you agree to the '}
                  <a href="#" style={{ color: '#2B2F36' }}>
                    Terms
                  </a>
                  {' and '}
                  <a href="#" style={{ color: '#2B2F36' }}>
                    Privacy Policy
                  </a>
                  .
                </p>
              </>
            ) : null}
            <p
              style={{
                margin: '0',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#4A505C',
                textAlign: 'center',
                borderTop: '1px solid #EEEFF2',
                paddingTop: '16px',
              }}
            >
              {v.switchLead}{' '}
              <a href={v.switchHref} style={{ color: '#0F1115', fontWeight: '700' }}>
                {v.switchLabel}
              </a>
            </p>
          </div>
        </main>
        <footer
          style={{
            padding: '16px 20px 24px',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '16px',
            color: '#5B616E',
          }}
        >
          {'© 2026 Digital Services Master · '}
          <a href="#" style={{ color: '#5B616E' }}>
            Privacy
          </a>
          {' · '}
          <a href="#" style={{ color: '#5B616E' }}>
            Terms
          </a>
        </footer>
      </div>
    );
  }
}
