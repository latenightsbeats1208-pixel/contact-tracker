import type { ContactEmail, EmailType } from "./types";

/*
 * Extraction et classification des adresses email trouvées sur un profil
 * Instagram (bio + bouton « Adresse e-mail » des comptes business).
 *
 * L'enjeu n'est pas seulement de collecter : envoyer des prods à une adresse
 * de booking (ou l'inverse) grille le contact. Chaque adresse est donc typée
 * à partir de son contexte — la ligne de bio où elle apparaît — puis, à
 * défaut, de sa partie locale (booking@…, mgmt@…).
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// mots-clés par type, français + anglais. L'ordre des tests compte :
// booking avant management (une ligne « booking & mgmt » est avant tout
// une adresse de booking, le booker transmet).
// mots-clés FORTS par type, français + anglais. L'ordre des tests compte :
// booking avant management (une ligne « booking & mgmt » est avant tout
// une adresse de booking, le booker transmet).
const STRONG: [EmailType, RegExp][] = [
  [
    "booking",
    /\b(booking|bookings|book\b|reservation|concert|show|gig|tour|date de concert)/i,
  ],
  [
    "prods",
    /\b(prod|prods|beat|beats|instru|instrus|submission|submissions|demo|demos|loops?|send\s*(your)?\s*(beats|packs?)|type\s*beat)/i,
  ],
  [
    "management",
    /\b(mgmt|management|manager|managed by|business|biz|inquiries|inquiry|contact pro|professionnel|label|press|presse|pr\b)/i,
  ],
];
// pour la partie locale, pas de frontière de mot : « salitheartistMGMT@ »
// colle le mot-clé au reste (\b ne matcherait jamais)
const LOCAL: [EmailType, RegExp][] = [
  ["booking", /(booking|bookings)/i],
  ["prods", /(prods?|beats?|instrus?|submissions?|demos?)/i],
  ["management", /(mgmt|management|manager|business)/i],
];

function classify(address: string, context: string): EmailType {
  // 1. contexte explicite (ligne de bio) : c'est l'artiste qui annonce l'usage
  for (const [type, re] of STRONG) {
    if (re.test(context)) return type;
  }
  // 2. la partie locale de l'adresse (booking@, salitheartistmgmt@…)
  // — un « contact: » générique en bio ne doit pas masquer un mgmt collé
  const local = address.split("@")[0];
  for (const [type, re] of LOCAL) {
    if (re.test(local)) return type;
  }
  // 3. défaut : adresse de l'artiste
  return "artiste";
}

/** Extrait et type toutes les adresses d'un texte (bio), ligne par ligne. */
export function emailsFromText(
  text: string,
  source: string
): ContactEmail[] {
  const out: ContactEmail[] = [];
  for (const line of text.split(/\n+/)) {
    for (const m of line.matchAll(EMAIL_RE)) {
      const address = m[0].toLowerCase();
      out.push({
        address,
        type: classify(address, line),
        source: `${source} : « ${line.trim().slice(0, 60)} »`,
      });
    }
  }
  return out;
}

/** Type une adresse isolée (bouton email du profil : pas de ligne de contexte). */
export function typedEmail(
  address: string,
  source: string,
  context = ""
): ContactEmail {
  return {
    address: address.toLowerCase(),
    type: classify(address, context),
    source,
  };
}

/** Fusionne en dédoublonnant par adresse (la première occurrence gagne :
 *  la bio, plus explicite, doit être passée avant le bouton email). */
export function mergeEmails(
  ...lists: (ContactEmail[] | undefined)[]
): ContactEmail[] {
  const seen = new Map<string, ContactEmail>();
  for (const list of lists) {
    for (const e of list ?? []) {
      if (e.address && !seen.has(e.address)) seen.set(e.address, e);
    }
  }
  return [...seen.values()];
}
