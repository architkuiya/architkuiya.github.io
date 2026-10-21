// Builds the encrypted vault for Sanchitalaya.
// Usage (from the repo root):
//   SANCHIT_PASS='your password' node build.mjs            encrypt sections/ into vault.json
//   SANCHIT_PASS='your password' node build.mjs --extract  decrypt vault.json back into sections/
// Reads sections.json, encrypts every listed section with AES-256-GCM
// (key from PBKDF2-SHA256, 600k iterations) and writes public/vault.json.
// The password itself is never written anywhere.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const pass = process.env.SANCHIT_PASS;
if (!pass || pass.length < 8) {
  console.error("Set SANCHIT_PASS (at least 8 characters).");
  process.exit(1);
}

const b64 = (u) => Buffer.from(u).toString("base64");
async function derive(salt, iter, usage){
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, [usage]);
}

if (process.argv.includes("--extract")) {
  const v = JSON.parse(readFileSync("vault.json", "utf8"));
  const key = await derive(Buffer.from(v.salt, "base64"), v.iter, "decrypt");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(v.iv, "base64") }, key, Buffer.from(v.data, "base64"));
  const { sections } = JSON.parse(new TextDecoder().decode(pt));
  mkdirSync("sections", { recursive: true });
  for (const s of sections) writeFileSync(`sections/${s.id}.html`, s.html);
  writeFileSync("sections.json", JSON.stringify(sections.map(({ id, title, note }) => ({ id, title, note, file: `sections/${id}.html` })), null, 2) + "\n");
  console.log(`Extracted ${sections.length} section(s) into sections/`);
  process.exit(0);
}

const sections = JSON.parse(readFileSync("sections.json", "utf8")).map((s) => ({
  id: s.id,
  title: s.title,
  note: s.note || "",
  html: readFileSync(s.file, "utf8"),
}));

const ITER = 250000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await derive(salt, ITER, "encrypt");
const plain = new TextEncoder().encode(JSON.stringify({ v: 1, sections }));
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));

writeFileSync("vault.json", JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) }));
console.log(`Encrypted ${sections.length} section(s) into vault.json`);
