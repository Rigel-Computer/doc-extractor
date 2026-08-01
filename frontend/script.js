const TRANSLATIONS = {
    en: {
        dropLabel:   'Drop PDF here or click',
        extractBtn:  'Extract',
        extracting:  'Processing…',
        formatLabel: 'Output format:',
        copyBtn:     'Copy to clipboard',
        downloadBtn: 'Save',
        statsPages:  'pages',
        statsChars:  'characters',
        statsTokens: 'tokens',
        mdDocument:  'Document',
        mdPages:     'Pages',
        mdChars:     'Characters',
        mdTokens:    'Tokens',
        copied:      '✓ Copied',
        errFile:     'Only PDF files are supported',
        errConn:     'Connection error',
        errExtract:  'Extraction failed',
        langSwitch:  'Deutsch',
    },
    de: {
        dropLabel:   'PDF hier ablegen oder klicken',
        extractBtn:  'Extrahieren',
        extracting:  'Wird verarbeitet…',
        formatLabel: 'Ausgabeformat:',
        copyBtn:     'In Zwischenablage',
        downloadBtn: 'Speichern',
        statsPages:  'Seiten',
        statsChars:  'Zeichen',
        statsTokens: 'Tokens',
        mdDocument:  'Dokument',
        mdPages:     'Seiten',
        mdChars:     'Zeichen',
        mdTokens:    'Tokens',
        copied:      '✓ Kopiert',
        errFile:     'Nur PDF-Dateien werden unterstützt',
        errConn:     'Verbindungsfehler',
        errExtract:  'Fehler beim Extrahieren',
        langSwitch:  'English',
    },
};

let currentLang = localStorage.getItem('lang') || 'en';
let rawText = '';
let extractedMeta = {};

function t(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    document.getElementById('langBtn').textContent = t('langSwitch');

    if (extractedMeta.pages !== undefined) {
        updateStatsLine();
    }
}

function updateStatsLine() {
    const locale = currentLang === 'de' ? 'de' : 'en';
    document.getElementById('statsLine').textContent =
        `${extractedMeta.pages} ${t('statsPages')} · ` +
        `${extractedMeta.chars.toLocaleString(locale)} ${t('statsChars')} · ` +
        `~${extractedMeta.tokens.toLocaleString(locale)} ${t('statsTokens')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    setupDropZone();
    document.getElementById('extractBtn').addEventListener('click', extractPdf);
    document.getElementById('formatSelect').addEventListener('change', renderOutput);
    document.getElementById('copyBtn').addEventListener('click', copyText);
    document.getElementById('downloadBtn').addEventListener('click', downloadFile);
    document.getElementById('langBtn').addEventListener('click', () => {
        applyLanguage(currentLang === 'en' ? 'de' : 'en');
    });
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
        showToast(t('errFile'), 'error');
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
    btn.textContent = t('extracting');

    try {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/extract', { method: 'POST', body: fd });
        const data = await r.json();

        if (!r.ok) {
            showToast(data.detail || t('errExtract'), 'error');
            return;
        }

        rawText = data.text;
        extractedMeta = {
            filename: data.filename,
            pages: data.pages,
            chars: data.chars,
            tokens: data.estimated_tokens,
        };

        updateStatsLine();
        document.getElementById('resultPanel').classList.remove('hidden');
        renderOutput();
    } catch (e) {
        showToast(t('errConn'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = t('extractBtn');
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
        const locale = currentLang === 'de' ? 'de' : 'en';
        const header =
            `**${t('mdDocument')}:** ${filename}  \n` +
            `**${t('mdPages')}:** ${pages} · ` +
            `**${t('mdChars')}:** ${chars.toLocaleString(locale)} · ` +
            `**~${t('mdTokens')}:** ${tokens.toLocaleString(locale)}\n\n---\n\n`;
        return header + rawText;
    }
    return rawText;
}

// --- Actions ---

async function copyText() {
    const text = document.getElementById('outputText').value;
    await navigator.clipboard.writeText(text);
    const fb = document.getElementById('copyFeedback');
    fb.textContent = t('copied');
    setTimeout(() => { fb.textContent = ''; }, 2000);
}

function downloadFile() {
    const format = document.getElementById('formatSelect').value;
    const text = formatText(format);
    const ext = format === 'markdown' ? 'md' : 'txt';
    const base = (extractedMeta.filename || 'extract').replace(/\.pdf$/i, '');
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
