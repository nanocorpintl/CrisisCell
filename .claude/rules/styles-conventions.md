---
description: Conventions CSS (tokens, cascade, responsive, pièges)
globs: ["styles.css"]
---

# Conventions `styles.css`

~1300 lignes, pas de préprocesseur, pas de framework. Tout le design
système vit dans `:root` en haut du fichier.

## Design tokens dans `:root`

Toujours piocher dans les variables existantes avant d'écrire une
couleur, un radius ou une transition en dur :

- Palette : `--bg`, `--bg-2`, `--panel`, `--panel-solid`, `--panel-2`,
  `--border`, `--border-strong`, `--text`, `--muted`, `--muted-2`,
  `--accent`, `--accent-2`, `--accent-soft`
- Statuts : `--ok`, `--warn`, `--danger`, `--orange`, `--cma`
- Shadows : `--shadow-sm`, `--shadow`, `--shadow-lg`
- Radius : `--radius-sm` (6), `--radius` (10), `--radius-lg` (14)
- Transitions : `--t-fast` (140 ms), `--t-base` (260 ms)
- Fonts : `--font-sans`, `--mono`

## Attention à la cascade

Le fichier a plusieurs passes historiques superposées. **Avant de
modifier une classe** (`.tab`, `.panel-header`, `.badge`, `.kpi`, `th`,
`input`, `label`, `.topbar`, `.sitrep-pick-row`), toujours :

```bash
grep -n "\.<classe>" styles.css
```

et vérifier qu'une règle plus bas ne re-override pas. Cas déjà
rencontrés :

- `.tabs { height: 44px }` écrasait les tabs pill depuis une section
  "SIMPLIFICATION VISUELLE" plus bas — nettoyé.
- Deux définitions de `.sitrep-pick-block` et `.pick-dept-head` ont
  cohabité, la seconde gagnait.
- `.panel-body { overflow-x: auto }` global clippait des popovers
  verticalement — déplacé dans la media query mobile uniquement.

## Pièges connus

### Popovers descendant d'un conteneur scrollable

`.tabs { overflow-x: auto }` crée un contexte qui **clippe
verticalement** aussi (quand `overflow-x: auto`, `overflow-y` passe de
`visible` à `auto` par spec). Tout menu enfant (`.tab-more-pop`,
`.menu-pop`) doit utiliser `position: fixed` + coordonnées calculées en
JS depuis `getBoundingClientRect()`. Ne pas essayer de corriger avec
`overflow: visible` sur le parent, ça casse le scroll.

### `input[type="checkbox"]` étirés

La règle globale `input { width: 100%; }` écrase aussi les checkboxes
et radios. Garder la contre-règle :

```css
input[type="checkbox"], input[type="radio"] {
  width: auto !important;
  accent-color: var(--accent);
}
```

### `[hidden]` ignoré par flex

Si un conteneur avec `display: flex !important` contient un élément
`hidden`, l'attribut est ignoré. Garder :

```css
[hidden] { display: none !important; }
```

### iOS auto-zoom sur focus input

Safari iOS zoome quand on focalise un input dont `font-size < 16px`.
Sous le breakpoint 640 px, remonter à `font-size: 16px` sur inputs,
selects, textareas.

## Responsive — breakpoints en place

| Breakpoint        | Rôle                                          |
|-------------------|-----------------------------------------------|
| `max-width: 1100` | Grid 4 → 2, Grid 3/2 → 1 (desktop étroit)     |
| `max-width: 900`  | Tablette : brand-sub caché, paddings serrés   |
| `max-width: 700`  | Grid form-row.cols-* → 1 colonne              |
| `max-width: 640`  | Smartphone : top bar compact, tap target 36px+, modal edge-to-edge, tables en scroll horizontal |
| `max-width: 380`  | Très petits écrans : dernier resserrage       |
| `hover: none`     | Désactive les hover-lift (tactile)            |

Ne pas introduire un nouveau breakpoint sans raison — préfère resserrer
un existant.

## Sanity check avant commit

```bash
node -e "const c=require('fs').readFileSync('styles.css','utf8'); \
  const o=(c.match(/\{/g)||[]).length, x=(c.match(/\}/g)||[]).length; \
  console.log('CSS braces:', o===x?'OK':'MISMATCH ('+o+'/'+x+')')"
```

Doit afficher `OK`. Pas de linter CSS installé — cette vérif est le
minimum.

## Interdits

- Pas de `@import` d'une URL distante (CSP bloque + perf).
- Pas de `!important` sauf contre-règle nécessaire (checkboxes,
  `[hidden]`, et quelques overrides mobile ciblés).
- Pas de `position: absolute` sur un popover qui descend d'un `overflow`
  — voir piège plus haut.
- Pas de nouveau hex en dur quand un token existe (grep `--` d'abord).
