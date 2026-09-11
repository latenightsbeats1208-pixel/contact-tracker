"use client";

import { useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import {
  METHODOLOGIE,
  RepliqueCard,
  BlocList,
  SectionCard,
  StructureTable,
  ProfilsTable,
  CriteresTable,
  RelancesList,
  ObjectionsList,
  type ObjectionId,
} from "./ScriptsPanel";

type Tab =
  | "parcours"
  | "offre"
  | "dm"
  | "appel1"
  | "entredeux"
  | "appel2"
  | "objections"
  | "relances"
  | "jamais"
  | "memo";

const TABS: { key: Tab; label: string }[] = [
  { key: "parcours", label: "🗺️ Parcours" },
  { key: "offre", label: "🎯 Offre" },
  { key: "dm", label: "💬 DM" },
  { key: "appel1", label: "📞 Appel 1" },
  { key: "entredeux", label: "🎧 Entre-deux" },
  { key: "appel2", label: "📞 Appel 2" },
  { key: "objections", label: "🛡️ Objections" },
  { key: "relances", label: "⏰ Relances" },
  { key: "jamais", label: "🚫 Jamais / Erreurs" },
  { key: "memo", label: "📝 Mémo" },
];

const M = METHODOLOGIE;

export default function GuideModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("parcours");
  const [objFilter, setObjFilter] = useState<ObjectionId | "all">("all");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">📖 Guide de vente — accompagnement artiste 2 100 €</h2>
            <p className="text-xs text-slate-500">
              Source : <code className="text-violet-300">docs/methodologie-vente.md</code> (PARTIE 2). Scripts repris mot pour mot.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                tab === t.key ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 text-sm">
          {tab === "parcours" && (
            <>
              <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-300">
                {M.parcours.schema.join("\n")}
              </pre>
              <p className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-violet-200">{M.parcours.demo}</p>
              <SectionCard titre="Les 11 étapes — un seul objectif chacune">
                {M.parcours.etapes.map((e, i) => (
                  <div key={e.stage} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-300">
                      {i + 1}
                    </span>
                    <div>
                      <span className={clsx("inline-block rounded-md border px-2 py-0.5 text-xs font-medium", STAGE_COLORS[e.stage])}>
                        {STAGE_LABELS[e.stage]}
                      </span>
                      <div className="mt-1 text-xs text-slate-400">{e.objectif}</div>
                    </div>
                  </div>
                ))}
              </SectionCard>
              <SectionCard titre="La philosophie appliquée à un artiste (§4)" intro={M.philosophie.intro}>
                <ul className="space-y-1.5">
                  {M.philosophie.points.map((p, i) => (
                    <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
                      {p}
                    </li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard titre="À qui tu vends (§3)" intro={M.qualification.beatmakers} note={M.qualification.mineur}>
                <CriteresTable rows={M.qualification.criteres} />
              </SectionCard>
            </>
          )}

          {tab === "offre" && (
            <>
              <SectionCard titre="La promesse (§1.1)" note={M.offre.promesseNote}>
                <RepliqueCard r={{ text: M.offre.promesse }} />
              </SectionCard>
              <SectionCard titre="Les composantes (§1.2)" note={`Livrable final : ${M.offre.livrable}`}>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950/60 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Composante</th>
                        <th className="px-3 py-2 text-left font-medium">Ce que c'est concrètement</th>
                        <th className="px-3 py-2 text-left font-medium">Ce que ça règle chez l'artiste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {M.offre.composantes.map((c) => (
                        <tr key={c.titre} className="border-t border-slate-800 text-slate-300">
                          <td className="px-3 py-2 font-medium text-slate-200">{c.titre}</td>
                          <td className="px-3 py-2">{c.contenu}</td>
                          <td className="px-3 py-2 italic text-slate-400">{c.regle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
              <SectionCard titre="Ce que l'artiste compare mentalement à ton prix (§1.4)" note={M.offre.prixNote}>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                  {M.offre.comparables.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard titre="Ta phrase « ce n'est pas pour toi si… » (§1.5)">
                <RepliqueCard r={{ text: M.offre.pasPourToiSi }} />
              </SectionCard>
              <SectionCard titre="Le résultat chiffré — menu (§2.2)" intro={M.resultats.marge} note={M.resultats.nonStreaming}>
                <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-300">
                  {M.resultats.methode.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ol>
                <ProfilsTable profils={M.resultats.profils} />
              </SectionCard>
              <SectionCard titre="Comment le vendre sans te mettre en danger (§2.3)">
                <RepliqueCard r={{ label: "L'objectif chiffré", text: M.resultats.phrase }} />
                <RepliqueCard r={{ label: "Garantie conditionnelle", text: M.resultats.garantie }} />
              </SectionCard>
            </>
          )}

          {tab === "dm" && (
            <>
              <SectionCard titre="L'approche sortante (§6.4)" intro={M.approcheSortante.quand} note={M.approcheSortante.note}>
                <RepliqueCard r={{ text: M.approcheSortante.text }} />
              </SectionCard>
              <SectionCard titre="Lead entrant « PROJET » (§7.1)">
                {M.dm.leadEntrant.map((r, i) => (
                  <RepliqueCard key={i} r={r} />
                ))}
              </SectionCard>
              <SectionCard titre="« C'est combien ? » (§7.2)" note={M.dm.combien.note}>
                {M.dm.combien.repliques.map((r, i) => (
                  <RepliqueCard key={i} r={r} />
                ))}
              </SectionCard>
              <SectionCard titre="Le beatmaker qui écrit (§7.3)" intro={M.dm.beatmaker.intro} note={M.dm.beatmaker.note}>
                <RepliqueCard r={{ text: M.dm.beatmaker.text }} />
              </SectionCard>
              <SectionCard titre="Avant l'appel (§7.5)">
                {M.avantAppel.map((r, i) => (
                  <RepliqueCard key={i} r={r} />
                ))}
              </SectionCard>
            </>
          )}

          {tab === "appel1" && (
            <>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">{M.appel1.cadre}</p>
              <SectionCard titre="Structure (§8.1)">
                <StructureTable rows={M.appel1.structure} />
              </SectionCard>
              <SectionCard titre="Script (§8.2)">
                <BlocList blocs={M.appel1.blocs} />
              </SectionCard>
            </>
          )}

          {tab === "entredeux" && (
            <SectionCard titre="Entre les deux appels — la maquette et le plan (§9)" intro={M.entreDeux.intro}>
              {M.entreDeux.actions.map((a) => (
                <div key={a.ordre} className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-100">
                    {a.ordre}. {a.titre}
                  </h4>
                  {a.intro && <p className="text-xs text-slate-400">{a.intro}</p>}
                  <RepliqueCard r={{ text: a.text, note: a.note }} />
                </div>
              ))}
            </SectionCard>
          )}

          {tab === "appel2" && (
            <>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">{M.appel2.cadre}</p>
              <SectionCard titre="Script (§10.1)">
                <BlocList blocs={M.appel2.blocs} />
              </SectionCard>
              <SectionCard titre="Paiement, renforcement, onboarding (§12)" tone="emerald">
                {M.paiement.repliques.map((r, i) => (
                  <RepliqueCard key={i} r={r} />
                ))}
                <p className="text-xs text-slate-300">{M.paiement.sous24h}</p>
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">{M.paiement.quickWin}</p>
              </SectionCard>
            </>
          )}

          {tab === "objections" && <ObjectionsList filter={objFilter} onFilterChange={setObjFilter} />}

          {tab === "relances" && (
            <>
              <SectionCard titre={`${M.relances.titre} (§7.4)`}>
                <RelancesList />
              </SectionCard>
              <SectionCard titre="Avant l'appel (§7.5)">
                {M.avantAppel.map((r, i) => (
                  <RepliqueCard key={i} r={r} />
                ))}
              </SectionCard>
              <SectionCard titre="Entre-deux (§9)">
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                  {M.entreDeux.actions.map((a) => (
                    <li key={a.ordre}>{a.titre}</li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard titre="Après un oui (§12)">
                <p className="text-xs text-slate-300">{M.paiement.sous24h}</p>
                <p className="text-xs text-slate-300">{M.paiement.quickWin}</p>
              </SectionCard>
              <SectionCard titre="Suivi des non (§13)" note={M.suiviNon.cadence}>
                <RepliqueCard r={{ text: M.suiviNon.text }} />
              </SectionCard>
            </>
          )}

          {tab === "jamais" && (
            <>
              <SectionCard titre="Ce que tu ne fais jamais (§11)" tone="rose">
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">{M.objections.jamais}</p>
              </SectionCard>
              <SectionCard titre="Erreurs qui tuent cette vente en particulier (§14)" tone="rose">
                <ol className="space-y-1.5">
                  {M.erreurs.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-[11px] font-bold text-rose-300">
                        {i + 1}
                      </span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ol>
              </SectionCard>
            </>
          )}

          {tab === "memo" && (
            <SectionCard titre="Fiche mémo (§15)">
              {M.memo.map((m) => (
                <div key={m.titre} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-300">{m.titre}</div>
                  <p className="text-xs leading-relaxed text-slate-300">{m.text}</p>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
