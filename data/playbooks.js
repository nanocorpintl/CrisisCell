// CMA Ships — Continuité opérationnelle (disponibilité technique & équipages).
// Référentiel doctrinal CMA Ships : Note d'organisation, Fonctionnement
// quotidien/hebdomadaire, JDs Duty Manager / Duty Officer, trame SITREP.
//
// Périmètre : disponibilité technique des navires (FM), disponibilité équipage
// (Crewing), avancement chantiers (Fleet Upgrade). La sécurité, la sûreté et
// l'environnement (SSE) sont du ressort de l'outil SSE de CMA Ships et ne
// figurent PAS ici.

// ============================================================
//   PLAYBOOKS TECHNIQUES & CREWING
// ============================================================
window.PLAYBOOKS = [
  {
    id: 'pb-me-failure',
    title: 'Avarie machine principale (M/E)',
    severity: 'crit',
    refs: ['Class society manual', 'ISM', 'Charter party'],
    steps: [
      'Stopper / réduire allure selon recommandation Chef',
      'Diagnostic Chef + remontée FM (Smartship, photos, paramètres)',
      'Notifier Head of Fleet Management + DO FM (Singapour)',
      'Notifier société de classification (LR/BV/NK/DNV/CCS) — class on-call',
      'Évaluer pertinence d\'un PAN-PAN (à arbitrer avec capitaine — SSE si requis)',
      'Estimer ETD repair (heure pièce, ETA pièce, intervention shore team)',
      'Coordination affréteur / clients via FM — préparer Letter Of Protest',
      'Évaluer reroutage / port refuge ou drydock non planifié',
      'Notifier P&I et H&M si dommage majeur ou pertes commerciales',
      'Documenter pour SITREP — alimenter Frictions actives FM'
    ]
  },
  {
    id: 'pb-ae-failure',
    title: 'Avarie auxiliaire (A/E) — centrale électrique',
    severity: 'high',
    refs: ['Class society manual', 'ISM'],
    steps: [
      'Identifier A/E concerné, isoler défaut, basculer charge',
      'Vérifier capacité reefer + hotel load restante',
      'Limiter le nombre de prises reefer si nécessaire (LOP au chargeur)',
      'Notifier Head FM + DO FM, planifier intervention shore team',
      'Logistique pièce détachée : ETA, dédouanement, transit',
      'Évaluer impact port suivant (reefer cut-off, énergie quai)',
      'Coordination commerciale via FM — affréteurs et clients reefer',
      'Inscription Friction à signaler bloc FM du SITREP'
    ]
  },
  {
    id: 'pb-propulsion',
    title: 'Avarie propulsion (CPP, ligne d\'arbre, gouvernail)',
    severity: 'crit',
    refs: ['Class society manual', 'IMO Resolution A.852(20)'],
    steps: [
      'Stop machine, position safe, ancrage si possible',
      'Diagnostic structurel — ligne d\'arbre, palier, CPP hub',
      'Class society on-call obligatoire',
      'Évaluer dérive — coordination remorquage (LOF Lloyd\'s Open Form ?)',
      'Notifier Head FM + DO FM, escalade DM Marseille',
      'Fenêtre drydock — coordination FU + Cosco/Shanghai',
      'Notifier P&I, H&M, affréteur',
      'Plan B logistique : transbordement, lightering, port refuge',
      'Friction à signaler FM + transverse FU si chantier requis'
    ]
  },
  {
    id: 'pb-drydock-unplanned',
    title: 'Drydock non planifié / docking d\'urgence',
    severity: 'high',
    refs: ['Class society manual', 'Charter party'],
    steps: [
      'Identifier chantier disponible (Cosco Zhoushan, Shanghai, alternatives)',
      'Coordination Head FU + DO FU (Chine) — slot availability',
      'Estimation durée + coût (vs budget non planifié)',
      'Logistique cargaison : transbordement, déroutage',
      'Equipage : permis, immigration, relèves anticipées si long',
      'Class society : programme inspection + survey',
      'Notifier affréteurs, ajuster schedule',
      'Friction transverse : FM ↔ FU sur slot et séquencement',
      'Bloc Échéances 24-72 h FU du SITREP'
    ]
  },
  {
    id: 'pb-retrofit',
    title: 'Retrofit / Phase-in / Phase-out',
    severity: 'med',
    refs: ['Project plan FU', 'Class society', 'Charter party'],
    steps: [
      'Validation calendrier Cosco Zhoushan / Shanghai avec DO FU',
      'Suivi Pareto sur livraison (revue à J-8 avant delivery)',
      'Vérifier bunker readiness (LNG, méthanol, dual-fuel)',
      'Sea trial planning + class attendance',
      'Coordination Crewing pour équipage de phase-in',
      'Préparation cérémonie / press si phase-in officielle',
      'Phase-out : décharge cargo, équipage relevé, documents transferts',
      'Inscription dossier du jour bloc FU du SITREP'
    ]
  },
  {
    id: 'pb-psc-detention',
    title: 'Détention PSC (Port State Control)',
    severity: 'high',
    refs: ['Paris MoU / Tokyo MoU', 'SOLAS / MLC', 'Class society'],
    steps: [
      'Récupérer rapport PSC détaillé — déficiences listées',
      'Notifier Head FM + DO FM + DM Marseille',
      'Plan d\'action correctif item par item',
      'Class society / Recognized Organization pour vérification',
      'Notifier État du pavillon',
      'Coordination Crewing si déficience manning ou cert STCW',
      'Estimer durée + coût de libération',
      'Communication affréteurs et clients — délai escale',
      'Friction à signaler bloc FM + impact rotation transverse'
    ]
  },
  {
    id: 'pb-bunker',
    title: 'Soutage défaillant (qualité ou délai)',
    severity: 'med',
    refs: ['ISO 8217', 'MARPOL Annex VI', 'Charter party'],
    steps: [
      'Suspendre soutage / consommation produit suspect',
      'Échantillonnage normalisé + envoi laboratoire',
      'Letter Of Protest (LOP) au fournisseur',
      'Évaluer impact opérationnel : autonomie, prochain port soutable',
      'Coordination FM + Procurement bunker',
      'Re-bunker alternatif — coût + délai',
      'Notifier affréteur si retard significatif',
      'Bunker supplier monitoring → Signal faible SITREP si récurrent'
    ]
  },
  {
    id: 'pb-cargo-damage',
    title: 'Avarie cargaison / dommage matériel',
    severity: 'med',
    refs: ['Charter party', 'CTU Code', 'Hague-Visby Rules'],
    steps: [
      'Localiser conteneur(s) impacté(s) — bay/row/tier',
      'Photo + vidéo horodatées, témoignages',
      'Letter Of Protest immédiate',
      'Notifier P&I + assurance cargaison',
      'Coordination FM + commercial',
      'Si reefer : chaîne thermique + claims',
      'Documentation pour SITREP — bloc FM, friction transverse si client clé'
    ]
  },
  {
    id: 'pb-manning',
    title: 'Manning shortage / Minimum Safe Manning',
    severity: 'high',
    refs: ['MLC 2006', 'STCW', 'Flag SDOC'],
    steps: [
      'Identifier postes vacants (officiers/ratings, fonctions critiques)',
      'Notifier Head Crewing + DO Crewing (Singapour)',
      'Évaluer risque non-conformité Minimum Safe Manning (SDOC)',
      'Coordination agents manning (Manille, agents Asie)',
      'Logistique relève : vols, visas, hôtels, transport portuaire',
      'Plan B : embarquement officier siège, prolongation contrat',
      'Notifier capitaine + bord de l\'état du remplacement',
      'Bloc Échéances 24-72 h Crewing du SITREP'
    ]
  },
  {
    id: 'pb-medevac-crewing',
    title: 'MEDEVAC — impact opérationnel équipage',
    severity: 'high',
    refs: ['MLC 2006', 'P&I'],
    steps: [
      'Coordination SSE (médicale) → Crewing prend le relais opérationnel',
      'Identifier poste vacant suite évacuation — niveau Minimum Safe Manning',
      'Préparer remplaçant : vol, visa, brief',
      'Logistique transport port suivant',
      'Documentation P&I, charter party, claims salaire',
      'Notifier capitaine de la chaîne de remplacement',
      'Inscription dossier du jour bloc Crewing'
    ]
  },
  {
    id: 'pb-certification',
    title: 'Certification équipage / formation — expiration',
    severity: 'med',
    refs: ['STCW', 'MLC 2006', 'CII / BV training'],
    steps: [
      'Identifier marin + certificat en limite (STCW, médicale, GMDSS)',
      'Plan : formation rapide ou relève',
      'Coordination Crewing + agents Manille / Asie',
      'Vérifier équivalence Flag State si renouvellement urgent',
      'Préparer dossier audit POEA / agences si applicable',
      'Notifier capitaine, Minimum Safe Manning à confirmer',
      'Inscription Échéances bloc Crewing'
    ]
  },
  {
    id: 'pb-vetting',
    title: 'Vetting — préparation / suite à observations',
    severity: 'med',
    refs: ['OCIMF SIRE', 'CDI', 'Client oil major'],
    steps: [
      'Calendrier pré-inspection — préparation FM + équipage',
      'Brief capitaine + chef sur observations historiques',
      'Vérifier documentation : SMS, manuels, cert. à jour',
      'Si rapport vetting : plan correctif par observation',
      'Coordination FM ↔ commercial pour information client',
      'Suivi cycle vetting prochain port',
      'Inscription bloc FM SITREP si vetting clé pour rotation'
    ]
  }
];

