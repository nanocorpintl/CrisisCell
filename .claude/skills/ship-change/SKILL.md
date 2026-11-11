---
name: ship-change
description: Boucle standard pour livrer un changement — edit → sanity check → commit sur la feature → merge dans main → push. À utiliser à chaque fois que l'utilisateur demande une modification, un fix ou une petite feature sur CrisisCell.
---

# ship-change — boucle de livraison standard

Workflow répété ~60 fois sur ce dépôt. Toujours le même.

## Précondition : savoir ce qu'on change

Si la zone à modifier n'est pas identifiée :

```bash
grep -n "renderers\.<onglet>\|function <nom>" app.js | head
```

Lire le bloc concerné avec `Read` (pas en entier, la zone + ~30 lignes
de contexte).

## Étapes

### 1. Edit

Utiliser `Edit` (jamais `sed -i` sur des mots courts — voir
`docs/pitfalls.md`). Préserver l'indentation existante.

### 1.5. (Optionnel) Relecture ciblée

Pour un diff qui touche beaucoup de surface (ex. plusieurs renderers,
refonte CSS, nouveau champ sur case), **avant** le commit, invoquer
l'agent `crisiscell-reviewer` qui passe 4 checks ciblés (overrides
CSS, filtre `includeInSitrep`, champs nullable + `tracked`, popovers
dans `overflow`). Sauter cette étape pour un petit changement
localisé.

### 2. Sanity check

Toujours, sans exception :

```bash
node --check app.js && echo OK
```

Si CSS modifié :

```bash
node -e "const c=require('fs').readFileSync('styles.css','utf8'); \
  const o=(c.match(/\{/g)||[]).length, x=(c.match(/\}/g)||[]).length; \
  console.log('CSS braces:', o===x?'OK':'MISMATCH ('+o+'/'+x+')')"
```

Si `data/playbooks.js` modifié :

```bash
node --check data/playbooks.js && echo OK
```

**Ne pas commit si l'un échoue.** Corriger d'abord.

### 3. Commit sur la feature branch

Vérifier qu'on est bien dessus :

```bash
git branch --show-current   # claude/crisis-management-tool-y7ANb attendu
```

Puis :

```bash
git add -A
git commit -m "$(cat <<'EOF'
<Titre impératif en anglais, sous ~70 car.>

- <bullet : quoi a changé, pourquoi>
- <bullet : impact UX / data visible>
EOF
)"
```

### 4. Push et merge main

```bash
git push -u origin claude/crisis-management-tool-y7ANb

git checkout main
git merge --no-ff claude/crisis-management-tool-y7ANb \
  -m "Merge claude/crisis-management-tool-y7ANb into main"
git push -u origin main

git checkout claude/crisis-management-tool-y7ANb
```

Si l'une des commandes git échoue :
- **Push refusé** : `git fetch origin` d'abord, examiner la divergence.
  Ne jamais `--force` sur `main`.
- **Conflit au merge** : résoudre à la main. Si trop complexe, revenir
  vers l'utilisateur.

### 5. Confirmer à l'utilisateur

Message court (2–3 lignes max) : ce qui a bougé, où c'est visible dans
l'UI, le SHA du commit sur `main`.

Exemple :
> Livré et fusionné dans `main` (`<sha>`).
> - Case form : nouveau champ "Shipyard" visible quand Department = FU.
> - Historique étendu au champ.

## Variantes

### Pure CSS

Mêmes étapes, saute `node --check app.js`.

### Changement sur `data/playbooks.js`

Mêmes étapes, ajoute `node --check data/playbooks.js`. Rappel : les
constantes `SITREP_CMA_TEMPLATE` et `SITREP_CMA_TEMPLATE_FR` sont des
template strings — attention aux `{PLACEHOLDERS}` que `renderCMASitrep`
substitue (ajouter un nouveau placeholder sans update côté app.js
laisse le `{XXX}` dans l'output généré).

### L'utilisateur dit "fusionne avec main"

Étape 4 uniquement, en vérifiant d'abord qu'il y a bien des commits à
merger (`git log --oneline origin/main..claude/crisis-management-tool-y7ANb`).
Si rien à merger, le dire plutôt que de créer un merge commit vide.

## À ne pas faire

- Commit sans `node --check` préalable.
- Push sans merger dans `main` (le user veut voir les changements sur
  `main`).
- Enchaîner plusieurs changements sans commit intermédiaire — un sujet
  par commit, un merge commit par sujet.
- Oublier de revenir sur la feature branch après le merge.
