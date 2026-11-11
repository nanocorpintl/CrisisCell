# État de l'i18n EN/FR

Couverture pragmatique, pas exhaustive. À lire avant d'ajouter des
clés ou d'étendre la bascule.

## Ce qui est bilingue (EN / FR)

Surfaces **chrome** uniquement :

- Tabs primaires et popover "Plus"
- Menu `···` (Shortcuts, Export, Import, Change password, OPS period,
  Reset)
- Alert select (`GREEN — Nominal` / `VERT — Nominal`, etc.)
- Titres top bar (`brand-sub`)
- Footer (deux spans)
- Sous-titre écran d'auth
- Bouton de bascule EN/FR dans le top bar

Mécanisme : dictionnaire `I18N` dans `app.js`, helper `t(key)`,
fonction `applyLang()` qui réaffecte les `textContent` au moment de la
bascule.

Préférence stockée dans `state.lang` et dans `localStorage.crisiscell.lang`.

## SITREP CMA — bascule séparée

Le SITREP généré a son **propre** sélecteur de langue à côté du bouton
"Generate". Il est **indépendant** de la langue UI.

- Template EN : `window.SITREP_CMA_TEMPLATE` (`data/playbooks.js`)
- Template FR : `window.SITREP_CMA_TEMPLATE_FR` (idem)
- Choix persisté dans `state.sitrepLang`.
- Chaque SITREP historique (`state.sitreps[]`) est tagué avec sa
  `lang`.

Fonction : `renderCMASitrep(synthesis, lang)` dans `app.js`.

## Ce qui **n'est pas** traduit

Tout le contenu des panneaux reste en anglais en dur :

- Labels de formulaires (`'Reference'`, `'Department'`, `'Vessel'`,
  `'Severity'`, `'Classification'`, `'Status'`…).
- Boutons inline (`'+ Add case'`, `'Edit'`, `'Delete'`, `'Save'`,
  `'Cancel'`, `'Generate SITREP'`…).
- En-têtes de tableaux (`'SITREP', 'Ref', 'Dept', …`).
- Placeholders (`'Type the name or paste text (auto-detect)'`).
- Messages toast (`'Case kept under monitoring…'`,
  `'At closure, the EXACT off-hire figure is mandatory.'`).
- Titres de panels (`'Technical & Crewing cases'`, `'Fleet'`, `'COP'`…).
- Modales (titres de sections `h4` : `'Off-hire'`, `'Mitigation &
  follow-up'`, `'Closure'`…).

**C'est voulu** — l'alignement groupe CMA CGM est sur l'anglais
(reporting au Group MM). La bascule chrome FR reste disponible pour
confort côté francophone, sans investir dans une traduction complète
du contenu.

## Dictionnaire `I18N` — clés déjà définies

Catégories (`app.js`, chercher `const I18N = {`) :

- `topbar.*` : lang toggle, alerte, lock, more, brand
- `menu.*` : items du menu `···`
- `tab.*` : chaque onglet
- `footer.*` : deux spans
- `auth.*` : sous-titre
- `btn.*` : actions communes (ajoutées en Pass 2, pas encore utilisées
  partout — voir ci-dessous)
- `label.*` : labels communs (idem)
- `common.*` : None / All / No data / Loading
- `sitrep.*` : Group / Sort / Language

## Clés disponibles mais pas encore branchées

Les sections `btn.*`, `label.*`, `common.*`, `sitrep.*` ont été
ajoutées en prévision d'une adoption plus large. Les renderers actuels
utilisent toujours les strings en dur. Pour les brancher :

1. Remplacer la string en dur dans le renderer par `t('btn.save')`.
2. Au `setTab(name)`, le renderer s'exécute et prend la langue
   courante. Pas besoin d'appeler `applyLang()` pour ces zones — elles
   se recréent à chaque rendu.

## Étendre la couverture

### Si on veut traduire un onglet entier

1. Grep les strings du renderer :
   ```bash
   grep -nE "'[A-Z][^']{4,}'" app.js | head
   ```
2. Pour chaque string pertinente, ajouter une clé dans `I18N` avec
   `{en: '…', fr: '…'}`.
3. Remplacer la string par `t('scope.key')`.
4. Tester le renderer dans les deux langues (bascule EN/FR).

### Si on veut un nouveau template (ex. SITREP FU dédié)

Convention : ajouter `window.SITREP_FU_TEMPLATE_EN` et
`window.SITREP_FU_TEMPLATE_FR` dans `data/playbooks.js`, et câbler la
sélection côté `renderCMASitrep` ou un nouveau `renderFUSitrep`.

## Limites assumées

- **Pas de i18n pour le contenu saisi par l'utilisateur** (noms de
  dossiers, synthèses, etc.). C'est son texte, on ne le touche pas.
- **Pas de pluralisation** (ex. "1 case" / "2 cases"). On utilise des
  strings fixes en anglais.
- **Dates formatées via `toLocaleDateString`** : prend `'fr-FR'` ou
  `'en-GB'` selon la langue. Fonctionne nativement.
- **Pas de gestion RTL** — l'outil est LTR uniquement.

## À confirmer

- **Position définitive sur l'anglais** : le refactor récent a basculé
  le contenu en anglais pour l'alignement groupe. Si le DM/DOs
  demandent un retour FR massif, c'est un chantier dédié (passer sur
  `t()` partout). Pas acté.
