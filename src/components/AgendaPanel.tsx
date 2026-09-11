"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  X,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CalendarDays,
  CalendarClock,
  PhoneCall,
  RefreshCw,
} from "lucide-react";
import type { Contact, Interaction, StageEvent } from "@/lib/types";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import { nextCadenceAction } from "@/lib/cadence";
import { formatDate, todayStr } from "@/lib/utils";
import type { AgendaResponse, AgendaReminder } from "@/app/api/agenda/route";

export type { AgendaResponse, AgendaReminder };

/* ------------------------------------------------------------------ */
/* Utilitaires côté client (réutilisables par ContactsApp)             */
/* ------------------------------------------------------------------ */

/**
 * Textes EXACTS des relances du guide (docs/methodologie-vente.md §7.4).
 * Les crochets sont des trous à remplir à la main ([micro-remarque
 * nouvelle], [conseil concret]) ; seul [Prénom] est rempli automatiquement.
 */
export const DM_RELANCE_TEXTS: Record<1 | 2 | 3 | 4, { delay: string; text: string }> = {
  1: { delay: "+4 h", text: "[Prénom] ?" },
  2: {
    delay: "+24 h",
    text: "Hey, j'ai vu que t'avais pas répondu, aucun stress. Je te dis juste que j'ai réécouté ton son et que [micro-remarque nouvelle]. Dis-moi si c'est toujours d'actualité.",
  },
  3: {
    delay: "+3 j",
    text: "Peu importe ce que tu décides, un truc à faire direct sur ton prochain son : [conseil concret]. Et il me reste 2 créneaux cette semaine si tu veux qu'on en parle.",
  },
  4: {
    delay: "+7 j",
    text: "Je pars du principe que c'est pas le moment, aucun souci. Ma porte reste ouverte.",
  },
};

/** Confirmation avec le cadre, avant l'appel (guide §7.5) */
export const CALL_CONFIRMATION_TEXT =
  "Bloqué [jour/heure]. On fait le point sur ton projet, je te dis ce que je vois, on regarde si bosser ensemble a du sens. 25 min, au calme, avec ton ordi.";

/** Numéro de la relance DM à faire (1-4) pour une fiche dm_en_cours, sinon null */
export function relanceStepOf(c: Contact): 1 | 2 | 3 | 4 | null {
  if (c.status !== "dm_en_cours") return null;
  const m = /Relance\s*([1-4])/i.exec(c.nextAction ?? "");
  const n = m ? Number(m[1]) : Math.min(4, (c.relanceStep ?? 0) + 1);
  return n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : null;
}

/** Texte exact de la relance du guide à envoyer, [Prénom] rempli si connu */
export function relanceText(c: Contact): { step: 1 | 2 | 3 | 4; delay: string; text: string } | null {
  const step = relanceStepOf(c);
  if (!step) return null;
  const { delay, text } = DM_RELANCE_TEXTS[step];
  return { step, delay, text: fillPrenom(text, c.firstName) };
}

function fillPrenom(text: string, firstName?: string): string {
  return firstName && firstName.trim() ? text.replaceAll("[Prénom]", firstName.trim()) : text;
}

