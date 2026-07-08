# Belgian TV Guide

Dockerized EPG-style TV guide for Belgian channels, with a timeline grid, channel rows, and a fixed details panel when you select a programme.

## Run

```bash
docker compose up --build
```

Open http://localhost:3000.

The app fetches real guide data from the public Proximus Pickx EPG endpoint by default, then supplements it with XMLTV when configured. If `EPG_XMLTV_URLS` is empty, XMLTV is disabled and the app only uses Pickx. Use `EPG_XMLTV_URLS=epg.pw` only if you deliberately want the large public epg.pw feed as a supplemental source.

To ingest your own XMLTV data, set `EPG_XMLTV_URLS` in `docker-compose.yml` or mount a file:

```yaml
environment:
  EPG_XMLTV_URLS: "file:///data/guide.xml.gz"
```

## Sources

Useful Belgian EPG sources found while setting this up:

- Proximus Pickx public EPG: used as the default source because it has a broad Belgian/Flemish channel lineup and real programme descriptions.
- Orange TV Go: the web app uses Orange/SDS GraphQL at `https://client.titan.sdscloud.orange.be/secure/v1/graphql`, with OAuth/AWS session handling. The app is ready for an Orange adapter, but it does not store or request your TV Go credentials.
- iptv-org/epg: active scrapers for `pickx.be`, `mon-programme-tv.be`, `vrt.be`, and `vtm.be`. You can generate XMLTV with that project and mount the result into `/data`.
- epg.pw: public all-in-one XMLTV feed at `https://epg.pw/xmltv/epg.xml.gz`. It is large and can be slow, so it is only used when you explicitly set `EPG_XMLTV_URLS=epg.pw` or paste the URL yourself.
- Orange Belgium channel PDFs/pages: useful for curating your exact regional TV Go lineup. Channel availability varies by region/postcode.

## Custom Channels

Create `/data/channels.json` in the container volume to override the starter lineup:

```json
[
  {
    "id": "vrt1",
    "name": "VRT 1",
    "group": "Dutch",
    "aliases": ["VRT1", "Eén"],
    "xmltvIds": ["VRT1.be", "VRT1.be@SD", "VRT1.be@HD"]
  }
]
```

Restart the container after changing the file.

## Environment

- `EPG_PICKX_ENABLED`: `true` by default. Set to `false` to skip Pickx.
- `EPG_XMLTV_URLS`: empty disables XMLTV; comma-separated URLs or `file:///data/guide.xml.gz` are supported; `epg.pw` expands to `https://epg.pw/xmltv/epg.xml.gz`.
- `EPG_FETCH_TIMEOUT_MS`: external source timeout in milliseconds. Defaults to `12000`.
- `EPG_SAMPLE_FALLBACK`: `false` by default. Set to `true` if you want generated demo data when all real sources fail.
- `EPG_RATINGS_ENABLED`: `true` by default. Adds movie/series badges and cached rating lookups.
- `EPG_RATINGS_MAX_LOOKUPS`: maximum external rating lookups per guide refresh. Defaults to `80`; cached results do not count.
- `OMDB_API_KEY`: optional. Enables IMDb-style movie ratings through OMDb. Series episode ratings use TVMaze where a matching episode can be found.
- `EPG_PREFETCH_DAYS`: number of guide days to keep warm in cache. Defaults to `3`.
- `EPG_PREFETCH_INTERVAL_HOURS`: automatic cache refresh interval. Defaults to `24`.
- `EPG_PREFETCH_ON_START`: `true` by default. Warms the cache shortly after the server starts.

## Cache Warm-Up

The server warms today and the next configured days in the background so opening the page usually reads from cache:

```bash
curl http://localhost:3000/api/cache/status?days=3 | jq
curl -X POST http://localhost:3000/api/warm-cache \
  -H 'content-type: application/json' \
  -d '{"days":3,"force":true}' | jq
```

OMDb's free API key page lists a 1,000 daily request limit. The app caches movie lookups and limits new rating lookups per guide refresh with `EPG_RATINGS_MAX_LOOKUPS`, so a 3-day warm-up at the default cap is designed to stay well below that.

## Troubleshooting

If the guide is empty and the UI reports that a source failed, check `/api/guide` for the `errors` array. If Pickx is blocked from your Docker host and `EPG_XMLTV_URLS` is empty, there is no fallback source. Set `EPG_XMLTV_URLS` to a working XMLTV URL/file, then refresh the guide.
