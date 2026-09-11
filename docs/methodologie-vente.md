# Méthodologie de vente high ticket — fichier unique pour le contact tracker

*Ce fichier regroupe toute la session de travail : (1) le brief d'implémentation pour le contact tracker, (2) le guide de vente adapté à l'offre artiste à 2 100 €, (3) le guide high ticket générique. Pour l'utiliser dans Claude Code : place ce fichier dans le projet (ex. `docs/methodologie-vente.md`) et dis « Lis docs/methodologie-vente.md en entier et suis la PARTIE 1 ».*

---

# PARTIE 1 — Brief d'implémentation dans le contact tracker




Cette skill contient la méthode de vente complète (issue d'une session de recherche sur Hormozi, Miner, Voss, Dan Lok, Cole Gordon et les playbooks setter/closer 2026) et le brief pour l'implémenter dans le contact tracker.

## Où sont les guides

- la PARTIE 2 de ce fichier — **la version à implémenter.** Offre à 2 100 € : 3 prods sur mesure + stratégie de sortie + résultat chiffré fixé au cas par cas. Scripts DM, appel 1, appel 2, objections artiste, cadences de relance.
- la PARTIE 3 de ce fichier — la philosophie et le process high ticket génériques. À lire seulement si un point de la version artiste manque de contexte.

Lire la PARTIE 2 de ce fichier en entier avant de toucher au code. Ne pas résumer de mémoire : les scripts et cadences doivent être repris tels quels.

## Ce que le tracker doit implémenter

### 1. Pipeline (section 5 du guide)

Étapes, dans l'ordre :

1. `nouveau` — contact identifié (commentaire, DM, approche sortante)
2. `dm_en_cours` — conversation DM ouverte, pas encore qualifié
3. `qualifie` — les 4 critères validés (problème, désir, urgence, capacité)
4. `appel1_booke` → `appel1_fait`
5. `appel2_booke` → `appel2_fait`
6. Issue : `client` / `non` / `pas_maintenant` / `disqualifie`

Une fiche ne peut pas rester sans **prochaine action datée** (`next_action`, `next_action_date`). Valider côté modèle et côté UI.

### 2. Champs par contact (sections 3, 7, 8)

- Identité : prénom, pseudo artiste, canal (TikTok / Insta / autre), profil (`artiste` / `beatmaker` / `autre`) — les beatmakers sont des apporteurs d'affaires, pas des prospects
- Source : contenu d'origine, mot-clé utilisé (`PROJET`)
- Liens : Spotify, TikTok, Instagram
- Chiffres de départ : abonnés, auditeurs mensuels, meilleur titre (streams), nombre de sons sortis
- Qualification : problème **avec ses mots** (texte libre), ce qu'il a déjà essayé, "pourquoi maintenant" (texte libre), désir/objectif 6 mois (ses mots), budget déjà dépensé en beats/studio/promo
- Résultat chiffré co-construit : objectif principal, objectif secondaire, profil (`debutant` / `intermediaire` / `avance`)
- Décideur impliqué (oui/non, qui)
- Ordre de grandeur du prix annoncé (oui/non)
- Objection principale (liste : réfléchir / prix-valeur / prix-budget / beatstars / beatmaker existant / tiers / seul / déjà déçu / garantie streams / pas le moment)
- Dernier contact, prochaine action, date
- Historique des interactions (type, date, note)

### 3. Cadences de relance (sections 7.4, 7.5, 13)

À générer automatiquement selon l'étape :

- DM sans réponse : +4 h (prénom + ?), +24 h (vocal), +3 j (conseil concret), +7 j (clôture). Maximum 4 relances.
- Appel booké : rappel J-1 et H-1.
- Entre appel 1 et appel 2 : message le jour même (ses mots), démo 30 s à J+1/J+2.
- Après un oui : message sous 24 h, quick win à J+10, demande de témoignage.
- `non` / `pas_maintenant` : relance valeur toutes les 4 à 6 semaines, jamais "t'as réfléchi ?".

### 4. Scripts contextuels (sections 7, 8, 10, 11)

Depuis une fiche, afficher le script correspondant à l'étape courante :

- `dm_en_cours` : script lead entrant PROJET, script "c'est combien ?", script beatmaker
- `appel1_booke` : structure et script appel 1 + menu de résultats chiffrés (section 2.2)
- `appel2_booke` : structure et script appel 2
- Toute étape : les 10 objections avec réponses (section 11), filtrables par objection notée

Stocker les scripts dans un fichier de données (JSON ou markdown) extrait du guide, pas en dur dans le code.

### 5. Métriques (section 13.2 du générique)

Tableau de bord : DM ouverts → appels 1 bookés → appels 1 tenus → appels 2 bookés → offres présentées → ventes. Taux entre chaque étape. Répartition des objections. Repères : 60-80 % de présence aux appels, 25-40 % de closing sur leads qualifiés.

## Ordre de travail

1. Lire le guide artiste en entier.
2. Inspecter le schéma et l'UI actuels du tracker.
3. Proposer le mapping (champs existants → champs cibles, migrations nécessaires) et les changements d'UI. **Attendre validation avant de coder.**
4. Implémenter : modèle → migrations → relances automatiques → scripts contextuels → métriques.
5. Vérifier qu'aucune fiche ne peut être sauvegardée sans prochaine action datée.

---

# PARTIE 2 — Guide de vente adapté à l'offre artiste (2 100 €)

## Vendre l'accompagnement artiste à 2 100 € — Le guide adapté

*Version spécifique de la méthode high ticket (Hormozi, Miner, Voss, Dan Lok, playbooks setter/closer 2026) appliquée à ton offre : 3 prods sur mesure + stratégie de sortie + un résultat chiffré défini au cas par cas, pour des artistes (rappeurs/chanteurs), acquis via TikTok et les DM.*

---

## Table des matières

1. L'offre, verrouillée avant de vendre
2. Le résultat chiffré — comment le définir au cas par cas
3. À qui tu vends (et à qui tu ne vends pas)
4. La philosophie appliquée à un artiste
5. Le parcours complet
6. Étape 1 — Le contenu TikTok qui déclenche des DM
7. Étape 2 — Le setting en DM (scripts artiste)
8. Étape 3 — L'appel 1 : le diagnostic artiste (script complet)
9. Étape 4 — Entre les deux appels : la maquette et le plan
10. Étape 5 — L'appel 2 : présentation et closing (script complet)
11. Étape 6 — Les objections spécifiques aux artistes
12. Étape 7 — Paiement, renforcement, onboarding
13. Suivi des non
14. Erreurs qui tuent la vente de cette offre en particulier
15. Fiche mémo
16. Sources

---

## 1. L'offre, verrouillée avant de vendre

Un script ne sauve pas une offre floue. Voici l'offre telle qu'elle doit être formulée pour être vendable à 2 100 €.

### 1.1 La promesse (une phrase)

> **"En 12 semaines, on sort ton projet : 3 titres produits sur mesure pour toi, une stratégie de sortie qui tourne, et un objectif chiffré qu'on fixe ensemble dès le départ."**

Ce n'est pas "du coaching". Ce n'est pas "des beats". C'est **un projet sorti avec un chiffre au bout**.

### 1.2 Les composantes

| Composante | Ce que c'est concrètement | Ce que ça règle chez l'artiste |
|---|---|---|
| **Phase 1 — Diagnostic & direction (sem. 1-2)** | Écoute de tout ce qu'il a fait, analyse de sa voix/son univers/son audience, définition de la direction artistique des 3 titres, fixation du résultat chiffré | "Je ne sais pas quel son est le mien", "je fais des sons dans tous les sens" |
| **Phase 2 — Les 3 prods sur mesure (sem. 3-8)** | 3 instrumentales composées *pour sa voix et son projet*, allers-retours illimités jusqu'à validation, structure pensée pour le format (radio edit / hook TikTok), stems livrés, accompagnement sur l'enregistrement (topline, placement, ad-libs) | "J'achète des beats à 30 € que 200 autres ont aussi", "mes sons ne ressemblent pas à un projet", "je ne sais pas comment poser dessus" |
| **Phase 3 — Stratégie de sortie (sem. 9-12)** | Plan de sortie titre par titre (ordre, calendrier), plan de contenu TikTok/Reels (formats, hooks, 15-20 idées de vidéos), plan de pitch playlists/médias, mise en place distribution, suivi des chiffres semaine par semaine | "Je sors un son, il fait 400 streams et il meurt", "je ne sais pas quoi poster" |
| **Transversal** | 1 session visio par semaine (45 min), accès direct (vocal/DM) avec réponse sous 24 h, feedback sur chaque prise | "Je suis tout seul, personne ne me dit si c'est bien" |

**Livrable final** : 3 titres mixés-prêts à sortir (ou sortis), un calendrier de sortie exécuté, et le tableau de suivi du résultat chiffré.

### 1.3 L'équation de valeur appliquée

**Valeur = (Résultat rêvé × Probabilité perçue) ÷ (Délai × Effort)**

- **Résultat rêvé** : pas "3 beats", mais *un projet cohérent qui sort et qui fait des chiffres*. C'est le premier vrai projet de l'artiste, celui qu'il pourra montrer à un label, un manager, une salle.
- **Probabilité perçue** : ton parcours (Late Nights Beats, des années de prod, ta présence TikTok qui prouve que tu sais faire des vues), les allers-retours illimités (il ne peut pas se retrouver avec une prod qu'il n'aime pas), et le résultat chiffré fixé *avec* lui.
- **Délai** : 12 semaines avec une date de sortie. Un artiste seul met 8 à 18 mois pour sortir 3 titres — s'il les sort.
- **Effort** : tu composes, tu structures, tu planifies. Lui, il écrit et il pose. C'est le point de vente central : **tu retires 70 % du travail qui n'est pas de l'écriture.**

### 1.4 Ce que l'artiste compare mentalement à ton prix

Il faut connaître ces chiffres pour pouvoir les poser calmement en appel :

- Un beat exclusif sur BeatStars chez un producteur reconnu : 300 à 1 500 €. Trois prods exclusives sur mesure, c'est déjà 1 000 à 3 000 € au tarif marché.
- Un mix/master pro : 150 à 400 € par titre.
- Un consultant/agence marketing musique : 500 à 2 000 € pour un plan de sortie.
- 12 sessions de coaching artistique à 80-150 €/h : 1 000 à 1 800 €.

Additionné, ton offre "vaut" 3 000 à 6 000 € en composants séparés. Tu es à 2 100 €. Tu ne baisses jamais ce prix ; tu peux le décomposer en 3 × 700 € ou 2 × 1 050 €.

### 1.5 Ta phrase "ce n'est pas pour toi si…"

> "Ce n'est pas pour toi si tu n'as jamais enregistré un morceau, si tu n'as pas 3-4 heures par semaine à mettre dedans, ou si tu veux que quelqu'un fasse tout à ta place — j'écris pas tes textes et je pose pas à ta place."

---

## 2. Le résultat chiffré — comment le définir au cas par cas

C'est la partie qui rend ton offre unique : tu ne vends pas des heures, tu vends une cible. Mais tu ne peux pas promettre le même chiffre à un artiste à 40 abonnés et à un artiste à 8 000.

### 2.1 La méthode en appel

Le résultat chiffré se fixe **en appel 1**, à partir de trois données que tu demandes :

1. **Son niveau actuel** : abonnés TikTok/Insta, auditeurs mensuels Spotify, meilleur titre en streams, nombre de sons sortis.
2. **Son objectif à 6-12 mois** (ses mots).
3. **Ce que tu peux raisonnablement viser en 12 semaines** avec 3 titres et un plan de contenu.

Tu formules ensuite **un objectif principal + un objectif secondaire**, en gardant une marge : vise un chiffre que tu penses atteignable à 70 %. Un objectif tenu construit un témoignage ; un objectif raté de peu le détruit.

### 2.2 Menu de résultats chiffrés (à adapter)

| Profil au départ | Résultat principal réaliste (12 semaines) | Résultat secondaire |
|---|---|---|
| **Débutant sérieux** — 1-3 sons sortis, < 500 abonnés, < 1 000 streams/titre | 3 titres sortis + **premier titre à 5 000 streams** en 30 jours | 500 abonnés TikTok gagnés, 3 vidéos > 10 000 vues |
| **Intermédiaire** — 5-15 sons, 500-5 000 abonnés, 1 000-10 000 streams/titre | **Un titre à 20 000-50 000 streams**, ou ×3 de ses auditeurs mensuels | 1 placement playlist éditoriale ou indépendante > 10k followers, 1 000 abonnés gagnés |
| **Avancé** — audience établie, déjà des sons à 50k+ | **Un titre qui dépasse son record**, EP à 100k streams cumulés | 1 première partie / 1 média / 1 contact label ou manager |

Tu peux aussi proposer des résultats non-streaming si ça correspond mieux à son désir : "3 titres prêts à envoyer à des labels avec un dossier de presse", "premier live booké", "premier revenu de la musique (X € de streaming + ventes)".

### 2.3 Comment le vendre sans te mettre en danger

> "L'objectif chiffré, on le fixe ensemble à la fin de la phase 1, une fois que j'ai tout écouté et regardé tes chiffres. Ce que je te garantis, c'est le travail : 3 prods sur mesure jusqu'à ce que tu sois content, et un plan exécuté avec moi chaque semaine. Le chiffre, c'est notre boussole, pas un contrat — parce que je ne contrôle pas l'algorithme, et toi non plus. Mais je te dis pas 'on verra', je te dis 'voilà où on vise et comment on y va'."

Si tu veux une garantie, la garantie conditionnelle est celle qui protège les deux :
> "Si à la fin des 12 semaines tu as fait tout ce qu'on a prévu — enregistré tes 3 titres, posté le contenu du plan — et qu'on n'a pas atteint l'objectif, je continue avec toi gratuitement jusqu'à ce qu'on l'atteigne, dans la limite de 4 semaines."

---

## 3. À qui tu vends (et à qui tu ne vends pas)

Ton audience est à 70 % beatmakers, mais ta cible est l'artiste. Ça change trois choses :

1. **Ton contenu de vente doit parler à l'artiste**, même s'il fait moins de vues que ton contenu beatmaking. Les vues ne paient pas, les DM d'artistes oui.
2. **Les beatmakers de ton audience sont des apporteurs d'affaires.** Chaque beatmaker bosse avec 2-5 artistes. "Tu connais un rappeur qui galère à sortir son projet ? Envoie-le moi" est un canal à part entière.
3. **Tu qualifies dur.** L'artiste idéal :

| Critère | Ce que tu veux | Signal rouge |
|---|---|---|
| A déjà sorti ou enregistré | Au moins 2-3 titres enregistrés, même mal | "Je veux commencer la musique" |
| Est frustré par quelque chose de précis | "Mes sons ne décollent pas", "je trouve pas mon son", "j'achète des beats et ça ressemble à rien" | "Je cherche juste des beats pas chers" |
| A une ambition formulée | "Je veux vivre de ça", "je veux signer", "je veux jouer en salle" | Aucune projection |
| A du temps | 3-4 h/semaine minimum | "Je fais ça quand j'ai le temps" |
| A une capacité financière | Un job, une aide, un partenaire — 2 100 € possible en 1 à 3 fois | A demandé si tu fais des beats gratuits ; 16 ans sans revenu |

**Point important** : si tu tombes sur un mineur, tu ne vends pas sans le parent sur l'appel. Point.

---

## 4. La philosophie appliquée à un artiste

Un artiste n'achète pas une prestation ; il achète **la confirmation qu'il n'est pas fou de croire en son projet, et quelqu'un qui le prend au sérieux**. Tout ce qui suit découle de ça.

- **Tu es un producteur qui diagnostique, pas un vendeur.** Tu écoutes ses sons *avant* l'appel. Tu as un avis. Tu le donnes, y compris quand il pique. Un artiste sent immédiatement la différence entre un compliment de vendeur et un retour de producteur.
- **Il parle 70 % du temps.** Ton job : le faire raconter son projet, ses frustrations, sa vision. Il se vend l'accompagnement lui-même en découvrant, à voix haute, qu'il tourne en rond.
- **Les trois croyances** : (1) ta méthode fait sortir des projets qui font des chiffres, (2) ça marchera pour *lui* (sa voix, son style, son audience), (3) tu es la bonne personne (tu l'as compris, tu es honnête, tu as les compétences).
- **Zéro pression.** Un artiste à qui on met la pression se ferme — et parle. Ta réputation dans un milieu où tout le monde se connaît vaut plus que n'importe quelle vente.
- **Tu disqualifies ouvertement.** "Je pense que tu n'es pas prêt pour ça, voilà ce que tu devrais faire d'abord" te ramènera des gens dans six mois.

---

## 5. Le parcours complet

```
TIKTOK (contenu artiste)  →  DM (mot-clé)  →  ÉCOUTE DE SES SONS  →  APPEL 1 (25 min)
                                                                          diagnostic + résultat chiffré
        →  MAQUETTE / DIRECTION (entre les appels)  →  APPEL 2 (45 min)  →  PAIEMENT + ONBOARDING
                                                        présentation + closing
```

Particularité de ton offre : **tu as un avantage énorme sur n'importe quel coach — tu peux faire une démonstration.** Entre l'appel 1 et l'appel 2, tu peux envoyer 30 secondes d'idée de prod dans sa direction. Ce n'est pas une prod finie, c'est une preuve que tu as compris son univers. Ça convertit plus que n'importe quel argument (voir section 9).

---

## 6. Étape 1 — Le contenu TikTok qui déclenche des DM

Ton contenu de vente est différent de ton contenu de croissance. Il vise un artiste précis, pas des vues.

### 6.1 Cinq formats qui font écrire des artistes

1. **Le diagnostic** — "3 raisons pour lesquelles ton son fait 400 streams et meurt" / "Pourquoi acheter des beats à 30 € te coûte ta carrière". Fin : "Si tu te reconnais, écris-moi PROJET."
2. **Le before/after de prod** — "Un artiste m'envoie son son sur un beat BeatStars → voilà ce que ça donne quand la prod est faite pour sa voix." Tu montres la différence.
3. **La construction en live** — "Je construis une prod pour une voix comme celle-ci" : tu prends un extrait a cappella (le tien ou un client), tu montres comment tu adaptes la tonalité, le tempo, l'espace.
4. **Le cas client** — dès que tu as un premier client : "[Prénom] avait 3 sons à 800 streams. Voilà ce qu'on a fait en 12 semaines."
5. **Le contre-pied industrie** (depuis ton compte commentaire) — "Arrête de sortir un son par mois, voilà pourquoi." Tu utilises ton autorité sur l'industrie pour attirer des artistes qui réfléchissent.

### 6.2 Le CTA unique

Toujours le même mot : **"Écris-moi PROJET en DM"** (ou "commente PROJET"). Tu sais d'où vient la personne, et le mot dit déjà ce qu'elle veut.

### 6.3 Le lead magnet : le retour de producteur

Ce que tu donnes en échange du DM n'est pas un PDF. C'est **un retour de 3 points sur un de ses sons**. C'est ta prestation en miniature, ça te prend 5 minutes, et ça installe immédiatement les trois croyances.

### 6.4 L'approche sortante

Quand un artiste commente, like, ou correspond exactement à la cible :
> "Hey, j'ai écouté [titre]. Le [élément précis : flow sur le deuxième couplet / la mélodie du refrain] est vraiment bien. Par contre la prod te dessert sur [point précis]. Question : c'est quoi ton plan pour les 6 prochains mois avec ta musique ?"

Un compliment précis + un retour honnête + une question. Zéro lien, zéro offre.

---

## 7. Étape 2 — Le setting en DM (scripts artiste)

### 7.1 Script — lead entrant ("PROJET")

**Message 1**
> "Hey [prénom] ! Envoie-moi ton meilleur son (lien ou fichier) et dis-moi en une phrase où tu en es avec ta musique — je t'écoute et je te fais un retour honnête."

**Message 2 — le retour (après écoute, 3 points)**
> "Écouté. Ce qui marche : [point fort précis]. Ce qui te freine : [point 1], [point 2]. Franchement il y a un truc à faire avec ta voix. Question : ça fait combien de temps que tu sors des sons, et ils font combien en général ?"

**Message 3 — le blocage**
> "OK je vois. Et concrètement, c'est quoi qui te bloque le plus aujourd'hui — trouver ton son / avoir des prods qui te ressemblent, ou faire que tes sorties fassent des chiffres ? Ou les deux ?"

**Message 4 — l'objectif et l'urgence**
> "Compris. Si on se reparle dans 6 mois et que tout a marché, ça ressemble à quoi pour toi ? Et c'est un truc que tu veux régler maintenant, ou plutôt plus tard ?"

**Message 5 — la proposition d'appel**
> "Vu ce que tu me décris et ce que j'ai entendu, je pense clairement qu'il y a quelque chose à faire. Je bosse en accompagnement avec quelques artistes sur 12 semaines — 3 prods sur mesure + la stratégie de sortie. Je te dis pas que c'est pour toi, je sais pas encore. Le plus simple : on prend 25 min en visio, je te pose des questions, je te dis ce que je vois, et si ça a du sens je t'explique comment je bosse. Sinon je te le dis aussi. Ça te dit ?"

**Message 6 — booking**
> "Top. Voilà mon lien : [lien]. Prends un créneau cette semaine, et envoie-moi 2-3 autres sons + tes liens Spotify/TikTok avant, que j'arrive préparé."

### 7.2 Script — "C'est combien ?"

> "Ça dépend de ce dont t'as besoin — si c'est juste un beat, je t'envoie sur mon BeatStars. Si c'est sortir un vrai projet avec des prods faites pour toi et un plan pour qu'il fasse des chiffres, c'est un accompagnement. Tu cherches lequel des deux ?"

Puis :
> "OK. L'accompagnement c'est un investissement de l'ordre de 2 000 €, sur 12 semaines, et je prends peu de monde. Le mieux c'est qu'on se prenne 25 min pour voir si c'est pertinent pour toi — parce que si t'es pas au bon stade, je préfère te le dire. On cale ça ?"

Tu as donné l'ordre de grandeur (pas de choc en appel), séparé ton BeatStars de ton accompagnement, et gardé la vente pour la voix.

### 7.3 Script — le beatmaker qui écrit (le mauvais lead)

Tu en recevras beaucoup. Deux issues :
> "Hey ! Là ce que je décris c'est pour les artistes — pour les beatmakers j'ai le Patreon [lien] avec les retours sur tes prods. Par contre : t'as des artistes avec qui tu bosses qui galèrent à sortir leur projet ? Si t'en connais un, envoie-le moi, et si ça se fait je te reverse [X %/€]."

Ton audience beatmaker devient un canal d'apport.

### 7.4 Relances (ghost en DM)

- **+4 h** : "[Prénom] ?"
- **+24 h** : vocal de 10 s. "Hey, j'ai vu que t'avais pas répondu, aucun stress. Je te dis juste que j'ai réécouté ton son et que [micro-remarque nouvelle]. Dis-moi si c'est toujours d'actualité."
- **+3 j** : "Peu importe ce que tu décides, un truc à faire direct sur ton prochain son : [conseil concret]. Et il me reste 2 créneaux cette semaine si tu veux qu'on en parle."
- **+7 j** : "Je pars du principe que c'est pas le moment, aucun souci. Ma porte reste ouverte."

### 7.5 Avant l'appel

- Confirmation avec le cadre : "Bloqué [jour/heure]. On fait le point sur ton projet, je te dis ce que je vois, on regarde si bosser ensemble a du sens. 25 min, au calme, avec ton ordi."
- **Formulaire de 5 questions** : liens (Spotify, TikTok, Insta), nombre de sons sortis, meilleur score en streams, ce qui te bloque le plus, pourquoi maintenant.
- **Tu écoutes tout avant l'appel.** Non négociable. Tu arrives avec un avis.
- Rappel la veille + 1 h avant.

---

## 8. Étape 3 — L'appel 1 : le diagnostic artiste

**25-30 min. Objectif : diagnostiquer, faire dire son problème et son désir avec ses mots, fixer un pré-objectif chiffré, booker l'appel 2. Pas de présentation d'offre.**

### 8.1 Structure

| Bloc | Durée | Objectif |
|---|---|---|
| A. Cadre | 2 min | Agenda, autorité |
| B. Situation | 5 min | Son parcours, ses chiffres, sa semaine type |
| C. Problème | 7 min | Ce qui bloque, ce qu'il a essayé, pourquoi ça n'a pas marché |
| D. Désir + écart | 5 min | Où il veut être, ce que ça change |
| E. Coût de l'inaction | 3 min | Ce que ça coûte de continuer pareil |
| F. Pré-résultat chiffré + engagement | 5 min | Fit, cible, créneau appel 2 |

### 8.2 Script

**A. Cadre**
> "Hey [prénom], content qu'on se parle. [30 s de vrai.] J'ai écouté [titres], j'ai des trucs à te dire. Voilà comment je vois les 25 prochaines minutes : je te pose pas mal de questions sur ton projet, où t'en es, où tu veux aller — c'est toi qui parles surtout. À la fin je te dis honnêtement ce que je vois. Si je pense que je peux t'aider, je t'explique comment et on cale une suite ; si je pense que c'est pas le moment, je te le dis aussi. Ça te va ?"

**B. Situation**
> "Raconte-moi : tu fais de la musique depuis combien de temps ? T'as sorti combien de sons ? Ils tournent à combien en général ?"
> "Une semaine type, ça ressemble à quoi côté musique — tu écris quand, t'enregistres où, tu postes quoi ?"
> "Tu prends tes prods où aujourd'hui ? Tu payes combien ?"
> "Et qu'est-ce qui t'a poussé à m'écrire, là, maintenant ? Pourquoi pas dans six mois ?"

*Note la dernière réponse mot pour mot. C'est le déclencheur réel.*

**C. Problème**
> "Qu'est-ce qui te frustre le plus dans ta situation ?"
> "Quand tu sors un son, il se passe quoi concrètement ? Tu postes, et ensuite ?"
> "Qu'est-ce que t'as déjà essayé pour que ça décolle ?" → "Et pourquoi ça n'a pas marché à ton avis ?"
> "Ces trois derniers mois, t'as fait quoi concrètement pour changer ça ?"
> "T'as déjà bossé avec un producteur sur mesure, ou un coach ? Ça a donné quoi ?"

**Ton retour de producteur (1-2 min, c'est le moment clé de l'appel)** :
> "Je vais te dire ce que j'entends. [Point fort sincère.] Par contre, [point qui freine — prod générique / tonalité pas adaptée / structure sans hook / sorties sans plan]. Et je pense que ton vrai problème c'est pas [ce qu'il croit — 'je fais pas assez de vues'], c'est [ce que tu vois — 'tes sons ne forment pas un projet, donc personne ne peut te suivre']. Est-ce que ça te parle ?"

**Labellisation** :
> "Donc si je résume : tu [situation], t'as essayé [X, Y], et ce qui te bloque vraiment c'est [problème précis]. C'est ça ?"

**D. Désir + écart**
> "Imagine qu'on est dans six mois et que ça a marché comme tu voulais. Ça ressemble à quoi ? Des chiffres, des trucs concrets."
> "Et si t'arrives là, ça change quoi pour toi ? Pas juste dans ta musique — dans ta vie ?"
> "Pourquoi c'est important ?"

Cherche l'émotion. "50 000 streams" n'est pas un désir. "Que mes parents arrêtent de me demander quand je vais trouver un vrai taf", "prouver à mon ex-groupe que j'avais raison", "pouvoir quitter mon job dans deux ans" — ça, c'en est.

**E. Coût de l'inaction**
> "Et si dans un an t'es exactement au même endroit — même nombre de streams, même galère avec les prods — ça te fait quoi ?"
> "Ça t'a déjà coûté combien, en beats achetés, en studio, en temps, de tourner comme ça ?"

Souvent l'artiste réalise à voix haute qu'il a déjà dépensé 800 à 2 000 € en beats, sessions et promos qui n'ont rien donné. Note le chiffre — tu le réutiliseras en appel 2.

**F. Pré-résultat chiffré + engagement**

*Si ce n'est pas un fit* :
> "Je vais être direct : je pense que t'es pas au bon stade pour ce que je fais, parce que [raison]. Ce que je te conseille : [2 conseils concrets et gratuits]. Fais ça, et si dans [délai] t'as [étape], reviens me voir, sérieux."

*Si c'est un fit* :
> "Écoute, d'après ce que j'ai entendu et ce que tu m'as dit, je pense clairement qu'il y a un projet à sortir. Un truc dont je suis sûr : ton problème c'est pas ton niveau, c'est [ses mots]. Et ça, ça se règle.
>
> Je vais te dire à quoi je pense en termes de cible. T'es à [ses chiffres]. Avec 3 titres faits pour toi et un plan de sortie tenu, sur 12 semaines, je pense qu'on peut viser [résultat principal du menu, section 2] — et derrière [résultat secondaire]. Ça te parle comme objectif ? Tu le trouves trop ambitieux, pas assez ?"

*Il réagit, vous ajustez. Il vient de co-construire son objectif — c'est le sien maintenant.*

> "OK. Voilà ce que je te propose : je prends tout ce que tu m'as dit, je réécoute tes sons avec ça en tête, et je te prépare un plan précis — la direction des 3 titres, la stratégie de sortie, et comment on atteint [objectif]. On se refait 45 min [jour] ou [jour], je te présente tout, et à la fin tu as tout pour décider — oui ou non, pas de 'je vais réfléchir'. Ça te va ? Tu préfères quel créneau ?"

**Deux verrouillages** :
> "Il y a quelqu'un d'autre qui compte dans ce genre de décision pour toi — un parent, un(e) partenaire, un manager ? Si oui, ça vaut le coup qu'il ou elle soit sur l'appel."
> "Pour que tu viennes en connaissance de cause : c'est un investissement de l'ordre de 2 000 €, payable en plusieurs fois. Je te dis pas ça pour te faire peur, juste pour qu'il n'y ait pas de surprise. C'est dans le cadre pour toi, ou c'est un sujet ?"

Si c'est "un sujet", tu le traites maintenant : "OK, dis-m'en plus — c'est que t'as zéro budget pour ta musique, ou c'est que 2 000 d'un coup c'est pas possible ?" La plupart du temps c'est le second, et l'échelonnement règle ça.

---

## 9. Étape 4 — Entre les deux appels : la maquette et le plan

C'est là que ton offre a un avantage que 99 % des coachs n'ont pas. Trois actions, dans l'ordre :

1. **Le jour même**, message avec ses mots :
   > "Merci pour l'échange. Ce que j'ai noté : le blocage c'est [ses mots], l'objectif c'est [chiffre co-construit], et ce que ça change pour toi c'est [son désir]. Je bosse dessus, on se voit [jour/heure]."

2. **À J+1 ou J+2, la démo** : 20 à 40 secondes d'une idée de prod dans la direction que tu vois pour lui. Pas finie, pas mixée. Un vocal avec :
   > "J'ai commencé à réfléchir à ta direction. Ça c'est pas une prod finie, c'est une idée — mais écoute la tonalité et l'espace, c'est pensé pour ta voix. Dis-moi ce que ça te fait."

   Sa réaction te dit tout. S'il envoie trois messages en majuscules, la vente est faite. S'il répond "cool", tu ajustes en appel 2. Cette démo installe la croyance n°2 ("ça marchera pour moi") mieux que n'importe quel argument.

3. **Ta préparation** : un document d'une page (tu le partages à l'écran en appel 2) — Situation actuelle (ses chiffres) → Objectif (le chiffre) → Les 3 phases → Ce qu'il fait / ce que tu fais → Calendrier avec date de sortie du premier titre.

---

## 10. Étape 5 — L'appel 2 : présentation et closing

**45 min. Objectif : présenter le plan sur mesure, obtenir une décision, encaisser.**

### 10.1 Script

**A. Recadrage (3 min)**
> "Salut [prénom]. Avant de commencer : je te présente le plan, tu me poses toutes tes questions, et à la fin on décide ensemble — oui ou non, les deux sont OK. Ce que je veux éviter c'est le 'je réfléchis' qui traîne trois semaines, ça sert à personne. Toujours OK ?
> Et rien n'a bougé depuis l'autre jour ? Le blocage c'est toujours [ses mots], l'objectif c'est toujours [chiffre] ?"
> [Si la démo a été envoyée :] "Et la petite idée que je t'ai envoyée, elle t'a fait quoi ?"

**B. Le pont (2 min)**
> "Voilà ce que je vois après avoir tout réécouté. [Diagnostic en 3 phrases, y compris ce qu'il fait bien.] Ce qui te manque, c'est pas du talent et c'est pas de l'info — t'as regardé 200 vidéos. C'est trois choses : des prods faites pour ta voix, un projet cohérent au lieu de sons isolés, et un plan de sortie qui tient 12 semaines au lieu de 3 jours. Tu veux que je te montre comment je m'y prendrais avec toi ?"

**C. La présentation (12 min) — "Vends la sortie, pas les semaines"**

Partage ton document d'une page.

> "Le point d'arrivée, c'est ça : [date], ton premier titre sort. [Date], le deuxième. [Date], le troisième. Et à la fin des 12 semaines, t'as [objectif chiffré] et un projet que tu peux montrer à n'importe qui. Ça se passe en trois phases.
>
> **Phase 1 — Direction (semaines 1-2).** On fixe ton son. Je réécoute tout, on fait une session où on définit la direction artistique des 3 titres — tonalité, tempo, univers, ce que chaque titre raconte. On verrouille l'objectif chiffré avec tes vrais chiffres. À la fin de la phase 1, t'as une direction claire — un truc que t'as jamais eu, tu me l'as dit toi-même.
>
> **Phase 2 — Les 3 prods (semaines 3-8).** Je compose les 3 instrus pour toi — pas des beats de catalogue, des prods pensées pour ta voix, ta tessiture, ton flow. Allers-retours illimités : tant que t'es pas à 100 %, on continue. Je t'accompagne sur l'enregistrement : la topline, le placement, les ad-libs, la structure pour que le hook tombe là où TikTok le veut. Tu m'envoies chaque prise, je te réponds sous 24 h. Tu m'as dit que tu galérais à poser sur des beats qui te ressemblent pas — là c'est fini, le beat est fait autour de toi.
>
> **Phase 3 — Sortie (semaines 9-12).** On construit le plan : l'ordre des titres, le calendrier, la distribution, 15-20 idées de vidéos TikTok/Reels avec les hooks, le pitch playlists. Et on l'exécute ensemble, semaine par semaine, en regardant les chiffres. Tu m'as dit que tes sons faisaient 400 streams et mouraient — c'est parce qu'il n'y avait pas de plan derrière. Là il y en a un, et t'es pas seul pour le tenir.
>
> Pendant les 12 semaines : une session visio par semaine, accès direct en vocal, réponse sous 24 h. Le but c'est que tu restes jamais bloqué plus d'une journée."

Trois choses à faire pendant la présentation :
- **Relier chaque phase à ses mots** ("tu m'as dit que…").
- **Dire ce que tu ne fais pas** : "J'écris pas tes textes, je pose pas à ta place, et je te garantis pas l'algorithme. Ce que je garantis c'est les prods jusqu'à validation et le plan exécuté avec toi."
- **Vérifier** : "Ça te parle ?" "Tu vois le truc ?"

**La preuve** (ton parcours tant que tu n'as pas de client) :
> "Je fais de la prod depuis [X] ans, [éléments concrets : sample packs, catalogue, chiffres YouTube/TikTok]. Je sais faire des vues, tu le vois sur mes comptes. Et je sais faire des prods qui tiennent — tu l'as entendu sur l'idée que je t'ai envoyée."

Dès que tu as un client : "[Prénom] était à [situation]. En 12 semaines, [résultat]."

**D. Le prix (2 min)**
> "Donc pour résumer : 12 semaines, 3 prods sur mesure jusqu'à validation, l'accompagnement à l'enregistrement, la stratégie de sortie exécutée avec toi, une session par semaine et l'accès direct — avec pour cible [objectif chiffré]. L'investissement pour ça, c'est 2 100 €."

**Silence.** 5, 8, 10 secondes. Le premier qui parle perd le cadre.

Ne dis pas "seulement". Ne justifie pas dans la même phrase. Ne propose pas l'échelonnement avant qu'on te le demande.

**E. La décision (15-20 min)**

Oui → passe en F immédiatement.
Question ou objection → section 11.
Flou → "Sur une échelle de 1 à 10, t'es à combien à l'idée de te lancer ? … Qu'est-ce qui manque pour aller à 10 ?"

Clôtures spécifiques artiste :
> **Le passé** : "Tu m'as dit que t'avais déjà mis [chiffre qu'il a donné en appel 1] dans des beats et du studio qui ont rien donné. Là c'est le même ordre de grandeur, sauf que cette fois y a un plan et quelqu'un qui bosse avec toi. Qu'est-ce qui te fait penser que refaire pareil donnera un autre résultat ?"
> **La chaise à bascule** : "Dans un an, version A : t'as sorti ton projet, t'as [objectif], t'as un truc à montrer. Version B : t'as encore 4 sons sur des beats BeatStars à 500 streams. Laquelle tu préfères ?"

Closing final :
> "Alors, on le sort ce projet ?"

**F. Renforcement (5 min)** — section 12.

---

## 11. Étape 6 — Les objections spécifiques aux artistes

Cadre universel : **pause 3 s → clarifier → isoler ("à part ça, autre chose ?") → recadrer avec ses mots → confirmer**.

**1. "Je vais réfléchir."**
> "Bien sûr. En général quand on me dit ça, c'est soit pas sûr que ça marche pour soi, soit l'argent, soit quelqu'un à consulter. C'est lequel pour toi ?"
Si "j'ai juste besoin de temps" : "Tu vas réfléchir à quoi exactement ? Qu'est-ce qui sera différent jeudi ?" Si vague : "Je te le demande direct : c'est une façon polie de dire non ? Un non ça me va, c'est le maybe qui traîne qui sert à personne."

**2. "C'est trop cher." / "Je suis artiste, j'ai pas de thune."**
D'abord : valeur ou budget ?
> "Trop cher par rapport à ce que ça apporte, ou trop cher par rapport à ce que tu peux mettre là maintenant ?"
*Valeur* → retour au marché et au coût de l'inaction :
> "Trois prods exclusives sur mesure, au tarif marché, c'est déjà entre 1 000 et 3 000 €. Le plan de sortie, une agence te le facture 500 à 2 000. Et tu m'as dit toi-même que t'avais déjà mis [chiffre] dans des trucs qui ont rien donné. La question c'est pas si 2 100 c'est cher, c'est combien te coûte une année de plus au même endroit."
*Budget* → "Si l'argent était pas un sujet, tu te lancerais là ?" → oui → "OK, donc la question c'est comment, pas si. Tu peux mettre combien au départ ?" → 3 × 700 € ou 2 × 1 050 €. **Jamais de remise.** Une remise dit que 2 100 était faux.

**3. "Je peux acheter des beats à 30 € sur BeatStars."**
C'est LA objection de ton marché. Ne la combats pas, retourne-la — c'est exactement son problème :
> "Oui, et tu l'as fait — t'as combien de sons sur des beats BeatStars ? … Et ils font combien ? … C'est ça le truc : un beat à 30 €, 200 autres rappeurs l'ont. Il est pas dans ta tonalité, pas structuré pour ta voix, et tes 5 sons ne forment pas un projet parce qu'ils viennent de 5 producteurs différents. Le beat n'est pas le produit ici. Le produit c'est un projet qui sort et qui fait [objectif]. Le beat c'est 20 % du truc."

**4. "J'ai déjà un beatmaker / un pote qui fait mes prods."**
> "Super, garde-le. Ce que je fais c'est pas remplacer ton beatmaker, c'est sortir un projet avec une direction et un plan. D'ailleurs, ton pote, il a un plan de sortie pour tes sons ? Il regarde tes chiffres avec toi chaque semaine ? … Voilà. Et si tu veux, on peut même l'intégrer sur un des trois titres."

**5. "Je dois en parler à mes parents / mon(a) partenaire / mon manager."**
> "Ça se comprend. Toi, perso, t'as envie de le faire ? … OK. Et d'après toi, ce sera quoi sa principale inquiétude ? … [Tu l'armes.] Ce que je te propose : soit un appel de 15 min à trois pour que je réponde direct, soit tu lui en parles ce soir et on se recale demain [heure] pour finaliser. Tu préfères quoi ?"

**6. "Je vais d'abord essayer seul / j'attends d'avoir plus d'abonnés."**
> "Tu peux. Mais tu m'as dit que t'essayais seul depuis [durée]. Qu'est-ce qui sera différent cette fois ? … Et 'attendre d'avoir plus d'abonnés' — les abonnés ils viennent avec quoi ? Avec des sons qui tournent. C'est exactement ce qu'on construit."

**7. "J'ai déjà payé un coach / une formation / une promo et ça a rien donné."**
Croyance n°2 qui flanche. Valide, puis différencie :
> "Je comprends la méfiance. C'était quoi exactement ? … Et pourquoi ça a pas marché ? … [Souvent : de la théorie, pas de livrable, personne qui bosse vraiment avec toi.] C'est exactement pour ça que je vends pas des vidéos. À la fin t'as 3 prods, 3 sorties, et j'ai bossé dessus avec toi chaque semaine. Et si t'as fait tout le plan et qu'on atteint pas l'objectif, je continue gratuitement jusqu'à 4 semaines."

**8. "Tu peux me garantir les streams ?"**
> "Non, et méfie-toi de quiconque te le garantit — ça s'appelle acheter des streams, et ça te fait bannir. Ce que je garantis c'est le travail : les prods jusqu'à ce que t'en sois content, le plan exécuté avec moi, et si t'as tout fait et qu'on n'y est pas, je reste avec toi. L'objectif chiffré c'est notre boussole, et on l'a fixé ensemble à un niveau réaliste."

**9. "Envoie-moi un récap / je regarde ça à tête reposée."**
> "Je peux, mais un PDF t'apprendra rien de plus que ce qu'on vient de se dire. Qu'est-ce qui te manque pour décider ? Dis-le moi, je te réponds là."

**10. "C'est pas le bon moment."**
> "Y a jamais de bon moment. Qu'est-ce qui doit se passer pour que ce soit le bon ? … Et ça arrive quand ?" Réponse concrète (examens dans 5 semaines) → date de rappel précise. Réponse vague → objection déguisée, retour au cadre.

**Ce que tu ne fais jamais** : baisser le prix ; insister plus de deux fois sur la même objection ; inventer une rareté ("plus qu'une place") si c'est faux — mais dire "je prends 3 artistes par trimestre parce que je bosse 3-4 h par jour dessus" est vrai et légitime.

---

## 12. Étape 7 — Paiement, renforcement, onboarding

**Paiement sur l'appel**
> "Super. Je t'envoie le lien tout de suite, tu fais le [premier] paiement pendant qu'on est ensemble, et on cale ta session 1 dans la foulée."

**Renforcement**
> "Tu viens de prendre une décision que 95 % des artistes ne prennent jamais : arrêter de sortir des sons dans le vide et sortir un vrai projet. Tu m'as dit que ça faisait [durée] que tu tournais — c'est fini. Voilà la suite : d'ici demain je t'envoie le questionnaire de direction artistique, [jour] on fait la session 1, et ta seule mission d'ici là c'est de m'envoyer tes 3 références de sons qui te font quelque chose. Des questions ?"

**Sous 24 h** : un vocal personnel qui refait exactement ça.

**Le quick win (semaine 1-2)** : la direction artistique validée + la première idée de prod complète en écoute. L'artiste doit avoir, en 10 jours, une sensation de "c'est le meilleur son que j'ai jamais eu". C'est ce qui produit ton premier témoignage vidéo — que tu demandes dès ce moment-là, pas à la fin.

---

## 13. Suivi des non

> "Aucun souci, merci d'être franc. Je te laisse [conseil concret], et ma porte reste ouverte. Je te fais signe dans un mois pour voir où t'en es."

Toutes les 4-6 semaines : un message avec de la valeur (un retour sur son dernier son, un contenu qui parle de son problème, un résultat client). Jamais "t'as réfléchi ?". Tableau : prénom, source, son problème (ses mots), objection principale, dernier contact, prochain contact.

---

## 14. Erreurs qui tuent cette vente en particulier

1. **Vendre "des beats"** au lieu de vendre un projet sorti avec un chiffre. Dès que le mot "beat" est au centre, tu es comparé à BeatStars.
2. **Ne pas écouter ses sons avant l'appel.** Tu perds la croyance n°3 en 30 secondes.
3. **Complimenter au lieu de diagnostiquer.** Un artiste veut un producteur qui a un avis.
4. **Promettre des streams.** Tu te grilles et tu t'exposes.
5. **Fixer un objectif chiffré trop haut** pour impressionner. Un objectif tenu = témoignage ; un objectif raté = réputation.
6. **Prendre des beatmakers** parce qu'ils sont là et qu'ils ont demandé. Ton offre est pour les artistes ; les beatmakers sont ton canal d'apport.
7. **Accepter "je vais réfléchir"** sans creuser.
8. **Parler après le prix.**
9. **Proposer 3 × 700 avant qu'on te le demande.**
10. **Finir un appel sans créneau daté.**
11. **Envoyer le lien de paiement "pour plus tard".**
12. **Prendre un mineur sans le parent sur l'appel.**

---

## 15. Fiche mémo

**Offre** — 12 semaines. 3 prods sur mesure jusqu'à validation + accompagnement enregistrement + stratégie de sortie exécutée ensemble + 1 session/semaine + accès direct 24 h. Objectif chiffré fixé en phase 1. 2 100 €, 3 × 700 ou 2 × 1 050. Pas pour : jamais enregistré / < 3 h par semaine / veut qu'on fasse tout.

**Contenu** — Diagnostic, before/after de prod, construction en live, cas client, contre-pied industrie. CTA : "Écris-moi PROJET".

**DM** — "Envoie ton meilleur son" → retour en 3 points → blocage → objectif + urgence → proposition d'appel → lien + sons + liens. "C'est combien ?" → séparer BeatStars/accompagnement → ordre de grandeur → appel. Beatmaker → Patreon + apport d'affaires. Relances : prénom / vocal / conseil / clôture.

**Appel 1 (25 min)** — Cadre → situation + chiffres → problème (ce qu'il a essayé, "pourquoi maintenant ?") → ton retour de producteur → labellisation → désir → coût de l'inaction (le chiffre déjà dépensé) → pré-objectif chiffré co-construit → créneau sous 72 h + décideur + ordre de grandeur.

**Entre-deux** — Message avec ses mots le jour même. Démo de 30 s à J+1. Document d'une page.

**Appel 2 (45 min)** — Recadrage → pont ("tu veux que je te montre ?") → présentation : la sortie d'abord, 3 phases reliées à ses mots, ce que tu ne fais pas, preuve → 2 100 €, silence → objections en 4 temps → "on le sort ce projet ?" → paiement sur l'appel → renforcement → quick win sous 10 jours → demander le témoignage dès le quick win.

**Jamais** — Remise. Garantie de streams. Fausse rareté. "Je t'envoie un récap". Parler après le prix. Vendre après le oui.

---

## 16. Sources

Alex Hormozi — *$100M Offers*, framework CLOSER, "the 5 closes" (YouTube). Jeremy Miner — *The New Model of Selling* (NEPQ). Chris Voss — *Ne coupez jamais la poire en deux*. Neil Rackham — *SPIN Selling*. Dan Lok — *High Ticket Closer*, *Unlock It*. Cole Gordon — Closers.io, analyses d'appels (YouTube). High Ticket Sales Academy — discovery call en 5 phases. SetSmart — playbooks DM-to-call, scripts de relance. HighTicketHQ, Coachingsales.com, Nimitai — traitement des objections. Fourchettes de prix marché (beats exclusifs, mix/master, conseil marketing musique) : ordres de grandeur usuels du marché francophone, à ajuster à tes propres tarifs et à ta connaissance du terrain.


---

# PARTIE 3 — Guide high ticket générique

## Vendre en High Ticket — Le guide complet, étape par étape

*Synthèse des méthodes d'Alex Hormozi (CLOSER, $100M Offers), Jeremy Miner (NEPQ), Dan Lok (High Ticket Closer), Cole Gordon (Closers.io), Chris Voss (Never Split the Difference), Neil Rackham (SPIN Selling), Jordan Belfort (Straight Line) et des playbooks 2025-2026 de setters/closers pour coachs et créateurs.*

---

## Table des matières

1. La philosophie — ce qu'est vraiment une vente high ticket
2. Le prérequis absolu — l'offre et l'équation de valeur
3. La machine complète — vue d'ensemble du parcours
4. Étape 1 — Attirer et déclencher la conversation
5. Étape 2 — Le setting en DM (qualifier et booker l'appel)
6. Étape 3 — L'appel n°1 : découverte / triage (script complet)
7. Étape 4 — Entre les deux appels
8. Étape 5 — L'appel n°2 : présentation et closing (script complet)
9. Étape 6 — Traiter les objections (toutes, avec réponses)
10. Étape 7 — Encaisser, renforcer, onboarder
11. Le suivi des "non" et des "pas maintenant"
12. Les erreurs qui tuent 80 % des ventes
13. Posture, mindset et entraînement
14. Fiche mémo — tout le processus en une page
15. Sources et lectures

---

## 1. La philosophie — ce qu'est vraiment une vente high ticket

### 1.1 Ce n'est pas de la persuasion, c'est du diagnostic

Toutes les écoles modernes convergent sur un point : vendre cher ne consiste pas à convaincre, mais à **aider quelqu'un à voir clairement une décision qu'il envisage déjà**. Jeremy Miner résume ça en une phrase : le vendeur efficace est un *chercheur de problèmes et un résolveur de problèmes, pas un pousseur de produit*. Hormozi a bâti son framework CLOSER sur l'entretien motivationnel : le vendeur pose des questions, le prospect raconte lui-même sa douleur et se convainc seul.

Le corollaire est contre-intuitif : **le prospect doit parler 70 % du temps**. Si tu parles plus que lui, tu es en train de perdre la vente.

### 1.2 Pourquoi la pression détruit les ventes chères

À 30 €, l'urgence artificielle et le FOMO déclenchent l'achat. À 2 500 €, ils font fuir. Un prospect qui se sent poussé sur une décision à quatre chiffres se ferme, dit "je vais réfléchir" pour échapper à la pression, et ne revient jamais. Le high ticket se vend en **ralentissant** : on construit de la certitude, pas de l'excitation. Quand quelqu'un se sent certain, il s'engage.

### 1.3 Les trois croyances à installer

Hormozi appelle ça le "three questions close". Une vente high ticket se conclut quand le prospect croit trois choses :

1. **Le produit fonctionne** (il a déjà produit le résultat chez d'autres).
2. **Il fonctionnera pour moi** (ma situation n'est pas l'exception).
3. **Je fais confiance à la personne en face** (elle m'a compris et elle est honnête).

Chaque étape du process sert à installer l'une de ces trois croyances. Si la vente ne se fait pas, l'une des trois manque — et le travail consiste à identifier laquelle.

### 1.4 Le vendeur comme médecin, pas comme marchand

Dan Lok et Miner utilisent tous les deux la même métaphore : le médecin. Un médecin ne "pitche" pas une opération. Il examine, pose des questions, diagnostique, et prescrit — ou refuse de prescrire si ce n'est pas indiqué. Il est calme, détaché du résultat, et c'est précisément ce détachement qui lui donne de l'autorité. Un prospect ressent immédiatement la différence entre quelqu'un qui *a besoin* de la vente et quelqu'un qui *évalue s'il peut aider*.

Conséquence pratique : **tu dois être prêt à disqualifier**. Dire ouvertement "ce n'est pas pour toi" à certaines personnes est ce qui rend crédible ton "c'est pour toi" aux autres.

### 1.5 Le coût de l'inaction

Le prospect ne compare pas ton prix à zéro. Il compare ton prix au coût de rester là où il est. Une bonne conversation de vente rend ce coût visible et concret : combien de temps déjà perdu, combien d'argent déjà dépensé en solutions qui n'ont pas marché, ce que ça coûte émotionnellement, et ce que ça coûtera dans un an si rien ne change. Hormozi appelle ça la "taxe de l'ignorance" : ne pas savoir coûte du temps et de l'argent tous les jours.

### 1.6 La vente se joue au premier tiers de l'appel, pas à la fin

Le closing n'est pas un moment ; c'est une conséquence. Si la découverte a été bien faite, la conclusion est un simple "on y va ?" à quelqu'un qui a déjà décidé. Si la découverte a été bâclée, aucune phrase magique ne sauvera la fin de l'appel. **Un problème de closing est presque toujours un problème de découverte.**

---

## 2. Le prérequis absolu — l'offre et l'équation de valeur

Aucun script ne vend une offre faible. Avant de parler technique de vente, vérifie que ton offre passe l'équation de valeur d'Hormozi :

**Valeur = (Résultat rêvé × Probabilité perçue de l'atteindre) ÷ (Délai × Effort et sacrifice)**

Pour vendre cher, tu maximises le haut et tu réduis le bas :

| Levier | Question à te poser | Exemple concret |
|---|---|---|
| Résultat rêvé | Est-ce que je vends un résultat ou un processus ? | "12 semaines de coaching" est un processus. "Ton premier titre sorti proprement avec une stratégie de lancement qui tourne" est un résultat. |
| Probabilité perçue | Ai-je des preuves ? (témoignages, cas, garantie, ton propre parcours) | Études de cas, avant/après, garantie conditionnelle. |
| Délai | Quand le prospect verra-t-il le premier signe que ça marche ? | Un "quick win" en semaine 1 ou 2 change tout. |
| Effort et sacrifice | Qu'est-ce que je fais *à sa place* ? Qu'est-ce que je rends plus simple ? | Templates, checklists, accès direct à toi, feedback sous 24 h. |

Trois questions de cohérence à vérifier :

- **Ton offre s'adresse-t-elle à UNE personne précise ?** Le high ticket ne se vend pas à "tout le monde". Il se vend à un avatar dont tu connais les mots, les frustrations et les objectifs mieux qu'il ne les connaît lui-même.
- **Le résultat promis vaut-il objectivement plus que le prix ?** À 2 500 €, le prospect doit percevoir 10 000 € ou plus de valeur (financière, temporelle ou émotionnelle).
- **Qui n'est PAS fait pour ton offre ?** Tu dois pouvoir le dire en une phrase. C'est ton outil de disqualification.

---

## 3. La machine complète — vue d'ensemble

Voici le parcours que suivent quasiment tous les vendeurs high ticket qui réussissent en 2026. Chaque étape a **un seul objectif** et ne doit pas essayer de faire le travail de l'étape suivante.

```
CONTENU  →  DM / MESSAGE  →  APPEL 1 (découverte)  →  APPEL 2 (closing)  →  ONBOARDING
 attirer     qualifier          diagnostiquer            présenter + conclure     renforcer
 + déclen-   + booker           + obtenir un              + traiter les            + livrer le
   cher        l'appel            engagement daté           objections               quick win
```

**Règle d'or : on ne closs jamais en DM.** Le DM a un seul job — booker un appel. Tenter de vendre 2 000 € par écrit tue la vente ; la confiance et les objections se traitent à la voix.

**Une ou deux étapes d'appel ?** Deux écoles :

- **Un seul appel (45-60 min)** : découverte + présentation + closing dans la même conversation. C'est le modèle CLOSER d'Hormozi. Efficace pour des leads très chauds venant d'un contenu qui a déjà fait le travail d'éducation.
- **Deux appels** : un appel court de découverte (20-30 min), puis un appel de closing (45 min). Modèle recommandé quand tu débutes, quand ton audience te connaît moins, ou quand tu vends à des personnes qui doivent "digérer". L'appel 1 diagnostique et crée l'engagement ; l'appel 2 présente une solution *sur mesure* construite à partir de ce que le prospect a dit.

Ce guide détaille le modèle à deux appels (le plus sûr pour démarrer), avec les indications pour fusionner en un seul appel quand tu seras à l'aise.

---

## 4. Étape 1 — Attirer et déclencher la conversation

### 4.1 Le contenu qui déclenche des DM (et pas juste des likes)

Sur TikTok, Instagram ou YouTube, le contenu qui alimente une offre high ticket n'est pas celui qui fait le plus de vues. C'est celui qui fait **s'identifier une personne précise à un problème précis**.

Trois formats qui convertissent :

1. **Le diagnostic** — "3 raisons pour lesquelles [avatar] n'obtient pas [résultat]". Le spectateur se reconnaît dans une des trois.
2. **Le cas concret** — "Comment [prénom/client] est passé de [situation A] à [situation B] en [délai]". Preuve + projection.
3. **Le contre-pied** — "Arrête de faire [ce que tout le monde conseille], voilà pourquoi". Autorité + polarisation.

Chaque contenu se termine par **un seul appel à l'action concret**, toujours le même mot-clé :
> "Commente [MOT] ou écris-moi [MOT] en DM et je t'envoie [ressource ou diagnostic]."

Le mot-clé fait deux choses : il crée une raison naturelle d'ouvrir la conversation, et il te dit exactement de quel contenu vient la personne.

### 4.2 Ce que tu offres en échange du DM

Le lead magnet doit être une **micro-version de ton diagnostic**, pas un PDF générique. Exemples :

- "Envoie-moi ton lien, je te dis en 3 points ce qui bloque."
- "Réponds à 4 questions et je te dis si tu es prêt pour [résultat]."
- "Je t'envoie la checklist des 7 points que je vérifie avant de lancer un projet."

L'objectif : que la première interaction ressemble déjà à ce que sera le coaching — utile, direct, personnalisé.

### 4.3 L'approche sortante (quand tu vas vers le prospect)

Si tu contactes quelqu'un en premier (il a commenté, liké, ou correspond parfaitement à ton avatar), la règle est **zéro pitch, une question**. Un message froid qui vend est ignoré ; un message qui montre que tu as regardé son travail obtient une réponse.

> "Hey [prénom], j'ai écouté [titre/projet précis]. Le [élément précis que tu as aimé] est vraiment bien. Question : c'est quoi ton objectif avec ce projet dans les 6 prochains mois ?"

Pas de lien, pas d'offre, pas de "je propose un accompagnement". Juste une question sincère qui ouvre.

---

## 5. Étape 2 — Le setting en DM (qualifier et booker l'appel)

### 5.1 La structure en 5 messages

Tous les bons scripts de DM suivent la même logique, une idée par message, une question à la fois :

1. **Accueil chaleureux** — la personne doit se sentir vue, pas traitée.
2. **Valeur immédiate** — donne quelque chose d'utile tout de suite.
3. **Une question de qualification** — situation, objectif, urgence ou fit.
4. **Recommandation** — en fonction de la réponse, tu proposes une suite précise.
5. **Booking** — un lien, une demande claire.

### 5.2 Script complet — lead entrant (a commenté ou écrit le mot-clé)

**Message 1 — Accueil + valeur**
> "Hey [prénom] ! Merci pour ton message. Voilà [la ressource promise / ton retour rapide]. Petite question avant que je te donne un avis plus précis : tu en es où aujourd'hui avec [ton sujet] ?"

**Message 2 — Creuser (après sa réponse)**
> "OK je vois. Et concrètement, c'est quoi qui te bloque le plus en ce moment — [option A], [option B] ou autre chose ?"

*(Proposer 2-3 options rend la réponse facile et te donne l'info dont tu as besoin.)*

**Message 3 — Objectif + urgence**
> "Compris. Si on se reparle dans 6 mois, ça ressemble à quoi la version 'ça a marché' pour toi ? Et est-ce que c'est quelque chose que tu veux régler maintenant ou plutôt un projet pour plus tard ?"

**Message 4 — Recommandation et proposition d'appel**
> "Franchement, vu ce que tu me décris, je pense que je peux t'aider — mais je préfère en être sûr avant de te dire quoi que ce soit. Le plus simple c'est qu'on prenne 20-25 min en visio : je te pose quelques questions, je te dis ce que je vois, et si ça a du sens je t'explique comment je travaille. Si ça n'a pas de sens je te le dis aussi. Ça te va ?"

**Message 5 — Booking**
> "Top. Voilà mon lien : [lien]. Prends le créneau qui t'arrange cette semaine. Et dis-moi juste quand c'est fait que je le bloque de mon côté."

### 5.3 Script — la question prix en DM ("C'est combien ?")

C'est le message à plus forte intention que tu recevras. Ne réponds jamais par un chiffre sec — le chiffre sans contexte est le meilleur moyen de perdre la personne.

> "Ça dépend de ce dont tu as besoin — je n'ai pas un truc unique pour tout le monde. Tu cherches plutôt quelque chose que tu suis en autonomie, ou un accompagnement où on bosse ensemble sur ton projet ?"

Puis, après sa réponse :
> "OK. Le 1:1 c'est un investissement de quelques milliers d'euros, donc je ne le propose pas à tout le monde. Le mieux c'est qu'on se prenne 20 min pour voir si c'est pertinent pour toi — parce que si ce n'est pas le bon moment, je préfère te le dire que de te vendre un truc. Tu veux qu'on cale ça ?"

Tu as donné un ordre de grandeur (pas de mauvaise surprise en appel), tu as filtré, et tu as gardé la vente pour la voix.

### 5.4 Les critères de qualification (à obtenir avant de booker)

Tu booke l'appel uniquement si tu as, même implicitement, ces quatre éléments :

| Critère | Ce que tu cherches | Signal rouge |
|---|---|---|
| **Problème** | Il a un problème précis que ton offre résout | "Je regarde juste", curiosité vague |
| **Désir** | Il veut vraiment un résultat, pas juste "s'améliorer" | Aucune projection, aucune ambition formulée |
| **Urgence** | Il veut agir maintenant, pas "un jour" | "Plus tard", "quand j'aurai le temps" |
| **Capacité** | Il a — ou peut trouver — les moyens et le temps | A demandé si c'est gratuit ; n'a aucune disponibilité |

Si un critère manque clairement, ne booke pas. Propose du contenu, reste en contact, et reviens dans un mois.

### 5.5 Relances quand ça s'arrête (le "ghost" en DM)

- **+4 heures** : juste son prénom suivi d'un point d'interrogation. "[Prénom] ?" — ça obtient plus de 40 % de réponses parce que c'est inattendu et humain.
- **+24 heures** : une note vocale de 10-15 secondes. "Hey, je voulais juste voir si t'avais vu mon message, aucun stress, je sais que les DM s'empilent. Dis-moi si c'est encore d'actualité pour toi."
- **+3 jours** : valeur ou friction en moins. "Peu importe ce que tu décides, voilà un truc que tu peux appliquer direct : [conseil concret]. Et si tu veux qu'on en parle, il me reste deux créneaux cette semaine."
- **+7 jours** : fermer proprement. "Je vais partir du principe que ce n'est pas le bon moment — aucun souci. Ma porte reste ouverte, écris-moi quand tu veux."

Jamais plus de quatre relances. Jamais de reproche. Toujours court.

### 5.6 Avant l'appel : réduire le no-show

Le taux de présence est le KPI le plus négligé. Trois actions qui le font grimper :

1. **Confirmation immédiate** avec ce qui va se passer : "Bloqué pour [jour/heure]. On va faire un point sur ta situation, je te dirai ce que je vois, et on regardera si travailler ensemble a du sens. Prends 25 min au calme, avec ton ordi."
2. **Un mini-questionnaire** (3-5 questions) à remplir avant l'appel : situation actuelle, objectif, ce qu'il a déjà essayé, ce qui l'a poussé à réserver. Ça filtre les touristes, ça te prépare, et ça engage la personne.
3. **Rappel la veille et 1 h avant**, personnalisé, pas automatique-robot.

---

## 6. Étape 3 — L'appel n°1 : découverte / triage

**Durée : 20-30 min. Objectif unique : diagnostiquer, faire dire au prospect son problème et son désir avec ses propres mots, et obtenir un engagement daté pour l'appel 2.** On ne présente pas l'offre. On ne parle pas prix (sauf si on te le demande — voir plus bas).

### 6.1 Structure

| Bloc | Durée | Objectif |
|---|---|---|
| A. Cadre | 2 min | Poser l'agenda, prendre le lead |
| B. Situation | 5 min | Où il en est, ce qu'il fait aujourd'hui |
| C. Problème | 6-8 min | Ce qui bloque, ce qu'il a déjà essayé, pourquoi ça n'a pas marché |
| D. Désir + écart | 5 min | Où il veut être, ce qui change s'il y arrive |
| E. Conséquences | 3 min | Ce que ça coûte de ne rien changer |
| F. Engagement | 3 min | Décision de fit, booking de l'appel 2 |

### 6.2 Script détaillé

**A. Cadre (2 min)**

Ne perds pas 5 minutes en small talk qui ne mène nulle part. Une phrase chaleureuse, puis l'agenda.

> "Hey [prénom], content qu'on se parle. Comment tu vas ? [30 secondes max]
>
> Voilà comment je propose qu'on utilise les 25 prochaines minutes : je vais te poser pas mal de questions sur où tu en es et où tu veux aller — ça va être toi qui parles surtout. À la fin, je te dis honnêtement ce que je vois. Si je pense pouvoir t'aider, je t'explique comment et on cale une suite ; si je pense que ce n'est pas le bon moment ou pas le bon truc, je te le dis aussi. Ça te va comme ça ?"

Ce que fait ce cadre : tu poses l'autorité, tu annonces qu'une décision sera prise, et tu obtiens un premier "oui".

**B. Situation (5 min)**

Questions ouvertes, larges, qui font raconter.

> "Raconte-moi un peu : qu'est-ce que tu fais aujourd'hui concrètement avec [ton sujet] ? Ça ressemble à quoi une semaine type ?"
>
> "Ça fait combien de temps que tu es là-dessus ?"
>
> "Qu'est-ce qui t'a poussé à réserver cet appel ? Pourquoi maintenant ?"

*La dernière question est la plus importante de tout l'appel.* Elle révèle le déclencheur émotionnel réel. Note la réponse mot pour mot.

**C. Problème (6-8 min)**

C'est ici que tu creuses. La technique : une question, puis un silence, puis "et quoi d'autre ?" ou "dis-m'en plus".

> "Qu'est-ce qui te frustre le plus dans ta situation actuelle ?"
>
> "Où est-ce que ça coince exactement ? À quel moment tu bloques ?"
>
> "Qu'est-ce que tu as déjà essayé pour régler ça ?" → "Et pourquoi à ton avis ça n'a pas marché ?"
>
> "Ça fait combien de temps que tu vis avec ce problème ?"
>
> "Et qu'est-ce que tu as fait ces 3 derniers mois pour le régler ?"

Cette dernière question est décisive : si la réponse est "rien", tu as un problème d'urgence à traiter. Si la réponse est "j'ai acheté deux formations, regardé 200 vidéos", tu as quelqu'un qui investit déjà et qui a besoin d'un accompagnement, pas d'une énième ressource.

**Technique de labellisation (Chris Voss / Hormozi)** : reformule le problème en une étiquette précise que le prospect valide.

> "Donc si je résume : tu [situation], tu as essayé [X et Y], et ce qui te bloque vraiment c'est [problème précis]. C'est ça ?"

Quand il dit "oui, exactement", tu viens d'obtenir la croyance n°3 (il se sent compris) et tu as le vocabulaire exact à réutiliser en appel 2.

**D. Désir + écart (5 min)**

> "OK. Maintenant imagine qu'on est dans 6 mois et que tout a marché comme tu voulais. Ça ressemble à quoi, concrètement ?"
>
> "Et si tu arrives là, qu'est-ce que ça change pour toi ? Dans ta vie, pas juste dans ton projet ?"
>
> "Pourquoi c'est important pour toi ?"

Pousse jusqu'à l'émotion. "Gagner 2 000 €/mois" n'est pas un désir ; "arrêter mon job alimentaire et faire ça à plein temps" en est un. "Sortir un EP" n'est pas un désir ; "que ma famille arrête de me demander quand je vais trouver un vrai travail" en est un.

**E. Conséquences (3 min)**

> "Et si rien ne change — si dans un an tu es exactement au même endroit — ça te fait quoi ?"
>
> "Qu'est-ce que ça t'a déjà coûté, en temps, en argent, en énergie, de ne pas avoir réglé ça ?"

Tu ne dramatises pas. Tu fais nommer le coût de l'inaction par le prospect lui-même.

**F. Engagement (3 min)**

Deux issues possibles.

*Si ce n'est pas un fit :*
> "Je vais être direct : je ne pense pas que ce que je fais soit le bon truc pour toi maintenant, parce que [raison honnête]. Ce que je te conseille c'est [conseil gratuit et sincère]. Et si dans [délai] tu es à [étape], reviens vers moi."

Ce refus honnête te construit une réputation et te ramène des gens plus tard.

*Si c'est un fit :*
> "Écoute, d'après tout ce que tu m'as dit, je pense que je peux clairement t'aider sur [problème avec ses mots]. Ce que je te propose : je prends ce que tu m'as raconté, je réfléchis à ce qui aurait le plus de sens pour toi précisément, et on se refait 45 minutes où je te présente un plan concret et comment on pourrait bosser ensemble. À la fin de cet appel, tu auras tout pour prendre une décision — oui ou non, pas de 'je vais réfléchir'. Ça te va ?
>
> Tu es dispo quand cette semaine ? [Proposer deux créneaux précis, sous 72 h max.]"

**Deux verrouillages avant de raccrocher :**

1. **Le décideur** : "Est-ce qu'il y a quelqu'un d'autre qui doit être impliqué dans ce genre de décision — un conjoint, un associé ? Si oui, ça vaut le coup qu'il ou elle soit sur l'appel." Tu évites l'objection "je dois en parler à…" avant qu'elle n'existe.
2. **L'ordre de grandeur** : "Pour que tu ne sois pas surpris : un accompagnement 1:1 comme le mien, c'est un investissement de quelques milliers d'euros. Je ne te dis pas ça pour te faire fuir, juste pour que tu viennes à l'appel en connaissance de cause. Ça reste dans le cadre pour toi ?" — Si oui, tu as pré-qualifié le budget. Si hésitation, tu la traites maintenant plutôt qu'en appel 2.

**Jamais** : "Je t'envoie des infos et on se rappelle la semaine prochaine." C'est la phrase qui tue le plus de ventes high ticket. Une fin d'appel sans créneau daté est une vente perdue.

### 6.3 Si on te demande le prix pendant l'appel 1

> "Je vais te le dire, mais pas tout de suite — pas pour faire du mystère, mais parce que ça dépend vraiment de ce dont tu as besoin, et je ne le sais pas encore. Ce que je peux te dire c'est que c'est de l'ordre de quelques milliers d'euros. Est-ce qu'on continue et je te donne le chiffre exact à la fin, quand je saurai quoi te proposer ?"

---

## 7. Étape 4 — Entre les deux appels

Le prospect ne doit pas refroidir. Trois actions :

1. **Le jour même**, un message court qui rejoue ses mots :
   > "Merci pour l'échange [prénom]. J'ai bien noté : [son problème avec ses mots], et l'objectif c'est [son désir avec ses mots]. On se voit [jour/heure], je te prépare quelque chose de précis."
2. **Une preuve sociale ciblée** 24-48 h avant l'appel 2 : un témoignage ou un cas client qui ressemble à sa situation. Pas dix — un seul, le plus proche.
3. **Ta préparation** : un plan en 3-4 étapes, formulé dans son vocabulaire, qui va de sa situation actuelle à son résultat désiré. Ce plan est la colonne vertébrale de l'appel 2.

---

## 8. Étape 5 — L'appel n°2 : présentation et closing

**Durée : 45 min. Objectif : présenter une solution sur mesure, obtenir une décision, encaisser.**

### 8.1 Structure

| Bloc | Durée | Objectif |
|---|---|---|
| A. Recadrage | 3 min | Rappeler la décision attendue, reconfirmer le diagnostic |
| B. Le pont | 2 min | Passer du diagnostic à la solution |
| C. La présentation | 10-12 min | Vendre le résultat, pas le programme |
| D. Le prix | 2 min | Annoncer, se taire |
| E. La décision | 15-20 min | Objections, closing |
| F. Le renforcement | 5 min | Paiement, prochaines étapes, rassurer |

### 8.2 Script détaillé

**A. Recadrage (3 min)**

> "Salut [prénom]. Avant qu'on commence, je te rappelle le cadre : je vais te présenter ce que je te propose, tu me poses toutes tes questions, et à la fin on prend une décision ensemble — oui ou non, les deux sont OK. Ce que je veux éviter c'est le 'je vais réfléchir' qui traîne trois semaines, parce que ça n'aide ni toi ni moi. Ça te va toujours ?
>
> Et juste pour vérifier que rien n'a bougé depuis l'autre jour : ton problème principal c'est [ses mots], et l'objectif c'est [ses mots]. C'est toujours ça ?"

Tu réactives le diagnostic, tu réobtiens l'engagement de décider, et tu détectes si quelque chose a changé.

**B. Le pont (2 min)**

> "OK. D'après tout ce que tu m'as dit, voilà ce que je vois. [Ton diagnostic en 3 phrases, précis et honnête, y compris ce qu'il fait bien.] Et je pense que ce qui te manque, ce n'est pas [ce qu'il croit — plus d'infos, plus de vidéos], c'est [ce qui manque vraiment — un cadre, un retour, une méthode]. Tu veux que je te montre comment je m'y prendrais avec toi ?"

Le "tu veux que je te montre" obtient une permission. Le prospect *demande* la présentation.

**C. La présentation (10-12 min) — "Vends les vacances, pas le vol"**

L'erreur classique : dérouler le programme semaine par semaine. Personne n'achète douze semaines de modules. On achète une destination.

La méthode : pour chaque phase, **le résultat d'abord, le mécanisme ensuite, brièvement**.

> "Ça se passe en trois phases.
>
> **Phase 1 — [nom orienté résultat, ex. 'Diagnostic & fondations'] (semaines 1-3).** À la fin, tu auras [résultat concret et daté]. Concrètement on va [2-3 actions clés]. C'est là que tu règles [son problème n°1 avec ses mots].
>
> **Phase 2 — [ex. 'Construction'] (semaines 4-9).** Là on [résultat]. C'est la partie qui fait que [son désir]. Et c'est exactement là où [ce qu'il a déjà essayé] n'a pas marché, parce que tu étais seul — cette fois tu as un retour sous 24 h sur chaque chose que tu produis.
>
> **Phase 3 — [ex. 'Mise sur le marché'] (semaines 10-12).** Tu sors avec [résultat final] et un plan pour les 6 mois suivants.
>
> Pendant tout le programme, tu as [accès direct / sessions hebdo / ressources]. Le but c'est que tu ne restes jamais bloqué plus de 24 h."

Trois principes :

- **Chaque bénéfice est relié à quelque chose qu'il a dit.** "Tu m'as dit que [X] — c'est exactement ce que la phase 2 règle."
- **Nomme ce que tu ne fais pas.** "Je ne vais pas faire le travail à ta place. Si tu cherches quelqu'un qui [X] pour toi, ce n'est pas ça." La limite honnête crédibilise la promesse.
- **Vérifie régulièrement.** "Ça te parle ?" "Tu vois où je veux en venir ?" Chaque petit oui prépare le grand.

Termine par la preuve :
> "[Prénom d'un client] était exactement là où tu es — [situation]. En [délai], [résultat]. Je ne te promets pas la même chose, parce que ça dépend de toi. Mais le chemin est le même."

**D. Le prix (2 min)**

Récapitule la valeur, annonce le prix calmement, et **tais-toi**.

> "Donc, pour résumer : 12 semaines, [les éléments], avec pour objectif [son résultat, ses mots]. L'investissement pour ça, c'est 2 500 €."

Puis silence. Le premier qui parle après l'annonce du prix a perdu le cadre. Ce silence peut durer 5, 8, 10 secondes. Il est inconfortable. Tiens-le. Le prospect va soit dire "OK", soit poser une question, soit sortir une objection — et les trois sont des bonnes nouvelles.

Détails qui comptent :
- Le prix est **un chiffre, sans "seulement", sans "que", sans justification** dans la même phrase.
- Le ton est le même que pour dire l'heure qu'il est. Si ta voix monte, tremble ou s'accélère, le prospect entend "je ne suis pas sûr que ça les vaille".
- **Ne propose pas de facilité de paiement avant qu'on te le demande.** Si tu l'annonces d'emblée, tu signales que tu doutes du prix.

**E. La décision (15-20 min)**

Si le prospect dit oui : passe directement en F. Ne rajoute rien. Beaucoup de ventes sont perdues *après* le oui parce que le vendeur continue à parler.

Si le prospect pose une question ou émet une objection : voir section 9.

Si le prospect est silencieux ou flou, utilise une question de clôture douce :

> "Sur une échelle de 1 à 10, tu te sens à combien à l'idée de te lancer ?"
> → S'il dit 7 : "Qu'est-ce qui manque pour aller à 10 ?" — l'objection réelle sort.

Ou la clôture par le passé (Hormozi) :
> "Tu m'as dit que ça faisait [durée] que tu es sur ce problème, et que tu as déjà essayé [X, Y]. Qu'est-ce qui te fait penser que la prochaine année sera différente si tu refais pareil ?"

Ou la clôture de la chaise à bascule :
> "Imagine-toi dans un an. Version A : tu as fait ce programme, tu es à [son résultat]. Version B : tu n'as rien changé, tu es toujours là. Laquelle tu préfères regarder ?"

**Le closing final** — une question fermée, simple, sans emphase :
> "Alors, on y va ?"
> ou
> "Tu veux qu'on commence ?"

**F. Le renforcement (5 min)** — voir section 10.

### 8.3 Fusionner en un seul appel

Quand tu es à l'aise, tu enchaînes : blocs A-E de l'appel 1 (25 min), puis pont, présentation, prix et décision (25-30 min). Total 50-55 min. La seule différence : le "verrouillage" de fin d'appel 1 devient le pont de l'appel 2.

---

## 9. Étape 6 — Traiter les objections

### 9.1 La philosophie

Une objection n'est pas un non. C'est une **préoccupation non résolue**, autrement dit une des trois croyances (le produit marche / ça marchera pour moi / je te fais confiance) qui vacille. Ton job n'est pas de "vaincre" l'objection, c'est de trouver laquelle des trois flanche et de la réparer.

Le cadre universel en 4 temps (Clarify → Isolate → Reframe → Confirm) :

1. **Clarifier** — "Quand tu dis [objection], c'est quoi exactement qui te fait hésiter ?"
2. **Isoler** — "À part ça, est-ce qu'il y a autre chose qui t'empêcherait de te lancer ?" (Si oui, la vraie objection vient de sortir. Si non, tu sais que résoudre celle-ci suffit.)
3. **Recadrer** — reconnecter à ce qu'il a dit en découverte.
4. **Confirmer** — "Est-ce que ça répond à ta question ? … Alors on y va ?"

Toujours : pause de 3 secondes avant de répondre. Jamais de réponse réflexe.

### 9.2 Les 8 objections et leurs réponses

**1. "Je dois y réfléchir."**

C'est un écran de fumée à 90 %. Ne l'accepte jamais tel quel.

> "Bien sûr, c'est une décision importante. En général, quand quelqu'un me dit ça, c'est soit qu'il n'est pas sûr que ça va marcher pour lui, soit que c'est une question d'argent, soit qu'il y a quelqu'un d'autre à consulter. C'est lequel pour toi ?"

Selon la réponse, tu traites l'objection réelle (voir ci-dessous). Si la personne insiste sur "non vraiment, j'ai juste besoin de temps" :

> "OK, je respecte ça. Concrètement, tu vas réfléchir à quoi ? Qu'est-ce qui va être différent dans trois jours par rapport à maintenant ?"

Si la réponse est vague, tu es probablement face à un "non" poli. Nomme-le :
> "Je préfère te le demander direct : est-ce que 'je vais réfléchir' c'est une façon polie de dire non ? Parce qu'un non ça ne me pose aucun problème, et je préfère ça qu'un maybe qui traîne."

**2. "C'est trop cher." / "Je n'ai pas l'argent."**

D'abord distinguer valeur et budget :
> "Je comprends. Quand tu dis trop cher — c'est par rapport à quoi ? Trop cher pour ce que ça apporte, ou trop cher par rapport à ce que tu peux mettre aujourd'hui ?"

**Si c'est la valeur** (il ne voit pas 2 500 € de résultat) : tu as un problème de découverte ou de présentation. Retour au désir et au coût de l'inaction :
> "Tu m'as dit que ton objectif c'était [ses mots]. Si tu y arrives, ça vaut quoi pour toi ? … Et tu m'as dit que ça fait [durée] que tu tournes en rond, que tu as déjà mis [argent/temps] dans [tentatives]. Qu'est-ce qui coûte le plus cher au final : régler ça maintenant, ou une année de plus au même endroit ?"

**Si c'est le budget** (il veut, il ne peut pas) : test de la vraie contrainte.
> "Si l'argent n'était pas un sujet, tu te lancerais maintenant ?" → Si oui : "OK, donc la question c'est comment on rend ça possible, pas si on le fait. Tu peux mettre combien au démarrage ?" → Proposer un échelonnement (ex. 3 × 900 €), jamais une remise.

**La règle sur les remises** : une remise dit "mon prix était faux". Un échelonnement dit "je m'adapte à ta trésorerie". Le premier détruit ta crédibilité, le second la préserve.

**3. "Je dois en parler à mon conjoint / mon associé."**

Tu aurais dû le désamorcer en appel 1. Si ça sort quand même :

> "Bien sûr, ça se comprend totalement. Toi, personnellement, tu en penses quoi ? Tu veux te lancer ?"
> → Si oui : "OK. Et d'après toi, ce sera quoi sa principale inquiétude quand tu vas lui en parler ?" — tu armes le prospect pour qu'il défende lui-même la décision.
> → Puis : "Ce que je te propose : soit on fait un appel de 15 min à trois pour que je réponde directement à ses questions, soit tu lui en parles ce soir et on se recale demain à [heure] pour finaliser. Tu préfères quoi ?"

**4. "Je n'ai pas le temps."**

> "Je comprends. C'est justement pour ça que le programme est cadré : [X heures par semaine]. Mais laisse-moi te poser une question : tu m'as dit que tu passais déjà [durée] par semaine à [ce qu'il fait aujourd'hui sans résultat]. Le problème ce n'est pas le temps que tu as, c'est que le temps que tu passes ne produit rien. Là, on parle de rediriger ces heures, pas d'en ajouter."

**5. "Je vais essayer de le faire seul d'abord."**

> "Tu peux, et je le pense sincèrement. Mais je te retourne ta propre phrase : tu m'as dit que tu essayais seul depuis [durée]. Qu'est-ce qui sera différent cette fois ?"
> Puis : "Ce que tu achètes ici, ce n'est pas de l'info — l'info tu l'as. C'est un cadre, un retour, et quelqu'un qui te dit quand tu te trompes avant que ça te coûte six mois."

**6. "Envoie-moi des infos / un PDF, je regarde."**

C'est presque toujours une sortie polie. Ne l'accepte pas sans creuser :
> "Je peux, mais honnêtement un PDF ne va rien t'apprendre de plus que ce qu'on vient de se dire. Qu'est-ce qui te manque, concrètement, pour prendre ta décision ? Dis-moi et je te réponds maintenant."

**7. "J'ai déjà acheté des formations qui n'ont pas marché."**

C'est la croyance n°2 qui flanche ("ça ne marchera pas pour moi"). Ne te défends pas, valide et différencie :
> "Je comprends, et c'est normal d'être méfiant. Ces formations, c'était quoi exactement ? … Et pourquoi ça n'a pas marché d'après toi ? … [En général : pas de suivi, pas de retour, tout seul.] C'est exactement pour ça que je ne fais pas de formation en autonomie. Ce que je fais, c'est [différence concrète]. Et si ça te rassure : [garantie / condition]."

**8. "Je ne suis pas sûr que ce soit le bon moment."**

> "Il n'y a jamais de bon moment, ça je peux te le garantir. La vraie question c'est : qu'est-ce qui doit se passer pour que ce soit le bon moment ? … Et ça, ça arrivera quand ?"
> Si la réponse est concrète et crédible (un projet qui se termine dans 6 semaines), respecte-la et fixe une date de rappel précise. Si elle est vague, c'est une objection déguisée — retour au cadre en 4 temps.

### 9.3 Ce qu'on ne fait jamais

- Baisser le prix.
- Supplier, insister plus de deux fois sur la même objection.
- Créer une fausse urgence ("il ne reste qu'une place" si c'est faux). La vraie rareté (ton temps est limité, tu prends X clients par mois) est légitime ; la fausse te grille définitivement.
- Répondre à une objection par un monologue de 3 minutes. Une réponse tient en 3-4 phrases, puis une question.

---

## 10. Étape 7 — Encaisser, renforcer, onboarder

### 10.1 Le paiement se fait sur l'appel

Quand le prospect dit oui, tu enchaînes sans transition, sur le même ton calme :

> "Super. Je t'envoie le lien de paiement tout de suite, tu le fais pendant qu'on est ensemble comme ça on cale directement ta première session."

Un lien envoyé "pour plus tard" est un "oui" qui a 50 % de chances de mourir dans la nuit. Le paiement pendant l'appel n'est pas une pression, c'est une clôture propre.

### 10.2 Le renforcement (les 5 dernières minutes)

Le regret d'achat commence dans les 24 h. Tu le neutralises avant qu'il n'apparaisse.

> "Je veux te dire un truc : tu viens de prendre une décision que la plupart des gens ne prennent jamais. Tu m'as dit que ça faisait [durée] que tu attendais — c'est fini. Voilà ce qui se passe maintenant : [étape 1, sous 24 h], [étape 2, cette semaine], [première session, date]. Ta seule mission d'ici là : [micro-action simple]. Des questions ?"

Puis, sous 24 h, un message personnel (voix ou texte) qui refait exactement ça : féliciter, rappeler pourquoi il a dit oui avec ses propres mots, donner la première action.

### 10.3 Le quick win

Le programme doit produire un résultat visible dans les 7 à 10 premiers jours. Ce n'est pas seulement de la pédagogie : c'est ce qui transforme un client en témoignage, et un témoignage en prochain client. Planifie-le explicitement dans ta phase 1.

---

## 11. Le suivi des "non" et des "pas maintenant"

Un "non" aujourd'hui est un "oui" possible dans trois mois — à condition que la porte reste ouverte et que tu ne sois pas devenu un vendeur insistant dans sa mémoire.

**Le jour du non** :
> "Aucun problème, et merci pour ta franchise. Je te laisse [ressource utile], et ma porte reste ouverte. Je te fais un signe dans [délai] pour voir où tu en es, si ça te va."

**Le suivi** : tous les 4 à 6 semaines, un message qui apporte quelque chose (un contenu qui parle de son problème, un résultat d'un client dans sa situation, une question sincère sur son avancée). Jamais "tu as réfléchi ?". Toujours de la valeur ou de l'intérêt réel.

**Tenir un tableau** : prénom, source, problème (ses mots), objection principale, date du dernier contact, date du prochain. Les vendeurs qui relancent proprement récupèrent 15 à 25 % de leurs "non" initiaux.

---

## 12. Les erreurs qui tuent 80 % des ventes

1. **Pitcher en DM.** Le DM booke, l'appel vend.
2. **Sauter la découverte** pour arriver vite à la présentation. Tout ce qui suit s'effondre.
3. **Parler plus que le prospect.** Si tu dépasses 40 % du temps de parole, tu perds.
4. **Ne pas poser "pourquoi maintenant ?"** — tu rates le déclencheur émotionnel.
5. **Accepter "je vais réfléchir"** sans creuser.
6. **Annoncer le prix puis parler.** Le silence après le prix est non négociable.
7. **Proposer un paiement échelonné ou une remise avant qu'on te le demande.**
8. **Finir un appel sans prochaine étape datée.** "On se rappelle" = vente morte.
9. **Envoyer le lien de paiement pour "plus tard".**
10. **Continuer à vendre après le oui.**
11. **Ne pas oser disqualifier.** Si tu prends tout le monde, personne ne te croit.
12. **Utiliser de la fausse urgence.** À 2 500 €, ça détruit la confiance en une phrase.

---

## 13. Posture, mindset et entraînement

### 13.1 La posture

- **Détachement du résultat.** Tu ne vends pas pour payer ton loyer sur cet appel. Tu évalues si tu peux aider. Cette posture s'entend dans la voix.
- **Certitude.** Tu crois que ton offre vaut plus que son prix. Si tu ne le crois pas, ne vends pas — améliore l'offre d'abord.
- **Lenteur.** Parle 20 % plus lentement que ta vitesse naturelle. Laisse des silences. La lenteur signale la confiance.
- **Curiosité sincère.** Le prospect sent la différence entre une question posée pour manipuler et une question posée pour comprendre.

### 13.2 L'entraînement

La vente est une compétence, pas un talent. Hormozi la traite comme un sport avec une grille de 31 comportements mesurables. Sans aller jusque-là :

- **Enregistre chaque appel** (avec accord) et réécoute-le en notant : temps de parole, questions posées, moment où tu as perdu le cadre.
- **Fais des jeux de rôle** avec quelqu'un qui joue un prospect difficile. Dix objections à la suite, sans préparation.
- **Tiens tes chiffres** : DM → appels bookés → appels tenus → offres présentées → ventes. Chaque ratio te dit où travailler. Repères raisonnables : 60-80 % de présence aux appels, 25-40 % de closing sur des leads qualifiés.
- **Après chaque non**, écris en une phrase quelle croyance manquait (produit / moi / toi). Après dix non, tu verras un pattern.

### 13.3 Éthique

Tout ce guide repose sur un présupposé : ton offre tient ses promesses. Ces techniques marchent aussi pour vendre des choses vides — c'est ce qui donne mauvaise réputation au "high ticket". La ligne est simple : si tu ne serais pas à l'aise que le prospect entende ton raisonnement interne pendant l'appel, ne le fais pas. Disqualifie quand il faut. Rembourse quand tu as tort. Le high ticket vit de la réputation ; une seule vente forcée coûte plus que dix ventes honnêtes ne rapportent.

---

## 14. Fiche mémo — tout le processus en une page

**Avant** — Offre validée par l'équation de valeur. Un avatar. Une phrase "ce n'est pas pour toi si…".

**Contenu** — Diagnostic / cas client / contre-pied. Un seul CTA, un mot-clé.

**DM** — Accueil → valeur → une question → recommandation → lien. Zéro pitch, zéro chiffre sec. Booker seulement si problème + désir + urgence + capacité. Relances : prénom (+4 h), vocal (+24 h), valeur (+3 j), clôture (+7 j).

**Appel 1 (25 min)** — Cadre → situation → problème (ce qu'il a essayé, pourquoi ça n'a pas marché, "pourquoi maintenant ?") → désir + écart → coût de l'inaction → fit → créneau daté sous 72 h + décideur + ordre de grandeur du prix.

**Entre-deux** — Message le jour même avec ses mots. Une preuve sociale ciblée. Un plan en 3 phases dans son vocabulaire.

**Appel 2 (45 min)** — Recadrage (décision attendue, diagnostic reconfirmé) → pont ("tu veux que je te montre ?") → présentation résultat-d'abord, chaque bénéfice relié à ses mots → prix, silence → objections en 4 temps (clarifier, isoler, recadrer, confirmer) → "on y va ?" → paiement sur l'appel → renforcement.

**Après** — Message sous 24 h. Quick win sous 10 jours. Suivi des non toutes les 4-6 semaines avec de la valeur.

**Jamais** — Remise. Fausse urgence. "Je t'envoie des infos". Parler après le prix. Vendre après le oui.

---

## 15. Sources et lectures

**Livres fondateurs**
- Alex Hormozi — *$100M Offers* (l'équation de valeur, la construction d'offre) et *$100M Leads* (acquisition). Ses vidéos YouTube sur le framework CLOSER et "the 5 closes" sont gratuites et suffisent pour la partie appel.
- Jeremy Miner — *The New Model of Selling* (NEPQ : questions de connexion, situation, prise de conscience du problème, solution, conséquence, engagement).
- Chris Voss — *Ne coupez jamais la poire en deux* (labellisation, questions calibrées, silence, "non" comme point de départ).
- Neil Rackham — *SPIN Selling* (Situation, Problème, Implication, Need-payoff — la base scientifique de la découverte, issue de 35 000 appels analysés).
- Dan Lok — *High Ticket Closer* (programme) et *Unlock It* (livre) — la posture du "médecin", le détachement.
- Jordan Belfort — *Way of the Wolf* (la tonalité, les trois dix : produit / vendeur / entreprise).
- Oren Klaff — *Pitch Anything* (contrôle du cadre).
- Robert Cialdini — *Influence* (les principes de persuasion, à connaître pour les utiliser éthiquement).

**Créateurs et playbooks consultés**
- Cole Gordon (Closers.io / Remote Closing Academy) — structure setter/closer, YouTube.
- High Ticket Sales Academy — discovery call framework en 5 phases.
- SetSmart — playbooks DM-to-call pour coachs (scripts de DM, relances, question prix).
- Coachingsales.com, HighTicketHQ — traitement des objections high ticket.
- Nimitai — cadre en 7 étapes pour l'objection prix.

**À regarder sur YouTube (recherche par titre)**
- Alex Hormozi : "The CLOSER framework", "How to close high ticket sales (the 5 closes)", "How I got good at sales".
- Jeremy Miner : "NEPQ explained", ses vidéos de jeux de rôle sur les objections.
- Cole Gordon : "Full sales call breakdown", ses analyses d'appels réels.
- Chris Voss : "Tactical empathy", "Mirroring and labeling".

