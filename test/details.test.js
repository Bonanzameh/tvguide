import test from 'node:test'
import assert from 'node:assert/strict'
import { detailMeta, scoreMeta } from '../src/detailMeta.js'

test('detail metadata handles numeric years', () => {
  const meta = detailMeta({
    year: 2026,
    category: 'Sport'
  })

  assert.deepEqual(meta, [
    { label: '2026', group: 'primary' },
    { label: 'Sport', group: 'category' }
  ])
})

test('detail metadata removes score pill and redundant series category from rail', () => {
  const programme = {
    season: 6,
    episode: 20,
    category: 'Serie',
    media: {
      type: 'series',
      year: '2017',
      rating: 8.2,
      ratingColor: 'dark-green',
      genre: 'Drama'
    }
  }

  assert.deepEqual(detailMeta(programme), [
    { label: 'S06E20', group: 'primary' },
    { label: '2017', group: 'primary' },
    { label: 'Drama', group: 'category' }
  ])
  assert.deepEqual(scoreMeta(programme), {
    label: '8.2/10',
    className: 'detail-score rating-dark-green'
  })
})

test('movie score uses the same colored detail badge', () => {
  const programme = {
    category: 'Films',
    media: {
      type: 'movie',
      year: '2023',
      rating: 6.4,
      ratingColor: 'yellow',
      genre: 'Romantiek'
    }
  }

  assert.deepEqual(detailMeta(programme), [
    { label: '2023', group: 'primary' },
    { label: 'Romantiek', group: 'category' }
  ])
  assert.deepEqual(scoreMeta(programme), {
    label: '6.4/10',
    className: 'detail-score rating-yellow'
  })
})
