import { useEffect, useState } from 'react';
import { ICON, ITEM, cup, eventCard, roleCard } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { currentPlayer, partnersOf } from '../game/reducer';
import type { GameState, Player } from '../game/types';
import { Handoff, Hold, av, names, tr, type ScreenProps } from '../ui';

function RoleSecret({ s, p }: { s: GameState; p: Player }) {
  const t = tr(s);
  return (
    <>
      <img src={roleCard(p.role)} width={300} height={420} alt={t.cardAlt(t.role[p.role])} className="card-img role-card" />
      {p.role === 'kupitero' && <p>{t.deal.partners} <b>{names(t, partnersOf(s.players, p.id))}</b></p>}
      {p.role === 'lola' && <p>{t.deal.lolaText}</p>}
      {p.role === 'kabarangay' && <p>{t.deal.kabText}</p>}
    </>
  );
}

export function Deal({ s, d }: ScreenProps) {
  const t = tr(s);
  const p = s.players[s.dealIndex];
  if (s.dealStep === 'handoff') return <Handoff t={t} player={p} onReady={() => d({ type: 'DEAL_READY' })} />;
  return (
    <section className="screen">
      <p className="hint">{t.deal.hint(p.name)}</p>
      <div className="row who-row"><img src={av(p)} width={56} height={56} alt="" /><b className="grow">{p.name}</b></div>
      <Hold t={t} onStart={() => play('reveal')}>{() => <RoleSecret s={s} p={p} />}</Hold>
      <button className="btn big" onClick={() => { play('click'); d({ type: 'DEAL_DONE' }); }}>{t.deal.done}</button>
    </section>
  );
}

export function EventScreen({ s, d }: ScreenProps) {
  const t = tr(s);
  const e = s.event!;
  useEffect(() => { play('reveal'); }, []);
  return (
    <section className="screen">
      <p className="hint">{t.eventScreen.hint(s.round)}</p>
      <img src={eventCard(e)} width={300} height={420} alt={t.eventAlt(t.event[e].name)} className="card-img anim-card-flip" />
      <p className={`banner${e === 'banda' ? ' quiet' : ''}`}>{t.event[e].effect}</p>
      <button className="btn big green" onClick={() => { play('night'); d({ type: 'EVENT_NEXT' }); }}>{t.eventScreen.next}</button>
    </section>
  );
}

function AmbagSecret({ s, p }: { s: GameState; p: Player }) {
  const t = tr(s);
  const a = t.ambag;
  if (p.role === 'kupitero' && !p.nabunyag) {
    const thief = p.id === s.thiefId;
    return (
      <>
        <p><b>{a.kupitero}</b> {a.partners} <b>{names(t, partnersOf(s.players, p.id))}</b></p>
        {thief
          ? <><img src={ICON.thief} width={56} height={56} alt="" /><p><b>{a.thief}</b></p></>
          : <p>{a.notThief}</p>}
      </>
    );
  }
  if (p.role === 'kupitero') return <p>{a.exposed}</p>;
  if (p.role === 'lola') return <p><b>{a.lola}</b> {s.silipUsed ? a.silipUsed : a.silipFresh} {a.give2}</p>;
  return <p><b>{a.kab}</b> {a.give2}</p>;
}

function CoinDrop({ s, p, d }: { s: GameState; p: Player; d: ScreenProps['d'] }) {
  useEffect(() => {
    play('coinDrop');
    const timer = setTimeout(() => d({ type: 'AMBAG_NEXT' }), 1400);
    return () => clearTimeout(timer);
  }, [d]);
  return (
    <section className="screen night handoff">
      <p className="lead">{tr(s).ambag.dropped(p.name)}</p>
      <div className="drop">
        <img src={ITEM.coin} width={72} height={72} alt="" className="anim-coin-drop" />
        <img src={cup('closed')} width={130} height={146} alt="" className="anim-cup-shake" />
      </div>
    </section>
  );
}

