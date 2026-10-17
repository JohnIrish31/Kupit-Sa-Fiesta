import { useEffect } from 'react';
import { ICON, roleCard } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { launchConfetti } from '../assets/fx.js';
import { LangButton, MuteButton, Scoreboard, av, tr, type ScreenProps } from '../ui';

export function End({ s, d }: ScreenProps) {
  const t = tr(s);
  const good = s.winner === 'kabarangay';
  useEffect(() => {
    launchConfetti();
    play(good ? 'win' : 'lose');
  }, [good]);

  return (
    <section className="screen end">
      <div className={`banner anim-pop ${good ? 'ok' : 'bad'}`}>
        <img src={ICON.trophy} width={72} height={72} alt="" />
        <div>{good ? t.end.kab : t.end.kup}</div>
        <small>{good ? t.end.kabSub : t.end.kupSub}</small>
      </div>
      <Scoreboard s={s} />
      <h2 className="center-text">{t.end.who}</h2>
      <ul className="reveal-list">
        {s.players.map((p) => (
          <li key={p.id} className="row">
            <img src={roleCard(p.role)} width={60} height={84} alt="" loading="lazy" decoding="async" />
            <img src={av(p)} width={48} height={48} alt="" />
            <span className="grow"><b>{p.name}</b><br />{t.role[p.role]}</span>
            {p.nabunyag && <img className="badge" src={ICON.nabunyag} width={28} height={28} alt={t.badgeNabunyag} />}
          </li>
        ))}
      </ul>
      <button className="btn big green" onClick={() => { play('click'); d({ type: 'PLAY_AGAIN' }); }}>{t.end.again}</button>
      <button className="btn big ghost" onClick={() => { play('click'); d({ type: 'NEW_GAME' }); }}>{t.end.fresh}</button>
      <div className="row wrap"><MuteButton s={s} d={d} /><LangButton s={s} d={d} /></div>
    </section>
  );
}
