import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import {
  canJudge, createReducer, dealRoles, decideWinner, initialState, kupiteroCount, partnersOf, validPlayers,
} from './reducer';
import type { Action, EventId, GameState, PlayerInput } from './types';

const mk = (n: number): PlayerInput[] => Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, avatar: `a${i}` }));

class Game {
  s: GameState;
  r: (s: GameState, a: Action) => GameState;
  constructor(n = 5, seed = 1, deck?: EventId[]) {
    this.r = createReducer(mulberry32(seed));
    this.s = this.r(this.r(initialState(), { type: 'GO', phase: 'SETUP' }), { type: 'START', players: mk(n) });
    if (deck) this.s = { ...this.s, eventDeck: deck };
  }
  do(a: Action) { this.s = this.r(this.s, a); return this; }
  deal() {
    for (let i = 0; i < this.s.players.length; i++) this.do({ type: 'DEAL_READY' }).do({ type: 'DEAL_DONE' });
    return this;
  }
  ambag(pick: (id: number) => { choice: 1 | 2; dagdag?: boolean } = () => ({ choice: 2 })) {
    this.do({ type: 'EVENT_NEXT' });
    for (let i = 0; i < this.s.players.length; i++) {
      const c = pick(this.s.players[i].id);
      this.do({ type: 'AMBAG_READY' }).do({ type: 'AMBAG_SUBMIT', choice: c.choice, dagdag: !!c.dagdag }).do({ type: 'AMBAG_NEXT' });
    }
    return this;
  }
  tanod(target?: number) {
    const t = target ?? this.s.players.find((p) => p.id !== this.s.tanodId)!.id;
    return this.do({ type: 'TANOD_PICK', targetId: t }).do({ type: 'TANOD_DONE' });
  }
  bilangan() { return this.do({ type: 'BILANGAN_REVEAL' }).do({ type: 'BILANGAN_NEXT' }); }
  toHatol(thiefSteals = false) {
    this.ambag((id) => ({ choice: thiefSteals && id === this.s.thiefId ? 1 : 2 }));
    if (this.s.phase === 'TANOD') this.tanod(this.s.players.find((p) => p.id !== this.s.tanodId && p.id !== this.s.thiefId)!.id);
    this.bilangan();
    if (this.s.phase === 'TSISMISAN') this.do({ type: 'TSISMISAN_DONE' });
    return this;
  }
  hatol(id: number) { return this.do({ type: 'HATOL_PICK', id }).do({ type: 'HATOL_DONE' }); }
  get roleIds() {
    const by = (role: string) => this.s.players.filter((p) => p.role === role).map((p) => p.id);
    return { kupitero: by('kupitero'), lola: by('lola')[0], kabarangay: by('kabarangay') };
  }
}

