---
description: Conventions de code pour app.js et data/*.js (vanilla JS, IIFE unique)
globs: ["app.js", "data/*.js", "auth.js"]
---

# Conventions `app.js` et `data/*.js`

`app.js` est un IIFE unique de ~4600 lignes, pas de modules, pas de
dépendances. Toute modification doit respecter les patterns ci-dessous.

## État global

- Un seul objet `state`, muté en place.
- Après toute mutation, appeler `save()` (persiste + chiffre) puis
  `setTab(currentTab)` pour re-render l'UI.
- Nouveau champ sur `state` ou sur un élément de `state.incidents[]` :
  **toujours nullable** et backward-compatible. Les vaults chiffrés
  existants des utilisateurs ne doivent pas casser.
- **Ne jamais renommer** un champ existant. Si c'est inévitable, écrire
  une migration côté `init()` qui lit l'ancien nom et crée le nouveau.

## Helpers disponibles

À utiliser plutôt que recréer :

| Helper                        | Rôle                                    |
|-------------------------------|-----------------------------------------|
| `el(tag, props, …children)`   | Crée un DOM node. `props` accepte `class`, `style`, `onclick`, etc. |
| `$('#id')` / `$$('.cls')`     | Shortcut `querySelector` / `All`         |
| `panel(title, body, foot?)`   | Carte de section standard                |
| `twoCol(l1, i1, l2, i2)`      | Deux champs côte à côte                  |
| `field(label, input)`         | Un champ avec son `<label>` au-dessus    |
| `tableEl(headers, rows)`      | Tableau simple (headers string)          |
| `badge(text, color)`          | Pill colorée (green/yellow/orange/red/blue/grey) |
| `kpiTile(label, value, var)`  | Tuile KPI (variants : ok/warn/danger/muted) |
| `openModal(title, node, {onSubmit})` | Ouvre la modale générique         |
| `closeModal()`                | Ferme la modale                          |
| `logMEL(cat, text, author?)`  | Ajoute une entrée dans le Duty Log       |
| `toast(msg, kind)`            | Notification transitoire                 |
| `fmtH(h)` / `fmtDTG(ts)`      | Formatters heures / horodatage           |
| `nowISO()` / `id()`           | ISO now / id unique                      |
| `currentUserName()`           | Nom de l'utilisateur connecté            |

## Pattern d'un renderer

```js
renderers.<tab> = (root) => {
  // 1. prépare les données
  const items = state.incidents.filter(…);

  // 2. construit l'UI via `el` + helpers
  root.appendChild(panel('Titre', el('div', {}, …)));
};
```

L'ordre d'exécution :
1. `setTab(name)` vide `#main`
2. appelle `renderers[name](root)`
3. le renderer peuple `root` avec `panel(…)`

## Modal + submit

```js
openModal('New case', form, { onSubmit: submit });
// `submit` est appelé par Ctrl+Enter aussi
```

Dans `submit()` :
- valider les champs requis (ex. `offhireActual` si `status === 'closed'`)
- construire `data` depuis les inputs
- muter `state` (push ou replace via `findIndex`)
- `save(); closeModal(); setTab(currentTab);` — **pas** `setTab('incidents')`,
  on reste sur l'onglet d'origine (choix UX validé).

## Champ `includeInSitrep` (strict)

Un dossier apparaît dans le SITREP CMA uniquement si
`i.includeInSitrep === true`. Pas `!== false`. Pas de valeur par défaut.
C'est voulu — "pilotage par exception" : l'utilisateur coche ce qu'il
veut remonter. Ne pas assouplir ce filtre sans demande explicite.

## Détection navire

`findVesselInText(str)` cherche :
- match exact du nom
- variantes de préfixe (CMA CGM, CC, APL)
- IMO (7 chiffres)
- nom précédent (`previousName` du registre)

Faille connue : les noms génériques (ex. "MARCO POLO") peuvent matcher
plusieurs navires. Si tu ajoutes un champ au registre qui aide à
désambiguïser, pense à l'ajouter dans la détection.

## Historique des modifications d'un dossier

Chaque case a `history: [{ ts, author, changes: [{field, from, to}] }]`.
À chaque update dans `incidentForm`, calculer le diff sur la liste
`tracked` et pousser une entrée. **Ajouter un nouveau champ ?** → ajouter
son nom à `tracked` sinon il n'apparaîtra pas dans le panneau historique.

## Interdits

- Pas de dépendance npm, pas de CDN, pas d'import ES6, pas de
  `require()`. Tout tient dans l'IIFE.
- Pas de `innerHTML = userInput` — toujours `textContent` ou `el`.
- Pas de `eval`, `Function(...)`, `with`.
- Pas de `localStorage` direct en clair — tout passe par `CrisisAuth` +
  `save()` / `load()`.