// ============================================================
//   ORGANISATION CMA SHIPS
// ============================================================
// VP + 3 Heads + couche de permanence (1 DM Marseille + 3 DO Asie).
// Voir Note d'organisation CMA Ships.
window.ROLES = [
  { code: 'VP',   name: 'Vice-President CMA Ships',
    desc: 'Stratégique : Group MM hebdo, relations Groupe, autorité ultime sur arbitrages structurants.' },
  { code: 'HFM',  name: 'Head of Fleet Management',
    desc: 'Hiérarchique équipe FM, décisions structurantes département (technique, exploitation flotte).' },
  { code: 'HCR',  name: 'Head of Crewing',
    desc: 'Hiérarchique équipe Crewing, décisions structurantes département (équipages, agences).' },
  { code: 'HFU',  name: 'Head of Fleet Upgrade',
    desc: 'Hiérarchique équipe FU, décisions structurantes département (retrofits, chantiers).' },
  { code: 'DM',   name: 'Duty Manager Marseille',
    desc: 'Couche permanence — rotation hebdo. Anime Daily 09:00, consolide SITREP, tient Duty Log, escalade au VP.' },
  { code: 'DOFM', name: 'Duty Officer FM — Singapour HO',
    desc: 'Permanence FM Asie-Pacifique (rotation hebdo). Produit SITREP départemental FM, monitoring nuit Europe.' },
  { code: 'DOCR', name: 'Duty Officer Crewing — Singapour HO',
    desc: 'Permanence Crewing Asie-Pacifique. Suit relèves, certifications, agents Manille/Asie.' },
  { code: 'DOFU', name: 'Duty Officer Fleet Upgrade — Chine',
    desc: 'Permanence FU (Cosco Zhoushan, Shanghai). Project Managers sur sites — suivi chantiers temps réel.' }
];

