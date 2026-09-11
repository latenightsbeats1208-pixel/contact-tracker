/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { fetchWithStatus } from "./fetch-page";
import { DATA_DIR } from "./db";

/*
 * Scan de la conversation DM Instagram de scouting.
 *
 * L'utilisateur s'auto-envoie les reels des artistes repérés dans une
 * conversation dédiée (compte alt). Ce module lit cette conversation via l'API interne
 * des DM (direct_v2) — la même que le site — et en extrait les profils
 * partagés (reels, posts, cartes de profil).
 *
 * Nécessite IG_SESSIONID (.env.local) : les DM sont impossibles à lire en
 * anonyme. Le thread ciblé est DM_THREAD_ID (visible dans l'URL de la
 * conversation : instagram.com/direct/t/<id>).
 */

const IG_APP_ID = "936619743392459";
/*
 * Attention : l'identifiant visible dans l'URL du site
 * (instagram.com/direct/t/<id court>) n'est PAS celui qu'attend l'API — elle
 * veut le thread_id long. On résout donc la conversation par son titre
 * (DM_THREAD_TITLE) depuis l'inbox, et DM_THREAD_ID au format long
 * court-circuite cette résolution si besoin. Un DM_THREAD_ID court (id d'URL)
 * ne sert qu'au lien « Ouvrir la conv ».
 */
const DEFAULT_THREAD_TITLE = "Scouting";
/** Longueur au-delà de laquelle un identifiant est un thread_id API (long). */
const API_ID_MIN_LENGTH = 26;
const MAX_PAGES = 15; // ~300 messages : garde-fou anti-boucle

const STATE_FILE = path.join(DATA_DIR, "dmscan-state.json");

export interface DmCandidate {
  handle: string;
  fullName?: string;
  /** timestamp du message, en millisecondes */
  ts: number;
}

export type DmScanResult =
  | { ok: true; candidates: DmCandidate[]; newestTs: number; reachedEnd: boolean }
  | { ok: false; reason: "no_session" | "session_expired" | "rate_limited" | "unavailable"; detail?: string };

export function threadTitle(): string {
  return process.env.DM_THREAD_TITLE?.trim() || DEFAULT_THREAD_TITLE;
}

export function threadUrl(): string {
  const explicit = process.env.DM_THREAD_ID?.trim() ?? "";
  const id =
    process.env.DM_THREAD_WEB_ID?.trim() ||
    (explicit && explicit.length < API_ID_MIN_LENGTH ? explicit : "");
  return id
    ? `https://www.instagram.com/direct/t/${id}/`
    : "https://www.instagram.com/direct/inbox/";
}

function sessionOpts() {
  const sid = process.env.IG_SESSIONID!.trim();
  return {
    cookies: `sessionid=${sid}`,
    headers: [`x-ig-app-id: ${IG_APP_ID}`, "x-requested-with: XMLHttpRequest"],
    timeoutSec: 25,
  };
}

/**
 * Retrouve l'identifiant API de la conversation de scouting en parcourant
 * l'inbox et en comparant les titres. Évite d'avoir à copier un id opaque
 * à la main : le titre suffit.
 */
async function resolveThreadId(): Promise<
  { ok: true; id: string } | { ok: false; reason: "session_expired" | "rate_limited" | "unavailable"; detail?: string }
> {
  const explicit = process.env.DM_THREAD_ID?.trim();
  // les ids d'URL web (17 chiffres) ne sont pas acceptés par l'API
  if (explicit && explicit.length >= API_ID_MIN_LENGTH) return { ok: true, id: explicit };

  const { status, body } = await fetchWithStatus(
    "https://www.instagram.com/api/v1/direct_v2/inbox/?limit=50&thread_message_limit=1",
    sessionOpts()
  );
  if (status === 429) return { ok: false, reason: "rate_limited" };
  if (status === 401 || status === 403) return { ok: false, reason: "session_expired" };
  if (status !== 200) return { ok: false, reason: "unavailable", detail: `HTTP ${status}` };

  let threads: any[];
  try {
    threads = JSON.parse(body)?.inbox?.threads ?? [];
  } catch {
    return { ok: false, reason: "session_expired" };
  }
  const wanted = threadTitle().toLowerCase();
  const match = threads.find(
    (t: any) => String(t?.thread_title ?? "").trim().toLowerCase() === wanted
  );
  if (!match?.thread_id) {
    return {
      ok: false,
      reason: "unavailable",
      detail: `conversation « ${threadTitle()} » introuvable dans les 50 dernières discussions`,
    };
  }
  return { ok: true, id: String(match.thread_id) };
}

