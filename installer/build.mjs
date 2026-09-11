// ============================================================================
// installer/build.mjs — chaîne de release Windows de Contact Tracker.
//
//   npm run package                          next build + assemblage + anti-fuite
//                                            + démarrage à blanc + Inno Setup
//   node installer/build.mjs --no-next-build réutilise le .next existant
//   node installer/build.mjs --assemble-only s'arrête avant Inno Setup
//
// Charge utile produite dans installer/dist/ContactTracker :
//
//   ContactTracker/
//     ContactTracker.bat    lanceur (aucun chemin absolu : tout est relatif à %~dp0)
//     contact-tracker.ico   icône des raccourcis
//     env.example           modèle de configuration, copié dans le dossier de
//                           données au premier lancement
//     LISEZ-MOI.txt
//     runtime/node.exe      Node embarqué (copie du node.exe qui exécute ce script)
//     runtime/VERSION.txt
//     app/                  sortie « standalone » de Next + .next/static (+ public)
//
// Trois pièges de l'empaquetage Next standalone, tous traités ici :
//   1. la sortie standalone recopie `.env*` et ce que le traceur croise sous
//      `data/` → exclus explicitement à la copie, et `*.nft.json` supprimés ;
//   2. webpack inscrit le chemin absolu du projet dans `.next/server` → réécrit
//      uniformément vers une racine neutre (voir rewriteAbsolutePaths) ;
//   3. le traceur rate des modules internes de Next chargés dynamiquement →
//      les sous-arbres next/dist/{lib,shared,server,client} sont complétés.
//
// Le contrôle anti-fuite est un VERROU : un seul terme personnel ou une seule
// valeur secrète de .env.local dans la charge utile, et rien n'est compilé.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawn } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.dirname(HERE);
const DIST = path.join(HERE, "dist");
const OUTPUT = path.join(HERE, "output");
const PAYLOAD = path.join(DIST, "ContactTracker");
const APP = path.join(PAYLOAD, "app");

const APP_NAME = "Contact Tracker";
const DATA_DIR_NAME = "ContactTracker"; // %LOCALAPPDATA%\ContactTracker
const PORT = 3200;

/** Racine neutre substituée aux chemins absolus du poste de développement. */
const NEUTRAL_ROOT = "C:\\ContactTracker\\build";

const log = (m) => process.stdout.write(`[build] ${m}\n`);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " Mo";

// ---------------------------------------------------------------- utilitaires
function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest, { skip = () => false } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (skip(entry.name, s, entry)) continue;
    if (entry.isDirectory()) copyDir(s, d, { skip });
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function dirSize(dir) {
  return walk(dir).reduce((n, f) => n + fs.statSync(f).size, 0);
}

function readVersion() {
  return JSON.parse(fs.readFileSync(path.join(PROJECT, "package.json"), "utf-8")).version;
}

// ------------------------------------------------- réécriture des chemins abs
/**
 * Webpack sérialise le chemin absolu du projet dans les bundles serveur
 * (identifiants de modules, manifests de références client). Ce sont des
 * IDENTIFIANTS, jamais des chemins ouverts à l'exécution : une substitution
 * uniforme sur toute l'arborescence les neutralise sans rien casser — le
 * démarrage à blanc le vérifie ensuite.
 */
function rewriteAbsolutePaths(root, projectRoot) {
  const bs = projectRoot.replace(/\//g, "\\");
  // Formes rencontrées : \ simple, \\ (chaîne JS) et \\\\ (chaîne dans une
  // chaîne, ex. message d'erreur webpack), plus la forme /. Ordre important :
  // les formes les plus échappées d'abord.
  const escaped = (p, n) => p.replace(/\\/g, "\\".repeat(n));
  const forms = [
    ...[4, 2, 1].map((n) => [escaped(bs, n), escaped(NEUTRAL_ROOT, n)]),
    [bs.replace(/\\/g, "/"), NEUTRAL_ROOT.replace(/\\/g, "/")],
  ];
  const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".json", ".map", ".txt", ".html", ".css", ".ts"]);

  let filesTouched = 0;
  let replacements = 0;
  const binaryHits = [];

  for (const file of walk(root)) {
    let text = fs.readFileSync(file).toString("latin1");
    if (!forms.some(([from]) => text.includes(from))) continue;
    if (!TEXT_EXT.has(path.extname(file).toLowerCase())) {
      binaryHits.push(path.relative(root, file));
      continue;
    }
    let count = 0;
    for (const [from, to] of forms) {
      const parts = text.split(from);
      count += parts.length - 1;
      text = parts.join(to);
    }
    fs.writeFileSync(file, Buffer.from(text, "latin1"));
    filesTouched++;
    replacements += count;
  }
  if (binaryHits.length) {
    throw new Error(
      "chemin absolu du projet dans des fichiers non textuels (réécriture impossible) :\n  " +
        binaryHits.slice(0, 10).join("\n  ")
    );
  }
  return { filesTouched, replacements };
}

