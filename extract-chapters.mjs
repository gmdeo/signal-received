// Regenerates src/chapters.js from the novel manuscript.
//
// The manuscript is the source of truth; this script keeps the site in sync so
// chapters never have to be hand-copied. Re-run it whenever new chapters are
// written:
//
//   node extract-chapters.mjs
//
// It also fails loudly on an unknown timeline rather than silently dropping a
// chapter — a table of contents that quietly omits chapters is worse than none.

import { readFileSync, writeFileSync } from 'node:fs'

const SRC = '/home/mm/builds/the-shade/THE-SHADE-NOVEL.md'
const OUT = new URL('./src/chapters.js', import.meta.url)

const TIMELINES = {
  1: {
    name: 'The Race',
    color: '#ff6b4a',
    blurb:
      'Near future. An asteroid is detected, and the race to escape begins — until the escape itself becomes the disaster.',
    setting: 'Near future — Earth races to escape',
  },
  2: {
    name: 'The Bunker',
    color: '#4a9eff',
    blurb:
      'Years after the Shade. Survivors underground keep a reactor alive and send expeditions into the dark.',
    setting: 'Years after the Shade — survivors underground',
  },
  3: {
    name: 'The Floating City',
    color: '#ffd24a',
    blurb:
      'Concurrent with the bunker. A city of boats survives inside the one patch of sunlight left on Earth.',
    setting: 'Concurrent — life inside the sunlight patch',
  },
}

const PLANNED_PER_TIMELINE = 20
const TOTAL_PLANNED = 60

const md = readFileSync(SRC, 'utf8')

// Split on level-2 headings; the first slice is the document preamble.
const sections = md.split(/^##\s+/m).slice(1)

const parsed = []

for (const section of sections) {
  const [headingLine, ...rest] = section.split('\n')
  const match = headingLine.match(
    /^Timeline\s+(\d+),\s+Chapter\s+(\d+):\s*(.+?)\s*$/
  )

  // Not a chapter heading (e.g. a front-matter or notes section): skip it.
  if (!match) continue

  const timeline = Number(match[1])
  const chapterNumber = Number(match[2])
  const title = match[3]

  if (!TIMELINES[timeline]) {
    throw new Error(
      `Chapter "${title}" declares timeline ${timeline}, which has no metadata. ` +
        `Known timelines: ${Object.keys(TIMELINES).join(', ')}.`
    )
  }

  const paragraphs = rest
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^-{3,}$/.test(p))
    // Collapse hard-wrapped lines inside a paragraph into one flowing string.
    .map((p) => p.replace(/\s+/g, ' '))

  if (paragraphs.length === 0) {
    throw new Error(`Chapter "${title}" parsed with no paragraphs.`)
  }

  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length

  parsed.push({ timeline, chapterNumber, title, paragraphs, wordCount })
}

// Duplicate detection: two chapters claiming the same slot would make the table
// of contents ambiguous.
const seen = new Map()
for (const chapter of parsed) {
  const key = `T${chapter.timeline}C${chapter.chapterNumber}`
  if (seen.has(key)) {
    throw new Error(
      `Duplicate chapter slot ${key}: "${seen.get(key)}" and "${chapter.title}".`
    )
  }
  seen.set(key, chapter.title)
}

// File order is reading order (the timelines are interleaved in the manuscript).
const chapters = parsed.map((chapter, i) => ({
  id: i + 1,
  timeline: chapter.timeline,
  timelineName: TIMELINES[chapter.timeline].name,
  chapterNumber: chapter.chapterNumber,
  title: chapter.title,
  setting: TIMELINES[chapter.timeline].setting,
  wordCount: chapter.wordCount,
  paragraphs: chapter.paragraphs,
}))

const countsByTimeline = {}
for (const chapter of chapters) {
  countsByTimeline[chapter.timeline] =
    (countsByTimeline[chapter.timeline] ?? 0) + 1
}

const timelines = Object.entries(TIMELINES).map(([id, meta]) => ({
  id: Number(id),
  name: meta.name,
  color: meta.color,
  blurb: meta.blurb,
  planned: PLANNED_PER_TIMELINE,
  written: countsByTimeline[id] ?? 0,
}))

const output = `// GENERATED FILE — do not edit by hand.
//
// Source of truth: ${SRC}
// Regenerate with: node extract-chapters.mjs
//
// Reading order interleaves the three timelines: T1-Ch1, T2-Ch1, T3-Ch1, T1-Ch2, ...

export const timelines = ${JSON.stringify(timelines, null, 2)}

export const chapters = ${JSON.stringify(chapters, null, 2)}

export const totalChaptersPlanned = ${TOTAL_PLANNED}

export const plannedPerTimeline = ${PLANNED_PER_TIMELINE}
`

writeFileSync(OUT, output)

console.log(`Wrote ${chapters.length} chapters to src/chapters.js`)
for (const t of timelines) {
  console.log(
    `  T${t.id} ${t.name.padEnd(20)} ${t.written}/${t.planned} written`
  )
}
console.log(
  `  TOTAL ${chapters.length}/${TOTAL_PLANNED} — ` +
    `${chapters.reduce((n, c) => n + c.wordCount, 0).toLocaleString()} words`
)
