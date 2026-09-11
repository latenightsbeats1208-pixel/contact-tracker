import type {
  Category,
  Stage,
  Channel,
  Level,
  Objection,
  InteractionType,
  ImportField,
  EmailType,
} from "./types";

export const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "artist", label: "Artistes", emoji: "🎤" },
  { key: "producer", label: "Producteurs", emoji: "🎛️" },
  { key: "pro", label: "Pros de l'industrie", emoji: "💼" },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  artist: "Artiste",
  producer: "Producteur",
  pro: "Pro de l'industrie",
};

// Les 11 étapes du guide (§5), dans l'ordre du parcours
export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouveau", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { key: "dm_en_cours", label: "DM en cours", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  { key: "qualifie", label: "Qualifié", color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { key: "appel1_booke", label: "Appel 1 booké", color: "bg-teal-500/20 text-teal-300 border-teal-500/40" },
  { key: "appel1_fait", label: "Appel 1 fait", color: "bg-teal-500/20 text-teal-300 border-teal-500/40" },
  { key: "appel2_booke", label: "Appel 2 booké", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" },
  { key: "appel2_fait", label: "Appel 2 fait", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { key: "client", label: "Client ✅", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { key: "non", label: "Non", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { key: "pas_maintenant", label: "Pas maintenant", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40" },
  { key: "disqualifie", label: "Disqualifié", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40" },
];

export const STAGE_LABELS: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label])
) as Record<Stage, string>;

export const STAGE_COLORS: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.color])
) as Record<Stage, string>;

export const STAGE_KEYS: Stage[] = STAGES.map((s) => s.key);

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGE_KEYS as string[]).includes(value);
}

// Les 10 objections spécifiques aux artistes (guide §11)
export const OBJECTION_LABELS: Record<Objection, string> = {
  reflechir: "« Je vais réfléchir »",
  prix_valeur: "« C'est trop cher » — par rapport à ce que ça apporte (valeur)",
  prix_budget: "« Je suis artiste, j'ai pas de thune » — par rapport à ce qu'il peut mettre (budget)",
  beatstars: "« Je peux acheter des beats à 30 € sur BeatStars »",
  beatmaker_existant: "« J'ai déjà un beatmaker / un pote qui fait mes prods »",
  tiers: "« Je dois en parler à mes parents / mon(a) partenaire / mon manager »",
  seul: "« Je vais d'abord essayer seul / j'attends d'avoir plus d'abonnés »",
  deja_decu: "« J'ai déjà payé un coach / une formation / une promo et ça a rien donné »",
  garantie_streams: "« Tu peux me garantir les streams ? »",
  pas_le_moment: "« C'est pas le bon moment »",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  autre: "Autre",
};

// Profils du menu de résultats chiffrés (guide §2.2)
export const LEVEL_LABELS: Record<Level, string> = {
  debutant: "Débutant sérieux — 1-3 sons, < 500 abonnés, < 1 000 streams/titre",
  intermediaire: "Intermédiaire — 5-15 sons, 500-5 000 abonnés, 1 000-10 000 streams/titre",
  avance: "Avancé — audience établie, déjà des sons à 50k+",
};

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  management: "💼 Management",
  booking: "📅 Booking",
  prods: "🎧 Prods",
  artiste: "🎤 Artiste",
};

export const EMAIL_TYPE_COLORS: Record<EmailType, string> = {
  management: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  booking: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  prods: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  artiste: "bg-violet-500/20 text-violet-300 border-violet-500/40",
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  premier_contact: "Premier contact (DM)",
  relance: "Relance",
  reponse: "Réponse reçue",
  appel: "Appel",
  appel1: "Appel 1 — diagnostic",
  appel2: "Appel 2 — présentation",
  demo: "Démo 30 s envoyée",
  paiement: "Paiement",
  note: "Note",
};

export const FIELD_LABELS: Record<ImportField, string> = {
  name: "Pseudo artiste / Nom",
  firstName: "Prénom",
  role: "Rôle / Fonction",
  email: "Email",
  phone: "Téléphone",
  instagram: "Instagram",
  twitter: "Twitter / X",
  tiktok: "TikTok",
  youtube: "YouTube",
  spotify: "Spotify",
  website: "Site web",
  genre: "Genre musical",
  location: "Localisation",
  channel: "Canal (TikTok / Instagram / autre)",
  notes: "Notes",
};

export const PRO_ROLES = [
  "Manager",
  "A&R",
  "Directeur de label",
  "Directeur artistique",
  "Éditeur",
  "Booker",
  "Attaché de presse",
  "Autre",
];
