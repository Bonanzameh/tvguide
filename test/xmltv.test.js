import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseXmltvSources } from '../server/xmltv.js'

test('parses filtered XMLTV programmes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-guide-'))
  const xmlPath = path.join(dir, 'guide.xml')
  fs.writeFileSync(xmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="c1"><display-name>VRT 1</display-name></channel>
  <channel id="c2"><display-name>Other</display-name></channel>
  <programme channel="c1" start="20260708090000 +0200" stop="20260708100000 +0200">
    <title>News</title><desc>Morning edition</desc><category>News</category>
  </programme>
  <programme channel="c2" start="20260708090000 +0200" stop="20260708100000 +0200">
    <title>Ignored</title>
  </programme>
</tv>`)

  const result = await parseXmltvSources([`file://${xmlPath}`], [
    { id: 'vrt-1', name: 'VRT 1', aliases: [], xmltvIds: [] }
  ], '2026-07-08')

  assert.equal(result.programmes.length, 1)
  assert.equal(result.programmes[0].title, 'News')
  assert.equal(result.programmes[0].channelId, 'vrt-1')
})

test('ignores XMLTV channels and programmes from unsupported scripts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-guide-'))
  const xmlPath = path.join(dir, 'guide.xml')
  fs.writeFileSync(xmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="DiscoveryChannel.be"><display-name>Discovery科学频道</display-name></channel>
  <channel id="VRT1.be"><display-name>VRT 1</display-name></channel>
  <programme channel="DiscoveryChannel.be" start="20260708090000 +0200" stop="20260708100000 +0200">
    <title>層層透視古文明</title>
  </programme>
  <programme channel="VRT1.be" start="20260708090000 +0200" stop="20260708100000 +0200">
    <title>Дикое шоу</title>
  </programme>
</tv>`)

  const result = await parseXmltvSources([`file://${xmlPath}`], [
    { id: 'discovery', name: 'Discovery', aliases: [], xmltvIds: ['DiscoveryChannel.be'] },
    { id: 'vrt-1', name: 'VRT 1', aliases: [], xmltvIds: ['VRT1.be'] }
  ], '2026-07-08')

  assert.equal(result.programmes.length, 0)
})
