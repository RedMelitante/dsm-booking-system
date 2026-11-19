import React, { useState } from 'react';
import { Shell, Heading, Field, Banner, primaryBtn } from '../components/Shell.jsx';
import { api, getMe } from '../lib/api.js';
import { navigate } from '../lib/router.js';

// /forgot-password (ask for a link) and /reset-password?token=… (choose a new password).
// Not drawn in the handoff; built from the auth card.
export default function ResetPasswordPage({ token }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState('');

  async function request(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFieldErr('Enter a valid email, like you@business.com.');
    setFieldErr(''); setError(''); setBusy(true);
    try {
      await api('/auth/forgot', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function reset(e) {
    e.preventDefault();
    if (pw.length < 8) return setFieldErr('Use at least 8 characters.');
    setFieldErr(''); setError(''); setBusy(true);
    try {
      const r = await api('/auth/reset', { method: 'POST', body: { token, password: pw } });
      await getMe(true);
      navigate(r.businesses && r.businesses.length ? '/dashboard' : '/setup');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (token) {
    return (
      <Shell>
        <Heading title="Choose a new password" sub="You'll be logged in on this device. Other devices are logged out." />
        {error ? <Banner>{error} <a href="/forgot-password" style={{ color: '#7A1F17', fontWeight: '700' }}>Get a new link</a></Banner> : null}
        <form onSubmit={reset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
          <Field id="reset-pw" label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" error={fieldErr} autoComplete="new-password" />
          <button type="submit" style={primaryBtn} disabled={busy}>{busy ? 'Saving…' : 'Save password and log in'}</button>
        </form>
      </Shell>
    );
  }
  return (
    <Shell>
      <Heading title="Reset your password" sub="We'll email you a link to choose a new one." />
      {sent ? (
        <Banner tone="success">If an account uses {email.trim()}, a reset link is on its way. It works for one hour.</Banner>
      ) : (
        <form onSubmit={request} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
          {error ? <Banner>{error}</Banner> : null}
          <Field id="forgot-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" error={fieldErr} autoComplete="email" />
          <button type="submit" style={primaryBtn} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <p style={{ margin: '0', fontSize: '14px', lineHeight: '20px', color: '#4A505C', textAlign: 'center', borderTop: '1px solid #EEEFF2', paddingTop: '16px' }}>
        Remembered it? <a href="/login" style={{ color: '#0F1115', fontWeight: '700' }}>Log in</a>
      </p>
    </Shell>
  );
}
