# 🎯 Contact Tracker

Mini-CRM local de suivi de prospection musicale : artistes à démarcher pour la vente d'instrus, producteurs, et pros de l'industrie (managers, A&R, directeurs de label, DA…).


> Site, guide de démarrage et version Pro (installeur Windows + guide de vente PDF) :
> **https://latenightsbeats1208-pixel.github.io/contact-tracker/**

## Installation (version gratuite)

Prérequis : **Node.js ≥ 20**.

```bash
git clone https://github.com/latenightsbeats1208-pixel/contact-tracker.git
cd contact-tracker
npm install
cp .env.example .env.local     # optionnel : clés Spotify (recommandées), cookie Instagram
npm run dev                    # → http://localhost:3200
```

Sous Windows, `Contact Tracker.bat` démarre le serveur et ouvre le navigateur. `npm run package`
produit un installeur autonome (`installer/output/`), voir [`installer/README.md`](installer/README.md).

## Lancer

```bash
npm run dev
```

→ http://localhost:3200 (aussi dispo via launch.json `contact-tracker`)

## Fonctionnalités

- **3 onglets** : 🎤 Artistes · 🎛️ Producteurs · 💼 Pros de l'industrie (avec champ Rôle : manager, A&R, directeur de label, DA…)
- **Fiche contact** : email, téléphone, Instagram, Twitter/X, TikTok, YouTube, Spotify, site web, genre musical, localisation, notes
- **Suivi de vente** (détail dans « Méthodologie de vente » ci-dessous) :
  - Étape du pipeline en 11 étapes (Nouveau → DM en cours → … → Client / Non / Pas maintenant / Disqualifié)
  - Historique daté des interactions (premier contact, relance, réponse, appel 1, appel 2, démo, paiement, note)
  - Prochaine action datée obligatoire + filtre « 🔔 À faire aujourd'hui » (badge quand des actions sont dues ou en retard)
  - Bouton « Action faite ✓ » dans le tableau : logue l'interaction, avance la cadence et propose l'action suivante
- **Import** : CSV (export Google Contacts géré, y compris First/Last Name fusionnés) ou Excel .xlsx/.xls, avec écran de mapping des colonnes (deviné automatiquement, modifiable). Doublons (même nom, même catégorie) et lignes sans nom ignorés.
- **Export Excel** de l'onglet courant (`/api/export?category=…`, sans paramètre = tout)
- **Saisie manuelle** via le bouton Ajouter
- **Auto-complétion** (bloc ✨ en haut de la fiche contact) : accepte un **nom
  d'artiste**, un lien Spotify, un lien Instagram ou un `@handle` → remplit nom,
  lien Spotify, réseaux sociaux, genre, et ajoute l'audience dans les notes. Ne
  remplit que les champs vides, n'écrase jamais la saisie.
- **Résolution du lien Spotify par le nom** : la recherche Spotify seule ne
  suffit pas (« Darius James » a 5 homonymes exacts). Le handle Instagram du
  contact sert de preuve — on ne retient un artiste que si son handle figure
  dans sa bio Spotify. Sans certitude, **aucun lien n'est écrit** (mieux vaut un
  champ vide qu'un mauvais artiste) et le message l'explique.
