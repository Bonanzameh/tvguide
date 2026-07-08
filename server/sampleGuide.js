const pools = [
  ['Morning Live', 'Breakfast News', 'City Stories', 'Studio Talk', 'Weekend Kitchen'],
  ['The Daily Brief', 'Checkpoint', 'Local Heroes', 'Market Watch', 'World Update'],
  ['Family Time', 'Junior Club', 'Animated Hour', 'After School', 'Discoveries'],
  ['Prime Report', 'Matchday', 'Cinema Night', 'Belgian Stories', 'Late Edition'],
  ['Documentary Hour', 'Travel Notes', 'Wild Belgium', 'Design Files', 'Music Room']
]

const descriptions = [
  'A fresh edition with the latest stories, useful context, and a few lighter moments.',
  'Highlights, interviews, and analysis from Belgium and abroad.',
  'A curated programme block selected for this channel in the starter guide.',
  'Magazine-style television with guests, reports, and practical recommendations.',
  'A longer feature with background, human stories, and a clear sense of place.'
]

function hash(input) {
  return [...input].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7)
}

function minutesFor(channelId, index) {
  const options = [30, 45, 60, 75, 90, 120]
  return options[(hash(channelId) + index) % options.length]
}

export function createSampleGuide(channels, dateText) {
  const base = new Date(`${dateText}T00:00:00+02:00`)
  const programmes = []

  for (const channel of channels) {
    let cursor = new Date(base)
    let index = 0
    while (cursor < new Date(base.getTime() + 24 * 60 * 60 * 1000)) {
      const duration = minutesFor(channel.id, index)
      const stop = new Date(Math.min(cursor.getTime() + duration * 60 * 1000, base.getTime() + 24 * 60 * 60 * 1000))
      const groupOffset = Math.floor(cursor.getHours() / 5)
      const titles = pools[groupOffset % pools.length]
      const title = titles[(hash(channel.id) + index) % titles.length]
      programmes.push({
        id: `${channel.id}-${dateText}-${index}`,
        channelId: channel.id,
        title,
        subtitle: channel.group,
        desc: descriptions[(hash(title + channel.id) + index) % descriptions.length],
        category: channel.group,
        start: cursor.toISOString(),
        stop: stop.toISOString(),
        source: 'Sample'
      })
      cursor = stop
      index += 1
    }
  }

  return {
    source: 'Sample Belgian starter guide',
    generatedAt: new Date().toISOString(),
    channels,
    programmes
  }
}
