"use client";

import { useState, type ReactNode } from "react";
import { X, Plus, Trash2, Sparkles, ChevronDown, Wand2 } from "lucide-react";
import clsx from "clsx";
import type {
  Contact,
  Category,
  Stage,
  Channel,
  Level,
  Objection,
  Interaction,
  InteractionType,
  ContactEmail,
  EmailType,
} from "@/lib/types";
import {
  CATEGORIES,
  STAGES,
  STAGE_LABELS,
  INTERACTION_LABELS,
  PRO_ROLES,
  EMAIL_TYPE_LABELS,
  OBJECTION_LABELS,
  CHANNEL_LABELS,
  LEVEL_LABELS,
} from "@/lib/constants";
import {
  todayStr,
  formatDate,
  isUsableValue,
  isoToLocalInput,
  localInputToIso,
  missingNextAction,
} from "@/lib/utils";
import { nextCadenceAction } from "@/lib/cadence";
import ScriptsPanel from "./ScriptsPanel";

interface Props {
  contact: Contact | null; // null = création
  defaultCategory: Category;
  onClose: () => void;
  onSaved: () => void;
}

type YesNo = "" | "oui" | "non";

// Section repliable du formulaire (native <details> : les champs restent montés)
function Section({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-slate-800 bg-slate-950/50"
    >
      <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300 [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {hint && <span className="ml-2 text-xs font-normal text-slate-500">{hint}</span>}
        </span>
        <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={clsx(full && "sm:col-span-2")}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

const numToStr = (n: number | undefined) => (n === undefined || n === null ? "" : String(n));
const boolToYesNo = (b: boolean | undefined): YesNo => (b === undefined ? "" : b ? "oui" : "non");

export default function ContactModal({ contact, defaultCategory, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    // Identité & source
    category: contact?.category ?? defaultCategory,
    name: contact?.name ?? "",
    firstName: contact?.firstName ?? "",
    channel: (contact?.channel ?? "") as Channel | "",
    sourceContent: contact?.sourceContent ?? "",
    keyword: contact?.keyword ?? "",
    role: contact?.role ?? "",
    // Liens & réseaux
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    instagram: contact?.instagram ?? "",
    twitter: contact?.twitter ?? "",
    tiktok: contact?.tiktok ?? "",
    youtube: contact?.youtube ?? "",
    spotify: contact?.spotify ?? "",
    website: contact?.website ?? "",
    genre: contact?.genre ?? "",
    location: contact?.location ?? "",
    // Chiffres de départ
    followers: numToStr(contact?.followers),
    monthlyListeners: numToStr(contact?.monthlyListeners),
    bestTrackStreams: numToStr(contact?.bestTrackStreams),
    releasesCount: numToStr(contact?.releasesCount),
    // Qualification (ses mots)
    problem: contact?.problem ?? "",
    tried: contact?.tried ?? "",
    whyNow: contact?.whyNow ?? "",
    desire6m: contact?.desire6m ?? "",
    budgetSpent: contact?.budgetSpent ?? "",
    // Résultat chiffré
    goalPrimary: contact?.goalPrimary ?? "",
    goalSecondary: contact?.goalSecondary ?? "",
    level: (contact?.level ?? "") as Level | "",
    // Décision
    decisionMakerInvolved: boolToYesNo(contact?.decisionMakerInvolved),
    decisionMakerWho: contact?.decisionMakerWho ?? "",
    priceDisclosed: boolToYesNo(contact?.priceDisclosed),
    mainObjection: (contact?.mainObjection ?? "") as Objection | "",
    // Étape & prochaine action
    status: (contact?.status ?? "nouveau") as Stage,
    nextAction: contact?.nextAction ?? (contact ? "" : "Envoyer le DM"),
    nextActionDate: contact?.nextActionDate ?? (contact ? "" : todayStr()),
    nextActionTime: contact?.nextActionTime ?? "",
    relanceStep: numToStr(contact?.relanceStep),
    appel1At: isoToLocalInput(contact?.appel1At),
    appel2At: isoToLocalInput(contact?.appel2At),
    notes: contact?.notes ?? "",
  });
  const [interactions, setInteractions] = useState<Interaction[]>(
    contact?.interactions ?? []
  );
  const [emails, setEmails] = useState<ContactEmail[]>(contact?.emails ?? []);
  const [harvesting, setHarvesting] = useState(false);
  const [harvestMsg, setHarvestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cadenceMsg, setCadenceMsg] = useState("");

  async function harvestEmails() {
    if (!form.instagram.trim() || harvesting) return;
    setHarvesting(true);
    setHarvestMsg(null);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram: form.instagram }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHarvestMsg({ ok: false, text: data.error ?? "Erreur de récupération" });
        return;
      }
      const found: ContactEmail[] = data.emails ?? [];
      const existing = new Set(emails.map((e) => e.address));
      const fresh = found.filter((e) => !existing.has(e.address));
      if (fresh.length) setEmails((prev) => [...prev, ...fresh]);
      setHarvestMsg({
        ok: true,
        text: fresh.length
          ? `${fresh.length} adresse${fresh.length > 1 ? "s" : ""} trouvée${fresh.length > 1 ? "s" : ""} — vérifie le type avant d'envoyer quoi que ce soit`
          : found.length
            ? "Adresses déjà présentes dans la fiche"
            : "Aucune adresse email sur ce profil Instagram",
      });
    } catch {
      setHarvestMsg({ ok: false, text: "Erreur réseau pendant la récupération" });
    } finally {
      setHarvesting(false);
    }
  }
  const [newInteraction, setNewInteraction] = useState<{
    date: string;
    type: InteractionType;
    note: string;
  }>({ date: todayStr(), type: "relance", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // pré-rempli avec le lien Spotify existant, sinon le nom → un clic suffit
  const [enrichUrl, setEnrichUrl] = useState(
    contact?.spotify || contact?.name || ""
  );
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function enrich() {
    if (!enrichUrl.trim() || enriching) return;
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // l'Instagram déjà saisi sert à écarter les homonymes Spotify
        body: JSON.stringify({ url: enrichUrl, instagram: form.instagram }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnrichMsg({ ok: false, text: data.error ?? "Erreur d'auto-complétion" });
        return;
      }
      const filled: string[] = [];
      setForm((f) => {
        const next = { ...f };
        // ne remplit que les champs vides ou inexploitables (« Ouvrir sur
        // Spotify » issu d'un import) — n'écrase jamais une vraie saisie
        for (const [key, value] of Object.entries(data.fields ?? {})) {
          if (value && !isUsableValue(key, (next as Record<string, string>)[key])) {
            (next as Record<string, string>)[key] = String(value);
            filled.push(key);
          }
        }
        if (Array.isArray(data.info) && data.info.length) {
          const lines = data.info.filter(
            (l: string) => !next.notes.includes(l)
          );
          if (lines.length) {
            next.notes = [next.notes.trim(), ...lines].filter(Boolean).join("\n");
            filled.push("notes");
          }
          // « Spotify : 49 864 auditeurs mensuels » → chiffre de départ
          for (const l of data.info as string[]) {
            const m = /Spotify\s*:\s*([\d\s  .]+?)\s*auditeurs mensuels/i.exec(l);
            if (m && !next.monthlyListeners) {
              next.monthlyListeners = m[1].replace(/[^\d]/g, "");
              filled.push("monthlyListeners");
            }
          }
        }
        return next;
      });
      const warnings: string[] = data.warnings ?? [];
      if (filled.length === 0 && warnings.length === 0) {
        setEnrichMsg({ ok: true, text: "Rien de nouveau à compléter" });
      } else {
        const parts = [];
        if (filled.length)
          parts.push(`Champs complétés : ${[...new Set(filled)].join(", ")}`);
        parts.push(...warnings);
        setEnrichMsg({ ok: warnings.length === 0, text: parts.join(" · ") });
      }
    } catch {
      setEnrichMsg({ ok: false, text: "Erreur réseau pendant l'auto-complétion" });
    } finally {
      setEnriching(false);
    }
  }

  function addInteraction() {
    setInteractions((list) =>
      [...list, { ...newInteraction, note: newInteraction.note || undefined }].sort(
        (a, b) => a.date.localeCompare(b.date)
      )
    );
    setNewInteraction({ date: todayStr(), type: "relance", note: "" });
  }

  // Fiche « brouillon » reconstituée depuis le formulaire, pour la cadence
  function draftContact(statusOverride?: Stage): Contact {
    const nowIso = new Date().toISOString();
    return {
      id: contact?.id ?? "draft",
      category: form.category,
      name: form.name,
      status: statusOverride ?? form.status,
      interactions,
      createdAt: contact?.createdAt ?? nowIso,
      updatedAt: contact?.updatedAt ?? nowIso,
      relanceStep: form.relanceStep ? Number(form.relanceStep) : undefined,
      appel1At: localInputToIso(form.appel1At),
      appel2At: localInputToIso(form.appel2At),
      stageHistory: contact?.stageHistory,
    };
  }

  // « Proposer selon la cadence » (guide §7.4, 7.5, 9, 12, 13)
  function applyCadence(statusOverride?: Stage) {
    const next = nextCadenceAction(draftContact(statusOverride), new Date());
    if (!next) {
      setCadenceMsg("Fiche disqualifiée : aucune prochaine action à prévoir.");
      return;
    }
    setForm((f) => ({
      ...f,
      status: next.suggestStage ?? statusOverride ?? f.status,
      nextAction: next.label,
      nextActionDate: next.date,
      nextActionTime: next.time ?? "",
    }));
    const when = `${formatDate(next.date)}${next.time ? ` à ${next.time}` : ""}`;
    setCadenceMsg(
      next.suggestStage
        ? `Cadence : passage en « ${STAGE_LABELS[next.suggestStage]} » — ${next.label}, le ${when}`
        : `Cadence : ${next.label}, le ${when}`
    );
  }

  function changeStatus(status: Stage) {
    // un changement d'étape rend l'ancienne action caduque → on repropose
    setForm((f) => ({ ...f, status }));
    if (status === "disqualifie") {
      setForm((f) => ({ ...f, status, nextAction: "", nextActionDate: "", nextActionTime: "" }));
      setCadenceMsg("");
      return;
    }
    applyCadence(status);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    const ruleError = missingNextAction({
      status: form.status,
      nextAction: form.nextAction,
      nextActionDate: form.nextActionDate,
    });
    if (ruleError) {
      setError(ruleError);
      return;
    }
    setSaving(true);
    setError("");
    const num = (s: string) => (s.trim() ? Number(s.replace(/[^\d]/g, "")) : "");
    const yesNo = (v: YesNo) => (v === "" ? "" : v === "oui");
    // "" = champ vidé (l'API le retire de la fiche)
    const payload = {
      category: form.category,
      name: form.name.trim(),
      firstName: form.firstName,
      channel: form.channel,
      sourceContent: form.sourceContent,
      keyword: form.keyword,
      role: form.role,
      email: form.email,
      phone: form.phone,
      instagram: form.instagram,
      twitter: form.twitter,
      tiktok: form.tiktok,
      youtube: form.youtube,
      spotify: form.spotify,
      website: form.website,
      genre: form.genre,
      location: form.location,
      followers: num(form.followers),
      monthlyListeners: num(form.monthlyListeners),
      bestTrackStreams: num(form.bestTrackStreams),
      releasesCount: num(form.releasesCount),
      problem: form.problem,
      tried: form.tried,
      whyNow: form.whyNow,
      desire6m: form.desire6m,
      budgetSpent: form.budgetSpent,
      goalPrimary: form.goalPrimary,
      goalSecondary: form.goalSecondary,
      level: form.level,
      decisionMakerInvolved: yesNo(form.decisionMakerInvolved),
      decisionMakerWho: form.decisionMakerWho,
      priceDisclosed: yesNo(form.priceDisclosed),
      mainObjection: form.mainObjection,
      status: form.status,
      nextAction: form.nextAction.trim(),
      nextActionDate: form.nextActionDate,
      nextActionTime: form.nextActionTime,
      relanceStep: form.relanceStep.trim() ? Math.max(0, Math.min(4, Number(form.relanceStep))) : "",
      appel1At: localInputToIso(form.appel1At) ?? "",
      appel2At: localInputToIso(form.appel2At) ?? "",
      notes: form.notes,
      interactions,
      emails: emails.filter((e) => e.address.trim()),
    };
    const res = contact
      ? await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de l'enregistrement");
      return;
    }
    onSaved();
  }

  const hasNumbers = !!(form.followers || form.monthlyListeners || form.bestTrackStreams || form.releasesCount);
  const hasQualif = !!(form.problem || form.tried || form.whyNow || form.desire6m || form.budgetSpent);
  const hasGoals = !!(form.goalPrimary || form.goalSecondary || form.level);
  const hasDecision = !!(form.decisionMakerInvolved || form.priceDisclosed || form.mainObjection);
  const actionMissing = missingNextAction({
    status: form.status,
    nextAction: form.nextAction,
    nextActionDate: form.nextActionDate,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {contact ? `Modifier — ${contact.name}` : "Nouveau contact"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Auto-complétion depuis un lien */}
        <div className="mb-5 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <label className="label text-violet-300">
            ✨ Auto-compléter (nom d&apos;artiste ou lien)
          </label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={enrichUrl}
              onChange={(e) => setEnrichUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enrich()}
              placeholder="Nom de l'artiste, ou lien Spotify / Instagram"
            />
            <button
              className="btn-primary shrink-0"
              onClick={enrich}
              disabled={enriching || !enrichUrl.trim()}
            >
              <Sparkles size={15} />
              {enriching ? "Analyse…" : "Compléter"}
            </button>
          </div>
          {enrichMsg && (
            <p
              className={
                enrichMsg.ok
                  ? "mt-2 text-xs text-emerald-400"
                  : "mt-2 text-xs text-amber-400"
              }
            >
              {enrichMsg.text}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* Étape & prochaine action — en tête : c'est ce qui pilote la fiche */}
          <Section title="🎯 Étape & prochaine action" hint="obligatoire sauf disqualifié" defaultOpen>
            <Field label="Étape">
              <select
                className="input"
                value={form.status}
                onChange={(e) => changeStatus(e.target.value as Stage)}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => applyCadence()}
                title="Remplit la prochaine action selon la cadence du guide (§7.4, 7.5, 9, 12, 13)"
              >
                <Wand2 size={15} /> Proposer selon la cadence
              </button>
            </div>
            <Field label="Prochaine action *" full>
              <input
                className={clsx("input", actionMissing && "border-rose-500/60")}
                value={form.nextAction}
                onChange={(e) => set("nextAction", e.target.value)}
                placeholder='Ex. Relance 1 : "[Prénom] ?"'
              />
            </Field>
            <Field label="Date *">
              <input
                className={clsx("input", actionMissing && "border-rose-500/60")}
                type="date"
                value={form.nextActionDate}
                onChange={(e) => set("nextActionDate", e.target.value)}
              />
            </Field>
            <Field label="Heure">
              <input
                className="input"
                type="time"
                value={form.nextActionTime}
                onChange={(e) => set("nextActionTime", e.target.value)}
              />
            </Field>
            {cadenceMsg && (
              <p className="text-xs text-sky-300 sm:col-span-2">{cadenceMsg}</p>
            )}
            {actionMissing && (
              <p className="text-xs text-rose-400 sm:col-span-2">{actionMissing}</p>
            )}
            <Field label="Relances DM faites (0-4)">
              <input
                className="input"
                type="number"
                min={0}
                max={4}
                value={form.relanceStep}
                onChange={(e) => set("relanceStep", e.target.value)}
                placeholder="0"
              />
            </Field>
            <div />
            <Field label="Appel 1 — date et heure">
              <input
                className="input"
                type="datetime-local"
                value={form.appel1At}
                onChange={(e) => set("appel1At", e.target.value)}
              />
            </Field>
            <Field label="Appel 2 — date et heure">
              <input
                className="input"
                type="datetime-local"
                value={form.appel2At}
                onChange={(e) => set("appel2At", e.target.value)}
              />
            </Field>
          </Section>

          {/* Identité & source */}
          <Section title="👤 Identité & source" defaultOpen>
            <Field label="Prénom">
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Prénom (pour les DM)"
              />
            </Field>
            <Field label="Pseudo artiste *">
              <input
                className="input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nom d'artiste ou nom complet"
                autoFocus={!contact}
              />
            </Field>
            <Field label="Canal">
              <select
                className="input"
                value={form.channel}
                onChange={(e) => set("channel", e.target.value)}
              >
                <option value="">—</option>
                {(Object.keys(CHANNEL_LABELS) as Channel[]).map((k) => (
                  <option key={k} value={k}>
                    {CHANNEL_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Catégorie">
              <select
                className="input"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contenu d'origine">
              <input
                className="input"
                value={form.sourceContent}
                onChange={(e) => set("sourceContent", e.target.value)}
                placeholder="Vidéo / post qui a déclenché le contact"
              />
            </Field>
            <Field label="Mot-clé utilisé">
              <input
                className="input"
                value={form.keyword}
                onChange={(e) => set("keyword", e.target.value)}
                placeholder="PROJET"
              />
            </Field>
            {form.category === "pro" && (
              <Field label="Rôle">
                <select
                  className="input"
                  value={PRO_ROLES.includes(form.role) ? form.role : form.role ? "Autre" : ""}
                  onChange={(e) => set("role", e.target.value)}
                >
                  <option value="">—</option>
                  {PRO_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {(form.role === "Autre" || (form.role && !PRO_ROLES.includes(form.role))) && (
                  <input
                    className="input mt-2"
                    value={form.role === "Autre" ? "" : form.role}
                    onChange={(e) => set("role", e.target.value)}
                    placeholder="Précise le rôle"
                  />
                )}
              </Field>
            )}
          </Section>

          {/* Liens & réseaux */}
          <Section title="🔗 Liens & réseaux" defaultOpen>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@exemple.com"
              />
            </Field>
            <Field label="Téléphone">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </Field>
            <Field label="Instagram">
              <input
                className="input"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@handle ou URL"
              />
            </Field>
            <Field label="TikTok">
              <input
                className="input"
                value={form.tiktok}
                onChange={(e) => set("tiktok", e.target.value)}
                placeholder="@handle ou URL"
              />
            </Field>
            <Field label="Spotify">
              <input
                className="input"
                value={form.spotify}
                onChange={(e) => set("spotify", e.target.value)}
                placeholder="URL du profil artiste"
              />
            </Field>
            <Field label="YouTube">
              <input
                className="input"
                value={form.youtube}
                onChange={(e) => set("youtube", e.target.value)}
                placeholder="@chaine ou URL"
              />
            </Field>
            <Field label="Twitter / X">
              <input
                className="input"
                value={form.twitter}
                onChange={(e) => set("twitter", e.target.value)}
                placeholder="@handle ou URL"
              />
            </Field>
            <Field label="Site web">
              <input
                className="input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Genre musical">
              <input
                className="input"
                value={form.genre}
                onChange={(e) => set("genre", e.target.value)}
                placeholder="Rap, drill, R&B…"
              />
            </Field>
            <Field label="Localisation">
              <input
                className="input"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Paris, Bruxelles…"
              />
            </Field>
          </Section>

          {/* Chiffres de départ (guide §2.1) */}
          <Section title="📊 Chiffres de départ" hint="guide §2.1" defaultOpen={hasNumbers}>
            <Field label="Abonnés (TikTok/Insta)">
              <input className="input" type="number" min={0} value={form.followers} onChange={(e) => set("followers", e.target.value)} />
            </Field>
            <Field label="Auditeurs mensuels Spotify">
              <input className="input" type="number" min={0} value={form.monthlyListeners} onChange={(e) => set("monthlyListeners", e.target.value)} />
            </Field>
            <Field label="Meilleur titre (streams)">
              <input className="input" type="number" min={0} value={form.bestTrackStreams} onChange={(e) => set("bestTrackStreams", e.target.value)} />
            </Field>
            <Field label="Nombre de sons sortis">
              <input className="input" type="number" min={0} value={form.releasesCount} onChange={(e) => set("releasesCount", e.target.value)} />
            </Field>
          </Section>

          {/* Qualification — ses mots (guide §7, §8) */}
          <Section title="🎙️ Qualification — ses mots" hint="texte libre, mot pour mot" defaultOpen={hasQualif}>
            <Field label="Problème (ses mots)" full>
              <textarea className="input min-h-16" value={form.problem} onChange={(e) => set("problem", e.target.value)} placeholder="« Mes sons font 400 streams et meurent »" />
            </Field>
            <Field label="Ce qu'il a déjà essayé" full>
              <textarea className="input min-h-16" value={form.tried} onChange={(e) => set("tried", e.target.value)} placeholder="Beats BeatStars, promo payée, studio…" />
            </Field>
            <Field label="Pourquoi maintenant (ses mots)" full>
              <textarea className="input min-h-16" value={form.whyNow} onChange={(e) => set("whyNow", e.target.value)} placeholder="Le déclencheur réel — noté mot pour mot" />
            </Field>
            <Field label="Désir / objectif 6 mois (ses mots)" full>
              <textarea className="input min-h-16" value={form.desire6m} onChange={(e) => set("desire6m", e.target.value)} placeholder="« Que mes parents arrêtent de me demander quand je vais trouver un vrai taf »" />
            </Field>
            <Field label="Budget déjà dépensé (beats / studio / promo)" full>
              <input className="input" value={form.budgetSpent} onChange={(e) => set("budgetSpent", e.target.value)} placeholder="Ex. ~1 200 € en beats et sessions" />
            </Field>
          </Section>

          {/* Résultat chiffré co-construit (guide §2.2) */}
          <Section title="🏁 Résultat chiffré" hint="co-construit en appel 1" defaultOpen={hasGoals}>
            <Field label="Profil" full>
              <select className="input" value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="">—</option>
                {(Object.keys(LEVEL_LABELS) as Level[]).map((k) => (
                  <option key={k} value={k}>
                    {LEVEL_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Objectif principal" full>
              <input className="input" value={form.goalPrimary} onChange={(e) => set("goalPrimary", e.target.value)} placeholder="Ex. 3 titres sortis + premier titre à 5 000 streams en 30 jours" />
            </Field>
            <Field label="Objectif secondaire" full>
              <input className="input" value={form.goalSecondary} onChange={(e) => set("goalSecondary", e.target.value)} placeholder="Ex. 500 abonnés TikTok gagnés, 3 vidéos > 10 000 vues" />
            </Field>
          </Section>

          {/* Décision (guide §8.2 F, §11) */}
          <Section title="🤝 Décision" hint="décideur, prix, objection" defaultOpen={hasDecision}>
            <Field label="Décideur impliqué ?">
              <select className="input" value={form.decisionMakerInvolved} onChange={(e) => set("decisionMakerInvolved", e.target.value)}>
                <option value="">—</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </Field>
            <Field label="Qui ?">
              <input className="input" value={form.decisionMakerWho} onChange={(e) => set("decisionMakerWho", e.target.value)} placeholder="Parent, partenaire, manager…" />
            </Field>
            <Field label="Ordre de grandeur du prix annoncé ?">
              <select className="input" value={form.priceDisclosed} onChange={(e) => set("priceDisclosed", e.target.value)}>
                <option value="">—</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </Field>
            <Field label="Objection principale">
              <select className="input" value={form.mainObjection} onChange={(e) => set("mainObjection", e.target.value)}>
                <option value="">—</option>
                {(Object.keys(OBJECTION_LABELS) as Objection[]).map((k) => (
                  <option key={k} value={k}>
                    {OBJECTION_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          {/* Notes */}
          <Section title="📝 Notes" defaultOpen>
            <Field label="Notes" full>
              <textarea
                className="input min-h-20"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Contexte, budget, préférences…"
              />
            </Field>
          </Section>
        </div>

        {/* Scripts de l'étape courante — repris mot pour mot du guide */}
        <details open className="group mt-5 rounded-xl border border-violet-500/30 bg-violet-500/5">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 text-sm font-semibold text-violet-200 [&::-webkit-details-marker]:hidden">
            <span>
              📜 Scripts de l&apos;étape
              <span className="ml-2 text-xs font-normal text-slate-500">
                {STAGE_LABELS[form.status]} — texte du guide, à relire avant chaque message ou appel
              </span>
            </span>
            <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            <ScriptsPanel
              stage={form.status}
              mainObjection={form.mainObjection || undefined}
              firstName={form.firstName || undefined}
            />
          </div>
        </details>

        {/* Adresses email typées — se tromper d'adresse grille le contact */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="label !mb-0">
              📧 Adresses email typées ({emails.length})
            </label>
            <button
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={harvestEmails}
              disabled={harvesting || !form.instagram.trim()}
              title={
                form.instagram.trim()
                  ? "Lit la bio Instagram et le bouton « Adresse e-mail » du profil"
                  : "Renseigne d'abord l'Instagram du contact"
              }
            >
              <Sparkles size={13} />
              {harvesting ? "Lecture du profil…" : "Chercher sur Instagram"}
            </button>
          </div>
          {emails.length === 0 && (
            <p className="mb-2 text-xs text-slate-500">
              Aucune adresse. Ajoute-la à la main ou récupère celles du profil Instagram.
            </p>
          )}
          <div className="space-y-2">
            {emails.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  type="email"
                  value={e.address}
                  onChange={(ev) =>
                    setEmails((list) =>
                      list.map((x, j) => (j === i ? { ...x, address: ev.target.value } : x))
                    )
                  }
                  placeholder="adresse@exemple.com"
                  title={e.source ?? undefined}
                />
                <select
                  className="input w-44"
                  value={e.type}
                  onChange={(ev) =>
                    setEmails((list) =>
                      list.map((x, j) =>
                        j === i ? { ...x, type: ev.target.value as EmailType } : x
                      )
                    )
                  }
                >
                  {(Object.keys(EMAIL_TYPE_LABELS) as EmailType[]).map((t) => (
                    <option key={t} value={t}>
                      {EMAIL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                  onClick={() => setEmails((list) => list.filter((_, j) => j !== i))}
                  title="Retirer cette adresse"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn-secondary mt-2 !px-3 !py-1.5 text-xs"
            onClick={() =>
              setEmails((list) => [...list, { address: "", type: "artiste" }])
            }
          >
            <Plus size={13} /> Ajouter une adresse
          </button>
          {harvestMsg && (
            <p
              className={
                harvestMsg.ok ? "mt-2 text-xs text-emerald-400" : "mt-2 text-xs text-amber-400"
              }
            >
              {harvestMsg.text}
            </p>
          )}
        </div>

        {/* Historique des interactions */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            📋 Historique ({interactions.length})
          </h3>
          {interactions.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {interactions.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-1.5 text-sm"
                >
                  <span>
                    <span className="text-slate-500">{formatDate(it.date)}</span>{" "}
                    <span className="font-medium text-slate-200">
                      {INTERACTION_LABELS[it.type] ?? it.type}
                    </span>
                    {it.note && <span className="text-slate-400"> — {it.note}</span>}
                  </span>
                  <button
                    onClick={() =>
                      setInteractions((list) => list.filter((_, j) => j !== i))
                    }
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input w-auto"
              type="date"
              value={newInteraction.date}
              onChange={(e) =>
                setNewInteraction((n) => ({ ...n, date: e.target.value }))
              }
            />
            <select
              className="input w-auto"
              value={newInteraction.type}
              onChange={(e) =>
                setNewInteraction((n) => ({
                  ...n,
                  type: e.target.value as InteractionType,
                }))
              }
            >
              {Object.entries(INTERACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              className="input min-w-40 flex-1"
              value={newInteraction.note}
              onChange={(e) =>
                setNewInteraction((n) => ({ ...n, note: e.target.value }))
              }
              placeholder="Note (optionnel)"
            />
            <button className="btn-secondary" onClick={addInteraction}>
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {(contact?.stageHistory?.length ?? 0) > 0 && (
            <details className="mt-3 text-xs text-slate-500">
              <summary className="cursor-pointer">
                Parcours d&apos;étapes ({contact!.stageHistory!.length})
              </summary>
              <ul className="mt-1 space-y-0.5">
                {contact!.stageHistory!.map((ev, i) => (
                  <li key={i}>
                    {formatDate(ev.at.slice(0, 10))} → {STAGE_LABELS[ev.stage] ?? ev.stage}
                    {ev.note && <span className="text-slate-600"> — {ev.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-400">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving || !!actionMissing}
            title={actionMissing ?? undefined}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