- **Systématisation** : le bouton ✨ *Compléter réseaux* traite en une passe tous
  les contacts incomplets — il retrouve les liens Spotify manquants **et**
  complète réseaux/genre/audience des autres. À relancer après chaque import
  (rappel affiché en fin d'import).

### Méthodologie de vente (high ticket — accompagnement artiste 2 100 €)

Depuis le 02/09/2026, l'app applique le guide `docs/methodologie-vente.md`
(PARTIE 2), aussi disponible comme skill `/methodologie-vente`. Les scripts et
cadences y sont repris **mot pour mot** (`src/data/methodologie.json`).

- **Pipeline en 11 étapes** (remplace l'ancien) : Nouveau → DM en cours →
  Qualifié → Appel 1 booké → Appel 1 fait → Appel 2 booké → Appel 2 fait →
  Client, et les sorties Non / Pas maintenant / Disqualifié. L'ancien statut
  est conservé dans `legacyStatus`, chaque changement d'étape est journalisé
  dans `stageHistory`.
- **Prochaine action datée obligatoire** sur toute fiche non disqualifiée :
  refus HTTP 400 côté API, blocage à l'enregistrement côté fiche. Le bouton
  « Proposer selon la cadence » (fiche) et « Action faite ✓ » (tableau)
  appliquent les cadences du guide (`src/lib/cadence.ts`) : relances DM à
  +4 h / +24 h / +3 j / +7 j (max 4, puis Pas maintenant), rappels J-1 et H-1
  des appels, récap + démo 30 s entre les appels, vocal / quick win /
  témoignage après un oui, relance valeur à +5 semaines pour les non.
- **📅 Agenda** : en retard / aujourd'hui / cette semaine + rappels d'appels,
  avec le texte exact de la relance du guide et un bouton « Fait ✓ ».
- **📜 Scripts de l'étape** dans chaque fiche : DM (lead entrant PROJET,
  « c'est combien ? », beatmaker), appel 1 (structure, script, menu de
  résultats chiffrés, verrouillages), entre-deux, appel 2, les 10 objections
  filtrables, paiement/onboarding, suivi des non. Le 📖 Guide reprend
  l'ensemble par onglets.
- **📊 Métriques** : entonnoir DM ouverts → appels 1 bookés → tenus → appels 2
  bookés → offres présentées → ventes, taux entre marches, répartition des
  objections, repères du guide (60-80 % de présence, 25-40 % de closing).
- **Générateur 💬** : styles Simple, Douce et **Sortante (méthode)** — §6.4 :
  compliment précis + retour honnête de producteur + question sur son plan à
  6 mois, zéro offre (le style « Directe » a été retiré : on ne closs jamais
  en DM). Les crochets à remplir à l'oreille restent surlignés ; « Copier +
  marquer DM envoyé » passe la fiche en DM en cours avec sa relance datée.
- **Champs de la fiche** : prénom, canal, source, chiffres de départ,
  qualification « ses mots », résultat chiffré, décideur, prix annoncé,
  objection principale, dates des appels.

Migration : `node scripts/migrate-methodologie.mjs` (idempotente ; sauvegarde
préalable dans `data/contacts.backup-avant-methodologie-*.json`), puis
`node scripts/fix-stagehistory-dm.mjs` (ajoute l'événement « DM en cours » aux
fiches migrées depuis « Contacté », pour l'entonnoir).

### Adresses email typées (récoltées sur Instagram)

Chaque contact peut porter plusieurs adresses, chacune typée — **se tromper
d'adresse (envoyer des prods au booking…) grille le contact** :
💼 Management · 📅 Booking · 🎧 Prods · 🎤 Artiste.

- **Sources** : la bio Instagram (ligne par ligne) et le bouton « Adresse
  e-mail » des comptes business (`public_email` — c'est l'onglet visible sur
  mobile). Exige `IG_SESSIONID` dans `.env.local`.
- **Classification automatique** : le contexte de la ligne de bio prime
  (« mgmt 📧: … »), puis la partie locale de l'adresse (sans frontière de
  mot : `salitheartistmgmt@` → management), défaut = artiste. Toujours
  vérifiable et modifiable dans la fiche.
- **Fiche contact** : section « 📧 Adresses email typées » — ajout manuel,
  bouton « Chercher sur Instagram », type éditable, source en infobulle.
- **Tableau** : une icône ✉ par adresse, colorée selon le type (indigo =
  management, ambre = booking, émeraude = prods, violet = artiste), l'usage
  en infobulle.
- **Bouton « Emails IG »** (barre d'outils) : passe en masse sur les contacts
  de l'onglet sans adresse typée — 50 max par passe, ~2,5 s entre profils,
  arrêt immédiat si Instagram limite. Ces lectures passent par TON compte :
  rester sous quelques dizaines de profils par jour.
- Le champ Email historique reste affiché (type artiste) s'il n'est pas déjà
  dans la liste typée.

### Filtre streaming (page Spotify présente ou non)

À côté du filtre de statut : **🎧 Streaming** — *tous* / *avec page Spotify* /
*sans page Spotify*, avec le compte en direct pour la catégorie affichée. Un
raccourci bleu « N sans Spotify » apparaît dans la barre de filtres dès qu'il
reste des artistes à compléter. Une valeur inexploitable héritée d'un import
(« Ouvrir sur Spotify ») compte comme **sans page** — c'est justement ce qu'il
faut corriger. Sert à repérer les artistes à compléter à la main quand le scan
DM ou la résolution automatique n'aboutit pas.

### Playbook

- **[PLAYBOOK.md](PLAYBOOK.md)** : condensé opérationnel de la méthode (parcours,
  fiche mémo, cadences, données terrain, journal des conversations). La
  référence reste `docs/methodologie-vente.md`.

### Messages d'accroche (bouton 💬 sur chaque contact)

Génère un premier DM basé sur l'actualité Spotify de l'artiste (`/api/news`) :
dernière sortie (mise en avant si < 2 mois), concerts à venir, auditeurs mensuels.
Réglages : langue FR/EN (pré-choisie selon la ville du contact), style « accroche
douce » (compliment + question) ou « directe » (propose tes prods), bouton
Variante pour alterner les gabarits. Le message est éditable avant copie ;
« Copier + marquer contacté » enregistre l'interaction premier_contact et passe
le statut à Contacté. Sans lien Spotify, un message générique est proposé.

### Sources de l'auto-complétion (`/api/enrich`)

| Source | Usage | Remarques |
|---|---|---|
| Spotify API interne (token anonyme via page embed → `api-partner.spotify.com` queryArtistOverview) | nom, liens sociaux de la bio (Instagram, Twitter, TikTok, YouTube, site), auditeurs mensuels | hash de requête persistée susceptible de changer → fallback oEmbed (nom seul) |
| Spotify `api.spotify.com/v1/search` | recherche nom → artiste (+ genres officiels) | fonctionne avec le **même token anonyme**, sans app ni client secret ; token mis en cache 25 min |
| Spotify oEmbed (`open.spotify.com/oembed`) | nom de l'artiste (fallback) | public, sans auth — la page artiste anonyme est une coquille JS vide, ne pas la scraper |
| Instagram (`src/lib/instagram.ts`) | nom complet, followers, liens de la bio (dont Spotify → enrichissement complet enchaîné) | flux mobile anonyme + profil authentifié (cookie) + repli og: en UA crawler ; fetch Node bloqué (fingerprint TLS) → curl système. Voir encadré ci-dessous |
| Deezer API | fans + fallback nom depuis le handle | match strict par nom normalisé (jamais le 1er résultat → homonymes) |
| MusicBrainz | genre (tags) | match score ≥ 90 + nom normalisé identique |

#### Instagram : limitation d'IP (HTTP 429)

Instagram limite agressivement les requêtes anonymes. Le module dédié gère ça :

- **trois voies d'accès** — le flux mobile anonyme `feed/user/<handle>/username/`
  (nom, pk, 12 derniers posts datés — les épinglés remontent en tête, tri par
  `taken_at` obligatoire), le profil complet authentifié `users/<pk>/info/`
  (bio, lien externe, email public — exige `IG_SESSIONID`), et la page HTML en
  User-Agent crawler (og: seulement — l'UA navigateur reçoit une coquille vide).
  L'ancien `web_profile_info` est mort (429 permanent, même avec cookie) ;
- **cache 6 h par handle** — un profil déjà lu n'est jamais redemandé ;
- **disjoncteur 30 min** — après un 429, l'app cesse d'appeler Instagram et
  répond instantanément ; marteler une IP limitée rallonge la sanction ;
- **messages précis** — 429 (avec délai restant), profil inexistant, ou mur de
  connexion : trois cas distincts, plus un « bloqué » générique ;
- **repli sans Instagram** — le nom est retrouvé via Deezer à partir du handle,
  puis genre (MusicBrainz) et audience (Deezer) comme d'habitude.

Pour lire Instagram de façon fiable malgré la limitation, copier `.env.example`
en `.env.local` et y coller le cookie `sessionid` de son propre compte (mode
d'emploi dans le fichier). Optionnel : sans lui, tout fonctionne en anonyme.

## Stack & données

- Next.js 15 (App Router) + React 19 + Tailwind, UI dark
- Stockage : `data/contacts.json` (écriture atomique, backup automatique si fichier corrompu) — pas de base de données à installer
- Import/export via SheetJS (`xlsx`)

## Structure

```
src/
  lib/         types, constantes (statuts, labels), db JSON, utils
  app/api/
    contacts/          GET liste, POST création, PUT/DELETE par id
    import/            POST multipart = preview+mapping ; POST JSON = commit
    export/            GET xlsx
  components/
    ContactsApp.tsx    page principale (onglets, filtres, tableau)
    ContactModal.tsx   fiche contact + historique d'interactions
    ImportModal.tsx    import en 3 étapes (fichier → mapping → résultat)
```

## À venir (projet séparé)

Générateur de messages d'accroche personnalisés (FR/EN) basé sur l'actualité des artistes (Spotify, YouTube, Instagram) — projet distinct, non commencé.

## Licence

MIT — voir [`LICENSE`](LICENSE). La méthode de vente (`docs/methodologie-vente.md`) est une synthèse
de sources publiques (Hormozi, Miner, Voss, Dan Lok, Cole Gordon, playbooks setter/closer) adaptée à
la vente d'accompagnement artiste ; elle est fournie telle quelle.
