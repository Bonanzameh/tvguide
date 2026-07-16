import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, BookmarkCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, Menu, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { detailMeta, scoreMeta } from './detailMeta.js'
import './styles.css'

const HOUR_WIDTH = 240
const CHANNEL_WIDTH = 230
const ROW_HEIGHT = 74
const PLAN_HOUR_WIDTH = 190
const PLAN_CHANNEL_WIDTH = 180
const PLAN_MAX_VISIBLE_HOURS = 3
const WATCHLIST_STORAGE_KEY = 'belgian-tv-guide-watchlist-v1'

function dateKey(date) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 10)
}

function formatTime(value) {
  return new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDay(value) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function programmeKey(programme) {
  if (!programme) return ''
  return [programme.channelId, programme.start, programme.stop, programme.title].join('|')
}

function programmeDate(programme) {
  return programme?.start ? dateKey(new Date(programme.start)) : ''
}

function readWatchlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch {
    return {}
  }
}

function App() {
  const [date, setDate] = useState(dateKey(new Date()))
  const [guide, setGuide] = useState(null)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [programmeModalOpen, setProgrammeModalOpen] = useState(false)
  const [watchlist, setWatchlist] = useState(readWatchlist)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const headerRef = useRef(null)
  const gridRef = useRef(null)
  const channelListRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/guide?date=${date}`)
      .then(res => {
        if (!res.ok) throw new Error('Could not load guide')
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        setGuide(data)
        setSelected(data.programmes.find(programme => isNow(programme)) || data.programmes[0] || null)
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [date])

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    setLookupMessage('')
  }, [selected?.id])

  const groups = useMemo(() => ['All', ...new Set((guide?.channels || []).map(channel => channel.group).filter(Boolean))], [guide])
  const filteredChannels = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (guide?.channels || []).filter(channel => {
      const matchesGroup = group === 'All' || channel.group === group
      const matchesTerm = !term || channel.name.toLowerCase().includes(term)
      return matchesGroup && matchesTerm
    })
  }, [guide, group, query])

  const programmesByChannel = useMemo(() => {
    const map = new Map()
    for (const programme of guide?.programmes || []) {
      if (!map.has(programme.channelId)) map.set(programme.channelId, [])
      map.get(programme.channelId).push(programme)
    }
    return map
  }, [guide])

  const channelById = useMemo(() => {
    const map = new Map()
    for (const channel of guide?.channels || []) map.set(channel.id, channel)
    return map
  }, [guide])

  const programmeByKey = useMemo(() => {
    const map = new Map()
    for (const programme of guide?.programmes || []) map.set(programmeKey(programme), programme)
    return map
  }, [guide])

  const dailyWatchlist = useMemo(() => (
    Object.values(watchlist)
      .filter(entry => entry.date === date)
      .map(entry => ({
        ...entry,
        programme: programmeByKey.get(entry.key) || entry.programme,
        channel: channelById.get((programmeByKey.get(entry.key) || entry.programme).channelId)
      }))
      .sort((a, b) => a.programme.start.localeCompare(b.programme.start))
  ), [channelById, date, programmeByKey, watchlist])

  const dayStart = new Date(`${date}T00:00:00`)
  const nowOffset = Math.max(0, Math.min(24 * HOUR_WIDTH, ((Date.now() - dayStart.getTime()) / 3600000) * HOUR_WIDTH))

  function moveDate(delta) {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + delta)
    setDate(dateKey(next))
  }

  async function refresh() {
    setLoading(true)
    await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date })
    })
    const data = await fetch(`/api/guide?date=${date}`).then(res => res.json())
    setGuide(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!gridRef.current) return
    const currentHour = new Date().getHours()
    gridRef.current.scrollLeft = Math.max(0, currentHour * HOUR_WIDTH - 280)
    if (headerRef.current) headerRef.current.scrollLeft = gridRef.current.scrollLeft
  }, [date, loading])

  function syncScroll(event) {
    if (headerRef.current) headerRef.current.scrollLeft = event.currentTarget.scrollLeft
    if (channelListRef.current) channelListRef.current.scrollTop = event.currentTarget.scrollTop
  }

  function scrollGridFromChannels(event) {
    if (!gridRef.current) return
    gridRef.current.scrollTop += event.deltaY
    gridRef.current.scrollLeft += event.deltaX
  }

  function chooseGroup(item) {
    setGroup(item)
    setGroupMenuOpen(false)
  }

  function toggleSelectedWatch() {
    if (!selected) return
    const key = programmeKey(selected)
    setWatchlist(current => {
      const next = { ...current }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = {
          key,
          date: programmeDate(selected),
          programme: selected
        }
      }
      return next
    })
  }

  function removeWatchEntry(key) {
    setWatchlist(current => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function selectWatchEntry(entry) {
    setSelected(entry.programme)
    setGroupMenuOpen(false)
    setProgrammeModalOpen(false)
  }

  function openProgrammeModal() {
    setGroupMenuOpen(false)
    setProgrammeModalOpen(true)
  }

  function updateProgramme(updatedProgramme) {
    const key = programmeKey(updatedProgramme)
    setSelected(updatedProgramme)
    setGuide(current => {
      if (!current) return current
      return {
        ...current,
        programmes: current.programmes.map(programme => (
          programmeKey(programme) === key ? updatedProgramme : programme
        ))
      }
    })
    setWatchlist(current => {
      if (!current[key]) return current
      return {
        ...current,
        [key]: {
          ...current[key],
          programme: updatedProgramme
        }
      }
    })
  }

  async function lookupSelectedScore() {
    if (!selected || lookupLoading) return
    setLookupLoading(true)
    setLookupMessage('')
    try {
      const response = await fetch('/api/ratings/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ programme: selected })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not look up rating')
      if (data.programme) updateProgramme(data.programme)
      const rating = data.programme?.media?.rating
      setLookupMessage(typeof rating === 'number' ? `Saved ${rating}/10.` : data.message || 'No score found.')
    } catch (err) {
      setLookupMessage(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  const selectedScore = scoreMeta(selected)
  const selectedMeta = detailMeta(selected)
  const primaryMeta = selectedMeta.filter(item => item.group !== 'category')
  const categoryMeta = selectedMeta.filter(item => item.group === 'category')
  const selectedWatchKey = programmeKey(selected)
  const selectedIsTagged = Boolean(selectedWatchKey && watchlist[selectedWatchKey])
  const selectedCanLookup = Boolean(selected?.media?.type)

  return (
    <main className="shell">
      <header className="topbar">
        <div className="title-block">
          <p className="eyebrow">Orange TV Go lineup workspace</p>
          <h1>Belgian TV Guide</h1>
          <div className="title-controls">
            <label className="search">
              <Search size={17} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search channel" />
            </label>
            <div className="control-row">
              <button className="icon-button" onClick={() => moveDate(-1)} aria-label="Previous day"><ChevronLeft size={18} /></button>
              <button className="date-button"><CalendarDays size={17} />{formatDay(date)}</button>
              <button className="icon-button" onClick={() => moveDate(1)} aria-label="Next day"><ChevronRight size={18} /></button>
              <button className="icon-button" onClick={refresh} aria-label="Refresh guide"><RefreshCw size={18} /></button>
              <div className="group-menu">
                <button
                  className={`icon-button ${groupMenuOpen ? 'active' : ''}`}
                  onClick={() => setGroupMenuOpen(open => !open)}
                  aria-label="Choose channel group"
                  aria-expanded={groupMenuOpen}
                >
                  <Menu size={18} />
                </button>
                {groupMenuOpen ? (
                  <div className="group-panel">
                    <button className="programme-menu-toggle" onClick={openProgrammeModal}>
                      My programme <span>{dailyWatchlist.length}</span>
                    </button>
                    <div className="menu-divider" />
                    {groups.map(item => (
                      <button key={item} className={item === group ? 'active' : ''} onClick={() => chooseGroup(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <section className="selected-strip" aria-live="polite">
          {selected ? (
            <>
              <div className="detail-rail">
                <div className="detail-time"><Clock size={16} />{formatTime(selected.start)} - {formatTime(selected.stop)}</div>
                <div className="meta">
                  <div className="meta-row">
                    {primaryMeta.map(item => <span key={item.label}>{item.label}</span>)}
                  </div>
                  {categoryMeta.length ? (
                    <div className="meta-row category-row">
                      {categoryMeta.map(item => <span key={item.label}>{item.label}</span>)}
                    </div>
                  ) : null}
                </div>
                <button className={`watch-toggle ${selectedIsTagged ? 'active' : ''}`} onClick={toggleSelectedWatch}>
                  {selectedIsTagged ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  {selectedIsTagged ? 'In my programme' : 'Add to my programme'}
                </button>
                {selectedCanLookup ? (
                  <button className="lookup-toggle" onClick={lookupSelectedScore} disabled={lookupLoading}>
                    <Search size={16} />
                    {lookupLoading ? 'Looking up...' : 'Lookup score'}
                  </button>
                ) : null}
              </div>
              <div className="selected-copy">
                <h2>{selected.title}</h2>
                {selected.subtitle ? <p className="subtitle">{selected.subtitle}</p> : null}
                <p>{selected.desc || 'No description available from this source.'}</p>
                {lookupMessage ? <p className="lookup-message">{lookupMessage}</p> : null}
                {selectedScore ? (
                  <span className={selectedScore.className}>{selectedScore.label}</span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="empty-detail">Select a programme slot to see details.</p>
          )}
        </section>
      </header>

      {error && <div className="notice danger">{error}</div>}
      {guide?.errors?.length ? (
        <div className={guide?.stats?.programmes ? 'notice' : 'notice danger'}>
          {guide?.stats?.programmes
            ? 'Some guide sources failed; available real sources are still shown.'
            : 'No programme data loaded. Check the configured guide source network access.'}
          <span>{guide.errors.map(item => `${item.source}: ${item.message}`).join(' | ')}</span>
        </div>
      ) : null}

      <section className="workspace">
        <div className="guide" style={{ gridTemplateColumns: `${CHANNEL_WIDTH}px minmax(0, 1fr)` }}>
          <div className="channel-header">Channels</div>
          <div className="timeline-header" ref={headerRef}>
            <div className="hours" style={{ width: 24 * HOUR_WIDTH }}>
              {Array.from({ length: 24 }, (_, hour) => <div key={hour} className="hour" style={{ width: HOUR_WIDTH }}>{String(hour).padStart(2, '0')}:00</div>)}
            </div>
          </div>

          <div className="channel-list" ref={channelListRef} onWheel={scrollGridFromChannels}>
            {filteredChannels.map(channel => (
              <div className="channel-cell" key={channel.id} style={{ height: ROW_HEIGHT }}>
                {channel.icon || channel.logo ? <img src={channel.icon || channel.logo} alt="" /> : <div className="logo-fallback">{channel.name.slice(0, 2)}</div>}
                <div>
                  {channel.number ? <span className="channel-number">{channel.number}</span> : null}
                  <strong>{channel.name}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="program-grid" ref={gridRef} onScroll={syncScroll}>
            <div className="grid-inner" style={{ width: 24 * HOUR_WIDTH, height: filteredChannels.length * ROW_HEIGHT }}>
              {date === dateKey(new Date()) ? <div className="now-line" style={{ left: nowOffset }} /> : null}
              {filteredChannels.map((channel, rowIndex) => (
                <div className="row-line" key={channel.id} style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}>
                  {(programmesByChannel.get(channel.id) || []).length ? (
                    (programmesByChannel.get(channel.id) || []).map(programme => (
                      <ProgrammeSlot
                        key={programme.id}
                        programme={programme}
                        dayStart={dayStart}
                        selected={selected?.id === programme.id}
                        onClick={() => setSelected(programme)}
                      />
                    ))
                  ) : (
                    <div className="empty-slot">No programme data from configured sources</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading ? <div className="loading">Loading guide...</div> : null}
      {programmeModalOpen ? (
        <ProgrammePlanModal
          date={date}
          entries={dailyWatchlist}
          onClose={() => setProgrammeModalOpen(false)}
          onRemove={removeWatchEntry}
          onSelect={selectWatchEntry}
        />
      ) : null}
    </main>
  )
}

function isNow(programme) {
  const now = Date.now()
  return new Date(programme.start).getTime() <= now && now < new Date(programme.stop).getTime()
}

function ProgrammeSlot({ programme, dayStart, selected, onClick }) {
  const start = new Date(programme.start)
  const stop = new Date(programme.stop)
  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000
  const visibleStart = Math.max(start.getTime(), dayStartMs)
  const visibleStop = Math.min(stop.getTime(), dayEndMs)
  const left = Math.max(0, ((visibleStart - dayStartMs) / 3600000) * HOUR_WIDTH)
  const durationWidth = Math.max(0, ((visibleStop - visibleStart) / 3600000) * HOUR_WIDTH)
  const width = Math.max(2, durationWidth - 4)
  const compact = width < 44
  return (
    <button className={`slot ${selected ? 'selected' : ''} ${isNow(programme) ? 'now' : ''} ${compact ? 'compact' : ''}`} style={{ left, width }} onClick={onClick}>
      {programme.media?.type ? (
        <span
          className={`media-badge rating-${programme.media.ratingColor || 'neutral'}`}
          title={`${programme.media.type === 'movie' ? 'Movie' : 'Series'}${programme.media.rating ? ` - ${programme.media.rating}/10` : ''}`}
        >
          {programme.media.label}
        </span>
      ) : null}
      <strong>{programme.title}</strong>
      <span>{formatTime(programme.start)} - {formatTime(programme.stop)}</span>
      {(programme.media?.genre || programme.categoryDetail || programme.category) ? (
        <em>{programme.media?.genre || programme.categoryDetail || programme.category}</em>
      ) : null}
    </button>
  )
}

function ProgrammePlanModal({ date, entries, onClose, onRemove, onSelect }) {
  const planWindow = createPlanWindow(entries)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="programme-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="programme-plan-title"
        style={{
          '--plan-channel-width': `${PLAN_CHANNEL_WIDTH}px`,
          '--plan-time-width': `${planWindow.timeWidth}px`,
          '--plan-visible-time-width': `${planWindow.visibleTimeWidth}px`
        }}
        onClick={event => event.stopPropagation()}
      >
        <header className="programme-modal-header">
          <div>
            <p className="eyebrow">My programme</p>
            <h2 id="programme-plan-title">{formatDay(date)}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close my programme"><X size={18} /></button>
        </header>

        {entries.length ? (
          <div className="plan-scroll">
            <div className="plan-grid">
              <div className="plan-channel-head">Channel</div>
              <div className="plan-time-head">
                {planWindow.ticks.map(tick => (
                  <span key={tick.value} style={{ left: `${tick.left}%` }}>{tick.label}</span>
                ))}
              </div>
              {entries.map(entry => (
                <React.Fragment key={entry.key}>
                  <button className="plan-channel" onClick={() => onSelect(entry)}>
                    <span>{entry.channel?.number || '-'}</span>
                    <strong>{entry.channel?.name || entry.programme.channelId}</strong>
                  </button>
                  <div className="plan-track">
                    <button className="plan-bar" style={planBarStyle(entry.programme, planWindow)} onClick={() => onSelect(entry)}>
                      <strong>{entry.programme.title}</strong>
                      <span>{formatTime(entry.programme.start)} - {formatTime(entry.programme.stop)}</span>
                    </button>
                    <button className="plan-remove" onClick={() => onRemove(entry.key)} aria-label={`Remove ${entry.programme.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <p className="empty-plan">No tagged shows for this day.</p>
        )}
      </section>
    </div>
  )
}

