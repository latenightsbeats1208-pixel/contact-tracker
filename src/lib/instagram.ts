import { fetchWithStatus, metaContent, decodeEntities } from "./fetch-page";

/*
 * Accès aux profils Instagram.
 *
 * L'ancien endpoint web_profile_info est MORT sur cette IP (429 permanent,
 * corps vide, et le cookie ne le débloque pas — blocage par endpoint).
 * Vérifié le 20/08/2026. Voies actuelles, dans l'ordre :
 *
 *   1. flux mobile anonyme  i.instagram.com/api/v1/feed/user/<handle>/username/
 *      → SANS cookie : nom complet, pk, 12 derniers posts (légendes + dates).
 *      ⚠ les posts ne sont PAS triés (épinglés en tête) → tri par taken_at.
 *   2. profil complet authentifié  i.instagram.com/api/v1/users/<pk>/info/
 *      → AVEC IG_SESSIONID : bio, lien externe, bouton « Adresse e-mail »
 *      (public_email), followers, catégorie. 236 champs au lieu de 7.
 *   3. page HTML avec User-Agent de crawler (facebookexternalhit)
 *      → repli : nom + followers via les balises og: (l'UA navigateur ne
 *      reçoit qu'une coquille vide).
 *
 * Garde-fous : cache 6 h par handle, disjoncteur 30 min après un 429.
 * Le flux (1) reste anonyme exprès : il consomme le quota de l'IP, jamais
 * celui du compte de l'utilisateur.
 */

const IG_APP_ID = "936619743392459";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min après un 429

export interface IgPost {
  caption: string;
  takenAt: string; // ISO
  daysAgo: number;
  kind: "reel" | "photo" | "carrousel" | "video";
  url: string;
  likes?: number;
  plays?: number;
  musicTitle?: string;
}

export interface IgProfile {
  handle: string;
  fullName?: string;
  pk?: string;
  biography?: string;
  externalUrl?: string;
  bioLinks?: string[];
  publicEmail?: string;
  category?: string;
  followers?: number;
  posts?: IgPost[];
}

export type IgResult =
  | { ok: true; profile: IgProfile }
  | { ok: false; reason: "rate_limited" | "not_found" | "unavailable" | "cookie_required"; retryAfterMin?: number };

const cache = new Map<string, { at: number; result: IgResult }>();
let blockedUntil = 0;

export function igCooldownRemainingMin(): number {
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 60000));
}

