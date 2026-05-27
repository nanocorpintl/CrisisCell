/* CMA Ships — Operational continuity tool (technical & crewing)
 * - Scope: technical availability of vessels (FM),
 *   crew availability (Crewing), shipyard progress (Fleet Upgrade).
 * - Outside scope: safety, security, environment (covered by SSE tool).
 * - Encrypted persistence via CrisisAuth (AES-GCM).
 * - Modules: Watch (DM/DO) · COP · Cases · Vessels · Log
 *   (Duty Log) · Cell · Actions · Frictions · Arbitrations · Look-ahead
 *   (D+1/W+1) · Comms · Contacts · Resources · Risks · Rhythm · Handover
 *   · SITREP CMA Ships · Technical playbooks · AAR · Exercises · Trigger
 *   criteria · Alert templates.
 */
(function () {
  'use strict';

  // ============================================================
  //   ÉTAT
  // ============================================================
  const OLD_KEY = 'crisiscell.cma.v1';
  const IDLE_MS = 15 * 60 * 1000; // 15 min
  let state = null;
  let currentTab = 'cop';
  let saveTimer = null;
  let lastActivity = Date.now();
  let pendingPrefix = null;
  let pendingPrefixTimer = null;

  // ============================================================
  //   HELPERS
  // ============================================================
  function id() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function nowISO() { return new Date().toISOString(); }
  function fmtDTG(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z ${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace('T', ' ').slice(0, 16) + 'Z';
  }
  // Format unifié pour les heures off-hire : entier + " h"
  function fmtH(v) {
    if (v == null || v === '') return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return Math.round(n) + ' h';
  }
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;            // used only with trusted content
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function $(sel) { return document.querySelector(sel); }

  // ============================================================
  //   ÉTAT PAR DÉFAUT
  // ============================================================
  function defaultState() {
    return {
      lang: localStorage.getItem('crisiscell.lang') || 'en',
      // CMA Ships mode: nominal | vigilance | crise (statut VERT/AMBRE/ROUGE)
      // `alert` est conservé comme nom de champ pour rétro-compatibilité.
      alert: 'nominal',
      phase: 'reflex',
      opsPeriod: '',
      sitrepCounter: 0,
      weekNumber: '',
      sitrepContext: '',
      // CMA Ships management
      dutyManager: '',
      dutyOfficers: { FM: '', CR: '', FU: '' },
      deptStatus:   { FM: 'green', CR: 'green', FU: 'green' },
      doLead: 'FM',
      // KPI manuels SITREP
      vesselsPort: 0,
      vesselsTransit: 0,
      // Données métier
      incidents: [],
      vessels: [
        { id: id(), name: 'CMA CGM JACQUES SAADE', imo: '9839179', type: 'ULCV', status: 'normal', position: '', notes: '' },
        { id: id(), name: 'CMA CGM MARCO POLO',    imo: '9454436', type: 'ULCV', status: 'normal', position: '', notes: '' },
        { id: id(), name: 'CMA CGM PALAIS ROYAL',  imo: '9839181', type: 'ULCV', status: 'normal', position: '', notes: '' }
      ],
      mel: [],
      team: [],
      actions: [],
      decisions: [],
      anticipation: [],
      comms: [],
      stakeholders: [
        { id: id(), name: 'MRCC Gris-Nez',    role: 'SAR Coord.',          contact: '+33 3 21 87 21 87', priority: 'P1' },
        { id: id(), name: 'UKMTO Dubai',      role: 'Indian Ocean Security', contact: '+971 4 306 5180',   priority: 'P1' },
        { id: id(), name: 'MDAT-GoG',         role: 'Gulf of Guinea Security', contact: '+33 2 98 22 88 88', priority: 'P1' },
        { id: id(), name: 'P&I Club',         role: 'Insurance',           contact: '24/7 hotline',      priority: 'P1' },
        { id: id(), name: 'Flag State', role: 'Authority',            contact: 'to complete',       priority: 'P1' }
      ],
      resources: [],
      risks: [],
      // Battle rhythm = rituels CMA Ships
      rhythm: [
        { id: id(), time: '08:00', title: 'Departmental SITREPs finalised', cadence: 'Daily',
          desc: 'DO FM/CR/FU finalise their departmental SITREP on the standard template.' },
        { id: id(), time: '08:30', title: 'CMA Ships SITREP consolidated', cadence: 'Daily',
          desc: 'DO lead consolidates and distributes to VP, Heads, DM Marseille. Before 08:30.' },
        { id: id(), time: '09:00', title: 'Daily Stand-up', cadence: 'Daily',
          desc: '15 min strict. Hosted by DM Marseille, 3 DOs Asia in videoconf + Heads (or deputies).' },
        { id: id(), time: '11:00', title: 'Duty Manager handover', cadence: 'Tuesday morning',
          desc: '45 min — formal handover outgoing DM → incoming DM. Weekly rotation.' },
        { id: id(), time: '14:00', title: 'Weekly Operations Review', cadence: 'Thursday',
          desc: '60 min. VP + Heads + DM. Weekly Pack consolidation for Friday Group MM.' },
        { id: id(), time: '18:00', title: 'Weekly Pack consolidated → VP office', cadence: 'Thursday',
          desc: '1 page per department + 1 consolidated. Delivered by 18:00 Marseille at the latest.' },
        { id: id(), time: '08:00', title: 'Group Management Meeting (CMA CGM)', cadence: 'Friday',
          desc: 'VP CMA Ships attends with Weekly Pack + today\'s SITREP in hand.' },
        { id: id(), time: '09:00', title: 'Monthly Business Review', cadence: '1st Tuesday of the month',
          desc: '90 min. Hosted by HoDs, VP present. VP Brief distributed 48h before.' }
      ],
      passations: [],
      sitreps: [],
      playbookState: {},
      retex: [],
      exercises: [],
      watch: { officer: '', assistant: '', startedAt: '' },
      triggerEvents: [],
      // Nouveaux modules CMA Ships
      frictions: [],
      weakSignals: [],
      topMgmtPoints: [],
      // SITREPs départementaux rédigés par les Duty Officers — alimentent
      // automatiquement les 3 blocs département du CMA Ships SITREP consolidated.
      deptSitreps: {
        FM: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' },
        CR: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' },
        FU: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' }
      },
      lastDoDept: 'FM'
    };
  }

  // Purge complète des données métier — préserve le mot de passe et la
  // configuration d'authentification. Démarre sur un état propre,
  // sansvessels ni contacts, prêt pour un nouvel import CSV.
  function purgeAllData() {
    const fresh = defaultState();
    fresh.vessels = [];
    fresh.stakeholders = [];
    state = fresh;
    save();
  }

  // Migration automatique des données antérieures vers le schéma CMA Ships.
  function migrateState() {
    if (!state) return;
    // Status/alerte : ancien 5 niveaux → mode nominal/vigilance/crise
    const map = { green: 'nominal', yellow: 'vigilance', orange: 'vigilance',
                  red: 'crise', black: 'crise',
                  nominal: 'nominal', vigilance: 'vigilance', crise: 'crise' };
    state.alert = map[state.alert] || 'nominal';
    // Champs ajoutés à la volée
    if (!state.dutyOfficers) state.dutyOfficers = { FM: '', CR: '', FU: '' };
    if (!state.deptStatus) state.deptStatus = { FM: 'green', CR: 'green', FU: 'green' };
    if (!state.doLead) state.doLead = 'FM';
    if (state.vesselsPort == null) state.vesselsPort = 0;
    if (state.vesselsTransit == null) state.vesselsTransit = 0;
    if (!state.frictions) state.frictions = [];
    if (!state.weakSignals) state.weakSignals = [];
    if (!state.topMgmtPoints) state.topMgmtPoints = [];
    if (!state.dutyManager) state.dutyManager = '';
    if (!state.weekNumber) state.weekNumber = '';
    if (!state.sitrepContext) state.sitrepContext = '';
    // Drop ancien `posture` (T0/T1/T2) — remplacé par `alert` mode-based
    if (state.posture) delete state.posture;
    if (!state.deptSitreps) {
      state.deptSitreps = {
        FM: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' },
        CR: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' },
        FU: { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' }
      };
    }
    ['FM','CR','FU'].forEach(c => {
      if (!state.deptSitreps[c]) state.deptSitreps[c] = { status: 'green', dossiers: '', deadlines: '', frictions: '', updatedAt: '', updatedBy: '' };
    });
    if (!state.lastDoDept) state.lastDoDept = 'FM';
    // Off-hire : initialiser les champs sur les dossiers existants
    (state.incidents || []).forEach(i => {
      if (i.offhireEstimated == null) i.offhireEstimated = 0;
      if (i.offhireActual == null) i.offhireActual = null;
      if (!i.classification) i.classification = 'INTERNAL';
    });
  }

  // ============================================================
  //   AUTH FLOW
  // ============================================================
  // ============================================================
  //   i18n — bilingual support (English default + French)
  //   Pragmatic: covers tabs, alert select, menu items, key UI labels.
  //   Deeper content (panels, modals, toasts) stays in English for now
  //   — incremental coverage as needed.
  // ============================================================
  const I18N = {
    // Top bar
    'topbar.lang.toggle.en': { en: 'EN', fr: 'FR' },
    'topbar.alert.green':    { en: 'GREEN — Nominal',     fr: 'VERT — Nominal' },
    'topbar.alert.amber':    { en: 'AMBER — Watch',       fr: 'AMBRE — Vigilance' },
    'topbar.alert.red':      { en: 'RED — Crisis',        fr: 'ROUGE — Crise' },
    'topbar.lock.title':     { en: 'Lock (Ctrl+L)',       fr: 'Verrouiller (Ctrl+L)' },
    'topbar.more.title':     { en: 'More',                fr: 'Plus' },
    'topbar.brand.sub':      { en: 'Operational Continuity — Technical & Crewing',
                               fr: 'Continuité opérationnelle — Technique & Équipages' },
    'menu.shortcuts':        { en: '⌨ Shortcuts (?)',     fr: '⌨ Raccourcis (?)' },
    'menu.export':           { en: '⬇ Export',            fr: '⬇ Exporter' },
    'menu.import':           { en: '⬆ Import',            fr: '⬆ Importer' },
    'menu.changepwd':        { en: '🔑 Change password',  fr: '🔑 Changer le mot de passe' },
    'menu.ops':              { en: '📅 OPS Period…',      fr: '📅 OPS Period…' },
    'menu.reset':            { en: '⟲ Reset everything',  fr: '⟲ Tout réinitialiser' },
    // Tabs (primary)
    'tab.veille':            { en: 'Watch',               fr: 'Veille' },
    'tab.cop':               { en: 'COP',                 fr: 'COP' },
    'tab.dosit-fm':          { en: 'My SITREP FM',        fr: 'Mon SITREP FM' },
    'tab.dosit-cr':          { en: 'My SITREP CR',        fr: 'Mon SITREP CR' },
    'tab.dosit-fu':          { en: 'My SITREP FU',        fr: 'Mon SITREP FU' },
    'tab.sitrep':            { en: 'SITREP CMA',          fr: 'SITREP CMA' },
    'tab.incidents':         { en: 'Cases',               fr: 'Dossiers' },
    'tab.vessels':           { en: 'Vessels',             fr: 'Navires' },
    'tab.analyse':           { en: 'Analytics',           fr: 'Analyse' },
    'tab.more':              { en: 'More',                fr: 'Plus' },
    // Tabs (Plus dropdown)
    'tab.mel':               { en: 'Duty Log',            fr: 'Duty Log' },
    'tab.actions':           { en: 'Actions',             fr: 'Actions' },
    'tab.decisions':         { en: 'Arbitrations',        fr: 'Arbitrages' },
    'tab.triggers':          { en: 'Trigger criteria',    fr: 'Critères de déclenchement' },
    'tab.notif':             { en: 'Alert templates',     fr: 'Modèles d\'alerte' },
    'tab.anticipation':      { en: 'Look-ahead',          fr: 'Anticipation' },
    'tab.team':              { en: 'Cell',                fr: 'Cellule' },
    'tab.passation':         { en: 'Watch handover',      fr: 'Passation de quart' },
    'tab.rhythm':            { en: 'Rhythm',              fr: 'Rythme' },
    'tab.comms':             { en: 'Comms',               fr: 'Comms' },
    'tab.stakeholders':      { en: 'Contacts',            fr: 'Contacts' },
    'tab.resources':         { en: 'Resources',           fr: 'Ressources' },
    'tab.risk':              { en: 'Risks',               fr: 'Risques' },
    'tab.playbooks':         { en: 'Playbooks',           fr: 'Playbooks' },
    'tab.retex':             { en: 'AAR',                 fr: 'RETEX' },
    'tab.exercises':         { en: 'Exercises',           fr: 'Exercices' },
    // Footer
    'footer.left':           { en: 'CMA Ships · Operational Continuity · outside SSE scope',
                               fr: 'CMA Ships · Continuité opérationnelle · hors périmètre SSE' },
    'footer.right':          { en: '🔐 Data encrypted locally',
                               fr: '🔐 Données chiffrées localement' },
    'auth.title.sub':        { en: 'Operational Continuity — Technical & Crewing',
                               fr: 'Continuité opérationnelle — Technique & Équipages' }
  };
  function getLang() {
    return (state && state.lang) || localStorage.getItem('crisiscell.lang') || 'en';
  }
  function setLang(l) {
    if (state) state.lang = l;
    localStorage.setItem('crisiscell.lang', l);
    applyLang();
  }
  function t(key) {
    const e = I18N[key];
    if (!e) return key;
    return e[getLang()] || e.en || key;
  }
  function applyLang() {
    const lang = getLang();
    document.documentElement.lang = lang;
    // Top bar
    const sub = document.querySelector('.brand-sub');
    if (sub) sub.textContent = t('topbar.brand.sub');
    const authSub = document.querySelector('.auth-sub');
    if (authSub) authSub.textContent = t('auth.title.sub');
    const sel = $('#alertSelect');
    if (sel && sel.options.length === 3) {
      sel.options[0].textContent = t('topbar.alert.green');
      sel.options[1].textContent = t('topbar.alert.amber');
      sel.options[2].textContent = t('topbar.alert.red');
    }
    const lock = $('#lockBtn'); if (lock) lock.title = t('topbar.lock.title');
    const more = $('#menuBtn'); if (more) more.title = t('topbar.more.title');
    const langBtn = $('#langToggleBtn');
    if (langBtn) langBtn.textContent = lang === 'en' ? 'FR' : 'EN';
    // Menu items
    const map = {
      helpBtn: 'menu.shortcuts', exportData: 'menu.export',
      importData: 'menu.import', changePwdBtn: 'menu.changepwd',
      opsPeriodBtn: 'menu.ops', resetAll: 'menu.reset'
    };
    Object.entries(map).forEach(([id, key]) => {
      const btn = $('#' + id); if (btn) btn.textContent = t(key);
    });
    // Tabs (primary + dropdown)
    document.querySelectorAll('.tab[data-tab], .tab-pop[data-tab]').forEach(b => {
      const key = 'tab.' + b.dataset.tab;
      if (I18N[key]) {
        // Preserve any caret span
        const caret = b.querySelector('.caret');
        b.textContent = t(key);
        if (caret) b.appendChild(document.createTextNode(' ')), b.appendChild(caret);
      }
    });
    const moreBtn = $('#tabMoreBtn');
    if (moreBtn) {
      const caret = moreBtn.querySelector('.caret');
      moreBtn.textContent = t('tab.more') + ' ';
      if (caret) moreBtn.appendChild(caret);
    }
    // Footer
    const fSpans = document.querySelectorAll('.footer span');
    if (fSpans.length >= 1) fSpans[0].textContent = t('footer.left');
    if (fSpans.length >= 2) fSpans[1].textContent = t('footer.right');
  }

  async function init() {
    if (!window.crypto?.subtle) {
      authBody().appendChild(el('div', { class: 'auth-error' },
        'WebCrypto unavailable. Servez ce site via HTTPS ou localhost.'));
      return;
    }
    if (!CrisisAuth.isInitialized()) showSetup();
    else showUnlock();
  }
  function authBody() {
    const body = $('#authBody');
    body.innerHTML = '';
    return body;
  }

  function showSetup() {
    const body = authBody();
    const oldData = localStorage.getItem(OLD_KEY);

    body.appendChild(el('div', { class: 'auth-info' },
      'First use. Set a strong password: it encrypts ALL data locally (AES-GCM 256). No recovery possible if forgotten.'
    ));

    if (oldData) {
      body.appendChild(el('div', { class: 'auth-warn' },
        'Previous data detected (unencrypted). It will be migrated into the vault.'
      ));
    }

    const errBox = el('div');
    const userInput = el('input', { type: 'text', placeholder: 'e.g. DIR jdoe', autocomplete: 'off', maxlength: 64 });
    const pwd1 = el('input', { type: 'password', autocomplete: 'new-password', minlength: 12 });
    const pwd2 = el('input', { type: 'password', autocomplete: 'new-password' });
    const meterBar = el('div', { class: 'pwd-bar' });
    const meterLabel = el('div', { class: 'pwd-label' }, 'Strength: —');
    const submit = el('button', { class: 'auth-btn', type: 'submit' }, 'Initialise vault');

    pwd1.addEventListener('input', () => {
      const score = CrisisAuth.passwordStrength(pwd1.value);
      meterBar.style.width = ((score / 7) * 100) + '%';
      meterBar.style.background = score >= 6 ? '#2ecc71' : score >= 4 ? '#f1c40f' : '#e74c3c';
      meterLabel.textContent = 'Strength: ' + CrisisAuth.strengthLabel(score) + ` (${score}/7)`;
    });

    const form = el('form', { class: 'auth-form', autocomplete: 'off' },
      errBox,
      el('label', {}, 'Your name / position (default author)'),
      userInput,
      el('label', {}, 'Password (≥12 characters, mixed)'),
      pwd1,
      el('div', { class: 'pwd-meter' }, meterBar),
      meterLabel,
      el('label', {}, 'Confirm le mot de passe'),
      pwd2,
      submit
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errBox.innerHTML = '';
      if (!userInput.value.trim()) {
        errBox.appendChild(el('div', { class: 'auth-error' }, 'Provide your name / position.'));
        return;
      }
      if (pwd1.value !== pwd2.value) {
        errBox.appendChild(el('div', { class: 'auth-error' }, 'Passwords do not match.'));
        return;
      }
      submit.disabled = true; submit.textContent = 'Encrypting…';
      try {
        await CrisisAuth.setup(pwd1.value);
        // Migration si données existantes
        if (oldData) {
          try {
            state = Object.assign(defaultState(), JSON.parse(oldData));
            localStorage.removeItem(OLD_KEY);
          } catch { state = defaultState(); }
        } else {
          state = defaultState();
        }
        await CrisisAuth.saveState(state);
        CrisisAuth.setUser(userInput.value.trim());
        boot();
      } catch (e) {
        errBox.appendChild(el('div', { class: 'auth-error' }, e.message));
        submit.disabled = false; submit.textContent = 'Initialise vault';
      }
    });
    body.appendChild(form);
    setTimeout(() => userInput.focus(), 50);
  }

  function showUnlock() {
    document.body.classList.add('locked');
    $('#appShell').hidden = true;
    const body = authBody();
    const lo = CrisisAuth.lockoutInfo();
    if (lo.locked) {
      body.appendChild(el('div', { class: 'auth-error' },
        `Locked due to too many attempts. Try again in ${Math.ceil(lo.remainingMs / 1000)}s.`));
    }
    const errBox = el('div');
    const userInput = el('input', { type: 'text', placeholder: 'Your name / position', autocomplete: 'username',
      value: (CrisisAuth.getUser() || {}).name || '' });
    const pwd = el('input', { type: 'password', autocomplete: 'current-password' });
    const submit = el('button', { class: 'auth-btn', type: 'submit' }, 'Unlock');
    const resetBtn = el('button', { class: 'btn-ghost', type: 'button', style: 'width:100%;margin-top:8px' }, 'Reset vault…');
    resetBtn.addEventListener('click', () => {
      const conf = prompt('Erase everything?? Type DELETE to confirm:');
      if (conf === 'DELETE') {
        CrisisAuth.reset();
        localStorage.removeItem(OLD_KEY);
        showSetup();
      }
    });

    const form = el('form', { class: 'auth-form', autocomplete: 'on' },
      errBox,
      el('label', {}, 'Name / poste'),
      userInput,
      el('label', {}, 'Password'),
      pwd,
      submit,
      resetBtn
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errBox.innerHTML = '';
      submit.disabled = true; submit.textContent = 'Verifying…';
      try {
        await CrisisAuth.unlock(pwd.value);
        CrisisAuth.setUser(userInput.value.trim() || 'Anonyme');
        state = await CrisisAuth.loadState() || defaultState();
        migrateState();
        boot();
      } catch (e) {
        errBox.appendChild(el('div', { class: 'auth-error' }, e.message));
        submit.disabled = false; submit.textContent = 'Unlock';
        pwd.value = ''; pwd.focus();
      }
    });
    body.appendChild(form);
    setTimeout(() => (userInput.value ? pwd : userInput).focus(), 50);
  }

  function boot() {
    document.body.classList.remove('locked');
    $('#appShell').hidden = false;
    $('#authOverlay').style.display = 'none';
    $('#fab').hidden = false;
    bindShell();
    refreshDatalists();
    renderUserChip();
    applyLang();
    setTab(currentTab);
    startIdleWatch();
    tickClocks();
    setInterval(tickClocks, 1000);
  }

  function lockNow(reason) {
    CrisisAuth.lock();
    state = null;
    $('#appShell').hidden = true;
    $('#authOverlay').style.display = '';
    if (reason) toast(reason, 'warn');
    showUnlock();
  }

  // ============================================================
  //   TOPBAR / SHELL
  // ============================================================
  function bindShell() {
    document.querySelectorAll('.tab[data-tab]').forEach(t => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
    });
    // Onglet "Plus ▾" + son popover (détaché du conteneur .tabs pour
    // échapper au clipping overflow-x:auto)
    const moreBtn = $('#tabMoreBtn');
    const morePop = $('#tabMorePop');
    if (moreBtn && morePop) {
      // Move out of .tabs to body
      if (morePop.parentNode !== document.body) document.body.appendChild(morePop);
      morePop.style.position = 'fixed';
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (morePop.hidden) {
          const r = moreBtn.getBoundingClientRect();
          morePop.style.top = (r.bottom + 4) + 'px';
          morePop.style.right = (window.innerWidth - r.right) + 'px';
          morePop.hidden = false;
        } else {
          morePop.hidden = true;
        }
      });
      morePop.querySelectorAll('.tab-pop').forEach(b => {
        b.addEventListener('click', () => { setTab(b.dataset.tab); morePop.hidden = true; });
      });
      document.addEventListener('click', (e) => {
        if (!morePop.hidden && !morePop.contains(e.target) && e.target !== moreBtn && !moreBtn.contains(e.target)) morePop.hidden = true;
      });
    }
    const sel = $('#alertSelect');
    sel.value = state.alert;
    sel.addEventListener('change', () => {
      state.alert = sel.value;
      applyAlertClass();
      logMEL('INFO', `Alert level changed: ${state.alert.toUpperCase()}`);
      save();
      if (currentTab === 'cop') setTab('cop');
    });
    applyAlertClass();
    $('#opsPeriodBtn').addEventListener('click', opsPeriodDialog);
    // Menu déroulant "···"
    $('#menuBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#menuPop');
      pop.hidden = !pop.hidden;
    });
    document.addEventListener('click', (e) => {
      const pop = $('#menuPop');
      if (!pop || pop.hidden) return;
      if (!pop.contains(e.target) && e.target.id !== 'menuBtn') pop.hidden = true;
    });
    // To clic d'un élément du menu, on referme
    $('#menuPop').querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => { $('#menuPop').hidden = true; });
    });
    $('#modalClose').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
    $('#helpBtn').addEventListener('click', () => $('#helpModal').classList.remove('hidden'));
    $('#helpClose').addEventListener('click', () => $('#helpModal').classList.add('hidden'));
    $('#helpModal').addEventListener('click', e => { if (e.target.id === 'helpModal') $('#helpModal').classList.add('hidden'); });
    $('#exportData').addEventListener('click', exportJSON);
    $('#importData').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); });
    $('#changePwdBtn').addEventListener('click', changePasswordDialog);
    $('#lockBtn').addEventListener('click', () => lockNow());
    const langBtn = $('#langToggleBtn');
    if (langBtn) langBtn.addEventListener('click', () => {
      setLang(getLang() === 'en' ? 'fr' : 'en');
      setTab(currentTab);
    });
    $('#resetAll').addEventListener('click', () => {
      const conf = prompt('Erase everything (incl. encrypted vault)? Type DELETE:');
      if (conf === 'DELETE') { CrisisAuth.reset(); location.reload(); }
    });
    // FAB
    $('#fabMain').addEventListener('click', toggleFab);
    document.querySelectorAll('#fabMenu button').forEach(b => {
      b.addEventListener('click', () => { quickAction(b.dataset.quick); toggleFab(false); });
    });
    // Keyboard global
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousemove', () => lastActivity = Date.now());
    document.addEventListener('keypress', () => lastActivity = Date.now());
    document.addEventListener('click', () => lastActivity = Date.now());
  }

  function renderUserChip() {
    const u = CrisisAuth.getUser();
    const chip = $('#userChip');
    if (u) {
      chip.textContent = '👤 ' + u.name;
      chip.classList.add('show');
    } else {
      chip.classList.remove('show');
    }
  }
  function currentUserName() {
    return (CrisisAuth.getUser() || {}).name || '';
  }
  function applyAlertClass() {
    document.body.classList.remove(
      'alert-green','alert-yellow','alert-orange','alert-red','alert-black',
      'alert-nominal','alert-vigilance','alert-crise');
    document.body.classList.add('alert-' + state.alert);
  }
  function tickClocks() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const utc = $('#utcClock'); if (utc) utc.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  }
  function opsPeriodDialog() {
    const inp = el('input', { value: state.opsPeriod || '', placeholder: 'ex. 24H06-24H18' });
    const submit = () => { state.opsPeriod = inp.value.trim(); save(); closeModal(); toast('OPS period updated', 'ok'); };
    openModal('Operational period',
      el('div', { class: 'simple-dialog' },
        el('p', { class: 'muted' }, 'Current OPS Period time window (appears in SITREPs).'),
        inp,
        el('div', { class: 'flex' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   IDLE / LOCK
  // ============================================================
  function startIdleWatch() {
    setInterval(() => {
      if (!CrisisAuth.isUnlocked()) return;
      const idle = Date.now() - lastActivity;
      if (idle > IDLE_MS) lockNow('Automatic lock for inactivity (15 min).');
      else if (idle > IDLE_MS - 60000 && !$('#idleToast')) {
        const t = toast('Lock in 1 min without activity…', 'warn');
        if (t) t.id = 'idleToast';
      }
    }, 30000);
  }

  // ============================================================
  //   PERSISTENCE (chiffrée, debounced)
  // ============================================================
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!CrisisAuth.isUnlocked()) return;
      try { await CrisisAuth.saveState(state); }
      catch (e) { console.error('save failed', e); toast('Save failed: ' + e.message, 'danger'); }
    }, 200);
  }
  async function saveSync() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!CrisisAuth.isUnlocked()) return;
    try { await CrisisAuth.saveState(state); }
    catch (e) { console.error(e); }
  }

  function logMEL(category, text, author) {
    state.mel.unshift({
      id: id(), ts: nowISO(),
      cat: category,
      author: author || currentUserName() || 'System',
      text
    });
    save();
  }

  // ============================================================
  //   TOASTS
  // ============================================================
  function toast(msg, level) {
    const t = el('div', { class: 'toast ' + (level || '') }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
    return t;
  }

  // ============================================================
  //   MODAL
  // ============================================================
  function openModal(title, contentNode, opts) {
    $('#modalTitle').textContent = title;
    const body = $('#modalBody');
    body.innerHTML = '';
    body.appendChild(contentNode);
    $('#modal').classList.remove('hidden');
    // Toto-focus first input
    setTimeout(() => {
      const first = body.querySelector('input, textarea, select');
      if (first) first.focus();
    }, 30);
    // Ctrl+Enter to submit primary action
    body._submitAction = opts && opts.onSubmit;
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  // ============================================================
  //   KEYBOARD SHORTCUTS
  // ============================================================
  function onKeyDown(e) {
    lastActivity = Date.now();
    const inField = ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);

    // Escape ferme la modal
    if (e.key === 'Escape') {
      const helpOpen = !$('#helpModal').classList.contains('hidden');
      const modalOpen = !$('#modal').classList.contains('hidden');
      if (helpOpen) { $('#helpModal').classList.add('hidden'); e.preventDefault(); return; }
      if (modalOpen) { closeModal(); e.preventDefault(); return; }
      const fabOpen = !$('#fabMenu').hidden;
      if (fabOpen) { toggleFab(false); e.preventDefault(); return; }
    }

    // Ctrl+Enter dans une zone de saisie : valider la modal
    if (inField && e.ctrlKey && e.key === 'Enter') {
      const body = $('#modalBody');
      if (body && body._submitAction) {
        e.preventDefault();
        body._submitAction();
      }
      return;
    }

    // Ctrl+L = lock
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault(); lockNow(); return;
    }

    if (inField) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    // Séquence préfixée 'g'
    if (pendingPrefix === 'g') {
      pendingPrefix = null;
      clearTimeout(pendingPrefixTimer);
      const map = {
        c: 'cop', i: 'incidents', v: 'vessels', m: 'mel', t: 'team',
        a: 'actions', d: 'decisions', n: 'anticipation', k: 'comms',
        h: 'stakeholders', u: 'resources', r: 'risk', b: 'rhythm',
        p: 'passation', s: 'sitrep', l: 'playbooks',
        x: 'retex', z: 'exercises',
        w: 'veille', q: 'triggers', f: 'notif',
        y: 'analyse',
        '1': 'dosit-fm', '2': 'dosit-cr', '3': 'dosit-fu'
      };
      const target = map[e.key.toLowerCase()];
      if (target) { setTab(target); e.preventDefault(); }
      return;
    }
    if (e.key === 'g') {
      pendingPrefix = 'g';
      clearTimeout(pendingPrefixTimer);
      pendingPrefixTimer = setTimeout(() => pendingPrefix = null, 1500);
      return;
    }

    // Raccourcis directs
    switch (e.key) {
      case '?': $('#helpModal').classList.remove('hidden'); e.preventDefault(); break;
      case 'l': quickAction('mel'); e.preventDefault(); break;
      case 'a': quickAction('action'); e.preventDefault(); break;
      case 'd': quickAction('decision'); e.preventDefault(); break;
      case 'k': quickAction('comm'); e.preventDefault(); break;
      case 'i': quickAction('incident'); e.preventDefault(); break;
      case 's': setTab('sitrep'); e.preventDefault(); break;
      case 'n': quickNewCurrentTab(); e.preventDefault(); break;
    }
  }
  function quickNewCurrentTab() {
    const map = {
      incidents: 'incident', vessels: 'vessel', actions: 'action',
      decisions: 'decision', comms: 'comm', stakeholders: 'stakeholder',
      resources: 'resource', risk: 'risk', rhythm: 'rhythm',
      team: 'team', passation: 'passation', anticipation: 'anticipation',
      retex: 'retex', exercises: 'exercise', mel: 'mel',
      frictions: 'friction'
    };
    const action = map[currentTab];
    if (action) quickAction(action);
    else toast('Pas de "nouveau" disponible sur cet onglet.', 'warn');
  }
  function quickAction(kind) {
    if (kind === 'mel') return melForm();
    if (kind === 'action') return actionForm();
    if (kind === 'decision') return decisionForm();
    if (kind === 'comm') return commsForm();
    if (kind === 'incident') return incidentForm();
    if (kind === 'vessel') return vesselForm();
    if (kind === 'stakeholder') return stakeholderForm();
    if (kind === 'resource') return resourceForm();
    if (kind === 'risk') return riskForm();
    if (kind === 'rhythm') return rhythmForm();
    if (kind === 'team') return teamForm();
    if (kind === 'passation') return passationForm();
    if (kind === 'anticipation') return anticipationForm();
    if (kind === 'retex') return retexForm();
    if (kind === 'exercise') return exerciseForm();
    if (kind === 'friction') return frictionForm();
  }

  // ============================================================
  //   FAB
  // ============================================================
  function toggleFab(force) {
    const menu = $('#fabMenu');
    const main = $('#fabMain');
    const open = (force === undefined) ? menu.hidden : force;
    menu.hidden = !open;
    main.classList.toggle('open', open);
  }

  // ============================================================
  //   DATALISTS (auto-complétion)
  // ============================================================
  function refreshDatalists() {
    const fill = (id, values) => {
      const dl = document.getElementById(id);
      if (!dl) return;
      dl.innerHTML = '';
      [...new Set(values.filter(Boolean))].sort().forEach(v => dl.appendChild(el('option', { value: v })));
    };
    fill('dl-authors', state.mel.map(m => m.author).concat(state.team.map(t => t.name)));
    fill('dl-owners', state.actions.map(a => a.owner).concat(state.team.map(t => t.name)));
    fill('dl-parties', state.stakeholders.map(s => s.name).concat(state.comms.map(c => c.party)));
    fill('dl-vessels', state.vessels.map(v => v.name));
  }

  // ============================================================
  //   ROUTING
  // ============================================================
  const renderers = {};
  function setTab(tab) {
    if (!renderers[tab]) tab = 'cop';
    currentTab = tab;
    // Active marker sur les onglets primaires + items du Plus
    document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-pop').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    // Si l'onglet actif est dans le Plus, met en évidence le bouton Plus
    const moreBtn = $('#tabMoreBtn');
    if (moreBtn) {
      const inMore = !!document.querySelector('.tab-pop[data-tab="' + tab + '"]');
      moreBtn.classList.toggle('has-active', inMore);
    }
    const main = $('#main');
    main.innerHTML = '';
    refreshDatalists();
    renderers[tab](main);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  //   COP
  // ============================================================
  renderers.cop = (root) => {
    const activeIncidents = state.incidents.filter(i => i.status !== 'closed');
    const vesselsAtRisk = state.vessels.filter(v => v.status === 'incident' || v.status === 'risk');
    const overdue = state.actions.filter(a => a.status !== 'done' && a.due && new Date(a.due) < new Date()).length;
    const openActions = state.actions.filter(a => a.status !== 'done').length;
    const frActives = (state.frictions || []).filter(f => f.status !== 'closed').length;
    const mode = window.MODES.find(m => m.code === state.alert) || window.MODES[0];

    root.appendChild(panel('Duty Manager backlog',
      el('div', { class: 'muted' },
        'Duty Manager overview: everything running in parallel (cases, frictions, actions, Duty Log notes). Continuously updated. ',
        state.opsPeriod ? el('span', {}, '— OPS Period : ', el('strong', {}, state.opsPeriod)) : null)
    ));

    // Off-hire — somme des risques sur les dossiers ouverts + total réel sur les dossiers clos
    const offhireSum = (filterFn, key) => state.incidents
      .filter(filterFn)
      .reduce((acc, i) => acc + (parseFloat(i[key]) || 0), 0);
    const offhireOpen = offhireSum(i => i.status !== 'closed', 'offhireEstimated');
    const offhireClosed = offhireSum(i => i.status === 'closed', 'offhireActual');
    const offhireByDept = (dept) => offhireSum(
      i => i.status !== 'closed' && (i.department || 'XX') === dept, 'offhireEstimated');

    // Classification — répartition des dossiers ouverts (intégrée à la tile Dossiers)
    const clsCount = {};
    activeIncidents.forEach(i => { const k = i.classification || 'INTERNAL'; clsCount[k] = (clsCount[k] || 0) + 1; });
    const clsSubtitle = el('div', { class: 'flex', style: 'gap:4px;flex-wrap:wrap;margin-top:4px' },
      ...window.CLASSIFICATIONS.map(c => badge(c.short + ' ' + (clsCount[c.code] || 0), c.color))
    );

    const kpis = el('div', { class: 'grid-4' },
      kpiTile('Mode', mode.statut,
        mode.code === 'crise' ? 'danger' : mode.code === 'vigilance' ? 'warn' : 'ok',
        mode.label),
      kpiTile('Open cases', activeIncidents.length,
        activeIncidents.length ? 'warn' : 'ok', clsSubtitle),
      kpiTile('Active frictions', frActives, frActives ? 'warn' : 'ok'),
      kpiTile('Overdue actions', overdue, overdue ? 'danger' : (openActions ? 'warn' : 'ok'),
        openActions + ', open')
    );
    root.appendChild(kpis);

    // Off-hire — panel dédié : 4 KPIs (In progress · Week · YTD · vs Objectif)
    const offM = computeOffhireMetrics();
    const ratioTone = offM.ratio >= 100 ? 'danger' : offM.ratio >= 75 ? 'warn' : 'ok';
    const offhireKpis = el('div', { class: 'grid-4' },
      kpiTile('Estimated (open)',
        fmtH(offhireOpen),
        offhireOpen > 240 ? 'danger' : offhireOpen > 72 ? 'warn' : 'ok',
        `FM ${offhireByDept('FM')} · CR ${offhireByDept('CR')} · FU ${offhireByDept('FU')}`),
      kpiTile('New this week',
        fmtH(offM.weekNew),
        offM.weekNew > 48 ? 'warn' : 'ok',
        'opened since Monday'),
      kpiTile('YTD actual',
        fmtH(offM.ytdActual),
        'muted',
        `${offM.daysElapsed}d since Jan 1`),
      kpiTile('YTD vs target',
        offM.ratio + ' %',
        ratioTone,
        `target ${offM.ytdTarget} h (99.5% × ${offM.nVessels}vessels)`)
    );
    root.appendChild(panel('Off-hire',
      el('div', {},
        el('p', { class: 'muted', style: 'margin-bottom:10px' },
          'Availability target: 99,5% over 365 days (~43.8 h off-hire/vessel/year). YTD target = ' + offM.ytdTarget + ' h for ' + offM.nVessels + 'vessel(s).'),
        offhireKpis
      )
    ));

    // Quickbar — saisie MEL ultra-rapide
    const qbCat = el('select', {}, ...['INFO','INC','DECISION','COMMS','ACTION','SAFETY','SECURITY','MEDIA','VESSEL','OTHER']
      .map(c => el('option', { value: c }, c)));
    const qbAuthor = el('input', { value: currentUserName(), placeholder: 'Author', list: 'dl-authors' });
    const qbText = el('textarea', { placeholder: 'Quick event capture (Ctrl+Enter to send)…' });
    const qbBtn = el('button', { class: 'btn-primary', onclick: () => {
      if (!qbText.value.trim()) return;
      logMEL(qbCat.value, qbText.value.trim(), qbAuthor.value || currentUserName() || 'Anonyme');
      qbText.value = '';
      toast('Event recorded', 'ok');
      setTab('cop');
    } }, '⏎ Log');
    qbText.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); qbBtn.click(); }
    });
    root.appendChild(el('div', { class: 'quickbar' },
      qbCat, qbAuthor, qbText, qbBtn,
      el('div', { class: 'qb-hint' }, 'L: quick focus · Ctrl+Enter: send')
    ));

    root.appendChild(panel('Open cases',
      activeIncidents.length === 0
        ? el('div', { class: 'empty' }, 'No open case.')
        : tableEl(['Ref', 'Dept', 'Type', 'Vessel', 'Sev.', 'Class.', 'Started'],
          activeIncidents.slice(0, 8).map(i => {
            const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
            return [
              el('span', { class: 'mono' }, i.ref || ''),
              badge(i.department || 'XX', 'blue'),
              i.type || '', i.vessel || '',
              badge((i.severity || '?').toUpperCase(), severityColor(i.severity)),
              badge(cls.short, cls.color),
              fmtTime(i.startedAt)
            ];
          })),
      el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('incidents') }, 'See all →')
    ));

    root.appendChild(panel('Duty Log — recent entries',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'Empty log.')
        : el('div', {}, ...state.mel.slice(0, 10).map(meEntry))
    ));
  };

  function meEntry(e) {
    return el('div', { class: 'mel-entry' },
      el('span', { class: 'mel-time' }, fmtDTG(e.ts)),
      el('span', { class: 'mel-cat' }, badge(e.cat || 'INFO', 'blue')),
      el('span', { class: 'mel-author' }, e.author),
      el('span', { class: 'mel-text' }, e.text)
    );
  }

  // ============================================================
  //   INCIDENTS
  // ============================================================
  // Filtres persistants pour le tableau Dossiers
  const dossierFilters = {
    search: '', dept: '', type: '', severity: '', classification: '', status: '', vessel: ''
  };

  renderers.incidents = (root) => {
    // Listes distinctes pour les filtres
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    const types = uniq(state.incidents.map(i => i.type));

    // Filtres
    const fSearch = (() => { const i = el('input', { placeholder: 'Ref / summary / description / vessel', value: dossierFilters.search });
      i.addEventListener('input', () => { dossierFilters.search = i.value; setTab('incidents'); }); return i; })();
    const fDept = (() => { const s = el('select', {}, el('option', { value: '' }, 'All departments'),
        ...['FM','CR','FU','XX'].map(c => el('option', { value: c, selected: dossierFilters.dept === c }, c)));
      s.addEventListener('change', () => { dossierFilters.dept = s.value; setTab('incidents'); }); return s; })();
    const fType = (() => { const s = el('select', {}, el('option', { value: '' }, 'All types'),
        ...types.map(t => el('option', { value: t, selected: dossierFilters.type === t }, t)));
      s.addEventListener('change', () => { dossierFilters.type = s.value; setTab('incidents'); }); return s; })();
    const fSev = (() => { const s = el('select', {}, el('option', { value: '' }, 'All severities'),
        ...['crit','high','med','low'].map(c => el('option', { value: c, selected: dossierFilters.severity === c }, c.toUpperCase())));
      s.addEventListener('change', () => { dossierFilters.severity = s.value; setTab('incidents'); }); return s; })();
    const fCls = (() => { const s = el('select', {}, el('option', { value: '' }, 'All classifications'),
        ...window.CLASSIFICATIONS.map(c => el('option', { value: c.code, selected: dossierFilters.classification === c.code }, c.label)));
      s.addEventListener('change', () => { dossierFilters.classification = s.value; setTab('incidents'); }); return s; })();
    const fStatus = (() => { const s = el('select', {}, el('option', { value: '' }, 'All statuses'),
        ...['open','monitoring','closed'].map(st => el('option', { value: st, selected: dossierFilters.status === st }, st)));
      s.addEventListener('change', () => { dossierFilters.status = s.value; setTab('incidents'); }); return s; })();
    const fReset = el('button', { class: 'btn-ghost btn-sm', onclick: () => {
      Object.keys(dossierFilters).forEach(k => dossierFilters[k] = '');
      setTab('incidents');
    } }, '✕ Reset filters');

    // Application des filtres
    const q = (dossierFilters.search || '').toLowerCase().trim();
    const filtered = state.incidents.filter(i => {
      if (dossierFilters.dept && (i.department || 'XX') !== dossierFilters.dept) return false;
      if (dossierFilters.type && i.type !== dossierFilters.type) return false;
      if (dossierFilters.severity && i.severity !== dossierFilters.severity) return false;
      if (dossierFilters.classification && (i.classification || 'INTERNAL') !== dossierFilters.classification) return false;
      if (dossierFilters.status && i.status !== dossierFilters.status) return false;
      if (q) {
        const hay = ((i.ref || '') + ' ' + (i.vessel || '') + ' ' + (i.sitrepLine || '') + ' ' + (i.summary || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    root.appendChild(panel('Technical & Crewing cases',
      el('div', {},
        el('p', { class: 'muted' }, 'Open case follow-up — owned by the Duty Officer of each department (FM, CR, FU) for their scope; the Duty Manager for transverse subjects. Outside SSE scope (covered by the dedicated tool).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:8px' },
          el('div', { class: 'muted' }, `${filtered.length} / ${state.incidents.length} case(s) shown`),
          el('button', { class: 'btn-primary', onclick: () => incidentForm() }, '+ New case (i)')
        ),
        // Bandeau filtres (2 lignes)
        el('div', { class: 'form-row cols-4', style: 'margin-bottom:6px' },
          el('div', {}, el('label', {}, 'Search'), fSearch),
          el('div', {}, el('label', {}, 'Department'), fDept),
          el('div', {}, el('label', {}, 'Type'), fType),
          el('div', {}, el('label', {}, 'Severity'), fSev)
        ),
        el('div', { class: 'form-row cols-3', style: 'margin-bottom:10px' },
          el('div', {}, el('label', {}, 'Classification'), fCls),
          el('div', {}, el('label', {}, 'Status'), fStatus),
          el('div', { style: 'align-self:end' }, fReset)
        ),
        filtered.length === 0
          ? el('div', { class: 'empty' }, state.incidents.length === 0 ? 'No case.' : 'No case matches the filters.')
          : tableEl(
            ['SITREP', 'Ref', 'Dept', 'Type', 'Vessel', 'Sev.', 'Class.', 'Off-hire (h)', 'Started', 'Status', ''],
            filtered.map(i => {
              const isClosed = i.status === 'closed';
              const value = isClosed
                ? (i.offhireActual != null ? fmtH(i.offhireActual) : '⚠ not figured')
                : (fmtH(i.offhireEstimated || 0) + ' est.');
              const color = isClosed
                ? (i.offhireActual == null ? 'red' : 'grey')
                : ((i.offhireEstimated || 0) > 72 ? 'orange' : 'blue');
              const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
              const include = i.includeInSitrep !== false;
              const cb = el('input', { type: 'checkbox' });
              cb.checked = include;
              cb.addEventListener('change', () => {
                i.includeInSitrep = cb.checked;
                save();
              });
              return [
                cb,
                el('span', { class: 'mono' }, i.ref || ''),
                badge(i.department || 'XX', 'blue'),
                i.type || '',
                i.vessel || '',
                badge((i.severity || 'med').toUpperCase(), severityColor(i.severity)),
                badge(cls.short, cls.color),
                badge(value, color),
                fmtTime(i.startedAt),
                badge(i.status, i.status === 'open' ? 'red' : i.status === 'monitoring' ? 'orange' : 'green'),
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => incidentForm(i.id) }, 'Edit'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => deleteIncident(i.id) }, '✕')
                )
              ];
            })
          )
      )
    ));
  };
  // Types de dossiers techniques & équipages
  const INCIDENT_TYPES = [
    'M/E', 'A/E', 'Propulsion', 'Drydock', 'Retrofit',
    'PSC', 'Vetting', 'Bunker', 'Cargaison',
    'Manning', 'Certification', 'MEDEVAC', 'Regulation', 'Other'
  ];
  function incidentForm(idEdit) {
    const inc = idEdit ? state.incidents.find(i => i.id === idEdit) : { severity: 'med', status: 'open', department: 'FM', type: 'M/E', classification: 'INTERNAL' };
    const ref = el('input', { value: inc.ref || ('DOS-' + Date.now().toString(36).toUpperCase()) });
    const type = el('select', {}, ...INCIDENT_TYPES.map(t => el('option', { value: t, selected: inc.type === t }, t)));
    const department = el('select', {}, ...window.DEPARTMENTS.map(d => el('option', { value: d.code, selected: (inc.department || 'FM') === d.code }, d.code + ' — ' + d.label)));
    const vessel = el('input', { list: 'dl-vessels', value: inc.vessel || '', placeholder: 'Type the name or paste text (auto-detect)' });
    const vesselInfo = el('div', { class: 'muted', style: 'font-size:11.5px;padding:4px 0' });
    const refreshVesselInfo = () => {
      vesselInfo.innerHTML = '';
      // 1. match exact par nom dans le registre
      let v = state.vessels.find(x => x.name === vessel.value);
      // 2. sinon détection dans la valeur du champ navire
      if (!v && vessel.value) v = findVesselInText(vessel.value);
      // 3. sinon, si le champ est vide, on tente la synthèse une-ligne puis la description
      let autoFromText = false;
      if (!v && (!vessel.value || !vessel.value.trim())) {
        const fromLine = sitrepLine && findVesselInText(sitrepLine.value || '');
        const fromSummary = !fromLine && summary && findVesselInText(summary.value || '');
        v = fromLine || fromSummary;
        if (v) autoFromText = true;
      }
      if (v) {
        if (vessel.value !== v.name) vessel.value = v.name;
        vesselInfo.appendChild(el('span', {},
          (autoFromText ? '✓ detected from text: ' : '✓ '),
          el('strong', {}, v.name),
          v.imo ? ' · IMO ' + v.imo : '',
          v.fleet ? ' · ' : '', v.fleet ? badge(v.fleet, 'blue') : '',
          ' · ', v.shipManager || '—',
          ' · ', badge(v.fuelType || v.fuelMode || '—', 'grey'),
          ' · ', (v.numDG || '?') + ' DG'));
      } else if (vessel.value) {
        vesselInfo.appendChild(el('span', { style: 'color:var(--warn)' },
          '⚠ No vessel detected for "' + vessel.value + '". Check spelling or add to the registry.'));
      }
    };
    vessel.addEventListener('input', refreshVesselInfo);
    vessel.addEventListener('change', refreshVesselInfo);
    setTimeout(refreshVesselInfo, 0);
    const severity = el('select', {}, ...['low','med','high','crit'].map(s => el('option', { value: s, selected: inc.severity === s }, s.toUpperCase())));
    const status = el('select', {}, ...['open','monitoring','closed'].map(s => el('option', { value: s, selected: inc.status === s }, s)));
    const classification = el('select', {}, ...window.CLASSIFICATIONS.map(c =>
      el('option', { value: c.code, selected: (inc.classification || 'INTERNAL') === c.code }, c.label)));
    const startedAt = el('input', { type: 'datetime-local', value: inc.startedAt ? new Date(inc.startedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16) });
    const summary = el('textarea', { placeholder: 'Description: who, what, where, operational consequence, action in progress' }, inc.summary || '');
    const sitrepLine = el('input', {
      placeholder: 'ONE-LINE summary that will appear in the DO SITREP',
      value: inc.sitrepLine || ''
    });
    // Détection auto navire depuis la synthèse ou la description si champ navire vide
    sitrepLine.addEventListener('input', refreshVesselInfo);
    sitrepLine.addEventListener('blur',  refreshVesselInfo);
    summary.addEventListener('input', refreshVesselInfo);
    summary.addEventListener('blur',  refreshVesselInfo);
    const offhireEst = el('input', {
      type: 'number', min: 0, step: 0.5,
      value: inc.offhireEstimated != null ? inc.offhireEstimated : 0,
      placeholder: 'Estimated hours'
    });
    const includeInSitrep = el('input', { type: 'checkbox' });
    includeInSitrep.checked = inc.includeInSitrep !== false;
    const offhireAct = el('input', {
      type: 'number', min: 0, step: 0.5,
      value: inc.offhireActual != null ? inc.offhireActual : '',
      placeholder: 'MANDATORY at closure — exact figure'
    });
    // Highlight le champ "réel" si statut = closed
    const refreshOffhireRequired = () => {
      const required = status.value === 'closed';
      offhireAct.style.borderColor = required && (offhireAct.value === '' || offhireAct.value == null) ? 'var(--danger)' : '';
      offhireAct.required = required;
    };
    status.addEventListener('change', refreshOffhireRequired);
    refreshOffhireRequired();

    const submit = () => {
      // Validation : off-hire réel obligatoire à la clôture
      if (status.value === 'closed') {
        const v = parseFloat(offhireAct.value);
        if (offhireAct.value === '' || isNaN(v) || v < 0) {
          offhireAct.style.borderColor = 'var(--danger)';
          offhireAct.focus();
          toast('At closure, the EXACT off-hire figure (in hours) is mandatory.', 'danger');
          return;
        }
      }
      // Tentative ultime de détection du navire si le champ est vide
      if (!vessel.value || !vessel.value.trim()) {
        const detected = findVesselInText(sitrepLine.value || '') || findVesselInText(summary.value || '');
        if (detected) {
          vessel.value = detected.name;
          toast('Vessel auto-detected: ' + detected.name, 'ok');
        }
      }
      const data = {
        id: inc.id || id(),
        ref: ref.value, type: type.value, vessel: vessel.value,
        department: department.value,
        severity: severity.value,
        status: status.value,
        startedAt: new Date(startedAt.value).toISOString(),
        summary: summary.value,
        sitrepLine: sitrepLine.value || `${vessel.value || 'n/a'} — ${type.value}` + (summary.value ? ' : ' + summary.value.split('\n')[0].slice(0, 120) : ''),
        classification: classification.value,
        offhireEstimated: parseFloat(offhireEst.value) || 0,
        offhireActual: offhireAct.value === '' ? null : parseFloat(offhireAct.value),
        includeInSitrep: includeInSitrep.checked
      };
      if (data.status === 'closed' && !data.closedAt) data.closedAt = nowISO();
      if (idEdit) {
        state.incidents[state.incidents.findIndex(i => i.id === idEdit)] = data;
        const offMsg = data.status === 'closed'
          ? ` · off-hire RÉEL : ${data.offhireActual} h`
          : ` · estimated off-hire: ${data.offhireEstimated} h`;
        logMEL('DOSSIER', `Case ${data.ref} updated (${data.status})${offMsg}`);
      } else {
        state.incidents.push(data);
        logMEL('DOSSIER', `New case [${data.department}] ${data.ref} — ${data.type} on ${data.vessel || 'n/a'} (sev ${data.severity}, estimated off-hire ${data.offhireEstimated} h)`);
        if (data.severity === 'crit') state.alert = 'crise';
        else if (data.severity === 'high' && state.alert === 'nominal') state.alert = 'vigilance';
        if (data.vessel) {
          const v = state.vessels.find(x => x.name === data.vessel);
          if (v) v.status = 'incident';
        }
        applyAlertClass();
        $('#alertSelect').value = state.alert;
      }
      save(); closeModal(); setTab('incidents');
    };

    const form = el('div', {},
      twoCol('Reference', ref, 'Department', department),
      twoCol('Type', type, 'Vessel', vessel),
      vesselInfo,
      twoCol('Severity', severity, 'Classification', classification),
      field('Status', status),
      field('Start date', startedAt),
      field('One-line summary (appears in the DO SITREP)', sitrepLine),
      el('label', { class: 'flex', style: 'gap:6px;align-items:center;margin:6px 0' },
        includeInSitrep, el('span', {}, 'Include this case in SITREPs (uncheck to omit)')),
      field('Detailed description', summary),
      el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' }, 'Off-hire'),
      twoCol('Estimated off-hire (hours)', offhireEst, 'Actual off-hire (closure — MANDATORY)', offhireAct),
      el('div', { class: 'muted', style: 'font-size:11.5px' },
        '⚠ At case closure, the EXACT off-hire hours figure is mandatory. These hours are summed in the CMA Ships SITREP and tracked in the COP tab.'),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: submit }, idEdit ? 'Update' : 'Create'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
      )
    );
    openModal(idEdit ? 'Edit case' : 'New case', form, { onSubmit: submit });
  }
  function deleteIncident(idDel) {
    if (!confirm('Delete this case??')) return;
    const inc = state.incidents.find(i => i.id === idDel);
    state.incidents = state.incidents.filter(i => i.id !== idDel);
    logMEL('INC', `Case ${inc?.ref} deleted`);
    save(); setTab('incidents');
  }

  // ============================================================
  //   VESSELS — registre flotte CMA Ships (438vessels)
  //   CSV import: VesselName, IMO, Fleet (M1/M2/M3/S1/S2/S3...),
  //   Ship Manager, Fuel type, M/E type, A/E 1-6, DPA/CSO, etc.
  // ============================================================

  // Parseur CSV minimaliste — gère quotes "" et virgules dans les champs.
  function parseCSV(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = []; let row = []; let field = ''; let inQuotes = false; let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i+1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1)
      .filter(r => r.some(x => (x || '').trim() !== ''))
      .map(r => { const o = {}; headers.forEach((h, idx) => o[h] = (r[idx] || '').trim()); return o; });
  }

  // Mappe une ligne CSV → vessel object.
  function mapCsvRowToVessel(row) {
    const numAE = ['A/E 1 Maker','A/E 2 Maker','A/E 3 Maker','A/E 4 Maker','A/E 5 Maker','A/E 6 Maker']
      .filter(k => (row[k] || '').trim()).length;
    return {
      name: row.VesselName || '',
      imo: row.IMO || '',
      type: row.Series || row.type || '',
      hullNb: row.Hull_Nb || '',
      previousName: row['Previous name'] || '',
      secondHand: row['2nd hand?'] || '',
      // Pilotage CMA
      fleet: row.Fleet || '',
      shipManager: row['Ship Manager'] || '',
      SI: row.SI || '',
      SI_email: row.SI_email || '',
      SI_mobile: row['SI_Mobile'] || row['SI_Mobile:Mobile'] || '',
      fleetManager: row['Fleet Manager'] || '',
      fleetManagerEmail: row.Email || '',
      DPA_CSO: row['DPA/CSO'] || '',
      deputyDPA: row['Deputy DPA/CSO'] || '',
      MSO: row.MSO || '',
      safetyGroup: row['Safety Group'] || '',
      safetyGroupEmail: row['Safety Group email'] || '',
      // Identité juridique
      flag: row.Flag || '',
      'class': row.Class || '',
      registeredOwner: row['Registered Owner'] || '',
      bareboat: row.Bareboat || '',
      contractualOwner: row['Contractual owner'] || '',
      contractualShipmanager: row['Contractual shipmanager'] || '',
      residentAgent: row['Resident Agent'] || '',
      // Capabilities
      GT: row['Gross Tonnage'] || '',
      capacity: row.Capacity || '',
      LOA: row['LOA (m)'] || '',
      breadth: row['Breadth (m)'] || '',
      yard: row.Yard || '',
      builtIn: row['Built in'] || '',
      // Technique M/E
      ME_designer: row['M/E Designer'] || '',
      ME_licensee: row['M/E Licensee'] || '',
      ME_stroke: row['M/E stroke'] || '',
      ME_fullName: row['M/E Full name'] || '',
      ME_units: row['M/E units'] || '',
      ME_bore: row['M/E bore'] || '',
      ME_type: row['M/E type'] || '',
      ME_mark: row['M/E mark'] || '',
      ME_TIII: row['M/E TIII Technology'] || '',
      ME_TC_maker: row['M/E T/C Maker'] || '',
      ME_TC_model: row['M/E T/C Model'] || '',
      lubricator: row.Lubricator || '',
      // Toxiliaires électriques
      AE_TIII: row['A/E TIII Technology'] || '',
      numDG: numAE || (typeof row.numDG === 'number' ? row.numDG : 4),
      // Fuel & propulsion
      fuelType: row['Fuel type'] || row.fuelMode || row.fuelType || 'HFO',
      fuelMode: row['Fuel type'] || row.fuelMode || 'HFO', // backward-compat alias
      propulsionType: row.propulsionType || 'M/E + ligne d\'arbre',
      firstLNGBunkering: row['First LNG Bunkering'] || '',
      // Cargo
      cargoCranes: row['Cargo cranes'] || '',
      cargoCranesNb: row['Cargo cranes nb'] || '',
      cargoCranesMaker: row['Cargo cranes maker'] || '',
      cargoCranesModel: row['Cargo cranes model'] || '',
      // Crewing
      crewNb: row.CrewNb || '',
      crewMgrFR: row['Crew Manager (FR)'] || '',
      crewMgrINTL: row['Crew Manager (INTL)'] || '',
      // Sûreté
      citadel: row.Citadel || '',
      msTeamsOnboard: row['MS Teams onboard?'] || '',
      naviSysContractHolder: row['NaviSys Contract holder'] || '',
      // Key dates
      fleetEntryDate: row['Fleet entry date'] || '',
      deliveryDate: row['Delivery date'] || '',
      classAnniversary: row['Class anniversary date'] || '',
      outOfMgmtDate: row['Out of Management date'] || '',
      // Status tool
      status: 'normal', position: '', notes: '',
      // Conserve la ligne brute pour l'affichage détaillé
      csvMeta: row
    };
  }

  // Détection d'un navire dans un texte libre — match nom courant, ancien
  // nom et IMO. Tolère préfixes CMA CGM / CC / APL.
  function findVesselInText(text) {
    if (!text) return null;
    const upper = text.toUpperCase();
    const imoMatch = upper.match(/\b(\d{7})\b/);
    if (imoMatch) {
      const v = (state.vessels || []).find(x => x.imo === imoMatch[1]);
      if (v) return v;
    }
    // Match nom le plus long d'abord (évite que "CC" matche trop tôt)
    const candidates = (state.vessels || [])
      .slice()
      .sort((a, b) => (b.name || '').length - (a.name || '').length);
    for (const v of candidates) {
      const nm = (v.name || '').toUpperCase().trim();
      if (!nm) continue;
      if (upper.includes(nm)) return v;
      const short = nm.replace(/^(CMA CGM |CC |APL )/, '').trim();
      if (short.length >= 4 && new RegExp('\\b' + short.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\b').test(upper)) return v;
    }
    for (const v of candidates) {
      if (!v.previousName) continue;
      if (upper.includes(v.previousName.toUpperCase().trim())) return v;
    }
    return null;
  }

  // Fusionne une liste devessels CSV → state.vessels. Clé : IMO puis nom.
  function mergeImportedVessels(csvRows) {
    let added = 0, updated = 0, skipped = 0;
    csvRows.forEach(row => {
      const data = mapCsvRowToVessel(row);
      if (!data.name) { skipped++; return; }
      const existing = (data.imo && state.vessels.find(v => v.imo === data.imo))
        || state.vessels.find(v => v.name === data.name);
      if (existing) {
        // Préserve id, status, position, notes, dossiers déjà liés
        const preserved = { id: existing.id, status: existing.status, position: existing.position, notes: existing.notes };
        Object.assign(existing, data, preserved);
        updated++;
      } else {
        state.vessels.push(Object.assign({ id: id() }, data));
        added++;
      }
    });
    return { added, updated, skipped, total: csvRows.length };
  }

  // ============================================================
  //   VESSELS — renderer
  // ============================================================
  // Filtres persistants pour la grande flotte (438vessels)
  const vesselFilters = { search: '', fleet: '', shipManager: '', fuelType: '' };

  renderers.vessels = (root) => {
    // Index des dossiers ouverts par navire
    const dossiersByVessel = {};
    state.incidents.filter(i => i.status !== 'closed').forEach(i => {
      if (!i.vessel) return;
      (dossiersByVessel[i.vessel] = dossiersByVessel[i.vessel] || []).push(i);
    });

    // Listes distinctes pour les filtres
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    const fleets = uniq(state.vessels.map(v => v.fleet));
    const managers = uniq(state.vessels.map(v => v.shipManager));
    const fuels = uniq(state.vessels.map(v => v.fuelType || v.fuelMode));

    // ===== Bandeau import / création =====
    const csvFile = el('input', { type: 'file', accept: '.csv,text/csv', hidden: 'hidden' });
    csvFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rows = parseCSV(ev.target.result);
          if (rows.length === 0) { toast('Empty CSV or invalid format', 'warn'); return; }
          openImportPreview(rows);
        } catch (err) { toast('CSV parsing error: ' + err.message, 'danger'); }
      };
      reader.readAsText(f, 'utf-8');
    });

    root.appendChild(panel('CMA Ships Fleet — vessel registry',
      el('div', {},
        el('p', { class: 'muted' },
          `${state.vessels.length} vessel(s) in the registry. Analytics axes: management fleet (M1/M2/M3/S1/S2/S3…), ship manager, fuel, class. CSV import for initial bootstrap or bulk update.`),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px;flex-wrap:wrap;gap:8px' },
          el('div', { class: 'flex', style: 'gap:6px;flex-wrap:wrap' },
            el('button', { class: 'btn-primary', onclick: () => vesselForm() }, '+ Add (n)'),
            el('button', { class: 'btn-ghost', onclick: () => csvFile.click() }, '⬆ Import CSV (438 vessels)'),
            el('button', { class: 'btn-ghost', onclick: () => exportVesselsCSV() }, '⬇ Export CSV'),
            csvFile
          )
        ),

        // ===== Filtres =====
        el('div', { class: 'form-row cols-4', style: 'margin-bottom:10px' },
          (() => { const i = el('input', { placeholder: 'Search nom / IMO…', value: vesselFilters.search });
            i.addEventListener('input', () => { vesselFilters.search = i.value; setTab('vessels'); }); return i; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'All fleets'),
              ...fleets.map(f => el('option', { value: f, selected: vesselFilters.fleet === f }, f)));
            s.addEventListener('change', () => { vesselFilters.fleet = s.value; setTab('vessels'); }); return s; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'All ship managers'),
              ...managers.map(m => el('option', { value: m, selected: vesselFilters.shipManager === m }, m)));
            s.addEventListener('change', () => { vesselFilters.shipManager = s.value; setTab('vessels'); }); return s; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'All fuels'),
              ...fuels.map(f => el('option', { value: f, selected: vesselFilters.fuelType === f }, f)));
            s.addEventListener('change', () => { vesselFilters.fuelType = s.value; setTab('vessels'); }); return s; })()
        ),

        // ===== Tableau filtré =====
        (() => {
          const q = (vesselFilters.search || '').toLowerCase().trim();
          const filtered = state.vessels.filter(v => {
            if (vesselFilters.fleet && v.fleet !== vesselFilters.fleet) return false;
            if (vesselFilters.shipManager && v.shipManager !== vesselFilters.shipManager) return false;
            if (vesselFilters.fuelType && (v.fuelType || v.fuelMode) !== vesselFilters.fuelType) return false;
            if (q && !((v.name || '').toLowerCase().includes(q) || (v.imo || '').includes(q))) return false;
            return true;
          });
          const total = state.vessels.length;
          return el('div', {},
            el('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' },
              `${filtered.length} / ${total} vessels shown`),
            filtered.length === 0
              ? el('div', { class: 'empty' }, 'No vessel matches the filters.')
              : tableEl(['Vessel', 'IMO', 'Fleet', 'Ship Manager', 'Fuel', 'Class / Series', 'DG', 'Cases', ''],
                filtered.slice(0, 200).map(v => {
                  const ds = dossiersByVessel[v.name] || [];
                  const fuel = v.fuelType || v.fuelMode || '—';
                  const isLNG = fuel.includes('LNG') || fuel.includes('Methanol') || fuel.includes('Fromal');
                  return [
                    el('span', { class: 'mono', style: 'cursor:pointer;text-decoration:underline',
                      onclick: () => vesselDetail(v.id) }, v.name),
                    el('span', { class: 'mono', style: 'font-size:11px' }, v.imo || '—'),
                    v.fleet ? badge(v.fleet, 'blue') : '—',
                    v.shipManager || '—',
                    badge(fuel, isLNG ? 'blue' : 'grey'),
                    v.type || '—',
                    v.numDG || '—',
                    ds.length === 0
                      ? el('span', { class: 'muted' }, '—')
                      : badge(ds.length + ' open', 'red'),
                    el('div', { class: 'flex' },
                      el('button', { class: 'btn-ghost btn-sm', onclick: () => vesselDetail(v.id) }, '👁'),
                      el('button', { class: 'btn-ghost btn-sm', onclick: () => vesselForm(v.id) }, 'Edit'),
                      el('button', { class: 'btn-danger btn-sm', onclick: () => deleteVessel(v.id) }, '✕')
                    )
                  ];
                })),
            filtered.length > 200
              ? el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:6px' },
                  '⚠ Showing first 200 results only. Refine filters.')
              : null
          );
        })()
      )
    ));

    // ===== Générateur de dossiers synthétiques (démo / test) =====
    if (state.vessels.length > 0) {
      const synSlider = el('input', { type: 'range', min: 1, max: 200, value: 20, style: 'flex:1' });
      const synOut = el('output', { style: 'min-width:42px;text-align:right;font-family:var(--mono);font-weight:600' }, '20');
      synSlider.addEventListener('input', () => synOut.value = synSlider.value);
      root.appendChild(panel('Synthetic data (demo / test)',
        el('div', {},
          el('p', { class: 'muted' },
            'Generates N realistic cases (M/E, A/E, Drydock, PSC, Manning, Vetting, MEDEVAC…) randomly distributed across the ' + state.vessels.length + ' vessel(s) in the registry. Estimated/actual off-hire, severities and classifications calibrated. Useful for demos and dashboard tests.'),
          el('div', { class: 'flex', style: 'gap:10px;align-items:center;margin:10px 0' },
            el('span', { class: 'muted', style: 'min-width:90px' }, 'Cases:'),
            synSlider, synOut),
          el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap' },
            el('button', { class: 'btn-primary', onclick: () => {
              const n = parseInt(synSlider.value, 10) || 0;
              const created = generateSyntheticDossiers(n);
              toast(`${created} synthetic cases created`, 'ok');
              logMEL('VESSEL', `${created} synthetic cases generated (demo)`);
              save(); setTab('vessels');
            } }, '+ Generate cases'),
            el('button', { class: 'btn-ghost', onclick: () => {
              generateSyntheticSitrep();
              toast('Sample CMA SITREP generated', 'ok');
              save(); setTab('sitrep');
            } }, '+ Generate 1 sample SITREP'),
            el('button', { class: 'btn-danger btn-sm', onclick: () => {
              if (!confirm('Delete ALL synthetic cases (SYN- prefix)?')) return;
              const before = state.incidents.length;
              state.incidents = state.incidents.filter(i => !(i.ref || '').startsWith('SYN-'));
              const removed = before - state.incidents.length;
              toast(`${removed} synthetic cases deleted`, 'ok');
              save(); setTab('vessels');
            } }, '✕ Purge synthetic cases')
          )
        )
      ));
    }

    // ===== Purge totale + ré-import (cycle démo) =====
    const csvFileReset = el('input', { type: 'file', accept: '.csv,text/csv', hidden: 'hidden' });
    csvFileReset.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rows = parseCSV(ev.target.result);
          if (rows.length === 0) { toast('Empty CSV or invalid format', 'warn'); return; }
          openImportPreview(rows);
        } catch (err) { toast('CSV parsing error: ' + err.message, 'danger'); }
      };
      reader.readAsText(f, 'utf-8');
    });

    root.appendChild(panel('Demo cycle — purge & replay',
      el('div', {},
        el('p', { class: 'muted' },
          'To restart a demo from scratch: purge all business data (vessels, cases, SITREPs, log, actions, frictions, etc.) then re-import the CSV with synthetic case generation. Password and authentication are preserved.'),
        el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap;margin-top:10px' },
          el('button', { class: 'btn-danger', onclick: () => {
            const c = prompt('This action will ERASE all business data (vessels, cases, SITREPs, log, actions, frictions, team, contacts…).\n\nPassword is preserved.\n\nType "PURGE" to confirm:');
            if (c !== 'PURGE') return;
            purgeAllData();
            toast('All business data erased', 'ok');
            setTab('vessels');
          } }, '⟲ Purge all business data'),
          el('button', { class: 'btn-primary', onclick: () => csvFileReset.click() }, '⬆ Re-import a CSV'),
          el('button', { class: 'btn-ghost', onclick: () => {
            if (!confirm('Full cycle: purge + restore 3 default CMA CGM vessels + 30 synthetic cases + 1 SITREP. Continue??')) return;
            purgeAllData();
            // Restaure les 3vessels CMA par défaut
            state.vessels = defaultState().vessels;
            state.stakeholders = defaultState().stakeholders;
            const created = generateSyntheticDossiers(30);
            generateSyntheticSitrep();
            logMEL('VESSEL', `Demo express cycle: 3 vessels + ${created} cases + 1 SITREP`);
            toast(`Demo ready: 3 vessels · ${created} cases · 1 SITREP`, 'ok');
            save(); setTab('cop');
          } }, '⚡ Reset + express demo (3 vessels + 30 cases)'),
          csvFileReset
        )
      )
    ));

    // ===== Synthèses par axe (visibles en bas) =====
    if (state.vessels.length > 0) {
      const byKey = (key) => {
        const m = {};
        state.vessels.forEach(v => { const k = v[key] || '—'; m[k] = (m[k] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
      };
      const summaryPanel = (title, items) => panel(title,
        el('div', { class: 'flex', style: 'flex-wrap:wrap;gap:6px' },
          ...items.map(([k, n]) => badge(k + ' · ' + n, 'blue'))));
      root.appendChild(el('div', { class: 'grid-2' },
        summaryPanel('Breakdown by fleet', byKey('fleet')),
        summaryPanel('Breakdown by ship manager', byKey('shipManager'))
      ));
    }
  };

  function vesselDetail(idDet) {
    const v = state.vessels.find(x => x.id === idDet);
    if (!v) return;
    const dossiers = state.incidents.filter(i => i.vessel === v.name);
    const open = dossiers.filter(i => i.status !== 'closed');
    const closed = dossiers.filter(i => i.status === 'closed');
    const sum = (key, list) => list.reduce((a, i) => a + (parseFloat(i[key]) || 0), 0);
    const offhireYTD = sum('offhireActual', closed.filter(i => i.closedAt && new Date(i.closedAt) >= new Date(new Date().getFullYear(), 0, 1)));
    const offhireOpen = sum('offhireEstimated', open);

    const kv = (label, val) => val ? el('div', { style: 'display:flex;gap:8px;font-size:12.5px;padding:3px 0' },
      el('span', { class: 'muted', style: 'min-width:160px' }, label),
      el('span', {}, String(val))) : null;

    openModal('Vessel — ' + v.name,
      el('div', {},
        el('div', { class: 'flex', style: 'gap:8px;margin-bottom:10px;flex-wrap:wrap' },
          badge(v.fleet || '—', 'blue'), badge(v.shipManager || '—', 'grey'),
          badge((v.fuelType || v.fuelMode || '—'), 'orange'), vesselStatusBadge(v.status)),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Identification'),
        kv('IMO', v.imo), kv('Type / series', v.type), kv('Hull No.', v.hullNb),
        kv('Previous name', v.previousName), kv('2nd hand', v.secondHand),
        kv('Flag', v.flag), kv('Classification', v['class']),
        kv('Registered owner', v.registeredOwner), kv('Bareboat', v.bareboat),
        kv('Contractual owner', v.contractualOwner),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'CMA Ships management'),
        kv('Fleet', v.fleet), kv('Ship Manager', v.shipManager),
        kv('Fleet Manager', v.fleetManager), kv('Email', v.fleetManagerEmail),
        kv('Superintendent (SI)', v.SI), kv('SI mobile', v.SI_mobile), kv('SI email', v.SI_email),
        kv('DPA / CSO', v.DPA_CSO), kv('Deputy DPA/CSO', v.deputyDPA),
        kv('MSO', v.MSO), kv('Safety Group', v.safetyGroup),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Capabilities'),
        kv('GT', v.GT), kv('Capacity', v.capacity),
        kv('LOA (m)', v.LOA), kv('Beam (m)', v.breadth),
        kv('Shipyard', v.yard), kv('Year', v.builtIn),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Main engine (M/E)'),
        kv('Designer', v.ME_designer), kv('Licensee', v.ME_licensee),
        kv('Type', v.ME_type), kv('Mark', v.ME_mark),
        kv('Stroke', v.ME_stroke), kv('Units', v.ME_units), kv('Bore', v.ME_bore),
        kv('TIII', v.ME_TIII), kv('T/C', (v.ME_TC_maker || '') + ' / ' + (v.ME_TC_model || '')),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Energy Énergie & propulsion propulsion'),
        kv('Fuel type', v.fuelType || v.fuelMode),
        kv('Propulsion', v.propulsionType),
        kv('Number of DG', v.numDG),
        kv('A/E TIII', v.AE_TIII),
        kv('1st LNG bunker', v.firstLNGBunkering),
        kv('Lubricator', v.lubricator),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Crewing & security'),
        kv('Crew complement', v.crewNb),
        kv('Crew Mgr FR', v.crewMgrFR), kv('Crew Mgr INTL', v.crewMgrINTL),
        kv('Citadel', v.citadel), kv('MS Teams onboard', v.msTeamsOnboard),
        kv('NaviSys Contract holder', v.naviSysContractHolder),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Key dates'),
        kv('Fleet entry', v.fleetEntryDate), kv('Delivery', v.deliveryDate),
        kv('Class anniv.', v.classAnniversary), kv('Out of management', v.outOfMgmtDate),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Linked cases'),
        el('div', { style: 'font-size:12px' },
          'Open: ', badge(open.length, open.length ? 'red' : 'grey'), ' · ',
          'Closed: ', badge(closed.length, 'grey'), ' · ',
          'YTD off-hire: ', badge(fmtH(offhireYTD), 'orange'), ' · ',
          'Open estimated off-hire : ', badge(fmtH(offhireOpen), 'orange')),
        open.length === 0 ? null : el('div', { style: 'margin-top:6px' },
          ...open.map(i => el('div', { class: 'pb-step', style: 'cursor:pointer', onclick: () => incidentForm(i.id) },
            badge((i.severity || 'med').toUpperCase(), severityColor(i.severity)),
            el('div', { class: 'pb-text' },
              el('span', { class: 'mono', style: 'color:var(--muted);font-size:11px' }, i.ref + ' · '),
              i.sitrepLine || i.type)))),

        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: () => { closeModal(); vesselForm(v.id); } }, 'Edit'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Close'))
      ));
  }

  // ============================================================
  //   GÉNÉRATEUR DE DOSSIERS SYNTHÉTIQUES (test / démo)
  // ============================================================
  const SYNTH_TEMPLATES = {
    'M/E': [
      { off: 96, sev: 'high', line: 'Crack on ME starting air manifold, repair shore team SGP {D}/06' },
      { off: 72, sev: 'high', line: 'M/E stay bolt cyl {N} broken, speed limited to {S} kts' },
      { off: 48, sev: 'med',  line: 'M/E exhaust valve cyl {N} damaged, replacement next port' },
      { off: 24, sev: 'med',  line: 'M/E fuel rack stuck cyl {N}, isolated, vitesse réduite {S} kts' },
      { off:  6, sev: 'low',  line: 'M/E lube oil temperature alarm, sensor checked, normal' }
    ],
    'A/E': [
      { off: 24, sev: 'high', line: 'A/E#{N} OOO suite alarme HIMAP, reefer limit {R} units' },
      { off: 48, sev: 'high', line: 'A/E#{N} turbocharger surge, isolated, opération {K} DG' },
      { off: 12, sev: 'med',  line: 'A/E#{N} lube oil pressure low, capteur remplacé' },
      { off:  4, sev: 'low',  line: 'A/E#{N} water leak repaired, back online' }
    ],
    'Propulsion': [
      { off: 168, sev: 'crit', line: 'CPP hub failure, intervention chantier {C}, +12j planning' },
      { off:  72, sev: 'high', line: 'Ligne d\'arbre vibration anormale, monitoring renforcé, vitesse {S} kts' },
      { off:  24, sev: 'med',  line: 'Gouvernail capteur défaillant, mode manuel, repair next call' }
    ],
    'Drydock': [
      { off: 240, sev: 'high', line: 'Drydock Cosco Zhoushan ETA {D}/06, durée prévue {N}j' },
      { off: 168, sev: 'high', line: 'Drydock unplanned suite avarie hélice, Cosco Shanghai' }
    ],
    'Retrofit': [
      { off: 120, sev: 'med',  line: 'Retrofit LNG en cours Cosco Zhoushan, ETD revisée +{N}j' },
      { off:   0, sev: 'low',  line: 'Phase-in scheduled {D}/06, sea trial OK, équipage à bord' },
      { off:  48, sev: 'med',  line: 'Bush manufacturing Espagne, dispo {D}/06, ETD +{N}j' }
    ],
    'PSC': [
      { off: 48, sev: 'high', line: 'Détention PSC port {P}, {N} déficiences, plan correctif J+{D}' },
      { off: 24, sev: 'med',  line: 'PSC inspection {P}, {N} déficiences mineures à corriger sous {D}j' },
      { off:  0, sev: 'low',  line: 'PSC inspection {P} sans déficience, rapport archivé' }
    ],
    'Vetting': [
      { off: 0, sev: 'high', line: 'Vetting {O} échoué, {N} observations dont 1 high-risk, re-vetting {D}/06' },
      { off: 0, sev: 'med',  line: 'Pré-inspection vetting {O} prévue {P} le {D}/06' },
      { off: 0, sev: 'low',  line: 'Vetting {O} passé, {N} observations mineures' }
    ],
    'Bunker': [
      { off: 24, sev: 'med', line: 'Bunker off-spec {P}, échantillon analyse Veritas, LOP fournisseur' },
      { off: 12, sev: 'low', line: 'Soutage retardé {P}, ETD +{N}h, lead time supplier' },
      { off:  6, sev: 'low', line: 'LNG bunkering {P} {D}/06, pressure test OK' }
    ],
    'Cargaison': [
      { off:  0, sev: 'med', line: 'Cargo damage container CMAU{N}, LOP au chargeur' },
      { off: 24, sev: 'high', line: 'Reefer alarm {N} containers, chaîne thermique préservée' },
      { off:  0, sev: 'low',  line: 'Contact gantry crane berthing {P}, dommage mineur, LOP' }
    ],
    'Manning': [
      { off:  0, sev: 'med', line: 'Relève {N} marins à {P} J+{D}, agent Manille confirmé' },
      { off: 24, sev: 'high', line: 'Gap officier 2/O confirmé prochaine rotation, prolongation contrat' },
      { off:  0, sev: 'low', line: 'Todit POEA {P} J+{D}, préparation Crewing en cours' },
      { off:  0, sev: 'med', line: 'Visa Schengen relève capitaine en cours, plan B activé' }
    ],
    'MEDEVAC': [
      { off:  0, sev: 'high', line: 'MEDEVAC effectué {P}, état stabilisé, remplaçant à bord' },
      { off: 12, sev: 'high', line: 'Évacuation médicale en cours, hélico SAR vers hôpital {P}' }
    ],
    'Certification': [
      { off: 0, sev: 'med', line: 'Cert STCW Advanced Firefighting expire J+{D}, formation BV {P}' },
      { off: 0, sev: 'low', line: 'Session CII formation {N} chief engineers Hambourg J+{D}' }
    ],
    'Regulation': [
      { off: 24, sev: 'med', line: 'Conf call DGAMPA implementation FuelEU J+{D}' },
      { off:  0, sev: 'low', line: 'MARPOL annex VI inspection passée sans réserve' }
    ]
  };

  const SYNTH_PORTS = ['Singapore','Rotterdam','Le Havre','Hamburg','Shanghai','Long Beach','Khalifa','Algeciras','Tangier','Antwerp','Hong Kong','Manille'];
  const SYNTH_OIL_MAJORS = ['Shell','BP','Exxon','Total','Chevron'];
  const SYNTH_YARDS = ['Cosco Zhoushan','Cosco Shanghai','Seatrium','Hyundai Mipo'];

  const DEPT_BY_TYPE = {
    'M/E': 'FM', 'A/E': 'FM', 'Propulsion': 'FM', 'PSC': 'FM',
    'Vetting': 'FM', 'Bunker': 'FM', 'Cargaison': 'FM', 'Regulation': 'FM',
    'Manning': 'CR', 'MEDEVAC': 'CR', 'Certification': 'CR',
    'Drydock': 'FU', 'Retrofit': 'FU'
  };

  function pickRand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function jitter(v, pct) {
    if (!v) return v;
    const d = v * pct;
    return Math.max(0, Math.round((v + (Math.random() * 2 - 1) * d) * 10) / 10);
  }
  function substituteTemplate(s) {
    return s.replace(/\{N\}/g, () => rint(1, 12))
            .replace(/\{S\}/g, () => rint(10, 18))
            .replace(/\{R\}/g, () => rint(40, 120))
            .replace(/\{K\}/g, () => rint(2, 3))
            .replace(/\{C\}/g, () => pickRand(SYNTH_YARDS))
            .replace(/\{D\}/g, () => rint(1, 28))
            .replace(/\{P\}/g, () => pickRand(SYNTH_PORTS))
            .replace(/\{O\}/g, () => pickRand(SYNTH_OIL_MAJORS));
  }

  function generateSyntheticDossiers(count) {
    if (state.vessels.length === 0) {
      toast('No navire au registre. Importez d\'abord un CSV.', 'warn');
      return 0;
    }
    const types = Object.keys(SYNTH_TEMPLATES);
    const classifs = [
      'INTERNAL','INTERNAL','INTERNAL','INTERNAL','INTERNAL','INTERNAL','INTERNAL',
      'RESTRICTED','RESTRICTED',
      'CONFIDENTIAL'
    ];
    let created = 0;
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const vessel = pickRand(state.vessels);
      const type = pickRand(types);
      const tpl = pickRand(SYNTH_TEMPLATES[type]);
      const sev = tpl.sev;
      const cls = pickRand(classifs);
      const dept = DEPT_BY_TYPE[type] || 'FM';
      const ageDays = rint(0, 60);
      const startedAt = new Date(now - ageDays * 24 * 3600 * 1000).toISOString();
      const r = Math.random();
      let status, closedAt = null, offhireActual = null, offhireEstimated = 0;
      if (r < 0.5) {
        status = 'open';
        offhireEstimated = jitter(tpl.off, 0.4);
      } else if (r < 0.75) {
        status = 'monitoring';
        offhireEstimated = jitter(tpl.off, 0.3);
      } else {
        status = 'closed';
        const closeDelay = rint(1, Math.max(1, ageDays));
        let ct = new Date(new Date(startedAt).getTime() + closeDelay * 24 * 3600 * 1000);
        if (ct > new Date()) ct = new Date();
        closedAt = ct.toISOString();
        offhireActual = jitter(tpl.off, 0.5);
      }
      const sitrepLine = substituteTemplate(tpl.line);
      state.incidents.push({
        id: id(),
        ref: 'SYN-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        type, vessel: vessel.name,
        department: dept,
        severity: sev, status,
        classification: cls,
        startedAt, closedAt,
        summary: '[Synthétique] ' + sitrepLine,
        sitrepLine,
        offhireEstimated: offhireEstimated || 0,
        offhireActual: offhireActual
      });
      created++;
    }
    return created;
  }

  function generateSyntheticSitrep() {
    if (!state.dutyManager) state.dutyManager = currentUserName() || 'M. Lefèvre';
    if (!state.dutyOfficers.FM) state.dutyOfficers.FM = 'S. Tan';
    if (!state.dutyOfficers.CR) state.dutyOfficers.CR = 'P. Lim';
    if (!state.dutyOfficers.FU) state.dutyOfficers.FU = 'K. Wong';
    state.sitrepCounter = (state.sitrepCounter || 0) + 1;
    const today = new Date();
    state.weekNumber = state.weekNumber || isoWeekNumber(today);
    const text = renderCMASitrep('Nominal operational activity across the fleet. A few technical cases under FM watch, Crewing reliefs in progress, FU shipyards within plan.');
    state.sitreps.unshift({ id: id(), ts: nowISO(), num: state.sitrepCounter, text });
  }

  function openImportPreview(rows) {
    const sample = rows.slice(0, 5);
    const fleets = [...new Set(rows.map(r => r.Fleet).filter(Boolean))];
    const managers = [...new Set(rows.map(r => r['Ship Manager']).filter(Boolean))];
    openModal('CSV import — preview',
      el('div', {},
        el('div', { class: 'auth-info' },
          el('strong', {}, rows.length + ' rows detected in the CSV.'),
          el('div', { style: 'font-size:11.5px;margin-top:4px' },
            'Fleets : ' + (fleets.length ? fleets.join(' · ') : '—') + ' · ',
            'Ship managers: ' + (managers.length ? managers.join(' · ') : '—'))),
        el('p', { class: 'muted', style: 'margin-top:10px' },
          'Vessels are identified by IMO (priority) or by name. If a vessel already exists, its fields are updated (local status, position and notes preserved).'),
        el('h4', {}, 'Preview (5 premières lignes)'),
        el('div', { style: 'overflow:auto;max-height:200px' },
          tableEl(['VesselName', 'IMO', 'Fleet', 'Ship Manager', 'Fuel type', 'M/E type'],
            sample.map(r => [r.VesselName || '—', r.IMO || '—', r.Fleet || '—',
              r['Ship Manager'] || '—', r['Fuel type'] || '—', r['M/E type'] || '—']))),
        (() => {
          const seedCb = el('input', { type: 'checkbox' }); seedCb.checked = true;
          const slider = el('input', { type: 'range', min: 0, max: 100, value: 25, style: 'flex:1' });
          const out = el('output', { style: 'min-width:36px;text-align:right;font-family:var(--mono)' }, '25');
          slider.addEventListener('input', () => out.value = slider.value);
          return el('div', { style: 'margin-top:14px;padding:10px;background:rgba(58,160,255,.08);border-radius:6px' },
            el('label', { class: 'flex', style: 'cursor:pointer;margin-bottom:8px' },
              seedCb, el('span', { style: 'margin-left:8px' },
                el('strong', {}, 'Generate synthetic data (demo / test)'),
                el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:2px' },
                  'Realistic cases (M/E, A/E, Drydock, PSC, Manning…) distributed across the imported vessels. Also includes a sample CMA SITREP.'))),
            el('div', { class: 'flex', style: 'gap:10px;align-items:center' },
              el('span', { class: 'muted', style: 'font-size:12px;min-width:90px' }, 'Cases:'),
              slider, out),
            el('div', { class: 'flex', style: 'margin-top:14px' },
              el('button', { class: 'btn-primary', onclick: () => {
                const stats = mergeImportedVessels(rows);
                let extra = '';
                if (seedCb.checked) {
                  const n = parseInt(slider.value, 10) || 0;
                  const created = generateSyntheticDossiers(n);
                  generateSyntheticSitrep();
                  extra = ` · ${created} synthetic cases + 1 sample SITREP`;
                }
                logMEL('VESSEL', `CSV import: ${stats.added} added · ${stats.updated} updated · ${stats.skipped} skipped (total ${stats.total})${extra}`);
                toast(`Import: ${stats.added} added · ${stats.updated} updated${extra}`, 'ok');
                save(); closeModal(); setTab('vessels');
              } }, '✓ Import ' + rows.length + 'vessels'),
              el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')));
        })()
      ));
  }

  function exportVesselsCSV() {
    if (state.vessels.length === 0) { toast('Register vide.', 'warn'); return; }
    const headers = ['VesselName','IMO','Series','Hull_Nb','Previous name','2nd hand?',
      'Fleet','Ship Manager','SI','SI_email','SI_Mobile','Fleet Manager','Email',
      'Flag','Class','Registered Owner','Bareboat','Contractual owner','Contractual shipmanager',
      'Resident Agent','Gross Tonnage','Capacity','LOA (m)','Breadth (m)','Yard','Built in',
      'M/E Designer','M/E Licensee','M/E type','M/E mark','M/E stroke','M/E units','M/E bore',
      'M/E TIII Technology','M/E T/C Maker','M/E T/C Model','Lubricator','A/E TIII Technology',
      'Fuel type','Cargo cranes','Cargo cranes nb','Cargo cranes maker','Cargo cranes model',
      'NaviSys Contract holder','First LNG Bunkering','DPA/CSO','Deputy DPA/CSO','MSO',
      'Safety Group','Safety Group email','CrewNb','Crew Manager (FR)','Crew Manager (INTL)',
      'Citadel','MS Teams onboard?','Fleet entry date','Delivery date','Class anniversary date','Out of Management date'];
    const escape = (s) => { s = (s == null ? '' : String(s)); return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csvMap = (v) => ({
      VesselName: v.name, IMO: v.imo, Series: v.type, Hull_Nb: v.hullNb,
      'Previous name': v.previousName, '2nd hand?': v.secondHand,
      Fleet: v.fleet, 'Ship Manager': v.shipManager, SI: v.SI, SI_email: v.SI_email, SI_Mobile: v.SI_mobile,
      'Fleet Manager': v.fleetManager, Email: v.fleetManagerEmail,
      Flag: v.flag, Class: v['class'], 'Registered Owner': v.registeredOwner, Bareboat: v.bareboat,
      'Contractual owner': v.contractualOwner, 'Contractual shipmanager': v.contractualShipmanager,
      'Resident Agent': v.residentAgent, 'Gross Tonnage': v.GT, Capacity: v.capacity,
      'LOA (m)': v.LOA, 'Breadth (m)': v.breadth, Yard: v.yard, 'Built in': v.builtIn,
      'M/E Designer': v.ME_designer, 'M/E Licensee': v.ME_licensee, 'M/E type': v.ME_type,
      'M/E mark': v.ME_mark, 'M/E stroke': v.ME_stroke, 'M/E units': v.ME_units, 'M/E bore': v.ME_bore,
      'M/E TIII Technology': v.ME_TIII, 'M/E T/C Maker': v.ME_TC_maker, 'M/E T/C Model': v.ME_TC_model,
      Lubricator: v.lubricator, 'A/E TIII Technology': v.AE_TIII,
      'Fuel type': v.fuelType || v.fuelMode,
      'Cargo cranes': v.cargoCranes, 'Cargo cranes nb': v.cargoCranesNb,
      'Cargo cranes maker': v.cargoCranesMaker, 'Cargo cranes model': v.cargoCranesModel,
      'NaviSys Contract holder': v.naviSysContractHolder, 'First LNG Bunkering': v.firstLNGBunkering,
      'DPA/CSO': v.DPA_CSO, 'Deputy DPA/CSO': v.deputyDPA, MSO: v.MSO,
      'Safety Group': v.safetyGroup, 'Safety Group email': v.safetyGroupEmail,
      CrewNb: v.crewNb, 'Crew Manager (FR)': v.crewMgrFR, 'Crew Manager (INTL)': v.crewMgrINTL,
      Citadel: v.citadel, 'MS Teams onboard?': v.msTeamsOnboard,
      'Fleet entry date': v.fleetEntryDate, 'Delivery date': v.deliveryDate,
      'Class anniversary date': v.classAnniversary, 'Out of Management date': v.outOfMgmtDate
    });
    const lines = [headers.map(escape).join(',')];
    state.vessels.forEach(v => {
      const m = csvMap(v);
      lines.push(headers.map(h => escape(m[h])).join(','));
    });
    download(`CMA_Ships_fleet_${new Date().toISOString().slice(0,10)}.csv`, lines.join('\n'));
    toast('Export CSV (' + state.vessels.length + 'vessels)', 'ok');
  }
  function vesselForm(idEdit) {
    const v = idEdit ? state.vessels.find(x => x.id === idEdit) : { status: 'normal' };
    const name = el('input', { value: v.name || '' });
    const imo = el('input', { value: v.imo || '' });
    const type = el('input', { value: v.type || '', placeholder: 'ULCV, NEO Panamax, RoRo, LNG…' });
    const status = el('select', {}, ...[['normal','Normal'],['risk','À risque'],['incident','Incident'],['safe','Mise en sécurité'],['port','Port refuge']]
      .map(([k, l]) => el('option', { value: k, selected: v.status === k }, l)));
    const position = el('input', { value: v.position || '' });
    const notes = el('textarea', {}, v.notes || '');
    const submit = () => {
      const data = { id: v.id || id(), name: name.value, imo: imo.value, type: type.value, status: status.value, position: position.value, notes: notes.value };
      if (idEdit) state.vessels[state.vessels.findIndex(x => x.id === idEdit)] = data;
      else { state.vessels.push(data); logMEL('VESSEL', `Vessel ${data.name} ajouté`); }
      save(); closeModal(); setTab('vessels');
    };
    openModal(idEdit ? 'Edit navire' : 'New vessel',
      el('div', {},
        twoCol('Name', name, 'IMO', imo),
        twoCol('Type', type, 'Status', status),
        field('Position', position),
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, idEdit ? 'Update' : 'Create'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
        )
      ), { onSubmit: submit });
  }
  function deleteVessel(idDel) { if (confirm('Remove??')) { state.vessels = state.vessels.filter(v => v.id !== idDel); save(); setTab('vessels'); } }

  // ============================================================
  //   MEL
  // ============================================================
  renderers.mel = (root) => {
    const cat = el('select', {}, ...['INFO','DOSSIER','DECISION','COMMS','ACTION','VESSEL','DOSIT','OTHER']
      .map(c => el('option', { value: c }, c)));
    const author = el('input', { value: currentUserName(), list: 'dl-authors' });
    const text = el('textarea', { placeholder: 'Note (Ctrl+Enter to send)' });
    const submit = () => {
      if (!text.value.trim()) return;
      logMEL(cat.value, text.value.trim(), author.value || currentUserName() || 'Anonyme');
      text.value = '';
      setTab('mel');
    };
    text.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); submit(); } });
    root.appendChild(panel('Duty Log',
      el('div', {},
        el('p', { class: 'muted' }, 'Duty Manager chronological journal (cf. Duty Manager JD: "Maintain the Duty Log in real time"). Notes au fil de l\'eau, traçabilité pour audit et passation. Distinct from Cases (long follow-up) and Actions (to-do).'),
        twoCol('Category', cat, 'Author', author),
        field('Note', text),
        el('button', { class: 'btn-primary', onclick: submit }, '+ Record')
      )
    ));
    root.appendChild(panel('Entries',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'No entry yet.')
        : el('div', {}, ...state.mel.map(meEntry)),
      el('button', { class: 'btn-ghost btn-sm', onclick: exportMEL }, '⬇ Export text')
    ));
  };
  function melForm() {
    setTab('mel');
    setTimeout(() => {
      const ta = $('#main textarea');
      if (ta) ta.focus();
    }, 50);
  }
  function exportMEL() {
    const lines = ['MAIN EVENTS LOG — CMA Ships Crisis Cell', '='.repeat(60), ''];
    [...state.mel].reverse().forEach(e => lines.push(`[${fmtDTG(e.ts)}] [${e.cat}] (${e.author}) ${e.text}`));
    download(`MEL_${Date.now()}.txt`, lines.join('\n'));
  }

  // ============================================================
  //   TEAM
  // ============================================================
  renderers.team = (root) => {
    root.appendChild(panel('Crisis cell',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Simplified organization — 6 key functions. Several people can share a function (pair, relief).'),
          el('button', { class: 'btn-primary', onclick: () => teamForm() }, '+ Add')
        ),
        state.team.length === 0
          ? el('div', { class: 'empty' }, 'Empty.')
          : tableEl(['Role', 'Name', 'Contact', 'Astreinte', 'Status', ''],
            state.team.map(t => [
              el('span', {}, badge(t.role, 'blue'), ' ', roleName(t.role)),
              t.name, t.contact, t.shift || '',
              badge(t.online ? 'En ligne' : 'Off', t.online ? 'green' : 'grey'),
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => teamForm(t.id) }, 'Edit'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Remove??')) { state.team = state.team.filter(x => x.id !== t.id); save(); setTab('team'); } } }, '✕')
              )
            ]))
      )
    ));
    root.appendChild(panel('Roles reference',
      el('div', { class: 'cards' },
        ...window.ROLES.map(r => el('div', { class: 'card' },
          el('div', { class: 'card-title' }, `[${r.code}] ${r.name}`),
          el('div', { class: 'card-body muted' }, r.desc)
        )))
    ));
  };
  function roleName(code) { const r = window.ROLES.find(x => x.code === code); return r ? r.name : code; }
  function teamForm(idEdit) {
    const m = idEdit ? state.team.find(x => x.id === idEdit) : { role: 'DIR', online: true };
    const role = el('select', {}, ...window.ROLES.map(r => el('option', { value: r.code, selected: m.role === r.code }, `[${r.code}] ${r.name}`)));
    const name = el('input', { value: m.name || '' });
    const contact = el('input', { value: m.contact || '' });
    const shift = el('input', { value: m.shift || '', placeholder: 'Jour / Nuit / 24x7' });
    const online = el('input', { type: 'checkbox' }); online.checked = !!m.online;
    const submit = () => {
      const data = { id: m.id || id(), role: role.value, name: name.value, contact: contact.value, shift: shift.value, online: online.checked };
      if (idEdit) state.team[state.team.findIndex(x => x.id === idEdit)] = data;
      else { state.team.push(data); logMEL('INFO', `${data.name} en ${data.role}`); }
      save(); closeModal(); setTab('team');
    };
    openModal(idEdit ? 'Edit membre' : 'Nouveau membre',
      el('div', {},
        twoCol('Role', role, 'Name', name),
        twoCol('Contact', contact, 'Astreinte', shift),
        el('label', { class: 'flex', style: 'margin-top:6px' }, online, el('span', { style: 'margin-left:6px' }, 'En ligne / mobilisé')),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   ACTIONS
  // ============================================================
  renderers.actions = (root) => {
    const open = state.actions.filter(a => a.status !== 'done');
    const done = state.actions.filter(a => a.status === 'done');
    root.appendChild(panel('Action tracking',
      el('div', {},
        el('p', { class: 'muted' }, 'Actions from the Daily Stand-up, WOR or Cases. Operational follow-up by department (DO) or transverse (DM). Distinct from Cases (long-term follow-up) and Duty Log (chronological notes).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${open.length} open — ${done.length} closed`),
          el('button', { class: 'btn-primary', onclick: () => actionForm() }, '+ Action (a)')
        ),
        open.length === 0 ? el('div', { class: 'empty' }, 'No action.')
          : tableEl(['Pri.', 'Dept', 'Description', 'Owner', 'Due date', 'Status', ''], open.map(actionRow))
      )
    ));
    if (done.length) root.appendChild(panel('Closed',
      tableEl(['Pri.', 'Dept', 'Description', 'Owner', 'Due date', 'Status', ''], done.map(actionRow))));
  };
  function actionRow(a) {
    const overdue = a.due && new Date(a.due) < new Date() && a.status !== 'done';
    return [
      badge(a.priority || 'P3', a.priority === 'P1' ? 'red' : a.priority === 'P2' ? 'orange' : 'blue'),
      badge(a.department || 'XX', 'blue'),
      a.text, a.owner || '—',
      el('span', { class: overdue ? 'badge red' : '' }, fmtTime(a.due)),
      el('span', { class: 'editable', onclick: () => cycleActionStatus(a.id) }, badge(a.status, a.status === 'done' ? 'green' : a.status === 'in-progress' ? 'orange' : 'blue')),
      el('div', { class: 'flex' },
        el('button', { class: 'btn-ghost btn-sm', onclick: () => actionForm(a.id) }, 'Edit'),
        a.status !== 'done' ? el('button', { class: 'btn-success btn-sm', onclick: () => closeAction(a.id) }, '✓') : null,
        el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.actions = state.actions.filter(x => x.id !== a.id); save(); setTab('actions'); } } }, '✕')
      )
    ];
  }
  function cycleActionStatus(idAct) {
    const a = state.actions.find(x => x.id === idAct);
    if (!a) return;
    const order = ['todo', 'in-progress', 'blocked', 'done'];
    a.status = order[(order.indexOf(a.status) + 1) % order.length];
    if (a.status === 'done') a.closedAt = nowISO();
    save(); setTab('actions');
  }
  function actionForm(idEdit) {
    const a = idEdit ? state.actions.find(x => x.id === idEdit) : { priority: 'P2', status: 'todo', department: 'FM' };
    const priority = el('select', {}, ...['P1','P2','P3'].map(p => el('option', { value: p, selected: a.priority === p }, p)));
    const status = el('select', {}, ...[['todo','To do'],['in-progress','In progress'],['blocked','Blocked'],['done','Done']]
      .map(([k, l]) => el('option', { value: k, selected: a.status === k }, l)));
    const department = el('select', {}, ...window.DEPARTMENTS.map(d => el('option', { value: d.code, selected: (a.department || 'FM') === d.code }, d.code + ' — ' + d.label)));
    const text = el('textarea', { placeholder: 'Concrete, measurable, assignable action' }, a.text || '');
    const owner = el('input', { value: a.owner || currentUserName(), list: 'dl-owners' });
    const due = el('input', { type: 'datetime-local', value: a.due ? new Date(a.due).toISOString().slice(0, 16) : '' });
    const submit = () => {
      const data = { id: a.id || id(), text: text.value, owner: owner.value,
        due: due.value ? new Date(due.value).toISOString() : '',
        priority: priority.value, status: status.value,
        department: department.value,
        createdAt: a.createdAt || nowISO() };
      if (idEdit) state.actions[state.actions.findIndex(x => x.id === idEdit)] = data;
      else { state.actions.push(data); logMEL('ACTION', `Action [${data.department}]: ${data.text} (${data.priority})`); }
      save(); closeModal(); setTab('actions');
    };
    openModal(idEdit ? 'Edit action' : 'New action',
      el('div', {},
        field('Description', text),
        twoCol('Owner', owner, 'Due date', due),
        twoCol('Priority', priority, 'Status', status),
        field('Department', department),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
        )
      ), { onSubmit: submit });
  }
  function closeAction(idDel) {
    const a = state.actions.find(x => x.id === idDel);
    a.status = 'done'; a.closedAt = nowISO();
    logMEL('ACTION', `Closed: ${a.text}`);
    save(); setTab('actions');
  }

  // ============================================================
  //   DECISIONS
  // ============================================================
  renderers.decisions = (root) => {
    root.appendChild(panel('Arbitrations',
      el('div', {},
        el('p', { class: 'muted' }, 'Arbitrations routine (Duty Officer intra-département, Duty Manager transverse) — cf. JDs CMA Ships : "Take routine technical arbitrations within the operational perimeter". Traçabilité légère : contexte / décision / mise en œuvre. Subjects dépassant le périmètre routine → escalade au Head ou VP.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.decisions.length} arbitration(s) recorded`),
          el('button', { class: 'btn-primary', onclick: () => decisionForm() }, '+ Arbitration (d)')
        ),
        state.decisions.length === 0 ? el('div', { class: 'empty' }, 'No arbitration.')
          : el('div', { class: 'cards' }, ...state.decisions.map(d => {
              // Compatibilité ascendante : d'anciennes entrées peuvent contenir
              // les champs Observe/Orient/Decide/Act ; on les agrège en
              // contexte/décision/mise en œuvre s'ils sont présents.
              const ctx = d.context || [d.observe, d.orient].filter(Boolean).join('\n');
              const dec = d.decision || d.decide || '';
              const exec = d.execution || d.act || '';
              return el('div', { class: 'card' },
                el('div', { class: 'flex-between' },
                  el('div', { class: 'card-title' }, d.title),
                  el('div', {}, badge(d.status, d.status === 'executed' ? 'green' : d.status === 'rejected' ? 'red' : 'orange'),
                    ' ', el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(d.ts)))),
                el('div', { class: 'card-meta' }, `Decider: ${d.decider || '—'}`),
                el('div', { class: 'card-body' },
                  el('div', {}, el('strong', {}, 'Context: '), ctx || '—'),
                  el('div', {}, el('strong', {}, 'Decision: '), dec || '—'),
                  el('div', {}, el('strong', {}, 'Implementation: '), exec || '—')),
                el('div', { class: 'card-actions' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => decisionForm(d.id) }, 'Edit'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.decisions = state.decisions.filter(x => x.id !== d.id); save(); setTab('decisions'); } } }, '✕')
                ));
            }))
      )
    ));
  };
  function decisionForm(idEdit) {
    const d = idEdit ? state.decisions.find(x => x.id === idEdit) : { status: 'pending' };
    const initCtx = d.context || [d.observe, d.orient].filter(Boolean).join('\n');
    const initDec = d.decision || d.decide || '';
    const initExec = d.execution || d.act || '';
    const title = el('input', { value: d.title || '' });
    const decider = el('input', { value: d.decider || currentUserName() });
    const context = el('textarea', { placeholder: 'Situation, facts motivating the decision, options considered' }, initCtx);
    const decision = el('textarea', { placeholder: 'Decision retenue + justification' }, initDec);
    const execution = el('textarea', { placeholder: 'Implementation: qui, quoi, quand' }, initExec);
    const status = el('select', {}, ...[['pending','Pending'],['executed','Executed'],['rejected','Rejected']]
      .map(([k, l]) => el('option', { value: k, selected: d.status === k }, l)));
    const submit = () => {
      const data = { id: d.id || id(), title: title.value, decider: decider.value,
        context: context.value, decision: decision.value, execution: execution.value,
        status: status.value, ts: d.ts || nowISO() };
      if (idEdit) state.decisions[state.decisions.findIndex(x => x.id === idEdit)] = data;
      else { state.decisions.unshift(data); logMEL('DECISION', `Decision: ${data.title} (${data.status})`); }
      save(); closeModal(); setTab('decisions');
    };
    openModal(idEdit ? 'Edit arbitration' : 'New arbitration',
      el('div', {},
        twoCol('Title', title, 'Decider', decider),
        field('Context', context),
        field('Decision', decision),
        field('Implementation', execution),
        field('Status', status),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Record'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   ANTICIPATION — H+6 / H+24 / H+72 (REX nucléaire)
  // ============================================================
  renderers.anticipation = (root) => {
    root.appendChild(panel('Look-ahead cell — forecasting',
      el('div', {},
        el('p', { class: 'muted' }, 'EDF/ASN-inspired : the look-ahead cell produces best/likely/worst scenarios at H+6, H+24, H+72, séparée de l\'action immédiate. Permet d\'éviter le tunnel et préparer les décisions à venir.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.anticipation.length} scenario(s)`),
          el('button', { class: 'btn-primary', onclick: () => anticipationForm() }, '+ Scenario')
        ),
        state.anticipation.length === 0 ? el('div', { class: 'empty' }, 'No scenario.')
          : el('div', { class: 'cards' }, ...['6H','24H','72H'].flatMap(h => {
              const items = state.anticipation.filter(a => a.horizon === h);
              if (!items.length) return [];
              return [
                el('h4', { style: 'margin:8px 0 4px;color:var(--accent-2)' }, 'Horizon ' + h),
                ...items.map(a => el('div', { class: 'card' },
                  el('div', { class: 'card-title' }, a.title || '(sans titre)'),
                  el('div', { class: 'card-meta' }, `Owner : ${a.owner || '—'} · ${fmtDTG(a.ts)}`),
                  el('div', { class: 'card-body' },
                    el('div', {}, el('strong', { style: 'color:var(--ok)' }, '✓ Best case : '), a.best || '—'),
                    el('div', {}, el('strong', { style: 'color:var(--warn)' }, '◯ Likely: '), a.likely || '—'),
                    el('div', {}, el('strong', { style: 'color:var(--danger)' }, '✗ Worst case : '), a.worst || '—'),
                    a.signals ? el('div', { style: 'margin-top:6px' }, el('strong', {}, 'Signals to monitor: '), a.signals) : null
                  ),
                  el('div', { class: 'card-actions' },
                    el('button', { class: 'btn-ghost btn-sm', onclick: () => anticipationForm(a.id) }, 'Edit'),
                    el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.anticipation = state.anticipation.filter(x => x.id !== a.id); save(); setTab('anticipation'); } } }, '✕')
                  )))
              ];
            }))
      )
    ));
  };
  function anticipationForm(idEdit) {
    const a = idEdit ? state.anticipation.find(x => x.id === idEdit) : { horizon: '24H' };
    const horizon = el('select', {}, ...['6H','24H','72H'].map(h => el('option', { value: h, selected: a.horizon === h }, 'H+' + h)));
    const title = el('input', { value: a.title || '' });
    const owner = el('input', { value: a.owner || currentUserName(), list: 'dl-owners' });
    const best = el('textarea', { placeholder: 'Favourable scenario' }, a.best || '');
    const likely = el('textarea', { placeholder: 'Likely scenario' }, a.likely || '');
    const worst = el('textarea', { placeholder: 'Adverse scenario' }, a.worst || '');
    const signals = el('textarea', { placeholder: 'Weak / strong signals to monitor (switch triggers)' }, a.signals || '');
    const submit = () => {
      const data = { id: a.id || id(), horizon: horizon.value, title: title.value, owner: owner.value,
        best: best.value, likely: likely.value, worst: worst.value, signals: signals.value, ts: a.ts || nowISO() };
      if (idEdit) state.anticipation[state.anticipation.findIndex(x => x.id === idEdit)] = data;
      else { state.anticipation.push(data); logMEL('INFO', `Anticipation H+${data.horizon} : ${data.title}`); }
      save(); closeModal(); setTab('anticipation');
    };
    openModal(idEdit ? 'Edit scénario' : 'New scenario',
      el('div', {},
        twoCol('Horizon', horizon, 'Owner', owner),
        field('Title', title),
        field('✓ Best case', best),
        field('◯ Likely', likely),
        field('✗ Worst case', worst),
        field('Signals to monitor', signals),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   COMMS
  // ============================================================
  renderers.comms = (root) => {
    root.appendChild(panel('Communications (accessory)',
      el('div', {},
        el('p', { class: 'muted' }, 'Accessory tab — single-voice external communication is carried by the Duty Manager and VP. Use occasionally to track a sensitive communication (charterer, flag state, shipyard).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.comms.length} comm(s) tracked`),
          el('button', { class: 'btn-primary', onclick: () => commsForm() }, '+ Comm (k)')
        ),
        state.comms.length === 0 ? el('div', { class: 'empty' }, 'No comm.')
          : tableEl(['Direction', 'DTG', 'Channel', 'From/To', 'Subject', 'Validation', 'Content', ''],
            state.comms.map(c => [
              badge(c.dir === 'in' ? '⇓ IN' : '⇑ OUT', c.dir === 'in' ? 'blue' : 'orange'),
              el('span', { class: 'mono' }, fmtDTG(c.ts)),
              c.channel || '', c.party || '', c.subject || '',
              c.validated ? badge('✓ ' + (c.validatedBy || ''), 'green') : badge('—', 'grey'),
              el('div', { style: 'white-space:pre-wrap;font-size:12px;max-width:400px' }, c.body || ''),
              el('button', { class: 'btn-danger btn-sm', onclick: () => { state.comms = state.comms.filter(x => x.id !== c.id); save(); setTab('comms'); } }, '✕')
            ]))
      )
    ));
  };
  function commsForm() {
    const dir = el('select', {}, el('option', { value: 'in' }, '⇓ Incoming'), el('option', { value: 'out' }, '⇑ Outgoing'));
    const channel = el('input', { list: 'dl-channels', placeholder: 'VHF, Inmarsat…' });
    const party = el('input', { list: 'dl-parties' });
    const subject = el('input', {});
    const body = el('textarea', {});
    const validated = el('input', { type: 'checkbox' });
    const validatedBy = el('input', { placeholder: 'Name du validateur (DIR/COM)' });
    const submit = () => {
      state.comms.unshift({
        id: id(), ts: nowISO(),
        dir: dir.value, channel: channel.value, party: party.value,
        subject: subject.value, body: body.value,
        validated: validated.checked, validatedBy: validatedBy.value
      });
      logMEL('COMMS', `${dir.value === 'in' ? '⇓' : '⇑'} ${channel.value} — ${party.value}: ${subject.value}`);
      save(); closeModal(); setTab('comms');
    };
    openModal('New communication',
      el('div', {},
        twoCol('Direction', dir, 'Channel', channel),
        twoCol('From/To', party, 'Subject', subject),
        field('Content', body),
        el('label', { class: 'flex' }, validated, el('span', { style: 'margin-left:6px' }, 'Single-voice validated')),
        field('Validated by', validatedBy),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Save'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   STAKEHOLDERS
  // ============================================================
  renderers.stakeholders = (root) => {
    root.appendChild(panel('Crisis directory',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, '24/7 reachable'),
          el('button', { class: 'btn-primary', onclick: () => stakeholderForm() }, '+ Add')
        ),
        state.stakeholders.length === 0 ? el('div', { class: 'empty' }, 'Empty.')
          : tableEl(['Pri.', 'Name', 'Role', 'Contact', ''],
            state.stakeholders.slice().sort((a, b) => (a.priority || 'P3').localeCompare(b.priority || 'P3'))
              .map(s => [
                badge(s.priority || 'P3', s.priority === 'P1' ? 'red' : s.priority === 'P2' ? 'orange' : 'blue'),
                s.name, s.role, el('span', { class: 'mono' }, s.contact),
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => stakeholderForm(s.id) }, 'Edit'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.stakeholders = state.stakeholders.filter(x => x.id !== s.id); save(); setTab('stakeholders'); } } }, '✕'))
              ]))
      )
    ));
  };
  function stakeholderForm(idEdit) {
    const s = idEdit ? state.stakeholders.find(x => x.id === idEdit) : { priority: 'P2' };
    const name = el('input', { value: s.name || '' });
    const role = el('input', { value: s.role || '' });
    const contact = el('input', { value: s.contact || '' });
    const priority = el('select', {}, ...['P1','P2','P3'].map(p => el('option', { value: p, selected: s.priority === p }, p)));
    const submit = () => {
      const data = { id: s.id || id(), name: name.value, role: role.value, contact: contact.value, priority: priority.value };
      if (idEdit) state.stakeholders[state.stakeholders.findIndex(x => x.id === idEdit)] = data;
      else state.stakeholders.push(data);
      save(); closeModal(); setTab('stakeholders');
    };
    openModal(idEdit ? 'Edit' : 'New contact',
      el('div', {},
        twoCol('Name/Org', name, 'Role', role),
        twoCol('Contact', contact, 'Priority', priority),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   RESOURCES — moyens mobilisés (salvors, remorqueurs, médical)
  // ============================================================
  renderers.resources = (root) => {
    root.appendChild(panel('Mobilized resources',
      el('div', {},
        el('p', { class: 'muted' }, 'Operational tracking of engaged assets: tugs, LOF salvors, medical teams, embedded protection teams, port agents, legal support.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.resources.length} resource(s)`),
          el('button', { class: 'btn-primary', onclick: () => resourceForm() }, '+ Resource')
        ),
        state.resources.length === 0 ? el('div', { class: 'empty' }, 'No resource.')
          : tableEl(['Type', 'Designation', 'Status', 'ETA', 'Capacity', 'Contact', 'Notes', ''],
            state.resources.map(r => [
              badge(r.type, 'blue'), r.name,
              badge(r.status, r.status === 'on-site' ? 'green' : r.status === 'enroute' ? 'orange' : r.status === 'standby' ? 'blue' : 'grey'),
              fmtTime(r.eta), r.capacity || '—',
              el('span', { class: 'mono' }, r.contact || '—'),
              r.notes || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => resourceForm(r.id) }, 'Edit'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.resources = state.resources.filter(x => x.id !== r.id); save(); setTab('resources'); } } }, '✕'))
            ]))
      )
    ));
  };
  function resourceForm(idEdit) {
    const r = idEdit ? state.resources.find(x => x.id === idEdit) : { status: 'requested' };
    const type = el('select', {}, ...['Tug','Salvor','Medical','Protection (PCASP)','Air (helo/plane)','Maritime agent','Legal','Divers','Other']
      .map(t => el('option', { value: t, selected: r.type === t }, t)));
    const name = el('input', { value: r.name || '' });
    const status = el('select', {}, ...[['requested','Requested'],['confirmed','Confirmed'],['enroute','En route'],['on-site','On site'],['released','Released']]
      .map(([k, l]) => el('option', { value: k, selected: r.status === k }, l)));
    const eta = el('input', { type: 'datetime-local', value: r.eta ? new Date(r.eta).toISOString().slice(0, 16) : '' });
    const capacity = el('input', { value: r.capacity || '', placeholder: 'BHP, IBP, slots, capacity' });
    const contact = el('input', { value: r.contact || '' });
    const notes = el('textarea', {}, r.notes || '');
    const submit = () => {
      const data = { id: r.id || id(), type: type.value, name: name.value, status: status.value,
        eta: eta.value ? new Date(eta.value).toISOString() : '',
        capacity: capacity.value, contact: contact.value, notes: notes.value };
      if (idEdit) state.resources[state.resources.findIndex(x => x.id === idEdit)] = data;
      else { state.resources.push(data); logMEL('INFO', `Resource mobilized: ${data.type} — ${data.name}`); }
      save(); closeModal(); setTab('resources');
    };
    openModal(idEdit ? 'Edit ressource' : 'New resource',
      el('div', {},
        twoCol('Type', type, 'Designation', name),
        twoCol('Status', status, 'ETA', eta),
        twoCol('Capacity', capacity, 'Contact', contact),
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   RISK MATRIX
  // ============================================================
  renderers.risk = (root) => {
    root.appendChild(panel('5×5 matrix',
      el('div', {},
        el('p', { class: 'muted' }, 'Likelihood × Severity. Click a cell to add.'),
        riskMatrixView()
      )
    ));
    root.appendChild(panel('Register',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.risks.length} risque(s)`),
          el('button', { class: 'btn-primary', onclick: () => riskForm() }, '+ Risk')
        ),
        state.risks.length === 0 ? el('div', { class: 'empty' }, 'None.')
          : tableEl(['Title', 'L', 'S', 'Score', 'Mitigation', 'Owner', ''],
            state.risks.map(r => [r.title, r.likelihood, r.severity,
              badge(r.likelihood * r.severity, riskScoreClass(r.likelihood * r.severity).replace('r-', '').replace('crit', 'red').replace('high', 'orange').replace('med', 'yellow').replace('low', 'green')),
              r.mitigation || '', r.owner || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => riskForm(r.id) }, 'Edit'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.risks = state.risks.filter(x => x.id !== r.id); save(); setTab('risk'); } } }, '✕'))
            ]))
      )
    ));
  };
  function riskMatrixView() {
    const matrix = el('div', { class: 'risk-matrix' });
    matrix.appendChild(el('div', { class: 'risk-cell head' }, ''));
    for (let s = 1; s <= 5; s++) matrix.appendChild(el('div', { class: 'risk-cell head' }, 'S' + s));
    for (let l = 5; l >= 1; l--) {
      matrix.appendChild(el('div', { class: 'risk-cell head' }, 'L' + l));
      for (let s = 1; s <= 5; s++) {
        const score = l * s;
        const cls = riskScoreClass(score);
        const count = state.risks.filter(r => r.likelihood === l && r.severity === s).length;
        const cell = el('div', { class: 'risk-cell ' + cls, onclick: () => riskForm(null, l, s) }, score.toString());
        if (count) cell.appendChild(el('span', { class: 'count' }, count.toString()));
        matrix.appendChild(cell);
      }
    }
    return matrix;
  }
  function riskScoreClass(s) {
    if (s >= 17) return 'r-crit';
    if (s >= 11) return 'r-high';
    if (s >= 6)  return 'r-med';
    return 'r-low';
  }
  function riskForm(idEdit, defL, defS) {
    const r = idEdit ? state.risks.find(x => x.id === idEdit) : { likelihood: defL || 3, severity: defS || 3 };
    const title = el('input', { value: r.title || '' });
    const likelihood = el('input', { type: 'number', min: 1, max: 5, value: r.likelihood || 3 });
    const severity = el('input', { type: 'number', min: 1, max: 5, value: r.severity || 3 });
    const mitigation = el('textarea', {}, r.mitigation || '');
    const owner = el('input', { value: r.owner || currentUserName(), list: 'dl-owners' });
    const submit = () => {
      const data = { id: r.id || id(), title: title.value,
        likelihood: parseInt(likelihood.value, 10) || 1, severity: parseInt(severity.value, 10) || 1,
        mitigation: mitigation.value, owner: owner.value };
      if (idEdit) state.risks[state.risks.findIndex(x => x.id === idEdit)] = data;
      else state.risks.push(data);
      save(); closeModal(); setTab('risk');
    };
    openModal(idEdit ? 'Edit risque' : 'New risk',
      el('div', {},
        field('Title', title),
        twoCol('Likelihood (1-5)', likelihood, 'Severity (1-5)', severity),
        twoCol('Owner', owner, '', el('span')),
        field('Mitigation', mitigation),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   BATTLE RHYTHM
  // ============================================================
  renderers.rhythm = (root) => {
    root.appendChild(panel('Battle Rhythm',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Briefing and SITREP cadence — HQ practice.'),
          el('button', { class: 'btn-primary', onclick: () => rhythmForm() }, '+ Meeting')
        ),
        state.rhythm.length === 0 ? el('div', { class: 'empty' }, 'Empty.')
          : tableEl(['Time', 'Title', 'Cadence', 'Description', ''],
            state.rhythm.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map(r => [el('span', { class: 'mono' }, r.time), r.title, r.cadence, r.desc,
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => rhythmForm(r.id) }, 'Edit'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.rhythm = state.rhythm.filter(x => x.id !== r.id); save(); setTab('rhythm'); } } }, '✕'))]))
      )
    ));
  };
  function rhythmForm(idEdit) {
    const r = idEdit ? state.rhythm.find(x => x.id === idEdit) : {};
    const time = el('input', { type: 'time', value: r.time || '08:00' });
    const title = el('input', { value: r.title || '' });
    const cadence = el('select', {}, ...['Daily','6H','12H','Weekly','On request'].map(c => el('option', { value: c, selected: r.cadence === c }, c)));
    const desc = el('textarea', {}, r.desc || '');
    const submit = () => {
      const data = { id: r.id || id(), time: time.value, title: title.value, cadence: cadence.value, desc: desc.value };
      if (idEdit) state.rhythm[state.rhythm.findIndex(x => x.id === idEdit)] = data;
      else state.rhythm.push(data);
      save(); closeModal(); setTab('rhythm');
    };
    openModal(idEdit ? 'Edit' : 'New meeting',
      el('div', {},
        twoCol('Time', time, 'Cadence', cadence),
        field('Title', title),
        field('Description', desc),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   PASSATION DE QUART (naval REX)
  // ============================================================
  renderers.passation = (root) => {
    root.appendChild(panel('Watch handover',
      el('div', {},
        el('p', { class: 'muted' }, 'Pratique navale obligatoire : transfert formel de responsabilité avec checklist signée par les deux parties. Inspiré de la relève en passerelle et de l\'ICS Form 201.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.passations.length} handover(s)`),
          el('button', { class: 'btn-primary', onclick: () => passationForm() }, '+ Handover')
        ),
        state.passations.length === 0 ? el('div', { class: 'empty' }, 'No handover.')
          : el('div', { class: 'cards' }, ...state.passations.map(p =>
            el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, `${p.fromUser || '?'} → ${p.toUser || '?'}`),
                el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(p.ts))),
              p.signoff ? badge('✓ Signed by ' + p.toUser, 'green') : badge('Awaiting sign-off', 'orange'),
              el('div', { class: 'card-body' },
                ...(p.items || []).map((it, idx) => el('div', { class: 'pb-step' },
                  el('span', {}, it.checked ? '✅' : '☐'),
                  el('span', { class: 'pb-text' + (it.checked ? ' done' : '') }, ` ${idx + 1}. ${it.label}` + (it.note ? ` — ${it.note}` : '')))),
                p.notes ? el('div', { style: 'margin-top:8px' }, el('strong', {}, 'Notes : '), p.notes) : null),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => passationForm(p.id) }, 'Edit'),
                !p.signoff ? el('button', { class: 'btn-success btn-sm', onclick: () => signoffPassation(p.id) }, '✓ Sign (relief)') : null,
                el('button', { class: 'btn-ghost btn-sm', onclick: () => download(`Passation_${p.id}.txt`, exportPassation(p)) }, '⬇ Export'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.passations = state.passations.filter(x => x.id !== p.id); save(); setTab('passation'); } } }, '✕')))))
      )
    ));
  };
  function passationForm(idEdit) {
    const p = idEdit ? state.passations.find(x => x.id === idEdit)
      : {
          ts: nowISO(),
          fromUser: currentUserName(),
          items: window.HANDOVER_CHECKLIST.map(label => ({ label, checked: false, note: '' }))
        };
    const fromUser = el('input', { value: p.fromUser || currentUserName() });
    const toUser = el('input', { value: p.toUser || '', placeholder: 'Name de la relève' });
    const notes = el('textarea', { placeholder: 'Additional notes libres' }, p.notes || '');
    // Pré-remplissage : récap auto des éléments d'état courants
    const autoFill = el('button', { class: 'btn-ghost btn-sm', onclick: () => {
      const open = state.actions.filter(a => a.status !== 'done');
      const incs = state.incidents.filter(i => i.status !== 'closed');
      const tip = [
        `CMA Ships mode: ${state.alert.toUpperCase()}`,
        `Open cases: ${incs.length}`,
        `Actions, open (P1) : ${open.filter(a => a.priority === 'P1').length}`,
        `Total actions, open : ${open.length}`,
        `Active resources: ${state.resources.filter(r => ['enroute','on-site','confirmed'].includes(r.status)).length}`
      ].join('\n');
      notes.value = (notes.value ? notes.value + '\n\n' : '') + tip;
    } }, '↓ Pré-remplir avec l\'état courant');

    const itemsBox = el('div');
    p.items.forEach((it, idx) => {
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!it.checked;
      const note = el('input', { placeholder: 'Note', value: it.note || '' });
      cb.addEventListener('change', () => it.checked = cb.checked);
      note.addEventListener('change', () => it.note = note.value);
      itemsBox.appendChild(el('div', { class: 'pb-step' }, cb,
        el('div', { style: 'flex:1' },
          el('div', { class: 'pb-text' }, `${idx + 1}. ${it.label}`),
          note)));
    });

    const submit = () => {
      const data = { id: p.id || id(),
        ts: p.ts || nowISO(),
        fromUser: fromUser.value, toUser: toUser.value,
        items: p.items, notes: notes.value, signoff: p.signoff || false };
      if (idEdit) state.passations[state.passations.findIndex(x => x.id === idEdit)] = data;
      else { state.passations.unshift(data); logMEL('INFO', `Handover ${data.fromUser} → ${data.toUser}`); }
      save(); closeModal(); setTab('passation');
    };
    openModal(idEdit ? 'Edit passation' : 'New watch handover',
      el('div', {},
        twoCol('From (outgoing)', fromUser, 'To (relief)', toUser),
        autoFill,
        el('h4', { style: 'margin:14px 0 6px' }, 'Checklist (tick as you go)'),
        itemsBox,
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Save'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }
  function signoffPassation(idP) {
    const p = state.passations.find(x => x.id === idP);
    if (!p) return;
    if (p.toUser !== currentUserName()) {
      if (!confirm(`You are logged in as "${currentUserName()}". The handover is for "${p.toUser}". Sign anyway??`)) return;
    }
    p.signoff = true; p.signoffTs = nowISO(); p.signoffBy = currentUserName();
    logMEL('INFO', `Handover signed by ${p.signoffBy}`);
    save(); setTab('passation');
  }
  function exportPassation(p) {
    const lines = [
      `PASSATION DE QUART — CMA Ships Crisis Cell`,
      `DTG : ${fmtDTG(p.ts)}`,
      `DE  : ${p.fromUser}`,
      `À   : ${p.toUser}`,
      `Sign-off : ${p.signoff ? '✓ ' + p.signoffBy + ' @ ' + fmtDTG(p.signoffTs) : 'EN ATTENTE'}`,
      '='.repeat(60),
      ''
    ];
    p.items.forEach((it, idx) => {
      lines.push(`[${it.checked ? 'X' : ' '}] ${idx + 1}. ${it.label}` + (it.note ? `\n      Note: ${it.note}` : ''));
    });
    if (p.notes) lines.push('', '--- Notes ---', p.notes);
    return lines.join('\n');
  }

  // ============================================================
  //   SITREP
  // ============================================================
  // ============================================================
  //   SITREP CMA SHIPS (trame officielle)
  // ============================================================
  // ============================================================
  //   MON SITREP — bloc département rédigé par le Duty Officer
  //   Alimente automatiquement le CMA Ships SITREP consolidated
  //   (Today's cases / Due dates 24-72 h / Frictions to report).
  // ============================================================
  function renderDoSitrep(root, dept) {
    state.lastDoDept = dept;
    const deptLabel = (window.DEPARTMENTS.find(d => d.code === dept) || {}).label || dept;
    const d = state.deptSitreps[dept] || { status: 'green', dossiers: '', deadlines: '', frictions: '' };

    const status = el('select', {}, ...[['green','VERT'],['amber','AMBRE'],['red','ROUGE']]
      .map(([k, l]) => el('option', { value: k, selected: d.status === k }, l)));
    const doName = el('input', { value: state.dutyOfficers[dept] || currentUserName(), placeholder: 'DO name ' + dept });

    // Today's cases : auto depuis l'onglet Dossiers, triés par sévérité.
    const sevOrderDo = { crit: 0, high: 1, med: 2, low: 3 };
    const openDossiers = state.incidents
      .filter(i => i.status !== 'closed' && (i.department || 'XX') === dept && i.includeInSitrep !== false)
      .slice()
      .sort((a, b) => (sevOrderDo[a.severity] ?? 9) - (sevOrderDo[b.severity] ?? 9));

    const dossiersPreview = el('div', {},
      openDossiers.length === 0
        ? el('div', { class: 'empty', style: 'padding:14px' }, 'No open case for ' + dept + '. Create un dossier dans l\'onglet "Dossiers" pour qu\'il apparaisse ici.')
        : el('div', {}, ...openDossiers.map(i => {
            const v = (i.vessel || 'n/a').toUpperCase();
            const raw = (i.sitrepLine || i.type || '').trim();
            const line = raw.toUpperCase().startsWith(v) ? raw : (raw ? v + ' — ' + raw : v);
            const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
            return el('div', {
              class: 'pb-step',
              style: 'cursor:pointer',
              onclick: () => incidentForm(i.id)
            },
              badge((i.severity || 'med').toUpperCase(), severityColor(i.severity)),
              badge(cls.short, cls.color),
              el('div', { class: 'pb-text', style: 'flex:1' },
                el('span', { class: 'mono', style: 'color:var(--muted);font-size:11px' }, i.ref + ' · '),
                line)
            );
          }))
    );

    // Due dates 24-72 h : auto depuis Actions du dept
    const now = Date.now();
    const in24 = now + 24 * 3600 * 1000;
    const in72 = now + 72 * 3600 * 1000;
    const dueActions = state.actions
      .filter(a => a.status !== 'done' && (a.department || 'XX') === dept &&
                   a.due && new Date(a.due).getTime() >= in24 && new Date(a.due).getTime() <= in72);
    const deadlinesPreview = el('div', {},
      dueActions.length === 0
        ? el('div', { class: 'empty', style: 'padding:14px' }, 'No deadline within the 24-72h window.')
        : el('div', {}, ...dueActions.map(a => el('div', { class: 'pb-step' },
            badge(a.priority || 'P3', a.priority === 'P1' ? 'red' : 'blue'),
            el('div', { class: 'pb-text', style: 'flex:1' },
              a.text, el('span', { class: 'muted', style: 'font-size:11px' }, ' — ' + (a.owner || '—') + ' (' + fmtDTG(a.due) + ')'))
          )))
    );

    const notesTxt = el('textarea', {
      placeholder: 'Additional notes for your SITREP block (optional)',
      style: 'min-height:60px'
    }, d.deadlines || '');

    const submit = () => {
      state.dutyOfficers[dept] = doName.value;
      state.deptSitreps[dept] = {
        status: status.value,
        dossiers: '',
        deadlines: notesTxt.value,
        frictions: '',
        updatedAt: nowISO(),
        updatedBy: currentUserName() || doName.value
      };
      logMEL('DOSIT', `Mon SITREP ${dept} validé par ${state.deptSitreps[dept].updatedBy}`);
      toast('Bloc ' + dept + ' validé — visible dans le SITREP CMA Ships', 'ok');
      save();
      setTab('dosit-' + dept.toLowerCase());
    };

    root.appendChild(panel('My SITREP — ' + dept + ' · ' + deptLabel,
      el('div', {},
        el('p', { class: 'muted' },
          'Duty Officer view ' + dept + '. Set status (G/A/R) and DO name. "Today\'s cases" and "24-72h deadlines" are automatically aggregated from your Cases and Actions tabs. Frictions are consolidated by the Duty Manager in the SITREP CMA tab.'),
        twoCol('Department status', status, 'Duty Officer (name)', doName),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' },
          'Today\'s cases ',
          el('span', { class: 'muted', style: 'font-weight:normal;font-size:11.5px' },
            '· auto depuis l\'onglet "Dossiers" (synthèse une-ligne de chaque dossier ouvert ' + dept + ')')),
        dossiersPreview,
        el('div', { style: 'margin-top:6px' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('incidents') }, '→ Manage my cases')),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' },
          'Due dates 24-72 h ',
          el('span', { class: 'muted', style: 'font-weight:normal;font-size:11.5px' }, '· auto from Actions ' + dept)),
        deadlinesPreview,
        el('div', { style: 'margin-top:6px' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('actions') }, '→ Manage my actions')),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' }, 'Additional notes (optional)'),
        notesTxt,

        d.updatedAt
          ? el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:10px' },
              'Last validated: ' + fmtDTG(d.updatedAt) + ' · par ' + (d.updatedBy || '—'))
          : el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:10px' }, 'Never validated.'),
        el('div', { class: 'flex', style: 'margin-top:10px' },
          el('button', { class: 'btn-primary', onclick: submit }, '✓ Validate mon bloc'),
          el('button', { class: 'btn-ghost', onclick: () => setTab('sitrep') }, '→ CMA Ships SITREP'))
      )
    ));
  }
  renderers['dosit-fm'] = (root) => renderDoSitrep(root, 'FM');
  renderers['dosit-cr'] = (root) => renderDoSitrep(root, 'CR');
  renderers['dosit-fu'] = (root) => renderDoSitrep(root, 'FU');
  // Alias rétro-compat : `dosit` ouvre le dernier département vu (par défaut FM)
  renderers.dosit = (root) => renderDoSitrep(root, state.lastDoDept || 'FM');

  renderers.sitrep = (root) => {
    const today = new Date();
    const week = el('input', { value: state.weekNumber || isoWeekNumber(today), placeholder: 'S__' });
    const dm = el('input', { value: state.dutyManager || currentUserName(), placeholder: 'DM Marseille name' });
    const mode = el('select', {}, ...window.MODES.map(m => el('option', { value: m.code, selected: state.alert === m.code }, m.label)));
    const synthesis = el('textarea', { placeholder: 'Operational synthesis of the last 24 hours — 30 to 40 words.' });

    const preview = el('pre', { class: 'sitrep-preview' }, '— Click "Generate" to produce the CMA Ships SITREP —');

    const buildBtn = el('button', { class: 'btn-primary', onclick: () => {
      state.sitrepCounter = (state.sitrepCounter || 0) + 1;
      state.weekNumber = week.value;
      state.dutyManager = dm.value;
      state.alert = mode.value; applyAlertClass(); $('#alertSelect').value = state.alert;
      const text = renderCMASitrep(synthesis.value);
      preview.textContent = text;
      state.sitreps.unshift({ id: id(), ts: nowISO(), num: state.sitrepCounter, text });
      logMEL('INFO', `CMA Ships SITREP N°${state.sitrepCounter} generated (mode ${state.alert})`);
      save();
    } }, '📄 Generate SITREP');
    const printBtn = el('button', { class: 'btn-ghost', onclick: () => window.print() }, '🖨 Print');
    const dlBtn = el('button', { class: 'btn-ghost', onclick: () => download(`SITREP_CMA_${state.sitrepCounter || 'X'}.txt`, preview.textContent) }, '⬇ Download');

    root.appendChild(panel('CMA Ships SITREP — Duty Manager consolidated',
      el('div', {},
        el('p', { class: 'muted' }, 'Duty Manager SITREP — distributed to VP + Heads at 08:30 Marseille. Department blocks (status, cases, deadlines) are filled by the Duty Officers in their "My SITREP FM/CR/FU" tabs and consolidated automatically here.'),
        twoCol('Week', week, 'Mode', mode),
        field('Duty Manager Marseille', dm),
        field('24h synthesis (30-40 words)', synthesis),
        el('div', { class: 'flex', style: 'margin-top:10px' }, buildBtn, printBtn, dlBtn)
      )
    ));

    // ===== Select cases to include in the SITREP =====
    const allOpen = state.incidents.filter(i => i.status !== 'closed');
    if (allOpen.length > 0) {
      const byDept = { FM: [], CR: [], FU: [], XX: [] };
      allOpen.forEach(i => { (byDept[i.department || 'XX'] || byDept.XX).push(i); });
      const sevOrderS = { crit: 0, high: 1, med: 2, low: 3 };
      Object.keys(byDept).forEach(d => byDept[d].sort((a, b) => (sevOrderS[a.severity] ?? 9) - (sevOrderS[b.severity] ?? 9)));
      const includedCount = allOpen.filter(i => i.includeInSitrep !== false).length;

      const allCb = el('input', { type: 'checkbox' });
      allCb.checked = includedCount === allOpen.length;
      allCb.indeterminate = includedCount > 0 && includedCount < allOpen.length;
      allCb.addEventListener('change', () => {
        allOpen.forEach(i => i.includeInSitrep = allCb.checked);
        save(); setTab('sitrep');
      });

      const renderDeptBlock = (dept, list) => {
        if (list.length === 0) return null;
        return el('div', { class: 'sitrep-pick-block' },
          el('div', { class: 'pick-dept-head' }, dept + ' — ' + list.length + ' case(s)'),
          ...list.map(i => {
            const include = i.includeInSitrep !== false;
            const cb = el('input', { type: 'checkbox' });
            cb.checked = include;
            cb.addEventListener('change', () => {
              i.includeInSitrep = cb.checked;
              save(); setTab('sitrep');
            });
            const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
            return el('label', { class: 'sitrep-pick-row' },
              cb,
              badge((i.severity || 'med').toUpperCase(), severityColor(i.severity)),
              badge(cls.short, cls.color),
              el('span', { class: 'ref' }, i.ref || ''),
              el('span', { class: 'line' }, (i.vessel || 'n/a') + ' — ' + (i.sitrepLine || i.type || '')));
          }));
      };

      root.appendChild(panel('Select cases to include in the SITREP',
        el('div', {},
          el('p', { class: 'muted' },
            'Check/uncheck each case based on its importance for the SITREP. ' +
            includedCount + ' / ' + allOpen.length + ' case(s) currently included.'),
          el('div', { class: 'sitrep-pick-header' },
            allCb, el('span', {}, el('strong', {}, 'Check / uncheck all'))),
          el('div', { class: 'sitrep-pick-quick' },
            el('button', { class: 'btn-ghost btn-sm', onclick: () => {
              allOpen.forEach(i => i.includeInSitrep = (['crit','high'].includes(i.severity)));
              save(); setTab('sitrep');
            } }, '⚡ Select CRIT + HIGH only'),
            el('button', { class: 'btn-ghost btn-sm', onclick: () => {
              allOpen.forEach(i => i.includeInSitrep = (i.classification && i.classification !== 'PUBLIC'));
              save(); setTab('sitrep');
            } }, '🔒 Exclude PUBLIC'),
            el('button', { class: 'btn-ghost btn-sm', onclick: () => {
              allOpen.forEach(i => i.includeInSitrep = true);
              save(); setTab('sitrep');
            } }, '✓ Include all')
          ),
          renderDeptBlock('FM', byDept.FM),
          renderDeptBlock('CR', byDept.CR),
          renderDeptBlock('FU', byDept.FU),
          renderDeptBlock('XX', byDept.XX)
        )
      ));
    }

    // ===== Frictions (DM) — gestion inline =====
    const fopen = (state.frictions || []).filter(f => f.status !== 'closed');
    root.appendChild(panel('Active frictions (synthèse Duty Manager)',
      el('div', {},
        el('p', { class: 'muted' }, 'Frictions inter-départements ou avec l\'extérieur (clients, shipyards, authorities, Group). Reflected in the "TRANSVERSE FRICTIONS" block and in each department block of the SITREP.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, fopen.length + ' friction(s) open'),
          el('button', { class: 'btn-primary btn-sm', onclick: () => frictionForm() }, '+ New friction')
        ),
        fopen.length === 0 ? el('div', { class: 'empty' }, 'No active friction.')
          : tableEl(['Scope', 'Title', 'Owner', 'Note', ''],
            fopen.map(f => [
              badge(f.scope, f.scope === 'XX' ? 'orange' : 'blue'),
              el('strong', {}, f.title), f.owner || '—', f.note || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => frictionForm(f.id) }, 'Edit'),
                el('button', { class: 'btn-success btn-sm', onclick: () => { f.status = 'closed'; save(); setTab('sitrep'); } }, '✓'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.frictions = state.frictions.filter(x => x.id !== f.id); save(); setTab('sitrep'); } } }, '✕'))
            ]))
      )
    ));

    // ===== Points for Top Management (3 max) =====
    root.appendChild(panel('Points for Top Management (3 max)',
      (() => {
        const items = (state.topMgmtPoints || []);
        const list = el('div', {},
          ...items.map(p => el('div', { class: 'pb-step' },
            el('div', { class: 'pb-text' }, '• ' + p.label),
            el('button', { class: 'btn-danger btn-sm', onclick: () => {
              state.topMgmtPoints = state.topMgmtPoints.filter(x => x.id !== p.id);
              save(); setTab('sitrep');
            } }, '✕'))));
        const inp = el('input', { placeholder: 'Nouveau point d\'attention pour le VP avant Group MM' });
        const add = el('button', { class: 'btn-primary btn-sm', onclick: () => {
          if (!inp.value.trim()) return;
          state.topMgmtPoints = state.topMgmtPoints || [];
          if (state.topMgmtPoints.length >= 3) { toast('3 maximum — supprimez-en un d\'abord.', 'warn'); return; }
          state.topMgmtPoints.push({ id: id(), label: inp.value.trim(), ts: nowISO() });
          save(); setTab('sitrep');
        } }, '+ Add');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') add.click(); });
        return el('div', {},
          el('p', { class: 'muted' }, 'À l\'attention directe du VP avant Group MM — arbitrages, sujets stratégiques, opportunités. Maximum 3.'),
          list,
          el('div', { class: 'flex', style: 'margin-top:8px' }, inp, add));
      })()
    ));

    // ===== Signaux faibles / Look-ahead =====
    root.appendChild(panel('Weak signals Signaux faibles & look-ahead J+1 / S+1 look-ahead D+1 / W+1',
      (() => {
        const items = (state.weakSignals || []);
        const list = el('div', {},
          ...items.map(s => el('div', { class: 'pb-step' },
            badge(s.horizon, 'blue'),
            el('div', { class: 'pb-text' }, ' ' + s.label),
            el('button', { class: 'btn-danger btn-sm', onclick: () => {
              state.weakSignals = state.weakSignals.filter(x => x.id !== s.id);
              save(); setTab('sitrep');
            } }, '✕'))));
        const inp = el('input', { placeholder: 'Weak signal or look-ahead…' });
        const hSel = el('select', {}, el('option', { value: 'J+1' }, 'J+1'), el('option', { value: 'S+1' }, 'S+1'));
        const add = el('button', { class: 'btn-primary btn-sm', onclick: () => {
          if (!inp.value.trim()) return;
          state.weakSignals = state.weakSignals || [];
          state.weakSignals.push({ id: id(), label: inp.value.trim(), horizon: hSel.value, ts: nowISO() });
          save(); setTab('sitrep');
        } }, '+ Add');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') add.click(); });
        return el('div', {},
          el('p', { class: 'muted' }, 'Trends, weak indicators, anticipated events D+1 or W+1.'),
          list,
          el('div', { class: 'form-row cols-3', style: 'margin-top:8px' },
            el('div', {}, inp), el('div', {}, hSel), el('div', {}, add)));
      })()
    ));

    root.appendChild(panel('Preview', preview));
    if (state.sitreps.length) {
      root.appendChild(panel('Previous SITREPs',
        tableEl(['N°', 'Issued', ''], state.sitreps.map(s => [
          'N°' + s.num, fmtDTG(s.ts),
          el('div', { class: 'flex' },
            el('button', { class: 'btn-ghost btn-sm', onclick: () => { preview.textContent = s.text; window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Reload'),
            el('button', { class: 'btn-danger btn-sm', onclick: () => { state.sitreps = state.sitreps.filter(x => x.id !== s.id); save(); setTab('sitrep'); } }, '✕'))
        ]))));
    }
  };

  // Métriques off-hire YTD / semaine / objectif.
  // Availability target: 99,5% sur 365 j ⇒ tolérance 43,8 h/navire/an.
  function computeOffhireMetrics() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysElapsed = Math.max(1, Math.ceil((now - yearStart) / (24 * 3600 * 1000)));
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const nVessels = (state.vessels || []).length || 1;

    const ytdActual = (state.incidents || [])
      .filter(i => i.status === 'closed' && i.closedAt && new Date(i.closedAt) >= yearStart)
      .reduce((acc, i) => acc + (parseFloat(i.offhireActual) || 0), 0);

    const weekNew = (state.incidents || [])
      .filter(i => i.startedAt && new Date(i.startedAt) >= monday)
      .reduce((acc, i) => acc + (parseFloat(i.offhireEstimated) || 0), 0);

    const tolerancePerVesselYear = 365 * 24 * 0.005; // 43,8 h/navire/an
    const ytdTarget = Math.round((daysElapsed / 365) * tolerancePerVesselYear * nVessels);
    const ratio = ytdTarget > 0 ? Math.round((ytdActual / ytdTarget) * 100) : 0;
    return {
      ytdActual: Math.round(ytdActual * 10) / 10,
      weekNew:   Math.round(weekNew * 10) / 10,
      ytdTarget, ratio, nVessels, daysElapsed
    };
  }

  function isoWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return 'S' + String(Math.ceil((((date - yearStart) / 86400000) + 1) / 7)).padStart(2, '0');
  }

  function renderCMASitrep(synthesis) {
    const fmt = (arr) => arr.length === 0 ? '  ▸ None.' : arr.map(s => '  ▸ ' + s).join('\n');
    const offhireM = computeOffhireMetrics();
    const today = new Date();
    const dayStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const statutLbl = { nominal: 'VERT', vigilance: 'AMBRE', crise: 'ROUGE' }[state.alert] || 'VERT';
    const modeLbl = { nominal: 'Nameinal', vigilance: 'Vigilance', crise: 'Crise' }[state.alert] || 'Nameinal';
    const deptLetter = { green: 'V', amber: 'A', red: 'R' };

    // Today's cases = synthèse une ligne de chaque dossier ouvert du dépt.
    // Préfixée du nom du navire + sévérité + classification. Triée par sévérité.
    const sevOrder = { crit: 0, high: 1, med: 2, low: 3 };
    const sevLabel = { crit: 'CRIT', high: 'HIGH', med: 'MED', low: 'LOW' };
    const clsShort = (code) => {
      const c = window.CLASSIFICATIONS.find(x => x.code === (code || 'INTERNAL'));
      return c ? c.short : 'INT';
    };
    const dossiersFor = (dept) => state.incidents
      .filter(i => i.status !== 'closed' && (i.department || 'XX') === dept && i.includeInSitrep !== false)
      .slice()
      .sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))
      .map(i => {
        const v = (i.vessel || 'n/a').toUpperCase();
        const raw = (i.sitrepLine || `${i.type}${i.summary ? ' : ' + i.summary.replace(/\n/g, ' ').slice(0, 120) : ''}`).trim();
        const line = raw.toUpperCase().startsWith(v) ? raw : `${v} — ${raw}`;
        return `[${sevLabel[i.severity] || '—'} · ${clsShort(i.classification)}] ${line}`;
      });

    // Due dates 24-72h = actions du dept dont due dans 24-72h
    const now = Date.now();
    const in24 = now + 24 * 3600 * 1000;
    const in72 = now + 72 * 3600 * 1000;
    const deadlinesFor = (dept) => state.actions
      .filter(a => a.status !== 'done' && (a.department || 'XX') === dept &&
                   a.due && new Date(a.due).getTime() >= in24 && new Date(a.due).getTime() <= in72)
      .map(a => `${a.text} — owner ${a.owner || '—'} (${fmtDTG(a.due)})`);

    // Frictions par dept
    const frictionsFor = (scope) => (state.frictions || [])
      .filter(f => f.status !== 'closed' && f.scope === scope)
      .map(f => `${f.title}${f.owner ? ' — ' + f.owner : ''}${f.note ? ' — ' + f.note : ''}`);

    const topMgmt = (state.topMgmtPoints || []).slice(0, 3);
    const weakSig = state.weakSignals || [];

    const frActives = (state.frictions || []).filter(f => f.status !== 'closed').length;
    const alerts24 = state.mel.filter(m =>
      ['DOSSIER','SECURITY','SAFETY','INC'].includes(m.cat) &&
      (Date.now() - new Date(m.ts).getTime()) <= 24 * 3600 * 1000).length;

    // Préférence : si le DO a renseigné son SITREP départemental (texte libre),
    // on utilise sa rédaction. Sinon on retombe sur l'agrégation automatique.
    const doSitrep = (dept, kind, fallback) => {
      const d = (state.deptSitreps && state.deptSitreps[dept]) || {};
      const v = (d[kind] || '').trim();
      if (!v) return fmt(fallback);
      return v.split('\n').map(s => s.trim() ? '  ▸ ' + s : '').filter(Boolean).join('\n') || '  ▸ None.';
    };
    // Status par dept : priorité au statut renseigné dans deptSitreps (DO), sinon deptStatus historique.
    const deptStatusOf = (dept) => {
      const d = (state.deptSitreps && state.deptSitreps[dept]) || {};
      const s = d.status || (state.deptStatus && state.deptStatus[dept]) || 'green';
      return deptLetter[s] || 'V';
    };

    return window.SITREP_CMA_TEMPLATE
      .replace('{DAY}', dayStr)
      .replace('{WEEK}', state.weekNumber || isoWeekNumber(today))
      .replace('{DM_NAME}', state.dutyManager || '—')
      .replace('{MODE}', modeLbl)
      .replace('{STATUT}', statutLbl)
      .replace('{SYNTHESIS}', synthesis || '—')
      .replace('{ALERTS_24H}', alerts24)
      .replace('{OFFHIRE_HOURS}', state.incidents
        .filter(i => i.status !== 'closed')
        .reduce((a, i) => a + (parseFloat(i.offhireEstimated) || 0), 0))
      .replace('{OFFHIRE_FM}', state.incidents
        .filter(i => i.status !== 'closed' && (i.department || 'XX') === 'FM')
        .reduce((a, i) => a + (parseFloat(i.offhireEstimated) || 0), 0))
      .replace('{OFFHIRE_CR}', state.incidents
        .filter(i => i.status !== 'closed' && (i.department || 'XX') === 'CR')
        .reduce((a, i) => a + (parseFloat(i.offhireEstimated) || 0), 0))
      .replace('{OFFHIRE_FU}', state.incidents
        .filter(i => i.status !== 'closed' && (i.department || 'XX') === 'FU')
        .reduce((a, i) => a + (parseFloat(i.offhireEstimated) || 0), 0))
      .replace('{OFFHIRE_WEEK}',   offhireM.weekNew)
      .replace('{OFFHIRE_YTD}',    offhireM.ytdActual)
      .replace('{OFFHIRE_TARGET}', offhireM.ytdTarget)
      .replace('{OFFHIRE_RATIO}',  offhireM.ratio)
      .replace('{N_VESSELS}',      offhireM.nVessels)
      .replace('{CLASSIFICATION_SUMMARY}', (() => {
        const opens = state.incidents.filter(i => i.status !== 'closed');
        const counts = {};
        opens.forEach(i => { const k = i.classification || 'INTERNAL'; counts[k] = (counts[k] || 0) + 1; });
        const parts = window.CLASSIFICATIONS
          .filter(c => counts[c.code])
          .map(c => `${c.short}=${counts[c.code]}`);
        return parts.length ? parts.join(' · ') : 'Néant';
      })())
      .replace('{TOP_MGMT_POINTS}', topMgmt.length === 0
        ? '  — No point remonté au VP —'
        : topMgmt.map((p, idx) => `  ${idx + 1}. ${p.label}`).join('\n'))
      .replace('{FM_STATUS}', deptStatusOf('FM'))
      .replace('{CR_STATUS}', deptStatusOf('CR'))
      .replace('{FU_STATUS}', deptStatusOf('FU'))
      .replace('{DO_FM}', state.dutyOfficers.FM || '—')
      .replace('{DO_CR}', state.dutyOfficers.CR || '—')
      .replace('{DO_FU}', state.dutyOfficers.FU || '—')
      .replace('{FM_DOSSIERS}',  doSitrep('FM', 'dossiers',  dossiersFor('FM')))
      .replace('{FM_DEADLINES}', doSitrep('FM', 'deadlines', deadlinesFor('FM')))
      .replace('{FM_FRICTIONS}', doSitrep('FM', 'frictions', frictionsFor('FM')))
      .replace('{CR_DOSSIERS}',  doSitrep('CR', 'dossiers',  dossiersFor('CR')))
      .replace('{CR_DEADLINES}', doSitrep('CR', 'deadlines', deadlinesFor('CR')))
      .replace('{CR_FRICTIONS}', doSitrep('CR', 'frictions', frictionsFor('CR')))
      .replace('{FU_DOSSIERS}',  doSitrep('FU', 'dossiers',  dossiersFor('FU')))
      .replace('{FU_DEADLINES}', doSitrep('FU', 'deadlines', deadlinesFor('FU')))
      .replace('{FU_FRICTIONS}', doSitrep('FU', 'frictions', frictionsFor('FU')))
      .replace('{TRANSVERSE_FRICTIONS}', fmt(frictionsFor('XX')))
      .replace('{WEAK_SIGNALS}', fmt(weakSig.map(s => `[${s.horizon}] ${s.label}`)));
  }

  // ============================================================
  //   FRICTION FORM (utilisé inline depuis SITREP CMA)
  // ============================================================
  function frictionForm(idEdit) {
    const f = idEdit ? state.frictions.find(x => x.id === idEdit) : { scope: 'XX', status: 'open' };
    const scope = el('select', {}, ...window.DEPARTMENTS.map(d => el('option', { value: d.code, selected: f.scope === d.code }, d.code + ' — ' + d.label)));
    const title = el('input', { value: f.title || '' });
    const owner = el('input', { value: f.owner || currentUserName(), list: 'dl-owners' });
    const note = el('textarea', {}, f.note || '');
    const status = el('select', {}, el('option', { value: 'open', selected: f.status !== 'closed' }, 'Open'), el('option', { value: 'closed', selected: f.status === 'closed' }, 'Closed'));
    const submit = () => {
      const data = { id: f.id || id(), scope: scope.value, title: title.value,
        owner: owner.value, note: note.value, status: status.value, ts: f.ts || nowISO() };
      if (idEdit) state.frictions[state.frictions.findIndex(x => x.id === idEdit)] = data;
      else { state.frictions.push(data); logMEL('INFO', `Friction [${data.scope}]: ${data.title}`); }
      save(); closeModal(); setTab('sitrep');
    };
    openModal(idEdit ? 'Edit friction' : 'New friction',
      el('div', {},
        twoCol('Scope', scope, 'Owner', owner),
        field('Title', title),
        field('Note / details', note),
        field('Status', status),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   PLAYBOOKS TECHNIQUES & CREWING
  // ============================================================
  renderers.playbooks = (root) => {
    root.appendChild(panel('Technical Playbooks techniques & équipages Crewing playbooks',
      el('div', {},
        el('p', { class: 'muted' }, 'M/E, A/E, propulsion failures, drydock, retrofit, PSC, bunker, manning, certification, vetting. Hors périmètre SSE (couvert par l\'outil sécurité/sûreté/environnement).'),
        el('div', { class: 'cards' }, ...window.PLAYBOOKS.map(pb => el('div', { class: 'card' },
          el('div', { class: 'flex-between' },
            el('div', { class: 'card-title' }, pb.title),
            badge(pb.severity, pb.severity === 'crit' ? 'red' : pb.severity === 'high' ? 'orange' : 'blue')),
          el('div', { class: 'card-meta' }, 'Ref: ' + pb.refs.join(' · ')),
          el('div', { class: 'card-actions' },
            el('button', { class: 'btn-primary btn-sm', onclick: () => openPlaybook(pb) }, 'Open'),
            el('button', { class: 'btn-ghost btn-sm', onclick: () => activatePlaybook(pb) }, 'Activate (create actions)')))))
      )
    ));
  };
  function openPlaybook(pb) {
    const stateMap = state.playbookState[pb.id] || {};
    const stepsBox = el('div', {});
    pb.steps.forEach((step, idx) => {
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!stateMap[idx];
      const txt = el('div', { class: 'pb-text' + (cb.checked ? ' done' : '') }, `${idx + 1}. ${step}`);
      cb.addEventListener('change', () => {
        stateMap[idx] = cb.checked;
        state.playbookState[pb.id] = stateMap;
        txt.classList.toggle('done', cb.checked);
        save();
      });
      stepsBox.appendChild(el('div', { class: 'pb-step' }, cb, txt));
    });
    openModal(pb.title,
      el('div', {},
        el('div', { class: 'card-meta', style: 'margin-bottom:10px' }, 'Ref: ' + pb.refs.join(' · ')),
        stepsBox,
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: () => activatePlaybook(pb) }, '→ Activate (create actions)'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Close'))));
  }
  function activatePlaybook(pb) {
    pb.steps.forEach(step => state.actions.push({
      id: id(), text: `[${pb.title}] ${step}`, owner: '',
      priority: pb.severity === 'crit' ? 'P1' : pb.severity === 'high' ? 'P2' : 'P3',
      status: 'todo', due: '', createdAt: nowISO()
    }));
    logMEL('ACTION', `Playbook "${pb.title}" activated: ${pb.steps.length} actions created`);
    save(); closeModal(); setTab('actions');
  }

  // ============================================================
  //   RETEX / AAR
  // ============================================================
  renderers.retex = (root) => {
    root.appendChild(panel('AAR — After-Action Review',
      el('div', {},
        el('p', { class: 'muted' }, 'US Army AAR method (4 questions). Capture: Lessons Identified → Lessons Learned. Essential post-exercise and post-crisis.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.retex.length} retour(s) d\'expérience`),
          el('button', { class: 'btn-primary', onclick: () => retexForm() }, '+ New AAR')
        ),
        state.retex.length === 0 ? el('div', { class: 'empty' }, 'None.')
          : el('div', { class: 'cards' }, ...state.retex.map(r => el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, r.title),
                el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(r.ts))),
              el('div', { class: 'card-meta' }, 'Facilitator: ' + (r.facilitator || '—')),
              el('div', { class: 'card-body' },
                el('div', {}, el('strong', {}, '1. What was supposed to happen? '), r.expected || '—'),
                el('div', {}, el('strong', {}, '2. Que s\'est-il passé ? '), r.actual || '—'),
                el('div', {}, el('strong', {}, '3. Why is there a difference? '), r.gap || '—'),
                el('div', {}, el('strong', {}, '4. What should we improve / sustain? '), r.improve || '—'),
                r.lessons && r.lessons.length ? el('div', { style: 'margin-top:8px' },
                  el('strong', {}, 'Lessons Identified: '),
                  el('ul', { style: 'margin:4px 0' },
                    ...r.lessons.map(l => el('li', {}, l)))) : null),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => retexForm(r.id) }, 'Edit'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => convertRetexToActions(r) }, '→ Create actions LL'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.retex = state.retex.filter(x => x.id !== r.id); save(); setTab('retex'); } } }, '✕')))))
      )
    ));
  };
  function retexForm(idEdit) {
    const r = idEdit ? state.retex.find(x => x.id === idEdit) : { lessons: [] };
    const title = el('input', { value: r.title || '' });
    const facilitator = el('input', { value: r.facilitator || currentUserName() });
    const expected = el('textarea', { placeholder: 'Plan, intent, expected end state' }, r.expected || '');
    const actual = el('textarea', { placeholder: 'Facts, real timeline, results' }, r.actual || '');
    const gap = el('textarea', { placeholder: 'Root causes, frictions, surprises' }, r.gap || '');
    const improve = el('textarea', { placeholder: 'Improvements / practices to sustain' }, r.improve || '');
    const lessonsTxt = el('textarea', { placeholder: 'One lesson per line' }, (r.lessons || []).join('\n'));
    const submit = () => {
      const data = { id: r.id || id(), title: title.value, facilitator: facilitator.value,
        expected: expected.value, actual: actual.value, gap: gap.value, improve: improve.value,
        lessons: lessonsTxt.value.split('\n').map(x => x.trim()).filter(Boolean),
        ts: r.ts || nowISO() };
      if (idEdit) state.retex[state.retex.findIndex(x => x.id === idEdit)] = data;
      else { state.retex.unshift(data); logMEL('INFO', `AAR opened: ${data.title}`); }
      save(); closeModal(); setTab('retex');
    };
    openModal(idEdit ? 'Edit RETEX' : 'New AAR',
      el('div', {},
        twoCol('Title', title, 'Facilitator', facilitator),
        field('1. What was supposed to happen?', expected),
        field('2. Que s\'est-il passé ?', actual),
        field('3. Why is there a difference?', gap),
        field('4. Que devons-nous améliorer ou pérenniser ?', improve),
        field('Lessons Identified (une par ligne)', lessonsTxt),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }
  function convertRetexToActions(r) {
    if (!r.lessons || !r.lessons.length) { toast('No lesson to convert.', 'warn'); return; }
    if (!confirm(`Create ${r.lessons.length} actions à partir des Lessons Identified ?`)) return;
    r.lessons.forEach(l => state.actions.push({
      id: id(), text: `[LL] ${l}`, owner: '', priority: 'P3',
      status: 'todo', due: '', createdAt: nowISO()
    }));
    logMEL('ACTION', `${r.lessons.length} actions created from AAR "${r.title}"`);
    save(); setTab('actions');
  }

  // ============================================================
  //   EXERCICES (MSEL)
  // ============================================================
  renderers.exercises = (root) => {
    root.appendChild(panel('Crisis exercises — table-top and full-scale',
      el('div', {},
        el('p', { class: 'muted' }, 'L\'ASN impose un exercice annuel pour les sites nucléaires ; pratique recommandée pour la cellule maritime. MSEL = Master Scenario Events List : trame d\'injection chronologique pour entraîner la cellule.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.exercises.length} exercise(s)`),
          el('button', { class: 'btn-primary', onclick: () => exerciseForm() }, '+ Exercise')
        ),
        state.exercises.length === 0 ? el('div', { class: 'empty' }, 'No exercise.')
          : el('div', { class: 'cards' }, ...state.exercises.map(x => el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, x.title),
                badge(x.status, x.status === 'planned' ? 'blue' : x.status === 'running' ? 'orange' : 'green')),
              el('div', { class: 'card-meta' }, `${x.type} · scheduled ${fmtDTG(x.date)} · ${x.msel ? x.msel.length : 0} injection(s)`),
              el('div', { class: 'card-body' }, x.scenario || '—'),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => exerciseForm(x.id) }, 'Edit'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => exerciseRun(x) }, '▶ Launch'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Delete??')) { state.exercises = state.exercises.filter(e => e.id !== x.id); save(); setTab('exercises'); } } }, '✕')))))
      )
    ));
  };
  function exerciseForm(idEdit) {
    const x = idEdit ? state.exercises.find(e => e.id === idEdit) : { type: 'Table-top', status: 'planned', msel: [] };
    const title = el('input', { value: x.title || '' });
    const type = el('select', {}, ...['Table-top','Functional','Full-scale'].map(t => el('option', { value: t, selected: x.type === t }, t)));
    const status = el('select', {}, ...[['planned','Planned'],['running','In progress'],['done','Closed']]
      .map(([k, l]) => el('option', { value: k, selected: x.status === k }, l)));
    const date = el('input', { type: 'datetime-local', value: x.date ? new Date(x.date).toISOString().slice(0, 16) : '' });
    const scenario = el('textarea', { placeholder: 'Scenario d\'exercice : situation initiale,vessels impliqués, contexte' }, x.scenario || '');
    const mselTxt = el('textarea', { placeholder: 'Une injection par ligne, format : T+MM | événement | target cellule' },
      (x.msel || []).map(m => `${m.time} | ${m.event} | ${m.target}`).join('\n'));
    const submit = () => {
      const msel = mselTxt.value.split('\n').map(line => {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length < 2) return null;
        return { time: parts[0], event: parts[1] || '', target: parts[2] || '' };
      }).filter(Boolean);
      const data = { id: x.id || id(), title: title.value, type: type.value, status: status.value,
        date: date.value ? new Date(date.value).toISOString() : '', scenario: scenario.value, msel };
      if (idEdit) state.exercises[state.exercises.findIndex(e => e.id === idEdit)] = data;
      else state.exercises.push(data);
      save(); closeModal(); setTab('exercises');
    };
    openModal(idEdit ? 'Edit exercice' : 'New exercise',
      el('div', {},
        twoCol('Title', title, 'Type', type),
        twoCol('Status', status, 'Date', date),
        field('Scenario', scenario),
        field('MSEL — Master Scenario Events List', mselTxt),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }
  function exerciseRun(x) {
    const msel = (x.msel || []).slice().sort((a, b) => a.time.localeCompare(b.time));
    if (!msel.length) { toast('MSEL empty.', 'warn'); return; }
    const lines = msel.map(m => `[${m.time}] → ${m.target} : ${m.event}`).join('\n');
    alert(`Exercice "${x.title}" — trame d\'injection :\n\n${lines}\n\n(Le pilotage temps réel se fait par l\'animateur — ne crée pas d\'actions automatiques.)`);
    x.status = 'running';
    logMEL('INFO', `Exercise launched: ${x.title}`);
    save(); setTab('exercises');
  }

  // ============================================================
  //   HELPERS UI
  // ============================================================
  function panel(title, body, headerExtra) {
    return el('div', { class: 'panel' },
      el('div', { class: 'panel-header' },
        el('h2', {}, title),
        headerExtra || null),
      el('div', { class: 'panel-body' }, body));
  }
  function kpiTile(label, value, tone, sub) {
    return el('div', { class: 'kpi ' + (tone || '') },
      el('div', { class: 'kpi-label' }, label),
      el('div', { class: 'kpi-value' }, String(value)),
      sub ? el('div', { class: 'kpi-sub' }, sub) : null);
  }
  function badge(text, color) {
    return el('span', { class: 'badge ' + (color || '') }, String(text == null ? '' : text));
  }
  function severityColor(sev) {
    return sev === 'crit' ? 'red' : sev === 'high' ? 'orange' : sev === 'med' ? 'yellow' : 'green';
  }
  function vesselStatusBadge(s) {
    const map = { normal: 'green', risk: 'yellow', incident: 'red', safe: 'blue', port: 'blue' };
    const lbl = { normal: 'Normal', risk: 'À risque', incident: 'Incident', safe: 'Sécurisé', port: 'Port refuge' };
    return badge(lbl[s] || s, map[s] || 'grey');
  }
  function field(label, input) {
    return el('div', { class: 'form-row' }, el('label', {}, label), input);
  }
  function twoCol(l1, i1, l2, i2) {
    return el('div', { class: 'form-row cols-2' },
      el('div', {}, el('label', {}, l1), i1),
      el('div', {}, el('label', {}, l2), i2));
  }
  function tableEl(headers, rows) {
    return el('table', {},
      el('thead', {}, el('tr', {}, ...headers.map(h => el('th', {}, h)))),
      el('tbody', {}, ...rows.map(cells => el('tr', {}, ...cells.map(c =>
        el('td', {}, c == null ? '' : (typeof c === 'string' || typeof c === 'number' ? String(c) : c)))))));
  }

  // ============================================================
  //   VEILLE — MOC (Maritime Operations Center)
  // ============================================================
  // ============================================================
  //   ANALYSE — requêtes croisées sur dossiers (multi-axes)
  // ============================================================
  const analyseFilters = {
    from: '', to: '',
    vessel: '', fleet: '', shipManager: '', fuelType: '',
    dept: '', type: '', severity: '', classification: '', status: '',
    text: ''
  };

  renderers.analyse = (root) => {
    // Index navire pour enrichissement
    const vesselByName = {};
    state.vessels.forEach(v => { vesselByName[v.name] = v; });

    // Préparer les options de filtres distinctes (à partir des données)
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    const allTypes = uniq(state.incidents.map(i => i.type));
    const allDepts = ['FM','CR','FU','XX'];
    const allSev = ['crit','high','med','low'];
    const allCls = ['CONFIDENTIAL','RESTRICTED','INTERNAL','PUBLIC'];
    const allStatus = ['open','monitoring','closed'];
    const allFleets = uniq(state.vessels.map(v => v.fleet));
    const allManagers = uniq(state.vessels.map(v => v.shipManager));
    const allFuels = uniq(state.vessels.map(v => v.fuelType || v.fuelMode));

    // ===== Bandeau filtres =====
    const filterInput = (key, placeholder) => {
      const i = el('input', { value: analyseFilters[key] || '', placeholder });
      i.addEventListener('input', () => { analyseFilters[key] = i.value; setTab('analyse'); });
      return i;
    };
    const filterDate = (key) => {
      const i = el('input', { type: 'date', value: analyseFilters[key] || '' });
      i.addEventListener('change', () => { analyseFilters[key] = i.value; setTab('analyse'); });
      return i;
    };
    const filterSelect = (key, options, label) => {
      const s = el('select', {}, el('option', { value: '' }, label),
        ...options.map(o => el('option', { value: o, selected: analyseFilters[key] === o }, o)));
      s.addEventListener('change', () => { analyseFilters[key] = s.value; setTab('analyse'); });
      return s;
    };
    const resetBtn = el('button', { class: 'btn-ghost btn-sm', onclick: () => {
      Object.keys(analyseFilters).forEach(k => analyseFilters[k] = '');
      setTab('analyse');
    } }, '✕ Réinitialiser');

    root.appendChild(panel('Analytics — cross-axis queries on cases',
      el('div', {},
        el('p', { class: 'muted' },
          'Filtrez les dossiers (ouverts + clos) selon les axes disponibles. All les filtres se combinent. Search libre dans la synthèse et la description.'),
        el('h4', { style: 'margin:8px 0 4px;color:var(--accent-2)' }, 'Period'),
        el('div', { class: 'form-row cols-3' },
          el('div', {}, el('label', {}, 'From'), filterDate('from')),
          el('div', {}, el('label', {}, 'To'), filterDate('to')),
          el('div', {}, el('label', {}, 'Search libre'), filterInput('text', 'word in summary/description'))),

        el('h4', { style: 'margin:14px 0 4px;color:var(--accent-2)' }, 'Vessel axes'),
        el('div', { class: 'form-row cols-4' },
          el('div', {}, el('label', {}, 'Vessel'), filterInput('vessel', 'partial name or IMO')),
          el('div', {}, el('label', {}, 'Fleet'), filterSelect('fleet', allFleets, 'All')),
          el('div', {}, el('label', {}, 'Ship Manager'), filterSelect('shipManager', allManagers, 'All')),
          el('div', {}, el('label', {}, 'Fuel type'), filterSelect('fuelType', allFuels, 'All'))),

        el('h4', { style: 'margin:14px 0 4px;color:var(--accent-2)' }, 'Case axes'),
        el('div', { class: 'form-row cols-4' },
          el('div', {}, el('label', {}, 'Department'), filterSelect('dept', allDepts, 'All')),
          el('div', {}, el('label', {}, 'Type'), filterSelect('type', allTypes, 'All')),
          el('div', {}, el('label', {}, 'Severity'), filterSelect('severity', allSev, 'All')),
          el('div', {}, el('label', {}, 'Status'), filterSelect('status', allStatus, 'All'))),
        el('div', { class: 'form-row cols-2' },
          el('div', {}, el('label', {}, 'Classification'), filterSelect('classification', allCls, 'All')),
          el('div', { style: 'align-self:end' }, resetBtn)
        )
      )
    ));

    // ===== Filtrage =====
    const fromTs = analyseFilters.from ? new Date(analyseFilters.from).getTime() : null;
    const toTs   = analyseFilters.to   ? (new Date(analyseFilters.to).getTime() + 86400000) : null;
    const textLow = (analyseFilters.text || '').toLowerCase().trim();
    const vQuery  = (analyseFilters.vessel || '').toLowerCase().trim();

    const matches = state.incidents.filter(i => {
      const v = vesselByName[i.vessel];
      // Period
      const ts = i.startedAt ? new Date(i.startedAt).getTime() : 0;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      // Vessel (partial name or IMO)
      if (vQuery) {
        const nm = (i.vessel || '').toLowerCase();
        const imo = v ? (v.imo || '') : '';
        if (!nm.includes(vQuery) && !imo.includes(vQuery)) return false;
      }
      // Vessel axes (nécessitent que le navire soit dans le registre)
      if (analyseFilters.fleet) {
        if (!v || v.fleet !== analyseFilters.fleet) return false;
      }
      if (analyseFilters.shipManager) {
        if (!v || v.shipManager !== analyseFilters.shipManager) return false;
      }
      if (analyseFilters.fuelType) {
        if (!v || (v.fuelType || v.fuelMode) !== analyseFilters.fuelType) return false;
      }
      // Case axes
      if (analyseFilters.dept && (i.department || 'XX') !== analyseFilters.dept) return false;
      if (analyseFilters.type && i.type !== analyseFilters.type) return false;
      if (analyseFilters.severity && i.severity !== analyseFilters.severity) return false;
      if (analyseFilters.classification && (i.classification || 'INTERNAL') !== analyseFilters.classification) return false;
      if (analyseFilters.status && i.status !== analyseFilters.status) return false;
      // Search libre
      if (textLow) {
        const hay = ((i.summary || '') + ' ' + (i.sitrepLine || '') + ' ' + (i.ref || '')).toLowerCase();
        if (!hay.includes(textLow)) return false;
      }
      return true;
    });

    // ===== Agrégats =====
    const totalOpenOff = matches.filter(i => i.status !== 'closed')
      .reduce((a, i) => a + (parseFloat(i.offhireEstimated) || 0), 0);
    const totalClosedOff = matches.filter(i => i.status === 'closed')
      .reduce((a, i) => a + (parseFloat(i.offhireActual) || 0), 0);

    const byKey = (keyFn) => {
      const m = {};
      matches.forEach(i => { const k = keyFn(i) || '—'; m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const offhireByKey = (keyFn) => {
      const m = {};
      matches.forEach(i => {
        const k = keyFn(i) || '—';
        const h = (i.status === 'closed' ? (parseFloat(i.offhireActual) || 0) : (parseFloat(i.offhireEstimated) || 0));
        m[k] = (m[k] || 0) + h;
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const vesselOf = (i) => i.vessel || '—';
    const fleetOf  = (i) => { const v = vesselByName[i.vessel]; return v ? (v.fleet || '—') : '—'; };
    const fuelOf   = (i) => { const v = vesselByName[i.vessel]; return v ? (v.fuelType || v.fuelMode || '—') : '—'; };
    const mgrOf    = (i) => { const v = vesselByName[i.vessel]; return v ? (v.shipManager || '—') : '—'; };

    root.appendChild(panel('Results — ' + matches.length + ' case(s)',
      el('div', {},
        el('div', { class: 'grid-4' },
          kpiTile('Cases', matches.length, matches.length ? 'warn' : 'ok'),
          kpiTile('Estimated off-hire (open)', fmtH(totalOpenOff), totalOpenOff ? 'warn' : 'ok'),
          kpiTile('Actual off-hire (closed)', fmtH(totalClosedOff), 'muted'),
          kpiTile('Total off-hire', fmtH(totalOpenOff + totalClosedOff), 'muted')
        ),

        el('div', { class: 'flex', style: 'margin:12px 0' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => exportAnalyseCSV(matches, vesselByName) }, '⬇ Export CSV')
        ),

        matches.length === 0
          ? el('div', { class: 'empty' }, 'No case matches the filters.')
          : tableEl(
            ['Réf', 'Vessel', 'Fleet', 'Ship Mgr', 'Fuel', 'Dept', 'Type', 'Sev.', 'Class.', 'Started', 'Off-hire (h)', 'Status'],
            matches.slice(0, 300).map(i => {
              const v = vesselByName[i.vessel] || {};
              const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
              const off = i.status === 'closed'
                ? (i.offhireActual != null ? fmtH(i.offhireActual) : '⚠')
                : (fmtH(i.offhireEstimated || 0) + ' est.');
              return [
                el('span', { class: 'mono', style: 'cursor:pointer;text-decoration:underline',
                  onclick: () => incidentForm(i.id) }, i.ref || ''),
                i.vessel || '—',
                v.fleet ? badge(v.fleet, 'blue') : '—',
                v.shipManager || '—',
                v.fuelType || v.fuelMode || '—',
                badge(i.department || 'XX', 'blue'),
                i.type || '',
                badge((i.severity || '?').toUpperCase(), severityColor(i.severity)),
                badge(cls.short, cls.color),
                fmtTime(i.startedAt),
                off,
                badge(i.status, i.status === 'closed' ? 'green' : 'red')
              ];
            })),
        matches.length > 300
          ? el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:6px' },
              '⚠ Showing first 300 results only. Refine filters or export to CSV.')
          : null
      )
    ));

    // ===== Synthèses par axe =====
    if (matches.length > 0) {
      const summary = (title, items, unit) => panel(title,
        items.length === 0 ? el('div', { class: 'empty' }, 'None.')
          : el('div', { class: 'flex', style: 'flex-wrap:wrap;gap:6px' },
              ...items.slice(0, 15).map(([k, n]) => badge(k + ' · ' + Math.round(n) + (unit || ''), 'blue'))));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Cases per fleet', byKey(fleetOf)),
        summary('Cases per ship manager', byKey(mgrOf))
      ));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Cases per fuel', byKey(fuelOf)),
        summary('Cases per type', byKey(i => i.type))
      ));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Top off-hire per vessel (h)', offhireByKey(vesselOf), ' h'),
        summary('Top off-hire per fleet (h)', offhireByKey(fleetOf), ' h')
      ));
    }
  };

  function exportAnalyseCSV(matches, vesselByName) {
    if (matches.length === 0) { toast('Nothing to export.', 'warn'); return; }
    const headers = ['Ref','Vessel','IMO','Fleet','ShipManager','FuelType','Departement','Type',
      'Severite','Classification','Status','DemarrageISO','ClotureISO','OffhireEstime_h','OffhireReel_h','SitrepLine'];
    const escape = (s) => { s = (s == null ? '' : String(s)); return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [headers.join(',')];
    matches.forEach(i => {
      const v = vesselByName[i.vessel] || {};
      lines.push([
        i.ref, i.vessel, v.imo || '', v.fleet || '', v.shipManager || '',
        v.fuelType || v.fuelMode || '', i.department || '', i.type || '',
        i.severity || '', i.classification || 'INTERNAL', i.status,
        i.startedAt || '', i.closedAt || '',
        i.offhireEstimated || 0, i.offhireActual != null ? i.offhireActual : '',
        i.sitrepLine || ''
      ].map(escape).join(','));
    });
    download(`CMA_Ships_analyse_${new Date().toISOString().slice(0,10)}.csv`, lines.join('\n'));
    toast('Export CSV (' + matches.length + ' cases)', 'ok');
  }

  renderers.veille = (root) => {
    const mode = (window.MODES.find(m => m.code === state.alert) || window.MODES[0]);
    const recentTriggers = (state.triggerEvents || []).slice(0, 5);

    root.appendChild(panel('Duty Manager synthesis — Operational mode',
      el('div', {},
        el('div', { class: 'flex', style: 'gap:12px;align-items:center;flex-wrap:wrap' },
          el('div', {},
            el('div', { class: 'kpi-label' }, 'Mode'),
            el('div', { style: 'font-size:22px;font-weight:700;color:var(--accent-2)' }, mode.label)),
          el('div', {},
            el('div', { class: 'kpi-label' }, 'Global status'),
            el('div', { style: 'font-size:22px;font-weight:700' }, mode.statut)),
          el('div', { style: 'flex:1' }),
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('triggers') }, '→ Criteria'),
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('notif') }, '→ Modèles d\'alerte')
        ),
        el('div', { class: 'muted', style: 'margin-top:8px' }, mode.desc),
        el('div', { class: 'muted', style: 'margin-top:6px;font-size:11.5px' },
          'Duty Manager tab : real-time synthesis for mode switching, escalation and alert templates\'alerte.')
      )
    ));

    const escBox = el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap' });
    if (state.alert !== 'nominal') escBox.appendChild(
      el('button', { class: 'btn-success', onclick: () => escalateTo('nominal') }, '↓ Back to Nameinal'));
    if (state.alert !== 'vigilance') escBox.appendChild(
      el('button', { class: 'btn-warn', onclick: () => escalateTo('vigilance') }, '↑ Watch (AMBER)'));
    if (state.alert !== 'crise') escBox.appendChild(
      el('button', { class: 'btn-danger', onclick: () => escalateTo('crise') }, '⚡ Activate Crisis (RED)'));
    root.appendChild(panel('Mode switch', escBox));

    // Current watch
    const w = state.watch || {};
    const officer = el('input', { value: w.officer || '', placeholder: 'DPA-Watch (officer of the watch)', list: 'dl-authors' });
    const assistant = el('input', { value: w.assistant || '', placeholder: 'Watch Assistant', list: 'dl-authors' });
    const startBtn = el('button', { class: 'btn-primary', onclick: () => {
      state.watch = { officer: officer.value, assistant: assistant.value, startedAt: nowISO() };
      logMEL('INFO', `Watch taken by: ${officer.value} (assistant ${assistant.value || '-'})`);
      save(); setTab('veille');
    } }, '⏱ Take the watch');
    const handoverBtn = el('button', { class: 'btn-ghost', onclick: () => setTab('passation') }, '→ Formal handover');
    root.appendChild(panel('Current watch',
      el('div', {},
        twoCol('Officer of the watch', officer, 'Assistant', assistant),
        el('div', { class: 'muted', style: 'font-size:12px' },
          w.startedAt ? `On watch since ${fmtDTG(w.startedAt)}` : 'No active watch.'),
        el('div', { class: 'flex', style: 'margin-top:10px' }, startBtn, handoverBtn)
      )
    ));

    // Last SITREP issued — vision partagée la plus récente
    const lastSitrep = (state.sitreps || [])[0];
    root.appendChild(panel(
      lastSitrep ? `Dernier SITREP — N°${lastSitrep.num} · ${fmtDTG(lastSitrep.ts)}` : 'Dernier SITREP',
      el('div', {},
        el('p', { class: 'muted' }, 'Reference for the Duty Manager : latest shared situational picture sent to VP + Heads. To produce a new SITREP, ouvrir l\'onglet "SITREP CMA".'),
        lastSitrep
          ? el('div', {},
              el('pre', { class: 'sitrep-preview', style: 'max-height:360px' }, lastSitrep.text),
              el('div', { class: 'flex', style: 'margin-top:10px' },
                el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('sitrep') }, '→ CMA Ships SITREP'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => download(`SITREP_CMA_${lastSitrep.num}.txt`, lastSitrep.text) }, '⬇ Download')))
          : el('div', {},
              el('div', { class: 'empty' }, 'No SITREP n\'a encore été émis.'),
              el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('sitrep') }, '→ Generate the first SITREP'))
      )
    ));

    root.appendChild(panel('Recent triggers',
      recentTriggers.length === 0
        ? el('div', { class: 'empty' }, 'No trigger declared sur les dernières 24 h. All is calm.')
        : tableEl(['DTG', 'Category', 'Trigger', 'Mode →', 'Par'],
            recentTriggers.map(t => {
              const m = t.mode || t.posture || t.level;
              const mColor = m === 'crise' ? 'red' : m === 'vigilance' ? 'orange' : 'green';
              return [
                el('span', { class: 'mono' }, fmtDTG(t.ts)),
                badge(t.cat, 'blue'),
                t.label,
                badge(m, mColor),
                t.author || '—'
              ];
            }))
    ));

    // MEL des dernières heures
    root.appendChild(panel('Journal récent',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'Empty.')
        : el('div', {}, ...state.mel.slice(0, 8).map(meEntry))
    ));
  };

  function escalateTo(targetMode) {
    const target = window.MODES.find(m => m.code === targetMode);
    if (!target) return;
    if (state.alert === targetMode) return;
    if (!confirm(`Passer en mode ${target.label} ?\n${target.desc}`)) return;
    state.alert = targetMode;
    applyAlertClass();
    $('#alertSelect').value = state.alert;
    logMEL('SECURITY', `Mode switched to ${target.label} (statut ${target.statut})`);
    save();
    if (targetMode !== 'nominal') {
      if (confirm('Open le modèle de notification correspondant ?')) {
        setTab('notif');
        return;
      }
    }
    setTab('veille');
  }

  // ============================================================
  //   TRIGGERS — critères de déclenchement
  // ============================================================
  renderers.triggers = (root) => {
    const modeColor = m => m === 'crise' ? 'red' : m === 'vigilance' ? 'orange' : 'green';
    const deptLabel = d => (window.DEPARTMENTS.find(x => x.code === d) || {}).label || d;

    // Groupement : département → axe → triggers
    const depts = ['FM', 'CR', 'FU'];

    root.appendChild(panel('Trigger criteria',
      el('div', {},
        el('p', { class: 'muted' }, 'Groupés par département (Duty Officer concerné) puis par axe (Technique, Régulation, Équipage, Commercial, Soutage, Shipyard, Delivery, Logistique, Certification). "Declare" ouvre une fenêtre pré-remplie avec un exemple guide, applique le mode target (sans rétrogradation) et crée un dossier.'),
        ...depts.map(dept => {
          const dTriggers = window.TRIGGERS.filter(t => t.dept === dept);
          if (dTriggers.length === 0) return null;
          const axes = [...new Set(dTriggers.map(t => t.axe))];
          return el('div', { style: 'margin-top:18px' },
            el('h3', { style: 'margin:8px 0;color:var(--accent-2);font-size:14px' },
              dept + ' — ' + deptLabel(dept), ' ',
              el('span', { class: 'muted', style: 'font-weight:normal;font-size:12px' },
                '· Duty Officer : ' + (state.dutyOfficers[dept] || '—'))),
            ...axes.map(axe => el('div', { style: 'margin-top:10px' },
              el('h4', { style: 'margin:6px 0 4px;font-size:12.5px;color:var(--text)' }, axe),
              tableEl(['Criterion', 'Description', 'Mode →', ''],
                dTriggers.filter(t => t.axe === axe).map(t => [
                  el('strong', {}, t.label),
                  el('span', { class: 'muted' }, t.desc),
                  badge((t.mode || 'nominal').toUpperCase(), modeColor(t.mode)),
                  el('button', { class: 'btn-primary btn-sm', onclick: () => declareTrigger(t) }, 'Declare')
                ])))));
        })
      )
    ));

    if (state.triggerEvents && state.triggerEvents.length) {
      root.appendChild(panel('Trigger history',
        tableEl(['DTG', 'Dept · Axe', 'Trigger', 'Mode', 'Vessel', 'Par'],
          state.triggerEvents.map(t => {
            const m = t.mode || 'nominal';
            const tag = (t.dept || '?') + ' · ' + (t.axe || t.cat || '');
            return [
              el('span', { class: 'mono' }, fmtDTG(t.ts)),
              badge(tag, 'blue'), t.label,
              badge(m, modeColor(m)),
              t.vessel || '—', t.author || '—'
            ];
          }))));
    }
  };

  function declareTrigger(trg) {
    const vesselSel = el('input', { list: 'dl-vessels', placeholder: 'Vessel concerned' });
    const deptSel = el('select', {}, ...window.DEPARTMENTS.map(d =>
      el('option', { value: d.code, selected: d.code === trg.dept }, d.code + ' — ' + d.label)));
    const note = el('textarea', { style: 'min-height:120px' }, trg.exampleNote || '');
    const sitrepLine = el('input', { placeholder: 'Ex. CC AURORE — bunker off-spec Fujairah, suspension consommation, LOP fournisseur' });

    const submit = () => {
      const ev = {
        id: id(), ts: nowISO(),
        triggerId: trg.id, label: trg.label,
        dept: deptSel.value, axe: trg.axe, cat: (trg.dept || '?') + ' — ' + (trg.axe || ''),
        mode: trg.mode,
        vessel: vesselSel.value, note: note.value,
        author: currentUserName() || 'MOC'
      };
      state.triggerEvents = state.triggerEvents || [];
      state.triggerEvents.unshift(ev);

      // Mode: escalade seulement (jamais de rétrogradation auto)
      const order = { nominal: 0, vigilance: 1, crise: 2 };
      if ((order[trg.mode] || 0) > (order[state.alert] || 0)) {
        state.alert = trg.mode;
        applyAlertClass();
        $('#alertSelect').value = state.alert;
      }

      // Création d'un dossier pré-rempli (lié au trigger)
      const incRef = 'DOS-' + Date.now().toString(36).toUpperCase();
      state.incidents.push({
        id: id(), ref: incRef,
        type: trg.incidentType || 'Other',
        vessel: vesselSel.value || '',
        department: deptSel.value,
        severity: trg.mode === 'crise' ? 'crit' : trg.mode === 'vigilance' ? 'high' : 'med',
        status: 'open', startedAt: ev.ts,
        summary: note.value,
        sitrepLine: sitrepLine.value || (vesselSel.value ? vesselSel.value + ' — ' + trg.label : trg.label),
        classification: 'INTERNAL'
      });
      if (vesselSel.value) {
        const v = state.vessels.find(x => x.name === vesselSel.value);
        if (v) v.status = 'incident';
      }
      logMEL('DOSSIER', `Trigger declared: ${trg.label} → mode ${state.alert.toUpperCase()}, dossier ${incRef}`);
      save(); closeModal();

      // Proposer les modèles d'alerte associés au trigger
      const suggested = (trg.suggestedNotifs || []).map(nid =>
        (window.NOTIF_TEMPLATES || []).find(n => n.id === nid)).filter(Boolean);
      if (suggested.length) {
        openModal('Modèles d\'alerte recommandés',
          el('div', {},
            el('p', { class: 'muted' }, 'Templates suggested for this trigger. Click to fill and copy.'),
            el('div', { class: 'cards' },
              ...suggested.map(tpl => el('div', { class: 'card' },
                el('div', { class: 'flex-between' },
                  el('div', { class: 'card-title' }, tpl.label),
                  badge(tpl.channel, 'blue')),
                el('div', { class: 'card-meta' }, 'For: ' + tpl.audience),
                el('div', { class: 'card-actions' },
                  el('button', { class: 'btn-primary btn-sm', onclick: () => fillNotif(tpl) }, 'Fill Renseigner & copier copy'))))),
            el('div', { class: 'flex', style: 'margin-top:10px' },
              el('button', { class: 'btn-ghost', onclick: closeModal }, 'Later'))));
      } else {
        setTab('veille');
      }
    };

    const modeColor = trg.mode === 'crise' ? 'red' : trg.mode === 'vigilance' ? 'orange' : 'green';
    openModal('Declare : ' + trg.label,
      el('div', {},
        el('div', { class: 'auth-warn' },
          el('div', {}, '⚡ ', el('strong', {}, trg.dept || 'XX'), ' · ', trg.axe || '', ' · ',
            badge((trg.mode || 'nominal').toUpperCase(), modeColor)),
          el('div', { style: 'font-size:11.5px;margin-top:4px' },
            'Operational mode passera en ', el('strong', {}, (trg.mode || 'vigilance').toUpperCase()),
            ' (si supérieur au courant). Case auto-créé. Modèles d\'alerte recommandés proposés ensuite.')),
        twoCol('Vessel concerned', vesselSel, 'Department', deptSel),
        field('Note (l\'exemple ci-dessous est un guide — adaptez-le aux faits)', note),
        field('One line for DO SITREP (auto-aggregated)', sitrepLine),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-danger', onclick: submit }, '⚡ Confirm trigger'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   NOTIF — modèles d'alerte
  // ============================================================
  renderers.notif = (root) => {
    root.appendChild(panel('Modèles d\'alerte (single voice)',
      el('div', {},
        el('p', { class: 'muted' }, 'Pre-formatted messages to distribute. Auto variables: {VESSEL} {EVENT} {DTG} {AUTHOR} {LEVEL} {MODE} {DEPT}. Always validate via VP/DM before external distribution.'),
        el('div', { class: 'cards' },
          ...window.NOTIF_TEMPLATES.map(tpl => el('div', { class: 'card' },
            el('div', { class: 'flex-between' },
              el('div', { class: 'card-title' }, tpl.label),
              el('div', {}, badge(tpl.channel, 'blue'))),
            el('div', { class: 'card-meta' }, 'For: ' + tpl.audience),
            el('div', { class: 'card-actions' },
              el('button', { class: 'btn-primary btn-sm', onclick: () => fillNotif(tpl) }, 'Fill Renseigner & copier copy')))))
      )
    ));
  };

  function fillNotif(tpl) {
    const lastInc = (state.incidents.find(i => i.status !== 'closed')) || {};
    const vessel = el('input', { list: 'dl-vessels', value: lastInc.vessel || '', placeholder: '{VESSEL}' });
    const event = el('input', { value: lastInc.summary ? lastInc.summary.split('\n')[0] : (lastInc.type || ''), placeholder: '{EVENT}' });
    const out = el('textarea', { style: 'min-height:160px' });

    const refresh = () => {
      out.value = tpl.body
        .replace(/\{VESSEL\}/g, vessel.value || '—')
        .replace(/\{EVENT\}/g, event.value || '—')
        .replace(/\{DTG\}/g, fmtDTG(nowISO()))
        .replace(/\{AUTHOR\}/g, currentUserName() || 'MOC')
        .replace(/\{LEVEL\}/g, state.alert.toUpperCase())
        .replace(/\{POSTURE\}/g, state.alert.toUpperCase())
        .replace(/\{MODE\}/g, state.alert.toUpperCase())
        .replace(/\{DEPT\}/g, lastInc.department || 'XX');
    };
    vessel.addEventListener('input', refresh);
    event.addEventListener('input', refresh);
    refresh();

    const copyBtn = el('button', { class: 'btn-primary', onclick: async () => {
      try {
        await navigator.clipboard.writeText(out.value);
        toast('Copied to clipboard', 'ok');
        logMEL('COMMS', `Template "${tpl.label}" copied for distribution (${tpl.channel}, ${tpl.audience})`);
        save();
      } catch (e) {
        out.select();
        toast('Selected — Ctrl+C to copy', 'warn');
      }
    } }, '📋 Copy');

    openModal(tpl.label,
      el('div', {},
        el('div', { class: 'card-meta', style: 'margin-bottom:8px' }, 'Channel: ' + tpl.channel + ' · Todience : ' + tpl.audience),
        twoCol('Vessel', vessel, 'Event', event),
        field('Message', out),
        el('div', { class: 'flex', style: 'margin-top:12px' },
          copyBtn,
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Close'))
      ));
  }

  // ============================================================
  //   IMPORT / EXPORT
  // ============================================================
  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function exportJSON() {
    if (!confirm('Exporter en CLAIR (déchiffré) ? L\'archive ne sera plus protégée par le mot de passe. Préférez "Export chiffré" pour partager.')) {
      const enc = CrisisAuth.exportEncryptedBlob();
      download(`crisiscell_encrypted_${new Date().toISOString().slice(0, 10)}.json`, enc);
      toast('Encrypted export generated', 'ok');
      return;
    }
    download(`crisiscell_clear_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
    toast('⚠ Plain export — protect the file', 'warn');
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.schema === 'crisiscell.encrypted.v2') {
          if (!confirm('Importer une archive chiffrée ? Le coffre courant sera remplacé. Vous devrez ensuite vous reconnecter avec le mot de passe d\'origine.')) return;
          CrisisAuth.importEncryptedBlob(JSON.stringify(data));
          alert('Archive imported. Please log back in.');
          location.reload();
        } else {
          if (!confirm('Importer cet état (en clair) dans le coffre courant ?')) return;
          state = Object.assign(defaultState(), data);
          migrateState();
          await CrisisAuth.saveState(state);
          applyAlertClass();
          $('#alertSelect').value = state.alert;
          setTab(currentTab);
          toast('Import successful', 'ok');
        }
      } catch (e) { toast('Import error: ' + e.message, 'danger'); }
    };
    reader.readAsText(file);
  }

  // ============================================================
  //   CHANGE PASSWORD
  // ============================================================
  function changePasswordDialog() {
    const oldPwd = el('input', { type: 'password', autocomplete: 'current-password' });
    const new1 = el('input', { type: 'password', autocomplete: 'new-password' });
    const new2 = el('input', { type: 'password', autocomplete: 'new-password' });
    const errBox = el('div');
    const submit = async () => {
      errBox.innerHTML = '';
      if (new1.value !== new2.value) {
        errBox.appendChild(el('div', { class: 'auth-error' }, 'New passwords do not match.')); return;
      }
      try {
        await CrisisAuth.changePassword(oldPwd.value, new1.value);
        closeModal(); toast('Password changed.', 'ok');
        logMEL('SECURITY', 'Vault password changed');
        save();
      } catch (e) {
        errBox.appendChild(el('div', { class: 'auth-error' }, e.message));
      }
    };
    openModal('Change password',
      el('div', {},
        errBox,
        field('Current password', oldPwd),
        field('New password', new1),
        field('Confirm', new2),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Validate'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Cancel'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   GO
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', () => { saveSync(); });
})();
