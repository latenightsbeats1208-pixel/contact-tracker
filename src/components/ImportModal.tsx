"use client";

import { useRef, useState } from "react";
import { X, FileSpreadsheet, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Category, ImportField } from "@/lib/types";
import { CATEGORIES, FIELD_LABELS } from "@/lib/constants";
import { IMPORT_FIELDS } from "@/lib/types";

interface Props {
  defaultCategory: Category;
  onClose: () => void;
  onImported: () => void;
}

interface Preview {
  headers: string[];
  mapping: (ImportField | "")[];
  rows: string[][];
  totalRows: number;
}

export default function ImportModal({ defaultCategory, onClose, onImported }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    skippedNoName: number;
    skippedDuplicate: number;
  } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur de lecture du fichier");
      return;
    }
    setPreview(data);
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: preview.rows,
        mapping: preview.mapping,
        category,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'import");
      return;
    }
    setResult(data);
  }

  function setMapping(i: number, value: ImportField | "") {
    if (!preview) return;
    const mapping = [...preview.mapping];
    // un même champ ne peut être mappé qu'une fois (sauf vide)
    if (value) {
      mapping.forEach((m, j) => {
        if (j !== i && m === value) mapping[j] = "";
      });
    }
    mapping[i] = value;
    setPreview({ ...preview, mapping });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">📥 Importer des contacts</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Étape 3 — résultat */}
        {result ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" />
            <p className="text-lg font-medium">
              {result.imported} contact{result.imported > 1 ? "s" : ""} importé
              {result.imported > 1 ? "s" : ""}
            </p>
            {(result.skippedDuplicate > 0 || result.skippedNoName > 0) && (
              <p className="mt-2 text-sm text-slate-400">
                {result.skippedDuplicate > 0 &&
                  `${result.skippedDuplicate} doublon${result.skippedDuplicate > 1 ? "s" : ""} ignoré${result.skippedDuplicate > 1 ? "s" : ""}`}
                {result.skippedDuplicate > 0 && result.skippedNoName > 0 && " · "}
                {result.skippedNoName > 0 &&
                  `${result.skippedNoName} ligne${result.skippedNoName > 1 ? "s" : ""} sans nom`}
              </p>
            )}
            <p className="mx-auto mt-4 max-w-sm rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-violet-200">
              ✨ Étape suivante : clique sur <strong>Compléter réseaux</strong> dans
              la barre du haut pour retrouver automatiquement les liens Spotify,
              réseaux sociaux et genres de ces nouveaux contacts.
            </p>
            <button className="btn-primary mt-5" onClick={onImported}>
              Voir les contacts
            </button>
          </div>
        ) : !preview ? (
          /* Étape 1 — choix du fichier */
          <>
            <p className="mb-4 text-sm text-slate-400">
              Formats acceptés : <strong>.csv</strong> (export Google Contacts) ou{" "}
              <strong>.xlsx / .xls</strong> (Excel). La première ligne doit contenir
              les en-têtes de colonnes.
            </p>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 py-12 text-slate-400 transition-colors hover:border-violet-500 hover:text-slate-200"
            >
              <FileSpreadsheet size={40} />
              <span>{busy ? "Lecture du fichier…" : "Cliquer pour choisir un fichier"}</span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          /* Étape 2 — mapping des colonnes */
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {preview.totalRows} ligne{preview.totalRows > 1 ? "s" : ""} détectée
                {preview.totalRows > 1 ? "s" : ""}
                {preview.totalRows > 500 && " (max 500 importées à la fois)"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-sm text-slate-400">Importer dans :</label>
                <select
                  className="input w-auto"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mb-2 text-xs text-slate-500">
              Associe chaque colonne du fichier à un champ (le mapping a été deviné
              automatiquement — vérifie surtout le <strong>Nom</strong>) :
            </p>
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2">Colonne du fichier</th>
                    <th className="px-3 py-2">Exemple</th>
                    <th className="px-3 py-2">Champ cible</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.headers.map((h, i) => (
                    <tr key={i} className="border-b border-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-300">
                        {h || <em className="text-slate-600">colonne {i + 1}</em>}
                      </td>
                      <td className="max-w-40 truncate px-3 py-2 text-slate-500">
                        {preview.rows[0]?.[i] ?? ""}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="input py-1"
                          value={preview.mapping[i]}
                          onChange={(e) =>
                            setMapping(i, e.target.value as ImportField | "")
                          }
                        >
                          <option value="">— ignorer —</option>
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

            <div className="mt-5 flex justify-between">
              <button className="btn-secondary" onClick={() => setPreview(null)}>
                ← Changer de fichier
              </button>
              <button className="btn-primary" onClick={commit} disabled={busy}>
                {busy ? "Import en cours…" : "Importer"} <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {!preview && error && (
          <p className="mt-3 text-sm text-rose-400">{error}</p>
        )}
      </div>
    </div>
  );
}