export function hasIgSession(): boolean {
  return !!process.env.IG_SESSIONID?.trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function parsePosts(items: any[]): IgPost[] {
  const now = Date.now();
  return [...(items ?? [])]
    // ⚠ posts épinglés renvoyés en tête : trier par date réelle
    .sort((a, b) => (b?.taken_at ?? 0) - (a?.taken_at ?? 0))
    .slice(0, 12)
    .map((i) => {
      const takenMs = (i?.taken_at ?? 0) * 1000;
      const kind =
        i?.product_type === "clips"
          ? "reel"
          : i?.media_type === 8
            ? "carrousel"
            : i?.media_type === 2
              ? "video"
              : "photo";
      return {
        caption: ((i?.caption?.text as string) ?? "").trim(),
        takenAt: new Date(takenMs).toISOString().slice(0, 10),
        daysAgo: Math.floor((now - takenMs) / 86_400_000),
        kind: kind as IgPost["kind"],
        url: i?.code ? `https://www.instagram.com/p/${i.code}/` : "",
        likes: i?.like_count ?? undefined,
        plays: i?.play_count ?? i?.ig_play_count ?? undefined,
        musicTitle:
          i?.clips_metadata?.music_info?.music_asset_info?.title ?? undefined,
      };
    });
}

/** Voie 1 — flux mobile, anonyme (jamais le cookie ici : quota d'IP, pas de compte). */
async function viaFeed(handle: string): Promise<IgResult | null> {
  const { status, body } = await fetchWithStatus(
    `https://i.instagram.com/api/v1/feed/user/${encodeURIComponent(handle)}/username/`,
    { headers: [`x-ig-app-id: ${IG_APP_ID}`], timeoutSec: 25 }
  );
  if (status === 429) return { ok: false, reason: "rate_limited" };
  if (status === 404) return { ok: false, reason: "not_found" };
  if (status !== 200 || !body.trim()) return null;
  try {
    const d = JSON.parse(body);
    const user = d?.user ?? d?.items?.[0]?.user ?? {};
    if (!user?.pk && !d?.items?.length) return null;
    return {
      ok: true,
      profile: {
        handle,
        fullName: (user.full_name as string)?.trim() || undefined,
        pk: user.pk ? String(user.pk) : undefined,
        posts: parsePosts(d.items),
      },
    };
  } catch {
    return null;
  }
}

/** Voie 2 — profil complet : exige IG_SESSIONID et le pk (fourni par la voie 1). */
async function viaAuthedInfo(pk: string): Promise<Partial<IgProfile> | null> {
  const sid = process.env.IG_SESSIONID?.trim();
  if (!sid) return null;
  const { status, body } = await fetchWithStatus(
    `https://i.instagram.com/api/v1/users/${pk}/info/`,
    {
      headers: [`x-ig-app-id: ${IG_APP_ID}`],
      cookies: `sessionid=${sid}`,
      timeoutSec: 25,
    }
  );
  if (status !== 200 || !body.trim()) return null;
  try {
    const user = JSON.parse(body)?.user;
    if (!user?.username) return null;
    const bioLinks: string[] = (user.bio_links ?? [])
      .map((l: any) => l?.url)
      .filter(Boolean);
    return {
      biography: (user.biography as string)?.trim() || undefined,
      externalUrl: user.external_url || bioLinks[0] || undefined,
      bioLinks,
      publicEmail: user.public_email || undefined,
      category: user.category || undefined,
      followers: user.follower_count ?? undefined,
      fullName: (user.full_name as string)?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

/** Voie 3 — balises og: via UA crawler (l'UA navigateur reçoit une coquille vide). */
async function viaHtml(handle: string): Promise<IgResult> {
  const { status, body } = await fetchWithStatus(
    `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    { userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" }
  );
  if (status === 429) return { ok: false, reason: "rate_limited" };
  if (status === 404) return { ok: false, reason: "not_found" };

  const title =
    metaContent(body, "og:title") ??
    (body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
  const m = decodeEntities(title).match(/^(.*?)\s*\(@([^)]+)\)/);
  if (!m?.[1]?.trim()) {
    return { ok: false, reason: "unavailable" };
  }
  const desc = metaContent(body, "og:description") ?? "";
  const f = desc.match(/^([\d.,]+)\s*([KMkm])?\s*(?:Followers|abonnés)/i);
  let followers: number | undefined;
  if (f) {
    const base = Number(f[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
    const mult = f[2]?.toUpperCase() === "M" ? 1e6 : f[2]?.toUpperCase() === "K" ? 1e3 : 1;
    if (!Number.isNaN(base)) followers = Math.round(base * mult);
  }
  return { ok: true, profile: { handle, fullName: m[1].trim(), followers } };
}

export async function getInstagramProfile(handle: string): Promise<IgResult> {
  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS && hit.result.ok) {
    return hit.result;
  }
  if (Date.now() < blockedUntil) {
    return { ok: false, reason: "rate_limited", retryAfterMin: igCooldownRemainingMin() };
  }

  let result: IgResult;
  try {
    result = (await viaFeed(handle)) ?? (await viaHtml(handle));
    // enrichissement authentifié : bio, lien externe, email public…
    if (result.ok && result.profile.pk) {
      const full = await viaAuthedInfo(result.profile.pk);
      if (full) result.profile = { ...result.profile, ...full };
    }
  } catch {
    result = { ok: false, reason: "unavailable" };
  }

  if (!result.ok && result.reason === "rate_limited") {
    // disjoncteur : on cesse d'appeler Instagram le temps du cooldown
    blockedUntil = Date.now() + COOLDOWN_MS;
    result.retryAfterMin = igCooldownRemainingMin();
  }
  cache.set(key, { at: Date.now(), result });
  return result;
}

/** Liens présents dans la bio (souvent Spotify, Linktree…). */
export function linksFromBio(p: IgProfile): string[] {
  const urls = new Set<string>();
  if (p.externalUrl) urls.add(p.externalUrl);
  for (const l of p.bioLinks ?? []) urls.add(l);
  for (const m of (p.biography ?? "").matchAll(/https?:\/\/[^\s]+/g)) {
    urls.add(m[0].replace(/[.,)]+$/, ""));
  }
  return [...urls];
}
