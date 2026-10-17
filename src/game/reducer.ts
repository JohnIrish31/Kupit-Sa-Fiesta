import { pick, shuffle } from './rng';
import {
  EVENT_IDS, MAX_NAME, MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS, WIN_POINTS,
  type Action, type GameState, type HatolState, type Lang, type Player, type PlayerInput, type Rng, type Role, type Side,
} from './types';

const NO_HATOL: HatolState = { tieMode: false, tied: [], tieLocked: false, chosenId: null };

export function initialState(muted = false, lang: Lang = 'en'): GameState {
  return {
    phase: 'HOME', muted, lang, players: [], round: 0, lechon: 0, sira: 0,
    eventDeck: [], event: null, thiefId: null, silipUsed: false,
    dealIndex: 0, dealStep: 'handoff', ambagIndex: 0, ambagStep: 'handoff',
    cups: {}, dagdagCoins: 0, tanodId: null, tanodPick: null, medalyaId: null,
    bilanganStep: 'ready', complete: null, silip: null, hatol: NO_HATOL, recap: null, winner: null,
  };
}

export const kupiteroCount = (n: number) => (n <= 6 ? 2 : 3);

export function validPlayers(list: readonly PlayerInput[]): boolean {
  if (list.length < MIN_PLAYERS || list.length > MAX_PLAYERS) return false;

  const names = new Set<string>();
  const avatars = new Set<string>();
  for (const p of list) {
    const name = p.name.trim();
    if (!name || name.length > MAX_NAME || !p.avatar) return false;
    names.add(name.toLowerCase());
    avatars.add(p.avatar);
  }
  return avatars.size === list.length && names.size === list.length;
}

export function dealRoles(list: readonly PlayerInput[], rng: Rng): Player[] {
  const order = shuffle(list.map((_, i) => i), rng);
  const roles: Role[] = list.map(() => 'kabarangay');
  const kupiteros = kupiteroCount(list.length);

  for (let i = 0; i < kupiteros; i++) roles[order[i]] = 'kupitero';
  roles[order[kupiteros]] = 'lola';

  return list.map((p, i) => ({
    id: i,
    name: p.name.trim(),
    avatar: p.avatar,
    role: roles[i],
    dagdagUsed: false,
    nabunyag: false,
  }));
}

export function decideWinner(lechon: number, sira: number, round: number): Side | null {
  const gameOver = lechon >= WIN_POINTS || sira >= WIN_POINTS || round >= MAX_ROUNDS;
  if (!gameOver) return null;
  return lechon > sira ? 'kabarangay' : 'kupitero';
}

export const partnersOf = (players: readonly Player[], id: number) =>
  players.filter((p) => p.role === 'kupitero' && p.id !== id);

export const canJudge = (s: GameState, id: number) => {
  const p = s.players[id];
  return !!p && id !== s.medalyaId && !p.nabunyag;
};

export const currentPlayer = (s: GameState) => s.players[s.ambagIndex];

function beginRound(s: GameState, rng: Rng): GameState {
  const round = s.round + 1;
  const event = s.eventDeck[round - 1];
  const hiddenKupiteros = s.players.filter((p) => p.role === 'kupitero' && !p.nabunyag);
  const thiefId = hiddenKupiteros.length ? pick(hiddenKupiteros, rng).id : null;
  const tanodId = event === 'ulan' ? null : s.players[(round - 1) % s.players.length].id;

  return {
    ...s, phase: 'EVENT', round, event, thiefId, tanodId,
    ambagIndex: 0, ambagStep: 'handoff', cups: {}, dagdagCoins: 0, tanodPick: null, medalyaId: null,
    bilanganStep: 'ready', complete: null, silip: null, hatol: NO_HATOL, recap: null, winner: null,
  };
}

function startGame(list: readonly PlayerInput[], muted: boolean, lang: Lang, rng: Rng): GameState {
  return {
    ...initialState(muted, lang),
    phase: 'ROLE_DEAL',
    players: dealRoles(list, rng),
    eventDeck: shuffle(EVENT_IDS, rng),
  };
}

function toBilangan(s: GameState): GameState {
  return { ...s, phase: 'BILANGAN', bilanganStep: 'ready', complete: null };
}

