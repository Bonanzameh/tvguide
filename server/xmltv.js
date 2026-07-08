import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import sax from 'sax'

function normalize(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseXmltvDate(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])?(\d{2})?(\d{2})?/)
  if (!match) return null
  const [, y, mo, d, h, mi, s, sign = '+', oh = '00', om = '00'] = match
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  const offset = (Number(oh) * 60 + Number(om)) * 60 * 1000 * (sign === '+' ? 1 : -1)
  return new Date(utc - offset)
}

function buildMatchers(channels) {
  const byXmltv = new Map()
  const byName = new Map()
  for (const channel of channels) {
    for (const id of channel.xmltvIds || []) byXmltv.set(normalize(id), channel)
    for (const name of [channel.name, ...(channel.aliases || [])]) byName.set(normalize(name), channel)
  }
  return { byXmltv, byName }
}

function streamFromUrl(url) {
  if (url.startsWith('file://')) {
    return fs.createReadStream(new URL(url))
  }
  return fetch(url, { headers: { 'user-agent': 'BelgianTVGuide/0.1' } }).then(response => {
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return response.body
  })
}

async function getInputStream(url) {
  const stream = await streamFromUrl(url)
  const nodeStream = stream.pipe ? stream : fs.ReadStream.fromWeb(stream)
  if (url.endsWith('.gz')) return nodeStream.pipe(zlib.createGunzip())
  return nodeStream
}

export async function parseXmltvSource(url, channels, dateText) {
  const { byXmltv, byName } = buildMatchers(channels)
  const sourceChannelToAppChannel = new Map()
  const channelMeta = new Map()
  const programmes = []
  const dayStart = new Date(`${dateText}T00:00:00+02:00`)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const input = await getInputStream(url)
  const parser = sax.createStream(true, { trim: true, normalize: true })

  let currentChannel = null
  let currentProgramme = null
  let textTarget = null

  parser.on('opentag', node => {
    const name = node.name.toLowerCase()
    if (name === 'channel') {
      currentChannel = { id: String(node.attributes.id || ''), names: [], icon: '' }
    } else if (currentChannel && name === 'display-name') {
      textTarget = { type: 'channel-name' }
    } else if (currentChannel && name === 'icon') {
      currentChannel.icon = node.attributes.src || currentChannel.icon
    } else if (name === 'programme') {
      const sourceId = String(node.attributes.channel || '')
      const appChannel = sourceChannelToAppChannel.get(sourceId)
      if (!appChannel) return
      const start = parseXmltvDate(node.attributes.start)
      const stop = parseXmltvDate(node.attributes.stop)
      if (!start || !stop || stop <= dayStart || start >= dayEnd) return
      currentProgramme = {
        id: `${sourceId}-${node.attributes.start}`,
        channelId: appChannel.id,
        title: 'Untitled',
        subtitle: '',
        desc: '',
        category: '',
        start: start.toISOString(),
        stop: stop.toISOString(),
        icon: '',
        source: url
      }
    } else if (currentProgramme && ['title', 'sub-title', 'desc', 'category'].includes(name)) {
      textTarget = { type: name }
    } else if (currentProgramme && name === 'icon') {
      currentProgramme.icon = node.attributes.src || currentProgramme.icon
    }
  })

  parser.on('text', text => {
    if (!textTarget) return
    if (textTarget.type === 'channel-name' && currentChannel) {
      currentChannel.names.push(text)
    } else if (currentProgramme) {
      if (textTarget.type === 'title') currentProgramme.title = text
      if (textTarget.type === 'sub-title') currentProgramme.subtitle = text
      if (textTarget.type === 'desc') currentProgramme.desc = text
      if (textTarget.type === 'category') currentProgramme.category = text
    }
  })

  parser.on('closetag', rawName => {
    const name = rawName.toLowerCase()
    if (name === 'display-name' || ['title', 'sub-title', 'desc', 'category'].includes(name)) {
      textTarget = null
    } else if (name === 'channel' && currentChannel) {
      let appChannel = byXmltv.get(normalize(currentChannel.id))
      for (const displayName of currentChannel.names) {
        appChannel ||= byName.get(normalize(displayName))
      }
      if (appChannel) {
        sourceChannelToAppChannel.set(currentChannel.id, appChannel)
        channelMeta.set(appChannel.id, { icon: currentChannel.icon, sourceName: currentChannel.names[0] })
      }
      currentChannel = null
    } else if (name === 'programme' && currentProgramme) {
      programmes.push(currentProgramme)
      currentProgramme = null
    }
  })

  await new Promise((resolve, reject) => {
    parser.on('end', resolve)
    parser.on('error', reject)
    input.on('error', reject)
    input.pipe(parser)
  })
  const channelsWithMeta = channels.map(channel => ({ ...channel, ...(channelMeta.get(channel.id) || {}) }))
  return { url, channels: channelsWithMeta, programmes }
}

export async function parseXmltvSources(urls, channels, dateText) {
  const merged = new Map()
  const errors = []
  let channelMeta = channels

  for (const url of urls.filter(Boolean)) {
    try {
      const result = await parseXmltvSource(url, channelMeta, dateText)
      channelMeta = result.channels
      for (const programme of result.programmes) {
        const key = `${programme.channelId}-${programme.start}-${programme.stop}-${programme.title}`
        if (!merged.has(key)) merged.set(key, programme)
      }
    } catch (error) {
      errors.push({ url, message: error.message })
    }
  }

  return {
    channels: channelMeta,
    programmes: [...merged.values()].sort((a, b) => a.start.localeCompare(b.start)),
    errors
  }
}

export function ensureDataDir(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(path.join(dataDir, 'cache'), { recursive: true })
}
