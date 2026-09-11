// Correctif de migration (idempotent) : une fiche migrée depuis « contacte »
// ou « en_discussion » a bien eu un DM envoyé → elle a atteint dm_en_cours
// avant son étape actuelle. Sans cet événement, l'entonnoir des métriques
// ne la compte pas dans « DM ouverts » (règle « atteint » = stageHistory).
import fs from "fs";
import path from "path";
const dataDir = process.env.CONTACT_TRACKER_DATA_DIR?.trim() || path.join(process.cwd(), "data");
const file = path.join(dataDir, "contacts.json");
const db = JSON.parse(fs.readFileSync(file, "utf-8"));
let fixed = 0;
for (const c of db.contacts) {
  const legacy = c.legacyStatus;
  if (!["contacte", "en_discussion", "relance"].includes(legacy)) continue;
  const hist = Array.isArray(c.stageHistory) ? c.stageHistory : [];
  if (hist.some((e) => e.stage === "dm_en_cours")) continue;
  // date du DM = première interaction premier_contact, sinon createdAt
  const dm = (c.interactions || []).find((i) => i.type === "premier_contact");
  const at = dm ? `${dm.date}T12:00:00.000Z` : c.createdAt;
  c.stageHistory = [{ stage: "dm_en_cours", at, note: `migration : DM envoyé (ancien statut ${legacy})` }, ...hist];
  fixed++;
}
if (fixed) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}
console.log(`fiches complétées : ${fixed} (relancer = 0 attendu)`);
