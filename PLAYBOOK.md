# PLAYBOOK — Vente de l'accompagnement artiste (2 100 €)

> **Méthode de référence : `docs/methodologie-vente.md`, PARTIE 2** (« Vendre
> l'accompagnement artiste à 2 100 € — Le guide adapté »). Ce playbook n'en est
> qu'un condensé opérationnel : en cas de doute, c'est le guide qui fait foi, et
> les scripts s'y reprennent mot pour mot (ils sont aussi dans l'app, bouton
> 📖 Guide et panneau 💬 Scripts de chaque fiche, tous deux alimentés par
> `src/data/methodologie.json`, extrait du guide).
>
> Document vivant : chaque vraie conversation (réussie ou ratée) enrichit le
> journal (§7), et les leçons remontent dans le guide — jamais l'inverse.

---

## 1. Le parcours — 11 étapes, un seul objectif chacune

```
TIKTOK (contenu artiste)  →  DM (mot-clé)  →  ÉCOUTE DE SES SONS  →  APPEL 1 (25 min)
                                                                          diagnostic + résultat chiffré
        →  MAQUETTE / DIRECTION (entre les appels)  →  APPEL 2 (45 min)  →  PAIEMENT + ONBOARDING
                                                        présentation + closing
```

| # | Étape (app) | Ce que c'est | Objectif unique | Condition de passage |
|---|---|---|---|---|
| 1 | `nouveau` | Contact identifié (commentaire, DM, approche sortante) | Envoyer le premier message — approche sortante (§6.4) ou réponse au mot-clé PROJET (§7.1) | DM envoyé → `dm_en_cours` |
| 2 | `dm_en_cours` | Conversation DM ouverte, pas encore qualifié | Obtenir son meilleur son, faire le retour en 3 points, faire dire le blocage et l'objectif | 4 critères validés → `qualifie` ; ghost après 4 relances → `pas_maintenant` |
| 3 | `qualifie` | Problème, désir, urgence, capacité validés | Booker l'appel 1 (lien + 2-3 sons + liens Spotify/TikTok) | Créneau posé → `appel1_booke` |
| 4 | `appel1_booke` | Créneau appel 1 posé | Tout écouter avant l'appel, rappel J-1 et H-1, tenir l'appel | Appel tenu → `appel1_fait` ; non-fit → `disqualifie` |
| 5 | `appel1_fait` | Diagnostic fait, pré-objectif chiffré co-construit | Message avec ses mots le jour même, démo 30 s à J+1/J+2, appel 2 booké sous 72 h | Créneau posé → `appel2_booke` |
| 6 | `appel2_booke` | Document d'une page prêt | Présenter le plan (la sortie d'abord), annoncer 2 100 €, silence, obtenir une décision | Appel tenu → `appel2_fait` |
| 7 | `appel2_fait` | Plan présenté | Obtenir la décision — oui ou non, pas de « je vais réfléchir » qui traîne | Paiement → `client` ; refus → `non` ; raison concrète datée → `pas_maintenant` |
| 8 | `client` | Paiement fait sur l'appel | Renforcement (vocal sous 24 h), quick win sous 10 jours, témoignage demandé dès le quick win | — |
| 9 | `non` | Non franc | Conseil concret, porte ouverte, relance valeur toutes les 4-6 semaines | Réponse → retour en `dm_en_cours` |
| 10 | `pas_maintenant` | Pas le bon moment (raison concrète) | Date de rappel précise, relance valeur toutes les 4-6 semaines | Réponse → retour en `dm_en_cours` |
| 11 | `disqualifie` | Pas au bon stade (jamais enregistré, beatmaker, mineur sans parent, zéro budget) | 2 conseils gratuits et la porte ouverte — il reviendra dans six mois | Seule étape sans prochaine action datée |

Règles :
- **Une fiche ne peut jamais rester sans prochaine action datée** (sauf `disqualifie`). L'app refuse la sauvegarde sinon.
- **Une étape = un seul objectif.** Ne jamais faire le travail de l'étape suivante : pas de pitch en DM, pas d'offre en appel 1, pas de prix avant la présentation.
- Les beatmakers qui écrivent ne sont pas des prospects : Patreon + apport d'affaires (§7.3), puis `disqualifie`.
- Mineur : pas de vente sans le parent sur l'appel. Point.

## 2. Données terrain (source de vérité, à enrichir)

### Constat actuel (août 2026)
- La plupart des DM restent **sans réponse**.
- Meilleur cas fréquent : réponse « envoie tes sons à cet email » → trou noir.
- 1 vente significative réalisée (ci-dessous).

### Analyse : la vente à 1 250 $ (artiste sud-africaine)
**Ce qui a marché :**
- **Package** de 3 instrus originales (pas des beats au détail) ;
- Promesse d'**accompagnement sur l'élaboration du projet** — c'est ça qui a
  justifié le prix, pas les instrus seules ;