/* --- état : dernier message déjà traité --------------------------------- */

interface ScanState {
  lastTs: number; // ms — messages plus anciens ou égaux = déjà traités
}

export function readScanState(): ScanState {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return { lastTs: Number(parsed.lastTs) || 0 };
  } catch {
    return { lastTs: 0 };
  }
}

export function writeScanState(state: ScanState) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, STATE_FILE);
}

/* --- extraction d'un item DM -------------------------------------------- */

function userFromItem(item: any): { username?: string; full_name?: string } | null {
  // reel partagé
  const clipUser = item?.clip?.clip?.user;
  if (clipUser?.username) return clipUser;
  // post partagé
  const mediaUser = item?.media_share?.user;
  if (mediaUser?.username) return mediaUser;
  // carte de profil partagée
  const profile = item?.profile;
  if (profile?.username) return profile;
  // formats XMA (nouvelles cartes de partage)
  const xma = Array.isArray(item?.xma_share) ? item.xma_share[0] : item?.xma_share;
  const xmaUser = xma?.target_user ?? xma?.user;
  if (xmaUser?.username) return xmaUser;
  return null;
}

/**
 * Parcourt la conversation du plus récent au plus ancien et s'arrête au
 * premier message déjà traité (ts <= sinceTs) ou au bout de MAX_PAGES.
 * Renvoie les profils partagés du plus ancien au plus récent.
 */
export async function scanThread(sinceTs: number): Promise<DmScanResult> {
  const sid = process.env.IG_SESSIONID?.trim();
  if (!sid) return { ok: false, reason: "no_session" };

  const resolved = await resolveThreadId();
  if (!resolved.ok) return resolved;
  const tid = resolved.id;

  const byHandle = new Map<string, DmCandidate>();
  let newestTs = sinceTs;
  let cursor: string | null = null;
  let reachedEnd = false;
  let stop = false;

  for (let page = 0; page < MAX_PAGES && !stop; page++) {
    const url =
      `https://www.instagram.com/api/v1/direct_v2/threads/${tid}/` +
      `?visual_message_return_type=unseen&limit=30&direction=older` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

    const { status, body } = await fetchWithStatus(url, sessionOpts());
    if (status === 429) return { ok: false, reason: "rate_limited" };
    if (status === 401 || status === 403) return { ok: false, reason: "session_expired" };
    if (status !== 200 || !body.trim()) {
      return { ok: false, reason: "unavailable", detail: `HTTP ${status}` };
    }

    let thread: any;
    try {
      thread = JSON.parse(body)?.thread;
    } catch {
      // page HTML à la place du JSON = session invalide (mur de connexion)
      return { ok: false, reason: "session_expired" };
    }
    if (!thread?.items) {
      return { ok: false, reason: "unavailable", detail: "réponse sans items" };
    }

    for (const item of thread.items) {
      // timestamp API en microsecondes
      const ts = Math.floor(Number(item?.timestamp ?? 0) / 1000);
      if (ts <= sinceTs) {
        stop = true;
        break;
      }
      if (ts > newestTs) newestTs = ts;
      const user = userFromItem(item);
      if (user?.username) {
        const handle = user.username.toLowerCase();
        // messages parcourus du récent vers l'ancien : on garde la 1re
        // occurrence (la plus récente) et on écrase en remontant — peu
        // importe, le doublon de handle reste unique
        byHandle.set(handle, {
          handle,
          fullName: user.full_name?.trim() || undefined,
          ts,
        });
      }
    }

    if (!stop) {
      if (thread.has_older && thread.oldest_cursor) {
        cursor = String(thread.oldest_cursor);
      } else {
        reachedEnd = true;
        stop = true;
      }
    }
  }

  const candidates = [...byHandle.values()].sort((a, b) => a.ts - b.ts);
  return { ok: true, candidates, newestTs, reachedEnd };
}
