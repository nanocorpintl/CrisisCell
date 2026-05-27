// CMA Ships — Operational continuity (technical & crew availability).
// Doctrinal reference : Organization Note, Daily/Weekly Operations,
// Duty Manager / Duty Officer JDs, SITREP template.
//
// Scope: technical vessel availability (FM), crew availability (Crewing),
// shipyard project progress (Fleet Upgrade). Safety, security and
// environment (SSE) are managed by the dedicated SSE tool and are NOT
// covered here.

// ============================================================
//   TECHNICAL & CREWING PLAYBOOKS
// ============================================================
window.PLAYBOOKS = [
  {
    id: 'pb-me-failure',
    title: 'Main engine (M/E) failure',
    severity: 'crit',
    refs: ['Class society manual', 'ISM', 'Charter party'],
    steps: [
      'Stop / reduce speed per Chief Engineer recommendation',
      'Diagnose with Chief + report to FM (Smartship, photos, parameters)',
      'Notify Head of Fleet Management + DO FM (Singapore)',
      'Notify classification society (LR/BV/NK/DNV/CCS) — class on-call',
      'Evaluate need for PAN-PAN call (master to decide — SSE if required)',
      'Estimate ETD for repair (part lead time, ETA part, shore team availability)',
      'Coordinate charterer / clients via FM — prepare Letter Of Protest',
      'Assess rerouting / port of refuge or unplanned drydock',
      'Notify P&I and H&M if major damage or commercial loss',
      'Document for SITREP — feed Frictions block under FM'
    ]
  },
  {
    id: 'pb-ae-failure',
    title: 'Auxiliary engine (A/E) — power generation',
    severity: 'high',
    refs: ['Class society manual', 'ISM'],
    steps: [
      'Identify affected A/E, isolate fault, transfer load',
      'Verify remaining reefer + hotel load capacity',
      'Limit reefer plug count if necessary (LOP to shipper)',
      'Notify Head FM + DO FM, schedule shore team intervention',
      'Spare part logistics: ETA, customs clearance, transit',
      'Assess impact on next port (reefer cut-off, shore power)',
      'Commercial coordination via FM — charterers and reefer clients',
      'Add Friction to FM block of the SITREP'
    ]
  },
  {
    id: 'pb-propulsion',
    title: 'Propulsion failure (CPP, shaft line, rudder)',
    severity: 'crit',
    refs: ['Class society manual', 'IMO Resolution A.852(20)'],
    steps: [
      'Stop engine, safe position, anchor if possible',
      'Structural diagnostic — shaft line, bearing, CPP hub',
      'Mandatory class society on-call',
      'Assess drift — coordinate towage (LOF Lloyd\'s Open Form?)',
      'Notify Head FM + DO FM, escalate to DM Marseille',
      'Drydock window — coordinate with FU + Cosco/Shanghai',
      'Notify P&I, H&M, charterer',
      'Plan B logistics: transhipment, lightering, port of refuge',
      'Friction in FM block + transverse to FU if shipyard required'
    ]
  },
  {
    id: 'pb-drydock-unplanned',
    title: 'Unplanned drydock / emergency docking',
    severity: 'high',
    refs: ['Class society manual', 'Charter party'],
    steps: [
      'Identify available shipyard (Cosco Zhoushan, Shanghai, alternatives)',
      'Coordinate Head FU + DO FU (China) — slot availability',
      'Estimate duration + cost (vs unplanned budget)',
      'Cargo logistics: transhipment, deviation',
      'Crew: permits, immigration, early reliefs if long stop',
      'Class society: inspection program + survey',
      'Notify charterers, adjust schedule',
      'Transverse friction: FM ↔ FU on slot and sequencing',
      'Add to "24-72h deadlines" FU block of the SITREP'
    ]
  },
  {
    id: 'pb-retrofit',
    title: 'Retrofit / Phase-in / Phase-out',
    severity: 'med',
    refs: ['FU project plan', 'Class society', 'Charter party'],
    steps: [
      'Validate Cosco Zhoushan / Shanghai schedule with DO FU',
      'Pareto follow-up on delivery (review at D-8 before delivery)',
      'Check bunker readiness (LNG, methanol, dual-fuel)',
      'Sea trial planning + class attendance',
      'Crewing coordination for phase-in crew',
      'Ceremony / press preparation if official phase-in',
      'Phase-out: cargo discharge, crew off-signed, document transfer',
      'Add to "Today\'s cases" FU block of the SITREP'
    ]
  },
  {
    id: 'pb-psc-detention',
    title: 'Port State Control detention',
    severity: 'high',
    refs: ['Paris MoU / Tokyo MoU', 'SOLAS / MLC', 'Class society'],
    steps: [
      'Get detailed PSC report — list of deficiencies',
      'Notify Head FM + DO FM + DM Marseille',
      'Item-by-item corrective action plan',
      'Class society / Recognized Organization for verification',
      'Notify Flag State',
      'Coordinate with Crewing if manning or STCW deficiency',
      'Estimate duration + release cost',
      'Communicate to charterers and clients — port call delay',
      'Add Friction to FM block + transverse rotation impact'
    ]
  },
  {
    id: 'pb-bunker',
    title: 'Faulty bunkering (quality or delay)',
    severity: 'med',
    refs: ['ISO 8217', 'MARPOL Annex VI', 'Charter party'],
    steps: [
      'Suspend bunkering / consumption of suspect product',
      'Normalised sampling + send to laboratory',
      'Letter Of Protest (LOP) to supplier',
      'Assess operational impact: autonomy, next bunker-capable port',
      'Coordinate FM + Bunker procurement',
      'Alternative re-bunker — cost + delay',
      'Notify charterer if significant delay',
      'Bunker supplier monitoring → Weak signal in SITREP if recurring'
    ]
  },
  {
    id: 'pb-cargo-damage',
    title: 'Cargo damage / material loss',
    severity: 'med',
    refs: ['Charter party', 'CTU Code', 'Hague-Visby Rules'],
    steps: [
      'Locate affected container(s) — bay/row/tier',
      'Time-stamped photos + videos, witness statements',
      'Immediate Letter Of Protest',
      'Notify P&I + cargo insurer',
      'Coordinate FM + commercial',
      'If reefer: cold chain log + claims',
      'Documentation for SITREP — FM block, transverse friction if key client'
    ]
  },
  {
    id: 'pb-manning',
    title: 'Manning shortage / Minimum Safe Manning',
    severity: 'high',
    refs: ['MLC 2006', 'STCW', 'Flag SDOC'],
    steps: [
      'Identify vacant positions (officers/ratings, critical functions)',
      'Notify Head Crewing + DO Crewing (Singapore)',
      'Assess Minimum Safe Manning compliance risk (SDOC)',
      'Coordinate manning agents (Manila, Asia agents)',
      'Relief logistics: flights, visas, hotels, port transport',
      'Plan B: HQ officer embarkation, contract extension',
      'Inform master + ship of replacement progress',
      'Add to "24-72h deadlines" Crewing block of the SITREP'
    ]
  },
  {
    id: 'pb-medevac-crewing',
    title: 'MEDEVAC — crewing operational impact',
    severity: 'high',
    refs: ['MLC 2006', 'P&I'],
    steps: [
      'SSE (medical) coordinates → Crewing takes the operational follow-up',
      'Identify the vacant post after evacuation — Minimum Safe Manning check',
      'Prepare replacement: flight, visa, briefing',
      'Transport logistics next port',
      'P&I, charter party, salary claims documentation',
      'Inform master of the replacement chain',
      'Add to "Today\'s cases" Crewing block'
    ]
  },
  {
    id: 'pb-certification',
    title: 'Crew certification / training — expiry',
    severity: 'med',
    refs: ['STCW', 'MLC 2006', 'CII / BV training'],
    steps: [
      'Identify the seafarer + nearly-expiring certificate (STCW, medical, GMDSS)',
      'Plan: fast-track training or relief',
      'Coordinate Crewing + Manila / Asia agents',
      'Verify Flag State equivalence if urgent renewal needed',
      'Prepare POEA audit / agency dossier if applicable',
      'Inform master, confirm Minimum Safe Manning',
      'Add to "24-72h deadlines" Crewing block'
    ]
  },
  {
    id: 'pb-vetting',
    title: 'Vetting — preparation / observation follow-up',
    severity: 'med',
    refs: ['OCIMF SIRE', 'CDI', 'Oil major client'],
    steps: [
      'Pre-inspection schedule — FM + crew preparation',
      'Brief master + Chief on historical observations',
      'Verify documentation: SMS, manuals, up-to-date certificates',
      'If vetting report: per-observation corrective plan',
      'FM ↔ commercial coordination for client information',
      'Track next vetting cycle next port',
      'Add to FM SITREP block if vetting key for rotation'
    ]
  }
];

