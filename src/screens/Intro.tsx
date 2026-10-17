import { useState } from 'react';
import { AVATARS, ICON, ITEM, SCENE, avatar, eventCard, roleCard, type AvatarId } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { validPlayers } from '../game/reducer';
import { EVENT_IDS, MAX_NAME, MAX_PLAYERS, MIN_PLAYERS, type PlayerInput } from '../game/types';
import { Lead, LangButton, LangCard, MuteButton, tr, type ScreenProps } from '../ui';

export function Home({ s, d }: ScreenProps) {
  const t = tr(s);

  const goTo = (phase: 'SETUP' | 'RULES') => {
    play('click');
    d({ type: 'GO', phase });
  };

  return (
    <>
      <div className="banderitas-top anim-sway" aria-hidden="true" />
      <section className="screen home">
        <img src={SCENE.logo} width={520} height={220} alt="Kupit sa Fiesta" className="logo anim-pop" />
        <img src={SCENE.hero} width={800} height={420} alt="" className="hero" />
        <div className="home-actions">
          <button className="btn big red" onClick={() => goTo('SETUP')}>{t.home.play}</button>
          <button className="btn big ghost" onClick={() => goTo('RULES')}>{t.home.rules}</button>
          <LangCard s={s} d={d} />
          <div className="row wrap"><MuteButton s={s} d={d} /></div>
          <p className="small">{t.home.tagline}</p>
        </div>
      </section>
    </>
  );
}

export function Rules({ s, d }: ScreenProps) {
  const t = tr(s);
  const r = t.rules;
  return (
    <section className="screen rules">
      <div className="row">
        <button className="btn ghost" onClick={() => d({ type: 'GO', phase: 'HOME' })}>{t.back}</button>
        <h1 className="grow rules-title"><img src={ICON.rules} width={44} height={44} alt="" /> {r.title}</h1>
        <LangButton s={s} d={d} />
      </div>

      <article className="panel"><h2>{r.story}</h2><p>{r.storyText}</p></article>

      <article className="panel">
        <h2>{r.rolesTitle}</h2>
        {([['kabarangay', r.kab], ['kupitero', r.kup], ['lola', r.lola]] as const).map(([role, text]) => (
          <div className="row role-row" key={role}>
            <img src={roleCard(role)} width={60} height={84} alt="" loading="lazy" decoding="async" />
            <p><Lead text={text} /></p>
          </div>
        ))}
        <p><Lead text={r.dagdag} /></p>
      </article>

      <article className="panel">
        <h2>{r.roundTitle}</h2>
        <ol className="steps">{r.steps.map((x) => <li key={x}><Lead text={x} /></li>)}</ol>
      </article>

      <article className="panel">
        <h2>{r.pointsTitle}</h2>
        <div className="row"><img src={ITEM.lechon} width={44} height={44} alt="" loading="lazy" /><p><Lead text={r.lechonText} /></p></div>
        <div className="row"><img src={ITEM.sira} width={44} height={44} alt="" loading="lazy" /><p><Lead text={r.siraText} /></p></div>
        <p>{r.win}</p>
        <p>{r.nabunyagText}</p>
      </article>

      <article className="panel">
        <h2>{r.eventsTitle}</h2>
        <div className="events">
          {EVENT_IDS.map((e) => (
            <div className="row" key={e}>
              <img src={eventCard(e)} width={42} height={59} alt="" loading="lazy" decoding="async" />
              <p><b>{t.event[e].name}</b> – {t.event[e].effect}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>{r.exTitle}</h2>
        {r.ex.map((x) => <p key={x}>{x}</p>)}
      </article>

      <button className="btn big red" onClick={() => { play('click'); d({ type: 'GO', phase: 'SETUP' }); }}>{r.play}</button>
    </section>
  );
}

interface Row { name: string; avatar: AvatarId }

export function Setup({ s, d }: ScreenProps) {
  const t = tr(s);
  const [rows, setRows] = useState<Row[]>(() => AVATARS.slice(0, MIN_PLAYERS).map((a) => ({ name: '', avatar: a.id })));
  const [editing, setEditing] = useState<number | null>(null);

  const players: PlayerInput[] = rows.map((r) => ({ name: r.name, avatar: r.avatar }));
  const ok = validPlayers(players);
  const lowerNames = rows.map((r) => r.name.trim().toLowerCase());
  const hasDuplicate = lowerNames.some((n, i) => n && lowerNames.indexOf(n) !== i);
  const hasEmpty = rows.some((r) => !r.name.trim());
  const takenAvatars = new Set(rows.map((r) => r.avatar));

  const updateRow = (i: number, changes: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...changes } : r)));

  const addRow = () => {
    const free = AVATARS.find((a) => !takenAvatars.has(a.id));
    if (free && rows.length < MAX_PLAYERS) setRows([...rows, { name: '', avatar: free.id }]);
  };

  const removeRow = (i: number) => {
    setRows(rows.filter((_, j) => j !== i));
    setEditing(null);
  };

  const start = () => {
    play('click');
    d({ type: 'START', players });
  };

  return (
    <section className="screen setup">
      <div className="row">
        <button className="btn ghost" onClick={() => d({ type: 'GO', phase: 'HOME' })}>{t.back}</button>
        <h1 className="grow rules-title">{t.setup.title}</h1>
        <LangButton s={s} d={d} />
      </div>
      <p className="hint">{t.setup.hint(MIN_PLAYERS, MAX_PLAYERS)}</p>

      <ul className="setup-list">
        {rows.map((r, i) => (
          <li key={i} className={editing === i ? 'editing' : undefined}>
            <div className="row">
              <button
                className="tile av-pick" onClick={() => setEditing(editing === i ? null : i)}
                aria-expanded={editing === i} aria-label={t.setup.changeAvatar(i + 1)}
              >
                <img src={avatar(r.avatar)} width={48} height={48} alt="" />
              </button>
              <input
                className="name-input grow" value={r.name} maxLength={MAX_NAME} autoComplete="off"
                placeholder={t.setup.namePh(i + 1)} aria-label={t.setup.nameLabel(i + 1)}
                onChange={(e) => updateRow(i, { name: e.target.value })}
              />
              {rows.length > MIN_PLAYERS && (
                <button className="btn ghost icon-btn" onClick={() => removeRow(i)} aria-label={t.setup.remove(i + 1)}>✕</button>
              )}
            </div>
            {editing === i && (
              <div className="grid av-grid anim-fade-in">
                {AVATARS.map((a) => (
                  <button
                    key={a.id} className="tile" aria-pressed={r.avatar === a.id}
                    disabled={takenAvatars.has(a.id) && r.avatar !== a.id}
                    onClick={() => { updateRow(i, { avatar: a.id }); setEditing(null); }}
                  >
                    <img src={avatar(a.id)} width={64} height={64} alt="" />
                    <small>{a.name}</small>
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {rows.length < MAX_PLAYERS && <button className="btn ghost" onClick={addRow}>{t.setup.add}</button>}
      {!ok && <p className="small" role="status">{hasDuplicate ? t.setup.dup : hasEmpty ? t.setup.empty : ''}</p>}
      <button className="btn big red" disabled={!ok} onClick={start}>
        {t.setup.start(rows.length)}
      </button>
    </section>
  );
}
