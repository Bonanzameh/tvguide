import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { defaultChannels } from './channels.js'
import { createSampleGuide } from './sampleGuide.js'
import { enrichChannelLogos } from './logos.js'
import { fetchPickxGuide } from './pickx.js'
import { enrichProgrammeMetadata } from './ratings.js'
import { ensureDataDir, parseXmltvSources } from './xmltv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 3000)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const timezone = process.env.EPG_TIMEZONE || 'Europe/Brussels'
const defaultXmltvUrl = 'https://epg.pw/xmltv/epg.xml.gz'
const xmltvSetting = process.env.EPG_XMLTV_URLS
const pickxEnabled = process.env.EPG_PICKX_ENABLED !== 'false'
const sampleFallbackEnabled = process.env.EPG_SAMPLE_FALLBACK === 'true'
const ratingsEnabled = process.env.EPG_RATINGS_ENABLED !== 'false'
const omdbApiKey = process.env.OMDB_API_KEY || ''

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const fetchTimeoutMs = positiveNumber(process.env.EPG_FETCH_TIMEOUT_MS, 12000)
const ratingsMaxLookups = positiveNumber(process.env.EPG_RATINGS_MAX_LOOKUPS, 80)

function parseXmltvUrls(setting) {
  if (!setting || !setting.trim()) return []
  return setting
    .split(',')
    .map(url => url.trim())
    .filter(Boolean)
    .flatMap(url => {
      const normalized = url.toLowerCase()
      if (['none', 'false', 'off'].includes(normalized)) return []
      if (['default', 'epg.pw', 'epgpw'].includes(normalized)) return [defaultXmltvUrl]
      return [url]
    })
}

const xmltvUrls = parseXmltvUrls(xmltvSetting)
const sourceKey = JSON.stringify({
  pickxEnabled,
  xmltvUrls,
  sampleFallbackEnabled,
  ratingsEnabled,
  ratingsMaxLookups,
  fetchTimeoutMs,
  omdb: Boolean(omdbApiKey),
  version: 9
})

ensureDataDir(dataDir)

app.use(cors())
app.use(compression())
app.use(express.json())

function todayInBrussels() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}

function loadChannels() {
  const customPath = path.join(dataDir, 'channels.json')
  if (!fs.existsSync(customPath)) return defaultChannels
  const custom = JSON.parse(fs.readFileSync(customPath, 'utf8'))
  return Array.isArray(custom) && custom.length ? custom : defaultChannels
}

function cachePath(dateText) {
  return path.join(dataDir, 'cache', `${dateText}.json`)
}

function programmeKey(programme) {
  return `${programme.channelId}-${programme.start}-${programme.stop}`
}

function overlapsExistingProgramme(programmes, candidate) {
  const candidateStart = new Date(candidate.start).getTime()
  const candidateStop = new Date(candidate.stop).getTime()
  return [...programmes.values()].some(programme => {
    if (programme.channelId !== candidate.channelId) return false
    const start = new Date(programme.start).getTime()
    const stop = new Date(programme.stop).getTime()
    return Math.min(stop, candidateStop) - Math.max(start, candidateStart) > 60 * 1000
  })
}

async function loadGuide(dateText, force = false) {
  const channels = await enrichChannelLogos(loadChannels(), dataDir)
  const target = cachePath(dateText)
  if (!force && fs.existsSync(target)) {
    const cached = JSON.parse(fs.readFileSync(target, 'utf8'))
    if (cached.sourceKey === sourceKey) return cached
  }

  const errors = []
  let guideChannels = channels
  const programmes = new Map()

  if (pickxEnabled) {
    try {
      const pickx = await fetchPickxGuide(guideChannels, dateText, { timeoutMs: fetchTimeoutMs })
      guideChannels = pickx.channels
      for (const programme of pickx.programmes) {
        programmes.set(programmeKey(programme), programme)
      }
    } catch (error) {
      errors.push({ source: 'Pickx', message: error.message })
    }
  }

  if (xmltvUrls.length) {
    const parsed = await parseXmltvSources(xmltvUrls, guideChannels, dateText, { timeoutMs: fetchTimeoutMs })
    guideChannels = parsed.channels
    for (const programme of parsed.programmes) {
      const key = programmeKey(programme)
      if (!programmes.has(key) && !overlapsExistingProgramme(programmes, programme)) {
        programmes.set(key, programme)
      }
    }
    errors.push(...parsed.errors.map(error => ({ source: 'XMLTV', ...error })))
  }

  const programmeList = [...programmes.values()].sort((a, b) => a.start.localeCompare(b.start))
  let source = [
    pickxEnabled ? 'Pickx' : '',
    xmltvUrls.length ? 'XMLTV' : ''
  ].filter(Boolean).join(' + ')

  let finalProgrammes = programmeList
  if (!finalProgrammes.length && sampleFallbackEnabled) {
    source = 'Sample Belgian starter guide'
    finalProgrammes = createSampleGuide(guideChannels, dateText).programmes
  }

  finalProgrammes = await enrichProgrammeMetadata(finalProgrammes, dataDir, {
    enabled: ratingsEnabled,
    maxLookups: ratingsMaxLookups,
    omdbApiKey,
    timeoutMs: fetchTimeoutMs
  })

  const guide = {
    source: finalProgrammes.length ? source : `${source || 'No sources'} (no programmes found)`,
    sourceKey,
    generatedAt: new Date().toISOString(),
    channels: guideChannels,
    programmes: finalProgrammes,
    errors,
    stats: {
      channels: guideChannels.length,
      channelsWithProgrammes: new Set(finalProgrammes.map(programme => programme.channelId)).size,
      programmes: finalProgrammes.length,
      mediaProgrammes: finalProgrammes.filter(programme => programme.media?.type).length,
      ratedProgrammes: finalProgrammes.filter(programme => programme.media?.rating).length
    }
  }

  if (guide.programmes.length || !guide.errors.length) {
    fs.writeFileSync(target, JSON.stringify(guide, null, 2))
  }
  return guide
}

app.get('/api/sources', (req, res) => {
  res.json({
    timezone,
    xmltvUrls,
    pickxEnabled,
    sampleFallbackEnabled,
    ratingsEnabled,
    ratingsMaxLookups,
    fetchTimeoutMs,
    omdbEnabled: Boolean(omdbApiKey),
    orange: {
      status: 'available-for-local-adapter',
      endpoint: 'https://client.titan.sdscloud.orange.be/secure/v1/graphql',
      note: 'Orange TV Go uses OAuth/AWS session handling; this app does not store your credentials.'
    },
    publicSources: ['iptv-org/epg: pickx.be, mon-programme-tv.be, vrt.be, vtm.be', 'epg.pw XMLTV all-in-one feed']
  })
})

app.get('/api/guide', async (req, res, next) => {
  try {
    const dateText = req.query.date || todayInBrussels()
    res.json(await loadGuide(dateText))
  } catch (error) {
    next(error)
  }
})

app.post('/api/refresh', async (req, res, next) => {
  try {
    const dateText = req.body?.date || todayInBrussels()
    res.json(await loadGuide(dateText, true))
  } catch (error) {
    next(error)
  }
})

const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ error: error.message || 'Unexpected server error' })
})

app.listen(port, () => {
  console.log(`Belgian TV Guide listening on ${port}`)
})
