const TRANSLATIONS = {
    en: {
        dropLabel:             'Drop PDFs here or click',
        batchBtn:              'Process all',
        processing:            'Processing…',
        navSingle:             '← Single',
        colFile:               'File',
        colStatus:             'Status',
        colPages:              'Pages',
        colChars:              'Characters',
        statusProcessed:       'done',
        statusSkipped:         'skipped',
        statusError:           'error',
        errConn:               'Connection error',
        langSwitch:            'Deutsch',
        lastSession:           'Last session',
        resumeBtn:             'Continue →',
        newSessionBtn:         'New session',
        newSessionHeading:     'New session',
        newSessionHint:        'Give this task a name before you start.',
        newSessionLabel:       'Session name',
        newSessionPlaceholder: 'e.g. Invoices-Q1-2026',
        startSessionBtn:       'Start',
        currentSession:        'Session',
        switchSession:         'Change',
        prevSessions:          'Previous sessions',
        openSession:           'Open',
        started:               'Started',
        lastUsed:              'Last used',
    },
    de: {
        dropLabel:             'PDFs hier ablegen oder klicken',
        batchBtn:              'Alle verarbeiten',
        processing:            'Wird verarbeitet…',
        navSingle:             '← Einzeln',
        colFile:               'Datei',
        colStatus:             'Status',
        colPages:              'Seiten',
        colChars:              'Zeichen',
        statusProcessed:       'fertig',
        statusSkipped:         'übersprungen',
        statusError:           'Fehler',
        errConn:               'Verbindungsfehler',
        langSwitch:            'English',
        lastSession:           'Letzte Sitzung',
        resumeBtn:             'Weiter →',
        newSessionBtn:         'Neue Sitzung',
        newSessionHeading:     'Neue Sitzung',
        newSessionHint:        'Gib dieser Aufgabe einen Namen, bevor du startest.',
        newSessionLabel:       'Sitzungsname',
        newSessionPlaceholder: 'z.B. Rechnungen-Q1-2026',
        startSessionBtn:       'Starten',
        currentSession:        'Sitzung',
        switchSession:         'Wechseln',
        prevSessions:          'Frühere Sitzungen',
        openSession:           'Öffnen',
        started:               'Begonnen',
        lastUsed:              'Zuletzt',
    },
};

const LS_CURRENT  = 'docExtractorCurrentSession';
const LS_SESSIONS = 'docExtractorSessions';

let currentLang    = localStorage.getItem('lang') || 'en';
let selectedFiles  = [];
let currentSession = null;
let screenMode     = null;  // 'resume' | 'new'

function t(key) { return TRANSLATIONS[currentLang][key] || key; }

function todayDate() { return new Date().toISOString().slice(0, 10); }

function fileCountText(n) {
    if (currentLang === 'de') return n === 1 ? '1 Datei ausgewählt' : `${n} Dateien ausgewählt`;
    return n === 1 ? '1 file selected' : `${n} files selected`;
}

// --- localStorage helpers ---

function getStoredSessions() {
    try { return JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]'); }
    catch { return []; }
}

function persistSession(name) {
    const sessions = getStoredSessions();
    const today    = todayDate();
    const idx      = sessions.findIndex(s => s.name === name);
    if (idx >= 0) {
        sessions[idx].lastUsed = today;
        const [s] = sessions.splice(idx, 1);
        sessions.unshift(s);
    } else {
        sessions.unshift({ name, started: today, lastUsed: today });
    }
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(LS_CURRENT, name);
}

// --- Session UI ---

function activateSession(name) {
    currentSession = name;
    persistSession(name);

    document.getElementById('sessionScreen').classList.add('hidden');
    document.getElementById('activeSessionBar').classList.remove('hidden');
    document.getElementById('activeSessionName').textContent = name;
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('resultsPanel').classList.add('hidden');
    selectedFiles = [];
}

