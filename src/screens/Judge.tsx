import { useEffect, useRef, useState } from 'react';
import { ICON, ITEM, cup, roleCard } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { canJudge } from '../game/reducer';
import { Handoff, Hold, PlayerTile, av, tr, type ScreenProps } from '../ui';

const TSISMISAN_SECONDS = 120;

function Silip({ s, d }: ScreenProps) {
  const t = tr(s);
  const silip = s.silip!;

  if (silip.step === 'who') {
    return (
      <section className="screen">
        <p className="hint">{t.silip.who}</p>
        <div className="grid">
          {s.players.map((p) => (
            <PlayerTile key={p.id} s={s} p={p} onPick={() => { play('click'); d({ type: 'SILIP_WHO', id: p.id }); }} />
          ))}
        </div>
        <button className="btn ghost" onClick={() => d({ type: 'SILIP_CLOSE' })}>{t.silip.cancel}</button>
      </section>
    );
  }
  const who = s.players[silip.who];
  if (silip.step === 'handoff') return <Handoff t={t} player={who} onReady={() => d({ type: 'SILIP_READY' })} />;

  if (silip.step === 'target') {
    return (
      <section className="screen">
        <p className="hint">{t.silip.target(who.name)}</p>
        <div className="grid">
          {s.players.filter((p) => p.id !== who.id).map((p) => (
            <PlayerTile key={p.id} s={s} p={p} onPick={() => { play('silip'); d({ type: 'SILIP_TARGET', id: p.id }); }} />
          ))}
        </div>
      </section>
    );
  }
  const target = s.players[silip.target];
  const coins = s.cups[target.id];
  return (
    <section className="screen">
      <p className="hint">{t.silip.hold(who.name)}</p>
      <Hold t={t} onStart={() => play('reveal')}>
        {() => who.role !== 'lola'
          ? <p><b>{t.silip.notLola}</b></p>
          : silip.spent
            ? <>
                <p>{t.silip.put(target.name)}</p>
                <img src={cup(coins === 1 ? 1 : 2)} width={130} height={146} alt={t.silip.coins(coins)} />
                <p><b>{t.silip.coins(coins)}</b> {t.silip.thisRound}</p>
              </>
            : <p><b>{t.silip.used}</b></p>}
      </Hold>
      <button className="btn big" onClick={() => { play('click'); d({ type: 'SILIP_CLOSE' }); }}>{t.silip.done}</button>
    </section>
  );
}

export function Tsismisan({ s, d }: ScreenProps) {
  const t = tr(s);
  const endAt = useRef(Date.now() + TSISMISAN_SECONDS * 1000);
  const [left, setLeft] = useState(TSISMISAN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.ceil((endAt.current - Date.now()) / 1000);
      setLeft(Math.max(0, remaining));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (left > 0 && left <= 5) play('tick');
    if (left === 0) play('vote');
  }, [left]);

  if (s.silip) return <Silip s={s} d={d} />;

  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, '0');
  const timeUp = left === 0;
  const whisper = s.event === 'banda';

  return (
    <section className={`screen${whisper ? ' whisper' : ''}`}>
      <p className="hint">{left > 0 ? t.tsismisan.hint : t.tsismisan.hintEnd}</p>
      {whisper && <p className="banner quiet">{t.tsismisan.whisper}</p>}
      <div className="timer" role="timer" aria-label={t.tsismisan.timer}>
        <img src={ICON.timer} width={64} height={64} alt="" />
        <span className={`time${left <= 10 ? ' low' : ''}`}>{mins}:{secs}</span>
      </div>
      <button className="btn big blue" onClick={() => { play('click'); d({ type: 'SILIP_OPEN' }); }}>
        <img src={ICON.eye} width={32} height={32} alt="" className="inline-icon" /> {t.tsismisan.silip}
      </button>
      <button className={`btn big ${timeUp ? 'green' : 'ghost'}`} onClick={() => { play('vote'); d({ type: 'TSISMISAN_DONE' }); }}>
        {timeUp ? t.tsismisan.toHatol : t.tsismisan.skip}
      </button>
    </section>
  );
}

