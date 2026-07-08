import fs from 'node:fs'
import path from 'node:path'

const TVMAZE_BASE = 'https://api.tvmaze.com'
const OMDB_BASE = 'https://www.omdbapi.com/'
const CACHE_VERSION = 1

function normalizeKey(value = '') {
  return value
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
  const category = normalizeKey(programme.category)
  if (/\b(film|films|movie|movies|cinema)\b/.test(category)) return 'movie'
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
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'BelgianTVGuide/0.3' } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

function createLookupBudget(maxLookups) {
  return {
    remaining: maxLookups,
    take() {
      if (this.remaining <= 0) return false
      this.remaining -= 1
      return true
    }
  }
}

async function resolveTvMazeSeries(programme, cacheDir, budget) {
  const showKey = safeFilename(programme.title)
  const showFile = path.join(cacheDir, `tvmaze-show-${showKey}.json`)
  let show = readJson(showFile, undefined)

  if (show === undefined) {
    if (!budget.take()) return null
    show = await fetchJson(`${TVMAZE_BASE}/singlesearch/shows?q=${encodeURIComponent(programme.title)}`)
      .catch(() => null)
    writeJson(showFile, show || null)
  }
  if (!show?.id) return null

  let episode = null
  if (programme.season && programme.episode) {
    const episodeFile = path.join(cacheDir, `tvmaze-episode-${show.id}-${programme.season}-${programme.episode}.json`)
    episode = readJson(episodeFile, undefined)
    if (episode === undefined) {
      if (!budget.take()) return null
      episode = await fetchJson(`${TVMAZE_BASE}/shows/${show.id}/episodebynumber?season=${programme.season}&number=${programme.episode}`)
        .catch(() => null)
      writeJson(episodeFile, episode || null)
    }
  }

  if (!episode && programme.subtitle) {
    const episodesFile = path.join(cacheDir, `tvmaze-episodes-${show.id}.json`)
    let episodes = readJson(episodesFile, undefined)
    if (episodes === undefined) {
      if (!budget.take()) return null
      episodes = await fetchJson(`${TVMAZE_BASE}/shows/${show.id}/episodes`)
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
    genres: Array.isArray(show.genres) ? show.genres : []
  }
}

async function resolveOmdbMovie(programme, cacheDir, apiKey, budget) {
  if (!apiKey) return null
  const movieKey = safeFilename(programme.title)
  const movieFile = path.join(cacheDir, `omdb-movie-${movieKey}.json`)
  let data = readJson(movieFile, undefined)
  if (data === undefined) {
    if (!budget.take()) return null
    const url = `${OMDB_BASE}?apikey=${encodeURIComponent(apiKey)}&t=${encodeURIComponent(programme.title)}&type=movie`
    data = await fetchJson(url).catch(() => null)
    writeJson(movieFile, data || null)
  }
  if (!data || data.Response === 'False') return null
  const imdb = Number.parseFloat(data.imdbRating)
  return {
    mediaType: 'movie',
    rating: Number.isFinite(imdb) ? imdb : null,
    ratingSource: Number.isFinite(imdb) ? 'IMDb via OMDb' : 'OMDb',
    externalTitle: data.Title || programme.title,
    genres: data.Genre ? data.Genre.split(',').map(item => item.trim()).filter(Boolean) : []
  }
}

function mediaGenre(programme, metadata) {
  return metadata?.genres?.[0] || programme.categoryDetail || programme.category || ''
}

export async function enrichProgrammeMetadata(programmes, dataDir, options = {}) {
  const enabled = options.enabled !== false
  if (!enabled) {
    return programmes.map(programme => {
      const mediaType = classifyProgramme(programme)
      return mediaType ? {
        ...programme,
        media: {
          type: mediaType,
          label: mediaType === 'movie' ? 'M' : 'S',
          genre: mediaGenre(programme)
        }
      } : programme
    })
  }

  const cacheDir = path.join(dataDir, 'cache', 'ratings-v1')
  fs.mkdirSync(cacheDir, { recursive: true })
  const budget = createLookupBudget(options.maxLookups || 80)
  const omdbApiKey = options.omdbApiKey || ''
  const metadataCache = new Map()

  const output = []
  for (const programme of programmes) {
    const mediaType = classifyProgramme(programme)
    if (!mediaType) {
      output.push(programme)
      continue
    }

    const metadataKey = [
      CACHE_VERSION,
      mediaType,
      normalizeKey(programme.title),
      normalizeKey(programme.subtitle),
      programme.season || '',
      programme.episode || ''
    ].join('|')

    let metadata = metadataCache.get(metadataKey)
    if (metadata === undefined) {
      metadata = mediaType === 'series'
        ? await resolveTvMazeSeries(programme, cacheDir, budget)
        : await resolveOmdbMovie(programme, cacheDir, omdbApiKey, budget)
      metadataCache.set(metadataKey, metadata || null)
    }

    const score = metadata?.rating || null
    output.push({
      ...programme,
      media: {
        type: mediaType,
        label: mediaType === 'movie' ? 'M' : 'S',
        rating: score,
        ratingSource: metadata?.ratingSource || '',
        ratingColor: ratingColor(score),
        externalTitle: metadata?.externalTitle || '',
        externalEpisode: metadata?.externalEpisode || '',
        genre: mediaGenre(programme, metadata)
      }
    })
  }

  return output
}
