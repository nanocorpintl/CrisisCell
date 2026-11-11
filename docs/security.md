# Sécurité

Posture détaillée. À lire avant toute modification de `auth.js`,
`index.html` (CSP), ou du mécanisme de persistance.

## Chiffrement

| Mesure                   | Détail                                                  |
|--------------------------|---------------------------------------------------------|
| Algorithme               | AES-GCM 256 bits                                        |
| Dérivation de clé        | PBKDF2-SHA-256, 250 000 itérations                      |
| Sel                      | 128 bits, aléatoire par vault                           |
| IV (nonce)               | 96 bits, aléatoire par chiffrement                      |
| Stockage de la clé       | Mémoire JS uniquement, jamais persistée                 |
| Stockage du coffre       | `localStorage['cma_ships_vault_v1']`                    |
| Format                   | base64(salt + iv + ciphertext + authTag)                |

Tout tient dans **une seule** entrée `localStorage`. Pas de fichier
clair sur disque.

## Protection anti brute-force

Lockout progressif après échecs successifs (défini dans `auth.js`) :

| Échecs cumulés | Blocage |
|----------------|---------|
| 5              | 30 s    |
| 10             | 5 min   |
| 15             | 15 min  |
| 20+            | 1 h     |

Le compteur persiste côté `localStorage` (clair, séparé du vault) pour
survivre aux reload. Reset sur login réussi.

## Auto-lock

- 15 min d'inactivité → effacement de la clé en RAM → re-prompt
  mot de passe.
- Événements qui comptent comme "activité" : `mousemove`, `keypress`,
  `click`.
- Pas de token de session persistant. Reload = re-login.

## Mot de passe utilisateur

- Minimum 12 caractères.
- Score de complexité ≥ 4/7 (évalué localement).
- **Perte = irrécupérable.** Pas de reset, pas de récupération.
  L'utilisateur doit être prévenu lors du setup initial.

## CSP (Content Security Policy)

Déclarée en `<meta http-equiv="Content-Security-Policy">` dans
`index.html` :

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
form-action 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
manifest-src 'self';
```

**Conséquences dures** :
- Aucun script inline (tous les `onclick` du HTML sont attachés côté
  JS via addEventListener — pas inline).
- Aucun CDN, aucun `<script src="https://…">`.
- Aucun fetch/XHR hors du domaine.
- Aucun iframe de l'outil.
- `style 'unsafe-inline'` toléré car l'app utilise beaucoup de
  `style="..."` inline (côté renderers) — à durcir si l'app est
  refactorée vers des classes.

## Export / import

- **Export chiffré** (recommandé) : même format que le vault local,
  importable sur un autre poste avec le même mot de passe.
- **Export en clair** (JSON) : confirmation explicite + warning
  utilisateur. Destiné aux audits uniquement.
- Les exports n'incluent pas les secrets du navigateur (sessionStorage,
  cookies…) — rien à part le state métier.

## Limites assumées

1. **Un mot de passe par poste.** Pas de multi-utilisateur par vault.
   Pour partager entre DM/DO : export chiffré → transfert sécurisé →
   import.
2. **Pas de chiffrement des sauvegardes externes.** L'utilisateur est
   responsable du transport de l'export (USB chiffré, mail avec
   chiffrement, etc.).
3. **Pas de 2FA.** Le mot de passe + l'accès physique au navigateur =
   accès total. Hypothèse : le poste est déjà sous contrôle corporate
   (session verrouillée, chiffrement disque).
4. **Pas d'audit log.** Les actions ne sont pas tracées hors du Duty
   Log (saisi volontairement) — pas de traçabilité forensique.
5. **WebCrypto dépend du navigateur.** Un vieux Safari peut avoir une
   implémentation incomplète de PBKDF2 à 250 000 itérations — testé
   Chrome/Edge/Firefox récents, Safari < 15 non vérifié.

## Que ne pas faire côté code

- Ne pas logger `state`, un ciphertext, un sel, un IV ou la clé dérivée
  dans la console en production.
- Ne pas sérialiser la clé dans `localStorage` / `sessionStorage` /
  `IndexedDB`. Elle vit en RAM.
- Ne pas accepter un `postMessage` d'un parent (l'outil est
  `frame-ancestors 'none'` donc impossible en pratique, mais ne pas
  câbler un listener au cas où).
- Ne pas introduire de dépendance crypto tierce — WebCrypto natif
  suffit, et une lib ajouterait une surface d'attaque.
- Ne pas remonter `telemetry`, `error reporting`, `analytics` externes
  — zéro réseau sortant.

## Si l'utilisateur perd son mot de passe

Le dire sans détour :
> Votre mot de passe est perdu, les données sont irrécupérables. Le
> chiffrement AES-GCM 256 + PBKDF2 250 000 itérations rend le
> déchiffrement non faisable. Vous pouvez "Reset everything" pour
> repartir d'un vault vierge, ou ré-importer un export chiffré dont
> vous connaissez le mot de passe.

Ne jamais proposer de "contourner" le chiffrement. C'est tout l'intérêt
de la posture.