// Les 3 départements core business CMA Ships.
window.DEPARTMENTS = [
  { code: 'FM', label: 'Fleet Management',  doLocation: 'Singapour HO',          headRole: 'HFM', doRole: 'DOFM' },
  { code: 'CR', label: 'Crewing',           doLocation: 'Singapour HO',          headRole: 'HCR', doRole: 'DOCR' },
  { code: 'FU', label: 'Fleet Upgrade',     doLocation: 'Chine — site',          headRole: 'HFU', doRole: 'DOFU' },
  { code: 'XX', label: 'Transverse / autre', doLocation: '',                     headRole: '',    doRole: '' }
];

// Modes opérationnels CMA Ships — pilotage par exception.
window.MODES = [
  { code: 'nominal',   label: 'Nominal',   statut: 'VERT',  color: 'green',
    desc: 'Fonctionnement courant — pilotage par exception, dispositif standard (Daily 09:00, SITREP 08:30).' },
  { code: 'vigilance', label: 'Vigilance', statut: 'AMBRE', color: 'amber',
    desc: 'Friction technique ou crewing majeure — renforcement, HoD informés, suivi rapproché.' },
  { code: 'crise',     label: 'Crise',     statut: 'ROUGE', color: 'red',
    desc: 'Dispositif normal suspendu — cellule technique activée par le VP, escalade Groupe si pertinent.' }
];

