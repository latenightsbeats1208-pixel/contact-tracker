import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, nowIso } from "@/lib/db";
import type { Contact, StageEvent } from "@/lib/types";
import { isStage } from "@/lib/constants";
import { missingNextAction } from "@/lib/utils";

export const dynamic = "force-dynamic";

// PUT /api/contacts/:id → mise à jour (la fiche complète est envoyée)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = readDb();
  const idx = db.contacts.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }
  const existing = db.contacts[idx];
  const now = nowIso();
  const updated: Contact = {
    ...existing,
    ...body,
    id: existing.id, // jamais modifiable
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  if (!updated.name || !String(updated.name).trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  if (!isStage(updated.status)) {
    return NextResponse.json(
      { error: `Étape inconnue : ${String(updated.status)}` },
      { status: 400 }
    );
  }
  // Règle du modèle : pas de fiche sans prochaine action datée (sauf disqualifié)
  const ruleError = missingNextAction(updated);
  if (ruleError) {
    return NextResponse.json({ error: ruleError }, { status: 400 });
  }

  // Changement d'étape → on trace l'événement (sauf si le client l'a déjà poussé)
  if (updated.status !== existing.status) {
    const history: StageEvent[] = Array.isArray(updated.stageHistory)
      ? [...updated.stageHistory]
      : [...(existing.stageHistory ?? [])];
    const last = history[history.length - 1];
    if (!last || last.stage !== updated.status) {
      history.push({ stage: updated.status, at: now });
    }
    updated.stageHistory = history;
  }

  // on ne stocke ni les clés undefined, ni les champs vidés (""/null), ni le
  // champ historique nextFollowUpDate
  const clean = JSON.parse(JSON.stringify(updated)) as Contact & { nextFollowUpDate?: unknown };
  delete clean.nextFollowUpDate;
  const bag = clean as unknown as Record<string, unknown>;
  for (const key of Object.keys(bag)) {
    if (bag[key] === null || bag[key] === "") delete bag[key];
  }
  db.contacts[idx] = clean;
  writeDb(db);
  return NextResponse.json({ contact: clean });
}

// DELETE /api/contacts/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const before = db.contacts.length;
  db.contacts = db.contacts.filter((c) => c.id !== id);
  if (db.contacts.length === before) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }
  writeDb(db);
  return NextResponse.json({ ok: true });
}
