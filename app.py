import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

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


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
