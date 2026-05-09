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

// Organisation simplifiée de la cellule — 6 fonctions clés.
// Une fonction = une responsabilité claire ; plusieurs personnes peuvent
// être affectées sous une même fonction (binôme jour/nuit, expert, etc.).
window.ROLES = [
  { code: 'DIR', name: 'Direction de crise',
    desc: 'Pilote la cellule, valide les décisions stratégiques et la communication externe.' },
  { code: 'OPS', name: 'Cellule Opérations',
    desc: 'Pilotage opérationnel des navires (DPA, technique, sûreté CSO, HSE). Lien avec le bord.' },
  { code: 'COM', name: 'Cellule Communication',
    desc: 'Communication interne, externe, presse, familles, autorités. Single voice.' },
  { code: 'ANT', name: 'Cellule Anticipation',
    desc: 'Prospective H+6/24/72, scénarios best/likely/worst, signaux faibles.' },
  { code: 'SUP', name: 'Cellule Soutien',
    desc: 'Juridique (P&I, contentieux), HR, logistique, IT/cyber, finance, agences.' },
  { code: 'QRT', name: 'Officier de quart',
    desc: 'Astreinte 24/7, journal MEL, passations, relais nuit/jour.' }
];
