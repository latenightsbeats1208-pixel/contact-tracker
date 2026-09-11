import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readDb } from "@/lib/db";
import type { Category } from "@/lib/types";
import {
  CATEGORY_LABELS,
  STAGE_LABELS,
  INTERACTION_LABELS,
  OBJECTION_LABELS,
  LEVEL_LABELS,
  CHANNEL_LABELS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/export?category=artist|producer|pro (optionnel → tout)
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") as Category | null;
  const db = readDb();
  const contacts = category
    ? db.contacts.filter((c) => c.category === category)
    : db.contacts;

  const rows = contacts.map((c) => {
    const lastInteraction = c.interactions[c.interactions.length - 1];
    return {
      "Catégorie": CATEGORY_LABELS[c.category],
      "Prénom": c.firstName ?? "",
      "Nom": c.name,
      "Rôle": c.role ?? "",
      "Étape": STAGE_LABELS[c.status] ?? c.status,
      "Prochaine action": c.nextAction ?? "",
      "Date": c.nextActionDate
        ? c.nextActionTime
          ? `${c.nextActionDate} ${c.nextActionTime}`
          : c.nextActionDate
        : "",
      "Objection": c.mainObjection ? OBJECTION_LABELS[c.mainObjection] : "",
      "Profil": c.level ? LEVEL_LABELS[c.level].split(" — ")[0] : "",
      "Canal": c.channel ? CHANNEL_LABELS[c.channel] : "",
      "Email": c.email ?? "",
      "Téléphone": c.phone ?? "",
      "Instagram": c.instagram ?? "",
      "Twitter/X": c.twitter ?? "",
      "TikTok": c.tiktok ?? "",
      "YouTube": c.youtube ?? "",
      "Spotify": c.spotify ?? "",
      "Site web": c.website ?? "",
      "Genre": c.genre ?? "",
      "Localisation": c.location ?? "",
      "Auditeurs mensuels": c.monthlyListeners ?? "",
      "Problème (ses mots)": c.problem ?? "",
      "Dernière action": lastInteraction
        ? `${lastInteraction.date} — ${INTERACTION_LABELS[lastInteraction.type] ?? lastInteraction.type}`
        : "",
      "Nb interactions": c.interactions.length,
      "Notes": c.notes ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const filename = category ? `contacts-${category}.xlsx` : "contacts-tous.xlsx";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
