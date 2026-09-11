import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Contact } from "./types";

/**
 * Dossier de données. Surchargeable par CONTACT_TRACKER_DATA_DIR (version
 * installée : %LOCALAPPDATA%ContactTracker) ; sinon <projet>/data comme avant.
 */
export const DATA_DIR =
  process.env.CONTACT_TRACKER_DATA_DIR?.trim() || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "contacts.json");

interface DbShape {
  contacts: Contact[];
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readDb(): DbShape {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) return { contacts: [] };
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.contacts)) return { contacts: [] };
    return parsed;
  } catch {
    // fichier corrompu → on le sauvegarde de côté plutôt que d'écraser
    const backup = DB_FILE + ".corrupt-" + Date.now();
    try {
      fs.copyFileSync(DB_FILE, backup);
    } catch {}
    return { contacts: [] };
  }
}

export function writeDb(db: DbShape) {
  ensureDir();
  // écriture atomique : fichier temporaire puis rename
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, DB_FILE);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