export function Hatol({ s, d }: ScreenProps) {
  const t = tr(s);
  const h = s.hatol;
  const tanod = s.tanodId === null ? null : s.players[s.tanodId];
  const chosen = h.chosenId === null ? null : s.players[h.chosenId];

  useEffect(() => {
    if (chosen) play(chosen.role === 'kupitero' ? 'good' : 'evil');
  }, [chosen]);

  if (chosen) {
    const caught = chosen.role === 'kupitero';
    return (
      <section className="screen">
        <p className="hint">{t.hatol.opened(chosen.name)}</p>
        <img src={roleCard(chosen.role)} width={300} height={420} alt={t.hatol.cardOf(chosen.name, t.role[chosen.role])} className="card-img anim-card-flip" />
        <div className={`banner anim-pop ${caught ? 'ok' : 'bad'}`}>
          <img src={caught ? ITEM.lechon : ITEM.sira} width={56} height={56} alt="" />
          <div>{caught ? t.hatol.isKupitero : t.hatol.notKupitero(t.role[chosen.role])}</div>
          <small>{caught ? t.hatol.plusLechon : t.hatol.plusSira}</small>
        </div>
        <button className="btn big green" onClick={() => { play('click'); d({ type: 'HATOL_DONE' }); }}>{t.hatol.finish}</button>
      </section>
    );
  }

  const chooser = tanod ? t.hatol.chooserTanod(tanod.name) : t.hatol.chooserHost;
  const hint = h.tieLocked ? t.hatol.tieLocked(chooser) : h.tieMode ? t.hatol.tieMode : t.hatol.hint;

  return (
    <section className="screen">
      <p className="hint">{hint}</p>
      <div className="grid">
        {s.players.map((p) => {
          const eligible = canJudge(s, p.id);
          const note = p.id === s.medalyaId ? t.hatol.hasMedalya : p.nabunyag ? t.hatol.alreadyExposed : undefined;
          if (h.tieMode && !h.tieLocked) {
            return <PlayerTile key={p.id} s={s} p={p} note={note} disabled={!eligible} pressed={h.tied.includes(p.id)}
              onPick={() => d({ type: 'HATOL_TIE_TOGGLE', id: p.id })} />;
          }
          const allowed = eligible && (!h.tieLocked || h.tied.includes(p.id));
          return <PlayerTile key={p.id} s={s} p={p} note={note} disabled={!allowed}
            onPick={() => { play('vote'); d({ type: 'HATOL_PICK', id: p.id }); }} />;
        })}
      </div>
      {!h.tieMode && <button className="btn ghost" onClick={() => d({ type: 'HATOL_TIE_START' })}>{t.hatol.tie}</button>}
      {h.tieMode && !h.tieLocked && (
        <div className="row actions">
          <button className="btn ghost grow" onClick={() => d({ type: 'HATOL_TIE_CANCEL' })}>{t.hatol.cancel}</button>
          <button className="btn green grow" disabled={h.tied.length < 2} onClick={() => d({ type: 'HATOL_TIE_CONFIRM' })}>
            {t.hatol.go(h.tied.length)}
          </button>
        </div>
      )}
      {h.tieLocked && <button className="btn ghost" onClick={() => d({ type: 'HATOL_TIE_CANCEL' })}>{t.hatol.cancelTie}</button>}
    </section>
  );
}

export function RoundEnd({ s, d }: ScreenProps) {
  const t = tr(s);
  const r = s.recap!;
  const who = r.revealedId === null ? null : s.players[r.revealedId];
  return (
    <section className="screen">
      <p className="hint">{t.roundEnd.hint(s.round)}</p>
      <div className="panel recap">
        <div className="row">
          <img src={r.complete ? ITEM.lechon : ITEM.sira} width={56} height={56} alt="" />
          <p><b>{r.complete ? t.roundEnd.complete : t.roundEnd.short}</b></p>
        </div>
        {who && (
          <div className="row">
            <img src={av(who)} width={56} height={56} alt="" />
            <p>{t.roundEnd.opened(who.name, t.role[who.role], who.role === 'kupitero')}</p>
          </div>
        )}
        {s.winner && <p className="recap-end"><b>{t.roundEnd.winner}</b></p>}
      </div>
      <button className="btn big green" onClick={() => { play('click'); d({ type: 'ROUND_NEXT' }); }}>
        {s.winner ? t.roundEnd.results : t.roundEnd.next}
      </button>
    </section>
  );
}
