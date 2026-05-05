# CrisisCell — CMA Ships

Outil web autonome de gestion de cellule de crise pour un armement maritime
(CMA Ships). Application **single-page**, sans dépendance ni back-end —
ouvrir `index.html` dans un navigateur suffit. Persistance locale dans le
navigateur (`localStorage`), import/export JSON pour sauvegardes et passation.

## Inspirations

| Source | Apport |
|---|---|
| **ICS** (Incident Command System, FEMA) | Rôles cellule (CMD / OPS / PLN / LOG / FIN / LIA / PIO), structure d'organisation |
| **OODA Loop** (J. Boyd, USAF) | Journal des décisions en 4 phases : Observe / Orient / Decide / Act |
| **NATO SITREP** (5 paragraphes) | Générateur de SITREP formaté, avec DTG militaire, classification, prochain rapport |
| **CCIR / PIR / FFIR / EEFI** | Module dédié aux besoins informationnels du Crisis Manager |
| **Battle Rhythm** | Cadence des briefings et SITREPs |
| **SALUTE / 9-Line MEDEVAC** | Intégrés dans les playbooks (piraterie, médical) |
| **F24 / Veoci / Everbridge / D4H** | Patterns UX : MEL, action board, COP, annuaire de crise |
| **IMO Resolution A.1072(28)** | Cadre de gestion des crises majeures côté armatorial |
| **ISM Code** | Plans d'urgence à bord et continuité ashore |
| **BMP5** | Procédure piraterie / haute mer à risque |
| **SOLAS, ISPS, MARPOL, IMDG, COLREG** | Référentiels par playbook |
| **BIMCO Cyber Guidelines v4 / IMO MSC-FAL.1/Circ.3** | Playbook cyber maritime |

## Modules

1. **COP** — Common Operational Picture : KPI, OODA, incidents actifs, navires impactés, MEL récent, CCIR.
2. **Incidents** — création / suivi / clôture avec sévérité et statut.
3. **Navires** — registre flotte avec statut (Normal / À risque / Incident / Sécurisé / Port refuge).
4. **Main Events Log** — journal chronologique horodaté UTC, immuable, exportable.
5. **Cellule** — équipe d'astreinte avec rôles ICS adaptés au maritime (DPA, CSO, etc.).
6. **Actions** — tâches priorisées (P1/P2/P3) avec owner et échéance.
7. **Décisions** — chaque décision tracée selon la boucle OODA.
8. **Comms** — toutes communications entrantes/sortantes (canal, contrepartie, contenu).
9. **Parties prenantes** — annuaire P1/P2/P3 (MRCC, UKMTO, MDAT-GoG, P&I, État pavillon…).
10. **Matrice de risque** — 5×5 likelihood × severity, registre détaillé.
11. **Battle rhythm** — cadence des points cellule et SITREPs.
12. **SITREP** — générateur de rapport au format NATO 5 paragraphes, version classifiable, imprimable, téléchargeable.
13. **Playbooks** — checklists pour : piraterie, incendie, collision, échouement, MOB, MEDEVAC, cyber, pollution, sûreté ISPS, clandestins, IMDG, désertion. Activation = création automatique des actions correspondantes.
14. **CCIR** — Priority IR / Friendly Force IR / EEFI.

## Niveaux d'alerte

- **VERT** — veille normale
- **JAUNE** — vigilance renforcée
- **ORANGE** — pré-alerte cellule
- **ROUGE** — cellule de crise activée
- **NOIR** — crise majeure / continuité d'activité

## Utilisation

Ouvrir `index.html` dans un navigateur récent. Aucune installation. Toutes les
données restent locales au navigateur (RGPD-friendly). Pour partager l'état
entre membres de la cellule, utiliser **Export JSON** puis **Import JSON**
(ou héberger le dossier sur un partage sécurisé).

## Avertissement

Ce outil est un canevas opérationnel. Les playbooks intégrés sont des
synthèses non exhaustives, à confronter aux procédures internes CMA Ships,
au Safety Management System (ISM), au Ship Security Plan (ISPS) et aux
obligations de l'État du pavillon avant toute utilisation en réel.
