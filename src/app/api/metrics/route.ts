import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import type { Contact, Objection, Stage } from "@/lib/types";
import { STAGE_KEYS, OBJECTION_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/metrics[?from=YYYY-MM-DD]
 *
 * Tableau de bord du guide (docs/methodologie-vente.md PARTIE 1 §5, PARTIE 3
 * §13.2) : DM ouverts → appels 1 bookés → appels 1 tenus → appels 2 bookés →
 * offres présentées → ventes, taux entre chaque étape, répartition des
 * objections, repères (60-80 % de présence aux appels, 25-40 % de closing).
 *
 * « Atteint une étape » = un événement de stageHistory à cette étape ou à une
 * étape postérieure (ordre linéaire du guide), OU le statut actuel égal /
 * postérieur. Les issues (non, pas_maintenant, disqualifie) ne sont pas dans
 * l'ordre linéaire : elles ne comptent que via le journal (une fiche passée
 * par appel2_fait puis non compte bien dans « offres présentées »).
 *
 * ?from=YYYY-MM-DD : ne compte que les étapes atteintes à partir de cette
 * date (stageHistory.at ; à défaut updatedAt quand seul le statut actuel
 * atteste l'étape). byStage reste un instantané des statuts actuels.
 */

// Ordre linéaire du parcours (§5). Les issues n'ont pas de rang.
const LINEAR_ORDER: Stage[] = [
  "nouveau",
  "dm_en_cours",
  "qualifie",
  "appel1_booke",
  "appel1_fait",
  "appel2_booke",
  "appel2_fait",
  "client",
];

const RANK: Partial<Record<Stage, number>> = Object.fromEntries(
  LINEAR_ORDER.map((s, i) => [s, i])
);

// Les 6 marches de l'entonnoir (§13.2)
const FUNNEL_STEPS: { key: string; label: string; stage: Stage }[] = [
  { key: "dm_ouverts", label: "DM ouverts", stage: "dm_en_cours" },
  { key: "appels1_bookes", label: "Appels 1 bookés", stage: "appel1_booke" },
  { key: "appels1_tenus", label: "Appels 1 tenus", stage: "appel1_fait" },
  { key: "appels2_bookes", label: "Appels 2 bookés", stage: "appel2_booke" },
  { key: "offres_presentees", label: "Offres présentées", stage: "appel2_fait" },
  { key: "ventes", label: "Ventes", stage: "client" },
];

// Repères du guide (§13.2 générique, §5 du brief)
const BENCHMARKS = {
  presence: { low: 60, high: 80 },
  closing: { low: 25, high: 40 },
};

// Date de la migration : le journal d'étapes (stageHistory) démarre ici
const JOURNAL_START = "2026-09-02";

export interface FunnelItem {
  key: string;
  label: string;
  stage: Stage;
  count: number;
  /** taux count / marche précédente, en % (null pour la 1re marche ou si la précédente = 0) */
  rateFromPrevious: number | null;
}

export type BenchmarkStatus = "sous" | "dans" | "au_dessus" | "na";

export interface Benchmark {
  key: "presence" | "closing";
  label: string;
  numeratorLabel: string;
  denominatorLabel: string;
  numerator: number;
  denominator: number;
  /** en %, null si dénominateur = 0 */
  value: number | null;
  low: number;
  high: number;
  status: BenchmarkStatus;
}

export interface MetricsResponse {
  generatedAt: string;
  from: string | null;
  journalStart: string;
  total: number;
  byStage: Record<Stage, number>;
  funnel: FunnelItem[];
  objections: { key: Objection; label: string; count: number }[];
  objectionsTotal: number;
  benchmarks: Benchmark[];
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Date (ms) à laquelle la fiche a atteint l'étape `stage` (ou une étape
 * postérieure) ; null si jamais atteinte.
 */
function reachedAt(c: Contact, stage: Stage): number | null {
  const target = RANK[stage];
  if (target === undefined) return null;
  let earliest: number | null = null;
  for (const ev of c.stageHistory ?? []) {
    const r = RANK[ev.stage];
    if (r === undefined || r < target) continue;
    const t = parseTime(ev.at);
    if (t === null) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  if (earliest !== null) return earliest;
  const current = RANK[c.status];
  if (current !== undefined && current >= target) {
    // Statut actuel sans trace dans le journal : updatedAt fait office de date
    return parseTime(c.updatedAt) ?? parseTime(c.createdAt) ?? 0;
  }
  return null;
}

function reached(c: Contact, stage: Stage, fromMs: number | null): boolean {
  const t = reachedAt(c, stage);
  if (t === null) return false;
  return fromMs === null || t >= fromMs;
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

function benchmarkStatus(value: number | null, low: number, high: number): BenchmarkStatus {
  if (value === null) return "na";
  if (value < low) return "sous";
  if (value > high) return "au_dessus";
  return "dans";
}

export async function GET(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  let from: string | null = null;
  let fromMs: number | null = null;
  if (fromParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromParam)) {
      return NextResponse.json(
        { error: "Paramètre from invalide (attendu YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const t = new Date(`${fromParam}T00:00:00`).getTime();
    if (Number.isNaN(t)) {
      return NextResponse.json({ error: "Paramètre from invalide" }, { status: 400 });
    }
    from = fromParam;
    fromMs = t;
  }

  const { contacts } = readDb();

  // Instantané des statuts actuels
  const byStage = Object.fromEntries(STAGE_KEYS.map((s) => [s, 0])) as Record<Stage, number>;
  for (const c of contacts) {
    if (c.status in byStage) byStage[c.status] += 1;
  }

  // Entonnoir
  const counts = FUNNEL_STEPS.map(
    (step) => contacts.filter((c) => reached(c, step.stage, fromMs)).length
  );
  const funnel: FunnelItem[] = FUNNEL_STEPS.map((step, i) => ({
    key: step.key,
    label: step.label,
    stage: step.stage,
    count: counts[i],
    rateFromPrevious: i === 0 ? null : pct(counts[i], counts[i - 1]),
  }));

  // Objections : fiches concernées par la période = au moins un événement
  // du journal dans la période (toutes les fiches si pas de période)
  const inPeriod = (c: Contact) =>
    fromMs === null ||
    (c.stageHistory ?? []).some((ev) => {
      const t = parseTime(ev.at);
      return t !== null && t >= fromMs;
    });
  const objectionCounts = Object.fromEntries(
    (Object.keys(OBJECTION_LABELS) as Objection[]).map((k) => [k, 0])
  ) as Record<Objection, number>;
  let objectionsTotal = 0;
  for (const c of contacts) {
    if (!c.mainObjection || !(c.mainObjection in objectionCounts)) continue;
    if (!inPeriod(c)) continue;
    objectionCounts[c.mainObjection] += 1;
    objectionsTotal += 1;
  }
  const objections = (Object.keys(OBJECTION_LABELS) as Objection[])
    .map((key) => ({ key, label: OBJECTION_LABELS[key], count: objectionCounts[key] }))
    .sort((a, b) => b.count - a.count);

  // Repères
  const appel1Booke = counts[1];
  const appel1Fait = counts[2];
  const appel2Fait = counts[4];
  const clients = counts[5];
  const presence = pct(appel1Fait, appel1Booke);
  const closing = pct(clients, appel2Fait);
  const benchmarks: Benchmark[] = [
    {
      key: "presence",
      label: "Présence aux appels",
      numeratorLabel: "Appels 1 tenus",
      denominatorLabel: "Appels 1 bookés",
      numerator: appel1Fait,
      denominator: appel1Booke,
      value: presence,
      low: BENCHMARKS.presence.low,
      high: BENCHMARKS.presence.high,
      status: benchmarkStatus(presence, BENCHMARKS.presence.low, BENCHMARKS.presence.high),
    },
    {
      key: "closing",
      label: "Closing sur leads qualifiés",
      numeratorLabel: "Ventes",
      denominatorLabel: "Offres présentées",
      numerator: clients,
      denominator: appel2Fait,
      value: closing,
      low: BENCHMARKS.closing.low,
      high: BENCHMARKS.closing.high,
      status: benchmarkStatus(closing, BENCHMARKS.closing.low, BENCHMARKS.closing.high),
    },
  ];

  const body: MetricsResponse = {
    generatedAt: new Date().toISOString(),
    from,
    journalStart: JOURNAL_START,
    total: contacts.length,
    byStage,
    funnel,
    objections,
    objectionsTotal,
    benchmarks,
  };
  return NextResponse.json(body);
}