// SITREP CMA Ships — trame officielle.
window.SITREP_CMA_TEMPLATE = `╔══════════════════════════════════════════════════════════════╗
║                    CMA SHIPS — SITREP                        ║
╚══════════════════════════════════════════════════════════════╝
{DAY}   ·   Semaine {WEEK}   ·   {CONTEXT}
Duty Manager Marseille : {DM_NAME}
Mode : {MODE}

──── STATUT GLOBAL : {STATUT} ────

▸ SYNTHÈSE 24 h
{SYNTHESIS}

▸ KPIs
  • Navires en escale       : {VESSELS_PORT}
  • Navires en passage      : {VESSELS_TRANSIT}
  • Frictions actives       : {FRICTIONS_COUNT}
  • Alertes 24 h            : {ALERTS_24H}

◆ POINTS POUR TOP MANAGEMENT
  À l'attention directe du VP avant Group MM
{TOP_MGMT_POINTS}

────────────────────────────────────────────────────────────────
  FLEET MANAGEMENT                            Statut [{FM_STATUS}]
  Duty Officer (Singapour HO) — {DO_FM}
────────────────────────────────────────────────────────────────
Dossiers du jour
{FM_DOSSIERS}

Échéances 24-72 h
{FM_DEADLINES}

Frictions à signaler
{FM_FRICTIONS}

────────────────────────────────────────────────────────────────
  CREWING                                     Statut [{CR_STATUS}]
  Duty Officer (Singapour HO) — {DO_CR}
────────────────────────────────────────────────────────────────
Dossiers du jour
{CR_DOSSIERS}

Échéances 24-72 h
{CR_DEADLINES}

Frictions à signaler
{CR_FRICTIONS}

────────────────────────────────────────────────────────────────
  FLEET UPGRADE                               Statut [{FU_STATUS}]
  Duty Officer (Chine — site) — {DO_FU}
────────────────────────────────────────────────────────────────
Dossiers du jour
{FU_DOSSIERS}

Échéances 24-72 h
{FU_DEADLINES}

Frictions à signaler
{FU_FRICTIONS}

════════════════════════════════════════════════════════════════
  FRICTIONS TRANSVERSES
════════════════════════════════════════════════════════════════
{TRANSVERSE_FRICTIONS}

════════════════════════════════════════════════════════════════
  SIGNAUX FAIBLES / LOOK-AHEAD  J+1 / S+1
════════════════════════════════════════════════════════════════
{WEAK_SIGNALS}
`;

// Conservé pour compat ascendante des triggers : alias vers MODES.
window.POSTURES = window.MODES;

// ============================================================
//   AAR — After-Action Review (RETEX, US Army FM 6-22)
// ============================================================
window.AAR_QUESTIONS = [
  { code: 'expected', label: 'Que devait-il se passer ?',
    hint: 'Plan initial, attendu, échéances prévues' },
  { code: 'actual', label: 'Que s\'est-il passé ?',
    hint: 'Faits, chronologie réelle, décisions prises' },
  { code: 'gap', label: 'Pourquoi y a-t-il une différence ?',
    hint: 'Causes racines, contraintes, surprises, frictions' },
  { code: 'improve', label: 'Que devons-nous améliorer / pérenniser ?',
    hint: 'Lessons Identified → Lessons Learned' }
];

