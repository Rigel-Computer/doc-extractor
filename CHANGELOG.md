# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.7] – 2026-09-28

### Added

- **Date prefix for extracts**: optional `dd.mm.yyyy_` in front of every output file, switched by a "Prepend date" checkbox - available in both Single and Batch mode, preference shared via `localStorage`
- The date is resolved in a cascade: PDF `/CreationDate` → file date from the client → today. Metadata years outside 1990…current+1 are discarded (some scanners write 1904 or 1970 defaults)
- **`POST /batch`** accepts two new form fields: `prefix_date` (bool, default `false`) and `mtimes` (one entry per file, same order as `files`)
- **`POST /extract`** accepts an optional `mtime` form field and returns the resolved `doc_date`
- Batch results carry `output` - the file name actually written to `results/`

### Changed

- Batch result table shows the written file name instead of the uploaded one, so the date prefix is visible right after the run

### Fixed

- Port mapping in `docker-compose-extractor.yml` was `7043:7043` while uvicorn listens on `7643` - the service would have come back unreachable on the next restart. Set back to `7643:7643`.

### Notes

- Originals in `originals/` deliberately keep their uploaded name: it is the key for the duplicate check. Prefixing them would re-process every document as soon as the checkbox is toggled.
- A file's creation date is not visible to the server - an upload carries only bytes and a filename. The browser sends `File.lastModified` along.

---

## [1.0.6] – 2026-08-01

### Added

- **Batch mode** UI at `http://localhost:7643/batch.html`: drop multiple PDFs, extract all in one click
- **`POST /batch`** API endpoint: accepts multiple files, returns per-file status (processed / skipped / error)
- Deduplication: originals saved to `frontend/batch/originals/` - already-processed files are skipped automatically on re-run
- Extracts saved as `.md` to `frontend/batch/results/` - one file per PDF, named after the original
- Navigation link between Single and Batch mode (top-right header, both pages)
- DE/EN language switcher carried over to batch page, shared `localStorage` preference

---

## [1.0.5] – 2026-08-01

### Added

- Upload size limit: default 20 MB, configurable via `MAX_UPLOAD_MB` environment variable in `docker-compose-extractor.yml` - no rebuild required
- Security notes in README (EN + DE): network exposure via `0.0.0.0`, no credentials, no shell access

---

## [1.0.4] – 2026-08-01

### Added

- Language switcher DE/EN: English is default, preference persisted in `localStorage`
- All UI strings centralised in a `TRANSLATIONS` object - single HTML template, texts injected at runtime via `data-i18n` attributes
- Switcher displays only the inactive language as a clickable link (top-right header) - no flags

---

## [1.0.3] – 2026-07-31

### Changed

- Light UI theme: white cards on `#e8ecef` background with subtle shadows
- Storm Cloud color scheme applied: blue-grey `#7a8fa8` as accent (header line, stats, primary button)
- Drop zone visually separated with own background tint
- Buttons now bold (`font-weight: 700`)
- Subtitle text darker and larger for better readability
- CSS rewritten without custom properties - plain hex values throughout

---

## [1.0.2] – 2026-07-31

### Changed

- Project language switched to English: README.md translated, README_DE.md added for German speakers, CHANGELOG.md now in English

---

## [1.0.1] – 2026-07-31

### Fixed

- Stats line showed "connection error" despite server returning 200 OK - caused by `data.tokens` instead of `data.estimated_tokens` in `script.js`

### Changed

- Added volume mounts to `docker-compose-extractor.yml`: `app.py` and `frontend/` are now live-mounted - no rebuild required for code changes

---

## [1.0.0] – 2026-07-30

Initial release.

### Added

- **Browser UI** at `http://localhost:7643`: upload PDF via drag & drop or click, extract text, copy or save as file
- **Output format selector**: Plaintext or Markdown (with metadata header: filename, pages, chars, ~tokens)
- **REST API** for programmatic access:
  - `POST /extract` - upload PDF, receive text + metadata as JSON
  - `GET /health` - liveness check
  - `GET /formats` - supported file formats
- **Standalone Docker container** (`doc-extractor:latest`) with dedicated `docker-compose-extractor.yml` - startable independently of other services
- Usable from any HTTP client: browser, curl, Claude Code, OpenCode, etc.

### Planned / Roadmap

- MCP server integration (native tool call from Claude Code without curl)
- DOCX support
- Chunking endpoint `/chunk?max_tokens=N`
