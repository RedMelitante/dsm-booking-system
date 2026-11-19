// Business pages live at the top level ([domain]/[slug]), so these can never be
// claimed as a business address. Keep this the only copy of the list.
export const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'book', 'dashboard', 'login', 'signup', 'setup', 'help', 'www', 'demo', 'test', 'embed.js',
  // Current and planned top-level routes
  'embed-demo', 'styleguide', 'pricing', 'privacy', 'terms', 'blog', 'docs', 'status', 'assets',
];

export const isReservedSlug = (slug) => RESERVED_SLUGS.indexOf(String(slug || '').toLowerCase()) >= 0;
