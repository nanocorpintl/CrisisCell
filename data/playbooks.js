// Playbooks maritimes — inspirés ISM Code, IMO A.1072(28), BMP5, SOLAS, ISPS,
// guidelines militaires (SALUTE, MEDEVAC 9-line) et bonnes pratiques civiles.
// Ce sont des canevas synthétiques à adapter aux procédures CMA Ships.

window.PLAYBOOKS = [
  {
    id: 'pb-piracy',
    title: 'Piraterie / Attaque armée (BMP5)',
    severity: 'crit',
    refs: ['BMP5', 'IMO MSC.1/Circ.1334', 'ISPS Code'],
    steps: [
      'Activer signal SSAS (Ship Security Alert System)',
      'Émettre alerte UKMTO / MSCHOA / MDAT-GoG selon zone',
      'Augmenter niveau ISPS (MARSEC) à 3 si requis',
      'Consigner équipage en citadelle si protocole le prévoit',
      'Manœuvres défensives : cap au vent + max speed, lances incendie',
      'Diffuser SALUTE : Size, Activity, Location, Unit, Time, Equipment',
      'Notifier P&I, assureur H&M, club de protection',
      'Préparer SITREP initial à T+30 min, mises à jour T+H',
      'Si prise d\'otages : NE PAS communiquer publiquement, briefer cellule familles',
      'Activer cellule juridique (KR&R - kidnap & ransom) et autorités État du pavillon'
    ]
  },
  {
    id: 'pb-fire',
    title: 'Incendie majeur à bord',
    severity: 'crit',
    refs: ['SOLAS Ch.II-2', 'ISM Emergency Plan', 'IMO MSC.1/Circ.1666'],
    steps: [
      'Sonner alerte générale, dénombrement équipage point de rassemblement',
      'Localiser et confiner le feu : fermeture portes étanches, ventilation OFF',
      'Activer équipes lutte incendie (boundary cooling, extinction)',
      'Émettre PAN-PAN ou MAYDAY selon gravité (GMDSS)',
      'Notifier MRCC compétent, État du pavillon, État côtier',
      'Préparer décision abandon navire (LSA)',
      'Cellule conteneurs dangereux : vérifier IMDG, BL, manifeste',
      'Cellule pollution : pré-positionner SOPEP / SMPEP',
      'SITREP T+0, T+30, T+H, photos et vidéos horodatées',
      'Activer plan continuité commercial : reroutage cargaisons sensibles'
    ]
  },
  {
    id: 'pb-collision',
    title: 'Abordage / Collision',
    severity: 'high',
    refs: ['COLREG 72', 'SOLAS V', 'MARPOL Annex I'],
    steps: [
      'S\'assurer de la sécurité des personnes (dénombrement)',
      'Évaluer intégrité structurelle (gîte, assiette, voies d\'eau)',
      'Échanger informations OBLIGATOIRES avec autre navire (COLREG)',
      'Prévenir VTS, MRCC, État du pavillon, État côtier',
      'Préserver preuves : VDR, ECDIS, route logs, conversations VHF',
      'Constituer cellule juridique : déclaration mer, P&I correspondant',
      'Évaluer pollution : déclencher SOPEP si rejet hydrocarbures',
      'Inspection structurelle : classification society on-call',
      'Communication maîtrisée : single voice via Press Officer',
      'SITREP initial vers HQ et armateurs/affréteurs concernés'
    ]
  },
  {
    id: 'pb-grounding',
    title: 'Échouement',
    severity: 'high',
    refs: ['IMO Resolution A.852(20)', 'MARPOL Annex I'],
    steps: [
      'Stopper machine, évaluer état du navire',
      'Sondages compartiments, vérifier intégrité de la coque',
      'Notifier VTS, MRCC, État côtier (obligation)',
      'Activer SOPEP en pré-positionnement',
      'Coordination remorquage / assistance (LOF Lloyd\'s Open Form ?)',
      'Évaluer balayage marées et fenêtre de sortie',
      'Cellule allègement (lightering) si nécessaire',
      'Surveiller dérive, ancrage de précaution',
      'Documenter : photos, profils sondages, météo, courants',
      'SITREP T+0, T+1H, puis cycle 6H'
    ]
  },
  {
    id: 'pb-mob',
    title: 'Homme à la mer (MOB)',
    severity: 'high',
    refs: ['SOLAS Ch.III', 'IAMSAR Volume III'],
    steps: [
      'Sonner alerte MOB, lancer bouée + fumigène',
      'Marquer position (MOB button GPS/ECDIS)',
      'Manœuvre Williamson / Anderson / Scharnow selon situation',
      'Émettre MAYDAY RELAY si autres navires à proximité utiles',
      'Vigie 360° en permanence avec jumelles',
      'Notifier MRCC + État du pavillon',
      'Préparer canot de récupération + équipe SAR du bord',
      'Délais de survie : eau froide < 1H, eau tempérée < 6H',
      'Cellule famille : préparer prise de contact si non-récupération T+H',
      'Documenter exhaustivement : timeline, météo, position, témoignages'
    ]
  },
  {
    id: 'pb-medical',
    title: 'Évacuation médicale (MEDEVAC) — 9-Line',
    severity: 'high',
    refs: ['IAMSAR Vol III', 'TMAS', 'MEDEVAC 9-Line NATO'],
    steps: [
      '1. Position pickup (Lat/Long ou bearing/distance d\'un point)',
      '2. Fréquence / indicatif radio sur site',
      '3. Nombre de patients par priorité (urgent/priority/routine)',
      '4. Équipement spécial requis (ventilateur, civière, treuil)',
      '5. Patients par type (litière / valide)',
      '6. Sécurité du site / pavillon ou couleur balisage',
      '7. Méthode marquage (fumigène, projecteur, panneau)',
      '8. Nationalité et statut patient',
      '9. NBC ou risques particuliers (contamination, agitation)',
      'Contact TMAS (Telemedical Maritime Assistance Service)',
      'Préparer fiche patient + ATCD + traitements en cours'
    ]
  },
  {
    id: 'pb-cyber',
    title: 'Incident cyber (navire ou IT siège)',
    severity: 'high',
    refs: ['IMO MSC-FAL.1/Circ.3', 'BIMCO Cyber Guidelines v4', 'NIST 800-61'],
    steps: [
      'Identifier : système touché (ECDIS, GMDSS, IT, OT)',
      'Isoler : déconnecter du réseau, basculer en mode dégradé manuel',
      'Préserver : ne pas éteindre, snapshots, logs SIEM',
      'Notifier RSSI / SOC siège + DPO si données perso',
      'Évaluer impact navigation et sécurité maritime — PAN-PAN si nécessaire',
      'Activer plan continuité IT : navigation papier, comms alternatives',
      'Coordonner CERT national / autorités (ANSSI, État du pavillon)',
      'Communication contrôlée — risque medias et ransomware',
      'Préparer notification clients/assureur cyber (délais courts)',
      'Post-mortem : RCA, IOC, leçons retenues, plan de remédiation'
    ]
  },
  {
    id: 'pb-pollution',
    title: 'Pollution / Rejet hydrocarbures',
    severity: 'high',
    refs: ['MARPOL Annex I', 'OPRC 90', 'SOPEP / SMPEP'],
    steps: [
      'Stopper la source (vannes, transferts, pompage)',
      'Activer SOPEP (Shipboard Oil Pollution Emergency Plan)',
      'Notifier État côtier le plus proche + État du pavillon (obligation MARPOL)',
      'Estimer volume + nature produit (FO, MGO, lube, chimique IBC)',
      'Notifier P&I Club (correspondants locaux)',
      'Cellule technique : trim/list pour limiter rejets',
      'Préparer ressources : barrages, dispersants si autorisés, skimmers',
      'Documenter : photos, vidéos, prélèvements si possible',
      'Communication : single voice, pas de spéculation volumes',
      'Déclencher cellule juridique anticipation contentieux pénal/civil'
    ]
  },
  {
    id: 'pb-security',
    title: 'Menace sécurité (sûreté ISPS niveau 3)',
    severity: 'crit',
    refs: ['ISPS Code', 'SOLAS XI-2', 'IMO MSC/Circ.1106'],
    steps: [
      'Activer SSAS, alerter CSO (Company Security Officer)',
      'Élever MARSEC au niveau requis (1/2/3)',
      'Renforcer rondes, contrôles d\'accès, fouilles',
      'Notifier autorités État du pavillon + Recognized Security Organization',
      'Coordination Marines / forces navales selon zone',
      'Confidentialité absolue : info partagée besoin d\'en connaître',
      'Préserver Ship Security Records (SSR)',
      'Cellule équipage : briefing, soutien psychologique',
      'Cellule familles : ligne dédiée, anti-fuite presse',
      'SITREP chiffré si possible, canaux sécurisés'
    ]
  },
  {
    id: 'pb-stowaway',
    title: 'Passagers clandestins',
    severity: 'med',
    refs: ['IMO FAL.11(37)', 'P&I Stowaway Guidance'],
    steps: [
      'Sécuriser personnes découvertes, séparation, soins basiques',
      'Identifier (photo, empreintes), interroger nationalité, port d\'embarquement',
      'Notifier P&I Club immédiatement',
      'Notifier État du pavillon + État côtier prochain port',
      'Ne PAS débarquer sans accord écrit autorités locales',
      'Mettre en place régime de garde 24/7',
      'Documenter : repas, soins médicaux, traitement humain',
      'Cellule juridique : risque sanctions État pavillon',
      'Coordination agent maritime port suivant',
      'Préparer dossier complet pour HCR si demande asile'
    ]
  },
  {
    id: 'pb-cargo',
    title: 'Avarie cargaison / IMDG',
    severity: 'high',
    refs: ['IMDG Code', 'SOLAS Ch.VII', 'CTU Code'],
    steps: [
      'Localiser conteneur(s) impacté(s) — bay/row/tier',
      'Consulter manifeste IMDG : UN number, classe, EmS',
      'Appliquer EmS (Emergency Schedule) : Fire / Spillage',
      'Évacuer zone selon distance EmS',
      'Notifier État du pavillon + État côtier + chargeur',
      'Cellule technique : refroidissement boundary, isolation',
      'Évaluer reroutage / port refuge',
      'Prévenir P&I + assurance cargaison',
      'Documenter chaîne thermique si reefer',
      'Préparer Letter of Protest / déclaration mer'
    ]
  },
  {
    id: 'pb-deserteur',
    title: 'Désertion / Disparition équipage à quai',
    severity: 'med',
    refs: ['MLC 2006', 'ISPS', 'Procédures agent'],
    steps: [
      'Vérifier dénombrement, dernière position connue',
      'Recouper avec contrôles d\'accès passerelle',
      'Notifier agent + autorités portuaires + immigration',
      'Notifier État du pavillon (obligation MLC)',
      'Sécuriser effets personnels du marin',
      'Contact familles via cellule RH dédiée',
      'Coordination relève d\'équipage si départ imminent',
      'Documenter timeline et témoignages',
      'Cellule juridique : risque procédure manning agent',
      'Évaluer impact rotation et certification minimum manning'
    ]
  }
];

