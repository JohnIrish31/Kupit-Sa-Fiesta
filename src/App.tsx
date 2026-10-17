import { useEffect, useReducer } from 'react';
import { setMuted, unlockAudio } from './assets/audio/sounds.js';
import { createReducer, initialState } from './game/reducer';
import type { Phase } from './game/types';
import { End } from './screens/End';
import { Home, Rules, Setup } from './screens/Intro';
import { Hatol, RoundEnd, Tsismisan } from './screens/Judge';
import { Ambag, Bilangan, Deal, EventScreen, Tanod } from './screens/Round';
import { GameBar, Header, type ScreenProps } from './ui';

const reducer = createReducer(Math.random);

const IN_GAME: ReadonlySet<Phase> = new Set(['ROLE_DEAL', 'EVENT', 'AMBAG', 'TANOD', 'BILANGAN', 'TSISMISAN', 'HATOL', 'ROUND_END']);
const WITH_HEADER: ReadonlySet<Phase> = new Set(['EVENT', 'AMBAG', 'TANOD', 'BILANGAN', 'TSISMISAN', 'HATOL', 'ROUND_END']);

function renderScreen(props: ScreenProps) {
  const { s } = props;
  switch (s.phase) {
    case 'HOME': return <Home {...props} />;
    case 'RULES': return <Rules {...props} />;
    case 'SETUP': return <Setup {...props} />;
    case 'ROLE_DEAL': return <Deal key={s.dealIndex} {...props} />;
    case 'EVENT': return <EventScreen key={s.round} {...props} />;
    case 'AMBAG': return <Ambag key={s.ambagIndex} {...props} />;
    case 'TANOD': return <Tanod {...props} />;
    case 'BILANGAN': return <Bilangan key={s.round} {...props} />;
    case 'TSISMISAN': return <Tsismisan key={s.round} {...props} />;
    case 'HATOL': return <Hatol {...props} />;
    case 'ROUND_END': return <RoundEnd {...props} />;
    case 'END': return <End {...props} />;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const playing = IN_GAME.has(state.phase);
  const showHeader = WITH_HEADER.has(state.phase);

  useEffect(() => setMuted(state.muted), [state.muted]);
  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
    return () => document.removeEventListener('pointerdown', unlockAudio, true);
  }, []);

  useEffect(() => {
    if (!playing) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const blockBack = () => history.pushState(null, '');

    history.pushState(null, '');
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', blockBack);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', blockBack);
    };
  }, [playing]);

  const props = { s: state, d: dispatch };

  return (
    <div className={`app${showHeader ? ' with-side' : ''}`}>
      {showHeader && <Header {...props} />}
      {state.phase === 'ROLE_DEAL' && <div className="hdr"><GameBar {...props} /></div>}
      <main className="main">{renderScreen(props)}</main>
    </div>
  );
}