/**
 * Complète les sous-arbres du runtime Next dans la sortie tracée : n'ajoute
 * QUE les fichiers absents (jamais d'écrasement), sans sourcemaps ni .d.ts.
 */
const NEXT_RUNTIME_SUBTREES = ["lib", "shared", "server", "client"];

function completeNextRuntime() {
  const from = path.join(PROJECT, "node_modules", "next", "dist");
  const to = path.join(APP, "node_modules", "next", "dist");
  if (!fs.existsSync(to)) throw new Error("app/node_modules/next/dist absent de la sortie tracée");
  let added = 0;
  for (const sub of NEXT_RUNTIME_SUBTREES) {
    const src = path.join(from, sub);
    if (!fs.existsSync(src)) continue;
    for (const file of walk(src)) {
      if (file.endsWith(".map") || file.endsWith(".d.ts")) continue;
      const dest = path.join(to, path.relative(from, file));
      if (fs.existsSync(dest)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
      added++;
    }
  }
  return added;
}

// ------------------------------------------------------------------ lanceur
/**
 * Lanceur cmd en style « goto » (pas de blocs parenthésés : cmd y développe
 * %VAR% au moment du parse). Reprend la logique de « Contact Tracker.bat »
 * du dépôt, sans aucun chemin absolu.
 */
function launcherScript() {
  return [
    "@echo off",
    "setlocal",
    `title ${APP_NAME}`,
    `cd /d "%~dp0"`,
    "",
    `rem Lanceur ${APP_NAME} : demarre le serveur local si besoin puis ouvre le navigateur.`,
    "rem Donnees et configuration : %LOCALAPPDATA%\\" + DATA_DIR_NAME + " (jamais dans ce dossier).",
    "",
    `set "PORT=${PORT}"`,
    `set "URL=http://127.0.0.1:%PORT%"`,
    `set "DATA=%LOCALAPPDATA%\\${DATA_DIR_NAME}"`,
    `set "PS=powershell -NoProfile -ExecutionPolicy Bypass -Command"`,
    "",
    "rem Dossier de donnees + fichier de configuration (.env) au premier lancement",
    `if not exist "%DATA%" mkdir "%DATA%"`,
    `if not exist "%DATA%\\.env" copy /y "%~dp0env.example" "%DATA%\\.env" >nul`,
    "",
    "rem Serveur deja lance ?",
    `%PS% "try{(Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2)|Out-Null;exit 0}catch{exit 1}"`,
    "if not errorlevel 1 goto open",
    "",
    "rem Variables d'environnement : lignes KEY=valeur du fichier .env (les # sont ignores)",
    `for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%DATA%\\.env") do set "%%a=%%b"`,
    "",
    `set "NODE_ENV=production"`,
    `set "HOSTNAME=127.0.0.1"`,
    `set "CONTACT_TRACKER_DATA_DIR=%DATA%"`,
    `cd /d "%~dp0app"`,
    `start "${APP_NAME} (serveur - ne pas fermer)" /min "%~dp0runtime\\node.exe" server.js`,
    `cd /d "%~dp0"`,
    "",
    "rem Attente du serveur (max ~60 s)",
    "set /a tries=0",
    ":wait",
    "set /a tries+=1",
    "if %tries% gtr 60 goto failed",
    `%PS% "Start-Sleep -Seconds 1; try{(Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2)|Out-Null;exit 0}catch{exit 1}"`,
    "if errorlevel 1 goto wait",
    "",
    ":open",
    `start "" "%URL%"`,
    "exit /b 0",
    "",
    ":failed",
    "echo.",
    `echo  Le serveur ${APP_NAME} n'a pas repondu sur %URL%.`,
    `echo  Regarde la fenetre "${APP_NAME} (serveur)" pour le message d'erreur.`,
    "pause",
    "exit /b 1",
    "",
  ].join("\r\n");
}

function readmeText(version, nodeVersion) {
  return [
    `${APP_NAME} ${version}`,
    "",
    "Qu'est-ce que c'est ?",
    "  Un mini-CRM local pour la prospection musicale (artistes, producteurs,",
    "  pros de l'industrie) : pipeline de vente en 11 étapes, enrichissement",
    "  Spotify / Instagram, import et export Excel. Tout tourne sur votre PC,",
    "  rien n'est envoyé ailleurs que vers les sites consultés (Spotify,",
    "  Instagram) lors des enrichissements que vous déclenchez.",
    "",
    "Lancement",
    "  Raccourci « Contact Tracker » (menu Démarrer ou bureau) : le serveur",
    "  local démarre dans une fenêtre réduite et votre navigateur s'ouvre sur",
    `  http://127.0.0.1:${PORT}. Pour tout arrêter : fermez la fenêtre du serveur.`,
    `  Le serveur n'écoute que sur 127.0.0.1 : rien n'est exposé au réseau.`,
    "",
    "Où sont mes données ?",
    `  %LOCALAPPDATA%\\${DATA_DIR_NAME}`,
    "  (par ex. C:\\Users\\<vous>\\AppData\\Local\\" + DATA_DIR_NAME + ")",
    "    contacts.json        votre base (sauvegardez ce fichier)",
    "    dmscan-state.json    mémoire du bouton « Scan DM »",
    "    .env                 configuration (clés optionnelles, voir ci-dessous)",
    "  Rien n'est écrit dans le dossier d'installation.",
    "",
    "Clés optionnelles (.env)",
    "  Le fichier .env est créé au premier lancement à partir du modèle",
    "  env.example (commentaires détaillés à l'intérieur). Ouvrez-le avec le",
    "  Bloc-notes, renseignez ce qui vous est utile, puis relancez l'app :",
    "    SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET  recommandé — recherche",
    "        d'artistes sans quota partagé (app gratuite sur developer.spotify.com)",
    "    IG_SESSIONID   optionnel — lecture fiable des profils Instagram",
    "    DM_THREAD_TITLE / DM_THREAD_ID   optionnel — conversation à scanner",
    "  Sans aucune clé, l'application fonctionne en mode anonyme (limité).",
    "",
    "Désinstallation",
    "  Paramètres Windows > Applications > Contact Tracker > Désinstaller",
    "  (ou le raccourci « Désinstaller » du menu Démarrer). Vos données dans",
    `  %LOCALAPPDATA%\\${DATA_DIR_NAME} sont CONSERVÉES : supprimez ce dossier`,
    "  à la main si vous n'en voulez plus.",
    "",
    `Technique : Next.js en mode autonome, exécuté par le Node ${nodeVersion} embarqué`,
    "  (runtime\\node.exe). Aucune installation de Node n'est nécessaire.",
    "",
  ].join("\r\n");
}

// --------------------------------------------------------------- assemblage
function assemble() {
  const version = readVersion();
  log(`version ${version}`);

  const standalone = path.join(PROJECT, ".next", "standalone");
  const staticDir = path.join(PROJECT, ".next", "static");
  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    throw new Error("`.next/standalone/server.js` absent — lancez `npm run build` (output: standalone).");
  }
  if (!fs.existsSync(staticDir)) throw new Error("`.next/static` absent.");

  log("nettoyage de installer/dist");
  rmrf(DIST);
  fs.mkdirSync(APP, { recursive: true });

  // 1. Sortie standalone, SANS .env*, data/, logs, tsbuildinfo.
  log("copie de .next/standalone → app/");
  copyDir(standalone, APP, {
    skip: (name, full) => {
      if (/^\.env(\..*)?$/i.test(name)) return true;
      if (name === "data" && path.dirname(full) === standalone) return true;
      if (/\.log$/i.test(name)) return true;
      if (/\.tsbuildinfo$/i.test(name)) return true;
      return false;
    },
  });

  // 1 bis. Manifests de traçage : artefacts de build, jamais lus à l'exécution,
  // et ils listent tout ce que le traceur a croisé (dont data/).
  let pruned = 0;
  for (const f of walk(APP)) {
    if (f.endsWith(".nft.json")) {
      fs.rmSync(f);
      pruned++;
    }
  }
  log(`${pruned} manifests de traçage (*.nft.json) supprimés`);

  // 2. Statiques client + public (le standalone ne les inclut jamais).
  log("copie de .next/static → app/.next/static");
  copyDir(staticDir, path.join(APP, ".next", "static"));
  const publicDir = path.join(PROJECT, "public");
  if (fs.existsSync(publicDir)) {
    log("copie de public/ → app/public");
    copyDir(publicDir, path.join(APP, "public"));
  } else {
    log("public/ absent du projet — rien à copier");
  }

  // 3. Modules internes de Next ratés par le traceur.
  const completed = completeNextRuntime();
  log(`runtime Next complété : ${completed} fichiers internes ajoutés`);

  // 4. Neutralisation des chemins absolus du poste de développement.
  const { filesTouched, replacements } = rewriteAbsolutePaths(PAYLOAD, PROJECT);
  log(`${replacements} chemins absolus réécrits dans ${filesTouched} fichiers → ${NEUTRAL_ROOT}`);

  // 5. Runtime Node embarqué : copie du node.exe qui exécute ce script.
  const runtimeDir = path.join(PAYLOAD, "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.copyFileSync(process.execPath, path.join(runtimeDir, "node.exe"));
  fs.writeFileSync(path.join(runtimeDir, "VERSION.txt"), `${process.version}\r\n`, "utf-8");
  log(`runtime Node ${process.version} embarqué (${mb(fs.statSync(process.execPath).size)})`);

  // 6. Icône, modèle de configuration, lanceur, note utilisateur.
  const ico = path.join(PROJECT, "contact-tracker.ico");
  if (!fs.existsSync(ico)) throw new Error("contact-tracker.ico introuvable à la racine du projet.");
  fs.copyFileSync(ico, path.join(PAYLOAD, "contact-tracker.ico"));

  const envExample = path.join(PROJECT, ".env.example");
  if (!fs.existsSync(envExample)) throw new Error(".env.example introuvable.");
  fs.copyFileSync(envExample, path.join(PAYLOAD, "env.example"));

  fs.writeFileSync(path.join(PAYLOAD, "ContactTracker.bat"), launcherScript(), "utf-8");
  fs.writeFileSync(
    path.join(PAYLOAD, "LISEZ-MOI.txt"),
    "\uFEFF" + readmeText(version, process.version),
    "utf-8"
  );

  const size = dirSize(PAYLOAD);
  log(`charge utile assemblée : ${mb(size)} → ${PAYLOAD}`);
  return { version, size };
}

// --------------------------------------------------------------- anti-fuite
/**
 * Termes génériques (jamais secrets) : identité de l'auteur, chemins du poste.
 * Un terme d'identité doit être précédé d'un octet non alphanumérique
 * (« \nom », « @nom », « "pseudo… ») : sans cette garde, node.exe déclenche
 * sur des mots contenant le prénom (table des noms Unicode de node.exe, « letterwindow »).
 * La fin du terme reste libre : un pseudo doit attraper ses variantes suffixées.
 */

/**
 * Identité de l'opérateur : JAMAIS en dur dans ce fichier versionné. Dérivée du
 * poste de build (nom de session Windows, dossier utilisateur) et complétée par
 * installer/leak-needles.operator.txt (une ligne par terme, non versionné :
 * pseudo, identifiants de conversation, etc.).
 */
function operatorNeedles() {
  const out = new Set();
  const user = (os.userInfo().username || "").trim();
  if (user.length >= 3) out.add(user);
  const home = process.env.USERPROFILE || os.homedir();
  if (home) out.add(home);
  const file = path.join(HERE, "leak-needles.operator.txt");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
      const t = line.trim();
      if (t && !t.startsWith("#")) out.add(t);
    }
  }
  return [...out];
}
const GENERIC_NEEDLES = operatorNeedles();

