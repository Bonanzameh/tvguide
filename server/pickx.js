const PICKX_GUIDE_URL = 'https://www.pickx.be/nl/televisie/tv-gids'
const PICKX_VERSION_PREFIX = 'https://www.pickx.be/api/s-'
const PICKX_EPG_BASE = 'https://px-epg.azureedge.net/airings'
const PICKX_GRAPHQL = 'https://api.proximusmwc.be/tiams/v3/graphql'
const DEFAULT_TIMEOUT_MS = 12000

const headers = {
  origin: 'https://www.pickx.be',
  referer: 'https://www.pickx.be/',
  'user-agent': 'BelgianTVGuide/0.2'
}

function describeFetchError(url, error) {
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return `${url} timed out`
  }
  const details = [
    error.message,
    error.name,
    error.cause?.code,
    error.cause?.message
  ].filter(Boolean).join(' - ')
  return `${url} failed: ${details || 'unknown network error'}`
}

function createFetchOptions(options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options
  return {
    ...fetchOptions,
    signal: fetchOptions.signal || AbortSignal.timeout(timeoutMs),
    headers: { ...headers, ...(fetchOptions.headers || {}) }
  }
}

function normalize(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\b(hd|sd|tv|n|f|nl|fr)\b/g, ' ')
    .replace(/fictie/g, 'fiction')
    .replace(/actie/g, 'action')
    .replace(/één/g, 'een')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function dayBounds(dateText) {
  const start = new Date(`${dateText}T00:00:00+02:00`)
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000)
  }
}

async function fetchJson(url, options = {}) {
  let response
  try {
    response = await fetch(url, createFetchOptions(options))
  } catch (error) {
    throw new Error(describeFetchError(url, error))
  }
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

async function fetchApiVersion(options = {}) {
  let response
  try {
    response = await fetch(PICKX_GUIDE_URL, createFetchOptions(options))
  } catch (error) {
    throw new Error(describeFetchError(PICKX_GUIDE_URL, error))
  }
  if (!response.ok) throw new Error(`Pickx guide page returned ${response.status}`)
  const html = await response.text()
  const hash = html.match(/"hashes":\["([^"]+)"\]/)?.[1]
  if (!hash) throw new Error('Pickx app version hash not found')
  const versionData = await fetchJson(`${PICKX_VERSION_PREFIX}${hash}`, options)
  if (!versionData.version) throw new Error('Pickx API version not found')
  return versionData.version
}

async function fetchPickxChannels(options = {}) {
  const body = {
    operationName: 'getChannels',
    variables: {
      language: 'nl',
      queryParams: {},
      id: '0',
      params: { shouldReadFromCache: true }
    },
    query: `query getChannels($language: String!, $queryParams: ChannelQueryParams, $id: String, $params: ChannelParams) {
      channels(language: $language, queryParams: $queryParams, id: $id, params: $params) {
        id
        name
        language
        radio
      }
    }`
  }

  const data = await fetchJson(PICKX_GRAPHQL, {
    ...options,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return data.data?.channels?.filter(channel => !channel.radio) || []
}

function matchPickxChannel(channel, pickxChannels, usedIds) {
  for (const id of channel.pickxIds || []) {
    const match = pickxChannels.find(candidate => candidate.id === id && !usedIds.has(candidate.id))
    if (match) return match
  }

  const names = [channel.name, ...(channel.aliases || [])].map(normalize).filter(Boolean)
  const exact = pickxChannels.find(candidate => {
    if (usedIds.has(candidate.id)) return false
    const candidateName = normalize(candidate.name)
    return names.some(name => candidateName === name)
  })
  if (exact) return exact

  if (!(channel.pickxIds || []).length) return null

  return pickxChannels.find(candidate => {
    if (usedIds.has(candidate.id)) return false
    const candidateName = normalize(candidate.name)
    return names.some(name => (
      name.length > 4 &&
      candidateName.length > 4 &&
      (candidateName.includes(name) || name.includes(candidateName))
    ))
  })
}

async function mapLimit(items, limit, mapper) {
  const results = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function toProgramme(item, channel, dateText) {
  const { start: dayStart, end: dayEnd } = dayBounds(dateText)
  const start = new Date(item.programScheduleStart)
  const stop = new Date(item.programScheduleEnd)
  if (!(stop > dayStart && start < dayEnd)) return null

  const programme = item.program || {}
  const category = programme.translatedCategory?.nl || programme.category?.replace(/^C\./, '') || ''
  const categoryDetail = programme.translatedSubCategory?.nl || programme.subCategory?.replace(/^C\./, '') || ''
  return {
    id: `pickx-${channel.id}-${item.programReferenceNumber || item.scheduleTrailId || item.programScheduleStart}`,
    channelId: channel.id,
    title: programme.title || 'Untitled',
    subtitle: programme.episodeTitle || '',
    desc: programme.description || '',
    category,
    categoryDetail,
    season: programme.seasonNumber || null,
    episode: programme.episodeNumber || null,
    start: start.toISOString(),
    stop: stop.toISOString(),
    image: programme.posterFileName
      ? `https://experience-cache.cdi.streaming.proximustv.be/posterserver/poster/EPG/${programme.posterFileName}`
      : '',
    source: 'Pickx'
  }
}

export async function fetchPickxGuide(channels, dateText, options = {}) {
  const version = await fetchApiVersion(options)
  const pickxChannels = await fetchPickxChannels(options)
  const usedIds = new Set()
  const mapped = []

  for (const channel of channels) {
    const pickxChannel = matchPickxChannel(channel, pickxChannels, usedIds)
    if (!pickxChannel) continue
    usedIds.add(pickxChannel.id)
    mapped.push({ channel, pickxChannel })
  }

  const results = await mapLimit(mapped, 8, async ({ channel, pickxChannel }) => {
    const url = `${PICKX_EPG_BASE}/${version}/${dateText}/channel/${pickxChannel.id}?timezone=Europe%2FBrussels`
    const items = await fetchJson(url, options)
    return {
      channel: {
        ...channel,
        sourceName: pickxChannel.name,
        pickxSourceId: pickxChannel.id
      },
      programmes: items.map(item => toProgramme(item, channel, dateText)).filter(Boolean)
    }
  })

  const channelMeta = new Map(results.map(result => [result.channel.id, result.channel]))
  return {
    channels: channels.map(channel => channelMeta.get(channel.id) || channel),
    programmes: results.flatMap(result => result.programmes),
    matchedChannels: mapped.length,
    version
  }
}
