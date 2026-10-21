# Sanchitalaya

A small personal site. Everything except the lock screen is encrypted with a password, so the files in this repo reveal nothing on their own.

## How it works

`index.html` is the lock screen. `vault.json` holds every private section, encrypted with AES-256-GCM using a key derived from the password (PBKDF2, SHA-256, 600,000 rounds). The browser decrypts it only after the right password is typed. The password is never stored in this repo.

Ticks and other progress inside a section are saved in the visitor's own browser.

## Adding or changing a section

1. Get the private sources back (they are not committed):
   `SANCHIT_PASS='…' node build.mjs --extract`
2. Add a standalone HTML page to `sections/` and list it in `sections.json`.
3. Rebuild the vault: `SANCHIT_PASS='…' node build.mjs`
4. Commit `vault.json` and push. Never commit `sections/` or `sections.json`.

Changing the password is the same rebuild with a new value; everyone has to unlock again.
