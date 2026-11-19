import { useSyncExternalStore } from 'react';

// A small history-API router. Pages keep plain <a href="/..."> links (as in the
// design); same-origin clicks are intercepted and handled without a reload.

const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

const snapshot = () => window.location.pathname + window.location.search;

export function useLocationKey() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function navigate(to, { replace = false } = {}) {
  const before = snapshot();
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
  listeners.forEach((l) => l());
  const url = new URL(to, window.location.href);
  if (url.hash) {
    requestAnimationFrame(() => {
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (el) el.scrollIntoView();
    });
  } else if (snapshot() !== before && !replace) {
    window.scrollTo(0, 0);
  }
}

export function installLinkInterceptor() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return; // in-page anchors and placeholders
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (/\.(js|css|json|ics|png|svg|ico|txt|xml)$/.test(url.pathname)) return;
    e.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
}
