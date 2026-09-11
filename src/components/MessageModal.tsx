"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Dices, Copy, Check, Send, Headphones } from "lucide-react";
import clsx from "clsx";
import type { Contact, Stage } from "@/lib/types";
import { toDateStr, formatDate } from "@/lib/utils";
import { nextCadenceAction } from "@/lib/cadence";

interface News {
  name: string;
  latestRelease: {
    name: string;
    type: string;
    date: string;
    daysAgo: number;
  } | null;
  previousRelease: { name: string; type: string; daysAgo: number } | null;
  releasesLast12Months?: number;
  isRecent: boolean;
  concerts: { title: string; date?: string; venue?: string; city?: string }[];
  monthlyListeners: number | null;
  followers: number | null;
  topCity: string | null;
  instagramBio?: string | null;
  instagramFollowers?: number | null;
}

type Lang = "fr" | "en";
// « sortante » = approche sortante du guide (docs/methodologie-vente.md §6.4) :
// compliment précis + retour honnête de producteur + question sur le plan à
// 6 mois. Zéro lien, zéro offre — on ne closs jamais en DM (PARTIE 3 §3).
type Style = "simple" | "douce" | "sortante";

// Crochets à compléter à l'oreille : seule l'écoute de ses sons peut les
// remplir. Ils restent visibles dans le message et sont surlignés dans
// l'aperçu tant qu'ils n'ont pas été remplacés.
const BRACKET_RE = /\[[^\]]+\]/;
const FR_TITLE = "[titre]";
const FR_ELEMENT = "[élément précis : flow sur le deuxième couplet / la mélodie du refrain]";
const FR_POINT = "[point précis]";
const EN_TITLE = "[title]";
const EN_ELEMENT = "[precise element: the flow on the second verse / the hook melody]";
const EN_POINT = "[precise point]";

interface Ctx {
  /** prénom si connu, sinon le pseudo raccourci */
  name: string;
  /** titre de la dernière sortie récente, sinon le crochet [titre] / [title] */
  title: string;
  // relTime : « il y a 12 jours » — sinceTime : « 12 jours » (après « depuis »)
  release?: {
    name: string;
    typeLabel: string;
    relTime: string;
    sinceTime: string;
    /** EP ou album : on en parle comme d'un « projet », pas d'un son */
    isProject: boolean;
  };
  /** sortie d'avant : permet « après ton EP, ce single… » */
  prev?: { name: string; typeLabel: string; isProject: boolean };
  /** rythme soutenu (≥ 3 sorties sur 12 mois) */
  pace?: number;
  /** ville où il écoute le plus — signal d'ancrage local */
  city?: string;
  listeners?: number;
  concert?: { where: string };
  genre?: string;
}

const STYLE_LABELS: Record<Style, string> = {
  simple: "Simple 🔥",
  douce: "Accroche douce",
  sortante: "Sortante (méthode)",
};

const FR_TYPE: Record<string, string> = {
  SINGLE: "single",
  ALBUM: "album",
  EP: "EP",
  COMPILATION: "projet",
};

// « Jay Starr » → « Jay », « Anika K » → « Anika » ; les noms d'un seul
// mot ou avec un premier segment trop court restent entiers
function shortName(full: string): string {
  // certains pseudos importés sont entourés de guillemets (« “Mr.Chicken” »)
  const clean = full.trim().replace(/^["“”«»']+|["“”«»']+$/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0].length >= 3) return parts[0];
  return clean;
}

function relTime(daysAgo: number, lang: Lang): string {
  if (lang === "fr") {
    if (daysAgo <= 1) return "hier";
    if (daysAgo < 14) return `il y a ${daysAgo} jours`;
    if (daysAgo < 60) return `il y a ${Math.round(daysAgo / 7)} semaines`;
    return `il y a ${Math.round(daysAgo / 30)} mois`;
  }
  if (daysAgo <= 1) return "yesterday";
  if (daysAgo < 14) return `${daysAgo} days ago`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 7)} weeks ago`;
  return `${Math.round(daysAgo / 30)} months ago`;
}

// durée nue, à placer après « depuis » / "for"
function sinceTime(daysAgo: number, lang: Lang): string {
  if (lang === "fr") {
    if (daysAgo <= 1) return "hier";
    if (daysAgo < 14) return `${daysAgo} jours`;
    if (daysAgo < 60) return `${Math.round(daysAgo / 7)} semaines`;
    return `${Math.round(daysAgo / 30)} mois`;
  }
  if (daysAgo <= 1) return "yesterday";
  if (daysAgo < 14) return `${daysAgo} days`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 7)} weeks`;
  return `${Math.round(daysAgo / 30)} months`;
}

