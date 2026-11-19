// The app's own address. The design used "[domain]" as a placeholder until a
// domain was chosen; at runtime the real host is known.
export const HOST = typeof window !== 'undefined' ? window.location.host : '[domain]';
export const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://[domain]';
export const withHost = (text) => String(text || '').split('[domain]').join(HOST);
