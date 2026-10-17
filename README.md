# Kupit sa Fiesta

A Filipino social-deduction family game for 5–8 players sharing **one phone** (pass-and-play).
Static web app: no backend, no accounts, no network calls. State lives in memory (refresh = new game).
English by default, with a one-tap switch to **Tagalog** (home screen, rules, setup and in-game header).

## Run

```bash
npm install
npm run dev      # local dev server
npm run test     # game-logic tests (Vitest)
npm run build    # production build into dist/
```

## How to play (5 lines)

1. Enter 5–8 names, then pass the phone so each player secretly sees their role (Kabarangay, Kupitero or Lola).
2. Each round: draw an Event, then pass the phone so everyone secretly puts 2 coins in (one Kupitero may steal 1).
3. The Tanod opens one cup, then all coins are counted: complete = +1 Lechon, short = +1 Sira.
4. Talk it over for 2 minutes (Lola may Silip once per game), then everyone points at a suspect and their card is opened.
5. First side to 3 points wins; after round 5 the side with more points wins (ties go to the Kupitero).

## Deploy

`npm run build` creates a fully static `dist/` folder. Upload its contents to any static host
(Netlify drop, GitHub Pages, Cloudflare Pages, Vercel, S3, or any web server). No server config needed.

## Code map

- `src/game/` – pure, typed reducer + tests (no React). RNG is injectable (`mulberry32` in tests).
- `src/screens/` – one component per phase; `src/App.tsx` switches on `state.phase`.
- `src/strings.ts` – all UI text in English and Tagalog.
- `src/assets/` – the provided art, sounds, CSS and helpers (unchanged).
