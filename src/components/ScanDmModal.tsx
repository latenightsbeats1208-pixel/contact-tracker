"use client";

import { useEffect, useRef, useState } from "react";
import { X, Radar, ExternalLink, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

/*
 * Scan de la conversation DM de scouting : liste les profils partagés
 * depuis le dernier scan, les enrichit un par un via /api/enrich (nom,
 * Spotify vérifié par le handle, genre, audience), puis ajoute la
 * sélection en base. Les messages ne sont marqués traités qu'après ajout.
 */

interface Props {
  onClose: () => void;
  onImported: () => void;
}

interface Row {
  handle: string;
  ts: number;
  checked: boolean;
  name: string;
  spotify?: string;
  website?: string;
  genre?: string;
  info: string[];
  enrich: "pending" | "running" | "done" | "failed";
  warning?: string;
  /** "probable" = lien deviné par le nom, sans preuve du handle Instagram */
  confidence?: "confirmed" | "probable";
}

/** message affiché quand la recherche Spotify est coupée par son quota */
const QUOTA_NOTE =
  "Quota de recherche Spotify atteint — les profils restants sont listés sans lien Spotify. Ajoute-les quand même : le bouton « Compléter réseaux » finira le travail dans un quart d'heure.";

type Phase = "scanning" | "review" | "adding" | "done" | "error";

export default function ScanDmModal({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [newestTs, setNewestTs] = useState(0);
  const [alreadyTracked, setAlreadyTracked] = useState(0);
  const [threadHref, setThreadHref] = useState("");
  const [added, setAdded] = useState(0);
  const [quotaHit, setQuotaHit] = useState(false);
  const [lookupSpotify, setLookupSpotify] = useState(true);
  const enriching = useRef(false);
  const quotaRef = useRef(false);

  async function scan(full: boolean) {
    setPhase("scanning");
    setError("");
    setRows([]);
    const res = await fetch("/api/scan-dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "scan", full }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur pendant le scan");
      setPhase("error");
      return;
    }
    setNewestTs(data.newestTs ?? 0);
    setAlreadyTracked(data.alreadyTracked ?? 0);
    setThreadHref(data.threadUrl ?? "");
    setRows(
      (data.candidates ?? []).map(
        (c: { handle: string; fullName?: string; ts: number }): Row => ({
          handle: c.handle,
          ts: c.ts,
          checked: true,
          name: c.fullName ?? c.handle,
          info: [],
          enrich: "pending",
        })
      )
    );
    setPhase("review");
  }

  useEffect(() => {
    scan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // enrichissement séquentiel — jamais en parallèle (rate-limit Instagram)
  useEffect(() => {
    if (phase !== "review" || enriching.current || !lookupSpotify) return;
    const next = rows.findIndex((r) => r.enrich === "pending");
    if (next === -1) return;
    // quota Spotify épuisé : inutile d'insister, on marque le reste comme
    // traité pour que la sélection reste ajoutable tout de suite
    if (quotaRef.current) {
      setRows((rs) =>
        rs.map((r) => (r.enrich === "pending" ? { ...r, enrich: "done" } : r))
      );
      return;
    }
    enriching.current = true;

    const run = async () => {
      setRows((rs) => rs.map((r, i) => (i === next ? { ...r, enrich: "running" } : r)));
      try {
        // le nom vient déjà de la conversation : on interroge Spotify
        // directement (le handle sert de preuve dans la bio) plutôt que de
        // repasser par Instagram, vite limité en HTTP 429 sur un gros lot
        const row = rows[next];
        const query = row.name && row.name !== row.handle ? row.name : `@${row.handle}`;
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: query, instagram: `@${row.handle}` }),
        });
        const data = await res.json();
        if (data?.reason === "spotify_quota") {
          quotaRef.current = true;
          setQuotaHit(true);
        }
        setRows((rs) =>
          rs.map((r, i) => {
            if (i !== next) return r;
            // 404 = pas d'artiste Spotify certain : le contact reste
            // ajoutable avec son nom et son handle
            if (!res.ok) return { ...r, enrich: "done", warning: data.error };
            return {
              ...r,
              enrich: "done",
              // un lien seulement « probable » ne doit pas écraser le nom
              // venu de la conversation : ce serait propager l'homonyme
              name: data.confidence === "probable" ? r.name : (data.fields?.name?.trim() || r.name),
              spotify: data.fields?.spotify,
              website: data.fields?.website,
              genre: data.fields?.genre,
              info: data.info ?? [],
              warning: (data.warnings ?? [])[0],
              confidence: data.confidence,
            };
          })
        );
      } catch {
        setRows((rs) => rs.map((r, i) => (i === next ? { ...r, enrich: "failed" } : r)));
      }
      // petite pause entre deux profils : on reste sous le radar des quotas
      await new Promise((r) => setTimeout(r, 400));
      enriching.current = false;
      setRows((rs) => [...rs]); // re-déclenche l'effet pour le suivant
    };
    run();
  }, [phase, rows, lookupSpotify]);

  const enrichDone =
    !lookupSpotify || rows.every((r) => r.enrich === "done" || r.enrich === "failed");
  const selected = rows.filter((r) => r.checked);
  const missing = rows.filter((r) => r.enrich === "done" && !r.spotify);

  /** relance la recherche Spotify sur les seules lignes restées sans lien */
  function retryMissing() {
    quotaRef.current = false;
    setQuotaHit(false);
    setLookupSpotify(true);
    setRows((rs) =>
      rs.map((r) => (!r.spotify ? { ...r, enrich: "pending", warning: undefined } : r))
    );
  }

  async function addSelection() {
    setPhase("adding");
    let count = 0;
    for (const r of selected) {
      const notes = [
        ...r.info,
        ...(r.spotify && r.confidence === "probable"
          ? ["⚠️ Lien Spotify trouvé par correspondance de nom — à vérifier"]
          : []),
        `Source : scan DM scouting du ${new Date().toLocaleDateString("fr-FR")}`,
      ].join("\n");
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "artist",
          name: r.name,
          instagram: `@${r.handle}`,
          spotify: r.spotify,
          website: r.website,
          genre: r.genre,
          notes,
          // méthode : une fiche naît en « nouveau » avec sa première action datée
          status: "nouveau",
          channel: "instagram",
          sourceContent: "Scan DM scouting",
          nextAction: "Envoyer le DM",
          nextActionDate: new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) count++;
    }
    // messages traités : le prochain scan repartira d'ici
    if (newestTs) {
      await fetch("/api/scan-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ack", ts: newestTs }),
      });
    }
    setAdded(count);
    setPhase("done");
  }

  async function ignoreAll() {
    // tout marquer traité sans rien ajouter
    if (newestTs) {
      await fetch("/api/scan-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ack", ts: newestTs }),
      });
    }
    onClose();
  }

  function toggle(i: number) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, checked: !r.checked } : r)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Radar size={18} className="text-violet-400" /> Scan de la conversation scouting
          </h2>
          <div className="flex items-center gap-2">
            {threadHref && (
              <a
                href={threadHref}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs"
                title="Ouvrir la conversation dans Instagram"
              >
                <ExternalLink size={14} /> Ouvrir la conv
              </a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {phase === "scanning" && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Lecture de la conversation…
            </p>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-sm text-amber-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
              </p>
              <button className="btn-secondary" onClick={() => scan(false)}>
                Réessayer
              </button>
            </div>
          )}

          {(phase === "review" || phase === "adding") && (
            <>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aucun nouveau profil partagé depuis le dernier scan
                  {alreadyTracked > 0 &&
                    ` (${alreadyTracked} profil${alreadyTracked > 1 ? "s" : ""} déjà dans le tracker)`}
                  .
                </p>
              ) : (
                <>
                  {quotaHit && (
                    <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      {QUOTA_NOTE}
                    </p>
                  )}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      {rows.length} nouveau{rows.length > 1 ? "x" : ""} profil
                      {rows.length > 1 ? "s" : ""} détecté{rows.length > 1 ? "s" : ""}
                      {alreadyTracked > 0 && ` · ${alreadyTracked} déjà suivi${alreadyTracked > 1 ? "s" : ""} (ignorés)`}
                      {!enrichDone && " — recherche Spotify en cours…"}
                      {enrichDone && lookupSpotify && missing.length > 0 &&
                        ` · ${rows.length - missing.length}/${rows.length} avec Spotify`}
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={lookupSpotify}
                          onChange={(e) => setLookupSpotify(e.target.checked)}
                          className="h-3.5 w-3.5 accent-violet-600"
                        />
                        Chercher les liens Spotify
                      </label>
                      {enrichDone && lookupSpotify && missing.length > 0 && (
                        <button
                          className="text-xs text-violet-400 hover:text-violet-300"
                          onClick={retryMissing}
                          title="Relance la recherche sur les profils restés sans lien"
                        >
                          Réessayer les {missing.length} manquants
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {rows.map((r, i) => (
                      <li
                        key={r.handle}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={r.checked}
                          onChange={() => toggle(i)}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {r.name}
                            <span className="ml-2 text-xs text-slate-500">@{r.handle}</span>
                            {r.genre && (
                              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                                {r.genre}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {!lookupSpotify && !r.spotify && "Recherche Spotify désactivée"}
                            {lookupSpotify && r.enrich === "running" && "Recherche Spotify…"}
                            {lookupSpotify && r.enrich === "pending" && "En attente…"}
                            {r.enrich === "done" &&
                              (r.spotify ? (
                                r.confidence === "probable" ? (
                                  <span className="text-amber-400">
                                    Spotify probable, à vérifier (trouvé par le nom, pas par le compte Instagram)
                                    {r.info.length > 0 && ` · ${r.info.join(" · ")}`}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    Spotify confirmé{r.info.length > 0 && ` · ${r.info.join(" · ")}`}
                                  </span>
                                )
                              ) : (
                                <span className="text-amber-400">
                                  Spotify non trouvé{r.warning ? ` — ${r.warning}` : ""}
                                </span>
                              ))}
                            {r.enrich === "failed" && (
                              <span className="text-amber-400">Enrichissement impossible — sera ajouté avec le handle seul</span>
                            )}
                          </p>
                        </div>
                        {r.enrich === "running" && (
                          <Loader2 size={14} className="shrink-0 animate-spin text-slate-500" />
                        )}
                        {r.enrich === "done" && r.spotify && (
                          r.confidence === "probable" ? (
                            <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                          ) : (
                            <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {phase === "done" && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 size={16} /> {added} contact{added > 1 ? "s" : ""} ajouté
              {added > 1 ? "s" : ""} au tracker.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-5 py-4">
          <button
            className="text-xs text-slate-500 hover:text-slate-300"
            onClick={() => scan(true)}
            disabled={phase === "scanning" || phase === "adding"}
            title="Relire toute la conversation, y compris les messages déjà traités"
          >
            Rescanner tout l'historique
          </button>
          <div className="flex gap-2">
            {phase === "review" && rows.length > 0 && (
              <>
                <button className="btn-secondary" onClick={ignoreAll}>
                  Tout ignorer
                </button>
                <button
                  className="btn-primary"
                  onClick={addSelection}
                  disabled={selected.length === 0 || !enrichDone}
                  title={enrichDone ? "" : "Attends la fin de l'enrichissement"}
                >
                  Ajouter la sélection ({selected.length})
                </button>
              </>
            )}
            {(phase === "done" || (phase === "review" && rows.length === 0)) && (
              <button className="btn-primary" onClick={onImported}>
                Fermer
              </button>
            )}
            {phase === "adding" && (
              <button className="btn-primary" disabled>
                <Loader2 size={14} className="animate-spin" /> Ajout…
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
