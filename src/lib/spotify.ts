import { fetchHtml, fetchJson, postForm, normalizeName } from "./fetch-page";

// hash de requête persistée du web player — stable depuis des années mais
// susceptible de changer : les appelants doivent prévoir un fallback
const ARTIST_OVERVIEW_HASH =
  "35648a112beb1794e39ab931365f6ae4a8d45e65396d641eeda94e4003d41497";

export interface SpotifyRelease {
  name: string;
  type: string; // SINGLE | ALBUM | EP…
  date: string; // ISO yyyy-mm-dd
  daysAgo: number;
  shareUrl?: string;
}

export interface SpotifyConcert {
  title: string;
  date?: string;
  venue?: string;
  city?: string;
}

export interface SpotifyArtistOverview {
  id: string;
  name: string;
  externalLinks: { name: string; url: string }[];
  monthlyListeners?: number;
  followers?: number;
  worldRank?: number;
  topCity?: string;
  latestRelease?: SpotifyRelease;
  /** sortie juste avant la dernière — sert aux accroches « depuis X tu as sorti… » */
  previousRelease?: SpotifyRelease;
  /** nombre de sorties sur les 12 derniers mois (rythme de travail) */
  releasesLast12Months: number;
  concerts: SpotifyConcert[];
}

export function artistIdFromUrl(url: string): string | null {
  const m = url.match(/artist\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

export function artistUrl(id: string): string {
  return `https://open.spotify.com/artist/${id}`;
}

/* --- token anonyme -------------------------------------------------------
 * Extrait de la page embed (rendue côté serveur, contrairement à la page
 * artiste). Mis en cache : sans ça, chaque appel coûtait une requête HTML
 * supplémentaire — coûteux sur un enrichissement en masse.
 */
let tokenCache: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 25 * 60 * 1000;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS) {
    return tokenCache.value;
  }
  const embed = await fetchHtml(
    "https://open.spotify.com/embed/artist/4tZwfgrHOc3mvqYlEYSvVi"
  );
  const token = embed.match(/"accessToken":"([^"]+)"/)?.[1];
  if (!token) throw new Error("token introuvable dans la page embed");
  tokenCache = { value: token, at: Date.now() };
  return token;
}

/* --- token officiel (client credentials) ---------------------------------
 * Le token anonyme ci-dessus partage un quota par IP, qui s'épuise vite sur
 * un gros lot et reste bloqué des heures. Avec un identifiant d'application
 * Spotify (gratuit), la recherche dispose de son propre quota, bien plus
 * large. On l'utilise dès qu'il est configuré, et on retombe sinon sur le
 * token anonyme pour rester utilisable sans configuration.
 */
let appTokenCache: { value: string; at: number } | null = null;
const APP_TOKEN_TTL_MS = 55 * 60 * 1000;

export function hasSpotifyApp(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim());
}

async function getAppToken(): Promise<string | null> {
  if (!hasSpotifyApp()) return null;
  if (appTokenCache && Date.now() - appTokenCache.at < APP_TOKEN_TTL_MS) {
    return appTokenCache.value;
  }
  const id = process.env.SPOTIFY_CLIENT_ID!.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  try {
    const data = await postForm<any>("https://accounts.spotify.com/api/token", "grant_type=client_credentials", [
      `Authorization: Basic ${basic}`,
      "Content-Type: application/x-www-form-urlencoded",
    ]);
    if (!data?.access_token) return null;
    appTokenCache = { value: data.access_token, at: Date.now() };
    return data.access_token;
  } catch {
    return null;
  }
}

/** Token pour api.spotify.com : officiel si configuré, anonyme sinon. */
async function getSearchToken(): Promise<string> {
  return (await getAppToken()) ?? (await getToken());
}

export interface ArtistCandidate {
  id: string;
  name: string;
  followers: number;
  genres: string[];
}

/* --- quota du token anonyme ----------------------------------------------
 * Le token extrait de la page embed a un quota court. Une fois dépassé,
 * Spotify répond 429 QUOTA_EXCEEDED : insister ne fait que prolonger la
 * sanction, et surtout un appel qui échoue ainsi ne veut PAS dire que
 * l'artiste est absent — d'où l'erreur typée, à distinguer d'un vrai
 * « pas trouvé ».
 */
export class SpotifyQuotaError extends Error {
  constructor() {
    super("quota Spotify dépassé");
    this.name = "SpotifyQuotaError";
  }
}

const QUOTA_COOLDOWN_MS = 15 * 60 * 1000;
let quotaBlockedUntil = 0;

export function spotifyQuotaRemainingMin(): number {
  return Math.max(0, Math.ceil((quotaBlockedUntil - Date.now()) / 60000));
}

function assertQuotaOk() {
  if (Date.now() < quotaBlockedUntil) throw new SpotifyQuotaError();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function throwIfQuota(data: any) {
  if (data?.error?.status === 429) {
    quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    // un token périmé peut aussi provoquer un rejet : on force son
    // renouvellement au prochain appel
    tokenCache = null;
    appTokenCache = null;
    throw new SpotifyQuotaError();
  }
}

/** Recherche d'artistes par nom (API publique, token anonyme). */
export async function searchArtists(
  query: string,
  limit = 8
): Promise<ArtistCandidate[]> {
  assertQuotaOk();
  const token = await getSearchToken();
  const data = await fetchJson<any>(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
    { bearer: token }
  );
  throwIfQuota(data);
  return (data?.artists?.items ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    followers: a.followers?.total ?? 0,
    genres: a.genres ?? [],
  }));
}

export interface ResolveResult {
  url?: string;
  id?: string;
  name?: string;
  genres?: string[];
  /** confirmed = handle Instagram vérifié dans la bio ; probable = nom exact unique */
  confidence: "confirmed" | "probable" | "none";
  /** renseigné quand plusieurs homonymes exacts empêchent de trancher */
  ambiguous?: number;
}