function createPlanWindow(entries) {
  if (!entries.length) {
    return {
      startMs: 0,
      endMs: 60 * 60 * 1000,
      timeWidth: PLAN_HOUR_WIDTH,
      visibleTimeWidth: PLAN_HOUR_WIDTH,
      ticks: []
    }
  }

  const starts = entries.map(entry => new Date(entry.programme.start).getTime())
  const stops = entries.map(entry => new Date(entry.programme.stop).getTime())
  const startMs = Math.min(...starts)
  const naturalEndMs = Math.max(...stops)
  const minimumEndMs = startMs + 60 * 60 * 1000
  const endMs = Math.max(naturalEndMs, minimumEndMs)
  const spanHours = (endMs - startMs) / 3600000
  const visibleHours = Math.min(spanHours, PLAN_MAX_VISIBLE_HOURS)

  return {
    startMs,
    endMs,
    timeWidth: Math.ceil(spanHours * PLAN_HOUR_WIDTH),
    visibleTimeWidth: Math.ceil(visibleHours * PLAN_HOUR_WIDTH),
    ticks: planTicks(startMs, endMs)
  }
}

function planTicks(startMs, endMs) {
  const spanMs = endMs - startMs
  const intervalMs = spanMs <= 90 * 60 * 1000 ? 30 * 60 * 1000 : 60 * 60 * 1000
  const ticks = [
    { value: startMs, left: 0, label: formatTime(startMs) }
  ]
  let cursor = Math.ceil(startMs / intervalMs) * intervalMs
  while (cursor < endMs) {
    if (cursor > startMs + 5 * 60 * 1000) {
      ticks.push({
        value: cursor,
        left: ((cursor - startMs) / spanMs) * 100,
        label: formatTime(cursor)
      })
    }
    cursor += intervalMs
  }
  if (endMs - ticks[ticks.length - 1].value > 10 * 60 * 1000) {
    ticks.push({ value: endMs, left: 100, label: formatTime(endMs) })
  }
  return ticks
}

function planBarStyle(programme, planWindow) {
  const start = new Date(programme.start)
  const stop = new Date(programme.stop)
  const visibleStart = Math.max(start.getTime(), planWindow.startMs)
  const visibleStop = Math.min(stop.getTime(), planWindow.endMs)
  const spanMs = planWindow.endMs - planWindow.startMs
  const left = ((visibleStart - planWindow.startMs) / spanMs) * 100
  const width = Math.max(2, ((visibleStop - visibleStart) / spanMs) * 100)
  return {
    left: `${left}%`,
    width: `${width}%`
  }
}

createRoot(document.getElementById('root')).render(<App />)
