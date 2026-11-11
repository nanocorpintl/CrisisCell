# Pièges rencontrés et à ne pas refaire

Capitalisation des erreurs faites sur ce dépôt. À consulter dès qu'un
changement semble "facile" — c'est souvent là qu'on casse.

## 1. `sed -i` sur un mot court

**Ce qui s'est passé** : pour traduire "Du" (date) en "From", un
`sed -i "s/Du/From/g"` global a transformé :
- `Duty` → `Fromty`
- `Dubai` → `Frombai`
- `Due date` → `Frome date`

Même pattern plus tard avec "Au" → "To" qui a cassé `Auth` → `Toth` et
`Aucun` → `Tocun`.

**Règle** : jamais de `sed -i` sur un mot < 4 caractères, jamais sans
contexte. Utiliser `Edit` avec `old_string` incluant au moins 10-20
caractères autour du mot cible, ou `Grep` + Edit ciblé.

## 2. Modal qui se ferme au clic hors de la fenêtre

**Ce qui s'est passé** : un utilisateur remplissait un dossier
complexe et un clic accidentel dehors effaçait son travail.

**Fix en place** : listener `#modal click → closeModal if target.id ===
'modal'` **supprimé**. Seuls le bouton ✕ et Escape ferment. Ne pas
réintroduire ce listener.

## 3. Overflow qui clippe un popover

**Ce qui s'est passé** : le menu "Plus" (tab-more-pop) ne s'ouvrait
pas. Cause : `.tabs { overflow-x: auto }` crée un contexte où
`overflow-y` devient `auto` par spec, clippant verticalement l'enfant.

**Fix en place** : `.tab-more-pop { position: fixed }` avec
coordonnées calculées en JS depuis `getBoundingClientRect()` à
l'ouverture. Même pattern à retenir pour tout nouveau popover
descendant d'un conteneur scrollable.

## 4. Menu toujours visible malgré `hidden`

**Ce qui s'est passé** : `display: flex !important` sur un parent
écrasait l'attribut HTML `hidden`.

**Fix en place** :

```css
[hidden] { display: none !important; }
```

Ne pas supprimer cette règle.

## 5. Checkboxes étirées à 100 % de largeur

**Ce qui s'est passé** : la règle globale `input { width: 100%; }`
s'applique aussi aux checkboxes et radios, qui deviennent énormes.

**Fix en place** :

```css
input[type="checkbox"], input[type="radio"] {
  width: auto !important;
  accent-color: var(--accent);
}
```

## 6. Commit poussé sur `main` par erreur

**Ce qui s'est passé** : commit fait sur la feature branch, mais le
`git push` est parti alors que la branche locale pointait sur `main`.

**Récupération** :
```bash
git checkout main
git reset --hard origin/main   # avant le push erroné
# cherry-pick le commit sur la feature
git checkout claude/crisis-management-tool-y7ANb
git cherry-pick <sha>
git push --force-with-lease     # SEULEMENT sur la feature branch
```

**Jamais** `--force` sur `main`.

**Prévention** : toujours `git branch --show-current` avant un `git
push`. Le skill `ship-change` l'intègre.

## 7. `includeInSitrep` interprété comme `!== false`

**Ce qui s'est passé** : avant le changement récent, le filtre SITREP
CMA était `includeInSitrep !== false`, ce qui incluait tous les
dossiers sans la clé définie. Les dossiers synthétiques apparaissaient
tous, polluant le SITREP.

**Fix en place** : strict `=== true` dans `dossiersFor()`. **Conséquence**
: les dossiers importés sans clé explicite n'apparaissent plus. Si un
utilisateur s'en plaint, lui dire d'utiliser "Select all" dans My
SITREP FM/CR/FU.

Ne pas assouplir ce filtre.

## 8. Renommage de champ cassant les vaults

**Pas encore arrivé, mais imminent si on y pense pas** : renommer un
champ sur `state.incidents[]` (ex. `offhire` → `offhireHours`) rendrait
les anciens vaults silencieusement incomplets après `load()`.

**Règle** : jamais de rename. Si inévitable, migration dans `init()` :

```js
state.incidents.forEach(i => {
  if (i.offhire !== undefined && i.offhireHours === undefined) {
    i.offhireHours = i.offhire;
    delete i.offhire;
  }
});
save();
```

## 9. WebCrypto refuse de démarrer sur `file://`

**Ce qui s'est passé** : ouvrir `index.html` en double-clic ouvre
`file:///…/index.html`. WebCrypto `subtle` renvoie `undefined` dans ce
contexte sans message clair.

**Fix** : lancer un serveur local :
```bash
python3 -m http.server 8000
# ouvrir http://localhost:8000/
```

Un message dans l'écran d'auth détecte le cas :
> "WebCrypto unavailable. Servez ce site via HTTPS ou localhost."

## 10. Overrides CSS en cascade

**Ce qui s'est passé** : plusieurs blocs de styles historiques se
superposaient (`.tabs`, `.panel-header`, `.badge` redéfinis dans une
section "SIMPLIFICATION VISUELLE"). Toute modification nécessitait de
grep chaque classe pour savoir laquelle gagne.

**Nettoyé** lors du refactor Apple-style, mais le risque reste.

**Règle** : avant de toucher une classe du design système, toujours
`grep -n "\.<classe>" styles.css` et lire toutes les occurrences.

## 11. Suppression d'un placeholder de template SITREP

**Ce qui s'est passé** : des utilisateurs voyaient encore
`FRICTIONS TRANSVERSES` / `SIGNAUX FAIBLES` dans leurs SITREPs
générés. Cause : les blocs ont été retirés de `SITREP_CMA_TEMPLATE`
mais un historique `state.sitreps` contient les textes bruts
pré-refactor.

**Fix en place** : post-process regex dans `renderCMASitrep()` qui
strippe les blocs résiduels par sécurité. Garder ce post-process même
si les templates sont propres — il protège des SITREPs stockés.

## 12. Ajout d'un placeholder sans update du générateur

**À ne pas faire** : ajouter `{NEW_FIELD}` dans le template sans
`.replace('{NEW_FIELD}', …)` dans `renderCMASitrep()` → le placeholder
apparaîtra brut dans l'output.

Toujours : template modifié → `grep -n "{NEW_FIELD}" app.js` pour voir
si le `.replace()` est câblé.

## 13. `details.adv` qui n'existe plus

**Ce qui s'est passé** : des éléments `<details class="adv">` avaient
été introduits pour masquer des champs avancés, puis retirés. Un
sélecteur CSS orphelin peut traîner — à auditer si quelqu'un remet des
`<details>`.

## À ajouter ici si tu croises un nouveau piège

Ce fichier est **le mémoire** du dépôt. Plus il grossit, moins on
refait les mêmes erreurs.
