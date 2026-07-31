# doc-extractor

Lightweight Docker service to extract clean text from PDFs. Prevents context overflow when working with local LLMs. Browser UI + REST API. Built with FastAPI and pypdf.

→ [Deutsche Version](README_DE.md)

## Motivation

Local LLMs with limited VRAM (e.g. 16 GB) have tight context limits. Uploading a PDF directly into a chat interface (e.g. the llama.cpp server UI) dumps raw binary data into the context and quickly blows the limit. This service extracts plain text first — the LLM only receives what it actually needs.

## Browser UI

Open in your browser after starting: **`http://localhost:7643`**

- Select a PDF via drag & drop or click
- Click "Extract" → text and metadata appear
- Choose output format: **Plaintext** or **Markdown** (with metadata header)
- Copy to clipboard or save as `.txt` / `.md`

## Requirements

- Docker + Docker Compose

## Start

```bash
docker-compose -f docker-compose-extractor.yml up -d --build
```

## API

**Port:** `7643`

### `GET /health`
```json
{"status": "ok"}
```

### `GET /formats`
```json
{"supported": ["pdf"]}
```

### `POST /extract`
Upload a PDF, receive extracted text and metadata.

```bash
curl -X POST http://localhost:7643/extract \
  -F "file=@document.pdf"
```

Response:
```json
{
  "filename": "document.pdf",
  "pages": 12,
  "chars": 24800,
  "estimated_tokens": 6200,
  "text": "..."
}
```

Text only:
```bash
curl -s -X POST http://localhost:7643/extract \
  -F "file=@document.pdf" | jq -r .text
```

### Usage with Claude Code

```bash
! curl -s -X POST http://localhost:7643/extract -F "file=@doc.pdf" | jq -r .text
```

Paste the returned text directly as context into your next prompt.

## Logs & Management

```bash
docker-compose -f docker-compose-extractor.yml logs -f
docker-compose -f docker-compose-extractor.yml down
```

## Planned / Roadmap

- **MCP server integration**: expose `/extract` as a native tool for Claude Code — no curl needed
- **DOCX support** via `python-docx`
- **Chunking endpoint** `/chunk?max_tokens=N` for controlled context sizing on long documents
