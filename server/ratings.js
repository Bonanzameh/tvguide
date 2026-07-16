import fs from 'node:fs'
import path from 'node:path'

const TVMAZE_BASE = 'https://api.tvmaze.com'
const OMDB_BASE = 'https://www.omdbapi.com/'
const LOOKUP_VERSION = 4
const DB_VERSION = 1
const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_BATCH_SIZE = 12
const DEFAULT_DAILY_LIMIT = 900
const FAILED_RETRY_MS = 6 * 60 * 60 * 1000
const MISSING_RETRY_MS = 7 * 24 * 60 * 60 * 1000
const BLOCKED_RETRY_MS = 24 * 60 * 60 * 1000

let processingPromise = null

function normalizeKey(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function safeFilename(value) {
  return normalizeKey(value).replace(/\s+/g, '-').slice(0, 120) || 'unknown'
}

function classifyProgramme(programme) {
  if (programme?.media?.type === 'movie' || programme?.media?.type === 'series') return programme.media.type
  const category = normalizeKey([programme.category, programme.categoryDetail].filter(Boolean).join(' '))
  if (/\b(film|films|movie|movies|cinema|speelfilm|tv film)\b/.test(category)) return 'movie'
  if (/\b(serie|series|fiction)\b/.test(category)) return 'series'
  return null
}

function ratingColor(score) {
  if (typeof score !== 'number') return 'neutral'
  if (score < 5) return 'red'
  if (score < 6) return 'orange'
  if (score < 7) return 'yellow'
  if (score < 8) return 'light-green'
  if (score < 9) return 'dark-green'
  return 'pink'
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tempFile = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tempFile, JSON.stringify(value, null, 2))
  fs.renameSync(tempFile, file)
}

function yearFromDate(value) {
  const match = String(value || '').match(/^(\d{4})/)
  return match ? match[1] : ''
}

function programmeYear(programme) {
  return yearFromDate(programme.year)
}

function nowIso() {
  return new Date().toISOString()
}

function dailyDate() {
  return new Date().toISOString().slice(0, 10)
}

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function providerCacheDir(dataDir) {
  return path.join(dataDir, 'cache', 'ratings-v1')
}

function ratingDbPath(dataDir) {
  return path.join(dataDir, 'cache', 'rating-db.json')
}

function createRatingDb() {
  return {
    version: DB_VERSION,
    updatedAt: '',
    daily: { date: dailyDate(), used: 0 },
    entries: {}
  }
}

function readRatingDb(dataDir) {
  const db = readJson(ratingDbPath(dataDir), createRatingDb())
  if (!db || typeof db !== 'object') return createRatingDb()
  if (db.version !== DB_VERSION || !db.entries || typeof db.entries !== 'object') return createRatingDb()
  if (!db.daily || db.daily.date !== dailyDate()) {
    db.daily = { date: dailyDate(), used: 0 }
  }
  return db
}

function writeRatingDb(dataDir, db) {
  db.updatedAt = nowIso()
  writeJson(ratingDbPath(dataDir), db)
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'BelgianTVGuide/0.4' }
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

function createLookupBudget(maxLookups) {
  return {
    remaining: maxLookups,
    used: 0,
    denied: 0,
    take() {
      if (this.remaining <= 0) {
        this.denied += 1
        return false
      }
      this.remaining -= 1
      this.used += 1
      return true
    }
  }
}

function mediaGenre(programme, metadata) {
  return metadata?.genres?.[0] || programme.categoryDetail || programme.category || ''
}

function lookupProgramme(programme) {
  return {
    title: programme.title || '',
    subtitle: programme.subtitle || '',
    season: programme.season || '',
    episode: programme.episode || '',
    year: programme.year || '',
    category: programme.category || '',
    categoryDetail: programme.categoryDetail || ''
  }
}

function ratingLookupKey(programme, mediaType) {
  const base = [
    LOOKUP_VERSION,
    mediaType,
    normalizeKey(programme.title)
  ]
  if (mediaType === 'series') {
    base.push(programme.season || '', programme.episode || '', normalizeKey(programme.subtitle))
  } else {
    base.push(programmeYear(programme))
  }
  return base.join('|')
}

function retryDue(entry, currentTime) {
  if (!entry?.retryAt) return true
  return Date.parse(entry.retryAt) <= currentTime
}

function shouldQueueEntry(entry, currentTime) {
  if (!entry) return true
  if (entry.status === 'resolved' || entry.status === 'queued' || entry.status === 'processing') return false
  if (entry.status === 'missing' || entry.status === 'failed' || entry.status === 'blocked') return retryDue(entry, currentTime)
  return true
}

