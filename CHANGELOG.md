# Changelog

Alle relevanten Änderungen an diesem Projekt werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.0.0] – 2026-07-30

Initiales Release.

### Added

- **Browser-UI** unter `http://localhost:7643`: PDF per Drag & Drop oder Klick hochladen, Text extrahieren, kopieren oder als Datei speichern
- **Ausgabeformat-Auswahl**: Plaintext oder Markdown (mit Metadaten-Header: Dateiname, Seiten, Zeichen, ~Tokens)
- **REST-API** für programmatischen Zugriff:
  - `POST /extract` — PDF hochladen, Text + Metadaten als JSON zurückerhalten
  - `GET /health` — Liveness-Check
  - `GET /formats` — Unterstützte Dateiformate
- **Eigenständiger Docker-Container** (`doc-extractor:latest`) mit eigener `docker-compose-extractor.yml` — unabhängig von anderen Services startbar
- Nutzbar von jedem HTTP-Client: Browser, curl, Claude Code, OpenCode u.a.

### Geplant / Roadmap

- MCP-Server-Integration (Claude Code Tool-Aufruf ohne curl)
- DOCX-Support
- Chunking-Endpoint `/chunk?max_tokens=N`