// Modèles de SITREP — base NATO 5 paragraphes adaptés contexte armatorial.
window.SITREP_TEMPLATE = `=================== SITREP — CMA SHIPS ===================
DTG          : {DTG}
SITREP N°    : {NUM}
ORIGINE      : Cellule de Crise CMA Ships
DESTINATAIRE : {DEST}
CLASSIFICATION : {CLASSIF}
NIVEAU ALERTE : {ALERT}
OPS PERIOD   : {OPS}

1. SITUATION GENERALE
{SITUATION}

2. INCIDENT(S) ACTIF(S)
{INCIDENTS}

3. NAVIRES IMPACTES
{VESSELS}

4. ACTIONS MENEES
{ACTIONS_DONE}

5. ACTIONS EN COURS / A VENIR
{ACTIONS_PLANNED}

6. DECISIONS CLES
{DECISIONS}

7. EVALUATION RISQUE / EVOLUTION ATTENDUE
{ASSESSMENT}

8. DEMANDES / SUPPORT REQUIS
{REQUESTS}

9. PROCHAIN SITREP
{NEXT_SITREP}

------------------------------------------------------------
SIGNATURE : {SIGNATURE}
==========================================================`;

// CCIR — Commander's Critical Information Requirements
// PIR (Priority Intelligence Requirements), FFIR (Friendly Force IR), EEFI (Essential Elements of Friendly Information)
window.CCIR_TEMPLATE = [
  { type: 'PIR', label: 'Évolution de la menace (météo, géopolitique, technique)', items: [] },
  { type: 'PIR', label: 'Position et état navires en zone à risque', items: [] },
  { type: 'FFIR', label: 'État équipage et capacité opérationnelle', items: [] },
  { type: 'FFIR', label: 'Disponibilité ressources (remorqueurs, salvage, P&I)', items: [] },
  { type: 'EEFI', label: 'Information NE PAS divulguer (positions sensibles, négociations)', items: [] }
];

