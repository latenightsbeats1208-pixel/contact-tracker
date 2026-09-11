import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, newId, nowIso } from "@/lib/db";
import type { Contact } from "@/lib/types";
import { isStage } from "@/lib/constants";
import { missingNextAction } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/contacts → tous les contacts
export async function GET() {
  const db = readDb();
  return NextResponse.json({ contacts: db.contacts });
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const num = (v: unknown): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[\s  .]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

// POST /api/contacts → créer un contact
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  const status = body.status ?? "nouveau";
  if (!isStage(status)) {
    return NextResponse.json({ error: `Étape inconnue : ${String(status)}` }, { status: 400 });
  }
  const now = nowIso();
  const contact: Contact = {
    id: newId(),
    category: body.category ?? "artist",
    name: body.name.trim(),
    role: str(body.role),
    email: str(body.email),
    emails: Array.isArray(body.emails) ? body.emails : undefined,
    phone: str(body.phone),
    instagram: str(body.instagram),
    twitter: str(body.twitter),
    tiktok: str(body.tiktok),
    youtube: str(body.youtube),
    spotify: str(body.spotify),
    website: str(body.website),
    genre: str(body.genre),
    location: str(body.location),
    status,
    notes: str(body.notes),
    interactions: Array.isArray(body.interactions) ? body.interactions : [],
    createdAt: now,
    updatedAt: now,

    firstName: str(body.firstName),
    channel: str(body.channel) as Contact["channel"],
    sourceContent: str(body.sourceContent),
    keyword: str(body.keyword),
    followers: num(body.followers),
    monthlyListeners: num(body.monthlyListeners),
    bestTrackStreams: num(body.bestTrackStreams),
    releasesCount: num(body.releasesCount),
    problem: str(body.problem),
    tried: str(body.tried),
    whyNow: str(body.whyNow),
    desire6m: str(body.desire6m),
    budgetSpent: str(body.budgetSpent),
    goalPrimary: str(body.goalPrimary),
    goalSecondary: str(body.goalSecondary),
    level: str(body.level) as Contact["level"],
    decisionMakerInvolved: bool(body.decisionMakerInvolved),
    decisionMakerWho: str(body.decisionMakerWho),
    priceDisclosed: bool(body.priceDisclosed),
    mainObjection: str(body.mainObjection) as Contact["mainObjection"],
    nextAction: str(body.nextAction),
    nextActionDate: str(body.nextActionDate),
    nextActionTime: str(body.nextActionTime),
    relanceStep: num(body.relanceStep),
    appel1At: str(body.appel1At),
    appel2At: str(body.appel2At),
    stageHistory: [{ stage: status, at: now, note: "création" }],
  };

  // Règle du modèle : pas de fiche sans prochaine action datée (sauf disqualifié)
  const ruleError = missingNextAction(contact);
  if (ruleError) {
    return NextResponse.json({ error: ruleError }, { status: 400 });
  }

  // on ne stocke pas les clés undefined
  const clean = JSON.parse(JSON.stringify(contact)) as Contact;
  const db = readDb();
  db.contacts.push(clean);
  writeDb(db);
  return NextResponse.json({ contact: clean }, { status: 201 });
}
