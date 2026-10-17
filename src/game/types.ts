export type Role = 'kupitero' | 'lola' | 'kabarangay';
export type Side = 'kabarangay' | 'kupitero';
export type EventId = 'ulan' | 'banda' | 'handaan' | 'baboy-ramo' | 'tahimik';

export type Phase =
  | 'HOME' | 'RULES' | 'SETUP' | 'ROLE_DEAL'
  | 'EVENT' | 'AMBAG' | 'TANOD' | 'BILANGAN' | 'TSISMISAN' | 'HATOL' | 'ROUND_END'
  | 'END';

export type Rng = () => number;
export type Lang = 'en' | 'tl';

export const EVENT_IDS: readonly EventId[] = ['ulan', 'banda', 'handaan', 'baboy-ramo', 'tahimik'];
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 8;
export const MAX_ROUNDS = 5;
export const WIN_POINTS = 3;
export const MAX_NAME = 12;

export interface PlayerInput { name: string; avatar: string }

export interface Player extends PlayerInput {
  id: number;
  role: Role;
  dagdagUsed: boolean;
  nabunyag: boolean;
}

export type SilipState =
  | { step: 'who' }
  | { step: 'handoff'; who: number }
  | { step: 'target'; who: number }
  | { step: 'result'; who: number; target: number; spent: boolean };

export interface HatolState {
  tieMode: boolean;
  tied: number[];
  tieLocked: boolean;
  chosenId: number | null;
}

export interface Recap {
  complete: boolean;
  revealedId: number | null;
  revealedRole: Role | null;
  event: EventId;
}

export interface GameState {
  phase: Phase;
  muted: boolean;
  lang: Lang;
  players: Player[];
  round: number;
  lechon: number;
  sira: number;
  eventDeck: EventId[];
  event: EventId | null;
  thiefId: number | null;
  silipUsed: boolean;
  dealIndex: number;
  dealStep: 'handoff' | 'secret';
  ambagIndex: number;
  ambagStep: 'handoff' | 'secret' | 'drop';
  cups: Record<number, number>;
  dagdagCoins: number;
  tanodId: number | null;
  tanodPick: number | null;
  medalyaId: number | null;
  bilanganStep: 'ready' | 'result';
  complete: boolean | null;
  silip: SilipState | null;
  hatol: HatolState;
  recap: Recap | null;
  winner: Side | null;
}

export type Action =
  | { type: 'GO'; phase: 'HOME' | 'RULES' | 'SETUP' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'QUIT' }
  | { type: 'START'; players: PlayerInput[] }
  | { type: 'DEAL_READY' }
  | { type: 'DEAL_DONE' }
  | { type: 'EVENT_NEXT' }
  | { type: 'AMBAG_READY' }
  | { type: 'AMBAG_SUBMIT'; choice: 1 | 2; dagdag: boolean }
  | { type: 'AMBAG_NEXT' }
  | { type: 'TANOD_PICK'; targetId: number }
  | { type: 'TANOD_DONE' }
  | { type: 'BILANGAN_REVEAL' }
  | { type: 'BILANGAN_NEXT' }
  | { type: 'TSISMISAN_DONE' }
  | { type: 'SILIP_OPEN' }
  | { type: 'SILIP_WHO'; id: number }
  | { type: 'SILIP_READY' }
  | { type: 'SILIP_TARGET'; id: number }
  | { type: 'SILIP_CLOSE' }
  | { type: 'HATOL_PICK'; id: number }
  | { type: 'HATOL_TIE_START' }
  | { type: 'HATOL_TIE_TOGGLE'; id: number }
  | { type: 'HATOL_TIE_CONFIRM' }
  | { type: 'HATOL_TIE_CANCEL' }
  | { type: 'HATOL_DONE' }
  | { type: 'ROUND_NEXT' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'NEW_GAME' };
