const TRANSLATIONS = {
    en: {
        dropLabel:       'Drop PDFs here or click',
        batchBtn:        'Process all',
        processing:      'Processing…',
        navSingle:       '← Single',
        colFile:         'File',
        colStatus:       'Status',
        colPages:        'Pages',
        colChars:        'Characters',
        statusProcessed: 'done',
        statusSkipped:   'skipped',
        statusError:     'error',
        errConn:         'Connection error',
        langSwitch:      'Deutsch',
    },
    de: {
        dropLabel:       'PDFs hier ablegen oder klicken',
        batchBtn:        'Alle verarbeiten',
        processing:      'Wird verarbeitet…',
        navSingle:       '← Einzeln',
        colFile:         'Datei',
        colStatus:       'Status',
        colPages:        'Seiten',
        colChars:        'Zeichen',
        statusProcessed: 'fertig',
        statusSkipped:   'übersprungen',
        statusError:     'Fehler',
        errConn:         'Verbindungsfehler',
        langSwitch:      'English',
    },
};

let currentLang = localStorage.getItem('lang') || 'en';
let selectedFiles = [];

function t(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

function fileCountText(n) {
    if (currentLang === 'de') {
        return n === 1 ? '1 Datei ausgewählt' : `${n} Dateien ausgewählt`;
    }
    return n === 1 ? '1 file selected' : `${n} files selected`;
}

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.getElementById('langBtn').textContent = t('langSwitch');
    document.getElementById('navSingleBtn').textContent = t('navSingle');
    if (selectedFiles.length > 0) {
        document.getElementById('fileCount').textContent = fileCountText(selectedFiles.length);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    setupDropZone();
    document.getElementById('batchBtn').addEventListener('click', runBatch);
    document.getElementById('langBtn').addEventListener('click', () => {
        applyLanguage(currentLang === 'en' ? 'de' : 'en');
    });
});

function setupDropZone() {
    const zone = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files.length > 0) handleFiles(Array.from(input.files));
    });

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (files.length > 0) handleFiles(files);
    });
}

function handleFiles(files) {
    selectedFiles = files;
    document.getElementById('fileCount').textContent = fileCountText(files.length);
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('resultsPanel').classList.add('hidden');
}

async function runBatch() {
    if (selectedFiles.length === 0) return;

    const btn = document.getElementById('batchBtn');
    btn.disabled = true;
    btn.textContent = t('processing');

    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));

    try {
        const r = await fetch('/batch', { method: 'POST', body: fd });
        const data = await r.json();

        if (!r.ok) {
            showToast(data.detail || t('errConn'), 'error');
            return;
        }

        renderResults(data.results);
        document.getElementById('resultsPanel').classList.remove('hidden');
    } catch (e) {
        showToast(t('errConn'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = t('batchBtn');
    }
}

function renderResults(results) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    const locale = currentLang === 'de' ? 'de' : 'en';

    results.forEach(r => {
        const statusKey = r.status === 'processed' ? 'statusProcessed'
                        : r.status === 'skipped'   ? 'statusSkipped'
                        : 'statusError';
        const tr = document.createElement('tr');
        tr.innerHTML =
            `<td class="col-file">${r.filename}</td>` +
            `<td class="col-status ${r.status}">${t(statusKey)}</td>` +
            `<td class="col-num">${r.pages !== undefined ? r.pages : '—'}</td>` +
            `<td class="col-num">${r.chars !== undefined ? r.chars.toLocaleString(locale) : '—'}</td>`;
        tbody.appendChild(tr);
    });
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '');
    setTimeout(() => { toast.className = 'toast hidden'; }, 3500);
}