// OPORD template — format militaire NATO 5 paragraphes
window.OPORD_TEMPLATE = `=================== OPORD — CMA SHIPS ===================
DTG          : {DTG}
OPORD N°     : {NUM}
ÉMETTEUR     : {ISSUER}
DESTINATAIRE : {DEST}
CLASSIFICATION : {CLASSIF}
RÉFÉRENCE    : {REF}

1. SITUATION
   a) Contexte / menace
{SIT_CONTEXT}
   b) Forces amies / ressources
{SIT_FRIENDLY}
   c) Hypothèses
{SIT_ASSUMPTIONS}

2. MISSION
   QUI fait QUOI, QUAND, OÙ, et POURQUOI (intention)
{MISSION}

3. EXÉCUTION
   a) Intention du Crisis Manager
{INTENT}
   b) Concept d'opération (manœuvre + appui)
{CONCEPT}
   c) End-state (situation finale recherchée)
{END_STATE}
   d) No-go criteria (critères d'arrêt)
{NOGO}
   e) Tâches par cellule
{TASKS}
   f) Coordination (timing, points de contrôle)
{COORDINATION}

4. SOUTIEN / LOGISTIQUE
   Salvage, P&I, agences, médical, juridique, communication
{SUPPORT}

5. COMMANDEMENT ET TRANSMISSIONS
   a) Chaîne de commandement
{COMMAND_CHAIN}
   b) Canaux et fréquences
{COMMS}
   c) Cadence des SITREP
{REPORTING}

------------------------------------------------------------
SIGNATURE : {SIGNATURE}
=========================================================`;