// Gabarits : fonctions (ctx) => message.
//
// Registre : un pote qu'on croise dans la rue. Parlé, minuscules, court.
// Le titre n'est jamais entre guillemets (effet fiche de police) et n'apparaît
// que dans une minorité de variantes.
//
// Deux règles pour que ça reste humain :
//  1. STRUCTURE différente à chaque variante (avec/sans salutation, question en
//     ouverture ou en clôture, une ligne ou deux) — pas juste des synonymes ;
//  2. SIGNAL différent à chaque variante — dernière sortie, sortie précédente,
//     rythme de sortie, type de projet (EP/album), ville d'écoute, concert.
//     Chaque gabarit retombe proprement sur un angle générique si le signal
//     qu'il vise n'est pas disponible pour cet artiste.
const TEMPLATES: Record<Lang, Record<Style, ((c: Ctx) => string)[]>> = {
  fr: {
    // ultra-court : 1 ligne, 2 maximum
    simple: [
      (c) =>
        c.release
          ? `yo ${c.name} 🔥 ton dernier son est trop bien. tu prépares quoi ?`
          : `yo ${c.name} 🔥 ta musique est trop bien. tu prépares quoi ?`,
      (c) =>
        c.release
          ? `${c.release.name} 🔥🔥 sérieux. c'est quoi la suite ?`
          : `ta musique 🔥🔥 sérieux. c'est quoi la suite ?`,
      (c) =>
        c.release
          ? `t'as prévu quoi après ce son ? franchement il est lourd 🔥`
          : `tu prépares quoi en ce moment ? franchement ta musique est lourde 🔥`,
      (c) =>
        c.release
          ? `j'ai mis ton dernier en repeat toute la semaine 😮‍💨 la suite arrive quand ?`
          : `j'ai tes sons en repeat depuis quelques jours 😮‍💨 la suite arrive quand ?`,
      (c) =>
        c.pace
          ? `wsh ${c.name}, ${c.pace} sorties en un an 👀 t'arrêtes jamais toi. c'est quoi le plan ?`
          : `wsh ${c.name}, t'es sur une belle lancée en ce moment 👀 c'est quoi le plan ?`,
      (c) => `yo ${c.name} ! il arrive quand le prochain projet ? 🔥`,
      (c) =>
        c.release
          ? `la prod sur ton dernier son 😮‍💨 tu bosses sur quoi là ?`
          : `les prods sur tes sons 😮‍💨 tu bosses sur quoi là ?`,
      (c) => `${c.name} 🔥 gros niveau. et après, c'est quoi ?`,
      // — nouvelles variantes —
      (c) =>
        c.release?.isProject
          ? `yo ${c.name} ! ton ${c.release.typeLabel} tourne ici en entier 🔥 tu enchaînes sur quoi ?`
          : `yo ${c.name} ! ça tourne ici en boucle 🔥 tu enchaînes sur quoi ?`,
      (c) =>
        c.city
          ? `yo ${c.name}, je vois que ça répond fort à ${c.city} 👀🔥 t'as quoi de prévu ?`
          : `yo ${c.name}, ça commence à répondre pour toi 👀🔥 t'as quoi de prévu ?`,
      (c) =>
        c.prev
          ? `${c.name} 🔥 déjà que ton ${c.prev.typeLabel} était bien, là tu montes encore. la suite ?`
          : `${c.name} 🔥 tu montes de niveau à chaque sortie. la suite ?`,
      (c) => `franchement ${c.name}, respect 🙏 tu sors quoi bientôt ?`,
      (c) =>
        c.release
          ? `2 min que j'écoute ton dernier son et je suis déjà fan 😂🔥 c'est quoi la suite ?`
          : `2 min sur ton profil et je suis déjà fan 😂🔥 c'est quoi la suite ?`,
      (c) =>
        c.concert
          ? `yo ${c.name} ! t'es sur scène en ce moment 🔥 et après la tournée, c'est quoi ?`
          : `yo ${c.name} ! ça bouge pour toi en ce moment 🔥 c'est quoi la suite ?`,
      (c) =>
        c.release
          ? `qui a fait la prod sur ton dernier son ? 👀 c'est propre. tu bosses sur quoi là ?`
          : `tu bosses avec qui en ce moment ? 👀 c'est propre ce que tu sors.`,
      (c) => `yo ${c.name} 👋 t'es sur un projet en ce moment ou tu sors juste des sons ?`,
    ],
    douce: [
      (c) =>
        c.release
          ? `yo ${c.name}, ton dernier son m'a scotché. y'a un truc dedans qui reste après l'écoute. ça vient d'où ce morceau ?`
          : `yo ${c.name}, ta musique m'a scotché. y'a un truc dedans qui reste après l'écoute. ça vient d'où cette énergie ?`,
      (c) =>
        c.release
          ? `il vient d'où ${c.release.name} ? y'a un moment dedans qui m'a bloqué, j'aimerais savoir ce qu'il y a derrière 👀`
          : `tu la puises où cette énergie ? y'a un truc chez toi qui sonne vécu, pas fabriqué 👀`,
      (c) =>
        c.release
          ? `j'ai envoyé ton dernier son à deux potes direct après la première écoute 😂 ça méritait de tourner. tu prépares quoi ?`
          : `j'ai envoyé ton profil à deux potes direct 😂 ça méritait de tourner. tu prépares quoi ?`,
      (c) =>
        c.release
          ? `${c.release.name} tourne ici depuis ${c.release.sinceTime} et il vieillit super bien. c'est rare. tu veux l'emmener où ton projet ?`
          : `ta musique tourne ici depuis quelques jours et elle vieillit bien. c'est rare. tu veux l'emmener où ton projet ?`,
      (c) =>
        c.release
          ? `y'a des sons qu'on écoute et qu'on oublie. le tien reste. c'est quoi la suite pour toi ?`
          : `y'a des artistes qu'on écoute et qu'on oublie. toi non. c'est quoi la suite pour toi ?`,
      (c) =>
        c.concert
          ? `j'ai vu que tu passais ${c.concert.where} 🔥 défendre ses sons en vrai c'est là que tout se joue. ça fait quoi de les voir vivre ?`
          : c.release
            ? `y'a une intention dans ta voix sur le dernier son qui fait qu'on y revient. tu nous prépares quoi maintenant ?`
            : `y'a une intention dans ta voix qui fait qu'on y revient. tu nous prépares quoi en ce moment ?`,
      (c) => `yo ${c.name}. juste respect 🙏 c'est quoi la suite ?`,
      (c) =>
        c.release
          ? `ton dernier son est encore le premier truc que je lance le matin 😅 y'a pas meilleur test. qu'est-ce qui arrive après ?`
          : `ta musique s'est installée dans mes matins sans que je m'en rende compte 😅 qu'est-ce qui arrive après ?`,
      // — nouvelles variantes —
      (c) =>
        c.prev && c.release
          ? `j'ai écouté ton ${c.prev.typeLabel} puis ton dernier son dans la foulée, et on entend clairement l'évolution entre les deux 👀 c'était voulu ?`
          : `j'ai écouté plusieurs de tes sons d'affilée et on entend clairement une évolution 👀 c'est venu comment ?`,
      (c) =>
        c.pace
          ? `${c.pace} sorties en un an et jamais un son bâclé. franchement chapeau 🙏 tu tiens ce rythme comment ?`
          : `t'as un truc rare : jamais un son bâclé. franchement chapeau 🙏 tu bosses comment ?`,
      (c) =>
        c.release?.isProject
          ? `ton ${c.release.typeLabel} s'écoute d'une traite, sans sauter un titre. c'est devenu rare 🙏 tu l'as construit comment ?`
          : `tes sons s'enchaînent sans qu'on ait envie de zapper. c'est devenu rare 🙏 tu construis comment ?`,
      (c) =>
        c.city
          ? `marrant, je vois que t'as une vraie base à ${c.city} 👀 t'as remarqué que ça prenait là-bas ? tu comptes y aller ?`
          : `t'as une vraie base d'auditeurs qui se construit 👀 tu le ressens de ton côté ?`,
      (c) =>
        c.release
          ? `y'a un détail sur ton dernier son — la façon dont tu poses sur le refrain — qui m'a fait revenir dessus trois fois 😅 c'était écrit ou improvisé ?`
          : `y'a un détail dans ta façon de poser qui me fait revenir sur tes sons 😅 ça vient d'où ce style ?`,
      (c) =>
        c.listeners && c.listeners > 20000
          ? `${(c.listeners / 1000).toFixed(0)}k auditeurs par mois et le son reste sincère, sans formule 🙏 c'est quoi le prochain cap pour toi ?`
          : `ton son reste sincère, sans formule toute faite 🙏 c'est quoi le prochain cap pour toi ?`,
      (c) =>
        c.release
          ? `j'écoute beaucoup de sons dans ton style et le tien s'est démarqué direct. tu t'inspires de quoi en ce moment ?`
          : `j'écoute beaucoup de sons dans ton style et le tien s'est démarqué direct. tu t'inspires de quoi ?`,
      (c) => `honnêtement ${c.name}, ta musique m'a fait de l'effet et c'est rare 🙏 t'en es où de ton côté, tu prépares un projet ?`,
    ],
    // Approche sortante (guide §6.4). Structure obligatoire, dans cet ordre :
    //  1. compliment PRÉCIS sur un élément (crochet à compléter à l'écoute) ;
    //  2. retour honnête de producteur sur un point précis (crochet) ;
    //  3. question sur son plan à 6 mois.
    // Zéro lien, zéro offre. Le titre est celui de la dernière sortie connue,
    // sinon un crochet [titre]. La première variante est la citation exacte.
    sortante: [
      (c) =>
        `Hey, j'ai écouté ${c.title}. Le ${FR_ELEMENT} est vraiment bien. Par contre la prod te dessert sur ${FR_POINT}. Question : c'est quoi ton plan pour les 6 prochains mois avec ta musique ?`,
      (c) =>
        `yo ${c.name}, j'ai écouté ${c.title}. le ${FR_ELEMENT} est vraiment bien. par contre la prod te dessert sur ${FR_POINT}. c'est quoi ton plan pour les 6 prochains mois avec ta musique ?`,
      (c) =>
        `${c.name}, j'ai pris le temps d'écouter ${c.title}. le ${FR_ELEMENT}, franchement c'est bien. par contre, retour de producteur : ${FR_POINT} te dessert. tu vois ta musique où dans 6 mois ?`,
      (c) =>
        `salut ${c.name}, ${c.title} tourne ici depuis tout à l'heure. le ${FR_ELEMENT} est vraiment bien. je te dis un truc honnête : la prod te dessert sur ${FR_POINT}. c'est quoi ton plan pour les 6 prochains mois ?`,
      (c) =>
        `hey ${c.name}, retour de producteur sur ${c.title} : le ${FR_ELEMENT} est vraiment bien. par contre ${FR_POINT}, ça te dessert. question : t'as quoi comme plan pour les 6 prochains mois avec ta musique ?`,
      (c) =>
        `yo ${c.name}. j'ai écouté ${c.title} deux fois. ce qui marche : le ${FR_ELEMENT}. ce qui te dessert : ${FR_POINT}. et toi, tu vois ça comment les 6 prochains mois ?`,
      (c) =>
        `${c.name}, j'ai écouté ${c.title}. le ${FR_ELEMENT} est vraiment bien. par contre, je vais être honnête, la prod te dessert sur ${FR_POINT}. c'est quoi le plan pour ta musique sur les 6 prochains mois ?`,
      (c) =>
        `hey ${c.name}, j'ai écouté ${c.title}. le ${FR_ELEMENT}, c'est le moment où ça prend. par contre la prod te dessert sur ${FR_POINT}. c'est quoi ton plan pour les 6 prochains mois avec ta musique ?`,
    ],
  },
  en: {
    simple: [
      (c) =>
        c.release
          ? `yo ${c.name} 🔥 your last one is so good. what you got coming?`
          : `yo ${c.name} 🔥 your music is so good. what you got coming?`,
      (c) =>
        c.release
          ? `${c.release.name} 🔥🔥 fr. what's next?`
          : `your music 🔥🔥 fr. what's next?`,
      () => `what you got planned after that one? cause it goes hard 🔥`,
      (c) =>
        c.release
          ? `had your last one on repeat all week 😮‍💨 when's the next one dropping?`
          : `had your songs on repeat all week 😮‍💨 when's the next one dropping?`,
      (c) =>
        c.pace
          ? `yo ${c.name}, ${c.pace} drops in a year 👀 you never stop. what's the plan?`
          : `yo ${c.name}, you're on a run rn 👀 what's the plan?`,
      (c) => `yo ${c.name}! when's the next project dropping? 🔥`,
      (c) =>
        c.release
          ? `the production on your last one 😮‍💨 what you working on now?`
          : `the production on your songs 😮‍💨 what you working on now?`,
      (c) => `${c.name} 🔥 heavy stuff. so what's next?`,
      // — new ones —
      (c) =>
        c.release?.isProject
          ? `yo ${c.name}! been running your ${c.release.typeLabel} front to back 🔥 what you following it with?`
          : `yo ${c.name}! been running your songs front to back 🔥 what you following up with?`,
      (c) =>
        c.city
          ? `yo ${c.name}, seeing it pop off in ${c.city} 👀🔥 what you got planned?`
          : `yo ${c.name}, it's starting to move for you 👀🔥 what you got planned?`,
      (c) =>
        c.prev
          ? `${c.name} 🔥 your ${c.prev.typeLabel} was already good and you leveled up again. what's next?`
          : `${c.name} 🔥 you level up every drop. what's next?`,
      (c) => `real talk ${c.name}, respect 🙏 when's the next one?`,
      (c) =>
        c.release
          ? `2 min into your last one and I'm already a fan 😂🔥 what's next?`
          : `2 min on your profile and I'm already a fan 😂🔥 what's next?`,
      (c) =>
        c.concert
          ? `yo ${c.name}! you're out performing rn 🔥 what comes after the run?`
          : `yo ${c.name}! things are moving for you 🔥 what's next?`,
      (c) =>
        c.release
          ? `who produced your last one? 👀 that's clean. what you working on?`
          : `who you working with rn? 👀 your stuff is clean.`,
      (c) => `yo ${c.name} 👋 you working on a project rn or just dropping singles?`,
    ],
    douce: [
      (c) =>
        c.release
          ? `yo ${c.name}, your last one stopped me mid-scroll. there's a feeling in it that stays. what's the story behind it?`
          : `yo ${c.name}, your music stopped me mid-scroll. there's a feeling in it that stays. where's that energy from?`,
      (c) =>
        c.release
          ? `where did ${c.release.name} come from? there's a moment in it that got me, I'd love to know what's behind it 👀`
          : `where do you pull that energy from? something in your songs sounds lived, not manufactured 👀`,
      (c) =>
        c.release
          ? `sent your last one to two friends right after the first listen 😂 it deserved to travel. what you cooking?`
          : `sent your profile to two friends right after the first listen 😂 it deserved to travel. what you cooking?`,
      (c) =>
        c.release
          ? `${c.release.name} been living here for ${c.release.sinceTime} and it ages well. that's rare. where you taking the project?`
          : `your music's been living here a few days and it ages well. that's rare. where you taking the project?`,
      (c) =>
        c.release
          ? `some songs you hear and forget. yours stays. what's next for you?`
          : `some artists you hear and forget. you don't. what's next for you?`,
      (c) =>
        c.concert
          ? `saw you're playing ${c.concert.where} 🔥 defending your songs live is where it gets real. how's it feel?`
          : c.release
            ? `there's an intention in your voice on that last one that keeps bringing me back. what you cooking now?`
            : `there's an intention in your voice that keeps bringing me back. what you cooking now?`,
      (c) => `yo ${c.name}. just respect 🙏 what's next?`,
      (c) =>
        c.release
          ? `your last one is still the first thing I play in the morning 😅 no better test. what's coming after?`
          : `your music settled into my mornings without me noticing 😅 what's coming next?`,
      // — new ones —
      (c) =>
        c.prev && c.release
          ? `played your ${c.prev.typeLabel} then your latest back to back and you can hear the growth between them 👀 was that intentional?`
          : `played a few of your songs back to back and you can hear real growth 👀 how'd that come about?`,
      (c) =>
        c.pace
          ? `${c.pace} drops in a year and not one rushed. honestly, respect 🙏 how do you keep that pace?`
          : `you've got something rare: not one rushed song. honestly, respect 🙏 how do you work?`,
      (c) =>
        c.release?.isProject
          ? `your ${c.release.typeLabel} plays straight through, no skips. that's rare now 🙏 how'd you build it?`
          : `your songs run without me wanting to skip. that's rare now 🙏 how do you build them?`,
      (c) =>
        c.city
          ? `funny thing, looks like you've got a real base in ${c.city} 👀 did you notice it catching there? planning to go?`
          : `you've got a real listener base building 👀 do you feel it on your end?`,
      (c) =>
        c.release
          ? `there's one detail on your last one — how you sit on the hook — that made me come back three times 😅 was that written or improvised?`
          : `there's something in how you sit on a beat that keeps pulling me back 😅 where'd that style come from?`,
      (c) =>
        c.listeners && c.listeners > 20000
          ? `${(c.listeners / 1000).toFixed(0)}k monthly and the music still sounds honest, no formula 🙏 what's the next step for you?`
          : `your music sounds honest, no formula 🙏 what's the next step for you?`,
      (c) => `I go through a lot of music in your lane and yours stood out immediately. what's inspiring you rn?`,
      (c) => `honestly ${c.name}, your music hit me and that's rare 🙏 where you at on your end, working on a project?`,
    ],
    // Outbound approach (guide §6.4): precise compliment + honest producer's
    // feedback + question about the 6-month plan. No link, no offer.
    sortante: [
      (c) =>
        `Hey, I listened to ${c.title}. The ${EN_ELEMENT} is really good. But the production lets you down on ${EN_POINT}. Question: what's your plan for the next 6 months with your music?`,
      (c) =>
        `yo ${c.name}, listened to ${c.title}. the ${EN_ELEMENT} is really good. but the production lets you down on ${EN_POINT}. what's your plan for the next 6 months with your music?`,
      (c) =>
        `${c.name}, took the time to listen to ${c.title}. the ${EN_ELEMENT}, honestly, is good. but producer's take: ${EN_POINT} is letting you down. where do you see your music in 6 months?`,
      (c) =>
        `hey ${c.name}, been playing ${c.title} here for a while now. the ${EN_ELEMENT} is really good. one honest thing: the production lets you down on ${EN_POINT}. what's your plan for the next 6 months?`,
      (c) =>
        `hey ${c.name}, producer's take on ${c.title}: the ${EN_ELEMENT} is really good. but ${EN_POINT} is holding you back. question: what's the plan for the next 6 months with your music?`,
      (c) =>
        `yo ${c.name}. played ${c.title} twice. what works: the ${EN_ELEMENT}. what lets you down: ${EN_POINT}. and you, how do you see the next 6 months?`,
      (c) =>
        `${c.name}, listened to ${c.title}. the ${EN_ELEMENT} is really good. but I'll be honest, the production lets you down on ${EN_POINT}. what's the plan for your music over the next 6 months?`,
      (c) =>
        `hey ${c.name}, listened to ${c.title}. the ${EN_ELEMENT}, that's the moment it clicks. but the production lets you down on ${EN_POINT}. what's your plan for the next 6 months with your music?`,
    ],
  },
};

