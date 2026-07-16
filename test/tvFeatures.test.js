import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyDigest, findConflicts, heatmapBuckets, nowNext, smartTonight } from '../src/tvFeatures.js'

const channels = [
  { id: 'vrt1', name: 'VRT 1', number: 1 },
  { id: 'vtm', name: 'VTM', number: 2 },
  { id: 'kids', name: 'Kids', number: 30 }
]

const programmes = [
  {
    id: 'news',
    channelId: 'vrt1',
    title: 'News',
    start: '2026-07-16T18:00:00.000Z',
    stop: '2026-07-16T18:30:00.000Z',
    category: 'News'
  },
  {
    id: 'movie',
    channelId: 'vtm',
    title: 'Great Movie',
    start: '2026-07-16T20:00:00.000Z',
    stop: '2026-07-16T22:00:00.000Z',
    category: 'Films',
    media: { type: 'movie', rating: 8.1, genre: 'Action' }
  },
  {
    id: 'series',
    channelId: 'vrt1',
    title: 'Good Series',
    start: '2026-07-16T20:30:00.000Z',
    stop: '2026-07-16T21:15:00.000Z',
    category: 'Serie',
    media: { type: 'series', rating: 7.4, genre: 'Drama' }
  },
  {
    id: 'cartoon',
    channelId: 'kids',
    title: 'Cartoon Time',
    start: '2026-07-16T16:00:00.000Z',
    stop: '2026-07-16T16:30:00.000Z',
    category: 'Kids'
  }
]

test('smart tonight ranks rated evening programmes', () => {
  const items = smartTonight(programmes, channels, { likedGenres: ['Action'] }, '2026-07-16')
  assert.equal(items[0].programme.title, 'Great Movie')
  assert.ok(items[0].score > items[1].score)
})

test('now next returns current and next per favorite channel', () => {
  const rows = nowNext(programmes, channels, new Date('2026-07-16T20:05:00.000Z').getTime(), ['vtm'])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].channel.name, 'VTM')
  assert.equal(rows[0].current.title, 'Great Movie')
})

test('find conflicts detects overlapping tagged entries', () => {
  const conflicts = findConflicts([
    { key: 'movie', programme: programmes[1] },
    { key: 'series', programme: programmes[2] }
  ])
  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].first.programme.title, 'Great Movie')
})

test('heatmap buckets average cached ratings by hour', () => {
  const buckets = heatmapBuckets(programmes, '2026-07-16')
  const activeBucket = buckets.find(bucket => bucket.count === 2)
  assert.equal(activeBucket.average, 7.8)
})

test('daily digest includes best, kids, and conflicts', () => {
  const digest = dailyDigest(programmes, channels, [
    { key: 'movie', programme: programmes[1] },
    { key: 'series', programme: programmes[2] }
  ], {}, '2026-07-16')

  assert.equal(digest.best[0].programme.title, 'Great Movie')
  assert.equal(digest.kids[0].programme.title, 'Cartoon Time')
  assert.equal(digest.conflicts.length, 1)
})