// Échelle de gravité maritime — adaptée INES (nucléaire) à 8 niveaux
window.SEVERITY_SCALE = [
  { level: 0, label: 'Écart',                 desc: 'Aucun impact sécurité ou environnement', color: 'green' },
  { level: 1, label: 'Anomalie',              desc: 'Anomalie mineure, traitement de routine', color: 'green' },
  { level: 2, label: 'Incident',              desc: 'Incident sans conséquence majeure', color: 'yellow' },
  { level: 3, label: 'Incident sérieux',      desc: 'Conséquences locales bord, défense en profondeur dégradée', color: 'yellow' },
  { level: 4, label: 'Accident sans impact extérieur', desc: 'Dommage navire / cargaison, pas de pollution majeure', color: 'orange' },
  { level: 5, label: 'Accident à conséquences locales', desc: 'Pollution, victimes, retentissement médiatique', color: 'orange' },
  { level: 6, label: 'Accident grave',        desc: 'Atteinte structurelle majeure, victimes multiples, pollution étendue', color: 'red' },
  { level: 7, label: 'Accident majeur',       desc: 'Naufrage, pertes humaines lourdes, crise nationale/internationale', color: 'red' }
];

// ROE — Rules of Engagement maritimes (BMP5 / use of force continuum)
window.ROE_LEVELS = [
  { level: 1, label: 'Vigilance', desc: 'Veille passive, observation, renforcement vigies' },
  { level: 2, label: 'Mesures passives', desc: 'Routage modifié, augmentation vitesse, citadelles préparées' },
  { level: 3, label: 'Mesures actives non létales', desc: 'Lances incendie, fil barbelé, signaux dissuasifs, manoeuvres' },
  { level: 4, label: 'Coordination forces armées', desc: 'Marines, escorte, équipe protection embarquée (PCASP)' },
  { level: 5, label: 'Légitime défense', desc: 'Recours à la force conformément droit international, validation juridique' }
];