// ============================================================
//   CMA SHIPS ORGANIZATION
// ============================================================
// VP + 3 Heads + permanence layer (1 DM Marseille + 3 DOs Asia).
// See CMA Ships Organization Note.
window.ROLES = [
  { code: 'VP',   name: 'Vice-President CMA Ships',
    desc: 'Strategic: weekly Group MM, Group relations, ultimate authority on structural decisions.' },
  { code: 'HFM',  name: 'Head of Fleet Management',
    desc: 'Line manager of the FM team, structural decisions for the department (technical, fleet operations).' },
  { code: 'HCR',  name: 'Head of Crewing',
    desc: 'Line manager of the Crewing team, structural decisions for the department (crews, agencies).' },
  { code: 'HFU',  name: 'Head of Fleet Upgrade',
    desc: 'Line manager of the FU team, structural decisions for the department (retrofits, shipyards).' },
  { code: 'DM',   name: 'Duty Manager Marseille',
    desc: 'Permanence layer — weekly rotation. Animates the 09:00 Daily, consolidates the SITREP, maintains the Duty Log, escalates to VP.' },
  { code: 'DOFM', name: 'Duty Officer FM — Singapore HO',
    desc: 'FM permanence in Asia-Pacific (weekly rotation). Produces the FM departmental SITREP, monitors during European night.' },
  { code: 'DOCR', name: 'Duty Officer Crewing — Singapore HO',
    desc: 'Crewing permanence in Asia-Pacific. Follows reliefs, certifications, Manila/Asia agents.' },
  { code: 'DOFU', name: 'Duty Officer Fleet Upgrade — China',
    desc: 'FU permanence (Cosco Zhoushan, Shanghai). On-site Project Managers — real-time shipyard follow-up.' }
];

