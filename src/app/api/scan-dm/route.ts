import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import {
  scanThread,
  readScanState,
  writeScanState,
  threadUrl,
} from "@/lib/dmscan";

export const dynamic = "force-dynamic";

const REASON_MESSAGES: Record<string, string> = {
  no_session:
    "Cookie de session manquant — renseigne IG_SESSIONID dans .env.local (voir .env.example) puis relance l'application.",
  session_expired:
    "Session Instagram expirée ou invalide — reconnecte-toi sur instagram.com puis mets à jour IG_SESSIONID dans .env.local.",
  rate_limited:
    "Instagram limite les requêtes (HTTP 429) — réessaie dans une trentaine de minutes.",
  unavailable: "Instagram n'a pas renvoyé la conversation — réessaie plus tard.",
};

function normHandle(v?: string): string {
  if (!v) return "";
  return v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
}

/*
 * POST { mode: "scan", full?: boolean }
 *   → { candidates, newestTs, reachedEnd, threadUrl }
 *   Lit la conversation depuis le dernier scan (ou tout l'historique si
 *   full). Ne modifie PAS l'état : les messages ne sont marqués traités
 *   qu'au moment de l'ack, une fois la sélection ajoutée.
 *
 * POST { mode: "ack", ts: number }
 *   → marque tous les messages jusqu'à ts comme traités.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.mode === "ack") {
    const ts = Number(body.ts);
    if (!ts) {
      return NextResponse.json({ error: "ts manquant" }, { status: 400 });
    }
    const state = readScanState();
    if (ts > state.lastTs) writeScanState({ lastTs: ts });
    return NextResponse.json({ ok: true });
  }

  const sinceTs = body.full ? 0 : readScanState().lastTs;
  const result = await scanThread(sinceTs);
  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[result.reason] ?? result.reason, reason: result.reason },
      { status: result.reason === "no_session" ? 400 : 502 }
    );
  }

  // déduplication contre la base : un handle déjà suivi n'est pas reproposé
  const db = readDb();
  const known = new Set(
    db.contacts.map((c) => normHandle(c.instagram)).filter(Boolean)
  );
  const fresh = result.candidates.filter((c) => !known.has(c.handle));

  return NextResponse.json({
    candidates: fresh,
    alreadyTracked: result.candidates.length - fresh.length,
    newestTs: result.newestTs,
    reachedEnd: result.reachedEnd,
    threadUrl: threadUrl(),
  });
}