// Phases de cinétique de crise — REX nucléaire et marine
window.CRISIS_PHASES = [
  { code: 'reflex', label: 'RÉFLEXE',
    desc: 'Action immédiate au plus près de l\'événement. Règle des 3R : Reculer, Rendre compte, Réfléchir. Décisions par procédure et délégation.' },
  { code: 'concert', label: 'CONCERTÉE',
    desc: 'Cellule constituée, COP établi, OPORD en cours. Décisions par battle rhythm, RETEX en boucle courte.' },
  { code: 'post', label: 'POST-CRISE',
    desc: 'Sortie de crise, retour à la normale, RETEX formel, capitalisation, communication post-incident.' }
];

// AAR — After-Action Review (US Army FM 6-22, repris ICS)
window.AAR_QUESTIONS = [
  { code: 'expected', label: 'Que devait-il se passer ?',
    hint: 'Plan initial, intention du commandement, mission, end-state attendu' },
  { code: 'actual', label: 'Que s\'est-il passé ?',
    hint: 'Faits observés, chronologie réelle, décisions prises, résultats' },
  { code: 'gap', label: 'Pourquoi y a-t-il une différence ?',
    hint: 'Causes racines, contraintes, défaillances, surprises, frictions' },
  { code: 'improve', label: 'Que devons-nous améliorer / pérenniser ?',
    hint: 'Lessons Identified → Lessons Learned : actions concrètes pour éviter récidive ou répliquer succès' }
];

// Trame Passation de quart — naval watch handover, complétée NRC ICS Form 201
window.HANDOVER_CHECKLIST = [
  'Niveau d\'alerte courant et incidents actifs',
  'Position et état de chaque navire impacté',
  'Décisions prises pendant le quart, en attente de validation',
  'Actions ouvertes critiques (P1) et leurs échéances',
  'Communications en cours / réponses attendues',
  'Engagements externes (autorités, P&I, médias) prévus',
  'Ressources mobilisées : ETA, statut',
  'Zones de vigilance / risques émergents',
  'Décisions sensibles à éviter / no-go criteria',
  'Documents et coordonnées partagés (canal, lien, classification)'
];