function showSessionScreen(forceNewMode) {
    currentSession = null;
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('activeSessionBar').classList.add('hidden');
    document.getElementById('resultsPanel').classList.add('hidden');
    document.getElementById('sessionScreen').classList.remove('hidden');

    const sessions = getStoredSessions();

    if (!forceNewMode && sessions.length > 0) {
        screenMode = 'resume';
        document.getElementById('resumePanel').classList.remove('hidden');
        document.getElementById('newSessionPanel').classList.add('hidden');
        fillResumeCard(sessions[0]);
    } else {
        screenMode = 'new';
        document.getElementById('resumePanel').classList.add('hidden');
        document.getElementById('newSessionPanel').classList.remove('hidden');
        document.getElementById('sessionNameInput').value = todayDate();
        const prevPanel = document.getElementById('prevSessionsPanel');
        if (sessions.length > 0) {
            prevPanel.classList.remove('hidden');
            renderPrevSessions(sessions);
        } else {
            prevPanel.classList.add('hidden');
        }
    }
}

function fillResumeCard(session) {
    document.getElementById('resumeSessionName').textContent = session.name;
    document.getElementById('resumeSessionMeta').textContent =
        `${t('started')}: ${session.started} · ${t('lastUsed')}: ${session.lastUsed}`;
}

function renderPrevSessions(sessions) {
    const list = document.getElementById('prevSessionsList');
    list.innerHTML = '';
    sessions.forEach(s => {
        const li       = document.createElement('li');
        li.className   = 'session-history-item';

        const nameSpan = document.createElement('span');
        nameSpan.className   = 'session-history-name';
        nameSpan.textContent = s.name;

        const metaSpan = document.createElement('span');
        metaSpan.className   = 'session-history-meta';
        metaSpan.textContent = `${s.started} – ${s.lastUsed}`;

        const openBtn = document.createElement('button');
        openBtn.className   = 'btn-link';
        openBtn.textContent = t('openSession');
        openBtn.addEventListener('click', () => activateSession(s.name));

        li.append(nameSpan, metaSpan, openBtn);
        list.appendChild(li);
    });
}

// --- Language ---

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.getElementById('langBtn').textContent     = t('langSwitch');
    document.getElementById('navSingleBtn').textContent = t('navSingle');

    if (screenMode === 'resume') {
        const sessions = getStoredSessions();
        if (sessions.length > 0) fillResumeCard(sessions[0]);
    } else if (screenMode === 'new') {
        const sessions = getStoredSessions();
        if (sessions.length > 0) renderPrevSessions(sessions);
    }

    if (selectedFiles.length > 0) {
        document.getElementById('fileCount').textContent = fileCountText(selectedFiles.length);
    }
}

// --- Events ---

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    setupDropZone();

    document.getElementById('batchBtn').addEventListener('click', runBatch);
    document.getElementById('langBtn').addEventListener('click', () => {
        applyLanguage(currentLang === 'en' ? 'de' : 'en');
    });
    document.getElementById('resumeBtn').addEventListener('click', () => {
        const sessions = getStoredSessions();
        if (sessions.length > 0) activateSession(sessions[0].name);
    });
    document.getElementById('toNewSessionBtn').addEventListener('click', () => {
        showSessionScreen(true);
    });
    document.getElementById('startSessionBtn').addEventListener('click', startNewSession);
    document.getElementById('sessionNameInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') startNewSession();
    });
    document.getElementById('switchSessionBtn').addEventListener('click', e => {
        e.preventDefault();
        showSessionScreen(true);
    });

    showSessionScreen(false);
});

function startNewSession() {
    const name = document.getElementById('sessionNameInput').value.trim();
    if (!name) return;
    activateSession(name);
}

// --- Drop Zone ---

function setupDropZone() {
    const zone  = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files.length > 0) handleFiles(Array.from(input.files));
    });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
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

// --- Batch Run ---

async function runBatch() {
    if (selectedFiles.length === 0 || !currentSession) return;

    const btn     = document.getElementById('batchBtn');
    btn.disabled  = true;
    btn.textContent = t('processing');

    const fd = new FormData();
    fd.append('session', currentSession);
    selectedFiles.forEach(f => fd.append('files', f));

    try {
        const r    = await fetch('/batch', { method: 'POST', body: fd });
        const data = await r.json();

        if (!r.ok) { showToast(data.detail || t('errConn'), 'error'); return; }

        persistSession(currentSession);
        renderResults(data.results);
        document.getElementById('resultsPanel').classList.remove('hidden');
    } catch {
        showToast(t('errConn'), 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = t('batchBtn');
    }
}

// --- Results ---

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

// --- Toast ---

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className   = 'toast ' + (type || '');
    setTimeout(() => { toast.className = 'toast hidden'; }, 3500);
}