// The 3 core business departments at CMA Ships.
window.DEPARTMENTS = [
  { code: 'FM', label: 'Fleet Management',  doLocation: 'Singapore HO',     headRole: 'HFM', doRole: 'DOFM' },
  { code: 'CR', label: 'Crewing',           doLocation: 'Singapore HO',     headRole: 'HCR', doRole: 'DOCR' },
  { code: 'FU', label: 'Fleet Upgrade',     doLocation: 'China — on-site',  headRole: 'HFU', doRole: 'DOFU' },
  { code: 'XX', label: 'Transverse / other', doLocation: '',                 headRole: '',    doRole: '' }
];

// Operational modes — pilotage by exception.
window.MODES = [
  { code: 'nominal',   label: 'Nominal',   statut: 'GREEN', color: 'green',
    desc: 'Routine operation — pilotage by exception, standard setup (Daily 09:00, SITREP 08:30).' },
  { code: 'vigilance', label: 'Watch',     statut: 'AMBER', color: 'amber',
    desc: 'Major technical or crewing friction — reinforcement, HoDs informed, close follow-up.' },
  { code: 'crise',     label: 'Crisis',    statut: 'RED',   color: 'red',
    desc: 'Normal setup suspended — technical crisis cell activated by the VP, Group escalation if relevant.' }
];

