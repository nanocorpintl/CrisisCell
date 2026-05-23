/* CMA Ships — Outil de continuité opérationnelle (technique & équipages)
 * - Périmètre : disponibilité technique des navires (FM), disponibilité
 *   équipages (Crewing), avancement chantiers (Fleet Upgrade).
 * - Hors périmètre : sécurité, sûreté, environnement (couverts par l'outil SSE).
 * - Persistance chiffrée AES-GCM via CrisisAuth.
 * - Modules : Veille (DM/DO) · COP · Incidents techniques · Navires · Journal
 *   (Duty Log) · Cellule · Actions · Frictions · Décisions · Anticipation
 *   (J+1/S+1) · Comms · Contacts · Ressources · Risques · Rythme · Passation
 *   · SITREP CMA Ships · Playbooks techniques · RETEX · Exercices · Critères
 *   de déclenchement · Modèles d'alerte.
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
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;            // utilisé uniquement avec contenu maîtrisé
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
      // Mode CMA Ships : nominal | vigilance | crise (statut VERT/AMBRE/ROUGE)
      // `alert` est conservé comme nom de champ pour rétro-compatibilité.
      alert: 'nominal',
      phase: 'reflex',
      opsPeriod: '',
      sitrepCounter: 0,
      weekNumber: '',
      sitrepContext: '',
      // Pilotage CMA Ships
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
        { id: id(), name: 'MRCC Gris-Nez',    role: 'Coord. SAR',          contact: '+33 3 21 87 21 87', priority: 'P1' },
        { id: id(), name: 'UKMTO Dubai',      role: 'Sûreté Océan Indien', contact: '+971 4 306 5180',   priority: 'P1' },
        { id: id(), name: 'MDAT-GoG',         role: 'Sûreté Golfe Guinée', contact: '+33 2 98 22 88 88', priority: 'P1' },
        { id: id(), name: 'P&I Club',         role: 'Assurance',           contact: '24/7 hotline',      priority: 'P1' },
        { id: id(), name: 'État du pavillon', role: 'Autorité',            contact: 'à compléter',       priority: 'P1' }
      ],
      resources: [],
      risks: [],
      // Battle rhythm = rituels CMA Ships
      rhythm: [
        { id: id(), time: '08:00', title: 'SITREPs départementaux finalisés', cadence: 'Quotidien',
          desc: 'DO FM/CR/FU finalisent leur SITREP départemental sur la trame standard.' },
        { id: id(), time: '08:30', title: 'SITREP CMA Ships consolidé', cadence: 'Quotidien',
          desc: 'DO lead consolide et diffuse à VP, Heads, DM Marseille. Avant 08h30.' },
        { id: id(), time: '09:00', title: 'Daily Stand-up', cadence: 'Quotidien',
          desc: '15 min strict. Animé par DM Marseille, 3 DO Asie en visio + Heads (ou deputies).' },
        { id: id(), time: '11:00', title: 'Passation Duty Manager', cadence: 'Mardi matin',
          desc: '45 min — handover formel DM sortant → DM entrant. Rotation hebdo.' },
        { id: id(), time: '14:00', title: 'Weekly Operations Review', cadence: 'Jeudi',
          desc: '60 min. VP + Heads + DM. Consolidation Weekly Pack pour Group MM vendredi.' },
        { id: id(), time: '18:00', title: 'Weekly Pack consolidé → bureau VP', cadence: 'Jeudi',
          desc: '1 page par département + 1 consolidé. Remis au plus tard 18h00 Marseille.' },
        { id: id(), time: '08:00', title: 'Group Management Meeting (CMA CGM)', cadence: 'Vendredi',
          desc: 'VP CMA Ships y participe avec Weekly Pack + SITREP du jour en main.' },
        { id: id(), time: '09:00', title: 'Monthly Business Review', cadence: '1er mardi du mois',
          desc: '90 min. Animé par les HoD, VP présent. VP Brief diffusé 48h avant.' }
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
      // automatiquement les 3 blocs département du SITREP CMA Ships consolidé.
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
  // sans navires ni contacts, prêt pour un nouvel import CSV.
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
    // Statut/alerte : ancien 5 niveaux → mode nominal/vigilance/crise
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
  async function init() {
    if (!window.crypto?.subtle) {
      authBody().appendChild(el('div', { class: 'auth-error' },
        'WebCrypto indisponible. Servez ce site via HTTPS ou localhost.'));
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
      'Première utilisation. Définissez un mot de passe robuste : il chiffre TOUTES les données localement (AES-GCM 256). Aucune récupération possible si oublié.'
    ));

    if (oldData) {
      body.appendChild(el('div', { class: 'auth-warn' },
        'Données antérieures détectées (non chiffrées). Elles seront migrées dans le coffre.'
      ));
    }

    const errBox = el('div');
    const userInput = el('input', { type: 'text', placeholder: 'Ex. DIR jdupont', autocomplete: 'off', maxlength: 64 });
    const pwd1 = el('input', { type: 'password', autocomplete: 'new-password', minlength: 12 });
    const pwd2 = el('input', { type: 'password', autocomplete: 'new-password' });
    const meterBar = el('div', { class: 'pwd-bar' });
    const meterLabel = el('div', { class: 'pwd-label' }, 'Force : —');
    const submit = el('button', { class: 'auth-btn', type: 'submit' }, 'Initialiser le coffre');

    pwd1.addEventListener('input', () => {
      const score = CrisisAuth.passwordStrength(pwd1.value);
      meterBar.style.width = ((score / 7) * 100) + '%';
      meterBar.style.background = score >= 6 ? '#2ecc71' : score >= 4 ? '#f1c40f' : '#e74c3c';
      meterLabel.textContent = 'Force : ' + CrisisAuth.strengthLabel(score) + ` (${score}/7)`;
    });

    const form = el('form', { class: 'auth-form', autocomplete: 'off' },
      errBox,
      el('label', {}, 'Votre nom / poste (auteur des saisies)'),
      userInput,
      el('label', {}, 'Mot de passe (≥12 caractères, mixte)'),
      pwd1,
      el('div', { class: 'pwd-meter' }, meterBar),
      meterLabel,
      el('label', {}, 'Confirmer le mot de passe'),
      pwd2,
      submit
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errBox.innerHTML = '';
      if (!userInput.value.trim()) {
        errBox.appendChild(el('div', { class: 'auth-error' }, 'Indiquez votre nom / poste.'));
        return;
      }
      if (pwd1.value !== pwd2.value) {
        errBox.appendChild(el('div', { class: 'auth-error' }, 'Les mots de passe ne correspondent pas.'));
        return;
      }
      submit.disabled = true; submit.textContent = 'Chiffrement…';
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
        submit.disabled = false; submit.textContent = 'Initialiser le coffre';
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
        `Verrouillé suite à trop de tentatives. Réessayez dans ${Math.ceil(lo.remainingMs / 1000)}s.`));
    }
    const errBox = el('div');
    const userInput = el('input', { type: 'text', placeholder: 'Votre nom / poste', autocomplete: 'username',
      value: (CrisisAuth.getUser() || {}).name || '' });
    const pwd = el('input', { type: 'password', autocomplete: 'current-password' });
    const submit = el('button', { class: 'auth-btn', type: 'submit' }, 'Déverrouiller');
    const resetBtn = el('button', { class: 'btn-ghost', type: 'button', style: 'width:100%;margin-top:8px' }, 'Réinitialiser le coffre…');
    resetBtn.addEventListener('click', () => {
      const conf = prompt('Tout effacer ? Tapez SUPPRIMER pour confirmer :');
      if (conf === 'SUPPRIMER') {
        CrisisAuth.reset();
        localStorage.removeItem(OLD_KEY);
        showSetup();
      }
    });

    const form = el('form', { class: 'auth-form', autocomplete: 'on' },
      errBox,
      el('label', {}, 'Nom / poste'),
      userInput,
      el('label', {}, 'Mot de passe'),
      pwd,
      submit,
      resetBtn
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errBox.innerHTML = '';
      submit.disabled = true; submit.textContent = 'Vérification…';
      try {
        await CrisisAuth.unlock(pwd.value);
        CrisisAuth.setUser(userInput.value.trim() || 'Anonyme');
        state = await CrisisAuth.loadState() || defaultState();
        migrateState();
        boot();
      } catch (e) {
        errBox.appendChild(el('div', { class: 'auth-error' }, e.message));
        submit.disabled = false; submit.textContent = 'Déverrouiller';
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
    // Onglet "Plus ▾" + son popover
    const moreBtn = $('#tabMoreBtn');
    const morePop = $('#tabMorePop');
    if (moreBtn && morePop) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        morePop.hidden = !morePop.hidden;
        if (!morePop.hidden) {
          // Positionne le popup en fixed (.tabs overflow-x clippe sinon)
          const r = moreBtn.getBoundingClientRect();
          morePop.style.top = (r.bottom + 4) + 'px';
          morePop.style.right = (window.innerWidth - r.right) + 'px';
        }
      });
      morePop.querySelectorAll('.tab-pop').forEach(b => {
        b.addEventListener('click', () => { setTab(b.dataset.tab); morePop.hidden = true; });
      });
      document.addEventListener('click', (e) => {
        if (!morePop.hidden && !morePop.contains(e.target) && e.target !== moreBtn) morePop.hidden = true;
      });
    }
    const sel = $('#alertSelect');
    sel.value = state.alert;
    sel.addEventListener('change', () => {
      state.alert = sel.value;
      applyAlertClass();
      logMEL('INFO', `Niveau d'alerte changé : ${state.alert.toUpperCase()}`);
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
    // Au clic d'un élément du menu, on referme
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
    $('#resetAll').addEventListener('click', () => {
      const conf = prompt('Tout effacer (incl. coffre chiffré) ? Tapez SUPPRIMER :');
      if (conf === 'SUPPRIMER') { CrisisAuth.reset(); location.reload(); }
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
    const submit = () => { state.opsPeriod = inp.value.trim(); save(); closeModal(); toast('OPS period mis à jour', 'ok'); };
    openModal('Période opérationnelle',
      el('div', { class: 'simple-dialog' },
        el('p', { class: 'muted' }, 'Plage horaire de l\'OPS Period courante (apparaît dans les SITREP).'),
        inp,
        el('div', { class: 'flex' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   IDLE / LOCK
  // ============================================================
  function startIdleWatch() {
    setInterval(() => {
      if (!CrisisAuth.isUnlocked()) return;
      const idle = Date.now() - lastActivity;
      if (idle > IDLE_MS) lockNow('Verrouillage automatique pour inactivité (15 min).');
      else if (idle > IDLE_MS - 60000 && !$('#idleToast')) {
        const t = toast('Verrouillage dans 1 min sans activité…', 'warn');
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
      catch (e) { console.error('save failed', e); toast('Échec sauvegarde : ' + e.message, 'danger'); }
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
      author: author || currentUserName() || 'Système',
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
    // Auto-focus first input
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

    root.appendChild(panel('Backlog Duty Manager',
      el('div', { class: 'muted' },
        'Vue d\'ensemble du Duty Manager : tout ce qui tourne en parallèle (dossiers, frictions, actions, notes du Duty Log). Mise à jour au fil de l\'eau. ',
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

    const kpis = el('div', { class: 'grid-4' },
      kpiTile('Mode', mode.statut,
        mode.code === 'crise' ? 'danger' : mode.code === 'vigilance' ? 'warn' : 'ok',
        mode.label),
      kpiTile('Dossiers ouverts', activeIncidents.length, activeIncidents.length ? 'warn' : 'ok'),
      kpiTile('Frictions actives', frActives, frActives ? 'warn' : 'ok'),
      kpiTile('Actions en retard', overdue, overdue ? 'danger' : (openActions ? 'warn' : 'ok'), `${openActions} ouvertes`)
    );
    root.appendChild(kpis);

    // Classification — répartition des dossiers ouverts
    const clsCount = {};
    activeIncidents.forEach(i => { const k = i.classification || 'INTERNAL'; clsCount[k] = (clsCount[k] || 0) + 1; });
    root.appendChild(panel('Classification des dossiers ouverts',
      el('div', { class: 'flex', style: 'gap:10px;flex-wrap:wrap' },
        ...window.CLASSIFICATIONS.map(c => {
          const n = clsCount[c.code] || 0;
          return el('div', { style: 'padding:8px 12px;border:1px solid var(--border);border-radius:6px;min-width:140px' },
            el('div', {}, badge(c.short, c.color), ' ', el('span', { class: 'muted', style: 'font-size:11px' }, c.label)),
            el('div', { style: 'font-size:22px;font-weight:700;margin-top:4px' }, n));
        })
      )
    ));

    // Off-hire — panel dédié : 4 KPIs (En cours · Semaine · YTD · vs Objectif)
    const offM = computeOffhireMetrics();
    const ratioTone = offM.ratio >= 100 ? 'danger' : offM.ratio >= 75 ? 'warn' : 'ok';
    const offhireKpis = el('div', { class: 'grid-4' },
      kpiTile('Estimé (en cours)',
        offhireOpen.toString() + ' h',
        offhireOpen > 240 ? 'danger' : offhireOpen > 72 ? 'warn' : 'ok',
        `FM ${offhireByDept('FM')} · CR ${offhireByDept('CR')} · FU ${offhireByDept('FU')}`),
      kpiTile('Risque semaine (nouveau)',
        offM.weekNew.toString() + ' h',
        offM.weekNew > 48 ? 'warn' : 'ok',
        'dossiers ouverts depuis lundi'),
      kpiTile('YTD réalisé',
        offM.ytdActual.toString() + ' h',
        'muted',
        `${offM.daysElapsed} j depuis 1ᵉʳ janvier`),
      kpiTile('YTD vs objectif',
        offM.ratio + ' %',
        ratioTone,
        `cible ${offM.ytdTarget} h (99,5% × ${offM.nVessels} nav.)`)
    );
    root.appendChild(panel('Off-hire',
      el('div', {},
        el('p', { class: 'muted', style: 'margin-bottom:10px' },
          'Cible disponibilité : 99,5% sur 365 j (≈ 43,8 h off-hire/navire/an). Objectif YTD = ' + offM.ytdTarget + ' h pour ' + offM.nVessels + ' navire(s).'),
        offhireKpis
      )
    ));

    // Quickbar — saisie MEL ultra-rapide
    const qbCat = el('select', {}, ...['INFO','INC','DECISION','COMMS','ACTION','SAFETY','SECURITY','MEDIA','VESSEL','OTHER']
      .map(c => el('option', { value: c }, c)));
    const qbAuthor = el('input', { value: currentUserName(), placeholder: 'Auteur', list: 'dl-authors' });
    const qbText = el('textarea', { placeholder: 'Saisie rapide d\'événement (Ctrl+Entrée pour envoyer)…' });
    const qbBtn = el('button', { class: 'btn-primary', onclick: () => {
      if (!qbText.value.trim()) return;
      logMEL(qbCat.value, qbText.value.trim(), qbAuthor.value || currentUserName() || 'Anonyme');
      qbText.value = '';
      toast('Événement consigné', 'ok');
      setTab('cop');
    } }, '⏎ Log');
    qbText.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); qbBtn.click(); }
    });
    root.appendChild(el('div', { class: 'quickbar' },
      qbCat, qbAuthor, qbText, qbBtn,
      el('div', { class: 'qb-hint' }, 'L : focus rapide · Ctrl+Entrée : envoyer')
    ));

    root.appendChild(panel('Dossiers ouverts',
      activeIncidents.length === 0
        ? el('div', { class: 'empty' }, 'Aucun dossier ouvert.')
        : tableEl(['Réf', 'Dépt', 'Type', 'Navire', 'Sév.', 'Class.', 'Démarré'],
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
      el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('incidents') }, 'Voir tous →')
    ));

    root.appendChild(panel('MEL — derniers événements',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'Journal vide.')
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
  renderers.incidents = (root) => {
    root.appendChild(panel('Dossiers techniques & équipages',
      el('div', {},
        el('p', { class: 'muted' }, 'Suivi des dossiers ouverts — propriétaire : le Duty Officer de chaque département (FM, CR, FU) pour son scope ; le Duty Manager pour les sujets transverses. Hors périmètre SSE (couvert par l\'outil dédié).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.incidents.length} total — ${state.incidents.filter(i => i.status !== 'closed').length} ouvert(s)`),
          el('button', { class: 'btn-primary', onclick: () => incidentForm() }, '+ Nouveau dossier (i)')
        ),
        state.incidents.length === 0
          ? el('div', { class: 'empty' }, 'Aucun dossier ouvert.')
          : tableEl(
            ['Réf', 'Dépt', 'Type', 'Navire', 'Sév.', 'Class.', 'Off-hire (h)', 'Démarré', 'Statut', ''],
            state.incidents.map(i => {
              const isClosed = i.status === 'closed';
              const value = isClosed
                ? (i.offhireActual != null ? i.offhireActual + ' h' : '⚠ non chiffré')
                : ((i.offhireEstimated || 0) + ' h est.');
              const color = isClosed
                ? (i.offhireActual == null ? 'red' : 'grey')
                : ((i.offhireEstimated || 0) > 72 ? 'orange' : 'blue');
              const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
              return [
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
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => incidentForm(i.id) }, 'Éditer'),
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
    'Manning', 'Certification', 'MEDEVAC', 'Régulation', 'Autre'
  ];
  function incidentForm(idEdit) {
    const inc = idEdit ? state.incidents.find(i => i.id === idEdit) : { severity: 'med', status: 'open', department: 'FM', type: 'M/E', classification: 'INTERNAL' };
    const ref = el('input', { value: inc.ref || ('DOS-' + Date.now().toString(36).toUpperCase()) });
    const type = el('select', {}, ...INCIDENT_TYPES.map(t => el('option', { value: t, selected: inc.type === t }, t)));
    const department = el('select', {}, ...window.DEPARTMENTS.map(d => el('option', { value: d.code, selected: (inc.department || 'FM') === d.code }, d.code + ' — ' + d.label)));
    const vessel = el('input', { list: 'dl-vessels', value: inc.vessel || '', placeholder: 'Tapez le nom ou collez du texte (auto-détection)' });
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
          (autoFromText ? '✓ détecté depuis le texte : ' : '✓ '),
          el('strong', {}, v.name),
          v.imo ? ' · IMO ' + v.imo : '',
          v.fleet ? ' · ' : '', v.fleet ? badge(v.fleet, 'blue') : '',
          ' · ', v.shipManager || '—',
          ' · ', badge(v.fuelType || v.fuelMode || '—', 'grey'),
          ' · ', (v.numDG || '?') + ' DG'));
      } else if (vessel.value) {
        vesselInfo.appendChild(el('span', { style: 'color:var(--warn)' },
          '⚠ Aucun navire détecté pour "' + vessel.value + '". Vérifiez l\'orthographe ou ajoutez-le au registre.'));
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
    const summary = el('textarea', { placeholder: 'Description : qui, quoi, où, conséquence opérationnelle, action en cours' }, inc.summary || '');
    const sitrepLine = el('input', {
      placeholder: 'Synthèse en UNE LIGNE qui apparaîtra dans le SITREP du DO',
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
      placeholder: 'Heures estimées'
    });
    const offhireAct = el('input', {
      type: 'number', min: 0, step: 0.5,
      value: inc.offhireActual != null ? inc.offhireActual : '',
      placeholder: 'OBLIGATOIRE à la clôture — chiffrage exact'
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
          toast('À la clôture, le chiffrage EXACT du off-hire (en heures) est obligatoire.', 'danger');
          return;
        }
      }
      // Tentative ultime de détection du navire si le champ est vide
      if (!vessel.value || !vessel.value.trim()) {
        const detected = findVesselInText(sitrepLine.value || '') || findVesselInText(summary.value || '');
        if (detected) {
          vessel.value = detected.name;
          toast('Navire détecté automatiquement : ' + detected.name, 'ok');
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
        offhireActual: offhireAct.value === '' ? null : parseFloat(offhireAct.value)
      };
      if (data.status === 'closed' && !data.closedAt) data.closedAt = nowISO();
      if (idEdit) {
        state.incidents[state.incidents.findIndex(i => i.id === idEdit)] = data;
        const offMsg = data.status === 'closed'
          ? ` · off-hire RÉEL : ${data.offhireActual} h`
          : ` · off-hire estimé : ${data.offhireEstimated} h`;
        logMEL('DOSSIER', `Dossier ${data.ref} mis à jour (${data.status})${offMsg}`);
      } else {
        state.incidents.push(data);
        logMEL('DOSSIER', `Nouveau dossier [${data.department}] ${data.ref} — ${data.type} sur ${data.vessel || 'n/a'} (sev ${data.severity}, off-hire estimé ${data.offhireEstimated} h)`);
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
      twoCol('Référence', ref, 'Département', department),
      twoCol('Type', type, 'Navire', vessel),
      vesselInfo,
      twoCol('Sévérité', severity, 'Classification', classification),
      field('Statut', status),
      field('Date début', startedAt),
      field('Synthèse une ligne (apparaît dans le SITREP du DO)', sitrepLine),
      field('Description détaillée', summary),
      el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' }, 'Off-hire'),
      twoCol('Off-hire estimé (heures)', offhireEst, 'Off-hire réel (clôture — OBLIGATOIRE)', offhireAct),
      el('div', { class: 'muted', style: 'font-size:11.5px' },
        '⚠ À la clôture du dossier, le chiffrage EXACT du nombre d\'heures de off-hire est obligatoire. Ces heures sont sommées dans le SITREP CMA Ships et suivies dans l\'onglet COP.'),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: submit }, idEdit ? 'Mettre à jour' : 'Créer'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier dossier' : 'Nouveau dossier', form, { onSubmit: submit });
  }
  function deleteIncident(idDel) {
    if (!confirm('Supprimer cet incident ?')) return;
    const inc = state.incidents.find(i => i.id === idDel);
    state.incidents = state.incidents.filter(i => i.id !== idDel);
    logMEL('INC', `Incident ${inc?.ref} supprimé`);
    save(); setTab('incidents');
  }

  // ============================================================
  //   VESSELS — registre flotte CMA Ships (438 navires)
  //   Import CSV : VesselName, IMO, Fleet (M1/M2/M3/S1/S2/S3...),
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
      // Capacités
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
      // Auxiliaires électriques
      AE_TIII: row['A/E TIII Technology'] || '',
      numDG: numAE || (typeof row.numDG === 'number' ? row.numDG : 4),
      // Fuel & propulsion
      fuelType: row['Fuel type'] || row.fuelMode || row.fuelType || 'HFO',
      fuelMode: row['Fuel type'] || row.fuelMode || 'HFO', // alias rétro-compat
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
      // Dates clés
      fleetEntryDate: row['Fleet entry date'] || '',
      deliveryDate: row['Delivery date'] || '',
      classAnniversary: row['Class anniversary date'] || '',
      outOfMgmtDate: row['Out of Management date'] || '',
      // Statut tool
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

  // Fusionne une liste de navires CSV → state.vessels. Clé : IMO puis nom.
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
  // Filtres persistants pour la grande flotte (438 navires)
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
          if (rows.length === 0) { toast('CSV vide ou format invalide', 'warn'); return; }
          openImportPreview(rows);
        } catch (err) { toast('Erreur parsing CSV : ' + err.message, 'danger'); }
      };
      reader.readAsText(f, 'utf-8');
    });

    root.appendChild(panel('Flotte CMA Ships — registre des navires',
      el('div', {},
        el('p', { class: 'muted' },
          `${state.vessels.length} navire(s) au registre. Axes d'analyse : flotte de management (M1/M2/M3/S1/S2/S3…), ship manager, fuel, classe. Import CSV pour bootstrap initial ou mise à jour de masse.`),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px;flex-wrap:wrap;gap:8px' },
          el('div', { class: 'flex', style: 'gap:6px;flex-wrap:wrap' },
            el('button', { class: 'btn-primary', onclick: () => vesselForm() }, '+ Ajouter (n)'),
            el('button', { class: 'btn-ghost', onclick: () => csvFile.click() }, '⬆ Importer CSV (438 navires)'),
            el('button', { class: 'btn-ghost', onclick: () => exportVesselsCSV() }, '⬇ Exporter CSV'),
            csvFile
          )
        ),

        // ===== Filtres =====
        el('div', { class: 'form-row cols-4', style: 'margin-bottom:10px' },
          (() => { const i = el('input', { placeholder: 'Recherche nom / IMO…', value: vesselFilters.search });
            i.addEventListener('input', () => { vesselFilters.search = i.value; setTab('vessels'); }); return i; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'Toutes flottes'),
              ...fleets.map(f => el('option', { value: f, selected: vesselFilters.fleet === f }, f)));
            s.addEventListener('change', () => { vesselFilters.fleet = s.value; setTab('vessels'); }); return s; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'Tous ship managers'),
              ...managers.map(m => el('option', { value: m, selected: vesselFilters.shipManager === m }, m)));
            s.addEventListener('change', () => { vesselFilters.shipManager = s.value; setTab('vessels'); }); return s; })(),
          (() => { const s = el('select', {}, el('option', { value: '' }, 'Tous fuels'),
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
              `${filtered.length} / ${total} navires affichés`),
            filtered.length === 0
              ? el('div', { class: 'empty' }, 'Aucun navire ne correspond aux filtres.')
              : tableEl(['Navire', 'IMO', 'Flotte', 'Ship Manager', 'Fuel', 'Classe / Série', 'DG', 'Dossiers', ''],
                filtered.slice(0, 200).map(v => {
                  const ds = dossiersByVessel[v.name] || [];
                  const fuel = v.fuelType || v.fuelMode || '—';
                  const isLNG = fuel.includes('LNG') || fuel.includes('Méthanol') || fuel.includes('Dual');
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
                      : badge(ds.length + ' ouvert(s)', 'red'),
                    el('div', { class: 'flex' },
                      el('button', { class: 'btn-ghost btn-sm', onclick: () => vesselDetail(v.id) }, '👁'),
                      el('button', { class: 'btn-ghost btn-sm', onclick: () => vesselForm(v.id) }, 'Éditer'),
                      el('button', { class: 'btn-danger btn-sm', onclick: () => deleteVessel(v.id) }, '✕')
                    )
                  ];
                })),
            filtered.length > 200
              ? el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:6px' },
                  '⚠ Affichage limité aux 200 premiers résultats. Affinez les filtres.')
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
      root.appendChild(panel('Données synthétiques (démo / test)',
        el('div', {},
          el('p', { class: 'muted' },
            'Génère N dossiers réalistes (M/E, A/E, Drydock, PSC, Manning, Vetting, MEDEVAC…) répartis aléatoirement sur les ' + state.vessels.length + ' navire(s) du registre. Off-hire estimé/réel, sévérités et classifications calibrés. Utile pour démos et tests des dashboards.'),
          el('div', { class: 'flex', style: 'gap:10px;align-items:center;margin:10px 0' },
            el('span', { class: 'muted', style: 'min-width:90px' }, 'Nb dossiers :'),
            synSlider, synOut),
          el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap' },
            el('button', { class: 'btn-primary', onclick: () => {
              const n = parseInt(synSlider.value, 10) || 0;
              const created = generateSyntheticDossiers(n);
              toast(`${created} dossiers synthétiques créés`, 'ok');
              logMEL('VESSEL', `${created} dossiers synthétiques générés (démo)`);
              save(); setTab('vessels');
            } }, '+ Générer ' + 'N dossiers'),
            el('button', { class: 'btn-ghost', onclick: () => {
              generateSyntheticSitrep();
              toast('SITREP CMA exemple généré', 'ok');
              save(); setTab('sitrep');
            } }, '+ Générer 1 SITREP exemple'),
            el('button', { class: 'btn-danger btn-sm', onclick: () => {
              if (!confirm('Supprimer TOUS les dossiers synthétiques (préfixe SYN-) ?')) return;
              const before = state.incidents.length;
              state.incidents = state.incidents.filter(i => !(i.ref || '').startsWith('SYN-'));
              const removed = before - state.incidents.length;
              toast(`${removed} dossiers synthétiques supprimés`, 'ok');
              save(); setTab('vessels');
            } }, '✕ Purger les dossiers synthétiques')
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
          if (rows.length === 0) { toast('CSV vide ou format invalide', 'warn'); return; }
          openImportPreview(rows);
        } catch (err) { toast('Erreur parsing CSV : ' + err.message, 'danger'); }
      };
      reader.readAsText(f, 'utf-8');
    });

    root.appendChild(panel('Cycle démo — purge & rejeu',
      el('div', {},
        el('p', { class: 'muted' },
          'Pour relancer une démo from scratch : purgez toutes les données métier (navires, dossiers, SITREPs, journal, actions, frictions, etc.) puis ré-importez le CSV avec génération de dossiers synthétiques. Le mot de passe et l\'authentification sont conservés.'),
        el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap;margin-top:10px' },
          el('button', { class: 'btn-danger', onclick: () => {
            const c = prompt('Cette action va EFFACER toutes les données métier (navires, dossiers, SITREPs, journal, actions, frictions, équipe, contacts…).\n\nLe mot de passe est conservé.\n\nTapez "PURGE" pour confirmer :');
            if (c !== 'PURGE') return;
            purgeAllData();
            toast('Toutes les données métier effacées', 'ok');
            setTab('vessels');
          } }, '⟲ Purger toutes les données métier'),
          el('button', { class: 'btn-primary', onclick: () => csvFileReset.click() }, '⬆ Ré-importer un CSV'),
          el('button', { class: 'btn-ghost', onclick: () => {
            if (!confirm('Cycle complet : purge + restauration des 3 navires CMA CGM par défaut + 30 dossiers synthétiques + 1 SITREP. Continuer ?')) return;
            purgeAllData();
            // Restaure les 3 navires CMA par défaut
            state.vessels = defaultState().vessels;
            state.stakeholders = defaultState().stakeholders;
            const created = generateSyntheticDossiers(30);
            generateSyntheticSitrep();
            logMEL('VESSEL', `Cycle démo express : 3 navires + ${created} dossiers + 1 SITREP`);
            toast(`Démo prête : 3 navires · ${created} dossiers · 1 SITREP`, 'ok');
            save(); setTab('cop');
          } }, '⚡ Reset + démo express (3 navires + 30 dossiers)'),
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
        summaryPanel('Répartition par flotte', byKey('fleet')),
        summaryPanel('Répartition par ship manager', byKey('shipManager'))
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

    openModal('Navire — ' + v.name,
      el('div', {},
        el('div', { class: 'flex', style: 'gap:8px;margin-bottom:10px;flex-wrap:wrap' },
          badge(v.fleet || '—', 'blue'), badge(v.shipManager || '—', 'grey'),
          badge((v.fuelType || v.fuelMode || '—'), 'orange'), vesselStatusBadge(v.status)),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Identification'),
        kv('IMO', v.imo), kv('Type / série', v.type), kv('Hull N°', v.hullNb),
        kv('Previous name', v.previousName), kv('2nd hand', v.secondHand),
        kv('Pavillon', v.flag), kv('Classification', v['class']),
        kv('Registered owner', v.registeredOwner), kv('Bareboat', v.bareboat),
        kv('Contractual owner', v.contractualOwner),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Pilotage CMA Ships'),
        kv('Fleet', v.fleet), kv('Ship Manager', v.shipManager),
        kv('Fleet Manager', v.fleetManager), kv('Email', v.fleetManagerEmail),
        kv('Superintendent (SI)', v.SI), kv('SI mobile', v.SI_mobile), kv('SI email', v.SI_email),
        kv('DPA / CSO', v.DPA_CSO), kv('Deputy DPA/CSO', v.deputyDPA),
        kv('MSO', v.MSO), kv('Safety Group', v.safetyGroup),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Capacités'),
        kv('GT', v.GT), kv('Capacité', v.capacity),
        kv('LOA (m)', v.LOA), kv('Largeur (m)', v.breadth),
        kv('Chantier', v.yard), kv('Année', v.builtIn),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Machine principale (M/E)'),
        kv('Designer', v.ME_designer), kv('Licensee', v.ME_licensee),
        kv('Type', v.ME_type), kv('Mark', v.ME_mark),
        kv('Course (stroke)', v.ME_stroke), kv('Units', v.ME_units), kv('Bore', v.ME_bore),
        kv('TIII', v.ME_TIII), kv('T/C', (v.ME_TC_maker || '') + ' / ' + (v.ME_TC_model || '')),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Énergie & propulsion'),
        kv('Fuel type', v.fuelType || v.fuelMode),
        kv('Propulsion', v.propulsionType),
        kv('Nombre de DG', v.numDG),
        kv('A/E TIII', v.AE_TIII),
        kv('1ère soute LNG', v.firstLNGBunkering),
        kv('Lubricator', v.lubricator),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Crewing & sûreté'),
        kv('Effectif équipage', v.crewNb),
        kv('Crew Mgr FR', v.crewMgrFR), kv('Crew Mgr INTL', v.crewMgrINTL),
        kv('Citadel', v.citadel), kv('MS Teams onboard', v.msTeamsOnboard),
        kv('NaviSys Contract holder', v.naviSysContractHolder),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Dates clés'),
        kv('Fleet entry', v.fleetEntryDate), kv('Livraison', v.deliveryDate),
        kv('Anniv. classe', v.classAnniversary), kv('Out of management', v.outOfMgmtDate),

        el('h4', { style: 'margin:10px 0 4px;color:var(--accent-2)' }, 'Dossiers liés'),
        el('div', { style: 'font-size:12px' },
          'Ouverts : ', badge(open.length, open.length ? 'red' : 'grey'), ' · ',
          'Clos : ', badge(closed.length, 'grey'), ' · ',
          'Off-hire YTD : ', badge(Math.round(offhireYTD * 10) / 10 + ' h', 'orange'), ' · ',
          'Off-hire estimé en cours : ', badge(offhireOpen + ' h', 'orange')),
        open.length === 0 ? null : el('div', { style: 'margin-top:6px' },
          ...open.map(i => el('div', { class: 'pb-step', style: 'cursor:pointer', onclick: () => incidentForm(i.id) },
            badge((i.severity || 'med').toUpperCase(), severityColor(i.severity)),
            el('div', { class: 'pb-text' },
              el('span', { class: 'mono', style: 'color:var(--muted);font-size:11px' }, i.ref + ' · '),
              i.sitrepLine || i.type)))),

        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: () => { closeModal(); vesselForm(v.id); } }, 'Éditer'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Fermer'))
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
      { off:   0, sev: 'low',  line: 'Phase-in prévu {D}/06, sea trial OK, équipage à bord' },
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
      { off:  0, sev: 'low', line: 'Audit POEA {P} J+{D}, préparation Crewing en cours' },
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
    'Régulation': [
      { off: 24, sev: 'med', line: 'Conf call DGAMPA implementation FuelEU J+{D}' },
      { off:  0, sev: 'low', line: 'MARPOL annex VI inspection passée sans réserve' }
    ]
  };

  const SYNTH_PORTS = ['Singapore','Rotterdam','Le Havre','Hamburg','Shanghai','Long Beach','Khalifa','Algeciras','Tangier','Antwerp','Hong Kong','Manille'];
  const SYNTH_OIL_MAJORS = ['Shell','BP','Exxon','Total','Chevron'];
  const SYNTH_YARDS = ['Cosco Zhoushan','Cosco Shanghai','Seatrium','Hyundai Mipo'];

  const DEPT_BY_TYPE = {
    'M/E': 'FM', 'A/E': 'FM', 'Propulsion': 'FM', 'PSC': 'FM',
    'Vetting': 'FM', 'Bunker': 'FM', 'Cargaison': 'FM', 'Régulation': 'FM',
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
      toast('Aucun navire au registre. Importez d\'abord un CSV.', 'warn');
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
    const text = renderCMASitrep('Activité opérationnelle nominale sur la flotte. Quelques dossiers techniques sous surveillance FM, relèves Crewing en cours, chantiers FU dans le planning.');
    state.sitreps.unshift({ id: id(), ts: nowISO(), num: state.sitrepCounter, text });
  }

  function openImportPreview(rows) {
    const sample = rows.slice(0, 5);
    const fleets = [...new Set(rows.map(r => r.Fleet).filter(Boolean))];
    const managers = [...new Set(rows.map(r => r['Ship Manager']).filter(Boolean))];
    openModal('Import CSV — aperçu',
      el('div', {},
        el('div', { class: 'auth-info' },
          el('strong', {}, rows.length + ' lignes détectées dans le CSV.'),
          el('div', { style: 'font-size:11.5px;margin-top:4px' },
            'Flottes : ' + (fleets.length ? fleets.join(' · ') : '—') + ' · ',
            'Ship managers : ' + (managers.length ? managers.join(' · ') : '—'))),
        el('p', { class: 'muted', style: 'margin-top:10px' },
          'Les navires sont identifiés par IMO (priorité) ou par nom. Si un navire existe déjà, ses champs sont mis à jour (statut, position et notes locales préservés).'),
        el('h4', {}, 'Aperçu (5 premières lignes)'),
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
                el('strong', {}, 'Générer des données synthétiques (démo / test)'),
                el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:2px' },
                  'Dossiers réalistes (M/E, A/E, Drydock, PSC, Manning…) répartis sur les navires importés. Inclut aussi un SITREP CMA exemple.'))),
            el('div', { class: 'flex', style: 'gap:10px;align-items:center' },
              el('span', { class: 'muted', style: 'font-size:12px;min-width:90px' }, 'Nb dossiers :'),
              slider, out),
            el('div', { class: 'flex', style: 'margin-top:14px' },
              el('button', { class: 'btn-primary', onclick: () => {
                const stats = mergeImportedVessels(rows);
                let extra = '';
                if (seedCb.checked) {
                  const n = parseInt(slider.value, 10) || 0;
                  const created = generateSyntheticDossiers(n);
                  generateSyntheticSitrep();
                  extra = ` · ${created} dossiers synthétiques + 1 SITREP exemple`;
                }
                logMEL('VESSEL', `Import CSV : ${stats.added} ajoutés · ${stats.updated} mis à jour · ${stats.skipped} ignorés (total ${stats.total})${extra}`);
                toast(`Import : ${stats.added} ajoutés · ${stats.updated} mis à jour${extra}`, 'ok');
                save(); closeModal(); setTab('vessels');
              } }, '✓ Importer ' + rows.length + ' navires'),
              el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')));
        })()
      ));
  }

  function exportVesselsCSV() {
    if (state.vessels.length === 0) { toast('Registre vide.', 'warn'); return; }
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
    toast('Export CSV (' + state.vessels.length + ' navires)', 'ok');
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
      else { state.vessels.push(data); logMEL('VESSEL', `Navire ${data.name} ajouté`); }
      save(); closeModal(); setTab('vessels');
    };
    openModal(idEdit ? 'Modifier navire' : 'Nouveau navire',
      el('div', {},
        twoCol('Nom', name, 'IMO', imo),
        twoCol('Type', type, 'Statut', status),
        field('Position', position),
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, idEdit ? 'Mettre à jour' : 'Créer'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
        )
      ), { onSubmit: submit });
  }
  function deleteVessel(idDel) { if (confirm('Retirer ?')) { state.vessels = state.vessels.filter(v => v.id !== idDel); save(); setTab('vessels'); } }

  // ============================================================
  //   MEL
  // ============================================================
  renderers.mel = (root) => {
    const cat = el('select', {}, ...['INFO','DOSSIER','DECISION','COMMS','ACTION','VESSEL','DOSIT','OTHER']
      .map(c => el('option', { value: c }, c)));
    const author = el('input', { value: currentUserName(), list: 'dl-authors' });
    const text = el('textarea', { placeholder: 'Note (Ctrl+Entrée pour envoyer)' });
    const submit = () => {
      if (!text.value.trim()) return;
      logMEL(cat.value, text.value.trim(), author.value || currentUserName() || 'Anonyme');
      text.value = '';
      setTab('mel');
    };
    text.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); submit(); } });
    root.appendChild(panel('Duty Log',
      el('div', {},
        el('p', { class: 'muted' }, 'Journal chronologique du Duty Manager (cf. JD Duty Manager : "Maintain the Duty Log in real time"). Notes au fil de l\'eau, traçabilité pour audit et passation. Distinct des Dossiers (suivi long) et des Actions (à faire).'),
        twoCol('Catégorie', cat, 'Auteur', author),
        field('Note', text),
        el('button', { class: 'btn-primary', onclick: submit }, '+ Consigner')
      )
    ));
    root.appendChild(panel('Entrées',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'Aucune entrée pour le moment.')
        : el('div', {}, ...state.mel.map(meEntry)),
      el('button', { class: 'btn-ghost btn-sm', onclick: exportMEL }, '⬇ Export texte')
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
    root.appendChild(panel('Cellule de crise',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Organisation simplifiée — 6 fonctions clés. Plusieurs personnes peuvent partager une fonction (binôme, relève).'),
          el('button', { class: 'btn-primary', onclick: () => teamForm() }, '+ Ajouter')
        ),
        state.team.length === 0
          ? el('div', { class: 'empty' }, 'Vide.')
          : tableEl(['Rôle', 'Nom', 'Contact', 'Astreinte', 'Statut', ''],
            state.team.map(t => [
              el('span', {}, badge(t.role, 'blue'), ' ', roleName(t.role)),
              t.name, t.contact, t.shift || '',
              badge(t.online ? 'En ligne' : 'Off', t.online ? 'green' : 'grey'),
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => teamForm(t.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Retirer ?')) { state.team = state.team.filter(x => x.id !== t.id); save(); setTab('team'); } } }, '✕')
              )
            ]))
      )
    ));
    root.appendChild(panel('Référentiel des rôles',
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
    openModal(idEdit ? 'Éditer membre' : 'Nouveau membre',
      el('div', {},
        twoCol('Rôle', role, 'Nom', name),
        twoCol('Contact', contact, 'Astreinte', shift),
        el('label', { class: 'flex', style: 'margin-top:6px' }, online, el('span', { style: 'margin-left:6px' }, 'En ligne / mobilisé')),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   ACTIONS
  // ============================================================
  renderers.actions = (root) => {
    const open = state.actions.filter(a => a.status !== 'done');
    const done = state.actions.filter(a => a.status === 'done');
    root.appendChild(panel('Suivi des actions',
      el('div', {},
        el('p', { class: 'muted' }, 'Actions à mener issues du Daily Stand-up, du WOR ou des Dossiers. Suivi opérationnel par département (DO) ou transverse (DM). Distinct des Dossiers (suivi long terme) et du Duty Log (notes chronologiques).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${open.length} ouverte(s) — ${done.length} clôturée(s)`),
          el('button', { class: 'btn-primary', onclick: () => actionForm() }, '+ Action (a)')
        ),
        open.length === 0 ? el('div', { class: 'empty' }, 'Aucune action.')
          : tableEl(['Pri.', 'Dépt', 'Description', 'Owner', 'Échéance', 'Statut', ''], open.map(actionRow))
      )
    ));
    if (done.length) root.appendChild(panel('Clôturées',
      tableEl(['Pri.', 'Dépt', 'Description', 'Owner', 'Échéance', 'Statut', ''], done.map(actionRow))));
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
        el('button', { class: 'btn-ghost btn-sm', onclick: () => actionForm(a.id) }, 'Éditer'),
        a.status !== 'done' ? el('button', { class: 'btn-success btn-sm', onclick: () => closeAction(a.id) }, '✓') : null,
        el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.actions = state.actions.filter(x => x.id !== a.id); save(); setTab('actions'); } } }, '✕')
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
    const status = el('select', {}, ...[['todo','À faire'],['in-progress','En cours'],['blocked','Bloquée'],['done','Faite']]
      .map(([k, l]) => el('option', { value: k, selected: a.status === k }, l)));
    const department = el('select', {}, ...window.DEPARTMENTS.map(d => el('option', { value: d.code, selected: (a.department || 'FM') === d.code }, d.code + ' — ' + d.label)));
    const text = el('textarea', { placeholder: 'Action concrète, mesurable, attribuable' }, a.text || '');
    const owner = el('input', { value: a.owner || currentUserName(), list: 'dl-owners' });
    const due = el('input', { type: 'datetime-local', value: a.due ? new Date(a.due).toISOString().slice(0, 16) : '' });
    const submit = () => {
      const data = { id: a.id || id(), text: text.value, owner: owner.value,
        due: due.value ? new Date(due.value).toISOString() : '',
        priority: priority.value, status: status.value,
        department: department.value,
        createdAt: a.createdAt || nowISO() };
      if (idEdit) state.actions[state.actions.findIndex(x => x.id === idEdit)] = data;
      else { state.actions.push(data); logMEL('ACTION', `Action [${data.department}] : ${data.text} (${data.priority})`); }
      save(); closeModal(); setTab('actions');
    };
    openModal(idEdit ? 'Éditer action' : 'Nouvelle action',
      el('div', {},
        field('Description', text),
        twoCol('Owner', owner, 'Échéance', due),
        twoCol('Priorité', priority, 'Statut', status),
        field('Département', department),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
        )
      ), { onSubmit: submit });
  }
  function closeAction(idDel) {
    const a = state.actions.find(x => x.id === idDel);
    a.status = 'done'; a.closedAt = nowISO();
    logMEL('ACTION', `Clôturée : ${a.text}`);
    save(); setTab('actions');
  }

  // ============================================================
  //   DECISIONS
  // ============================================================
  renderers.decisions = (root) => {
    root.appendChild(panel('Arbitrages',
      el('div', {},
        el('p', { class: 'muted' }, 'Arbitrages routine (Duty Officer intra-département, Duty Manager transverse) — cf. JDs CMA Ships : "Take routine technical arbitrations within the operational perimeter". Traçabilité légère : contexte / décision / mise en œuvre. Sujets dépassant le périmètre routine → escalade au Head ou VP.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.decisions.length} arbitrage(s) consigné(s)`),
          el('button', { class: 'btn-primary', onclick: () => decisionForm() }, '+ Arbitrage (d)')
        ),
        state.decisions.length === 0 ? el('div', { class: 'empty' }, 'Aucune décision.')
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
                el('div', { class: 'card-meta' }, `Décideur : ${d.decider || '—'}`),
                el('div', { class: 'card-body' },
                  el('div', {}, el('strong', {}, 'Contexte : '), ctx || '—'),
                  el('div', {}, el('strong', {}, 'Décision : '), dec || '—'),
                  el('div', {}, el('strong', {}, 'Mise en œuvre : '), exec || '—')),
                el('div', { class: 'card-actions' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => decisionForm(d.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.decisions = state.decisions.filter(x => x.id !== d.id); save(); setTab('decisions'); } } }, '✕')
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
    const context = el('textarea', { placeholder: 'Situation, faits motivant la décision, options envisagées' }, initCtx);
    const decision = el('textarea', { placeholder: 'Décision retenue + justification' }, initDec);
    const execution = el('textarea', { placeholder: 'Mise en œuvre : qui, quoi, quand' }, initExec);
    const status = el('select', {}, ...[['pending','Attente'],['executed','Exécutée'],['rejected','Rejetée']]
      .map(([k, l]) => el('option', { value: k, selected: d.status === k }, l)));
    const submit = () => {
      const data = { id: d.id || id(), title: title.value, decider: decider.value,
        context: context.value, decision: decision.value, execution: execution.value,
        status: status.value, ts: d.ts || nowISO() };
      if (idEdit) state.decisions[state.decisions.findIndex(x => x.id === idEdit)] = data;
      else { state.decisions.unshift(data); logMEL('DECISION', `Décision : ${data.title} (${data.status})`); }
      save(); closeModal(); setTab('decisions');
    };
    openModal(idEdit ? 'Éditer arbitrage' : 'Nouvel arbitrage',
      el('div', {},
        twoCol('Titre', title, 'Décideur', decider),
        field('Contexte', context),
        field('Décision', decision),
        field('Mise en œuvre', execution),
        field('Statut', status),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Tracer'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   ANTICIPATION — H+6 / H+24 / H+72 (REX nucléaire)
  // ============================================================
  renderers.anticipation = (root) => {
    root.appendChild(panel('Cellule Anticipation — prospective',
      el('div', {},
        el('p', { class: 'muted' }, 'Modèle EDF/ASN : la cellule anticipation produit des scénarios best/likely/worst à H+6, H+24, H+72, séparée de l\'action immédiate. Permet d\'éviter le tunnel et préparer les décisions à venir.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.anticipation.length} scénario(s)`),
          el('button', { class: 'btn-primary', onclick: () => anticipationForm() }, '+ Scénario')
        ),
        state.anticipation.length === 0 ? el('div', { class: 'empty' }, 'Aucun scénario.')
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
                    el('div', {}, el('strong', { style: 'color:var(--warn)' }, '◯ Likely : '), a.likely || '—'),
                    el('div', {}, el('strong', { style: 'color:var(--danger)' }, '✗ Worst case : '), a.worst || '—'),
                    a.signals ? el('div', { style: 'margin-top:6px' }, el('strong', {}, 'Signaux à surveiller : '), a.signals) : null
                  ),
                  el('div', { class: 'card-actions' },
                    el('button', { class: 'btn-ghost btn-sm', onclick: () => anticipationForm(a.id) }, 'Éditer'),
                    el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.anticipation = state.anticipation.filter(x => x.id !== a.id); save(); setTab('anticipation'); } } }, '✕')
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
    const best = el('textarea', { placeholder: 'Scénario favorable' }, a.best || '');
    const likely = el('textarea', { placeholder: 'Scénario probable' }, a.likely || '');
    const worst = el('textarea', { placeholder: 'Scénario défavorable' }, a.worst || '');
    const signals = el('textarea', { placeholder: 'Signaux faibles / forts à surveiller (déclencheurs de bascule)' }, a.signals || '');
    const submit = () => {
      const data = { id: a.id || id(), horizon: horizon.value, title: title.value, owner: owner.value,
        best: best.value, likely: likely.value, worst: worst.value, signals: signals.value, ts: a.ts || nowISO() };
      if (idEdit) state.anticipation[state.anticipation.findIndex(x => x.id === idEdit)] = data;
      else { state.anticipation.push(data); logMEL('INFO', `Anticipation H+${data.horizon} : ${data.title}`); }
      save(); closeModal(); setTab('anticipation');
    };
    openModal(idEdit ? 'Éditer scénario' : 'Nouveau scénario',
      el('div', {},
        twoCol('Horizon', horizon, 'Owner', owner),
        field('Titre', title),
        field('✓ Best case', best),
        field('◯ Likely', likely),
        field('✗ Worst case', worst),
        field('Signaux à surveiller', signals),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   COMMS
  // ============================================================
  renderers.comms = (root) => {
    root.appendChild(panel('Communications (accessoire)',
      el('div', {},
        el('p', { class: 'muted' }, 'Onglet accessoire — la communication externe single voice est portée par le Duty Manager et le VP. À utiliser ponctuellement pour tracer une comm sensible (affréteur, État pavillon, chantier).'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.comms.length} comm(s) tracée(s)`),
          el('button', { class: 'btn-primary', onclick: () => commsForm() }, '+ Comm (k)')
        ),
        state.comms.length === 0 ? el('div', { class: 'empty' }, 'Aucune comm.')
          : tableEl(['Sens', 'DTG', 'Canal', 'De/À', 'Sujet', 'Validation', 'Contenu', ''],
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
    const dir = el('select', {}, el('option', { value: 'in' }, '⇓ Entrante'), el('option', { value: 'out' }, '⇑ Sortante'));
    const channel = el('input', { list: 'dl-channels', placeholder: 'VHF, Inmarsat…' });
    const party = el('input', { list: 'dl-parties' });
    const subject = el('input', {});
    const body = el('textarea', {});
    const validated = el('input', { type: 'checkbox' });
    const validatedBy = el('input', { placeholder: 'Nom du validateur (DIR/COM)' });
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
    openModal('Nouvelle communication',
      el('div', {},
        twoCol('Sens', dir, 'Canal', channel),
        twoCol('De/À', party, 'Sujet', subject),
        field('Contenu', body),
        el('label', { class: 'flex' }, validated, el('span', { style: 'margin-left:6px' }, 'Validé single-voice')),
        field('Validé par', validatedBy),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Enregistrer'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
        )
      ), { onSubmit: submit });
  }

  // ============================================================
  //   STAKEHOLDERS
  // ============================================================
  renderers.stakeholders = (root) => {
    root.appendChild(panel('Annuaire de crise',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Mobilisable 24/7'),
          el('button', { class: 'btn-primary', onclick: () => stakeholderForm() }, '+ Ajouter')
        ),
        state.stakeholders.length === 0 ? el('div', { class: 'empty' }, 'Vide.')
          : tableEl(['Pri.', 'Nom', 'Rôle', 'Contact', ''],
            state.stakeholders.slice().sort((a, b) => (a.priority || 'P3').localeCompare(b.priority || 'P3'))
              .map(s => [
                badge(s.priority || 'P3', s.priority === 'P1' ? 'red' : s.priority === 'P2' ? 'orange' : 'blue'),
                s.name, s.role, el('span', { class: 'mono' }, s.contact),
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => stakeholderForm(s.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.stakeholders = state.stakeholders.filter(x => x.id !== s.id); save(); setTab('stakeholders'); } } }, '✕'))
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
    openModal(idEdit ? 'Éditer' : 'Nouveau contact',
      el('div', {},
        twoCol('Nom/Org', name, 'Rôle', role),
        twoCol('Contact', contact, 'Priorité', priority),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   RESOURCES — moyens mobilisés (salvors, remorqueurs, médical)
  // ============================================================
  renderers.resources = (root) => {
    root.appendChild(panel('Ressources mobilisées',
      el('div', {},
        el('p', { class: 'muted' }, 'Tracking opérationnel des moyens engagés : remorqueurs, salvors LOF, équipes médicales, équipes protection embarquée, agents portuaires, support juridique.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.resources.length} ressource(s)`),
          el('button', { class: 'btn-primary', onclick: () => resourceForm() }, '+ Ressource')
        ),
        state.resources.length === 0 ? el('div', { class: 'empty' }, 'Aucune ressource.')
          : tableEl(['Type', 'Désignation', 'Statut', 'ETA', 'Capacité', 'Contact', 'Notes', ''],
            state.resources.map(r => [
              badge(r.type, 'blue'), r.name,
              badge(r.status, r.status === 'on-site' ? 'green' : r.status === 'enroute' ? 'orange' : r.status === 'standby' ? 'blue' : 'grey'),
              fmtTime(r.eta), r.capacity || '—',
              el('span', { class: 'mono' }, r.contact || '—'),
              r.notes || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => resourceForm(r.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.resources = state.resources.filter(x => x.id !== r.id); save(); setTab('resources'); } } }, '✕'))
            ]))
      )
    ));
  };
  function resourceForm(idEdit) {
    const r = idEdit ? state.resources.find(x => x.id === idEdit) : { status: 'requested' };
    const type = el('select', {}, ...['Remorqueur','Salvor','Médical','Protection (PCASP)','Aérien (HN/avion)','Agent maritime','Juridique','Plongeurs','Autre']
      .map(t => el('option', { value: t, selected: r.type === t }, t)));
    const name = el('input', { value: r.name || '' });
    const status = el('select', {}, ...[['requested','Demandé'],['confirmed','Confirmé'],['enroute','En route'],['on-site','Sur site'],['released','Relâché']]
      .map(([k, l]) => el('option', { value: k, selected: r.status === k }, l)));
    const eta = el('input', { type: 'datetime-local', value: r.eta ? new Date(r.eta).toISOString().slice(0, 16) : '' });
    const capacity = el('input', { value: r.capacity || '', placeholder: 'BHP, IBP, places, capacité' });
    const contact = el('input', { value: r.contact || '' });
    const notes = el('textarea', {}, r.notes || '');
    const submit = () => {
      const data = { id: r.id || id(), type: type.value, name: name.value, status: status.value,
        eta: eta.value ? new Date(eta.value).toISOString() : '',
        capacity: capacity.value, contact: contact.value, notes: notes.value };
      if (idEdit) state.resources[state.resources.findIndex(x => x.id === idEdit)] = data;
      else { state.resources.push(data); logMEL('INFO', `Ressource mobilisée : ${data.type} — ${data.name}`); }
      save(); closeModal(); setTab('resources');
    };
    openModal(idEdit ? 'Éditer ressource' : 'Nouvelle ressource',
      el('div', {},
        twoCol('Type', type, 'Désignation', name),
        twoCol('Statut', status, 'ETA', eta),
        twoCol('Capacité', capacity, 'Contact', contact),
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   RISK MATRIX
  // ============================================================
  renderers.risk = (root) => {
    root.appendChild(panel('Matrice 5×5',
      el('div', {},
        el('p', { class: 'muted' }, 'Likelihood × Severity. Cliquer une case pour ajouter.'),
        riskMatrixView()
      )
    ));
    root.appendChild(panel('Registre',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.risks.length} risque(s)`),
          el('button', { class: 'btn-primary', onclick: () => riskForm() }, '+ Risque')
        ),
        state.risks.length === 0 ? el('div', { class: 'empty' }, 'Aucun.')
          : tableEl(['Titre', 'L', 'S', 'Score', 'Mitigation', 'Owner', ''],
            state.risks.map(r => [r.title, r.likelihood, r.severity,
              badge(r.likelihood * r.severity, riskScoreClass(r.likelihood * r.severity).replace('r-', '').replace('crit', 'red').replace('high', 'orange').replace('med', 'yellow').replace('low', 'green')),
              r.mitigation || '', r.owner || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => riskForm(r.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.risks = state.risks.filter(x => x.id !== r.id); save(); setTab('risk'); } } }, '✕'))
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
    openModal(idEdit ? 'Éditer risque' : 'Nouveau risque',
      el('div', {},
        field('Titre', title),
        twoCol('Likelihood (1-5)', likelihood, 'Severity (1-5)', severity),
        twoCol('Owner', owner, '', el('span')),
        field('Mitigation', mitigation),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   BATTLE RHYTHM
  // ============================================================
  renderers.rhythm = (root) => {
    root.appendChild(panel('Battle Rhythm',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Cadence des briefings et SITREP — pratique HQ militaire.'),
          el('button', { class: 'btn-primary', onclick: () => rhythmForm() }, '+ Rendez-vous')
        ),
        state.rhythm.length === 0 ? el('div', { class: 'empty' }, 'Vide.')
          : tableEl(['Heure', 'Titre', 'Cadence', 'Description', ''],
            state.rhythm.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map(r => [el('span', { class: 'mono' }, r.time), r.title, r.cadence, r.desc,
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => rhythmForm(r.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.rhythm = state.rhythm.filter(x => x.id !== r.id); save(); setTab('rhythm'); } } }, '✕'))]))
      )
    ));
  };
  function rhythmForm(idEdit) {
    const r = idEdit ? state.rhythm.find(x => x.id === idEdit) : {};
    const time = el('input', { type: 'time', value: r.time || '08:00' });
    const title = el('input', { value: r.title || '' });
    const cadence = el('select', {}, ...['Quotidien','6H','12H','Hebdo','Sur demande'].map(c => el('option', { value: c, selected: r.cadence === c }, c)));
    const desc = el('textarea', {}, r.desc || '');
    const submit = () => {
      const data = { id: r.id || id(), time: time.value, title: title.value, cadence: cadence.value, desc: desc.value };
      if (idEdit) state.rhythm[state.rhythm.findIndex(x => x.id === idEdit)] = data;
      else state.rhythm.push(data);
      save(); closeModal(); setTab('rhythm');
    };
    openModal(idEdit ? 'Éditer' : 'Nouveau rendez-vous',
      el('div', {},
        twoCol('Heure', time, 'Cadence', cadence),
        field('Titre', title),
        field('Description', desc),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   PASSATION DE QUART (naval REX)
  // ============================================================
  renderers.passation = (root) => {
    root.appendChild(panel('Passation de quart — handover',
      el('div', {},
        el('p', { class: 'muted' }, 'Pratique navale obligatoire : transfert formel de responsabilité avec checklist signée par les deux parties. Inspiré de la relève en passerelle et de l\'ICS Form 201.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.passations.length} passation(s)`),
          el('button', { class: 'btn-primary', onclick: () => passationForm() }, '+ Passation')
        ),
        state.passations.length === 0 ? el('div', { class: 'empty' }, 'Aucune passation.')
          : el('div', { class: 'cards' }, ...state.passations.map(p =>
            el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, `${p.fromUser || '?'} → ${p.toUser || '?'}`),
                el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(p.ts))),
              p.signoff ? badge('✓ Signée par ' + p.toUser, 'green') : badge('En attente sign-off', 'orange'),
              el('div', { class: 'card-body' },
                ...(p.items || []).map((it, idx) => el('div', { class: 'pb-step' },
                  el('span', {}, it.checked ? '✅' : '☐'),
                  el('span', { class: 'pb-text' + (it.checked ? ' done' : '') }, ` ${idx + 1}. ${it.label}` + (it.note ? ` — ${it.note}` : '')))),
                p.notes ? el('div', { style: 'margin-top:8px' }, el('strong', {}, 'Notes : '), p.notes) : null),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => passationForm(p.id) }, 'Éditer'),
                !p.signoff ? el('button', { class: 'btn-success btn-sm', onclick: () => signoffPassation(p.id) }, '✓ Signer (relève)') : null,
                el('button', { class: 'btn-ghost btn-sm', onclick: () => download(`Passation_${p.id}.txt`, exportPassation(p)) }, '⬇ Export'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.passations = state.passations.filter(x => x.id !== p.id); save(); setTab('passation'); } } }, '✕')))))
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
    const toUser = el('input', { value: p.toUser || '', placeholder: 'Nom de la relève' });
    const notes = el('textarea', { placeholder: 'Notes complémentaires libres' }, p.notes || '');
    // Pré-remplissage : récap auto des éléments d'état courants
    const autoFill = el('button', { class: 'btn-ghost btn-sm', onclick: () => {
      const open = state.actions.filter(a => a.status !== 'done');
      const incs = state.incidents.filter(i => i.status !== 'closed');
      const tip = [
        `Mode CMA Ships : ${state.alert.toUpperCase()}`,
        `Incidents actifs : ${incs.length}`,
        `Actions ouvertes (P1) : ${open.filter(a => a.priority === 'P1').length}`,
        `Total actions ouvertes : ${open.length}`,
        `Ressources actives : ${state.resources.filter(r => ['enroute','on-site','confirmed'].includes(r.status)).length}`
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
      else { state.passations.unshift(data); logMEL('INFO', `Passation ${data.fromUser} → ${data.toUser}`); }
      save(); closeModal(); setTab('passation');
    };
    openModal(idEdit ? 'Éditer passation' : 'Nouvelle passation de quart',
      el('div', {},
        twoCol('De (sortant)', fromUser, 'À (relève)', toUser),
        autoFill,
        el('h4', { style: 'margin:14px 0 6px' }, 'Checklist (cocher au fur et à mesure)'),
        itemsBox,
        field('Notes', notes),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Enregistrer'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }
  function signoffPassation(idP) {
    const p = state.passations.find(x => x.id === idP);
    if (!p) return;
    if (p.toUser !== currentUserName()) {
      if (!confirm(`Vous êtes connecté comme "${currentUserName()}". La passation est destinée à "${p.toUser}". Signer quand même ?`)) return;
    }
    p.signoff = true; p.signoffTs = nowISO(); p.signoffBy = currentUserName();
    logMEL('INFO', `Passation signée par ${p.signoffBy}`);
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
  //   Alimente automatiquement le SITREP CMA Ships consolidé
  //   (Dossiers du jour / Échéances 24-72 h / Frictions à signaler).
  // ============================================================
  function renderDoSitrep(root, dept) {
    state.lastDoDept = dept;
    const deptLabel = (window.DEPARTMENTS.find(d => d.code === dept) || {}).label || dept;
    const d = state.deptSitreps[dept] || { status: 'green', dossiers: '', deadlines: '', frictions: '' };

    const status = el('select', {}, ...[['green','VERT'],['amber','AMBRE'],['red','ROUGE']]
      .map(([k, l]) => el('option', { value: k, selected: d.status === k }, l)));
    const doName = el('input', { value: state.dutyOfficers[dept] || currentUserName(), placeholder: 'Nom DO ' + dept });

    // Dossiers du jour : auto depuis l'onglet Dossiers, triés par sévérité.
    const sevOrderDo = { crit: 0, high: 1, med: 2, low: 3 };
    const openDossiers = state.incidents
      .filter(i => i.status !== 'closed' && (i.department || 'XX') === dept)
      .slice()
      .sort((a, b) => (sevOrderDo[a.severity] ?? 9) - (sevOrderDo[b.severity] ?? 9));

    const dossiersPreview = el('div', {},
      openDossiers.length === 0
        ? el('div', { class: 'empty', style: 'padding:14px' }, 'Aucun dossier ouvert pour ' + dept + '. Créer un dossier dans l\'onglet "Dossiers" pour qu\'il apparaisse ici.')
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

    // Échéances 24-72 h : auto depuis Actions du dept
    const now = Date.now();
    const in24 = now + 24 * 3600 * 1000;
    const in72 = now + 72 * 3600 * 1000;
    const dueActions = state.actions
      .filter(a => a.status !== 'done' && (a.department || 'XX') === dept &&
                   a.due && new Date(a.due).getTime() >= in24 && new Date(a.due).getTime() <= in72);
    const deadlinesPreview = el('div', {},
      dueActions.length === 0
        ? el('div', { class: 'empty', style: 'padding:14px' }, 'Aucune échéance dans la fenêtre 24-72 h.')
        : el('div', {}, ...dueActions.map(a => el('div', { class: 'pb-step' },
            badge(a.priority || 'P3', a.priority === 'P1' ? 'red' : 'blue'),
            el('div', { class: 'pb-text', style: 'flex:1' },
              a.text, el('span', { class: 'muted', style: 'font-size:11px' }, ' — ' + (a.owner || '—') + ' (' + fmtDTG(a.due) + ')'))
          )))
    );

    const notesTxt = el('textarea', {
      placeholder: 'Notes additionnelles pour votre bloc SITREP (optionnel)',
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

    root.appendChild(panel('Mon SITREP — ' + dept + ' · ' + deptLabel,
      el('div', {},
        el('p', { class: 'muted' },
          'Vue Duty Officer ' + dept + '. Statut V/A/R et nom DO à renseigner. Les "Dossiers du jour" et "Échéances 24-72 h" sont remontés automatiquement depuis vos onglets Dossiers et Actions. Les frictions sont consolidées par le Duty Manager dans l\'onglet SITREP CMA.'),
        twoCol('Statut département', status, 'Duty Officer (nom)', doName),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' },
          'Dossiers du jour ',
          el('span', { class: 'muted', style: 'font-weight:normal;font-size:11.5px' },
            '· auto depuis l\'onglet "Dossiers" (synthèse une-ligne de chaque dossier ouvert ' + dept + ')')),
        dossiersPreview,
        el('div', { style: 'margin-top:6px' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('incidents') }, '→ Gérer mes dossiers')),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' },
          'Échéances 24-72 h ',
          el('span', { class: 'muted', style: 'font-weight:normal;font-size:11.5px' }, '· auto depuis les Actions ' + dept)),
        deadlinesPreview,
        el('div', { style: 'margin-top:6px' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('actions') }, '→ Gérer mes actions')),

        el('h4', { style: 'margin:14px 0 6px;font-size:13px;color:var(--accent-2)' }, 'Notes additionnelles (optionnel)'),
        notesTxt,

        d.updatedAt
          ? el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:10px' },
              'Dernière validation : ' + fmtDTG(d.updatedAt) + ' · par ' + (d.updatedBy || '—'))
          : el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:10px' }, 'Jamais validé.'),
        el('div', { class: 'flex', style: 'margin-top:10px' },
          el('button', { class: 'btn-primary', onclick: submit }, '✓ Valider mon bloc'),
          el('button', { class: 'btn-ghost', onclick: () => setTab('sitrep') }, '→ SITREP CMA Ships'))
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
    const dm = el('input', { value: state.dutyManager || currentUserName(), placeholder: 'Nom du DM Marseille' });
    const mode = el('select', {}, ...window.MODES.map(m => el('option', { value: m.code, selected: state.alert === m.code }, m.label)));
    const synthesis = el('textarea', { placeholder: 'Synthèse opérationnelle des dernières 24 h — 30 à 40 mots.' });

    const preview = el('pre', { class: 'sitrep-preview' }, '— Cliquez "Générer" pour produire le SITREP CMA Ships —');

    const buildBtn = el('button', { class: 'btn-primary', onclick: () => {
      state.sitrepCounter = (state.sitrepCounter || 0) + 1;
      state.weekNumber = week.value;
      state.dutyManager = dm.value;
      state.alert = mode.value; applyAlertClass(); $('#alertSelect').value = state.alert;
      const text = renderCMASitrep(synthesis.value);
      preview.textContent = text;
      state.sitreps.unshift({ id: id(), ts: nowISO(), num: state.sitrepCounter, text });
      logMEL('INFO', `SITREP CMA Ships N°${state.sitrepCounter} généré (mode ${state.alert})`);
      save();
    } }, '📄 Générer SITREP');
    const printBtn = el('button', { class: 'btn-ghost', onclick: () => window.print() }, '🖨 Imprimer');
    const dlBtn = el('button', { class: 'btn-ghost', onclick: () => download(`SITREP_CMA_${state.sitrepCounter || 'X'}.txt`, preview.textContent) }, '⬇ Télécharger');

    root.appendChild(panel('SITREP CMA Ships — consolidé Duty Manager',
      el('div', {},
        el('p', { class: 'muted' }, 'SITREP du Duty Manager — diffusion VP + Heads à 08h30 Marseille. Les blocs département (statut, dossiers, échéances) sont saisis par les Duty Officers dans leurs onglets "Mon SITREP FM/CR/FU" puis consolidés automatiquement ici.'),
        twoCol('Semaine', week, 'Mode', mode),
        field('Duty Manager Marseille', dm),
        field('Synthèse 24 h (30-40 mots)', synthesis),
        el('div', { class: 'flex', style: 'margin-top:10px' }, buildBtn, printBtn, dlBtn)
      )
    ));

    // ===== Frictions (DM) — gestion inline =====
    const fopen = (state.frictions || []).filter(f => f.status !== 'closed');
    root.appendChild(panel('Frictions actives (synthèse Duty Manager)',
      el('div', {},
        el('p', { class: 'muted' }, 'Frictions inter-départements ou avec l\'extérieur (clients, chantiers, autorités, Groupe). Reprises dans le bloc "FRICTIONS TRANSVERSES" et dans chaque bloc département du SITREP.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, fopen.length + ' friction(s) ouverte(s)'),
          el('button', { class: 'btn-primary btn-sm', onclick: () => frictionForm() }, '+ Nouvelle friction')
        ),
        fopen.length === 0 ? el('div', { class: 'empty' }, 'Aucune friction active.')
          : tableEl(['Périmètre', 'Titre', 'Owner', 'Note', ''],
            fopen.map(f => [
              badge(f.scope, f.scope === 'XX' ? 'orange' : 'blue'),
              el('strong', {}, f.title), f.owner || '—', f.note || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => frictionForm(f.id) }, 'Éditer'),
                el('button', { class: 'btn-success btn-sm', onclick: () => { f.status = 'closed'; save(); setTab('sitrep'); } }, '✓'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.frictions = state.frictions.filter(x => x.id !== f.id); save(); setTab('sitrep'); } } }, '✕'))
            ]))
      )
    ));

    // ===== Points pour Top Management (3 max) =====
    root.appendChild(panel('Points pour Top Management (3 max)',
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
        } }, '+ Ajouter');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') add.click(); });
        return el('div', {},
          el('p', { class: 'muted' }, 'À l\'attention directe du VP avant Group MM — arbitrages, sujets stratégiques, opportunités. Maximum 3.'),
          list,
          el('div', { class: 'flex', style: 'margin-top:8px' }, inp, add));
      })()
    ));

    // ===== Signaux faibles / Look-ahead =====
    root.appendChild(panel('Signaux faibles & look-ahead J+1 / S+1',
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
        const inp = el('input', { placeholder: 'Signal faible ou look-ahead…' });
        const hSel = el('select', {}, el('option', { value: 'J+1' }, 'J+1'), el('option', { value: 'S+1' }, 'S+1'));
        const add = el('button', { class: 'btn-primary btn-sm', onclick: () => {
          if (!inp.value.trim()) return;
          state.weakSignals = state.weakSignals || [];
          state.weakSignals.push({ id: id(), label: inp.value.trim(), horizon: hSel.value, ts: nowISO() });
          save(); setTab('sitrep');
        } }, '+ Ajouter');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') add.click(); });
        return el('div', {},
          el('p', { class: 'muted' }, 'Tendances, indicateurs faibles, événements anticipés J+1 ou S+1.'),
          list,
          el('div', { class: 'form-row cols-3', style: 'margin-top:8px' },
            el('div', {}, inp), el('div', {}, hSel), el('div', {}, add)));
      })()
    ));

    root.appendChild(panel('Aperçu', preview));
    if (state.sitreps.length) {
      root.appendChild(panel('SITREPs précédents',
        tableEl(['N°', 'Émis', ''], state.sitreps.map(s => [
          'N°' + s.num, fmtDTG(s.ts),
          el('div', { class: 'flex' },
            el('button', { class: 'btn-ghost btn-sm', onclick: () => { preview.textContent = s.text; window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Recharger'),
            el('button', { class: 'btn-danger btn-sm', onclick: () => { state.sitreps = state.sitreps.filter(x => x.id !== s.id); save(); setTab('sitrep'); } }, '✕'))
        ]))));
    }
  };

  // Métriques off-hire YTD / semaine / objectif.
  // Cible disponibilité : 99,5% sur 365 j ⇒ tolérance 43,8 h/navire/an.
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
    const fmt = (arr) => arr.length === 0 ? '  ▸ Néant.' : arr.map(s => '  ▸ ' + s).join('\n');
    const offhireM = computeOffhireMetrics();
    const today = new Date();
    const dayStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const statutLbl = { nominal: 'VERT', vigilance: 'AMBRE', crise: 'ROUGE' }[state.alert] || 'VERT';
    const modeLbl = { nominal: 'Nominal', vigilance: 'Vigilance', crise: 'Crise' }[state.alert] || 'Nominal';
    const deptLetter = { green: 'V', amber: 'A', red: 'R' };

    // Dossiers du jour = synthèse une ligne de chaque dossier ouvert du dépt.
    // Préfixée du nom du navire + sévérité + classification. Triée par sévérité.
    const sevOrder = { crit: 0, high: 1, med: 2, low: 3 };
    const sevLabel = { crit: 'CRIT', high: 'HIGH', med: 'MED', low: 'LOW' };
    const clsShort = (code) => {
      const c = window.CLASSIFICATIONS.find(x => x.code === (code || 'INTERNAL'));
      return c ? c.short : 'INT';
    };
    const dossiersFor = (dept) => state.incidents
      .filter(i => i.status !== 'closed' && (i.department || 'XX') === dept)
      .slice()
      .sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))
      .map(i => {
        const v = (i.vessel || 'n/a').toUpperCase();
        const raw = (i.sitrepLine || `${i.type}${i.summary ? ' : ' + i.summary.replace(/\n/g, ' ').slice(0, 120) : ''}`).trim();
        const line = raw.toUpperCase().startsWith(v) ? raw : `${v} — ${raw}`;
        return `[${sevLabel[i.severity] || '—'} · ${clsShort(i.classification)}] ${line}`;
      });

    // Échéances 24-72h = actions du dept dont due dans 24-72h
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
      return v.split('\n').map(s => s.trim() ? '  ▸ ' + s : '').filter(Boolean).join('\n') || '  ▸ Néant.';
    };
    // Statut par dept : priorité au statut renseigné dans deptSitreps (DO), sinon deptStatus historique.
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
        ? '  — Aucun point remonté au VP —'
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
    const status = el('select', {}, el('option', { value: 'open', selected: f.status !== 'closed' }, 'Ouverte'), el('option', { value: 'closed', selected: f.status === 'closed' }, 'Clôturée'));
    const submit = () => {
      const data = { id: f.id || id(), scope: scope.value, title: title.value,
        owner: owner.value, note: note.value, status: status.value, ts: f.ts || nowISO() };
      if (idEdit) state.frictions[state.frictions.findIndex(x => x.id === idEdit)] = data;
      else { state.frictions.push(data); logMEL('INFO', `Friction [${data.scope}] : ${data.title}`); }
      save(); closeModal(); setTab('sitrep');
    };
    openModal(idEdit ? 'Éditer friction' : 'Nouvelle friction',
      el('div', {},
        twoCol('Périmètre', scope, 'Owner', owner),
        field('Titre', title),
        field('Note / détails', note),
        field('Statut', status),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   PLAYBOOKS TECHNIQUES & CREWING
  // ============================================================
  renderers.playbooks = (root) => {
    root.appendChild(panel('Playbooks techniques & équipages',
      el('div', {},
        el('p', { class: 'muted' }, 'Avarie M/E, A/E, propulsion, drydock, retrofit, PSC, bunker, manning, certification, vetting. Hors périmètre SSE (couvert par l\'outil sécurité/sûreté/environnement).'),
        el('div', { class: 'cards' }, ...window.PLAYBOOKS.map(pb => el('div', { class: 'card' },
          el('div', { class: 'flex-between' },
            el('div', { class: 'card-title' }, pb.title),
            badge(pb.severity, pb.severity === 'crit' ? 'red' : pb.severity === 'high' ? 'orange' : 'blue')),
          el('div', { class: 'card-meta' }, 'Réf : ' + pb.refs.join(' · ')),
          el('div', { class: 'card-actions' },
            el('button', { class: 'btn-primary btn-sm', onclick: () => openPlaybook(pb) }, 'Ouvrir'),
            el('button', { class: 'btn-ghost btn-sm', onclick: () => activatePlaybook(pb) }, 'Activer (créer actions)')))))
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
        el('div', { class: 'card-meta', style: 'margin-bottom:10px' }, 'Réf : ' + pb.refs.join(' · ')),
        stepsBox,
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: () => activatePlaybook(pb) }, '→ Activer (créer actions)'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Fermer'))));
  }
  function activatePlaybook(pb) {
    pb.steps.forEach(step => state.actions.push({
      id: id(), text: `[${pb.title}] ${step}`, owner: '',
      priority: pb.severity === 'crit' ? 'P1' : pb.severity === 'high' ? 'P2' : 'P3',
      status: 'todo', due: '', createdAt: nowISO()
    }));
    logMEL('ACTION', `Playbook "${pb.title}" activé : ${pb.steps.length} actions créées`);
    save(); closeModal(); setTab('actions');
  }

  // ============================================================
  //   RETEX / AAR
  // ============================================================
  renderers.retex = (root) => {
    root.appendChild(panel('RETEX — After-Action Review',
      el('div', {},
        el('p', { class: 'muted' }, 'Méthode AAR US Army (4 questions). Capitalisation : Lessons Identified → Lessons Learned. Indispensable post-exercice et post-crise.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.retex.length} retour(s) d\'expérience`),
          el('button', { class: 'btn-primary', onclick: () => retexForm() }, '+ Nouveau RETEX')
        ),
        state.retex.length === 0 ? el('div', { class: 'empty' }, 'Aucun.')
          : el('div', { class: 'cards' }, ...state.retex.map(r => el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, r.title),
                el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(r.ts))),
              el('div', { class: 'card-meta' }, 'Animateur : ' + (r.facilitator || '—')),
              el('div', { class: 'card-body' },
                el('div', {}, el('strong', {}, '1. Que devait-il se passer ? '), r.expected || '—'),
                el('div', {}, el('strong', {}, '2. Que s\'est-il passé ? '), r.actual || '—'),
                el('div', {}, el('strong', {}, '3. Pourquoi cette différence ? '), r.gap || '—'),
                el('div', {}, el('strong', {}, '4. Que devons-nous améliorer / pérenniser ? '), r.improve || '—'),
                r.lessons && r.lessons.length ? el('div', { style: 'margin-top:8px' },
                  el('strong', {}, 'Lessons Identified : '),
                  el('ul', { style: 'margin:4px 0' },
                    ...r.lessons.map(l => el('li', {}, l)))) : null),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => retexForm(r.id) }, 'Éditer'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => convertRetexToActions(r) }, '→ Créer actions LL'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.retex = state.retex.filter(x => x.id !== r.id); save(); setTab('retex'); } } }, '✕')))))
      )
    ));
  };
  function retexForm(idEdit) {
    const r = idEdit ? state.retex.find(x => x.id === idEdit) : { lessons: [] };
    const title = el('input', { value: r.title || '' });
    const facilitator = el('input', { value: r.facilitator || currentUserName() });
    const expected = el('textarea', { placeholder: 'Plan, intention, end-state attendu' }, r.expected || '');
    const actual = el('textarea', { placeholder: 'Faits, chronologie réelle, résultats' }, r.actual || '');
    const gap = el('textarea', { placeholder: 'Causes racines, frictions, surprises' }, r.gap || '');
    const improve = el('textarea', { placeholder: 'Améliorations / pratiques à pérenniser' }, r.improve || '');
    const lessonsTxt = el('textarea', { placeholder: 'Une leçon par ligne' }, (r.lessons || []).join('\n'));
    const submit = () => {
      const data = { id: r.id || id(), title: title.value, facilitator: facilitator.value,
        expected: expected.value, actual: actual.value, gap: gap.value, improve: improve.value,
        lessons: lessonsTxt.value.split('\n').map(x => x.trim()).filter(Boolean),
        ts: r.ts || nowISO() };
      if (idEdit) state.retex[state.retex.findIndex(x => x.id === idEdit)] = data;
      else { state.retex.unshift(data); logMEL('INFO', `RETEX ouvert : ${data.title}`); }
      save(); closeModal(); setTab('retex');
    };
    openModal(idEdit ? 'Éditer RETEX' : 'Nouveau RETEX (AAR)',
      el('div', {},
        twoCol('Titre', title, 'Animateur', facilitator),
        field('1. Que devait-il se passer ?', expected),
        field('2. Que s\'est-il passé ?', actual),
        field('3. Pourquoi cette différence ?', gap),
        field('4. Que devons-nous améliorer ou pérenniser ?', improve),
        field('Lessons Identified (une par ligne)', lessonsTxt),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }
  function convertRetexToActions(r) {
    if (!r.lessons || !r.lessons.length) { toast('Aucune leçon à convertir.', 'warn'); return; }
    if (!confirm(`Créer ${r.lessons.length} actions à partir des Lessons Identified ?`)) return;
    r.lessons.forEach(l => state.actions.push({
      id: id(), text: `[LL] ${l}`, owner: '', priority: 'P3',
      status: 'todo', due: '', createdAt: nowISO()
    }));
    logMEL('ACTION', `${r.lessons.length} actions créées depuis RETEX "${r.title}"`);
    save(); setTab('actions');
  }

  // ============================================================
  //   EXERCICES (MSEL)
  // ============================================================
  renderers.exercises = (root) => {
    root.appendChild(panel('Exercices de crise — table-top et full-scale',
      el('div', {},
        el('p', { class: 'muted' }, 'L\'ASN impose un exercice annuel pour les sites nucléaires ; pratique recommandée pour la cellule maritime. MSEL = Master Scenario Events List : trame d\'injection chronologique pour entraîner la cellule.'),
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.exercises.length} exercice(s)`),
          el('button', { class: 'btn-primary', onclick: () => exerciseForm() }, '+ Exercice')
        ),
        state.exercises.length === 0 ? el('div', { class: 'empty' }, 'Aucun exercice.')
          : el('div', { class: 'cards' }, ...state.exercises.map(x => el('div', { class: 'card' },
              el('div', { class: 'flex-between' },
                el('div', { class: 'card-title' }, x.title),
                badge(x.status, x.status === 'planned' ? 'blue' : x.status === 'running' ? 'orange' : 'green')),
              el('div', { class: 'card-meta' }, `${x.type} · prévu ${fmtDTG(x.date)} · ${x.msel ? x.msel.length : 0} injection(s)`),
              el('div', { class: 'card-body' }, x.scenario || '—'),
              el('div', { class: 'card-actions' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => exerciseForm(x.id) }, 'Éditer'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => exerciseRun(x) }, '▶ Lancer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => { if (confirm('Supprimer ?')) { state.exercises = state.exercises.filter(e => e.id !== x.id); save(); setTab('exercises'); } } }, '✕')))))
      )
    ));
  };
  function exerciseForm(idEdit) {
    const x = idEdit ? state.exercises.find(e => e.id === idEdit) : { type: 'Table-top', status: 'planned', msel: [] };
    const title = el('input', { value: x.title || '' });
    const type = el('select', {}, ...['Table-top','Functional','Full-scale'].map(t => el('option', { value: t, selected: x.type === t }, t)));
    const status = el('select', {}, ...[['planned','Planifié'],['running','En cours'],['done','Clôturé']]
      .map(([k, l]) => el('option', { value: k, selected: x.status === k }, l)));
    const date = el('input', { type: 'datetime-local', value: x.date ? new Date(x.date).toISOString().slice(0, 16) : '' });
    const scenario = el('textarea', { placeholder: 'Scénario d\'exercice : situation initiale, navires impliqués, contexte' }, x.scenario || '');
    const mselTxt = el('textarea', { placeholder: 'Une injection par ligne, format : T+MM | événement | cible cellule' },
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
    openModal(idEdit ? 'Éditer exercice' : 'Nouvel exercice',
      el('div', {},
        twoCol('Titre', title, 'Type', type),
        twoCol('Statut', status, 'Date', date),
        field('Scénario', scenario),
        field('MSEL — Master Scenario Events List', mselTxt),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }
  function exerciseRun(x) {
    const msel = (x.msel || []).slice().sort((a, b) => a.time.localeCompare(b.time));
    if (!msel.length) { toast('MSEL vide.', 'warn'); return; }
    const lines = msel.map(m => `[${m.time}] → ${m.target} : ${m.event}`).join('\n');
    alert(`Exercice "${x.title}" — trame d\'injection :\n\n${lines}\n\n(Le pilotage temps réel se fait par l\'animateur — ne crée pas d\'actions automatiques.)`);
    x.status = 'running';
    logMEL('INFO', `Exercice lancé : ${x.title}`);
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

    root.appendChild(panel('Analyse — requêtes croisées sur les dossiers',
      el('div', {},
        el('p', { class: 'muted' },
          'Filtrez les dossiers (ouverts + clos) selon les axes disponibles. Tous les filtres se combinent. Recherche libre dans la synthèse et la description.'),
        el('h4', { style: 'margin:8px 0 4px;color:var(--accent-2)' }, 'Période'),
        el('div', { class: 'form-row cols-3' },
          el('div', {}, el('label', {}, 'Du'), filterDate('from')),
          el('div', {}, el('label', {}, 'Au'), filterDate('to')),
          el('div', {}, el('label', {}, 'Recherche libre'), filterInput('text', 'mot dans synthèse/description'))),

        el('h4', { style: 'margin:14px 0 4px;color:var(--accent-2)' }, 'Axes navire'),
        el('div', { class: 'form-row cols-4' },
          el('div', {}, el('label', {}, 'Navire'), filterInput('vessel', 'nom partiel ou IMO')),
          el('div', {}, el('label', {}, 'Flotte'), filterSelect('fleet', allFleets, 'Toutes')),
          el('div', {}, el('label', {}, 'Ship Manager'), filterSelect('shipManager', allManagers, 'Tous')),
          el('div', {}, el('label', {}, 'Fuel type'), filterSelect('fuelType', allFuels, 'Tous'))),

        el('h4', { style: 'margin:14px 0 4px;color:var(--accent-2)' }, 'Axes dossier'),
        el('div', { class: 'form-row cols-4' },
          el('div', {}, el('label', {}, 'Département'), filterSelect('dept', allDepts, 'Tous')),
          el('div', {}, el('label', {}, 'Type'), filterSelect('type', allTypes, 'Tous')),
          el('div', {}, el('label', {}, 'Sévérité'), filterSelect('severity', allSev, 'Toutes')),
          el('div', {}, el('label', {}, 'Statut'), filterSelect('status', allStatus, 'Tous'))),
        el('div', { class: 'form-row cols-2' },
          el('div', {}, el('label', {}, 'Classification'), filterSelect('classification', allCls, 'Toutes')),
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
      // Période
      const ts = i.startedAt ? new Date(i.startedAt).getTime() : 0;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      // Navire (nom partiel ou IMO)
      if (vQuery) {
        const nm = (i.vessel || '').toLowerCase();
        const imo = v ? (v.imo || '') : '';
        if (!nm.includes(vQuery) && !imo.includes(vQuery)) return false;
      }
      // Axes navire (nécessitent que le navire soit dans le registre)
      if (analyseFilters.fleet) {
        if (!v || v.fleet !== analyseFilters.fleet) return false;
      }
      if (analyseFilters.shipManager) {
        if (!v || v.shipManager !== analyseFilters.shipManager) return false;
      }
      if (analyseFilters.fuelType) {
        if (!v || (v.fuelType || v.fuelMode) !== analyseFilters.fuelType) return false;
      }
      // Axes dossier
      if (analyseFilters.dept && (i.department || 'XX') !== analyseFilters.dept) return false;
      if (analyseFilters.type && i.type !== analyseFilters.type) return false;
      if (analyseFilters.severity && i.severity !== analyseFilters.severity) return false;
      if (analyseFilters.classification && (i.classification || 'INTERNAL') !== analyseFilters.classification) return false;
      if (analyseFilters.status && i.status !== analyseFilters.status) return false;
      // Recherche libre
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

    root.appendChild(panel('Résultats — ' + matches.length + ' dossier(s)',
      el('div', {},
        el('div', { class: 'grid-4' },
          kpiTile('Dossiers', matches.length, matches.length ? 'warn' : 'ok'),
          kpiTile('Off-hire estimé (ouverts)', totalOpenOff + ' h', totalOpenOff ? 'warn' : 'ok'),
          kpiTile('Off-hire réel (clos)', totalClosedOff + ' h', 'muted'),
          kpiTile('Off-hire total', (totalOpenOff + totalClosedOff) + ' h', 'muted')
        ),

        el('div', { class: 'flex', style: 'margin:12px 0' },
          el('button', { class: 'btn-ghost btn-sm', onclick: () => exportAnalyseCSV(matches, vesselByName) }, '⬇ Export CSV')
        ),

        matches.length === 0
          ? el('div', { class: 'empty' }, 'Aucun dossier ne correspond aux filtres.')
          : tableEl(
            ['Réf', 'Navire', 'Flotte', 'Ship Mgr', 'Fuel', 'Dépt', 'Type', 'Sév.', 'Class.', 'Démarré', 'Off-hire (h)', 'Statut'],
            matches.slice(0, 300).map(i => {
              const v = vesselByName[i.vessel] || {};
              const cls = window.CLASSIFICATIONS.find(c => c.code === (i.classification || 'INTERNAL')) || window.CLASSIFICATIONS[2];
              const off = i.status === 'closed'
                ? (i.offhireActual != null ? i.offhireActual + ' h' : '⚠')
                : ((i.offhireEstimated || 0) + ' h est.');
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
              '⚠ Affichage limité aux 300 premiers. Affinez les filtres ou exportez en CSV.')
          : null
      )
    ));

    // ===== Synthèses par axe =====
    if (matches.length > 0) {
      const summary = (title, items, unit) => panel(title,
        items.length === 0 ? el('div', { class: 'empty' }, 'Néant.')
          : el('div', { class: 'flex', style: 'flex-wrap:wrap;gap:6px' },
              ...items.slice(0, 15).map(([k, n]) => badge(k + ' · ' + n + (unit || ''), 'blue'))));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Dossiers par flotte', byKey(fleetOf)),
        summary('Dossiers par ship manager', byKey(mgrOf))
      ));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Dossiers par fuel', byKey(fuelOf)),
        summary('Dossiers par type', byKey(i => i.type))
      ));
      root.appendChild(el('div', { class: 'grid-2' },
        summary('Top off-hire par navire (h)', offhireByKey(vesselOf), ' h'),
        summary('Top off-hire par flotte (h)', offhireByKey(fleetOf), ' h')
      ));
    }
  };

  function exportAnalyseCSV(matches, vesselByName) {
    if (matches.length === 0) { toast('Rien à exporter.', 'warn'); return; }
    const headers = ['Ref','Navire','IMO','Flotte','ShipManager','FuelType','Departement','Type',
      'Severite','Classification','Statut','DemarrageISO','ClotureISO','OffhireEstime_h','OffhireReel_h','SitrepLine'];
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
    toast('Export CSV (' + matches.length + ' dossiers)', 'ok');
  }

  renderers.veille = (root) => {
    const mode = (window.MODES.find(m => m.code === state.alert) || window.MODES[0]);
    const recentTriggers = (state.triggerEvents || []).slice(0, 5);

    root.appendChild(panel('Synthèse Duty Manager — Mode opérationnel',
      el('div', {},
        el('div', { class: 'flex', style: 'gap:12px;align-items:center;flex-wrap:wrap' },
          el('div', {},
            el('div', { class: 'kpi-label' }, 'Mode'),
            el('div', { style: 'font-size:22px;font-weight:700;color:var(--accent-2)' }, mode.label)),
          el('div', {},
            el('div', { class: 'kpi-label' }, 'Statut global'),
            el('div', { style: 'font-size:22px;font-weight:700' }, mode.statut)),
          el('div', { style: 'flex:1' }),
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('triggers') }, '→ Critères'),
          el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('notif') }, '→ Modèles d\'alerte')
        ),
        el('div', { class: 'muted', style: 'margin-top:8px' }, mode.desc),
        el('div', { class: 'muted', style: 'margin-top:6px;font-size:11.5px' },
          'Onglet du Duty Manager : synthèse temps réel pour bascule du mode, escalade et appel des modèles d\'alerte.')
      )
    ));

    const escBox = el('div', { class: 'flex', style: 'gap:8px;flex-wrap:wrap' });
    if (state.alert !== 'nominal') escBox.appendChild(
      el('button', { class: 'btn-success', onclick: () => escalateTo('nominal') }, '↓ Retour Nominal'));
    if (state.alert !== 'vigilance') escBox.appendChild(
      el('button', { class: 'btn-warn', onclick: () => escalateTo('vigilance') }, '↑ Vigilance (AMBRE)'));
    if (state.alert !== 'crise') escBox.appendChild(
      el('button', { class: 'btn-danger', onclick: () => escalateTo('crise') }, '⚡ Activer Crise (ROUGE)'));
    root.appendChild(panel('Bascule de mode', escBox));

    // Quart en cours
    const w = state.watch || {};
    const officer = el('input', { value: w.officer || '', placeholder: 'DPA-Watch (officier de quart)', list: 'dl-authors' });
    const assistant = el('input', { value: w.assistant || '', placeholder: 'Watch Assistant', list: 'dl-authors' });
    const startBtn = el('button', { class: 'btn-primary', onclick: () => {
      state.watch = { officer: officer.value, assistant: assistant.value, startedAt: nowISO() };
      logMEL('INFO', `Prise de quart : ${officer.value} (assistant ${assistant.value || '-'})`);
      save(); setTab('veille');
    } }, '⏱ Prendre le quart');
    const handoverBtn = el('button', { class: 'btn-ghost', onclick: () => setTab('passation') }, '→ Passation formelle');
    root.appendChild(panel('Quart en cours',
      el('div', {},
        twoCol('Officier de quart', officer, 'Assistant', assistant),
        el('div', { class: 'muted', style: 'font-size:12px' },
          w.startedAt ? `En quart depuis ${fmtDTG(w.startedAt)}` : 'Aucun quart actif.'),
        el('div', { class: 'flex', style: 'margin-top:10px' }, startBtn, handoverBtn)
      )
    ));

    // Dernier SITREP émis — vision partagée la plus récente
    const lastSitrep = (state.sitreps || [])[0];
    root.appendChild(panel(
      lastSitrep ? `Dernier SITREP — N°${lastSitrep.num} · ${fmtDTG(lastSitrep.ts)}` : 'Dernier SITREP',
      el('div', {},
        el('p', { class: 'muted' }, 'Référence pour le Duty Manager : dernière vision partagée diffusée à VP + Heads. Pour produire un nouveau SITREP, ouvrir l\'onglet "SITREP CMA".'),
        lastSitrep
          ? el('div', {},
              el('pre', { class: 'sitrep-preview', style: 'max-height:360px' }, lastSitrep.text),
              el('div', { class: 'flex', style: 'margin-top:10px' },
                el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('sitrep') }, '→ SITREP CMA Ships'),
                el('button', { class: 'btn-ghost btn-sm', onclick: () => download(`SITREP_CMA_${lastSitrep.num}.txt`, lastSitrep.text) }, '⬇ Télécharger')))
          : el('div', {},
              el('div', { class: 'empty' }, 'Aucun SITREP n\'a encore été émis.'),
              el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('sitrep') }, '→ Générer le premier SITREP'))
      )
    ));

    root.appendChild(panel('Déclenchements récents',
      recentTriggers.length === 0
        ? el('div', { class: 'empty' }, 'Aucun trigger déclaré sur les dernières 24 h. Tout est calme.')
        : tableEl(['DTG', 'Catégorie', 'Trigger', 'Mode →', 'Par'],
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
        ? el('div', { class: 'empty' }, 'Vide.')
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
    logMEL('SECURITY', `Bascule mode → ${target.label} (statut ${target.statut})`);
    save();
    if (targetMode !== 'nominal') {
      if (confirm('Ouvrir le modèle de notification correspondant ?')) {
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

    root.appendChild(panel('Critères de déclenchement',
      el('div', {},
        el('p', { class: 'muted' }, 'Groupés par département (Duty Officer concerné) puis par axe (Technique, Régulation, Équipage, Commercial, Soutage, Chantier, Livraison, Logistique, Certification). "Déclarer" ouvre une fenêtre pré-remplie avec un exemple guide, applique le mode cible (sans rétrogradation) et crée un dossier.'),
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
              tableEl(['Critère', 'Description', 'Mode →', ''],
                dTriggers.filter(t => t.axe === axe).map(t => [
                  el('strong', {}, t.label),
                  el('span', { class: 'muted' }, t.desc),
                  badge((t.mode || 'nominal').toUpperCase(), modeColor(t.mode)),
                  el('button', { class: 'btn-primary btn-sm', onclick: () => declareTrigger(t) }, 'Déclarer')
                ])))));
        })
      )
    ));

    if (state.triggerEvents && state.triggerEvents.length) {
      root.appendChild(panel('Historique des déclenchements',
        tableEl(['DTG', 'Dépt · Axe', 'Trigger', 'Mode', 'Navire', 'Par'],
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
    const vesselSel = el('input', { list: 'dl-vessels', placeholder: 'Navire concerné' });
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

      // Mode : escalade seulement (jamais de rétrogradation auto)
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
        type: trg.incidentType || 'Autre',
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
      logMEL('DOSSIER', `Trigger déclaré : ${trg.label} → mode ${state.alert.toUpperCase()}, dossier ${incRef}`);
      save(); closeModal();

      // Proposer les modèles d'alerte associés au trigger
      const suggested = (trg.suggestedNotifs || []).map(nid =>
        (window.NOTIF_TEMPLATES || []).find(n => n.id === nid)).filter(Boolean);
      if (suggested.length) {
        openModal('Modèles d\'alerte recommandés',
          el('div', {},
            el('p', { class: 'muted' }, 'Templates suggérés pour ce trigger. Cliquer pour remplir et copier.'),
            el('div', { class: 'cards' },
              ...suggested.map(tpl => el('div', { class: 'card' },
                el('div', { class: 'flex-between' },
                  el('div', { class: 'card-title' }, tpl.label),
                  badge(tpl.channel, 'blue')),
                el('div', { class: 'card-meta' }, 'Pour : ' + tpl.audience),
                el('div', { class: 'card-actions' },
                  el('button', { class: 'btn-primary btn-sm', onclick: () => fillNotif(tpl) }, 'Renseigner & copier'))))),
            el('div', { class: 'flex', style: 'margin-top:10px' },
              el('button', { class: 'btn-ghost', onclick: closeModal }, 'Plus tard'))));
      } else {
        setTab('veille');
      }
    };

    const modeColor = trg.mode === 'crise' ? 'red' : trg.mode === 'vigilance' ? 'orange' : 'green';
    openModal('Déclarer : ' + trg.label,
      el('div', {},
        el('div', { class: 'auth-warn' },
          el('div', {}, '⚡ ', el('strong', {}, trg.dept || 'XX'), ' · ', trg.axe || '', ' · ',
            badge((trg.mode || 'nominal').toUpperCase(), modeColor)),
          el('div', { style: 'font-size:11.5px;margin-top:4px' },
            'Mode opérationnel passera en ', el('strong', {}, (trg.mode || 'vigilance').toUpperCase()),
            ' (si supérieur au courant). Dossier auto-créé. Modèles d\'alerte recommandés proposés ensuite.')),
        twoCol('Navire concerné', vesselSel, 'Département', deptSel),
        field('Note (l\'exemple ci-dessous est un guide — adaptez-le aux faits)', note),
        field('Une ligne pour le SITREP du DO (auto-aggregée)', sitrepLine),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-danger', onclick: submit }, '⚡ Confirmer le déclenchement'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   NOTIF — modèles d'alerte
  // ============================================================
  renderers.notif = (root) => {
    root.appendChild(panel('Modèles d\'alerte (single voice)',
      el('div', {},
        el('p', { class: 'muted' }, 'Messages pré-formatés à diffuser. Variables auto : {VESSEL} {EVENT} {DTG} {AUTHOR} {LEVEL} {MODE} {DEPT}. Toujours faire valider par VP/DM avant diffusion externe.'),
        el('div', { class: 'cards' },
          ...window.NOTIF_TEMPLATES.map(tpl => el('div', { class: 'card' },
            el('div', { class: 'flex-between' },
              el('div', { class: 'card-title' }, tpl.label),
              el('div', {}, badge(tpl.channel, 'blue'))),
            el('div', { class: 'card-meta' }, 'Pour : ' + tpl.audience),
            el('div', { class: 'card-actions' },
              el('button', { class: 'btn-primary btn-sm', onclick: () => fillNotif(tpl) }, 'Renseigner & copier')))))
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
        toast('Copié dans le presse-papier', 'ok');
        logMEL('COMMS', `Modèle "${tpl.label}" copié pour diffusion (${tpl.channel}, ${tpl.audience})`);
        save();
      } catch (e) {
        out.select();
        toast('Sélectionné — Ctrl+C pour copier', 'warn');
      }
    } }, '📋 Copier');

    openModal(tpl.label,
      el('div', {},
        el('div', { class: 'card-meta', style: 'margin-bottom:8px' }, 'Canal : ' + tpl.channel + ' · Audience : ' + tpl.audience),
        twoCol('Navire', vessel, 'Événement', event),
        field('Message', out),
        el('div', { class: 'flex', style: 'margin-top:12px' },
          copyBtn,
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Fermer'))
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
      toast('Export chiffré généré', 'ok');
      return;
    }
    download(`crisiscell_clear_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
    toast('⚠ Export en clair — protégez le fichier', 'warn');
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.schema === 'crisiscell.encrypted.v2') {
          if (!confirm('Importer une archive chiffrée ? Le coffre courant sera remplacé. Vous devrez ensuite vous reconnecter avec le mot de passe d\'origine.')) return;
          CrisisAuth.importEncryptedBlob(JSON.stringify(data));
          alert('Archive importée. Reconnectez-vous.');
          location.reload();
        } else {
          if (!confirm('Importer cet état (en clair) dans le coffre courant ?')) return;
          state = Object.assign(defaultState(), data);
          migrateState();
          await CrisisAuth.saveState(state);
          applyAlertClass();
          $('#alertSelect').value = state.alert;
          setTab(currentTab);
          toast('Import réussi', 'ok');
        }
      } catch (e) { toast('Erreur import : ' + e.message, 'danger'); }
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
        errBox.appendChild(el('div', { class: 'auth-error' }, 'Les nouveaux mots de passe ne correspondent pas.')); return;
      }
      try {
        await CrisisAuth.changePassword(oldPwd.value, new1.value);
        closeModal(); toast('Mot de passe modifié.', 'ok');
        logMEL('SECURITY', 'Mot de passe coffre modifié');
        save();
      } catch (e) {
        errBox.appendChild(el('div', { class: 'auth-error' }, e.message));
      }
    };
    openModal('Changer le mot de passe',
      el('div', {},
        errBox,
        field('Mot de passe actuel', oldPwd),
        field('Nouveau mot de passe', new1),
        field('Confirmer', new2),
        el('div', { class: 'flex', style: 'margin-top:14px' },
          el('button', { class: 'btn-primary', onclick: submit }, 'Valider'),
          el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler'))
      ), { onSubmit: submit });
  }

  // ============================================================
  //   GO
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', () => { saveSync(); });
})();
