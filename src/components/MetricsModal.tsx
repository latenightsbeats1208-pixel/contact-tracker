"use client";

import { useCallback, useEffect, useState } from "react";
import { X, RefreshCw, Info } from "lucide-react";
import clsx from "clsx";
import type {
  MetricsResponse,
  FunnelItem,
  Benchmark,
  BenchmarkStatus,
} from "@/app/api/metrics/route";
import { STAGES } from "@/lib/constants";

interface Props {
  onClose: () => void;
}

type Period = "tout" | "7" | "30" | "90";

const PERIODS: { key: Period; label: string }[] = [
  { key: "tout", label: "Depuis le début" },
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "90", label: "90 jours" },
];

function fromForPeriod(p: Period): string | null {
  if (p === "tout") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(p));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

const BENCH_STYLE: Record<BenchmarkStatus, { bar: string; text: string; label: string }> = {
  sous: { bar: "bg-rose-500", text: "text-rose-300", label: "Sous le repère" },
  dans: { bar: "bg-emerald-500", text: "text-emerald-300", label: "Dans le repère" },
  au_dessus: { bar: "bg-sky-500", text: "text-sky-300", label: "Au-dessus du repère" },
  na: { bar: "bg-slate-600", text: "text-slate-400", label: "Pas encore de données" },
};

// Couleur de barre par marche de l'entonnoir (dégradé du DM à la vente)
const FUNNEL_COLORS = [
  "bg-sky-500/70",
  "bg-teal-500/70",
  "bg-teal-400/70",
  "bg-indigo-500/70",
  "bg-orange-500/70",
  "bg-emerald-500/80",
];

function Funnel({ items }: { items: FunnelItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const width = Math.max(item.count > 0 ? 3 : 0, (item.count / max) * 100);
        return (
          <div key={item.key}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-0.5 pl-36 text-xs text-slate-500">
                <span className="text-slate-600">↓</span>
                <span className={clsx(item.rateFromPrevious !== null && "text-slate-300")}>
                  {fmtPct(item.rateFromPrevious)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-right text-sm text-slate-300">{item.label}</div>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-800/60">
                <div
                  className={clsx(
                    "h-full rounded-md transition-all duration-500",
                    FUNNEL_COLORS[i] ?? "bg-violet-500/70"
                  )}
                  style={{ width: `${width}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-sm font-semibold text-slate-100 drop-shadow">
                  {item.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Gauge({ b }: { b: Benchmark }) {
  const style = BENCH_STYLE[b.status];
  const value = b.value ?? 0;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-slate-200">{b.label}</div>
        <div className={clsx("text-xl font-bold tabular-nums", style.text)}>{fmtPct(b.value)}</div>
      </div>
      <div className="mb-2 text-xs text-slate-500">
        {b.numeratorLabel} / {b.denominatorLabel} — {b.numerator} / {b.denominator}
      </div>
      {/* Jauge : fond, zone de repère, valeur */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 bg-emerald-500/25"
          style={{ left: `${clamp(b.low)}%`, width: `${clamp(b.high) - clamp(b.low)}%` }}
          title={`Repère : ${b.low}-${b.high} %`}
        />
        <div
          className={clsx("absolute inset-y-0 left-0 rounded-full transition-all duration-500", style.bar)}
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>0 %</span>
        <span>
          repère {b.low}-{b.high} %
        </span>
        <span>100 %</span>
      </div>
      <div className={clsx("mt-2 text-xs font-medium", style.text)}>{style.label}</div>
    </div>
  );
}

export default function MetricsModal({ onClose }: Props) {
  const [period, setPeriod] = useState<Period>("tout");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const from = fromForPeriod(p);
      const url = from ? `/api/metrics?from=${from}` : "/api/metrics";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erreur ${res.status}`);
      }
      setData((await res.json()) as MetricsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const journalStart = data?.journalStart ?? "2026-09-02";
  const journalStartFr = new Date(`${journalStart}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">📊 Métriques</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(period)}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Période */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="label mb-0">Période</span>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={clsx(
                "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                period === p.key
                  ? "border-violet-500 bg-violet-600/30 text-violet-200"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Note journal */}
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Le journal d&apos;étapes démarre à la migration du {journalStartFr} : les chiffres se
            remplissent avec l&apos;usage.
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="py-10 text-center text-sm text-slate-500">Chargement…</div>
        )}

        {data && (
          <div className={clsx("space-y-6", loading && "opacity-60")}>
            {/* Entonnoir */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Entonnoir
                {data.from && (
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    depuis le {new Date(`${data.from}T12:00:00`).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </h3>
              <Funnel items={data.funnel} />
            </section>

            {/* Repères */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Repères du guide
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.benchmarks.map((b) => (
                  <Gauge key={b.key} b={b} />
                ))}
              </div>
            </section>

            {/* Objections */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Objections principales
                <span className="ml-2 font-normal normal-case text-slate-500">
                  {data.objectionsTotal} fiche{data.objectionsTotal > 1 ? "s" : ""} avec objection notée
                </span>
              </h3>
              {data.objectionsTotal === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucune objection notée pour l&apos;instant — renseigne « Objection principale » sur
                  les fiches après l&apos;appel 2.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Objection</th>
                        <th className="px-3 py-2 text-right font-medium">Nb</th>
                        <th className="px-3 py-2 text-right font-medium">Part</th>
                        <th className="w-40 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.objections.map((o) => {
                        const share = data.objectionsTotal
                          ? (o.count / data.objectionsTotal) * 100
                          : 0;
                        return (
                          <tr
                            key={o.key}
                            className={clsx(
                              "border-t border-slate-800",
                              o.count === 0 && "text-slate-600"
                            )}
                          >
                            <td className="px-3 py-2">{o.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{o.count}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {o.count ? fmtPct(Math.round(share * 10) / 10) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-orange-500/70"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Répartition par étape (instantané) */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Fiches par étape
                <span className="ml-2 font-normal normal-case text-slate-500">
                  instantané, {data.total} fiche{data.total > 1 ? "s" : ""}
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <span
                    key={s.key}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      s.color
                    )}
                  >
                    {s.label}
                    <span className="font-semibold tabular-nums">{data.byStage[s.key] ?? 0}</span>
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