function reveal(s: GameState, id: number): GameState {
  const caught = s.players[id].role === 'kupitero';
  const players = caught
    ? s.players.map((p) => (p.id === id ? { ...p, nabunyag: true } : p))
    : s.players;

  return {
    ...s,
    players,
    lechon: caught ? s.lechon + 1 : s.lechon,
    sira: caught ? s.sira : s.sira + 1,
    hatol: { ...s.hatol, chosenId: id },
  };
}

function countCoins(s: GameState): GameState {
  const expected = 2 * s.players.length;
  let total = s.dagdagCoins;
  for (const p of s.players) total += s.cups[p.id] ?? 0;
  const complete = total >= expected;

  let { lechon, sira } = s;
  if (complete) lechon += s.event === 'handaan' ? 2 : 1;
  else sira += s.event === 'baboy-ramo' ? 2 : 1;

  return { ...s, bilanganStep: 'result', complete, lechon, sira };
}

export function createReducer(rng: Rng) {
  return function reducer(s: GameState, a: Action): GameState {
    switch (a.type) {
      case 'GO': {
        const canNavigate = s.phase === 'HOME' || s.phase === 'RULES' || s.phase === 'SETUP' || s.phase === 'END';
        return canNavigate ? { ...s, phase: a.phase } : s;
      }

      case 'QUIT':
        return initialState(s.muted, s.lang);

      case 'SET_LANG':
        return { ...s, lang: a.lang };

      case 'SET_MUTED':
        return { ...s, muted: a.muted };

      case 'START':
        if (s.phase !== 'SETUP' || !validPlayers(a.players)) return s;
        return startGame(a.players, s.muted, s.lang, rng);

      case 'NEW_GAME':
        return s.phase === 'END' ? { ...initialState(s.muted, s.lang), phase: 'SETUP' } : s;

      case 'PLAY_AGAIN': {
        if (s.phase !== 'END') return s;
        const sameTable = s.players.map(({ name, avatar }) => ({ name, avatar }));
        return startGame(sameTable, s.muted, s.lang, rng);
      }

      case 'DEAL_READY':
        return s.phase === 'ROLE_DEAL' && s.dealStep === 'handoff' ? { ...s, dealStep: 'secret' } : s;

      case 'DEAL_DONE': {
        if (s.phase !== 'ROLE_DEAL' || s.dealStep !== 'secret') return s;
        const next = s.dealIndex + 1;
        if (next >= s.players.length) return beginRound(s, rng);
        return { ...s, dealIndex: next, dealStep: 'handoff' };
      }

      case 'EVENT_NEXT':
        return s.phase === 'EVENT' ? { ...s, phase: 'AMBAG', ambagIndex: 0, ambagStep: 'handoff' } : s;

      case 'AMBAG_READY':
        return s.phase === 'AMBAG' && s.ambagStep === 'handoff' ? { ...s, ambagStep: 'secret' } : s;

      case 'AMBAG_SUBMIT': {
        if (s.phase !== 'AMBAG' || s.ambagStep !== 'secret') return s;
        const p = s.players[s.ambagIndex];
        const coins = p.id === s.thiefId && a.choice === 1 ? 1 : 2;
        const useDagdag = a.dagdag && !p.dagdagUsed;
        return {
          ...s,
          cups: { ...s.cups, [p.id]: coins },
          dagdagCoins: useDagdag ? s.dagdagCoins + 1 : s.dagdagCoins,
          players: useDagdag ? s.players.map((x) => (x.id === p.id ? { ...x, dagdagUsed: true } : x)) : s.players,
          ambagStep: 'drop',
        };
      }

      case 'AMBAG_NEXT': {
        if (s.phase !== 'AMBAG' || s.ambagStep !== 'drop') return s;
        const next = s.ambagIndex + 1;
        if (next < s.players.length) return { ...s, ambagIndex: next, ambagStep: 'handoff' };
        if (s.tanodId === null) return toBilangan(s);
        return { ...s, phase: 'TANOD' };
      }

      case 'TANOD_PICK': {
        if (s.phase !== 'TANOD' || s.tanodPick !== null) return s;
        if (a.targetId === s.tanodId || !s.players[a.targetId]) return s;
        const honest = s.cups[a.targetId] === 2;
        return { ...s, tanodPick: a.targetId, medalyaId: honest ? a.targetId : null };
      }

      case 'TANOD_DONE':
        return s.phase === 'TANOD' && s.tanodPick !== null ? toBilangan(s) : s;

      case 'BILANGAN_REVEAL':
        if (s.phase !== 'BILANGAN' || s.bilanganStep !== 'ready') return s;
        return countCoins(s);

      case 'BILANGAN_NEXT':
        if (s.phase !== 'BILANGAN' || s.bilanganStep !== 'result') return s;
        return { ...s, phase: s.event === 'tahimik' ? 'HATOL' : 'TSISMISAN', silip: null };

      case 'TSISMISAN_DONE':
        return s.phase === 'TSISMISAN' ? { ...s, phase: 'HATOL', silip: null } : s;

      case 'SILIP_OPEN':
        return s.phase === 'TSISMISAN' && !s.silip ? { ...s, silip: { step: 'who' } } : s;

      case 'SILIP_WHO':
        if (s.phase !== 'TSISMISAN' || s.silip?.step !== 'who' || !s.players[a.id]) return s;
        return { ...s, silip: { step: 'handoff', who: a.id } };

      case 'SILIP_READY':
        if (s.phase !== 'TSISMISAN' || s.silip?.step !== 'handoff') return s;
        return { ...s, silip: { step: 'target', who: s.silip.who } };

      case 'SILIP_TARGET': {
        if (s.phase !== 'TSISMISAN' || s.silip?.step !== 'target') return s;
        const who = s.silip.who;
        if (a.id === who || !s.players[a.id]) return s;
        const spent = s.players[who].role === 'lola' && !s.silipUsed;
        return {
          ...s,
          silipUsed: s.silipUsed || spent,
          silip: { step: 'result', who, target: a.id, spent },
        };
      }

      case 'SILIP_CLOSE': {
        const step = s.silip?.step;
        if (s.phase !== 'TSISMISAN' || (step !== 'result' && step !== 'who')) return s;
        return { ...s, silip: null };
      }

      case 'HATOL_TIE_START':
        if (s.phase !== 'HATOL' || s.hatol.chosenId !== null || s.hatol.tieMode) return s;
        return { ...s, hatol: { ...NO_HATOL, tieMode: true } };

      case 'HATOL_TIE_TOGGLE': {
        const h = s.hatol;
        if (s.phase !== 'HATOL' || !h.tieMode || h.tieLocked || !canJudge(s, a.id)) return s;
        const tied = h.tied.includes(a.id) ? h.tied.filter((x) => x !== a.id) : [...h.tied, a.id];
        return { ...s, hatol: { ...h, tied } };
      }

      case 'HATOL_TIE_CONFIRM': {
        const h = s.hatol;
        if (s.phase !== 'HATOL' || !h.tieMode || h.tieLocked || h.tied.length < 2) return s;
        return { ...s, hatol: { ...h, tieLocked: true } };
      }

      case 'HATOL_TIE_CANCEL':
        return s.phase === 'HATOL' && s.hatol.chosenId === null ? { ...s, hatol: NO_HATOL } : s;

      case 'HATOL_PICK': {
        const h = s.hatol;
        if (s.phase !== 'HATOL' || h.chosenId !== null || !canJudge(s, a.id)) return s;
        if (h.tieMode && !h.tieLocked) return s;
        if (h.tieLocked && !h.tied.includes(a.id)) return s;
        return reveal(s, a.id);
      }

      case 'HATOL_DONE': {
        if (s.phase !== 'HATOL' || s.hatol.chosenId === null) return s;
        const chosen = s.players[s.hatol.chosenId];
        return {
          ...s,
          phase: 'ROUND_END',
          winner: decideWinner(s.lechon, s.sira, s.round),
          recap: { complete: !!s.complete, revealedId: chosen.id, revealedRole: chosen.role, event: s.event! },
        };
      }

      case 'ROUND_NEXT':
        if (s.phase !== 'ROUND_END') return s;
        return s.winner ? { ...s, phase: 'END' } : beginRound(s, rng);
    }
  };
}
