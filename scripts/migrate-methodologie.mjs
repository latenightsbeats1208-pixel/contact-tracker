// Migration de l'ancien pipeline vers les 11 étapes du guide
// (docs/methodologie-vente.md PARTIE 2 §5). Idempotent : une fiche dont le
// status est déjà une étape du guide est ignorée.
//
//   node scripts/migrate-methodologie.mjs
//
// Date de référence figée (décision validée) : 2026-09-02T08:25:00.000Z.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.CONTACT_TRACKER_DATA_DIR?.trim() || path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "contacts.json");

const NOW_ISO = "2026-09-02T08:25:00.000Z";
const NOW = new Date(NOW_ISO);
const TODAY = toDateStr(NOW);

const STAGES = [
  "nouveau",
  "dm_en_cours",
  "qualifie",
  "appel1_booke",
  "appel1_fait",
  "appel2_booke",
  "appel2_fait",
  "client",
  "non",
  "pas_maintenant",
  "disqualifie",
];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// §7.4 — Relances (ghost en DM) : +4 h, +24 h, +3 j, +7 j (mêmes libellés que src/lib/cadence.ts)
const DM_STEPS = [
  { delayMs: 4 * HOUR, label: 'Relance 1 : "[Prénom] ?"' },
  { delayMs: 24 * HOUR, label: "Relance 2 : vocal 10 s" },
  { delayMs: 3 * DAY, label: "Relance 3 : conseil concret + 2 créneaux" },
  { delayMs: 7 * DAY, label: "Relance 4 : clôture, porte ouverte" },
];
const RELANCE_VALEUR = "Relance valeur (jamais \"t'as réfléchi ?\")";

// ---------- utilitaires dates (heure locale, comme src/lib/utils.ts) ----------