/** Charge l'agenda ; `today`/`now` par défaut = horloge du navigateur */
export async function fetchAgenda(today = todayStr(), now = new Date()): Promise<AgendaResponse> {
  const qs = new URLSearchParams({ today, now: now.toISOString() });
  const res = await fetch(`/api/agenda?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Impossible de charger l'agenda");
  }
  return (await res.json()) as AgendaResponse;
}

/** Nombre à afficher sur le badge du bouton « 📅 Agenda » : en retard + aujourd'hui */
export function agendaBadgeCount(a: Pick<AgendaResponse, "counts"> | null | undefined): number {
  if (!a) return 0;
  return a.counts.overdue + a.counts.today;
}

/** Type d'interaction à loguer quand une action est cochée « Fait » */
function doneInteractionType(c: Contact): Interaction["type"] {
  if (c.status === "dm_en_cours") return "relance";
  if (c.status === "nouveau") return "premier_contact"; // le DM est parti → la cadence bascule en DM en cours
  const label = c.nextAction ?? "";
  if (/^Envoyer la démo/i.test(label)) return "demo"; // la cadence saute alors la démo
  if (/^Tenir l'appel/i.test(label)) return c.status === "appel2_booke" ? "appel2" : "appel1";
  return "note";
}

/**
 * Construit la fiche mise à jour après « Fait ✓ » : interaction ajoutée,
 * relanceStep+1 si DM en cours, prochaine action via la cadence, changement
 * d'étape si la cadence le suggère (le serveur pousse stageHistory ; on le
 * pousse aussi ici avec une note, sans doublon côté API).
 */
export function buildDoneUpdate(c: Contact, now: Date): { updated: Contact; next: ReturnType<typeof nextCadenceAction> } {
  const type = doneInteractionType(c);
  const interactions: Interaction[] = [
    ...(c.interactions ?? []),
    { date: todayStr(), type, note: c.nextAction ? `Fait : ${c.nextAction}` : undefined },
  ];
  const relanceStep =
    c.status === "dm_en_cours" ? Math.min(4, (c.relanceStep ?? 0) + 1) : c.relanceStep;
  const base: Contact = { ...c, interactions, relanceStep, updatedAt: now.toISOString() };
  const next = nextCadenceAction(base, now);
  const updated: Contact = { ...base };
  if (next?.suggestStage && next.suggestStage !== c.status) {
    updated.status = next.suggestStage;
    const ev: StageEvent = {
      stage: next.suggestStage,
      at: now.toISOString(),
      note:
        next.suggestStage === "pas_maintenant"
          ? "cadence : 4 relances faites, clôture"
          : "cadence : action faite (agenda)",
    };
    updated.stageHistory = [...(c.stageHistory ?? []), ev];
  }
  if (next) {
    updated.nextAction = next.label;
    updated.nextActionDate = next.date;
    updated.nextActionTime = next.time ?? "";
  }
  return { updated, next };
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

interface AgendaPanelProps {
  onClose: () => void;
  onOpenContact: (contact: Contact) => void;
  onChanged: () => void;
}

const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

function weekdayOf(ymd: string | undefined): string {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  return WEEKDAY.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

function displayName(c: { name: string; firstName?: string }): string {
  return c.firstName && c.firstName.trim() && c.firstName.trim() !== c.name
    ? `${c.firstName.trim()} · ${c.name}`
    : c.name;
}

export default function AgendaPanel({ onClose, onOpenContact, onChanged }: AgendaPanelProps) {
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAgenda());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Échap ferme la modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      setMessage("Copie impossible : sélectionne le texte à la main.");
    }
  }

  async function markDone(c: Contact) {
    if (c.status === "disqualifie" || busyId) return;
    setBusyId(c.id);
    setMessage(null);
    const now = new Date();
    const { updated, next } = buildDoneUpdate(c, now);
    try {
      const res = await fetch(`/api/contacts/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMessage(d.error ?? "Erreur lors de la mise à jour");
      } else if (next) {
        setMessage(
          `${c.name} : ${next.suggestStage && next.suggestStage !== c.status ? `→ ${STAGE_LABELS[next.suggestStage]} · ` : ""}${next.label} le ${formatDate(next.date)}${next.time ? ` à ${next.time}` : ""}`
        );
      } else {
        setMessage(`${c.name} : action faite.`);
      }
      onChanged();
      await load();
    } catch {
      setMessage("Erreur réseau lors de la mise à jour");
    } finally {
      setBusyId(null);
    }
  }

  const today = data?.date ?? todayStr();

  function renderRow(c: Contact, tone: "late" | "today" | "week") {
    const relance = relanceText(c);
    const busy = busyId === c.id;
    return (
      <li
        key={c.id}
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-slate-700"
      >
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-slate-100">{displayName(c)}</span>
              <span
                className={clsx(
                  "inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  STAGE_COLORS[c.status] ?? "border-slate-700 text-slate-400"
                )}
              >
                {STAGE_LABELS[c.status] ?? c.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-300">{c.nextAction ?? "—"}</div>
            <div
              className={clsx(
                "mt-0.5 text-xs",
                tone === "late" ? "text-rose-400" : tone === "today" ? "text-amber-400" : "text-slate-500"
              )}
            >
              {tone === "week" && `${weekdayOf(c.nextActionDate)} `}
              {formatDate(c.nextActionDate)}
              {c.nextActionTime && ` · ${c.nextActionTime}`}
              {tone === "late" && " · en retard"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => markDone(c)}
              disabled={!!busyId}
              className="btn border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/20"
              title="Action faite : logue l'interaction et propose la suivante"
            >
              <CheckCircle size={15} className={busy ? "animate-pulse" : undefined} />
              Fait ✓
            </button>
            <button
              type="button"
              onClick={() => onOpenContact(c)}
              className="btn-secondary px-3 py-1.5"
              title="Ouvrir la fiche"
            >
              <ExternalLink size={15} />
              Ouvrir
            </button>
          </div>
        </div>

        {relance && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5">
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-sky-400">
                Relance {relance.step} ({relance.delay}) — texte du guide §7.4
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{relance.text}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(`dm-${c.id}`, relance.text)}
              className="btn-secondary shrink-0 px-2.5 py-1.5"
              title="Copier le texte"
            >
              {copiedKey === `dm-${c.id}` ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copiedKey === `dm-${c.id}` ? "Copié" : "Copier"}
            </button>
          </div>
        )}
      </li>
    );
  }

  function renderReminder(r: AgendaReminder) {
    const key = `${r.contactId}-${r.which}-${r.kind}`;
    const contact =
      data?.overdue.find((c) => c.id === r.contactId) ??
      data?.today.find((c) => c.id === r.contactId) ??
      data?.week.find((c) => c.id === r.contactId);
    const confirmation = fillPrenom(
      CALL_CONFIRMATION_TEXT.replace(
        "[jour/heure]",
        `${weekdayOf(r.callDate)} ${formatDate(r.callDate)} à ${r.callTime}`
      ),
      r.firstName
    );
    return (
      <li
        key={key}
        className={clsx(
          "rounded-xl border p-3",
          r.due ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-950/60"
        )}
      >
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-100">{displayName(r)}</span>
              <span
                className={clsx(
                  "inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  STAGE_COLORS[r.status] ?? "border-slate-700 text-slate-400"
                )}
              >
                {STAGE_LABELS[r.status] ?? r.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Rappel {r.kind} — appel {r.which} le {weekdayOf(r.callDate)} {formatDate(r.callDate)} à{" "}
              {r.callTime}
            </div>
            <div className={clsx("mt-0.5 text-xs", r.due ? "text-amber-400" : "text-slate-500")}>
              à envoyer {r.date === today ? "aujourd'hui" : `le ${weekdayOf(r.date)} ${formatDate(r.date)}`} ·{" "}
              {r.time}
              {r.due && " · maintenant"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => copyText(`rem-${key}`, confirmation)}
              className="btn-secondary px-2.5 py-1.5"
              title="Copier la confirmation avec le cadre (guide §7.5)"
            >
              {copiedKey === `rem-${key}` ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copiedKey === `rem-${key}` ? "Copié" : "Copier le cadre"}
            </button>
            {contact && (
              <button
                type="button"
                onClick={() => onOpenContact(contact)}
                className="btn-secondary px-3 py-1.5"
                title="Ouvrir la fiche"
              >
                <ExternalLink size={15} />
                Ouvrir
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-sm text-slate-300">
          {confirmation}
        </p>
      </li>
    );
  }

  function section(
    title: string,
    icon: React.ReactNode,
    items: Contact[],
    tone: "late" | "today" | "week",
    empty: string
  ) {
    return (
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          {icon}
          {title}
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {items.length}
          </span>
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{empty}</p>
        ) : (
          <ul className="space-y-2">{items.map((c) => renderRow(c, tone))}</ul>
        )}
      </section>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">📅 Agenda</h2>
            <p className="text-xs text-slate-500">
              Prochaines actions au {formatDate(today)}
              {data && ` — ${agendaBadgeCount(data)} à traiter, ${data.counts.week} cette semaine`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {loading && !data ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : data ? (
          <div className="space-y-6">
            {section(
              "En retard",
              <AlertTriangle size={16} className="text-rose-400" />,
              data.overdue,
              "late",
              "Rien en retard. 👌"
            )}
            {section(
              "Aujourd'hui",
              <CalendarDays size={16} className="text-amber-400" />,
              data.today,
              "today",
              "Rien de prévu aujourd'hui."
            )}
            {section(
              "Cette semaine",
              <CalendarClock size={16} className="text-slate-400" />,
              data.week,
              "week",
              `Rien de prévu d'ici le ${formatDate(data.weekEnd)}.`
            )}
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <PhoneCall size={16} className="text-teal-400" />
                Rappels d&apos;appels (J-1 et H-1)
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {data.reminders.length}
                </span>
              </h3>
              {data.reminders.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun appel booké dans les 7 jours (renseigne la date de l&apos;appel sur les fiches
                  « Appel 1 booké » / « Appel 2 booké »).
                </p>
              ) : (
                <ul className="space-y-2">{data.reminders.map(renderReminder)}</ul>
              )}
            </section>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