// CMA Ships SITREP — official template.
window.SITREP_CMA_TEMPLATE = `╔══════════════════════════════════════════════════════════════╗
║                    CMA SHIPS — SITREP                        ║
╚══════════════════════════════════════════════════════════════╝
{DAY}   ·   Week {WEEK}
Duty Manager Marseille: {DM_NAME}
Mode: {MODE}

──── GLOBAL STATUS: {STATUT} ────

▸ 24h SYNTHESIS
{SYNTHESIS}

▸ KPIs
  • 24h Alerts                              : {ALERTS_24H}
  • Estimated open off-hire (h)             : {OFFHIRE_HOURS}
       — FM: {OFFHIRE_FM} h · CR: {OFFHIRE_CR} h · FU: {OFFHIRE_FU} h
  • New off-hire risk this week (h)         : {OFFHIRE_WEEK}
  • YTD actual off-hire                     : {OFFHIRE_YTD} h
  • YTD target (99.5% × {N_VESSELS} vessels)            : {OFFHIRE_TARGET} h
  • YTD vs target                           : {OFFHIRE_RATIO} %

◆ POINTS FOR TOP MANAGEMENT
  Direct attention of the VP before Group MM
{TOP_MGMT_POINTS}

────────────────────────────────────────────────────────────────
  FLEET MANAGEMENT                            Status [{FM_STATUS}]
  Duty Officer (Singapore HO) — {DO_FM}
────────────────────────────────────────────────────────────────
Today's cases
{FM_DOSSIERS}

24-72 h deadlines
{FM_DEADLINES}

────────────────────────────────────────────────────────────────
  CREWING                                     Status [{CR_STATUS}]
  Duty Officer (Singapore HO) — {DO_CR}
────────────────────────────────────────────────────────────────
Today's cases
{CR_DOSSIERS}

24-72 h deadlines
{CR_DEADLINES}

────────────────────────────────────────────────────────────────
  FLEET UPGRADE                               Status [{FU_STATUS}]
  Duty Officer (China — on-site) — {DO_FU}
────────────────────────────────────────────────────────────────
Today's cases
{FU_DOSSIERS}

24-72 h deadlines
{FU_DEADLINES}
`;

// Kept for backward compatibility with triggers: alias to MODES.
window.POSTURES = window.MODES;

// ============================================================
//   AAR — After-Action Review (US Army FM 6-22)
// ============================================================
window.AAR_QUESTIONS = [
  { code: 'expected', label: 'What was supposed to happen?',
    hint: 'Initial plan, expected outcome, planned deadlines' },
  { code: 'actual', label: 'What actually happened?',
    hint: 'Facts, real timeline, decisions taken' },
  { code: 'gap', label: 'Why is there a difference?',
    hint: 'Root causes, constraints, surprises, frictions' },
  { code: 'improve', label: 'What should we improve / sustain?',
    hint: 'Lessons Identified → Lessons Learned' }
];

// ============================================================
//   DUTY MANAGER HANDOVER — weekly checklist
//   45 min, Tuesday morning (cf. Duty Manager JD)
// ============================================================
window.HANDOVER_CHECKLIST = [
  'Current operational mode + active frictions per department',
  'Open cases (FM, Crewing, Fleet Upgrade)',
  '24-72h deadlines and current Points for Top Management',
  'Decisions pending VP / Heads arbitration',
  'Asia coordination: outgoing/incoming DOs, points of contact',
  'External engagements in progress (clients, shipyards, authorities)',
  'Status of the Weekly Pack in preparation (Thursday 18:00)',
  'Active triggers and escalation chain',
  'Shared documents and SharePoint access',
  'Watch items — weak signals to monitor'
];