// ============================================================
//   PASSATION DUTY MANAGER — checklist hebdomadaire
//   45 min, mardi matin (cf. JD Duty Manager)
// ============================================================
window.HANDOVER_CHECKLIST = [
  'Mode opérationnel courant + frictions actives par département',
  'Dossiers du jour ouverts (FM, Crewing, Fleet Upgrade)',
  'Échéances 24-72 h et points pour Top Management en cours',
  'Décisions en attente d\'arbitrage VP / Heads',
  'Coordination Asie : DO sortants/entrants, points de contact',
  'Engagements externes en cours (clients, chantiers, autorités)',
  'État Weekly Pack en préparation (jeudi 18:00)',
  'Triggers actifs et chaîne d\'escalade',
  'Documents partagés et accès SharePoint',
  'Points de vigilance — signaux faibles à surveiller'
];

// ============================================================
//   TRIGGERS — critères de déclenchement (techniques & crewing)
// ============================================================
window.TRIGGERS = [
  // ---- CRISE — disponibilité compromise / dispositif normal suspendu ----
  { id: 'trg-blackout', cat: 'FM — Technique', label: 'Black-out total (perte tous A/E)',
    desc: 'Perte totale alimentation électrique, propulsion compromise.',
    mode: 'crise', incidentType: 'A/E', department: 'FM' },
  { id: 'trg-prop-loss', cat: 'FM — Technique', label: 'Perte totale propulsion en transit',
    desc: 'Plus aucune capacité de manœuvre, dérive possible.',
    mode: 'crise', incidentType: 'Propulsion', department: 'FM' },
  { id: 'trg-class-susp', cat: 'FM — Régulation', label: 'Suspension classification imminente',
    desc: 'Société de classification menace de suspendre — risque immobilisation totale.',
    mode: 'crise', incidentType: 'Régulation', department: 'FM' },
  { id: 'trg-manning-breach', cat: 'CR — Équipage', label: 'Non-respect Minimum Safe Manning',
    desc: 'Effectif inférieur au Safe Manning Document — navire ne peut plus naviguer légalement.',
    mode: 'crise', incidentType: 'Manning', department: 'CR' },
  { id: 'trg-psc-no-release', cat: 'FM — Régulation', label: 'Détention PSC sans plan de libération',
    desc: 'Port State Control retient le navire, déficiences non résolues > 72 h.',
    mode: 'crise', incidentType: 'PSC', department: 'FM' },

  // ---- VIGILANCE — friction technique ou crewing significative ----
  { id: 'trg-me-degraded', cat: 'FM — Technique', label: 'M/E dégradée (cylindre HS, vitesse réduite)',
    desc: 'Avarie ME partielle : cyl. isolé, réduction d\'allure, schedule impacté.',
    mode: 'vigilance', incidentType: 'M/E', department: 'FM' },
  { id: 'trg-ae-ooo', cat: 'FM — Technique', label: 'A/E OOO avec limitation reefer',
    desc: 'Auxiliaire hors service, capacité reefer réduite — claims potentiels.',
    mode: 'vigilance', incidentType: 'A/E', department: 'FM' },
  { id: 'trg-cpp-partial', cat: 'FM — Technique', label: 'CPP / hélice : avarie partielle',
    desc: 'Controllable Pitch Propeller ou ligne d\'arbre en mode dégradé.',
    mode: 'vigilance', incidentType: 'Propulsion', department: 'FM' },
  { id: 'trg-spare-late', cat: 'FM — Logistique', label: 'Pièce critique en retard > ETD planifiée',
    desc: 'Lead time pièce détachée dépasse la fenêtre de réparation prévue.',
    mode: 'vigilance', incidentType: 'M/E', department: 'FM' },
  { id: 'trg-psc-detention', cat: 'FM — Régulation', label: 'Détention PSC avec plan correctif',
    desc: 'Détention Port State Control, libération attendue dans les jours.',
    mode: 'vigilance', incidentType: 'PSC', department: 'FM' },
  { id: 'trg-vetting-fail', cat: 'FM — Commercial', label: 'Vetting failed (observation critique)',
    desc: 'OCIMF SIRE / CDI avec observations bloquantes — risque commercial.',
    mode: 'vigilance', incidentType: 'Vetting', department: 'FM' },
  { id: 'trg-bunker-off', cat: 'FM — Soutage', label: 'Bunker off-spec ou contaminé',
    desc: 'Carburant non conforme ISO 8217, échantillon en analyse, litige fournisseur.',
    mode: 'vigilance', incidentType: 'Bunker', department: 'FM' },

  { id: 'trg-officer-gap', cat: 'CR — Équipage', label: 'Gap officier confirmé prochaine rotation',
    desc: 'Officier (Master, Chief, 2/O...) non remplacé à temps pour la prochaine relève.',
    mode: 'vigilance', incidentType: 'Manning', department: 'CR' },
  { id: 'trg-cert-expiry', cat: 'CR — Certification', label: 'Cert. STCW/médicale expire < 14 j',
    desc: 'Marin sur poste avec certificat critique en expiration courte sans plan de relève.',
    mode: 'vigilance', incidentType: 'Certification', department: 'CR' },
  { id: 'trg-medevac-impact', cat: 'CR — Équipage', label: 'MEDEVAC — remplacement non couvert',
    desc: 'Évacuation médicale en cours, poste critique non encore couvert.',
    mode: 'vigilance', incidentType: 'MEDEVAC', department: 'CR' },

  { id: 'trg-yard-slot', cat: 'FU — Chantier', label: 'Slot drydock / chantier à risque',
    desc: 'Capacité Cosco Zhoushan / Shanghai compromise sur slot planifié.',
    mode: 'vigilance', incidentType: 'Drydock', department: 'FU' },
  { id: 'trg-retrofit-delay', cat: 'FU — Chantier', label: 'Retrofit : retard > 7 jours',
    desc: 'Phase-in / retrofit retardé au-delà de la fenêtre acceptable.',
    mode: 'vigilance', incidentType: 'Retrofit', department: 'FU' },
  { id: 'trg-phase-in-risk', cat: 'FU — Livraison', label: 'Phase-in à risque (sea trial, bunker)',
    desc: 'Livraison neuf navire menacée par défaut technique ou bunker readiness.',
    mode: 'vigilance', incidentType: 'Retrofit', department: 'FU' },

  // ---- NOMINAL — vigilance à signaler mais pas d'escalade ----
  { id: 'trg-psc-routine', cat: 'FM — Régulation', label: 'Inspection PSC routine — sans déficience',
    desc: 'Visite Port State Control passée, à archiver.',
    mode: 'nominal', incidentType: 'PSC', department: 'FM' },
  { id: 'trg-lop', cat: 'FM — Commercial', label: 'Letter Of Protest émise',
    desc: 'LOP standard (bunker délai, cargaison, port) — suivi commercial.',
    mode: 'nominal', incidentType: 'Autre', department: 'FM' },
  { id: 'trg-rating-gap', cat: 'CR — Équipage', label: 'Gap rating — remplacement en standby',
    desc: 'Matelot/ofs en relève prévue, remplacement déjà identifié.',
    mode: 'nominal', incidentType: 'Manning', department: 'CR' }
];

