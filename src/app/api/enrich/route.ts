import { NextRequest, NextResponse } from "next/server";
import { fetchJson, normalizeName } from "@/lib/fetch-page";
import {
  artistIdFromUrl,
  getArtistOverview,
  resolveArtist,
  SpotifyQuotaError,
  spotifyQuotaRemainingMin,
} from "@/lib/spotify";
import { getInstagramProfile, linksFromBio } from "@/lib/instagram";

export const dynamic = "force-dynamic";

interface EnrichFields {
  name?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  website?: string;
  genre?: string;
}

interface EnrichResult {
  fields: EnrichFields;
  info: string[]; // lignes ajoutées aux notes (audience…)
  warnings: string[];
  /* Fiabilité du lien Spotify quand il a été deviné à partir du nom :
   * "confirmed" = le handle Instagram du contact figure dans la bio Spotify ;
   * "probable"  = simple homonymie de nom, à vérifier à l'œil. */
  confidence?: "confirmed" | "probable";
}

type Target =
  | { kind: "instagram"; handle: string }
  | { kind: "spotify"; url: string }
  | { kind: "name"; query: string };

function parseTarget(raw: string): Target | null {
  const v = raw.trim();
  if (!v) return null;
  // @handle nu → Instagram
  const bare = v.match(/^@([a-zA-Z0-9._]{2,30})$/);
  if (bare) return { kind: "instagram", handle: bare[1] };

  const looksLikeUrl = /^https?:\/\//i.test(v) || /^[\w-]+\.[a-z]{2,}\//i.test(v);
  if (!looksLikeUrl) {
    // texte libre = nom d'artiste à rechercher sur Spotify
    return { kind: "name", query: v };
  }
  let u: URL;
  try {
    u = new URL(v.startsWith("http") ? v : `https://${v}`);
  } catch {
    return { kind: "name", query: v };
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "instagram.com") {
    const seg = u.pathname.split("/").filter(Boolean);
    // ignore les liens de posts/reels — il faut un profil
    if (seg.length >= 1 && !["p", "reel", "reels", "stories", "explore"].includes(seg[0])) {
      return { kind: "instagram", handle: seg[0] };
    }
    return null;
  }
  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^(?:\/intl-[a-z]{2})?\/artist\/([a-zA-Z0-9]+)/);
    if (m) {
      return { kind: "spotify", url: `https://open.spotify.com/artist/${m[1]}` };
    }
    return null;
  }
  return null;
}

async function enrichInstagram(handle: string, result: EnrichResult) {
  result.fields.instagram = `@${handle}`;
  const res = await getInstagramProfile(handle);

  if (!res.ok) {
    if (res.reason === "not_found") {
      result.warnings.push(`Le profil Instagram @${handle} n'existe pas`);
    } else if (res.reason === "rate_limited") {
      const min = res.retryAfterMin;
      result.warnings.push(
        `Instagram limite les requêtes depuis ta connexion (HTTP 429)${min ? ` — nouvelle tentative possible dans ~${min} min` : ""}. Le nom est cherché ailleurs.`
      );
    } else {
      result.warnings.push(
        "Instagram n'a pas renvoyé le profil (mur de connexion) — le nom est cherché ailleurs."
      );
    }
    return;
  }

  const p = res.profile;
  if (p.fullName) result.fields.name = p.fullName;
  if (p.followers) {
    result.info.push(
      `Instagram : ${p.followers.toLocaleString("fr-FR")} followers`
    );
  }
  // la bio contient souvent le lien Spotify / Linktree de l'artiste
  for (const url of linksFromBio(p)) {
    if (/open\.spotify\.com\/(intl-[a-z]{2}\/)?artist\//.test(url)) {
      if (!result.fields.spotify) result.fields.spotify = url;
    } else if (!result.fields.website) {
      result.fields.website = url;
    }
  }
}

