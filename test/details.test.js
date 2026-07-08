import test from 'node:test'
import assert from 'node:assert/strict'
import { detailMeta } from '../src/detailMeta.js'

test('detail metadata handles numeric years', () => {
  const meta = detailMeta({
    year: 2026,
    category: 'Sport'
  })

  assert.deepEqual(meta, [
    { label: '2026' },
    { label: 'Sport' }
  ])
})

test('detail metadata color-codes rating pills and removes redundant series category', () => {
  const meta = detailMeta({
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
  })

  assert.deepEqual(meta, [
    { label: 'S06E20' },
    { label: '2017' },
    { label: '8.2/10', className: 'score-pill rating-dark-green' },
    { label: 'Drama' }
  ])
})