function enqueueLookup(db, key, programme, mediaType) {
  const currentTime = Date.now()
  const existing = db.entries[key]
  if (!shouldQueueEntry(existing, currentTime)) return false

  db.entries[key] = {
    ...(existing || {}),
    key,
    status: 'queued',
    mediaType,
    lookup: lookupProgramme(programme),
    attempts: existing?.attempts || 0,
    queuedAt: existing?.queuedAt || nowIso(),
    updatedAt: nowIso(),
    retryAt: ''
  }
  return true
}

function metadataFromEntry(entry) {
  if (entry?.status !== 'resolved' || !entry.metadata) return null
  return entry.metadata
}

function withProgrammeMedia(programme, mediaType, metadata = null) {
  const score = typeof metadata?.rating === 'number' ? metadata.rating : null
  return {
    ...programme,
    media: {
      type: mediaType,
      label: mediaType === 'movie' ? 'M' : 'S',
      rating: score,
      ratingSource: metadata?.ratingSource || '',
      ratingColor: ratingColor(score),
      externalTitle: metadata?.externalTitle || '',
      externalEpisode: metadata?.externalEpisode || '',
      year: metadata?.year || programme.year || '',
      genre: mediaGenre(programme, metadata)
    }
  }
}

async function resolveTvMazeSeries(programme, cacheDir, budget, options = {}) {
  const force = options.force === true
  const showKey = safeFilename(programme.title)
  const showFile = path.join(cacheDir, `tvmaze-show-${showKey}.json`)
  let show = force ? undefined : readJson(showFile, undefined)

  if (show === undefined) {
    if (!budget.take()) return null
    show = await fetchJson(`${TVMAZE_BASE}/singlesearch/shows?q=${encodeURIComponent(programme.title)}`, options)
      .catch(() => null)
    writeJson(showFile, show || null)
  }
  if (!show?.id) return null

  let episode = null
  if (programme.season && programme.episode) {
    const episodeFile = path.join(cacheDir, `tvmaze-episode-${show.id}-${programme.season}-${programme.episode}.json`)
    episode = force ? undefined : readJson(episodeFile, undefined)
    if (episode === undefined) {
      if (!budget.take()) return null
      episode = await fetchJson(`${TVMAZE_BASE}/shows/${show.id}/episodebynumber?season=${programme.season}&number=${programme.episode}`, options)
        .catch(() => null)
      writeJson(episodeFile, episode || null)
    }
  }

  if (!episode && programme.subtitle) {
    const episodesFile = path.join(cacheDir, `tvmaze-episodes-${show.id}.json`)
    let episodes = force ? undefined : readJson(episodesFile, undefined)
    if (episodes === undefined) {
      if (!budget.take()) return null
      episodes = await fetchJson(`${TVMAZE_BASE}/shows/${show.id}/episodes`, options)
        .catch(() => [])
      writeJson(episodesFile, Array.isArray(episodes) ? episodes : [])
    }
    const subtitle = normalizeKey(programme.subtitle)
    episode = (episodes || []).find(item => normalizeKey(item.name) === subtitle) || null
  }

  const score = episode?.rating?.average || null
  return {
    mediaType: 'series',
    rating: score,
    ratingSource: score ? 'TVmaze episode' : 'TVmaze',
    externalTitle: show.name || programme.title,
    externalEpisode: episode?.name || '',
    year: yearFromDate(show.premiered),
    genres: Array.isArray(show.genres) ? show.genres : []
  }
}

async function resolveOmdbMovie(programme, cacheDir, apiKey, budget, options = {}) {
  if (!apiKey) return null
  const force = options.force === true
  const year = programmeYear(programme)
  const movieKey = safeFilename(programme.title)
  const movieFile = path.join(cacheDir, `omdb-movie-${movieKey}-${year || 'unknown'}.json`)
  let data = force ? undefined : readJson(movieFile, undefined)
  if (data === undefined) {
    if (!budget.take()) return null
    const params = new URLSearchParams({
      apikey: apiKey,
      t: programme.title,
      type: 'movie'
    })
    if (year) params.set('y', year)
    const url = `${OMDB_BASE}?${params.toString()}`
    data = await fetchJson(url, options).catch(() => null)
    writeJson(movieFile, data || null)
  }
  if (!data || data.Response === 'False') return null
  const imdb = Number.parseFloat(data.imdbRating)
  return {
    mediaType: 'movie',
    rating: Number.isFinite(imdb) ? imdb : null,
    ratingSource: Number.isFinite(imdb) ? 'IMDb via OMDb' : 'OMDb',
    externalTitle: data.Title || programme.title,
    year: yearFromDate(data.Year),
    genres: data.Genre ? data.Genre.split(',').map(item => item.trim()).filter(Boolean) : []
  }
}