// Organisation CMA Ships — VP + 3 Heads + couche de permanence
// (1 Duty Manager Marseille + 3 Duty Officers Asie-Pacifique).
// Voir Note d'organisation CMA Ships.
window.ROLES = [
  { code: 'VP',   name: 'Vice-President CMA Ships',
    desc: 'Stratégique : Group MM hebdo, relations Groupe, clients stratégiques, autorités, RH N-1. Autorité ultime.' },
  { code: 'HFM',  name: 'Head of Fleet Management',
    desc: 'Hiérarchique équipe FM, décisions structurantes département, profondeur métier.' },
  { code: 'HCR',  name: 'Head of Crewing',
    desc: 'Hiérarchique équipe Crewing, décisions structurantes département.' },
  { code: 'HFU',  name: 'Head of Fleet Upgrade',
    desc: 'Hiérarchique équipe FU, décisions structurantes département.' },
  { code: 'DM',   name: 'Duty Manager Marseille',
    desc: 'Couche permanence — rotation hebdo. Anime Daily 09:00, consolide SITREP, tient Duty Log, escalade au VP.' },
  { code: 'DOFM', name: 'Duty Officer FM — Singapour HO',
    desc: 'Permanence FM Asie-Pacifique (rotation hebdo). Produit SITREP départemental, monitoring nuit Europe.' },
  { code: 'DOCR', name: 'Duty Officer Crewing — Singapour HO',
    desc: 'Permanence Crewing Asie-Pacifique (rotation hebdo).' },
  { code: 'DOFU', name: 'Duty Officer Fleet Upgrade — Chine',
    desc: 'Permanence FU Asie-Pacifique (Cosco Zhoushan, Shanghai). Project Managers sur sites.' }
];

// Les 3 départements core business CMA Ships.
window.DEPARTMENTS = [
  { code: 'FM', label: 'Fleet Management',  doLocation: 'Singapour HO',          headRole: 'HFM', doRole: 'DOFM' },
  { code: 'CR', label: 'Crewing',           doLocation: 'Singapour HO',          headRole: 'HCR', doRole: 'DOCR' },
  { code: 'FU', label: 'Fleet Upgrade',     doLocation: 'Chine — site',          headRole: 'HFU', doRole: 'DOFU' },
  { code: 'XX', label: 'Transverse / autre', doLocation: '',                     headRole: '',    doRole: '' }
];

