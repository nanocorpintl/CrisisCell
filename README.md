# CrisisCell — CMA Ships

Outil web autonome de gestion de cellule de crise pour un armement maritime
(CMA Ships). Application **single-page**, sans dépendance ni back-end —
ouvrir `index.html` dans un navigateur récent. **Toutes les données sont
chiffrées localement (AES-GCM 256, PBKDF2 250 000 itérations)** et
inaccessibles sans le mot de passe.

## Sécurité

| Mesure | Détail |
|---|---|
| Chiffrement au repos | AES-GCM 256 bits sur l'intégralité du coffre `localStorage` |
| Dérivation de clé | PBKDF2-SHA-256, 250 000 itérations, sel 128 bits aléatoire |
| Stockage de la clé | Mémoire JS uniquement, jamais persistée, vidée au verrouillage |
| Verrou anti brute force | Lockout progressif : 30 s / 5 min / 15 min / 1 h après 3/5/7/10 échecs |
| Verrouillage automatique | Inactivité > 15 min → lock + effacement clé |
| CSP stricte | `default-src 'self'`, pas de CDN, pas d'inline scripts, `frame-ancestors 'none'` |
| Pas d'indexation | `noindex, nofollow, noarchive`, `Referrer: no-referrer` |
| Mot de passe minimum | 12 caractères, score mixte ≥ 4/7 (longueur + casse + chiffres + symboles) |
| Changement de mot de passe | Re-chiffrement complet du coffre |
| Export | Choix : chiffré (recommandé pour partage) ou en clair (avec confirmation) |
| Réinitialisation | Confirmation explicite par saisie de "SUPPRIMER" |

**À déployer derrière HTTPS** (WebCrypto exige un contexte sécurisé). Sur
`localhost` ou `file://` la plupart des navigateurs l'acceptent aussi.

## Inspirations

| Source | Apport |
|---|---|
| **ICS** (FEMA) | Principes d'organisation, simplifiés en 6 fonctions clés (DIR/OPS/COM/ANT/SUP/QRT) |
| **NATO SITREP / OPORD** | Générateurs aux formats 5 paragraphes (SMEAC/OEEEAR) |
| **CCIR / PIR / FFIR / EEFI** | Module dédié aux besoins informationnels |
| **Battle rhythm** | Cadence des briefings, passation de quart |
| **AAR — After-Action Review** (US Army FM 6-22) | Module RETEX 4 questions, conversion en actions |
| **SALUTE / 9-Line MEDEVAC** | Intégrés aux playbooks |
| **REX Marine nationale** | Passation de quart formelle avec sign-off, watch officer rotation |
| **REX EDF / ASN** | Cellule Anticipation H+6/24/72, règle des 3R, single voice principle, échelle de gravité INES |
| **F24 / Veoci / Everbridge / D4H** | Patterns UX : MEL, action board, COP, annuaire de crise |
| **IMO Resolution A.1072(28)** | Cadre de gestion des crises côté armatorial |
| **ISM Code** | Plans d'urgence à bord et continuité ashore |
| **BMP5** | Procédure piraterie / use of force continuum / niveaux ROE |
| **SOLAS, ISPS, MARPOL, IMDG, COLREG** | Référentiels par playbook |
| **BIMCO Cyber Guidelines v4 / IMO MSC-FAL.1/Circ.3** | Playbook cyber maritime |

## Modules (20)

