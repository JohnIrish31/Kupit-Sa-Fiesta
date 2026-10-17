import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { ICON, ITEM, avatar, eventCard, type AvatarId } from './assets/assets';
import { play } from './assets/audio/sounds.js';
import { MAX_ROUNDS, WIN_POINTS, type Action, type GameState, type Player } from './game/types';
import { STR, type Strings } from './strings';

export type Dispatcher = Dispatch<Action>;
export interface ScreenProps { s: GameState; d: Dispatcher }

export const av = (p: Pick<Player, 'avatar'>) => avatar(p.avatar as AvatarId);
export const tr = (s: Pick<GameState, 'lang'>): Strings => STR[s.lang];

export const names = (t: Strings, list: readonly Pick<Player, 'name'>[]) => list.map((p) => p.name).join(t.and);

export function Lead({ text }: { text: string }) {
  const match = /^(.+?)( – |: )(.*)$/s.exec(text);
  if (!match) return <>{text}</>;
  const [, term, sep, rest] = match;
  return <><b>{term}</b>{sep}{rest}</>;
}

export function Hold({ t, children, onStart }: { t: Strings; children: () => ReactNode; onStart?: () => void }) {
  const [held, setHeld] = useState(false);

  const start = () => {
    if (held) return;
    setHeld(true);
    onStart?.();
  };
  const stop = () => setHeld(false);

  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!down) stop();
    else if (!e.repeat) start();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start();
  };

  return (
    <div
      className={`hold${held ? ' active' : ''}`} role="button" tabIndex={0} aria-pressed={held} aria-label={t.holdAria}
      onPointerDown={onPointerDown}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => onKey(e, true)} onKeyUp={(e) => onKey(e, false)} onBlur={stop}
    >
      {held ? (
        <div className="secret anim-fade-in">{children()}</div>
      ) : (
        <>
          <img className="hold-icon pulse" src={ICON.hold} width={72} height={72} alt="" />
          <span>{t.holdText}</span>
        </>
      )}
    </div>
  );
}

export function Handoff({ t, player, onReady, night }: { t: Strings; player: Player; onReady: () => void; night?: boolean }) {
  useEffect(() => {
    play('handoff');
  }, []);

  const ready = () => {
    play('click');
    onReady();
  };

  return (
    <section className={`screen handoff${night ? ' night' : ''}`}>
      <img src={ICON.pass} width={64} height={64} alt="" />
      <p className="lead">{t.handoffLead}</p>
      <img src={av(player)} width={140} height={140} alt="" className="anim-pop" />
      <h1 className="who">{player.name}</h1>
      <button className="btn big green" onClick={ready}>{t.handoffBtn}</button>
    </section>
  );
}

export function MuteButton({ s, d }: ScreenProps) {
  const t = tr(s);

  const toggle = () => {
    d({ type: 'SET_MUTED', muted: !s.muted });
    if (s.muted) setTimeout(() => play('click'), 0);
  };

  return (
    <button className="btn icon-btn" aria-label={s.muted ? t.soundOn : t.soundOff} aria-pressed={s.muted} onClick={toggle}>
      <img src={s.muted ? ICON.soundOff : ICON.soundOn} width={40} height={40} alt="" />
    </button>
  );
}

export function LangButton({ s, d }: ScreenProps) {
  const t = tr(s);
  const other = s.lang === 'en' ? 'tl' : 'en';

  const switchLang = () => {
    play('click');
    d({ type: 'SET_LANG', lang: other });
  };

  return (
    <button className="btn lang-btn" lang={other} aria-label={t.switchAria} onClick={switchLang}>
      🌐 {t.switchTo}
    </button>
  );
}

export function QuitButton({ s, d }: ScreenProps) {
  const t = tr(s);
  const [open, setOpen] = useState(false);
  const stayBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    stayBtn.current?.focus();
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  const ask = () => {
    play('click');
    setOpen(true);
  };
  const quit = () => {
    play('click');
    d({ type: 'QUIT' });
  };
  const close = () => setOpen(false);

  return (
    <>
      <button className="btn ghost quit-btn" aria-label={t.quitAria} onClick={ask}>✕ {t.quit}</button>
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal anim-pop" role="alertdialog" aria-modal="true" aria-labelledby="quit-title" aria-describedby="quit-body" onClick={(e) => e.stopPropagation()}>
            <h2 id="quit-title">{t.quitTitle}</h2>
            <p id="quit-body">{t.quitBody}</p>
            <button ref={stayBtn} className="btn big green" onClick={close}>{t.quitNo}</button>
            <button className="btn big red" onClick={quit}>{t.quitYes}</button>
          </div>
        </div>
      )}
    </>
  );
}

