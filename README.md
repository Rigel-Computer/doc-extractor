# doc-extractor

Eigenständiger Mikro-Service zur Text-Extraktion aus Dokumenten. Läuft als Docker-Container, unabhängig vom lokalen LLM-Setup.

## Motivation

Lokale LLMs mit begrenztem VRAM (z.B. 16 GB) haben enge Kontext-Limits. Wird ein PDF direkt in ein Chat-Interface hochgeladen (z.B. das llama.cpp-Server-UI), landet der Rohdaten-Dump im Kontext und sprengt das Limit schnell. Dieser Service extrahiert zuerst den Reintext — das LLM bekommt nur was es wirklich braucht.

## Voraussetzungen

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
PDF hochladen, Text + Metadaten erhalten.

```bash
curl -X POST http://localhost:7643/extract \
  -F "file=@dokument.pdf"
```

Antwort:
```json
{
  "filename": "dokument.pdf",
  "pages": 12,
  "chars": 24800,
  "estimated_tokens": 6200,
  "text": "..."
}
```

Nur den Text ausgeben:
```bash
curl -s -X POST http://localhost:7643/extract \
  -F "file=@dokument.pdf" | jq -r .text
```

### Nutzung mit Claude Code

```bash
! curl -s -X POST http://localhost:7643/extract -F "file=@doc.pdf" | jq -r .text
```

Den zurückgegebenen Text direkt als Kontext in den nächsten Prompt einfügen.

## Logs & Management

```bash
docker-compose -f docker-compose-extractor.yml logs -f
docker-compose -f docker-compose-extractor.yml down
```

## Geplante Erweiterungen

- **MCP-Server-Integration**: doc_extractor als MCP-Endpoint, damit Claude Code `/extract` als natives Tool aufrufen kann — ohne curl, direkt im Conversation-Flow
- **DOCX-Support** via `python-docx`
- **Chunking-Endpoint** `/chunk?max_tokens=N` für kontrollierte Kontextdosierung bei sehr langen Dokumenten
