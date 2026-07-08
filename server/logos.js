import fs from 'node:fs'
import path from 'node:path'

const LOGOS_URL = 'https://iptv-org.github.io/api/logos.json'
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

function normalize(value = '') {
  return value
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '')
}

async function loadLogoRows(dataDir) {
  const cacheFile = path.join(dataDir, 'cache', 'logos.json')
  try {
    const stat = fs.statSync(cacheFile)
    if (Date.now() - stat.mtimeMs < MAX_CACHE_AGE_MS) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    }
  } catch {}

  const response = await fetch(LOGOS_URL, {
    headers: { 'user-agent': 'BelgianTVGuide/0.2' }
  })
  if (!response.ok) throw new Error(`Logo feed returned ${response.status}`)
  const rows = await response.json()
  fs.writeFileSync(cacheFile, JSON.stringify(rows))
  return rows
}

export async function enrichChannelLogos(channels, dataDir) {
  let rows = []
  try {
    rows = await loadLogoRows(dataDir)
  } catch (error) {
    return channels.map(channel => ({ ...channel, logoError: error.message }))
  }

  const byChannel = new Map()
  for (const row of rows) {
    if (!row?.url || !row.channel) continue
    const key = normalize(row.channel)
    if (!byChannel.has(key) || row.in_use) byChannel.set(key, row.url)
  }

  return channels.map(channel => {
    const ids = [channel.name, ...(channel.xmltvIds || [])]
    const logo = ids.map(id => byChannel.get(normalize(id))).find(Boolean)
    return logo ? { ...channel, logo } : channel
  })
}
