import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  chapters,
  timelines,
  totalChaptersPlanned,
  plannedPerTimeline,
} from './chapters'
import './App.css'

const colorFor = (timelineId) =>
  timelines.find((t) => t.id === timelineId)?.color ?? '#888'

/* ------------------------------------------------------------------ */
/* Table of contents                                                   */
/* ------------------------------------------------------------------ */

function TableOfContents({ index, onSelect, onClose, mode, activeTimeline }) {
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(timelines.map((t) => [t.id, true]))
  )
  // Pending slots are collapsed by default: 16 "unwritten" rows per timeline
  // would bury the written chapters and make the panel a long scroll.
  const [showPending, setShowPending] = useState({})
  const tocRef = useRef(null)
  const currentRef = useRef(null)

  // Open the panel positioned at the chapter being read, so "where am I" never
  // requires scrolling to find it. Scrolling the panel explicitly (rather than
  // scrollIntoView) keeps the page itself from jumping.
  useEffect(() => {
    const panel = tocRef.current
    const row = currentRef.current
    if (!panel || !row) return
    panel.scrollTop = row.offsetTop - panel.clientHeight / 2 + row.clientHeight / 2
  }, [])

  // Group chapters by timeline, preserving reading order within each group.
  const grouped = useMemo(
    () =>
      timelines.map((timeline) => ({
        timeline,
        items: chapters
          .map((chapter, i) => ({ chapter, i }))
          .filter(({ chapter }) => chapter.timeline === timeline.id),
      })),
    []
  )

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <nav className="toc" aria-label="Table of contents" ref={tocRef}>
      <div className="toc-header">
        <h2>Contents</h2>
        <button className="toc-close" onClick={onClose} aria-label="Close contents">
          ✕
        </button>
      </div>

      <p className="toc-summary">
        {chapters.length} of {totalChaptersPlanned} chapters written — three
        timelines, {plannedPerTimeline} chapters each.{' '}
        {mode === 'timeline' ? (
          <>
            You are following <strong>Timeline {activeTimeline}</strong>; the
            other timelines are dimmed.
          </>
        ) : (
          <>Chapters are listed in reading order.</>
        )}
      </p>

      {grouped.map(({ timeline, items }) => {
        const isOpen = expanded[timeline.id]
        const isFollowed = mode === 'timeline' && timeline.id === activeTimeline
        const isDimmed = mode === 'timeline' && !isFollowed
        return (
          <section
            key={timeline.id}
            className={`toc-group ${isDimmed ? 'toc-group-dimmed' : ''}`}
          >
            <button
              className="toc-group-header"
              onClick={() => toggle(timeline.id)}
              aria-expanded={isOpen}
              style={{ '--timeline-color': timeline.color }}
            >
              <span className="toc-swatch" style={{ background: timeline.color }} />
              <span className="toc-group-label">
                <span className="toc-group-name">
                  Timeline {timeline.id} — {timeline.name}
                  {isFollowed && (
                    <span className="toc-following">following</span>
                  )}
                </span>
                <span className="toc-group-meta">
                  {timeline.written} of {timeline.planned} written
                </span>
              </span>
              <span className="toc-caret" aria-hidden="true">
                {isOpen ? '▾' : '▸'}
              </span>
            </button>

            {isOpen && (
              <ul className="toc-list">
                {items.map(({ chapter, i }) => {
                  const isCurrent = i === index
                  return (
                    <li key={chapter.id}>
                      <button
                        className={`toc-item ${isCurrent ? 'current' : ''}`}
                        onClick={() => onSelect(i)}
                        aria-current={isCurrent ? 'true' : undefined}
                        style={{ '--timeline-color': timeline.color }}
                        ref={isCurrent ? currentRef : null}
                      >
                        <span className="toc-item-num">
                          {chapter.timeline}.{chapter.chapterNumber}
                        </span>
                        <span className="toc-item-body">
                          <span className="toc-item-title">{chapter.title}</span>
                          <span className="toc-item-meta">
                            {chapter.wordCount.toLocaleString()} words
                          </span>
                        </span>
                        {isCurrent && (
                          <span className="toc-item-here">reading</span>
                        )}
                      </button>
                    </li>
                  )
                })}

                {/* Remaining slots stay hidden behind a toggle, so the written
                    chapters stay scannable while the shape of the whole novel
                    is still discoverable. */}
                {timeline.planned - timeline.written > 0 && (
                  <li>
                    <button
                      className="toc-pending-toggle"
                      onClick={() =>
                        setShowPending((prev) => ({
                          ...prev,
                          [timeline.id]: !prev[timeline.id],
                        }))
                      }
                      aria-expanded={showPending[timeline.id] ? 'true' : 'false'}
                      style={{ '--timeline-color': timeline.color }}
                    >
                      {showPending[timeline.id]
                        ? `Hide the ${timeline.planned - timeline.written} unwritten slots`
                        : `+ ${timeline.planned - timeline.written} unwritten slots`}
                    </button>
                  </li>
                )}

                {showPending[timeline.id] &&
                  Array.from({
                    length: Math.max(0, timeline.planned - timeline.written),
                  }).map((_, n) => (
                    <li key={`pending-${timeline.id}-${n}`}>
                      <div className="toc-item toc-item-pending">
                        <span className="toc-item-num">
                          {timeline.id}.{timeline.written + n + 1}
                        </span>
                        <span className="toc-item-body">
                          <span className="toc-item-title">unwritten</span>
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )
      })}

      <div className="toc-legend">
        <p>
          <strong>{totalChaptersPlanned - chapters.length} chapters</strong>{' '}
          still forming. Each timeline runs {plannedPerTimeline} chapters.
        </p>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

const READING_MODE_KEY = 'shade:reading-mode'

/**
 * Reading mode: 'interleaved' walks all three timelines in the manuscript's
 * published order; 'timeline' stays inside one timeline to the end.
 *
 * Persisted so the choice survives a reload — the reader who picks one timeline
 * does not want to be dropped back into interleaved order on every visit.
 */
function useReadingMode() {
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'interleaved'
    const saved = window.localStorage.getItem(READING_MODE_KEY)
    return saved === 'timeline' ? 'timeline' : 'interleaved'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(READING_MODE_KEY, mode)
    } catch {
      // Private mode or storage disabled: the mode still works for this visit.
    }
  }, [mode])

  return [mode, setMode]
}

function Reader({ onExit }) {
  const [index, setIndex] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  const [mode, setMode] = useReadingMode()
  const [pinnedTimeline, setPinnedTimeline] = useState(null)
  const chapter = chapters[index]

  // Which timeline we are reading as a single thread. In interleaved mode the
  // highlight simply follows the chapter on screen; in single-timeline mode it
  // is the timeline the reader chose to follow.
  const activeTimeline =
    mode === 'timeline' ? pinnedTimeline ?? chapter.timeline : chapter.timeline

  /**
   * The ordered list of global chapter indices the Prev/Next buttons walk.
   * In interleaved mode this is every chapter; in timeline mode only the
   * chapters of the active timeline.
   */
  const sequence = useMemo(() => {
    if (mode === 'interleaved') return chapters.map((_, i) => i)
    return chapters
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.timeline === activeTimeline)
      .map(({ i }) => i)
  }, [mode, activeTimeline])

  // Position of the chapter on screen within the current sequence. A chapter
  // outside the sequence (e.g. mode switched while reading another timeline)
  // reports -1 and resolves to the start of the sequence.
  const cursor = sequence.indexOf(index)

  const goPrev = useCallback(() => {
    const at = sequence.indexOf(index)
    if (at > 0) setIndex(sequence[at - 1])
  }, [sequence, index])

  const goNext = useCallback(() => {
    const at = sequence.indexOf(index)
    if (at >= 0 && at < sequence.length - 1) setIndex(sequence[at + 1])
  }, [sequence, index])

  const atStart = cursor <= 0
  const atEnd = cursor === -1 || cursor >= sequence.length - 1

  // Switching modes or timelines must land on a chapter that belongs to the
  // new sequence, otherwise the reader would see an out-of-order chapter with
  // disabled controls.
  const switchMode = (next) => {
    if (next === 'timeline') {
      setPinnedTimeline(chapter.timeline)
      if (chapter.timeline !== activeTimeline) {
        const first = chapters.findIndex((c) => c.timeline === chapter.timeline)
        if (first >= 0) setIndex(first)
      }
    } else {
      setPinnedTimeline(null)
    }
    setMode(next)
  }

  const selectTimeline = (timelineId) => {
    if (mode === 'timeline') setPinnedTimeline(timelineId)
    const first = chapters.findIndex((c) => c.timeline === timelineId)
    if (first >= 0) setIndex(first)
  }

  // Jumping from the table of contents into another timeline in single-timeline
  // mode means the reader wants to follow that timeline, so move the pin with
  // them rather than leaving the sequence pointing at the old timeline.
  const jumpTo = (target) => {
    if (mode === 'timeline' && chapters[target].timeline !== activeTimeline) {
      setPinnedTimeline(chapters[target].timeline)
    }
    setIndex(target)
  }

  // Keyboard navigation, but not while the reader has focus in an input.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') setTocOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // Jumping to another chapter should start at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])

  const position =
    cursor >= 0
      ? `${cursor + 1} of ${sequence.length}`
      : `1 of ${sequence.length}`

  // Word count of the current sequence, so single-timeline reading shows a
  // meaningful total rather than the whole novel's.
  const sequenceWords = sequence.reduce(
    (n, i) => n + chapters[i].wordCount,
    0
  )
  const nextIndex = cursor >= 0 ? sequence[cursor + 1] : undefined

  return (
    <div className="app">
      <div className={`reader ${tocOpen ? 'reader-with-toc' : ''}`}>
        <div className="reader-topbar">
          <button className="back-button" onClick={onExit}>
            ← Signal
          </button>

          <div className="reader-topbar-right">
            <span className="reader-progress-text">{position}</span>
            <button
              className="toc-toggle"
              onClick={() => setTocOpen((o) => !o)}
              aria-expanded={tocOpen}
            >
              ☰ Contents
            </button>
          </div>
        </div>

        {/* Order control: read the timelines interleaved as published, or
            follow one timeline straight through. */}
        <div className="order-bar">
          <span className="order-label">Reading order</span>
          <div className="order-switch" role="group" aria-label="Reading order">
            <button
              className={`order-option ${mode === 'interleaved' ? 'active' : ''}`}
              onClick={() => switchMode('interleaved')}
              aria-pressed={mode === 'interleaved'}
            >
              All three, interleaved
            </button>
            <button
              className={`order-option ${mode === 'timeline' ? 'active' : ''}`}
              onClick={() => switchMode('timeline')}
              aria-pressed={mode === 'timeline'}
            >
              One timeline
            </button>
          </div>

          {mode === 'timeline' && (
            <span className="order-current" style={{ color: colorFor(activeTimeline) }}>
              following Timeline {activeTimeline} —{' '}
              {timelines.find((t) => t.id === activeTimeline)?.name}
              {' · '}
              {sequence.length}{' '}
              {sequence.length === 1 ? 'chapter' : 'chapters'} written,{' '}
              {sequenceWords.toLocaleString()} words
            </span>
          )}
        </div>

        <div className="reader-layout">
          {tocOpen && (
            <>
              <div
                className="toc-scrim"
                onClick={() => setTocOpen(false)}
                aria-hidden="true"
              />
              <TableOfContents
                index={index}
                mode={mode}
                activeTimeline={activeTimeline}
                onSelect={(i) => {
                  jumpTo(i)
                  setTocOpen(false)
                }}
                onClose={() => setTocOpen(false)}
              />
            </>
          )}

          <main className="reader-main">
            {/* Timeline strip: shows all three timelines at a glance and which
                one you are currently in. In single-timeline mode this is the
                timeline selector. */}
            <div className="timeline-strip">
              {timelines.map((t) => {
                const isActive = t.id === activeTimeline
                return (
                  <button
                    key={t.id}
                    className={`timeline-chip ${isActive ? 'active' : ''}`}
                    style={{ '--timeline-color': t.color }}
                    onClick={() => selectTimeline(t.id)}
                    title={
                      mode === 'timeline'
                        ? `Follow Timeline ${t.id} — ${t.name}`
                        : t.blurb
                    }
                    aria-pressed={mode === 'timeline' ? isActive : undefined}
                  >
                    <span
                      className="timeline-chip-dot"
                      style={{ background: t.color }}
                    />
                    <span className="timeline-chip-text">
                      <span className="timeline-chip-name">{t.name}</span>
                      <span className="timeline-chip-count">
                        {t.written} of {t.planned} written
                      </span>
                    </span>
                    {mode === 'timeline' && isActive && (
                      <span className="timeline-chip-flag">following</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* In-timeline chapter picker: every chapter of the current
                timeline, so switching within a timeline never needs the full
                contents panel. */}
            <div className="chapter-nav-wrap">
              <span
                className="chapter-nav-label"
                style={{ color: colorFor(chapter.timeline) }}
              >
                {chapter.timelineName} — chapters
              </span>
              <div
                className="chapter-nav"
                role="tablist"
                aria-label={`Chapters in Timeline ${chapter.timeline}, ${chapter.timelineName}`}
              >
                {chapters
                  .map((c, i) => ({ c, i }))
                  .filter(({ c }) => c.timeline === chapter.timeline)
                  .map(({ c, i }) => (
                    <button
                      key={c.id}
                      role="tab"
                      aria-selected={i === index}
                      className={`nav-pip ${i === index ? 'active' : ''}`}
                      style={{
                        borderColor: colorFor(c.timeline),
                        background:
                          i === index ? colorFor(c.timeline) : 'transparent',
                      }}
                      onClick={() => setIndex(i)}
                      title={`Chapter ${c.chapterNumber}: ${c.title}`}
                    >
                      {c.chapterNumber}
                    </button>
                  ))}
              </div>
            </div>

            <article className="chapter">
              <div
                className="timeline-tag"
                style={{ color: colorFor(chapter.timeline) }}
              >
                TIMELINE {chapter.timeline} —{' '}
                {chapter.timelineName.toUpperCase()}
              </div>
              <h1 className="chapter-title">
                Chapter {chapter.chapterNumber}: {chapter.title}
              </h1>
              <p className="chapter-setting">
                {chapter.setting} · {chapter.wordCount.toLocaleString()} words
              </p>

              <div className="chapter-content">
                {chapter.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </article>

            <div className="reader-controls">
              <button className="nav-button" onClick={goPrev} disabled={atStart}>
                ← Previous
              </button>
              <button className="nav-button toc-inline" onClick={() => setTocOpen(true)}>
                ☰ Contents
              </button>
              <button
                className="nav-button nav-button-primary"
                onClick={goNext}
                disabled={atEnd}
              >
                Next →
              </button>
            </div>

            {/* Next chapter preview, labelled with its timeline. */}
            {nextIndex !== undefined && (
              <div
                className="up-next"
                style={{
                  '--timeline-color': colorFor(chapters[nextIndex].timeline),
                }}
              >
                <span className="up-next-label">Next</span>
                <span className="up-next-body">
                  <span
                    className="up-next-timeline"
                    style={{ color: colorFor(chapters[nextIndex].timeline) }}
                  >
                    {mode === 'timeline'
                      ? `Still Timeline ${chapters[nextIndex].timeline}`
                      : `Timeline ${chapters[nextIndex].timeline}`}{' '}
                    — {chapters[nextIndex].timelineName}
                  </span>
                  <span className="up-next-title">
                    Chapter {chapters[nextIndex].chapterNumber}:{' '}
                    {chapters[nextIndex].title}
                  </span>
                </span>
                <button className="up-next-go" onClick={goNext}>
                  Read →
                </button>
              </div>
            )}

            {atEnd && mode === 'timeline' && (
              <div className="timeline-end">
                <p>
                  That is every written chapter of Timeline {activeTimeline} —{' '}
                  {timelines.find((t) => t.id === activeTimeline)?.name}.{' '}
                  <button
                    className="inline-link"
                    onClick={() => switchMode('interleaved')}
                  >
                    Read all three interleaved
                  </button>{' '}
                  or{' '}
                  <button
                    className="inline-link"
                    onClick={() => {
                      const next = timelines.find(
                        (t) => t.id !== activeTimeline
                      )
                      if (next) selectTimeline(next.id)
                    }}
                  >
                    switch timeline
                  </button>
                  .
                </p>
              </div>
            )}

            <div className="reader-footer">
              <p>
                <strong>
                  {totalChaptersPlanned - chapters.length} chapters still
                  forming.
                </strong>{' '}
                {mode === 'timeline' ? (
                  <>
                    You are following Timeline {activeTimeline} —{' '}
                    {sequence.length} of {plannedPerTimeline} chapters written,{' '}
                    {sequenceWords.toLocaleString()} words. The other two
                    timelines run alongside it.
                  </>
                ) : (
                  <>
                    The full novel is {totalChaptersPlanned} chapters across
                    three timelines — {plannedPerTimeline} each, appearing in
                    threes. Switch to <em>One timeline</em> to follow a single
                    thread straight through.
                  </>
                )}
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Signal puzzle                                                       */
/* ------------------------------------------------------------------ */

function App() {
  const [mode, setMode] = useState('signal')
  const [progress, setProgress] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [unlocked, setUnlocked] = useState(false)
  const [solved, setSolved] = useState(false)

  const checkSolution = (input) => {
    const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '')
    let score = 0

    const hasObject =
      normalized.includes('2034') || normalized.includes('prometheus')
    const hasProbability =
      normalized.includes('947') || normalized.includes('94')
    const hasTimeframe = normalized.includes('47')

    if (hasObject) score = 0.3
    if (hasProbability) score = Math.max(score, 0.6)
    if (hasObject && hasProbability && hasTimeframe) score = 1.0

    return score
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const score = checkSolution(userInput)
    setProgress((p) => Math.max(p, score))
    setAttempts((a) => a + 1)
    if (score >= 1.0) {
      setUnlocked(true)
      setSolved(true)
    }
  }

  if (mode === 'reader') {
    return <Reader onExit={() => setMode('signal')} />
  }

  if (unlocked) {
    return (
      <div className="app">
        <div className="unlocked">
          <h1>SIGNAL DECODED</h1>

          <div className="chapter preview">
            <div className="timeline-tag" style={{ color: colorFor(1) }}>
              TIMELINE 1 — THE RACE
            </div>
            <h2>Chapter 1: {chapters[0].title}</h2>
            <div className="chapter-content">
              {chapters[0].paragraphs.slice(0, 6).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="fade-out">…</p>
            </div>
          </div>

          <div className="share-section">
            <h3>You decoded the signal.</h3>
            <p>Share this moment:</p>
            <button
              className="share-button"
              onClick={() => {
                const url = `${window.location.origin}?solver=${Date.now()}`
                navigator.clipboard.writeText(url)
                alert('Link copied to clipboard!')
              }}
            >
              Copy Unique Solver Link
            </button>
          </div>

          <div className="decision-section">
            <h3>What next?</h3>
            <p>Read the story, or keep going deeper into the archive.</p>
            <div className="decision-buttons">
              <button
                className="nav-button nav-button-primary"
                onClick={() => setMode('reader')}
              >
                Read the story →
              </button>
              <button
                className="nav-button"
                onClick={() => {
                  setProgress(0)
                  setUserInput('')
                  setUnlocked(false)
                }}
              >
                Next transmission
              </button>
            </div>
          </div>

          <div className="about-novel">
            <h3>About The Shade</h3>
            <p>
              A science fiction novel told across three interwoven timelines,
              exploring humanity's adaptation to a world plunged into darkness.
            </p>
            <p>
              <strong>Status:</strong> {chapters.length} chapters written,{' '}
              {totalChaptersPlanned}-chapter blueprint complete.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="terminal">
        <div className="terminal-header">
          <span className="terminal-title">INCOMING TRANSMISSION</span>
          <span className="terminal-status">ENCRYPTED</span>
        </div>

        <div className="terminal-body">
          <div className="signal-content">
            <pre className="encrypted-text">
{`PRIORITY ALERT :: HELIOS ARRAY FACILITY
CLASSIFICATION: RESTRICTED

TRAJECTORY ANALYSIS :: OBJECT 2034-P
------------------------------------

DETECTION: OBSERVATORY-DIRECT
ENCRYPTION: LEVEL-9 CIPHER

FRAGMENT DATA RECEIVED:
[CORRUPTED] ... -Prometheus ... [CORRUPTED]
Impact probability: [REDACTED].7%
Time to collision: [CORRUPTED] months

DECRYPTION KEY REQUIRED

>>> Your input will help decode the transmission
>>> Progress aggregates globally
>>> Signal unlocks at 100%`}
            </pre>
          </div>

          <div className="progress-section">
            <div className="progress-label">
              DECRYPTION PROGRESS: {(progress * 100).toFixed(0)}%
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="attempts-counter">
              Attempts logged: {attempts + 847}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="input-section">
            <label htmlFor="decode-input">Enter decoded fragment:</label>
            <input
              id="decode-input"
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="What does the transmission say?"
              className="decode-input"
            />
            <button type="submit" className="submit-button">
              TRANSMIT
            </button>
          </form>

          <div className="hint-section">
            <p className="hint">
              Hint: the designation, the probability, the timeline — all three.
            </p>
          </div>
        </div>
      </div>

      <div className="info-panel">
        <h2>Signal Received</h2>
        <p>
          <em>The Shade</em> is a science fiction novel about humanity adapting
          after solar-capture technology malfunctions and encases the Earth in
          panels, leaving a single hole of sunlight.
        </p>
        <p>
          <strong>Decode the transmission to unlock the opening chapter.</strong>
        </p>

        {solved && (
          <p className="already-solved">
            You've already decoded this one.{' '}
            <button className="inline-link" onClick={() => setMode('reader')}>
              Read the story →
            </button>
          </p>
        )}

        {!solved && (
          <p className="reader-first">
            Just want to read?{' '}
            <button className="inline-link" onClick={() => setMode('reader')}>
              Open the chapter reader →
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default App