/** Fichiers qui ne doivent JAMAIS être livrés. */
const FORBIDDEN_FILES = [/(^|[\\/])\.env(\.|$)/i, /(^|[\\/])contacts\.json$/i, /(^|[\\/])dmscan-state\.json$/i, /\.log$/i, /\.tsbuildinfo$/i];

/**
 * Valeurs réelles de .env.local : lues en mémoire, jamais affichées ni
 * écrites. Chaque hit est signalé par le NOM de la variable seulement.
 */
function secretNeedles() {
  const file = path.join(PROJECT, ".env.local");
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (value.length < 6) continue; // vide ou trop court pour être signifiant
    out.push({ label: `valeur de ${m[1]} (.env.local)`, value, anywhere: true });
  }
  return out;
}

function checkLeaks(root) {
  const needles = [
    ...GENERIC_NEEDLES.map((v) => ({ label: `« ${v} »`, value: v })),
    ...secretNeedles(),
  ].map((n) => ({
    label: n.label,
    anywhere: !!n.anywhere, // secrets : sous-chaîne pure, sans garde
    ascii: Buffer.from(n.value.toLowerCase(), "latin1"),
    utf16: Buffer.from(n.value.toLowerCase(), "utf16le"),
  }));

  const isAlnum = (c) => (c >= 48 && c <= 57) || (c >= 97 && c <= 122);
  /** Occurrence de needle dans buf (unit = 1 octet ASCII, 2 octets UTF-16LE). */
  const hasHit = (buf, needle, unit, anywhere) => {
    let i = -1;
    while ((i = buf.indexOf(needle, i + 1)) !== -1) {
      if (anywhere || i < unit) return true;
      const prev = buf[i - unit];
      const prevHigh = unit === 2 ? buf[i - 1] : 0;
      if (!isAlnum(prev) || prevHigh !== 0) return true;
    }
    return false;
  };

  const findings = [];
  let scanned = 0;
  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    if (FORBIDDEN_FILES.some((re) => re.test(rel))) {
      findings.push(`${rel} :: fichier interdit dans une distribution`);
      continue;
    }
    scanned++;
    const buf = fs.readFileSync(file);
    // Comparaison insensible à la casse : on abaisse les octets ASCII A-Z.
    const lower = Buffer.from(buf);
    for (let i = 0; i < lower.length; i++) {
      const c = lower[i];
      if (c >= 65 && c <= 90) lower[i] = c + 32;
    }
    for (const n of needles) {
      if (hasHit(lower, n.ascii, 1, n.anywhere) || hasHit(lower, n.utf16, 2, n.anywhere)) {
        findings.push(`${rel} :: ${n.label}`);
      }
    }
  }
  return { findings, scanned, needleCount: needles.length };
}