// ============================================================
//   TRIGGERS — escalation criteria (technical & crewing)
//   Grouped by DO (department) × axis (Technical/Regulation/...).
//   `exampleNote` pre-fills the declaration dialog to guide the DO.
//   `suggestedNotifs` lists the alert templates to suggest after firing.
// ============================================================
window.TRIGGERS = [
  // ===================== FM — Fleet Management =====================
  // ---- Technical ----
  { id: 'trg-blackout', dept: 'FM', axe: 'Technical',
    label: 'Total blackout (loss of all A/E)',
    desc: 'Total loss of electrical power, propulsion compromised.',
    mode: 'crise', incidentType: 'A/E',
    suggestedNotifs: ['notif-crise','notif-charterer','notif-flag-tech'],
    exampleNote: 'CC AMAZON — total blackout at 14:22 UTC. A/E1 and A/E2 OOO, A/E3 will not start. Emergency Generator transfer effected. Position in transit SG → SLL. Master anchored.' },
  { id: 'trg-prop-loss', dept: 'FM', axe: 'Technical',
    label: 'Total loss of propulsion in transit',
    desc: 'No remaining manoeuvring capability, possible drift.',
    mode: 'crise', incidentType: 'Propulsion',
    suggestedNotifs: ['notif-crise','notif-charterer','notif-flag-tech'],
    exampleNote: 'CC ZHENG HE — M/E stopped 02:15 UTC, cyl 9 and 10 stay bolts broken. No propulsion. Position 10°S/65°E. LOF towage coordination in progress.' },
  { id: 'trg-me-degraded', dept: 'FM', axe: 'Technical',
    label: 'M/E degraded (cylinder out, reduced speed)',
    desc: 'Partial ME failure: cyl isolated, speed reduction, schedule impacted.',
    mode: 'vigilance', incidentType: 'M/E',
    suggestedNotifs: ['notif-prealert','notif-charterer'],
    exampleNote: 'CC ZHENG HE — M/E stay bolt cyl 10 broken on 02/05, 2nd bolt broken cyl 9 on 14/05. Speed limited to 13.5 kts. Everllence calc in progress. ETA LHV 10/06 (+2 days).' },
  { id: 'trg-ae-ooo', dept: 'FM', axe: 'Technical',
    label: 'A/E OOO with reefer limitation',
    desc: 'Auxiliary out of service, reefer capacity reduced — potential claims.',
    mode: 'vigilance', incidentType: 'A/E',
    suggestedNotifs: ['notif-prealert','notif-charterer'],
    exampleNote: 'CC ARISTOTE — A/E#3 OOO due to HIMAP alarm. Troubleshooting in progress. Reefer limited to 78 units. LOP issued to shipper.' },
  { id: 'trg-cpp-partial', dept: 'FM', axe: 'Technical',
    label: 'CPP / propeller: partial failure',
    desc: 'Controllable Pitch Propeller or shaft line in degraded mode.',
    mode: 'vigilance', incidentType: 'Propulsion',
    suggestedNotifs: ['notif-prealert','notif-yard'],
    exampleNote: 'MONT VENTOUX — CPP failure, vessel berthed in Malta. First docking. Hub to be shipped to Berg (Sweden), ETA 09/05. Planning +12 days.' },

  // ---- Regulation ----
  { id: 'trg-class-susp', dept: 'FM', axe: 'Regulation',
    label: 'Imminent classification suspension',
    desc: 'Classification society threatens suspension — total immobilisation risk.',
    mode: 'crise', incidentType: 'Regulation',
    suggestedNotifs: ['notif-crise','notif-flag-tech'],
    exampleNote: 'CC NORDIC — BV signals class suspension risk after 3 conditions of class not cleared before deadline. Letter received today. Action plan required within 7 days.' },
  { id: 'trg-psc-no-release', dept: 'FM', axe: 'Regulation',
    label: 'PSC detention without release plan',
    desc: 'Port State Control holds the vessel, deficiencies unresolved > 72h.',
    mode: 'crise', incidentType: 'PSC',
    suggestedNotifs: ['notif-crise','notif-flag-tech','notif-charterer'],
    exampleNote: 'CC X — Paris MoU Antwerp detention for 72h. 7 deficiencies including 3 detainable. Class awaiting elements. Release ETA unknown.' },
  { id: 'trg-psc-detention', dept: 'FM', axe: 'Regulation',
    label: 'PSC detention with corrective plan',
    desc: 'Port State Control detention, release expected within days.',
    mode: 'vigilance', incidentType: 'PSC',
    suggestedNotifs: ['notif-prealert','notif-flag-tech','notif-charterer'],
    exampleNote: 'APL GWANGYANG — USCG Long Beach detention, CO2 fixed system deficiency. CO2 bottles landed, refilling in progress. Readiness expected 19/05.' },
  { id: 'trg-psc-routine', dept: 'FM', axe: 'Regulation',
    label: 'Routine PSC inspection — no deficiency',
    desc: 'Port State Control visit passed, to be archived.',
    mode: 'nominal', incidentType: 'PSC',
    suggestedNotifs: [],
    exampleNote: 'CC NEPTUNE — PSC Singapore today, no deficiency. Report archived.' },

  // ---- Commercial ----
  { id: 'trg-vetting-fail', dept: 'FM', axe: 'Commercial',
    label: 'Vetting failed (critical observation)',
    desc: 'OCIMF SIRE / CDI with blocking observations — commercial risk.',
    mode: 'vigilance', incidentType: 'Vetting',
    suggestedNotifs: ['notif-prealert','notif-charterer'],
    exampleNote: 'CC X — Shell vetting failed: 4 observations including 1 high-risk (cargo securing). Corrective plan within 14 days. Re-vetting next call Rotterdam.' },
  { id: 'trg-lop', dept: 'FM', axe: 'Commercial',
    label: 'Letter Of Protest issued',
    desc: 'Standard LOP (bunker delay, cargo, port) — commercial follow-up.',
    mode: 'nominal', incidentType: 'Other',
    suggestedNotifs: ['notif-charterer'],
    exampleNote: 'CC PEGASUS — LOP issued for gantry crane damage after contact with CC IRON during berthing Shanghai. Temp repairs completed.' },

  // ---- Bunkering ----
  { id: 'trg-bunker-off', dept: 'FM', axe: 'Bunkering',
    label: 'Off-spec or contaminated bunker',
    desc: 'Fuel not compliant with ISO 8217, sample under analysis, supplier dispute.',
    mode: 'vigilance', incidentType: 'Bunker',
    suggestedNotifs: ['notif-prealert','notif-charterer'],
    exampleNote: 'CC AURORE — bunker received Fujairah 12/05, Veritas analysis shows catalytic fines out of spec. Consumption suspended, LOP to supplier. Remaining autonomy 8 days.' },

  // ---- Logistics ----
  { id: 'trg-spare-late', dept: 'FM', axe: 'Logistics',
    label: 'Critical spare part late > planned ETD',
    desc: 'Spare part lead time exceeds the scheduled repair window.',
    mode: 'vigilance', incidentType: 'M/E',
    suggestedNotifs: ['notif-prealert','notif-charterer'],
    exampleNote: 'CC ALEXANDRIA — HFO purifiers #1 & #2 OOO, vessel on MDO. Kingston part delivery expected 18/05, likely delay to 22/05. MDO shortage risk.' },

  // ===================== CR — Crewing =====================
  // ---- Crew ----
  { id: 'trg-manning-breach', dept: 'CR', axe: 'Crew',
    label: 'Minimum Safe Manning breach',
    desc: 'Manning below Safe Manning Document — vessel cannot legally sail.',
    mode: 'crise', incidentType: 'Manning',
    suggestedNotifs: ['notif-crise','notif-flag-tech','notif-charterer'],
    exampleNote: 'CC NORDIC — 2/O signed off today without confirmed replacement. Deck officer manning < SDOC. Master cannot depart. Manila agent ETA 48h.' },
  { id: 'trg-officer-gap', dept: 'CR', axe: 'Crew',
    label: 'Confirmed officer gap on next rotation',
    desc: 'Officer (Master, Chief, 2/O...) not replaced in time for next relief.',
    mode: 'vigilance', incidentType: 'Manning',
    suggestedNotifs: ['notif-prealert','notif-escalade-hod'],
    exampleNote: 'CC SILVER — Master relief planned Singapore D+5, replacement not yet confirmed. Schengen visa in progress. Plan B: extend outgoing Master.' },
  { id: 'trg-medevac-impact', dept: 'CR', axe: 'Crew',
    label: 'MEDEVAC — replacement not covered',
    desc: 'Medical evacuation in progress, critical post not yet covered.',
    mode: 'vigilance', incidentType: 'MEDEVAC',
    suggestedNotifs: ['notif-prealert','notif-flag-tech'],
    exampleNote: 'CC MARCO POLO — 2/O MEDEVAC effected 11:05 SG (Manila hospital, stabilised). Replacement Master Reyes onboard since 11:05. SDOC respected.' },
  { id: 'trg-rating-gap', dept: 'CR', axe: 'Crew',
    label: 'Rating gap — replacement on standby',
    desc: 'AB/OS on scheduled relief, replacement already identified.',
    mode: 'nominal', incidentType: 'Manning',
    suggestedNotifs: [],
    exampleNote: 'CC AURORE — 2 ratings on relief Hong Kong D+3, replacements confirmed by Manila agent. Flight logistics OK.' },

  // ---- Certification ----
  { id: 'trg-cert-expiry', dept: 'CR', axe: 'Certification',
    label: 'STCW / medical cert expires < 14 days',
    desc: 'Seafarer on duty with critical certificate expiring soon without relief plan.',
    mode: 'vigilance', incidentType: 'Certification',
    suggestedNotifs: ['notif-prealert','notif-escalade-hod'],
    exampleNote: 'CC SINTRA — Chief Engineer STCW Advanced Firefighting cert expires D+10. BV training planned D+5 in Hamburg. Confirm training attendance.' },

  // ===================== FU — Fleet Upgrade =====================
  // ---- Shipyard ----
  { id: 'trg-yard-slot', dept: 'FU', axe: 'Shipyard',
    label: 'Drydock / yard slot at risk',
    desc: 'Cosco Zhoushan / Shanghai capacity compromised on planned slot.',
    mode: 'vigilance', incidentType: 'Drydock',
    suggestedNotifs: ['notif-prealert','notif-yard'],
    exampleNote: 'CC AMAZON — Seatrium slot planned 15-20/05, yard capacity reduced (3 competing vessels). Slot confirmation expected 12/05.' },
  { id: 'trg-retrofit-delay', dept: 'FU', axe: 'Shipyard',
    label: 'Retrofit: delay > 7 days',
    desc: 'Phase-in / retrofit delayed beyond acceptable window.',
    mode: 'vigilance', incidentType: 'Retrofit',
    suggestedNotifs: ['notif-prealert','notif-yard','notif-charterer'],
    exampleNote: 'CC AMAZON — bush manufacturing in progress Spain, available 02/06. ETD 18/06 (+15 days vs initial plan). New bearing ordered in parallel.' },

  // ---- Delivery ----
  { id: 'trg-phase-in-risk', dept: 'FU', axe: 'Delivery',
    label: 'Phase-in at risk (sea trial, bunker)',
    desc: 'New vessel delivery threatened by technical defect or bunker readiness.',
    mode: 'vigilance', incidentType: 'Retrofit',
    suggestedNotifs: ['notif-prealert','notif-yard'],
    exampleNote: 'CC NOTRE DAME — delivered. Departure 15/05 for phase-in 17/05. LNG bunker 16/05 Shanghai anchorage. Pressure on LHV for ceremony.' }
];

