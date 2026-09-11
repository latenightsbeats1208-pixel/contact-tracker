"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Upload,
  Download,
  Search,
  Pencil,
  Trash2,
  BellRing,
  CheckCircle,
  Mail,
  Phone,
  Instagram,
  Youtube,
  Globe,
  Music2,
  AtSign,
  Sparkles,
  MessageCircle,
  BookOpen,
  Radar,
} from "lucide-react";
import clsx from "clsx";
import type {
  Contact,
  Category,
  Stage,
  ContactEmail,
  EmailType,
  Interaction,
  StageEvent,
} from "@/lib/types";
import {
  CATEGORIES,
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  INTERACTION_LABELS,
  EMAIL_TYPE_LABELS,
} from "@/lib/constants";
import { socialUrl, todayStr, formatDate, isUsableValue } from "@/lib/utils";
import { nextCadenceAction } from "@/lib/cadence";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import MessageModal from "./MessageModal";
import GuideModal from "./GuideModal";
import ScanDmModal from "./ScanDmModal";
import AgendaPanel from "./AgendaPanel";
import MetricsModal from "./MetricsModal";

// couleur d'icône email selon l'usage — pour repérer d'un coup d'œil
// la bonne adresse (se tromper d'adresse grille le contact)
const EMAIL_ICON_COLORS: Record<EmailType, string> = {
  management: "text-indigo-400",
  booking: "text-amber-400",
  prods: "text-emerald-400",
  artiste: "text-violet-400",
};

type StatusFilter = Stage | "all" | "due";

// « À faire aujourd'hui » : prochaine action datée d'aujourd'hui ou en retard
function isDue(c: Contact, today: string): boolean {
  return c.status !== "disqualifie" && !!c.nextActionDate && c.nextActionDate <= today;
}

