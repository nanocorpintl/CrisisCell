/* CrisisCell — module de chiffrement et d'authentification.
 * - PBKDF2-SHA256 (250 000 itérations) pour la dérivation de clé
 * - AES-GCM 256 bits pour le chiffrement à reposer
 * - Verrou progressif anti brute force
 * - Clé jamais persistée : conservée en mémoire JS uniquement
 *
 * Ce qui est dans localStorage est INUTILISABLE sans mot de passe.
 */
(function () {
  'use strict';

  const AUTH_KEY = 'crisiscell.auth.v2';
  const VAULT_KEY = 'crisiscell.vault.v2';
  const SESSION_KEY = 'crisiscell.session';
  const ITER_DEFAULT = 250000;
  const SALT_LEN = 16;
  const IV_LEN = 12;
  const VERIFIER_PLAINTEXT = 'CRISISCELL_OK_v2';

  // Clé symétrique active : NEVER persisted, lives in JS heap only.
  let cachedKey = null;

  // ---------- helpers binaires ----------
  function buf2b64(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b642buf(b64) {
    const s = atob(b64);
    const arr = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }

  // ---------- WebCrypto wrappers ----------
  async function deriveKey(password, salt, iter) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,                  // non extractable
      ['encrypt', 'decrypt']
    );
  }

  async function encryptString(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    return { iv: buf2b64(iv), ct: buf2b64(ct) };
  }

  async function decryptString(key, ivB64, ctB64) {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b642buf(ivB64) },
      key,
      b642buf(ctB64)
    );
    return new TextDecoder().decode(pt);
  }

  // ---------- état d'auth ----------
  function readAuth() {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  function writeAuth(obj) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(obj));
  }

  function isInitialized() { return !!readAuth(); }
  function isUnlocked() { return !!cachedKey; }

  function lockoutInfo() {
    const a = readAuth();
    if (!a) return { locked: false };
    const now = Date.now();
    if (a.lockedUntil && a.lockedUntil > now) {
      return { locked: true, remainingMs: a.lockedUntil - now, attempts: a.failedAttempts || 0 };
    }
    return { locked: false, attempts: a.failedAttempts || 0 };
  }

  // ---------- API publique ----------
  async function setup(password) {
    if (!window.crypto?.subtle) throw new Error('WebCrypto indisponible (HTTPS ou localhost requis).');
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error('Mot de passe trop court (12 caractères minimum).');
    }
    const strength = passwordStrength(password);
    if (strength < 4) throw new Error('Mot de passe trop faible. Combinez majuscules, minuscules, chiffres et symboles.');

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const key = await deriveKey(password, salt, ITER_DEFAULT);
    const verifier = await encryptString(key, VERIFIER_PLAINTEXT);

    writeAuth({
      v: 2,
      salt: buf2b64(salt),
      iterations: ITER_DEFAULT,
      verifier: verifier.ct,
      verifierIv: verifier.iv,
      failedAttempts: 0,
      lockedUntil: 0,
      createdAt: new Date().toISOString()
    });

    cachedKey = key;
    return true;
  }

  async function unlock(password) {
    if (!window.crypto?.subtle) throw new Error('WebCrypto indisponible (HTTPS ou localhost requis).');
    const auth = readAuth();
    if (!auth) throw new Error('Application non initialisée.');
    const now = Date.now();
    if (auth.lockedUntil && auth.lockedUntil > now) {
      const wait = Math.ceil((auth.lockedUntil - now) / 1000);
      throw new Error(`Verrouillé. Réessayez dans ${wait}s.`);
    }

    const salt = b642buf(auth.salt);
    const key = await deriveKey(password, salt, auth.iterations || ITER_DEFAULT);

    let ok = false;
    try {
      const plain = await decryptString(key, auth.verifierIv, auth.verifier);
      ok = (plain === VERIFIER_PLAINTEXT);
    } catch { ok = false; }

    if (!ok) {
      auth.failedAttempts = (auth.failedAttempts || 0) + 1;
      // Lockout progressif
      let lockMs = 0;
      const a = auth.failedAttempts;
      if (a >= 10) lockMs = 60 * 60 * 1000;        // 1h
      else if (a >= 7) lockMs = 15 * 60 * 1000;    // 15 min
      else if (a >= 5) lockMs = 5 * 60 * 1000;     // 5 min
      else if (a >= 3) lockMs = 30 * 1000;         // 30 s
      if (lockMs) auth.lockedUntil = now + lockMs;
      writeAuth(auth);
      throw new Error(`Mot de passe invalide (${a} tentative${a > 1 ? 's' : ''}).`);
    }

    auth.failedAttempts = 0;
    auth.lockedUntil = 0;
    auth.lastUnlockAt = new Date().toISOString();
    writeAuth(auth);
    cachedKey = key;
    return true;
  }

  function lock() {
    cachedKey = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function changePassword(oldPwd, newPwd) {
    // Re-vérifie l'ancien
    if (!isUnlocked()) await unlock(oldPwd);
    // Récupère l'état déchiffré
    const state = await loadState();
    // Re-init avec le nouveau
    cachedKey = null;
    await setup(newPwd);
    if (state) await saveState(state);
    return true;
  }

  async function saveState(state) {
    if (!cachedKey) throw new Error('Coffre verrouillé.');
    const json = JSON.stringify(state);
    const { iv, ct } = await encryptString(cachedKey, json);
    localStorage.setItem(VAULT_KEY, JSON.stringify({ iv, ct, ts: Date.now() }));
  }

  async function loadState() {
    if (!cachedKey) throw new Error('Coffre verrouillé.');
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    try {
      const { iv, ct } = JSON.parse(raw);
      const json = await decryptString(cachedKey, iv, ct);
      return JSON.parse(json);
    } catch (e) {
      throw new Error('Coffre corrompu ou clé incorrecte.');
    }
  }

  function setUser(name) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, since: Date.now() }));
  }
  function getUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function reset() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(VAULT_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    cachedKey = null;
  }

  function passwordStrength(pwd) {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 12) s++;
    if (pwd.length >= 16) s++;
    if (pwd.length >= 20) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    return Math.min(s, 7);
  }

  function strengthLabel(score) {
    return ['Très faible','Très faible','Faible','Faible','Correct','Bon','Fort','Excellent'][score] || '—';
  }

  // ---------- Export encrypté ----------
  // Exporte le coffre tel quel (déjà chiffré). Utile pour backup ; le destinataire devra connaître le mot de passe.
  function exportEncryptedBlob() {
    const auth = readAuth();
    const vault = localStorage.getItem(VAULT_KEY);
    if (!auth || !vault) throw new Error('Rien à exporter.');
    return JSON.stringify({
      schema: 'crisiscell.encrypted.v2',
      auth, vault: JSON.parse(vault)
    }, null, 2);
  }
  function importEncryptedBlob(json) {
    const obj = JSON.parse(json);
    if (obj.schema !== 'crisiscell.encrypted.v2') throw new Error('Format inconnu.');
    if (!obj.auth || !obj.vault) throw new Error('Archive invalide.');
    localStorage.setItem(AUTH_KEY, JSON.stringify(obj.auth));
    localStorage.setItem(VAULT_KEY, JSON.stringify(obj.vault));
    cachedKey = null; // nécessite un déverrouillage avec le mot de passe d'origine
  }

  window.CrisisAuth = {
    isInitialized, isUnlocked, lockoutInfo,
    setup, unlock, lock, changePassword,
    saveState, loadState,
    setUser, getUser,
    reset, passwordStrength, strengthLabel,
    exportEncryptedBlob, importEncryptedBlob
  };
})();
