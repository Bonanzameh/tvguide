function seasonEpisode(programme) {
  if (!programme?.season || !programme?.episode) return ''
  return `S${String(programme.season).padStart(2, '0')}E${String(programme.episode).padStart(2, '0')}`
}

function isRedundantMediaCategory(programme, value) {
  const normalized = String(value || '').toLowerCase()
  if (programme.media?.type === 'series') return ['serie', 'series'].includes(normalized)
  if (programme.media?.type === 'movie') return ['film', 'films', 'movie', 'movies'].includes(normalized)
  return false
}

export function detailMeta(programme) {
  if (!programme) return []
  const items = []
  const episode = seasonEpisode(programme)
  const year = programme.media?.year || programme.year || ''
  if (episode) items.push({ label: String(episode), group: 'primary' })
  if (year) items.push({ label: String(year), group: 'primary' })
  if (programme.media?.genre) items.push({ label: String(programme.media.genre), group: 'category' })
  if (programme.category && !isRedundantMediaCategory(programme, programme.category)) {
    items.push({ label: String(programme.category), group: 'category' })
  }

  const seen = new Set()
  return items.filter(item => {
    const key = String(item.label).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function scoreMeta(programme) {
  if (typeof programme?.media?.rating !== 'number') return null
  return {
    label: `${programme.media.rating}/10`,
    className: `detail-score rating-${programme.media.ratingColor || 'neutral'}`
  }
}
