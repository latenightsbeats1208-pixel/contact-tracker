export type Category = "artist" | "producer" | "pro";

// Les 11 étapes du guide (docs/methodologie-vente.md, PARTIE 2 §5).
// Remplace entièrement l'ancien pipeline (a_contacter, contacte, relance…).
export type Stage =
  | "nouveau"
  | "dm_en_cours"
  | "qualifie"
  | "appel1_booke"
  | "appel1_fait"
  | "appel2_booke"
  | "appel2_fait"
  | "client"
  | "non"
  | "pas_maintenant"
  | "disqualifie";

export type Channel = "tiktok" | "instagram" | "autre";

export type Level = "debutant" | "intermediaire" | "avance";

// Les 10 objections du guide §11
export type Objection =
  | "reflechir"
  | "prix_valeur"
  | "prix_budget"
  | "beatstars"
  | "beatmaker_existant"
  | "tiers"
  | "seul"
  | "deja_decu"
  | "garantie_streams"
  | "pas_le_moment";

export type InteractionType =
  | "premier_contact"
  | "relance"
  | "reponse"
  | "appel"
  | "appel1"
  | "appel2"
  | "demo"
  | "paiement"
  | "note";

export interface Interaction {
  date: string; // YYYY-MM-DD
  type: InteractionType;
  note?: string;
}

export interface StageEvent {
  stage: Stage;
  at: string; // ISO
  note?: string;
}

// Type d'usage d'une adresse email — se tromper d'adresse (envoyer des prods
// au booking…) fait griller le contact, d'où le typage obligatoire.
export type EmailType = "management" | "artiste" | "prods" | "booking";

export interface ContactEmail {
  address: string;
  type: EmailType;
  /** d'où vient l'adresse (ligne de bio Instagram, bouton email du profil…) */
  source?: string;
}

export interface Contact {
  id: string;
  category: Category;
  name: string; // pseudo artiste
  role?: string; // pour les pros : manager, A&R, directeur de label, DA...
  email?: string; // champ historique, conservé ; les adresses typées sont dans emails[]
  emails?: ContactEmail[];
  phone?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  website?: string;
  genre?: string;
  location?: string;
  status: Stage;
  notes?: string;
  interactions: Interaction[];
  createdAt: string;
  updatedAt: string;

  // — Identité & source (guide §3, §6)
  firstName?: string;
  channel?: Channel;
  sourceContent?: string; // contenu d'origine (vidéo, post…)
  keyword?: string; // mot-clé utilisé (PROJET)

  // — Chiffres de départ (guide §2.1)
  followers?: number;
  monthlyListeners?: number;
  bestTrackStreams?: number;
  releasesCount?: number;

  // — Qualification, « ses mots » (guide §7, §8)
  problem?: string;
  tried?: string;
  whyNow?: string;
  desire6m?: string;
  budgetSpent?: string;

  // — Résultat chiffré co-construit (guide §2.2)
  goalPrimary?: string;
  goalSecondary?: string;
  level?: Level;

  // — Décision (guide §8.2 F, §11)
  decisionMakerInvolved?: boolean;
  decisionMakerWho?: string;
  priceDisclosed?: boolean;
  mainObjection?: Objection;

  // — Prochaine action (obligatoire sauf disqualifie)
  nextAction?: string;
  nextActionDate?: string; // YYYY-MM-DD
  nextActionTime?: string; // HH:MM
  relanceStep?: number; // 0-4, nb de relances DM faites (guide §7.4)
  appel1At?: string; // ISO
  appel2At?: string; // ISO

  stageHistory?: StageEvent[];
  legacyStatus?: string; // ancien statut avant migration
}

// Champs cibles pour le mapping à l'import
export const IMPORT_FIELDS = [
  "name",
  "firstName",
  "role",
  "email",
  "phone",
  "instagram",
  "twitter",
  "tiktok",
  "youtube",
  "spotify",
  "website",
  "genre",
  "location",
  "channel",
  "notes",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];
