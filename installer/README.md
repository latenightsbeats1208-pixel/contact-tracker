# Paquet Windows de Contact Tracker

Chaîne de fabrication de `ContactTracker_Setup_<version>.exe` : un installeur
autonome qui tourne sur un PC Windows 10/11 vierge, sans Node installé.

## Fabriquer une release

```powershell
# 1. incrémenter "version" dans package.json
# 2. build complet : next build + assemblage + anti-fuite + démarrage à blanc + Inno Setup
npm run package
```

Sorties :

- `installer/dist/ContactTracker/` — la charge utile (ce qui sera installé) ;
- `installer/output/ContactTracker_Setup_<version>.exe` — l'installeur.

Variantes :

| Commande | Effet |
| --- | --- |
| `node installer/build.mjs --no-next-build` | réutilise le `.next` existant |
| `node installer/build.mjs --assemble-only` | s'arrête avant Inno Setup |

Prérequis sur le poste de build : Node (celui qui exécute le script est
embarqué tel quel dans le paquet — voir `runtime/VERSION.txt`), les
dépendances installées (`npm install`) et Inno Setup 6
(`%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe` ou `Program Files`).
Le port 3200 doit être libre pendant le build (démarrage à blanc).

## Ce que fait `build.mjs`

1. `next build` avec `output: "standalone"` (voir `next.config.mjs`).
2. Assemblage dans `installer/dist/ContactTracker/` :
   - `app/` : `.next/standalone` **sans** `.env*`, `data/`, logs ni
     `*.tsbuildinfo` ; manifests `*.nft.json` supprimés ; `.next/static`
     (et `public/` s'il existe) ajoutés ; sous-arbres
     `next/dist/{lib,shared,server,client}` complétés (modules internes que le
     traceur rate) ; chemins absolus du poste de build réécrits vers
     `C:\ContactTracker\build` (ce sont des identifiants webpack, pas des
     chemins ouverts à l'exécution) ;
   - `runtime/node.exe` + `runtime/VERSION.txt` ;
   - `ContactTracker.bat` (lanceur, uniquement des chemins relatifs à
     `%~dp0`), `contact-tracker.ico`, `env.example`, `LISEZ-MOI.txt`.
3. **Contrôle anti-fuite** sur toute la charge utile (insensible à la casse,
   ASCII et UTF-16) : identité de l'auteur, chemins du poste, et les valeurs
   réelles de `.env.local` (lues en mémoire, jamais affichées). Un seul hit
   bloque le build.
4. **Démarrage à blanc** : le serveur assemblé est lancé avec
   `runtime\node.exe`, un PATH minimal (sans le Node du système) et un
   `CONTACT_TRACKER_DATA_DIR` jetable ; `/` doit répondre 200 et toutes les
   routes du manifeste sont balayées en GET (4xx toléré, 5xx bloquant).
5. Compilation Inno Setup (`ContactTracker.iss`, lzma2/solid).

## Contenu du paquet installé

```
%LOCALAPPDATA%\Programs\ContactTracker\
  ContactTracker.bat      lanceur (raccourcis menu Démarrer / bureau)
  contact-tracker.ico
  env.example             modèle de configuration
  LISEZ-MOI.txt
  runtime\node.exe        Node embarqué
  app\server.js           serveur Next standalone (+ .next, node_modules)
```

Le lanceur :

- crée `%LOCALAPPDATA%\ContactTracker` et y copie `env.example` → `.env` au
  premier lancement ;
- si `http://127.0.0.1:3200` répond déjà, ouvre simplement le navigateur ;
- sinon charge les lignes `KEY=valeur` de `.env` dans l'environnement, lance
  `runtime\node.exe app\server.js` avec `PORT=3200`, `HOSTNAME=127.0.0.1`,
  `CONTACT_TRACKER_DATA_DIR=%LOCALAPPDATA%\ContactTracker`, attend le port
  (60 s max) puis ouvre le navigateur.

Données de l'utilisateur (`contacts.json`, `dmscan-state.json`, `.env`) :
`%LOCALAPPDATA%\ContactTracker`, jamais dans le dossier d'installation. La
désinstallation les conserve.

## Variables d'environnement lues par l'application

| Variable | Rôle |
| --- | --- |
| `CONTACT_TRACKER_DATA_DIR` | dossier de données (défaut : `<cwd>/data`) |
| `IG_SESSIONID` | cookie Instagram (optionnel) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | app Spotify (recommandé) |
| `DM_THREAD_TITLE` | titre de la conversation « Scan DM » (défaut : `Scouting`) |
| `DM_THREAD_ID` | id de conversation (court = lien, long = id API) |

En développement, ces variables viennent de `.env.local` (chargé par Next) ;
dans la version installée, du fichier `.env` du dossier de données (chargé par
le lanceur — `server.js` standalone ne lit pas les fichiers `.env`).

## Rappel

L'exécutable Inno compresse sa charge utile en LZMA : un grep sur le `.exe`
ne prouve rien. Le contrôle probant est celui de `installer/dist`, exécuté
automatiquement avant la compilation.