// Modes opérationnels CMA Ships — alignés sur statut global SITREP.
window.MODES = [
  { code: 'nominal',   label: 'Nominal',   statut: 'VERT',  color: 'green',
    desc: 'Fonctionnement courant — MOC seul, SITREP quotidien, rituels standard.' },
  { code: 'vigilance', label: 'Vigilance', statut: 'AMBRE', color: 'amber',
    desc: 'Renforcement — frictions actives, points d\'attention, HoD informés.' },
  { code: 'crise',     label: 'Crise',     statut: 'ROUGE', color: 'red',
    desc: 'Cellule de crise activée — VP impliqué, battle rhythm court, escalade Groupe.' }
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
  • Alertes sécurité 24 h   : {ALERTS_24H}

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

// Conservé pour compat ascendante des triggers : alias vers les MODES CMA.
window.POSTURES = window.MODES;

// Critères de déclenchement — chaque trigger applique automatiquement
// une posture + un niveau d'alerte si déclaré par le MOC.
window.TRIGGERS = [
  // ---- Auto-T2 / ROUGE ----
  { id: 'trg-ssas', cat: 'Sûreté', label: 'Alerte SSAS reçue',
    desc: 'Ship Security Alert System déclenché — menace sûreté avérée.',
    mode: 'crise', incidentType: 'Sûreté' },
  { id: 'trg-mayday', cat: 'Sécurité', label: 'MAYDAY / détresse vérifiée',
    desc: 'Vie humaine en danger imminent, navire/équipage en détresse.',
    mode: 'crise', incidentType: 'Autre' },
  { id: 'trg-fire-major', cat: 'Sécurité', label: 'Incendie majeur non maîtrisé',
    desc: 'Incendie non éteint à T+30 min ou propagation hors compartiment.',
    mode: 'crise', incidentType: 'Incendie' },
  { id: 'trg-collision-cas', cat: 'Sécurité', label: 'Collision avec pertes humaines',
    desc: 'Abordage avec décès ou disparus.',
    mode: 'crise', incidentType: 'Collision' },
  { id: 'trg-hostage', cat: 'Sûreté', label: 'Prise d\'otages confirmée',
    desc: 'Équipage retenu, négociation requise.',
    mode: 'crise', incidentType: 'Piraterie' },
  { id: 'trg-ais-loss', cat: 'Sûreté', label: 'Perte AIS en zone HRA > 30 min',
    desc: 'Disparition signal AIS d\'un navire en High Risk Area.',
    mode: 'crise', incidentType: 'Sûreté' },
  { id: 'trg-sinking', cat: 'Sécurité', label: 'Naufrage / abandon imminent',
    desc: 'Mise à l\'eau des LSA, navire perdu.',
    mode: 'crise', incidentType: 'Autre' },

  // ---- Auto-T1 / ORANGE ----
  { id: 'trg-medevac', cat: 'Médical', label: 'MEDEVAC requis',
    desc: 'Évacuation médicale d\'un membre d\'équipage.',
    mode: 'vigilance', incidentType: 'Médical' },
  { id: 'trg-death', cat: 'Médical', label: 'Décès à bord',
    desc: 'Décès d\'un membre d\'équipage ou passager.',
    mode: 'vigilance', incidentType: 'Médical' },
  { id: 'trg-grounding', cat: 'Sécurité', label: 'Échouement',
    desc: 'Navire échoué, intégrité à évaluer.',
    mode: 'vigilance', incidentType: 'Échouement' },
  { id: 'trg-collision', cat: 'Sécurité', label: 'Collision sans victime',
    desc: 'Abordage sans pertes humaines, dommages à évaluer.',
    mode: 'vigilance', incidentType: 'Collision' },
  { id: 'trg-pollution', cat: 'Environnement', label: 'Pollution / rejet > 1 m³',
    desc: 'Rejet hydrocarbures ou produit chimique au-delà du seuil.',
    mode: 'vigilance', incidentType: 'Pollution' },
  { id: 'trg-cyber-ot', cat: 'Cyber', label: 'Cyber-incident OT confirmé',
    desc: 'Compromission ECDIS, GMDSS, machine ou équipement de navigation.',
    mode: 'vigilance', incidentType: 'Cyber' },
  { id: 'trg-psc-detention', cat: 'Réglementaire', label: 'Détention PSC',
    desc: 'Port State Control immobilise le navire.',
    mode: 'vigilance', incidentType: 'Sûreté' },
  { id: 'trg-press', cat: 'Médiatique', label: 'Mention presse navire CMA',
    desc: 'Apparition d\'un navire CMA dans la presse / réseaux sociaux sur incident.',
    mode: 'vigilance', incidentType: 'Autre' },
  { id: 'trg-mob', cat: 'Sécurité', label: 'Homme à la mer (MOB)',
    desc: 'MOB confirmé, manœuvre de récupération en cours.',
    mode: 'vigilance', incidentType: 'MOB' },

  // ---- Vigilance JAUNE (le MOC suit, pas de mobilisation) ----
  { id: 'trg-skiff', cat: 'Sûreté', label: 'Approche suspecte (skiff)',
    desc: 'Embarcation non identifiée s\'approche, pas d\'agression confirmée.',
    mode: 'vigilance', incidentType: 'Piraterie' },
  { id: 'trg-weather', cat: 'Environnement', label: 'Météo extrême sur route',
    desc: 'Cyclone tropical, glace, état de mer > 9 sur route prévue.',
    mode: 'vigilance', incidentType: 'Autre' },
  { id: 'trg-geopol', cat: 'Sûreté', label: 'Tension géopolitique sur transit',
    desc: 'Bab-el-Mandeb, Hormuz, Taïwan, mer Noire — escalade en cours.',
    mode: 'vigilance', incidentType: 'Sûreté' },
  { id: 'trg-stowaway', cat: 'Sûreté', label: 'Clandestins à bord',
    desc: 'Découverte de passagers clandestins.',
    mode: 'vigilance', incidentType: 'Sûreté' },
  { id: 'trg-psc-major', cat: 'Réglementaire', label: 'Déficience PSC majeure',
    desc: 'Inspection PSC avec déficience non détaining mais sérieuse.',
    mode: 'vigilance', incidentType: 'Sûreté' }
];

// Modèles de notification — single voice, à adapter avant envoi.
// Variables disponibles : {VESSEL} {EVENT} {DTG} {AUTHOR} {LEVEL} {POSTURE}
window.NOTIF_TEMPLATES = [
  { id: 'notif-prealert',
    label: 'Pré-alerte cellule (T1)',
    channel: 'SMS / Telegram',
    audience: 'Fonctions clés (DIR, OPS, COM)',
    body: '[CMA-CRISIS] Pré-alerte cellule (T1). Navire {VESSEL}. Évt: {EVENT}. DTG {DTG}. Conf-call sous 15 min, ligne dédiée. — {AUTHOR}' },

  { id: 'notif-activation',
    label: 'Activation cellule de crise (T2)',
    channel: 'SMS + appel + mail',
    audience: 'Toutes fonctions cellule',
    body: '[CMA-CRISIS] ACTIVATION cellule de crise (T2). Niveau {LEVEL}. Navire {VESSEL}. Évt: {EVENT}. DTG {DTG}. Salle de crise + remote. Confirmer présence. — {AUTHOR}' },

  { id: 'notif-deescalation',
    label: 'Désescalade vers T0',
    channel: 'SMS / mail',
    audience: 'Cellule + autorités',
    body: '[CMA-CRISIS] Désescalade. Retour posture T0 / niveau VERT à {DTG}. Suivi confié au MOC. RETEX programmé. — {AUTHOR}' },

  { id: 'notif-mayday-ack',
    label: 'Ack interne MAYDAY reçu',
    channel: 'Mail + Telegram',
    audience: 'DPA-Watch → DIR / OPS',
    body: '[CMA-MOC] MAYDAY reçu de {VESSEL} à {DTG}. Position transmise MRCC. Cellule en cours d\'activation. Maintien comm avec le bord. — {AUTHOR}' },

  { id: 'notif-press-hold',
    label: 'Holding statement presse',
    channel: 'Mail',
    audience: 'COM → presse',
    body: 'CMA Ships confirme avoir connaissance d\'un événement impliquant le navire {VESSEL} survenu à {DTG}. Toutes les ressources sont mobilisées. La sécurité de l\'équipage est notre priorité absolue. Une cellule de crise est activée et coopère pleinement avec les autorités compétentes. Une mise à jour sera communiquée dès que des éléments fiables et vérifiés seront disponibles.' },

  { id: 'notif-flag-state',
    label: 'Notification État du pavillon',
    channel: 'Mail formel',
    audience: 'État du pavillon',
    body: 'Subject: Casualty notification — {VESSEL} — {DTG}\n\nDear Sir/Madam,\n\nIn accordance with our reporting obligations under the ISM Code and applicable conventions, we hereby notify you of the following event:\n\nVessel: {VESSEL}\nDate/Time: {DTG}\nEvent: {EVENT}\n\nA crisis cell has been activated. Further reports will follow according to standard SITREP cycle (every 6 hours).\n\nRegards,\n{AUTHOR}\nCMA Ships — Crisis Cell' },

  { id: 'notif-families',
    label: 'Cellule familles — premier contact',
    channel: 'Téléphone',
    audience: 'HR / SUP',
    body: 'Bonjour, je suis {AUTHOR} de la cellule familles de CMA Ships. Je vous appelle car votre proche {…} fait partie de l\'équipage du {VESSEL}. Un événement est survenu à {DTG}, votre proche est [en sécurité / pris en charge / …]. Une ligne dédiée vous est ouverte 24/7 : {…}. Nous reviendrons vers vous dans les prochaines heures avec des informations vérifiées.' }
];