// ------------------------------------------------------- démarrage à blanc
async function probe(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    try {
      await res.body?.cancel();
    } catch {}
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

function allRoutes() {
  const manifest = path.join(APP, ".next", "app-path-routes-manifest.json");
  if (!fs.existsSync(manifest)) return ["/"];
  const routes = Object.values(JSON.parse(fs.readFileSync(manifest, "utf-8")))
    .filter((r) => typeof r === "string" && !r.startsWith("/_"))
    .map((r) => r.replace(/\[[^\]]+\]/g, "1"));
  return [...new Set(["/", ...routes])].sort();
}

/**
 * Lance la charge utile avec un PATH minimal (sans le Node du système) et un
 * dossier de données jetable : prouve que le runtime embarqué suffit et que la
 * sortie standalone est complète. Toutes les routes sont balayées en GET :
 * 4xx est normal (méthode non autorisée), 5xx ou absence de réponse signale
 * un module manquant.
 */
async function smokeTest() {
  const base = `http://127.0.0.1:${PORT}`;
  if ((await probe(base + "/", 2000)) !== 0) {
    throw new Error(`le port ${PORT} répond déjà (serveur de dev ou app lancée ?) — arrêtez-le avant le build.`);
  }
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "contact-tracker-smoke-"));
  const winDir = process.env.WINDIR || "C:\\Windows";
  const child = spawn(path.join(PAYLOAD, "runtime", "node.exe"), ["server.js"], {
    cwd: APP,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      SystemRoot: winDir,
      windir: winDir,
      TEMP: sandbox,
      TMP: sandbox,
      PATH: `${winDir}\\system32;${winDir}`,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(PORT),
      CONTACT_TRACKER_DATA_DIR: sandbox,
    },
  });
  const out = [];
  child.stdout.on("data", (b) => out.push(b.toString()));
  child.stderr.on("data", (b) => out.push(b.toString()));

  try {
    let rootStatus = 0;
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && child.exitCode === null) {
      rootStatus = await probe(base + "/", 5000);
      if (rootStatus !== 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (rootStatus !== 200) {
      throw new Error(
        `le serveur assemblé ne répond pas 200 sur / (${rootStatus || "pas de réponse"}) :\n` +
          out.join("").slice(-2500)
      );
    }
    const broken = [];
    const routes = allRoutes();
    for (const route of routes) {
      const status = await probe(base + route);
      if (status === 0 || status >= 500) broken.push(`${route} → ${status || "pas de réponse"}`);
    }
    if (broken.length) {
      const missing = [...new Set(out.join("").match(/Cannot find module '[^']+'/g) || [])].join(", ");
      throw new Error(
        `routes en échec dans le paquet :\n  ${broken.join("\n  ")}` +
          (missing ? `\nmodules manquants : ${missing}` : "")
      );
    }
    // Le dossier de données jetable doit avoir été utilisé, pas app/data.
    if (fs.existsSync(path.join(APP, "data"))) {
      throw new Error("le serveur a écrit dans app/data au lieu de CONTACT_TRACKER_DATA_DIR.");
    }
    return { status: rootStatus, routes: routes.length };
  } finally {
    try {
      child.kill();
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch {}
  }
}

// ------------------------------------------------------------------ Inno
function findIscc() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Inno Setup 6", "ISCC.exe"),
    "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
    "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
  ];
  const found = candidates.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error("ISCC.exe (Inno Setup 6) introuvable.");
  return found;
}

// ------------------------------------------------------------------ main
async function main() {
  const args = process.argv.slice(2);

  if (!args.includes("--no-next-build")) {
    log("next build (output: standalone)…");
    const nextBin = path.join(PROJECT, "node_modules", "next", "dist", "bin", "next");
    if (!fs.existsSync(nextBin)) throw new Error("CLI Next introuvable — npm install ?");
    execFileSync(process.execPath, [nextBin, "build"], { cwd: PROJECT, stdio: "inherit" });
  } else {
    log("build Next réutilisé (--no-next-build)");
  }

  const { version, size } = assemble();

  log("contrôle anti-fuite (identité, chemins, valeurs de .env.local)…");
  const { findings, scanned, needleCount } = checkLeaks(PAYLOAD);
  log(`  ${scanned} fichiers scannés, ${needleCount} termes recherchés`);
  if (findings.length) {
    console.error(`[build] BLOQUÉ — ${findings.length} fuite(s) dans la charge utile :`);
    for (const f of [...new Set(findings)].slice(0, 40)) console.error(`  - ${f}`);
    process.exit(1);
  }
  log("  0 occurrence — charge utile propre");

  log("démarrage à blanc de la charge utile (PATH minimal, dossier de données jetable)…");
  const smoke = await smokeTest();
  log(`  HTTP ${smoke.status} sur /, ${smoke.routes} routes chargées sans erreur 5xx`);

  if (args.includes("--assemble-only")) {
    log(`arrêt avant Inno Setup (--assemble-only). Charge utile : ${PAYLOAD}`);
    return;
  }

  fs.mkdirSync(OUTPUT, { recursive: true });
  const iscc = findIscc();
  log(`compilation de l'installeur (${path.basename(iscc)})…`);
  execFileSync(
    iscc,
    [
      `/DMyAppVersion=${version}`,
      `/DPayloadDir=${PAYLOAD}`,
      `/DOutDir=${OUTPUT}`,
      path.join(HERE, "ContactTracker.iss"),
    ],
    { cwd: HERE, stdio: "inherit" }
  );

  const setup = path.join(OUTPUT, `ContactTracker_Setup_${version}.exe`);
  if (!fs.existsSync(setup)) throw new Error("installeur non produit par ISCC.");
  log(`OK — ${setup} (${mb(fs.statSync(setup).size)}, charge utile ${mb(size)})`);
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error(`[build] ÉCHEC : ${e.message}`);
    process.exit(1);
  });
}
