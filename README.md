# CMA Ships — Continuité opérationnelle

Outil web autonome de **gestion de crise technique** pour CMA Ships : pilotage
de la **disponibilité technique des navires** (Fleet Management), de la
**disponibilité équipages** (Crewing) et de l'**avancement des chantiers**
(Fleet Upgrade).

> **Hors périmètre** : la sécurité, la sûreté et l'environnement (SSE) sont
> couvertes par l'outil SSE dédié de CMA Ships et ne sont pas traitées ici.

Application **single-page**, sans dépendance ni back-end. Toutes les données
sont **chiffrées localement** (AES-GCM 256, PBKDF2 250 000 itérations) et
inaccessibles sans le mot de passe.

## Alignement avec l'organisation CMA Ships

L'outil s'interface directement avec le dispositif décrit dans la
*Note d'organisation CMA Ships* et le document
*Fonctionnement quotidien et hebdomadaire* :

| Niveau | Acteurs | Rôle |
|---|---|---|
| Stratégique | **VP CMA Ships** | Group MM hebdo, autorité ultime |
| Hiérarchique | **Heads of Department** (FM, Crewing, FU) | Décisions structurantes département |
| Permanence siège | **Duty Manager Marseille** (rotation hebdo, passation mardi 11:00) | Anime Daily 09:00, consolide SITREP, tient Duty Log |
| Permanence Asie | **3 Duty Officers** (DO FM Singapour, DO CR Singapour, DO FU Chine) | Produisent SITREPs départementaux, exploitent décalage UTC+8 |

## Cycle quotidien (heure Marseille hiver)

| Heure | Acteur | Livrable |
|---|---|---|
| 08:00 | DO FM/CR/FU | 3 SITREPs départementaux finalisés (trame standard) |
| 08:30 | DO lead | SITREP CMA Ships consolidé → VP + Heads + DM |
| 09:00 | DM Marseille | Daily Stand-up 15 min strict (Heads + 3 DO en visio) |
| 18:00 | DM Marseille | Synthèse Duty Log transmise à l'Asie |

## Cycle hebdomadaire (aligné Group MM Vendredi)

| Jour | Acteur | Livrable |
|---|---|---|
| Mardi 11:00 | DM sortant → DM entrant | Passation formelle 45 min |
| Jeudi 12:00 | Heads | Slide Weekly Pack remise au bureau VP |
| Jeudi 14:00 | VP + Heads + DM | Weekly Operations Review (60 min) |
| Jeudi 18:00 | DM | Weekly Pack consolidé déposé au VP |
| Vendredi | VP | Group Management Meeting CMA CGM |

## Modes opérationnels

| Mode | Statut | Quand |
|---|---|---|
| **Nominal** | VERT | Fonctionnement courant, pilotage par exception, dispositif standard |
| **Vigilance** | AMBRE | Friction technique ou crewing majeure — renforcement, HoD informés |
| **Crise** | ROUGE | Dispositif normal suspendu, cellule technique activée par le VP |

## Modules

1. **Veille** — tableau de bord du Duty Manager (mode courant, bascule, MOC, Duty Log rapide)
2. **COP** — vue d'ensemble, dossiers ouverts par département
3. **Dossiers** (Incidents) — typologie technique/crewing : M/E, A/E, Propulsion, Drydock, Retrofit, PSC, Vetting, Bunker, Cargaison, Manning, Certification, MEDEVAC (impact opérationnel), Régulation. Chaque dossier est tagué FM/CR/FU/Transverse.
4. **Navires** — registre flotte avec statut technique
5. **Journal (MEL / Duty Log)** — chronologique horodaté, tenu par le DM
6. **Cellule** — organisation CMA (VP, Heads, DM, DOs)
7. **Actions** — P1/P2/P3, owner, échéance, taggées par département
8. **Frictions** — concept central CMA Ships, par périmètre FM/CR/FU/Transverse. Alimente automatiquement les blocs Frictions du SITREP. Inclut **Points pour Top Management** (3 max pour le VP) et **Signaux faibles / Look-ahead J+1, S+1**.
9. **Décisions** — journal des décisions (contexte / décision / mise en œuvre)
10. **Anticipation** — prospective horizon J+1, S+1
11. **Comms** — communications entrantes/sortantes, validation single voice par DM/VP
12. **Contacts** — annuaire (P&I, État pavillon, classification, chantiers, agences manning)
13. **Ressources** — moyens mobilisés (shore teams, salvors, agents, pièces détachées)
14. **Risques** — registre 5×5
15. **Rythme** — battle rhythm CMA Ships (Daily, WOR, MBR, QSR, Group MM)
16. **Passation de quart** — handover formel DM (mardi 11:00) et DO, checklist signée
17. **SITREP** — générateur **CMA Ships** (trame officielle) : Header (Date, Semaine, Contexte, DM, Mode), Statut VERT/AMBRE/ROUGE, Synthèse 24h, KPIs, Points Top Management, 3 blocs département (Dossiers / Échéances 24-72h / Frictions), Frictions transverses, Signaux faibles. Dossiers et échéances **remontés automatiquement** depuis Incidents et Actions tagués par département.
18. **Playbooks** — 12 procédures techniques & crewing : Avarie M/E, A/E, propulsion, drydock non planifié, retrofit/phase-in, détention PSC, bunker défaillant, cargo damage, manning shortage, MEDEVAC opérationnel, certification, vetting
19. **RETEX** — capitalisation AAR 4 questions, conversion Lessons → actions
20. **Exercices** — table-top / functional / full-scale + MSEL
21. **Critères de déclenchement** — triggers techniques (~20) qui basculent automatiquement le mode opérationnel
22. **Modèles d'alerte** — 7 templates de notification (pré-alerte VP, activation cellule, désescalade, escalade HoD, chantier, affréteur, État pavillon)

## Cybersécurité

| Mesure | Détail |
|---|---|
| Chiffrement au repos | AES-GCM 256 bits sur l'intégralité du coffre `localStorage` |
| Dérivation de clé | PBKDF2-SHA-256, 250 000 itérations, sel 128 bits aléatoire |
| Stockage de la clé | Mémoire JS uniquement, jamais persistée |
| Verrou anti brute force | Lockout progressif 30 s / 5 min / 15 min / 1 h |
| Verrouillage automatique | Inactivité > 15 min → lock |
| CSP stricte | `default-src 'self'`, pas de CDN, pas d'inline scripts |
| Mot de passe minimum | 12 caractères, score mixte ≥ 4/7 |
| Export | Chiffré (recommandé) ou en clair (avec confirmation) |

## Utilisation

1. Ouvrir `index.html` (HTTPS ou localhost requis pour WebCrypto).
2. Première fois : créer un mot de passe ≥ 12 caractères.
3. Saisir votre nom (`Ex. DIR jdupont` ou `Ex. DM Lefèvre`) — auteur par défaut des saisies.
4. Pour partager entre DM/DOs : `Export chiffré` puis `Import` côté autre poste avec le même mot de passe.

## Avertissement

Cet outil est un canevas opérationnel à confronter aux procédures internes
CMA Ships, aux Job Descriptions Duty Manager / Duty Officer, et à la matrice
de délégation avant utilisation en réel. Les playbooks intégrés sont des
synthèses non exhaustives. Pour les sujets SSE (sécurité, sûreté,
environnement), se référer à l'outil SSE dédié.
