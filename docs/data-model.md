# Modèle de données

Shape de l'objet `state` persisté chiffré dans `localStorage`
(`cma_ships_vault_v1`). À lire avant d'ajouter ou de renommer un champ.

## Règle d'or

**Nouveau champ = nullable, backward-compatible. Jamais renommer.**

Les vaults chiffrés des utilisateurs sont déjà déployés. Un renommage
= perte silencieuse des données. Un champ non nullable = crash au
chargement d'un ancien vault.

Si une migration est inévitable : l'implémenter dans `init()` qui lit
l'ancien nom et crée le nouveau, puis `save()`.

## Racine `state`

| Clé              | Type       | Rôle                                              |
|------------------|------------|---------------------------------------------------|
| `alert`          | string     | `'nominal' \| 'vigilance' \| 'crise'`              |
| `weekNumber`     | string     | N° de semaine ISO courant                         |
| `dutyManager`    | string     | Nom du DM Marseille en poste                      |
| `dutyOfficers`   | object     | `{FM: string, CR: string, FU: string}`            |
| `deptSitreps`    | object     | `{FM: {status, dossiers, deadlines, frictions, updatedAt, updatedBy}, CR: …, FU: …}` |
| `deptStatus`     | object     | État couleur hérité `{FM: 'green', CR: …, FU: …}` |
| `sitrepCounter`  | number     | Compteur des SITREPs générés                      |
| `sitreps`        | array      | Historique des SITREPs générés (texte + lang)     |
| `sitrepLang`     | string     | `'en' \| 'fr'` — préférence courante              |
| `incidents`      | array      | Dossiers (voir section suivante)                  |
| `vessels`        | array      | Registre flotte (voir section)                    |
| `actions`        | array      | Actions à faire (P1/P2/P3, owner, due, status)    |
| `frictions`      | array      | Frictions remontées par département               |
| `decisions`      | array      | Arbitrages (contexte / décision / mise en œuvre)  |
| `comms`          | array      | Communications entrantes/sortantes                |
| `stakeholders`   | array      | Contacts externes (P&I, agents, chantiers…)       |
| `resources`      | array      | Moyens mobilisés (shore teams, salvors…)          |
| `risks`          | array      | Registre risques 5×5                              |
| `rhythm`         | array      | Battle rhythm CMA Ships                           |
| `team`           | array      | Membres de la cellule                             |
| `passations`     | array      | Historique passations de quart                    |
| `anticipation`   | array      | Look-ahead J+1 / S+1                              |
| `topMgmtPoints`  | array      | Points pour VP (max 3)                            |
| `weakSignals`    | array      | Signaux faibles                                   |
| `mel`            | array      | Duty Log (Main Events Log)                        |
| `exercises`      | array      | Exercices MSEL                                    |
| `retex`          | array      | After-Action Reviews                              |
| `lang`           | string     | `'en' \| 'fr'` — langue UI                        |
| `opsPeriod`      | string     | Période opérationnelle libre                      |

**À confirmer** : certaines clés listées (`exercises`, `retex`,
`rhythm`) sont initialisées mais rarement utilisées côté UI après le
refactor récent. À auditer si quelqu'un veut nettoyer.

## `state.incidents[]` — modèle du dossier

Le cœur du métier. Chaque dossier est un objet avec les champs ci-dessous.

### Champs communs