// ============================================================
//   MODÈLES DE NOTIFICATION
// ============================================================
// Variables auto-substituées : {VESSEL} {EVENT} {DTG} {AUTHOR} {MODE} {DEPT}
window.NOTIF_TEMPLATES = [
  { id: 'notif-prealert',
    label: 'Vigilance — pré-alerte VP (AMBRE)',
    channel: 'Mail + Teams',
    audience: 'VP CMA Ships + Heads of Department',
    body: '[CMA Ships] Bascule mode VIGILANCE — friction {DEPT}. Navire {VESSEL}. Évt : {EVENT}. DTG {DTG}. SITREP exceptionnel suit. — {AUTHOR}, DM' },

  { id: 'notif-crise',
    label: 'Crise — activation cellule technique',
    channel: 'SMS + appel + mail',
    audience: 'VP + Heads + DO concernés',
    body: '[CMA Ships] ACTIVATION cellule technique (mode CRISE). Navire {VESSEL}. Évt : {EVENT}. DTG {DTG}. Confirmer présence salle ou remote sous 30 min. — {AUTHOR}, DM' },

  { id: 'notif-deescalation',
    label: 'Désescalade — retour NOMINAL',
    channel: 'Mail',
    audience: 'VP + Heads + DM/DO',
    body: '[CMA Ships] Désescalade. Retour mode NOMINAL à {DTG}. Suivi en routine via SITREP quotidien. RETEX programmé sous 7 jours. — {AUTHOR}, DM' },

  { id: 'notif-escalade-hod',
    label: 'Escalade Head of Department (routine)',
    channel: 'Mail + Teams',
    audience: 'Head of {DEPT} (FM/CR/FU)',
    body: 'Bonjour,\n\nFriction signalée bloc {DEPT} — Navire {VESSEL}. Évt : {EVENT}. DTG {DTG}.\nMode CMA Ships actuel : {MODE}. Pas de bascule automatique — votre arbitrage est sollicité.\nDétails à suivre par mail. — {AUTHOR}, DO {DEPT}' },

  { id: 'notif-yard',
    label: 'Notification chantier (Cosco / Shanghai)',
    channel: 'Mail formel',
    audience: 'Chantier (Cosco Zhoushan / Shanghai / autre)',
    body: 'Subject: Schedule update — {VESSEL} — {DTG}\n\nDear Yard Team,\n\nFleet Upgrade CMA Ships informs you of the following development on {VESSEL}:\n\nEvent: {EVENT}\n\nWe will coordinate slot adjustment and provide a revised arrival forecast within 24h. The Duty Officer Fleet Upgrade ({AUTHOR}) remains your point of contact.\n\nBest regards,\nCMA Ships — Fleet Upgrade' },

  { id: 'notif-charterer',
    label: 'Notification affréteur / client',
    channel: 'Mail formel — single voice via FM',
    audience: 'Affréteur / client',
    body: 'Subject: Operational update — {VESSEL} — {DTG}\n\nDear Sir/Madam,\n\nCMA Ships informs you of the following development on {VESSEL}:\n\nEvent: {EVENT}\n\nOur Fleet Management team is engaged and will provide a revised schedule shortly. We thank you for your understanding.\n\nKind regards,\nCMA Ships — Fleet Management' },

  { id: 'notif-flag-tech',
    label: 'Notification État du pavillon (technique)',
    channel: 'Mail formel',
    audience: 'Flag State Administration',
    body: 'Subject: Technical notification — {VESSEL} — {DTG}\n\nDear Sir/Madam,\n\nIn accordance with applicable conventions and our reporting obligations, we hereby notify you of the following technical event on {VESSEL}:\n\nEvent: {EVENT}\n\nClassification society is engaged. A status update will follow according to the standard reporting cycle.\n\nRegards,\n{AUTHOR}\nCMA Ships — Fleet Management' }
];

// CCIR conservé pour compat (rarement utilisé en mode technique).
window.CCIR_TEMPLATE = [
  { type: 'Info clé', label: 'Disponibilité technique flotte (M/E, A/E, propulsion)', items: [] },
  { type: 'Info clé', label: 'Disponibilité équipages (Minimum Safe Manning, relèves)', items: [] },
  { type: 'Info clé', label: 'Avancement chantiers FU (Cosco, Shanghai, autres)', items: [] },
  { type: 'Confidentiel', label: 'Information NE PAS divulguer (négociations, claims P&I)', items: [] }
];
