/* CrisisCell — application principale
 * Inspiré des frameworks ICS, OODA, NATO SITREP et procédures maritimes IMO/ISM.
 * Aucune dépendance externe. Persistance localStorage.
 */
(function () {
  'use strict';

  // ----------------------------- ÉTAT -------------------------------------
  const STORAGE_KEY = 'crisiscell.cma.v1';
  const defaultState = () => ({
    alert: 'green',
    opsPeriod: '',
    sitrepCounter: 0,
    incidents: [],
    vessels: [
      // Quelques navires d'exemple pour illustrer
      { id: id(), name: 'CMA CGM JACQUES SAADE', imo: '9839179', type: 'ULCV', status: 'normal', position: '', notes: '' },
      { id: id(), name: 'CMA CGM MARCO POLO', imo: '9454436', type: 'ULCV', status: 'normal', position: '', notes: '' },
      { id: id(), name: 'CMA CGM PALAIS ROYAL', imo: '9839181', type: 'ULCV', status: 'normal', position: '', notes: '' }
    ],
    mel: [],
    team: [],
    actions: [],
    decisions: [],
    comms: [],
    stakeholders: [
      { id: id(), name: 'MRCC Gris-Nez',      role: 'Coord. SAR',          contact: '+33 3 21 87 21 87', priority: 'P1' },
      { id: id(), name: 'UKMTO Dubai',        role: 'Sûreté Océan Indien', contact: '+971 4 306 5180',   priority: 'P1' },
      { id: id(), name: 'MDAT-GoG',           role: 'Sûreté Golfe Guinée', contact: '+33 2 98 22 88 88', priority: 'P1' },
      { id: id(), name: 'P&I Club',           role: 'Assurance',           contact: '24/7 hotline',      priority: 'P1' },
      { id: id(), name: 'État du pavillon',   role: 'Autorité',            contact: 'à compléter',       priority: 'P1' }
    ],
    risks: [],
    rhythm: [
      { id: id(), time: '08:00', title: 'Stand-up cellule', cadence: 'Quotidien', desc: 'Synthèse, COP, décisions du jour' },
      { id: id(), time: '12:00', title: 'SITREP N°x',       cadence: '6H',        desc: 'Diffusion SITREP HQ + autorités' },
      { id: id(), time: '18:00', title: 'Battle update',    cadence: 'Quotidien', desc: 'Bascule équipe nuit, transmissions' }
    ],
    sitreps: [],
    playbookState: {},
    ccir: window.CCIR_TEMPLATE.map(c => ({ ...c, id: id(), items: [] }))
  });

  let state = load();

  function id() { return Math.random().toString(36).slice(2, 10); }
  function nowISO() { return new Date().toISOString(); }
  function fmtDTG(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    // DTG format militaire : DDHHMMZ MMM YY
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mo = months[d.getUTCMonth()];
    const yy = String(d.getUTCFullYear()).slice(2);
    return `${dd}${hh}${mm}Z ${mo} ${yy}`;
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').slice(0, 16) + 'Z';
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      const def = defaultState();
      // merge to handle new fields between versions
      return Object.assign(def, s);
    } catch { return defaultState(); }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { console.error(e); }
  }
  function logMEL(category, text, author) {
    state.mel.unshift({
      id: id(),
      ts: nowISO(),
      cat: category,
      author: author || 'Système',
      text
    });
    save();
  }
  function escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (v === false || v == null) {}
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  // ----------------------------- TOP BAR ----------------------------------
  function applyAlertClass() {
    document.body.classList.remove('alert-green','alert-yellow','alert-orange','alert-red','alert-black');
    document.body.classList.add('alert-' + state.alert);
  }
  function tickClocks() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('utcClock').textContent =
      `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    document.getElementById('localClock').textContent =
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  // ----------------------------- MODAL ------------------------------------
  function openModal(title, contentNode) {
    document.getElementById('modalTitle').textContent = title;
    const body = document.getElementById('modalBody');
    body.innerHTML = '';
    body.appendChild(contentNode);
    document.getElementById('modal').classList.remove('hidden');
  }
  function closeModal() { document.getElementById('modal').classList.add('hidden'); }

  // ----------------------------- ROUTING ----------------------------------
  let currentTab = 'cop';
  const renderers = {};
  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    const main = document.getElementById('main');
    main.innerHTML = '';
    const fn = renderers[tab];
    if (fn) fn(main);
  }

  // ============================================================
  //  TAB : COP — Common Operational Picture
  // ============================================================
  renderers.cop = (root) => {
    const activeIncidents = state.incidents.filter(i => i.status !== 'closed');
    const vesselsAtRisk = state.vessels.filter(v => v.status === 'incident' || v.status === 'risk');
    const overdue = state.actions.filter(a => a.status !== 'done' && a.due && new Date(a.due) < new Date()).length;
    const openActions = state.actions.filter(a => a.status !== 'done').length;

    const kpis = el('div', { class: 'grid-4' },
      kpiTile('Niveau d\'alerte', state.alert.toUpperCase(),
        state.alert === 'red' || state.alert === 'black' ? 'danger' :
        state.alert === 'orange' ? 'warn' :
        state.alert === 'yellow' ? 'warn' : 'ok'),
      kpiTile('Incidents actifs', activeIncidents.length, activeIncidents.length ? 'danger' : 'ok'),
      kpiTile('Navires impactés', vesselsAtRisk.length, vesselsAtRisk.length ? 'warn' : 'ok'),
      kpiTile('Actions en retard', overdue, overdue ? 'danger' : (openActions ? 'warn' : 'ok'), `${openActions} actions ouvertes`)
    );

    const ooda = el('div', { class: 'panel' },
      el('div', { class: 'panel-header' }, el('h2', {}, 'Boucle OODA — Boyd')),
      el('div', { class: 'panel-body' },
        el('div', { class: 'ooda' },
          oodaStep('1', 'Observe', 'Collecter données : navire, météo, autorités, COP'),
          oodaStep('2', 'Orient', 'Analyser : METT-TC maritime, contexte, impacts'),
          oodaStep('3', 'Decide', 'Choisir option, valider par Crisis Manager'),
          oodaStep('4', 'Act', 'Exécuter, mesurer, reboucler')
        )
      )
    );

    const incidentsPanel = panel('Incidents actifs',
      activeIncidents.length === 0
        ? el('div', { class: 'empty' }, 'Aucun incident actif. Niveau de veille normale.')
        : tableEl(['Réf', 'Type', 'Navire', 'Sévérité', 'Démarré', 'Statut'],
          activeIncidents.map(i => [
            el('span', { class: 'mono' }, i.ref || ''),
            i.type || '',
            i.vessel || '',
            badge(i.severity, severityColor(i.severity)),
            fmtTime(i.startedAt),
            badge(i.status, i.status === 'open' ? 'red' : 'orange')
          ])),
      el('button', { class: 'btn-primary btn-sm', onclick: () => setTab('incidents') }, 'Gérer →')
    );

    const vesselPanel = panel('Navires impactés',
      vesselsAtRisk.length === 0
        ? el('div', { class: 'empty' }, 'Aucun navire impacté.')
        : tableEl(['Navire', 'IMO', 'Statut', 'Position'],
          vesselsAtRisk.map(v => [
            v.name, v.imo, vesselStatusBadge(v.status), v.position || '—'
          ])),
      el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('vessels') }, 'Voir flotte →')
    );

    const recentMEL = panel('Main Events Log — derniers événements',
      state.mel.length === 0
        ? el('div', { class: 'empty' }, 'Journal vide. Saisissez le premier événement.')
        : el('div', {},
            ...state.mel.slice(0, 10).map(e => el('div', { class: 'mel-entry' },
              el('span', { class: 'mel-time' }, fmtDTG(e.ts)),
              el('span', { class: 'mel-cat' }, badge(e.cat || 'INFO', 'blue')),
              el('span', { class: 'mel-author' }, e.author),
              el('span', { class: 'mel-text' }, e.text)
            ))
          ),
      el('button', { class: 'btn-ghost btn-sm', onclick: () => setTab('mel') }, 'Voir tout →')
    );

    const ccirPreview = panel('CCIR — Commander\'s Critical Information Requirements',
      el('div', { class: 'cards' },
        ...state.ccir.map(c => el('div', { class: 'card' },
          el('div', { class: 'card-title' }, `${c.type} — ${c.label}`),
          el('div', { class: 'card-body' },
            c.items && c.items.length
              ? el('div', {}, ...c.items.map(it => el('div', { class: 'mono' }, '• ' + it)))
              : el('span', { class: 'muted' }, 'Aucune information collectée pour ce besoin.')
          )
        ))
      )
    );

    root.appendChild(kpis);
    root.appendChild(ooda);
    root.appendChild(el('div', { class: 'grid-2' }, incidentsPanel, vesselPanel));
    root.appendChild(recentMEL);
    root.appendChild(ccirPreview);
  };

  // ============================================================
  //  TAB : INCIDENTS
  // ============================================================
  renderers.incidents = (root) => {
    root.appendChild(panel('Incidents',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.incidents.length} incident(s) — ${state.incidents.filter(i => i.status !== 'closed').length} actif(s)`),
          el('button', { class: 'btn-primary', onclick: () => incidentForm() }, '+ Nouvel incident')
        ),
        state.incidents.length === 0
          ? el('div', { class: 'empty' }, 'Aucun incident enregistré.')
          : tableEl(
            ['Réf', 'Type', 'Navire', 'Sévérité', 'Démarré', 'Statut', 'Actions'],
            state.incidents.map(i => [
              el('span', { class: 'mono' }, i.ref || ''),
              i.type || '',
              i.vessel || '',
              badge(i.severity, severityColor(i.severity)),
              fmtTime(i.startedAt),
              badge(i.status, i.status === 'open' ? 'red' : i.status === 'monitoring' ? 'orange' : 'green'),
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => incidentForm(i.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => deleteIncident(i.id) }, '✕')
              )
            ])
          )
      )
    ));
  };

  function incidentForm(idEdit) {
    const inc = idEdit ? state.incidents.find(i => i.id === idEdit) : { severity: 'med', status: 'open' };
    const form = el('div', {});
    const ref = el('input', { value: inc.ref || ('INC-' + Date.now().toString(36).toUpperCase()) });
    const type = el('select', {},
      ...['Piraterie','Incendie','Collision','Échouement','MOB','Médical','Cyber','Pollution','Sûreté','Cargaison','Mécanique','Autre']
        .map(t => el('option', { value: t, selected: inc.type === t }, t))
    );
    const vessel = el('select', {},
      el('option', { value: '' }, '— Aucun —'),
      ...state.vessels.map(v => el('option', { value: v.name, selected: inc.vessel === v.name }, v.name))
    );
    const severity = el('select', {},
      ...['low','med','high','crit'].map(s => el('option', { value: s, selected: inc.severity === s }, s.toUpperCase()))
    );
    const status = el('select', {},
      ...['open','monitoring','closed'].map(s => el('option', { value: s, selected: inc.status === s }, s))
    );
    const startedAt = el('input', { type: 'datetime-local', value: inc.startedAt ? new Date(inc.startedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16) });
    const summary = el('textarea', { placeholder: 'Résumé situation (5W : Who, What, Where, When, Why)' }, inc.summary || '');

    form.appendChild(twoCol('Référence', ref, 'Type', type));
    form.appendChild(twoCol('Navire', vessel, 'Sévérité', severity));
    form.appendChild(twoCol('Statut', status, 'Date début', startedAt));
    form.appendChild(field('Résumé', summary));
    form.appendChild(el('div', { class: 'flex', style: 'margin-top:14px' },
      el('button', { class: 'btn-primary', onclick: () => {
        const data = {
          id: inc.id || id(),
          ref: ref.value, type: type.value, vessel: vessel.value,
          severity: severity.value, status: status.value,
          startedAt: new Date(startedAt.value).toISOString(),
          summary: summary.value
        };
        if (idEdit) {
          const idx = state.incidents.findIndex(i => i.id === idEdit);
          state.incidents[idx] = data;
          logMEL('INC', `Incident ${data.ref} mis à jour (${data.status})`);
        } else {
          state.incidents.push(data);
          logMEL('INC', `Nouvel incident ${data.ref} — ${data.type} sur ${data.vessel || 'n/a'} (sev ${data.severity})`);
          if (data.severity === 'crit') state.alert = 'red';
          else if (data.severity === 'high' && state.alert === 'green') state.alert = 'orange';
          // Mettre à jour le navire impacté
          if (data.vessel) {
            const v = state.vessels.find(x => x.name === data.vessel);
            if (v) v.status = 'incident';
          }
          applyAlertClass();
        }
        save();
        closeModal();
        setTab('incidents');
      } }, idEdit ? 'Mettre à jour' : 'Créer'),
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
    ));
    openModal(idEdit ? 'Modifier l\'incident' : 'Nouvel incident', form);
  }
  function deleteIncident(idDel) {
    if (!confirm('Supprimer cet incident ?')) return;
    const inc = state.incidents.find(i => i.id === idDel);
    state.incidents = state.incidents.filter(i => i.id !== idDel);
    logMEL('INC', `Incident ${inc?.ref} supprimé`);
    save();
    setTab('incidents');
  }

  // ============================================================
  //  TAB : VESSELS
  // ============================================================
  renderers.vessels = (root) => {
    root.appendChild(panel('Flotte — état des navires',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.vessels.length} navire(s) suivi(s)`),
          el('button', { class: 'btn-primary', onclick: () => vesselForm() }, '+ Ajouter un navire')
        ),
        state.vessels.length === 0
          ? el('div', { class: 'empty' }, 'Aucun navire enregistré.')
          : tableEl(
            ['Navire', 'IMO', 'Type', 'Statut', 'Position', 'Notes', 'Actions'],
            state.vessels.map(v => [
              el('span', { class: 'mono' }, v.name),
              v.imo || '—',
              v.type || '',
              vesselStatusBadge(v.status),
              v.position || '—',
              v.notes || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => vesselForm(v.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => deleteVessel(v.id) }, '✕')
              )
            ])
          )
      )
    ));
  };
  function vesselForm(idEdit) {
    const v = idEdit ? state.vessels.find(x => x.id === idEdit) : { status: 'normal' };
    const name = el('input', { value: v.name || '' });
    const imo = el('input', { value: v.imo || '' });
    const type = el('input', { value: v.type || '', placeholder: 'ULCV, NEO Panamax, RoRo, LNG…' });
    const status = el('select', {},
      ...[
        ['normal', 'Normal'],
        ['risk', 'À risque'],
        ['incident', 'Incident'],
        ['safe', 'Mise en sécurité'],
        ['port', 'Au port refuge']
      ].map(([k, lbl]) => el('option', { value: k, selected: v.status === k }, lbl))
    );
    const position = el('input', { value: v.position || '', placeholder: 'Lat / Long ou nom de zone' });
    const notes = el('textarea', {}, v.notes || '');

    const form = el('div', {},
      twoCol('Navire', name, 'IMO', imo),
      twoCol('Type', type, 'Statut', status),
      field('Position', position),
      field('Notes', notes),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: v.id || id(),
            name: name.value, imo: imo.value, type: type.value,
            status: status.value, position: position.value, notes: notes.value
          };
          if (idEdit) {
            const idx = state.vessels.findIndex(x => x.id === idEdit);
            state.vessels[idx] = data;
            logMEL('VESSEL', `Navire ${data.name} mis à jour — statut ${data.status}`);
          } else {
            state.vessels.push(data);
            logMEL('VESSEL', `Navire ${data.name} ajouté à la flotte`);
          }
          save();
          closeModal();
          setTab('vessels');
        } }, idEdit ? 'Mettre à jour' : 'Créer'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier navire' : 'Nouveau navire', form);
  }
  function deleteVessel(idDel) {
    if (!confirm('Retirer ce navire ?')) return;
    state.vessels = state.vessels.filter(v => v.id !== idDel);
    save();
    setTab('vessels');
  }

  // ============================================================
  //  TAB : MEL — Main Events Log
  // ============================================================
  renderers.mel = (root) => {
    const cat = el('select', {},
      ...['INFO','INC','DECISION','COMMS','ACTION','SAFETY','SECURITY','MEDIA','VESSEL','OTHER']
        .map(c => el('option', { value: c }, c))
    );
    const author = el('input', { placeholder: 'Auteur / poste (ex. CMD, OPS)' });
    const text = el('textarea', { placeholder: 'Saisir l\'événement, fait observable, horodaté à la création.' });
    const addBtn = el('button', { class: 'btn-primary', onclick: () => {
      if (!text.value.trim()) return;
      logMEL(cat.value, text.value.trim(), author.value || 'Anonyme');
      text.value = '';
      setTab('mel');
    } }, '+ Consigner');

    const inputPanel = panel('Saisie d\'événement',
      el('div', {},
        twoCol('Catégorie', cat, 'Auteur', author),
        field('Événement', text),
        el('div', { style: 'margin-top:8px' }, addBtn,
          el('span', { class: 'muted', style: 'margin-left:10px' }, 'Le journal est immuable : toute saisie est horodatée et conservée.')
        )
      )
    );

    const filterCat = el('select', { onchange: () => setTab('mel') },
      el('option', { value: '' }, 'Toutes catégories'),
      ...['INFO','INC','DECISION','COMMS','ACTION','SAFETY','SECURITY','MEDIA','VESSEL','OTHER']
        .map(c => el('option', { value: c }, c))
    );

    const filtered = state.mel;

    const logPanel = panel('Journal chronologique',
      filtered.length === 0
        ? el('div', { class: 'empty' }, 'Aucune entrée. Le journal s\'affichera ici.')
        : el('div', {}, ...filtered.map(e => el('div', { class: 'mel-entry' },
            el('span', { class: 'mel-time' }, fmtDTG(e.ts)),
            el('span', { class: 'mel-cat' }, badge(e.cat || 'INFO', 'blue')),
            el('span', { class: 'mel-author' }, e.author),
            el('span', { class: 'mel-text' }, e.text)
          ))),
      el('button', { class: 'btn-ghost btn-sm', onclick: () => exportMEL() }, '⬇ Export texte')
    );

    root.appendChild(inputPanel);
    root.appendChild(logPanel);
  };
  function exportMEL() {
    const lines = ['MAIN EVENTS LOG — CMA Ships Crisis Cell', '='.repeat(60), ''];
    [...state.mel].reverse().forEach(e => {
      lines.push(`[${fmtDTG(e.ts)}] [${e.cat}] (${e.author}) ${e.text}`);
    });
    download(`MEL_${Date.now()}.txt`, lines.join('\n'));
  }

  // ============================================================
  //  TAB : TEAM
  // ============================================================
  renderers.team = (root) => {
    root.appendChild(panel('Cellule de crise — rôles ICS adaptés',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Inspiré du Incident Command System (ICS) et organisation maritime DPA/CSO'),
          el('button', { class: 'btn-primary', onclick: () => teamForm() }, '+ Ajouter un membre')
        ),
        state.team.length === 0
          ? el('div', { class: 'empty' }, 'Aucun membre. Ajoutez les personnels d\'astreinte.')
          : tableEl(['Rôle', 'Nom', 'Contact', 'Astreinte', 'Statut', 'Actions'],
            state.team.map(t => [
              el('span', {}, badge(t.role, 'blue'), ' ', roleName(t.role)),
              t.name,
              t.contact,
              t.shift || '',
              badge(t.online ? 'En ligne' : 'Off', t.online ? 'green' : 'grey'),
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => teamForm(t.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => deleteMember(t.id) }, '✕')
              )
            ])
          )
      )
    ));
    root.appendChild(panel('Référentiel des rôles',
      el('div', { class: 'cards' },
        ...window.ROLES.map(r => el('div', { class: 'card' },
          el('div', { class: 'card-title' }, `[${r.code}] ${r.name}`),
          el('div', { class: 'card-body muted' }, r.desc)
        ))
      )
    ));
  };
  function roleName(code) {
    const r = window.ROLES.find(x => x.code === code);
    return r ? r.name : code;
  }
  function teamForm(idEdit) {
    const m = idEdit ? state.team.find(x => x.id === idEdit) : { role: 'CMD', online: true };
    const role = el('select', {},
      ...window.ROLES.map(r => el('option', { value: r.code, selected: m.role === r.code }, `[${r.code}] ${r.name}`))
    );
    const name = el('input', { value: m.name || '' });
    const contact = el('input', { value: m.contact || '', placeholder: 'Tel / mail / radio' });
    const shift = el('input', { value: m.shift || '', placeholder: 'Jour / Nuit / 24x7' });
    const online = el('input', { type: 'checkbox' });
    online.checked = !!m.online;
    const form = el('div', {},
      twoCol('Rôle', role, 'Nom', name),
      twoCol('Contact', contact, 'Astreinte', shift),
      el('label', { class: 'flex', style: 'margin-top:6px' }, online, el('span', { style: 'margin-left:6px' }, 'En ligne / mobilisé')),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: m.id || id(),
            role: role.value, name: name.value, contact: contact.value,
            shift: shift.value, online: online.checked
          };
          if (idEdit) {
            const idx = state.team.findIndex(x => x.id === idEdit);
            state.team[idx] = data;
          } else {
            state.team.push(data);
            logMEL('INFO', `Cellule activée : ${data.name} en ${data.role}`);
          }
          save();
          closeModal();
          setTab('team');
        } }, idEdit ? 'Mettre à jour' : 'Ajouter'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier membre' : 'Nouveau membre cellule', form);
  }
  function deleteMember(idDel) {
    if (!confirm('Retirer ce membre ?')) return;
    state.team = state.team.filter(t => t.id !== idDel);
    save();
    setTab('team');
  }

  // ============================================================
  //  TAB : ACTIONS
  // ============================================================
  renderers.actions = (root) => {
    const open = state.actions.filter(a => a.status !== 'done');
    const done = state.actions.filter(a => a.status === 'done');

    root.appendChild(panel('Actions à mener',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${open.length} ouverte(s) — ${done.length} clôturée(s)`),
          el('button', { class: 'btn-primary', onclick: () => actionForm() }, '+ Nouvelle action')
        ),
        open.length === 0
          ? el('div', { class: 'empty' }, 'Aucune action ouverte.')
          : tableEl(['Priorité', 'Description', 'Owner', 'Échéance', 'Statut', ''],
            open.map(a => actionRow(a)))
      )
    ));

    if (done.length) {
      root.appendChild(panel('Clôturées',
        tableEl(['Priorité', 'Description', 'Owner', 'Échéance', 'Statut', ''], done.map(a => actionRow(a)))
      ));
    }
  };
  function actionRow(a) {
    const overdue = a.due && new Date(a.due) < new Date() && a.status !== 'done';
    return [
      badge(a.priority || 'P3', a.priority === 'P1' ? 'red' : a.priority === 'P2' ? 'orange' : 'blue'),
      a.text,
      a.owner || '—',
      el('span', { class: overdue ? 'badge red' : '' }, fmtTime(a.due)),
      badge(a.status, a.status === 'done' ? 'green' : a.status === 'in-progress' ? 'orange' : 'blue'),
      el('div', { class: 'flex' },
        el('button', { class: 'btn-ghost btn-sm', onclick: () => actionForm(a.id) }, 'Éditer'),
        a.status !== 'done'
          ? el('button', { class: 'btn-success btn-sm', onclick: () => closeAction(a.id) }, '✓')
          : null,
        el('button', { class: 'btn-danger btn-sm', onclick: () => deleteAction(a.id) }, '✕')
      )
    ];
  }
  function actionForm(idEdit) {
    const a = idEdit ? state.actions.find(x => x.id === idEdit) : { priority: 'P2', status: 'todo' };
    const priority = el('select', {},
      ...['P1','P2','P3'].map(p => el('option', { value: p, selected: a.priority === p }, p))
    );
    const status = el('select', {},
      ...[['todo','À faire'],['in-progress','En cours'],['blocked','Bloquée'],['done','Faite']]
        .map(([k, lbl]) => el('option', { value: k, selected: a.status === k }, lbl))
    );
    const text = el('textarea', { placeholder: 'Action concrète, mesurable, attribuable' }, a.text || '');
    const owner = el('input', { value: a.owner || '', placeholder: 'CMD / OPS / nom' });
    const due = el('input', { type: 'datetime-local', value: a.due ? new Date(a.due).toISOString().slice(0, 16) : '' });
    const form = el('div', {},
      field('Description', text),
      twoCol('Owner', owner, 'Échéance', due),
      twoCol('Priorité', priority, 'Statut', status),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: a.id || id(),
            text: text.value, owner: owner.value, due: due.value ? new Date(due.value).toISOString() : '',
            priority: priority.value, status: status.value,
            createdAt: a.createdAt || nowISO()
          };
          if (idEdit) {
            const idx = state.actions.findIndex(x => x.id === idEdit);
            state.actions[idx] = data;
          } else {
            state.actions.push(data);
            logMEL('ACTION', `Action ouverte : ${data.text} (${data.priority}, owner ${data.owner})`);
          }
          save();
          closeModal();
          setTab('actions');
        } }, idEdit ? 'Mettre à jour' : 'Créer'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier action' : 'Nouvelle action', form);
  }
  function closeAction(idDel) {
    const a = state.actions.find(x => x.id === idDel);
    a.status = 'done';
    a.closedAt = nowISO();
    logMEL('ACTION', `Action clôturée : ${a.text}`);
    save();
    setTab('actions');
  }
  function deleteAction(idDel) {
    if (!confirm('Supprimer ?')) return;
    state.actions = state.actions.filter(a => a.id !== idDel);
    save();
    setTab('actions');
  }

  // ============================================================
  //  TAB : DECISIONS — OODA
  // ============================================================
  renderers.decisions = (root) => {
    root.appendChild(panel('Journal des décisions — boucle OODA',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Chaque décision est tracée avec ses 4 phases : Observe / Orient / Decide / Act'),
          el('button', { class: 'btn-primary', onclick: () => decisionForm() }, '+ Nouvelle décision')
        ),
        state.decisions.length === 0
          ? el('div', { class: 'empty' }, 'Aucune décision tracée.')
          : el('div', { class: 'cards' },
              ...state.decisions.map(d => el('div', { class: 'card' },
                el('div', { class: 'flex-between' },
                  el('div', { class: 'card-title' }, d.title),
                  el('div', {},
                    badge(d.status || 'pending', d.status === 'executed' ? 'green' : d.status === 'rejected' ? 'red' : 'orange'),
                    ' ',
                    el('span', { class: 'mono', style: 'color:var(--muted)' }, fmtDTG(d.ts))
                  )
                ),
                el('div', { class: 'card-meta' }, `Décideur : ${d.decider || '—'}`),
                el('div', { class: 'card-body' },
                  el('div', {}, el('strong', {}, '👁 Observe : '), d.observe || '—'),
                  el('div', {}, el('strong', {}, '🧭 Orient : '), d.orient || '—'),
                  el('div', {}, el('strong', {}, '⚖ Decide : '), d.decide || '—'),
                  el('div', {}, el('strong', {}, '⚡ Act : '), d.act || '—')
                ),
                el('div', { class: 'card-actions' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => decisionForm(d.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => deleteDecision(d.id) }, '✕')
                )
              ))
            )
      )
    ));
  };
  function decisionForm(idEdit) {
    const d = idEdit ? state.decisions.find(x => x.id === idEdit) : { status: 'pending' };
    const title = el('input', { value: d.title || '', placeholder: 'Titre court de la décision' });
    const decider = el('input', { value: d.decider || '', placeholder: 'Crisis Manager / DPA…' });
    const observe = el('textarea', { placeholder: 'Faits observés, sources, COP' }, d.observe || '');
    const orient = el('textarea', { placeholder: 'Analyse, contexte, options possibles, contraintes' }, d.orient || '');
    const decide = el('textarea', { placeholder: 'Option retenue + justification' }, d.decide || '');
    const act = el('textarea', { placeholder: 'Plan d\'action, qui, quoi, quand' }, d.act || '');
    const status = el('select', {},
      ...[['pending','En attente'],['executed','Exécutée'],['rejected','Rejetée']]
        .map(([k, lbl]) => el('option', { value: k, selected: d.status === k }, lbl))
    );
    const form = el('div', {},
      twoCol('Titre', title, 'Décideur', decider),
      field('Observe', observe),
      field('Orient', orient),
      field('Decide', decide),
      field('Act', act),
      field('Statut', status),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: d.id || id(),
            title: title.value, decider: decider.value,
            observe: observe.value, orient: orient.value,
            decide: decide.value, act: act.value,
            status: status.value, ts: d.ts || nowISO()
          };
          if (idEdit) {
            const idx = state.decisions.findIndex(x => x.id === idEdit);
            state.decisions[idx] = data;
          } else {
            state.decisions.unshift(data);
            logMEL('DECISION', `Décision : ${data.title} (${data.status}) — par ${data.decider}`);
          }
          save();
          closeModal();
          setTab('decisions');
        } }, idEdit ? 'Mettre à jour' : 'Tracer'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier décision' : 'Nouvelle décision OODA', form);
  }
  function deleteDecision(idDel) {
    if (!confirm('Supprimer ?')) return;
    state.decisions = state.decisions.filter(d => d.id !== idDel);
    save();
    setTab('decisions');
  }

  // ============================================================
  //  TAB : COMMS
  // ============================================================
  renderers.comms = (root) => {
    root.appendChild(panel('Journal des communications',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Tracer toutes communications entrantes/sortantes — vital pour audit et juridique'),
          el('button', { class: 'btn-primary', onclick: () => commsForm() }, '+ Enregistrer comm')
        ),
        state.comms.length === 0
          ? el('div', { class: 'empty' }, 'Aucune communication tracée.')
          : tableEl(['Sens', 'DTG', 'Canal', 'De / À', 'Sujet', 'Contenu', ''],
            state.comms.map(c => [
              badge(c.dir === 'in' ? '⇓ IN' : '⇑ OUT', c.dir === 'in' ? 'blue' : 'orange'),
              el('span', { class: 'mono' }, fmtDTG(c.ts)),
              c.channel || '',
              c.party || '',
              c.subject || '',
              el('div', { style: 'white-space:pre-wrap;font-size:12px' }, c.body || ''),
              el('button', { class: 'btn-danger btn-sm', onclick: () => deleteComm(c.id) }, '✕')
            ])
          )
      )
    ));
  };
  function commsForm() {
    const dir = el('select', {}, el('option', { value: 'in' }, '⇓ Entrante'), el('option', { value: 'out' }, '⇑ Sortante'));
    const channel = el('select', {},
      ...['VHF','HF','Inmarsat','LRIT','Téléphone','Email','SSAS','Sat-C','Telegram','Press','Autre']
        .map(c => el('option', { value: c }, c))
    );
    const party = el('input', { placeholder: 'MRCC, UKMTO, P&I, Capitaine…' });
    const subject = el('input', {});
    const body = el('textarea', {});
    const form = el('div', {},
      twoCol('Sens', dir, 'Canal', channel),
      twoCol('De / À', party, 'Sujet', subject),
      field('Contenu', body),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          state.comms.unshift({
            id: id(), ts: nowISO(),
            dir: dir.value, channel: channel.value,
            party: party.value, subject: subject.value, body: body.value
          });
          logMEL('COMMS', `${dir.value === 'in' ? '⇓' : '⇑'} ${channel.value} — ${party.value} : ${subject.value}`);
          save(); closeModal(); setTab('comms');
        } }, 'Enregistrer'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal('Nouvelle communication', form);
  }
  function deleteComm(idDel) {
    state.comms = state.comms.filter(c => c.id !== idDel);
    save(); setTab('comms');
  }

  // ============================================================
  //  TAB : STAKEHOLDERS
  // ============================================================
  renderers.stakeholders = (root) => {
    root.appendChild(panel('Parties prenantes — annuaire de crise',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Contacts mobilisables 24/7 : MRCC, autorités, P&I, équipage, médias, familles'),
          el('button', { class: 'btn-primary', onclick: () => stakeholderForm() }, '+ Ajouter')
        ),
        state.stakeholders.length === 0
          ? el('div', { class: 'empty' }, 'Aucun contact.')
          : tableEl(['Priorité', 'Nom', 'Rôle', 'Contact', ''],
            state.stakeholders
              .slice()
              .sort((a, b) => (a.priority || 'P3').localeCompare(b.priority || 'P3'))
              .map(s => [
                badge(s.priority || 'P3', s.priority === 'P1' ? 'red' : s.priority === 'P2' ? 'orange' : 'blue'),
                s.name, s.role,
                el('span', { class: 'mono' }, s.contact),
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => stakeholderForm(s.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => deleteStakeholder(s.id) }, '✕')
                )
              ])
          )
      )
    ));
  };
  function stakeholderForm(idEdit) {
    const s = idEdit ? state.stakeholders.find(x => x.id === idEdit) : { priority: 'P2' };
    const name = el('input', { value: s.name || '' });
    const role = el('input', { value: s.role || '' });
    const contact = el('input', { value: s.contact || '' });
    const priority = el('select', {},
      ...['P1','P2','P3'].map(p => el('option', { value: p, selected: s.priority === p }, p))
    );
    const form = el('div', {},
      twoCol('Nom / Org', name, 'Rôle', role),
      twoCol('Contact', contact, 'Priorité', priority),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: s.id || id(),
            name: name.value, role: role.value, contact: contact.value, priority: priority.value
          };
          if (idEdit) {
            const idx = state.stakeholders.findIndex(x => x.id === idEdit);
            state.stakeholders[idx] = data;
          } else {
            state.stakeholders.push(data);
          }
          save(); closeModal(); setTab('stakeholders');
        } }, idEdit ? 'Mettre à jour' : 'Ajouter'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier contact' : 'Nouveau contact', form);
  }
  function deleteStakeholder(idDel) {
    if (!confirm('Supprimer ?')) return;
    state.stakeholders = state.stakeholders.filter(s => s.id !== idDel);
    save(); setTab('stakeholders');
  }

  // ============================================================
  //  TAB : RISK MATRIX
  // ============================================================
  renderers.risk = (root) => {
    const intro = panel('Matrice de risque 5×5',
      el('div', {},
        el('p', { class: 'muted' }, 'Évaluation Likelihood × Severity. Cliquez sur une cellule pour ajouter un risque, sur un risque pour le détailler.'),
        riskMatrixView()
      )
    );
    const list = panel('Registre des risques',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, `${state.risks.length} risque(s) suivi(s)`),
          el('button', { class: 'btn-primary', onclick: () => riskForm() }, '+ Nouveau risque')
        ),
        state.risks.length === 0
          ? el('div', { class: 'empty' }, 'Aucun risque.')
          : tableEl(['Titre', 'L', 'S', 'Score', 'Mitigation', 'Owner', ''],
            state.risks.map(r => [
              r.title,
              r.likelihood,
              r.severity,
              badge(r.likelihood * r.severity, riskScoreClass(r.likelihood * r.severity)),
              r.mitigation || '',
              r.owner || '',
              el('div', { class: 'flex' },
                el('button', { class: 'btn-ghost btn-sm', onclick: () => riskForm(r.id) }, 'Éditer'),
                el('button', { class: 'btn-danger btn-sm', onclick: () => deleteRisk(r.id) }, '✕')
              )
            ])
          )
      )
    );
    root.appendChild(intro);
    root.appendChild(list);
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
    const owner = el('input', { value: r.owner || '' });
    const form = el('div', {},
      field('Titre', title),
      twoCol('Likelihood (1-5)', likelihood, 'Severity (1-5)', severity),
      twoCol('Owner', owner, '', el('span')),
      field('Mitigation', mitigation),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: r.id || id(), title: title.value,
            likelihood: parseInt(likelihood.value, 10) || 1,
            severity: parseInt(severity.value, 10) || 1,
            mitigation: mitigation.value, owner: owner.value
          };
          if (idEdit) {
            const idx = state.risks.findIndex(x => x.id === idEdit);
            state.risks[idx] = data;
          } else {
            state.risks.push(data);
          }
          save(); closeModal(); setTab('risk');
        } }, idEdit ? 'Mettre à jour' : 'Ajouter'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier risque' : 'Nouveau risque', form);
  }
  function deleteRisk(idDel) {
    if (!confirm('Supprimer ?')) return;
    state.risks = state.risks.filter(r => r.id !== idDel);
    save(); setTab('risk');
  }

  // ============================================================
  //  TAB : BATTLE RHYTHM
  // ============================================================
  renderers.rhythm = (root) => {
    root.appendChild(panel('Battle Rhythm — cadence opérationnelle',
      el('div', {},
        el('div', { class: 'flex-between', style: 'margin-bottom:10px' },
          el('div', { class: 'muted' }, 'Briefings, points de situation, cycles SITREP — inspiré des HQ militaires.'),
          el('button', { class: 'btn-primary', onclick: () => rhythmForm() }, '+ Ajouter rendez-vous')
        ),
        state.rhythm.length === 0
          ? el('div', { class: 'empty' }, 'Aucun rendez-vous.')
          : tableEl(['Heure', 'Titre', 'Cadence', 'Description', ''],
            state.rhythm
              .slice()
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map(r => [
                el('span', { class: 'mono' }, r.time),
                r.title, r.cadence, r.desc,
                el('div', { class: 'flex' },
                  el('button', { class: 'btn-ghost btn-sm', onclick: () => rhythmForm(r.id) }, 'Éditer'),
                  el('button', { class: 'btn-danger btn-sm', onclick: () => deleteRhythm(r.id) }, '✕')
                )
              ])
          )
      )
    ));
  };
  function rhythmForm(idEdit) {
    const r = idEdit ? state.rhythm.find(x => x.id === idEdit) : {};
    const time = el('input', { type: 'time', value: r.time || '08:00' });
    const title = el('input', { value: r.title || '' });
    const cadence = el('select', {},
      ...['Quotidien','6H','12H','Hebdo','Sur demande'].map(c => el('option', { value: c, selected: r.cadence === c }, c))
    );
    const desc = el('textarea', {}, r.desc || '');
    const form = el('div', {},
      twoCol('Heure', time, 'Cadence', cadence),
      field('Titre', title),
      field('Description', desc),
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => {
          const data = {
            id: r.id || id(),
            time: time.value, title: title.value,
            cadence: cadence.value, desc: desc.value
          };
          if (idEdit) {
            const idx = state.rhythm.findIndex(x => x.id === idEdit);
            state.rhythm[idx] = data;
          } else {
            state.rhythm.push(data);
          }
          save(); closeModal(); setTab('rhythm');
        } }, idEdit ? 'Mettre à jour' : 'Ajouter'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Annuler')
      )
    );
    openModal(idEdit ? 'Modifier rendez-vous' : 'Nouveau rendez-vous', form);
  }
  function deleteRhythm(idDel) {
    if (!confirm('Supprimer ?')) return;
    state.rhythm = state.rhythm.filter(r => r.id !== idDel);
    save(); setTab('rhythm');
  }

  // ============================================================
  //  TAB : SITREP
  // ============================================================
  renderers.sitrep = (root) => {
    const builderInputs = {
      classif: el('select', {}, ...['NON CLASSIFIÉ','DIFFUSION RESTREINTE','CONFIDENTIEL','SECRET'].map(c => el('option', { value: c }, c))),
      dest: el('input', { value: 'COMEX CMA — État pavillon — P&I — Affréteur' }),
      situation: el('textarea', { placeholder: 'Synthèse globale en 3-5 lignes' }),
      assessment: el('textarea', { placeholder: 'Évolution attendue, hypothèses (best/likely/worst case)' }),
      requests: el('textarea', { placeholder: 'Ressources demandées, support requis' }),
      next: el('input', { value: '+6H' }),
      signature: el('input', { value: 'Crisis Manager — DPA' })
    };

    const buildBtn = el('button', { class: 'btn-primary', onclick: () => {
      state.sitrepCounter = (state.sitrepCounter || 0) + 1;
      const text = renderSITREP(builderInputs);
      preview.textContent = text;
      state.sitreps.unshift({ id: id(), ts: nowISO(), num: state.sitrepCounter, text });
      logMEL('INFO', `SITREP N°${state.sitrepCounter} généré`);
      save();
    } }, '🛰 Générer SITREP');
    const printBtn = el('button', { class: 'btn-ghost', onclick: () => window.print() }, '🖨 Imprimer');
    const dlBtn = el('button', { class: 'btn-ghost', onclick: () => download(`SITREP_${state.sitrepCounter || 'X'}.txt`, preview.textContent) }, '⬇ Télécharger');

    const preview = el('pre', { class: 'sitrep-preview' }, '— Cliquez "Générer SITREP" —');

    const builderPanel = panel('Générateur de SITREP — format NATO 5 paragraphes adapté maritime',
      el('div', {},
        twoCol('Classification', builderInputs.classif, 'Destinataires', builderInputs.dest),
        field('1. Situation générale', builderInputs.situation),
        field('7. Évaluation / évolution', builderInputs.assessment),
        field('8. Demandes / support', builderInputs.requests),
        twoCol('9. Prochain SITREP', builderInputs.next, 'Signature', builderInputs.signature),
        el('div', { class: 'flex', style: 'margin-top:10px' }, buildBtn, printBtn, dlBtn)
      )
    );

    root.appendChild(builderPanel);
    root.appendChild(panel('Aperçu', preview));

    if (state.sitreps.length) {
      root.appendChild(panel('SITREPs précédents',
        tableEl(['N°', 'Émis', ''],
          state.sitreps.map(s => [
            'N°' + s.num,
            fmtDTG(s.ts),
            el('div', { class: 'flex' },
              el('button', { class: 'btn-ghost btn-sm', onclick: () => { preview.textContent = s.text; window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Recharger'),
              el('button', { class: 'btn-danger btn-sm', onclick: () => { state.sitreps = state.sitreps.filter(x => x.id !== s.id); save(); setTab('sitrep'); } }, '✕')
            )
          ])
        )
      ));
    }
  };
  function renderSITREP(inputs) {
    const incs = state.incidents.filter(i => i.status !== 'closed');
    const vessels = state.vessels.filter(v => v.status !== 'normal');
    const actsDone = state.actions.filter(a => a.status === 'done').slice(0, 10);
    const actsPlan = state.actions.filter(a => a.status !== 'done').slice(0, 10);
    const decisions = state.decisions.slice(0, 5);

    const fmtList = arr => arr.length === 0 ? 'Néant.' : arr.join('\n');

    return window.SITREP_TEMPLATE
      .replace('{DTG}', fmtDTG(nowISO()))
      .replace('{NUM}', String(state.sitrepCounter || '-').padStart(3, '0'))
      .replace('{DEST}', inputs.dest.value)
      .replace('{CLASSIF}', inputs.classif.value)
      .replace('{ALERT}', state.alert.toUpperCase())
      .replace('{OPS}', state.opsPeriod || '-')
      .replace('{SITUATION}', inputs.situation.value || '-')
      .replace('{INCIDENTS}', fmtList(incs.map(i =>
        ` - [${i.ref}] ${i.type} sur ${i.vessel || 'n/a'} — sev ${i.severity.toUpperCase()} — depuis ${fmtDTG(i.startedAt)}\n   Résumé : ${(i.summary || '').replace(/\n/g, ' ')}`
      )))
      .replace('{VESSELS}', fmtList(vessels.map(v =>
        ` - ${v.name} (IMO ${v.imo || '-'}) — ${v.status.toUpperCase()} — pos ${v.position || '-'}`
      )))
      .replace('{ACTIONS_DONE}', fmtList(actsDone.map(a => ` - [${a.priority}] ${a.text} (owner ${a.owner})`)))
      .replace('{ACTIONS_PLANNED}', fmtList(actsPlan.map(a => ` - [${a.priority}] ${a.text} — owner ${a.owner}, due ${fmtDTG(a.due)}`)))
      .replace('{DECISIONS}', fmtList(decisions.map(d => ` - ${d.title} — ${d.decide || '(en cours)'} (${d.status})`)))
      .replace('{ASSESSMENT}', inputs.assessment.value || '-')
      .replace('{REQUESTS}', inputs.requests.value || 'Néant.')
      .replace('{NEXT_SITREP}', inputs.next.value || '+6H')
      .replace('{SIGNATURE}', inputs.signature.value || '-');
  }

  // ============================================================
  //  TAB : PLAYBOOKS
  // ============================================================
  renderers.playbooks = (root) => {
    root.appendChild(panel('Playbooks d\'urgence — checklists maritimes',
      el('div', {},
        el('p', { class: 'muted' }, 'Procédures inspirées ISM Code, IMO A.1072(28), BMP5, SOLAS, ISPS, IAMSAR, BIMCO Cyber Guidelines. À adapter aux procédures internes CMA Ships.'),
        el('div', { class: 'cards' },
          ...window.PLAYBOOKS.map(pb => el('div', { class: 'card' },
            el('div', { class: 'flex-between' },
              el('div', { class: 'card-title' }, pb.title),
              badge(pb.severity, pb.severity === 'crit' ? 'red' : pb.severity === 'high' ? 'orange' : 'blue')
            ),
            el('div', { class: 'card-meta' }, 'Réf : ' + pb.refs.join(' · ')),
            el('div', { class: 'card-actions' },
              el('button', { class: 'btn-primary btn-sm', onclick: () => openPlaybook(pb) }, 'Ouvrir'),
              el('button', { class: 'btn-ghost btn-sm', onclick: () => activatePlaybook(pb) }, 'Activer (créer actions)')
            )
          ))
        )
      )
    ));
  };
  function openPlaybook(pb) {
    const stateMap = state.playbookState[pb.id] || {};
    const stepsBox = el('div', {});
    pb.steps.forEach((step, idx) => {
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !!stateMap[idx];
      const txt = el('div', { class: 'pb-text' + (cb.checked ? ' done' : '') }, `${idx + 1}. ${step}`);
      cb.addEventListener('change', () => {
        stateMap[idx] = cb.checked;
        state.playbookState[pb.id] = stateMap;
        txt.classList.toggle('done', cb.checked);
        save();
      });
      stepsBox.appendChild(el('div', { class: 'pb-step' }, cb, txt));
    });
    const wrapper = el('div', {},
      el('div', { class: 'card-meta', style: 'margin-bottom:10px' }, 'Réf : ' + pb.refs.join(' · ')),
      stepsBox,
      el('div', { class: 'flex', style: 'margin-top:14px' },
        el('button', { class: 'btn-primary', onclick: () => activatePlaybook(pb) }, '→ Activer ce playbook (créer actions)'),
        el('button', { class: 'btn-ghost', onclick: closeModal }, 'Fermer')
      )
    );
    openModal(pb.title, wrapper);
  }
  function activatePlaybook(pb) {
    let n = 0;
    pb.steps.forEach((step, idx) => {
      state.actions.push({
        id: id(),
        text: `[${pb.title}] ${step}`,
        owner: '',
        priority: pb.severity === 'crit' ? 'P1' : pb.severity === 'high' ? 'P2' : 'P3',
        status: 'todo',
        due: '',
        createdAt: nowISO()
      });
      n++;
    });
    logMEL('ACTION', `Playbook "${pb.title}" activé : ${n} actions créées`);
    save();
    closeModal();
    setTab('actions');
  }

  // ============================================================
  //  TAB : CCIR
  // ============================================================
  renderers.ccir = (root) => {
    root.appendChild(panel('CCIR — Commander\'s Critical Information Requirements',
      el('div', {},
        el('p', { class: 'muted' }, 'Information dont le Crisis Manager a besoin pour décider. PIR = renseignement prioritaire, FFIR = état force amie, EEFI = à ne PAS divulguer.'),
        ...state.ccir.map(c => {
          const itemsBox = el('div', {});
          (c.items || []).forEach((it, idx) => {
            itemsBox.appendChild(el('div', { class: 'pb-step' },
              el('div', { class: 'pb-text' }, '• ' + it),
              el('button', { class: 'btn-danger btn-sm', onclick: () => {
                c.items.splice(idx, 1); save(); setTab('ccir');
              } }, '✕')
            ));
          });
          const input = el('input', { placeholder: 'Saisir une information…' });
          const addBtn = el('button', { class: 'btn-primary btn-sm', onclick: () => {
            if (!input.value.trim()) return;
            c.items = c.items || [];
            c.items.push(input.value.trim());
            save(); setTab('ccir');
          } }, '+ Ajouter');

          return el('div', { class: 'card' },
            el('div', { class: 'card-title' }, badge(c.type, c.type === 'EEFI' ? 'red' : c.type === 'PIR' ? 'orange' : 'blue'), ' ' + c.label),
            itemsBox,
            el('div', { class: 'flex', style: 'margin-top:8px' }, input, addBtn)
          );
        })
      )
    ));
  };

  // ----------------------------- HELPERS UI -------------------------------
  function panel(title, body, headerExtra) {
    return el('div', { class: 'panel' },
      el('div', { class: 'panel-header' },
        el('h2', {}, title),
        headerExtra || null
      ),
      el('div', { class: 'panel-body' }, body)
    );
  }
  function kpiTile(label, value, tone, sub) {
    return el('div', { class: 'kpi ' + (tone || '') },
      el('div', { class: 'kpi-label' }, label),
      el('div', { class: 'kpi-value' }, String(value)),
      sub ? el('div', { class: 'kpi-sub' }, sub) : null
    );
  }
  function oodaStep(num, name, desc) {
    return el('div', { class: 'ooda-step' },
      el('div', { class: 'num' }, num),
      el('div', { class: 'name' }, name),
      el('div', { class: 'desc' }, desc)
    );
  }
  function badge(text, color) {
    return el('span', { class: 'badge ' + (color || '') }, String(text));
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
      el('div', {}, el('label', {}, l2), i2)
    );
  }
  function tableEl(headers, rows) {
    return el('table', {},
      el('thead', {}, el('tr', {}, ...headers.map(h => el('th', {}, h)))),
      el('tbody', {}, ...rows.map(cells => el('tr', {}, ...cells.map(c =>
        el('td', {}, typeof c === 'string' || typeof c === 'number' ? String(c) : c)
      ))))
    );
  }

  // ----------------------------- IMPORT / EXPORT --------------------------
  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    download(`crisiscell_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`, data);
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        state = Object.assign(defaultState(), data);
        save();
        applyAlertClass();
        document.getElementById('alertSelect').value = state.alert;
        document.getElementById('opsPeriod').value = state.opsPeriod || '';
        setTab(currentTab);
        alert('Import réussi.');
      } catch (err) {
        alert('Erreur import : ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ----------------------------- INIT -------------------------------------
  function init() {
    // Tabs binding
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
    });
    // Alert
    const sel = document.getElementById('alertSelect');
    sel.value = state.alert;
    sel.addEventListener('change', () => {
      state.alert = sel.value;
      applyAlertClass();
      logMEL('INFO', `Niveau d\'alerte changé : ${state.alert.toUpperCase()}`);
      save();
      if (currentTab === 'cop') setTab('cop');
    });
    applyAlertClass();
    // Ops period
    const ops = document.getElementById('opsPeriod');
    ops.value = state.opsPeriod || '';
    ops.addEventListener('change', () => { state.opsPeriod = ops.value; save(); });
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.id === 'modal') closeModal();
    });
    // Toolbar
    document.getElementById('exportData').addEventListener('click', exportJSON);
    document.getElementById('importData').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => {
      if (e.target.files[0]) importJSON(e.target.files[0]);
    });
    document.getElementById('resetAll').addEventListener('click', () => {
      if (!confirm('Tout réinitialiser ? Toutes les données seront perdues.')) return;
      state = defaultState();
      save();
      applyAlertClass();
      document.getElementById('alertSelect').value = state.alert;
      document.getElementById('opsPeriod').value = '';
      setTab('cop');
    });
    // Clocks
    tickClocks();
    setInterval(tickClocks, 1000);
    // Initial tab
    setTab('cop');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
