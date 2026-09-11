import type { Contact, Stage } from "./types";
import { toDateStr, toTimeStr } from "./utils";

/**
 * Cadences de relance du guide (docs/methodologie-vente.md PARTIE 2
 * §7.4, §7.5, §9, §12, §13). Propose la prochaine action datée d'une fiche
 * selon son étape ; `suggestStage` signale qu'il faut changer d'étape (et
 * label/date sont alors la première action de la nouvelle étape).
 */
export interface CadenceAction {
  label: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  step?: number; // numéro de relance DM proposée (1-4)
  suggestStage?: Stage;
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// §7.4 — Relances (ghost en DM) : +4 h, +24 h, +3 j, +7 j. Maximum 4.
const DM_STEPS: { delayMs: number; label: string }[] = [
  { delayMs: 4 * HOUR, label: 'Relance 1 : "[Prénom] ?"' },
  { delayMs: 24 * HOUR, label: "Relance 2 : vocal 10 s" },
  { delayMs: 3 * DAY, label: "Relance 3 : conseil concret + 2 créneaux" },
  { delayMs: 7 * DAY, label: "Relance 4 : clôture, porte ouverte" },
];

// §13 — non / pas_maintenant : relance valeur toutes les 4-6 semaines
const VALUE_FOLLOWUP_MS = 35 * DAY;
export const RELANCE_VALEUR_LABEL = "Relance valeur (jamais \"t'as réfléchi ?\")";

function parseIso(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date YYYY-MM-DD → Date locale (à l'heure donnée, midi par défaut) */
function dateAt(ymd: string, hours = 12, minutes = 0): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours, minutes, 0, 0);
}

/**
 * Le « dernier DM/relance » = la dernière interaction premier_contact ou
 * relance ; à défaut updatedAt. Les interactions n'ont qu'une date : si
 * updatedAt tombe le même jour on reprend son heure, sinon midi.
 */
export function lastDmDate(c: Contact): Date {
  const updated = parseIso(c.updatedAt) ?? new Date();
  const dms = (c.interactions ?? []).filter(
    (i) => i.type === "premier_contact" || i.type === "relance"
  );
  if (dms.length === 0) return updated;
  const latest = dms.reduce((a, b) => (b.date > a.date ? b : a));
  if (latest.date === toDateStr(updated)) return updated;
  return dateAt(latest.date) ?? updated;
}

/** Dernière interaction, tous types confondus (date à midi, ou updatedAt si même jour) */
function lastInteractionDate(c: Contact): Date | null {
  const list = c.interactions ?? [];
  if (list.length === 0) return null;
  const latest = list.reduce((a, b) => (b.date > a.date ? b : a));
  const updated = parseIso(c.updatedAt);
  if (updated && latest.date === toDateStr(updated)) return updated;
  return dateAt(latest.date);
}

/** Date d'entrée dans l'étape courante (stageHistory), sinon updatedAt */
function stageEntryDate(c: Contact): Date {
  const hist = c.stageHistory ?? [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].stage === c.status) {
      const d = parseIso(hist[i].at);
      if (d) return d;
    }
  }
  return parseIso(c.updatedAt) ?? new Date();
}

