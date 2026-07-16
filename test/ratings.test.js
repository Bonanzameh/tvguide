import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { enrichProgrammeMetadata, getRatingQueueStatus } from '../server/ratings.js'

test('rating enrichment queues media and applies resolved internal DB scores', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tvguide-ratings-'))
  try {
    const programmes = [{
      id: 'movie-1',
      channelId: 'vrt1',
      title: 'Test Movie',
      category: 'Films',
      start: '2026-07-16T20:00:00.000Z',
      stop: '2026-07-16T22:00:00.000Z',
      year: '2024'
    }]

    const firstPass = await enrichProgrammeMetadata(programmes, dataDir, { enabled: true })
    assert.equal(firstPass[0].media.type, 'movie')
    assert.equal(firstPass[0].media.rating, null)
    assert.equal(getRatingQueueStatus(dataDir).counts.queued, 1)

    const dbFile = path.join(dataDir, 'cache', 'rating-db.json')
    const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
    const [key] = Object.keys(db.entries)
    db.entries[key].status = 'resolved'
    db.entries[key].metadata = {
      mediaType: 'movie',
      rating: 7.4,
      ratingSource: 'IMDb via OMDb',
      externalTitle: 'Test Movie',
      year: '2024',
      genres: ['Drama']
    }
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2))

    const secondPass = await enrichProgrammeMetadata(programmes, dataDir, { enabled: true })
    assert.equal(secondPass[0].media.rating, 7.4)
    assert.equal(secondPass[0].media.ratingColor, 'light-green')
    assert.equal(secondPass[0].media.genre, 'Drama')
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