describe('setup + roles', () => {
  it.each([5, 6, 7, 8])('deals correct roles for %i players', (n) => {
    for (let seed = 1; seed <= 20; seed++) {
      const players = dealRoles(mk(n), mulberry32(seed));
      const count = (r: string) => players.filter((p) => p.role === r).length;
      expect(count('kupitero')).toBe(n <= 6 ? 2 : 3);
      expect(count('lola')).toBe(1);
      expect(count('kabarangay')).toBe(n - kupiteroCount(n) - 1);
    }
  });

  it('validates player lists', () => {
    expect(validPlayers(mk(5))).toBe(true);
    expect(validPlayers(mk(8))).toBe(true);
    expect(validPlayers(mk(4))).toBe(false);
    expect(validPlayers(mk(9))).toBe(false);
    expect(validPlayers(mk(5).map((p) => ({ ...p, avatar: 'x' })))).toBe(false);
    expect(validPlayers(mk(5).map((p, i) => (i === 0 ? { ...p, name: ' ' } : p)))).toBe(false);
    expect(validPlayers(mk(5).map((p, i) => (i === 0 ? { ...p, name: 'x'.repeat(13) } : p)))).toBe(false);
  });

  it('START with invalid players is ignored; valid one deals roles and deck', () => {
    const r = createReducer(mulberry32(3));
    const setup = r(initialState(), { type: 'GO', phase: 'SETUP' });
    expect(r(setup, { type: 'START', players: mk(4) })).toBe(setup);
    const g = new Game(6, 3);
    expect(g.s.phase).toBe('ROLE_DEAL');
    expect([...g.s.eventDeck].sort()).toEqual(['baboy-ramo', 'banda', 'handaan', 'tahimik', 'ulan']);
  });

  it('is deterministic for a given seed', () => {
    expect(new Game(7, 42).s).toEqual(new Game(7, 42).s);
  });

  it('role deal walks every player then starts round 1', () => {
    const g = new Game(5, 2);
    for (let i = 0; i < 5; i++) {
      expect(g.s.phase).toBe('ROLE_DEAL');
      expect(g.s.dealIndex).toBe(i);
      g.do({ type: 'DEAL_DONE' });
      expect(g.s.dealIndex).toBe(i);
      g.do({ type: 'DEAL_READY' }).do({ type: 'DEAL_DONE' });
    }
    expect(g.s.phase).toBe('EVENT');
    expect(g.s.round).toBe(1);
  });
});

describe('thief', () => {
  it('is a hidden Kupitero each round', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game(6, seed).deal();
      expect(g.roleIds.kupitero).toContain(g.s.thiefId);
    }
  });

  it('is never a Nabunyag, and absent when every Kupitero is revealed', () => {
    const g = new Game(5, 9).deal();
    const [k1, k2] = g.roleIds.kupitero;
    const at = (nab: number[]): GameState => ({
      ...g.s, phase: 'ROUND_END', winner: null,
      players: g.s.players.map((p) => (nab.includes(p.id) ? { ...p, nabunyag: true } : p)),
    });
    for (let seed = 1; seed <= 25; seed++) {
      const r = createReducer(mulberry32(seed));
      expect(r(at([k1]), { type: 'ROUND_NEXT' }).thiefId).toBe(k2);
    }
    expect(createReducer(mulberry32(1))(at([k1, k2]), { type: 'ROUND_NEXT' }).thiefId).toBeNull();
  });
});

