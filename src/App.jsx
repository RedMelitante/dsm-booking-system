import React, { useEffect, useState, useCallback } from 'react';
import { useLocationKey, navigate } from './lib/router.js';
import { api, getMe } from './lib/api.js';
import { isReservedSlug } from './lib/reserved.js';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import EmbedDemoPage from './pages/EmbedDemoPage.jsx';
import StyleguidePage from './pages/StyleguidePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import { LoadingScreen, ErrorScreen } from './components/Shell.jsx';

const BRAND = 'Digital Services Master';

// Dashboard sub-routes ↔ the dashboard's internal tab keys.
const DASH_ROUTES = {
  bookings: 'bookings',
  services: 'services',
  availability: 'availability',
  'booking-page': 'page',
  integrations: 'integrations',
};
const DASH_TITLES = {
  bookings: 'Bookings',
  services: 'Services & packages',
  availability: 'Availability',
  page: 'Booking page & embed',
  integrations: 'Calendar & email',
};
const tabPath = (tab) => '/dashboard/' + (Object.keys(DASH_ROUTES).find((k) => DASH_ROUTES[k] === tab) || 'bookings');

const BIZ_KEY = 'dsm:business';
const savedBiz = () => { try { return localStorage.getItem(BIZ_KEY); } catch (e) { return null; } };
const saveBiz = (id) => { try { localStorage.setItem(BIZ_KEY, id); } catch (e) { /* ignore */ } };

function resolve(pathname, search) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search);
  const parts = path.split('/').filter(Boolean);

  if (path === '/') return { page: 'home', title: BRAND + ' — Booking pages and website scheduling' };
  if (path === '/signup') return { page: 'signup', title: 'Create your account · ' + BRAND };
  if (path === '/login') return { page: 'login', title: 'Log in · ' + BRAND };
  if (path === '/forgot-password') return { page: 'forgot', title: 'Reset your password · ' + BRAND };
  if (path === '/reset-password') return { page: 'reset', token: q.get('token') || '', title: 'Choose a new password · ' + BRAND };
  if (path === '/setup') return { page: 'setup', title: 'Set up your business · ' + BRAND };
  if (parts[0] === 'dashboard' && parts.length <= 2) {
    const tab = parts[1] ? DASH_ROUTES[parts[1]] : 'bookings';
    if (tab) return { page: 'dashboard', tab, title: DASH_TITLES[tab] + ' · ' + BRAND };
  }
  if (path === '/embed-demo') return { page: 'embed-demo', title: 'Embed demo · ' + BRAND };
  if (path === '/styleguide') return { page: 'styleguide', title: 'Design tokens & components · ' + BRAND };
  if (parts.length === 1 && !isReservedSlug(parts[0]) && /^[a-z0-9-]{3,40}$/i.test(parts[0])) {
    const embed = q.get('embed') === 'true';
    return {
      page: embed ? 'booking-embed' : 'booking',
      slug: parts[0].toLowerCase(),
      embed,
      service: q.get('service') || undefined,
      staff: q.get('staff') || undefined,
      hideStaff: q.get('hide_staff') === '1',
      title: 'Book an appointment',
    };
  }
  return { page: 'not-found', title: 'Page not found · ' + BRAND };
}

