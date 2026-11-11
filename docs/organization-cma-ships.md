# Organisation CMA Ships — vocabulaire métier

À lire avant toute modification qui touche aux SITREPs, aux rôles, aux
onglets My SITREP, ou aux modes opérationnels.

## Acteurs

| Rôle                                      | Localisation         | Mission                                              |
|-------------------------------------------|----------------------|------------------------------------------------------|
| **VP CMA Ships**                          | Marseille (siège)    | Autorité ultime, Group MM hebdo                      |
| **Head of Fleet Management (FM)**         | Marseille            | Décisions structurantes département technique        |
| **Head of Crewing (CR)**                  | Marseille            | Décisions structurantes département équipages        |
| **Head of Fleet Upgrade (FU)**            | Marseille            | Décisions structurantes département chantiers        |
| **Duty Manager Marseille**                | Marseille            | Permanence siège, anime Daily 09:00, consolide SITREP CMA, tient Duty Log |
| **Duty Officer FM (DO FM)**               | Singapour HO         | SITREP FM, exploite décalage UTC+8                   |
| **Duty Officer CR (DO CR)**               | Singapour HO         | SITREP CR                                            |
| **Duty Officer FU (DO FU)**               | Chine (sur site)     | SITREP FU, suivi chantiers                           |

**Ne jamais inventer** d'autres rôles ou renommer ces entités. Le
vocabulaire est contractuel.

## Modes opérationnels

| Mode              | Statut                | Quand                                                              |
|-------------------|-----------------------|--------------------------------------------------------------------|
| **Nominal**       | VERT / GREEN          | Fonctionnement courant, pilotage par exception, dispositif standard |
| **Vigilance**     | AMBRE / AMBER (Watch) | Friction technique ou crewing majeure — renforcement, HoDs informés |
| **Crise**         | ROUGE / RED (Crisis)  | Dispositif normal suspendu, cellule technique activée par le VP     |

Codes internes dans le state : `nominal`, `vigilance`, `crise`.

## Cycle quotidien (heure Marseille, hiver)

| Heure  | Acteur          | Livrable                                                    |
|--------|-----------------|-------------------------------------------------------------|
| 08:00  | DO FM / CR / FU | 3 SITREPs départementaux finalisés (trame standard)         |
| 08:30  | DO lead         | SITREP CMA Ships consolidé → VP + Heads + DM                |
| 09:00  | DM Marseille    | Daily Stand-up 15 min strict (Heads + 3 DO en visio)        |
| 18:00  | DM Marseille    | Synthèse Duty Log transmise à l'Asie                        |

## Cycle hebdomadaire (aligné Group MM vendredi)

| Jour         | Acteur          | Livrable                                            |
|--------------|-----------------|-----------------------------------------------------|
| Mardi 11:00  | DM sortant → DM entrant | Passation formelle 45 min                   |
| Jeudi 12:00  | Heads           | Slide Weekly Pack remise au bureau VP               |
| Jeudi 14:00  | VP + Heads + DM | Weekly Operations Review (60 min)                   |
| Jeudi 18:00  | DM              | Weekly Pack consolidé déposé au VP                  |
| Vendredi     | VP              | Group Management Meeting CMA CGM                    |

## Départements et codes

| Code | Libellé               | Scope                                              |
|------|------------------------|----------------------------------------------------|
| FM   | Fleet Management       | Disponibilité technique des navires                 |
| CR   | Crewing                | Disponibilité équipages                             |
| FU   | Fleet Upgrade          | Chantiers (drydock prep + execution, retrofits)     |
| XX   | Transverse             | Dossiers qui touchent plusieurs départements        |

## Objectif off-hire (KPI central)

**99,5 % de disponibilité** = 43,8 h d'off-hire par navire et par an.

Pour la flotte entière :
- `ytdTarget = (daysElapsed / 365) × 43.8 × nVessels`
- `ytdActual = Σ offhireActual` sur les dossiers `closed` dont
  `closedAt` tombe dans l'année en cours
- `ratio = ytdActual / ytdTarget × 100`

Surfacé dans COP (4 KPIs) et SITREP CMA (bloc KPIs).

**À confirmer** : ce 99,5 % vient des échanges client mais je n'ai pas
vu le document source formel. Si un utilisateur demande à changer la
valeur, elle est centralisée dans `computeOffhireMetrics()` dans
`app.js`.

## Flottes de management (CSV import)

Les flottes M1/M2/M3 (Marseille) et S1/S2/S3 (Singapour) sont des
regroupements de management pour répartir les 438 navires entre les
Superintendants. Le CSV d'import contient un champ `Fleet` qui remonte
dans les filtres Analytics et dans le groupement SITREP.

## SITREP CMA — structure officielle

```
╔═══╗
║ CMA SHIPS — SITREP ║
╚═══╝
<Date> · Semaine <N°>
Duty Manager Marseille: <nom>
Mode: <Nominal | Vigilance | Crise>

──── STATUT GLOBAL: <VERT | AMBRE | ROUGE> ────

▸ SYNTHÈSE 24h
  <texte libre 30-40 mots>

▸ KPIs
  <alertes 24h, off-hire open, off-hire par dept,
   risque semaine, YTD vs cible>

◆ POINTS POUR TOP MANAGEMENT (0 à 3 max)
  <optionnel, masqué si vide>

──── FLEET MANAGEMENT    Statut [V/A/R] ────
  Duty Officer — <nom>
  Dossiers du jour : <ceux cochés dans My SITREP FM>
  Échéances 24-72h : <optionnel, masqué si vide>

──── CREWING    Statut [V/A/R] ────
  idem

──── FLEET UPGRADE    Statut [V/A/R] ────
  idem
```

Version EN : `SITREP_CMA_TEMPLATE` dans `data/playbooks.js`.
Version FR : `SITREP_CMA_TEMPLATE_FR` dans le même fichier.

Le générateur est `renderCMASitrep(synthesis, lang)` dans `app.js`.
