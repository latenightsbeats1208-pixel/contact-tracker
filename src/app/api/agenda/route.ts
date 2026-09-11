import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { toDateStr, toTimeStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/agenda?today=YYYY-MM-DD&now=ISO
 *
 * Agenda des prochaines actions (guide PARTIE 1 §3, PARTIE 2 §7.4, §7.5) :
 *  - overdue  : nextActionDate < aujourd'hui
 *  - today    : nextActionDate = aujourd'hui
 *  - week     : aujourd'hui < nextActionDate ≤ aujourd'hui + 7 j
 *  - reminders: rappels « la veille + 1 h avant » (§7.5) calculés depuis
 *               appel1At / appel2At des fiches appel1_booke / appel2_booke
 * Les fiches disqualifiées sont exclues. `today` et `now` sont acceptés en
 * query pour ne pas dépendre de l'horloge (défaut = horloge du serveur).
 */

export type ReminderKind = "J-1" | "H-1";

export interface AgendaReminder {
  contactId: string;
  name: string;
  firstName?: string;
  status: Contact["status"];
  which: 1 | 2; // appel 1 ou appel 2
  kind: ReminderKind;
  at: string; // ISO — moment où envoyer le rappel
  date: string; // YYYY-MM-DD (heure locale du serveur)
  time: string; // HH:MM
  callAt: string; // ISO — heure de l'appel
  callDate: string; // YYYY-MM-DD
  callTime: string; // HH:MM
  due: boolean; // le rappel est à envoyer maintenant (at ≤ now)
}

/** Réponse de GET /api/agenda */
export interface AgendaResponse {
  date: string; // date de référence utilisée (YYYY-MM-DD)
  now: string; // instant de référence utilisé (ISO)
  weekEnd: string; // borne haute de « cette semaine » (incluse)
  overdue: Contact[];
  today: Contact[];
  week: Contact[];
  reminders: AgendaReminder[];
  counts: { overdue: number; today: number; week: number; reminders: number };
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function parseYmd(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function byActionDate(a: Contact, b: Contact): number {
  return (
    (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? "") ||
    (a.nextActionTime ?? "").localeCompare(b.nextActionTime ?? "") ||
    a.name.localeCompare(b.name, "fr")
  );
}

/** Rappels J-1 et H-1 d'un appel booké (guide §7.5 : « Rappel la veille + 1 h avant ») */
function callReminders(
  c: Contact,
  which: 1 | 2,
  now: Date,
  weekEndTs: number
): AgendaReminder[] {
  const callAt = parseIso(which === 1 ? c.appel1At : c.appel2At);
  if (!callAt) return [];
  // appel déjà passé → plus de rappel à envoyer (la cadence propose « appel X fait »)
  if (callAt.getTime() < now.getTime()) return [];
  const kinds: { kind: ReminderKind; at: Date }[] = [
    { kind: "J-1", at: new Date(callAt.getTime() - DAY) },
    { kind: "H-1", at: new Date(callAt.getTime() - HOUR) },
  ];
  return kinds
    .filter((k) => k.at.getTime() <= weekEndTs)
    .map((k) => ({
      contactId: c.id,
      name: c.name,
      firstName: c.firstName,
      status: c.status,
      which,
      kind: k.kind,
      at: k.at.toISOString(),
      date: toDateStr(k.at),
      time: toTimeStr(k.at),
      callAt: callAt.toISOString(),
      callDate: toDateStr(callAt),
      callTime: toTimeStr(callAt),
      due: k.at.getTime() <= now.getTime(),
    }));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const nowParam = params.get("now");
  if (nowParam && !parseIso(nowParam)) {
    return NextResponse.json({ error: "Paramètre now invalide (ISO attendu)" }, { status: 400 });
  }
  const todayParam = params.get("today");
  if (todayParam && !parseYmd(todayParam)) {
    return NextResponse.json(
      { error: "Paramètre today invalide (YYYY-MM-DD attendu)" },
      { status: 400 }
    );
  }
  const now = parseIso(nowParam) ?? new Date();
  const today = todayParam ?? toDateStr(now);
  const todayNoon = parseYmd(today) as Date;
  const weekEndDate = new Date(todayNoon);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = toDateStr(weekEndDate);
  // fin de journée (locale) de la borne « cette semaine »
  const weekEndTs = new Date(
    weekEndDate.getFullYear(),
    weekEndDate.getMonth(),
    weekEndDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const db = readDb();
  const active = db.contacts.filter((c) => c.status !== "disqualifie");

  const overdue: Contact[] = [];
  const todayList: Contact[] = [];
  const week: Contact[] = [];
  for (const c of active) {
    const d = c.nextActionDate;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (d < today) overdue.push(c);
    else if (d === today) todayList.push(c);
    else if (d <= weekEnd) week.push(c);
  }
  overdue.sort(byActionDate);
  todayList.sort(byActionDate);
  week.sort(byActionDate);

  const reminders: AgendaReminder[] = [];
  for (const c of active) {
    if (c.status === "appel1_booke") reminders.push(...callReminders(c, 1, now, weekEndTs));
    if (c.status === "appel2_booke") reminders.push(...callReminders(c, 2, now, weekEndTs));
  }
  reminders.sort((a, b) => a.at.localeCompare(b.at) || a.name.localeCompare(b.name, "fr"));

  const payload: AgendaResponse = {
    date: today,
    now: now.toISOString(),
    weekEnd,
    overdue,
    today: todayList,
    week,
    reminders,
    counts: {
      overdue: overdue.length,
      today: todayList.length,
      week: week.length,
      reminders: reminders.length,
    },
  };
  return NextResponse.json(payload);
}