// Runs `fn` when `key` changes; returns { state, data, error, reload }.
function useLoad(key, fn) {
  const [res, setRes] = useState({ state: 'loading', key });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setRes({ state: 'loading', key });
    fn().then(
      (data) => live && setRes({ state: data === undefined ? 'redirect' : 'ok', data, key }),
      (error) => live && setRes({ state: 'error', error, key }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return Object.assign({}, res.key === key ? res : { state: 'loading' }, { reload });
}

function useEmbedHeight(active) {
  useEffect(() => {
    if (!active || window.parent === window) return undefined;
    const root = document.getElementById('root');
    let last = 0;
    const post = () => {
      const h = Math.ceil(root.getBoundingClientRect().height);
      if (h && h !== last) {
        last = h;
        window.parent.postMessage({ type: 'dsm-booking:height', height: h }, '*');
      }
    };
    const ro = new ResizeObserver(post);
    ro.observe(root);
    post();
    return () => ro.disconnect();
  }, [active]);
}

function Auth({ mode }) {
  const r = useLoad(mode, async () => {
    const me = await getMe();
    if (me.user) {
      navigate(me.businesses.length ? '/dashboard' : '/setup', { replace: true });
      return undefined;
    }
    return me;
  });
  if (r.state === 'loading' || r.state === 'redirect') return <LoadingScreen />;
  const googleEnabled = r.state === 'ok' && r.data.googleConfigured;
  return <AuthPage key={mode} mode={mode === 'login' ? 'Log in' : 'Sign up'} googleEnabled={googleEnabled} />;
}

function Setup() {
  const r = useLoad('setup', async () => {
    const me = await getMe();
    if (!me.user) {
      navigate('/login?next=' + encodeURIComponent('/setup' + window.location.search), { replace: true });
      return undefined;
    }
    return me;
  });
  if (r.state === 'error') return <ErrorScreen message={r.error.message} onRetry={r.reload} />;
  if (r.state !== 'ok') return <LoadingScreen />;
  return <SetupPage me={r.data} />;
}

function Dashboard({ tab }) {
  const [bizId, setBizId] = useState(savedBiz());
  const r = useLoad('dash:' + bizId, async () => {
    const me = await getMe(true);
    if (!me.user) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname), { replace: true });
      return undefined;
    }
    if (!me.businesses.length) {
      navigate('/setup', { replace: true });
      return undefined;
    }
    const id = me.businesses.some((b) => b.id === bizId) ? bizId : me.businesses[0].id;
    saveBiz(id);
    const detail = await api('/businesses/' + id);
    return { me, detail };
  });
  if (r.state === 'error') {
    if (r.error.status === 401) {
      navigate('/login?next=/dashboard', { replace: true });
      return <LoadingScreen />;
    }
    return <ErrorScreen message={r.error.message} onRetry={r.reload} />;
  }
  if (r.state !== 'ok') return <LoadingScreen />;
  return (
    <DashboardPage
      key={r.data.detail.business.id}
      tab={tab}
      me={r.data.me}
      data={r.data.detail}
      onTabChange={(t) => navigate(tabPath(t))}
      onSwitchBusiness={(id) => { saveBiz(id); setBizId(id); }}
      onReload={r.reload}
    />
  );
}

function Booking({ route, locKey }) {
  const r = useLoad('pub:' + route.slug, () => api('/public/' + encodeURIComponent(route.slug)));
  useEffect(() => {
    if (r.state === 'ok') document.title = 'Book with ' + r.data.biz.name;
  }, [r.state, r.data]);
  if (r.state === 'error') {
    if (r.error.status === 404) return <NotFoundPage path={'/' + route.slug} />;
    return <ErrorScreen message={r.error.message} onRetry={r.reload} />;
  }
  if (r.state !== 'ok') return route.embed ? null : <LoadingScreen />;
  return (
    <BookingPage
      key={locKey}
      data={r.data}
      accent={r.data.biz.accent}
      embed={route.embed}
      service={route.service}
      staff={route.staff}
      hideStaff={route.hideStaff || !r.data.settings.staffStep}
    />
  );
}

export default function App() {
  const key = useLocationKey();
  const { pathname, search } = window.location;
  const r = resolve(pathname, search);

  useEffect(() => {
    document.title = r.title;
    document.body.dataset.page = r.page;
  }, [r.title, r.page]);

  useEmbedHeight(r.page === 'booking-embed');

  switch (r.page) {
    case 'home':
      return <HomePage />;
    case 'signup':
    case 'login':
      return <Auth mode={r.page} />;
    case 'forgot':
      return <ResetPasswordPage key="forgot" />;
    case 'reset':
      return <ResetPasswordPage key="reset" token={r.token} />;
    case 'setup':
      return <Setup />;
    case 'dashboard':
      return <Dashboard tab={r.tab} />;
    case 'booking':
    case 'booking-embed':
      return <Booking route={r} locKey={key} />;
    case 'embed-demo':
      return <EmbedDemoPage />;
    case 'styleguide':
      return <StyleguidePage />;
    default:
      return <NotFoundPage path={pathname} />;
  }
}
