import { useState } from 'react'
import { chapters, totalChaptersPlanned } from './chapters'
import './App.css'

const TIMELINE_COLORS = {
  1: '#ff6b4a',
  2: '#4a9eff',
  3: '#ffd24a',
}

function Reader({ onExit }) {
  const [index, setIndex] = useState(0)
  const chapter = chapters[index]

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(chapters.length - 1, i + 1))

  return (
    <div className="app">
      <div className="reader">
        <div className="reader-topbar">
          <button className="back-button" onClick={onExit}>
            ← Signal
          </button>
          <div className="reader-progress-text">
            {index + 1} / {chapters.length} written
          </div>
        </div>

        <div className="chapter-nav">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              className={`nav-pip ${i === index ? 'active' : ''}`}
              style={{
                borderColor: TIMELINE_COLORS[c.timeline],
                background: i === index ? TIMELINE_COLORS[c.timeline] : 'transparent',
              }}
              onClick={() => setIndex(i)}
              title={`${c.timelineName} — ${c.title}`}
            >
              {c.timeline}.{c.chapterNumber}
            </button>
          ))}
        </div>

        <article className="chapter">
          <div
            className="timeline-tag"
            style={{ color: TIMELINE_COLORS[chapter.timeline] }}
          >
            TIMELINE {chapter.timeline} — {chapter.timelineName.toUpperCase()}
          </div>
          <h2>
            Chapter {chapter.chapterNumber}: {chapter.title}
          </h2>
          <p className="chapter-setting">{chapter.setting}</p>

          <div className="chapter-content">
            {chapter.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>

        <div className="reader-controls">
          <button
            className="nav-button"
            onClick={goPrev}
            disabled={index === 0}
          >
            ← Previous
          </button>
          <button
            className="nav-button nav-button-primary"
            onClick={goNext}
            disabled={index === chapters.length - 1}
          >
            Next →
          </button>
        </div>

        <div className="reader-footer">
          <p>
            <strong>{totalChaptersPlanned - chapters.length} chapters
            still forming.</strong> The full novel is 60 chapters across three
            timelines — 20 each, appearing in threes.
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState('signal') // 'signal' | 'reader'
  const [progress, setProgress] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [unlocked, setUnlocked] = useState(false)
  const [solved, setSolved] = useState(false)

  const checkSolution = (input) => {
    const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '')

    let score = 0

    if (normalized.includes('2034') || normalized.includes('prometheus')) {
      score = 0.3
    }

    if (normalized.includes('947') || normalized.includes('94')) {
      score = Math.max(score, 0.6)
    }

    if (
      (normalized.includes('2034') || normalized.includes('prometheus')) &&
      (normalized.includes('947') || normalized.includes('94')) &&
      (normalized.includes('47months') || normalized.includes('47'))
    ) {
      score = 1.0
    }

    return score
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const score = checkSolution(userInput)
    setProgress(Math.max(progress, score))
    setAttempts(attempts + 1)

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
            <div className="timeline-tag" style={{ color: TIMELINE_COLORS[1] }}>
              TIMELINE 1 — THE RACE
            </div>
            <h2>Chapter 1: The Signal</h2>
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
