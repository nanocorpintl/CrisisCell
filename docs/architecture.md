# Architecture — décisions structurantes

Document des choix qui ne sont pas évidents à la lecture du code. À lire
avant toute modification structurelle.

## A1. Vanilla JS, pas de build, pas de framework

Un seul `index.html`, un `app.js` (~4600 lignes), un `styles.css`
(~1300 lignes), `auth.js` (crypto), `data/playbooks.js` (constantes
métier). Aucun `package.json`, aucun bundler, aucune dépendance npm.

**Pourquoi** : le poste cible (Duty Manager Marseille, Duty Officers
Singapour/Chine) doit pouvoir ouvrir l'outil depuis un dossier local
sans install ni réseau. La portabilité prime sur l'ergonomie
développeur.

**Conséquence** : tout tient dans un IIFE unique, on utilise des
helpers (`el`, `panel`, `badge`…) plutôt qu'un framework. Pas de JSX,
pas de Vue template, pas de modules ES.

## A2. Chiffrement AES-GCM côté client, zéro backend

`auth.js` implémente AES-GCM 256 + PBKDF2-SHA-256 à 250 000 itérations,
sel 128 bits. La clé dérivée vit uniquement en RAM. Le coffre tient
dans **une seule** entrée `localStorage` : `cma_ships_vault_v1`.

**Pourquoi** : contrainte client explicite — données sensibles
(disponibilité flotte CMA CGM), poste pas forcément isolé, pas de
serveur acceptable.

**Conséquences** :
- Perte du mot de passe → données irrécupérables (pas de reset).
- Partage entre postes : export JSON chiffré + import avec même mot de
  passe (menu `···` → Export / Import).
- Auto-lock à 15 min d'inactivité, lockout anti brute-force progressif
  (30 s → 5 min → 15 min → 1 h).
- Voir `docs/security.md` pour plus de détails.

## A3. CSP stricte, zéro réseau

`<meta http-equiv="Content-Security-Policy" content="default-src 'self';
script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self';
frame-ancestors 'none'; object-src 'none'; manifest-src 'self'">`

**Conséquences** :
- Pas de CDN possible. Pas de Google Fonts. Pas de script inline.
- `connect-src 'self'` : aucun fetch externe (même pas pour une mise à
  jour météo).
- `frame-ancestors 'none'` : l'outil ne peut pas être iframé.

**Ne jamais** proposer "ajoute une lib via CDN" ou "fetche l'API X".

## A4. Organisation CMA Ships réelle

L'outil reflète l'organisation décrite dans la *Note d'organisation CMA
Ships* fournie par le client :

| Niveau            | Acteurs                                         |
|-------------------|-------------------------------------------------|
| Stratégique       | VP CMA Ships                                    |
| Hiérarchique      | Heads of Department (FM, CR, FU)                |
| Permanence siège  | Duty Manager Marseille (rotation hebdo)         |
| Permanence Asie   | 3 Duty Officers (DO FM Singapour, DO CR Singapour, DO FU Chine) |

Les onglets, templates SITREP, modes GREEN/AMBER/RED et le cycle
quotidien/hebdo découlent de cette organisation. Voir
`docs/organization-cma-ships.md` pour le détail du cycle.

**Ne jamais inventer** un rôle (ex. "DO Europe") ou renommer un
département. Le vocabulaire est contractuel.

## A5. Hors périmètre SSE

Safety / Security / Environment = **outil tiers dédié** chez CMA Ships.
CrisisCell ne couvre que la **disponibilité technique** (navires,
équipages, chantiers).

**Ne pas étendre** vers SSE sans demande explicite de l'utilisateur. Le
README le dit, les templates SITREP le disent, c'est une position
assumée.

## A6. Pilotage par exception

`includeInSitrep` doit être explicitement coché pour qu'un dossier
remonte dans le SITREP CMA. Filtre strict : `=== true`, pas `!== false`.

**Pourquoi** : les Duty Officers trient activement dans leurs *My
SITREP FM/CR/FU*. Le SITREP CMA n'est pas un dump — c'est une
sélection intentionnelle par les DO, consolidée par le DM.

**Conséquence** : un dossier synthétique importé sans `includeInSitrep`
explicite n'apparaît pas dans le SITREP CMA. Normal. L'utilisateur peut
cliquer "Select all" dans My SITREP pour tout inclure.

## A7. Feed + drill-down pour 438 navires

La flotte CMA Ships = ~438 navires. **Pas** de page par navire
persistante. À la place :

- Import d'un CSV flotte (100+ colonnes : VesselName, IMO, Fleet,
  Ship Manager, M/E specs, A/E 1-6, fuel type, DPA/CSO, etc.).
- Détection automatique du navire dans le texte d'un dossier (nom +
  variantes de préfixe CMA CGM/CC/APL + IMO 7 chiffres + previous name).
- Accès par filtres multi-axes dans l'onglet Analytics (fleet, ship
  manager, fuel, département, type, sévérité, période, …).

**Conséquence** : ne pas proposer "une page dédiée par navire" — c'est
antinomique à l'échelle 438.

## Arborescence actuelle

```
CrisisCell/
├── CLAUDE.md              # entrée session Claude
├── .claude/
│   ├── settings.json      # permissions bash lecture seule
│   ├── rules/             # règles par zone (globs)
│   └── skills/
│       └── ship-change/   # boucle edit → check → commit → merge
├── docs/                  # le présent dossier
├── index.html             # single-page, CSP stricte
├── app.js                 # IIFE unique, ~4600 lignes
├── auth.js                # WebCrypto, lockout
├── styles.css             # design tokens + composants
├── data/
│   └── playbooks.js       # templates SITREP, TRIGGERS, PLAYBOOKS…
├── README.md
└── LICENSE
```

## Ce que l'on ne fera pas (dette assumée)

- **Pas de tests automatisés** : volonté explicite. Le "test" c'est
  l'œil + `node --check`.
- **Pas d'éclatement en modules** : accepté pour la portabilité
  (ouverture directe depuis un USB possible).
- **Pas de synchro cloud** : l'export/import chiffré reste le seul
  mécanisme de partage entre postes.
- **Pas de CI** : pas de GitHub Actions, pas de build, pas de deploy
  pipeline.
- **i18n partielle** : chrome traduit, contenu des panneaux en anglais.
  Voir `docs/i18n-status.md`.

## À confirmer / incertitudes

- **Déploiement réel** (serveur Marseille ? GitHub Pages interne ?
  partage USB ?) — non confirmé.
- **Politique de rétention des SITREPs stockés** (`state.sitreps`) —
  hypothèse courante "garder tout, purge manuelle via Reset".