function handleOf(url: string): string {
  return url.replace(/\/+$/, "").split("/").pop()?.toLowerCase() ?? "";
}

/**
 * Retrouve la page Spotify d'un artiste à partir de son nom.
 *
 * Le nom seul ne suffit pas : « Darius James » a trois homonymes exacts sur
 * Spotify. Quand on connaît le handle Instagram du contact, on lève le doute
 * en le comparant à celui de la bio Spotify du candidat. Sans certitude, on
 * préfère ne rien remplir plutôt que d'associer le mauvais artiste.
 */
export async function resolveArtist(opts: {
  name: string;
  instagramHandle?: string;
}): Promise<ResolveResult> {
  const { name } = opts;
  const handle = opts.instagramHandle
    ?.trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  let candidates = await searchArtists(name);
  // repli : chercher le handle lui-même (« lucamurray__ » → « Luca Murray »)
  if (candidates.length === 0 && handle) {
    candidates = await searchArtists(handle);
  }
  if (candidates.length === 0) return { confidence: "none" };

  const exact = candidates.filter(
    (c) => normalizeName(c.name) === normalizeName(name)
  );

  // 1. vérification par le handle Instagram de la bio — la seule preuve fiable
  if (handle) {
    const pool = (exact.length ? exact : candidates).slice(0, 5);
    for (const c of pool) {
      try {
        const overview = await getArtistOverview(c.id);
        const ig = overview.externalLinks.find(
          (l) => l.name.toUpperCase() === "INSTAGRAM"
        );
        if (ig && handleOf(ig.url) === handle) {
          return {
            url: artistUrl(c.id),
            id: c.id,
            name: c.name,
            genres: c.genres,
            confidence: "confirmed",
          };
        }
      } catch (e) {
        // un quota dépassé n'est pas un candidat invalide : il faut le
        // signaler, pas passer au suivant en silence
        if (e instanceof SpotifyQuotaError) throw e;
      }
    }
  }

  // 2. sans handle : un seul homonyme exact = acceptable
  if (exact.length === 1) {
    return {
      url: artistUrl(exact[0].id),
      id: exact[0].id,
      name: exact[0].name,
      genres: exact[0].genres,
      confidence: "probable",
    };
  }
  if (exact.length > 1) {
    return { confidence: "none", ambiguous: exact.length };
  }
  return { confidence: "none" };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getArtistOverview(
  id: string
): Promise<SpotifyArtistOverview> {
  assertQuotaOk();
  const token = await getToken();

  const variables = encodeURIComponent(
    JSON.stringify({ uri: `spotify:artist:${id}`, locale: "", includePrerelease: false })
  );
  const extensions = encodeURIComponent(
    JSON.stringify({ persistedQuery: { version: 1, sha256Hash: ARTIST_OVERVIEW_HASH } })
  );
  const data = await fetchJson<any>(
    `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=${variables}&extensions=${extensions}`,
    { bearer: token }
  );
  throwIfQuota(data);
  const a = data?.data?.artistUnion;
  if (!a?.profile?.name) throw new Error("réponse GraphQL vide");

  // dernière sortie : discography.latest + tête des singles et albums
  const candidates: any[] = [];
  const push = (r: any) => {
    if (r?.name && r?.date?.year) candidates.push(r);
  };
  push(a.discography?.latest);
  for (const kind of ["singles", "albums"]) {
    for (const item of a.discography?.[kind]?.items ?? []) {
      push(item?.releases?.items?.[0]);
    }
  }
  // toutes les sorties datées, dédoublonnées et triées du plus récent au
  // plus ancien : donne la dernière, la précédente et le rythme de sortie
  const seen = new Set<string>();
  const releases: SpotifyRelease[] = [];
  for (const r of candidates) {
    const d = new Date(r.date.year, (r.date.month ?? 1) - 1, r.date.day ?? 1);
    const iso = d.toISOString().slice(0, 10);
    const key = `${r.name}|${iso}`;
    if (seen.has(key)) continue;
    seen.add(key);
    releases.push({
      name: r.name,
      type: r.type ?? "SINGLE",
      date: iso,
      daysAgo: Math.floor((Date.now() - d.getTime()) / 86_400_000),
      shareUrl: r.sharingInfo?.shareUrl,
    });
  }
  releases.sort((x, y) => y.date.localeCompare(x.date));
  const latestRelease = releases[0];
  const previousRelease = releases[1];
  const releasesLast12Months = releases.filter((r) => r.daysAgo <= 365).length;

  const concerts: SpotifyConcert[] = (
    a.goods?.events?.concerts?.items ?? []
  ).map((c: any) => ({
    title: c.title ?? c.venue?.name ?? "Concert",
    date:
      c.date?.isoString?.slice(0, 10) ??
      (c.date?.year
        ? new Date(c.date.year, (c.date.month ?? 1) - 1, c.date.day ?? 1)
            .toISOString()
            .slice(0, 10)
        : undefined),
    venue: c.venue?.name,
    city: c.venue?.location?.name ?? c.location?.name,
  }));

  return {
    id,
    name: a.profile.name.trim(),
    externalLinks: (a.profile.externalLinks?.items ?? []).filter(
      (l: any) => l?.name && l?.url
    ),
    monthlyListeners: a.stats?.monthlyListeners ?? undefined,
    followers: a.stats?.followers ?? undefined,
    worldRank: a.stats?.worldRank || undefined,
    topCity: a.stats?.topCities?.items?.[0]?.city ?? undefined,
    latestRelease,
    previousRelease,
    releasesLast12Months,
    concerts,
  };
}