// ============================================================
//   ALERT TEMPLATES
// ============================================================
// Auto-substituted variables: {VESSEL} {EVENT} {DTG} {AUTHOR} {MODE} {DEPT}
window.NOTIF_TEMPLATES = [
  { id: 'notif-prealert',
    label: 'Watch — VP pre-alert (AMBER)',
    channel: 'Email + Teams',
    audience: 'VP CMA Ships + Heads of Department',
    body: '[CMA Ships] Mode shift to WATCH — {DEPT} friction. Vessel {VESSEL}. Event: {EVENT}. DTG {DTG}. Exceptional SITREP follows. — {AUTHOR}, DM' },

  { id: 'notif-crise',
    label: 'Crisis — technical cell activation',
    channel: 'SMS + call + email',
    audience: 'VP + Heads + relevant DOs',
    body: '[CMA Ships] Technical cell ACTIVATION (CRISIS mode). Vessel {VESSEL}. Event: {EVENT}. DTG {DTG}. Confirm attendance (room or remote) within 30 min. — {AUTHOR}, DM' },

  { id: 'notif-deescalation',
    label: 'De-escalation — back to NOMINAL',
    channel: 'Email',
    audience: 'VP + Heads + DM/DO',
    body: '[CMA Ships] De-escalation. Returning to NOMINAL mode at {DTG}. Routine follow-up via daily SITREP. AAR scheduled within 7 days. — {AUTHOR}, DM' },

  { id: 'notif-escalade-hod',
    label: 'Routine Head of Department escalation',
    channel: 'Email + Teams',
    audience: 'Head of {DEPT} (FM/CR/FU)',
    body: 'Hello,\n\nFriction reported in {DEPT} block — Vessel {VESSEL}. Event: {EVENT}. DTG {DTG}.\nCurrent CMA Ships mode: {MODE}. No automatic switch — your arbitration is requested.\nDetails to follow by email. — {AUTHOR}, DO {DEPT}' },

  { id: 'notif-yard',
    label: 'Shipyard notification (Cosco / Shanghai)',
    channel: 'Formal email',
    audience: 'Shipyard (Cosco Zhoushan / Shanghai / other)',
    body: 'Subject: Schedule update — {VESSEL} — {DTG}\n\nDear Yard Team,\n\nFleet Upgrade CMA Ships informs you of the following development on {VESSEL}:\n\nEvent: {EVENT}\n\nWe will coordinate slot adjustment and provide a revised arrival forecast within 24h. The Duty Officer Fleet Upgrade ({AUTHOR}) remains your point of contact.\n\nBest regards,\nCMA Ships — Fleet Upgrade' },

  { id: 'notif-charterer',
    label: 'Charterer / client notification',
    channel: 'Formal email — single voice via FM',
    audience: 'Charterer / client',
    body: 'Subject: Operational update — {VESSEL} — {DTG}\n\nDear Sir/Madam,\n\nCMA Ships informs you of the following development on {VESSEL}:\n\nEvent: {EVENT}\n\nOur Fleet Management team is engaged and will provide a revised schedule shortly. We thank you for your understanding.\n\nKind regards,\nCMA Ships — Fleet Management' },

  { id: 'notif-flag-tech',
    label: 'Flag State notification (technical)',
    channel: 'Formal email',
    audience: 'Flag State Administration',
    body: 'Subject: Technical notification — {VESSEL} — {DTG}\n\nDear Sir/Madam,\n\nIn accordance with applicable conventions and our reporting obligations, we hereby notify you of the following technical event on {VESSEL}:\n\nEvent: {EVENT}\n\nClassification society is engaged. A status update will follow according to the standard reporting cycle.\n\nRegards,\n{AUTHOR}\nCMA Ships — Fleet Management' }
];

