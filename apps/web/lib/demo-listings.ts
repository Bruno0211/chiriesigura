/** Demo classifieds listings served at /demo/listing/[id] (plan Task 13). Generic layout, no OLX branding. */
export interface DemoListing {
  id: string;
  title: string;
  price: string;
  area: string;
  rooms: string;
  description: string[];
  contactName: string;
  phone: string;
  photos: string[];
  posted: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=70&auto=format&fit=crop`;
const PASTE = 'Proprietar verificat · ChirieSigură VC-7K3Q';

const FLAT_TEXT = [
  'Închiriez apartament cu 2 camere în centrul Timișoarei, la 5 minute de Piața Victoriei și 15 minute cu tramvaiul de Universitatea Politehnica.',
  'Complet mobilat și utilat: mașină de spălat, frigider, cuptor, aer condiționat. Centrală proprie, internet inclus în preț.',
  'Ideal pentru 2 studenți. Contract înregistrat la ANAF, garanție o lună. Vizionare oricând după ora 17.',
];

const FLAT_PHOTOS = ['1583847268964-b28dc8f51f92', '1613575831056-0acd5da8f085', '1612419299101-6c294dc2901d'].map(photo);

export const DEMO_LISTINGS: Record<string, DemoListing> = {
  d1: {
    id: 'd1', title: 'Apartament 2 camere, mobilat, Centru', price: '450 €/lună', area: 'Timișoara, Centru', rooms: '2 camere · 54 m² · etaj 2/4',
    description: [...FLAT_TEXT, PASTE], contactName: 'Andrei', phone: '+40 700 000 001', photos: FLAT_PHOTOS, posted: 'Postat azi la 09:12',
  },
  // The scammer's copy: same text and code, cheaper, a different phone.
  d2: {
    id: 'd2', title: 'Apartament 2 camere, mobilat, Centru', price: '320 €/lună', area: 'Timișoara, Centru', rooms: '2 camere · 54 m² · etaj 2/4',
    description: [...FLAT_TEXT, PASTE], contactName: 'Andrei', phone: '+40 799 999 999', photos: FLAT_PHOTOS, posted: 'Postat azi la 11:47',
  },
  d3: {
    id: 'd3', title: 'Garsonieră renovată, zona Iosefin', price: '300 €/lună', area: 'Timișoara, Iosefin', rooms: '1 cameră · 32 m² · parter',
    description: [
      'Garsonieră renovată complet în 2025, aproape de stația de tramvai.',
      'Mobilată, centrală proprie, fără animale. Disponibilă de la 1 decembrie.',
    ],
    contactName: 'Mihaela', phone: '+40 733 333 333', photos: ['1600493505873-cddd69453072', '1629042306558-7d1e15cc02fa'].map(photo), posted: 'Postat ieri',
  },
  // The same landlord's second flat, registered live during the demo.
  d4: {
    id: 'd4', title: 'Apartament 3 camere, decomandat, Centru', price: '580 €/lună', area: 'Timișoara, Centru', rooms: '3 camere · 72 m² · etaj 3/4',
    description: [
      'Apartament 3 camere decomandat, în aceeași clădire, renovat și mobilat modern.',
      'Două băi, balcon închis, loc de parcare. Potrivit pentru 3 studenți sau o familie.',
    ],
    contactName: 'Andrei', phone: '+40 700 000 001', photos: ['1665249934445-1de680641f50', '1630699294897-723e02620662'].map(photo), posted: 'Postat azi la 08:30',
  },
};

/** Another landlord's verified listing in the "similar" widget: its code must not count for this page. */
export const SIMILAR = { title: 'Garsonieră zona Circumvalațiunii', price: '280 €/lună', line: 'Proprietar verificat · ChirieSigură VC-ZZZZ' };