- **Paiement upfront** — réflexe en or, à garder systématiquement (total ou 50 %).

**Ce qui a manqué :**
- Le projet a été abandonné après paiement → l'accompagnement n'a jamais été
  activé, la relation s'est éteinte. Une cliente à 1 250 $ est devenue une
  transaction unique au lieu d'une relation long terme.

**Leçons :**
1. Le package + accompagnement est **ton format gagnant prouvé**. Le reproduire.
2. Après le paiement, la vente continue : onboarding, jalons datés (session 1,
   choix des prods, suivi), sinon le projet meurt et le réachat avec.
3. Un projet abandonné chez la cliente = une occasion de relance légitime plus
   tard (« où en es-tu de ce projet ? ») — pas un dossier clos.

### Conversations analysées
*(vide pour l'instant — coller ici les échanges réels, voir template §7)*

## 3. Fiche mémo (guide §15, reprise telle quelle)

**Offre** — 12 semaines. 3 prods sur mesure jusqu'à validation + accompagnement enregistrement + stratégie de sortie exécutée ensemble + 1 session/semaine + accès direct 24 h. Objectif chiffré fixé en phase 1. 2 100 €, 3 × 700 ou 2 × 1 050. Pas pour : jamais enregistré / < 3 h par semaine / veut qu'on fasse tout.

**Contenu** — Diagnostic, before/after de prod, construction en live, cas client, contre-pied industrie. CTA : "Écris-moi PROJET".

**DM** — "Envoie ton meilleur son" → retour en 3 points → blocage → objectif + urgence → proposition d'appel → lien + sons + liens. "C'est combien ?" → séparer BeatStars/accompagnement → ordre de grandeur → appel. Beatmaker → Patreon + apport d'affaires. Relances : prénom / vocal / conseil / clôture.

**Appel 1 (25 min)** — Cadre → situation + chiffres → problème (ce qu'il a essayé, "pourquoi maintenant ?") → ton retour de producteur → labellisation → désir → coût de l'inaction (le chiffre déjà dépensé) → pré-objectif chiffré co-construit → créneau sous 72 h + décideur + ordre de grandeur.

**Entre-deux** — Message avec ses mots le jour même. Démo de 30 s à J+1. Document d'une page.

**Appel 2 (45 min)** — Recadrage → pont ("tu veux que je te montre ?") → présentation : la sortie d'abord, 3 phases reliées à ses mots, ce que tu ne fais pas, preuve → 2 100 €, silence → objections en 4 temps → "on le sort ce projet ?" → paiement sur l'appel → renforcement → quick win sous 10 jours → demander le témoignage dès le quick win.

**Jamais** — Remise. Garantie de streams. Fausse rareté. "Je t'envoie un récap". Parler après le prix. Vendre après le oui.

## 4. Cadences (générées automatiquement par l'app selon l'étape)

| Étape | Depuis | Actions proposées |
|---|---|---|
| `nouveau` | — | « Envoyer le DM » aujourd'hui |
| `dm_en_cours` (ghost) | le dernier DM / la dernière relance | **+4 h** Relance 1 : « [Prénom] ? » · **+24 h** Relance 2 : vocal 10 s · **+3 j** Relance 3 : conseil concret + 2 créneaux · **+7 j** Relance 4 : clôture, porte ouverte. Maximum 4 relances, puis `pas_maintenant`. |
| `qualifie` | — | « Booker l'appel 1 (lien + 2-3 sons + liens) » aujourd'hui |
| `appel1_booke` / `appel2_booke` | la date de l'appel | Rappel J-1 · Rappel H-1 · Tenir l'appel (tout écouter avant, non négociable) |
| `appel1_fait` | l'appel 1 | Message récap avec ses mots (jour même) · Envoyer la démo 30 s (J+1/J+2) · Booker l'appel 2 (sous 72 h) |
| `appel2_fait` | l'appel 2 | Obtenir la décision (J+1) |
| `client` | le paiement | Message/vocal sous 24 h · Quick win (J+10) · Demander le témoignage (J+10) |
| `non` / `pas_maintenant` | le dernier contact | Relance valeur à +5 semaines (fourchette du guide : toutes les 4-6 semaines) — un retour sur son dernier son, un contenu qui parle de son problème, un résultat client. **Jamais « t'as réfléchi ? »**. |
| `disqualifie` | — | Aucune |

Textes exacts des relances DM (guide §7.4) :
- **+4 h** : "[Prénom] ?"
- **+24 h** : vocal de 10 s. "Hey, j'ai vu que t'avais pas répondu, aucun stress. Je te dis juste que j'ai réécouté ton son et que [micro-remarque nouvelle]. Dis-moi si c'est toujours d'actualité."
- **+3 j** : "Peu importe ce que tu décides, un truc à faire direct sur ton prochain son : [conseil concret]. Et il me reste 2 créneaux cette semaine si tu veux qu'on en parle."
- **+7 j** : "Je pars du principe que c'est pas le moment, aucun souci. Ma porte reste ouverte."

Suivi des non (guide §13) :
> "Aucun souci, merci d'être franc. Je te laisse [conseil concret], et ma porte reste ouverte. Je te fais signe dans un mois pour voir où t'en es."

## 5. Ce qui a changé par rapport à l'ancienne méthode

| Avant (playbook v1, été 2026) | Maintenant (guide PARTIE 2) |
|---|---|
| **L'offre** : catalogue à 3 niveaux (Lease → Exclusif → « Package Projet »), prix à ancrer, scope réductible | **Une seule offre à 2 100 €** : 12 semaines, 3 prods sur mesure + stratégie de sortie + résultat chiffré fixé en phase 1. Jamais de remise ; échelonnement 3 × 700 € ou 2 × 1 050 € seulement si on le demande. On vend un projet sorti avec un chiffre au bout, pas des beats. |
| **Le DM** : accroche sur son actu, générateur 💬 « directe / simple / douce », transformer « envoie tes sons à cet email » en appel | **Jamais de pitch en DM.** Lead entrant PROJET : « envoie ton meilleur son » → retour honnête en 3 points → blocage → objectif + urgence → proposition d'appel. Approche sortante = compliment précis + retour honnête + question, zéro lien, zéro offre. Générateur 💬 : « sortante / simple / douce » (« directe » supprimé). |
| **Un appel** de courtoisie (SPIN, 15-20 min) puis un « RDV proposition » | **Deux appels** : appel 1 = diagnostic (25 min, il parle 70 %, retour de producteur, pré-objectif chiffré co-construit, décideur + ordre de grandeur annoncés) ; entre-deux = message avec ses mots + démo 30 s + document d'une page ; appel 2 = présentation (la sortie d'abord, 3 phases reliées à ses mots) → 2 100 € → silence → décision. |
| **7 objections** génériques (email, producteur existant, budget, gratuit, autoprod, trop cher, silence) | **10 objections artiste** avec réponses mot pour mot (réfléchir, prix-valeur, prix-budget, BeatStars, beatmaker existant, tiers, seul, déjà déçu, garantie streams, pas le moment) + cadre en 4 temps : pause 3 s → clarifier → isoler → recadrer avec ses mots → confirmer. |
| Relances DM à J+3 / J+7 / J+14 | Relances à **+4 h / +24 h / +3 j / +7 j**, 4 maximum, textes fixés (§4). |
| Statuts : à contacter → contacté → relancé → en discussion → appel fait → offre présentée → closing → client / sans réponse / refusé | **11 étapes** (§1). Toute fiche porte une prochaine action datée. Ancien statut conservé dans `legacyStatus`. |
| Objectif de la vente : « sortir le prochain chapitre de sa carrière » | Idem sur le fond, mais **chiffré et co-construit** : un objectif principal + un secondaire, atteignables à 70 %, boussole et non contrat. Jamais de garantie de streams. |

## 6. Erreurs qui tuent cette vente en particulier (guide §14)

1. Vendre "des beats" au lieu de vendre un projet sorti avec un chiffre. Dès que le mot "beat" est au centre, tu es comparé à BeatStars.
2. Ne pas écouter ses sons avant l'appel. Tu perds la croyance n°3 en 30 secondes.
3. Complimenter au lieu de diagnostiquer. Un artiste veut un producteur qui a un avis.
4. Promettre des streams. Tu te grilles et tu t'exposes.
5. Fixer un objectif chiffré trop haut pour impressionner. Un objectif tenu = témoignage ; un objectif raté = réputation.
6. Prendre des beatmakers parce qu'ils sont là et qu'ils ont demandé. Ton offre est pour les artistes ; les beatmakers sont ton canal d'apport.
7. Accepter "je vais réfléchir" sans creuser.
8. Parler après le prix.
9. Proposer 3 × 700 avant qu'on te le demande.
10. Finir un appel sans créneau daté.
11. Envoyer le lien de paiement "pour plus tard".
12. Prendre un mineur sans le parent sur l'appel.

## 7. Journal des conversations (append-only)

Template à copier pour chaque conversation significative :

```
### [Date] — [Artiste] ([lien profil])
- Canal : DM Instagram / email / appel
- Étape atteinte : …
- Verbatim clé (copier-coller les messages importants) :
- Objection(s) rencontrée(s) :
- Ce que j'ai répondu :
- Résultat :
- Leçon → modif du playbook ? (oui/non, quoi)
```