function dueEntries(db) {
  const currentTime = Date.now()
  return Object.values(db.entries)
    .filter(entry => {
      if (entry.status === 'queued') return retryDue(entry, currentTime)
      if (entry.status === 'processing') return true
      if (entry.status === 'failed' || entry.status === 'blocked' || entry.status === 'missing') {
        return retryDue(entry, currentTime)
      }
      return false
    })
    .sort((a, b) => String(a.updatedAt || a.queuedAt).localeCompare(String(b.updatedAt || b.queuedAt)))
}

function countStatuses(db) {
  const counts = {
    total: 0,
    queued: 0,
    resolved: 0,
    missing: 0,
    failed: 0,
    blocked: 0,
    processing: 0
  }
  for (const entry of Object.values(db.entries || {})) {
    counts.total += 1
    counts[entry.status] = (counts[entry.status] || 0) + 1
  }
  return counts
}

function setRetry(entry, delayMs) {
  entry.retryAt = new Date(Date.now() + delayMs).toISOString()
}

function ratingStatus(db, extra = {}) {
  return {
    version: db.version,
    updatedAt: db.updatedAt || '',
    daily: db.daily,
    counts: countStatuses(db),
    due: dueEntries(db).length,
    ...extra
  }
}

function emptyProcessSummary(extra = {}) {
  return {
    enabled: true,
    processed: 0,
    resolved: 0,
    missing: 0,
    failed: 0,
    blocked: 0,
    deferred: 0,
    limitReached: false,
    ...extra
  }
}

function forceQueuedEntry(db, key, programme, mediaType) {
  const existing = db.entries[key]
  db.entries[key] = {
    ...(existing || {}),
    key,
    status: 'queued',
    mediaType,
    lookup: lookupProgramme(programme),
    attempts: existing?.attempts || 0,
    queuedAt: existing?.queuedAt || nowIso(),
    updatedAt: nowIso(),
    retryAt: ''
  }
  return db.entries[key]
}

async function processRatingEntry(entry, db, cacheDir, budget, options, summary) {
  if (budget.remaining <= 0) {
    summary.limitReached = true
    return false
  }

  entry.status = 'processing'
  entry.attempts = (entry.attempts || 0) + 1
  entry.updatedAt = nowIso()

  try {
    if (entry.mediaType === 'movie' && !options.omdbApiKey) {
      entry.status = 'blocked'
      entry.error = 'OMDB_API_KEY is required for movie ratings'
      setRetry(entry, BLOCKED_RETRY_MS)
      summary.blocked += 1
      return true
    }

    const beforeUsed = budget.used
    const beforeDenied = budget.denied
    const metadata = entry.mediaType === 'series'
      ? await resolveTvMazeSeries(entry.lookup, cacheDir, budget, options.fetchOptions)
      : await resolveOmdbMovie(entry.lookup, cacheDir, options.omdbApiKey, budget, options.fetchOptions)

    db.daily.used += budget.used - beforeUsed
    if (budget.denied > beforeDenied) {
      entry.status = 'queued'
      setRetry(entry, 60 * 60 * 1000)
      summary.deferred += 1
      summary.limitReached = true
      return false
    }

    if (metadata) {
      entry.status = 'resolved'
      entry.metadata = metadata
      entry.error = ''
      entry.retryAt = ''
      summary.resolved += 1
    } else {
      entry.status = 'missing'
      entry.metadata = null
      entry.error = 'No rating match found'
      setRetry(entry, MISSING_RETRY_MS)
      summary.missing += 1
    }
  } catch (error) {
    entry.status = 'failed'
    entry.error = error.message
    setRetry(entry, FAILED_RETRY_MS)
    summary.failed += 1
  } finally {
    entry.updatedAt = nowIso()
    summary.processed += 1
  }

  return true
}

export async function enrichProgrammeMetadata(programmes, dataDir, options = {}) {
  const enabled = options.enabled !== false
  if (!enabled) {
    return programmes.map(programme => {
      const mediaType = classifyProgramme(programme)
      return mediaType ? withProgrammeMedia(programme, mediaType) : programme
    })
  }

  const db = readRatingDb(dataDir)
  let changed = false
  const output = programmes.map(programme => {
    const mediaType = classifyProgramme(programme)
    if (!mediaType) return programme

    const key = ratingLookupKey(programme, mediaType)
    if (enqueueLookup(db, key, programme, mediaType)) changed = true
    return withProgrammeMedia(programme, mediaType, metadataFromEntry(db.entries[key]))
  })

  if (changed) writeRatingDb(dataDir, db)
  return output
}