export function Ambag({ s, d }: ScreenProps) {
  const t = tr(s);
  const p = currentPlayer(s);
  const [dagdag, setDagdag] = useState(false);

  if (s.ambagStep === 'handoff') return <Handoff t={t} night player={p} onReady={() => d({ type: 'AMBAG_READY' })} />;
  if (s.ambagStep === 'drop') return <CoinDrop s={s} p={p} d={d} />;

  const give = (choice: 1 | 2) => {
    d({ type: 'AMBAG_SUBMIT', choice, dagdag: dagdag && !p.dagdagUsed });
  };

  return (
    <section className="screen night">
      <p className="hint">{t.ambag.hint(p.name)}</p>
      <Hold t={t} onStart={() => play('silip')}>{() => <AmbagSecret s={s} p={p} />}</Hold>
      {!p.dagdagUsed && (
        <button className="tile dagdag" aria-pressed={dagdag} onClick={() => { play('click'); setDagdag(!dagdag); }}>
          <span>{dagdag ? '✔ ' : ''}{t.ambag.useDagdag}</span>
          <small>{t.ambag.dagdagNote}</small>
        </button>
      )}
      <div className="row coin-btns">
        <button className="btn big grow" onClick={() => give(2)}>{t.ambag.coins2}</button>
        <button className="btn big grow" onClick={() => give(1)}>{t.ambag.coins1}</button>
      </div>
    </section>
  );
}

export function Tanod({ s, d }: ScreenProps) {
  const t = tr(s);
  const tanod = s.players[s.tanodId!];
  const picked = s.tanodPick;
  const coins = picked === null ? 0 : s.cups[picked];

  useEffect(() => {
    if (picked !== null) play('cupFlip');
  }, [picked]);

  return (
    <section className="screen">
      <p className="hint">{picked === null ? t.tanod.pick(tanod.name) : t.tanod.opened}</p>
      <div className="grid cups">
        {s.players.map((p) => {
          const open = picked === p.id;
          return (
            <button
              key={p.id} className={`tile${open ? ' opened' : ''}`} disabled={picked !== null || p.id === tanod.id}
              aria-label={t.tanod.cupOf(p.name, p.id === tanod.id)}
              onClick={() => d({ type: 'TANOD_PICK', targetId: p.id })}
            >
              <img
                className={`cup${open ? ' anim-cup-flip' : ''}`} width={130} height={146} alt=""
                src={cup(open ? (coins === 1 ? 1 : 2) : 'closed')}
              />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className="banner anim-pop">{coins === 2 ? t.tanod.two(s.players[picked].name) : t.tanod.one(s.players[picked].name)}</p>
          <button className="btn big green" onClick={() => { play('click'); d({ type: 'TANOD_DONE' }); }}>{t.tanod.next}</button>
        </>
      )}
    </section>
  );
}

export function Bilangan({ s, d }: ScreenProps) {
  const t = tr(s);
  const [pouring, setPouring] = useState(false);
  const ready = s.bilanganStep === 'ready';

  useEffect(() => {
    if (!pouring) return;
    play('pour');
    const timer = setTimeout(() => d({ type: 'BILANGAN_REVEAL' }), 1600);
    return () => clearTimeout(timer);
  }, [pouring, d]);

  useEffect(() => {
    if (!ready) play(s.complete ? 'kumpleto' : 'kulang');
  }, [ready, s.complete]);

  let gain = 1;
  if (s.complete && s.event === 'handaan') gain = 2;
  if (!s.complete && s.event === 'baboy-ramo') gain = 2;

  return (
    <section className="screen">
      <p className="hint">{ready ? t.bilangan.hintReady : t.bilangan.hintDone}</p>
      <div className="pour-zone">
        <div className="grid cups small">
          {s.players.map((p, i) => (
            <div key={p.id} className={`pour-cup${pouring ? ' anim-cup-shake' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
              <img src={cup('closed')} width={130} height={146} alt="" className={pouring || !ready ? 'tilt' : ''} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        <img src={ITEM.coinStack} width={100} height={100} alt="" className={`pot${pouring ? ' anim-pour-in' : ''}`} />
      </div>
      {ready ? (
        <button className="btn big green" disabled={pouring} onClick={() => setPouring(true)}>{t.bilangan.pour}</button>
      ) : (
        <>
          <div className={`banner anim-pop ${s.complete ? 'ok' : 'bad'}`}>
            <img src={s.complete ? ITEM.lechon : ITEM.sira} width={64} height={64} alt="" />
            <div>{s.complete ? t.bilangan.complete : t.bilangan.short}</div>
            <small>{t.bilangan.gain(gain, !!s.complete, gain === 2 ? t.event[s.event!].name : null)}</small>
          </div>
          <button className="btn big" onClick={() => { play('click'); d({ type: 'BILANGAN_NEXT' }); }}>
            {s.event === 'tahimik' ? t.bilangan.toHatol : t.bilangan.toTsismisan}
          </button>
        </>
      )}
    </section>
  );
}
