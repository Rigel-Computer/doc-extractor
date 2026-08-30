import io
import os
import re
from pathlib import Path
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "20")) * 1024 * 1024

app = FastAPI(title="doc-extractor", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/formats")
def formats():
    return {"supported": ["pdf"]}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
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
        "pages": len(reader.pages),
        "chars": len(text),
        "estimated_tokens": len(text) // 4,
        "text": text,
    }


@app.post("/batch")
async def batch_extract(session: str = Form("default"), files: List[UploadFile] = File(...)):
    session_slug = re.sub(r'[^\w\-]', '-', session).strip('-')[:64] or 'default'
    batch_originals = Path(f"frontend/batch/{session_slug}/originals")
    batch_results   = Path(f"frontend/batch/{session_slug}/results")
    batch_originals.mkdir(parents=True, exist_ok=True)
    batch_results.mkdir(parents=True, exist_ok=True)

    results = []
    for file in files:
        filename = file.filename or "unknown.pdf"

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

        stem = Path(filename).stem
        md = (
            f"**Document:** {filename}  \n"
            f"**Pages:** {pages} · **Characters:** {chars:,} · **~Tokens:** {tokens:,}\n\n---\n\n"
            f"{text}"
        )
        (batch_results / f"{stem}.md").write_text(md, encoding="utf-8")

        results.append({
            "filename": filename,
            "status": "processed",
            "pages": pages,
            "chars": chars,
            "estimated_tokens": tokens,
        })

    return {"results": results}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