function handleFromUrl(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:www\.)?[^/]+\/(?:@)?([^/?#]+)/);
  return m ? `@${m[1].replace(/^@/, "")}` : null;
}

async function enrichSpotify(url: string, result: EnrichResult) {
  result.fields.spotify = url;
  const id = artistIdFromUrl(url);

  // API interne du web player : la seule voie anonyme vers la bio
  // (liens sociaux) et les auditeurs mensuels.
  try {
    if (!id) throw new Error("id artiste illisible");
    const artist = await getArtistOverview(id);

    result.fields.name = artist.name;
    for (const link of artist.externalLinks) {
      switch (link.name.toUpperCase()) {
        case "INSTAGRAM":
          result.fields.instagram = handleFromUrl(link.url) ?? link.url;
          break;
        case "TWITTER":
        case "X":
          result.fields.twitter = handleFromUrl(link.url) ?? link.url;
          break;
        case "TIKTOK":
          result.fields.tiktok = handleFromUrl(link.url) ?? link.url;
          break;
        case "YOUTUBE":
          result.fields.youtube = link.url;
          break;
        case "FACEBOOK":
        case "WIKIPEDIA":
          break;
        default:
          if (!result.fields.website) result.fields.website = link.url;
      }
    }
    const listeners = artist.monthlyListeners;
    if (listeners) {
      result.info.push(
        `Spotify : ${listeners.toLocaleString("fr-FR")} auditeurs mensuels`
      );
    }
    return;
  } catch {
    // fallback : oEmbed public (nom uniquement, pas de bio)
  }
  try {
    const data = await fetchJson<{ title?: string }>(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    );
    if (data.title?.trim()) {
      result.fields.name = data.title.trim();
      result.warnings.push(
        "Bio Spotify inaccessible — réseaux sociaux non récupérés cette fois"
      );
    } else {
      result.warnings.push("Spotify n'a pas renvoyé le nom de l'artiste");
    }
  } catch {
    result.warnings.push("Spotify inaccessible — seul le lien a été rempli");
  }
}

interface MbArtist {
  score: number;
  name: string;
  tags?: { count: number; name: string }[];
}

async function genreFromMusicBrainz(name: string, result: EnrichResult) {
  try {
    const data = await fetchJson<{ artists?: MbArtist[] }>(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(
        `"${name}"`
      )}&fmt=json&limit=5`,
      { userAgent: "ContactTracker/0.1 (local app)" }
    );
    const match = (data.artists ?? []).find(
      (a) => a.score >= 90 && normalizeName(a.name) === normalizeName(name)
    );
    if (!match?.tags?.length) return;
    const genres = [...match.tags]
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((t) => t.name.charAt(0).toUpperCase() + t.name.slice(1));
    result.fields.genre = genres.join(", ");
  } catch {
    // MusicBrainz down / rate-limit → pas bloquant
  }
}

async function fansFromDeezer(name: string, result: EnrichResult) {
  try {
    const data = await fetchJson<{
      data?: { name: string; nb_fan?: number }[];
    }>(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`);
    // match strict par nom normalisé — jamais le premier résultat aveugle (homonymes)
    const match = (data.data ?? []).find(
      (a) => normalizeName(a.name) === normalizeName(name)
    );
    if (match?.nb_fan) {
      result.info.push(`Deezer : ${match.nb_fan.toLocaleString("fr-FR")} fans`);
    }
  } catch {
    // non bloquant
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const target = parseTarget(String(body.url ?? ""));
  // handle Instagram connu du contact : sert à lever l'ambiguïté entre homonymes
  const knownHandle = body.instagram ? String(body.instagram) : undefined;
  if (!target) {
    return NextResponse.json(
      {
        error:
          "Lien non reconnu — colle un lien Instagram, un lien Spotify, ou simplement le nom de l'artiste",
      },
      { status: 400 }
    );
  }

  const result: EnrichResult = { fields: {}, info: [], warnings: [] };

  if (target.kind === "name") {
    let found;
    try {
      found = await resolveArtist({
        name: target.query,
        instagramHandle: knownHandle,
      });
    } catch (e) {
      if (!(e instanceof SpotifyQuotaError)) throw e;
      /*
       * Recherche Spotify par nom indisponible (quota du token anonyme).
       * Deuxième voie : la bio Instagram, qui contient presque toujours le
       * lien Spotify de l'artiste. Elle n'utilise pas le même quota, et le
       * lien obtenu est plus sûr qu'une correspondance de nom.
       */
      const fallbackHandle = knownHandle
        ?.trim()
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/\/+$/, "");
      if (fallbackHandle) {
        await enrichInstagram(fallbackHandle, result);
        if (result.fields.spotify) {
          await enrichSpotify(result.fields.spotify, result);
          result.info.push("Lien Spotify récupéré depuis la bio Instagram");
          if (result.fields.name) {
            await Promise.all([
              result.fields.genre ? Promise.resolve() : genreFromMusicBrainz(result.fields.name, result),
              fansFromDeezer(result.fields.name, result),
            ]);
          }
          return NextResponse.json(result);
        }
      }
      const min = spotifyQuotaRemainingMin();
      return NextResponse.json(
        {
          error: `Quota de recherche Spotify dépassé — réessaie dans ~${min || 15} min. (Ce n'est pas un artiste introuvable : la recherche n'a pas pu être faite.)`,
          reason: "spotify_quota",
        },
        { status: 429 }
      );
    }
    if (!found.url) {
      return NextResponse.json(
        {
          error: found.ambiguous
            ? `${found.ambiguous} artistes portent exactement ce nom sur Spotify — impossible de trancher. Colle le lien Spotify, ou renseigne l'Instagram du contact pour lever le doute.`
            : `Aucun artiste Spotify trouvé pour « ${target.query} »`,
        },
        { status: 404 }
      );
    }
    if (found.genres?.length) {
      result.fields.genre = found.genres
        .slice(0, 2)
        .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
        .join(", ");
    }
    result.confidence = found.confidence === "confirmed" ? "confirmed" : "probable";
    if (found.confidence === "probable") {
      result.warnings.push(
        `Artiste trouvé par correspondance de nom (« ${found.name} ») — vérifie que c'est le bon`
      );
    }
    await enrichSpotify(found.url, result);
  } else if (target.kind === "instagram") {
    await enrichInstagram(target.handle, result);
    // la bio Instagram a donné un lien Spotify → on récupère tout le reste
    // (genre, autres réseaux, auditeurs) comme si le lien avait été collé
    if (result.fields.spotify) {
      await enrichSpotify(result.fields.spotify, result);
    }
    // fallback si Instagram n'a pas donné le nom : le handle lui-même,
    // matché strictement contre Deezer (daftpunk → "Daft Punk")
    if (!result.fields.name) {
      try {
        const data = await fetchJson<{ data?: { name: string }[] }>(
          `https://api.deezer.com/search/artist?q=${encodeURIComponent(
            target.handle
          )}&limit=5`
        );
        const match = (data.data ?? []).find(
          (a) => normalizeName(a.name) === normalizeName(target.handle)
        );
        if (match) {
          result.fields.name = match.name;
          result.info.push("Nom retrouvé via Deezer à partir du handle");
        }
      } catch {}
    }
    // toujours pas de Spotify ? on le cherche par nom, le handle servant
    // de preuve (il doit figurer dans la bio Spotify du candidat)
    if (!result.fields.spotify && result.fields.name) {
      const found = await resolveArtist({
        name: result.fields.name,
        instagramHandle: target.handle,
      });
      if (found.url) {
        await enrichSpotify(found.url, result);
        result.info.push("Page Spotify retrouvée à partir du nom");
      }
    }
  } else {
    await enrichSpotify(target.url, result);
  }

  // enrichissement croisé à partir du nom trouvé (APIs ouvertes, zéro quota Spotify)
  if (result.fields.name) {
    await Promise.all([
      result.fields.genre ? Promise.resolve() : genreFromMusicBrainz(result.fields.name, result),
      fansFromDeezer(result.fields.name, result),
    ]);
  }

  return NextResponse.json(result);
}
