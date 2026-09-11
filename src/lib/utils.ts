import type { Contact } from "./types";

/**
 * Une valeur déjà présente doit-elle être préservée ?
 *
 * L'import Excel écrit le texte affiché des cellules, pas le lien : d'où des
 * champs contenant « Ouvrir sur Spotify » au lieu d'une URL. Ces valeurs sont
 * inexploitables et doivent pouvoir être remplacées par l'auto-complétion,
 * contrairement à une vraie saisie de l'utilisateur.
 */
export function isUsableValue(field: string, value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const v = value.trim();
  if (field === "spotify") return v.includes("/artist/");
  if (["instagram", "twitter", "tiktok", "youtube", "website"].includes(field)) {
    return v.startsWith("@") || /https?:\/\//i.test(v);
  }
  return true;
}

// Transforme un handle ou une URL en lien cliquable
export function socialUrl(
  value: string | undefined,
  base: string
): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${base}${v.replace(/^@/, "")}`;
}

/** YYYY-MM-DD en heure locale */
export function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** HH:MM en heure locale */
export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** ISO → valeur d'un <input type="datetime-local"> (heure locale) */
export function isoToLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${toDateStr(d)}T${toTimeStr(d)}`;
}

/** valeur d'un <input type="datetime-local"> → ISO (ou undefined si vide) */
export function localInputToIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Règle du modèle (guide PARTIE 1 §1) : une fiche ne peut pas rester sans
 * prochaine action datée, sauf si elle est disqualifiée.
 * Renvoie le message d'erreur, ou null si la fiche est valide.
 */
export function missingNextAction(
  c: Pick<Contact, "status" | "nextAction" | "nextActionDate">
): string | null {
  if (c.status === "disqualifie") return null;
  const hasAction = typeof c.nextAction === "string" && c.nextAction.trim() !== "";
  const hasDate =
    typeof c.nextActionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.nextActionDate);
  if (hasAction && hasDate) return null;
  return "Une fiche ne peut pas rester sans prochaine action datée : renseigne « Prochaine action » et sa date (ou passe la fiche en Disqualifié).";
}
