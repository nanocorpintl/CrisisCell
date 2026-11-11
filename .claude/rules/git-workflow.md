---
description: Workflow git du dépôt — commits, feature branch, merge main
globs: ["**/*"]
---

# Workflow git

Tous les changements passent par la branche feature
`claude/crisis-management-tool-y7ANb`. On commit dessus, on push, puis on
merge dans `main` avec un merge commit (jamais en fast-forward).

## Séquence obligatoire après un changement

```bash
# 1. Sanity check ce qui a bougé (voir rules app-js / styles)
node --check app.js && echo OK

# 2. Commit sur la feature branch
git add -A
git commit -m "$(cat <<'EOF'
Titre impératif en anglais (sous ~70 car.)

- bullet 1 : ce qui a changé et pourquoi
- bullet 2 : …
EOF
)"

# 3. Push de la feature
git push -u origin claude/crisis-management-tool-y7ANb

# 4. Merge dans main (--no-ff pour garder le merge commit)
git checkout main
git merge --no-ff claude/crisis-management-tool-y7ANb \
  -m "Merge claude/crisis-management-tool-y7ANb into main"
git push -u origin main

# 5. Retour sur la feature pour la suite
git checkout claude/crisis-management-tool-y7ANb
```

## Règles dures

1. **Ne jamais commit tant que l'utilisateur ne l'a pas demandé.** On
   présente le diff et on attend.
2. **Ne jamais `git push -f` sur `main`.** Jamais, même en cas de
   divergence. Préfère un merge conflict résolu à la main.
3. **Ne jamais utiliser `--no-verify`, `--amend` sur un commit poussé,
   `git reset --hard origin/main`** sans demande explicite.
4. **Ne jamais pousser directement sur `main`.** Toujours via la feature
   branch + merge commit.
5. **Pas de prefix `feat:` / `fix:` / `chore:`.** Convention observée :
   titre impératif en anglais + liste de puces.
6. **Scope GitHub** : `nanocorpintl/crisiscell` uniquement. Tout autre
   repo sera refusé par la session.

## Si l'historique dévie

- Si un commit a atterri par erreur sur `main` (mon erreur passée) :
  reset `main` sur `origin/main`, cherry-pick le commit sur la feature,
  push `--force-with-lease` seulement sur la feature, **jamais** sur
  `main`.
- Si un pré-commit hook échoue : fixer la cause, ne jamais `--no-verify`.

## PR GitHub

Historiquement les premiers changements passaient par des PRs (#1 à #5),
puis le pattern est devenu "merge direct main depuis la feature branch".
Garder ce pattern par défaut. Ouvrir une PR seulement si l'utilisateur
le demande explicitement.