// ============================================================
//   CLASSIFICATION LEVELS
// ============================================================
window.CLASSIFICATIONS = [
  { code: 'CONFIDENTIAL', label: 'CONFIDENTIAL', short: 'CONF', color: 'red',
    desc: 'Strictly controlled distribution — VP, Heads, legal, P&I. No external dissemination.' },
  { code: 'RESTRICTED',   label: 'RESTRICTED',   short: 'REST', color: 'orange',
    desc: 'Restricted distribution — crisis cell, authorities if required, classification, P&I.' },
  { code: 'INTERNAL',     label: 'INTERNAL',     short: 'INT',  color: 'blue',
    desc: 'CMA Ships internal distribution — routine operational pilotage.' },
  { code: 'PUBLIC',       label: 'PUBLIC',       short: 'PUB',  color: 'green',
    desc: 'Unrestricted information — can be shared externally.' }
];

// CCIR kept for backward compatibility (rarely used in technical mode).
window.CCIR_TEMPLATE = [
  { type: 'Key info', label: 'Fleet technical availability (M/E, A/E, propulsion)', items: [] },
  { type: 'Key info', label: 'Crew availability (Minimum Safe Manning, reliefs)', items: [] },
  { type: 'Key info', label: 'FU shipyard progress (Cosco, Shanghai, others)', items: [] },
  { type: 'Confidential', label: 'Information NOT to disclose (negotiations, P&I claims)', items: [] }
];
