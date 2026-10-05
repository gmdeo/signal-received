# The Shade — Signal Received

An interactive distribution experiment for **The Shade**, a science fiction
novel told across three interwoven timelines.

## What this is

A web experience with two modes:

1. **Signal** — an encrypted transmission. Visitors decode a corrupted
   observatory alert (the asteroid designation, impact probability, and
   time to collision). Progress aggregates; the opening chapter unlocks
   when all three fragments are recovered. Solvers can copy a unique link.
2. **Reader** — a direct chapter-by-chapter reader, no puzzle required.
   Six chapters, colour-coded by timeline, with pip navigation.

## The novel

Three timelines, 20 chapters each, 60 total, appearing in threes so that
every group of three chapters resonates thematically.

- **Timeline 1 — The Race.** Near future. Asteroid 2034-Prometheus on a
  collision course. Warlords, techno-utopians and corporate launch
  operators fight over escape capacity. A sunlight-capture array built for
  orbital power is sabotaged and deployed early, wrapping the Earth in
  panels and leaving one hole of sunlight.
- **Timeline 2 — The Bunker.** Years later. Survivors in a former launch
  facility, running on nuclear power, sending expeditions into the frozen
  dark to find the patch of light.
- **Timeline 3 — The Floating City.** Concurrent. A city of lashed-together
  boats inside the sunlight patch over open ocean, living off the sea,
  building lightly, facing a cooling planet.

Status: 6 chapters written, 60-chapter blueprint complete (character arcs,
plot outlines on a five-act structure, and a distinct prose style per
timeline).

## Stack

React + Vite. Deployed on Vercel.

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
vercel --prod
```

## Source

- `src/chapters.js` — the written chapters, interleaved by theme.
- `src/App.jsx` — signal puzzle and reader modes.
- `src/App.css` — terminal aesthetic for the signal, serif reading
  typography for the reader.
