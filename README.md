# Belgian TV Guide

Dockerized EPG-style TV guide for Belgian channels, with a timeline grid, channel rows, and a fixed details panel when you select a programme.

## Run

```bash
docker compose up --build
```

Open http://localhost:3000.

The app starts with deterministic Belgian sample guide data so the UI works immediately. To ingest real XMLTV data, set `EPG_XMLTV_URLS` in `docker-compose.yml` or mount a file:

```yaml
environment:
  EPG_XMLTV_URLS: "file:///data/guide.xml.gz,https://epg.pw/xmltv/epg.xml.gz"
```

## Sources

Useful Belgian EPG sources found while setting this up:

- Orange TV Go: the web app uses Orange/SDS GraphQL at `https://client.titan.sdscloud.orange.be/secure/v1/graphql`, with OAuth/AWS session handling. The app is ready for an Orange adapter, but it does not store or request your TV Go credentials.
- iptv-org/epg: active scrapers for `pickx.be`, `mon-programme-tv.be`, `vrt.be`, and `vtm.be`. You can generate XMLTV with that project and mount the result into `/data`.
- epg.pw: public all-in-one XMLTV feed at `https://epg.pw/xmltv/epg.xml.gz`. It is large, so the app filters it down to your configured Belgian channel names.
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
