# Habit

A personal habit app built for one user: me. A daily checklist with streaks, XP and levels, designed around what the best habit apps get right and without the parts that make people quit.

It is a Progressive Web App: open it in a browser, add it to your phone's home screen, and it runs full-screen and offline. No account, no server, no subscription. Your data lives on your device and can be exported as JSON.

## What it does

- **Today** — your habits for the day, grouped by morning / afternoon / evening. Tap the circle to complete. A progress ring, your level bar and a one-line coach message sit at the top. Swipe back a day with ‹ to backfill something you forgot to log. One-line end-of-day reflection.
- **Progress** — a 16-week heatmap, current and best streak per habit, this week vs last week review, and achievements.
- **Habits** — add, edit, reorder, archive or delete. Each habit has a frequency, a time of day, an effort level (sets XP), an optional cue ("After I ___, I will ___") and an optional "why".
- **Settings** — name, daily reminder, export/import backup, reset, install instructions.

## The rules of the game

These are deliberate design choices, borrowed from the apps and books that do this best.

| Rule | Where it comes from |
| --- | --- |
| **Never miss twice.** One missed day pauses a streak; two in a row breaks it. The card turns amber and tells you today is the one that counts. | *Atomic Habits*. Plain streak counters cause all-or-nothing thinking: one slip and people quit. |
| **Three frequencies:** every day, specific weekdays, or *N times per week*. | Streaks (iOS). "Exercise 4× a week" is a real goal; "exercise every day" is a lie you tell yourself. |
| **Weekly habits become required only when skipping would make the target impossible.** Until then they show as "optional today". | Keeps the daily list honest. You are never nagged about Muay Thai on a Monday when the week is wide open. |
| **XP is only earned by doing the thing.** Easy 10, medium 20, hard 35. Perfect day +30. Weekly target hit +40. | Habitica / Duolingo. Points work as a progress signal when they map to real effort, and backfire when they are decorative. |
| **Levels with titles** (Rookie → Committed → Consistent → Disciplined → Relentless → Elite → Legend). Each level needs a little more XP than the last. | Standard levelling curve. Gives a long-horizon goal beyond the streak. |
| **Heatmap over streak counter** as the primary progress view. | A heatmap shows a bad week as a dip, not a reset to zero. |
| **Achievements** that reward recovery ("Comeback": miss a day, show up the next) as well as perfection. | Rewards the behaviour that actually predicts long-term success. |
| **Coach line** computed from your data, not a motivational quote. | It says "2 left, finish the day" or "Never miss twice: Exercise". No fluff. |
| **No penalties.** Nothing takes damage, nothing is lost except the streak. | Habitica's HP-loss mechanic is the feature most people cite when they quit. |

## Run it

```bash
npm install
npm run dev        # local dev server with hot reload
npm test           # engine tests (streaks, weekly targets, XP, levels)
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Put it on your phone

The simplest route is to deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages all have free tiers and will build this repo automatically with `npm run build`). Then:

- **iPhone:** open the URL in Safari → Share → *Add to Home Screen*.
- **Android:** open in Chrome → ⋮ → *Install app*.

It installs like a native app, works offline, and updates itself on the next open after a deploy.

## Project layout

```
src/
  types.ts              data model (Habit, Frequency, AppState)
  lib/dates.ts          local-date helpers (YYYY-MM-DD keys, Monday weeks)
  lib/engine.ts         all the rules: scheduling, streaks, XP, levels, achievements, weekly review
  lib/engine.test.ts    tests for the rules above
  lib/storage.ts        localStorage persistence, seed habits, export/import
  store.ts              reducer + hook that persists state
  components/           Today, Progress, Habits, Settings screens and shared widgets
  index.css             design tokens and all styling (dark by default, light via system setting)
```

The engine is pure functions over the saved state. Nothing is cached, so every number on screen is recomputed from history, which means untoggling a habit removes its XP and corrects the streak with no special cases.

## Known limits

- **Reminders** only fire while the app is open (web apps cannot schedule background notifications without a push server). Pair the reminder with a phone alarm.
- **Data is per device.** Use Export in Settings before switching phones or clearing browser data.
- **Week starts Monday.** Weekly targets count Mon–Sun.

## Ideas for later

- Cloud sync (Supabase or similar) so the phone and laptop share one history.
- Push notifications via a tiny server.
- Streak-freeze tokens earned by perfect weeks, as an alternative to the never-miss-twice grace.
- Accountability partner: share a read-only progress page.
- Hook into the fitness app so "Exercise" and "Muay Thai" complete themselves when a session is logged.
