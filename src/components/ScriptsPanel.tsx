"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";
import methodologieJson from "@/data/methodologie.json";
import type { Stage, Objection, Level } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Types du fichier de données src/data/methodologie.json              */
/* (extrait mot pour mot de docs/methodologie-vente.md, PARTIE 2)      */
/* ------------------------------------------------------------------ */

export interface Replique {
  label?: string;
  text: string;
  note?: string;
}

export interface ScriptBloc {
  id: string;
  titre: string;
  intro?: string;
  repliques: Replique[];
  note?: string;
}

/** L'objection 9 du guide (« envoie-moi un récap ») n'a pas d'équivalent dans le type Objection. */
export type ObjectionId = Objection | "recap";

export interface ObjectionItem {
  id: ObjectionId;
  numero: number;
  titre: string;
  intro?: string;
  repliques: Replique[];
  note?: string;
}

export interface Profil {
  id: Level;
  label: string;
  principal: string;
  secondaire: string;
}

export interface Methodologie {
  meta: { source: string; prix: string; echelonnement: string };
  offre: {
    promesse: string;
    promesseNote: string;
    composantes: { titre: string; contenu: string; regle: string }[];
    livrable: string;
    comparables: string[];
    prixNote: string;
    pasPourToiSi: string;
  };
  resultats: {
    methode: string[];
    marge: string;
    profils: Profil[];
    nonStreaming: string;
    phrase: string;
    garantie: string;
  };
  qualification: {
    beatmakers: string;
    criteres: { critere: string; veut: string; signalRouge: string }[];
    mineur: string;
  };
  philosophie: { intro: string; points: string[] };
  parcours: {
    schema: string[];
    demo: string;
    etapes: { stage: Stage; objectif: string }[];
  };
  approcheSortante: { quand: string; text: string; note: string };
  dm: {
    leadEntrant: Replique[];
    combien: { repliques: Replique[]; note: string };
    beatmaker: { intro: string; text: string; note: string };
  };
  relances: {
    titre: string;
    paliers: { step: number; delai: string; delaiHeures: number; format?: string; text: string }[];
  };
  avantAppel: Replique[];
  appel1: {
    cadre: string;
    structure: { bloc: string; duree: string; objectif: string }[];
    blocs: ScriptBloc[];
  };
  entreDeux: {
    intro: string;
    actions: { ordre: number; titre: string; intro?: string; text: string; note?: string }[];
  };
  appel2: { cadre: string; blocs: ScriptBloc[] };
  objections: { cadre: string; items: ObjectionItem[]; jamais: string };
  paiement: { repliques: Replique[]; sous24h: string; quickWin: string };
  suiviNon: { text: string; cadence: string };
  erreurs: string[];
  memo: { titre: string; text: string }[];
}

export const METHODOLOGIE = methodologieJson as unknown as Methodologie;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Remplace [prénom] / [Prénom] par le prénom de la fiche s'il est connu. */
export function fillPrenom(text: string, firstName?: string): string {
  const fn = firstName?.trim();
  if (!fn) return text;
  const cap = fn.charAt(0).toUpperCase() + fn.slice(1);
  return text.replace(/\[prénom\]/g, fn).replace(/\[Prénom\]/g, cap);
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      title="Copier"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          /* clipboard indisponible : rien à faire */
        }
      }}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors",
        copied
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100",
        className
      )}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

/** Une réplique : label optionnel, texte copiable, note optionnelle. */
export function RepliqueCard({ r, firstName }: { r: Replique; firstName?: string }) {
  const text = fillPrenom(r.text, firstName);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      {r.label && <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-300">{r.label}</div>}
      <div className="flex items-start gap-2">
        <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">{text}</p>
        <CopyButton text={text} />
      </div>
      {r.note && <p className="mt-2 text-xs italic text-slate-500">{fillPrenom(r.note, firstName)}</p>}
    </div>
  );
}

