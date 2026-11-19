/*! Digital Services Master — booking embed helper
 *
 * Inline:  <iframe src="https://[domain]/[slug]?embed=true" ...></iframe>
 *          <script src="https://[domain]/embed.js" async></script>
 *          The iframe is resized to fit each step (no inner scrollbar).
 *
 * Popup:   <button data-book="[slug]">Book now</button>
 *          Optional: data-service="[id]" data-staff="[id]" data-hide-staff="1"
 *          Opens the booking flow in a modal over the page.
 *
 * Script API: window.DSMBooking.open(slug, { service, staff, hideStaff }) / .close()
 */
(function () {
  'use strict';
  if (window.DSMBooking) return;

  var script = document.currentScript;
  var ORIGIN = (function () {
    try {
      return new URL(script && script.src ? script.src : window.location.href).origin;
    } catch (e) {
      return window.location.origin;
    }
  })();
  var MSG = 'dsm-booking:height';

  // ---- Inline iframes: resize on height messages from our origin
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data || e.data.type !== MSG) return;
    var h = Number(e.data.height);
    if (!h || h < 0) return;
    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) {
        frames[i].style.height = Math.ceil(h) + 'px';
        frames[i].style.minHeight = '0';
        frames[i].setAttribute('scrolling', 'no');
        break;
      }
    }
  });

  // ---- Popup mode
  var overlay = null;
  var lastFocus = null;

  function bookingUrl(slug, opts) {
    var q = 'embed=true';
    if (opts && opts.service) q += '&service=' + encodeURIComponent(opts.service);
    if (opts && opts.staff) q += '&staff=' + encodeURIComponent(opts.staff);
    if (opts && opts.hideStaff) q += '&hide_staff=1';
    return ORIGIN + '/' + encodeURIComponent(slug) + '?' + q;
  }

  function close() {
    if (!overlay) return;
    overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function open(slug, opts) {
    if (!slug) return;
    close();
    lastFocus = document.activeElement;

    overlay = document.createElement('div');
    overlay.setAttribute('data-dsm-booking-overlay', '');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;background:rgba(15,17,21,.48);display:flex;' +
      'align-items:center;justify-content:center;padding:16px;box-sizing:border-box';

    var dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Book an appointment');
    dialog.style.cssText =
      'position:relative;width:100%;max-width:480px;height:min(760px,100%);background:#FFFFFF;' +
      'border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(16,17,21,.04),0 16px 40px rgba(16,17,21,.18)';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Close booking');
    btn.innerHTML =
      '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    btn.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:1;width:44px;height:44px;border:0;border-radius:10px;' +
      'background:rgba(255,255,255,.92);color:#0F1115;display:flex;align-items:center;justify-content:center;cursor:pointer';
    btn.addEventListener('click', close);

    var frame = document.createElement('iframe');
    frame.src = bookingUrl(slug, opts);
    frame.title = 'Book an appointment';
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
    frame.setAttribute('data-dsm-popup', '');

    dialog.appendChild(btn);
    dialog.appendChild(frame);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    btn.focus();
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-book]') : null;
    if (!el) return;
    e.preventDefault();
    open(el.getAttribute('data-book'), {
      service: el.getAttribute('data-service'),
      staff: el.getAttribute('data-staff'),
      hideStaff: el.getAttribute('data-hide-staff') === '1',
    });
  });

  window.DSMBooking = { open: open, close: close };
})();
