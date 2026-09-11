import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readDb, writeDb, newId, nowIso } from "@/lib/db";
import type { Contact, Category, Channel, ImportField } from "@/lib/types";
import { IMPORT_FIELDS } from "@/lib/types";
import { todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Canal d'origine (guide §3) : texte libre du fichier → tiktok / instagram / autre
function normalizeChannel(value: string): Channel {
  const v = value.toLowerCase();
  if (v.includes("tik")) return "tiktok";
  if (v.includes("insta") || v.includes("ig")) return "instagram";
  return "autre";
}

// Devine le champ cible à partir d'un en-tête de colonne
function guessField(header: string): ImportField | "" {
  const h = header.toLowerCase().trim();
  if (!h) return "";
  // Format Google Contacts
  if (h === "name" || h === "nom" || h === "artiste" || h === "artist" || h === "nom complet" || h === "full name" || h === "pseudo") return "name";
  if (h === "prénom" || h === "prenom" || h === "first name" || h === "given name") return "firstName";
  if (h === "canal" || h === "channel" || h === "source") return "channel";
  if (h.includes("insta")) return "instagram";
  if (h.includes("mail")) return "email"; // couvre email, e-mail, "E-mail 1 - Value"
  if (h.includes("phone") || h.includes("tél") || h === "tel" || h.includes("telephone") || h.includes("mobile") || h.includes("portable")) return "phone";
  if (h.includes("twitter") || h === "x") return "twitter";
  if (h.includes("tiktok")) return "tiktok";
  if (h.includes("youtube") || h.includes("yt")) return "youtube";
  if (h.includes("spotify")) return "spotify";
  if (h.includes("site") || h.includes("website") || h.includes("web")) return "website";
  if (h.includes("genre") || h.includes("style")) return "genre";
  if (h.includes("ville") || h.includes("city") || h.includes("location") || h.includes("pays") || h.includes("région") || h.includes("region") || h.includes("localisation")) return "location";
  if (h.includes("note") || h.includes("comment") || h.includes("remarque")) return "notes";
  if (h.includes("rôle") || h.includes("role") || h.includes("fonction") || h.includes("poste") || h.includes("job") || h.includes("title") || h.includes("organization 1 - title")) return "role";
  return "";
}

function parseWorkbook(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  // supprime les lignes entièrement vides
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

// Cas particulier Google Contacts : pas de colonne "Name" exploitable
// mais "First Name" + "Last Name" (ou "Given Name" + "Family Name")
function buildGoogleNameColumn(headers: string[], rows: string[][]) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const hasName = lower.some((h) => guessField(h) === "name");
  const firstIdx = lower.findIndex((h) => h === "first name" || h === "given name" || h === "prénom" || h === "prenom");
  const lastIdx = lower.findIndex((h) => h === "last name" || h === "family name" || h === "nom de famille");
  if (hasName || firstIdx === -1) return { headers, rows };
  // on ajoute une colonne synthétique "Nom" en tête
  const newHeaders = ["Nom", ...headers];
  const newRows = rows.map((r) => {
    const full = [r[firstIdx], lastIdx !== -1 ? r[lastIdx] : ""]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" ");
    return [full, ...r];
  });
  return { headers: newHeaders, rows: newRows };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // Étape 1 — preview : fichier envoyé en multipart, on renvoie en-têtes + lignes + mapping deviné
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }
    let rows: string[][];
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      rows = parseWorkbook(buffer);
    } catch {
      return NextResponse.json(
        { error: "Fichier illisible — formats acceptés : .csv, .xlsx, .xls" },
        { status: 400 }
      );
    }
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "Le fichier doit contenir une ligne d'en-têtes et au moins une ligne de données" },
        { status: 400 }
      );
    }
    let headers = rows[0].map((h) => String(h ?? "").trim());
    let dataRows = rows.slice(1);
    ({ headers, rows: dataRows } = buildGoogleNameColumn(headers, dataRows));
    const mapping = headers.map((h) => guessField(h));
    return NextResponse.json({
      headers,
      mapping,
      rows: dataRows.slice(0, 500), // garde-fou
      totalRows: dataRows.length,
    });
  }

  // Étape 2 — commit : JSON avec rows + mapping + category
  const body = await req.json();
  const { rows, mapping, category } = body as {
    rows: string[][];
    mapping: (ImportField | "")[];
    category: Category;
  };
  if (!Array.isArray(rows) || !Array.isArray(mapping) || !category) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const nameCol = mapping.findIndex((f) => f === "name");
  if (nameCol === -1) {
    return NextResponse.json(
      { error: "Aucune colonne mappée sur « Nom » — le nom est obligatoire" },
      { status: 400 }
    );
  }

  const db = readDb();
  const existingNames = new Set(
    db.contacts
      .filter((c) => c.category === category)
      .map((c) => c.name.toLowerCase().trim())
  );

  let imported = 0;
  let skippedNoName = 0;
  let skippedDuplicate = 0;

  for (const row of rows) {
    const name = String(row[nameCol] ?? "").trim();
    if (!name) {
      skippedNoName++;
      continue;
    }
    if (existingNames.has(name.toLowerCase())) {
      skippedDuplicate++;
      continue;
    }
    const now = nowIso();
    const contact: Contact = {
      id: newId(),
      category,
      name,
      status: "nouveau",
      // règle du modèle : toute fiche non disqualifiée a une prochaine action datée
      nextAction: "Envoyer le DM",
      nextActionDate: todayStr(),
      interactions: [],
      createdAt: now,
      updatedAt: now,
      stageHistory: [{ stage: "nouveau", at: now, note: "import" }],
    };
    mapping.forEach((field, i) => {
      if (!field || field === "name") return;
      if (!IMPORT_FIELDS.includes(field)) return;
      const value = String(row[i] ?? "").trim();
      if (!value) return;
      if (field === "channel") {
        contact.channel = normalizeChannel(value);
        return;
      }
      (contact as unknown as Record<string, unknown>)[field] = value;
    });
    db.contacts.push(contact);
    existingNames.add(name.toLowerCase());
    imported++;
  }

  writeDb(db);
  return NextResponse.json({ imported, skippedNoName, skippedDuplicate });
}