| Champ              | Type          | Note                                                           |
|--------------------|---------------|----------------------------------------------------------------|
| `id`               | string        | UUID court                                                     |
| `ref`              | string        | Référence lisible `DOS-XXXXXX`, fixe après création            |
| `type`             | string        | `'M/E' \| 'A/E' \| 'Propulsion' \| 'Drydock' \| 'Retrofit' \| 'PSC' \| 'Vetting' \| 'Bunker' \| 'Cargaison' \| 'Manning' \| 'Certification' \| 'MEDEVAC' \| 'Regulation' \| 'Other'` |
| `department`       | string        | `'FM' \| 'CR' \| 'FU' \| 'XX'`                                 |
| `vessel`           | string        | Nom du navire (lié au registre si existe)                      |
| `severity`         | string        | `'crit' \| 'high' \| 'med' \| 'low'`                           |
| `status`           | string        | `'open' \| 'monitoring' \| 'closed'`                           |
| `classification`   | string        | `'CONFIDENTIAL' \| 'RESTRICTED' \| 'INTERNAL' \| 'PUBLIC'` (défaut INTERNAL) |
| `startedAt`        | ISO string    | Date de début                                                  |
| `closedAt`         | ISO string    | Set automatiquement quand `status → 'closed'`                  |
| `summary`          | string        | Description détaillée                                          |
| `sitrepLine`       | string        | Ligne une-phrase qui apparaîtra dans le SITREP                 |
| `offhireEstimated` | number        | Heures d'off-hire estimées (dossier ouvert)                    |
| `offhireActual`    | number\|null  | Heures d'off-hire réelles — **obligatoire à la clôture**       |
| `includeInSitrep`  | boolean       | Strict : `=== true` pour apparaître dans SITREP CMA            |
| `history`          | array         | `[{ts, author, changes: [{field, from, to}]}]`                 |

### Champs spécifiques FU (optionnels)

| Champ               | Type          | Visible si                        |
|---------------------|---------------|-----------------------------------|
| `fuPhase`           | string\|null  | `'preparation' \| 'execution' \| 'project'` — bloc affiché si `department === 'FU'` |
| `fuSubcategory`     | string\|null  | Dépend de `fuPhase`               |
| `fuProject`         | string\|null  | Code projet retrofit / phase-in   |
| `shipyard`          | string\|null  | Chantier (badge sur row SITREP FU)|
| `delayDays`         | number\|null  | Glissement planning (jours)       |
| `costImpactUSD`     | number\|null  | Déviation coût (USD)              |
| `safetyImpact`      | boolean       | Checkbox                          |

### Champs spécifiques CR (optionnels)

| Champ               | Type          | Visible si                        |
|---------------------|---------------|-----------------------------------|
| `manningAgencies`   | string\|null  | Liste CSV des agences — badge sur row SITREP CR |

### Mitigation & follow-up (tous départements)

| Champ               | Type          | Rôle                              |
|---------------------|---------------|-----------------------------------|
| `mitigationPlan`    | string\|null  | Plan d'action textuel             |
| `targetResolution`  | ISO date\|null| Date cible de résolution          |
| `progress`          | number        | 0–100 %, auto-set à 100 à la clôture |

### Clôture

| Champ               | Type          | Rôle                              |
|---------------------|---------------|-----------------------------------|
| `rootCause`         | string\|null  | "Cause identified" (pas la full RCA) |
| `feedbackRequired`  | boolean       | Bloque la clôture tant que coché  |

## `state.vessels[]` — registre flotte (CSV import)

100+ colonnes du CSV source, mappées sur un objet par navire. Champs
principaux utilisés dans l'UI :

- `name` (clé de détection), `imo`, `fleet` (M1/M2/M3/S1/S2/S3…),
  `shipManager`, `fuelType` / `fuelMode`, `numDG`, `previousName`,
  `callSign`, `yearBuilt`, `class`, `type`, …

Beaucoup de colonnes CSV sont stockées fidèlement mais peu affichées
(fallback vers la modal détail du navire).

## `state.history[]` d'un dossier

Tracking automatique calculé dans `incidentForm.submit()` :

```js
const tracked = [
  'type','vessel','department','severity','status',
  'summary','sitrepLine','offhireEstimated','offhireActual',
  'includeInSitrep','fuPhase','fuSubcategory','fuProject',
  'shipyard','manningAgencies','delayDays','costImpactUSD',
  'safetyImpact','mitigationPlan','targetResolution','progress',
  'rootCause','feedbackRequired'
];
```

**Si tu ajoutes un champ** : pense à l'ajouter ici sinon il ne
remontera pas dans le panneau historique du dossier.

## Persistence

`save()` sérialise `state` en JSON, chiffre avec la clé courante de
`CrisisAuth`, écrit dans `localStorage['cma_ships_vault_v1']`.
`load()` lit, déchiffre, restaure.

Taille `localStorage` ~5-10 MB selon navigateur. Les pièces jointes
(V2 FU) ne sont pas encore implémentées — elles pousseraient à migrer
vers IndexedDB.
