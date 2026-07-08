import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { defaultChannels } from './channels.js'
import { createSampleGuide } from './sampleGuide.js'
import { ensureDataDir, parseXmltvSources } from './xmltv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 3000)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const timezone = process.env.EPG_TIMEZONE || 'Europe/Brussels'
const xmltvUrls = (process.env.EPG_XMLTV_URLS || '').split(',').map(url => url.trim()).filter(Boolean)

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

async function loadGuide(dateText, force = false) {
  const channels = loadChannels()
  const target = cachePath(dateText)
  if (!force && fs.existsSync(target)) {
    return JSON.parse(fs.readFileSync(target, 'utf8'))
  }

  let guide
  if (xmltvUrls.length) {
    const parsed = await parseXmltvSources(xmltvUrls, channels, dateText)
    guide = {
      source: parsed.programmes.length ? 'XMLTV' : 'Sample Belgian starter guide',
      generatedAt: new Date().toISOString(),
      channels: parsed.channels,
      programmes: parsed.programmes.length ? parsed.programmes : createSampleGuide(channels, dateText).programmes,
      errors: parsed.errors
    }
  } else {
    guide = createSampleGuide(channels, dateText)
  }

  fs.writeFileSync(target, JSON.stringify(guide, null, 2))
  return guide
}

app.get('/api/sources', (req, res) => {
  res.json({
    timezone,
    xmltvUrls,
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
