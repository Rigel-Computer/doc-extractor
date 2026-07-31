# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.3] – 2026-07-31

### Changed

- Light UI theme: white cards on `#e8ecef` background with subtle shadows
- Storm Cloud color scheme applied: blue-grey `#7a8fa8` as accent (header line, stats, primary button)
- Drop zone visually separated with own background tint
- Buttons now bold (`font-weight: 700`)
- Subtitle text darker and larger for better readability
- CSS rewritten without custom properties — plain hex values throughout

---

## [1.0.2] – 2026-07-31

### Changed

- Project language switched to English: README.md translated, README_DE.md added for German speakers, CHANGELOG.md now in English

---

## [1.0.1] – 2026-07-31

### Fixed

- Stats line showed "connection error" despite server returning 200 OK — caused by `data.tokens` instead of `data.estimated_tokens` in `script.js`

### Changed

- Added volume mounts to `docker-compose-extractor.yml`: `app.py` and `frontend/` are now live-mounted — no rebuild required for code changes

---

## [1.0.0] – 2026-07-30

Initial release.

### Added

- **Browser UI** at `http://localhost:7643`: upload PDF via drag & drop or click, extract text, copy or save as file
- **Output format selector**: Plaintext or Markdown (with metadata header: filename, pages, chars, ~tokens)
- **REST API** for programmatic access:
  - `POST /extract` — upload PDF, receive text + metadata as JSON
  - `GET /health` — liveness check
  - `GET /formats` — supported file formats
- **Standalone Docker container** (`doc-extractor:latest`) with dedicated `docker-compose-extractor.yml` — startable independently of other services
- Usable from any HTTP client: browser, curl, Claude Code, OpenCode, etc.

### Planned / Roadmap

- MCP server integration (native tool call from Claude Code without curl)
- DOCX support
- Chunking endpoint `/chunk?max_tokens=N`