1. **COP** — Phase de cinétique, KPI, incidents actifs, anticipation H+24, MEL récent, **saisie rapide intégrée**.
2. **Incidents** — création / suivi / clôture avec **niveau INES** (0-7), **niveau ROE** (1-5 BMP5), **Commander's Intent** et **End-State**.
3. **Navires** — registre flotte (Normal / À risque / Incident / Sécurisé / Port refuge).
4. **MEL** — Main Events Log horodaté UTC, immuable, exportable.
5. **Cellule** — organisation CMA Ships. Couche permanente : **Duty Manager Marseille** (rotation hebdo) + **3 Duty Officers Asie-Pacifique** (FM/CR Singapour HO, FU Chine — Cosco Zhoushan/Shanghai). Inchangée : VP + 3 Heads of Department (FM/CR/FU). Voir Note d'organisation CMA Ships.
6. **Actions** — P1/P2/P3, owner, échéance, **clic sur statut pour cycle**.
7. **Décisions** — journal des décisions (contexte / décision / mise en œuvre).
8. **Anticipation** — *cellule prospective REX nucléaire* H+6/24/72 best/likely/worst + signaux à surveiller.
9. **Comms** — entrantes/sortantes, **validation single-voice** (REX EDF/Marine).
10. **Contacts** — annuaire P1/P2/P3 (MRCC, UKMTO, MDAT-GoG, P&I…).
11. **Ressources** — moyens mobilisés (remorqueurs, salvors, médical, PCASP, agents).
12. **Risques** — matrice 5×5 cliquable.
13. **Battle rhythm** — cadence des briefings.
14. **Passation de quart** — *handover naval avec checklist + sign-off de la relève* + pré-remplissage automatique.
15. **SITREP** — générateur **CMA Ships** (trame officielle) : header Mode/Statut, KPIs (escales/passages/frictions/alertes 24 h), Points pour Top Management (3 max), 3 blocs département (Dossiers / Échéances 24-72 h / Frictions), Frictions transverses, Signaux faibles / Look-ahead J+1 / S+1. Dossiers et échéances remontés automatiquement des onglets Incidents et Actions taggés FM/CR/FU.
16. **OPORD** — *générateur d'ordre d'opération* 5 paragraphes (Situation/Mission/Exécution/Soutien/Cdt-Trans), avec intention, end-state, no-go.
17. **Playbooks** — 12 checklists d'urgence maritime activables (création automatique des actions).
18. **CCIR** — PIR / FFIR / EEFI.
19. **RETEX** — *AAR US Army 4 questions*, conversion des Lessons Identified en actions.
20. **Exercices** — table-top / functional / full-scale avec **MSEL** (Master Scenario Events List).

## Saisie ultra-rapide

| Touche | Action |
|---|---|
| `?` | Affiche la liste des raccourcis |
| `L` | Saisir un événement MEL |
| `A`, `D`, `K`, `I` | Nouvelle action / décision / comm / incident |
| `N` | Nouveau (sensible à l'onglet courant) |
| `S` | SITREP |
| `G` puis lettre | Aller à un onglet (`G C` = COP, `G I` = incidents, etc.) |
| `Ctrl+Entrée` | Valider la modal |
| `Esc` | Fermer la modal |
| `Ctrl+L` | Verrouiller |
| `Ctrl+K` | Recherche globale (à venir) |

Plus :
- **Auto-focus** sur le premier champ à l'ouverture d'une modal
- **Auto-complétion** (datalists) pour auteurs, owners, parties, navires, canaux
- **Pré-remplissage** : nom de l'utilisateur connecté comme auteur par défaut, état courant pré-rempli dans la passation
- **FAB** flottant pour ajout rapide depuis n'importe quel onglet

## Niveaux d'alerte

VERT (veille) → JAUNE (vigilance) → ORANGE (pré-alerte) → ROUGE (cellule activée) → NOIR (crise majeure / continuité).

## Phases de crise

RÉFLEXE (3R : Reculer/Rendre compte/Réfléchir) → CONCERTÉE (cellule constituée, OPORD, battle rhythm) → POST-CRISE (RETEX, capitalisation, communication post-incident).

## Échelle de gravité maritime (adaptée INES)

0 Écart · 1 Anomalie · 2 Incident · 3 Incident sérieux · 4 Accident sans impact extérieur · 5 Accident à conséquences locales · 6 Accident grave · 7 Accident majeur.

## Niveaux de ROE (BMP5)

1 Vigilance · 2 Mesures passives · 3 Mesures actives non létales · 4 Coordination forces armées (PCASP) · 5 Légitime défense.

## Utilisation

1. Ouvrir `index.html` dans un navigateur récent (de préférence via HTTPS).
2. Première fois : créer un mot de passe ≥ 12 caractères.
3. Renseigner votre nom de poste — il sera l'auteur par défaut des saisies.
4. Le coffre se chiffre/déchiffre automatiquement.
5. Pour partager la cellule : utiliser `Export chiffré` puis `Import` côté autre poste avec le même mot de passe.

## Avertissement

Ce outil est un canevas opérationnel. Les playbooks intégrés sont des
synthèses non exhaustives, à confronter aux procédures internes CMA Ships,
au Safety Management System (ISM), au Ship Security Plan (ISPS) et aux
obligations de l'État du pavillon avant toute utilisation en réel.
La cybersécurité repose sur le mot de passe choisi et l'environnement
d'exécution (navigateur récent, contexte sécurisé HTTPS).