export function SectionCard({
  titre,
  intro,
  note,
  tone = "default",
  children,
}: {
  titre: string;
  intro?: string;
  note?: string;
  tone?: "default" | "amber" | "emerald" | "rose";
  children?: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3
        className={clsx(
          "text-sm font-semibold",
          tone === "amber" && "text-amber-300",
          tone === "emerald" && "text-emerald-300",
          tone === "rose" && "text-rose-300",
          tone === "default" && "text-slate-100"
        )}
      >
        {titre}
      </h3>
      {intro && <p className="text-xs text-slate-400">{intro}</p>}
      {children}
      {note && <p className="text-xs italic text-slate-500">{note}</p>}
    </section>
  );
}

export function BlocList({ blocs, firstName }: { blocs: ScriptBloc[]; firstName?: string }) {
  return (
    <div className="space-y-4">
      {blocs.map((b) => (
        <div key={b.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-300">
              {b.id}
            </span>
            <h4 className="text-sm font-medium text-slate-100">{b.titre}</h4>
          </div>
          {b.intro && <p className="text-xs text-slate-400">{b.intro}</p>}
          {b.repliques.map((r, i) => (
            <RepliqueCard key={i} r={r} firstName={firstName} />
          ))}
          {b.note && <p className="text-xs italic text-slate-500">{b.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function StructureTable({ rows }: { rows: { bloc: string; duree: string; objectif: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-950/60 text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Bloc</th>
            <th className="px-3 py-2 text-left font-medium">Durée</th>
            <th className="px-3 py-2 text-left font-medium">Objectif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.bloc} className="border-t border-slate-800 text-slate-300">
              <td className="px-3 py-2 font-medium text-slate-200">{r.bloc}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.duree}</td>
              <td className="px-3 py-2">{r.objectif}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfilsTable({ profils }: { profils: Profil[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-950/60 text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Profil au départ</th>
            <th className="px-3 py-2 text-left font-medium">Résultat principal réaliste (12 semaines)</th>
            <th className="px-3 py-2 text-left font-medium">Résultat secondaire</th>
          </tr>
        </thead>
        <tbody>
          {profils.map((p) => (
            <tr key={p.id} className="border-t border-slate-800 text-slate-300">
              <td className="px-3 py-2 font-medium text-slate-200">{p.label}</td>
              <td className="px-3 py-2">{p.principal}</td>
              <td className="px-3 py-2">{p.secondaire}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CriteresTable({ rows }: { rows: { critere: string; veut: string; signalRouge: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-950/60 text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Critère</th>
            <th className="px-3 py-2 text-left font-medium">Ce que tu veux</th>
            <th className="px-3 py-2 text-left font-medium">Signal rouge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.critere} className="border-t border-slate-800 text-slate-300">
              <td className="px-3 py-2 font-medium text-slate-200">{r.critere}</td>
              <td className="px-3 py-2">{r.veut}</td>
              <td className="px-3 py-2 text-rose-300">{r.signalRouge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RelancesList() {
  return (
    <div className="space-y-2">
      {METHODOLOGIE.relances.paliers.map((p) => (
        <div key={p.step} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-violet-300">
            <span className="rounded bg-violet-600/20 px-1.5 py-0.5 text-violet-200">{p.delai}</span>
            Relance {p.step}
            {p.format && <span className="normal-case text-slate-500">— {p.format}</span>}
          </div>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed text-slate-200">{p.text}</p>
            <CopyButton text={p.text} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Liste des objections, filtrable. `filter` = id d'objection ou "all". */
export function ObjectionsList({
  filter,
  onFilterChange,
  firstName,
  showSelect = true,
}: {
  filter: ObjectionId | "all";
  onFilterChange?: (v: ObjectionId | "all") => void;
  firstName?: string;
  showSelect?: boolean;
}) {
  const { cadre, items, jamais } = METHODOLOGIE.objections;
  const shown = filter === "all" ? items : items.filter((o) => o.id === filter);
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">{cadre}</p>
      {showSelect && (
        <div>
          <label className="label">Objection</label>
          <select className="input" value={filter} onChange={(e) => onFilterChange?.(e.target.value as ObjectionId | "all")}>
            <option value="all">Toutes les objections</option>
            {items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero}. « {o.titre} »
              </option>
            ))}
          </select>
        </div>
      )}
      {shown.map((o) => (
        <div key={o.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-sm font-semibold text-slate-100">
            {o.numero}. « {o.titre} »
          </div>
          {o.intro && <p className="text-xs text-slate-400">{o.intro}</p>}
          {o.repliques.map((r, i) => (
            <RepliqueCard key={i} r={r} firstName={firstName} />
          ))}
          {o.note && <p className="text-xs italic text-slate-500">{o.note}</p>}
        </div>
      ))}
      <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">{jamais}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contenu contextuel par étape                                        */
/* ------------------------------------------------------------------ */

function StageScripts({ stage, firstName, mainObjection }: { stage: Stage; firstName?: string; mainObjection?: Objection }) {
  const M = METHODOLOGIE;

  const approcheSortante = (
    <SectionCard titre="Approche sortante (§6.4)" intro={M.approcheSortante.quand} note={M.approcheSortante.note}>
      <RepliqueCard r={{ text: M.approcheSortante.text }} firstName={firstName} />
    </SectionCard>
  );

  const dmLeadEntrant = (
    <SectionCard titre="DM — lead entrant « PROJET » (§7.1)">
      {M.dm.leadEntrant.map((r, i) => (
        <RepliqueCard key={i} r={r} firstName={firstName} />
      ))}
    </SectionCard>
  );

  const dmCombien = (
    <SectionCard titre="DM — « C'est combien ? » (§7.2)" note={M.dm.combien.note}>
      {M.dm.combien.repliques.map((r, i) => (
        <RepliqueCard key={i} r={r} firstName={firstName} />
      ))}
    </SectionCard>
  );

  const dmBeatmaker = (
    <SectionCard titre="DM — le beatmaker qui écrit (§7.3)" intro={M.dm.beatmaker.intro} note={M.dm.beatmaker.note}>
      <RepliqueCard r={{ text: M.dm.beatmaker.text }} firstName={firstName} />
    </SectionCard>
  );

  const relances = (
    <SectionCard titre={`${M.relances.titre} (§7.4)`}>
      <RelancesList />
    </SectionCard>
  );

  const avantAppel = (
    <SectionCard titre="Avant l'appel (§7.5)">
      {M.avantAppel.map((r, i) => (
        <RepliqueCard key={i} r={r} firstName={firstName} />
      ))}
    </SectionCard>
  );

  const nonFit = M.appel1.blocs.find((b) => b.id === "F")?.repliques.find((r) => r.label?.startsWith("Si ce n'est pas un fit"));

  switch (stage) {
    case "nouveau":
      return (
        <>
          {approcheSortante}
          {dmLeadEntrant}
        </>
      );

    case "dm_en_cours":
    case "qualifie":
      return (
        <>
          {dmLeadEntrant}
          {dmCombien}
          {dmBeatmaker}
          {relances}
          {avantAppel}
        </>
      );

    case "appel1_booke":
      return (
        <>
          <SectionCard titre="Appel 1 — le diagnostic artiste (§8)" tone="amber">
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">{M.appel1.cadre}</p>
            <StructureTable rows={M.appel1.structure} />
          </SectionCard>
          <SectionCard titre="Script appel 1 (§8.2)">
            <BlocList blocs={M.appel1.blocs} firstName={firstName} />
          </SectionCard>
          <SectionCard titre="Menu de résultats chiffrés (§2.2)" intro={M.resultats.marge} note={M.resultats.nonStreaming}>
            <ProfilsTable profils={M.resultats.profils} />
          </SectionCard>
          <SectionCard titre="Le vendre sans te mettre en danger (§2.3)">
            <RepliqueCard r={{ label: "L'objectif chiffré", text: M.resultats.phrase }} firstName={firstName} />
            <RepliqueCard r={{ label: "Garantie conditionnelle", text: M.resultats.garantie }} firstName={firstName} />
          </SectionCard>
        </>
      );

    case "appel1_fait":
      return (
        <SectionCard titre="Entre les deux appels — la maquette et le plan (§9)" intro={M.entreDeux.intro}>
          {M.entreDeux.actions.map((a) => (
            <div key={a.ordre} className="space-y-2">
              <h4 className="text-sm font-medium text-slate-100">
                {a.ordre}. {a.titre}
              </h4>
              {a.intro && <p className="text-xs text-slate-400">{a.intro}</p>}
              <RepliqueCard r={{ text: a.text, note: a.note }} firstName={firstName} />
            </div>
          ))}
        </SectionCard>
      );

    case "appel2_booke":
      return (
        <>
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">{M.appel2.cadre}</p>
          <SectionCard titre="Script appel 2 — présentation et closing (§10.1)">
            <BlocList blocs={M.appel2.blocs} firstName={firstName} />
          </SectionCard>
        </>
      );

    case "appel2_fait":
    case "non":
    case "pas_maintenant":
      return (
        <>
          <SectionCard titre="Suivi des non (§13)" note={M.suiviNon.cadence}>
            <RepliqueCard r={{ text: M.suiviNon.text }} firstName={firstName} />
          </SectionCard>
          <SectionCard titre="Objections (§11)">
            <ObjectionsList filter={mainObjection ?? "all"} firstName={firstName} showSelect={false} />
          </SectionCard>
        </>
      );

    case "client":
      return (
        <SectionCard titre="Paiement, renforcement, onboarding (§12)" tone="emerald">
          {M.paiement.repliques.map((r, i) => (
            <RepliqueCard key={i} r={r} firstName={firstName} />
          ))}
          <p className="text-xs text-slate-300">{M.paiement.sous24h}</p>
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">{M.paiement.quickWin}</p>
        </SectionCard>
      );

    case "disqualifie":
      return (
        <SectionCard titre="Non-fit — disqualifier ouvertement (§8.2 F)" tone="rose">
          {nonFit && <RepliqueCard r={nonFit} firstName={firstName} />}
          <RepliqueCard r={{ label: "Ce n'est pas pour toi si… (§1.5)", text: M.offre.pasPourToiSi }} firstName={firstName} />
        </SectionCard>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Composant principal (embarquable dans ContactModal)                 */
/* ------------------------------------------------------------------ */

export interface ScriptsPanelProps {
  stage: Stage;
  mainObjection?: Objection;
  firstName?: string;
}

export default function ScriptsPanel({ stage, mainObjection, firstName }: ScriptsPanelProps) {
  const [tab, setTab] = useState<"etape" | "objections">("etape");
  const [filter, setFilter] = useState<ObjectionId | "all">(mainObjection ?? "all");

  // Si l'objection principale change sur la fiche, on re-présélectionne.
  useEffect(() => {
    setFilter(mainObjection ?? "all");
  }, [mainObjection]);

  const stageLabel = useMemo(() => STAGE_LABELS[stage] ?? stage, [stage]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => setTab("etape")}
          className={clsx(
            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            tab === "etape" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          💬 Étape : {stageLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab("objections")}
          className={clsx(
            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            tab === "objections" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          🛡️ Objections
        </button>
      </div>

      <div className="space-y-5">
        {tab === "etape" ? (
          <StageScripts stage={stage} firstName={firstName} mainObjection={mainObjection} />
        ) : (
          <ObjectionsList filter={filter} onFilterChange={setFilter} firstName={firstName} />
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Source : {METHODOLOGIE.meta.source}. Les répliques sont reprises mot pour mot ; [crochets] = à adapter.
      </p>
    </div>
  );
}
