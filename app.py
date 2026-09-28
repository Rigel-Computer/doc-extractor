import io
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "20")) * 1024 * 1024

app = FastAPI(title="doc-extractor", version="1.0.0")


def doc_date(reader: PdfReader, mtime_ms: str = "") -> str:
    """Datum des Dokuments als dd.mm.yyyy.

    Kaskade, weil keine Quelle allein zuverlaessig ist:
    1. /CreationDate aus den PDF-Metadaten – bei erzeugten PDFs (Warenwirtschaft,
       Rechnungsprogramm) praktisch das Belegdatum. Fehlt bei vielen Scans.
    2. Dateidatum vom Rechner des Users. Der Server sieht es nicht – beim Upload
       kommen nur Bytes und Dateiname an –, das Frontend schickt es als Millisekunden mit.
    3. Heute, damit immer ein Praefix entsteht.
    """
    d = None
    try:
        meta = reader.metadata
        if meta is not None:
            d = meta.creation_date
    except Exception:
        d = None

    # Manche Scanner schreiben Default-Werte (1904, 1970) in die Metadaten
    if d is not None and not (1990 <= d.year <= datetime.now().year + 1):
        d = None

    if d is None and mtime_ms:
        try:
            d = datetime.fromtimestamp(int(float(mtime_ms)) / 1000)
        except (ValueError, OSError, OverflowError):
            d = None

    return (d or datetime.now()).strftime("%d.%m.%Y")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/formats")
def formats():
    return {"supported": ["pdf"]}


@app.post("/extract")
async def extract(file: UploadFile = File(...), mtime: str = Form("")):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Nur PDF unterstützt")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)")
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF ungültig: {e}")

    parts = [p.extract_text() for p in reader.pages if p.extract_text()]
    text = "\n\n".join(parts)

    return {
        "filename": file.filename,
        "doc_date": doc_date(reader, mtime),
        "pages": len(reader.pages),
        "chars": len(text),
        "estimated_tokens": len(text) // 4,
        "text": text,
    }


@app.post("/batch")
async def batch_extract(
    session: str = Form("default"),
    prefix_date: bool = Form(False),
    mtimes: List[str] = Form(default=[]),
    files: List[UploadFile] = File(...),
):
    session_slug = re.sub(r'[^\w\-]', '-', session).strip('-')[:64] or 'default'
    batch_originals = Path(f"frontend/batch/{session_slug}/originals")
    batch_results   = Path(f"frontend/batch/{session_slug}/results")
    batch_originals.mkdir(parents=True, exist_ok=True)
    batch_results.mkdir(parents=True, exist_ok=True)

    results = []
    for idx, file in enumerate(files):
        filename = file.filename or "unknown.pdf"
        mtime = mtimes[idx] if idx < len(mtimes) else ""

        if not filename.lower().endswith(".pdf"):
            results.append({"filename": filename, "status": "skipped", "reason": "not a pdf"})
            continue

        original_path = batch_originals / filename
        if original_path.exists():
            results.append({"filename": filename, "status": "skipped", "reason": "already processed"})
            continue

        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            results.append({"filename": filename, "status": "error", "reason": f"too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)"})
            continue

        try:
            reader = PdfReader(io.BytesIO(data))
        except Exception as e:
            results.append({"filename": filename, "status": "error", "reason": str(e)})
            continue

        parts = [p.extract_text() for p in reader.pages if p.extract_text()]
        text = "\n\n".join(parts)
        pages = len(reader.pages)
        chars = len(text)
        tokens = chars // 4

        original_path.write_bytes(data)

        # Original behaelt seinen Namen – er ist der Schluessel fuer die Dubletten-
        # Pruefung oben. Nur der Extrakt bekommt das Datum vorangestellt.
        stem = Path(filename).stem
        if prefix_date:
            stem = f"{doc_date(reader, mtime)}_{stem}"

        md = (
            f"**Document:** {filename}  \n"
            f"**Pages:** {pages} · **Characters:** {chars:,} · **~Tokens:** {tokens:,}\n\n---\n\n"
            f"{text}"
        )
        (batch_results / f"{stem}.md").write_text(md, encoding="utf-8")

        results.append({
            "filename": filename,
            "output": f"{stem}.md",
            "status": "processed",
            "pages": pages,
            "chars": chars,
            "estimated_tokens": tokens,
        })

    return {"results": results}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
