import React from 'react';
import { Shell, Heading, primaryBtn } from '../components/Shell.jsx';
import { HOST } from '../lib/site.js';

// Not in the handoff boards: uses the auth-page shell.
// `business` = the path looked like a booking page address but no business uses it.
export default function NotFoundPage({ path, business }) {
  const slug = String(path || '').replace(/^\/+|\/+$/g, '');
  if (business) {
    return (
      <Shell>
        <Heading
          eyebrow="404"
          title="Business not found"
          sub={`No business uses ${HOST}/${slug}. Check the link you were given, or contact the business directly.`}
        />
        <a href="/" style={primaryBtn}>
          Go to the homepage
        </a>
      </Shell>
    );
  }
  return (
    <Shell>
      <Heading eyebrow="404" title="We can't find that page" sub="Check the link, or start from the homepage." />
      <a href="/" style={primaryBtn}>
        Go to the homepage
      </a>
    </Shell>
  );
}