async function processRatingQueueNow(dataDir, options = {}) {
  const enabled = options.enabled !== false
  const db = readRatingDb(dataDir)
  if (!enabled) return ratingStatus(db, { enabled: false })

  const batchSize = Math.min(positiveNumber(options.batchSize, DEFAULT_BATCH_SIZE), 100)
  const dailyLimit = positiveNumber(options.dailyLimit, DEFAULT_DAILY_LIMIT)
  const remainingToday = Math.max(0, dailyLimit - (db.daily?.used || 0))
  if (remainingToday <= 0) {
    return ratingStatus(db, { enabled: true, processed: 0, limitReached: true })
  }

  const queue = dueEntries(db).slice(0, batchSize)
  if (!queue.length) return ratingStatus(db, { enabled: true, processed: 0, limitReached: false })

  const cacheDir = providerCacheDir(dataDir)
  fs.mkdirSync(cacheDir, { recursive: true })

  const fetchOptions = { timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS }
  const omdbApiKey = options.omdbApiKey || ''
  const budget = createLookupBudget(Math.min(remainingToday, positiveNumber(options.maxLookups, batchSize * 4)))
  const summary = emptyProcessSummary()

  for (const entry of queue) {
    const shouldContinue = await processRatingEntry(entry, db, cacheDir, budget, {
      omdbApiKey,
      fetchOptions
    }, summary)
    if (!shouldContinue || summary.limitReached) break
  }

  writeRatingDb(dataDir, db)
  return ratingStatus(db, summary)
}

export async function lookupProgrammeRating(programme, dataDir, options = {}) {
  const enabled = options.enabled !== false
  const db = readRatingDb(dataDir)
  const mediaType = classifyProgramme(programme)
  if (!enabled || !mediaType) {
    return {
      ok: false,
      status: enabled ? 'unsupported' : 'disabled',
      message: enabled ? 'Only movies and series can be rated.' : 'Rating lookups are disabled.',
      programme,
      ratingQueue: ratingStatus(db)
    }
  }

  const dailyLimit = positiveNumber(options.dailyLimit, DEFAULT_DAILY_LIMIT)
  const remainingToday = Math.max(0, dailyLimit - (db.daily?.used || 0))
  const key = ratingLookupKey(programme, mediaType)
  const entry = forceQueuedEntry(db, key, programme, mediaType)

  if (remainingToday <= 0) {
    entry.status = 'queued'
    entry.error = 'Daily rating lookup limit reached'
    setRetry(entry, 24 * 60 * 60 * 1000)
    writeRatingDb(dataDir, db)
    return {
      ok: false,
      status: 'queued',
      message: entry.error,
      programme: withProgrammeMedia(programme, mediaType, metadataFromEntry(entry)),
      ratingQueue: ratingStatus(db, { limitReached: true })
    }
  }

  const cacheDir = providerCacheDir(dataDir)
  fs.mkdirSync(cacheDir, { recursive: true })
  const budget = createLookupBudget(Math.min(remainingToday, positiveNumber(options.maxLookups, 8)))
  const summary = emptyProcessSummary({ targeted: true })
  await processRatingEntry(entry, db, cacheDir, budget, {
    omdbApiKey: options.omdbApiKey || '',
    fetchOptions: {
      timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      force: options.force === true
    }
  }, summary)

  writeRatingDb(dataDir, db)
  return {
    ok: entry.status === 'resolved',
    status: entry.status,
    message: entry.error || (entry.status === 'resolved' ? 'Rating saved.' : 'No rating saved.'),
    programme: withProgrammeMedia(programme, mediaType, metadataFromEntry(entry)),
    ratingQueue: ratingStatus(db, summary)
  }
}

export async function processRatingQueue(dataDir, options = {}) {
  if (processingPromise) return processingPromise
  processingPromise = processRatingQueueNow(dataDir, options).finally(() => {
    processingPromise = null
  })
  return processingPromise
}

export function getRatingQueueStatus(dataDir) {
  return ratingStatus(readRatingDb(dataDir))
}

export function startRatingWorker(dataDir, options = {}) {
  if (options.enabled === false) return () => {}

  const intervalMs = Math.max(5000, positiveNumber(options.intervalMs, 60 * 1000))
  const run = () => {
    processRatingQueue(dataDir, options).catch(error => console.error('Rating worker failed', error))
  }

  const initialDelayMs = positiveNumber(options.initialDelayMs, 5000)
  const initialTimer = setTimeout(run, initialDelayMs)
  const interval = setInterval(run, intervalMs)

  return () => {
    clearTimeout(initialTimer)
    clearInterval(interval)
  }
}
