let rawText = '';
let extractedMeta = {};

document.addEventListener('DOMContentLoaded', () => {
    setupDropZone();
    document.getElementById('extractBtn').addEventListener('click', extractPdf);
    document.getElementById('formatSelect').addEventListener('change', renderOutput);
    document.getElementById('copyBtn').addEventListener('click', copyText);
    document.getElementById('downloadBtn').addEventListener('click', downloadFile);
});

// --- Drop Zone ---

function setupDropZone() {
    const zone = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files[0]) handleFile(input.files[0]);
    });

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Nur PDF-Dateien werden unterstützt', 'error');
        return;
    }
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('fileInfo')._file = file;
    document.getElementById('resultPanel').classList.add('hidden');
}

// --- Extraction ---

async function extractPdf() {
    const fileInfo = document.getElementById('fileInfo');
    const file = fileInfo._file;
    if (!file) return;

    const btn = document.getElementById('extractBtn');
    btn.disabled = true;
    btn.textContent = 'Wird verarbeitet…';

    try {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/extract', { method: 'POST', body: fd });
        const data = await r.json();

        if (!r.ok) {
            showToast(data.detail || 'Fehler beim Extrahieren', 'error');
            return;
        }

        rawText = data.text;
        extractedMeta = {
            filename: data.filename,
            pages: data.pages,
            chars: data.chars,
            tokens: data.estimated_tokens,
        };

        document.getElementById('statsLine').textContent =
            `${data.filename} · ${data.pages} Seiten · ${data.chars.toLocaleString('de')} Zeichen · ~${data.tokens.toLocaleString('de')} Tokens`;

        document.getElementById('resultPanel').classList.remove('hidden');
        renderOutput();
    } catch (e) {
        showToast('Verbindungsfehler', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Extrahieren';
    }
}

// --- Output Formatting ---

function renderOutput() {
    const format = document.getElementById('formatSelect').value;
    document.getElementById('outputText').value = formatText(format);
}

function formatText(format) {
    if (format === 'markdown') {
        const { filename, pages, chars, tokens } = extractedMeta;
        const header = `**Dokument:** ${filename}  \n**Seiten:** ${pages} · **Zeichen:** ${chars.toLocaleString('de')} · **~Tokens:** ${tokens.toLocaleString('de')}\n\n---\n\n`;
        return header + rawText;
    }
    return rawText;
}

// --- Actions ---

async function copyText() {
    const text = document.getElementById('outputText').value;
    await navigator.clipboard.writeText(text);
    const fb = document.getElementById('copyFeedback');
    fb.textContent = '✓ Kopiert';
    setTimeout(() => { fb.textContent = ''; }, 2000);
}

function downloadFile() {
    const format = document.getElementById('formatSelect').value;
    const text = formatText(format);
    const ext = format === 'markdown' ? 'md' : 'txt';
    const base = (extractedMeta.filename || 'extrakt').replace(/\.pdf$/i, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- Toast ---

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '');
    setTimeout(() => { toast.className = 'toast hidden'; }, 3500);
}
