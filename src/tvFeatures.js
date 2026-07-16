export function programmeKey(programme) {
  if (!programme) return ''
  return [programme.channelId, programme.start, programme.stop, programme.title].join('|')
}

export function programmeDate(programme) {
  if (!programme?.start) return ''
  const copy = new Date(programme.start)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 10)
}

export function programmeGenre(programme) {
  return programme?.media?.genre || programme?.categoryDetail || programme?.category || ''
}

export function channelMap(channels = []) {
  return new Map(channels.map(channel => [channel.id, channel]))
}

export function programmeScore(programme, channel, profile = {}) {
  const rating = typeof programme?.media?.rating === 'number' ? programme.media.rating : 5.8
  const genre = programmeGenre(programme).toLowerCase()
  const likedGenre = (profile.likedGenres || []).some(item => item.toLowerCase() === genre)
  const favoriteChannel = (profile.favoriteChannelIds || []).includes(programme?.channelId)
  const movieBoost = programme?.media?.type === 'movie' ? 0.15 : 0
  const seriesBoost = programme?.media?.type === 'series' ? 0.1 : 0
  const channelBoost = favoriteChannel ? 0.55 : 0
  const genreBoost = likedGenre ? 0.45 : 0
  const fallbackChannelBoost = channel?.number && Number(channel.number) <= 10 ? 0.1 : 0
  return Math.min(10, Number((rating + movieBoost + seriesBoost + channelBoost + genreBoost + fallbackChannelBoost).toFixed(2)))
}

export function isKidsProgramme(programme) {
  return /kids|kind|children|jeugd/i.test([programme?.category, programme?.categoryDetail, programmeGenre(programme)].filter(Boolean).join(' '))
}

export function minutesBetween(start, stop) {
  return Math.max(0, Math.round((new Date(stop).getTime() - new Date(start).getTime()) / 60000))
}

export function windowProgrammes(programmes = [], startMs, endMs) {
  return programmes.filter(programme => {
    const start = new Date(programme.start).getTime()
    const stop = new Date(programme.stop).getTime()
    return stop > startMs && start < endMs
  })
}

export function smartTonight(programmes = [], channels = [], profile = {}, dateText = '') {
  const start = new Date(`${dateText}T18:00:00`).getTime()
  const end = new Date(`${dateText}T23:59:59`).getTime()
  const channelsById = channelMap(channels)
  return windowProgrammes(programmes, start, end)
    .map(programme => ({
      programme,
      channel: channelsById.get(programme.channelId),
      score: programmeScore(programme, channelsById.get(programme.channelId), profile)
    }))
    .filter(item => minutesBetween(item.programme.start, item.programme.stop) >= 20)
    .sort((a, b) => b.score - a.score || a.programme.start.localeCompare(b.programme.start))
    .slice(0, 18)
}

export function nowNext(programmes = [], channels = [], nowMs = Date.now(), favoriteChannelIds = []) {
  return channels
    .filter(channel => !favoriteChannelIds.length || favoriteChannelIds.includes(channel.id))
    .map(channel => {
      const list = programmes
        .filter(programme => programme.channelId === channel.id)
        .sort((a, b) => a.start.localeCompare(b.start))
      const current = list.find(programme => new Date(programme.start).getTime() <= nowMs && nowMs < new Date(programme.stop).getTime()) || null
      const next = list.find(programme => new Date(programme.start).getTime() > nowMs) || null
      return { channel, current, next }
    })
    .filter(item => item.current || item.next)
}

export function findConflicts(entries = []) {
  const sorted = [...entries].sort((a, b) => a.programme.start.localeCompare(b.programme.start))
  const conflicts = []
  for (let index = 0; index < sorted.length; index += 1) {
    for (let compare = index + 1; compare < sorted.length; compare += 1) {
      const left = sorted[index].programme
      const right = sorted[compare].programme
      if (new Date(right.start).getTime() >= new Date(left.stop).getTime()) break
      conflicts.push({ first: sorted[index], second: sorted[compare] })
    }
  }
  return conflicts
}

export function heatmapBuckets(programmes = [], dateText = '') {
  return Array.from({ length: 24 }, (_, hour) => {
    const startMs = new Date(`${dateText}T${String(hour).padStart(2, '0')}:00:00`).getTime()
    const endMs = startMs + 60 * 60 * 1000
    const items = windowProgrammes(programmes, startMs, endMs)
      .filter(programme => typeof programme?.media?.rating === 'number')
    const average = items.length
      ? items.reduce((sum, programme) => sum + programme.media.rating, 0) / items.length
      : null
    return {
      hour,
      count: items.length,
      average: average === null ? null : Number(average.toFixed(1))
    }
  })
}

export function dailyDigest(programmes = [], channels = [], watchEntries = [], profile = {}, dateText = '') {
  const channelsById = channelMap(channels)
  const scored = programmes
    .map(programme => ({
      programme,
      channel: channelsById.get(programme.channelId),
      score: programmeScore(programme, channelsById.get(programme.channelId), profile)
    }))
    .sort((a, b) => b.score - a.score || a.programme.start.localeCompare(b.programme.start))

  return {
    best: scored.slice(0, 5),
    movies: scored.filter(item => item.programme.media?.type === 'movie').slice(0, 5),
    series: scored.filter(item => item.programme.media?.type === 'series').slice(0, 5),
    kids: scored.filter(item => isKidsProgramme(item.programme)).slice(0, 5),
    tonight: smartTonight(programmes, channels, profile, dateText).slice(0, 6),
    conflicts: findConflicts(watchEntries)
  }
}
