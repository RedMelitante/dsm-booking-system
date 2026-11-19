// Demo businesses served at /[business-slug]. In the full build these come from
// the database; the prototype's three fictional businesses are used as seed data.
// `demo` selects the matching data set inside BookingPage.
export const BUSINESSES = {
  'lumen-skin-studio': { name: 'Lumen Skin Studio', demo: 'Aesthetic clinic', accent: '#5B4BDB' },
  'brightside-dental': { name: 'Brightside Dental Care', demo: 'Dental clinic', accent: '#1D4ED8' },
  'snapshot-booth-co': { name: 'Snapshot Booth Co.', demo: 'Photo booth / events', accent: '#B4235A' },
};

export const findBusiness = (slug) => BUSINESSES[String(slug || '').toLowerCase()] || null;
