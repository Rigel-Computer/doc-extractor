# doc-extractor

Lightweight Docker service to extract clean text from PDFs. Prevents context overflow when working with local LLMs. Browser UI + REST API. Built with FastAPI and pypdf.

→ [Deutsche Version](README_DE.md)

## Motivation

Local LLMs with limited VRAM (e.g. 16 GB) have tight context limits. Uploading a PDF directly into a chat interface (e.g. the llama.cpp server UI) dumps raw binary data into the context and quickly blows the limit. This service extracts plain text first - the LLM only receives what it actually needs.

## Browser UI

Open in your browser after starting: **`http://localhost:7643`**

**Single mode** (default):
- Select a PDF via drag & drop or click
- Click "Extract" → text and metadata appear
- Choose output format: **Plaintext** or **Markdown** (with metadata header)
- Copy to clipboard or save as `.txt` / `.md`

**Batch mode** - click "Batch" in the top-right corner, or go to `http://localhost:7643/batch.html`:
- Drop multiple PDFs at once
- Click "Process all" → each PDF is extracted and saved as `.md`
- Originals are stored in `frontend/batch/originals/` - already-processed files are automatically skipped on re-run
- Extracts land in `frontend/batch/results/` - ready to feed into a local LLM

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

### `POST /batch`
Upload multiple PDFs, extract all, save results to disk.

```bash
curl -X POST http://localhost:7643/batch \
  -F "files=@invoice1.pdf" \
  -F "files=@invoice2.pdf"
```

Response:
```json
{
  "results": [
    {"filename": "invoice1.pdf", "status": "processed", "pages": 2, "chars": 3400, "estimated_tokens": 850},
    {"filename": "invoice2.pdf", "status": "skipped", "reason": "already processed"}
  ]
}
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

## Configuration

The upload size limit can be adjusted via environment variable in `docker-compose-extractor.yml`:

```yaml
environment:
  - MAX_UPLOAD_MB=20   # default: 20 MB
```

Set higher if you regularly work with large documents.

## Security Notes

- **Network exposure**: The service binds to `0.0.0.0` - it is reachable from your local network, not just `localhost`. On shared or office networks, anyone on the same network can access port 7643. No authentication is in place by design (local tool). If needed, restrict access via firewall or bind to `127.0.0.1` in the compose file.
- **No credentials**: Nothing sensitive is stored or transmitted.
- **No shell access**: pypdf is pure Python - no native code execution risk.

## Planned / Roadmap

- **MCP server integration**: expose `/extract` as a native tool for Claude Code - no curl needed
- **DOCX support** via `python-docx`
- **Chunking endpoint** `/chunk?max_tokens=N` for controlled context sizing on long documents
- **LLM matching**: feed batch results + bank CSV into a local LLM to generate structured output (e.g. for tax accounting)
