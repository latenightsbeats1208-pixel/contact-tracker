import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

// jar de session : curl y stocke les cookies posés en cours de redirection
// (csrftoken…), qu'un simple en-tête Cookie ne rejouerait pas
function cookieJarPath(): string {
  return path.join(os.tmpdir(), "contact-tracker-cookies.txt");
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// fetch Node bloqué par fingerprint TLS sur Instagram → curl système
// (technique validée sur Artist Scout / Genius Scout)
export async function fetchHtml(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-s",
      "-L",
      "--max-time",
      "15",
      "--compressed",
      "-A",
      UA,
      "-H",
      "Accept-Language: fr-FR,fr;q=0.9,en;q=0.8",
      url,
    ],
    { maxBuffer: 10 * 1024 * 1024, windowsHide: true }
  );
  return stdout;
}

// variante qui expose le code HTTP : indispensable pour distinguer un
// rate-limit (429) d'un profil inexistant (404) ou d'un mur de login
export async function fetchWithStatus(
  url: string,
  opts?: {
    headers?: string[];
    userAgent?: string;
    /** cookies passés via -b + jar temporaire : indispensable quand la
     * réponse redirige (un en-tête Cookie figé n'est pas rejoué sur la
     * redirection → boucle infinie, curl code 47) */
    cookies?: string;
    timeoutSec?: number;
  }
): Promise<{ status: number; body: string }> {
  const args = [
    "-s",
    "-L",
    "--max-redirs",
    "5",
    "--max-time",
    String(opts?.timeoutSec ?? 15),
    "--compressed",
    "-w",
    "\n__HTTP_STATUS__%{http_code}",
    "-A",
    opts?.userAgent ?? UA,
    "-H",
    "Accept-Language: fr-FR,fr;q=0.9,en;q=0.8",
  ];
  if (opts?.cookies) {
    args.push("-b", opts.cookies, "-c", cookieJarPath());
  }
  for (const h of opts?.headers ?? []) args.push("-H", h);
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  const idx = stdout.lastIndexOf("\n__HTTP_STATUS__");
  if (idx === -1) return { status: 0, body: stdout };
  return {
    status: Number(stdout.slice(idx + 16).trim()) || 0,
    body: stdout.slice(0, idx),
  };
}

export async function fetchJson<T>(
  url: string,
  opts?: { userAgent?: string; bearer?: string }
): Promise<T> {
  const args = [
    "-s",
    "--max-time",
    "10",
    "--compressed",
    "-A",
    opts?.userAgent ?? UA,
  ];
  if (opts?.bearer) {
    args.push("-H", `Authorization: Bearer ${opts.bearer}`);
  }
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return JSON.parse(stdout) as T;
}

/** POST de formulaire (OAuth client credentials). */
export async function postForm<T>(
  url: string,
  body: string,
  headers: string[] = []
): Promise<T> {
  const args = ["-s", "--max-time", "15", "--compressed", "-A", UA, "-X", "POST", "-d", body];
  for (const h of headers) args.push("-H", h);
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return JSON.parse(stdout) as T;
}

export function metaContent(html: string, property: string): string | null {
  // gère property="og:x" et name="description", attributs dans les deux ordres
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
