import { NextRequest, NextResponse } from "next/server";
import { getInstagramProfile, hasIgSession } from "@/lib/instagram";
import { emailsFromText, typedEmail, mergeEmails } from "@/lib/emails";

export const dynamic = "force-dynamic";

function handleFrom(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const bare = v.match(/^@?([a-zA-Z0-9._]{2,30})$/);
  if (bare) return bare[1];
  const m = v.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/);
  return m ? m[1] : null;
}

// POST { instagram } → adresses email typées trouvées sur le profil
// (bio ligne par ligne + bouton « Adresse e-mail » des comptes business)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const handle = handleFrom(String(body.instagram ?? ""));
  if (!handle) {
    return NextResponse.json(
      { error: "Handle Instagram manquant ou illisible" },
      { status: 400 }
    );
  }
  if (!hasIgSession()) {
    return NextResponse.json(
      {
        error:
          "La bio et le bouton email exigent le cookie IG_SESSIONID (voir .env.example) — sans lui, Instagram ne montre rien",
      },
      { status: 400 }
    );
  }

  const res = await getInstagramProfile(handle);
  if (!res.ok) {
    const msg =
      res.reason === "rate_limited"
        ? `Instagram limite les requêtes${res.retryAfterMin ? ` — réessaie dans ~${res.retryAfterMin} min` : ""}`
        : res.reason === "not_found"
          ? `Le profil @${handle} n'existe pas`
          : "Profil Instagram inaccessible pour le moment";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const p = res.profile;
  const warnings: string[] = [];
  if (p.biography === undefined && p.publicEmail === undefined) {
    warnings.push(
      "Bio inaccessible (session Instagram expirée ?) — seuls les éléments publics ont été lus"
    );
  }

  // la bio d'abord (contexte explicite), le bouton email ensuite
  const emails = mergeEmails(
    emailsFromText(p.biography ?? "", "Bio Instagram"),
    p.publicEmail
      ? [typedEmail(p.publicEmail, "Bouton « Adresse e-mail » du profil", p.category ?? "")]
      : []
  );

  return NextResponse.json({
    handle,
    emails,
    bio: p.biography ?? null,
    category: p.category ?? null,
    warnings,
  });
}
