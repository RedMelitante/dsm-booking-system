import React, { useEffect } from 'react';
import { useLocationKey, navigate } from './lib/router.js';
import { findBusiness } from './lib/businesses.js';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import EmbedDemoPage from './pages/EmbedDemoPage.jsx';
import StyleguidePage from './pages/StyleguidePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

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

function resolve(pathname, search) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search);
  const parts = path.split('/').filter(Boolean);

  if (path === '/') return { page: 'home', title: BRAND + ' — Booking pages and website scheduling' };
  if (path === '/signup') return { page: 'signup', title: 'Create your account · ' + BRAND };
  if (path === '/login') return { page: 'login', title: 'Log in · ' + BRAND };
  if (path === '/setup') return { page: 'setup', title: 'Set up your business · ' + BRAND };
  if (parts[0] === 'dashboard' && parts.length <= 2) {
    const tab = parts[1] ? DASH_ROUTES[parts[1]] : 'bookings';
    if (tab) return { page: 'dashboard', tab, title: DASH_TITLES[tab] + ' · ' + BRAND };
  }
  if (path === '/embed-demo') return { page: 'embed-demo', title: 'Embed demo · ' + BRAND };
  if (path === '/styleguide') return { page: 'styleguide', title: 'Design tokens & components · ' + BRAND };
  if (parts.length === 1) {
    const biz = findBusiness(parts[0]);
    if (biz) {
      const embed = q.get('embed') === 'true';
      return {
        page: embed ? 'booking-embed' : 'booking',
        biz,
        embed,
        service: q.get('service') || undefined,
        staff: q.get('staff') || undefined,
        hideStaff: q.get('hide_staff') === '1',
        title: 'Book with ' + biz.name,
      };
    }
  }
  return { page: 'not-found', title: 'Page not found · ' + BRAND };
}

// In embed mode, report the content height to the host page so embed.js can
// size the iframe and avoid an inner scrollbar.
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
      return <AuthPage key="signup" mode="Sign up" />;
    case 'login':
      return <AuthPage key="login" mode="Log in" />;
    case 'setup':
      return <SetupPage />;
    case 'dashboard':
      return <DashboardPage tab={r.tab} onTabChange={(tab) => navigate(tabPath(tab))} />;
    case 'booking':
    case 'booking-embed':
      return (
        <BookingPage
          key={key}
          demo={r.biz.demo}
          accent={r.biz.accent}
          embed={r.embed}
          service={r.service}
          staff={r.staff}
          hideStaff={r.hideStaff}
        />
      );
    case 'embed-demo':
      return <EmbedDemoPage />;
    case 'styleguide':
      return <StyleguidePage />;
    default:
      return <NotFoundPage path={pathname} />;
  }
}