export default function ContactsApp() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>("artist");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [spotifyFilter, setSpotifyFilter] = useState<"all" | "with" | "without">(
    "all"
  );
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [bulkMsg, setBulkMsg] = useState("");
  const [messageFor, setMessageFor] = useState<Contact | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const today = todayStr();

  const counts = useMemo(() => {
    const c: Record<Category, number> = { artist: 0, producer: 0, pro: 0 };
    for (const ct of contacts) c[ct.category]++;
    return c;
  }, [contacts]);

  const dueCount = useMemo(
    () => contacts.filter((c) => c.category === tab && isDue(c, today)).length,
    [contacts, tab, today]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = contacts
      .filter((c) => c.category === tab)
      .filter((c) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "due") return isDue(c, today);
        return c.status === statusFilter;
      })
      .filter((c) => {
        if (spotifyFilter === "all") return true;
        // une valeur non exploitable (« Ouvrir sur Spotify » d'un import)
        // compte comme absente : c'est justement à compléter
        const has = isUsableValue("spotify", c.spotify);
        return spotifyFilter === "with" ? has : !has;
      })
      .filter((c) => {
        if (!q) return true;
        return [
          c.name,
          c.firstName,
          c.email,
          ...(c.emails?.map((e) => e.address) ?? []),
          c.instagram,
          c.genre,
          c.location,
          c.role,
          c.nextAction,
          c.notes,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
    // « à faire » : les plus en retard d'abord ; sinon ordre alphabétique
    if (statusFilter === "due") {
      return list.sort(
        (a, b) =>
          (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? "") ||
          (a.nextActionTime ?? "").localeCompare(b.nextActionTime ?? "") ||
          a.name.localeCompare(b.name, "fr")
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [contacts, tab, search, statusFilter, spotifyFilter, today]);

  // compteurs affichés dans le filtre streaming (catégorie courante)
  const spotifyCounts = useMemo(() => {
    const inTab = contacts.filter((c) => c.category === tab);
    const withSpotify = inTab.filter((c) =>
      isUsableValue("spotify", c.spotify)
    ).length;
    return { with: withSpotify, without: inTab.length - withSpotify };
  }, [contacts, tab]);

  // « Action faite ✓ » : logue l'action, avance la cadence, propose la suivante
  async function markActionDone(c: Contact) {
    if (c.status === "disqualifie") return;
    const now = new Date();
    const type: Interaction["type"] =
      c.status === "dm_en_cours" ? "relance" : c.status === "nouveau" ? "premier_contact" : "note";
    const interactions: Interaction[] = [
      ...c.interactions,
      { date: today, type, note: c.nextAction ? `Fait : ${c.nextAction}` : undefined },
    ];
    const relanceStep =
      c.status === "dm_en_cours" ? Math.min(4, (c.relanceStep ?? 0) + 1) : c.relanceStep;
    // updatedAt = maintenant : la cadence compte depuis l'action qu'on vient de faire
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
            : "cadence : action faite",
      };
      updated.stageHistory = [...(c.stageHistory ?? []), ev];
    }
    if (next) {
      updated.nextAction = next.label;
      updated.nextActionDate = next.date;
      updated.nextActionTime = next.time ?? "";
    }
    const res = await fetch(`/api/contacts/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBulkMsg(data.error ?? "Erreur lors de la mise à jour");
    } else if (next) {
      setBulkMsg(
        `${c.name} : ${next.suggestStage ? `→ ${STAGE_LABELS[next.suggestStage]} · ` : ""}${next.label} le ${formatDate(next.date)}${next.time ? ` à ${next.time}` : ""}`
      );
    }
    refresh();
  }

  async function bulkEnrich() {
    // deux cas : (a) pas encore de lien Spotify → on le cherche par nom,
    // (b) lien présent mais champs récupérables manquants
    const targets = contacts.filter(
      (c) =>
        !c.spotify?.includes("/artist/") ||
        !c.instagram ||
        !c.twitter ||
        !c.youtube ||
        !c.genre
    );
    if (targets.length === 0) {
      setBulkMsg("Tous les contacts sont déjà complets 🎉");
      return;
    }
    setBulkMsg("");
    setBulk({ done: 0, total: targets.length });
    let updated = 0;
    let found = 0; // liens Spotify retrouvés par nom
    // séquentiel : MusicBrainz est limité à 1 requête/seconde
    for (const c of targets) {
      const hasSpotify = !!c.spotify?.includes("/artist/");
      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // sans lien Spotify : on cherche par nom, le handle Instagram
          // servant à écarter les homonymes
          body: JSON.stringify(
            hasSpotify
              ? { url: c.spotify }
              : { url: c.name, instagram: c.instagram }
          ),
        });
        if (res.ok) {
          const data = await res.json();
          if (!hasSpotify && data.fields?.spotify) found++;
          const next: Contact = { ...c };
          let changed = false;
          for (const [key, value] of Object.entries(data.fields ?? {})) {
            const current = (next as unknown as Record<string, unknown>)[key];
            if (value && !isUsableValue(key, current)) {
              (next as unknown as Record<string, unknown>)[key] = value;
              changed = true;
            }
          }
          // une seule ligne d'audience par source (le chiffre évolue)
          const lines = ((data.info ?? []) as string[]).filter((l) => {
            const prefix = l.split(":")[0].trim();
            return !(next.notes ?? "").includes(prefix);
          });
          if (lines.length) {
            next.notes = [(next.notes ?? "").trim(), ...lines]
              .filter(Boolean)
              .join("\n");
            changed = true;
          }
          // « Spotify : N auditeurs mensuels » → chiffre de départ
          for (const l of (data.info ?? []) as string[]) {
            const m = /Spotify\s*:\s*([\d\s  .]+?)\s*auditeurs mensuels/i.exec(l);
            const n = m ? Number(m[1].replace(/[^\d]/g, "")) : NaN;
            if (Number.isFinite(n) && n > 0 && next.monthlyListeners !== n) {
              next.monthlyListeners = n;
              changed = true;
            }
          }
          if (changed) {
            await fetch(`/api/contacts/${c.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(next),
            });
            updated++;
          }
        }
      } catch {
        // contact suivant
      }
      setBulk((b) => (b ? { done: b.done + 1, total: b.total } : b));
    }
    setBulk(null);
    setBulkMsg(
      `${updated} contact${updated > 1 ? "s" : ""} complété${updated > 1 ? "s" : ""} sur ${targets.length} analysé${targets.length > 1 ? "s" : ""}` +
        (found ? ` · ${found} lien${found > 1 ? "s" : ""} Spotify retrouvé${found > 1 ? "s" : ""}` : "")
    );
    refresh();
  }

  async function bulkEmails() {
    // artistes avec un Instagram et aucune adresse typée. Plafonné à 50 par
    // passe : c'est le compte Instagram de l'utilisateur qui fait ces lectures.
    const targets = contacts
      .filter(
        (c) =>
          c.category === tab &&
          c.instagram?.trim() &&
          (c.emails?.length ?? 0) === 0
      )
      .slice(0, 50);
    if (targets.length === 0) {
      setBulkMsg("Aucun contact à traiter (il faut un Instagram et zéro adresse typée)");
      return;
    }
    setBulkMsg("");
    setBulk({ done: 0, total: targets.length });
    let updated = 0;
    let found = 0;
    for (const c of targets) {
      try {
        const res = await fetch("/api/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instagram: c.instagram }),
        });
        const data = await res.json();
        if (!res.ok) {
          // rate-limit Instagram : on arrête la passe, le reste attendra
          if (String(data.error ?? "").includes("limite")) {
            setBulk(null);
            setBulkMsg(
              `Passe interrompue (${data.error}) — ${updated} contact${updated > 1 ? "s" : ""} complété${updated > 1 ? "s" : ""}, relance plus tard pour la suite`
            );
            refresh();
            return;
          }
        } else if ((data.emails ?? []).length > 0) {
          found += data.emails.length;
          await fetch(`/api/contacts/${c.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...c, emails: data.emails }),
          });
          updated++;
        }
      } catch {
        // contact suivant
      }
      setBulk((b) => (b ? { done: b.done + 1, total: b.total } : b));
      // douceur : ~2,5 s entre profils pour ne pas faire limiter le compte
      await new Promise((r) => setTimeout(r, 2500));
    }
    setBulk(null);
    setBulkMsg(
      `${found} adresse${found > 1 ? "s" : ""} trouvée${found > 1 ? "s" : ""} sur ${updated} contact${updated > 1 ? "s" : ""} (${targets.length} profils lus)`
    );
    refresh();
  }

  async function remove(c: Contact) {
    if (!confirm(`Supprimer « ${c.name} » ?`)) return;
    await fetch(`/api/contacts/${c.id}`, { method: "DELETE" });
    refresh();
  }

  const allEmails = (c: Contact): ContactEmail[] => {
    const typed = c.emails ?? [];
    // le champ historique reste visible s'il n'est pas déjà dans la liste typée
    if (c.email && !typed.some((e) => e.address === c.email)) {
      return [...typed, { address: c.email, type: "artiste" as const }];
    }
    return typed;
  };

  const socials = (c: Contact) =>
    [
      { url: socialUrl(c.instagram, "https://instagram.com/"), icon: Instagram, label: "Instagram" },
      { url: socialUrl(c.twitter, "https://x.com/"), icon: AtSign, label: "Twitter / X" },
      { url: socialUrl(c.tiktok, "https://tiktok.com/@"), icon: Music2, label: "TikTok" },
      { url: socialUrl(c.youtube, "https://youtube.com/@"), icon: Youtube, label: "YouTube" },
      { url: socialUrl(c.spotify, "https://open.spotify.com/search/"), icon: Music2, label: "Spotify" },
      { url: socialUrl(c.website, ""), icon: Globe, label: "Site web" },
    ].filter((s) => s.url);

  const colCount = tab === "pro" ? 9 : 8;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🎯 Contact Tracker
          </h1>
          <p className="text-sm text-slate-400">
            Suivi de prospection — {contacts.length} contact{contacts.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => setGuideOpen(true)}
            title="Parcours de vente, script d'appel, objections, relances"
          >
            <BookOpen size={16} /> Guide
          </button>
          <button
            className="btn-secondary"
            onClick={() => setAgendaOpen(true)}
            title="Actions en retard, du jour, de la semaine, et rappels d'appels"
          >
            📅 Agenda
            {dueCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-300">
                {dueCount}
              </span>
            )}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setMetricsOpen(true)}
            title="Entonnoir, taux entre étapes, objections, repères du guide"
          >
            📊 Métriques
          </button>
          <button
            className="btn-secondary"
            onClick={bulkEnrich}
            disabled={!!bulk}
            title="Complète Instagram, réseaux et genre des contacts ayant un lien Spotify"
          >
            <Sparkles size={16} />
            {bulk ? `${bulk.done}/${bulk.total}…` : "Compléter réseaux"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setScanOpen(true)}
            title="Lit la conversation DM de scouting et propose les nouveaux profils partagés"
          >
            <Radar size={16} /> Scan DM
          </button>
          <button
            className="btn-secondary"
            onClick={bulkEmails}
            disabled={!!bulk}
            title="Lit la bio Instagram et le bouton « Adresse e-mail » des contacts sans adresse typée (50 max par passe)"
          >
            <Mail size={16} />
            {bulk ? `${bulk.done}/${bulk.total}…` : "Emails IG"}
          </button>
          <button className="btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Importer
          </button>
          <a
            className="btn-secondary"
            href={`/api/export?category=${tab}`}
            download
          >
            <Download size={16} /> Exporter
          </a>
          <button className="btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </header>

      {bulkMsg && (
        <p className="mb-3 text-xs text-emerald-400">{bulkMsg}</p>
      )}

      {/* Onglets */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setTab(cat.key)}
            className={clsx(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              tab === cat.key
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            {cat.emoji} {cat.label}
            <span
              className={clsx(
                "ml-2 rounded-full px-2 py-0.5 text-xs",
                tab === cat.key ? "bg-violet-500" : "bg-slate-800"
              )}
            >
              {counts[cat.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Pipeline (11 étapes du guide) : compte par étape, clic = filtre */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
        {STAGES.map((s, i) => {
          const count = contacts.filter(
            (c) => c.category === tab && c.status === s.key
          ).length;
          const active = statusFilter === s.key;
          // séparateur : flèche dans le parcours, barre avant les issues
          const sep = i === 0 ? null : s.key === "non" ? "|" : "›";
          return (
            <div key={s.key} className="flex shrink-0 items-center gap-1">
              {sep && <span className="text-slate-700">{sep}</span>}
              <button
                onClick={() => setStatusFilter(active ? "all" : s.key)}
                title={`Filtrer : ${s.label}`}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? s.color
                    : count > 0
                      ? "border-transparent text-slate-300 hover:bg-slate-800"
                      : "border-transparent text-slate-600 hover:bg-slate-800"
                )}
              >
                {s.label}
                <span
                  className={clsx(
                    "rounded-full px-1.5 text-[10px]",
                    count > 0 ? "bg-slate-700 text-slate-200" : "bg-slate-800/60 text-slate-600"
                  )}
                >
                  {count}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Rechercher un nom, email, genre, ville, action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">Toutes les étapes</option>
          <option value="due">🔔 À faire aujourd&apos;hui</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={spotifyFilter}
          onChange={(e) =>
            setSpotifyFilter(e.target.value as "all" | "with" | "without")
          }
          title="Filtrer selon la présence d'une page Spotify"
        >
          <option value="all">🎧 Streaming : tous</option>
          <option value="with">✅ Avec page Spotify ({spotifyCounts.with})</option>
          <option value="without">
            ⚠️ Sans page Spotify ({spotifyCounts.without})
          </option>
        </select>
        {dueCount > 0 && statusFilter !== "due" && (
          <button
            onClick={() => setStatusFilter("due")}
            className="btn border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            <BellRing size={15} /> {dueCount} à faire aujourd&apos;hui
          </button>
        )}
        {spotifyCounts.without > 0 && spotifyFilter !== "without" && (
          <button
            onClick={() => setSpotifyFilter("without")}
            title="Voir les artistes dont la page Spotify reste à trouver"
            className="btn border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
          >
            <Music2 size={15} /> {spotifyCounts.without} sans Spotify
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Nom</th>
              {tab === "pro" && <th className="px-4 py-3">Rôle</th>}
              <th className="px-4 py-3">Étape</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Réseaux</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Dernière action</th>
              <th className="px-4 py-3">Prochaine action</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-slate-500">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-slate-500">
                  {contacts.filter((c) => c.category === tab).length === 0
                    ? "Aucun contact dans cette catégorie. Ajoute-en un ou importe un fichier."
                    : "Aucun résultat avec ces filtres."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const last = c.interactions[c.interactions.length - 1];
                const due = isDue(c, today);
                const late = due && !!c.nextActionDate && c.nextActionDate < today;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800/60 transition-colors hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-slate-100 hover:text-violet-400"
                        onClick={() => setEditing(c)}
                      >
                        {c.firstName ? `${c.firstName} · ${c.name}` : c.name}
                      </button>
                      {c.location && (
                        <div className="text-xs text-slate-500">{c.location}</div>
                      )}
                    </td>
                    {tab === "pro" && (
                      <td className="px-4 py-3 text-slate-300">{c.role ?? "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STAGE_COLORS[c.status] ?? "border-slate-700 text-slate-400"
                        )}
                      >
                        {STAGE_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {allEmails(c).map((e) => (
                          <a
                            key={e.address}
                            href={`mailto:${e.address}`}
                            title={`${EMAIL_TYPE_LABELS[e.type]} — ${e.address}`}
                            className={clsx(
                              "hover:opacity-75",
                              EMAIL_ICON_COLORS[e.type]
                            )}
                          >
                            <Mail size={16} />
                          </a>
                        ))}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            title={c.phone}
                            className="text-slate-400 hover:text-violet-400"
                          >
                            <Phone size={16} />
                          </a>
                        )}
                        {allEmails(c).length === 0 && !c.phone && (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {socials(c).map((s, i) => (
                          <a
                            key={i}
                            href={s.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={s.label}
                            className="text-slate-400 hover:text-violet-400"
                          >
                            <s.icon size={16} />
                          </a>
                        ))}
                        {socials(c).length === 0 && (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.genre ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {last ? (
                        <>
                          <div className="text-slate-300">
                            {INTERACTION_LABELS[last.type] ?? last.type}
                          </div>
                          <div className="text-xs">{formatDate(last.date)}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "disqualifie" ? (
                        <span className="text-xs text-slate-600">—</span>
                      ) : c.nextAction ? (
                        <>
                          <div
                            className={clsx(
                              "max-w-56 truncate",
                              late ? "font-medium text-rose-400" : due ? "font-medium text-amber-300" : "text-slate-200"
                            )}
                            title={c.nextAction}
                          >
                            {late ? "⚠️ " : due ? "🔔 " : ""}
                            {c.nextAction}
                          </div>
                          <div
                            className={clsx(
                              "text-xs",
                              late ? "text-rose-400" : due ? "text-amber-400" : "text-slate-500"
                            )}
                          >
                            {formatDate(c.nextActionDate)}
                            {c.nextActionTime && ` · ${c.nextActionTime}`}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-rose-400">⚠️ à définir</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          title="Générer un message d'accroche"
                          onClick={() => setMessageFor(c)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-violet-500/10 hover:text-violet-400"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          title={
                            c.status === "disqualifie"
                              ? "Fiche disqualifiée"
                              : `Action faite ✓ — ${c.nextAction ?? "prochaine action"} (logue l'interaction et propose la suivante)`
                          }
                          onClick={() => markActionDone(c)}
                          disabled={c.status === "disqualifie"}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          title="Modifier"
                          onClick={() => setEditing(c)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          title="Supprimer"
                          onClick={() => remove(c)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {editing && (
        <ContactModal
          contact={editing === "new" ? null : editing}
          defaultCategory={tab}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {messageFor && (
        <MessageModal
          contact={messageFor}
          onClose={() => setMessageFor(null)}
          onUpdated={() => {
            setMessageFor(null);
            refresh();
          }}
        />
      )}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
      {agendaOpen && (
        <AgendaPanel
          onClose={() => setAgendaOpen(false)}
          onOpenContact={(c) => {
            setAgendaOpen(false);
            setEditing(c);
          }}
          onChanged={refresh}
        />
      )}
      {metricsOpen && <MetricsModal onClose={() => setMetricsOpen(false)} />}
      {scanOpen && (
        <ScanDmModal
          onClose={() => setScanOpen(false)}
          onImported={() => {
            setScanOpen(false);
            refresh();
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          defaultCategory={tab}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
