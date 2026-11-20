// Defaults applied when a business is created from a setup template.

export const CURRENCIES = { PHP: '₱', AUD: '$', USD: '$', SGD: 'S$', NZD: '$', GBP: '£' };

export const STAFF_COLORS = ['#5B4BDB', '#0F766E', '#B45309', '#1D4ED8', '#B4235A', '#334155', '#7C3AED', '#0E7490'];

export const DEFAULT_SETTINGS = {
  interval: 30, // minutes between start times
  notice: 2, // hours of minimum notice
  advance: 60, // days ahead customers can book
  approval: false, // true = new bookings arrive as pending
  staffStep: true,
  prices: true,
  notify: { newBooking: true, confirmation: true, changes: true, digest: false, followUp: false, remind: '24' },
  ownerEmail: '',
  fromName: '',
};

export function mergeSettings(base, patch) {
  const out = Object.assign({}, DEFAULT_SETTINGS, base || {});
  out.notify = Object.assign({}, DEFAULT_SETTINGS.notify, (base && base.notify) || {});
  if (patch) {
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (k === 'notify') continue;
      if (patch[k] !== undefined) out[k] = patch[k];
    }
    if (patch.notify) Object.assign(out.notify, patch.notify);
  }
  return out;
}

// Mon–Fri 9:00–18:00, weekends closed.
export const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
  dow, isOpen: dow >= 1 && dow <= 5, open: 540, close: 1080,
}));

const q = (id, label, type, req, options) => ({ id, label, type, req: !!req, options: options || [] });

export const TEMPLATES = {
  clinic: {
    kind: 'Clinic',
    svcNoun: 'treatment', staffNoun: 'Doctor', anyName: 'Any available doctor', anyRole: 'Earliest appointment',
    staffSub: 'Returning patients can keep their usual doctor. New patients can take the earliest slot.',
    policy: 'Please give at least 12 hours notice if you need to cancel or reschedule.',
    staffRole: 'Doctor',
    categories: [['all', 'All'], ['pkg', 'Packages'], ['general', 'General'], ['followup', 'Follow-ups']],
    questions: [
      q('q1', 'Are you a new patient?', 'yesno', true),
      q('q2', 'How will you pay?', 'select', true, ['Cash or card', 'HMO or insurance', 'Company account']),
      q('q3', 'Are you in pain right now?', 'yesno', false),
    ],
    services: [
      { name: 'Consultation', category: 'general', duration: 30, price: 800, buffer: 10, description: 'Assessment and a treatment plan with the doctor.' },
      { name: 'Check-up & cleaning', category: 'general', duration: 45, price: 1200, buffer: 10, description: 'Exam, scaling and polishing.' },
      { name: 'Follow-up visit', category: 'followup', duration: 30, price: 600, buffer: 5, description: 'Review progress and adjust your treatment plan.' },
    ],
  },
  salon: {
    kind: 'Salon & wellness',
    svcNoun: 'service', staffNoun: 'Professional', anyName: 'Any professional', anyRole: 'Most availability',
    staffSub: 'Pick someone you know, or let us match you with whoever is free first.',
    policy: 'Free cancellation or rescheduling up to 24 hours before your appointment.',
    staffRole: 'Professional',
    categories: [['all', 'All'], ['pkg', 'Packages'], ['facial', 'Facials'], ['hair', 'Hair'], ['massage', 'Massage']],
    questions: [
      q('q1', 'Is this your first visit with us?', 'yesno', true),
      q('q2', 'What would you like help with?', 'select', false, ['Relaxation', 'Skin', 'Hair', 'Something else']),
      q('q3', 'Any allergies, medications or recent treatments we should know about?', 'long', false),
    ],
    services: [
      { name: 'Signature facial', category: 'facial', duration: 60, price: 2800, buffer: 10, description: 'Deep cleanse, gentle exfoliation, extractions and a hydrating mask.' },
      { name: 'Haircut & blow-dry', category: 'hair', duration: 60, price: 1200, buffer: 10, description: 'Consultation, wash, cut and blow-dry finish.' },
      { name: '60-min massage', category: 'massage', duration: 60, price: 1500, buffer: 15, description: 'Full-body massage with your choice of pressure.' },
    ],
  },
  events: {
    kind: 'Event rentals',
    svcNoun: 'package', staffNoun: 'Booth', anyName: 'Any available booth', anyRole: 'Most dates open',
    staffSub: 'Pick a booth, or take whichever is free on your date.',
    policy: 'A 30% deposit secures your date and is refundable up to 14 days before the event.',
    staffRole: 'Booth',
    deposit: 0.3,
    categories: [['all', 'All'], ['pkg', 'Packages'], ['rental', 'Rentals']],
    questions: [
      q('q1', 'What kind of event is it?', 'select', true, ['Wedding', 'Birthday', 'Corporate', 'Something else']),
      q('q2', 'Venue name and address', 'short', true),
      q('q3', 'Estimated number of guests', 'short', false),
    ],
    services: [
      { name: '2-hour package', category: 'rental', duration: 120, price: 450, buffer: 60, description: 'Two hours on site with an attendant.' },
      { name: '3-hour package', category: 'rental', duration: 180, price: 650, buffer: 60, description: 'Three hours on site with an attendant.' },
      { name: 'Wedding package', category: 'pkg', isPackage: true, badge: '5 hours', duration: 300, price: 1450, buffer: 60, description: 'Built for receptions: setup, attendant and guest book on the day.', includes: ['5 hours on site', 'Guest book with attendant'], addons: [{ name: 'Extra hour', price: 150 }] },
    ],
  },
  home: {
    kind: 'Home services',
    svcNoun: 'service', staffNoun: 'Technician', anyName: 'Any available technician', anyRole: 'Earliest arrival',
    staffSub: 'Pick a technician you know, or take the earliest available visit.',
    policy: 'Free rescheduling up to 24 hours before your visit. Please make sure someone can let us in.',
    staffRole: 'Technician',
    categories: [['all', 'All'], ['pkg', 'Packages'], ['cleaning', 'Cleaning'], ['repairs', 'Repairs'], ['outdoor', 'Outdoor']],
    questions: [
      q('q1', 'Service address', 'short', true),
      q('q2', 'What type of property is it?', 'select', true, ['House', 'Apartment or condo', 'Office or shop']),
      q('q3', 'Anything we should know before we arrive? (Parking, pets, gate code)', 'long', false),
    ],
    // The buffer doubles as travel time between visits.
    services: [
      { name: 'Standard home cleaning', category: 'cleaning', duration: 120, price: 120, buffer: 30, description: 'Kitchen, bathrooms, dusting, vacuuming and mopping throughout.' },
      { name: 'Handyman visit', category: 'repairs', duration: 60, price: 80, fromPrice: true, buffer: 30, description: 'First hour of small repairs and installs. Larger jobs are quoted on site.' },
      { name: 'Lawn mowing & garden tidy', category: 'outdoor', duration: 90, price: 90, buffer: 30, description: 'Mowing, edging, weeding and green waste taken away.' },
    ],
  },
  blank: {
    kind: '',
    svcNoun: 'service', staffNoun: 'Staff member', anyName: 'Anyone available', anyRole: 'Most availability',
    staffSub: 'Pick someone, or take whoever is free first.',
    policy: 'Please let us know as early as you can if you need to cancel or reschedule.',
    staffRole: 'Owner',
    categories: [['all', 'All']],
    questions: [],
    services: [],
  },
};
