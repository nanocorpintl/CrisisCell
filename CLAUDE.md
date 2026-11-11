# CrisisCell — Operational Guide for Claude Sessions

Single-page web tool for CMA Ships' **operational continuity**: technical
vessel availability (Fleet Management), crew availability (Crewing),
shipyard progress (Fleet Upgrade). Outside SSE scope (dedicated tool).

## 1. What this repo is

- **Vanilla JS**, no build, no framework, no dependency. One `index.html`,
  one `app.js` (~4.6k lines), one `styles.css` (~1.3k lines), `auth.js`
  for crypto, `data/playbooks.js` for business constants.
- **Encrypted at rest** (AES-GCM 256, PBKDF2-SHA-256 250 000 iter, salt
  128 bits). One `localStorage` key: `cma_ships_vault_v1`. Key lives in
  RAM, auto-lock after 15 min idle, progressive lockout on wrong passwords.
- **Strict CSP**: no inline script, no CDN, `frame-ancestors 'none'`. Any
  new dependency breaks the posture — don't add one.
- **Deployed by opening `index.html`** on a browser that supports
  WebCrypto. Requires HTTPS or `localhost` — `file://` will not work.
- No tests, no linter, no CI. "The test" is the eye + `node --check`.

## 2. Rules you must follow

1. **Never add an external dependency, CDN link, or inline script.** CSP
   will block it and the hosting posture requires zero network trust.
2. **Never rename an existing field on `state` or on `state.incidents[]`.**
   Encrypted vaults in the field will silently drop renamed data. New
   fields are always nullable and backward-compatible.
3. **Never `sed -i` a short word** across the whole repo. "Du" → "From"
   broke Duty/Dubai. Use Edit/Grep with full surrounding context.
4. **Never `git push -f` to main, never `--no-verify`, never `--amend` a
   pushed commit.** Only ever commit to the feature branch.
5. **Never serve `index.html` via `file://` when testing.** WebCrypto
   silently refuses. Use `python3 -m http.server 8000` then
   `http://localhost:8000/`.
6. **`includeInSitrep` is strict (`=== true`).** A case not explicitly
   ticked does not appear in the generated SITREP CMA. This is by design,
   not a bug.
7. **SSE is out of scope.** Safety / Security / Environment live in a
   separate tool. Do not add features there without an explicit ask.
8. **GitHub scope** is restricted to `nanocorpintl/crisiscell`. Any other
   repo is denied.

## 3. Commands that work

```bash
# JS syntax check — run before every commit that touches *.js
node --check app.js
node --check auth.js
node --check data/playbooks.js

# CSS braces sanity (no linter installed)
node -e "const c=require('fs').readFileSync('styles.css','utf8'); \
  const o=(c.match(/\{/g)||[]).length, x=(c.match(/\}/g)||[]).length; \
  console.log('CSS braces:', o===x?'OK':'MISMATCH ('+o+'/'+x+')')"

# Serve locally (WebCrypto needs HTTPS or localhost)
python3 -m http.server 8000
# then open http://localhost:8000/

# Grep over the JS surface
grep -n "renderers\." app.js | head
grep -n "function incidentForm\|includeInSitrep" app.js
```

Commands that **do not** exist here: `npm install`, `npm test`, `eslint`,
`prettier`, `yarn`, `pnpm`, `vite`. The repo has no `package.json`.

## 4. Git workflow (repeated ~60× — follow exactly)

Feature branch is `claude/crisis-management-tool-y7ANb`. All work lands
there first, then merges to `main`.

```bash
# 1. Edit the files you need (Edit / Write)
# 2. Sanity-check what you changed
node --check app.js && echo OK

# 3. Commit on the feature branch
git add -A
git commit -m "$(cat <<'EOF'
<imperative title, under ~70 chars>

<empty line, then bullet-list of what moved and why>
EOF
)"

# 4. Push feature branch
git push -u origin claude/crisis-management-tool-y7ANb

# 5. Merge into main with a merge commit (no fast-forward)
git checkout main
git merge --no-ff claude/crisis-management-tool-y7ANb \
  -m "Merge claude/crisis-management-tool-y7ANb into main"
git push -u origin main

# 6. Back to the feature branch for the next change
git checkout claude/crisis-management-tool-y7ANb
```

Commit style: imperative English title + bullet list of what moved.
No conventional-commits prefixes. Don't commit unless the user asked.

## 5. Where to find what

| Looking for                               | Open this                               |
|-------------------------------------------|-----------------------------------------|
| App initialization, state shape, `save()` | `app.js` top (search `const state`)     |
| A tab's renderer                          | `app.js` → `grep -n "renderers\.<tab>"` |
| Case form (edit/new)                      | `app.js` → `function incidentForm`      |
| SITREP CMA generation                     | `app.js` → `function renderCMASitrep`   |
| SITREP templates (EN + FR)                | `data/playbooks.js`                     |
| Crypto, lockout, auto-lock                | `auth.js`                               |
| Design tokens, panels, buttons, tabs      | `styles.css` `:root` and first 400 lines|

## 6. Further reading

| File                                 | When to read                              |
|--------------------------------------|-------------------------------------------|
| `docs/architecture.md`               | Before any structural change              |
| `docs/organization-cma-ships.md`     | Before touching SITREP / roles / tabs     |
| `docs/data-model.md`                 | Before adding/renaming a `state` field    |
| `docs/security.md`                   | Before touching `auth.js` or `index.html` |
| `docs/pitfalls.md`                   | When something feels unsafe to change     |
| `docs/i18n-status.md`                | When extending EN/FR coverage             |
| `.claude/rules/git-workflow.md`      | Auto-loaded                               |
| `.claude/rules/app-js-conventions.md`| Auto-loaded when editing `app.js`         |
| `.claude/rules/styles-conventions.md`| Auto-loaded when editing `styles.css`     |
| `.claude/skills/ship-change/`        | The edit → check → commit → merge loop    |
