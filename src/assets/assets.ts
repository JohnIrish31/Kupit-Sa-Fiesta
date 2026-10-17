const urls = import.meta.glob('./svg/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const svg = (path: string): string => {
  const url = urls[`./svg/${path}.svg`];
  if (!url) throw new Error(`Missing asset: ${path}`);
  return url;
};

export type RoleId = 'kupitero' | 'lola' | 'kabarangay';
export type EventId = 'ulan' | 'banda' | 'handaan' | 'baboy-ramo' | 'tahimik';
export type AvatarId = 'mang-ben' | 'ate-joy' | 'kuya-jun' | 'aling-nena' | 'bunso' | 'dodong' | 'ineng' | 'mang-tonyo';

export const AVATARS: ReadonlyArray<{ id: AvatarId; name: string }> = [
  { id: 'mang-ben', name: 'Mang Ben' },
  { id: 'ate-joy', name: 'Ate Joy' },
  { id: 'kuya-jun', name: 'Kuya Jun' },
  { id: 'aling-nena', name: 'Aling Nena' },
  { id: 'bunso', name: 'Bunso' },
  { id: 'dodong', name: 'Dodong' },
  { id: 'ineng', name: 'Ineng' },
  { id: 'mang-tonyo', name: 'Mang Tonyo' },
];

export const roleCard = (r: RoleId) => svg(`cards/${r}`);
export const eventCard = (e: EventId) => svg(`cards/event-${e}`);
export const cardBack = () => svg('cards/card-back');
export const dagdagCard = () => svg('cards/dagdag');
export const avatar = (id: AvatarId) => svg(`avatars/${id}`);
export const cup = (state: 'closed' | 0 | 1 | 2) => svg(state === 'closed' ? 'items/cup-closed' : `items/cup-open-${state}`);

export const ICON = {
  eye: svg('icons/eye'), hold: svg('icons/hold'), pass: svg('icons/pass'),
  soundOn: svg('icons/sound-on'), soundOff: svg('icons/sound-off'), timer: svg('icons/timer'),
  trophy: svg('icons/trophy'), rules: svg('icons/rules'),
  tanod: svg('icons/badge-tanod'), nabunyag: svg('icons/badge-nabunyag'), medalya: svg('icons/badge-medalya'),
  thief: svg('icons/badge-thief'),
} as const;

export const ITEM = {
  coin: svg('items/coin'), coinStack: svg('items/coin-stack'), lechon: svg('items/lechon'),
  sira: svg('items/sira'), medalya: svg('items/medalya'),
} as const;

export const SCENE = {
  logo: svg('scenes/logo'), hero: svg('scenes/hero-baryo'), banderitas: svg('decor/banderitas'), parol: svg('decor/parol'),
} as const;
