# Kupit sa Fiesta — Asset Pack

Everything for the game's look and sound, generated in code. No image files, no audio files, no fonts, no CDN.
Total: 46 SVGs (about 138 KB raw), 1 sound module, 2 CSS files, 2 tiny helpers.

## Folder layout (keep it as is)

```
assets.ts            typed helpers for Vite (roleCard, eventCard, avatar, cup, ICON, ITEM, SCENE)
fx.js                launchConfetti(), replay(el, cls)
audio/sounds.js      Web Audio sound effects: play('coinDrop'), setMuted(), unlockAudio()
styles/theme.css     color tokens, buttons, tiles, hold-to-reveal, scoreboard, banners
styles/animations.css  .anim-* classes (coin drop, cup flip, card flip, pop, sway...) + confetti
svg/
  cards/    kupitero, lola, kabarangay, dagdag, card-back, event-{ulan,banda,handaan,baboy-ramo,tahimik}
  items/    coin, coin-stack, cup-closed, cup-open-{0,1,2}, lechon, sira, medalya
  avatars/  mang-ben, ate-joy, kuya-jun, aling-nena, bunso, dodong, ineng, mang-tonyo
  icons/    eye, hold, pass, sound-on, sound-off, timer, trophy, rules, badge-{tanod,nabunyag,medalya,thief}
  decor/    banderitas, banderitas-tile, parol, bg-pattern, bg-night
  scenes/   logo, hero-baryo
  manifest.json
```

Put the whole folder at `src/assets/` in a Vite project.

## Using it

```tsx
import './assets/styles/theme.css';
import './assets/styles/animations.css';
import { roleCard, eventCard, avatar, cup, ICON, ITEM } from './assets/assets';
import { play, unlockAudio, setMuted } from './assets/audio/sounds.js';
import { launchConfetti } from './assets/fx.js';

<img src={roleCard('lola')} width={300} height={420} alt="Baraha ni Lola" className="card-img anim-card-flip" />
<img src={cup(2)} width={130} height={146} alt="Tasa na may 2 barya" className="anim-cup-flip" />
```

## Sound names

`click, tick, clink, coinDrop, dagdag, handoff, night, cupFlip, pour, vote, silip, reveal, kumpleto, kulang, lechon, sira, evil, good, win, lose`

Browsers block audio until a user gesture: call `unlockAudio()` in the first tap handler.

## Animation classes

`anim-coin-drop, anim-cup-shake, anim-cup-flip, anim-pour-in, anim-pop, anim-wobble, anim-sway, anim-float, anim-fade-in, anim-slide-up, anim-card-flip, anim-shake-x, pulse`
To replay one on the same element, use `replay(el, 'anim-cup-shake')`. All motion is disabled under `prefers-reduced-motion`.

## Notes

- Every SVG has unique gradient/clip ids (prefixed by file name), so you can inline several on one page without collisions.
- Card text is part of the SVG (Filipino). To change wording, edit the generator or the SVG text directly.
- Palette: red `#D7263D`, yellow `#FFC93C`, green `#2BA84A`, blue `#2A6FDB`, orange `#F77F00`, cream `#FFF4DC`, ink `#2B1810`.
- Open `preview.html` (in the zip) in any browser to see and hear everything.