export function GameBar({ s, d }: ScreenProps) {
  return (
    <div className="row game-bar">
      <QuitButton s={s} d={d} />
      <span className="grow" />
      <LangButton s={s} d={d} />
      <MuteButton s={s} d={d} />
    </div>
  );
}

export function LangCard({ s, d }: ScreenProps) {
  const t = tr(s);
  const other = s.lang === 'en' ? 'tl' : 'en';

  const switchLang = () => {
    play('click');
    d({ type: 'SET_LANG', lang: other });
  };

  return (
    <div className="lang-card">
      <p lang={other}>{t.home.langNote}</p>
      <button className="btn big red" lang={other} onClick={switchLang}>
        <span className="flag anim-wobble" aria-hidden="true">🇵🇭</span> {t.home.langBtn}
      </button>
    </div>
  );
}

export function Pips({ n, kind }: { n: number; kind: 'good' | 'bad' }) {
  const pips = [];
  for (let i = 0; i < WIN_POINTS; i++) {
    pips.push(<i key={i} className={`pip${i < n ? ` on ${kind}` : ''}`} />);
  }
  return <span className="pips" aria-hidden="true">{pips}</span>;
}

export function Scoreboard({ s }: { s: GameState }) {
  const t = tr(s);
  return (
    <div className="scoreboard">
      <div className="score">
        <img src={ITEM.lechon} width={40} height={40} alt="" />
        <span><b>{t.lechon}</b> <span className="num">{s.lechon}</span><span className="sr-only">{t.ofThree}</span></span>
        <Pips n={s.lechon} kind="good" />
      </div>
      <div className="score">
        <img src={ITEM.sira} width={40} height={40} alt="" />
        <span><b>{t.sira}</b> <span className="num">{s.sira}</span><span className="sr-only">{t.ofThree}</span></span>
        <Pips n={s.sira} kind="bad" />
      </div>
    </div>
  );
}

export function Badges({ s, p }: { s: GameState; p: Player }) {
  const t = tr(s);
  return (
    <>
      {p.id === s.tanodId && <img className="badge" src={ICON.tanod} width={28} height={28} alt={t.badgeTanod} />}
      {p.id === s.medalyaId && <img className="badge" src={ICON.medalya} width={28} height={28} alt={t.badgeMedalya} />}
      {p.nabunyag && <img className="badge" src={ICON.nabunyag} width={28} height={28} alt={t.badgeNabunyag} />}
    </>
  );
}

export function Header({ s, d }: ScreenProps) {
  const t = tr(s);
  const tanod = s.tanodId === null ? null : s.players[s.tanodId];

  let tanodInfo: ReactNode = '';
  if (tanod) {
    tanodInfo = <><img className="badge" src={ICON.tanod} width={28} height={28} alt="" /> {t.hdrTanod} <b>{tanod.name}</b></>;
  } else if (s.event === 'ulan') {
    tanodInfo = t.hdrNoTanod;
  }

  return (
    <header className="hdr">
      <GameBar s={s} d={d} />
      <div className="row hdr-top">
        {s.event && <img src={eventCard(s.event)} width={42} height={59} alt={t.eventAlt(t.event[s.event].name)} className="hdr-event" />}
        <div className="grow">
          <div className="hdr-round">{t.hdrRound(s.round, MAX_ROUNDS)}</div>
          <div className="hdr-tanod">{tanodInfo}</div>
        </div>
      </div>
      <Scoreboard s={s} />
      <ul className="plist" aria-label={t.players}>
        {s.players.map((p) => (
          <li key={p.id} className="pl">
            <img src={av(p)} width={44} height={44} alt="" />
            <span className="pl-name">{p.name}</span>
            <span className="pl-badges"><Badges s={s} p={p} /></span>
          </li>
        ))}
      </ul>
    </header>
  );
}

export function PlayerTile({ s, p, onPick, disabled, pressed, note }: {
  s: GameState; p: Player; onPick: () => void; disabled?: boolean; pressed?: boolean; note?: string;
}) {
  return (
    <button className="tile" onClick={onPick} disabled={disabled} aria-pressed={pressed}>
      <img src={av(p)} width={64} height={64} alt="" loading="lazy" decoding="async" />
      <span>{p.name}</span>
      <span className="tile-badges"><Badges s={s} p={p} /></span>
      {note && <small>{note}</small>}
    </button>
  );
}