function toDateStr(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function toTimeStr(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function dateAtNoon(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

// Date de référence = dernière interaction premier_contact/relance, sinon updatedAt
// (même règle que lastDmDate dans src/lib/cadence.ts)
function refDate(c) {
  const updated = new Date(c.updatedAt || c.createdAt || NOW_ISO);
  const dms = (c.interactions ?? []).filter(
    (i) => i.type === "premier_contact" || i.type === "relance"
  );
  if (dms.length === 0) return updated;
  const latest = dms.reduce((a, b) => (b.date > a.date ? b : a));
  if (latest.date === toDateStr(updated)) return updated;
  return dateAtNoon(latest.date) ?? updated;
}

// Relance valeur étalée de façon déterministe entre +28 et +42 jours (index modulo 15)
function spreadValueDate(index) {
  return toDateStr(addDays(NOW, 28 + (index % 15)));
}

// Prochaine relance DM : premier palier non dépassé ; tous dépassés → null
function nextDmStep(ref, fromStep) {
  for (let i = fromStep; i < DM_STEPS.length; i++) {
    const at = new Date(ref.getTime() + DM_STEPS[i].delayMs);
    if (at >= NOW) {
      return { label: DM_STEPS[i].label, date: toDateStr(at), time: toTimeStr(at) };
    }
  }
  return null;
}

// « Spotify : 49 864 auditeurs mensuels » (espaces fines, points…) → 49864
function extractMonthlyListeners(notes) {
  if (!notes) return undefined;
  const m = /Spotify\s*:\s*([\d\s  .]+?)\s*auditeurs mensuels/i.exec(notes);
  if (!m) return undefined;
  const n = Number(m[1].replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ---------- migration d'une fiche ----------

function migrate(c, index) {
  const old = c.status;
  const out = { ...c };
  let stage;
  let nextAction;
  let nextActionDate;
  let nextActionTime;
  let relanceStep;

  const toValueFollowUp = (s) => {
    stage = s;
    nextAction = RELANCE_VALEUR;
    nextActionDate = spreadValueDate(index);
  };

  const toDm = (fromStep) => {
    const ref = refDate(c);
    const step = nextDmStep(ref, fromStep);
    if (step) {
      stage = "dm_en_cours";
      relanceStep = fromStep;
      nextAction = step.label;
      nextActionDate = step.date;
      nextActionTime = step.time;
    } else {
      toValueFollowUp("pas_maintenant");
    }
  };

  switch (old) {
    case "a_contacter":
      stage = "nouveau";
      nextAction = "Envoyer le DM";
      nextActionDate = TODAY;
      break;
    case "contacte": {
      const ref = refDate(c);
      const ageDays = (NOW.getTime() - ref.getTime()) / DAY;
      if (ageDays <= 7) toDm(0);
      else toValueFollowUp("pas_maintenant");
      break;
    }
    case "relance": {
      const done = (c.interactions ?? []).filter((i) => i.type === "relance").length;
      toDm(Math.min(4, done));
      break;
    }
    case "en_discussion":
      stage = "dm_en_cours";
      relanceStep = 0;
      nextAction = "Relancer la conversation";
      nextActionDate = toDateStr(addDays(NOW, 1));
      break;
    case "appel_fait":
      stage = "appel1_fait";
      nextAction = "Booker l'appel 2 (sous 72 h)";
      nextActionDate = TODAY;
      break;
    case "proposition":
    case "closing":
      stage = "appel2_fait";
      nextAction = "Obtenir la décision";
      nextActionDate = toDateStr(addDays(NOW, 1));
      break;
    case "client":
      stage = "client";
      nextAction = "Message/vocal sous 24 h";
      nextActionDate = toDateStr(addDays(NOW, 1));
      break;
    case "sans_reponse":
      toValueFollowUp("pas_maintenant");
      break;
    case "refuse":
      toValueFollowUp("non");
      break;
    default:
      // statut inconnu → on repart du début, sans rien perdre
      stage = "nouveau";
      nextAction = "Envoyer le DM";
      nextActionDate = TODAY;
  }

  out.status = stage;
  out.legacyStatus = old;
  out.stageHistory = [{ stage, at: NOW_ISO, note: `migration depuis ${old}` }];
  out.nextAction = nextAction;
  out.nextActionDate = nextActionDate;
  if (nextActionTime) out.nextActionTime = nextActionTime;
  if (relanceStep !== undefined) out.relanceStep = relanceStep;

  // ancienne date de relance → prochaine action (elle prime : c'était planifié)
  if (c.nextFollowUpDate) {
    out.nextActionDate = c.nextFollowUpDate;
    delete out.nextActionTime;
  }
  delete out.nextFollowUpDate;

  if (!out.channel && c.instagram) out.channel = "instagram";

  const listeners = extractMonthlyListeners(c.notes);
  if (out.monthlyListeners === undefined && listeners !== undefined) {
    out.monthlyListeners = listeners;
  }

  if (!Array.isArray(out.interactions)) out.interactions = [];
  return out;
}

// ---------- exécution ----------

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`Fichier introuvable : ${DB_FILE}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  const db = JSON.parse(raw);
  if (!Array.isArray(db.contacts)) {
    console.error("contacts.json invalide (pas de tableau contacts)");
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  const byLegacy = {};
  db.contacts = db.contacts.map((c, index) => {
    if (STAGES.includes(c.status)) {
      skipped++;
      return c;
    }
    byLegacy[c.status] = (byLegacy[c.status] ?? 0) + 1;
    migrated++;
    return migrate(c, index);
  });

  // écriture atomique : fichier temporaire puis rename (comme src/lib/db.ts)
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, DB_FILE);

  // résumé
  const byStage = {};
  for (const s of STAGES) byStage[s] = 0;
  let missingAction = 0;
  let withListeners = 0;
  const valueDates = {};
  for (const c of db.contacts) {
    byStage[c.status] = (byStage[c.status] ?? 0) + 1;
    if (c.status !== "disqualifie" && (!c.nextAction || !c.nextActionDate)) missingAction++;
    if (c.monthlyListeners !== undefined) withListeners++;
    if (c.nextAction === RELANCE_VALEUR) {
      valueDates[c.nextActionDate] = (valueDates[c.nextActionDate] ?? 0) + 1;
    }
  }

  console.log(`Migration méthodologie — référence ${NOW_ISO}`);
  console.log(`  fiches migrées : ${migrated}  |  déjà migrées (ignorées) : ${skipped}`);
  if (migrated) {
    console.log("  depuis :");
    for (const [k, v] of Object.entries(byLegacy)) console.log(`    ${k.padEnd(16)} ${v}`);
  }
  console.log("  répartition par étape :");
  for (const s of STAGES) console.log(`    ${s.padEnd(16)} ${byStage[s]}`);
  console.log(`  auditeurs mensuels extraits : ${withListeners}`);
  const dates = Object.keys(valueDates).sort();
  if (dates.length) {
    console.log(`  relances valeur étalées sur ${dates.length} dates (${dates[0]} → ${dates[dates.length - 1]}), ` +
      `max ${Math.max(...Object.values(valueDates))} par jour`);
  }
  console.log(`  sans prochaine action (hors disqualifié) : ${missingAction}  ${missingAction === 0 ? "OK" : "ANOMALIE"}`);
}

main();