describe('ambag, dagdag, bilangan', () => {
  it('everyone choosing 2 completes the round; the thief taking 1 makes it short', () => {
    const ok = new Game(5, 4, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal().ambag();
    expect(Object.values(ok.s.cups)).toEqual([2, 2, 2, 2, 2]);
    expect(ok.tanod().bilangan().s.complete).toBe(true);

    const bad = new Game(5, 4, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal();
    const thief = bad.s.thiefId!;
    bad.ambag((id) => ({ choice: id === thief ? 1 : 2 }));
    expect(bad.s.cups[thief]).toBe(1);
    expect(bad.tanod(bad.s.players.find((p) => p.id !== bad.s.tanodId && p.id !== thief)!.id).bilangan().s.complete).toBe(false);
  });

  it('"1 barya" from a non-thief silently puts 2', () => {
    const g = new Game(6, 5).deal();
    const thief = g.s.thiefId;
    g.ambag(() => ({ choice: 1 }));
    for (const p of g.s.players) expect(g.s.cups[p.id]).toBe(p.id === thief ? 1 : 2);
  });

  it('Dagdag adds to the bank (not the cup) and covers a theft', () => {
    const g = new Game(5, 6, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal();
    const thief = g.s.thiefId!;
    const helper = g.s.players.find((p) => p.id !== thief)!.id;
    g.ambag((id) => ({ choice: id === thief ? 1 : 2, dagdag: id === helper }));
    expect(g.s.cups[helper]).toBe(2);
    expect(g.s.dagdagCoins).toBe(1);
    expect(g.s.players[helper].dagdagUsed).toBe(true);
    const safe = g.s.players.find((p) => p.id !== g.s.tanodId && p.id !== thief)!.id;
    expect(g.tanod(safe).bilangan().s.complete).toBe(true);
  });

  it('Dagdag is consumed once per game', () => {
    const g = new Game(5, 6).deal();
    g.ambag((id) => ({ choice: 2, dagdag: id === 0 }));
    expect(g.s.dagdagCoins).toBe(1);
    g.tanod().bilangan();
    if (g.s.phase === 'TSISMISAN') g.do({ type: 'TSISMISAN_DONE' });
    const pick = g.s.players.find((p) => canJudge(g.s, p.id))!.id;
    g.hatol(pick);
    if (g.s.phase !== 'ROUND_END' || g.s.winner) return;
    g.do({ type: 'ROUND_NEXT' }).ambag((id) => ({ choice: 2, dagdag: id === 0 }));
    expect(g.s.dagdagCoins).toBe(0);
    expect(g.s.players[0].dagdagUsed).toBe(true);
  });

  it('expected total scales with players', () => {
    const g = new Game(8, 2).deal().ambag();
    expect(Object.values(g.s.cups).reduce((a, b) => a + b, 0)).toBe(16);
  });
});

describe('tanod + medalya', () => {
  it('flipping a 2-cup gives a Medalya; flipping the 1-cup does not', () => {
    const g = new Game(5, 7, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal();
    const thief = g.s.thiefId!;
    g.ambag((id) => ({ choice: id === thief ? 1 : 2 }));
    expect(g.s.phase).toBe('TANOD');
    expect(g.s.tanodId).toBe(0);
    expect(g.s.medalyaId).toBeNull();
    g.do({ type: 'TANOD_PICK', targetId: 0 });
    expect(g.s.tanodPick).toBeNull();
    g.do({ type: 'TANOD_DONE' });
    expect(g.s.phase).toBe('TANOD');
    g.do({ type: 'TANOD_PICK', targetId: thief });
    expect(g.s.tanodPick).toBe(thief);
    expect(g.s.medalyaId).toBeNull();
    g.do({ type: 'TANOD_PICK', targetId: 1 });
    expect(g.s.tanodPick).toBe(thief);

    const h = new Game(5, 7, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal().ambag();
    const victim = h.s.players.find((p) => p.id !== h.s.tanodId)!.id;
    h.do({ type: 'TANOD_PICK', targetId: victim });
    expect(h.s.medalyaId).toBe(victim);
  });

  it('a Medalya holder cannot be chosen in Hatol', () => {
    const g = new Game(5, 7, ['banda', 'ulan', 'handaan', 'tahimik', 'baboy-ramo']).deal().ambag();
    g.tanod(2).bilangan().do({ type: 'TSISMISAN_DONE' });
    expect(g.s.medalyaId).toBe(2);
    g.do({ type: 'HATOL_PICK', id: 2 });
    expect(g.s.hatol.chosenId).toBeNull();
    g.do({ type: 'HATOL_TIE_START' }).do({ type: 'HATOL_TIE_TOGGLE', id: 2 });
    expect(g.s.hatol.tied).toEqual([]);
  });

  it('rotates the Tanod by round', () => {
    const g = new Game(5, 8, ['banda', 'handaan', 'tahimik', 'baboy-ramo', 'ulan']).deal();
    expect(g.s.tanodId).toBe(0);
    g.toHatol();
    g.hatol(g.s.players.find((p) => canJudge(g.s, p.id))!.id);
    if (!g.s.winner) expect(g.do({ type: 'ROUND_NEXT' }).s.tanodId).toBe(1);
  });
});

describe('events', () => {
  const play = (event: EventId, steal: boolean) => {
    const g = new Game(5, 11, [event, 'banda', 'ulan', 'handaan', 'tahimik']).deal();
    g.ambag((id) => ({ choice: steal && id === g.s.thiefId ? 1 : 2 }));
    if (g.s.phase === 'TANOD') g.tanod(g.s.players.find((p) => p.id !== g.s.tanodId && p.id !== g.s.thiefId)!.id);
    g.do({ type: 'BILANGAN_REVEAL' });
    return g;
  };

  it('base scoring: +1 Lechon complete, +1 Sira short', () => {
    expect([play('banda', false).s.lechon, play('banda', false).s.sira]).toEqual([1, 0]);
    expect([play('banda', true).s.lechon, play('banda', true).s.sira]).toEqual([0, 1]);
  });
  it('handaan: +2 Lechon if complete, normal Sira if short', () => {
    expect(play('handaan', false).s.lechon).toBe(2);
    expect(play('handaan', true).s.sira).toBe(1);
    expect(play('handaan', true).s.lechon).toBe(0);
  });
  it('baboy-ramo: +2 Sira if short, normal Lechon if complete', () => {
    expect(play('baboy-ramo', true).s.sira).toBe(2);
    expect(play('baboy-ramo', false).s.lechon).toBe(1);
    expect(play('baboy-ramo', false).s.sira).toBe(0);
  });
  it('ulan: no Tanod, goes straight from Ambag to Bilangan', () => {
    const g = new Game(5, 11, ['ulan', 'banda', 'handaan', 'baboy-ramo', 'tahimik']).deal().ambag();
    expect(g.s.tanodId).toBeNull();
    expect(g.s.phase).toBe('BILANGAN');
    expect(g.s.medalyaId).toBeNull();
  });
  it('tahimik: skips Tsismisan and goes to Hatol', () => {
    const g = new Game(5, 11, ['tahimik', 'banda', 'handaan', 'baboy-ramo', 'ulan']).deal().ambag().tanod().bilangan();
    expect(g.s.phase).toBe('HATOL');
  });
  it('other events go to Tsismisan', () => {
    const g = new Game(5, 11, ['banda', 'tahimik', 'handaan', 'baboy-ramo', 'ulan']).deal().ambag().tanod().bilangan();
    expect(g.s.phase).toBe('TSISMISAN');
  });
  it('all five events appear exactly once in five rounds', () => {
    const g = new Game(5, 12).deal();
    const seen: EventId[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(g.s.event!);
      g.s = { ...g.s, phase: 'ROUND_END', winner: null };
      g.do({ type: 'ROUND_NEXT' });
    }
    expect(new Set(seen).size).toBe(5);
  });
});

describe('hatol', () => {
  const atHatol = (event: EventId = 'ulan') => new Game(6, 21, [event, 'banda', 'handaan', 'baboy-ramo', 'tahimik']).deal().ambag().bilangan();
  const atHatolWithTanod = () => new Game(6, 21, ['banda', 'ulan', 'handaan', 'baboy-ramo', 'tahimik']).deal().ambag().tanod().bilangan().do({ type: 'TSISMISAN_DONE' });

  it('revealing a Kupitero: +1 Lechon and Nabunyag', () => {
    const g = atHatol().do({ type: 'TSISMISAN_DONE' });
    const k = g.roleIds.kupitero[0];
    const before = g.s.lechon;
    g.do({ type: 'HATOL_PICK', id: k });
    expect(g.s.lechon).toBe(before + 1);
    expect(g.s.players[k].nabunyag).toBe(true);
    expect(g.s.players).toHaveLength(6);
    g.do({ type: 'HATOL_DONE' });
    expect(g.s.recap).toMatchObject({ revealedId: k, revealedRole: 'kupitero' });
  });

  it('revealing Kabarangay or Lola: +1 Sira, no Nabunyag', () => {
    for (const who of ['lola', 'kabarangay'] as const) {
      const g = atHatol().do({ type: 'TSISMISAN_DONE' });
      const id = who === 'lola' ? g.roleIds.lola : g.roleIds.kabarangay[0];
      const before = g.s.sira;
      g.do({ type: 'HATOL_PICK', id });
      expect(g.s.sira).toBe(before + 1);
      expect(g.s.players[id].nabunyag).toBe(false);
    }
  });

  it('only one reveal per round; a Nabunyag cannot be pointed at again', () => {
    const g = atHatol().do({ type: 'TSISMISAN_DONE' });
    const [k1, k2] = g.roleIds.kupitero;
    g.do({ type: 'HATOL_PICK', id: k1 }).do({ type: 'HATOL_PICK', id: k2 });
    expect(g.s.hatol.chosenId).toBe(k1);
    expect(canJudge(g.s, k1)).toBe(false);
    expect(canJudge(g.s, k2)).toBe(true);
  });

  it('tie with Tanod: tied players are marked, then only they can be chosen', () => {
    const g = atHatolWithTanod();
    expect(g.s.tanodId).toBe(0);
    const [a, b, c] = g.s.players.filter((p) => canJudge(g.s, p.id)).map((p) => p.id);
    g.do({ type: 'HATOL_TIE_START' });
    g.do({ type: 'HATOL_PICK', id: a });
    expect(g.s.hatol.chosenId).toBeNull();
    g.do({ type: 'HATOL_TIE_TOGGLE', id: a });
    g.do({ type: 'HATOL_TIE_CONFIRM' });
    expect(g.s.hatol.tieLocked).toBe(false);
    g.do({ type: 'HATOL_TIE_TOGGLE', id: b }).do({ type: 'HATOL_TIE_CONFIRM' });
    expect(g.s.hatol.tieLocked).toBe(true);
    g.do({ type: 'HATOL_PICK', id: c });
    expect(g.s.hatol.chosenId).toBeNull();
    g.do({ type: 'HATOL_PICK', id: b });
    expect(g.s.hatol.chosenId).toBe(b);
  });

  it('tie without Tanod (ulan) uses the same marked list; the host picks', () => {
    const g = atHatol('ulan').do({ type: 'TSISMISAN_DONE' });
    expect(g.s.tanodId).toBeNull();
    const [a, b] = g.s.players.filter((p) => canJudge(g.s, p.id)).map((p) => p.id);
    g.do({ type: 'HATOL_TIE_START' }).do({ type: 'HATOL_TIE_TOGGLE', id: a }).do({ type: 'HATOL_TIE_TOGGLE', id: b });
    g.do({ type: 'HATOL_TIE_CONFIRM' }).do({ type: 'HATOL_PICK', id: a });
    expect(g.s.hatol.chosenId).toBe(a);
  });

  it('tie can be cancelled', () => {
    const g = atHatol().do({ type: 'TSISMISAN_DONE' }).do({ type: 'HATOL_TIE_START' });
    g.do({ type: 'HATOL_TIE_CANCEL' });
    expect(g.s.hatol.tieMode).toBe(false);
    g.do({ type: 'HATOL_PICK', id: 1 });
    expect(g.s.hatol.chosenId).toBe(1);
  });
});

describe('win conditions', () => {
  it.each([
    [3, 0, 1, 'kabarangay'], [0, 3, 1, 'kupitero'], [3, 3, 3, 'kupitero'], [4, 3, 3, 'kabarangay'],
    [3, 4, 3, 'kupitero'], [2, 2, 2, null], [2, 1, 4, null], [2, 1, 5, 'kabarangay'], [1, 2, 5, 'kupitero'],
    [2, 2, 5, 'kupitero'], [0, 0, 5, 'kupitero'],
  ] as const)('lechon %i / sira %i in round %i -> %s', (l, s, round, expected) => {
    expect(decideWinner(l, s, round)).toBe(expected);
  });

  it('is checked after Hatol: ROUND_END carries the winner, then END', () => {
    const g = new Game(5, 30, ['handaan', 'banda', 'ulan', 'baboy-ramo', 'tahimik']).deal().ambag().tanod().bilangan();
    g.do({ type: 'TSISMISAN_DONE' });
    expect(g.s.lechon).toBe(2);
    expect(g.s.winner).toBeNull();
    g.hatol(g.roleIds.kupitero[0]);
    expect(g.s.phase).toBe('ROUND_END');
    expect(g.s.winner).toBe('kabarangay');
    g.do({ type: 'ROUND_NEXT' });
    expect(g.s.phase).toBe('END');
  });

  it('the game ends after round 5 even with no one at 3', () => {
    const g = new Game(5, 31).deal();
    g.s = { ...g.s, round: 5, lechon: 2, sira: 2, phase: 'HATOL', complete: true, hatol: { ...g.s.hatol, chosenId: 1 } };
    g.do({ type: 'HATOL_DONE' });
    expect(g.s.winner).toBe('kupitero');
  });
});

describe('silip', () => {
  const atTsismisan = () => new Game(5, 40, ['banda', 'ulan', 'handaan', 'baboy-ramo', 'tahimik']).deal().ambag().tanod().bilangan();
  const silip = (g: Game, who: number, target: number) =>
    g.do({ type: 'SILIP_OPEN' }).do({ type: 'SILIP_WHO', id: who }).do({ type: 'SILIP_READY' })
      .do({ type: 'SILIP_TARGET', id: target }).do({ type: 'SILIP_CLOSE' });

  it('is spent only by Lola, and only once', () => {
    const g = atTsismisan();
    const lola = g.roleIds.lola;
    const other = g.roleIds.kabarangay[0];
    silip(g, other, lola);
    expect(g.s.silipUsed).toBe(false);
    silip(g, g.roleIds.kupitero[0], lola);
    expect(g.s.silipUsed).toBe(false);
    g.do({ type: 'SILIP_OPEN' }).do({ type: 'SILIP_WHO', id: lola }).do({ type: 'SILIP_READY' }).do({ type: 'SILIP_TARGET', id: other });
    expect(g.s.silip).toEqual({ step: 'result', who: lola, target: other, spent: true });
    expect(g.s.silipUsed).toBe(true);
    g.do({ type: 'SILIP_CLOSE' });
    expect(g.s.silip).toBeNull();
    silip(g, lola, other);
    expect(g.s.silipUsed).toBe(true);
  });

  it('cannot peek at yourself, and only works in Tsismisan', () => {
    const g = atTsismisan();
    g.do({ type: 'SILIP_OPEN' }).do({ type: 'SILIP_WHO', id: 1 }).do({ type: 'SILIP_READY' }).do({ type: 'SILIP_TARGET', id: 1 });
    expect(g.s.silip).toEqual({ step: 'target', who: 1 });
    const h = new Game(5, 40).deal();
    expect(h.do({ type: 'SILIP_OPEN' }).s.silip).toBeNull();
  });

  it('Silip survives into later rounds as spent', () => {
    const g = atTsismisan();
    silip(g, g.roleIds.lola, g.roleIds.kabarangay[0]);
    g.s = { ...g.s, phase: 'ROUND_END', winner: null };
    g.do({ type: 'ROUND_NEXT' });
    expect(g.s.silipUsed).toBe(true);
  });
});

describe('partners + reset', () => {
  it('Kupitero know each other', () => {
    const g = new Game(8, 50);
    const [a, b, c] = g.roleIds.kupitero;
    expect(partnersOf(g.s.players, a).map((p) => p.id).sort()).toEqual([b, c].sort());
  });

  it('Maglaro ulit keeps players, reshuffles roles and resets everything', () => {
    const g = new Game(6, 60).deal();
    g.ambag((id) => ({ choice: 2, dagdag: id === 0 }));
    g.tanod().bilangan();
    if (g.s.phase === 'TSISMISAN') g.do({ type: 'TSISMISAN_DONE' });
    g.hatol(g.roleIds.kupitero[0]);
    g.s = { ...g.s, phase: 'END', winner: 'kabarangay', silipUsed: true };
    const names = g.s.players.map((p) => p.name);
    const roleLists: string[] = [];
    for (let i = 0; i < 6; i++) {
      const again = createReducer(mulberry32(100 + i))(g.s, { type: 'PLAY_AGAIN' });
      expect(again.phase).toBe('ROLE_DEAL');
      expect(again.players.map((p) => p.name)).toEqual(names);
      expect([again.round, again.lechon, again.sira, again.silipUsed, again.winner]).toEqual([0, 0, 0, false, null]);
      expect(again.players.every((p) => !p.dagdagUsed && !p.nabunyag)).toBe(true);
      expect(again.players.filter((p) => p.role === 'kupitero')).toHaveLength(2);
      roleLists.push(again.players.map((p) => p.role).join());
    }
    expect(new Set(roleLists).size).toBeGreaterThan(1);
  });

  it('Bagong laro goes to a clean Setup', () => {
    const g = new Game(5, 61);
    g.s = { ...g.s, phase: 'END', winner: 'kupitero' };
    g.do({ type: 'NEW_GAME' });
    expect(g.s.phase).toBe('SETUP');
    expect(g.s.players).toEqual([]);
  });

  it('keeps the mute flag across games', () => {
    const g = new Game(5, 62).do({ type: 'SET_MUTED', muted: true });
    g.s = { ...g.s, phase: 'END', winner: 'kupitero' };
    expect(g.do({ type: 'PLAY_AGAIN' }).s.muted).toBe(true);
  });
});

describe('500 random games', () => {
  it('all terminate within 5 rounds with a winner and no errors', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rnd = mulberry32(seed * 7919);
      const r = createReducer(mulberry32(seed));
      const int = (n: number) => Math.floor(rnd() * n);
      let s = r(r(initialState(), { type: 'GO', phase: 'SETUP' }), { type: 'START', players: mk(5 + int(4)) });
      let steps = 0;
      let maxRound = 0;
      const send = (a: Action) => { s = r(s, a); };

      while (s.phase !== 'END') {
        if (++steps > 5000) throw new Error(`seed ${seed} did not finish (phase ${s.phase})`);
        maxRound = Math.max(maxRound, s.round);
        const ids = s.players.map((p) => p.id);
        switch (s.phase) {
          case 'ROLE_DEAL': send({ type: s.dealStep === 'handoff' ? 'DEAL_READY' : 'DEAL_DONE' }); break;
          case 'EVENT': send({ type: 'EVENT_NEXT' }); break;
          case 'AMBAG':
            if (s.ambagStep === 'handoff') send({ type: 'AMBAG_READY' });
            else if (s.ambagStep === 'secret') send({ type: 'AMBAG_SUBMIT', choice: rnd() < 0.5 ? 1 : 2, dagdag: rnd() < 0.3 });
            else send({ type: 'AMBAG_NEXT' });
            break;
          case 'TANOD':
            if (s.tanodPick === null) send({ type: 'TANOD_PICK', targetId: ids.filter((i) => i !== s.tanodId)[int(ids.length - 1)] });
            else send({ type: 'TANOD_DONE' });
            break;
          case 'BILANGAN': send({ type: s.bilanganStep === 'ready' ? 'BILANGAN_REVEAL' : 'BILANGAN_NEXT' }); break;
          case 'TSISMISAN':
            if (!s.silip) send(rnd() < 0.4 ? { type: 'SILIP_OPEN' } : { type: 'TSISMISAN_DONE' });
            else if (s.silip.step === 'who') send({ type: 'SILIP_WHO', id: ids[int(ids.length)] });
            else if (s.silip.step === 'handoff') send({ type: 'SILIP_READY' });
            else if (s.silip.step === 'target') send({ type: 'SILIP_TARGET', id: ids.filter((i) => i !== (s.silip as { who: number }).who)[int(ids.length - 1)] });
            else send({ type: 'SILIP_CLOSE' });
            break;
          case 'HATOL': {
            const h = s.hatol;
            const ok = ids.filter((i) => canJudge(s, i));
            expect(ok.length).toBeGreaterThanOrEqual(2);
            if (h.chosenId !== null) send({ type: 'HATOL_DONE' });
            else if (h.tieLocked) send({ type: 'HATOL_PICK', id: h.tied[int(h.tied.length)] });
            else if (h.tieMode) {
              if (h.tied.length < 2) send({ type: 'HATOL_TIE_TOGGLE', id: ok.filter((i) => !h.tied.includes(i))[0] });
              else send({ type: 'HATOL_TIE_CONFIRM' });
            } else if (rnd() < 0.3) send({ type: 'HATOL_TIE_START' });
            else send({ type: 'HATOL_PICK', id: ok[int(ok.length)] });
            break;
          }
          case 'ROUND_END': send({ type: 'ROUND_NEXT' }); break;
          default: throw new Error(`unexpected phase ${s.phase}`);
        }
      }
      expect(maxRound).toBeLessThanOrEqual(5);
      expect(s.winner === 'kabarangay' || s.winner === 'kupitero').toBe(true);
      expect(s.round).toBeLessThanOrEqual(5);
      if (s.round < 5) expect(Math.max(s.lechon, s.sira)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('quit', () => {
  it('wipes every bit of game state from any phase, keeping only sound + language', () => {
    const g = new Game(6, 70).do({ type: 'SET_MUTED', muted: true }).do({ type: 'SET_LANG', lang: 'tl' });
    const r = g.r;
    const seen = new Set<string>();
    const check = (s: GameState) => {
      seen.add(s.phase);
      expect(r(s, { type: 'QUIT' })).toEqual({ ...initialState(true, 'tl') });
    };
    check(g.s);
    g.deal();
    check(g.s);
    g.do({ type: 'EVENT_NEXT' }).do({ type: 'AMBAG_READY' });
    check(g.s);
    g.s = { ...g.s, phase: 'AMBAG' };
    g.do({ type: 'AMBAG_SUBMIT', choice: 1, dagdag: true }).do({ type: 'AMBAG_NEXT' });
    for (let i = 1; i < 6; i++) g.do({ type: 'AMBAG_READY' }).do({ type: 'AMBAG_SUBMIT', choice: 2, dagdag: false }).do({ type: 'AMBAG_NEXT' });
    if (g.s.phase === 'TANOD') { check(g.s); g.tanod(); }
    check(g.s);
    g.bilangan();
    if (g.s.phase === 'TSISMISAN') { g.do({ type: 'SILIP_OPEN' }); check(g.s); g.do({ type: 'SILIP_CLOSE' }).do({ type: 'TSISMISAN_DONE' }); }
    g.do({ type: 'HATOL_TIE_START' });
    check(g.s);
    g.do({ type: 'HATOL_TIE_CANCEL' }).hatol(g.s.players.find((p) => canJudge(g.s, p.id))!.id);
    check(g.s);
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it('a quit game leaves nothing behind for the next one', () => {
    const g = new Game(5, 71).deal().toHatol(true);
    g.do({ type: 'QUIT' });
    expect(g.s.phase).toBe('HOME');
    expect([g.s.players, g.s.round, g.s.lechon, g.s.sira, g.s.thiefId, g.s.cups, g.s.silipUsed, g.s.eventDeck])
      .toEqual([[], 0, 0, 0, null, {}, false, []]);
    g.do({ type: 'GO', phase: 'SETUP' }).do({ type: 'START', players: mk(7) });
    expect(g.s.phase).toBe('ROLE_DEAL');
    expect(g.s.players).toHaveLength(7);
    expect(g.s.players.every((p) => !p.dagdagUsed && !p.nabunyag)).toBe(true);
  });
});
