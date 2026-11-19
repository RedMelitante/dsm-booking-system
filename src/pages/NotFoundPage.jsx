import React from 'react';
import { Shell, Heading, primaryBtn } from '../components/Shell.jsx';
import { HOST } from '../lib/site.js';

// Not in the handoff boards: uses the auth-page shell so unknown slugs land somewhere on-brand.
export default function NotFoundPage({ path }) {
  const slug = String(path || '').replace(/^\/+|\/+$/g, '');
  return (
    <Shell>
      <Heading
        eyebrow="404"
        title="We can't find that page"
        sub={slug ? `${HOST}/${slug} isn't a booking page or part of the app. Check the link, or start from the homepage.` : 'Check the link, or start from the homepage.'}
      />
      <a href="/" style={primaryBtn}>Go to the homepage</a>
    </Shell>
  );
}