function guessLang(contact: Contact): Lang {
  const loc = (contact.location ?? "").toLowerCase();
  if (
    /france|paris|lyon|marseille|toulouse|lille|bordeaux|bruxelles|belgique|gen[eè]ve|suisse|montr[eé]al|qu[eé]bec/.test(
      loc
    )
  )
    return "fr";
  if (loc.trim()) return "en";
  return "fr";
}

export default function MessageModal({
  contact,
  onClose,
  onUpdated,
}: {
  contact: Contact;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const hasSpotify = !!contact.spotify?.includes("/artist/");
  const [news, setNews] = useState<News | null>(null);
  const [newsState, setNewsState] = useState<"loading" | "done" | "error" | "none">(
    hasSpotify ? "loading" : "none"
  );
  const [lang, setLang] = useState<Lang>(guessLang(contact));
  const [style, setStyle] = useState<Style>("douce");
  const [seed, setSeed] = useState(0);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSpotify) return;
    fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // le handle permet aussi de lire la bio Instagram quand elle est accessible
      body: JSON.stringify({ url: contact.spotify, instagram: contact.instagram }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setNews(await res.json());
        setNewsState("done");
      })
      .catch(() => setNewsState("error"));
  }, [contact.spotify, hasSpotify]);

  const ctx = useMemo<Ctx>(() => {
    const c: Ctx = {
      name: contact.firstName?.trim() || shortName(contact.name),
      title: lang === "fr" ? FR_TITLE : EN_TITLE,
      genre: contact.genre || undefined,
    };
    const typeLabel = (t: string) =>
      lang === "fr"
        ? (FR_TYPE[t] ?? "projet")
        : t === "COMPILATION"
          ? "project"
          : t === "EP"
            ? "EP" // sigle : jamais en minuscules
            : t.toLowerCase();
    const isProject = (t: string) => t === "EP" || t === "ALBUM";

    if (news?.latestRelease && news.isRecent) {
      const t = news.latestRelease.type.toUpperCase();
      c.release = {
        name: news.latestRelease.name,
        typeLabel: typeLabel(t),
        relTime: relTime(news.latestRelease.daysAgo, lang),
        sinceTime: sinceTime(news.latestRelease.daysAgo, lang),
        isProject: isProject(t),
      };
      c.title = news.latestRelease.name;
    }
    if (news?.previousRelease) {
      const t = news.previousRelease.type.toUpperCase();
      c.prev = {
        name: news.previousRelease.name,
        typeLabel: typeLabel(t),
        isProject: isProject(t),
      };
    }
    // rythme : parlant seulement s'il est soutenu
    if ((news?.releasesLast12Months ?? 0) >= 3) c.pace = news!.releasesLast12Months;
    if (news?.topCity) c.city = news.topCity;
    if (news?.monthlyListeners) c.listeners = news.monthlyListeners;
    const concert = news?.concerts?.[0];
    if (concert) {
      const bits = [concert.venue ?? concert.title, concert.city]
        .filter(Boolean)
        .join(lang === "fr" ? " à " : " in ");
      c.concert = { where: bits };
    }
    return c;
  }, [contact, news, lang]);

  const generate = useCallback(
    (s: number) => {
      const pool = TEMPLATES[lang][style];
      setMessage(pool[s % pool.length](ctx));
    },
    [lang, style, ctx]
  );

  // regénère quand la langue, le style ou l'actu changent
  useEffect(() => {
    if (newsState === "loading") return;
    generate(seed);
  }, [generate, seed, newsState]);

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Copie le message et trace l'envoi : nouveau → dm_en_cours, interaction
  // premier_contact, et prochaine action calculée par la cadence (§7.4) pour
  // que la fiche reste valide (prochaine action datée obligatoire).
  async function copyAndMark() {
    await copy();
    setMarking(true);
    setError(null);
    const now = new Date();
    const stageChanged = contact.status === "nouveau";
    const status: Stage = stageChanged ? "dm_en_cours" : contact.status;
    const draft: Contact = {
      ...contact,
      status,
      relanceStep: stageChanged ? 0 : contact.relanceStep,
      // updatedAt = maintenant : la cadence part de l'heure réelle du DM
      updatedAt: now.toISOString(),
      interactions: [
        ...(contact.interactions ?? []),
        {
          date: toDateStr(now),
          type: "premier_contact",
          note: `DM d'accroche envoyé (${STYLE_LABELS[style]}, ${lang.toUpperCase()})`,
        },
      ],
    };
    if (stageChanged || !draft.nextAction || !draft.nextActionDate) {
      const next = nextCadenceAction(draft, now);
      if (next) {
        draft.nextAction = next.label;
        draft.nextActionDate = next.date;
        // "" plutôt qu'undefined : l'API supprime les champs vidés
        draft.nextActionTime = next.time ?? "";
      }
    }
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Erreur ${res.status}`);
      }
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setMarking(false);
    }
  }

  const rel = news?.latestRelease;
  // crochets encore à compléter (éléments que seule l'écoute peut fournir)
  const previewParts = useMemo(() => message.split(/(\[[^\]]+\])/g), [message]);
  const hasBrackets = BRACKET_RE.test(message);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">💬 Message d&apos;accroche — {contact.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actualité détectée */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
          {newsState === "loading" && (
            <p className="text-slate-400">Recherche de l&apos;actualité Spotify…</p>
          )}
          {newsState === "none" && (
            <p className="text-amber-400">
              Pas de lien Spotify artiste sur ce contact — message générique (ajoute le lien pour un message basé sur l&apos;actu).
            </p>
          )}
          {newsState === "error" && (
            <p className="text-amber-400">
              Actualité Spotify inaccessible — message générique.
            </p>
          )}
          {newsState === "done" && news && (
            <ul className="space-y-1">
              {rel && (
                <li className={clsx(news.isRecent ? "text-emerald-400" : "text-slate-400")}>
                  🎵 Dernière sortie : « {rel.name} » ({lang === "fr" ? (FR_TYPE[rel.type.toUpperCase()] ?? "projet") : rel.type.toLowerCase()},{" "}
                  {formatDate(rel.date)})
                  {news.isRecent
                    ? " — récente, utilisée dans le message"
                    : ` — plus de 2 mois, non mise en avant`}
                </li>
              )}
              {!rel && <li className="text-slate-400">🎵 Aucune sortie trouvée</li>}
              {news.concerts.length > 0 && (
                <li className="text-emerald-400">
                  🎤 Concert : {news.concerts[0].venue ?? news.concerts[0].title}
                  {news.concerts[0].city ? ` (${news.concerts[0].city})` : ""}
                  {news.concerts[0].date ? ` le ${formatDate(news.concerts[0].date)}` : ""}
                  {news.concerts.length > 1 ? ` + ${news.concerts.length - 1} autres dates` : ""}
                </li>
              )}
              {news.monthlyListeners != null && (
                <li className="text-slate-400">
                  📊 {news.monthlyListeners.toLocaleString("fr-FR")} auditeurs mensuels
                  {news.topCity ? ` — top ville : ${news.topCity}` : ""}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Réglages */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 p-0.5">
            {(["fr", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  lang === l ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-700 p-0.5">
            {(Object.entries(STYLE_LABELS) as [Style, string][]).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={clsx(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  style === s ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="btn-secondary ml-auto !px-3 !py-1.5 text-xs"
            onClick={() => setSeed((s) => s + 1)}
            title="Autre variante"
          >
            <Dices size={14} /> Variante
          </button>
        </div>

        {style === "sortante" && (
          <p className="mb-2 text-xs text-slate-400">
            Méthode §6.4 : un compliment précis + un retour honnête de producteur + une question sur son plan à 6 mois.
            Zéro lien, zéro offre — le DM ne sert qu&apos;à ouvrir la conversation.
          </p>
        )}

        <textarea
          className="input min-h-32 w-full font-normal leading-relaxed"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {hasBrackets ? (
          <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <Headphones size={14} />
              Écoute ses sons avant d&apos;envoyer — remplace les crochets par ce que tu as vraiment entendu
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
              {previewParts.map((part, i) =>
                /^\[[^\]]+\]$/.test(part) ? (
                  <span
                    key={i}
                    className="rounded bg-amber-500/25 px-1 font-medium text-amber-300"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Relis et personnalise avant d&apos;envoyer — un détail vécu (un titre précis, un moment du clip) fait toute la différence.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copié !" : "Copier"}
          </button>
          <button
            className="btn-primary"
            onClick={copyAndMark}
            disabled={marking || hasBrackets}
            title={
              hasBrackets
                ? "Remplace d'abord les crochets : un DM avec [point précis] dedans grille le contact"
                : undefined
            }
          >
            <Send size={15} />
            {marking ? "…" : "Copier + marquer DM envoyé"}
          </button>
        </div>
      </div>
    </div>
  );
}
