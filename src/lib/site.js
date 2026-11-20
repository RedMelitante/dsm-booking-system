// The app's own address. The design used "[domain]" as a placeholder until a
// domain was chosen; at runtime the real host is known.
export const HOST = typeof window !== 'undefined' ? window.location.host : '[domain]';
export const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://[domain]';
export const withHost = (text) => String(text || '').split('[domain]').join(HOST);

// Onboarding hints that travel from the homepage through sign-up/log-in to /setup:
// ?slug= (hero address claim) and ?template=clinic|salon|events|blank.
export function setupQuery(search) {
  const q = new URLSearchParams(search === undefined ? window.location.search : search);
  const out = new URLSearchParams();
  if (q.get('slug')) out.set('slug', q.get('slug'));
  if (q.get('template')) out.set('template', q.get('template'));
  const str = out.toString();
  return str ? '?' + str : '';
}
