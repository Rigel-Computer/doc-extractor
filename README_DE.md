# doc-extractor

Eigenständiger Mikro-Service zur Text-Extraktion aus Dokumenten. Läuft als Docker-Container, unabhängig vom lokalen LLM-Setup.

## Motivation

Lokale LLMs mit begrenztem VRAM (z.B. 16 GB) haben enge Kontext-Limits. Wird ein PDF direkt in ein Chat-Interface hochgeladen (z.B. das llama.cpp-Server-UI), landet der Rohdaten-Dump im Kontext und sprengt das Limit schnell. Dieser Service extrahiert zuerst den Reintext — das LLM bekommt nur was es wirklich braucht.

## Browser-UI

Nach dem Start direkt im Browser öffnen: **`http://localhost:7643`**

- PDF per Drag & Drop oder Klick auswählen
- „Extrahieren" → Text + Metadaten erscheinen
- Ausgabeformat wählen: **Plaintext** oder **Markdown** (mit Metadaten-Header)
- „In Zwischenablage" oder „Speichern" (.txt / .md)

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

## Konfiguration

Das Upload-Größenlimit lässt sich per Umgebungsvariable in der `docker-compose-extractor.yml` anpassen:

```yaml
environment:
  - MAX_UPLOAD_MB=20   # Standard: 20 MB
```

Einfach erhöhen, wenn regelmäßig größere Dokumente verarbeitet werden.

## Sicherheitshinweise

- **Netzwerk-Exposition**: Der Service bindet auf `0.0.0.0` — er ist im lokalen Netzwerk erreichbar, nicht nur auf `localhost`. In gemeinsam genutzten Netzwerken (Büro, WLAN) kann jeder im gleichen Netz Port 7643 ansprechen. Keine Authentifizierung by design (lokales Tool). Bei Bedarf per Firewall absichern oder in der Compose-Datei auf `127.0.0.1` beschränken.
- **Keine Credentials**: Es werden keine sensiblen Daten gespeichert oder übertragen.
- **Kein Shell-Zugriff**: pypdf ist reines Python — kein Risiko durch nativen Code.

## Geplante Erweiterungen

- **MCP-Server-Integration**: doc_extractor als MCP-Endpoint, damit Claude Code `/extract` als natives Tool aufrufen kann — ohne curl, direkt im Conversation-Flow
- **DOCX-Support** via `python-docx`
- **Chunking-Endpoint** `/chunk?max_tokens=N` für kontrollierte Kontextdosierung bei sehr langen Dokumenten