function fmt(d: Date, withTime: boolean): { date: string; time?: string } {
  return withTime ? { date: toDateStr(d), time: toTimeStr(d) } : { date: toDateStr(d) };
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Premier candidat dont la date (au jour) n'est pas dépassée, sinon null */
function firstNotPassedByDay<T extends { at: Date }>(cands: T[], now: Date): T | null {
  const today = toDateStr(now);
  return cands.find((k) => toDateStr(k.at) >= today) ?? null;
}

function valueFollowUp(c: Contact, now: Date, suggestStage?: Stage): CadenceAction {
  // depuis le dernier contact (interaction ou entrée dans l'étape), sinon maintenant
  const last = lastInteractionDate(c);
  const entry = suggestStage ? now : stageEntryDate(c);
  const ref = last && last > entry ? last : entry;
  const base = ref > now ? now : ref;
  return {
    label: RELANCE_VALEUR_LABEL,
    date: toDateStr(new Date(base.getTime() + VALUE_FOLLOWUP_MS)),
    suggestStage,
  };
}

function dmCadence(c: Contact, now: Date): CadenceAction {
  const ref = lastDmDate(c);
  const step = Math.max(0, Math.min(4, c.relanceStep ?? 0));
  // premier palier non dépassé, à partir de la prochaine relance à faire
  for (let i = step; i < DM_STEPS.length; i++) {
    const at = new Date(ref.getTime() + DM_STEPS[i].delayMs);
    if (at >= now) {
      return { label: DM_STEPS[i].label, ...fmt(at, true), step: i + 1 };
    }
  }
  // 4 relances faites (ou toutes dépassées) → pas maintenant, relance valeur
  return valueFollowUp(c, now, "pas_maintenant");
}

function bookedCallCadence(
  c: Contact,
  now: Date,
  which: 1 | 2
): CadenceAction {
  const at = parseIso(which === 1 ? c.appel1At : c.appel2At);
  if (!at) {
    return { label: `Renseigner la date de l'appel ${which}`, date: toDateStr(now) };
  }
  // §7.5 — rappel la veille + 1 h avant, puis tenir l'appel
  const cands = [
    { label: "Rappel J-1", at: new Date(at.getTime() - DAY) },
    { label: "Rappel H-1", at: new Date(at.getTime() - HOUR) },
    { label: "Tenir l'appel", at },
  ];
  const next = cands.find((k) => k.at >= now);
  if (next) return { label: next.label, ...fmt(next.at, true) };
  // appel passé → étape suivante et sa première action
  return which === 1
    ? { ...afterCall1(c, now, at), suggestStage: "appel1_fait" }
    : { ...afterCall2(now, at), suggestStage: "appel2_fait" };
}

// §9 — entre les deux appels : message le jour même, démo J+1/J+2, appel 2 sous 72 h
function afterCall1(c: Contact, now: Date, callAt?: Date): CadenceAction {
  const ref = callAt ?? parseIso(c.appel1At) ?? stageEntryDate(c);
  const demoSent = (c.interactions ?? []).some(
    (i) => i.type === "demo" && i.date >= toDateStr(ref)
  );
  const cands = [
    { label: "Message récap avec ses mots", at: ref },
    ...(demoSent ? [] : [{ label: "Envoyer la démo 30 s", at: addDays(ref, 1) }]),
    { label: "Booker l'appel 2 (sous 72 h)", at: addDays(ref, 2) },
  ];
  const next = firstNotPassedByDay(cands, now);
  if (next) return { label: next.label, date: toDateStr(next.at) };
  return { label: "Booker l'appel 2 (sous 72 h)", date: toDateStr(now) };
}

// §10 E — décision : pas de « je réfléchis » qui traîne
function afterCall2(now: Date, callAt: Date): CadenceAction {
  const at = addDays(callAt, 1);
  return { label: "Obtenir la décision", date: toDateStr(at < now ? now : at) };
}

// §12 — après un oui : vocal sous 24 h, quick win sous 10 jours, témoignage dès le quick win
function clientCadence(c: Contact, now: Date): CadenceAction {
  const ref = stageEntryDate(c);
  const cands = [
    { label: "Message/vocal sous 24 h", at: addDays(ref, 1) },
    { label: "Quick win", at: addDays(ref, 10) },
    { label: "Demander le témoignage", at: addDays(ref, 11) },
  ];
  const next = firstNotPassedByDay(cands, now);
  if (next) return { label: next.label, date: toDateStr(next.at) };
  return { label: "Demander le témoignage", date: toDateStr(now) };
}

export function nextCadenceAction(c: Contact, now: Date): CadenceAction | null {
  switch (c.status) {
    case "disqualifie":
      return null;
    case "nouveau": {
      // DM déjà envoyé (interaction premier_contact) → la conversation est ouverte
      const dmSent = (c.interactions ?? []).some((i) => i.type === "premier_contact");
      if (dmSent) {
        const next = dmCadence(c, now);
        return { ...next, suggestStage: next.suggestStage ?? "dm_en_cours" };
      }
      return { label: "Envoyer le DM", date: toDateStr(now) };
    }
    case "dm_en_cours":
      return dmCadence(c, now);
    case "qualifie":
      return { label: "Booker l'appel 1 (lien + 2-3 sons + liens)", date: toDateStr(now) };
    case "appel1_booke":
      return bookedCallCadence(c, now, 1);
    case "appel1_fait":
      return afterCall1(c, now);
    case "appel2_booke":
      return bookedCallCadence(c, now, 2);
    case "appel2_fait":
      return afterCall2(now, parseIso(c.appel2At) ?? stageEntryDate(c));
    case "client":
      return clientCadence(c, now);
    case "non":
    case "pas_maintenant":
      return valueFollowUp(c, now);
    default:
      return null;
  }
}
