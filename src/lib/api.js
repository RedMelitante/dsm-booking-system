// JSON client for the Worker API (/api/*). Cookies carry the session.
export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.error) || 'Request failed (' + status + ')');
    this.status = status;
    this.data = data || {};
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, { error: "Can't reach the server. Check your connection and try again." });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// Session info, cached for the page's lifetime and refreshed after auth changes.
let mePromise = null;
export function getMe(force) {
  if (force || !mePromise) mePromise = api('/auth/me').catch((e) => { mePromise = null; throw e; });
  return mePromise;
}
export const clearMe = () => { mePromise = null; };
